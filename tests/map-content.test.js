import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { summarizeListing } from '../overlays.js';

const mapUrl = 'https://www.realestate.com.au/buy/in-brisbane,+qld/map-1';
const listingUrl = id => `https://www.realestate.com.au/property-house-qld-brighton-${id}`;
const property = (number = 12, id = number) => ({ OBJECTID: id, HOUSE_NUMBER: number, CORRIDOR_NAME: 'EXAMPLE', CORRIDOR_SUFFIX_CODE: 'RD', SUBURB: 'BRIGHTON', POSTCODE: 4017 });
const result = (light = 'green') => {
 const rows = [{ name: 'River', status: ['yellow', 'red'].includes(light) ? 'mapped' : 'absent', level: ['yellow', 'red'].includes(light) ? 'Low' : null, kind: 'likelihood' },
  { name: 'Creek', status: light === 'unknown' ? 'unknown' : light === 'red' ? 'mapped' : 'absent', level: light === 'red' ? 'Low' : null, kind: 'likelihood' },
  { name: 'Storm tide', status: 'absent', kind: 'likelihood' }, { name: 'Overland flow', status: 'absent', kind: 'impact' }],
  overlays = [{ name: 'Bushfire', status: 'absent', categories: [] }, { name: 'Landslide', status: 'absent', categories: [] }];
 return { ...summarizeListing(rows, overlays), checkedAt: '2026-10-29T00:00:00Z', rows, overlays };
};
const sources = ['listing-sites.js', 'listing-address.js', 'map-preview.js', 'content.js'].map(file => [file, readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')]);

// Exercise the actual content scripts with the DOM operations they use. Closed
// shadow roots remain available only to the test harness, not to the scripts.
function harness({ pageUrl = mapUrl } = {}) {
 const shadows = new WeakMap(), intervals = [], observers = [], requests = [], timers = new Map();
 let root, timerId = 0;
 class Element {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = new Map(); this.style = { position: '', cssText: '' }; this.dataset = {}; this.listeners = new Map(); this._text = ''; this.parentNode = null; this.hidden = false; this.className = ''; }
  get isConnected() { return this === root || !!this.parentNode?.isConnected; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set textContent(value) { this.replaceChildren(); this._text = String(value ?? ''); }
  get innerText() { return this.textContent; }
  set innerText(value) { this.textContent = value; }
  append(...children) { for (const child of children) { child.remove(); child.parentNode = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of this.children) child.parentNode = null; this.children = []; this._text = ''; this.append(...children); }
  remove() { if (!this.parentNode) return; const siblings = this.parentNode.children; siblings.splice(siblings.indexOf(this), 1); this.parentNode = null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  attachShadow() { const shadow = new Element('shadow-root'); shadow.parentNode = this; shadows.set(this, shadow); return shadow; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  querySelector(selector) {
   if (selector === '[data-preview-address]') return this.children.find(node => node.getAttribute('data-preview-address') !== null) ?? null;
   throw new Error(`Unexpected element selector: ${selector}`);
  }
  closest(selector) {
   for (let node = this; node; node = node.parentNode) {
    if (selector.includes('[hidden]') && (node.hidden || node.getAttribute('aria-hidden') === 'true')) return node;
    if (selector.includes('Styles__StyledCard-') && (node.className.includes('Styles__StyledCard-') || node.tagName === 'ARTICLE')) return node;
    if (selector === '.gm-style' && node.className.split(/\s+/).includes('gm-style')) return node;
   }
   return null;
  }
  getClientRects() { return this.isConnected && !this.closest('[hidden], [aria-hidden="true"]') ? [{}] : []; }
 }
 root = new Element('html');
 const walk = node => [node, ...node.children.flatMap(walk)];
 const document = {
  documentElement: root,
  createElement: tag => new Element(tag),
  querySelectorAll(selector) {
   if (selector === '.gm-style a[href]') return walk(root).filter(node => node.tagName === 'A' && node.getAttribute('href') && node.closest('.gm-style'));
   if (selector === 'h1') return walk(root).filter(node => node.tagName === 'H1');
   if (selector === 'script[type="application/ld+json"]') return [];
   throw new Error(`Unexpected selector: ${selector}`);
  }
 };
 const map = new Element('div'); map.className = 'gm-style'; root.append(map);
 const location = new URL(pageUrl);
 const sandbox = createContext({
  document, location, URL,
  chrome: { runtime: {
   sendMessage(message) { return new Promise(resolve => requests.push({ message, resolve })); },
   getURL: path => `chrome-extension://test/${path}`
  } },
  getComputedStyle: node => ({ position: node.style.position || 'static' }),
  MutationObserver: class { constructor(callback) { observers.push(callback); } observe() {} },
  setInterval: callback => intervals.push(callback),
  setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id)
 });
 const attachCard = ({ number = 12, address = `${number} Example Road, Brighton`, id = number, outside = false, hidden = false, href = listingUrl(id), headingAddress } = {}) => {
  const card = new Element('div'); card.className = 'Styles__StyledCard-sc-fixture'; card.hidden = hidden;
  const link = new Element('a'); link.setAttribute('href', href); link.setAttribute('aria-label', address); link.textContent = address;
  card.append(link); (outside ? root : map).append(card);
  let heading;
  if (headingAddress !== undefined) {
   heading = new Element('h2'); heading.setAttribute('data-preview-address', ''); heading.textContent = headingAddress; card.append(heading);
  }
  return { card, link, heading };
 };
 const dispatch = (node, type = 'click') => {
  const event = { type, target: node, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
  // A composed event keeps its propagation path even if its handler refreshes
  // the panel and removes the original control from the closed shadow root.
  const path = [];
  for (let current = node; current; current = current.parentNode) path.push(current);
  for (const current of path) {
   event.currentTarget = current;
   current[`on${type}`]?.(event);
   current.listeners.get(type)?.(event);
   if (event.stopped) break;
  }
  return event;
 };
 const click = node => dispatch(node, 'click');
 const badge = card => card.children.find(node => node.getAttribute('data-brisbane-map-overlay') !== null);
 const button = card => shadows.get(badge(card))?.children.find(node => node.tagName === 'BUTTON');
 const panel = () => root.children.find(node => node.id === 'brisbane-flood-extension');
 const panelElements = () => panel() ? walk(shadows.get(panel())) : [];
 return {
  attachCard, requests, location, click, dispatch, badge, button, panel, panelElements,
  onPageEvent(name, callback) { root.addEventListener(name, callback); },
  start(adapterSource = '') {
   for (const [filename, source] of sources) {
    if (filename === 'content.js' && adapterSource) runInContext(adapterSource, sandbox, { filename: 'test-map-adapter.js' });
    runInContext(source, sandbox, { filename });
   }
  },
  update() { intervals[0](); },
  mutate() { for (const callback of observers) callback([]); },
  flushTimers() { const pending = [...timers.values()]; timers.clear(); for (const callback of pending) callback(); },
  async respond(index, data) { requests[index].resolve({ data }); await new Promise(setImmediate); },
  async fail(index, error) { requests[index].resolve({ error }); await new Promise(setImmediate); },
  change(preview, number) { const address = `${number} Example Road, Brighton`; preview.link.setAttribute('href', listingUrl(number)); preview.link.setAttribute('aria-label', address); preview.link.textContent = address; },
  panelText: () => panelElements().find(node => node.className.startsWith('body'))?.textContent || '',
  listeners: node => node.listeners
 };
}

test('only a visible map preview starts a check, and repeated updates do not repeat requests', async () => {
 const h = harness();
 h.attachCard({ outside: true }); h.attachCard({ hidden: true, number: 99 }); h.start();
 assert.equal(h.requests.length, 0);
 const preview = h.attachCard(); h.update();
 assert.equal(h.requests.length, 1);
 assert.equal(h.requests[0].message.type, 'flood-map-search');
 assert.equal(h.requests[0].message.address, '12 Example Road, Brighton');
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 for (let i = 0; i < 4; i++) h.update();
 assert.equal(h.requests.length, 1);
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 assert.equal(h.requests[1].message.type, 'flood-check');
 h.update(); h.update(); assert.equal(h.requests.length, 2);
 await h.respond(1, result());
 assert.equal(h.button(preview.card).dataset.light, 'green');
 assert.match(h.button(preview.card).getAttribute('aria-label'), /No overlays found/);
 assert.equal(h.panel(), undefined);
 h.update(); assert.equal(h.requests.length, 2);
});

test('switching a reused card discards an old pending address response', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 const oldBadge = h.badge(preview.card);
 h.change(preview, 24); h.update();
 assert.equal(oldBadge.isConnected, false);
 assert.equal(h.requests.length, 2);
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 assert.equal(h.requests.length, 2);
 assert.match(h.button(preview.card).title, /^24 Example Road/);
 await h.respond(1, { properties: [property(24)], exact: property(24), truncated: false });
 assert.equal(h.requests[2].message.id, 24);
 await h.respond(2, result('yellow'));
 assert.equal(h.button(preview.card).dataset.light, 'yellow');
});

test('switching pin before the observer runs cannot render a stale overlay result', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 h.click(h.button(preview.card)); assert.match(h.panelText(), /Checking property overlays/);
 h.change(preview, 24);
 await h.respond(1, result('yellow'));
 assert.doesNotMatch(h.panelText(), /1 overlay found/);
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 h.update();
 assert.equal(h.panel(), undefined);
 assert.equal(h.requests[2].message.address, '24 Example Road, Brighton');
});

// A site can keep the same anchor while updating an address in a sibling heading.
// The real content lifecycle must use the adapter's live read(), not readLink alone.
const headingAdapter = `
(() => {
 const read = (link, card, baseUrl) => FloodMapPreview.readLink(link, baseUrl, {
  address: card.querySelector('[data-preview-address]').textContent
 });
 globalThis.FloodMapAdapters ||= {};
 FloodMapAdapters['homely.com.au'] = {
  read,
  find(doc, baseUrl) {
   return [...doc.querySelectorAll('.gm-style a[href]')].map(link => {
    const card = link.closest('[class*="Styles__StyledCard-"], article');
    return { ...read(link, card, baseUrl), link, card, badgeSide: 'left' };
   });
  }
 };
})();`;

test('an adapter-derived heading change rejects pending results and clears previous details with the anchor unchanged', async () => {
 const h = harness({ pageUrl: 'https://www.homely.com.au/for-sale/brighton-qld-4017/real-estate' });
 const preview = h.attachCard({
  href: 'https://www.homely.com.au/homes/example-brighton-qld-4017/10000002',
  address: 'Address available on request', headingAddress: '12 Example Road, Brighton QLD 4017',
 });
 h.start(headingAdapter);
 assert.equal(h.requests[0].message.address, '12 Example Road, Brighton QLD 4017');
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 h.click(h.button(preview.card));
 preview.heading.textContent = '24 Example Road, Brighton QLD 4017';
 await h.respond(1, result('yellow'));
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 assert.doesNotMatch(h.panelText(), /1 overlay found/);
 h.mutate();
 assert.equal(h.badge(preview.card), undefined);
 assert.equal(h.panel(), undefined);
 h.flushTimers();
 assert.equal(h.requests[2].message.address, '24 Example Road, Brighton QLD 4017');
 await h.respond(2, { properties: [property(24)], exact: property(24), truncated: false });
 await h.respond(3, result('green'));
 const oldBadge = h.badge(preview.card);
 h.click(h.button(preview.card));
 assert.match(h.panelText(), /No overlays found/);
 preview.heading.textContent = '36 Example Road, Brighton QLD 4017';
 h.mutate();
 assert.equal(oldBadge.isConnected, false);
 assert.equal(h.panel(), undefined);
 assert.equal(preview.link.getAttribute('aria-label'), 'Address available on request');
 assert.equal(preview.link.getAttribute('href'), 'https://www.homely.com.au/homes/example-brighton-qld-4017/10000002');
 h.flushTimers();
 assert.equal(h.requests[4].message.address, '36 Example Road, Brighton QLD 4017');
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
});

test('a changed preview immediately loses its old colour and details before the next lookup is debounced', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 await h.respond(1, result());
 const oldBadge = h.badge(preview.card);
 h.click(h.button(preview.card)); assert.match(h.panelText(), /No overlays found/);
 h.change(preview, 24); h.mutate();
 assert.equal(oldBadge.isConnected, false);
 assert.equal(h.badge(preview.card), undefined);
 assert.equal(h.panel(), undefined);
 assert.equal(h.requests.length, 2);
 h.flushTimers();
 assert.equal(h.requests.length, 3);
 assert.equal(h.requests[2].message.address, '24 Example Road, Brighton');
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
});

test('clicking an old badge during a pin change starts the new preview without showing stale details', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 await h.respond(1, result());
 const oldButton = h.button(preview.card);
 h.change(preview, 24); h.click(oldButton);
 assert.equal(oldButton.isConnected, false);
 assert.equal(h.panel(), undefined);
 assert.equal(h.requests.length, 3);
 assert.equal(h.requests[2].message.address, '24 Example Road, Brighton');
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
});

test('removed map previews ignore pending responses before the observer runs', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 preview.card.remove();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 assert.equal(h.requests.length, 1);
 h.update(); assert.equal(h.badge(preview.card), undefined);
 assert.equal(preview.card.style.position, '');
});

test('unit addresses stay grey until a Council property is explicitly confirmed', async () => {
 const h = harness(), preview = h.attachCard({ address: '2/12 Example Road, Brighton' }); h.start();
 const unit = { ...property(), UNIT_NUMBER: '2' };
 await h.respond(0, { properties: [unit], exact: null, truncated: false });
 assert.equal(h.requests.length, 1);
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 h.click(h.button(preview.card));
 assert.match(h.panelText(), /Confirm the property/);
 const choices = h.panelElements().filter(node => node.className === 'choice');
 assert.equal(choices.length, 1);
 const choiceEvent = h.click(choices[0]);
 assert.equal(choiceEvent.stopped, true);
 assert.equal(choiceEvent.prevented, false);
 assert.equal(h.requests[1].message.type, 'flood-check');
 await h.respond(1, result('yellow'));
 assert.equal(h.button(preview.card).dataset.light, 'yellow');
 assert.match(h.panelText(), /2\/12 EXAMPLE RD/);
});

test('withheld addresses and partial or failed checks never get a green badge', async () => {
 const missing = harness(), withheld = missing.attachCard({ address: 'Address available on request' }); missing.start();
 assert.equal(missing.requests.length, 0);
 assert.equal(missing.button(withheld.card).dataset.light, 'unknown');
 missing.click(missing.button(withheld.card)); assert.match(missing.panelText(), /Address needed/);

 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 await h.respond(1, result('unknown'));
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 h.click(h.button(preview.card)); assert.match(h.panelText(), /Overlay check incomplete/);
 assert.match(h.panelText(), /Unavailable/);
 h.click(h.panelElements().find(node => node.tagName === 'BUTTON' && node.textContent === '↻ Refresh'));
 await h.fail(2, 'Council service unavailable');
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
 assert.match(h.panelText(), /Council service unavailable/);
});

for (const [count, light] of [[0, 'unknown'], [1, 'yellow'], [2, 'red']]) {
 test(`${count} confirmed overlays with an unavailable check render ${light} in both the map badge and details`, async () => {
  const h = harness(), preview = h.attachCard({
   address: '20 William Parade, Fairfield QLD 4103',
   href: 'https://www.realestate.com.au/property-house-qld-fairfield-10000020',
  });
  const address = { OBJECTID: 20, HOUSE_NUMBER: 20, CORRIDOR_NAME: 'WILLIAM', CORRIDOR_SUFFIX_CODE: 'PDE', SUBURB: 'FAIRFIELD', POSTCODE: 4103 };
  const rows = [
   { name: 'River', status: count ? 'mapped' : 'absent', level: count ? 'Medium' : null, kind: 'likelihood' },
   { name: 'Creek', status: count === 2 ? 'mapped' : 'absent', level: count === 2 ? 'Low' : null, kind: 'likelihood' },
   { name: 'Storm tide', status: 'absent', level: null, kind: 'likelihood' },
   { name: 'Overland flow', status: 'unknown', level: null, kind: 'impact' },
  ];
  const overlays = [
   { name: 'Bushfire', status: 'absent', categories: [] },
   { name: 'Landslide', status: 'absent', categories: [] },
  ];
  h.start();
  await h.respond(0, { properties: [address], exact: address, truncated: false });
  await h.respond(1, { rows, overlays, checkedAt: '2026-10-29T00:00:00Z', ...summarizeListing(rows, overlays) });
  assert.equal(h.button(preview.card).dataset.light, light);
  h.click(h.button(preview.card));
  const signal = h.panelElements().find(node => node.className === 'signal');
  assert.equal(signal.dataset.light, light);
  assert.match(h.panelText(), /20 WILLIAM PDE, FAIRFIELD 4103/);
  assert.match(h.panelText(), /Overlay check incomplete/);
  assert.match(h.panelText(), /Overland flowUnavailable/);
  assert.match(h.panelText(), /Some layers unavailable\. Refresh to retry\./);
  if (count) {
   const countLabel = `At least ${count} overlay${count === 1 ? '' : 's'} found`;
   assert.ok(h.panelText().includes(`${countLabel} · Some checks unavailable`));
   assert.ok(signal.getAttribute('aria-label').includes(countLabel));
   assert.ok(h.button(preview.card).title.includes(`${countLabel} · Some checks unavailable`));
   assert.ok(h.button(preview.card).getAttribute('aria-label').includes(countLabel));
   assert.equal(h.panelElements().find(node => node.className === `reason ${light}`).textContent, `${countLabel} · Some checks unavailable`);
   assert.match(h.panelText(), /RiverMedium likelihood · 1%\/year/);
  }
  assert.equal(h.requests.length, 2);
 });
}

test('the badge opens details, stops map clicks, closes and reopens without another lookup', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 await h.respond(1, result());
 const badgeButton = h.button(preview.card), event = h.click(badgeButton);
 assert.equal(event.prevented, true); assert.equal(event.stopped, true);
 assert.match(h.panelText(), /No overlays found/);
 for (const name of ['pointerdown', 'mousedown', 'dblclick']) {
  let stopped = false; h.listeners(badgeButton).get(name)({ stopPropagation() { stopped = true; } });
  assert.equal(stopped, true, name);
 }
 h.click(h.panelElements().find(node => node.tagName === 'BUTTON' && node.textContent === '×'));
 assert.equal(h.panel(), undefined);
 assert.equal(h.badge(preview.card).isConnected, true);
 h.update(); assert.equal(h.panel(), undefined);
 h.click(badgeButton); assert.match(h.panelText(), /No overlays found/);
 h.click(badgeButton); assert.equal(h.panel(), undefined);
 assert.equal(h.requests.length, 2);
});

test('panel controls keep the map preview open while isolating composed pointer and click events', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 await h.respond(1, result());
 h.click(h.button(preview.card));
 const outsideEvents = [];
 for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick', 'touchstart']) {
  // Model a site's outside-click dismissal: the extension's fixed panel is
  // outside the selected map popup, so escaped events would remove that popup.
  h.onPageEvent(type, () => { outsideEvents.push(type); preview.card.remove(); h.mutate(); });
 }
 const refresh = h.panelElements().find(node => node.tagName === 'BUTTON' && node.textContent === '↻ Refresh');
 for (const type of ['pointerdown', 'mousedown', 'dblclick', 'touchstart', 'click']) {
  const event = h.dispatch(refresh, type);
  assert.equal(event.stopped, true, type);
  assert.equal(event.prevented, false, `${type} must preserve the control's default behavior`);
  assert.equal(preview.card.isConnected, true, type);
  assert.ok(h.panel(), type);
 }
 assert.deepEqual(outsideEvents, []);
 assert.equal(h.requests.length, 3);
 assert.equal(h.requests[2].message.type, 'flood-check');
 assert.match(h.panelText(), /Checking property overlays/);
 await h.respond(2, result('yellow'));
 assert.match(h.panelText(), /1 overlay found/);
 assert.equal(h.button(preview.card).dataset.light, 'yellow');

 const councilLink = h.panelElements().find(node => node.tagName === 'A' && node.textContent === 'Council map ↗');
 const linkEvent = h.click(councilLink);
 assert.equal(linkEvent.stopped, true);
 assert.equal(linkEvent.prevented, false, 'source links must still be able to open normally');
 const minimize = h.panelElements().find(node => node.tagName === 'BUTTON' && node.textContent === '−');
 h.click(minimize);
 assert.equal(minimize.getAttribute('aria-expanded'), 'false');
 h.click(minimize);
 assert.equal(minimize.getAttribute('aria-expanded'), 'true');
 h.click(h.panelElements().find(node => node.tagName === 'BUTTON' && node.textContent === '×'));
 assert.equal(h.panel(), undefined);
 assert.equal(preview.card.isConnected, true);
 assert.deepEqual(outsideEvents, []);

 h.dispatch(preview.link, 'mousedown');
 assert.deepEqual(outsideEvents, ['mousedown'], 'events outside the extension must still reach the site');
 assert.equal(preview.card.isConnected, false);
});

test('SPA navigation out of the map removes the badge and rejects an in-flight response', async () => {
 const h = harness(), preview = h.attachCard(); h.start();
 h.click(h.button(preview.card)); assert.ok(h.panel());
 h.location.href = 'https://www.realestate.com.au/buy/in-brisbane,+qld/list-1';
 await h.respond(0, { properties: [property()], exact: property(), truncated: false });
 assert.equal(h.requests.length, 1);
 h.update();
 assert.equal(h.badge(preview.card), undefined); assert.equal(h.panel(), undefined);
 assert.equal(preview.card.style.position, '');
 h.location.href = mapUrl; h.update();
 assert.equal(h.requests.length, 2);
 assert.equal(h.button(preview.card).dataset.light, 'unknown');
});
