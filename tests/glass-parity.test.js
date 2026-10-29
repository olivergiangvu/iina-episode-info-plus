"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const manifest=require("../Info.json");
assert.equal(manifest.version,"1.3.4-beta.4");
assert.equal(manifest.ghVersion,28);
const begin=overlay.indexOf("/* Episode Info Plus: macOS Light and Dark use DIFFERENT glass materials.");
const end=overlay.indexOf("  @media(prefers-contrast:more)",begin);
assert(begin>=0&&end>begin);
const light=overlay.slice(begin,end),dark=overlay.slice(0,begin);
assert(light.includes("@media (prefers-color-scheme: light)"));
assert(dark.includes("background:rgba(12,14,20,0.84); opacity:var(--bg-opacity)"),
 "Approved Dark glass must remain unchanged");
assert(dark.includes("color:rgba(255,255,255,.94)"));
assert(light.includes("background:rgb(228,234,240)"));
assert(light.includes("opacity:var(--light-glass-opacity,.59)"));
assert(light.includes("#wrap[data-theme=\"glass\"] #text::before {\n      content:none;\n      display:none;"),
 "No opaque patch under the text column");
assert(!light.includes("background:rgba(245,249,253,.52)"));
assert(!light.includes("filter:blur(11px)"));
assert(!light.includes("-webkit-text-stroke:.35px")&&!light.includes("-webkit-text-stroke:.65px"));
assert(!light.includes("0 -1px 0 rgba(249,251,255"),
 "Do not repeat beta.8's outlined glyph artifacts");
for(const selector of [
 ".sn,", ".et,", ".mt,", ".ov,", ".person b,", ".person i,", ".next,", ".rat {"
])assert(light.includes(selector),"Missing native-style glyph selector "+selector);
assert(light.includes("-webkit-text-stroke:0"));
assert(light.includes("text-shadow:none"));
assert(light.includes("color:#101820")&&light.includes("color:#17202b"));
assert(light.includes("background:rgba(240,245,249,.68)"),"Up Next pill must stay readable");
assert(sidebar.includes("--ep-ink:#1f2023")&&sidebar.includes("color:var(--ep-text); background:transparent"),
 "Do not regress the user-approved native sidebar");
assert(sidebar.includes("color:#916208 !important"),"Keep warm amber sidebar rating");
const fn=overlay.slice(overlay.indexOf("function applyBackgroundShade(value)"),overlay.indexOf("// Episode data from main.js"));
const styles={};
const context=vm.createContext({Number,Math,document:{documentElement:{style:{setProperty:(key,val)=>styles[key]=val}}}});
vm.runInContext(fn,context);
context.applyBackgroundShade(.57);
assert.equal(styles["--bg-opacity"],.57,"Dark Shade unchanged");
assert(Math.abs(styles["--light-glass-opacity"]-.5925)<.00001,"Natural Light OSD tint at Shade 57%");
context.applyBackgroundShade(1);
assert.equal(styles["--light-glass-opacity"],.7);
context.applyBackgroundShade(0);
assert.equal(styles["--light-glass-opacity"],.45);
const lum=arr=>arr.map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4})
  .reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const bg=[228,234,240].map(x=>Math.round(x*.5925));
assert(contrast([16,24,32],bg)>=4.5,"Text on pure black footage at default Shade requires AA contrast");
assert(contrast([23,32,43],bg)>=4.5,"Secondary text on black requires AA contrast at default Shade");
assert(overlay.includes('id="cast"')&&overlay.includes('id="next"'));
console.log("Beta.9 native-style unoutlined Light ink, single uniform film, Dark/Sidebar isolation: PASS");
