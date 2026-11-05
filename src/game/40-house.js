/* ---------- House: its own home tab (bottom bar "House" → openFarm('house')), built like the Base ----------
   Five houses to buy (HOME_HOUSES): the first two with gold, the last three with pearls. A house has 1–5 rooms (slots); a
   character living in a room earns 1,000 bond EXP a day (HOUSE_BOND), stored up to one day's worth per character
   (HOUSE_CAP_H) and collected like Base resources. A character lives in one house at a time (it can still go on Camp
   or Expedition jobs). No drawn houses: the admin uploads a wallpaper (media key house:bg, black without one) and a
   picture per house (house:<id>), places them on the 16:9 stage (S.farmLayout['h:<id>'] = {x, y}) and sets each
   picture's width (S.farmLayout['hs:<id>'] = {w}, % of the stage) in admin → Base → House.
   State S.house {own: [house ids], rooms: {houseId: [{c, t, acc} | null, …]}} (player save). */
const HOUSE_BOND = 1000, HOUSE_CAP_H = 24, HOUSE_RATE = HOUSE_BOND / 864e5;
const HOME_HOUSES = [
  { id: 'h1', name: 'Cottage', slots: 1, cost: { coins: 50000 }, x: 18, y: 70, col: '#7fd6a0' },
  { id: 'h2', name: 'Lantern House', slots: 2, cost: { coins: 150000 }, x: 38, y: 50, col: '#ffb35a' },
  { id: 'h3', name: 'Garden Villa', slots: 3, cost: { pearls: 100 }, x: 58, y: 70, col: '#59b6ff' },
  { id: 'h4', name: 'Moon Manor', slots: 4, cost: { pearls: 200 }, x: 76, y: 46, col: '#c58bff' },
  { id: 'h5', name: 'Pearl Palace', slots: 5, cost: { pearls: 300 }, x: 50, y: 26, col: '#ff7ccf' }
];
const houseOf = id => HOME_HOUSES.find(h => h.id === id);
const housePosDef = id => { const h = houseOf(String(id).replace(/^h:/, '')); return h ? { x: h.x, y: h.y } : { x: 50, y: 50 }; };
const houseW = id => ((S.farmLayout || {})['hs:' + id] || {}).w || 18;
function houseState() {
  if (!S.house || typeof S.house !== 'object') S.house = { own: [], rooms: {} };
  S.house.own = S.house.own || []; S.house.rooms = S.house.rooms || {};
  HOME_HOUSES.forEach(h => { const r = S.house.rooms[h.id] || (S.house.rooms[h.id] = []); while (r.length < h.slots) r.push(null); r.length = h.slots; r.forEach((x, i) => { if (x && !owns(x.c)) r[i] = null; }); });   // edited in place: callers keep the same arrays
  return S.house;
}
const houseOwned = id => houseState().own.includes(id);
const houseRooms = id => houseState().rooms[id];
const houseWhere = cid => HOME_HOUSES.find(h => houseRooms(h.id).some(r => r && r.c === cid));
const bondFull = cid => bondLv(cid) >= BOND_MAX;
/* advance every room's stored bond (up to one day's worth) */
function houseTick() {
  const now = Date.now(), cap = HOUSE_BOND * HOUSE_CAP_H / 24;
  HOME_HOUSES.forEach(h => houseRooms(h.id).forEach(r => { if (!r) return; r.acc = Math.min(cap, (r.acc || 0) + Math.max(0, now - (r.t || now)) * HOUSE_RATE); r.t = now; }));
}
const roomWhole = r => r && !bondFull(r.c) ? Math.floor(r.acc || 0) : 0;
const houseStored = id => houseRooms(id).reduce((t, r) => t + roomWhole(r), 0);
const houseReady = () => { houseTick(); return HOME_HOUSES.some(h => houseRooms(h.id).some(r => roomWhole(r) >= HOUSE_BOND / 2)); };
/* add bond to a character (capped at the max level); returns what was added */
function addBond(cid, n) {
  const b = { ...bondOf(cid) }, top = BOND_XP[BOND_MAX], add = Math.max(0, Math.min(n, top - b.xp));
  b.xp += add; S.bond[cid] = b; return add;
}
/* collect the whole bond EXP of the given houses' rooms; returns [{c, n, up}] */
function houseCollect(ids) {
  houseTick(); const out = [];
  ids.forEach(id => houseRooms(id).forEach(r => {
    if (!r) return; const w = roomWhole(r); if (bondFull(r.c)) { r.acc = 0; return; } if (!w) return;
    const before = bondLv(r.c), n = addBond(r.c, w); r.acc -= w; if (n) out.push({ c: r.c, n, up: bondLv(r.c) > before ? bondLv(r.c) : 0 });
  }));
  return out;
}
function houseCollectUI(ids) {
  const got = houseCollect(ids);
  if (!got.length) { toast('No bond EXP to collect yet.'); return; }
  persist(); renderMenu(); renderFarm(); refreshCharacters();
  const ups = got.filter(g => g.up);
  toast(`Collected ${got.map(g => `+${fmt(g.n)} bond for ${(findEntry(g.c) || {}).name}`).join(', ')}.${ups.length ? ` Bond level up: ${ups.map(g => `${(findEntry(g.c) || {}).name} Lv ${g.up}`).join(', ')}!` : ''}`);
}
function buyHouse(id) {
  const h = houseOf(id); if (!h || houseOwned(id)) return;
  const [k, n] = Object.entries(h.cost)[0], name = k === 'coins' ? 'gold' : 'pearls';
  if ((S.wallet[k] || 0) < n) { toast(`${h.name} costs ${fmt(n)} ${name}. You have ${fmt(S.wallet[k] || 0)}.`); return; }
  openModal({ title: `Buy the ${h.name}?`, ic: 'home', small: true, body: `<div class="stack" style="text-align:center;justify-items:center">
      <p class="desc">${h.slots} room${h.slots > 1 ? 's' : ''}: each character living here earns ${fmt(HOUSE_BOND)} bond EXP a day.</p>
      <span class="tiny">Price: ${curIcon(k)} ${fmt(n)} ${name} · you have ${fmt(S.wallet[k] || 0)}</span>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="hbNo">Cancel</button><button class="btn gold" id="hbYes">Buy</button></div></div>`,
    onMount: () => { $('#hbNo').onclick = closeModal; $('#hbYes').onclick = () => {
      if ((S.wallet[k] || 0) < n) return; S.wallet[k] -= n; houseState().own.push(id); closeModal(); persist(); renderMenu(); fmSel = id; renderFarm(); toast(`The ${h.name} is yours! Move characters in to raise their bond.`);
    }; } });
}
/* move a character into a room (or out with cid = null); stored bond is collected first */
function setRoom(hid, i, cid) {
  houseTick(); const rooms = houseRooms(hid), cur = rooms[i];
  if (cur) { const w = roomWhole(cur); if (w) addBond(cur.c, w); }
  if (cid) { const was = houseWhere(cid); if (was) { const j = houseRooms(was.id).findIndex(r => r && r.c === cid), r = houseRooms(was.id)[j], w = roomWhole(r); if (w) addBond(cid, w); houseRooms(was.id)[j] = null; } }
  rooms[i] = cid ? { c: cid, t: Date.now(), acc: 0 } : null;
  persist(); renderMenu(); refreshCharacters();
}
INFO.house = () => ({ title: 'House', body: `<p class="desc">Buy houses and move your characters in. Every character living in a house earns <b>${fmt(HOUSE_BOND)} bond EXP a day</b>, stored for up to ${HOUSE_CAP_H} hours: collect it before the storage is full. A character lives in one house at a time, and can still go on Camp or Expedition jobs. Moving a character out collects its bond first. Characters at bond level ${BOND_MAX} earn nothing more.</p>
  <table class="cs-table"><thead><tr><th>House</th><th>Rooms</th><th>Price</th><th>Bond a day</th></tr></thead><tbody>
  ${HOME_HOUSES.map(h => { const [k, n] = Object.entries(h.cost)[0]; return `<tr><td>${esc(h.name)}</td><td>${h.slots}</td><td>${fmt(n)} ${k === 'coins' ? 'gold' : 'pearls'}</td><td>up to ${fmt(h.slots * HOUSE_BOND)}</td></tr>`; }).join('')}</tbody></table>` });

/* the House view of the Base screen (opened from its own home tab) */
let housePick = -1, houseSeen = '';
function houseBg() { const bg = MEDIA.get('house:bg'); return bg ? `<img class="fm-bg" src="${bg}" alt="">` : '<div class="fm-bg ex-black"></div>'; }
function renderHouse() {
  houseTick();
  const st = houseState(), residents = HOME_HOUSES.reduce((t, h) => t + houseRooms(h.id).filter(Boolean).length, 0);
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${houseBg()}
      ${HOME_HOUSES.map(h => { const q = farmPos('h:' + h.id), own = houseOwned(h.id), img = MEDIA.get('house:' + h.id), stored = own ? houseStored(h.id) : 0, n = houseRooms(h.id).filter(Boolean).length, [ck, cn] = Object.entries(h.cost)[0];
        return `<button class="fm-spot hs-spot ${own ? '' : 'locked'} ${fmSel === h.id ? 'on' : ''}" data-hs="${h.id}" style="left:${q.x}%;top:${q.y}%;--fc:${h.col};--hw:${houseW(h.id)}">
          ${img ? `<img class="hs-img" src="${img}" alt="">` : ''}
          ${stored >= 1 ? `<span class="fm-bubble">${curIcon('bondheart')}</span>` : ''}
          <span class="fm-label"><b>${esc(h.name)}</b><span>${own ? `${n} / ${h.slots} living here${stored >= 1 ? ` · <b id="hss-${h.id}">${fmt(stored)}</b> ${curIcon('bondheart')}` : ''}` : `${curIcon(ck)} ${fmt(cn)}`}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">House</h2>${infoBtn('house', 'How houses work')}<span class="fm-rate ts">${residents} living here · ${fmt(residents * HOUSE_BOND)} ${curIcon('bondheart')} / day</span></div>
    <div class="fm-cur">${['coins', 'pearls'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    <button class="btn gold fm-all" id="hsAll">${curIcon('bondheart')}Collect all</button>
    ${fmSel && houseOf(fmSel) ? `<aside class="fm-panel glass-deep" id="fmPanel">${housePanel(houseOf(fmSel))}</aside>` : ''}`;
  houseSeen = HOME_HOUSES.map(h => houseStored(h.id) >= 1 ? 1 : 0).join('');
  $('#fmBack').onclick = closeFarm;
  $('#hsAll').onclick = () => houseCollectUI(st.own);
  fmEl.querySelectorAll('[data-hs]').forEach(b => b.onclick = e => { e.stopPropagation(); fmSel = fmSel === b.dataset.hs ? null : b.dataset.hs; housePick = -1; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; housePick = -1; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  const h = houseOf(fmSel);
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; housePick = -1; renderFarm(); };
  const buy = $('#hsBuy'); if (buy) buy.onclick = () => buyHouse(h.id);
  const col = $('#hsCol'); if (col) col.onclick = () => houseCollectUI([h.id]);
  pn.querySelectorAll('[data-room]').forEach(b => b.onclick = () => { const i = +b.dataset.room; housePick = housePick === i ? -1 : i; renderFarm(); });
  pn.querySelectorAll('[data-rout]').forEach(b => b.onclick = e => { e.stopPropagation(); setRoom(h.id, +b.dataset.rout, null); housePick = -1; renderFarm(); });
  pn.querySelectorAll('[data-hpick]').forEach(b => b.onclick = () => { if (housePick < 0) return; const cid = b.dataset.hpick, e = findEntry(cid); setRoom(h.id, housePick, cid); housePick = -1; renderFarm(); toast(`${e ? e.name : 'They'} moved into the ${h.name}.`); });
}
function housePanel(h) {
  const own = houseOwned(h.id), [ck, cn] = Object.entries(h.cost)[0];
  let body;
  if (!own) body = `<p class="tiny">${h.slots} room${h.slots > 1 ? 's' : ''}. Each character living here earns ${fmt(HOUSE_BOND)} bond EXP a day (up to ${fmt(h.slots * HOUSE_BOND)} a day for the whole house).</p>
      <button class="btn gold" id="hsBuy" ${(S.wallet[ck] || 0) < cn ? 'disabled' : ''}>Buy · ${curIcon(ck)} ${fmt(cn)}</button>
      ${(S.wallet[ck] || 0) < cn ? `<span class="tiny">You have ${fmt(S.wallet[ck] || 0)} ${ck === 'coins' ? 'gold' : 'pearls'}.</span>` : ''}`;
  else {
    const rooms = houseRooms(h.id), stored = houseStored(h.id);
    const room = (r, i) => { const e = r && findEntry(r.c), full = r && bondFull(r.c), w = roomWhole(r), pct = r ? Math.min(100, (r.acc || 0) / HOUSE_BOND * 100) : 0;
      return `<button class="hs-room ${e ? 'r' + e.rarity : 'empty'} ${housePick === i ? 'on' : ''}" data-room="${i}" aria-label="Room ${i + 1}">
        ${e ? `<span class="ex-av r${e.rarity}">${thumbImg(e)}</span><span class="hs-rinfo"><b>${esc(e.name)}</b><span class="tiny">${bondTag(e.id, 'sm')} ${full ? 'Max bond' : `${fmt(w)} / ${fmt(HOUSE_BOND)} stored`}</span><span class="bar"><i id="hsb-${h.id}-${i}" style="width:${full ? 100 : pct}%"></i></span></span><span class="hs-out" data-rout="${i}" role="button" title="Move out">${icon('close')}</span>`
          : `<span class="hs-plus">${icon('plus')}</span><span class="hs-rinfo"><b>Room ${i + 1}</b><span class="tiny">Empty · tap to move someone in</span></span>`}</button>`; };
    const list = expChars();
    const picker = housePick >= 0 ? `<span class="lbl-sm">Who moves into room ${housePick + 1}?</span>
      <div class="ex-pick">${list.map(x => { const at = houseWhere(x.id), here = at && at.id === h.id && houseRooms(h.id)[housePick] && houseRooms(h.id)[housePick].c === x.id;
        return `<button class="ex-pc r${x.rarity} ${here ? 'on' : ''}" data-hpick="${esc(x.id)}" ${here ? 'disabled' : ''} title="${esc(x.name)}${at ? ` · lives in the ${esc(at.name)}` : ''}${bondFull(x.id) ? ' · max bond' : ''}"><span class="ex-av r${x.rarity}">${thumbImg(x)}</span><small>${esc(x.name)}</small>${at ? `<em>${esc(at.name)}</em>` : bondFull(x.id) ? '<em>Max bond</em>' : ''}</button>`; }).join('') || '<p class="tiny">You don\'t own any characters yet.</p>'}</div>
      <span class="tiny">Picking someone who lives in another house moves them here.</span>` : '';
    body = `<div class="hs-rooms">${rooms.map(room).join('')}</div>${picker}
      <button class="btn gold" id="hsCol" ${stored >= 1 ? '' : 'disabled'}>${curIcon('bondheart')}Collect ${stored >= 1 ? fmt(stored) + ' bond' : ''}</button>`;
  }
  return `<div class="fm-ph" style="--fc:${h.col}"><div><b>${esc(h.name)}</b><span class="farm-lv">${h.slots} room${h.slots > 1 ? 's' : ''} · ${fmt(HOUSE_BOND)} bond / day each${own ? '' : ' · not owned'}</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <div style="--fc:${h.col}" class="stack">${body}</div>`;
}
function updateHouseLive() {
  houseTick();
  const seen = HOME_HOUSES.map(h => houseStored(h.id) >= 1 ? 1 : 0).join('');
  if (seen !== houseSeen) { renderFarm(); renderMenu(); return; }
  HOME_HOUSES.forEach(h => { const s = $('#hss-' + h.id); if (s) s.textContent = fmt(houseStored(h.id));
    houseRooms(h.id).forEach((r, i) => { const b = $(`#hsb-${h.id}-${i}`); if (b && r && !bondFull(r.c)) b.style.width = Math.min(100, (r.acc || 0) / HOUSE_BOND * 100) + '%'; }); });
  const c = $('#hsCol'); if (c && fmSel) { const n = houseStored(fmSel); c.disabled = n < 1; c.innerHTML = `${curIcon('bondheart')}Collect ${n >= 1 ? fmt(n) + ' bond' : ''}`; }
}
ICONS.home = ICONS.home || '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>';
