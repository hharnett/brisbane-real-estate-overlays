# Data attribution and notices

The software’s MIT licence does not cover third-party datasets or trademarks. All ten queried datasets below publish a **Creative Commons Attribution 4.0** licence in their ArcGIS item metadata, verified on 27 October 2026.

[CC BY 4.0 licence](https://creativecommons.org/licenses/by/4.0/) · [Legal code](https://creativecommons.org/licenses/by/4.0/legalcode.en) · [Council open-data terms](https://data.brisbane.qld.gov.au/terms/terms-and-conditions.pdf)

## Sources and copyright

Copyright years below reproduce the source layer notices; they are not the data’s last-update date.

| Dataset / source | Published copyright notice |
| --- | --- |
| [Property holdings](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/property_boundaries_holding/FeatureServer/0) | © Brisbane City Council 2026; © State of Queensland (Department of Resources) 2026. |
| [City Plan — Brisbane River](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_overlay_Brisbane_River_flood_planning_area/FeatureServer/0) | © Brisbane City Council 2021 |
| [City Plan — Creek/waterway](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_overlay_Creek_waterway_flood_planning_area/FeatureServer/0) | © Brisbane City Council 2023 |
| [City Plan — Overland flow](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_overlay_Overland_flow/FeatureServer/0) | © Brisbane City Council 2014 |
| [Flood Awareness — River](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_River/FeatureServer/0) | © Brisbane City Council 2021 |
| [Flood Awareness — Creek](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Creek/FeatureServer/0) | © Brisbane City Council 2021 |
| [Flood Awareness — Storm tide](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Storm_Tide/FeatureServer/0) | © Brisbane City Council 2021 |
| [Flood Awareness — Overland flow](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Flood_Awareness_Overland_Flow/FeatureServer/0) | © Brisbane City Council 2021 |
| [City Plan — Bushfire](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Bushfire_overlay/FeatureServer/0) | © Brisbane City Council 2018; © State of Queensland (Queensland Fire and Emergency Services) 2018 |
| [City Plan — Landslide](https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/Landslide_overlay/FeatureServer/0) | © Brisbane City Council 2014 |

## Processing performed by this extension

The extension normalises addresses, matches a Council property holding, and requests intersections between its full boundary and Council flood, bushfire and landslide polygons. It summarises the returned categories, selects the highest mapped category per flood source and applies its own traffic-light rule across all six checked types: river, creek, storm tide, overland flow, bushfire and landslide. Bushfire and landslide categories are shown as published, including buffer descriptions. These are derived summaries, not official Council property reports. Source geometry is queried as published, with ArcGIS returning property geometry in EPSG:28356 for the intersection requests. No bulk dataset is bundled or persistently stored.

The traffic-light rule is an extension feature: green means no mapped types after all six successful checks; yellow means one confirmed mapped type; red means two or more confirmed mapped types; grey means no types are confirmed and checks are incomplete. An unavailable check does not erase confirmed overlays: yellow or red remains, with an incomplete warning and a minimum confirmed count. Each type counts once regardless of polygons or subcategories. Colours indicate confirmed counts, not hazard severity or a Council risk classification. A single High category is yellow and retains its published category in the details. Multiple types do not change the Council likelihood category. No overlays found does not mean a property is safe or free from hazards.

## Source limitations

The City Plan source items include the following notice:

> No access or use limitations. Discrepancies may occur when changes to these boundaries do not coincide with changes to cadastral information. Further discrepancies may occur as a result of the time delay between Development Approvals and subsequent amendments to mapping information.

Property holdings are graphical representations; the source description identifies survey plans and related titling/administrative records as the authority for legal property boundaries and related attributes. A holding can contain multiple parcels.

Council provides its services and data without guarantees of accuracy, completeness, currency, suitability or uninterrupted availability. See the linked source metadata and Council terms. CC BY 4.0 also includes a disclaimer of warranties and limitation of liability. A result showing no mapped intersection is not a guarantee against flooding.

The extension provides general information only. Source mapping, address matching and the extension’s processing may contain errors or omissions, and results may be inaccurate, incomplete or out of date. No overlay found does not mean a property is safe or free from hazards. Confirm the displayed property and verify with Council’s maps and relevant property reports before making buying, renting, insurance or development decisions. Discuss any property implications with your solicitor or conveyancer. Do not rely on this extension alone; seek other qualified advice where needed. The checked timestamp records the lookup time, not the source mapping’s last-update date.

This independent extension is not affiliated with or endorsed by Brisbane City Council, the Queensland Government, Esri, realestate.com.au, Domain, Quiet Listings, Homely or OnTheHouse. Their names identify sources and compatibility only; no rights to their logos or trademarks are granted.

## Redistributing data or derived results

Retain the relevant copyright, licence and disclaimer notices, link to the sources and CC BY 4.0, and identify modifications or derived processing. Do not imply endorsement or apply restrictions to the licensed data that conflict with CC BY 4.0. The code’s MIT licence is separate.
