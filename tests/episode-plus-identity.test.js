"use strict";
const assert=require("assert");
const fs=require("fs");
const path=require("path");
const vm=require("vm");
const {identify,inspectUrls}=require("../episode-plus-identity.js");
const norm=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"");
function ep(title,s,e,source){return {p:{title,season:s,episode:e,year:null,episodeTitle:"Bless Your Dead Little Hearts"},source:source||"filename",weak:false};}
const hash="a".repeat(40);
const comet="https://comet.feels.legal/a/playback/"+hash+"/0/0/3/1?media_id=tt6517102&media_type=series&torrent_name=Castlevania.S03E01.Bless.Your.Dead.Little.Hearts.1080p.REMUX.mkv";
const found=identify({path:comet,url:comet},[ep("Castlevania",3,1)],norm);
assert(found&&found.info&&!found.info.isMovie);
assert.equal(found.info.code,"S03E01");
assert.equal(found.info.parentImdbId,"tt6517102");
assert.strictEqual(found.info.metadataPending,true);
assert.equal(found.info.showTitle,"Castlevania");
assert.equal(found.info.identitySource,"IMDb + filename");
assert(!identify({path:comet},[ep("Castlevania",3,2)],norm),"Route mismatch must block");
assert(!identify({path:comet},[ep("Castlevania",3,1),ep("Vox Machina",3,1)],norm),"Show title conflict must block");
assert(!identify({path:comet},[{p:{...ep("Castlevania",3,1).p,extra:true}}],norm),"Extras must be blocked");
assert(inspectUrls({path:comet+"&imdb_id=tt9999999"}).conflict,"IMDb conflicts blocked");
assert(!identify({path:"https://host.invalid/random/video.mkv"},[ep("Castlevania",3,1)],norm),"Opaque stream without external ID must not fake verification");
const st="https://addon.invalid/stream/series/tt6517102:3:1.json";
assert.equal(identify({url:st},[ep("Castlevania",3,1)],norm).info.code,"S03E01");
assert(!identify({url:st},[ep("Castlevania",2,1)],norm));
const movie={p:{title:"The Matrix",year:1999,season:null,episode:null,extra:false,lead:false,dated:false,seasonWords:false},weak:false,source:"link"};
const movieId=identify({url:"https://example.invalid/watch?media_id=tt0133093&media_type=movie"},[movie],norm);
assert(movieId&&movieId.info.isMovie&&movieId.info.imdbId==="tt0133093");
const mfUrl="https://mediafusion.elfhosted.com/streaming_provider/redacted/playback/torbox/"+hash+"/2/8";
const mf=inspectUrls({path:mfUrl});
assert.equal(mf.season,2);assert.equal(mf.episode,8);assert.equal(mf.type,"episode");
assert(!mf.imdb,"MediaFusion route does not identify the show");
assert.equal(inspectUrls({path:mfUrl.replace("mediafusion.elfhosted.com","untrusted.example")}).season,null);
// The position by itself cannot establish a show, even on the genuine MediaFusion host.
assert(!identify({path:mfUrl},[ep("The Legend of Vox Machina",2,8)],norm),"A URL route plus an unsourced name must not establish a show");
const sourceTagged=ep("The Legend of Vox Machina",2,8,"mpv-filename");
const mfCandidate=identify({path:mfUrl},[sourceTagged],norm);
assert(mfCandidate&&mfCandidate.info&&mfCandidate.info.metadataPending,"MediaFusion + mpv filename should create provisional episode identity");
assert.equal(mfCandidate.info.identitySource,"MediaFusion route + filename");
assert.equal(mfCandidate.info.code,"S02E08");
assert(!mfCandidate.info.parentImdbId,"Never manufacture IMDb ID from MediaFusion route");
assert(!identify({path:mfUrl},[ep("The Legend of Vox Machina",2,7,"mpv-filename")],norm),"Disagreeing route and filename must be rejected");
assert(!identify({path:mfUrl.replace("mediafusion.elfhosted.com","unknown.example")},[sourceTagged],norm),"Untrusted MediaFusion-like hosts must be rejected");
assert(!identify({path:mfUrl},[ep("The Legend of Vox Machina",2,8,"title in the file")],norm),"Localized media-title labels must not imply series identity");
const falloutName="Fallout.S02E07.MULTi.VF2.2160p.4KLight.DV.HDR10Plus.WEBRip.EAC3.5.1.x265-GANDALF.mkv";
const falloutURL="https://mediafusion.elfhosted.com/streaming_provider/redacted/playback/torbox/"+hash+"/2/7/redacted";
const fallout=identify({path:falloutURL,filename:falloutName,mediaTitle:"Fallout (2024)",metadataTitle:"Fallout (2024)"},
  [{p:{title:"Fallout",year:null,season:2,episode:7,episodeTitle:"MULTi VF2",extra:false,lead:false,dated:false,seasonWords:false},source:"mpv-filename",weak:false}],norm);
assert(fallout&&fallout.info,"Real Fallout MediaFusion fixture should identify provisionally");
assert.equal(fallout.info.code,"S02E07");
assert.equal(fallout.info.showTitle,"Fallout");
assert.equal(fallout.info.epTitle,"Episode 7");
assert.equal(fallout.info.metadataPending,true);
assert(!fallout.info.parentImdbId,"MediaFusion route alone has no IMDb");
const bad=inspectUrls({url:"https://foo.invalid/stream?media_id=tt6517102&media_type=movie&media_type=series"});
assert(bad.conflict);
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
assert(main.includes('autoEnrichmentFailed'));assert(main.includes('autoLookupConflict'));
const side=fs.readFileSync(path.join(__dirname,"../sidebar.html"),"utf8");
assert(side.includes('iina.onMessage("autoLookupConflict"'));
assert(side.includes("Provisional identity (not TMDB-verified)"));
const over=fs.readFileSync(path.join(__dirname,"../overlay.html"),"utf8");
for(const [label,html] of [["sidebar",side],["overlay",over]]){
 assert(html.includes("@media (prefers-color-scheme: light)"),label+" light mode");
 assert(html.includes("@media (prefers-color-scheme: dark)")||html.includes("color-scheme: light dark"),label+" dark fallback");
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const item of scripts)new vm.Script(item[1],{filename:label});
}
// Regression guard: light-mode heading specificity and explicit disabled/active contrast.
const lightCSS=side.slice(side.indexOf("/* Episode Info Plus beta.3"), side.indexOf("@media (prefers-contrast: more)"));
for(const fragment of [
 "body .sub-sec[open] > summary.sub-hd",
 "body summary.sub-hd::before",
 "body .lang-lbl",
 "body .thm.on",
 "body .sub-btn2:disabled",
 "body #os-login-btn:disabled",
 "body #os-key-required-note",
 "body .key-title",
 "body #api-section > div > div:first-child",
 "body #ov-dismiss button"
]) assert(lightCSS.includes(fragment), "Missing semantic light-mode rule: "+fragment);
assert(!lightCSS.includes("body .thm.on { background:rgba(229,9,20,.22)"),"Faded selected-theme background regression");
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,"../Info.json"),"utf8"));
assert.equal(manifest.identifier,"io.github.olivergiangvu.iinaepisodeinfoplus");
assert.equal(manifest.ghRepo,"olivergiangvu/iina-episode-info-plus");
assert.equal(manifest.ghVersion,5);
assert.equal(manifest.version,"0.1.1-beta.1");
console.log("Episode Info Plus: 16+ identity, integration and theme assertions PASS");
