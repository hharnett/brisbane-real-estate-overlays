export const BASE = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/ArcGIS/rest/services/';
export const PROPERTY = 'property_boundaries_holding';
export const LAYERS = [
  { name: 'Brisbane River', service: 'Flood_overlay_Brisbane_River_flood_planning_area' },
  { name: 'Creek / waterway', service: 'Flood_overlay_Creek_waterway_flood_planning_area' },
  { name: 'Overland flow', service: 'Flood_overlay_Overland_flow' }
];
export async function query(service, params, fetcher = fetch) {
  const response = await fetcher(`${BASE}${service}/FeatureServer/0/query`, {
    method: 'POST', body: new URLSearchParams({ f: 'json', ...params }),
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`Council service returned HTTP ${response.status}. Try again later.`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Council service could not complete this check.');
  if (!Array.isArray(data.features)) throw new Error('Council returned an unexpected response.');
  return data;
}
const types = { STREET: 'ST', ROAD: 'RD', AVENUE: 'AVE', DRIVE: 'DR', COURT: 'CT', CRESCENT: 'CRES', TERRACE: 'TCE', PARADE: 'PDE', PLACE: 'PL', CLOSE: 'CL', LANE: 'LANE', CIRCUIT: 'CCT' };
export function normalizeAddress(input) {
  return input.trim().toUpperCase().replace(/([A-Z])\.(?=[,\s]|$)/g, '$1').replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function searchWhere(input) {
  const value = normalizeAddress(input).replace(/^(?:UNIT\s+)?\d+\s*\/\s*/, '');
  const match = value.match(/^(\d+)([A-Z]?)\s+(.+)$/);
  if (!match) throw new Error('Enter a street number and street name, then suburb (e.g. 103 George Street Brisbane City). For units, use 2/103 George Street.');
  const tokens = match[3].split(/\s+/).filter(t => !['QLD', 'QUEENSLAND', 'AUSTRALIA'].includes(t));
  if (!tokens.length || tokens.length > 15 || tokens.some(t => !/^[A-Z0-9'’-]+$/.test(t))) throw new Error('Use a street number, street name and suburb.');
  const clauses = [`HOUSE_NUMBER = ${Number(match[1])}`];
  if (match[2]) clauses.push(`HOUSE_NUMBER_SUFFIX = '${match[2]}'`);
  for (const token of tokens) {
    if (/^\d{4}$/.test(token)) { clauses.push(`POSTCODE = ${Number(token)}`); continue; }
    const escaped = token.replace(/'/g, "''");
    const suffix = types[token] || escaped;
    clauses.push(`(UPPER(CORRIDOR_NAME) LIKE '%${escaped}%' OR UPPER(SUBURB) LIKE '%${escaped}%' OR CORRIDOR_SUFFIX_CODE = '${suffix}')`);
  }
  return clauses.join(' AND ');
}
export function addressLabel(a) {
  return [a.UNIT_NUMBER ? `${a.UNIT_NUMBER}/` : '', `${a.HOUSE_NUMBER ?? ''}${a.HOUSE_NUMBER_SUFFIX || ''}`, a.CORRIDOR_NAME, a.CORRIDOR_SUFFIX_CODE, a.SUBURB, a.POSTCODE].filter(Boolean).join(' ').replace('/ ', '/');
}
export async function searchProperties(input, fetcher) {
  return query(PROPERTY, { where: searchWhere(input), outFields: 'OBJECTID,PROPERTY_ID,UNIT_NUMBER,HOUSE_NUMBER,HOUSE_NUMBER_SUFFIX,CORRIDOR_NAME,CORRIDOR_SUFFIX_CODE,SUBURB,POSTCODE', returnGeometry: 'false', orderByFields: 'SUBURB,CORRIDOR_NAME,HOUSE_NUMBER', resultRecordCount: '25' }, fetcher);
}
export function overallStatus(results) {
  if (results.some(r => r.status === 'present')) return 'present';
  if (results.some(r => r.status === 'unknown')) return 'unknown';
  return 'absent';
}
export async function checkProperty(objectId, fetcher) {
  if (!Number.isSafeInteger(objectId) || objectId < 1) throw new Error('Choose a property from the search results.');
  const data = await query(PROPERTY, { objectIds: String(objectId), outFields: 'OBJECTID,PROPERTY_ID', returnGeometry: 'true', outSR: '28356' }, fetcher);
  const geometry = data.features[0]?.geometry;
  if (data.features.length !== 1 || !geometry?.rings?.length) throw new Error('Property boundary unavailable. No overlay determination can be made.');
  const results = await Promise.all(LAYERS.map(async layer => {
    try {
      const result = await query(layer.service, { geometry: JSON.stringify({ ...geometry, spatialReference: { wkid: 28356 } }), geometryType: 'esriGeometryPolygon', inSR: '28356', spatialRel: 'esriSpatialRelIntersects', outFields: 'OVL2_DESC,DESCRIPTION', returnGeometry: 'false', resultRecordCount: '100' }, fetcher);
      if (result.exceededTransferLimit && !result.features.length) throw new Error('Incomplete response.');
      return { ...layer, status: result.features.length ? 'present' : 'absent', categories: [...new Set(result.features.map(f => f.attributes.OVL2_DESC || f.attributes.DESCRIPTION).filter(Boolean))] };
    } catch (error) { return { ...layer, status: 'unknown', error: error.message }; }
  }));
  return { results, status: overallStatus(results), checkedAt: new Date().toISOString() };
}

// Auto-select only an exact complete street address; unit listings need confirmation.
export function exactPropertyMatch(input, properties) {
  const normalize = text => normalizeAddress(text).split(/\s+/).filter(Boolean).filter(t => !['QLD','QUEENSLAND','AUSTRALIA'].includes(t)).map(t => types[t] || t).join(' ');
  if (/\//.test(input) || /^\s*UNIT\b/i.test(input)) return null;
  const matches = properties.filter(a => !a.UNIT_NUMBER && normalize(addressLabel(a)) === normalize(input));
  return matches.length === 1 ? matches[0] : null;
}
