import { searchProperties, checkProperty, addressLabel } from './api.js';
const $ = id => document.getElementById(id);
let revision = 0;
function element(tag, text, className) { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; }
$('search-form').addEventListener('submit', async event => {
  event.preventDefault();
  const current = ++revision;
  $('matches').replaceChildren(); $('result').hidden = true; $('search').disabled = true;
  $('status').textContent = 'Searching Council property records…';
  try {
    const data = await searchProperties($('address').value);
    if (current !== revision) return;
    $('status').textContent = data.features.length ? `Select the matching property to check its overlays.${data.exceededTransferLimit ? ' Showing the first 25; add a suburb to narrow the search.' : ''}` : 'No matching Council property found. Check the street number, spelling and suburb. This is not a no-overlay result.';
    for (const feature of data.features) {
      const a = feature.attributes;
      const button = element('button', addressLabel(a), 'match'); button.type = 'button';
      button.append(element('small', `Council property ${a.PROPERTY_ID ?? a.OBJECTID}`));
      button.addEventListener('click', () => inspect(a)); $('matches').append(button);
    }
  } catch (error) { if (current === revision) $('status').textContent = error.message; }
  finally { if (current === revision) $('search').disabled = false; }
});
async function inspect(address) {
  const current = ++revision;
  $('search').disabled = false;
  $('result').hidden = true; $('status').textContent = 'Checking the full property boundary against all three overlays…';
  try {
    const data = await checkProperty(address.OBJECTID);
    if (current !== revision) return;
    const box = $('result'); box.replaceChildren(); box.className = data.status;
    box.append(element('span', 'PROPERTY OVERLAY RESULT', 'eyebrow'));
    box.append(element('h2', { present: 'Flood overlay found', absent: 'No overlay found', unknown: 'Check incomplete' }[data.status]));
    box.append(element('p', addressLabel(address), 'selected'));
    for (const row of data.results) {
      const section = element('div', '', 'layer');
      section.append(element('span', { present: 'Overlay found', absent: 'None found', unknown: 'Unavailable' }[row.status], 'badge'), element('strong', row.name));
      if (row.categories?.length) section.append(element('p', row.categories.join(' · ')));
      if (row.error) section.append(element('p', row.error));
      box.append(section);
    }
    box.append(element('p', `Checked ${new Date(data.checkedAt).toLocaleString('en-AU')}. ${data.results.some(r => r.status === 'unknown') ? 'Some layers could not be checked. Retry or verify with Council.' : 'All three layers checked.'}`, 'hint'));
    box.hidden = false; $('status').textContent = 'Check complete. Select another property or search again.';
  } catch (error) { if (current === revision) $('status').textContent = error.message; }
}
