# Privacy

Effective date: 30 October 2026. Applies to Brisbane Real Estate Overlay version 0.8.2.

## What the extension reads

On realestate.com.au, domain.com.au, quietlistings.com.au, homely.com.au and onthehouse.com.au, the extension checks the page URL to identify individual listings and OnTheHouse property pages. It reads page headings and JSON-LD structured address metadata to find a Queensland address. It also processes addresses you manually enter and the Council property you select.

On map views on these five sites, it also reads the visible address and listing link from open property previews linked to Queensland listings. The listing link is used inside the browser to identify the preview and provide an option to open the full listing. It checks visible previews, not every map pin or the full search results. Withheld or incomplete addresses do not trigger a property lookup; unit addresses and ambiguous matches require you to confirm a Council property before overlay checks run.

The content scripts are registered across these five sites so they can respond to navigation between pages. Lookups run only for supported individual listing/property URLs, supported open map previews on these five sites, or when you use the toolbar popup. The extension does not read unrelated sites.

## What leaves your browser

Requests are sent directly to public Brisbane City Council services hosted by Esri at `https://services2.arcgis.com`:

- Search parameters derived from the detected or entered street number, street name, suburb and postcode, when available. Map previews may omit a postcode; automatic checking still requires an exact, unique street-and-suburb match.
- The selected Council property identifier.
- Property-boundary geometry returned by Council, submitted back to its services for flood, bushfire and landslide spatial intersection checks.

As with normal web requests, the service operator receives your IP address and request metadata. Its own logging and retention practices apply. The extension does not control them.

The listing URL stays in the browser. The extension does not send it, the price, photographs, full page content or browser history as lookup parameters. There is no developer-operated server or telemetry endpoint. Following a listing, Council, licence or source link opens that destination in your browser and is subject to that website’s practices.

## Storage and sharing

The extension does not write search history or results to persistent storage, cookies or a database. Addresses, responses and UI state, including map-preview results, are held temporarily in page or service-worker memory. There are no analytics, advertisements, tracking identifiers, accounts or data sales. These statements concern the extension itself, not the listing websites or Council/Esri services.

## Permissions

- **Content scripts on realestate.com.au, domain.com.au, quietlistings.com.au, homely.com.au and onthehouse.com.au:** detect listing addresses and display the card, plus read visible selected map-preview addresses and links and display their badges on those sites.
- **Host access to services2.arcgis.com:** query Council’s property, flood, bushfire and landslide services from the extension.

Map-preview support adds no broader permissions. The extension does not request access to all websites, browsing history, cookies, location, clipboard or persistent storage. All JavaScript is shipped with the extension; no remotely hosted executable code is loaded.

## Control

You can minimise or dismiss the listing/detail card. Map-preview badges appear when a supported preview is open. To prevent automatic lookups, restrict the extension’s site access in the browser’s extension settings, disable it or remove it. No extension search-history deletion is needed because none is persistently stored.

For privacy questions, use the repository’s issue tracker if enabled. Avoid posting personal or sensitive information in a public issue.
