"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const info=JSON.parse(fs.readFileSync(path.join(__dirname,"../Info.json"),"utf8"));
assert.equal(info.version,"1.3.3");
assert.equal(info.ghVersion,24);
assert.equal(info.identifier,"io.github.olivergiangvu.iinaepisodeinfoplus");
assert(code.includes("https://api.theintrodb.org/v4/media?"),
 "TheIntroDB must use the upstream's current v4 endpoint");
assert(!code.includes("https://api.theintrodb.org/v2/media?"),
 "Legacy TheIntroDB v2 endpoint must be removed");
function section(from,to){
 const a=code.indexOf(from),b=code.indexOf(to,a+from.length);
 assert(a>=0&&b>a,"Could not find current engine range "+from);
 return code.slice(a,b);
}
const actualMatcher=section("async function alMatchTv(","async function alMatchMovie(");
const secondTry=section("// Anime or not, and episodes per season","// An IMDb id in the link settles it");
const lookup=section("async function alLookup(h, seconds) {","\nfunction alHints()");
const rawParser=section("var AL_VIDEO_EXT = ","// TMDB, cached");
const ctx=vm.createContext({
  episodePlusAios:require("../episode-plus-aios.js"),
  alNotSure:function(reason,query){return {info:null,reason,query:query||""}},
  alNorm:function(x){return String(x||"").toLowerCase().replace(/[^a-z0-9]+/g,"")},
  alYearOf:function(x){return Number(String(x||"").slice(0,4))||0},
  alPad2:x=>String(x).padStart(2,"0"),
  log:function(){},errStr:String
});
vm.runInContext(rawParser,ctx);
vm.runInContext(actualMatcher+"\n"+secondTry+"\n"+lookup,ctx);
const good={id:100,name:"Breaking Bad",votes:9900,seasons:[1,2]};
const episode=(name,number,runtime=47)=>({name,n:number,runtime,air:"2013-09-29"});
const first={episodes:[episode("Pilot",1)]};
const last={episodes:[episode("Felina",16)]};
ctx.alSearch=async function(kind,title){
  if(kind==="tv")return [{id:100,name:title}];
  return [];
};
ctx.alTitleCandidates=async function(_,list){return list};
ctx.alTvDetails=async function(){return good};
ctx.alSeason=async function(_,season){return season===1?first:last};
ctx.alTvInfo=function(show,sd,ep,season){
  return {showTitle:show.name,epTitle:ep.name,code:"S"+String(season).padStart(2,"0")+
    "E"+String(ep.n).padStart(2,"0"),season:season,episode:ep.n,isMovie:false};
};
ctx.alTmdb=async function(_path,_params,_ttl,trim){
  return trim({original_language:"ja",origin_country:["JP"],genres:[{id:16}],
    seasons:[{season_number:1,episode_count:12},{season_number:2,episode_count:12},
             {season_number:3,episode_count:12}]});
};
ctx.alLengthFits=(seconds,runtime)=>seconds>=runtime*60*0.7&&seconds<=runtime*60*1.5;
ctx.alMatchMovie=async function(p){return ctx.alNotSure("TMDB has no film called “"+p.title+"”",p.title)};
(async()=>{
 // Title match only when exactly one *verified* episode in the show
 const parsed=ctx.alParseName("Breaking Bad - Felina.mkv");
 assert.equal(parsed.episode,null);
 assert.equal(parsed.title,"Breaking Bad - Felina");
 let out=await ctx.alSecondTry(parsed,2820,
   ctx.alNotSure("TMDB has no film called “Breaking Bad - Felina”",parsed.title),
   {weak:false,p:parsed});
 assert(out.info&&out.info.code==="S02E16");
 assert.equal(out.info.epTitle,"Felina");
 ctx.alSeason=async()=>({episodes:[episode("Felina",1)]});
 out=await ctx.alMatchEpisodeTitle("Breaking Bad","Felina",2820,null);
 assert(!out.info&&/several episodes/.test(out.reason),
   "Duplicate episode titles cannot be automatically selected");
 ctx.alSeason=async(_,season)=>season===1?first:last;
 out=await ctx.alMatchEpisodeTitle("Breaking Bad","Episode 2",2820,null);
 assert(!out.info,"Generic episode titles cannot be verified");
 ctx.alTvDetails=async()=>({...good,votes:10});
 out=await ctx.alMatchEpisodeTitle("Breaking Bad","Felina",2820,null);
 assert(!out.info,"Obscure show cannot be verified using an episode title only");
 ctx.alTvDetails=async()=>good;
 out=await ctx.alMatchEpisodeTitle("Breaking Bad","Felina",300,null);
 assert(!out.info,"Runtime mismatch must prevent false matches");
 // Absolute numbering: only Japanese animated shows when the number is
 // past the longest single season, and we can resolve it exactly.
 const anime={id:200,name:"Test Anime",votes:1200,seasons:[1,2,3]};
 ctx.alTvDetails=async()=>anime;
 ctx.alSeason=async(_,season)=>({episodes:Array.from({length:12},(_,i)=>
   episode("Chapter "+i,i+1))});
 let abs=await ctx.alAbsolute(anime,25);
 assert.equal(abs.season,3);
 assert.equal(abs.ep.n,1);
 abs=await ctx.alAbsolute(anime,5);
 assert(!abs.season,"Small absolute numbers are ambiguous between seasons");
 ctx.alTmdb=async(_p,_q,_ttl,trim)=>trim({
   original_language:"en",origin_country:["US"],genres:[{id:18}],
   seasons:[{season_number:1,episode_count:12},{season_number:2,episode_count:12},
            {season_number:3,episode_count:12}]
 });
 abs=await ctx.alAbsolute(anime,25);
 assert(!abs.season,"Non-anime show must not accept inferred absolute numbering");
 assert(code.includes("alSecondTry(p,len,out,primary)"),
   "Actual auto-matching engine must invoke conservative second try");
 assert(code.includes("episodePlusAios.extract(h)"),
   "AIOStreams HLS title parsing must remain intact");
 assert(code.includes("episodePlusTvmaze.lookup"),
   "TVmaze fallback must remain intact");
 console.log("Upstream v1.3.5 backports: exact episode titles, ambiguous cases, anime absolute and TheIntroDB v4 PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
