// OnTheHouse renders the selected map property in a tooltip portal beside body.
(() => {
  const cardSelector = '[class*="PropertyCardSearch__map--"]';
  const addressSelector = '[class*="PropertyCardSearch__propertyCardText--"]';
  const headingSelector = 'h2[class*="PropertyCardSearch__propertyCardAddressText--"]';

  function read(link, card, baseUrl) {
    const preview = globalThis.FloodMapPreview;
    if (!preview.visible(link) || !preview.visible(card) || link.closest(cardSelector) !== card) return null;
    const addressNode = link.querySelector(addressSelector);
    // Only the visible address headings belong to this property. The anchor also
    // contains price, bedrooms and inspection text, so never parse all its text.
    const address = addressNode ? [...addressNode.querySelectorAll(headingSelector)]
      .map(node => globalThis.FloodAddress.normalize(node.innerText || node.textContent)).join(' ') : '';
    return preview.readLink(link, baseUrl, { address });
  }

  function find(doc, baseUrl) {
    const previews = [];
    for (const card of doc.querySelectorAll(cardSelector)) {
      if (!globalThis.FloodMapPreview.visible(card)) continue;
      const link = card.querySelector(addressSelector)?.closest('a[href]');
      const info = read(link, card, baseUrl);
      if (info) previews.push({ ...info, link, card });
    }
    return previews;
  }

  globalThis.FloodMapAdapters ??= {};
  globalThis.FloodMapAdapters['onthehouse.com.au'] = { find, read };
})();
