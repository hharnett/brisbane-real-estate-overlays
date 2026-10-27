// Shared by the isolated content script and Node tests. Never executes page scripts.
(() => {
  function normalize(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  function valid(text) { return /^(?:\d+\s*\/\s*)?\d+[A-Za-z]?\s+.+,?\s+(?:QLD|Queensland)\s+4\d{3}$/i.test(text); }
  function fromStructured(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 12) return [];
    if (Array.isArray(value)) return value.flatMap(v => fromStructured(v, depth + 1));
    const result = [];
    if (value.streetAddress && value.addressLocality && value.addressRegion && value.postalCode) {
      const address = normalize(`${value.streetAddress}, ${value.addressLocality}, ${value.addressRegion} ${value.postalCode}`);
      if (valid(address)) result.push(address);
    }
    for (const child of Object.values(value)) if (typeof child === 'object') result.push(...fromStructured(child, depth + 1));
    return result;
  }
  function detect(doc) {
    // The visible listing heading takes precedence over recommendation JSON-LD.
    for (const node of doc.querySelectorAll('h1')) {
      // innerText preserves line breaks in headings split across street/suburb spans.
      for (const text of [node.innerText, node.textContent]) {
        const value = normalize(text);
        if (valid(value)) return value;
      }
    }
    const addresses = [];
    for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try { addresses.push(...fromStructured(JSON.parse(node.textContent))); } catch { /* malformed page metadata */ }
    }
    const unique = [...new Set(addresses)];
    return unique.length === 1 ? unique[0] : '';
  }
  globalThis.FloodAddress = { normalize, valid, fromStructured, detect };
})();
