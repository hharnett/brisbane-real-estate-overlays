(() => {
  let host, root, body, heading, signal, key = '', revision = 0, timer, dismissed = '';
  const el = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
  const rpc = async message => { const r = await chrome.runtime.sendMessage(message); if (!r || r.error) throw new Error(r?.error || 'Extension unavailable. Reload this page.'); return r.data; };
  function setup() {
    if (host?.isConnected) return;
    host = document.createElement('div'); host.id = 'brisbane-flood-extension';
    root = host.attachShadow({ mode: 'closed' });
    const style = el('style', `
      :host{all:initial;position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#173c58}
      *{box-sizing:border-box;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}.card{width:284px;max-width:calc(100vw - 32px);background:#edf7ff;border:1px solid #a9cfe9;border-radius:14px;box-shadow:0 8px 28px #123f6326;overflow:hidden}
      header{padding:7px 12px;display:flex;align-items:center;gap:8px;background:#e1f0fc}header strong{flex:1;font-size:12px;font-weight:400;letter-spacing:0;color:#416b8b}
      button{font:inherit;cursor:pointer;border:1px solid #b8d6eb;background:#f5faff;color:#245b82;border-radius:9px;padding:8px 11px;font-size:12px;transition:background .15s}button:hover{background:#d8ecfc}header button{border:0;background:transparent;color:#416b8b;font-size:20px;padding:0;width:26px;height:26px;border-radius:7px}
      .body{padding:8px 12px 11px;max-height:70vh;overflow:auto}h2{font-size:16px;font-weight:700;letter-spacing:-.4px;margin:0 0 6px;line-height:1.2}p{font-size:12px;line-height:1.6;margin:8px 0}.address{color:#52738b;font-size:11px;letter-spacing:.15px;margin-bottom:7px}.small{font-size:10px;color:#52738b}
      .signal{width:9px;height:9px;border-radius:50%;background:#8399a9;flex:none;box-shadow:0 0 0 3px #8399a915}.signal[data-light="green"]{background:#2e9361;box-shadow:0 0 0 3px #2e93611c}.signal[data-light="yellow"]{background:#e4ac24;box-shadow:0 0 0 3px #e4ac2424}.signal[data-light="red"]{background:#d75050;box-shadow:0 0 0 3px #d750501c}
      .reason{display:inline-block;font-size:10px;font-weight:700;padding:3px 6px;border-radius:5px;margin:0 0 8px;background:#e3ebf0;color:#536c7d}.reason.red{background:#fbe5e5;color:#a63535}.reason.yellow{background:#fff1c7;color:#805d09}.reason.green{background:#dcf1e5;color:#226843}
      h2{color:#173f5e}

      .other-overlays{border-top:1px solid #cce1f1;margin-top:10px;padding-top:9px}.other-overlays h3{font-size:10px;letter-spacing:.5px;text-transform:uppercase;font-weight:700;color:#52738b;margin:0 0 6px}.overlay-badge{display:inline-block;border-radius:5px;padding:3px 6px;font-size:10px;font-weight:700;background:#dcebf7;color:#245b82}.overlay-item{margin:7px 0}.overlay-item p{font-size:10px;line-height:1.45;margin:4px 0;color:#52738b}.overlay-badge.unavailable{background:#e7edf1;color:#647786}
      .row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #cce1f1;font-size:12px}.row span:last-child{text-align:right;font-size:11px;font-weight:700;color:#245b82}.choice{display:block;width:100%;text-align:left;margin:7px 0}
      a{color:#1c6294;text-decoration:none}a:hover{text-decoration:underline}.map-link{font-size:11px;font-weight:400;display:inline-block;margin-top:5px}.map-link:hover{text-decoration:underline}
      .actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px}.actions .small{margin:0}.actions button{border:0;padding:6px 0;font-size:11px}.note{font-size:10px;color:#52738b;margin:12px 0 0}
      details{margin-top:7px}summary{cursor:pointer;font-size:10px;color:#52738b}details p{font-size:10px;color:#52738b}
      input{width:100%;padding:10px;border:1px solid #b8d6eb;border-radius:8px;font:inherit;font-size:12px;margin-top:6px}form button{margin-top:8px}button:focus-visible,a:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #78b9e6;outline-offset:3px}
      @media(max-width:400px){:host{right:16px;bottom:16px}}
    `);
    const card = el('section', '', 'card'); card.setAttribute('aria-label', 'Brisbane property overlay checks');
    const header = el('header'); signal = el('span', '', 'signal'); signal.setAttribute('role', 'img'); signal.setAttribute('aria-label', 'Check pending'); header.append(signal, el('strong', 'Property overlays'));
    const minimize = el('button', '−'); minimize.title = 'Minimise property overlays'; minimize.setAttribute('aria-expanded','true');
    minimize.onclick = () => { body.hidden = !body.hidden; minimize.textContent = body.hidden ? '+' : '−'; minimize.setAttribute('aria-expanded',String(!body.hidden)); };
    const close = el('button', '×'); close.title = 'Dismiss for this listing'; close.onclick = () => { dismissed = location.pathname; ++revision; host.remove(); };
    header.append(minimize, close); body = el('div', '', 'body'); body.setAttribute('aria-live','polite');
    card.append(header, body); root.append(style, card); document.documentElement.append(host);
  }
  function state(title, text, tone='unknown') {
    setup(); signal.dataset.light = 'unknown'; signal.setAttribute('aria-label', 'Check pending or unavailable'); body.className = `body ${tone}`; body.replaceChildren(); heading = el('h2', title); body.append(heading); if (text) body.append(el('p', text, 'address'));
  }
  function footer() {
    body.append(el('p', 'Results may be inaccurate, incomplete or out of date. No overlay does not mean no risk. Verify with Council and your solicitor or conveyancer.', 'note'));
    const link = el('a', 'Council map ↗', 'map-link'); link.href='https://fam.brisbane.qld.gov.au/'; link.target='_blank'; link.rel='noopener noreferrer';
    body.append(link);
    const details = el('details'); details.append(el('summary', 'Details, limits & sources'), el('p', 'General information only. Council mapping, address matching and this extension’s processing may contain errors or omissions. Confirm the displayed property and verify results with Council’s maps and relevant property reports before making buying, renting, insurance or development decisions. Discuss any property implications with your solicitor or conveyancer. Do not rely on this extension alone. The checked time records when a lookup ran, not when Council updated its mapping.'));
    details.append(el('p', 'Checks river, creek, storm tide, overland flow, bushfire and landslide mapping against the full Council property holding, not an individual building or apartment. Each type counts once, regardless of polygons or subcategories. Green = all six checked and none mapped; yellow = one type mapped; red = two or more types mapped; grey = any check incomplete. Colours show the number of overlay types, not hazard severity or a Council risk classification. A single High category is yellow; read the individual likelihood, impact and planning categories shown. Multiple overlays do not imply a higher Council likelihood category. No overlays found does not mean a property is safe or free from hazards.'));
    const credit = el('p', 'Derived from © Brisbane City Council and © State of Queensland data. Independent extension; no Council endorsement. ', 'small');
    const license = el('a', 'CC BY 4.0'); license.href='https://creativecommons.org/licenses/by/4.0/'; license.target='_blank'; license.rel='noopener noreferrer'; credit.append(license); details.append(credit);
    const notices = el('a', 'Privacy, data sources & licences'); notices.href = chrome.runtime.getURL('about.html'); notices.target = '_blank'; notices.rel = 'noopener noreferrer'; details.append(notices);
    const developer = el('p'); const profile = el('a', 'Made by @hharnett · GitHub ↗'); profile.href = 'https://github.com/hharnett'; profile.target = '_blank'; profile.rel = 'noopener noreferrer'; developer.append(profile); details.append(developer); body.append(details);
  }
  function manual(address='') {
    const form = el('form'); const label = el('label', 'Search a Brisbane address'); label.className='small';
    const input = el('input'); input.value=address; input.placeholder='78 Albury Street, Deagon QLD 4017'; input.required=true; input.maxLength=180; label.append(input);
    const button = el('button', 'Check address'); button.type='submit'; form.append(label,button);
    form.onsubmit=e=>{e.preventDefault();lookup(input.value,++revision);}; body.append(form);
  }
  function label(a) { return `${a.UNIT_NUMBER ? a.UNIT_NUMBER+'/' : ''}${a.HOUSE_NUMBER || ''}${a.HOUSE_NUMBER_SUFFIX || ''} ${a.CORRIDOR_NAME || ''} ${a.CORRIDOR_SUFFIX_CODE || ''}, ${a.SUBURB || ''} ${a.POSTCODE || ''}`; }
  function renderOtherOverlays(overlays) {
    const section = el('section', '', 'other-overlays');
    section.setAttribute('aria-label', 'Other planning overlays');
    section.append(el('h3', 'Other planning overlays'));
    const rows = Array.isArray(overlays) && overlays.length === 2 ? overlays : [
      { name: 'Bushfire', status: 'unknown' }, { name: 'Landslide', status: 'unknown' }
    ];
    const relevant = rows.filter(row => row.status !== 'absent');
    if (!relevant.length) return;
    for (const row of relevant) {
      const item = el('div', '', 'overlay-item');
      const unavailable = row.status === 'unknown';
      item.append(el('span', unavailable ? `${row.name} · Unavailable` : `${row.name} overlay`, `overlay-badge${unavailable ? ' unavailable' : ''}`));
      item.append(el('p', unavailable ? 'Could not complete this check. Refresh to retry.' : row.categories.join(' · ')));
      section.append(item);
    }
    body.append(section);
  }
  async function inspect(a, token) {
    state('Checking Council mapping…', label(a));
    try {
      const data = await rpc({type:'flood-check', id:a.OBJECTID}); if (token!==revision) return;
      state(data.title,label(a),data.tone);
      signal.dataset.light = data.light || 'unknown'; signal.setAttribute('aria-label', `${data.light || 'Unknown'}: ${data.reason || 'Check incomplete'}`);
      if (data.incomplete && data.overlayCount) body.append(el('p', data.reason, 'reason'));
      body.append(el('p', 'Colour shows overlay count, not severity.', 'small'));
      const chance = {High:'5%',Medium:'1%',Low:'0.2%','Very Low':'0.05%'};
      for (const row of data.rows.filter(row => row.status !== 'absent')) {
        const text = row.status==='unknown' ? 'Unavailable' : !row.level ? 'None mapped' : `${row.level} ${row.kind}${row.kind==='likelihood' ? ` · ${chance[row.level]}/year` : ''}`;
        const item=el('div','','row'); item.append(el('span',row.name),el('span',text));body.append(item);
      }
      renderOtherOverlays(data.overlays);
      const actions = el('div', '', 'actions');
      actions.append(el('p', `Checked ${new Date(data.checkedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`, 'small'));
      const retry=el('button','↻ Refresh'); retry.onclick=()=>inspect(a,++revision);actions.append(retry);body.append(actions);
      if (data.incomplete) body.append(el('p', 'Some layers unavailable. Refresh to retry.', 'note'));
      footer();
    } catch(error) { if(token!==revision)return;state('Overlay status unknown',error.message);manual(label(a));footer(); }
  }
  async function lookup(address, token) {
    state('Finding Council property…',address);
    try {
      const data=await rpc({type:'flood-search',address});if(token!==revision)return;
      if (data.exact) { await inspect(data.exact, token); return; }
      // Confirm ambiguous matches rather than silently checking another holding.
      state(data.properties.length ? 'Confirm the property' : 'Overlay status unknown', data.properties.length ? 'Select the Council address that matches this listing.' : 'No matching Brisbane Council property. Check the address; coverage is Brisbane City Council only.');
      for(const a of data.properties){const b=el('button',label(a),'choice');b.onclick=()=>inspect(a,++revision);body.append(b);}
      if(data.truncated)body.append(el('p','First 25 matches shown. Add a suburb to narrow the search.'));
      manual(address);footer();
    } catch(error){if(token!==revision)return;state('Overlay status unknown',error.message);manual(address);footer();}
  }
  function update() {
    const path=location.pathname;
    if(!FloodSites.isListing(location.href)){if(host)host.remove();key='';++revision;return;}
    if(dismissed===path)return;
    const address=FloodAddress.detect(document);
    const next=path+'|'+address;if(next===key)return;key=next;const token=++revision;
    if(address)lookup(address,token);else{state('Address needed','Could not reliably read a Queensland listing address.');manual();footer();}
  }
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(update,500);});
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  // Also catch SPA URL changes without DOM mutations.
  setInterval(update,1500);update();
})();
