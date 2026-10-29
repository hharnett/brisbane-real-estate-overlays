import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
import '../map-preview.js';

const { readLink, find } = globalThis.FloodMapPreview;
const baseUrl = 'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1';
const listing = 'https://www.realestate.com.au/property-house-qld-brighton-123456789';

// DOM-shaped fixtures keep the default Node suite dependency-free. They model
// the browser APIs used by detection; the HTML fixture supports browser checks.
function link({ href = listing, label = '12 Example Road, Brighton', text = label, connected = true, card = null } = {}) {
  const attributes = new Map([['href', href]]);
  if (label !== null) attributes.set('aria-label', label);
  return {
    tagName: 'A',
    href: new URL(href, baseUrl).href,
    innerText: text,
    textContent: text,
    isConnected: connected,
    getAttribute: name => attributes.get(name) ?? null,
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return card?.hiddenAncestor ?? null;
      if (selector.includes('StyledCard-') || selector.includes('article')) return card;
      if (selector.includes('.gm-style')) return card?.map ?? null;
      return null;
    },
    getClientRects: () => card?.getClientRects() ?? [{ width: 320, height: 24 }],
  };
}

function card({ hidden = false, zeroSize = false, connected = true, kind = 'styled' } = {}) {
  return {
    tagName: kind === 'article' ? 'ARTICLE' : 'DIV',
    className: kind === 'article' ? '' : 'Card__Box-sc-3mecgt-0 Styles__StyledCard-sc-1v2bwjv-0',
    map: {},
    hiddenAncestor: hidden ? {} : null,
    isConnected: connected,
    closest(selector) {
      if (selector.includes('[hidden]') || selector.includes('aria-hidden')) return this.hiddenAncestor;
      if (selector.includes('.gm-style')) return this.map;
      return null;
    },
    getClientRects: () => zeroSize ? [] : [{ width: 320, height: 300 }],
  };
}

function documentWith(mapLinks, outsideLinks = []) {
  return {
    querySelectorAll(selector) {
      // Reject accidental fallback to page headings or recommendation metadata.
      assert.match(selector, /\.gm-style/);
      assert.match(selector, /a\[href\]/);
      return mapLinks;
    },
    outsideLinks,
  };
}

test('map preview reads its own aria-label before nested address text', () => {
  const result = readLink(link({ label: ' 12 Example Road,\u00a0 Brighton ', text: '99 Another Street, Hamilton' }), baseUrl);
  assert.equal(result.address, '12 Example Road, Brighton');
  assert.equal(result.url, listing);
});

test('map preview can read visible address text without an aria-label', () => {
  assert.equal(readLink(link({ label: null, text: '3/12 Example Road,\nBrighton' }), baseUrl).address, '3/12 Example Road, Brighton');
  assert.equal(readLink(link({ label: null, text: '12 Example Road, Brighton QLD 4017' }), baseUrl).address, '12 Example Road, Brighton QLD 4017');
});

test('tracking parameters do not change the listing identity', () => {
  const original = readLink(link(), baseUrl);
  const tracked = readLink(link({ href: '/property-house-qld-brighton-123456789?sourcePage=map#details' }), baseUrl);
  assert.equal(tracked.url, listing);
  assert.equal(tracked.key, original.key);
  assert.notEqual(readLink(link({ label: '14 Example Road, Brighton' }), baseUrl).key, original.key);
});

test('rejects unrelated hosts, non-HTTPS, non-listings and interstate listings', () => {
  for (const href of [
    'https://www.realestate.com.au.evil.test/property-house-qld-brighton-123456789',
    'https://example.com/property-house-qld-brighton-123456789',
    'http://www.realestate.com.au/property-house-qld-brighton-123456789',
    'https://www.realestate.com.au/property-house-nsw-brighton-123456789',
    'https://www.realestate.com.au/property-house-vic-brighton-123456789',
    'https://www.realestate.com.au/buy/in-brighton,+qld/list-1',
    'https://www.realestate.com.au/property-house-qld-brighton-123456789/contact',
    'javascript:alert(1)',
  ]) assert.equal(readLink(link({ href }), baseUrl), null, href);
});

test('withheld or incomplete addresses remain unknown without guessing from the URL', () => {
  for (const label of ['Address available on request', 'Brighton', 'Brighton QLD 4017', 'Example Road, Brighton', '12 Example Road', '12 Example Road Brighton']) {
    const result = readLink(link({ label }), baseUrl);
    assert.equal(result.address, '', label);
    assert.equal(result.url, listing);
  }
});

test('find includes visible clicked map cards and ignores unrelated map links', () => {
  const preview = card();
  const address = link({ card: preview });
  const navigation = link({ href: 'https://maps.google.com/', card: null });
  const outside = link({ card: card() });
  const results = find(documentWith([address, navigation], [outside]), baseUrl);
  assert.equal(results.length, 1);
  assert.equal(results[0].link, address);
  assert.equal(results[0].card, preview);
  assert.equal(results[0].address, '12 Example Road, Brighton');
});

test('find ignores hidden, collapsed and disconnected previews', () => {
  const links = [
    link({ card: card({ hidden: true }) }),
    link({ card: card({ zeroSize: true }) }),
    link({ card: card(), connected: false }),
  ];
  assert.deepEqual(find(documentWith(links), baseUrl), []);
});

test('find emits one result per card and prefers its address link over an image link', () => {
  const preview = card();
  const image = link({ card: preview, label: null, text: '' });
  const address = link({ card: preview });
  const duplicate = link({ card: preview, href: `${listing}?source=image` });
  const results = find(documentWith([image, address, duplicate]), baseUrl);
  assert.equal(results.length, 1);
  assert.equal(results[0].link, address);
  assert.equal(results[0].address, '12 Example Road, Brighton');
});

test('find preserves unknown cards and supports an article preview container', () => {
  const preview = card({ kind: 'article' });
  const results = find(documentWith([link({ card: preview, label: 'Address available on request' })]), baseUrl);
  assert.equal(results.length, 1);
  assert.equal(results[0].card, preview);
  assert.equal(results[0].address, '');
});

test('sanitized browser fixture retains observed card markup without remote page content', () => {
  const html = readFileSync(new URL('./fixtures/rea-map-preview.html', import.meta.url), 'utf8');
  assert.match(html, /class="gm-style"/);
  assert.match(html, /Styles__StyledCard-sc-1v2bwjv-0/);
  assert.match(html, /aria-label="12 Example Road, Brighton"/);
  assert.doesNotMatch(html, /<script\b|<img\b|<iframe\b|sourcePage=|canonical_search_id/i);
});
