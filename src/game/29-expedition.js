/* ---------- Expedition: the Base's second tab (arrow on the Base screen) ----------
   Send an owned character to one of 5 places for 12 hours; it comes back with gold (1k–20k), pearls (0–30, 30 is
   very rare), a flat 100 EXP and sometimes a summon ticket. UR characters roll better. Same screen pattern as the Base:
   a 16:9 stage (wallpaper exp:bg from Settings → Admin, black by default), a label per place, a side panel.
   State S.expd[areaId] = {char, start, ends} (player save). A character can be on one expedition at a time. */
const EXP_MS = 12 * 36e5;
const EXP_AREAS = [
  { id: 'coast', name: 'Moonlit Coast', desc: 'Pearl divers say the tide leaves treasures on the sand at night.', x: 20, y: 34, col: '#7fd3ff' },
  { id: 'canyon', name: 'Ember Canyon', desc: 'Hot winds and old mine carts full of forgotten gold.', x: 50, y: 24, col: '#ff9a5a' },
  { id: 'caverns', name: 'Crystal Caverns', desc: 'Glittering tunnels where the walls hum softly.', x: 80, y: 36, col: '#c58bff' },
  { id: 'woods', name: 'Whispering Woods', desc: 'Lanterns hang from the trees, but nobody remembers lighting them.', x: 32, y: 70, col: '#7fe39a' },
  { id: 'shrine', name: 'Sky Shrine', desc: 'A shrine above the clouds where wishes are said to come true.', x: 68, y: 70, col: '#ffd36b' }
];
const expArea = id => EXP_AREAS.find(a => a.id === id);
const expPosDef = id => { const a = expArea(String(id).replace(/^x:/, '')); return a ? { x: a.x, y: a.y } : { x: 50, y: 50 }; };
/* rewards: gold 1,000–20,000 (UR: best of two rolls), pearls by tier (UR: higher tiers weigh more), EXP 100, tickets */
const EXP_GOLD = [1000, 20000], EXP_XP = 100;
const EXP_PEARLS = [[0, 0, 30], [1, 5, 40], [6, 10, 18], [11, 20, 9], [21, 29, 2.5], [30, 30, 0.5]];   // [min, max, weight]
const EXP_UR_MULT = [0.6, 1, 1.5, 2, 2.5, 3];
const EXP_TICKETS = { wishes: [6, 12], tickets: [3, 6] };   // % chance for SSR / UR characters
const expPearlW = ur => EXP_PEARLS.map((t, i) => t[2] * (ur ? EXP_UR_MULT[i] : 1));
function rollExpedition(ur) {
  const r = ur ? Math.max(Math.random(), Math.random()) : Math.random();
  const gold = Math.round((EXP_GOLD[0] + Math.pow(r, 1.6) * (EXP_GOLD[1] - EXP_GOLD[0])) / 100) * 100;
  const w = expPearlW(ur), tot = w.reduce((a, b) => a + b, 0); let x = Math.random() * tot, tier = 0;
  for (; tier < w.length - 1; tier++) { if (x < w[tier]) break; x -= w[tier]; }
  const [lo, hi] = EXP_PEARLS[tier], pearls = lo + Math.floor(Math.random() * (hi - lo + 1));
  const out = [['coins', gold]]; if (pearls) out.push(['pearls', pearls]); out.push(['exp', EXP_XP]);
  for (const [k, ch] of Object.entries(EXP_TICKETS)) if (Math.random() * 100 < ch[ur ? 1 : 0]) out.push([k, 1]);
  return out;
}
const expOf = id => (S.expd || {})[id] || null;
const expDone = id => { const e = expOf(id); return !!e && e.ends <= Date.now(); };
const expAway = charId => EXP_AREAS.find(a => (expOf(a.id) || {}).char === charId);
const expReady = () => EXP_AREAS.some(a => expDone(a.id));
const expChars = () => charList().filter(e => owns(e.id));
let fmView = 'base', exPick = null;

function sendExpedition(areaId, charId) {
  const c = findEntry(charId); if (!c || !owns(charId) || expOf(areaId)) return;
  if (busyWhere(charId)) { toast(`${c.name} is busy at the ${busyWhere(charId)}.`); return; }
  S.expd = { ...(S.expd || {}), [areaId]: { char: charId, start: Date.now(), ends: Date.now() + EXP_MS } };
  exPick = null; persist(); renderFarm();
  toast(`${c.name} set off for the ${expArea(areaId).name}. Back in 12 hours.`);
}
/* Auto send best: every free place gets the best free character (UR first, then the highest CS), all at once */
const expBestFree = () => expChars().filter(e => !busyWhere(e.id)).sort((a, b) => b.rarity - a.rarity || charScore(b) - charScore(a) || a.name.localeCompare(b.name));
function autoSendExpeditions() {
  const free = EXP_AREAS.filter(a => !expOf(a.id)), list = expBestFree(), sent = [];
  if (!free.length) { toast('Every place already has someone exploring it.'); return; }
  if (!list.length) { toast(expChars().length ? 'Every character is already away.' : "You don't own any characters yet."); return; }
  const now = Date.now(), d = { ...(S.expd || {}) };
  free.forEach((a, i) => { const c = list[i]; if (!c) return; d[a.id] = { char: c.id, start: now, ends: now + EXP_MS }; sent.push(c.name); });
  S.expd = d; exPick = null; fmSel = null; persist(); renderFarm();
  toast(`Sent ${sent.length}: ${sent.join(', ')}. Back in 12 hours.`);
}
const EXP_NAMES = { coins: 'gold', pearls: 'pearls', exp: 'EXP', tickets: 'Limited ticket', wishes: 'Standard ticket' };
function collectExpeditions(ids) {
  const res = [];
  ids.filter(expDone).forEach(id => { const e = expOf(id), c = findEntry(e.char), ur = c && +c.rarity === 5, got = rollExpedition(ur);
    got.forEach(([k, n]) => { if (k !== 'exp') S.wallet[k] = (S.wallet[k] || 0) + n; });
    const xp = got.find(([k]) => k === 'exp'); if (xp) gainExp(xp[1]);
    res.push({ area: expArea(id), c, ur, got }); statAdd('expd');
    const d = { ...S.expd }; delete d[id]; S.expd = d; });
  if (!res.length) { toast('Nobody is back yet.'); return; }
  persist(); renderMenu(); refreshSummon(); renderFarm();
  openModal({ title: 'Expedition rewards', ic: 'map', kind: 'expres', body: `<div class="stack">${res.map(r => `<div class="ex-res" style="--fc:${r.area.col}">
      <div class="ex-res-h">${r.c ? `<span class="ex-av r${r.c.rarity}">${thumbImg(r.c)}</span>` : ''}<div><b>${esc(r.c ? r.c.name : 'Someone')}</b><small>${esc(r.area.name)}</small></div>${r.ur ? '<span class="chip ex-ur">UR bonus</span>' : ''}</div>
      <div class="ex-got">${r.got.map(([k, n]) => `<span class="ex-item">${curIcon(k)}<b>${fmt(n)}</b><small>${EXP_NAMES[k]}${(k === 'tickets' || k === 'wishes') && n > 1 ? 's' : ''}</small></span>`).join('')}</div></div>`).join('')}
    <button class="btn gold" data-close>Nice!</button></div>`, onMount: b => { b.querySelector('[data-close]').onclick = closeModal; } });
}
INFO.expedition = () => { const pc = ur => { const w = expPearlW(ur), t = w.reduce((a, b) => a + b, 0); return w.map(x => `${Math.round(x / t * 1000) / 10}%`); };
  const s = pc(false), u = pc(true);
  return { title: 'Expedition', body: `<p class="desc">Send a character to a place for 12 hours. When they come back they bring gold, maybe some pearls, ${EXP_XP} EXP and sometimes a summon ticket. <b>UR characters</b> find more gold and roll better pearls and tickets. Each character can go on one expedition at a time.</p>
    <table class="cs-table"><thead><tr><th>Reward</th><th>SSR character</th><th>UR character</th></tr></thead><tbody>
      <tr><td>Gold</td><td colspan="2">${fmt(EXP_GOLD[0])} – ${fmt(EXP_GOLD[1])} (UR rolls twice and keeps the better one)</td></tr>
      <tr><td>EXP</td><td colspan="2">${EXP_XP}</td></tr>
      ${EXP_PEARLS.map(([lo, hi], i) => `<tr><td>${lo === hi ? (lo ? `${lo} pearls` : 'No pearls') : `${lo}–${hi} pearls`}</td><td>${s[i]}</td><td>${u[i]}</td></tr>`).join('')}
      <tr><td>Standard ticket</td><td>${EXP_TICKETS.wishes[0]}%</td><td>${EXP_TICKETS.wishes[1]}%</td></tr>
      <tr><td>Limited ticket</td><td>${EXP_TICKETS.tickets[0]}%</td><td>${EXP_TICKETS.tickets[1]}%</td></tr>
    </tbody></table>` }; };

/* the Expedition view of the Base screen */
function expBg() { const bg = MEDIA.get('exp:bg'); return bg ? artImgClip('exp:bg', 'fm-bg') : '<div class="fm-bg ex-black"></div>'; }
function expStatus(a) {
  const e = expOf(a.id), c = e && findEntry(e.char);
  if (!e) return { cls: '', html: '<span>Send a character</span>' };
  if (expDone(a.id)) return { cls: 'done', html: `<span>${c ? esc(c.name) : 'Someone'} is back!</span>` };
  return { cls: 'busy', html: `<span class="fm-time" id="ext-${a.id}">Back in ${fmtClock(e.ends - Date.now())}</span>` };
}
function renderExpedition() {
  const away = EXP_AREAS.filter(a => expOf(a.id)).length;
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${expBg()}
      ${EXP_AREAS.map(a => { const p = farmPos('x:' + a.id), st = expStatus(a), e = expOf(a.id), c = e && findEntry(e.char);
        return `<button class="fm-spot ex-spot ${st.cls} ${fmSel === a.id ? 'on' : ''}" data-ex="${a.id}" style="left:${p.x}%;top:${p.y}%;--fc:${a.col}">
          ${expDone(a.id) ? `<span class="fm-bubble">${icon('gift')}</span>` : ''}
          <span class="fm-label">${c ? `<span class="ex-av sm r${c.rarity}">${thumbImg(c)}</span>` : ''}<span class="ex-lt"><b>${esc(a.name)}</b>${st.html}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">Expedition</h2>${infoBtn('expedition', 'How expeditions work')}<span class="fm-rate ts">${away} / ${EXP_AREAS.length} away · 12 h each</span></div>
    <div class="fm-cur"><div class="cur" title="Stamina">${curIcon('stamina')}<b>${stamina()}</b></div>${['coins', 'pearls'].map(k => `<div class="cur" title="${k === 'coins' ? 'Gold coins' : 'Pearls'}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    <button class="fm-switch left" id="fmSwitch" aria-label="Back to the Base">${icon('back')}<b>Base</b></button>
    <div class="fm-acts"><button class="btn ghost fm-auto" id="exAuto" title="Send your best free characters (UR first, then the highest CS) to every empty place">${icon('send')}Auto send best</button><button class="btn gold fm-all" id="exAll">${icon('gift')}Collect all</button></div>
    ${fmSel && expArea(fmSel) ? `<aside class="fm-panel glass-deep" id="fmPanel">${expPanel(expArea(fmSel))}</aside>` : ''}`;
  $('#fmBack').onclick = closeFarm;
  $('#fmSwitch').onclick = () => { fmView = 'base'; fmSel = null; renderFarm(); };
  $('#exAll').onclick = () => collectExpeditions(EXP_AREAS.map(a => a.id));
  $('#exAuto').onclick = autoSendExpeditions;
  fmEl.querySelectorAll('[data-ex]').forEach(b => b.onclick = e => { e.stopPropagation(); fmSel = fmSel === b.dataset.ex ? null : b.dataset.ex; exPick = null; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; renderFarm(); };
  pn.querySelectorAll('[data-expick]').forEach(b => b.onclick = () => { exPick = exPick === b.dataset.expick ? null : b.dataset.expick; renderFarm(); });
  const go = $('#exGo'); if (go) go.onclick = () => sendExpedition(fmSel, exPick);
  const col = $('#exCol'); if (col) col.onclick = () => collectExpeditions([fmSel]);
}
function expPanel(a) {
  const e = expOf(a.id), c = e && findEntry(e.char);
  let body;
  if (!e) {
    const list = expChars();
    body = list.length ? `<span class="lbl-sm">Choose a character</span>
      <div class="ex-pick">${list.map(x => { const busy = busyWhere(x.id);
        return `<button class="ex-pc r${x.rarity} ${exPick === x.id ? 'on' : ''}" data-expick="${esc(x.id)}" ${busy ? 'disabled' : ''} title="${esc(x.name)}${busy ? ` · away at the ${esc(busy)}` : ''}"><span class="ex-av r${x.rarity}">${thumbImg(x)}</span><small>${esc(x.name)}</small>${busy ? '<em>Away</em>' : ''}</button>`; }).join('')}</div>
      <p class="tiny">UR characters bring back more gold and roll better pearls and tickets.</p>
      <button class="btn mint" id="exGo" ${exPick ? '' : 'disabled'}>${icon('map')}Send · 12 hours</button>`
      : '<p class="tiny">You don\'t own any characters yet. Summon one first.</p>';
  } else if (expDone(a.id)) {
    body = `<div class="ex-who"><span class="ex-av big r${c ? c.rarity : 4}">${c ? thumbImg(c) : ''}</span><b>${c ? esc(c.name) : 'Someone'} is back!</b><span class="tiny">They brought something from the ${esc(a.name)}.</span></div>
      <button class="btn gold" id="exCol">${icon('gift')}Collect</button>`;
  } else {
    body = `<div class="ex-who"><span class="ex-av big r${c ? c.rarity : 4}">${c ? thumbImg(c) : ''}</span><b>${c ? esc(c.name) : 'Someone'}</b><span class="tiny">is exploring the ${esc(a.name)}.</span></div>
      <div class="farm-up busy"><span class="lbl-sm">On the way back</span><span class="bar"><i id="exb-${a.id}" style="width:${(Date.now() - e.start) / (e.ends - e.start) * 100}%"></i></span><span class="tiny" id="exp-${a.id}">${fmtDur2(e.ends - Date.now())} left</span></div>`;
  }
  return `<div class="fm-ph" style="--fc:${a.col}"><div><b>${esc(a.name)}</b><span class="farm-lv">Expedition · 12 hours</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <p class="tiny">${esc(a.desc)}</p><div style="--fc:${a.col}" class="stack">${body}</div>`;
}
/* once a second: timers; rebuild when someone comes back */
let expBackSeen = '';
function updateExpLive() {
  const back = EXP_AREAS.filter(a => expDone(a.id)).map(a => a.id).join();
  if (back !== expBackSeen) { expBackSeen = back; renderFarm(); renderMenu(); return; }
  for (const a of EXP_AREAS) { const e = expOf(a.id); if (!e || expDone(a.id)) continue;
    const t = $('#ext-' + a.id), p = $('#exp-' + a.id), b = $('#exb-' + a.id);
    if (t) t.textContent = `Back in ${fmtClock(e.ends - Date.now())}`; if (p) p.textContent = `${fmtDur2(e.ends - Date.now())} left`;
    if (b) b.style.width = `${(Date.now() - e.start) / (e.ends - e.start) * 100}%`; }
}
