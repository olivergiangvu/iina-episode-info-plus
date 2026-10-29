"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const main = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
const manifest = require("../Info.json");
const { createNowPlayingProbe } = require("../epplus-now-playing.js");
assert.strictEqual(manifest.version, "1.3.4-beta.4.1");
for (const needle of [
  'require("./epplus-now-playing.js")',
  "nowPlayingProbe.tryCurrent(info)",
  "nowPlayingProbe.invalidate()",
  "info.metadataPending !== true && info.posterUrl && info.tmdbId",
]) assert(main.includes(needle), "missing integration: " + needle);

async function run() {
  let url = "https://cdn.example.invalid/index.m3u8";
  const calls = [], logs = [];
  const deps = {
    iina: {
      http: {download: async (poster, dest) => calls.push(["download", poster, dest])},
      file: {exists: () => true},
      mpv: {
        getNative: () => [],
        getString: () => "1",
        set: (k, v) => calls.push(["set", k, v]),
        command: (name, args) => calls.push(["command", name, args])
      }
    },
    core: { status: { get url() { return url; } } },
    utils: {resolvePath: () => "/tmp/epplus-poster.jpg"},
    withTimeout: async p => p,
    log: m => logs.push(m)
  };
  const p = createNowPlayingProbe(deps);
  const item = {
    isMovie: false, showTitle: "City of Splendour", epTitle: "Episode 3",
    code: "S01E03", metadataPending: false, tmdbId: "123",
    posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg"
  };
  assert.strictEqual(await p.tryCurrent(item), true);
  assert(calls.some(x => x[0] === "download"));
  assert(calls.some(x => x[0] === "set" && x[1] === "file-local-options/force-media-title"));
  const c = calls.find(x => x[0] === "command");
  assert(c && c[1] === "video-add" && c[2][1] === "auto+attached-picture",
         "album art must remain a non-selected attached picture");
  assert.strictEqual(await p.tryCurrent(item), false, "no duplicate per video URL");
  p.invalidate();
  const count = calls.length;
  assert.strictEqual(await p.tryCurrent({...item, posterUrl: "https://other.example/p.jpg"}), false);
  assert.strictEqual(await p.tryCurrent({...item, metadataPending: true}), false);
  assert.strictEqual(calls.length, count, "no unverified downloads");
  // If the stream changes while a poster downloads, never add outdated artwork.
  p.invalidate();
  let release;
  deps.iina.http.download = () => new Promise(resolve => { release = resolve; });
  const pending = p.tryCurrent(item);
  url = "https://cdn.example.invalid/new-episode.m3u8";
  release();
  assert.strictEqual(await pending, false, "stale poster must not attach");
  assert.strictEqual(calls.filter(x => x[0] === "command").length, 1);
  p.invalidate();
  console.log("PASS: EP+ beta.4.1 poster restore, verified TMDB art, no duplicate / stale track");
}
run().catch(e => { console.error(e); process.exitCode = 1; });
