"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const manifest=require("../Info.json");
assert.equal(manifest.version,"1.3.3-beta.4");
assert.equal(manifest.ghVersion,18);
// Native translucent sidebar + semantic Trakt+ ink remain untouched.
for(const token of ["--ep-ink:#1f2023","--ep-muted:#2c3d52",
  "--plus-glass-panel:rgba(248,250,253,.16)"])
 assert(sidebar.includes(token),"Missing existing sidebar style: "+token);
assert(sidebar.includes("color:var(--ep-text); background:transparent"));
const mark="/* Episode Info Plus: macOS Light and Dark use DIFFERENT glass materials.";
const begin=overlay.indexOf(mark);
const end=overlay.indexOf("  @media(prefers-contrast:more)",begin);
assert(begin>0&&end>begin,"Missing isolated Light Glass media CSS");
const light=overlay.slice(begin,end);
const dark=overlay.slice(0,begin);
assert(light.includes("@media (prefers-color-scheme: light)"),
 "Light material must be OS-controlled");
assert(!dark.includes("opacity:clamp(.68,var(--bg-opacity),.92)"),
 "Do not modify Dark Mode glass opacity");
for(const fragment of [
 "background:rgb(243,247,252)",
 "opacity:clamp(.68,var(--bg-opacity),.92)",
 "color:#19232f",
 "color:#293749",
 "opacity:1",
 "background:rgba(255,255,255,.28)",
 'data-glass="clear"',
 'data-glass="colorful"'
])assert(light.includes(fragment),"Missing new Light Glass CSS: "+fragment);
assert(!light.includes("background:rgba(10,16,24,.84)"),
 "Light mode must not inherit the prior Smoked Glass override");
assert(light.includes(':not([data-glass="clear"]) .ov'),
 "Specific Frosted/Colorful dark-mode selectors must be overridden in Light Mode");
assert(!light.includes("color:#f9fbff"),
 "Light Mode must not duplicate Dark Mode white typography");
assert(dark.includes("background:rgba(12,14,20,0.84); opacity:var(--bg-opacity)"),
 "Original dark frosted opacity must remain unchanged");
assert(dark.includes("color:rgba(255,255,255,.94)"),
 "Original dark synopsis remains near-white");
assert(overlay.includes('id="cast"')&&overlay.includes('id="next"'));
assert(overlay.includes("#wrap[data-theme=\"glass\"] #art::before"),
 "Poster blur must remain enabled");
assert(overlay.includes("prefers-contrast:more"));
// WCAG AA against worst-case absolute-black video under min-alpha Light glass.
const bg=[243,247,252].map(x=>Math.round(x*.68));
const lum=rgb=>rgb.map(v=>{const x=v/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4})
.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const primary=ratio([25,35,47],bg),secondary=ratio([41,55,73],bg);
assert(primary>=4.5&&secondary>=4.5,
 "Light glass must protect both heading and metadata even on black video");
console.log("Distinct Light/Dark Glass, poster/Cast/Up Next and black-frame AA contrast "+
 primary.toFixed(2)+"/"+secondary.toFixed(2)+" PASS");
