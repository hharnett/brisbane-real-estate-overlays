import { query } from './api.js';
import { propertyGeometry } from './property-check.js';
import { AWARENESS, awarenessForGeometry } from './awareness.js';

// Aircraft ANEF is deliberately not queried: its source restricts use to
// purposes associated with planning and development in Brisbane.
export const ADDITIONAL_OVERLAYS = [
  { name: 'Bushfire', service: 'Bushfire_overlay' },
  { name: 'Landslide', service: 'Landslide_overlay' }
];

// Count confirmed types once. Missing checks can add to the count, but cannot
// erase a known overlay. Green still requires every check to succeed.
export function summarizeListing(floodRows = [], overlays = []) {
  const rows = [...floodRows, ...overlays];
  const incomplete = floodRows.length !== AWARENESS.length || overlays.length !== ADDITIONAL_OVERLAYS.length ||
    rows.some(row => !['mapped', 'absent'].includes(row?.status));
  const overlayCount = rows.filter(row => row?.status === 'mapped').length;
  const countLabel = overlayCount === 1 ? '1 overlay found' : `${overlayCount} overlays found`;
  const light = overlayCount >= 2 ? 'red' : overlayCount === 1 ? 'yellow' : incomplete ? 'unknown' : 'green';
  return {
    overlayCount, incomplete, light,
    title: incomplete ? 'Overlay check incomplete' : overlayCount ? countLabel : 'No overlays found',
    reason: incomplete ? overlayCount ? `At least ${countLabel} · Some checks unavailable` : 'Some checks unavailable' : overlayCount ? countLabel : 'No overlays found',
    tone: overlayCount ? 'mapped' : incomplete ? 'unknown' : 'clear'
  };
}

export async function overlaysForGeometry(geometry, fetcher) {
  return Promise.all(ADDITIONAL_OVERLAYS.map(async layer => {
    try {
      const result = await query(layer.service, {
        geometry: JSON.stringify(geometry), geometryType: 'esriGeometryPolygon',
        inSR: '28356', spatialRel: 'esriSpatialRelIntersects',
        outFields: 'OVL2_DESC', returnDistinctValues: 'true', returnGeometry: 'false'
      }, fetcher);
      if (result.exceededTransferLimit) throw new Error('Council returned incomplete overlay categories.');
      const categories = result.features.map(f => f.attributes?.OVL2_DESC);
      if (categories.some(c => typeof c !== 'string' || !c.trim())) throw new Error('Council overlay category unavailable.');
      return { ...layer, status: categories.length ? 'mapped' : 'absent', categories: [...new Set(categories.map(c => c.trim()))] };
    } catch (error) {
      return { ...layer, status: 'unknown', categories: [], error: error.message };
    }
  }));
}

export async function checkListing(id, fetcher) {
  const geometry = await propertyGeometry(id, fetcher);
  const [flood, overlays] = await Promise.all([
    awarenessForGeometry(geometry, fetcher), overlaysForGeometry(geometry, fetcher)
  ]);
  return { ...flood, overlays, ...summarizeListing(flood.rows, overlays) };
}
