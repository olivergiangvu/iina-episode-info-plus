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
const show={
 id:52222,name:"The True Title",date:"2025-01-09",imdb:"tt12345678",seasons:[1]
};
const context=vm.createContext({
 trustedSeriesAliases:registry,
 file:{exists:p=>Object.hasOwn(files,p),read:p=>files[p],write:(p,v)=>{files[p]=v}},
 alHints:()=>({...playback}),
 alParseName:title=>({title:"Parallel World",season:1,episode:2}),
 alTitleOk:()=>true,
 alTvDetails:async()=>mismatched?{...show,id:33333}:show,
 alSeason:async()=>({episodes:[{n:2,runtime:43}]}),
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
 console.log("EP+ one-time confirmed pick => durable host-scoped subsequent auto lookup PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
