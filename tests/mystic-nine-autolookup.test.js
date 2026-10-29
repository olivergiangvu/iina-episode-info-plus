"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../main.js"), "utf8");
function segment(a, b) {
  const start = source.indexOf(a), end = source.indexOf(b, start + a.length);
  assert(start >= 0 && end > start, "Cannot locate live EP+ section: " + a);
  return source.slice(start, end);
}
const filenameParser = segment("var AL_VIDEO_EXT = ", "// TMDB, cached");
const matcherHelpers = segment("// Deciding\n", "function alTvInfo(");
const matchTv = segment("async function alMatchTv(", "async function alMatchMovie(");
const candidates = [
  { id: 2016, name: "The Mystic Nine", original: "老九门", date: "2016-07-04", votes: 2000, country: ["CN"] },
  { id: 2026, name: "Mystic Nine", original: "九门", date: "2026-07-30", votes: 40, country: ["CN"] }
];
const ctx = vm.createContext({
  episodePlusAios: require("../episode-plus-aios.js"),
  trustedSeriesAliases:require("../trusted-series-aliases.js"),
  alLearnedAliasRows:()=>[],
  alHints:()=>({url:""}),
  alSearch: async (_kind, name) => {
    if (/mystic nine/i.test(name)) return candidates;
    if (/fallout/i.test(name)) return [
      {id: 24, name: "Fallout", original: "Fallout", date: "2024-04-10", votes: 9000, country: ["US"]}
    ];
    return [];
  },
  alTvDetails: async id => {
    const show = candidates.find(c => c.id === id) ||
      (id === 24 ? {id:24, name:"Fallout", date:"2024-04-10", votes:9000, country:["US"]} : null);
    return show && {...show, seasons:[1,2]};
  },
  alSeason: async (id, season) => {
    if (id === 24) return { episodes: [{ n:7, name:"The Handoff", air:"2026-01-27", runtime:52 }] };
    return { episodes: [{ n:8, name:"Episode 8",
      air: id === 2026 ? "2026-08-01" : "2016-07-12", runtime: id === 2026 ? 44 : 42 }] };
  },
  alTvInfo: (d, sd, ep, season) => ({
    showTitle:d.name, code:"S"+String(season).padStart(2,"0")+"E"+String(ep.n).padStart(2,"0"),
    epTitle:ep.name, airDate:ep.air, isMovie:false, season, episode:ep.n
  })
});
vm.runInContext(filenameParser + "\n" + matcherHelpers + "\n" + matchTv, ctx);
(async () => {
  const filename = "Mystic.Nine.S01E08.2026.2160p.WEB-DL.H265.HDR.60fps.DTS5.1-BlackTV.mkv";
  const link = "https://stremthru.13377001.xyz/opaque/opaque/opaque/opaque/opaque/opaque/opaque/7/opaque";
  const hints = {path:link, url:link, filename,
    mediaTitle:"Mystic Nine · S01E08 · Episode 8",metadataTitle:""};
  const readings = await ctx.alReadings(hints,ctx.alSplitLink(link));
  assert.equal(readings[0].source,"mpv-filename","Opaque StremThru path must not displace actual mpv filename");
  const parsed=readings[0].p;
  assert.equal(parsed.title,"Mystic Nine");
  assert.equal(parsed.season,1);
  assert.equal(parsed.episode,8);
  assert.equal(parsed.year,null,"Post-S/E release year must not become series premiere year");
  assert.equal(parsed.episodeYear,2026);
  assert.equal(parsed.episodeTitle,"","Release year must not become episode title");
  const matched=await ctx.alMatchTv(parsed,44*60);
  assert(matched.info,"2026 S01E08 should be matched against verified episode metadata");
  assert.equal(matched.info.showTitle,"Mystic Nine");
  assert.equal(matched.info.airDate.slice(0,4),"2026");
  assert.notEqual(matched.info.showTitle,"The Mystic Nine","Old show has much higher votes but is the wrong year");

  const old=ctx.alParseName("The.Mystic.Nine.S01E08.2016.1080p.WEB-DL.mkv");
  assert.equal(old.episodeYear,2016);
  const oldMatch=await ctx.alMatchTv(old,42*60);
  assert.equal(oldMatch.info.showTitle,"The Mystic Nine","2016 episode still matches the classic series");

  const unspecified=ctx.alParseName("Mystic.Nine.S01E08.2160p.WEB-DL.mkv");
  const ambiguous=await ctx.alMatchTv(unspecified,44*60);
  assert.equal(ambiguous.info,null,"Without a year do not pick a remake based on vote dominance");
  assert.match(ambiguous.reason,/different years/);

  const wrong=ctx.alParseName("Mystic.Nine.S01E08.2025.2160p.WEB-DL.mkv");
  const rejected=await ctx.alMatchTv(wrong,44*60);
  assert.equal(rejected.info,null,"Neither the 2016 nor the 2026 episode aired in 2025");

  const fallout=ctx.alParseName("Fallout.S02E07.2026.2160p.WEB-DL.mkv");
  assert.equal(fallout.year,null);
  assert.equal(fallout.episodeYear,2026);
  const laterSeason=await ctx.alMatchTv(fallout,52*60);
  assert.equal(laterSeason.info.showTitle,"Fallout","A series begun in 2024 may have an episode aired in 2026");
  assert.equal(laterSeason.info.code,"S02E07");

  assert(source.includes("candidateSource: primary.source"));
  assert(source.includes("parsedYear: p.year || p.episodeYear || null"));
  assert(source.includes('tmdbMatch: out.info ? "verified" : "rejected"'));
  console.log("Mystic Nine 2026 vs 2016, opaque StremThru, release-year position, diagnostics and Fallout regression: PASS");
})().catch(e => { console.error(e); process.exitCode=1; });
