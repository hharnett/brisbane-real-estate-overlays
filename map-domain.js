// Domain's selected Google Maps popup uses the same row card as list results.
// Scope to the popup so the result column and carousel images are never checked.
(() => {
  const popupSelector = '[data-testid="listing-popup"]';
  const cardSelector = '[data-testid="listing-card-wrapper-row"]';
  function read(link, card, baseUrl) {
    const { visible, readLink } = globalThis.FloodMapPreview;
    if (!visible(link) || !visible(card) || link.closest(cardSelector) !== card ||
        !link.closest(popupSelector) || !link.closest('.gm-style')) return null;
    const info = readLink(link, baseUrl);
    return info ? { ...info, badgeSide: 'left' } : null;
  }
  function find(doc, baseUrl) {
    const cards = new Map();
    for (const link of doc.querySelectorAll(`.gm-style ${popupSelector} a.address[href]`)) {
      const card = link.closest(cardSelector);
      const info = read(link, card, baseUrl);
      if (info) cards.set(card, { ...info, link, card });
    }
    return [...cards.values()];
  }
  globalThis.FloodMapAdapters ||= {};
  globalThis.FloodMapAdapters['domain.com.au'] = { find, read };
})();
