// Shared host/path allowlist for the content script and service worker.
(() => {
  function isListing(input) {
    try {
      const url = new URL(input);
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.replace(/^www\./, '');
      if (host === 'realestate.com.au') return /^\/property-[^/]+-\d+\/?$/.test(url.pathname);
      if (host === 'domain.com.au') return /^\/[^/]+-(?:qld|nsw|vic|sa|wa|tas|nt|act)-\d{4}-\d+\/?$/i.test(url.pathname);
      if (host === 'quietlistings.com.au') return /^\/property\/\d+\/?$/.test(url.pathname);
      if (host === 'homely.com.au') return /^\/homes\/[^/]+\/\d+\/?$/.test(url.pathname);
      // OnTheHouse uses the same individual property page for listings and history.
      if (host === 'onthehouse.com.au') return /^\/property\/(?:qld|nsw|vic|sa|wa|tas|nt|act)\/[^/]+-\d{4}\/[^/]+-\d+\/?$/i.test(url.pathname);
      return false;
    } catch { return false; }
  }
  globalThis.FloodSites = { isListing };
})();
