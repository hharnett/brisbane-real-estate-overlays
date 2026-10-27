import {searchProperties, checkProperty, addressLabel} from '../api.js';
for (const input of ['103 George Street Brisbane City', '78 Albury Street Deagon', '156 Given Terrace Paddington']) {
 const matches = await searchProperties(input);
 console.log(input, matches.features.length, 'matches');
 if (!matches.features.length) throw new Error('Expected a known address match');
 const property = matches.features[0].attributes;
 const result = await checkProperty(property.OBJECTID);
 console.log(addressLabel(property), JSON.stringify(result));
 if (input === '78 Albury Street Deagon' && result.status !== 'present') throw new Error('Expected a positive overlay intersection');
 if (result.results.some(r => r.status === 'unknown')) throw new Error('Live overlay check incomplete');
}
