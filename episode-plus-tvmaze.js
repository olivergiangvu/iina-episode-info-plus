"use strict";
// Episode Info Plus: verified TVmaze fallback (no API key).
// Never equate a fuzzy search hit or route-only season number with a verified series.
function norm(s){
 return String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
  .toLowerCase().replace(/&/g," and ").replace(/['’]/g,"").replace(/[^\p{L}\p{N}]+/gu,"");
}
function plain(s){
 return String(s||"").replace(/<\s*br\s*\/?>/gi,"\n").replace(/<\/(?:p|div|li)>/gi,"\n")
  .replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
  .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<")
  .replace(/&gt;/gi,">").replace(/&#(\d{1,7});/g,function(_,n){
   var v=+n;return v>0&&v<=0x10ffff?String.fromCodePoint(v):"";
  }).replace(/\n{3,}/g,"\n\n").trim().slice(0,3000);
}
function yearFromPlayerLabel(label,title){
 var s=String(label||"").trim(),m=/^(.*?)\s*\((19\d{2}|20\d{2})\)$/.exec(s);
 return m&&norm(m[1])===norm(title)?+m[2]:null;
}
function episodeCode(s,e){return "S"+String(s).padStart(2,"0")+"E"+String(e).padStart(2,"0");}
function imageUrl(v){
 var s=String(v||"");
 // Avoid untrusted URL injection in remote metadata or accidental token leakage.
 return /^https:\/\/static\.tvmaze\.com\/uploads\/images\/[\w./-]+$/i.test(s)?s:"";
}
async function lookup(input,fetchJSON){
 var p=input||{},title=String(p.title||"").trim(),s=Number(p.season),e=Number(p.episode);
 if(!title||title.length>220||!Number.isInteger(s)||s<1||s>100||
   !Number.isInteger(e)||e<1||e>9999||typeof fetchJSON!=="function")return null;
 var results=await fetchJSON("/search/shows",{q:title});
 if(!Array.isArray(results)||!results.length)return null;
 var candidates=results.slice(0,15).map(function(x){return x&&x.show;})
  .filter(function(show){return show&&Number.isInteger(show.id)&&norm(show.name)===norm(title);});
 var y=Number(p.year),haveYear=Number.isInteger(y)&&y>=1900&&y<=2100;
 if(haveYear)candidates=candidates.filter(function(show){return Number(String(show.premiered||"").slice(0,4))===y;});
 if(!candidates.length)return null;
 var show=null,episode=null;
 if(candidates.length===1){
  show=candidates[0];
  episode=await fetchJSON("/shows/"+show.id+"/episodebynumber",{season:s,number:e});
 }else{
  // Different-year shows can have identical English titles and S/E codes.
  // Validate all same-title candidates; only a uniquely close exact-episode
  // runtime may resolve an otherwise ambiguous title. Truncated catalogues,
  // unknown episode runtimes and close competitors remain unresolved.
  if(haveYear||results.length>=15||candidates.length>6||!(p.seconds>0))return null;
  var verified=[];
  for(var i=0;i<candidates.length;i++){
   var item=await fetchJSON("/shows/"+candidates[i].id+"/episodebynumber",{season:s,number:e});
   if(!item)continue;
   if(Number(item.season)!==s||Number(item.number)!==e||!(item.runtime>0))return null;
   verified.push({show:candidates[i],episode:item});
  }
  var close=verified.filter(function(v){
   var expected=Number(v.episode.runtime)*60;
   return Math.abs(Number(p.seconds)-expected)<=Math.max(150,expected*0.10);
  });
  if(close.length!==1)return null;
  show=close[0].show;episode=close[0].episode;
 }
 if(!episode||Number(episode.season)!==s||Number(episode.number)!==e)return null;
 if(p.seconds>0&&episode.runtime>0){
  var ratio=Number(p.seconds)/(Number(episode.runtime)*60);
  if(ratio<0.5||ratio>2)return null;
 }
 var imdb=String(show.externals&&show.externals.imdb||"");
 if(!/^tt\d{6,10}$/.test(imdb))imdb="";
 var rating=Number(episode.rating&&episode.rating.average);
 var poster=imageUrl(show.image&&(show.image.medium||show.image.original));
 var overview=plain(episode.summary);
 return {
  isStream:true,isMovie:false,showTitle:show.name,
  epTitle:String(episode.name||"").trim()||"Episode "+e,
  code:episodeCode(s,e),season:s,episode:e,
  airDate:String(episode.airdate||""),rating:Number.isFinite(rating)&&rating>0?rating.toFixed(1):"",
  overview:overview||"No episode synopsis is available from TVmaze.",
  posterUrl:poster,tmdbId:"",parentImdbId:imdb,
  metadataPending:false,identitySource:"TVmaze verified",metadataSource:"TVmaze",
  tvmazeId:show.id
 };
}
module.exports={lookup:lookup,yearFromPlayerLabel:yearFromPlayerLabel,plain:plain};
