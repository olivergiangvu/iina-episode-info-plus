"use strict";
// Bridge-safe URL normalization for IINA's HTTPRequestOption<String, String>.
function buildUrl(base,params){
 if(!/^https:\/\/(?:api\.themoviedb\.org|api\.tvmaze\.com)\//.test(String(base||"")))
   throw new Error("Metadata API host not allowed");
 var q=Object.keys(params||{}).sort().map(function(key){
   var v=params[key];if(v==null)return "";
   if(!["string","number","boolean"].includes(typeof v))
     throw new Error("Invalid query value type");
   return encodeURIComponent(key)+"="+encodeURIComponent(String(v));
 }).filter(Boolean).join("&");
 return base+(q?(base.indexOf("?")>=0?"&":"?")+q:"");
}
function safeError(error){
 var raw=typeof error==="string"?error:
   (error&&(error.message||error.reason))||"Request failed";
 return String(raw).replace(/https?:\/\/[^\s"']+/gi,"[URL]")
   .replace(/(?:api_key|apikey|token|secret)[=:]\S+/gi,"[credential redacted]")
   .slice(0,115);
}
module.exports={buildUrl:buildUrl,safeError:safeError};
