"use strict";
// Validate the actual release artifact, not merely source files.
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const artifact = process.argv[2];
if (!artifact) throw new Error("Usage: node scripts/verify-plugin-package.js <file.iinaplgz>");
const root = path.resolve(__dirname, "..");
const zip = new Set(execFileSync("unzip", ["-Z1", artifact], { encoding: "utf8" })
  .split(/\r?\n/).map(s => s.trim()).filter(Boolean));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "Info.json"), "utf8"));
assert(zip.has("Info.json"), "Plugin archive missing Info.json");
assert(zip.has(manifest.entry), "Plugin archive missing entry script");
for (const asset of ["sidebar.html", "overlay.html", "LICENSE", "epplus-now-playing.js"]) {
  assert(zip.has(asset), "Plugin archive missing protected asset " + asset);
}
const explored = new Set();
function inspectJs(filename) {
  if (explored.has(filename)) return;
  explored.add(filename);
  assert(zip.has(filename), "Plugin archive missing dependency " + filename);
  const src = fs.readFileSync(path.join(root, filename), "utf8");
  const regex = /require\(\s*["'](\.\/[^"']+)["']\s*\)/g;
  let m;
  while ((m = regex.exec(src))) {
    const relative = path.posix.normalize(m[1].replace(/^\.\//, ""));
    assert(!relative.startsWith("../"), "Module escapes plugin root: " + relative);
    inspectJs(relative);
  }
}
inspectJs(manifest.entry);
console.log("PASS: Actual .iinaplgz includes entry, UI assets, Now Playing and all " +
  explored.size + " transitive JS modules");
