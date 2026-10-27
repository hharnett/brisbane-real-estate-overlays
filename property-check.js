import { query, PROPERTY } from './api.js';

export async function propertyGeometry(id, fetcher) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid property.');
  const data = await query(PROPERTY, { objectIds: String(id), outFields: 'OBJECTID', returnGeometry: 'true', outSR: '28356' }, fetcher);
  const geometry = data.features[0]?.geometry;
  if (data.features.length !== 1 || !geometry?.rings?.length) throw new Error('Property boundary unavailable.');
  return { ...geometry, spatialReference: { wkid: 28356 } };
}
