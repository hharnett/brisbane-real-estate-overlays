import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
const {isListing}=globalThis.FloodSites;
test('supports Domain rental and sale listings and existing realestate listings',()=>{
 for(const url of ['https://www.domain.com.au/210-algester-road-calamvale-qld-4116-18351884','https://domain.com.au/11-stevenson-street-calamvale-qld-4116-2020749433?foo=bar','https://www.realestate.com.au/property-house-qld-calamvale-123456']) assert.equal(isListing(url),true,url);
});
test('rejects search, profiles, unrelated hosts and non-HTTPS pages',()=>{
 for(const url of ['https://www.domain.com.au/sale/calamvale-qld-4116/','https://www.domain.com.au/property-profile/9-orania-crescent-calamvale-qld-4116','https://domain.com.au.evil.test/210-algester-road-calamvale-qld-4116-18351884','http://www.domain.com.au/210-algester-road-calamvale-qld-4116-18351884','garbage']) assert.equal(isListing(url),false,url);
});
test('reads a multiline Domain heading before recommendation metadata',()=>{
 const doc={querySelectorAll:selector=>selector==='h1'?[{innerText:'210 Algester Road,\nCalamvale QLD 4116',textContent:'210 Algester Road,Calamvale QLD 4116'}]:[]};
 assert.equal(globalThis.FloodAddress.detect(doc),'210 Algester Road, Calamvale QLD 4116');
});

const newListings = [
 'https://www.quietlistings.com.au/property/736876',
 'https://www.homely.com.au/homes/2209-108-margaret-street-brisbane-city-qld-40/13412018',
 'https://www.onthehouse.com.au/property/qld/west-end-4101/33-princhester-st-west-end-qld-4101-3474939'
];
test('supports Quiet Listings, Homely and OnTheHouse individual pages', () => {
 for (const url of newListings) {
  assert.equal(isListing(url), true, url);
  assert.equal(isListing(url.replace('www.', '') + '/?source=saved#details'), true, url);
 }
});
test('new sites exclude search, suburb/street profiles and malformed property paths', () => {
 for (const url of [
  'https://www.quietlistings.com.au/properties?lga=brisbane',
  'https://www.quietlistings.com.au/property/example',
  'https://www.quietlistings.com.au/property/736876/contact',
  'https://www.homely.com.au/for-sale/brisbane-qld-4000/real-estate',
  'https://www.homely.com.au/suburb-profile/brisbane-city-qld-4000',
  'https://www.homely.com.au/homes/example',
  'https://www.onthehouse.com.au/property-for-sale/qld/west-end-4101/',
  'https://www.onthehouse.com.au/suburb/qld/west-end-4101',
  'https://www.onthehouse.com.au/property/qld/west-end-4101/princhester-st',
  ...newListings.map(url => url.replace('.com.au', '.com.au.evil.test')),
  ...newListings.map(url => url.replace('https:', 'http:'))
 ]) assert.equal(isListing(url), false, url);
});

// Minimal address fixtures from public pages inspected on 27 October 2026.
function page(heading, metadata = []) {
 return { querySelectorAll: selector => {
  if (selector === 'h1') return [{ innerText: heading, textContent: heading }];
  if (selector === 'script[type="application/ld+json"]') return metadata.map(value => ({ textContent: JSON.stringify(value) }));
  return [];
 }};
}
test('reads Quiet Listings and Homely full address headings', () => {
 for (const address of ['14 Cedar Street, Greenslopes QLD 4120', '2209/108 Margaret Street, Brisbane City QLD 4000']) {
  assert.equal(globalThis.FloodAddress.detect(page(address)), address);
 }
});
test('reads OnTheHouse Residence metadata when its heading contains only the street', () => {
 const residence = { '@context':'https://schema.org', '@type':'Residence', address: {
  '@type':'PostalAddress', addressCountry:'AU', postalCode:'4101', addressRegion:'QLD',
  addressLocality:'West End', streetAddress:'33 Princhester St'
 }};
 assert.equal(globalThis.FloodAddress.detect(page('33 Princhester Street', [residence])), '33 Princhester St, West End, QLD 4101');
});
test('preserves the line break between the OnTheHouse street and nested suburb block', () => {
 const doc = { querySelectorAll: selector => selector === 'h1' ? [{
  innerText: '33 Princhester Street\nWest End QLD 4101',
  textContent: '33 Princhester StreetWest End QLD 4101'
 }] : [] };
 assert.equal(globalThis.FloodAddress.detect(doc), '33 Princhester Street West End QLD 4101');
});
test('withheld and interstate headings need a manually entered Queensland address', () => {
 for (const heading of ['Address available on request', 'Greenslopes QLD 4120', '33 Example Street, Sydney NSW 2000']) {
  assert.equal(globalThis.FloodAddress.detect(page(heading)), '');
 }
});
test('manifest enables injection and notices on every supported site with no wider permissions', () => {
 const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
 const hosts = ['realestate.com.au', 'domain.com.au', 'quietlistings.com.au', 'homely.com.au', 'onthehouse.com.au'];
 const expected = hosts.flatMap(host => [`https://www.${host}/*`, `https://${host}/*`]);
 assert.deepEqual(manifest.content_scripts[0].matches, expected);
 assert.deepEqual(manifest.web_accessible_resources[0].matches, expected);
 assert.deepEqual(manifest.host_permissions, ['https://services2.arcgis.com/*']);
});
