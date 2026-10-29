import { test } from 'node:test';
import assert from 'node:assert/strict';

let listener;
const previousChrome = globalThis.chrome;
globalThis.chrome = { runtime: { onMessage: { addListener(value) { listener = value; } } } };
await import('../background.js');
if (previousChrome === undefined) delete globalThis.chrome;
else globalThis.chrome = previousChrome;

const mapUrl = 'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1';
const pannedMapUrl = 'https://www.realestate.com.au/buy/property-house-between-0-1300000/map-1?boundingBox=-27.46814595918086%2C152.94794866120202%2C-27.521593637962393%2C153.0706865457235&activeSort=list-date&sourcePage=map&sourceElement=map-pan';
const listingUrl = 'https://www.realestate.com.au/property-house-qld-brighton-152784656';
const property = { OBJECTID: 123, HOUSE_NUMBER: 15, CORRIDOR_NAME: 'BAYVIEW', CORRIDOR_SUFFIX_CODE: 'RD', SUBURB: 'BRIGHTON', POSTCODE: 4017 };
const sender = url => ({ tab: { id: 1 }, url });
const mapMessage = overrides => ({ type: 'flood-map-search', address: '15 Bayview Road, Brighton', listingUrl, ...overrides });
function request(message, source = sender(mapUrl)) {
 return new Promise(resolve => {
  assert.equal(listener(message, source, resolve), true);
 });
}
function mockSearch(t, data = { features: [{ attributes: property }] }) {
 return t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => data }));
}

test('map previews resolve one exact address even when the card omits its postcode', async t => {
 const fetcher = mockSearch(t);
 const result = await request(mapMessage());
 assert.deepEqual(result.data.exact, property);
 assert.equal(result.data.truncated, false);
 assert.equal(fetcher.mock.callCount(), 1);
});
test('map previews still resolve addresses after panning removes the in- route segment', async t => {
 const fetcher = mockSearch(t);
 const result = await request(mapMessage(), sender(pannedMapUrl));
 assert.deepEqual(result.data.exact, property);
 assert.equal(fetcher.mock.callCount(), 1);
});
test('truncated map search results never select a property automatically', async t => {
 mockSearch(t, { features: [{ attributes: property }], exceededTransferLimit: true });
 const result = await request(mapMessage());
 assert.equal(result.data.exact, null);
 assert.equal(result.data.truncated, true);
});
test('map search rejects unrelated, interstate, cross-host and malformed listing URLs before fetching', async t => {
 const fetcher = mockSearch(t);
 for (const invalid of [
  'garbage', null, '/property-house-qld-brighton-152784656',
  listingUrl.replace('https:', 'http:'),
  listingUrl.replace('realestate.com.au', 'realestate.com.au.evil.test'),
  listingUrl.replace('-qld-', '-nsw-'),
  'https://www.domain.com.au/15-bayview-road-brighton-qld-4017-123456',
  'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1'
 ]) assert.match((await request(mapMessage({ listingUrl: invalid }))).error, /Unsupported map request/);
 assert.match((await request(mapMessage(), sender(listingUrl))).error, /Unsupported map request/);
 assert.match((await request(mapMessage({ address: 'x'.repeat(181) }))).error, /Unsupported map request/);
 assert.equal(fetcher.mock.callCount(), 0);
});
test('map requests accept www and bare-host variants of the same site', async t => {
 const fetcher = mockSearch(t);
 const result = await request(mapMessage({ listingUrl: listingUrl.replace('www.', '') }));
 assert.deepEqual(result.data.exact, property);
 assert.equal(fetcher.mock.callCount(), 1);
});

const additionalMaps = [
 ['https://www.domain.com.au/sale/brisbane-qld-4000/?displaymap=1', 'https://www.domain.com.au/15-bayview-road-brighton-qld-4017-123456'],
 ['https://www.homely.com.au/for-sale/brisbane-qld-4000/real-estate', 'https://www.homely.com.au/homes/15-bayview-road-brighton-qld-40/123456'],
 ['https://www.quietlistings.com.au/properties?view=map&lga=brisbane', 'https://www.quietlistings.com.au/property/123456'],
 ...['property', 'property-for-sale', 'property-for-rent'].map(prefix => [
  `https://www.onthehouse.com.au/${prefix}/qld/brighton-4017`,
  `https://www.onthehouse.com.au/${prefix}/qld/brighton-4017/15-bayview-road-brighton-qld-4017-123456`,
 ]),
 ['https://www.onthehouse.com.au/sold/qld/brighton-4017', 'https://www.onthehouse.com.au/property/qld/brighton-4017/15-bayview-road-brighton-qld-4017-123456'],
];

test('new map sites resolve their own clicked listing through the worker', async t => {
 const fetcher = mockSearch(t);
 for (const [sourceUrl, listing] of additionalMaps) {
  const result = await request(mapMessage({ listingUrl: listing, address: '15 Bayview Road, Brighton QLD 4017' }), sender(sourceUrl));
  assert.deepEqual(result.data?.exact, property, `${sourceUrl}: ${result.error || ''}`);
 }
 assert.equal(fetcher.mock.callCount(), additionalMaps.length);
});

test('new map sites reject cross-site, insecure and interstate listing requests before fetching', async t => {
 const fetcher = mockSearch(t);
 for (const [sourceUrl, listing] of additionalMaps) {
  const invalidListings = [listingUrl, listing.replace('https:', 'http:'), listing.replace('.com.au', '.com.au.evil.test')];
  if (!listing.includes('quietlistings.com.au')) invalidListings.push(listing.replace(/-qld-|\/qld\//g, match => match.replace('qld', 'nsw')));
  for (const invalid of invalidListings) {
   const result = await request(mapMessage({ listingUrl: invalid, address: '15 Bayview Road, Brighton QLD 4017' }), sender(sourceUrl));
   assert.match(result.error, /Unsupported map request/, `${sourceUrl}: ${invalid}`);
  }
 }
 const quiet = additionalMaps.find(([source]) => source.includes('quietlistings.com.au'));
 for (const address of ['15 Bayview Road, Brighton', '15 Bayview Road, Sydney NSW 2000', '15 Bayview Road, Brighton QLD 2000']) {
  assert.match((await request(mapMessage({ listingUrl: quiet[1], address }), sender(quiet[0]))).error, /Unsupported map request/);
 }
 assert.equal(fetcher.mock.callCount(), 0);
});
test('service worker ignores unsupported pages and senders without a tab', t => {
 const fetcher = mockSearch(t);
 for (const source of [
  undefined, null, {}, { url: mapUrl },
  sender('https://www.realestate.com.au/buy/in-brisbane,+qld/list-1'),
  sender('https://www.realestate.com.au.evil.test/buy/in-brisbane,+qld/map-1')
 ]) {
  assert.equal(listener(mapMessage(), source, () => assert.fail('Unexpected response')), undefined);
 }
 assert.equal(fetcher.mock.callCount(), 0);
});
test('bad messages and invalid property IDs fail safely without a Council request', async t => {
 const fetcher = mockSearch(t);
 for (const message of [null, undefined, false, {}, { type: 'unknown' }, { type: 'flood-search', address: null }]) {
  assert.match((await request(message)).error, /Unsupported request/);
 }
 for (const id of [null, '123', 0, -1, 1.5]) {
  assert.match((await request({ type: 'flood-check', id })).error, /Invalid property/);
 }
 assert.equal(fetcher.mock.callCount(), 0);
});
test('map senders can run the same six-overlay check as full listings', async t => {
 const fetcher = t.mock.method(globalThis, 'fetch', async url => ({ ok: true, json: async () => ({
  features: url.includes('property_boundaries') ? [{ geometry: { rings: [[[1, 2], [3, 4], [5, 2], [1, 2]]] } }] : []
 }) }));
 const result = await request({ type: 'flood-check', id: 123 }, sender(pannedMapUrl));
 assert.equal(result.data.light, 'green');
 assert.equal(result.data.overlayCount, 0);
 assert.equal(result.data.rows.length + result.data.overlays.length, 6);
 assert.equal(fetcher.mock.callCount(), 7);
});
test('existing full listing searches retain postcode-sensitive exact matching', async t => {
 mockSearch(t);
 const incomplete = await request({ type: 'flood-search', address: '15 Bayview Road, Brighton' }, sender(listingUrl));
 assert.equal(incomplete.data.exact, null);
 const complete = await request({ type: 'flood-search', address: '15 Bayview Road, Brighton QLD 4017' }, sender(listingUrl));
 assert.deepEqual(complete.data.exact, property);
});
