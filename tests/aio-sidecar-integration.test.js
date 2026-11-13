"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const from=source.indexOf("var alAioRetrySequence=0;");
const to=source.indexOf("async function alLookup(",from);
assert(from>=0&&to>from,"Sidecar verifier must be invoked before title-based lookup");
let show={id:239156,name:"Fired Up!",date:"2026-02-10",imdb:"tt29932775",seasons:[1]};
const identity={kind:"episode",season:1,episode:4,year:2026,imdb:"tt29932775",tmdb:239156,canonicalTitle:"Fired Up!"};
let label="Fired Up! · S01E04 · Episode 4";
const context=vm.createContext({
 aioIdentitySidecar:{find:()=>identity},file:{},utils:{resolvePath:p=>p},
 alParseName:()=>({season:1,episode:label.includes("S01E03")?3:4}),
 alTvDetails:async()=>show,
 alSeason:async()=>({episodes:[{n:4,runtime:48}]}),
 alYearOf:x=>Number(x.slice(0,4)),
 alLengthFits:(seconds,mins)=>{let r=seconds/(mins*60);return r>=0.5&&r<=2;},
 alTvInfo:(d,s,e,n)=>({showTitle:d.name,season:n,episode:e.n,tmdbId:String(d.id)}),
 alNotSure:(reason,query)=>({info:null,reason,query})
});
vm.runInContext(source.slice(from,to),context);
(async()=>{
 const hints=()=>({mediaTitle:label,metadataTitle:"",url:"https://opaque.example/index.m3u8"});
 let out=await context.alAioVerifiedTv(identity,hints(),()=>48*60);
 assert.equal(out.info.tmdbId,"239156");assert.equal(out.info.identitySource,"AIO authenticated + TMDb verified");
 assert.equal(out.from,"aio-authenticated");
 show={...show,id:1234};
 out=await context.alAioVerifiedTv(identity,hints(),()=>48*60);
 assert.equal(out.info,null,"TMDb ID disagreement must reject");
 show={...show,id:239156,date:"1997-01-01"};
 out=await context.alAioVerifiedTv(identity,hints(),()=>48*60);
 assert.equal(out.info,null,"1997/2026 same-title collision rejected by independent year");
 show={...show,date:"2026-02-10",imdb:"tt12345678"};
 out=await context.alAioVerifiedTv(identity,hints(),()=>48*60);
 assert.equal(out.info,null,"IMDb disagreement must reject");
 show={...show,imdb:"tt29932775"};
 label="Fired Up! · S01E03 · Episode 3";
 out=await context.alAioVerifiedTv(identity,hints(),()=>48*60);
 assert.equal(out.info,null,"Playback label S/E vs authenticated context conflict");
 assert(source.includes("var year=sidecar ? sidecar.year"),"TVmaze fallback must use authenticated year");
 assert(source.includes("alternative.parentImdbId!==sidecar.imdb"),"TVmaze fallback must verify IMDb identity");
 assert(source.includes("var aiosConflict="),"A conflicting TMDb show must prohibit TVmaze title fallback");
 assert(source.includes("if(!tvmazeCandidate&&!sidecarFallback&&aios&&!aios.conflict)"),
   "A rejected authenticated context may not silently degrade to a guessed player title");
 assert(source.includes("alAioRetrySequence"),"Companion descriptor arrives after IINA file load");
 console.log("EP+ authenticated sidecar ID/year/S-E/runtime and TVmaze year handoff PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
