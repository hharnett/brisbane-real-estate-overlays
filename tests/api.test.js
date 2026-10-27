import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchWhere, exactPropertyMatch, checkProperty, overallStatus, query} from '../api.js';
test('address search handles units, street types, suburbs and SQL quotes', () => {
 const where = searchWhere("2/100 O'Connell Street West End QLD 4101");
 assert.match(where, /HOUSE_NUMBER = 100/);
 assert.match(where, /O''CONNELL/);
 assert.match(where, /CORRIDOR_SUFFIX_CODE = 'ST'/);
 assert.match(where, /POSTCODE = 4101/);
 assert.throws(() => searchWhere('Brisbane'));
 assert.throws(() => searchWhere("100 X'; DROP TABLE"));
});
test('unknown results never become a clear result', () => {
 assert.equal(overallStatus([{status:'absent'},{status:'unknown'}]), 'unknown');
 assert.equal(overallStatus([{status:'present'},{status:'unknown'}]), 'present');
});
const response = data => ({ok:true,json:async()=>data});
test('intersects the full polygon and preserves partial failures', async () => {
 const rings = [[[1,2],[3,4],[5,2],[1,2]]];
 const fetcher = async (url, options) => {
   if (url.includes('property_boundaries')) return response({features:[{geometry:{rings}}]});
   assert.deepEqual(JSON.parse(options.body.get('geometry')).rings, rings);
   assert.equal(options.body.get('spatialRel'),'esriSpatialRelIntersects');
   if (url.includes('Brisbane_River')) return response({features:[{attributes:{OVL2_DESC:'Area 2'}}]});
   if (url.includes('Creek')) throw new Error('Offline');
   return response({features:[]});
 };
 const data = await checkProperty(123,fetcher);
 assert.equal(data.status,'present');
 assert.deepEqual(data.results.map(r=>r.status),['present','unknown','absent']);
});
test('missing geometry and malformed service results fail closed',async()=>{
 await assert.rejects(checkProperty(1,async()=>response({features:[]})), /boundary unavailable/);
 await assert.rejects(query('test',{},async()=>response({})), /unexpected response/);
 await assert.rejects(query('test',{},async()=>response({error:{message:'Service unavailable'}})), /Service unavailable/);
});
test('no-overlay requires successful empty results from all layers',async()=>{
 const data = await checkProperty(1,async url=>response({features:url.includes('property_boundaries')?[{geometry:{rings:[[[1,2],[3,4],[5,2],[1,2]]]}}]:[]}));
 assert.equal(data.status,'absent'); assert.equal(data.results.length,3);
});

test('listing punctuation is normalized for both searching and exact matching', () => {
 const input = '9 Orania Crescent., Calamvale, Qld 4116';
 assert.equal(searchWhere(input), searchWhere('9 Orania Crescent Calamvale QLD 4116'));
 assert.equal(searchWhere('9 Orania Cres., Calamvale, Qld. 4116'), searchWhere('9 Orania Cres Calamvale QLD 4116'));
 const property = { HOUSE_NUMBER: 9, CORRIDOR_NAME: 'ORANIA', CORRIDOR_SUFFIX_CODE: 'CRES', SUBURB: 'CALAMVALE', POSTCODE: 4116 };
 assert.equal(exactPropertyMatch(input, [property]), property);
 assert.equal(exactPropertyMatch(input, [{ ...property, HOUSE_NUMBER: 19 }]), null);
});
