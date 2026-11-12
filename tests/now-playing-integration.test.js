"use strict";
// Release regression gate: verified EP+ artwork must still reach IINA native Now Playing.
// This test is intentionally version-neutral and runs for EVERY PR to main.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "main.js"), "utf8");
const manifest = require("../Info.json");
const { createNowPlayingProbe } = require("../epplus-now-playing.js");

assert.equal(manifest.identifier, "io.github.olivergiangvu.iinaepisodeinfoplus");
assert(manifest.permissions.includes("file-system"), "mpv video-add must retain file permission");
assert(manifest.permissions.includes("network-request"), "artwork download must retain network permission");
for (const anchor of [
  'require("./epplus-now-playing.js")',
  "episodePlusNP.createNowPlayingProbe",
  'sidebar.onMessage("episodeSelected", function(info)',
  "info.metadataPending !== true && info.posterUrl && info.tmdbId",
  "nowPlayingProbe.tryCurrent(info)",
  'sidebar.onMessage("clearEpisode", function()',
  'event.on("iina.file-loaded", function()'
]) {
  assert(source.includes(anchor), "Now Playing integration missing: " + anchor);
}
assert.equal((source.match(/nowPlayingProbe\.invalidate\(\)/g) || []).length, 2,
  "invalidate artwork downloads on BOTH media switch and cleared selection");

async function run() {
  let url = "https://cdn.example.test/movie/index.m3u8";
  let resolveDownload = null;
  const calls = [];
  const logs = [];
  let trackList = [];
  let videoId = "1";
  let lastFile = null;
  const deps = {
    iina: {
      http: {
        download: async (artwork, dest) => {
          calls.push(["download", artwork, dest]);
          lastFile = "/tmp/" + dest.replace(/^@tmp\//, "");
        }
      },
      file: { exists: () => true },
      mpv: {
        getNative: () => trackList,
        getString: key => key === "vid" ? videoId : "",
        set: (key, val) => calls.push(["set", key, val]),
        command: (cmd, args) => {
          calls.push(["command", cmd, args]);
          if (cmd === "video-add") {
            trackList.push({
              type: "video",
              albumart: true,
              "external-filename": args[0]
            });
          }
        }
      }
    },
    core: { status: { get url() { return url; } } },
    utils: { resolvePath: name => "/tmp/" + name.replace(/^@tmp\//, "") },
    withTimeout: promise => promise,
    log: msg => logs.push(msg)
  };
  const p = createNowPlayingProbe(deps);
  const info = {
    isMovie: false,
    showTitle: "Doc Martin",
    code: "S01E05",
    epTitle: "Of All the Harbours in All the Towns",
    metadataPending: false,
    tmdbId: "1234",
    posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg"
  };
  assert.equal(p.titleFor(info), "Doc Martin · S01E05 · Of All the Harbours in All the Towns");
  assert.equal(await p.tryCurrent(info), true);
  assert.equal(calls.filter(x => x[0] === "download").length, 1);
  assert(calls.some(x => x[0] === "set" && x[1] === "file-local-options/force-media-title"));
  const add = calls.find(x => x[0] === "command" && x[1] === "video-add");
  assert(add, "must call mpv video-add");
  assert.equal(add[2][1], "auto+attached-picture", "artwork must NOT replace active video");
  assert.equal(add[2][0], lastFile);
  assert.equal(videoId, "1");
  assert.equal(await p.tryCurrent(info), false, "same-file duplicate must be ignored");

  // No unverified identity, absent poster, or disallowed host may attach artwork.
  p.invalidate();
  const prior = calls.length;
  assert.equal(await p.tryCurrent({ ...info, metadataPending: true }), false);
  assert.equal(await p.tryCurrent({ ...info, posterUrl: "https://other.invalid/x.jpg" }), false);
  assert.equal(await p.tryCurrent({ ...info, posterUrl: "" }), false);
  assert.equal(calls.length, prior);

  // A superseded async download must never attach stale poster to the next episode.
  p.invalidate();
  deps.iina.http.download = (u, dest) => new Promise(resolve => { resolveDownload = resolve; });
  const stale = p.tryCurrent(info);
  assert.equal(typeof resolveDownload, "function");
  url = "https://cdn.example.test/next/index.m3u8";
  resolveDownload("/tmp/done.jpg");
  assert.equal(await stale, false);
  assert.equal(calls.filter(x => x[0] === "command").length, 1,
    "stale download must not add a second track");

  // After file change, new verified metadata should attach on the new session.
  p.invalidate();
  deps.iina.http.download = async (u, dest) => {
    calls.push(["download", u, dest]);
  };
  assert.equal(await p.tryCurrent({ ...info, code: "S01E06" }), true);
  assert.equal(calls.filter(x => x[0] === "command").length, 2);
  console.log("PASS: Now Playing verified artwork, video-safe track, identity gate, duplicate/stale guards");
}
run().catch(e => { console.error(e); process.exitCode = 1; });
