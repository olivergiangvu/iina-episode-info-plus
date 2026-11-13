"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const registry=require("../trusted-series-aliases.js");
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const from=main.indexOf("var AL_LEARNED_ALIAS_PATH=");
const to=main.indexOf("// Reviewed catalog aliases are verified",from);
assert(from>=0 && to>from);
const files={};
const playback={
 url:"https://a.kvp726.com/hls/token/index.m3u8",
 path:"https://a.kvp726.com/hls/token/index.m3u8",
 filename:"index.m3u8",mediaTitle:"Parallel World · S01E02 · Episode 2"
};
let mismatched=false;
let show={
 id:52222,name:"The True Title",date:"2025-01-09",imdb:"tt12345678",seasons:[1]
};
const context=vm.createContext({
 trustedSeriesAliases:registry,
 file:{exists:p=>Object.hasOwn(files,p),read:p=>files[p],write:(p,v)=>{files[p]=v}},
 alHints:()=>({...playback}),
 alParseName:title=>({title:title.startsWith("Fired Up!")?"Fired Up!":"Parallel World",season:1,episode:title.includes("S01E04")?4:2}),
 alTitleOk:()=>true,
 alTvDetails:async()=>mismatched?{...show,id:33333}:show,
 alSeason:async()=>({episodes:[{n:2,runtime:43},{n:4,runtime:48}]}),
 alYearOf:date=>+String(date).slice(0,4),
 alLengthFits:(secs,mins)=>secs/60>=mins*0.5&&secs/60<=mins*2,
 alSeconds:()=>2580,
 log:()=>{}
});
vm.runInContext(main.slice(from,to),context);
(async()=>{
 const picked={isMovie:false,showTitle:"The True Title",tmdbId:"52222",season:1,episode:2};
 await context.alLearnUserTitleAlias(picked);
 const learned=registry.read(files["@data/verified-title-mappings.json"]);
 assert.equal(learned.length,1);
 assert.equal(learned[0].alias,"Parallel World");
 assert.equal(learned[0].imdb,"tt12345678");
 assert.equal(learned[0].originHost,"a.kvp726.com");
 assert.equal(registry.find("Parallel World",null,"episode",learned,playback.url).tmdb,52222);
 assert.equal(registry.find("Parallel World",null,"episode",learned,"https://untrusted.example/"),null);
 delete files["@data/verified-title-mappings.json"];
 mismatched=true;
 await context.alLearnUserTitleAlias(picked);
 assert.equal(Object.keys(files).length,0,"Picked TMDb ID must agree with provider detail");
 mismatched=false;
 await context.alLearnUserTitleAlias({...picked,episode:3});
 assert.equal(Object.keys(files).length,0,"Different selected episode must never be learned");
 // Regression: identical normalized names can denote entirely different shows
 // ("Fired Up!" 2026 vs "Fired Up" 1997). A manual, cross-catalog verified
 // selection must teach only its playback origin, never all other CDNs.
 playback.mediaTitle="Fired Up! · S01E04 · Episode 4";
 show={id:239156,name:"Fired Up!",date:"2026-01-09",imdb:"tt29932775",seasons:[1]};
 await context.alLearnUserTitleAlias({isMovie:false,showTitle:"Fired Up!",tmdbId:"239156",season:1,episode:4});
 const newRows=registry.read(files["@data/verified-title-mappings.json"]);
 assert.equal(newRows.length,1,"Same normalized title must still be learned after explicit manual choice");
 assert.equal(newRows[0].year,2026);
 assert.equal(registry.find("Fired Up",null,"episode",newRows,playback.url).tmdb,239156);
 assert.equal(registry.find("Fired Up!",1997,"episode",newRows,playback.url),null,
   "An explicit 1997 title year must not inherit 2026 mapping");
 assert.equal(registry.find("Fired Up",null,"episode",newRows,"https://other.cdn.example/"),null,
   "Origin change must require independent verification");
 const older=registry.learn(newRows,{kind:"episode",alias:"Fired Up",canonicalTitle:"Fired Up",
   year:1997,imdb:"tt12345678",tmdb:199700,trakt:0,
   originHost:"a.kvp726.com",evidence:"explicit user choice"});
 assert.equal(older.length,2,"Keep both confirmed years; never silently overwrite the 2026 identity");
 assert.equal(registry.find("Fired Up",null,"episode",older,playback.url),null,
   "An opaque URL on shared CDN cannot distinguish 1997 and 2026 without additional evidence");
 assert.equal(registry.find("Fired Up",2026,"episode",older,playback.url).tmdb,239156);
 assert(main.includes('sidebar.onMessage("episodeUserSelected", function(info)'),
   "Only explicit manual pick may enter the learning path");
 assert(!main.slice(main.indexOf('sidebar.onMessage("episodeSelected", function(info)'),
   main.indexOf('sidebar.onMessage("episodeUserSelected", function(info)')).includes("alLearnUserTitleAlias(info)"),
   "Automatic Lookup / restored picks must NEVER teach identities");
 console.log("EP+ one-time confirmed pick => durable host-scoped subsequent auto lookup PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
