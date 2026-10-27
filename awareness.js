import { query } from './api.js';
import { propertyGeometry } from './property-check.js';
export const AWARENESS = [
  { name: 'River', service: 'Flood_Awareness_River', kind: 'likelihood' },
  { name: 'Creek', service: 'Flood_Awareness_Creek', kind: 'likelihood' },
  { name: 'Storm tide', service: 'Flood_Awareness_Storm_Tide', kind: 'likelihood' },
  { name: 'Overland flow', service: 'Flood_Awareness_Overland_Flow', kind: 'impact' }
];
const levels = ['High', 'Medium', 'Low', 'Very Low'];
export function summarize(rows) {
  const likelihood = levels.find(level => rows.some(r => r.kind === 'likelihood' && r.level === level));
  const impact = levels.find(level => rows.some(r => r.kind === 'impact' && r.level === level));
  const incomplete = rows.some(r => r.status === 'unknown');
  return { title: incomplete ? 'Flood check incomplete' : likelihood ? `${likelihood} flood likelihood` : impact ? `${impact} overland flow impact` : 'No mapped flooding found', tone: incomplete ? 'unknown' : likelihood || impact ? 'mapped' : 'clear', incomplete };
}
export async function checkAwareness(id, fetcher) {
  return awarenessForGeometry(await propertyGeometry(id, fetcher), fetcher);
}

export async function awarenessForGeometry(geometry, fetcher) {
  const rows = await Promise.all(AWARENESS.map(async layer => {
    try {
      // Distinct categories avoid truncated feature sets hiding a higher category.
      const result = await query(layer.service, { geometry: JSON.stringify({ ...geometry, spatialReference: { wkid: 28356 } }), geometryType: 'esriGeometryPolygon', inSR: '28356', spatialRel: 'esriSpatialRelIntersects', outFields: 'FLOOD_RISK', returnDistinctValues: 'true', returnGeometry: 'false' }, fetcher);
      const categories = result.features.map(f => f.attributes?.FLOOD_RISK);
      if (result.exceededTransferLimit || categories.some(c => !levels.includes(c) || (layer.kind === 'impact' && c === 'Very Low'))) throw new Error('Unrecognised or incomplete Council categories.');
      return { ...layer, status: categories.length ? 'mapped' : 'absent', level: levels.find(l => categories.includes(l)) || null };
    } catch (error) { return { ...layer, status: 'unknown', error: error.message }; }
  }));
  return { rows, ...summarize(rows), checkedAt: new Date().toISOString() };
}
