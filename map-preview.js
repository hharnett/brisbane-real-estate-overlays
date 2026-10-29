// Read only the visible map preview cards, never the map's other listings/metadata.
(() => {
  function readLink(link, baseUrl, options = {}) {
    let url;
    try { url = new URL(link.getAttribute('href'), baseUrl); } catch { return null; }
    const normalize = globalThis.FloodAddress.normalize;
    // Adapter overrides are authoritative: never fall back to a whole card's price/features.
    const candidates = ('address' in options ? [options.address] : [link.getAttribute('aria-label'), link.innerText, link.textContent]).map(normalize);
    if (!globalThis.FloodSites.isMapListing(url.href, baseUrl, candidates.join(' '))) return null;
    url.search = ''; url.hash = '';
    // Missing/withheld addresses still get a grey indicator, never a guessed address.
    const address = candidates.find(text => text.length <= 180 &&
      /^(?:(?:Unit\s+)?\d+[A-Za-z]?\s*\/\s*)?\d+[A-Za-z]?(?:\s*-\s*\d+[A-Za-z]?)?\s+[^,]+,\s*\S.+$/i.test(text)) || '';
    return { address, url: url.href, key: `${url.pathname}|${address}` };
  }
  function visible(node) {
    return !!node?.isConnected && !!node.getClientRects().length && !node.closest('[hidden], [aria-hidden="true"]');
  }
  function adapter(baseUrl) {
    try { return globalThis.FloodMapAdapters?.[new URL(baseUrl).hostname.replace(/^www\./, '')]; } catch { return null; }
  }
  function current(entry, baseUrl) {
    if (!visible(entry.link) || !visible(entry.card)) return null;
    const site = adapter(baseUrl);
    if (site) return site.read(entry.link, entry.card, baseUrl);
    return readLink(entry.link, baseUrl);
  }
  function find(doc, baseUrl) {
    const site = adapter(baseUrl);
    if (site) return site.find(doc, baseUrl);
    if (!/^(?:www\.)?realestate\.com\.au$/.test(new URL(baseUrl).hostname)) return [];
    const cards = new Map();
    for (const link of doc.querySelectorAll('.gm-style a[href]')) {
      if (!visible(link)) continue;
      const info = readLink(link, baseUrl);
      if (!info) continue;
      // Stable styled-component name observed in REA's map cards; ignore hash suffixes.
      const card = link.closest('[class*="Styles__StyledCard-"], article');
      if (!card) continue;
      const previous = cards.get(card);
      if (!previous || (!previous.address && info.address)) cards.set(card, { ...info, link, card });
    }
    return [...cards.values()];
  }
  globalThis.FloodMapPreview = { readLink, visible, current, find };
})();
