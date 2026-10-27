# Brisbane Real Estate Overlay

A Chrome/Helium extension that checks **flood, bushfire and landslide mapping** alongside property listings on **realestate.com.au, Domain, Quiet Listings, Homely and OnTheHouse**. It uses Brisbane City Council’s public spatial data, with a compact combined traffic-light card and a separate manual City Plan flood-overlay lookup.

**Beta · Brisbane City Council area only.** Coverage does not extend to all of Greater Brisbane or Queensland.

No account, API key, build step or package installation is needed to use the extension.

<img src="docs/property-overlays-example.png" alt="Property overlays card showing one river overlay, with the address hidden" width="400">

*Example interface with the address removed. Results are illustrative and should not be relied on for a particular property.*

**General information only.** Results may be inaccurate, incomplete or out of date because of errors in source mapping, address matching or this extension’s processing. No overlay found does not mean a property is safe or free from hazards. Confirm the displayed property and verify with Council’s maps and relevant property reports before making buying, renting, insurance or development decisions. Discuss any property implications with your solicitor or conveyancer. Do not rely on this extension alone; seek other qualified advice where needed.

## Install in Helium or Chrome

1. Download this repository using **Code → Download ZIP**, then extract it, or clone it with Git.
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
5. Allow access to the supported listing sites if prompted.
6. Open or refresh an individual property listing on any supported site.

The property overlay card appears at the bottom right. Use **−** to minimise it and **+** to expand it. If you dismiss it with **×**, refresh the listing page to bring it back. Pin the extension in the toolbar to access the manual City Plan lookup.

Keep the extracted extension folder on your computer. Updates are manual: download the new version, replace the files in that folder, click **Reload** on its extensions card, and refresh any open listing tabs. This repository distributes an unpacked extension; it is not a Chrome Web Store installation.

## Listing card

The extension reads the listing heading or structured address metadata. An exact, unique street-address match is checked automatically. Unit addresses, partial matches and ambiguous results ask you to select the appropriate Council property holding. If detection fails, you can enter an address manually.

The card checks six overlay types: **river, creek, storm tide, overland flow, bushfire and landslide**. Its colour counts the types intersecting any part of the selected property holding. Each type counts once, regardless of the number of polygons or subcategories. Flood rows retain the highest mapped category for each source.

| Light | Meaning in this extension |
| --- | --- |
| Green | All six checks completed, with no overlays found. |
| Yellow | Exactly one overlay type is mapped, including a single High category. |
| Red | Two or more overlay types are mapped. |
| Grey | Any check is pending, incomplete or unavailable; known results remain visible. |

**Colours show overlay counts, not hazard severity or a Council risk classification.** One High flood category is yellow; two lower-category types are red. Read the individual likelihood, impact and planning categories. Multiple overlays do not imply a higher Council likelihood category, and green does not mean a property is safe or free from hazards.

For river, creek and storm tide, Council’s categories are High (5%), Medium (1%), Low (0.2%) and Very Low (0.05%) annual chance. Overland flow uses High, Medium and Low **impact**, not the same likelihood scale. See [Council’s explanation](https://www.brisbane.qld.gov.au/community-support-and-safety/natural-disasters-and-emergencies/flooding-in-brisbane/understanding-flood-likelihood-and-impact).

Clear results say “No overlays found” without listing negative rows. Otherwise the heading shows the combined count, such as “2 overlays found”, or “Overlay check incomplete”. Mapped types and unavailable checks are shown individually.

## Other planning overlays

Alongside the four flood checks, the listing card checks the same property holding against Council’s **bushfire** and **landslide** planning overlays.

- Bushfire badges show Council’s published subcategories, including hazard areas and buffer areas. A buffer is displayed as a buffer, not relabelled as a high-hazard area.
- Landslide badges show the mapped susceptibility category.
- Types with no mapped intersection are omitted from the detail rows. Failed checks remain explicitly unavailable and make the overall light grey.
- Bushfire and landslide each contribute one type to the combined traffic light. For example, bushfire alone is yellow; bushfire plus landslide is red.

## Toolbar lookup

The toolbar popup checks the three **City Plan planning overlays**: Brisbane River, creek/waterway and overland flow. Enter a street number, street name and suburb, then choose a property.

Planning overlays and Flood Awareness are different products, so the toolbar result and listing card can differ. The toolbar does not use the traffic-light rules.

## Coverage and limitations

- Coverage is the **Brisbane City Council area**, not all of Greater Brisbane or Queensland.
- Individual listings on realestate.com.au, Domain, Quiet Listings and Homely are supported, along with OnTheHouse individual property pages (including off-market property history). Search results, suburb/street profiles and Domain property-profile pages are not annotated.
- A missing address match or failed check is never treated as a clear result.
- A Council property holding can contain multiple parcels. Any intersection counts, including a small boundary overlap. The extension does not calculate the percentage affected, water depth, floor level or risk to a specific building or apartment.
- Unit prefixes such as `2/100` search the underlying street address and require confirmation. Address ranges, building names and alternate postal addresses may not match.
- Results reflect the public services at query time. Mapping may lag changes, and services or listing-page layouts can change or become unavailable.
- The “Checked” timestamp records when the lookup ran, not when Council updated its mapping. A successful response does not establish that the source data or the extension’s interpretation is correct.
- **No mapped flooding does not mean flood-free.** This is not a flood forecast, insurance assessment or FloodWise Property Report. Verify significant decisions using [Council’s Flood Awareness Map](https://fam.brisbane.qld.gov.au/) and its FloodWise report.

This is an independent project, not affiliated with or endorsed by Brisbane City Council, the Queensland Government, realestate.com.au, Domain, Quiet Listings, Homely or OnTheHouse.

## Privacy and permissions

The extension has no analytics, account system, developer-operated backend or persistent search history. Address queries and property geometry go directly to Council’s ArcGIS services. It does not upload listing photos, prices or entire pages.

Content scripts are limited to realestate.com.au, domain.com.au, quietlistings.com.au, homely.com.au and onthehouse.com.au. Network host permission is limited to `https://services2.arcgis.com/*`. See [PRIVACY.md](PRIVACY.md) for the complete data flow and permission explanation.

## Author

Made by [@hharnett](https://github.com/hharnett). Visit the developer’s GitHub profile to follow their work.

## Licences and attribution

- **Extension code and original documentation:** [MIT License](LICENSE).
- **Council and Queensland Government data:** [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/), separately from the code licence.

See [ATTRIBUTION.md](ATTRIBUTION.md) for the ten queried dataset sources, copyright notices, processing description and source limitations. No bulk Council dataset is bundled in this repository. Preserve the code licence and relevant data notices when redistributing.

## Development

Use Node.js 22 or newer to run tests. There are no npm dependencies.

```sh
npm test
npm run test:live
```

`npm test` runs offline tests for address parsing, exact matching, website routing, geometry queries, error handling and traffic-light rules. `npm run test:live` sends sample public addresses to Council and checks the City Plan services; it requires internet access and can fail if services or data change.

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension entry points and permissions |
| `listing-sites.js` | Supported website and listing URL checks |
| `listing-address.js` | Listing address extraction |
| `content.js` | Listing card and page-navigation handling |
| `background.js` | Service-worker messaging and lookup requests |
| `api.js` | Property searches and City Plan checks |
| `awareness.js` | Flood Awareness queries and categories |
| `property-check.js` | Shared property-boundary lookup |
| `overlays.js` | Bushfire/landslide queries, combined counts and traffic-light rules |
| `popup.html`, `popup.css`, `popup.js` | Manual toolbar lookup |

The bundled `about.html` exposes the privacy and data notices inside the extension. After editing `PRIVACY.md`, `ATTRIBUTION.md` or `LICENSE`, regenerate it with `python3 scripts/build-notices.py`. Only this static notices page is exposed as a web-accessible resource to the five supported sites.

Validation as of 27 October 2026:

- Automated URL and address tests cover all five supported sites. Live queries have been exercised for City Plan flooding, Flood Awareness, bushfire and landslide.
- realestate.com.au has been confirmed working in Helium. Homely and OnTheHouse address extraction has also been checked against fetched public HTML.
- Domain and Quiet Listings rely on address fixtures because direct retrieval was blocked. Full browser testing remains outstanding for those sites, Homely and OnTheHouse. Chrome installation has not been independently verified.

## Troubleshooting and bug reports

- **Card missing:** open an individual supported listing/property page, check the extension’s site access, then refresh the page. Refreshing also restores a dismissed card.
- **Address needed or no match:** enter or correct the address in the card’s search field, then select the correct Council property when prompted. Unit addresses require confirmation of the underlying property holding.
- **Check unavailable:** retry using the card’s **Refresh** button or reload the page. An unavailable result does not mean no overlays exist.

For bug reports, include the browser version, extension version, listing URL if you are comfortable sharing it, and the message displayed by the card. Do not include private documents or credentials.
