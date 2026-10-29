import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../listing-sites.js';
import '../listing-address.js';
import '../map-preview.js';
import '../map-onthehouse.js';

const { find, read } = globalThis.FloodMapAdapters['onthehouse.com.au'];
const baseUrl = 'https://www.onthehouse.com.au/property-for-sale/qld/paddington-4064';
const listing = 'https://www.onthehouse.com.au/property-for-sale/qld/paddington-4064/12-example-st-paddington-qld-4064-12345678';

function preview({ href = listing, street = '12 Example St, ', suburb = 'Paddington, QLD 4064', hidden = false, zeroSize = false, connected = true, missingAddress = false } = {}) {
  const headings = [street, suburb].map(text => ({ innerText: text, textContent: text }));
  const address = {
    querySelectorAll(selector) {
      assert.equal(selector, 'h2[class*="PropertyCardSearch__propertyCardAddressText--"]');
      return headings;
    },
    closest: selector => selector === 'a[href]' ? link : null,
  };
  const card = {
    isConnected: connected,
    getClientRects: () => zeroSize ? [] : [{ width: 300, height: 400 }],
    closest: selector => selector.includes('[hidden]') ? (hidden ? {} : null) : null,
    querySelector: selector => selector.includes('propertyCardText--') && !missingAddress ? address : null,
  };
  const link = {
    isConnected: connected,
    innerText: 'FOR SALE $1,500,000 3 beds 2 baths 1 car',
    textContent: 'FOR SALE $1,500,000 3 beds 2 baths 1 car',
    getAttribute: name => name === 'href' ? href : null,
    getClientRects: card.getClientRects,
    closest(selector) {
      if (selector.includes('PropertyCardSearch__map--')) return card;
      if (selector.includes('[hidden]')) return hidden ? {} : null;
      return null;
    },
    querySelector: card.querySelector,
  };
  return { card, link, address, headings };
}

function doc(cards) {
  return { querySelectorAll(selector) {
    assert.equal(selector, '[class*="PropertyCardSearch__map--"]');
    return cards;
  } };
}

test('OnTheHouse portal preview reads only its address headings', () => {
  const item = preview();
  const result = find(doc([item.card]), baseUrl);
  assert.equal(result.length, 1);
  assert.equal(result[0].address, '12 Example St, Paddington, QLD 4064');
  assert.equal(result[0].url, listing);
  assert.equal(result[0].link, item.link);
  assert.equal(result[0].card, item.card);
});

test('OnTheHouse strips tracking parameters and supports property history and rental links', () => {
  for (const prefix of ['property', 'property-for-sale', 'property-for-rent']) {
    const href = `/${prefix}/qld/paddington-4064/12-example-st-paddington-qld-4064-12345678`;
    const item = preview({ href: `${href}?ref=map#details` });
    const result = read(item.link, item.card, baseUrl);
    assert.equal(result.url, `https://www.onthehouse.com.au${href}`);
    assert.equal(result.address, '12 Example St, Paddington, QLD 4064');
  }
});

test('OnTheHouse withheld and incomplete map addresses stay unknown', () => {
  for (const street of ['Contact Agent For Address,', '', 'Example St,']) {
    const item = preview({ street });
    const result = read(item.link, item.card, baseUrl);
    assert.equal(result.address, '', street);
  }
});

test('OnTheHouse ignores hidden, collapsed, disconnected and non-preview cards', () => {
  const cards = [preview({ hidden: true }), preview({ zeroSize: true }), preview({ connected: false }), preview({ missingAddress: true })];
  assert.deepEqual(find(doc(cards.map(x => x.card)), baseUrl), []);
});

test('OnTheHouse refuses unrelated links and interstate listings', () => {
  for (const href of [
    listing.replace('https:', 'http:'),
    listing.replace('www.onthehouse.com.au', 'www.onthehouse.com.au.evil.test'),
    listing.replace('/qld/', '/nsw/'),
    'https://www.onthehouse.com.au/property-for-sale/qld/paddington-4064',
    'javascript:alert(1)',
  ]) {
    const item = preview({ href });
    assert.equal(read(item.link, item.card, baseUrl), null, href);
  }
});

test('OnTheHouse re-reads changed preview address for stale-result protection', () => {
  const item = preview();
  const before = read(item.link, item.card, baseUrl);
  item.headings[0].innerText = '14 Example St, ';
  const after = read(item.link, item.card, baseUrl);
  assert.equal(after.address, '14 Example St, Paddington, QLD 4064');
  assert.notEqual(after.key, before.key);
  assert.equal(read(item.link, preview().card, baseUrl), null);
  item.card.getClientRects = () => [];
  assert.equal(read(item.link, item.card, baseUrl), null);
});

test('OnTheHouse sanitized fixture preserves its body portal and address structure', () => {
  const html = readFileSync(new URL('./fixtures/oth-map-preview.html', import.meta.url), 'utf8');
  assert.match(html, /SearchResultsMap__popOverSmall--dLcub/);
  assert.match(html, /PropertyCardSearch__map--SGzl9/);
  assert.match(html, /role="tooltip"/);
  assert.match(html, /PropertyCardSearch__propertyCardAddressText--Cav7-/);
  assert.doesNotMatch(html, /<script\b|<img\b|<iframe\b|signature=|corelogic\.asia/i);
});
