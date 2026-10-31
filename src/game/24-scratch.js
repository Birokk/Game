/* ---------- scratch cards: a built-in event on the Event page ----------
   Buy a card for 5 pearls (10 a day), scratch the silver foil, and three of the same icon wins that icon's prize.
   The prize is decided when the card is bought (weights below, in millionths), then the 3×3 grid is dealt to match:
   a win puts its icon three times and every other icon at most twice; a loss never has three of a kind.
   Odds: about 30% of cards lose; return to player ≈ 96.6% (1 pearl 4.84%, 3 pearls 9%, 5 pearls 14%, 7 pearls 15%, 10 pearls 27%),
   and the big ones are very rare: 30 = 0.12%, 50 = 0.03%, 100 = 0.008%, 300 = 0.0012%.
   State (player save): S.scratch = { day, n (bought today), card: { cells[9], win (icon index or -1), prize, done } } */
const SCRATCH_PRICE = 5, SCRATCH_DAILY = 10;
const SCRATCH_PRIZES = [
  { p: 300, ic: 'seven', w: 12 }, { p: 100, ic: 'crown', w: 80 }, { p: 50, ic: 'diamond', w: 300 }, { p: 30, ic: 'star', w: 1200 },
  { p: 10, ic: 'bell', w: 270000 }, { p: 7, ic: 'bag', w: 150000 }, { p: 5, ic: 'clover', w: 140000 }, { p: 3, ic: 'horseshoe', w: 90000 },
  { p: 1, ic: 'cherry', w: 48400 }
];
const SCRATCH_LOSE_W = 1e6 - SCRATCH_PRIZES.reduce((t, x) => t + x.w, 0);   // 300,008 = about 30%
/* ten white line-art icons (the moon never pays: it only fills the grid) */
const SCR_ICONS = {
  seven: '<path d="M13 11h22l-11 27"/><path d="M18 24h12"/>',
  crown: '<path d="M8 33l3-19 8 9 5-13 5 13 8-9 3 19z"/><path d="M9 38h30"/><circle cx="24" cy="10" r="1.6"/>',
  diamond: '<path d="M9 19l6-9h18l6 9-15 20z"/><path d="M9 19h30"/><path d="M19 10l-3 9 8 20 8-20-3-9"/>',
  star: '<path d="M24 7l5 11 12 1.4-9 8.2 2.6 11.8L24 33.5 13.4 39.4 16 27.6 7 19.4 19 18z"/>',
  bell: '<path d="M13 33c1-14 4-21 11-21s10 7 11 21z"/><path d="M9 33h30"/><path d="M21 37a3 3 0 006 0"/><path d="M24 8v4"/>',
  bag: '<path d="M18 17c-7 6-10 13-8 18 1.5 4 6 6 14 6s12.5-2 14-6c2-5-1-12-8-18z"/><path d="M18 17l-3-8h18l-3 8z"/><path d="M27 25c-1-1.5-5-2-5.5.5S27 28 27 30.5 22 33 21 31.5"/><path d="M24 23v12"/>',
  clover: '<circle cx="18.5" cy="18.5" r="6"/><circle cx="29.5" cy="18.5" r="6"/><circle cx="18.5" cy="29.5" r="6"/><circle cx="29.5" cy="29.5" r="6"/><path d="M28 30c4 4 6 7 7 10"/>',
  horseshoe: '<path d="M14 10c-3 13-1 26 10 26s13-13 10-26"/><path d="M10 10h8"/><path d="M30 10h8"/><circle cx="16.5" cy="22" r=".8"/><circle cx="31.5" cy="22" r=".8"/><circle cx="19" cy="30" r=".8"/><circle cx="29" cy="30" r=".8"/>',
  cherry: '<circle cx="15" cy="33" r="6.5"/><circle cx="32" cy="31" r="6.5"/><path d="M15 26.5C17 18 22 12 30 9"/><path d="M32 24.5C31 18 30 13 30 9"/><path d="M30 9c3-2 7-2 9 0-3 2-6 2-9 0z"/>',
  moon: '<path d="M30 9a15 15 0 1 0 9 24A12 12 0 1 1 30 9z"/><circle cx="18" cy="21" r="1"/><circle cx="23" cy="30" r="1.4"/>'
};
const SCR_KEYS = Object.keys(SCR_ICONS);
const scrIcon = (k, cls = '') => `<svg class="scr-ic ${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${SCR_ICONS[k]}</svg>`;
function scratchState() {
  const s = S.scratch || (S.scratch = { day: null, n: 0, card: null });
  if (s.day !== dayKey()) { s.day = dayKey(); s.n = 0; }
  return s;
}
const scratchLeft = () => SCRATCH_DAILY - scratchState().n;
const scratchOpen = () => { const c = scratchState().card; return !!c && !c.done; };
function rollScratch() {
  let r = Math.random() * 1e6, prize = null;
  for (const x of SCRATCH_PRIZES) { if (r < x.w) { prize = x; break; } r -= x.w; }
  const win = prize ? SCR_KEYS.indexOf(prize.ic) : -1;
  // every other icon at most twice, so only the winning icon can make three
  const pool = SCR_KEYS.flatMap((k, i) => i === win ? [] : [i, i]).sort(() => Math.random() - .5);
  const cells = [...(win >= 0 ? [win, win, win] : []), ...pool].slice(0, 9).sort(() => Math.random() - .5);
  return { cells, win, prize: prize ? prize.p : 0, done: false };
}
function buyScratch() {
  const s = scratchState();
  if (scratchOpen()) { toast('Scratch this card first.'); return; }
  if (s.n >= SCRATCH_DAILY) { toast(`You've bought all ${SCRATCH_DAILY} cards for today. More tomorrow.`); return; }
  if (S.wallet.pearls < SCRATCH_PRICE) { toast(`A scratch card costs ${SCRATCH_PRICE} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= SCRATCH_PRICE; s.n++; s.card = rollScratch(); persist(); renderMenu(); renderEvents();
}
function finishScratch() {
  const c = scratchState().card; if (!c || c.done) return;
  c.done = true; if (c.prize) S.wallet.pearls += c.prize;
  persist(); renderMenu(); renderEvents();
  toast(c.prize ? `Three ${SCR_KEYS[c.win]}s! You won ${c.prize} pearl${c.prize === 1 ? '' : 's'}.` : 'No match this time.');
}
function scratchBoard() {
  const s = scratchState(), c = s.card, left = scratchLeft(), open = scratchOpen();
  const cells = c ? c.cells.map(i => `<span class="scr-cell ${c.done && i === c.win ? 'hit' : ''}">${scrIcon(SCR_KEYS[i])}</span>`).join('')
    : Array.from({ length: 9 }, () => `<span class="scr-cell">${scrIcon('moon', 'ghost')}</span>`).join('');
  const odds = x => { const v = x / 1e4; return v >= 1 ? `${Math.round(v * 100) / 100}%` : `${+v.toPrecision(2)}%`; };
  return `<div class="scr">
    <div class="scr-card ${c ? '' : 'empty'} ${c && c.done ? (c.prize ? 'won' : 'lost') : ''}">
      <div class="scr-head"><b>Lucky Scratch</b><span>Match 3 to win</span></div>
      <div class="scr-wrap"><div class="scr-grid">${cells}</div>${open ? '<canvas class="scr-foil" id="scrFoil" aria-label="Scratch the foil to reveal the icons"></canvas>' : ''}
        ${!c ? `<div class="scr-msg">Buy a card to play</div>` : c.done ? `<div class="scr-res">${c.prize ? `${curIcon('pearls')}<b>+${c.prize}</b>` : '<b>No match</b>'}</div>` : ''}</div>
      <div class="scr-foot">${open ? 'Scratch the silver foil' : c && c.done ? (c.prize ? `You won ${c.prize} pearl${c.prize === 1 ? '' : 's'}!` : 'Better luck next card') : `${SCRATCH_PRICE} pearls per card`}</div>
    </div>
    <div class="scr-side">
      ${open ? `<button class="btn gold" id="scrReveal">${icon('eye')}Reveal all</button>`
        : `<button class="btn gold" id="scrBuy" ${left > 0 && S.wallet.pearls >= SCRATCH_PRICE ? '' : 'disabled'}>Buy a card · ${costHTML(SCRATCH_PRICE)}</button>`}
      <span class="scr-left">${left} of ${SCRATCH_DAILY} cards left today</span>
      <div class="scr-table"><span class="lbl-sm" style="display:flex;justify-content:space-between;align-items:center">Three of a kind wins ${infoBtn('scratch', 'Prizes and odds')}</span>
        ${SCRATCH_PRIZES.map(x => `<div class="scr-row ${x.p >= 30 ? 'big' : ''}"><span class="scr-trio">${scrIcon(x.ic)}<i>×3</i></span><b>${curIcon('pearls')}${x.p}</b></div>`).join('')}
      </div>
    </div></div>`;
}
/* the silver foil: drag to scratch it away; once most of every cell is clear the card is revealed */
INFO.scratch = () => { const odds = x => { const v = x / 1e4; return v >= 1 ? `${Math.round(v * 100) / 100}%` : `${+v.toPrecision(2)}%`; };
  return { title: 'Scratch card odds', body: `<p class="desc">A card costs ${SCRATCH_PRICE} pearls, up to ${SCRATCH_DAILY} a day. Three of the same icon wins its prize.</p>
    <table class="cs-table"><thead><tr><th>Three of</th><th>Prize</th><th>Chance</th></tr></thead><tbody>
      ${SCRATCH_PRIZES.map(x => `<tr><td><span class="scr-trio">${scrIcon(x.ic)}</span></td><td>${x.p} pearl${x.p === 1 ? '' : 's'}</td><td>${odds(x.w)}</td></tr>`).join('')}
      <tr><td>No match</td><td>0</td><td>${odds(SCRATCH_LOSE_W)}</td></tr></tbody></table>` }; };
function bindScratch() {
  const b = $('#scrBuy'); if (b) b.onclick = buyScratch;
  const r = $('#scrReveal'); if (r) r.onclick = finishScratch;
  const cv = $('#scrFoil'); if (!cv) return;
  const box = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.max(1, Math.round(box.width * dpr)), H = Math.max(1, Math.round(box.height * dpr));
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#d9dde6'); gr.addColorStop(.45, '#a9b0bf'); gr.addColorStop(.55, '#eef1f7'); gr.addColorStop(1, '#9aa1b2');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.globalAlpha = .18; g.fillStyle = '#5a6070';
  for (let i = 0; i < 260; i++) g.fillRect(Math.random() * W, Math.random() * H, 2 * dpr, 2 * dpr);
  g.globalAlpha = .55; g.font = `${Math.round(14 * dpr)}px Cinzel, serif`; g.textAlign = 'center'; g.fillStyle = '#6a7080';
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) g.fillText('SCRATCH', (x + .5) * W / 3, (y + .5) * H / 3 + 5 * dpr);
  g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out'; g.lineCap = g.lineJoin = 'round'; g.lineWidth = 34 * dpr;
  let last = null, moves = 0;
  const at = e => { const rc = cv.getBoundingClientRect(); return [(e.clientX - rc.left) * W / rc.width, (e.clientY - rc.top) * H / rc.height]; };
  const cleared = () => {   // share of foil gone in each of the 9 cells (sampled on a coarse grid)
    const d = g.getImageData(0, 0, W, H).data, out = [];
    for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) {
      let gone = 0, n = 0;
      for (let sy = 0; sy < 8; sy++) for (let sx = 0; sx < 8; sx++) { const px = Math.floor((cx + (sx + .5) / 8) * W / 3), py = Math.floor((cy + (sy + .5) / 8) * H / 3); n++; if (d[(py * W + px) * 4 + 3] < 40) gone++; }
      out.push(gone / n);
    }
    return out;
  };
  const check = () => { const c = cleared(); if (c.every(v => v > .45) || c.reduce((t, v) => t + v, 0) / 9 > .7) finishScratch(); };
  cv.onpointerdown = e => { cv.setPointerCapture(e.pointerId); last = at(e); g.beginPath(); g.arc(last[0], last[1], 17 * dpr, 0, Math.PI * 2); g.fill(); };
  cv.onpointermove = e => { if (!last) return; const p = at(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; if (++moves % 12 === 0) check(); };
  cv.onpointerup = cv.onpointercancel = () => { if (!last) return; last = null; check(); };
}

/* bulk gifting: give many of one gift at once (from the bag), up to what the bond still needs */
function openGiveGifts(id, gift) {
  const c = findEntry(id); if (!c || !owns(id)) return;
  const bd = bondOf(id); if (bondLv(id) >= BOND_MAX) { toast(`${c.name} is already at bond level ${BOND_MAX}.`); return; }
  if (!gift || !GIFTS[gift]) gift = Object.keys(GIFTS).find(k => S.gifts[k]) || 'sweets';
  const g = GIFTS[gift], need = Math.ceil((BOND_XP[BOND_MAX] - bd.xp) / g.xp), most = Math.max(0, Math.min(S.gifts[gift] || 0, need));
  let n = Math.min(1, most);
  const lvAt = xp => { let l = 0; while (l < BOND_MAX && xp >= BOND_XP[l + 1]) l++; return l; };
  openModal({ title: 'Give gifts', ic: 'gift', kind: 'giftbuy', body: `<div class="stack">
    <div class="tabs" style="margin:0">${Object.entries(GIFTS).map(([k, x]) => `<button class="tab ${k === gift ? 'on' : ''}" data-ggk="${k}">${curIcon('g' + k)}${x.name} ×${fmt(S.gifts[k] || 0)}</button>`).join('')}</div>
    <p class="desc">Give ${g.name} to ${esc(c.name)}: +${fmt(g.xp)} bond each. You have ${fmt(S.gifts[gift] || 0)}; ${fmt(need)} would fill the bond.</p>
    ${most ? `<div class="buy-row">${curIcon('g' + gift)}<button class="rbtn glass" id="ggMinus" aria-label="One less">−</button><input class="input" id="ggN" type="number" min="1" max="${most}" value="1" aria-label="How many gifts"><button class="rbtn glass" id="ggPlus" aria-label="One more">${icon('plus')}</button></div>
    <div class="row" style="justify-content:center">${[1, 5, 10, 50].filter(k => k <= most).map(k => `<button class="btn ghost sm" data-gg="${k}">×${k}</button>`).join('')}<button class="btn ghost sm" data-gg="max">Max</button></div>
    <div class="balance"><span>Bond</span><b id="ggXp"></b></div>
    <div class="row" style="justify-content:space-between"><button class="btn ghost sm" id="ggBuy">${icon('gift')}Buy more</button><button class="btn gold" id="ggGo">Give</button></div>`
    : `<div class="cs-pill">You don't have any ${g.name}. Buy some first.</div><div class="row" style="justify-content:flex-end"><button class="btn gold" id="ggBuy">${icon('gift')}Buy ${g.name}</button></div>`}
  </div>`, onMount: () => {
    modalEl.querySelectorAll('[data-ggk]').forEach(b => b.onclick = () => openGiveGifts(id, b.dataset.ggk));
    $('#ggBuy').onclick = () => openBuyGifts(gift, 'coins');
    if (!most) return;
    const set = v => { n = v === 'max' ? most : clamp(Math.floor(+v || 1), 1, most); $('#ggN').value = n;
      const xp = Math.min(BOND_XP[BOND_MAX], bd.xp + n * g.xp);
      $('#ggXp').textContent = `+${fmt(xp - bd.xp)} · Lv ${bondLv(id)} → Lv ${lvAt(xp)}`; $('#ggGo').textContent = `Give ${n}`; };
    set(1);
    $('#ggN').oninput = e => set(e.target.value);
    $('#ggMinus').onclick = () => set(n - 1); $('#ggPlus').onclick = () => set(n + 1);
    modalEl.querySelectorAll('[data-gg]').forEach(b => b.onclick = () => set(b.dataset.gg));
    $('#ggGo').onclick = () => {
      const before = bondLv(id), b = { ...bondOf(id) };
      questAdd('gift', n); S.gifts[gift] -= n; b.xp = Math.min(BOND_XP[BOND_MAX], b.xp + n * g.xp); S.bond[id] = b;
      persist(); renderMenu(); closeModal(); refreshCharacters();
      const after = bondLv(id);
      toast(`Gave ${n} ${g.name} to ${c.name}. +${fmt(n * g.xp)} bond${after > before ? `, bond level ${after}!${after === BOND_MAX ? ' You can now propose with a ring.' : ''}` : '.'}`);
    };
  } });
}
