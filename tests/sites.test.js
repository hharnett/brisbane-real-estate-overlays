import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
const {isListing,isMapSearch,isMapListing,isSupportedPage}=globalThis.FloodSites;
test('supports Domain rental and sale listings and existing realestate listings',()=>{
 for(const url of ['https://www.domain.com.au/210-algester-road-calamvale-qld-4116-18351884','https://domain.com.au/11-stevenson-street-calamvale-qld-4116-2020749433?foo=bar','https://www.realestate.com.au/property-house-qld-calamvale-123456']) assert.equal(isListing(url),true,url);
});
test('rejects search, profiles, unrelated hosts and non-HTTPS pages',()=>{
 for(const url of ['https://www.domain.com.au/sale/calamvale-qld-4116/','https://www.domain.com.au/property-profile/9-orania-crescent-calamvale-qld-4116','https://domain.com.au.evil.test/210-algester-road-calamvale-qld-4116-18351884','http://www.domain.com.au/210-algester-road-calamvale-qld-4116-18351884','garbage']) assert.equal(isListing(url),false,url);
});
test('supports realestate.com.au map search routes including panned and filtered maps', () => {
 for (const url of [
  'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1',
  'https://realestate.com.au/rent/in-brisbane,+qld/map-2/?activeSort=price-asc#preview',
  'https://www.realestate.com.au/sold/in-brisbane+-+greater+region,+qld/map-1',
  'https://www.realestate.com.au/buy/property-house-in-brisbane,+qld/map-1',
  'https://www.realestate.com.au/buy/with-3-bedrooms-between-500000-1000000-in-brisbane,+qld/map-1',
  'https://www.realestate.com.au/buy/property-house-between-0-1300000/map-1?boundingBox=-27.46814595918086%2C152.94794866120202%2C-27.521593637962393%2C153.0706865457235&activeSort=list-date&sourcePage=map&sourceElement=map-pan',
  'https://www.realestate.com.au/rent/with-2-bedrooms/map-2',
  'https://www.realestate.com.au/sold/between-500000-1000000/map-1',
  'https://www.realestate.com.au/buy/map-1?boundingBox=-27.4%2C153%2C-27.5%2C153.1',
  'https://realestate.com.au/rent/map-2/',
  'https://www.realestate.com.au/sold/map-1'
 ]) {
  assert.equal(isMapSearch(url), true, url);
  assert.equal(isSupportedPage(url), true, url);
  assert.equal(isListing(url), false, url);
 }
 for (const url of [
  'https://www.realestate.com.au/buy/in-brisbane,+qld/list-1',
  'https://www.realestate.com.au/buy/in-brisbane,+qld/map-0',
  'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1/contact',
  'https://www.realestate.com.au/buy/in-/map-1',
  'https://www.realestate.com.au/buy/property-/map-1',
  'https://www.realestate.com.au/buy/help/map-1',
  'https://www.realestate.com.au/buy/property-house/with-3-bedrooms/map-1',
  'https://www.realestate.com.au/buy/map-0',
  'https://www.realestate.com.au/buy/map-1/contact',
  'https://www.realestate.com.au/agents/in-brisbane,+qld/map-1',
  'https://www.realestate.com.au/help/map-1',
  'https://www.domain.com.au/buy/in-brisbane,+qld/map-1',
  'https://www.realestate.com.au.evil.test/buy/in-brisbane,+qld/map-1',
  'https://agent.realestate.com.au/buy/in-brisbane,+qld/map-1',
  'http://www.realestate.com.au/buy/in-brisbane,+qld/map-1',
  'garbage', null
 ]) {
  assert.equal(isMapSearch(url), false, url);
  assert.equal(isSupportedPage(url), false, url);
 }
 const listing = 'https://www.realestate.com.au/property-house-qld-calamvale-123456';
 assert.equal(isMapSearch(listing), false);
 assert.equal(isSupportedPage(listing), true);
});
test('reads a multiline Domain heading before recommendation metadata',()=>{
 const doc={querySelectorAll:selector=>selector==='h1'?[{innerText:'210 Algester Road,\nCalamvale QLD 4116',textContent:'210 Algester Road,Calamvale QLD 4116'}]:[]};
 assert.equal(globalThis.FloodAddress.detect(doc),'210 Algester Road, Calamvale QLD 4116');
});

const newListings = [
 'https://www.quietlistings.com.au/property/736876',
 'https://www.homely.com.au/homes/2209-108-margaret-street-brisbane-city-qld-40/13412018',
 'https://www.onthehouse.com.au/property/qld/west-end-4101/33-princhester-st-west-end-qld-4101-3474939',
 'https://www.onthehouse.com.au/property-for-sale/qld/paddington-4064/21-collingwood-st-paddington-qld-4064-18947261',
 'https://www.onthehouse.com.au/property-for-rent/qld/paddington-4064/5-kennedy-tce-paddington-qld-4064-19005231'
];
test('supports Quiet Listings, Homely and OnTheHouse individual pages', () => {
 for (const url of newListings) {
  assert.equal(isListing(url), true, url);
  assert.equal(isListing(url.replace('www.', '') + '/?source=saved#details'), true, url);
 }
});

test('supports the observed map-search routes on all five sites', () => {
 for (const url of [
  'https://www.domain.com.au/sale/?displaymap=1',
  'https://domain.com.au/sale/brisbane-qld-4000/?displaymap=1&excludeunderoffer=1',
  'https://www.domain.com.au/rent/brisbane-qld-4000?displaymap=1',
  'https://www.domain.com.au/sold-listings/brisbane-qld-4000/?displaymap=1',
  'https://www.homely.com.au/for-sale/brisbane-qld-4000/real-estate',
  'https://homely.com.au/for-rent/brisbane-qld-4000/real-estate?page=2',
  'https://www.homely.com.au/sold-properties/brisbane-qld-4000/',
  'https://quietlistings.com.au/properties?lga=brisbane&view=map',
  'https://www.quietlistings.com.au/properties/?view=map',
  ...['property', 'property-for-sale', 'property-for-rent', 'sold'].map(prefix =>
   `https://www.onthehouse.com.au/${prefix}/qld/paddington-4064?types=House`),
 ]) {
  assert.equal(isMapSearch(url), true, url);
  assert.equal(isSupportedPage(url), true, url);
  assert.equal(isListing(url), false, url);
 }
});

test('new map routes exclude ordinary lists where distinguishable, profiles and lookalike URLs', () => {
 for (const url of [
  'https://www.domain.com.au/sale/brisbane-qld-4000/',
  'https://www.domain.com.au/sale/brisbane-qld-4000/?displaymap=0',
  'https://www.domain.com.au/sale/brisbane-qld-4000/more/?displaymap=1',
  'https://www.domain.com.au/property-profile/brisbane-qld-4000/?displaymap=1',
  'https://www.domain.com.au.evil.test/sale/?displaymap=1',
  'https://www.homely.com.au/for-sale/brisbane-qld-4000/agents',
  'https://www.homely.com.au/for-sale/brisbane-qld-4000/real-estate/contact',
  'https://www.homely.com.au/suburb-profile/brisbane-qld-4000',
  'https://www.homely.com.au/sold-properties/brisbane-qld-4000/contact',
  'https://www.quietlistings.com.au/properties?view=list',
  'https://www.quietlistings.com.au/properties?lga=brisbane',
  'https://www.quietlistings.com.au/properties/contact?view=map',
  'https://www.onthehouse.com.au/suburb/qld/paddington-4064',
  'https://www.onthehouse.com.au/property/qld/paddington-4064/contact',
  'https://www.onthehouse.com.au/property-for-sale/qld/paddington',
  'https://www.onthehouse.com.au/property-for-sale/elsewhere/paddington-4064',
  'http://www.domain.com.au/sale/?displaymap=1',
  'http://www.homely.com.au/for-sale/brisbane-qld-4000/real-estate',
  'http://www.quietlistings.com.au/properties?view=map',
  'http://www.onthehouse.com.au/sold/qld/paddington-4064',
 ]) assert.equal(isMapSearch(url), false, url);
});

test('Homely keeps map checks enabled on its observed property-type, filter and pagination routes', () => {
 const origin = 'https://www.homely.com.au';
 const paths = [
  '/for-sale/brisbane-qld-4000/houses',
  '/for-sale/brisbane-qld-4000/apartments',
  '/for-sale/brisbane-qld-4000/units',
  '/for-sale/brisbane-qld-4000/townhouses',
  '/for-sale/brisbane-qld-4000/villas',
  '/for-sale/brisbane-qld-4000/land',
  '/for-sale/brisbane-qld-4000/rural-properties',
  '/for-sale/brisbane-qld-4000/block-of-units',
  '/for-sale/brisbane-qld-4000/real-estate/under-1300000',
  '/for-sale/brisbane-qld-4000/real-estate/under-1300000/page-2',
  '/for-sale/brisbane-qld-4000/houses/3-bedrooms',
  '/for-sale/brisbane-qld-4000/houses/2-car-garage',
  '/for-sale/brisbane-qld-4000/houses/upcoming-auctions',
  '/for-rent/brisbane-qld-4000/studio-apartments',
  '/for-rent/brisbane-qld-4000/real-estate/1-bedroom',
  '/for-rent/brisbane-qld-4000/real-estate/open-for-inspection',
  '/for-rent/brisbane-qld-4000/real-estate/furnished',
  '/for-rent/brisbane-qld-4000/real-estate/with-gym',
  '/for-rent/brisbane-qld-4000/real-estate/with-fireplace',
  '/for-rent/brisbane-qld-4000/real-estate/pet-friendly',
  '/for-rent/brisbane-qld-4000/real-estate/with-pool',
  '/for-rent/brisbane-qld-4000/real-estate/page-2',
  '/sold-properties/brisbane-qld-4000/page-2',
 ];
 for (const path of paths) {
  assert.equal(isMapSearch(origin + path), true, path);
  assert.equal(isSupportedPage(origin + path + '/?context=map'), true, path);
  assert.equal(isListing(origin + path), false, path);
 }
 for (const path of [
  '/for-sale/brisbane-qld-4000/houses/contact',
  '/for-sale/brisbane-qld-4000/houses/page-0',
  '/for-sale/brisbane-qld-4000/houses/page-2/details',
  '/for-rent/brisbane-qld-4000/real-estate/under-invalid',
  '/for-rent/brisbane-qld-4000/real-estate//page-2',
  '/for-sale//houses',
  '/sold-properties/brisbane-qld-4000/page-0',
 ]) assert.equal(isMapSearch(origin + path), false, path);
});

test('map listing authorization matches the source site and the listing state', () => {
 const cases = [
  ['https://www.realestate.com.au/property-house-qld-brighton-123456', 'https://realestate.com.au/buy/map-1'],
  ['https://domain.com.au/15-bayview-road-brighton-qld-4017-123456', 'https://www.domain.com.au/sale/?displaymap=1'],
  ['https://www.homely.com.au/homes/15-bayview-road-brighton-qld-40/123456', 'https://homely.com.au/for-sale/brisbane-qld-4000/real-estate'],
  ['https://www.onthehouse.com.au/property-for-sale/qld/brighton-4017/15-bayview-rd-brighton-qld-4017-123456', 'https://onthehouse.com.au/property-for-sale/qld/brighton-4017'],
 ];
 for (const [listing, source] of cases) {
  assert.equal(isMapListing(listing, source, '15 Bayview Road, Brighton'), true, listing);
  assert.equal(isMapListing(listing.replace(/-qld-|\/qld\//g, match => match.replace('qld', 'nsw')), source, '15 Bayview Road, Brighton'), false, listing);
  assert.equal(isMapListing(listing.replace('https:', 'http:'), source, '15 Bayview Road, Brighton'), false, listing);
 }
 assert.equal(isMapListing(cases[0][0], cases[1][1], '15 Bayview Road, Brighton QLD 4017'), false);
 assert.equal(isMapListing('/property-house-qld-brighton-123456', cases[0][1], '15 Bayview Road, Brighton'), false);
 assert.equal(isMapListing(cases[0][0].replace('.com.au', '.com.au.evil.test'), cases[0][1], '15 Bayview Road, Brighton'), false);
});

test('Quiet Listings map requests require an explicit Queensland state and postcode', () => {
 const listing = 'https://www.quietlistings.com.au/property/736876';
 const source = 'https://quietlistings.com.au/properties?view=map';
 assert.equal(isMapListing(listing, source, '15 Bayview Road, Brighton QLD 4017'), true);
 for (const address of ['', '15 Bayview Road, Brighton', '15 Bayview Road, Brighton QLD', '15 Bayview Road, Sydney NSW 2000', '15 Bayview Road, Brighton QLD 2000', null]) {
  assert.equal(isMapListing(listing, source, address), false, String(address));
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
