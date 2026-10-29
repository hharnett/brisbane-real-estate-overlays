import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
import '../map-preview.js';
import '../map-homely.js';

const { find, read } = globalThis.FloodMapAdapters['homely.com.au'];
const baseUrl = 'https://www.homely.com.au/for-sale/brighton-qld-4017/real-estate';
const listing = 'https://www.homely.com.au/homes/3-12-example-road-brighton-qld-4017/10000002';

function preview({ label = '3/12 Example Road, Brighton QLD 4017', href = listing,
  hidden = false, zeroSize = false, connected = true, inMap = true } = {}) {
  const map = inMap ? {} : null;
  const hiddenAncestor = hidden ? {} : null;
  const rects = () => zeroSize ? [] : [{ width: 530, height: 132 }];
  const card = {
    isConnected: connected,
    getClientRects: rects,
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return hiddenAncestor;
      if (selector.includes('Search map')) return map;
      return null;
    },
  };
  const attributes = new Map([['href', href], ['aria-label', label]]);
  const link = {
    isConnected: connected,
    innerText: 'For sale 2 2 1',
    textContent: 'For sale 2 2 1',
    getClientRects: rects,
    getAttribute: name => attributes.get(name) ?? null,
    setAttribute: (name, value) => attributes.set(name, value),
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return hiddenAncestor;
      if (selector.includes('article')) return card;
      if (selector.includes('Search map')) return map;
      return null;
    },
  };
  return { link, card };
}

function documentWith(...previews) {
  return {
    querySelectorAll(selector) {
      assert.match(selector, /\[aria-label="Search map"\]/);
      assert.match(selector, /article\[aria-label="Property Listing"\]/);
      assert.match(selector, /a\[href\]/);
      return previews.map(item => item.link);
    },
  };
}

test('Homely reads the clicked preview full address and keeps its badge away from the favourite control', () => {
  const item = preview();
  const result = find(documentWith(item), baseUrl);
  assert.equal(result.length, 1);
  assert.equal(result[0].address, '3/12 Example Road, Brighton QLD 4017');
  assert.equal(result[0].url, listing);
  assert.equal(result[0].link, item.link);
  assert.equal(result[0].card, item.card);
  assert.equal(result[0].badgeSide, 'left');
});

test('Homely ignores results-list cards and inactive mobile carousel previews', () => {
  const selected = preview();
  const result = find(documentWith(
    preview({ inMap: false }), preview({ hidden: true }),
    preview({ zeroSize: true }), preview({ connected: false }), selected,
  ), baseUrl);
  assert.equal(result.length, 1);
  assert.equal(result[0].card, selected.card);
});

test('Homely deduplicates links in one preview card', () => {
  const item = preview();
  assert.equal(find(documentWith(item, item), baseUrl).length, 1);
});

test('Homely rereads mutable preview identity after a new pin is selected', () => {
  const { link, card } = preview();
  const original = read(link, card, baseUrl);
  link.setAttribute('aria-label', '4/12 Example Road, Brighton QLD 4017');
  link.setAttribute('href', '/homes/4-12-example-road-brighton-qld-4017/10000003');
  const changed = read(link, card, baseUrl);
  assert.notEqual(changed.key, original.key);
  assert.equal(changed.address, '4/12 Example Road, Brighton QLD 4017');
  assert.equal(read(link, {}, baseUrl), null);
});

test('Homely refuses interstate, cross-site and invalid listing links', () => {
  for (const href of [
    'https://www.homely.com.au/homes/12-example-road-brighton-vic-3186/10000002',
    'https://www.homely.com.au.evil.test/homes/12-example-road-brighton-qld-4017/10000002',
    'https://www.realestate.com.au/property-house-qld-brighton-123456789',
    'http://www.homely.com.au/homes/12-example-road-brighton-qld-4017/10000002',
    '/for-sale/brighton-qld-4017/real-estate',
  ]) assert.deepEqual(find(documentWith(preview({ href })), baseUrl), [], href);
});

test('Homely retains a grey result for a withheld address and never infers it from the URL', () => {
  const [result] = find(documentWith(preview({ label: 'Address available on request, Brighton QLD 4017' })), baseUrl);
  assert.equal(result.address, '');
  assert.equal(result.url, listing);
});

test('Homely supports the truncated QLD postcode slugs observed in its public URLs', () => {
  const href = '/homes/2209-108-margaret-street-brisbane-city-qld-40/10000002';
  const [result] = find(documentWith(preview({ href, label: '2209/108 Margaret Street, Brisbane City QLD 4000' })), baseUrl);
  assert.equal(result.address, '2209/108 Margaret Street, Brisbane City QLD 4000');
});

test('Homely sanitized fixture retains observed map scope and inactive carousel markers', () => {
  const html = readFileSync(new URL('./fixtures/homely-map-preview.html', import.meta.url), 'utf8');
  assert.match(html, /aria-label="Search map"/);
  assert.match(html, /aria-label="Listing cards list"/);
  assert.match(html, /article[^>]+aria-label="Property Listing"/);
  assert.match(html, /data-index-number="0"[^>]+aria-hidden="true"/);
  assert.doesNotMatch(html, /<script\b|<img\b|<iframe\b|img-variant|13644951|13517976/i);
});
