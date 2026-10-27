import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAwareness, summarize } from '../awareness.js';
import { exactPropertyMatch } from '../api.js';
import '../listing-address.js';
test('only exact full addresses auto-select; unit and ambiguous matches require confirmation',()=>{
 const a={HOUSE_NUMBER:78,CORRIDOR_NAME:'ALBURY',CORRIDOR_SUFFIX_CODE:'ST',SUBURB:'DEAGON',POSTCODE:4017};
 assert.equal(exactPropertyMatch('78 Albury Street, Deagon QLD 4017',[a]),a);
 assert.equal(exactPropertyMatch('78 Albury Street, Deagon',[a]),null);
 assert.equal(exactPropertyMatch('2/78 Albury Street, Deagon QLD 4017',[a]),null);
 assert.equal(exactPropertyMatch('78 Albury Street, Deagon QLD 4017',[a,a]),null);
});
test('overland impact remains distinct from annual flood likelihood',()=>{
 assert.equal(summarize([{kind:'impact',level:'High',status:'mapped'}]).title,'High overland flow impact');
 assert.equal(summarize([{kind:'impact',level:'High',status:'mapped'},{kind:'likelihood',level:'Low',status:'mapped'}]).title,'Low flood likelihood');
 assert.equal(summarize([{status:'unknown'},{status:'absent'}]).title,'Flood check incomplete');
});
test('awareness uses highest intersecting category and rejects unexpected values',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>url.includes('property_boundaries') ? {features:[{geometry:{rings:[[[1,2],[3,4],[1,2]]]}}]} : {features:(url.includes('Creek')?['New category']:url.includes('Overland')?['Medium']:['Low','High']).map(FLOOD_RISK=>({attributes:{FLOOD_RISK}}))}});
 const data=await checkAwareness(12,fetcher);
 assert.equal(data.rows[0].level,'High');assert.equal(data.rows[1].status,'unknown');assert.equal(data.rows[3].kind,'impact');assert.equal(data.incomplete,true);
});
test('structured address extraction rejects other states and ambiguous recommendations',()=>{
 const {fromStructured,detect}=globalThis.FloodAddress;
 const a={streetAddress:'78 Albury Street',addressLocality:'Deagon',addressRegion:'QLD',postalCode:'4017'};
 assert.deepEqual(fromStructured({'@graph':[{address:a}]}),['78 Albury Street, Deagon, QLD 4017']);
 assert.deepEqual(fromStructured({...a,addressRegion:'NSW'}),[]);
 const doc={querySelectorAll:selector=>selector==='h1'?[]:[{textContent:JSON.stringify([{address:a},{address:{...a,streetAddress:'80 Albury Street'}}])}]};
 assert.equal(detect(doc),'');
});
