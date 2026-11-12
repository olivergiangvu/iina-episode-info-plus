"use strict";
// Permanent feature-preservation contract. This is a deletion guard,
// NOT a replacement for functional tests or real Mac playback smoke tests.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.join(__dirname, "..");
const main = fs.readFileSync(path.join(root, "main.js"), "utf8");
const sidebar = fs.readFileSync(path.join(root, "sidebar.html"), "utf8");
const overlay = fs.readFileSync(path.join(root, "overlay.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "Info.json"), "utf8"));
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/);
assert(Number.isInteger(manifest.ghVersion) && manifest.ghVersion > 0);
const contracts = [
  ["TMDB verified lookup", main, ['api.themoviedb.org/3', 'autoLookupResult', 'autoLookupConflict']],
  ["TVmaze fallback", main, ['episodePlusTvmaze.lookup']],
  ["AIOStreams parsing", main, ['episodePlusAios.extract']],
  ["TheIntroDB skip metadata", main, ['api.theintrodb.org/v4/media?', 'skipNow']],
  ["Verified episode to overlay", main, ['episodeSelected', 'showOverlay', 'resolveSegments']],
  ["Native Now Playing poster", main, ['epplus-now-playing.js', 'nowPlayingProbe.tryCurrent(info)']],
  ["Subtitle loading", main, ['sub-add', 'loadSubdlSub', 'loadSubdlSub']],
  ["Cast/Up Next", main, ['loadCardExtras', 'cardNextFor', 'cardCastFor']],
  ["Stream changes / cleanup", main, ['iina.file-loaded', 'clearEpisode', 'stopTimeWatcher']],
  ["Auto lookup sidebar", sidebar, ['autoLookupResult', 'showAutoMatch', 'Provisional identity']],
  ["Light/Dark UI", overlay, ['prefers-color-scheme: light', 'prefers-color-scheme: dark']]
];
for (const [name, text, anchors] of contracts) {
  for (const anchor of new Set(anchors)) {
    assert(text.includes(anchor), "Protected capability missing [" + name + "]: " + anchor);
  }
}
for (const permission of ["network-request", "video-overlay", "file-system", "show-osd"]) {
  assert(manifest.permissions.includes(permission), "Required IINA permission missing: " + permission);
}
console.log("PASS: Protected EP+ capability inventory (" + contracts.length + " capabilities)");
