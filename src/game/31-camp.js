/* ---------- Camp: the Base's third tab (‹ Camp arrow on the left of the Base) ----------
   Send owned characters out for 24 hours to bring back Wardrobe clothes. Same screen pattern as the Base / Expedition:
   a 16:9 stage (wallpaper camp:bg from Settings → Admin, black by default), a label per place, a side panel.
   - Tournament (the Colosseum): 1 character → 1 UR piece; 2★ chance 10% when a UR character fights, 5% for an SSR one.
   - Tavern: 2 characters → 1–3 SSR pieces each.
   - Central: 3 characters → 1–3 R pieces each.
   Drops are rolled when the team sets off and stored (S.camp[placeId] = {chars, start, ends, drops: [{id, st}]}), so
   collecting only needs room in the 999-piece wardrobe. A character is busy on one Camp or Expedition job at a time. */
const CAMP_MS = 24 * 36e5;
const CAMP_PLACES = [
  { id: 'tournament', name: 'Tournament', sub: 'Colosseum', slots: 1, rarity: 5, desc: 'One champion fights in the Colosseum and brings home a UR piece. UR fighters win a 2★ piece more often.', x: 36, y: 28, col: '#d58bff' },
  { id: 'tavern', name: 'Tavern', sub: 'Two guests', slots: 2, rarity: 4, desc: 'A night of games and gossip at the tavern. Each guest comes back with 1–3 SSR pieces.', x: 16, y: 66, col: '#ffb35a' },
  { id: 'central', name: 'Central', sub: 'Three helpers', slots: 3, rarity: 3, desc: 'Help out around the central market. Each helper comes back with 1–3 R pieces.', x: 52, y: 70, col: '#59b6ff' }
];
const CAMP_STAR2 = { 5: 0.10, 4: 0.05 };   // Tournament 2★ chance by the fighter's rarity
const campPlace = id => CAMP_PLACES.find(p => p.id === id);
const campPosDef = id => { const p = campPlace(String(id).replace(/^c:/, '')); return p ? { x: p.x, y: p.y } : { x: 50, y: 50 }; };
const campOf = id => (S.camp || {})[id] || null;
const campDone = id => { const c = campOf(id); return !!c && c.ends <= Date.now(); };
const campAway = cid => CAMP_PLACES.find(p => ((campOf(p.id) || {}).chars || []).includes(cid));
const campReady = () => CAMP_PLACES.some(p => campDone(p.id));
const busyWhere = cid => { const e = typeof expAway === 'function' && expAway(cid), c = campAway(cid); return e ? e.name : c ? c.name : null; };
let campPick = [], campBackSeen = '';

function rollCamp(place, chars) {
  const pool = (S.clothes || []).filter(x => +x.rarity === place.rarity), drops = [];
  if (!pool.length) return drops;
  if (place.id === 'tournament') {
    const c = findEntry(chars[0]), st2 = Math.random() < (CAMP_STAR2[+(c || {}).rarity] || 0);
    drops.push({ id: rpick(pool).id, st: st2 ? 2 : 1 });
  } else chars.forEach(() => { const n = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) drops.push({ id: rpick(pool).id, st: place.rarity === 5 ? 1 : 0 }); });
  return drops;
}
function sendCamp(id) {
  const p = campPlace(id); if (!p || campOf(id)) return;
  const chars = campPick.filter(cid => owns(cid) && !busyWhere(cid)).slice(0, p.slots);
  if (chars.length < p.slots) { toast(`${p.name} needs ${p.slots} character${p.slots > 1 ? 's' : ''}.`); return; }
  if (!(S.clothes || []).some(x => +x.rarity === p.rarity)) { toast(`There are no ${CRN[p.rarity]} clothes in the game yet.`); return; }
  S.camp = { ...(S.camp || {}), [id]: { chars, start: Date.now(), ends: Date.now() + CAMP_MS, drops: rollCamp(p, chars) } };
  campPick = []; persist(); renderFarm();
  toast(`${chars.map(c => (findEntry(c) || {}).name).join(', ')} set off for the ${p.name}. Back in 24 hours.`);
}
/* Auto send best: fills every empty place at once. The Tournament gets the best free fighter (UR first, then the highest
   CS: a UR wins 2★ pieces twice as often); the Tavern and Central rewards don't depend on who goes, so they take the
   remaining characters from the lowest rarity up, which keeps the URs free for the Tournament and Expeditions. */
function autoSendCamp() {
  const free = CAMP_PLACES.filter(p => !campOf(p.id) && (S.clothes || []).some(x => +x.rarity === p.rarity));
  if (!CAMP_PLACES.some(p => !campOf(p.id))) { toast('Every place already has a team.'); return; }
  let pool = expChars().filter(e => !busyWhere(e.id));
  if (!pool.length) { toast(expChars().length ? 'Every character is already away.' : "You don't own any characters yet."); return; }
  const best = (a, b) => b.rarity - a.rarity || charScore(b) - charScore(a) || a.name.localeCompare(b.name);
  const now = Date.now(), d = { ...(S.camp || {}) }, sent = [];
  free.forEach(p => {
    const order = p.id === 'tournament' ? pool.slice().sort(best) : pool.slice().sort((a, b) => -best(a, b));
    if (order.length < p.slots) return;
    const chars = order.slice(0, p.slots).map(e => e.id);
    d[p.id] = { chars, start: now, ends: now + CAMP_MS, drops: rollCamp(p, chars) };
    pool = pool.filter(e => !chars.includes(e.id)); sent.push(p.name);
  });
  if (!sent.length) { toast('Not enough free characters for the places left.'); return; }
  S.camp = d; campPick = []; fmSel = null; persist(); renderFarm();
  toast(`${sent.length > 1 ? 'Teams' : 'A team'} sent to the ${sent.join(', ')}. Back in 24 hours.`);
}
function collectCamp(ids) {
  const got = [], ready = ids.filter(campDone), need = ready.reduce((t, id) => t + campOf(id).drops.length, 0);
  if (!ready.length) { toast('Nobody is back yet.'); return; }
  if (need > wardFree()) {
    openModal({ title: 'Wardrobe full', ic: 'hanger', small: true, body: `<div class="stack" style="text-align:center">
      <p class="desc">Your team brought back <b>${need}</b> piece${need === 1 ? '' : 's'}, but the wardrobe only has room for <b>${wardFree()}</b> (${fmt(wardCount())} / ${INV_CAP}).</p>
      <p class="tiny">They'll wait at the camp. Fuse spare clothes to make space, then collect.</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Close</button><button class="btn gold" id="cfFuse">${icon('fuse')}Fuse clothes</button></div></div>`,
      onMount: b => { b.querySelector('[data-close]').onclick = closeModal; $('#cfFuse').onclick = () => { closeFarm(); openFuse(3); }; } });
    return;
  }
  ready.forEach(id => { campOf(id).drops.forEach(d => { const x = clothOf(d.id); if (!x) return; const isNew = !owns(x.id); addCloth(x.id, d.st >= 2 ? 2 : 1); got.push({ x, isNew, st: d.st }); });
    const c = { ...S.camp }; delete c[id]; S.camp = c; });
  got.sort((a, b) => b.x.rarity - a.x.rarity || b.st - a.st);
  persist(); renderMenu(); renderFarm(); showCampDrops(got);
}
function showCampDrops(got) {
  const old = document.querySelector('.rdrop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Camp rewards');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Camp rewards</h2>
      <div class="rdrop-grid">${got.map((d, i) => `<div class="rdrop-it r${d.x.rarity}" style="--i:${i}"><span class="rdrop-glow"></span><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<span class="rdrop-new">NEW</span>' : ''}${d.st ? clothStarRow(d.st, 'drop') : ''}<span class="rdrop-r">${ctag(d.x.rarity, 'lg')}</span><b>${esc(d.x.name)}</b></div>`).join('') || '<p class="tiny">Nothing this time.</p>'}</div>
      <div class="row" style="justify-content:center"><button class="btn gold" id="cdDone">Done</button></div>
      <p class="tiny">${got.length} piece${got.length === 1 ? '' : 's'} added to your wardrobe.</p></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  el.querySelector('#cdDone').onclick = () => el.remove();
}
INFO.camp = () => ({ title: 'Camp', body: `<p class="desc">Send characters out for 24 hours to bring back Wardrobe clothes. A character can only be on one Camp or Expedition job at a time. Collecting needs room in your wardrobe (${INV_CAP} pieces).</p>
  <table class="cs-table"><thead><tr><th>Place</th><th>Team</th><th>Brings back</th></tr></thead><tbody>
    <tr><td>Tournament</td><td>1</td><td>1 UR piece · 2★ chance ${CAMP_STAR2[5] * 100}% with a UR fighter, ${CAMP_STAR2[4] * 100}% with an SSR one</td></tr>
    <tr><td>Tavern</td><td>2</td><td>1–3 SSR pieces per character</td></tr>
    <tr><td>Central</td><td>3</td><td>1–3 R pieces per character</td></tr></tbody></table>` });

/* the Camp view of the Base screen */
function campBg() { const bg = MEDIA.get('camp:bg'); return bg ? `<img class="fm-bg" src="${bg}" alt="">` : '<div class="fm-bg ex-black"></div>'; }
function campStatus(p) {
  const c = campOf(p.id);
  if (!c) return { cls: '', html: `<span>Send ${p.slots} character${p.slots > 1 ? 's' : ''}</span>` };
  if (campDone(p.id)) return { cls: 'done', html: '<span>The team is back!</span>' };
  return { cls: 'busy', html: `<span class="fm-time" id="cpt-${p.id}">Back in ${fmtClock(c.ends - Date.now())}</span>` };
}
function renderCamp() {
  const away = CAMP_PLACES.filter(p => campOf(p.id)).length;
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${campBg()}
      ${CAMP_PLACES.map(p => { const q = farmPos('c:' + p.id), st = campStatus(p), c = campOf(p.id);
        return `<button class="fm-spot ex-spot camp-spot ${st.cls} ${fmSel === p.id ? 'on' : ''}" data-cp="${p.id}" style="left:${q.x}%;top:${q.y}%;--fc:${p.col}">
          ${campDone(p.id) ? `<span class="fm-bubble">${icon('hanger')}</span>` : ''}
          <span class="fm-label">${c ? `<span class="camp-avs">${c.chars.map(id => { const e = findEntry(id); return e ? `<span class="ex-av sm r${e.rarity}">${thumbImg(e)}</span>` : ''; }).join('')}</span>` : ''}<span class="ex-lt"><b>${esc(p.name)}</b>${st.html}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">Camp</h2>${infoBtn('camp', 'How the camp works')}<span class="fm-rate ts">${away} / ${CAMP_PLACES.length} busy · 24 h each</span></div>
    <div class="fm-cur"><div class="cur" title="Wardrobe">${icon('hanger')}<b>${fmt(wardCount())} / ${INV_CAP}</b></div>${['coins', 'pearls'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    <button class="fm-switch right" id="fmSwitch" aria-label="Back to the Base"><b>Base</b>${icon('back')}</button>
    <div class="fm-acts"><button class="btn ghost fm-auto" id="cpAuto" title="Fill every empty place: the best fighter goes to the Tournament, the rest to the Tavern and Central">${icon('send')}Auto send best</button><button class="btn gold fm-all" id="cpAll">${icon('gift')}Collect all</button></div>
    ${fmSel && campPlace(fmSel) ? `<aside class="fm-panel glass-deep" id="fmPanel">${campPanel(campPlace(fmSel))}</aside>` : ''}`;
  $('#fmBack').onclick = closeFarm;
  $('#fmSwitch').onclick = () => { fmView = 'base'; fmSel = null; renderFarm(); };
  $('#cpAll').onclick = () => collectCamp(CAMP_PLACES.map(p => p.id));
  $('#cpAuto').onclick = autoSendCamp;
  fmEl.querySelectorAll('[data-cp]').forEach(b => b.onclick = e => { e.stopPropagation(); fmSel = fmSel === b.dataset.cp ? null : b.dataset.cp; campPick = []; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; renderFarm(); };
  const p = campPlace(fmSel);
  pn.querySelectorAll('[data-cpick]').forEach(b => b.onclick = () => { const id = b.dataset.cpick, i = campPick.indexOf(id);
    if (i >= 0) campPick.splice(i, 1); else if (campPick.length < p.slots) campPick.push(id); else if (p.slots === 1) campPick = [id]; else toast(`${p.name} takes ${p.slots} characters.`);
    renderFarm(); });
  const go = $('#cpGo'); if (go) go.onclick = () => sendCamp(fmSel);
  const col = $('#cpCol'); if (col) col.onclick = () => collectCamp([fmSel]);
}
function campPanel(p) {
  const c = campOf(p.id);
  let body;
  if (!c) {
    const list = expChars();
    const slots = Array.from({ length: p.slots }, (_, i) => { const e = campPick[i] && findEntry(campPick[i]); return `<span class="camp-slot ${e ? 'r' + e.rarity : ''}">${e ? `<span class="ex-av r${e.rarity}">${thumbImg(e)}</span>` : icon('plus')}</span>`; }).join('');
    body = list.length ? `<div class="camp-slots">${slots}</div><span class="lbl-sm">Choose ${p.slots} character${p.slots > 1 ? 's' : ''} · ${campPick.length} / ${p.slots}</span>
      <div class="ex-pick">${list.map(x => { const busy = busyWhere(x.id), on = campPick.includes(x.id);
        return `<button class="ex-pc r${x.rarity} ${on ? 'on' : ''}" data-cpick="${esc(x.id)}" ${busy ? 'disabled' : ''} title="${esc(x.name)}${busy ? ` · away at the ${esc(busy)}` : ''}"><span class="ex-av r${x.rarity}">${thumbImg(x)}</span><small>${esc(x.name)}</small>${busy ? '<em>Away</em>' : ''}</button>`; }).join('')}</div>
      ${p.id === 'tournament' ? `<p class="tiny">A UR fighter has a ${CAMP_STAR2[5] * 100}% chance at a 2★ piece, an SSR fighter ${CAMP_STAR2[4] * 100}%.</p>` : ''}
      <button class="btn mint" id="cpGo" ${campPick.length === p.slots ? '' : 'disabled'}>${icon('map')}Send · 24 hours</button>`
      : '<p class="tiny">You don\'t own any characters yet. Summon one first.</p>';
  } else if (campDone(p.id)) {
    body = `<div class="ex-who"><span class="camp-avs big">${c.chars.map(id => { const e = findEntry(id); return e ? `<span class="ex-av big r${e.rarity}">${thumbImg(e)}</span>` : ''; }).join('')}</span><b>The team is back!</b><span class="tiny">They brought ${c.drops.length} piece${c.drops.length === 1 ? '' : 's'} of clothing.</span></div>
      <button class="btn gold" id="cpCol">${icon('hanger')}Collect</button>`;
  } else {
    body = `<div class="ex-who"><span class="camp-avs big">${c.chars.map(id => { const e = findEntry(id); return e ? `<span class="ex-av big r${e.rarity}">${thumbImg(e)}</span>` : ''; }).join('')}</span><b>${c.chars.map(id => esc((findEntry(id) || {}).name || '')).join(', ')}</b><span class="tiny">${p.id === 'tournament' ? 'is fighting in the Colosseum.' : `${c.chars.length > 1 ? 'are' : 'is'} at the ${esc(p.name)}.`}</span></div>
      <div class="farm-up busy"><span class="lbl-sm">On the way back</span><span class="bar"><i id="cpb-${p.id}" style="width:${(Date.now() - c.start) / (c.ends - c.start) * 100}%"></i></span><span class="tiny" id="cpl-${p.id}">${fmtDur2(c.ends - Date.now())} left</span></div>`;
  }
  return `<div class="fm-ph" style="--fc:${p.col}"><div><b>${esc(p.name)}</b><span class="farm-lv">${esc(p.sub)} · ${p.slots} character${p.slots > 1 ? 's' : ''} · 24 hours</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <p class="tiny">${esc(p.desc)}</p><div style="--fc:${p.col}" class="stack">${body}</div>`;
}
function updateCampLive() {
  const back = CAMP_PLACES.filter(p => campDone(p.id)).map(p => p.id).join();
  if (back !== campBackSeen) { campBackSeen = back; renderFarm(); renderMenu(); return; }
  for (const p of CAMP_PLACES) { const c = campOf(p.id); if (!c || campDone(p.id)) continue;
    const t = $('#cpt-' + p.id), l = $('#cpl-' + p.id), b = $('#cpb-' + p.id);
    if (t) t.textContent = `Back in ${fmtClock(c.ends - Date.now())}`; if (l) l.textContent = `${fmtDur2(c.ends - Date.now())} left`;
    if (b) b.style.width = `${(Date.now() - c.start) / (c.ends - c.start) * 100}%`; }
}
