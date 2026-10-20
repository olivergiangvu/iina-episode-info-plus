"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const sidebar=fs.readFileSync(path.join(__dirname,"../sidebar.html"),"utf8");
const overlayHtml=fs.readFileSync(path.join(__dirname,"../overlay.html"),"utf8");
const manifest=require("../Info.json");
assert.equal(manifest.version,"1.3.2");
assert.equal(manifest.ghVersion,14);
assert.equal(manifest.identifier,"io.github.olivergiangvu.iinaepisodeinfoplus");
function segment(src,a,b){
 const i=src.indexOf(a),j=src.indexOf(b,i+a.length);
 assert(i>=0&&j>i,"Missing source segment: "+a);
 return src.slice(i,j);
}
// Both embedded webviews must remain valid JS after merging UI controls.
for(const [filename,html] of [["sidebar.html",sidebar],["overlay.html",overlayHtml]]){
 const script=/<script>([\s\S]*?)<\/script>/i.exec(html);
 assert(script&&script[1],"Missing webview script in "+filename);
 new vm.Script(script[1],{filename});
}
const overlayCode=segment(main,"function showOverlay(d) {","function hideOverlay()");
const extrasCode=segment(main,"// Cast and Up next for the card, fetched only when switched on","// Sidebar handlers");
const sent=[],counter={tmdb:0,season:0,cache:0};
const active={tmdbId:"100",isMovie:false,showTitle:"Example",epTitle:"Episode 7",
 code:"S02E07",airDate:"2026-01-27",rating:"7.2",overview:"Test",posterUrl:"https://image.tmdb.org/t/p/w500/fake.jpg",
 season:2,episode:7};
const ctx=vm.createContext({
 overlayEnabled:true,overlayBgOpacity:.72,overlayVerticalPos:50,overlayTheme:"classic",
 overlayWidth:null,posterSide:null,glassStyle:null,
 cardCast:false,cardNext:false,cardExtras:{key:"",cast:null,next:null},
 cardVisible:false,overlayVisible:false,currentEpisode:active,tmdbKey:"dummy-key",
 overlay:{postMessage:(type,data)=>sent.push({type,data}),show:()=>sent.push({type:"show"})},
 sidebar:{postMessage:()=>{}},log:()=>{},
 alPad2:x=>String(x).padStart(2,"0"),alCacheFlush:()=>{counter.cache++},
 alTmdb:async(_path,_params,_ttl,trim)=>{
  counter.tmdb++;
  return trim({cast:[{name:"Example Actor",character:"Guest",profile_path:"/abc.jpg"}],guest_stars:[]});
 },
 alSeason:async()=>{
  counter.season++;
  return {episodes:[{n:7,name:"Ep7",air:"2026-01-27"},{n:8,name:"Next Episode",air:"2026-02-03"}]};
 }
});
vm.runInContext(extrasCode+"\n"+overlayCode,ctx);
function rendered(){return sent.filter(x=>x.type==="showData").at(-1).data}
(async function(){
 ctx.showOverlay(active);
 assert.equal(counter.tmdb,0,"Disabled extras must not call TMDB");
 assert.equal(counter.season,0,"Disabled Up Next must not call season API");
 assert.equal(rendered().cast,undefined,"Default overlay has no cast");
 assert.equal(rendered().next,undefined,"Default overlay has no Up Next");
 assert.equal(rendered().width,undefined,"Default width remains theme-dependent");
 ctx.overlayTheme="glass";ctx.overlayWidth=76;ctx.posterSide="left";ctx.glassStyle="colorful";
 ctx.cardCast=true;ctx.cardNext=true;
 await ctx.loadCardExtras(active);
 assert.equal(counter.tmdb,1);
 assert.equal(counter.season,1);
 ctx.showOverlay(active);
 let d=rendered();
 assert.equal(d.theme,"glass");
 assert.equal(d.width,76);
 assert.equal(d.poster,"left");
 assert.equal(d.glass,"colorful");
 assert.equal(d.cast.length,1);
 assert.equal(d.cast[0].name,"Example Actor");
 assert.equal(d.next.code,"S02E08");
 assert.equal(d.next.title,"Next Episode");
 await ctx.loadCardExtras(active);
 assert.equal(counter.tmdb,1,"Cast details must reuse same-episode cache");
 assert.equal(counter.season,1,"Next details must reuse same-episode cache");
 ctx.cardCast=false;ctx.cardNext=false;ctx.showOverlay(active);
 d=rendered();
 assert.equal(d.cast,undefined,"Turning Cast off immediately suppresses it");
 assert.equal(d.next,undefined,"Turning Up Next off immediately suppresses it");
 await ctx.loadCardExtras({...active,tmdbId:""});
 assert.equal(counter.tmdb,1,"No TMDB id means do not guess a cast identity");
 assert.equal(counter.season,1,"No TMDB id means do not guess next episode");
 // New markup must support three Glass variants and clear the stale extras.
 assert(overlayHtml.includes('id="art"'));
 assert(overlayHtml.includes('id="cast"'));
 assert(overlayHtml.includes('id="next"'));
 assert(overlayHtml.includes('wrap.removeAttribute("data-extra")'));
 assert(overlayHtml.includes("allowedArt")||overlayHtml.includes("safeArt"));
 for(const t of ['data-theme="glass"','data-glass="clear"','data-glass="colorful"',
   'data-width','data-poster="left"','data-poster="right"'])
  assert(overlayHtml.includes(t),"Missing overlay CSS "+t);
 assert(overlayHtml.includes("@media (prefers-color-scheme:light)"));
 assert(overlayHtml.includes("prefers-contrast:more"));
 for(const key of ["epinfo_overlay_width","epinfo_poster_side","epinfo_glass_style",
   "epinfo_card_cast","epinfo_card_next"])
  assert(sidebar.includes(key),"Missing persisted preference "+key);
 for(const cmd of ['setOverlayWidth','setPosterSide','setGlassStyle','setCardCast','setCardNext'])
  assert(main.includes('sidebar.onMessage("'+cmd+'"')&&sidebar.includes('iina.postMessage("'+cmd+'"'),
   "Main and sidebar IPC must both support "+cmd);
 assert(sidebar.includes('sendCardSettings();')&&sidebar.includes('iina.onMessage("resendSettings"'));
 console.log("Glass/Light-Dark/opt-in extras, caching, settings/overlay bridge: PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
