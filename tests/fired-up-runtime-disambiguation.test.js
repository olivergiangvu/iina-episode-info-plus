"use strict";
// Regression for an opaque 46:20 Hitv CDN URL carrying only
// "Fired Up! · S01E06 · Episode 6", without a year or external ID.
// A same-name 1997 sitcom and 2026 drama must be distinguished by the
// independently confirmed, exact S01E06 episode runtime, never recency.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.resolve(__dirname, "../main.js"), "utf8");
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, "Missing EP+ matcher section: " + start);
  return source.slice(a, b);
}
const helpers = section("// Deciding\n", "function alTvInfo(");
const matcher = section("async function alMatchTv(", "async function alMatchMovie(");
const earlier = {id:199700, name:"Fired Up", original:"Fired Up", date:"1997-04-10",
  votes:4000, country:["US"], seasons:[1]};
const newer = {id:239156, name:"Fired Up!", original:"Fired Up!", date:"2026-07-03",
  votes:50, country:["TW"], seasons:[1]};
let candidates = [earlier, newer];
let runtimes = {199700:30, 239156:46};
let broken = false;
const context = vm.createContext({
  trustedSeriesAliases: require("../trusted-series-aliases.js"),
  alLearnedAliasRows: () => [],
  alHints: () => ({url:"https://akm-cdn-play.hitv.ltd/opaque/index.m3u8"}),
  alSearch: async () => candidates,
  alTvDetails: async id => broken && id === 199700 ? null :
    candidates.find(item => item.id === id) || null,
  alSeason: async id => ({episodes:[{n:6,name:"Episode 6",
    air:id===199700 ? "1997-08-10" : "2026-08-21", runtime:runtimes[id]}]}),
  alTvInfo: (show, _season, episode, season) => ({
    showTitle:show.name,tmdbId:String(show.id),isMovie:false,
    airDate:episode.air,code:"S01E06",season,episode:6
  })
});
vm.runInContext(helpers + "\n" + matcher, context);
const input = {title:"Fired Up!",year:null,episodeYear:null,
  season:1,episode:6,episodes:1};
(async () => {
  const fortySixMinutes = await context.alMatchTv(input, 46*60+20);
  assert.equal(fortySixMinutes.info?.tmdbId, "239156",
    "46:20 should select verified 2026 episode despite 1997 popularity");
  const thirtyMinutes = await context.alMatchTv(input, 30*60);
  assert.equal(thirtyMinutes.info?.tmdbId, "199700",
    "30:00 must select the older episode, never infer the current year");
  const unknownDuration = await context.alMatchTv(input, 38*60);
  assert.equal(unknownDuration.info, null, "No uniquely close runtime must remain uncertain");
  runtimes = {199700:43,239156:46};
  assert.equal((await context.alMatchTv(input, 44*60)).info, null,
    "Close runtimes cannot safely disambiguate same-title shows");
  runtimes = {199700:0,239156:46};
  assert.equal((await context.alMatchTv(input, 46*60+20)).info, null,
    "Unknown competitor runtime must not be treated as evidence of absence");
  runtimes = {199700:30,239156:46};
  broken = true;
  assert.equal((await context.alMatchTv(input, 46*60+20)).info, null,
    "Unavailable competing provider data must not authorize a guess");
  broken = false;
  candidates = [earlier,newer,{...earlier,id:1001,date:"2001-01-01"},
    {...earlier,id:1002,date:"2002-01-01"}];
  assert.equal((await context.alMatchTv(input, 46*60+20)).info, null,
    "Unexamined same-title candidates must block runtime inference");

  // Independent fallback must use the exact S/E and reject unknown or
  // competing near-equal runtimes before accepting a yearless label.
  const tvmaze = require("../episode-plus-tvmaze.js");
  const oldShow={id:10124,name:"Fired Up",premiered:"1997-04-10",
    externals:{imdb:"tt0118317"}};
  const newShow={id:93709,name:"Fired Up!",premiered:"2026-07-03",
    externals:{imdb:"tt29932775"}};
  let oldRuntime=30, newRuntime=46;
  const fetchJSON=async (route,query) => {
    if(route==="/search/shows"){
      assert.equal(query.q,"Fired Up!");
      return [{show:oldShow},{show:newShow}];
    }
    assert.equal(query.season,1);assert.equal(query.number,6);
    const isNew=route.includes("/93709/");
    return {season:1,number:6,name:"Episode 6",airdate:isNew?"2026-08-21":"1997-08-10",
      runtime:isNew?newRuntime:oldRuntime};
  };
  const request={title:"Fired Up!",season:1,episode:6,year:null,seconds:46*60+20};
  assert.equal((await tvmaze.lookup(request,fetchJSON))?.tvmazeId,93709,
    "Independent TVmaze exact-episode runtime must select the 2026 series");
  assert.equal((await tvmaze.lookup({...request,seconds:30*60},fetchJSON))?.tvmazeId,10124,
    "TVmaze must also identify the 1997 show from its own runtime evidence");
  newRuntime=32;
  assert.equal(await tvmaze.lookup({...request,seconds:31*60},fetchJSON),null,
    "Similar 30/32-minute TVmaze contenders must remain ambiguous");
  newRuntime=46;oldRuntime=0;
  assert.equal(await tvmaze.lookup(request,fetchJSON),null,
    "Missing competitor TVmaze runtime must fail closed");
  assert.equal((await tvmaze.lookup({...request,year:1997},fetchJSON))?.tvmazeId,10124,
    "A known explicit premiere year is checked independently of the current date");
  console.log("Fired Up! 1997 vs 2026 exact-S/E runtime disambiguation, TMDb and TVmaze PASS");
})().catch(error=>{console.error(error);process.exitCode=1;});
