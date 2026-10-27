# Privacy

Effective date: 28 October 2026. Applies to Brisbane Real Estate Overlay version 0.6.0.

## What the extension reads

On realestate.com.au, domain.com.au, quietlistings.com.au, homely.com.au and onthehouse.com.au, the extension checks the page URL to identify individual listings and OnTheHouse property pages. It reads page headings and JSON-LD structured address metadata to find a Queensland address. It also processes addresses you manually enter and the Council property you select.

The content scripts are registered across these five sites so they can respond to navigation between pages. Flood lookups run only for supported individual listing/property URLs or when you use the toolbar popup. The extension does not read unrelated sites.

## What leaves your browser

Requests are sent directly to public Brisbane City Council services hosted by Esri at `https://services2.arcgis.com`:

- Search parameters derived from the detected or entered street number, street name, suburb and postcode.
- The selected Council property identifier.
- Property-boundary geometry returned by Council, submitted back to its services for flood, bushfire and landslide spatial intersection checks.

As with normal web requests, the service operator receives your IP address and request metadata. Its own logging and retention practices apply. The extension does not control them.

The extension does not send the listing URL, price, photographs, full page content or browser history as lookup parameters. There is no developer-operated server or telemetry endpoint. Following an external Council, licence or source link opens that destination in your browser and is subject to that website’s practices.

## Storage and sharing

The extension does not write search history or results to persistent storage, cookies or a database. Addresses, responses and UI state are held temporarily in page or service-worker memory. There are no analytics, advertisements, tracking identifiers, accounts or data sales. These statements concern the extension itself, not the listing websites or Council/Esri services.

## Permissions

- **Content scripts on realestate.com.au, domain.com.au, quietlistings.com.au, homely.com.au and onthehouse.com.au:** detect listing addresses and display the card.
- **Host access to services2.arcgis.com:** query Council’s property and flood services from the extension.

The extension does not request access to all websites, browsing history, cookies, location, clipboard or persistent storage. All JavaScript is shipped with the extension; no remotely hosted executable code is loaded.

## Control

You can minimise or dismiss the listing card. To prevent automatic lookups, restrict the extension’s site access in the browser’s extension settings, disable it or remove it. No extension search-history deletion is needed because none is persistently stored.

For privacy questions, use the repository’s issue tracker if enabled. Avoid posting personal or sensitive information in a public issue. This statement should be updated before any future change introduces caching, telemetry or a backend.
