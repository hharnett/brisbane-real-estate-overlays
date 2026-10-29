import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../listing-sites.js';
import '../listing-address.js';
import '../map-preview.js';
import '../map-domain.js';
const { find, current } = globalThis.FloodMapPreview;
const baseUrl = 'https://www.domain.com.au/sale/brisbane-region-qld/?displaymap=1';
function preview(options = {}) {
  const card = { isConnected: true, getClientRects: () => [{}], closest: () => null };
  const link = {
    isConnected: !options.detached,
    getClientRects: () => options.collapsed ? [] : [{}],
    innerText: options.address ?? '12 Example Road, Brighton',
    textContent: '',
    href: options.href ?? '/12-example-road-brighton-qld-4017-2021000000?src=map',
    getAttribute(name) { return name === 'href' ? this.href : null; },
    closest(selector) {
      if (selector === '[data-testid="listing-card-wrapper-row"]') return card;
      if (selector === '[data-testid="listing-popup"]') return options.outsidePopup ? null : {};
      if (selector === '.gm-style') return options.outsideMap ? null : {};
      if (selector.includes('[hidden]')) return options.hidden ? {} : null;
      return null;
    }
  };
  return { card, link };
}
const documentWith = links => ({querySelectorAll(selector) {
  assert.equal(selector, '.gm-style [data-testid="listing-popup"] a.address[href]');
  return links;
}});
test('Domain detects only the selected visible popup and mounts away from shortlist', () => {
  const selected = preview();
  const excluded = [{hidden:true},{detached:true},{collapsed:true},{outsidePopup:true},{outsideMap:true}].map(preview);
  const results = find(documentWith([selected.link, ...excluded.map(p=>p.link)]),baseUrl);
  assert.equal(results.length,1);
  assert.equal(results[0].address,'12 Example Road, Brighton');
  assert.equal(results[0].badgeSide,'left');
  assert.equal(results[0].url,'https://www.domain.com.au/12-example-road-brighton-qld-4017-2021000000');
});
test('Domain rejects projects, profiles, interstate and cross-site links', () => {
  for (const href of ['/project/example-5000','/property-profile/12-example-road-brighton-qld-4017','/12-example-road-brighton-vic-3186-2021000000','https://www.homely.com.au/homes/12-example-road-brighton-qld-4017/123456']) {
    assert.deepEqual(find(documentWith([preview({href}).link]),baseUrl),[],href);
  }
});
test('Domain missing addresses remain unknown and units remain explicit', () => {
  for (const [address,expected] of [['Address on request',''],['Brighton',''],['2/12 Example Road, Brighton','2/12 Example Road, Brighton']]) {
    const result = find(documentWith([preview({address}).link]),baseUrl)[0];
    assert.equal(result.address,expected);
  }
});
test('Domain rechecks identity and visibility when a popup changes in place', () => {
  const entry = find(documentWith([preview().link]),baseUrl)[0];
  assert.equal(current(entry,baseUrl).key,entry.key);
  entry.link.innerText = '14 Example Road, Brighton';
  assert.notEqual(current(entry,baseUrl).key,entry.key);
  entry.link.isConnected = false;
  assert.equal(current(entry,baseUrl),null);
});
