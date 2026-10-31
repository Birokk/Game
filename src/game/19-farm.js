/* =========================================================
   Farm: buildings that produce over time, each its own resource: Crops → stamina, Inn → EXP, Market → gold, Girls' Pub → pearls.
   It is its own full-screen town screen: a wallpaper (admin → Farm, or the drawn default town) with a label on each building;
   tapping a building opens its panel. Each building goes from level 0 (not built) to 7. An upgrade first needs its requirement
   (for now: pay 5 pearls), then costs gold and takes time (up to 48 h for level 7), which pearls can skip.
   At level 7 they make 60 stamina, 500 EXP, 20,000 gold and 10 pearls a day. Production keeps running and is stored up to one
   day's worth (at least one whole unit); only whole units are shown and collected.
   State: S.farm[id] = { lv, t (last settled), acc (stored amount), req (level whose requirement is paid), up: {to, start, ends} | null }
   ========================================================= */
const FARM_MAX = 7, FARM_CAP_H = 24, FARM_REQ_PEARLS = 5;
const FARM_PCT = [0, .1, .2, .3, .45, .6, .8, 1];   // share of a building's level-7 output at each level
const fmtDay = n => n >= 100 ? fmt(Math.round(n)) : String(Math.round(n * 10) / 10);   // per day, at most one decimal (collecting is whole units only)
/* what each building produces */
const FARM_RES = { pearls: { name: 'pearls', ic: 'pearls' }, coins: { name: 'gold', ic: 'coins' }, stamina: { name: 'stamina', ic: 'stamina' }, exp: { name: 'EXP', ic: 'exp' } };
const farmRes = id => FARM_RES[farmDef(id).res];
const farmIc = id => curIcon(farmRes(id).ic);
const FARM_GOLD = [0, 0, 25000, 80000, 200000, 450000, 900000, 1800000];   // gold to reach each level (level 1 = the building's build cost)
const FARM_TIME = [0, 5 * 60e3, 30 * 60e3, 2 * 36e5, 6 * 36e5, 12 * 36e5, 24 * 36e5, 48 * 36e5];   // time to reach each level: 5 min build … 48 h for level 7
const FARM_SKIP_MIN = 10;   // finishing an upgrade right away costs 1 pearl per 10 minutes left (at least 1)
const farmSkipCost = id => { const f = farmOf(id); return f.up ? Math.max(1, Math.ceil((f.up.ends - Date.now()) / (FARM_SKIP_MIN * 60e3))) : 0; };
const FARM_DEFS = [
  { id: 'crops', name: 'Crops', res: 'stamina', day: 60, build: 0, start: 1, desc: 'Fresh food from the fields keeps you going: makes stamina.' },
  { id: 'inn', name: 'Inn', res: 'exp', day: 500, build: 10000, start: 0, desc: 'Travelers share their stories over dinner: makes EXP.' },
  { id: 'market', name: 'Market', res: 'coins', day: 20000, build: 25000, start: 0, desc: 'Stalls that trade the town\'s goods: makes gold.' },
  { id: 'pub', name: "Girls' Pub", res: 'pearls', day: 10, build: 50000, start: 0, desc: 'Music, drinks and the liveliest crowd in town: makes pearls.' }
];
const farmDef = id => FARM_DEFS.find(d => d.id === id);
function farmOf(id) {
  if (!S.farm || typeof S.farm !== 'object') S.farm = {};
  if (!S.farm[id]) S.farm[id] = { lv: farmDef(id).start, t: Date.now(), acc: 0, req: 0, up: null };
  return S.farm[id];
}
/* amount per day: each building's level-7 output (`day`) × the level's share */
const farmDaily = (id, lv = farmOf(id).lv) => farmDef(id).day * FARM_PCT[lv];
const farmRate = (id, lv = farmOf(id).lv) => farmDaily(id, lv) / 24;   // per hour (fractions build up in the background)
const farmCap = (id, lv = farmOf(id).lv) => lv ? Math.max(1, farmDaily(id, lv) * FARM_CAP_H / 24) : 0;   // a day's worth, but always room for one whole unit
const farmCapShown = id => Math.floor(farmCap(id) + 1e-9);
const farmWhole = id => Math.floor(farmStored(id) + 1e-9);   // what the player sees and can collect
const farmCost = (id, to) => to === 1 ? farmDef(id).build : FARM_GOLD[to];
const farmStored = (id, at = Date.now()) => { const f = farmOf(id); return f.lv ? Math.min(farmCap(id), f.acc + farmRate(id) * Math.max(0, at - f.t) / 36e5) : 0; };
function farmSettle(id, at = Date.now()) { const f = farmOf(id); f.acc = farmStored(id, at); f.t = at; }
/* finish upgrades whose timer ran out: production up to that moment counts at the old level */
function farmTick() {
  let changed = false;
  for (const d of FARM_DEFS) {
    const f = farmOf(d.id);
    if (f.up && f.up.ends <= Date.now()) { farmSettle(d.id, f.up.ends); f.lv = f.up.to; f.up = null; changed = true; }
  }
  if (changed) persist();
  return changed;
}
/* the Base fountain (no upgrades): once a day "Try your luck"; 1 in 3 wishes gives a Limited ticket (the odds are never shown) */
const FARM_WISH = 1 / 3;
const fountainReady = () => (S.farmWish || {}).last !== dayKey();
function tryFountain() {
  if (!fountainReady()) return;
  const won = Math.random() < FARM_WISH;
  S.farmWish = { last: dayKey(), won }; questAdd('fountain');
  if (won) S.wallet.tickets += 1;
  persist(); renderMenu(); refreshSummon(); renderFarm();
  toast(won ? 'Your wish came true: 1 Limited ticket!' : 'Nothing this time. Come back tomorrow.');
}
function fountainPanel() {
  const ready = fountainReady(), w = S.farmWish || {};
  return `<div class="fm-ph" style="--fc:${FARM_COL.fountain}"><div><b>Fountain</b><span class="farm-lv">Once a day</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <div class="fm-wish ${ready ? 'ready' : w.won ? 'won' : 'lost'}"><span class="ftn-ic big">${icon('fountain')}</span>
      ${ready ? '<p class="tiny">Toss a coin into the fountain and make a wish.</p><button class="btn gold" id="fmWish">Try your luck</button>'
        : `<b>${w.won ? 'Your wish came true!' : 'Nothing this time'}</b>${w.won ? `<span class="fm-wish-got">${curIcon('tickets')}+1 Limited ticket</span>` : ''}<span class="tiny">Come back tomorrow to try again.</span>`}</div>`;
}
const farmReady = () => fountainReady() || FARM_DEFS.some(d => farmWhole(d.id) >= 1) || FARM_DEFS.some(d => { const f = farmOf(d.id); return f.up && f.up.ends <= Date.now(); });
function farmCollect(id) {
  farmSettle(id); const f = farmOf(id); let n = Math.floor(f.acc);
  if (n < 1) return 0;
  const res = farmDef(id).res;
  if (res === 'stamina') n = giveStamina(n);   // anything over the 999 cap stays in storage
  f.acc -= n; if (n > 0) questAdd('base');
  if (res === 'exp') gainExp(n);
  else if (res !== 'stamina') S.wallet[res] = (S.wallet[res] || 0) + n;
  return n;
}
function farmPayReq(id) {
  const f = farmOf(id), to = f.lv + 1;
  if (f.req >= to || f.up || f.lv >= FARM_MAX) return;
  if (S.wallet.pearls < FARM_REQ_PEARLS) { toast(`The requirement costs ${FARM_REQ_PEARLS} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= FARM_REQ_PEARLS; f.req = to; persist(); renderMenu(); renderFarm(); toast(`Requirement met for ${farmDef(id).name} level ${to}.`);
}
function farmUpgrade(id) {
  const f = farmOf(id), to = f.lv + 1, cost = farmCost(id, to);
  if (f.up || f.lv >= FARM_MAX || f.req < to) return;
  if (S.wallet.coins < cost) { toast(`This upgrade costs ${fmt(cost)} gold coins. You have ${fmt(S.wallet.coins)}.`); return; }
  S.wallet.coins -= cost; farmSettle(id);
  const now = Date.now(); f.up = { to, start: now, ends: now + FARM_TIME[to] };
  persist(); renderMenu(); renderFarm(); toast(f.lv ? `${farmDef(id).name} is upgrading to level ${to}.` : `Building the ${farmDef(id).name}…`);
}
function farmSkip(id) {
  const f = farmOf(id), cost = farmSkipCost(id); if (!f.up) return;
  if (S.wallet.pearls < cost) { toast(`Finishing now costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= cost; f.up.ends = Date.now(); farmTick(); persist(); renderMenu(); renderFarm();
  toast(`${farmDef(id).name} is now level ${f.lv}.`);
}
const fmtDur2 = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(x).padStart(2, '0')}s` : `${x}s`; };

/* ---------- the Farm screen: full screen town, a label per building, a side panel for the tapped building ---------- */
/* label positions in % of a 16:9 stage (the wallpaper covers the screen at 16:9, so labels stay on their buildings);
   the admin can move them (admin → Farm) to match their own wallpaper: S.farmLayout[id] = {x, y} */
const FARM_POS = { crops: { x: 25, y: 80 }, inn: { x: 52, y: 46 }, market: { x: 79, y: 74 }, pub: { x: 21, y: 47 }, fountain: { x: 50, y: 62 } };
const farmPos = id => ({ ...FARM_POS[id], ...((S.farmLayout || {})[id] || {}) });
let fmEl = null, fmSel = null, farmTimer = null;
function openFarm(sel) {
  farmTick(); closeModal();
  if (!fmEl) { fmEl = document.createElement('div'); fmEl.className = 'fm'; fmEl.setAttribute('role', 'dialog'); fmEl.setAttribute('aria-label', 'Base'); document.body.appendChild(fmEl); }
  fmSel = sel || null; renderFarm();
  clearInterval(farmTimer);
  farmTimer = setInterval(() => { if (!fmEl) return clearInterval(farmTimer); if (farmTick()) { renderFarm(); renderMenu(); } else updateFarmLive(); }, 1000);
}
function closeFarm() { if (fmEl) { fmEl.remove(); fmEl = null; } clearInterval(farmTimer); renderMenu(); }
function farmBg() { const bg = MEDIA.get('farm:bg'); return bg ? `<img class="fm-bg" src="${bg}" alt="">` : `<div class="fm-bg">${farmTownSVG()}</div>`; }
/* what a building's label says under its name */
function farmStatus(id) {
  const f = farmOf(id), st = farmWhole(id);
  if (f.up) return { cls: 'busy', html: `<span class="fm-time" id="fmt-${id}">Time left: ${fmtClock(f.up.ends - Date.now())}</span>` };
  if (!f.lv) return { cls: 'locked', html: '<span>Not built</span>' };
  return { cls: '', html: `<span>Lv ${f.lv}${st >= 1 ? ` · <b id="fms-${id}">${fmt(st)}</b> ${farmIc(id)}` : ''}</span>` };
}
const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
const farmCanUp = id => { const f = farmOf(id), to = f.lv + 1; return !f.up && f.lv < FARM_MAX && (f.req >= to ? S.wallet.coins >= farmCost(id, to) : S.wallet.pearls >= FARM_REQ_PEARLS && S.wallet.coins >= farmCost(id, to)); };
function renderFarm() {
  if (!fmEl) return;
  const totals = FARM_DEFS.filter(d => farmOf(d.id).lv).map(d => `${fmtDay(farmDaily(d.id))} ${farmIc(d.id)}`).join(' · ') || 'Nothing built yet';
  fmEl.innerHTML = `<div class="fm-stage">${farmBg()}
      ${FARM_DEFS.map(d => { const p = farmPos(d.id), stt = farmStatus(d.id), f = farmOf(d.id), st = farmWhole(d.id);
        return `<button class="fm-spot ${stt.cls} ${fmSel === d.id ? 'on' : ''}" data-fm="${d.id}" style="left:${p.x}%;top:${p.y}%;--fc:${FARM_COL[d.id]}">
          ${st >= 1 && !f.up ? `<span class="fm-bubble">${farmIc(d.id)}</span>` : farmCanUp(d.id) ? `<span class="fm-arrow">${icon('up')}</span>` : ''}
          <span class="fm-label"><b>${esc(d.name)}</b>${stt.html}</span></button>`; }).join('')}
      ${(() => { const p = farmPos('fountain'), ready = fountainReady();
        return `<button class="fm-spot fountain ${fmSel === 'fountain' ? 'on' : ''}" data-fm="fountain" style="left:${p.x}%;top:${p.y}%;--fc:${FARM_COL.fountain}">${ready ? `<span class="fm-bubble">${icon('sparkle')}</span>` : ''}<span class="fm-label"><b>Fountain</b><span>${ready ? 'Try your luck' : 'Come back tomorrow'}</span></span></button>`; })()}
    </div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">Base</h2><span class="fm-rate ts">${totals} / day</span></div>
    <div class="fm-cur"><div class="cur" title="Stamina">${curIcon('stamina')}<b>${stamina()}</b></div>${['coins', 'pearls'].map(k => `<div class="cur" title="${k === 'coins' ? 'Gold coins' : 'Pearls'}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}</div>
    <button class="btn gold fm-all" id="fmAll">${icon('gift')}Collect all</button>
    ${fmSel ? `<aside class="fm-panel glass-deep" id="fmPanel">${fmSel === 'fountain' ? fountainPanel() : farmPanel(farmDef(fmSel))}</aside>` : ''}`;
  $('#fmBack').onclick = closeFarm;
  $('#fmAll').onclick = () => { const got = FARM_DEFS.map(d => [d.id, farmCollect(d.id)]).filter(([, n]) => n); if (!got.length) { toast('Nothing to collect yet.'); return; } persist(); renderMenu(); renderFarm(); toast(`Collected ${got.map(([id, n]) => `${fmt(n)} ${farmRes(id).name}`).join(', ')}.`); };
  fmEl.querySelectorAll('[data-fm]').forEach(b => b.onclick = e => { e.stopPropagation(); fmSel = fmSel === b.dataset.fm ? null : b.dataset.fm; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; renderFarm(); };
  const fw = $('#fmWish'); if (fw) fw.onclick = tryFountain;
  pn.querySelectorAll('[data-fcol]').forEach(b => b.onclick = () => { const n = farmCollect(b.dataset.fcol); if (!n) return; persist(); renderMenu(); renderFarm(); toast(`+${fmt(n)} ${farmRes(b.dataset.fcol).name} from the ${farmDef(b.dataset.fcol).name}.`); });
  pn.querySelectorAll('[data-freq]').forEach(b => b.onclick = () => farmPayReq(b.dataset.freq));
  pn.querySelectorAll('[data-fup]').forEach(b => b.onclick = () => farmUpgrade(b.dataset.fup));
  pn.querySelectorAll('[data-fskip]').forEach(b => b.onclick = () => farmSkip(b.dataset.fskip));
}
function farmPanel(d) {
  const f = farmOf(d.id), lv = f.lv, to = lv + 1, stored = farmWhole(d.id), cap = farmCap(d.id), frac = farmStored(d.id);
  const pips = Array.from({ length: FARM_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
  let up;
  if (f.up) {
    const skip = farmSkipCost(d.id);
    up = `<div class="farm-up busy"><span class="lbl-sm">${lv ? `Upgrading to level ${f.up.to}` : 'Building'}</span><span class="bar"><i id="fupb-${d.id}" style="width:${(Date.now() - f.up.start) / (f.up.ends - f.up.start) * 100}%"></i></span>
      <span class="tiny" id="fupt-${d.id}">${fmtDur2(f.up.ends - Date.now())} left</span>
      <button class="btn gold" data-fskip="${d.id}">${icon('bolt')}Finish now · <span class="cost">${curIcon('pearls')}<span id="fsk-${d.id}">${skip}</span></span></button><span class="tiny">1 pearl per ${FARM_SKIP_MIN} minutes left.</span></div>`;
  } else if (lv >= FARM_MAX) up = `<div class="farm-up max"><b>Max level</b><span class="tiny">This building is fully upgraded.</span></div>`;
  else {
    const cost = farmCost(d.id, to), met = f.req >= to;
    up = `<div class="farm-up"><span class="lbl-sm">${lv ? `Next: level ${to}` : 'Build'} · ${fmtDay(farmDaily(d.id, to))} ${farmRes(d.id).name}/day</span>
      <div class="farm-req ${met ? 'met' : ''}">${met ? `${icon('check')}<span>Requirement met</span>` : `<span>Requirement: ${FARM_REQ_PEARLS} ${curIcon('pearls')}</span><button class="btn ghost sm" data-freq="${d.id}">Unlock</button>`}</div>
      <button class="btn ${met ? 'mint' : 'ghost'}" data-fup="${d.id}" ${met ? '' : 'disabled'}>${icon(lv ? 'up' : 'plus')}${lv ? 'Upgrade' : 'Build'} · ${cost ? `<span class="cost">${curIcon('coins')}${fmt(cost)}</span>` : 'free'} · ${fmtDur2(FARM_TIME[to])}</button></div>`;
  }
  return `<div class="fm-ph" style="--fc:${FARM_COL[d.id]}"><div><b>${esc(d.name)}</b><span class="farm-lv">${lv ? `Level ${lv} / ${FARM_MAX}` : 'Not built yet'}<span class="farm-pips">${pips}</span></span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <p class="tiny">${esc(d.desc)}</p>
    ${lv ? `<div class="farm-store" style="--fc:${FARM_COL[d.id]}"><div class="row" style="justify-content:space-between"><span class="tiny">${fmtDay(farmDaily(d.id))} ${farmRes(d.id).name}/day · holds ${fmt(farmCapShown(d.id))}</span><span class="tiny" id="fst-${d.id}">${fmt(stored)} / ${fmt(farmCapShown(d.id))}</span></div>
      <span class="bar"><i id="fsb-${d.id}" style="width:${cap ? frac / cap * 100 : 0}%"></i></span>
      <button class="btn gold sm" data-fcol="${d.id}" ${stored >= 1 ? '' : 'disabled'}>${farmIc(d.id)}Collect ${fmt(stored)}</button></div>` : ''}
    <div style="--fc:${FARM_COL[d.id]}">${up}</div>`;
}
/* once a second: timers, storage and skip prices, without rebuilding the screen */
function updateFarmLive() {
  for (const d of FARM_DEFS) {
    const f = farmOf(d.id), st = $('#fst-' + d.id), sb = $('#fsb-' + d.id), c = document.querySelector(`[data-fcol="${d.id}"]`), s = farmWhole(d.id);
    if (st) { const cap = farmCap(d.id); st.textContent = `${fmt(s)} / ${fmt(farmCapShown(d.id))}`; sb.style.width = `${farmStored(d.id) / cap * 100}%`; if (c) { c.disabled = s < 1; c.lastChild.textContent = `Collect ${fmt(s)}`; } }
    const ms = $('#fms-' + d.id); if (ms) ms.textContent = fmt(s);
    if (f.up) {
      const t = $('#fupt-' + d.id), b = $('#fupb-' + d.id), lt = $('#fmt-' + d.id), sk = $('#fsk-' + d.id);
      if (t) t.textContent = `${fmtDur2(f.up.ends - Date.now())} left`; if (b) b.style.width = `${(Date.now() - f.up.start) / (f.up.ends - f.up.start) * 100}%`;
      if (lt) lt.textContent = `Time left: ${fmtClock(f.up.ends - Date.now())}`; if (sk) sk.textContent = farmSkipCost(d.id);
    }
  }
}

/* ---------- default town wallpaper (until the admin uploads one): the four buildings drawn where their labels are ---------- */
function farmTownSVG() {
  const W = 1600, H = 900, s = 1.5;
  const trees = [[90, 560], [1520, 470], [700, 780], [1210, 840], [430, 420], [1380, 300], [180, 260], [980, 300], [620, 250], [1500, 700]];
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" class="fm-town">
    <defs><linearGradient id="ftsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a8fd8"/><stop offset=".6" stop-color="#f3b9a0"/><stop offset="1" stop-color="#ffd9a8"/></linearGradient>
      <radialGradient id="ftsun"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></radialGradient>
      <radialGradient id="ftplaza"><stop offset="0" stop-color="#e8d6b0"/><stop offset="1" stop-color="#cdb48a"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#ftsky)"/><circle cx="1240" cy="150" r="160" fill="url(#ftsun)"/>
    <path d="M0 300Q200 210 420 270T860 250T1300 230T1600 260V420H0Z" fill="#8fa7c9" opacity=".7"/>
    <path d="M0 360Q260 290 520 340T1040 320T1600 330V900H0Z" fill="#7cb46a"/>
    <path d="M0 470Q400 420 800 460T1600 440V900H0Z" fill="#6aa25a"/>
    <path d="M1100 900C1150 760 1300 690 1600 650V900Z" fill="#5a9ad8" opacity=".85"/><path d="M1150 900C1200 780 1330 720 1600 690" stroke="#bfe3ff" stroke-width="4" fill="none" opacity=".6"/>
    <ellipse cx="800" cy="610" rx="380" ry="140" fill="url(#ftplaza)" stroke="#a8906a" stroke-width="4"/>
    ${Object.keys(FARM_POS).map(id => { const p = farmPos(id); return `<path d="M800 610L${p.x * 16} ${p.y * 9}" stroke="#d8c49c" stroke-width="46" stroke-linecap="round"/>`; }).join('')}
    <ellipse cx="800" cy="610" rx="70" ry="28" fill="#9fc8e8" stroke="#7a90a8" stroke-width="5"/><rect x="792" y="560" width="16" height="50" fill="#c9d4e8"/><circle cx="800" cy="556" r="12" fill="#bfe3ff"/>
    ${trees.map(([x, y]) => `<rect x="${x - 5}" y="${y - 10}" width="10" height="26" fill="#6a4a2a"/><circle cx="${x}" cy="${y - 30}" r="30" fill="#4f8f45"/><circle cx="${x - 16}" cy="${y - 18}" r="20" fill="#5a9a50"/><circle cx="${x + 16}" cy="${y - 20}" r="22" fill="#468a3e"/>`).join('')}
    ${FARM_DEFS.map(d => { const p = farmPos(d.id), x = p.x * 16, y = p.y * 9 - 34; return `<g transform="translate(${x - 160 * s} ${y - 150 * s}) scale(${s})">${farmSVG(d.id, 6, true)}</g>`; }).join('')}
  </svg>`;
}

/* ---------- building art (SVG); the town draws each building once with farmSVG(id, 6, true) ---------- */
const FARM_COL = { crops: '#7fd36b', inn: '#ffb067', market: '#5ab8ff', pub: '#ff6ec7', fountain: '#9fe3ff' };
function farmSVG(id, lv, bare) {
  const W = 320, H = 190, gy = 150;
  const sky = `<defs><linearGradient id="fsky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1640"/><stop offset="1" stop-color="#3a2a66"/></linearGradient>
    <radialGradient id="fglow-${id}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#fsky-${id})"/>${[[30, 22], [90, 40], [150, 18], [230, 30], [290, 50], [60, 60], [200, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff" opacity=".7"/>`).join('')}
    <circle cx="272" cy="34" r="13" fill="#fff3d0" opacity=".9"/>
    <path d="M0 ${gy}Q160 ${gy - 14} ${W} ${gy}V${H}H0Z" fill="#2f5a3a"/><path d="M0 ${gy + 10}Q160 ${gy - 2} ${W} ${gy + 10}V${H}H0Z" fill="#26492f"/>`;
  if (!lv) return `<svg viewBox="0 0 ${W} ${H}" class="farm-svg">${sky}
    <ellipse cx="160" cy="${gy + 4}" rx="90" ry="14" fill="#4b3a2a" stroke="#c9b48a" stroke-dasharray="6 5" stroke-width="2"/>
    <rect x="152" y="${gy - 42}" width="4" height="44" fill="#8a6a44"/><rect x="128" y="${gy - 52}" width="52" height="20" rx="3" fill="#c9a26b" stroke="#5a4028"/>
    <text x="154" y="${gy - 38}" text-anchor="middle" font-size="10" font-family="Cinzel, serif" fill="#3a2614">FOR SALE</text></svg>`;
  const gold = lv >= 7, trim = gold ? '#ffd36b' : '#5a3a2a';
  const lantern = (x, y, c = '#ff5a4a') => `<line x1="${x}" y1="${y - 8}" x2="${x}" y2="${y - 3}" stroke="#3a2a2a"/><ellipse cx="${x}" cy="${y + 2}" rx="5" ry="6" fill="${c}"/><circle cx="${x}" cy="${y + 2}" r="9" fill="url(#fglow-${id})" opacity=".55"/>`;
  const win = (x, y, w = 9, h = 10, c = '#ffd98a') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="${c}" stroke="${trim}" stroke-width="1.2"/>`;
  const roof = (x, y, w, h, c) => `<polygon points="${x - 6},${y} ${x + w / 2},${y - h} ${x + w + 6},${y}" fill="${c}" stroke="${trim}" stroke-width="2" stroke-linejoin="round"/>`;
  const sparkles = gold ? [[60, 70], [250, 80], [140, 50], [200, 110], [100, 120]].map(([x, y], i) => `<path d="M${x} ${y - 6}L${x + 2} ${y - 2}L${x + 6} ${y}L${x + 2} ${y + 2}L${x} ${y + 6}L${x - 2} ${y + 2}L${x - 6} ${y}L${x - 2} ${y - 2}Z" fill="#fff1b0" class="fsp" style="animation-delay:${i * .4}s"/>`).join('') : '';
  let g = '';
  if (id === 'crops') {
    const rows = Math.min(lv + 2, 8), crop = gold ? '#ffd36b' : '#7fd36b';
    for (let r = 0; r < rows; r++) {
      const y = gy - 4 + r * 4.2, x0 = 34 + r * 4, x1 = 210 - r * 2;
      g += `<path d="M${x0} ${y}H${x1}" stroke="#5a3f24" stroke-width="3.4" stroke-linecap="round"/>`;
      for (let x = x0 + 4; x < x1; x += 11) g += `<circle cx="${x}" cy="${y - 2.2}" r="${1.8 + lv * .25}" fill="${crop}"/>`;
    }
    if (lv >= 2) g += `<path d="M20 ${gy + 6}H230" stroke="#c9a26b" stroke-width="2"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${22 + i * 18}" y="${gy - 4}" width="3" height="12" fill="#c9a26b"/>`).join('')}`;
    if (lv >= 3) { const bw = lv >= 6 ? 62 : 44, bx = 240; g += `<rect x="${bx}" y="${gy - 40}" width="${bw}" height="40" fill="#b8423a" stroke="${trim}" stroke-width="2"/>${roof(bx, gy - 40, bw, 22, '#7a2a2a')}<rect x="${bx + bw / 2 - 8}" y="${gy - 22}" width="16" height="22" fill="#5a2a1a"/><path d="M${bx + bw / 2 - 8} ${gy - 22}L${bx + bw / 2 + 8} ${gy}M${bx + bw / 2 + 8} ${gy - 22}L${bx + bw / 2 - 8} ${gy}" stroke="#ffd98a" stroke-width="1.5"/>`; }
    if (lv >= 4) g += `<rect x="118" y="${gy - 46}" width="3" height="38" fill="#8a6a44"/><rect x="104" y="${gy - 38}" width="31" height="3" fill="#8a6a44"/><circle cx="119.5" cy="${gy - 50}" r="6" fill="#e8c27a"/><polygon points="110,${gy - 54} 129,${gy - 54} 119.5,${gy - 64}" fill="#a0603a"/>`;
    if (lv >= 5) g += `<rect x="206" y="${gy - 70}" width="12" height="62" fill="#e8dcc0" stroke="${trim}" stroke-width="1.5"/><g class="fmill" style="transform-origin:212px ${gy - 70}px">${[0, 90, 180, 270].map(a => `<rect x="210" y="${gy - 104}" width="4" height="34" fill="#f4ecd8" stroke="${trim}" transform="rotate(${a} 212 ${gy - 70})"/>`).join('')}</g><circle cx="212" cy="${gy - 70}" r="3" fill="${trim}"/>`;
    if (lv >= 6) g += `<rect x="296" y="${gy - 56}" width="18" height="56" rx="8" fill="#c9d4e8" stroke="${trim}" stroke-width="1.5"/><ellipse cx="305" cy="${gy - 56}" rx="9" ry="5" fill="#8a9ab8"/>`;
  } else if (id === 'inn') {
    const floors = lv >= 5 ? 3 : lv >= 3 ? 2 : 1, w = 90 + lv * 10, x = 160 - w / 2, h = floors * 30 + 6, top = gy - h;
    if (lv >= 4) g += `<rect x="${x - 46}" y="${gy - 40}" width="50" height="40" fill="#d9a46a" stroke="${trim}" stroke-width="2"/>${roof(x - 46, gy - 40, 50, 18, '#6a3a4a')}${win(x - 36, gy - 30)}${win(x - 18, gy - 30)}`;
    if (lv >= 6) g += `<rect x="${x + w - 4}" y="${top - 26}" width="34" height="${h + 26}" fill="#e3b47a" stroke="${trim}" stroke-width="2"/>${roof(x + w - 4, top - 26, 34, 26, '#5a2a3a')}${win(x + w + 8, top - 14)}`;
    g += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#f0c48a" stroke="${trim}" stroke-width="2"/>${roof(x, top, w, 26 + floors * 4, gold ? '#b8862a' : '#7a3a4a')}`;
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < Math.floor(w / 22); i++) g += win(x + 9 + i * 22, top + 8 + fl * 30, 10, 12);
    g += `<rect x="${158 - 9}" y="${gy - 24}" width="18" height="24" rx="2" fill="#5a2a1a"/><rect x="${160 - 22}" y="${top - 4 - (lv >= 3 ? 0 : 0)}" width="44" height="13" rx="3" fill="#3a2028" stroke="${trim}"/><text x="160" y="${top + 6}" text-anchor="middle" font-size="9" font-family="Cinzel, serif" fill="${gold ? '#ffd36b' : '#ffe0b0'}">INN</text>`;
    if (lv >= 2) g += lantern(140, gy - 26) + lantern(180, gy - 26);
    if (lv >= 5) g += `<path d="M${x} ${top + 30}Q160 ${top + 40} ${x + w} ${top + 30}" stroke="#3a2a2a" fill="none"/>${[0.2, 0.4, 0.6, 0.8].map(k => lantern(x + w * k, top + 34 + Math.sin(k * 3.14) * 4, '#ffb347')).join('')}`;
  } else if (id === 'market') {
    const n = Math.min(lv + 1, 6), cols = ['#ff6f91', '#5ab8ff', '#ffd36b', '#7fd36b', '#c58bff', '#ff8a3d'];
    if (lv >= 5) g += `<rect x="128" y="${gy - 56}" width="64" height="56" fill="#f4e6c8" stroke="${trim}" stroke-width="2"/><polygon points="118,${gy - 56} 160,${gy - 86} 202,${gy - 56}" fill="${gold ? '#d9a63a' : '#a03a3a'}" stroke="${trim}" stroke-width="2"/><rect x="150" y="${gy - 28}" width="20" height="28" fill="#5a2a1a"/>${win(134, gy - 46)}${win(177, gy - 46)}`;
    // stalls fill the square; from level 5 the hall stands in the middle and the stalls line up on both sides of it
    const spots = lv >= 5 ? [4, 48, 92, 196, 240, 284].slice(0, n).sort((a, b) => Math.abs(a - 160) - Math.abs(b - 160)) : [16, 64, 112, 160, 208, 256];
    for (let i = 0; i < n; i++) {
      const sx = spots[i], c = cols[i];
      if (sx === undefined || sx > 290) break;
      g += `<rect x="${sx}" y="${gy - 22}" width="38" height="22" fill="#c9a26b" stroke="${trim}" stroke-width="1.5"/><rect x="${sx + 1}" y="${gy - 34}" width="2" height="14" fill="#8a6a44"/><rect x="${sx + 35}" y="${gy - 34}" width="2" height="14" fill="#8a6a44"/>
        <path d="M${sx - 4} ${gy - 34}H${sx + 42}L${sx + 38} ${gy - 26}H${sx}Z" fill="${c}" stroke="${trim}"/>${[0, 1, 2].map(k => `<circle cx="${sx + 9 + k * 10}" cy="${gy - 25}" r="3" fill="${cols[(i + k + 2) % 6]}"/>`).join('')}`;
    }
    if (lv >= 3) g += `<path d="M10 ${gy - 60}Q160 ${gy - 40} 310 ${gy - 60}" stroke="#3a2a2a" fill="none"/>${Array.from({ length: 13 }, (_, i) => { const x = 20 + i * 23, y = gy - 60 + Math.sin(i / 12 * 3.14) * 15; return `<polygon points="${x - 5},${y} ${x + 5},${y} ${x},${y + 10}" fill="${cols[i % 6]}"/>`; }).join('')}`;
    if (lv >= 4) g += lantern(14, gy - 40) + lantern(306, gy - 40);
    if (lv >= 6) g += `<rect x="156" y="${gy - 118}" width="8" height="34" fill="#8a6a44"/><path d="M164 ${gy - 116}h26l-6 7l6 7h-26z" fill="${gold ? '#ffd36b' : '#ff6f91'}"/>`;
  } else {
    const floors = lv >= 3 ? 2 : 1, w = 96 + lv * 8, x = 160 - w / 2, h = floors * 32 + 4, top = gy - h, pink = gold ? '#ffd36b' : '#ff6ec7';
    g += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#4a2a4a" stroke="${trim}" stroke-width="2"/><rect x="${x - 4}" y="${top - 10}" width="${w + 8}" height="10" fill="#2a1a2a" stroke="${trim}" stroke-width="1.5"/>`;
    for (let fl = 0; fl < floors; fl++) for (let i = 0; i < Math.floor(w / 24); i++) g += win(x + 10 + i * 24, top + 9 + fl * 32, 11, 13, '#ff9ed2');
    g += `<rect x="${156 - 10}" y="${gy - 26}" width="20" height="26" rx="10" fill="#2a102a" stroke="${pink}" stroke-width="1.5"/>
      <rect x="${160 - 38}" y="${top - 30}" width="76" height="18" rx="9" fill="#1a0a1a" stroke="${pink}" stroke-width="2" class="${lv >= 4 ? 'fneon' : ''}"/><text x="160" y="${top - 17}" text-anchor="middle" font-size="10" font-family="Cinzel, serif" fill="${pink}">GIRLS' PUB</text>`;
    if (lv >= 2) g += lantern(x + 10, gy - 30, '#ff6ec7') + lantern(x + w - 10, gy - 30, '#ff6ec7');
    if (lv >= 5) g += `<rect x="${x + 14}" y="${top + 30}" width="${w - 28}" height="4" fill="#2a1a2a"/>${Array.from({ length: Math.floor((w - 28) / 8) }, (_, i) => `<rect x="${x + 16 + i * 8}" y="${top + 22}" width="2" height="8" fill="#2a1a2a"/>`).join('')}`;
    if (lv >= 6) g += [[x - 14, top + 10], [x + w + 14, top + 16], [160, top - 46]].map(([hx, hy], i) => `<path d="M${hx} ${hy + 6}c-8-6-10-11-6-14c3-2 6-1 6 2c0-3 3-4 6-2c4 3 2 8-6 14z" fill="${pink}" class="fsp" style="animation-delay:${i * .5}s"/>`).join('');
  }
  if (bare) return `<defs><radialGradient id="fglow-${id}"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>${g}`;
  return `<svg viewBox="0 0 ${W} ${H}" class="farm-svg">${sky}${gold ? `<ellipse cx="160" cy="${gy - 30}" rx="150" ry="70" fill="url(#fglow-${id})" opacity=".35"/>` : ''}${g}${sparkles}</svg>`;
}

/* ---------- admin → Farm: the town wallpaper and where each building's label sits on it ---------- */
function renderFarmTab() {
  const p = $('#adPanel'); if (!p) return;
  const bg = MEDIA.get('farm:bg');
  p.innerHTML = `<div class="stack">
    <div><h3>Base</h3><p class="tiny">The wallpaper fills the Base screen at 16:9 (best size 1920×1080; it covers the screen and other shapes are cropped). Without one, the drawn default town is used. Drag each label in the preview (or use the sliders) so it sits on its building in your picture.</p></div>
    <div class="fm-adprev" id="fmPrev">${bg ? `<img src="${bg}" alt="">` : `<div class="fm-bg">${farmTownSVG()}</div>`}
      ${[...FARM_DEFS, { id: 'fountain', name: 'Fountain' }].map(d => { const q = farmPos(d.id); return `<span class="fm-dot" data-fmdrag="${d.id}" style="left:${q.x}%;top:${q.y}%;--fc:${FARM_COL[d.id]}">${esc(d.name)}</span>`; }).join('')}</div>
    <div class="row"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'} wallpaper<input type="file" accept="image/*" class="sr" id="fmUp"></label>${bg ? '<button class="btn ghost sm" id="fmDel">Use the default town</button>' : ''}<button class="btn ghost sm" id="fmResetPos">Reset label positions</button><button class="btn ghost sm" id="fmOpen">Open the farm</button></div>
    <div class="fm-sliders">${[...FARM_DEFS, { id: 'fountain', name: 'Fountain' }].map(d => { const q = farmPos(d.id); return `<div class="fm-sl" style="--fc:${FARM_COL[d.id]}"><b>${esc(d.name)}</b>
      <label>X <input type="range" min="2" max="98" step=".5" value="${q.x}" data-fmx2="${d.id}"></label><label>Y <input type="range" min="4" max="96" step=".5" value="${q.y}" data-fmy2="${d.id}"></label></div>`; }).join('')}</div>
  </div>`;
  const setPos = (id, x, y, rerender) => {
    S.farmLayout = { ...(S.farmLayout || {}), [id]: { x: Math.round(clamp(x, 2, 98) * 2) / 2, y: Math.round(clamp(y, 4, 96) * 2) / 2 } };
    const q = farmPos(id), dot = p.querySelector(`[data-fmdrag="${id}"]`); dot.style.left = q.x + '%'; dot.style.top = q.y + '%';
    p.querySelector(`[data-fmx2="${id}"]`).value = q.x; p.querySelector(`[data-fmy2="${id}"]`).value = q.y;
    if (rerender) { persist(); if (!MEDIA.get('farm:bg')) { const b = p.querySelector('#fmPrev .fm-bg'); if (b) b.innerHTML = farmTownSVG(); } }
  };
  p.querySelectorAll('[data-fmx2],[data-fmy2]').forEach(i => i.oninput = () => { const id = i.dataset.fmx2 || i.dataset.fmy2, q = farmPos(id); setPos(id, i.dataset.fmx2 ? +i.value : q.x, i.dataset.fmy2 ? +i.value : q.y, true); });
  const box = $('#fmPrev');
  p.querySelectorAll('[data-fmdrag]').forEach(dot => dot.onpointerdown = e => {
    e.preventDefault(); dot.setPointerCapture(e.pointerId);
    const move = ev => { const r = box.getBoundingClientRect(); setPos(dot.dataset.fmdrag, (ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100, false); };
    dot.onpointermove = move; dot.onpointerup = ev => { move(ev); dot.onpointermove = dot.onpointerup = null; setPos(dot.dataset.fmdrag, farmPos(dot.dataset.fmdrag).x, farmPos(dot.dataset.fmdrag).y, true); };
  });
  $('#fmUp').onchange = async ev => { try { if (await mediaSet('farm:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderFarmTab(); toast('Base wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = $('#fmDel'); if (del) del.onclick = async () => { await mediaDel('farm:bg'); renderFarmTab(); toast('Back to the default town.'); };
  $('#fmResetPos').onclick = () => { S.farmLayout = {}; persist(); renderFarmTab(); };
  $('#fmOpen').onclick = () => { closeModal(); openFarm(); };
}
