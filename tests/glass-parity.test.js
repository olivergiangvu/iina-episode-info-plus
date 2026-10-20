"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const info=require("../Info.json");
assert.equal(info.version,"1.3.3-beta.1");
assert.equal(info.ghVersion,15);
// This contract intentionally mirrors Trakt+'s token names and values.
for(const fragment of [
 "--plus-glass-panel:rgba(16,22,32,.14)",
 "--plus-glass-border:rgba(255,255,255,.16)",
 "--plus-glass-primary:#e9edf3",
 "--plus-glass-secondary:rgba(233,237,243,.76)",
 "--plus-glass-blur:14px",
 "--plus-glass-panel:rgba(248,250,253,.16)",
 "--plus-glass-border:rgba(34,49,70,.15)",
 "--plus-glass-primary:#19283a",
 "--plus-glass-secondary:#40546d"
])assert(sidebar.includes(fragment),"Shared Plus palette is missing "+fragment);
assert(!sidebar.includes("background:rgba(248,249,252,.96)"),
 "Opaque sidebar light background must not hide IINA's native material");
assert(sidebar.includes("color:var(--ep-text); background:transparent"),
 "Native sidebar background must remain transparent");
assert(/data-glass="clear"\]\s+#card\s*\{\s*background:rgba\(248,251,253,calc\(var\(--bg-opacity\) \* \.46\)\)/.test(overlay),
 "Clear light glass must follow Shade at a reduced tint alpha");
assert(!overlay.includes("background:rgba(250,251,253,var(--bg-opacity))"),
 "Old near-opaque light Clear must not regress");
assert(overlay.includes("prefers-color-scheme:light"));
assert(overlay.includes("prefers-contrast:more"));
assert(overlay.includes("backdrop-filter:blur(14px) saturate(130%)"));
assert(overlay.includes("#wrap[data-theme=\"glass\"] #art::before"),
 "Poster-based blur must stay intact for Frosted/Colorful");
assert(overlay.includes("var(--bg-opacity)"),"Shade control must remain live");
assert(overlay.includes('id="cast"')&&overlay.includes('id="next"'));
console.log("Episode Info Plus native-glass parity contract PASS");
