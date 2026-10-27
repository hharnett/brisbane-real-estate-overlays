import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkListing, overlaysForGeometry, summarizeListing } from '../overlays.js';
const geometry = {rings:[[[500000,6960000],[500100,6960000],[500000,6960100],[500000,6960000]]],spatialReference:{wkid:28356}};
const response = features => ({ok:true,json:async()=>({features})});
const feature = OVL2_DESC => ({attributes:{OVL2_DESC}});

test('one boundary powers all six checks; bushfire categories count as one yellow overlay',async()=>{
 const calls=[];
 const data=await checkListing(123,async(url,options)=>{
  calls.push(url);
  if(url.includes('property_boundaries')) return response([{geometry}]);
  assert.deepEqual(JSON.parse(options.body.get('geometry')),geometry);
  assert.equal(options.body.get('spatialRel'),'esriSpatialRelIntersects');
  if(url.includes('Bushfire'))return response([feature('High hazard buffer area'),feature('Potential impact buffer'),feature('High hazard buffer area')]);
  return response([]);
 });
 assert.equal(calls.length,7);
 assert.equal(data.light,'yellow');
 assert.equal(data.overlayCount,1);
 assert.equal(data.title,'1 overlay found');
 assert.equal(data.overlays[0].status,'mapped');
 assert.deepEqual(data.overlays[0].categories,['High hazard buffer area','Potential impact buffer']);
 assert.equal(data.overlays[1].status,'absent');
 assert.equal(calls.some(url=>url.includes('ANEF')),false);
});

test('all 64 combinations of mapped types use the combined count, including a single High flood', () => {
 for (let mask = 0; mask < 64; mask++) {
  const rows = Array.from({length:6}, (_, index) => ({status: mask & (1 << index) ? 'mapped' : 'absent', level:'High'}));
  const count = rows.filter(row => row.status === 'mapped').length;
  const result = summarizeListing(rows.slice(0,4), rows.slice(4));
  assert.equal(result.light, count === 0 ? 'green' : count === 1 ? 'yellow' : 'red', `mask ${mask}`);
  assert.equal(result.overlayCount, count);
  assert.equal(result.incomplete, false);
  assert.equal(result.title, count === 0 ? 'No overlays found' : `${count} overlay${count === 1 ? '' : 's'} found`);
 }
});
test('any unavailable check overrides the combined colour without hiding known overlays', () => {
 for (let index = 0; index < 6; index++) {
  for (const status of ['absent', 'mapped']) {
   const rows = Array.from({length:6}, () => ({status}));
   rows[index] = {status:'unknown'};
   const result = summarizeListing(rows.slice(0,4),rows.slice(4));
   assert.equal(result.light,'unknown');
   assert.equal(result.incomplete,true);
   assert.equal(result.title,'Overlay check incomplete');
   assert.equal(result.overlayCount,status === 'mapped' ? 5 : 0);
  }
 }
 assert.equal(summarizeListing().light,'unknown');
 assert.equal(summarizeListing(Array(4).fill({status:'absent'}),[{status:'absent'}]).light,'unknown');
 assert.equal(summarizeListing(Array(4).fill({status:'absent'}),[{status:'absent'},{}]).light,'unknown');
});
test('listing response includes both planning types and propagates their failures to the overall status', async () => {
 for (const failBushfire of [false,true]) {
  const data = await checkListing(123,async url => {
   if(url.includes('property_boundaries')) return response([{geometry}]);
   if(url.includes('Bushfire')) {
    if(failBushfire) throw new Error('Offline');
    return response([feature('High hazard buffer area')]);
   }
   if(url.includes('Landslide')) return response([feature('Landslide susceptibility area')]);
   return response([]);
  });
  assert.equal(data.light,failBushfire?'unknown':'red');
  assert.equal(data.incomplete,failBushfire);
  assert.equal(data.overlayCount,failBushfire?1:2);
  assert.equal(data.overlays[1].status,'mapped');
 }
});
test('failed additional layer remains unknown while successful results survive',async()=>{
 const rows=await overlaysForGeometry(geometry,async url=>{
  if(url.includes('Bushfire')) throw new Error('Offline');
  return response([feature('Landslide susceptibility area')]);
 });
 assert.equal(rows[0].status,'unknown');assert.equal(rows[1].status,'mapped');
});
test('truncated and malformed categories never produce an absent result',async()=>{
 const rows=await overlaysForGeometry(geometry,async url=>({ok:true,json:async()=>url.includes('Bushfire')?{features:[],exceededTransferLimit:true}:{features:[{attributes:{}}]}}));
 assert.deepEqual(rows.map(r=>r.status),['unknown','unknown']);
});
test('missing geometry prevents all overlay queries',async()=>{
 let calls=0;
 await assert.rejects(checkListing(1,async()=>{calls++;return response([]);}),/boundary unavailable/);
 assert.equal(calls,1);
});
