import './listing-sites.js';
import { searchProperties, exactPropertyMatch } from './api.js';
import { checkListing } from './overlays.js';
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab || !globalThis.FloodSites.isListing(sender.url || '')) return;
  const task = async () => {
    if (message.type === 'flood-search' && typeof message.address === 'string' && message.address.length <= 180) {
      const data = await searchProperties(message.address);
      const properties = data.features.map(f => f.attributes);
      return { properties, truncated: !!data.exceededTransferLimit, exact: data.exceededTransferLimit ? null : exactPropertyMatch(message.address, properties) };
    }
    if (message.type === 'flood-check') return checkListing(message.id);
    throw new Error('Unsupported request.');
  };
  task().then(data => respond({ data }), error => respond({ error: error.message }));
  return true;
});
