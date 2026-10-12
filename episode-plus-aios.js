"use strict";
// Safely extract AIOStreams' *user-facing* playback title from an HLS URI
// fragment (#aios_title=), including labels like index.m3u8#aios_title=... .
// A fragment is a title hint, NEVER a verified external media ID.
function decode(value) {
 var s=String(value||"").replace(/\+/g," ");
 for(var n=0;n<2&&/%[0-9a-f]{2}/i.test(s);n++){
  try{s=decodeURIComponent(s);}catch(_){return "";}
 }
 return s;
}
function parse(source) {
 var raw=String(source||""),hash=raw.indexOf("#");
 if(hash<0||hash>2000||raw.length-hash>900)return null;
 var part=raw.slice(hash+1).split("&").filter(Boolean),found=null;
 for(var i=0;i<part.length;i++){
  var eq=part[i].indexOf("=");
  if(eq<=0||decode(part[i].slice(0,eq)).toLowerCase()!=="aios_title")continue;
  if(found)return {conflict:true}; // Duplicate title parameters are ambiguous.
  var value=decode(part[i].slice(eq+1)).trim();
  if(value.length<10||value.length>350||/[\x00-\x1f]/.test(value))return null;
  var m=/^(.{2,170}?)\s*[·•]\s*[Ss](\d{1,2})[Ee](\d{1,4})(?:\s*[·•]\s*(.{1,170}))?\s*$/u.exec(value);
  if(!m)return null;
  var title=m[1].trim(),season=Number(m[2]),episode=Number(m[3]),episodeTitle=String(m[4]||"").trim();
  if(!title||season>99||episode<1||episode>9999||
     /(?:https?:\/\/|[?#=]|index\.m3u8)/i.test(title)||
     /[?#=]/.test(episodeTitle))return null;
  var code="S"+String(season).padStart(2,"0")+"E"+String(episode).padStart(2,"0");
  found={title:title,season:season,episode:episode,episodeTitle:episodeTitle,
   file:title+" "+code+(episodeTitle?" - "+episodeTitle:""),
   raw:value,source:"aios-title"};
 }
 return found;
}
function norm(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\p{L}\p{N}]+/gu,"");}
function extract(h) {
 var fields=["path","url","filename","mediaTitle","metadataTitle"],match=null;
 for(var i=0;i<fields.length;i++){
  var p=parse(h&&h[fields[i]]);
  if(!p)continue;
  if(p.conflict)return {conflict:true,reason:"duplicate-title"};
  if(!match){match=p;continue;}
  if(norm(match.title)!==norm(p.title)||match.season!==p.season||
     match.episode!==p.episode||norm(match.episodeTitle)!==norm(p.episodeTitle))
    return {conflict:true,reason:"aios-title-mismatch"};
 }
 return match;
}
module.exports={parse:parse,extract:extract};
