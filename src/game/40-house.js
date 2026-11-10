/* ---------- House: its own home tab (bottom bar "House" → openFarm('house')), built like the Base ----------
   Five houses to buy (HOME_HOUSES): the first two with gold, the last three with pearls. A house has 1–5 rooms (slots); a
   character living in a room earns 1,000 bond EXP a day (HOUSE_BOND), stored up to one day's worth per character
   (HOUSE_CAP_H) and collected like Base resources. A character lives in one house at a time (it can still go on Camp
   or Expedition jobs). No drawn houses: the admin uploads a wallpaper (media key house:bg, black without one) and a
   picture per house (house:<id>), places them on the 16:9 stage (S.farmLayout['h:<id>'] = {x, y}) and sets each
   picture's width (S.farmLayout['hs:<id>'] = {w}, % of the stage) in admin → Base → House. Tapping an owned house goes
   inside it: a screen of its own (inside wallpaper house:in:<id>) with each room as a character card (positions
   S.farmLayout['hr:<id>:<room>'], also set in admin).
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
const housePosDef = id => { const k = String(id); if (k.startsWith('hr:')) { const [, hid, i] = k.split(':'); return houseRoomPosDef(hid, +i); } const h = houseOf(k.replace(/^h:/, '')); return h ? { x: h.x, y: h.y } : { x: 50, y: 50 }; };
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
      if ((S.wallet[k] || 0) < n) return; S.wallet[k] -= n; houseState().own.push(id); closeModal(); persist(); renderMenu(); enterHouse(id); toast(`The ${h.name} is yours! Tap a room to move someone in.`);
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

/* the House view of the Base screen (opened from its own home tab): first the map of the five houses; tapping an owned house
   goes inside it (houseIn), a screen of its own with the house's inside wallpaper (house:in:<id>, black without one) and its
   rooms as character cards placed by the admin (S.farmLayout['hr:<id>:<room>']). Tapping a house you don't own opens the
   Buy panel; buying it takes you inside. */
let houseIn = null, roomSel = -1, housePick = -1, houseSeen = '';
const houseRoomPosDef = (hid, i) => { const h = houseOf(hid), n = h ? h.slots : 1; return { x: Math.round((50 + (i - (n - 1) / 2) * 15) * 2) / 2, y: 64 }; };
function houseBg() { const bg = MEDIA.get('house:bg'); return bg ? artImgClip('house:bg', 'fm-bg') : '<div class="fm-bg ex-black"></div>'; }
function houseInBg(id) { const bg = MEDIA.get('house:in:' + id); return bg ? artImgClip('house:in:' + id, 'fm-bg') : '<div class="fm-bg ex-black"></div>'; }
function enterHouse(id) { houseIn = id; roomSel = -1; housePick = -1; fmSel = null; renderFarm(); }
function renderHouse() {
  houseTick();
  if (houseIn && houseOf(houseIn) && houseOwned(houseIn)) return renderHouseIn(houseOf(houseIn));
  houseIn = null;
  const st = houseState(), residents = HOME_HOUSES.reduce((t, h) => t + houseRooms(h.id).filter(Boolean).length, 0);
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${houseBg()}
      ${HOME_HOUSES.map(h => { const q = farmPos('h:' + h.id), own = houseOwned(h.id), img = MEDIA.get('house:' + h.id), stored = own ? houseStored(h.id) : 0, n = houseRooms(h.id).filter(Boolean).length, [ck, cn] = Object.entries(h.cost)[0];
        return `<button class="fm-spot hs-spot ${own ? '' : 'locked'} ${fmSel === h.id ? 'on' : ''}" data-hs="${h.id}" style="left:${q.x}%;top:${q.y}%;--fc:${h.col};--hw:${houseW(h.id)}" aria-label="${esc(h.name)}${own ? ', go inside' : ''}">
          ${img ? `<img class="hs-img" src="${img}" alt="">` : ''}
          ${stored >= 1 ? `<span class="fm-bubble">${curIcon('bondheart')}</span>` : ''}
          <span class="fm-label"><b>${esc(h.name)}</b><span>${own ? `${n} / ${h.slots} living here${stored >= 1 ? ` · <b id="hss-${h.id}">${fmt(stored)}</b> ${curIcon('bondheart')}` : ''}` : `${curIcon(ck)} ${fmt(cn)}`}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">House</h2>${infoBtn('house', 'How houses work')}<span class="fm-rate ts">${residents} living here · ${fmt(residents * HOUSE_BOND)} ${curIcon('bondheart')} / day</span></div>
    <div class="fm-cur">${['coins', 'pearls'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    <button class="btn gold fm-all" id="hsAll">${curIcon('bondheart')}Collect all</button>
    ${fmSel && houseOf(fmSel) && !houseOwned(fmSel) ? `<aside class="fm-panel glass-deep" id="fmPanel">${houseBuyPanel(houseOf(fmSel))}</aside>` : ''}`;
  houseSeen = 'map:' + HOME_HOUSES.map(h => houseStored(h.id) >= 1 ? 1 : 0).join('');
  $('#fmBack').onclick = closeFarm;
  $('#hsAll').onclick = () => houseCollectUI(st.own);
  fmEl.querySelectorAll('[data-hs]').forEach(b => b.onclick = e => { e.stopPropagation(); const id = b.dataset.hs; if (houseOwned(id)) return enterHouse(id); fmSel = fmSel === id ? null : id; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; renderFarm(); };
  const buy = $('#hsBuy'); if (buy) buy.onclick = () => buyHouse(fmSel);
}
function houseBuyPanel(h) {
  const [ck, cn] = Object.entries(h.cost)[0], img = MEDIA.get('house:' + h.id);
  return `<div class="fm-ph" style="--fc:${h.col}"><div><b>${esc(h.name)}</b><span class="farm-lv">${h.slots} room${h.slots > 1 ? 's' : ''} · ${fmt(HOUSE_BOND)} bond / day each · not owned</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <div style="--fc:${h.col}" class="stack">${img ? `<img class="hs-pv" src="${img}" alt="">` : ''}
      <p class="tiny">${h.slots} room${h.slots > 1 ? 's' : ''}. Each character living here earns ${fmt(HOUSE_BOND)} bond EXP a day (up to ${fmt(h.slots * HOUSE_BOND)} a day for the whole house). Once it's yours, tap it to go inside.</p>
      <button class="btn gold" id="hsBuy" ${(S.wallet[ck] || 0) < cn ? 'disabled' : ''}>Buy · ${curIcon(ck)} ${fmt(cn)}</button>
      ${(S.wallet[ck] || 0) < cn ? `<span class="tiny">You have ${fmt(S.wallet[ck] || 0)} ${ck === 'coins' ? 'gold' : 'pearls'}.</span>` : ''}</div>`;
}
/* inside one house: its rooms as character cards on the house's own wallpaper */
function renderHouseIn(h) {
  const rooms = houseRooms(h.id), n = rooms.filter(Boolean).length, stored = houseStored(h.id), owned = HOME_HOUSES.filter(x => houseOwned(x.id)), oi = owned.findIndex(x => x.id === h.id);
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${houseInBg(h.id)}
      ${rooms.map((r, i) => { const q = farmPos(`hr:${h.id}:${i}`), e = r && findEntry(r.c), w = roomWhole(r), full = r && bondFull(r.c);
        return `<button class="fm-spot hr-spot ${e ? 'r' + e.rarity : 'empty'} ${roomSel === i ? 'on' : ''}" data-hr="${i}" style="left:${q.x}%;top:${q.y}%;--fc:${h.col}" aria-label="Room ${i + 1}${e ? `: ${esc(e.name)}` : ', empty'}">
          ${w >= 1 ? `<span class="fm-bubble">${curIcon('bondheart')}</span>` : ''}
          <span class="hr-card ${e ? 'r' + e.rarity : ''}">${e ? `<img src="${getArt(e)}" alt="" ${mediaArt(e) ? `style="${cardImgStyle(e)}"` : ''}>` : `<span class="hr-plus">${icon('plus')}</span>`}</span>
          <span class="fm-label"><b>${e ? esc(e.name) : `Room ${i + 1}`}</b><span>${e ? (full ? 'Max bond' : `<b id="hrs-${i}">${fmt(w)}</b> / ${fmt(HOUSE_BOND)} ${curIcon('bondheart')}`) : 'Empty · move someone in'}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="hsOut">${icon('back')}Houses</button><h2 class="ts">${esc(h.name)}</h2>${infoBtn('house', 'How houses work')}<span class="fm-rate ts">${n} / ${h.slots} living here · ${fmt(n * HOUSE_BOND)} ${curIcon('bondheart')} / day</span></div>
    <div class="fm-cur">${['coins', 'pearls'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    ${owned.length > 1 ? `<button class="fm-switch left" id="hsPrev" aria-label="Previous house">${icon('back')}<b>${esc(owned[(oi - 1 + owned.length) % owned.length].name)}</b></button><button class="fm-switch right" id="hsNext" aria-label="Next house"><b>${esc(owned[(oi + 1) % owned.length].name)}</b>${icon('back')}</button>` : ''}
    <button class="btn gold fm-all" id="hsCol" ${stored >= 1 ? '' : 'disabled'}>${curIcon('bondheart')}Collect ${stored >= 1 ? fmt(stored) + ' bond' : ''}</button>
    ${roomSel >= 0 && roomSel < rooms.length ? `<aside class="fm-panel glass-deep" id="fmPanel">${roomPanel(h, roomSel)}</aside>` : ''}`;
  houseSeen = h.id + ':' + rooms.map(r => roomWhole(r) >= 1 ? 1 : 0).join('');
  $('#hsOut').onclick = () => { houseIn = null; roomSel = -1; renderFarm(); };
  const pv = $('#hsPrev'), nx = $('#hsNext');
  if (pv) pv.onclick = () => enterHouse(owned[(oi - 1 + owned.length) % owned.length].id);
  if (nx) nx.onclick = () => enterHouse(owned[(oi + 1) % owned.length].id);
  $('#hsCol').onclick = () => houseCollectUI([h.id]);
  fmEl.querySelectorAll('[data-hr]').forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.hr; roomSel = roomSel === i ? -1 : i; housePick = rooms[i] ? -1 : i; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (roomSel >= 0) { roomSel = -1; housePick = -1; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { roomSel = -1; housePick = -1; renderFarm(); };
  const rc = $('#hrCol'); if (rc) rc.onclick = () => houseCollectUI([h.id]);
  const ro = $('#hrOut'); if (ro) ro.onclick = () => { const e = rooms[roomSel] && findEntry(rooms[roomSel].c); setRoom(h.id, roomSel, null); housePick = roomSel; renderFarm(); if (e) toast(`${e.name} moved out of the ${h.name}.`); };
  const rs = $('#hrSwap'); if (rs) rs.onclick = () => { housePick = housePick === roomSel ? -1 : roomSel; renderFarm(); };
  pn.querySelectorAll('[data-hpick]').forEach(b => b.onclick = () => { const cid = b.dataset.hpick, e = findEntry(cid); setRoom(h.id, roomSel, cid); housePick = -1; renderFarm(); toast(`${e ? e.name : 'They'} moved into the ${h.name}.`); });
}
function roomPanel(h, i) {
  const r = houseRooms(h.id)[i], e = r && findEntry(r.c), list = expChars();
  const picker = housePick === i ? `<span class="lbl-sm">Who moves into room ${i + 1}?</span>
      <div class="ex-pick">${list.map(x => { const at = houseWhere(x.id), here = e && e.id === x.id;
        return `<button class="ex-pc r${x.rarity} ${here ? 'on' : ''}" data-hpick="${esc(x.id)}" ${here ? 'disabled' : ''} title="${esc(x.name)}${at ? ` · lives in the ${esc(at.name)}` : ''}${bondFull(x.id) ? ' · max bond' : ''}"><span class="ex-av r${x.rarity}">${thumbImg(x)}</span><small>${esc(x.name)}</small>${at ? `<em>${esc(at.name)}</em>` : bondFull(x.id) ? '<em>Max bond</em>' : ''}</button>`; }).join('') || '<p class="tiny">You don\'t own any characters yet.</p>'}</div>
      <span class="tiny">Picking someone who lives in another house moves them here.</span>` : '';
  let body;
  if (e) {
    const full = bondFull(e.id), w = roomWhole(r), pct = Math.min(100, (r.acc || 0) / HOUSE_BOND * 100);
    body = `<div class="ex-who"><span class="ex-av big r${e.rarity}">${thumbImg(e)}</span><b>${esc(e.name)}</b><span class="tiny">${bondTag(e.id, 'sm')} Bond level ${bondLv(e.id)}${full ? ' · max' : ''}</span></div>
      <div class="farm-up"><span class="lbl-sm">${full ? 'Max bond reached: nothing more to earn' : `Stored bond · ${fmt(HOUSE_BOND)} a day, up to one day`}</span><span class="bar"><i id="hrb-${i}" style="width:${full ? 100 : pct}%"></i></span><span class="tiny" id="hrl-${i}">${full ? 'Move them out to make room for someone else' : `${fmt(w)} / ${fmt(HOUSE_BOND)} bond EXP`}</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn gold" id="hrCol" ${houseStored(h.id) >= 1 ? '' : 'disabled'}>${curIcon('bondheart')}Collect</button><button class="btn ghost" id="hrSwap">${icon('swap')}Swap resident</button><button class="btn ghost" id="hrOut">${icon('close')}Move out</button></div>${picker}`;
  } else body = `<p class="tiny">This room is empty. A character living here earns ${fmt(HOUSE_BOND)} bond EXP a day.</p>${picker}`;
  return `<div class="fm-ph" style="--fc:${h.col}"><div><b>Room ${i + 1}</b><span class="farm-lv">${esc(h.name)} · ${e ? 'occupied' : 'empty'}</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <div style="--fc:${h.col}" class="stack">${body}</div>`;
}
function updateHouseLive() {
  houseTick();
  const h = houseIn && houseOf(houseIn);
  const seen = h ? h.id + ':' + houseRooms(h.id).map(r => roomWhole(r) >= 1 ? 1 : 0).join('') : 'map:' + HOME_HOUSES.map(x => houseStored(x.id) >= 1 ? 1 : 0).join('');
  if (seen !== houseSeen) { renderFarm(); renderMenu(); return; }
  if (!h) { HOME_HOUSES.forEach(x => { const s = $('#hss-' + x.id); if (s) s.textContent = fmt(houseStored(x.id)); }); return; }
  houseRooms(h.id).forEach((r, i) => { if (!r || bondFull(r.c)) return; const w = roomWhole(r), s = $('#hrs-' + i), b = $('#hrb-' + i), l = $('#hrl-' + i);
    if (s) s.textContent = fmt(w); if (b) b.style.width = Math.min(100, (r.acc || 0) / HOUSE_BOND * 100) + '%'; if (l) l.textContent = `${fmt(w)} / ${fmt(HOUSE_BOND)} bond EXP`; });
  const c = $('#hsCol'); if (c) { const n = houseStored(h.id); c.disabled = n < 1; c.innerHTML = `${curIcon('bondheart')}Collect ${n >= 1 ? fmt(n) + ' bond' : ''}`; }
}
ICONS.home = ICONS.home || '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>';
ICONS.swap = ICONS.swap || '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>';
/* ---------- wallpaper bond: tap the home wallpaper 3 times in a row → +200 bond for the character shown, 3 times a day ----------
   The wallpaper's character: a character's own art, or the character a skin belongs to (memories and Pearl Tide give nothing).
   A popup under the currencies shows the character's icon, bond level and bar (wpBondPop). State S.wpBond {day, n}. */
const WPB_TAPS = 3, WPB_BOND = 200, WPB_DAILY = 3, WPB_GAP = 1200;
let wpbTaps = 0, wpbLast = 0, wpbHide = null;
function wpBondChar() { const w = wallpaperInfo(); if (!w || !w.e) return null; const e = w.e.type === 'skin' ? findEntry(w.e.parent) : w.e; return e && e.type === 'character' && owns(e.id) ? e : null; }
const wpbState = () => { if (!S.wpBond || S.wpBond.day !== dayKey()) S.wpBond = { day: dayKey(), n: 0 }; return S.wpBond; };
function bondBarParts(id) { const lv = bondLv(id), xp = bondOf(id).xp; if (lv >= BOND_MAX) return { lv, pct: 100, txt: 'Max bond' }; const a = BOND_XP[lv], b = BOND_XP[lv + 1]; return { lv, pct: (xp - a) / (b - a) * 100, txt: `${fmt(xp - a)} / ${fmt(b - a)}` }; }
function wpBondPop(e, before, msg, gained) {
  let el = $('#wpBondPop');
  if (!el) { el = document.createElement('div'); el.id = 'wpBondPop'; el.className = 'wpb'; menuEl.appendChild(el); }
  const after = bondBarParts(e.id), up = before && after.lv > before.lv;
  el.innerHTML = `<span class="wpb-ic r${e.rarity}">${thumbImg(e)}</span>
    <span class="wpb-mid"><span class="wpb-top"><b>${esc(e.name)}</b>${bondTag(e.id, 'sm')}${gained ? `<em class="wpb-gain">+${fmt(gained)}</em>` : ''}</span>
      <span class="wpb-bar"><i style="width:${(before && !up ? before : after).pct}%"></i></span>
      <small>${esc(msg)}</small></span>`;
  el.classList.remove('out'); el.classList.add('on');
  if (before && !up) requestAnimationFrame(() => requestAnimationFrame(() => { const i = el.querySelector('.wpb-bar i'); if (i) i.style.width = after.pct + '%'; }));
  clearTimeout(wpbHide); wpbHide = setTimeout(() => { el.classList.add('out'); el.classList.remove('on'); }, 3200);
}
function wpTapHeart(x, y) {
  const h = document.createElement('span'); h.className = 'wpb-heart'; h.style.left = x + 'px'; h.style.top = y + 'px'; h.innerHTML = curIcon('bondheart');
  menuEl.appendChild(h); setTimeout(() => h.remove(), 900);
}
menuEl.addEventListener('click', e => {
  if (uiHidden || !menuOpen || e.target.closest('button, a, input, select, textarea, label, .cur, #promo, nav, .hm, .wpb')) return;
  const c = wpBondChar(); if (!c || wpbState().n >= WPB_DAILY) return;   // done for today: taps do nothing (no hearts, no popup)
  const now2 = Date.now(); wpbTaps = now2 - wpbLast < WPB_GAP ? wpbTaps + 1 : 1; wpbLast = now2;
  wpTapHeart(e.clientX, e.clientY);
  if (wpbTaps < WPB_TAPS) return;
  wpbTaps = 0;
  const st = wpbState();
  if (bondLv(c.id) >= BOND_MAX) { wpBondPop(c, null, 'Already at max bond'); return; }
  const before = bondBarParts(c.id), lv0 = bondLv(c.id), n = addBond(c.id, WPB_BOND); st.n++;
  persist(); refreshCharacters();
  wpBondPop(c, before, bondLv(c.id) > lv0 ? `Bond level ${bondLv(c.id)}! · ${WPB_DAILY - st.n} left today` : `${WPB_DAILY - st.n} left today`, n);
});
