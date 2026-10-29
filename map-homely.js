// Homely keeps the clicked preview and an inactive mobile carousel inside Search map.
// These accessible names and article boundaries were observed on the live site.
(() => {
  const mapSelector = '[aria-label="Search map"]';
  const cardSelector = 'article[aria-label="Property Listing"]';

  function read(link, card, baseUrl) {
    const preview = globalThis.FloodMapPreview;
    if (!preview.visible(link) || !preview.visible(card) ||
        link.closest(cardSelector) !== card || !card.closest(mapSelector)) return null;
    return preview.readLink(link, baseUrl);
  }

  function find(doc, baseUrl) {
    const cards = new Map();
    for (const link of doc.querySelectorAll(`${mapSelector} ${cardSelector} a[href]`)) {
      const card = link.closest(cardSelector);
      const info = read(link, card, baseUrl);
      if (!info) continue;
      const previous = cards.get(card);
      if (!previous || (!previous.address && info.address)) {
        cards.set(card, { ...info, link, card, badgeSide: 'left' });
      }
    }
    return [...cards.values()];
  }

  globalThis.FloodMapAdapters ||= {};
  globalThis.FloodMapAdapters['homely.com.au'] = { find, read };
})();
