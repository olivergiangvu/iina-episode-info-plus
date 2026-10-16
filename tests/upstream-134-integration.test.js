"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const side=fs.readFileSync(path.join(__dirname,"../sidebar.html"),"utf8");
const helper=require("../episode-plus-http.js");
function segment(text,begin,end){
 const i=text.indexOf(begin);
 const j=text.indexOf(end,i+begin.length);
 assert(i>=0&&j>i,"Missing source segment: "+begin);
 return text.slice(i,j);
}
const realTmdb=segment(main,"async function alTmdb(","async function alSearch(");
const realSearch=segment(side,"async function doSearch(auto)","// Escape text going into innerHTML");
const realSelection=segment(side,"function pickItem(item) {","function saveSelection(info) {");
const realResend=segment(side,'iina.onMessage("resendSettings",function(){',"function updateToggleVisual(");
const realRetry=segment(main,"var sidebarSettingsIn=false;","var overlayHandlersRegistered = false;");
async function run(){
 // 1. Structured IINA 404 MUST be read from statusCode, not safeError strings.
 let calls=0;
 const bridge=vm.createContext({
  tmdbKey:"dummy-test-key", alCache:{},alCacheLoad:function(){},
  alCacheDirty:false, Date:Date,
  episodePlusHttp:helper, HTTP_TIMEOUT_MS:1000,
  withTimeout:function(p){return p;},
  iina:{http:{get:async function(){
   calls++;throw {statusCode:404};
  }}}
 });
 vm.runInContext(realTmdb,bridge);
 const result=await bridge.alTmdb("/tv/999991",{},2,x=>x);
 assert.equal(result,null,"404 for one TMDB candidate must not abort matching");
 assert.equal(calls,1);
 await bridge.alTmdb("/tv/999991",{},2,x=>x);
 assert.equal(calls,1,"Confirmed 404 candidate cache should avoid repeated request");
 await assert.rejects(bridge.alTmdb("/search/tv",{query:"Foo"},2,x=>x),
   /HTTP 404/,"Search endpoint 404 is not silently cached as missing show");
 bridge.iina.http.get=async function(){throw {statusCode:401}};
 await assert.rejects(bridge.alTmdb("/tv/999992",{},2,x=>x),
   /HTTP 401/,"Auth failures must not be misclassified as missing content");
 // 2. Main/sidebar handshake: retry if settings were missed, stop once received.
 let timers=[],resend=[];
 const start=vm.createContext({
  setTimeout:function(cb){timers.push(cb);},
  sidebar:{postMessage:function(type){resend.push(type);}}
 });
 vm.runInContext(realRetry,start);
 start.askForSidebarSettings(5);
 assert.equal(timers.length,1);
 timers.shift()();
 assert.deepEqual(resend,["resendSettings"]);
 start.sidebarSettingsIn=true;
 timers.shift()();
 assert.deepEqual(resend,["resendSettings"],"Retry stops after IINA receives settings");
 // Sender always reads current localStorage, not a stale startup snapshot.
 const saved={
  epinfo_overlay_enabled:"false",epinfo_overlay_opacity:"0.63",
  epinfo_overlay_vpos:"28",epinfo_pause_delay:"2.5",
  epinfo_tmdb_key:"local-secret",epinfo_overlay_theme:"poster",
  epinfo_skip_enabled:"true"
 };
 const messages={},sender=vm.createContext({
  localStorage:{getItem:k=>Object.hasOwn(saved,k)?saved[k]:null},
  iina:{onMessage:(type,handler)=>messages[type]=handler,
    postMessage:function(type,data){(messages.sent||(messages.sent=[])).push({type,data});}}
 });
 vm.runInContext(realResend,sender);
 saved.epinfo_overlay_enabled="true"; // user changes after IINA started
 messages.resendSettings();
 const sent=messages.sent;
 assert(sent.some(x=>x.type==="setOverlayEnabled"&&x.data.enabled===true));
 assert(sent.some(x=>x.type==="setOverlayTheme"&&x.data.value==="poster"));
 assert(sent.some(x=>x.type==="setTmdbKey"&&x.data.key==="local-secret"));
 assert(sent.some(x=>x.type==="setSkipEnabled"&&x.data.enabled===true));
 assert(sent.some(x=>x.type==="sidebarReady"));
 assert(main.includes("registerSidebarHandlers();")&&main.includes("askForSidebarSettings(5);"));
 // 3. Auto-search is read-only for Recent Searches, does not lock text input,
 // and drops stale results after the user opens another video.
 const inputs={
  q:{value:"Fallout",disabled:false},
  panel:{innerHTML:"",_searchCache:null},
  go:{disabled:false}
 };
 let manual=[],pendingResolver=null,delays=[];
 const search=vm.createContext({
  currentVideoUrl:"stream/one",autoSearchGeneration:0,autoHint:null,
  document:{getElementById:k=>inputs[k]},
  TK:"test-not-real", IB:"https://image.tmdb.org/t/p/w92",
  setLoading:function(on){delays.push(on);inputs.q.disabled=on;},
  pushSearch:function(q){manual.push(q);},
  htmlEsc:function(s){return String(s||"");},
  fetch:async function(){return {json:async()=>({
   results:[{media_type:"tv",id:123,name:"Fallout",poster_path:null}]
  })};}
 });
 vm.runInContext(realSearch,search);
 await search.doSearch(true);
 assert.equal(manual.length,0,"Automatic lookups must not pollute Recent Searches");
 assert.equal(inputs.q.disabled,false,"Automatic lookup must not block typing");
 assert.equal(inputs.panel._searchCache[0].name,"Fallout");
 inputs.q.value="The Office";await search.doSearch();
 assert.deepEqual(manual,["The Office"]);
 search.fetch=()=>new Promise(resolve=>{pendingResolver=resolve});
 inputs.q.value="Old playback";
 const ongoing=search.doSearch(true);
 search.currentVideoUrl="stream/two";
 search.autoSearchGeneration++;
 inputs.panel.innerHTML="NEW MEDIA";
 pendingResolver({json:async()=>({results:[{media_type:"tv",name:"Old playback",id:99}]})});
 await ongoing;
 assert.equal(inputs.panel.innerHTML,"NEW MEDIA","Stale auto-search must not overwrite next file");
 // 4. Inferred S/E may navigate only once AFTER the user selects a series.
 const els={panel:{innerHTML:"",_searchCache:null},ep:{innerHTML:""}};
 const selected=[];
 const picker=vm.createContext({
  currentVideoUrl:"stream/episode",autoSearchGeneration:0,
  autoHint:{url:"stream/episode",season:2,episode:7},
  selShow:null,selSeason:null,episodeCache:[],seasonPosterUrl:"",
  document:{getElementById:k=>els[k]},
  TK:"test-not-real",IB:"https://image.tmdb.org/t/p/w92",
  htmlEsc:s=>String(s||""),
  saveSelection:function(info){selected.push(info);},
  fetch:async function(url){
   if(url.includes("/season/2"))return {json:async()=>({
    poster_path:null,episodes:[{episode_number:7,name:"The Handoff",air_date:"2026-01-27",overview:"",vote_average:7.2}]
   })};
   return {json:async()=>({
    id:100,name:"Fallout",poster_path:null,seasons:[{season_number:1},{season_number:2}]
   })};
  }
 });
 vm.runInContext(realSelection,picker);
 assert.equal(selected.length,0,"No unattended selection before user picks series");
 picker.pickItem({media_type:"tv",id:100,name:"Fallout",poster_path:null});
 for(let i=0;i<15;i++)await Promise.resolve();
 assert.equal(selected.length,1,"Select exact S/E after explicit series pick");
 assert.equal(selected[0].code,"S02E07");
 assert.equal(selected[0].epTitle,"The Handoff");
 assert.equal(picker.autoHint,null,"Positional hint is single-use");
 // User's manual season selection clears any unused episode hint.
 picker.selShow._wantEp=7;
 picker.pickSeason(1);
 assert.equal(picker.selShow._wantEp,null);
 // A pending season response from a prior playback/series must never select
 // an episode belonging to the newly chosen show.
 let resolveOldSeason;
 picker.currentVideoUrl="stream/episode";
 picker.selShow={id:321,name:"Old",_wantEp:7};
 picker.selSeason=2;
 picker.fetch=async function(){
  return new Promise(resolve=>{resolveOldSeason=resolve});
 };
 picker.renderEps(2);
 assert.equal(typeof resolveOldSeason,"function");
 picker.currentVideoUrl="stream/new-video";
 picker.selShow={id:654,name:"New",_wantEp:null};
 resolveOldSeason({json:async()=>({
  poster_path:null,episodes:[{episode_number:7,name:"Old Show Episode"}]
 })});
 for(let i=0;i<7;i++)await Promise.resolve();
 assert.equal(selected.length,1,"Never save stale episode after video/series switches");
 assert(side.includes("autoHint=canSearch&&Number.isInteger(d.season)"));
 assert(main.includes("out.season=p.season; out.episode=p.episode;"));
 assert(main.includes("reply.season=out.season;reply.episode=out.episode;"));
 console.log("Upstream 1.3.4 selective merge: TMDB 404, settings, stale-search and episode-aware pick PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1});
