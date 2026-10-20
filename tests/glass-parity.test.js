"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const info=require("../Info.json");
assert.equal(info.version,"1.3.3-beta.5");
assert.equal(info.ghVersion,19);
assert(sidebar.includes("--ep-ink:#1f2023"));
assert(sidebar.includes("color:var(--ep-text); background:transparent"));
const mark="/* Episode Info Plus: macOS Light and Dark use DIFFERENT glass materials.";
const first=overlay.indexOf(mark),end=overlay.indexOf("  @media(prefers-contrast:more)",first);
assert(first>0&&end>first,"Missing OS-scoped Light material");
const light=overlay.slice(first,end),dark=overlay.slice(0,first);
assert(light.includes("@media (prefers-color-scheme: light)"));
assert(dark.includes("background:rgba(12,14,20,0.84); opacity:var(--bg-opacity)"),
 "Dark Mode material must be unchanged");
assert(dark.includes("color:rgba(255,255,255,.94)"));
assert(!light.includes("opacity:clamp(.68,var(--bg-opacity),.92)"),
 "Regressed global white haze is forbidden");
for(const token of ["background:rgb(244,248,252)",
  "opacity:var(--light-glass-opacity,.16)",
  "#wrap[data-theme=\"glass\"] #text::before",
  "background:rgba(245,249,253,.52)",
  "filter:blur(11px)",
  "color:#17202b","color:#1a2531",
  "background:rgba(243,247,252,.10)",
  "display:none","data-glass=\"clear\""])
 assert(light.includes(token),"Missing translucent local-glass design: "+token);
assert(!light.includes("opacity:.72; /* old WebKit fallback */"));
assert(!light.includes("background:rgb(243,247,252)"));
assert(overlay.includes("function applyBackgroundShade(value)"));
assert(overlay.includes("Math.max(.07,Math.min(.24,v*.24))"));
assert(overlay.includes("applyBackgroundShade(d.bgOpacity)") &&
  overlay.includes("applyBackgroundShade(d.value)"),
 "Initial and live Shade events must update the same Light variable");
// Exercise the ACTUAL IINA WebView helper in a minimal isolated JS context.
const helper=overlay.slice(overlay.indexOf("function applyBackgroundShade(value)"),
  overlay.indexOf("// Episode data from main.js"));
const vars={};
const ctx=vm.createContext({
 document:{documentElement:{style:{setProperty:(k,v)=>{vars[k]=v}}}},
 Number:Number,Math:Math
});
vm.runInContext(helper,ctx);
ctx.applyBackgroundShade(.57);
assert.equal(vars["--bg-opacity"],.57,"Dark Mode Shade value must remain exact");
assert(Math.abs(vars["--light-glass-opacity"]-.1368)<.00001,
 "Light Mode must be ~14% transparent tint at reported Shade 57%");
ctx.applyBackgroundShade(1);
assert.equal(vars["--bg-opacity"],1);
assert.equal(vars["--light-glass-opacity"],.24,"Global Light tint cap");
ctx.applyBackgroundShade(.02);
assert.equal(vars["--light-glass-opacity"],.07,"Minimum neutral tint");
assert(overlay.includes('id="cast"')&&overlay.includes('id="next"'));
assert(overlay.includes("prefers-contrast:more"));
// Local cushioning intentionally softens only the text zone, not the entire
// glass panel; contrast is scene-dependent and requires macOS visual testing.
console.log("Light native-glass tint 13.68% at Shade 57%; local text scrim 52%; Dark untouched: PASS");
