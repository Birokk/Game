/* ---------- Guild Hangout (the owner asked for a Hangout tab in the guild with three simple daily minigames:
   completing any of them gives 1 pearl, at most 2 pearls a day; the same glass design as Raids / Quick match) ----------
   A spot on the guild screen (GUILD_SPOTS 'hangout', 41-guild.js) opens a full glass page (`.hgx.rdx`) over a blurred
   copy of the guild wallpaper: the three games on the left, the chosen game's board in the middle, a bar with its
   progress, today's pearls and the big button. The games:
   - Lantern Pairs (memory): 12 lanterns, 6 pairs of charms, find them all within 16 tries.
   - Pearl Shells (follow the pearl): three shells shuffle, pick the one with the pearl 3 rounds in a row, faster each round.
   - Star Catch (timing): a star swings along a bar, catch it inside the glowing zone 3 times before missing 3; the zone
     shrinks and the star speeds up after every catch.
   Completing a game pays HANG_PEARLS while fewer than HANG_DAILY were earned today (local day); after that the games
   stay playable for fun. State S.hang {day, n (pearls today), done {gameId: wins today}, best {}} (player save). */
const HANG_PEARLS = 1, HANG_DAILY = 2;
const HANG_GAMES = [
  { id: 'pairs', name: 'Lantern Pairs', kind: 'Memory', ic: 'cards', col: '#ff9ad8',
    desc: 'Twelve lanterns hide six pairs of charms. Light two at a time and find every pair before your tries run out.',
    rules: [['eye', 'Find all 6 pairs'], ['refresh', '16 tries']] },
  { id: 'shells', name: 'Pearl Shells', kind: 'Keep your eye on it', ic: 'shell', col: '#8fd8ff',
    desc: 'A pearl hides under one of three shells, then the shells shuffle. Follow it and pick the right shell three rounds in a row. Every round is faster.',
    rules: [['eye', '3 rounds in a row'], ['bolt', 'Faster every round']] },
  { id: 'stars', name: 'Star Catch', kind: 'Timing', ic: 'star', col: '#ffd977',
    desc: 'A falling star swings along the bar. Press Catch while it is inside the glowing zone. Catch 3 before you miss 3: the zone shrinks after every catch.',
    rules: [['star', 'Catch 3 stars'], ['heart', '3 misses allowed']] }
];
const HG_PAIRS = 16, HG_SHELL_ROUNDS = 3, HG_SHELL_MS = [520, 400, 300], HG_STAR_NEED = 3, HG_STAR_LIVES = 3, HG_STAR_MS = [1700, 1400, 1150], HG_STAR_W = [.24, .17, .12];
let hgEl = null, hgSel = 'pairs', hgG = null;   // hgG: the running game
function hangState() {
  let h = S.hang; if (!h || typeof h !== 'object') h = S.hang = {};
  const d = dayKey(); if (h.day !== d) Object.assign(h, { day: d, n: 0, done: {} });
  h.done = h.done || {}; h.best = h.best || {}; return h;
}
const hangLeft = () => Math.max(0, HANG_DAILY - hangState().n);
const hangReady = () => inGuild() && hangLeft() > 0;
/* a game was completed: count it and pay a pearl while today's pearls aren't all collected; returns the pearls paid */
function hangWin(id) {
  const h = hangState(); h.done[id] = (h.done[id] || 0) + 1; statAdd('hang');
  let paid = 0; if (h.n < HANG_DAILY) { h.n++; paid = HANG_PEARLS; S.wallet.pearls += paid; }
  persist(); renderMenu(); return paid;
}
const hgGame = id => HANG_GAMES.find(g => g.id === id) || HANG_GAMES[0];

function openHangout(id) {
  closeModal(); hangState(); if (id) hgSel = hgGame(id).id;
  if (!hgEl) { hgEl = document.createElement('div'); hgEl.className = 'hgx rdx'; hgEl.setAttribute('role', 'dialog'); hgEl.setAttribute('aria-label', 'Guild hangout'); document.body.appendChild(hgEl); }
  hgNew(); renderHangout();
}
function closeHangout() { hgStop(); if (hgEl) { hgEl.remove(); hgEl = null; } if (fmEl) renderFarm(); }
addEventListener('keydown', e => {
  if (!hgEl || document.querySelector('.modal-back')) return;
  if (e.key === 'Escape') closeHangout();
  else if ((e.key === ' ' || e.key === 'Enter') && hgG && hgG.id === 'stars' && hgG.phase === 'run') { e.preventDefault(); hgCatch(); }
});
/* a fresh, not yet started game of the chosen kind */
function hgNew() {
  hgStop();
  const id = hgSel;
  if (id === 'pairs') {
    const ch = ['star', 'heart', 'crown', 'gift', 'shell', 'bolt'], cards = [];
    ch.forEach((k, i) => { cards.push({ k, c: i }); cards.push({ k, c: i }); });
    for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
    hgG = { id, phase: 'ready', cards: cards.map(c => ({ ...c, up: false, got: false })), open: [], tries: 0, lock: false };
  } else if (id === 'shells') hgG = { id, phase: 'ready', round: 1, pos: [0, 1, 2], pearl: Math.floor(Math.random() * 3), pick: null, T: [] };
  else hgG = { id, phase: 'ready', hits: 0, miss: 0, zc: .5, zw: HG_STAR_W[0], p: 0, t0: 0, raf: 0, last: null };
}
function hgStop() { if (!hgG) return; (hgG.T || []).forEach(clearTimeout); hgG.T = []; if (hgG.raf) cancelAnimationFrame(hgG.raf); hgG.raf = 0; }
const hgLater = (fn, ms) => { const t = setTimeout(() => { if (hgEl && hgG) fn(); }, ms); (hgG.T = hgG.T || []).push(t); return t; };

/* ---------- the page ---------- */
function renderHangout() {
  if (!hgEl) return;
  const h = hangState(), G = hgGame(hgSel), g = myGuild(), bg = MEDIA.get('guild:bg');
  const card = x => { const w = h.done[x.id] || 0;
    return `<button class="rdx-it hgx-it ${x.id === G.id ? 'on' : ''}" data-hg="${x.id}" style="--mc:${x.col}"><span class="rdx-iti">${icon(x.ic)}</span><span class="rdx-itt"><b>${esc(x.name)}</b><small>${w ? `${icon('check')}Completed today${w > 1 ? ` ×${w}` : ''}` : esc(x.kind)}</small></span></button>`; };
  const pips = `<span class="hgx-pips">${Array.from({ length: HANG_DAILY }, (_, i) => `<i class="${i < h.n ? 'on' : ''}"></i>`).join('')}</span>`;
  hgEl.innerHTML = `<div class="rdx-bg hgx-bg ${bg ? 'art' : ''}">${bg ? artImg('guild:bg') : ''}<i class="hgx-glow g1"></i><i class="hgx-glow g2"></i><i class="hgx-glow g3"></i></div><div class="rdx-shade hgx-shade"></div>
    <header class="rdx-head"><div class="inv-title"><span class="inv-badge">${icon('mug')}</span><h2 class="ts">Hangout</h2></div>
      ${g ? `<span class="hgx-gname">${guildIcon(g.icon, 30)}<b>${esc(g.name)}</b></span>` : ''}${infoBtn('hangout', 'How the Hangout works')}<span class="rdx-sp"></span>
      <span class="rdx-ward hgx-day" title="Pearls from the Hangout today">${curIcon('pearls')}Today <b>${h.n} / ${HANG_DAILY}</b>${pips}</span>
      <div class="cur" data-k="pearls">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b></div>
      <button class="inv-x" id="hgClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="rdx-rail"><span class="rdx-gh">${icon('mug')}Minigames</span>${HANG_GAMES.map(card).join('')}
      <div class="hgx-note">${icon('gift')}<span><b>${HANG_PEARLS} pearl</b> for completing any game, up to <b>${HANG_DAILY} a day</b>. New pearls at midnight.</span></div></aside>
    <section class="rdx-main"><div class="rdx-scroll">
      <div class="rdx-hero"><span class="rdx-kind" style="--mc:${G.col}">${icon(G.ic)}Minigame · ${esc(G.kind)}</span>
        <h1 class="rdx-title hgx-title" style="--mc:${G.col}">${esc(G.name)}</h1><p class="rdx-desc">${esc(G.desc)}</p>
        <div class="rdx-meta">${G.rules.map(([ic, t]) => `<span>${icon(ic)}${esc(t)}</span>`).join('')}<span>${curIcon('pearls')}${HANG_PEARLS} pearl for a win</span></div></div>
      <div class="rdx-panel hgx-panel" style="--mc:${G.col}"><div class="hgx-board" id="hgBoard">${hgBoardHTML()}</div></div></div>
      <div class="rdx-bar hgx-bar" id="hgBar">${hgBarHTML()}</div></section>`;
  hgEl.querySelector('#hgClose').onclick = closeHangout;
  hgEl.querySelectorAll('[data-hg]').forEach(b => b.onclick = () => { if (b.dataset.hg === hgSel) return; hgSel = b.dataset.hg; hgNew(); renderHangout(); });
  hgBindBoard(); hgBindBar();
}
/* the bar: what you have done in this game, today's pearls, the big button */
function hgBarHTML() {
  const G = hgG, left = hangLeft();
  let st = '', btn = 'Start', sub = '', ic = 'bolt';
  if (G.id === 'pairs') { const got = G.cards.filter(c => c.got).length / 2; st = `<b>${got} / 6</b> pairs<i>·</i>tries <b>${G.tries} / ${HG_PAIRS}</b>`; }
  else if (G.id === 'shells') st = `round <b>${Math.min(G.round, HG_SHELL_ROUNDS)} / ${HG_SHELL_ROUNDS}</b>`;
  else st = `caught <b>${G.hits} / ${HG_STAR_NEED}</b><i>·</i>misses <b>${G.miss} / ${HG_STAR_LIVES}</b>`;
  if (G.phase === 'won' || G.phase === 'lost') { btn = 'Play again'; ic = 'refresh'; }
  else if (G.phase !== 'ready') { btn = G.id === 'stars' ? 'Catch!' : G.id === 'pairs' ? 'Restart' : 'Restart'; ic = G.id === 'stars' ? 'star' : 'refresh'; }
  if (G.id === 'pairs' && G.phase === 'ready') { btn = 'Start'; }
  sub = left ? `${curIcon('pearls')}+${HANG_PEARLS} for a win` : 'For fun · pearls collected';
  return `<div class="hgx-st"><span class="rdx-il">${icon(hgGame(G.id).ic)}${esc(hgGame(G.id).name)}</span><span class="hgx-sv">${st}</span></div>
    <div class="hgx-rw ${left ? '' : 'done'}"><span class="rdx-il">${icon('gift')}Today's pearls</span><span class="hgx-sv">${left ? `<b>${left}</b> of ${HANG_DAILY} left` : `All ${HANG_DAILY} collected · back at midnight`}</span></div>
    <button class="rdx-go" id="hgGo"><span class="rdx-goi">${icon(ic)}</span><span class="rdx-got"><b>${btn}</b><small>${sub}</small></span></button>`;
}
function hgBindBar() {
  const go = hgEl && hgEl.querySelector('#hgGo'); if (!go) return;
  go.onclick = () => {
    const G = hgG;
    if (G.id === 'stars' && G.phase === 'run') return hgCatch();
    if (G.phase !== 'ready') hgNew();
    hgStart();
  };
}
const hgBar = () => { const b = hgEl && hgEl.querySelector('#hgBar'); if (b) { b.innerHTML = hgBarHTML(); hgBindBar(); } };
const hgBoardRedraw = () => { const b = hgEl && hgEl.querySelector('#hgBoard'); if (b) { b.innerHTML = hgBoardHTML(); hgBindBoard(); } };
function hgStart() {
  const G = hgG;
  if (G.id === 'pairs') { G.phase = 'play'; hgBoardRedraw(); }
  else if (G.id === 'shells') { hgBoardRedraw(); hgShellRound(); }
  else { G.phase = 'run'; G.t0 = performance.now(); hgStarZone(); hgBoardRedraw(); hgStarLoop(); }
  hgBar();
}
/* the result card over the board: "Complete!" with the pearl, or "Out of tries" */
function hgResult(win, paid, text) {
  const b = hgEl && hgEl.querySelector('#hgBoard'); if (!b) return;
  const r = document.createElement('div'); r.className = `hgx-res ${win ? 'win' : 'lose'}`;
  r.innerHTML = win ? `<span class="hgx-rb">${icon('check')}</span><b>Complete!</b>${paid ? `<span class="hgx-rp">${curIcon('pearls')}+${paid} pearl</span>` : `<small>Today's ${HANG_DAILY} pearls are already collected</small>`}`
    : `<span class="hgx-rb">${icon('refresh')}</span><b>${esc(text)}</b><small>Press Play again to retry</small>`;
  b.appendChild(r);
}
function hgFinish(win, text) {
  const G = hgG; G.phase = win ? 'won' : 'lost'; hgStop();
  const paid = win ? hangWin(G.id) : 0;
  if (paid) toast(`Hangout: +${paid} pearl!`);
  hgResult(win, paid, text);
  // the header chip, the rail's "Completed today" and the bar follow; the board keeps showing the finished game
  const keep = hgEl.querySelector('#hgBoard').innerHTML;
  renderHangout(); const b = hgEl.querySelector('#hgBoard'); b.innerHTML = keep; hgBindBoard();
}

/* ---------- the boards ---------- */
function hgBoardHTML() {
  const G = hgG;
  if (G.id === 'pairs') return `<div class="hgp-grid ${G.phase === 'ready' ? 'idle' : ''}">${G.cards.map((c, i) => `<button class="hgp-c ${c.up || c.got ? 'up' : ''} ${c.got ? 'got' : ''}" data-pc="${i}" style="--cc:${HG_PAIR_COL[c.c]}" aria-label="${c.up || c.got ? c.k : 'Hidden lantern'}"><span class="hgp-in"><span class="hgp-back">${HG_LANTERN}</span><span class="hgp-face">${icon(c.k)}</span></span></button>`).join('')}</div>
    ${G.phase === 'ready' ? `<div class="hgx-tip">${icon('cards')}Press <b>Start</b>, then light two lanterns at a time</div>` : ''}`;
  if (G.id === 'shells') return `<div class="hgs-field" style="--d:${HG_SHELL_MS[Math.min(G.round, HG_SHELL_ROUNDS) - 1]}ms">${[0, 1, 2].map(i => `<button class="hgs-sh" data-sh="${i}" style="--s:${G.pos[i]}" aria-label="Shell"><span class="hgs-pearl ${i === G.pearl ? '' : 'none'}"></span><span class="hgs-cap">${HG_SHELL}</span></button>`).join('')}<i class="hgs-sand"></i></div>
    <div class="hgx-tip" id="hgsTip">${G.phase === 'ready' ? `${icon('eye')}Press <b>Start</b> and watch the pearl` : ''}</div>`;
  return `<div class="hgt-wrap"><div class="hgt-bar"><i class="hgt-zone" style="--zc:${G.zc};--zw:${G.zw}"></i><i class="hgt-star" style="--p:${G.p}">${HG_STARSVG}</i></div>
      <div class="hgt-lives">${Array.from({ length: HG_STAR_LIVES }, (_, i) => `<i class="${i < HG_STAR_LIVES - G.miss ? 'on' : ''}">${icon('heart')}</i>`).join('')}</div>
      <div class="hgt-hits">${Array.from({ length: HG_STAR_NEED }, (_, i) => `<i class="${i < G.hits ? 'on' : ''}">${icon('star')}</i>`).join('')}</div></div>
    <div class="hgx-tip">${G.phase === 'ready' ? `${icon('star')}Press <b>Start</b>, then <b>Catch!</b> (or Space) when the star is in the zone` : ''}</div>`;
}
function hgBindBoard() {
  if (!hgEl) return; const G = hgG;
  if (G.id === 'pairs') hgEl.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => hgFlip(+b.dataset.pc));
  else if (G.id === 'shells') hgEl.querySelectorAll('[data-sh]').forEach(b => b.onclick = () => hgPick(+b.dataset.sh));
  else { const bar = hgEl.querySelector('.hgt-bar'); if (bar) bar.onclick = () => { if (G.phase === 'run') hgCatch(); }; }
}
const HG_PAIR_COL = ['#ffd977', '#ff8fb8', '#ffb35a', '#7fe0b0', '#8fd8ff', '#c9a6ff'];
const HG_LANTERN = '<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M24 6h12M30 6v6" stroke="#f3d9a0" stroke-width="2.5" stroke-linecap="round"/><path d="M18 14h24l-2 4H20z" fill="#e0b46a"/><path d="M20 18c-8 8-8 38 0 46h20c8-8 8-38 0-46z" fill="url(#hgLg)"/><path d="M30 18v46M23 20c-4 10-4 32 0 42M37 20c4 10 4 32 0 42" stroke="#a5452c" stroke-width="1.2" opacity=".55" fill="none"/><path d="M20 64h20l2 4H18z" fill="#e0b46a"/><path d="M30 68v6" stroke="#f3d9a0" stroke-width="2.5" stroke-linecap="round"/><defs><radialGradient id="hgLg" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#ffe7a8"/><stop offset=".45" stop-color="#ff9a5a"/><stop offset="1" stop-color="#c2402f"/></radialGradient></defs></svg>';
const HG_SHELL = '<svg viewBox="0 0 120 96" aria-hidden="true"><defs><linearGradient id="hgSg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2fb"/><stop offset=".5" stop-color="#f3b9dc"/><stop offset="1" stop-color="#b77ab8"/></linearGradient></defs><path d="M60 92L10 40Q12 22 26 18Q32 6 44 7Q52 0 60 4Q68 0 76 7Q88 6 94 18Q108 22 110 40Z" fill="url(#hgSg)" stroke="#fff" stroke-width="2"/><path d="M60 92L26 18M60 92L44 7M60 92V4M60 92L76 7M60 92L94 18" stroke="#a5649f" stroke-width="2" opacity=".5" fill="none"/><path d="M48 88h24l6 8H42z" fill="#c993c4"/></svg>';
const HG_STARSVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17l-6.1 3.3 1.4-6.7-5-4.6 6.8-.8z" fill="#fff6c2" stroke="#ffd04a" stroke-width="1.2"/></svg>';

/* Lantern Pairs */
function hgFlip(i) {
  const G = hgG; if (G.phase !== 'play' || G.lock) return;
  const c = G.cards[i]; if (!c || c.up || c.got) return;
  c.up = true; G.open.push(i);
  const el = hgEl.querySelector(`[data-pc="${i}"]`); if (el) { el.classList.add('up'); el.setAttribute('aria-label', c.k); }
  if (G.open.length < 2) return;
  G.tries++; const [a, b] = G.open; G.open = [];
  if (G.cards[a].k === G.cards[b].k) {
    G.cards[a].got = G.cards[b].got = true;
    [a, b].forEach(k => { const e = hgEl.querySelector(`[data-pc="${k}"]`); if (e) e.classList.add('got'); });
    hgBar();
    if (G.cards.every(x => x.got)) hgLater(() => hgFinish(true), 450);
    else if (G.tries >= HG_PAIRS) hgLater(() => hgFinish(false, 'Out of tries'), 450);
    return;
  }
  G.lock = true; hgBar();
  hgLater(() => {
    [a, b].forEach(k => { G.cards[k].up = false; const e = hgEl.querySelector(`[data-pc="${k}"]`); if (e) { e.classList.remove('up'); e.setAttribute('aria-label', 'Hidden lantern'); } });
    G.lock = false;
    if (G.tries >= HG_PAIRS) hgFinish(false, 'Out of tries');
  }, 760);
}

/* Pearl Shells: show the pearl, shuffle (each swap lifts one shell over the other), then pick */
function hgShellEl(i) { return hgEl && hgEl.querySelector(`[data-sh="${i}"]`); }
function hgShellTip(t) { const e = hgEl && hgEl.querySelector('#hgsTip'); if (e) e.innerHTML = t; }
function hgShellRound() {
  const G = hgG; G.phase = 'show'; G.pick = null;
  const f = hgEl.querySelector('.hgs-field'); if (f) f.style.setProperty('--d', HG_SHELL_MS[G.round - 1] + 'ms');
  hgEl.querySelectorAll('.hgs-sh').forEach(e => e.classList.remove('lift', 'ok', 'bad', 'pick'));
  hgShellTip(`${icon('eye')}Round ${G.round}: watch the pearl…`);
  const p = hgShellEl(G.pearl); if (p) p.classList.add('lift');
  hgBar();
  hgLater(() => { if (p) p.classList.remove('lift'); hgLater(() => hgShuffle(4 + G.round * 2), 500); }, 1100);
}
function hgShuffle(n) {
  const G = hgG; G.phase = 'shuffle'; hgShellTip(`${icon('refresh')}Shuffling…`);
  const ms = HG_SHELL_MS[G.round - 1];
  const step = k => {
    if (k >= n) { G.phase = 'pick'; hgShellTip(`${icon('shell')}Which shell hides the pearl?`); hgEl.querySelectorAll('.hgs-sh').forEach(e => e.classList.remove('arcu', 'arcd')); return; }
    let a = Math.floor(Math.random() * 3), b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
    [G.pos[a], G.pos[b]] = [G.pos[b], G.pos[a]];
    const ea = hgShellEl(a), eb = hgShellEl(b);
    hgEl.querySelectorAll('.hgs-sh').forEach(e => e.classList.remove('arcu', 'arcd'));
    if (ea) void ea.offsetWidth;   // restart the arc animation
    if (ea) { ea.style.setProperty('--s', G.pos[a]); ea.classList.add('arcu'); }
    if (eb) { eb.style.setProperty('--s', G.pos[b]); eb.classList.add('arcd'); }
    hgLater(() => step(k + 1), ms + 40);
  };
  step(0);
}
function hgPick(i) {
  const G = hgG; if (G.phase !== 'pick') return;
  G.phase = 'reveal'; G.pick = i;
  const e = hgShellEl(i), ok = i === G.pearl; if (e) e.classList.add('lift', 'pick', ok ? 'ok' : 'bad');
  if (ok) {
    hgShellTip(`${icon('check')}Found it!`);
    if (G.round >= HG_SHELL_ROUNDS) return hgLater(() => hgFinish(true), 700);
    hgLater(() => { G.round++; hgShellRound(); }, 1100);
  } else {
    hgShellTip(`${icon('close')}Not this one…`);
    const p = hgShellEl(G.pearl); hgLater(() => { if (p) p.classList.add('lift'); }, 450);
    hgLater(() => hgFinish(false, 'The pearl got away'), 1300);
  }
}

/* Star Catch: the star sweeps across the bar and back (linear), the zone moves after every catch */
function hgStarZone() { const G = hgG, w = HG_STAR_W[Math.min(G.hits, HG_STAR_W.length - 1)]; G.zw = w; let c; do { c = w / 2 + .05 + Math.random() * (1 - w - .1); } while (Math.abs(c - G.p) < .2); G.zc = c; }
function hgStarLoop() {
  const G = hgG; if (!G || G.id !== 'stars') return;
  const per = HG_STAR_MS[Math.min(G.hits, HG_STAR_MS.length - 1)];
  const tick = now => {
    if (!hgEl || hgG !== G || G.phase !== 'run') return;
    const dt = G.last == null ? 0 : now - G.last; G.last = now;
    G.ph = ((G.ph || 0) + dt / per) % 2;   // 0..2: there and back
    G.p = G.ph < 1 ? G.ph : 2 - G.ph;
    const s = hgEl.querySelector('.hgt-star'); if (s) s.style.setProperty('--p', G.p.toFixed(4));
    G.raf = requestAnimationFrame(tick);
  };
  G.last = null; G.raf = requestAnimationFrame(tick);
}
function hgCatch() {
  const G = hgG; if (!G || G.phase !== 'run') return;
  const hit = Math.abs(G.p - G.zc) <= G.zw / 2 + .012, bar = hgEl.querySelector('.hgt-bar');
  if (bar) { bar.classList.remove('hit', 'miss'); void bar.offsetWidth; bar.classList.add(hit ? 'hit' : 'miss'); }
  if (hit) G.hits++; else G.miss++;
  if (G.hits >= HG_STAR_NEED) { cancelAnimationFrame(G.raf); G.raf = 0; return hgFinish(true); }
  if (G.miss >= HG_STAR_LIVES) { cancelAnimationFrame(G.raf); G.raf = 0; return hgFinish(false, 'Three misses'); }
  if (hit) { hgStarZone(); const z = hgEl.querySelector('.hgt-zone'); if (z) { z.style.setProperty('--zc', G.zc); z.style.setProperty('--zw', G.zw); } cancelAnimationFrame(G.raf); hgStarLoop(); }
  hgEl.querySelectorAll('.hgt-lives i').forEach((e, i) => e.classList.toggle('on', i < HG_STAR_LIVES - G.miss));
  hgEl.querySelectorAll('.hgt-hits i').forEach((e, i) => e.classList.toggle('on', i < G.hits));
  hgBar();
}

INFO.hangout = () => ({ title: 'Guild Hangout', body: `<p class="desc">Three quick minigames to play with your guild every day: <b>Lantern Pairs</b> (find 6 pairs within ${HG_PAIRS} tries), <b>Pearl Shells</b> (follow the pearl ${HG_SHELL_ROUNDS} rounds in a row) and <b>Star Catch</b> (catch the star in the zone ${HG_STAR_NEED} times before ${HG_STAR_LIVES} misses).</p>
  <p class="desc">Completing <b>any</b> game gives <b>${HANG_PEARLS} pearl</b>, up to <b>${HANG_DAILY} pearls a day</b> (new ones at local midnight). After that you can keep playing for fun.</p>` });
