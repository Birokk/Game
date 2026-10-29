/* =========================================================
   Farm: buildings that produce materials over time (for now: pearls).
   Each building goes from level 0 (empty plot) to 7. An upgrade first needs its requirement (for now: pay 5 pearls),
   then costs gold and takes time; both grow with every level. Production keeps running and is stored up to 12 hours.
   State: S.farm[id] = { lv, t (last settled), acc (stored pearls), req (level whose requirement is paid), up: {to, start, ends} | null }
   ========================================================= */
const FARM_MAX = 7, FARM_CAP_H = 12, FARM_REQ_PEARLS = 5;
const FARM_RATE = [0, 0.25, 0.4, 0.6, 0.8, 1.05, 1.35, 1.7];            // pearls per hour at each level (× the building's multiplier)
const FARM_GOLD = [0, 0, 3000, 8000, 18000, 35000, 60000, 100000];      // gold to reach each level (level 1 = the building's build cost)
const FARM_TIME = [0, 60e3, 5 * 60e3, 15 * 60e3, 45 * 60e3, 2 * 36e5, 4 * 36e5, 8 * 36e5];   // time to reach each level
const FARM_DEFS = [
  { id: 'crops', name: 'Crops', mult: 1, build: 0, start: 1, desc: 'Fields of lantern rice and pearl melons.' },
  { id: 'inn', name: 'Inn', mult: 1.25, build: 2000, start: 0, desc: 'Travelers rest here and pay in pearls.' },
  { id: 'market', name: 'Market', mult: 1.5, build: 5000, start: 0, desc: 'Stalls that trade the town\'s goods.' },
  { id: 'pub', name: "Girls' Pub", mult: 2, build: 10000, start: 0, desc: 'Music, drinks and the liveliest crowd in town.' }
];
const farmDef = id => FARM_DEFS.find(d => d.id === id);
function farmOf(id) {
  if (!S.farm || typeof S.farm !== 'object') S.farm = {};
  if (!S.farm[id]) S.farm[id] = { lv: farmDef(id).start, t: Date.now(), acc: 0, req: 0, up: null };
  return S.farm[id];
}
const farmRate = (id, lv = farmOf(id).lv) => FARM_RATE[lv] * farmDef(id).mult;   // pearls per hour
const farmCap = (id, lv = farmOf(id).lv) => farmRate(id, lv) * FARM_CAP_H;
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
const farmReady = () => FARM_DEFS.some(d => farmStored(d.id) >= 1) || FARM_DEFS.some(d => { const f = farmOf(d.id); return f.up && f.up.ends <= Date.now(); });
function farmCollect(id) {
  farmSettle(id); const f = farmOf(id), n = Math.floor(f.acc);
  if (n < 1) return 0;
  f.acc -= n; S.wallet.pearls += n; return n;
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
const fmtDur2 = ms => { const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}h ${String(m).padStart(2, '0')}m` : m ? `${m}m ${String(x).padStart(2, '0')}s` : `${x}s`; };

/* ---------- the Farm window ---------- */
let farmTimer = null;
function openFarm() {
  farmTick();
  openModal({ title: 'Farm', ic: 'farm', wide: true, kind: 'farm', body: '<div id="farmRoot"></div>', onMount: () => {
    renderFarm();
    clearInterval(farmTimer);
    farmTimer = setInterval(() => { if (!modalEl || modalEl.dataset.kind !== 'farm') return clearInterval(farmTimer); if (farmTick()) { renderFarm(); renderMenu(); } else updateFarmLive(); }, 1000);
  } });
}
function renderFarm() {
  const root = $('#farmRoot'); if (!root) return;
  const total = FARM_DEFS.reduce((s, d) => s + (farmOf(d.id).lv ? farmRate(d.id) : 0), 0);
  root.innerHTML = `<div class="stack">
    <div class="farm-top"><div><b>${total.toFixed(2)}</b> ${curIcon('pearls')} per hour</div><span class="tiny">Buildings store up to ${FARM_CAP_H} hours of production. Collect it before they fill up.</span>
      <button class="btn gold" id="farmAll">${curIcon('pearls')}Collect all</button></div>
    <div class="farm-grid">${FARM_DEFS.map(d => farmCard(d)).join('')}</div>
  </div>`;
  $('#farmAll').onclick = () => { let n = 0; FARM_DEFS.forEach(d => n += farmCollect(d.id)); if (!n) { toast('Nothing to collect yet.'); return; } persist(); renderMenu(); renderFarm(); toast(`Collected ${n} pearl${n === 1 ? '' : 's'}.`); };
  root.querySelectorAll('[data-fcol]').forEach(b => b.onclick = () => { const n = farmCollect(b.dataset.fcol); if (!n) return; persist(); renderMenu(); renderFarm(); toast(`+${n} pearl${n === 1 ? '' : 's'} from the ${farmDef(b.dataset.fcol).name}.`); });
  root.querySelectorAll('[data-freq]').forEach(b => b.onclick = () => farmPayReq(b.dataset.freq));
  root.querySelectorAll('[data-fup]').forEach(b => b.onclick = () => farmUpgrade(b.dataset.fup));
}
function farmCard(d) {
  const f = farmOf(d.id), lv = f.lv, to = lv + 1, stored = farmStored(d.id), cap = farmCap(d.id);
  const pips = Array.from({ length: FARM_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
  let up;
  if (f.up) up = `<div class="farm-up busy"><span class="lbl-sm">${lv ? `Upgrading to level ${f.up.to}` : 'Building'}</span><span class="bar"><i id="fupb-${d.id}" style="width:${(Date.now() - f.up.start) / (f.up.ends - f.up.start) * 100}%"></i></span><span class="tiny" id="fupt-${d.id}">${fmtDur2(f.up.ends - Date.now())} left</span></div>`;
  else if (lv >= FARM_MAX) up = `<div class="farm-up max"><b>Max level</b><span class="tiny">This building is fully upgraded.</span></div>`;
  else {
    const cost = farmCost(d.id, to), met = f.req >= to;
    up = `<div class="farm-up"><span class="lbl-sm">${lv ? `Next: level ${to}` : 'Build'} · ${(FARM_RATE[to] * d.mult).toFixed(2)} pearls/hour</span>
      <div class="farm-req ${met ? 'met' : ''}">${met ? `${icon('check')}<span>Requirement met</span>` : `<span>Requirement: ${FARM_REQ_PEARLS} ${curIcon('pearls')}</span><button class="btn ghost sm" data-freq="${d.id}">Unlock</button>`}</div>
      <button class="btn ${met ? 'mint' : 'ghost'}" data-fup="${d.id}" ${met ? '' : 'disabled'}>${icon(lv ? 'up' : 'plus')}${lv ? 'Upgrade' : 'Build'} · ${cost ? `<span class="cost">${curIcon('coins')}${fmt(cost)}</span>` : 'free'} · ${fmtDur2(FARM_TIME[to])}</button></div>`;
  }
  return `<div class="farm-card lv${lv}" style="--fc:${FARM_COL[d.id]}">
    <div class="farm-art">${farmSVG(d.id, lv)}${f.up ? '<span class="farm-scaffold">Under construction</span>' : ''}</div>
    <div class="farm-info">
      <div class="farm-head"><b>${esc(d.name)}</b><span class="farm-lv">${lv ? `Lv ${lv}` : 'Empty plot'}<span class="farm-pips">${pips}</span></span></div>
      <p class="tiny">${esc(d.desc)}</p>
      ${lv ? `<div class="farm-store"><div class="row" style="justify-content:space-between"><span class="tiny">${farmRate(d.id).toFixed(2)} pearls/hour</span><span class="tiny" id="fst-${d.id}">${stored.toFixed(1)} / ${cap.toFixed(1)}</span></div>
        <span class="bar"><i id="fsb-${d.id}" style="width:${cap ? stored / cap * 100 : 0}%"></i></span>
        <button class="btn gold sm" data-fcol="${d.id}" ${stored >= 1 ? '' : 'disabled'}>${curIcon('pearls')}Collect ${Math.floor(stored)}</button></div>` : ''}
      ${up}
    </div></div>`;
}
/* once a second: move bars and timers without rebuilding the window */
function updateFarmLive() {
  for (const d of FARM_DEFS) {
    const f = farmOf(d.id), st = $('#fst-' + d.id), sb = $('#fsb-' + d.id), c = document.querySelector(`[data-fcol="${d.id}"]`);
    if (st) { const s = farmStored(d.id), cap = farmCap(d.id); st.textContent = `${s.toFixed(1)} / ${cap.toFixed(1)}`; sb.style.width = `${s / cap * 100}%`; if (c) { c.disabled = s < 1; c.lastChild.textContent = `Collect ${Math.floor(s)}`; } }
    if (f.up) { const t = $('#fupt-' + d.id), b = $('#fupb-' + d.id); if (t) t.textContent = `${fmtDur2(f.up.ends - Date.now())} left`; if (b) b.style.width = `${(Date.now() - f.up.start) / (f.up.ends - f.up.start) * 100}%`; }
  }
}

/* ---------- building art: drawn as SVG, more is added at every level ---------- */
const FARM_COL = { crops: '#7fd36b', inn: '#ffb067', market: '#5ab8ff', pub: '#ff6ec7' };
function farmSVG(id, lv) {
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
  return `<svg viewBox="0 0 ${W} ${H}" class="farm-svg">${sky}${gold ? `<ellipse cx="160" cy="${gy - 30}" rx="150" ry="70" fill="url(#fglow-${id})" opacity=".35"/>` : ''}${g}${sparkles}</svg>`;
}
