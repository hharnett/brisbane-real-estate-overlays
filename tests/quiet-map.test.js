import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
import '../map-preview.js';
import '../map-quietlistings.js';

const { find, read } = globalThis.FloodMapAdapters['quietlistings.com.au'];
const baseUrl = 'https://www.quietlistings.com.au/properties?lga=brisbane&view=map';
const address = '12 Example Road, BRIGHTON QLD 4017';

function preview({ label = `View property for ${address}`, header = address, href = '/property/123456', hidden = false, collapsed = false, connected = true, inMap = true, inDialog = true } = {}) {
  const hiddenAncestor = hidden ? {} : null;
  const map = inMap ? {} : null;
  const heading = { innerText: header, textContent: header };
  const dialog = inDialog ? {
    querySelector(selector) {
      assert.equal(selector, '.property-results-map__header-address');
      return heading;
    },
  } : null;
  const card = {
    isConnected: connected,
    getClientRects: () => collapsed ? [] : [{}],
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return hiddenAncestor;
      return null;
    },
  };
  const attributes = new Map([['href', href], ['aria-label', label]]);
  const link = {
    isConnected: connected,
    innerText: 'For sale House 3 bed 1 bath View property',
    textContent: 'For sale House 3 bed 1 bath View property',
    getAttribute: name => attributes.get(name) ?? null,
    getClientRects: () => collapsed ? [] : [{}],
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return hiddenAncestor;
      if (selector === '.gm-style-iw-d') return card;
      if (selector === '.gm-style-iw') return dialog;
      if (selector === '#search-results-map-canvas') return map;
      return null;
    },
  };
  return { link, card, attributes, heading };
}

function documentWith(links) {
  return {
    querySelectorAll(selector) {
      assert.equal(selector, '#search-results-map-canvas .gm-style-iw a.property-results-map__info-window[href]');
      return links;
    },
  };
}

test('Quiet Listings reads the selected preview address without its action label', () => {
  const { link, card } = preview();
  const results = find(documentWith([link]), baseUrl);
  assert.equal(results.length, 1);
  assert.equal(results[0].address, address);
  assert.equal(results[0].url, 'https://www.quietlistings.com.au/property/123456');
  assert.equal(results[0].link, link);
  assert.equal(results[0].card, card);
});

test('Quiet Listings can use the selected dialog header when its link has no address label', () => {
  const { link, card } = preview({ label: null });
  assert.equal(read(link, card, baseUrl).address, address);
});

test('Quiet Listings requires explicit Queensland evidence from the selected preview', () => {
  for (const text of ['12 Example Road, Brighton', '12 Example Road, BRIGHTON VIC 3186', 'Address available on request']) {
    const { link, card } = preview({ label: `View property for ${text}`, header: text });
    assert.equal(read(link, card, baseUrl), null, text);
  }
});

test('Quiet Listings keeps a withheld Queensland address unknown', () => {
  const text = 'Address available on request, BRIGHTON QLD 4017';
  const { link, card } = preview({ label: `View property for ${text}`, header: text });
  const result = read(link, card, baseUrl);
  assert.equal(result.address, '');
  assert.equal(result.url, 'https://www.quietlistings.com.au/property/123456');
});

test('Quiet Listings rejects hidden, collapsed, disconnected and outside-map cards', () => {
  const cases = [{ hidden: true }, { collapsed: true }, { connected: false }, { inMap: false }, { inDialog: false }];
  assert.deepEqual(find(documentWith(cases.map(options => preview(options).link)), baseUrl), []);
});

test('Quiet Listings rejects untrusted hosts and non-property destinations', () => {
  for (const href of [
    'https://example.com/property/123456',
    'https://quietlistings.com.au.evil.test/property/123456',
    'http://www.quietlistings.com.au/property/123456',
    '/property/123456/contact',
    '/properties?view=map',
  ]) {
    const { link, card } = preview({ href });
    assert.equal(read(link, card, baseUrl), null, href);
  }
});

test('Quiet Listings rereads the current address and identity when a pin changes', () => {
  const { link, card, attributes } = preview();
  const before = read(link, card, baseUrl);
  attributes.set('aria-label', 'View property for 14 Example Road, BRIGHTON QLD 4017');
  attributes.set('href', '/property/654321?source=map#details');
  const after = read(link, card, baseUrl);
  assert.equal(after.address, '14 Example Road, BRIGHTON QLD 4017');
  assert.equal(after.url, 'https://www.quietlistings.com.au/property/654321');
  assert.notEqual(after.key, before.key);
  assert.equal(read(link, preview().card, baseUrl), null);
});

test('Quiet Listings deduplicates multiple listing links in the same selected card', () => {
  const { link } = preview();
  assert.equal(find(documentWith([link, link]), baseUrl).length, 1);
});

test('Quiet Listings fixture preserves selected popup structure with fictional content', () => {
  const html = readFileSync(new URL('./fixtures/quiet-map-preview.html', import.meta.url), 'utf8');
  assert.match(html, /id="search-results-map-canvas"/);
  assert.match(html, /class="gm-style-iw-d"/);
  assert.match(html, /class="property-results-map__header-address"/);
  assert.match(html, /aria-label="View property for 12 Example Road, BRIGHTON QLD 4017"/);
  assert.doesNotMatch(html, /<script\b|<img\b|<iframe\b|825052|206 Brighton Terrace/);
});
