"use strict";
// Exercise actual reviewed-alias helper with mocked TMDb responses; no network.
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const registry=require("../trusted-series-aliases.js");
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const start=main.indexOf("// Reviewed catalog aliases are verified");
const end=main.indexOf("async function alMatchTv(p, seconds, opts)",start);
assert(start>=0 && end>start);
const normal={
 id:295002,name:"This City Never Sleeps",date:"2026-10-12",imdb:"tt39443161",
 seasons:[1],votes:5,poster:""
};
const current={show:normal,
 season:{episodes:[{n:2,name:"Episode 2",air:"2026-10-13",
  runtime:43,overview:"",rating:0}],poster:""}};
const calls=[];
const context=vm.createContext({
  alTvDetails:async(id)=>{calls.push(["tv",id]);return current.show},
  alSeason:async(id,season)=>{calls.push(["season",id,season]);return current.season},
  alYearOf:d=>Number(String(d||"").slice(0,4)),
  alNorm:s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,""),
  alTvInfo:(show,season,episode,seasonN)=>({
   showTitle:show.name,tmdbId:String(show.id),
   parentImdbId:show.imdb,season:seasonN,episode:episode.n,epTitle:episode.name
  }),
  alLengthFits:(seconds,minutes)=>!minutes||seconds/(minutes*60)>=0.5&&seconds/(minutes*60)<=2,
  alNotSure:(reason,query)=>({info:null,reason,query})
});
vm.runInContext(main.slice(start,end),context,{filename:"reviewed-alias-from-main.js"});
(async function(){
 const identity=registry.find("City Of Splendour",null,"episode");
 const p={title:"City Of Splendour",season:1,episode:2,episodes:1,year:null};
 const valid=await context.alReviewedTv(p,2596,identity);
 assert.equal(valid.info?.tmdbId,"295002");
 assert.equal(valid.info?.parentImdbId,"tt39443161");
 assert.equal(valid.info?.season,1);
 assert.equal(valid.info?.episode,2);
 assert.equal(valid.info?.identitySource,"Reviewed alias + TMDB/IMDb verified");
 assert.deepEqual(calls.slice(0,2),[["tv",295002],["season",295002,1]]);
 current.show={...normal,imdb:"tt00000001"};
 assert.equal((await context.alReviewedTv(p,2596,identity)).info,null,
   "Wrong IMDb must fail closed");
 current.show={...normal, date:"2023-10-12"};
 assert.equal((await context.alReviewedTv(p,2596,identity)).info,null);
 current.show={...normal};
 current.season={episodes:[],poster:""};
 assert.equal((await context.alReviewedTv(p,2596,identity)).info,null);
 current.season={episodes:[{n:2,name:"Episode 2",runtime:43}],poster:""};
 assert.equal((await context.alReviewedTv(p,120,identity)).info,null,
   "Wrong playback runtime must fail");
 assert.equal(registry.find("City of Splendor",null,"episode"),null,
   "No fuzzy title matching");
 console.log("Episode Info+ reviewed HLS alias, verified TMDb/IMDb/year/S-E/runtime PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
