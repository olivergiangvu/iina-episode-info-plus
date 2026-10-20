"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const overlay=fs.readFileSync(path.resolve(__dirname,"../overlay.html"),"utf8");
const sidebar=fs.readFileSync(path.resolve(__dirname,"../sidebar.html"),"utf8");
const info=require("../Info.json");
assert.equal(info.version,"1.3.3-beta.2");
assert.equal(info.ghVersion,16);
for(const fragment of [
 "--plus-glass-panel:rgba(16,22,32,.14)","--plus-glass-border:rgba(255,255,255,.16)",
 "--plus-glass-primary:#e9edf3","--plus-glass-secondary:rgba(233,237,243,.76)",
 "--plus-glass-blur:14px","--plus-glass-panel:rgba(248,250,253,.16)",
 "--plus-glass-border:rgba(34,49,70,.15)","--plus-glass-primary:#19283a",
 "--plus-glass-secondary:#40546d"
])assert(sidebar.includes(fragment),"Shared semantic glass palette missing "+fragment);
assert(sidebar.includes("color:var(--ep-text); background:transparent"),
 "Native sidebar transparency must remain");
assert(sidebar.includes("--ep-muted:#2c3d52"),"Light sidebar secondary text requires sufficient contrast");
const c=overlay.indexOf('/* In Light Mode a translucent WHITE Clear card');
const e=overlay.indexOf('#wrap:not([data-theme="glass"]) .person b',c);
assert(c>0&&e>c);
const clear=overlay.slice(c,e);
for(const rule of [
 "background:transparent","background:rgba(10,16,24,.84)",
 "opacity:clamp(.72,var(--bg-opacity),1)","color:#f9fbff",
 "color:rgba(255,255,255,.94)","color:#ffd25b","text-shadow:0 1px 2px"
])assert(clear.includes(rule),"Glass Clear loses readability rule: "+rule);
assert(!clear.includes("rgba(248,251,253"),
 "Smoked glass must not include former white haze");
assert(!clear.includes("color:#142132"),"Former low contrast dark text must not return");
assert(clear.includes(' #card::after {\n      display:none;'),
 "Clear must not add a bright specular layer that lowers text contrast");
// WCAG worst case: a totally white video frame under the guaranteed minimum
// smoked alpha (0.84*.68); white title must remain readable at >=4.5:1.
const alpha=.84*.72;
const bg=[10,16,24].map(c=>Math.round(c*alpha+255*(1-alpha)));
const srgb=c=>{let s=c/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4)};
const luminance=rgb=>.2126*srgb(rgb[0])+.7152*srgb(rgb[1])+.0722*srgb(rgb[2]);
const fg=[249,251,255],contrast=(luminance(fg)+.05)/(luminance(bg)+.05);
const secondary=bg.map(c=>Math.round(255*.94+c*.06));
const secondaryContrast=(luminance(secondary)+.05)/(luminance(bg)+.05);
assert(secondaryContrast>=4.5,
 "Secondary text (Cast, synopsis and Up Next) must also meet WCAG AA: "+
 secondaryContrast.toFixed(2));
assert(contrast>=4.5,"Smoked glass should pass AA on a pure white video: "+contrast.toFixed(2));
assert(overlay.includes("display:none !important;")&&overlay.includes("color:CanvasText !important;"),
 "High-contrast accessibility must bypass decorative glass tints");
assert(overlay.includes('id="cast"')&&overlay.includes('id="next"'));
assert(overlay.includes("#wrap[data-theme=\"glass\"] #art::before"),
 "Frosted/Colorful poster blur must remain intact");
console.log("Glass Clear light readability, WCAG worst-case contrast "+contrast.toFixed(2)+":1 PASS");
