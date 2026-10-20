"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const info=require("../Info.json");
assert.equal(info.version,"1.3.3-beta.7");
assert.equal(info.ghVersion,21);
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
  '#wrap[data-theme="glass"] #text::before',
  "content:none",
  "display:none",
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
// Light uses a single homogeneous card-wide film; content remains opaque.
// No text-only white background (the visible central haze) may return.
assert(!light.includes("background:rgba(245,249,253,.52)"),
 "Former 52% text scrim was the opaque patch in the center of the card");
assert(!light.includes("inset:-8px -12px") && !light.includes("filter:blur(11px)"),
 "No separately blurred rectangle behind the title, synopsis and cast");
assert(light.includes(' #text::before {\n      content:none;\n      display:none;'),
 "The text-column pseudo element must be disabled only in Light Mode");
assert(light.includes("opacity:var(--light-glass-opacity,.16)"),
 "Uniform card-wide Light glass opacity must be unchanged");
assert(dark.includes("background:rgba(12,14,20,0.84); opacity:var(--bg-opacity)"),
 "Dark Mode background is approved and must remain unchanged");
assert(!light.includes("position:relative;\n      isolation:isolate;\n      z-index:0;"),
 "Remove isolated stacking context from the former text scrim");
assert(light.includes("/* beta.6: micro-typography"),
 "Preserve microtext readability and color hierarchy after removing scrim");
// Contrast now depends on the video frame beneath the uniform translucent
// Light panel: CI cannot guarantee contrast without screen capture in IINA.
// The previous low-contrast inline verification styles must have a Light-only
// override. Do not change the source hues for the already-approved Dark Mode.
assert(sidebar.includes('body #s-meta .rat {\n      color:#916208 !important'),
 "Light sidebar rating should use a warm, readable amber");
assert(sidebar.includes("body #s-auto #epplus-match-state {") &&
  sidebar.includes("color:#17623f !important"),
 "Verified status requires opaque deep green in Light Mode");
assert(sidebar.includes('data-pending", info.metadataPending ? "true" : "false"'),
 "Provisional verified state must remain visually distinguishable");
assert(sidebar.includes('body #s-auto #epplus-match-state[data-pending="true"]'));
assert(sidebar.includes("color:#195c91 !important"),
 "Search correction link should remain distinct and legible");
const microStart=light.indexOf("/* beta.6: micro-typography");
assert(microStart>=0,"Missing Light-only Glass microtype rules");
const micro=light.slice(microStart);
for(const k of [
 "#wrap[data-theme=\"glass\"] .sn,",
 "#wrap[data-theme=\"glass\"] .mt,",
 "#wrap[data-theme=\"glass\"] .ov,",
 "#wrap[data-theme=\"glass\"] .person i,",
 "#wrap[data-theme=\"glass\"] .next .lbl,",
 "font-size:12.25px","font-weight:550","color:#344354",
 "color:#344557","opacity:1","text-shadow:none"
])assert(micro.includes(k),"Missing clear microtext rule "+k);
assert(!dark.includes("/* beta.6: micro-typography"),"Dark styling must not change");
assert(!light.includes("background:rgba(250,251,253,var(--bg-opacity))"),
 "No new opaque full-Glass background allowed");

console.log("beta.7 uniform Light Glass (central haze removed), microtype, rating and untouched Dark baseline PASS");
