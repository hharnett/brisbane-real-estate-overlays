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
      if (host === 'onthehouse.com.au') return /^\/(?:property|property-for-sale|property-for-rent)\/(?:qld|nsw|vic|sa|wa|tas|nt|act)\/[^/]+-\d{4}\/[^/]+-\d+\/?$/i.test(url.pathname);
      return false;
    } catch { return false; }
  }
  function isMapSearch(input) {
    try {
      const url = new URL(input);
      if (url.protocol !== 'https:') return false;
      const host = url.hostname.replace(/^www\./, '');
      // Panning the map can replace the in- location with a boundingBox query.
      if (host === 'realestate.com.au') return /^\/(?:buy|rent|sold)\/(?:(?:property|with|between|in)-[^/]+\/)?map-[1-9]\d*\/?$/.test(url.pathname);
      if (host === 'domain.com.au') return /^\/(?:sale|rent|sold-listings)\/(?:[^/]+\/?)?$/.test(url.pathname) && url.searchParams.get('displaymap') === '1';
      if (host === 'quietlistings.com.au') return /^\/properties\/?$/.test(url.pathname) && url.searchParams.get('view') === 'map';
      if (host === 'homely.com.au') {
        // Homely's split map stays available on property types, filter pages and
        // pagination. These route segments are linked by its public search UI.
        if (/^\/sold-properties\/[^/]+(?:\/page-[1-9]\d*)?\/?$/.test(url.pathname)) return true;
        const route = url.pathname.replace(/\/$/, '').split('/').slice(1);
        const propertyTypes = ['real-estate', 'houses', 'apartments', 'units', 'townhouses', 'villas', 'land', 'rural-properties', 'studio-apartments', 'block-of-units'];
        const filter = /^(?:under-\d+|[1-9]\d*-bedrooms?|[1-9]\d*-car-garage|open-for-inspection|upcoming-auctions|furnished|with-gym|with-fireplace|pet-friendly|with-pool|page-[1-9]\d*)$/;
        return ['for-sale', 'for-rent'].includes(route[0]) && !!route[1] &&
          propertyTypes.includes(route[2]) && route.slice(3).every(part => filter.test(part));
      }
      if (host === 'onthehouse.com.au') return /^\/(?:property|property-for-sale|property-for-rent|sold)\/(?:qld|nsw|vic|sa|wa|tas|nt|act)\/[^/]+-\d{4}\/?$/i.test(url.pathname);
      return false;
    } catch { return false; }
  }
  function isMapListing(input, source, address = '') {
    try {
      const url = new URL(input), sender = new URL(source);
      const host = url.hostname.replace(/^www\./, '');
      if (!isListing(input) || sender.protocol !== 'https:' || host !== sender.hostname.replace(/^www\./, '')) return false;
      if (/\b(?:NSW|VIC|SA|WA|TAS|NT|ACT)\s+\d{4}\b/i.test(address)) return false;
      if (host === 'quietlistings.com.au') return /\bQLD\s+4\d{3}\b/i.test(address);
      if (host === 'realestate.com.au') return /^\/property-.+?-qld-[^/]+-\d+\/?$/i.test(url.pathname);
      if (host === 'domain.com.au') return /-qld-4\d{3}-\d+\/?$/i.test(url.pathname);
      if (host === 'homely.com.au') return /^\/homes\/[^/]+-qld-4\d{0,3}\/\d+\/?$/i.test(url.pathname);
      if (host === 'onthehouse.com.au') return /^\/(?:property|property-for-sale|property-for-rent)\/qld\//i.test(url.pathname);
      return false;
    } catch { return false; }
  }
  function isSupportedPage(input) {
    return isListing(input) || isMapSearch(input);
  }
  globalThis.FloodSites = { isListing, isMapSearch, isMapListing, isSupportedPage };
})();
