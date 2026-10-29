// TMDb may find a show under an alternate title below the first 3 results.
// Test the real alTitleCandidates helper with mocked provider detail GETs.
"use strict";
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");
const path=require("node:path");
const main=fs.readFileSync(path.join(__dirname,"../main.js"),"utf8");
const from=main.indexOf("function alNorm(s)"),to=main.indexOf("// Several fit:",from);
assert(from>=0&&to>from);
const looked=[];
const alternatives={
  4:["City of Splendour"],
  5:["City of Splendour"],
};
const context=vm.createContext({
  alTvDetails:async id=>{looked.push(id);return {alt:alternatives[id]||[]};},
  alMovieDetails:async id=>{looked.push(id);return {alt:[]};}
});
vm.runInContext(main.slice(from,to),context);
const matches=Array.from({length:6},(_,i)=>({
  id:i+1,name:"Unrelated Canonical Name "+(i+1),
  original:"Other Name "+(i+1),year:2026
}));
(async()=>{
 const selected=await context.alTitleCandidates("tv",matches.slice(0,4),"City of Splendour");
 assert.deepEqual(Array.from(selected.map(s=>s.id)),[4],
   "A provider-backed alias ranked 4th must be considered");
 assert.deepEqual(looked,[1,2,3,4]);
 const multiple=await context.alTitleCandidates("tv",matches,"City of Splendour");
 assert.deepEqual(Array.from(multiple.map(s=>s.id)),[4,5],
   "All competing alias candidates must remain visible for ambiguity rejection");
 const none=await context.alTitleCandidates("tv",matches,"City of Splendors");
 assert.equal(none.length,0,"Near-name matches must never qualify");
 const truncated=await context.alTitleCandidates("tv",Array.from({length:20},(_,i)=>({
  id:i+1,name:"City of Splendour",original:"",year:2026
 })),"City of Splendour");
 assert.equal(truncated.length,0,"Truncated candidate pages must fail closed");
 console.log("TMDb bounded alias search, lower-ranked candidates, ambiguity and fuzzy rejection PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
