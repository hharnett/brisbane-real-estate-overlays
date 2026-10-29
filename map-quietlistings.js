// Quiet Listings puts only the selected property's link inside its Google Maps
// info window. Never read the other markers or the search page's listing data.
(() => {
  const selector = '#search-results-map-canvas .gm-style-iw a.property-results-map__info-window[href]';
  function read(link, card, baseUrl) {
    if (!globalThis.FloodMapPreview.visible(link) || !globalThis.FloodMapPreview.visible(card) ||
        link.closest('.gm-style-iw-d') !== card || !link.closest('#search-results-map-canvas')) return null;
    const dialog = link.closest('.gm-style-iw');
    if (!dialog) return null;
    // The complete address is in the link's accessible label, not its price and
    // feature text. The visible dialog header is a fallback for a missing label.
    const label = globalThis.FloodAddress.normalize(link.getAttribute('aria-label'));
    const header = dialog.querySelector('.property-results-map__header-address');
    const address = /^View property for\s+/i.test(label)
      ? label.replace(/^View property for\s+/i, '')
      : globalThis.FloodAddress.normalize(header?.innerText || header?.textContent);
    return globalThis.FloodMapPreview.readLink(link, baseUrl, { address });
  }
  function find(doc, baseUrl) {
    const cards = new Map();
    for (const link of doc.querySelectorAll(selector)) {
      // The scrollable body leaves the badge below Google's close button and
      // outside the whole-card link. Its left corner is over the property photo.
      const card = link.closest('.gm-style-iw-d');
      const info = read(link, card, baseUrl);
      if (!info) continue;
      const previous = cards.get(card);
      if (!previous || (!previous.address && info.address)) cards.set(card, { ...info, link, card, badgeSide: 'left' });
    }
    return [...cards.values()];
  }
  (globalThis.FloodMapAdapters ||= {})['quietlistings.com.au'] = { find, read };
})();
