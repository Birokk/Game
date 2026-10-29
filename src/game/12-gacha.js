/* =========================================================
   GACHA
   ========================================================= */
function rate5(pity) { return pity >= HARD_PITY ? 1 : BASE5; }
const BANNER_KEYS = ['limited', 'weekly', 'skins', 'standard'];   // order of the tabs on the summon screen
let curBanner = 'limited';
const limitedUR = () => { const f = findEntry(S.featuredId); return f && f.rarity === 5 && f.pullable !== false ? f : null; };
const standardURs = () => S.pool.filter(e => e.rarity === 5 && e.pullable !== false && e.standard && e.type !== 'pet');
const pullableSSRs = () => S.pool.filter(e => e.rarity === 4 && e.pullable !== false && e.type !== 'pet');
const BANNER_DEFAULT_NAME = { limited: 'Limited Banner', weekly: 'Weekly Spotlight', skins: 'Outfit Wish', standard: 'Pearl Wish' };
const bannerName = bk => (S.banners[bk] && S.banners[bk].name) || BANNER_DEFAULT_NAME[bk];
/* weekly banner: a random pullable UR character, the same for every player, changes every Monday 00:00 UTC */
const WEEK_MS = 7 * 864e5, WEEK_EPOCH = Date.UTC(2024, 0, 1);   // 1 Jan 2024 was a Monday
const weekIndex = (t = Date.now()) => Math.floor((t - WEEK_EPOCH) / WEEK_MS);
const weekEnds = () => WEEK_EPOCH + (weekIndex() + 1) * WEEK_MS;
const weekHash = n => { let x = Math.imul(n ^ 0x9e3779b9, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; return (x ^ x >>> 13) >>> 0; };
/* each cycle of N weeks shows all N URs once, in a shuffled order; the first of a cycle is never the last of the previous one */
function weekPerm(c, len) {
  const a = [...Array(len).keys()]; let x = weekHash(c + 7919);
  for (let i = len - 1; i > 0; i--) { x = weekHash(x + i); const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weeklyUR(w = weekIndex()) {
  let list = S.pool.filter(e => e.type === 'character' && e.rarity === 5 && e.pullable !== false && !e.mc).sort((a, b) => a.id.localeCompare(b.id));
  if (list.length > 1) list = list.filter(e => e.id !== S.featuredId);   // never the limited banner's character
  const len = list.length;
  if (len < 3) return len ? list[w % len] : null;
  const c = Math.floor(w / len), perm = weekPerm(c, len);
  if (perm[0] === weekPerm(c - 1, len)[len - 1]) [perm[0], perm[1]] = [perm[1], perm[0]];
  return list[perm[w % len]];
}
/* outfit banner: pulls give skins (MR wedding skins never); the admin can feature one UR skin */
const pullableSkins = r => S.pool.filter(e => e.type === 'skin' && e.rarity === r && e.pullable !== false);
const skinFeatured = () => { const k = findEntry(S.banners.skins && S.banners.skins.featured); return k && k.type === 'skin' && k.rarity === 5 && k.pullable !== false ? k : null; };
const skinsEnd = () => S.banners.skins && S.banners.skins.end ? +new Date(S.banners.skins.end + 'T23:59:00') : null;
/* everything a banner needs: featured UR (50/50 with a guarantee), the UR pool otherwise, the SSR pool, look and timer */
function bannerInfo(bk) {
  const std = standardURs(), ssr = pullableSSRs();
  if (bk === 'limited') { const f = limitedUR(); return { bk, kind: 'feat', word: 'LIMITED', tab: 'Limited', feat: f, lose: std, ur: std, ssr, ends: +new Date((S.banners.limited.end || '2026-11-11') + 'T23:59:00'), title: `${f ? f.name : 'Limited'} Summon` }; }
  if (bk === 'weekly') { const f = weeklyUR(); return { bk, kind: 'feat', word: 'WEEKLY', tab: 'Weekly', feat: f, lose: std, ur: std, ssr, ends: weekEnds(), title: f ? `${f.name} Spotlight` : bannerName('weekly'), note: 'A new random UR every Monday' }; }
  if (bk === 'skins') { const urs = pullableSkins(5), f = skinFeatured(); return { bk, kind: f ? 'feat' : 'pool', word: 'OUTFITS', tab: 'Outfits', feat: f, lose: urs, ur: urs, ssr: pullableSkins(4), ends: skinsEnd(), title: bannerName('skins'), skins: true }; }
  return { bk, kind: 'pool', word: 'PEARL WISH', tab: 'Permanent', feat: null, lose: std, ur: std, ssr, ends: null, title: bannerName('standard') };
}
/* a summon is paid with summon tickets (1 ticket = 1 pull) when you have enough, otherwise with pearls */
/* each banner has its own ticket: Limited tickets for the limited banner, Wish tickets for the permanent one */
const TK = bk => bk === 'standard' ? 'wishes' : 'tickets';
const TK_NAME = { tickets: 'Limited ticket', wishes: 'Wish ticket' };
const payFor = (n, bk = curBanner) => S.wallet[TK(bk)] >= n ? { k: TK(bk), amt: n } : { k: 'pearls', amt: COST[n] };
const canPull = (n, bk = curBanner) => S.wallet[TK(bk)] >= n || S.wallet.pearls >= COST[n];
const payHTML = (n, bk = curBanner) => { const p = payFor(n, bk); return `<span class="cost">${curIcon(p.k)}${p.k === 'pearls' ? p.amt : '×' + p.amt}</span>`; };
const freeReady = bk => S.freePull[bk] !== dayKey();
function rollOne(bk) {
  const g = S.gacha[bk]; g.pity5++; g.pity4++; g.total++;
  const r = Math.random(), p5 = rate5(g.pity5);
  let rarity = 3;
  if (r < p5) rarity = 5; else if (g.pity4 >= 10 || r < p5 + BASE4) rarity = 4;
  if (rarity === 5) { g.pity5 = 0; g.pity4 = 0; } else if (rarity === 4) g.pity4 = 0;
  let item = null, lost = false;
  const B = bannerInfo(bk);
  if (rarity === 5) {
    if (B.feat) {
      const others = B.lose.filter(e => e.id !== B.feat.id);
      if (g.guarantee || !others.length || Math.random() < .5) { item = B.feat; g.guarantee = false; }
      else { item = rpick(others); g.guarantee = true; lost = true; }
    } else if (B.ur.length) item = rpick(B.ur);   // no featured UR: every UR in the pool has an equal chance
  } else if (rarity === 4) {
    if (B.ssr.length) item = rpick(B.ssr);
  }
  // the lowest tier is 500 gold coins, or sometimes an egg fragment
  const frag = rarity === 3 ? (() => { const x = Math.random(); return x < FRAG_SSR ? 'ssr' : x < FRAG_SSR + FRAG_UR ? 'ur' : null; })() : null;
  let res;
  if (frag) { S.pets.frags[frag]++; res = { kind: 'frag', rarity, frag }; }
  else if (!item) {
    const amount = FILLER_COINS[rarity]; S.wallet.coins += amount;
    res = { kind: 'coins', rarity, amount };
  } else {
    res = { kind: 'entry', id: item.id, rarity, lost, ...grantEntry(item) };
    // Corals for every character pulled; more for copies past max stars
    if (item.type === 'character') { res.starlight = (res.pearls ? STARLIGHT_MAX : STARLIGHT)[rarity] || 0; S.wallet.starlight += res.starlight; }
  }
  res.hard = rarity === 5 && p5 >= 1;   // guaranteed by hard pity: never faked out
  S.wallet.dust += DUST_PER_PULL;
  S.gacha.history.unshift({ name: res.kind === 'coins' ? `${fmt(res.amount)} gold coins` : res.kind === 'frag' ? `${EGG[frag].name} fragment` : item.name, rarity, banner: bk, t: Date.now() });
  if (S.gacha.history.length > 80) S.gacha.history.length = 80;
  return res;
}
function doPull(n, bk = curBanner, free = false) {
  const cost = COST[n];
  if (!S.pool.some(e => e.pullable !== false)) { toast('The summon pool is empty. Add entries in the admin panel.'); return; }
  if (free) { if (!freeReady(bk)) return; S.freePull[bk] = dayKey(); }
  else {
    if (!canPull(n, bk)) { toast(`You need ${n} ${TK_NAME[TK(bk)].toLowerCase()}${n > 1 ? 's' : ''} or ${cost} pearls for this pull.`); return; }
    const pay = payFor(n, bk); S.wallet[pay.k] -= pay.amt;
  }
  const results = Array.from({ length: n }, () => rollOne(bk));
  persist(); renderMenu(); refreshSummon();
  showPull(results, n, bk);
  if (S.settings.skipPull) showSummary();
}

/* summon screen: full screen, banner tabs on the left, character lineup, pull buttons along the bottom */
let smEl = null, smFocus = 0;
function openSummon(bk) {
  if (bk) curBanner = bk;
  closeModal();
  if (!smEl) {
    smEl = document.createElement('div'); smEl.setAttribute('role', 'dialog'); smEl.setAttribute('aria-label', 'Summon');
    document.body.appendChild(smEl);
  }
  renderSummon();
}
function closeSummon() { if (smEl) { smEl.remove(); smEl = null; } }
function refreshSummon() { if (smEl) renderSummon(); }
function renderSummon() {
  if (!smEl) return;
  const bk = curBanner, g = S.gacha[bk], B = bannerInfo(bk), f = B.feat;
  // lineup: the featured UR in the middle with SSRs beside it, or the banner's URs
  let line = f ? [f] : B.ur.slice(0, 5);
  if (f) { const side = B.ssr.filter(e => B.skins || e.type === 'character').slice(0, 4); line = [side[1], side[0], ...line, side[2], side[3]].filter(Boolean); }
  const mid = f ? line.indexOf(f) : Math.floor((line.length - 1) / 2);
  const left = HARD_PITY - g.pity5;
  const tabArt = e => e ? `<img src="${baseSplash(e)}" alt="" class="${baseArt(e) ? '' : 'chibi'}">` : '';
  const dotFor = k => canPull(10, k) || freeReady(k) ? '<span class="dot-n"></span>' : '', dot = dotFor(bk);
  // a hero with uploaded art fills the screen; chibis stand in a lineup
  const hero = f || B.ur[smFocus % Math.max(1, B.ur.length)], heroArt = hero && baseArt(hero);
  const tab = k => { const I = bannerInfo(k), on = k === bk, art = I.feat || I.ur[0];
    return `<button class="sx-tab ${I.kind === 'feat' ? 'lim' : ''} ${on ? 'on' : ''}" data-bk="${k}"><small>${I.tab}${I.ends ? ` · ${shortLeft(I.ends)}` : ''}</small>${tabArt(art)}<b>${esc(I.feat ? I.feat.name : bannerName(k))}${I.kind === 'feat' && !I.skins ? '<br>Summon' : ''}</b>${dotFor(k)}</button>`; };
  const what = B.skins ? 'outfit' : 'character';
  smEl.className = 'sx r5';
  smEl.innerHTML = `<div class="sx-word">${B.word}</div>
    ${heroArt ? `<img class="cs-blur" src="${heroArt}" alt=""><img class="sx-hero" src="${heroArt}" alt="${esc(hero.name)}">` : ''}
    <div class="sx-line" ${heroArt ? 'hidden' : ''}>${line.map((e, i) => `<div class="sx-fig ${i === mid ? 'main' : ''} ${baseArt(e) ? 'art' : 'chibi'}" style="--i:${Math.abs(i - mid)};z-index:${10 - Math.abs(i - mid)}"><img src="${baseSplash(e)}" alt="${esc(e.name)}"></div>`).join('')}</div>
    <div class="sx-fade"></div><div class="sx-vig"></div>
    <div class="sx-top"><button class="cs-back" id="sxBack">${icon('back')}Back</button><button class="cs-help" id="sxHelp" aria-label="Rates and rules">?</button></div>
    <div class="sx-cur">${[TK(bk), 'pearls'].map(k => `<div class="cur" title="${k === 'pearls' ? 'Pearls' : `${TK_NAME[k]}s: 1 ticket = 1 pull on this banner`}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b><button class="plus" data-open="${k === 'pearls' ? 'shop' : 'buytickets'}" data-tkbk="${bk}" aria-label="Get more ${k}">${icon('plus')}</button></div>`).join('')}</div>
    <nav class="sx-tabs" aria-label="Banners">${BANNER_KEYS.map(tab).join('')}</nav>
    <div class="sx-title">
      <h2>${esc(B.title)}</h2>
      ${line.length ? `<p>Summon <span class="g">${left}</span> more time${left === 1 ? '' : 's'}</p>
      <p>Guaranteed <span class="u">UR</span> ${f && g.guarantee ? `<span class="g">${esc(f.name)}</span>` : what}</p>
      ${f ? `<span class="chip ${g.guarantee ? 'gold' : ''}">${g.guarantee ? `Next UR is guaranteed ${esc(f.name)}` : `50/50 for ${esc(f.name)} on your next UR`}</span>${B.ends ? `<span class="lim-time">${icon('clock')}${B.bk === 'weekly' ? 'Changes in' : 'Ends in'} ${shortLeft(B.ends)}</span>` : ''}${B.note ? `<span class="chip">${B.note}</span>` : ''}`
        : `<span class="chip">${B.ur.length} UR ${what}s · equal chance each${B.ends ? ` · ends in ${shortLeft(B.ends)}` : ' · always open'}</span><div class="sx-feat">${B.ur.map((u, i) => `<button class="${u === hero ? 'on' : ''}" data-focus="${i}" aria-label="Show ${esc(u.name)}">${baseThumb(u)}</button>`).join('')}</div>`}`
      : `<p>${B.skins ? 'No UR outfits on this banner yet.' : 'No UR on this banner yet.'}</p><button class="btn ghost sm" data-open="admin" data-adtab="${B.skins ? 'skins' : 'banners'}">${icon('wrench')}Set it up in admin</button>`}
    </div>
    <div class="sx-rule"></div>
    <div class="sx-bl">
      <button class="sx-rb ts" id="sxRates"><span class="c">${icon('info')}</span>Rates</button>
      <button class="sx-rb ts" id="sxHist"><span class="c">${icon('clock')}</span>History</button>
      <button class="sx-rb ts" data-open="shop"><span class="c">${icon('shop')}</span>Shop</button>
    </div>
    <label class="sx-skip ts"><input type="checkbox" id="sxSkip" ${S.settings.skipPull ? 'checked' : ''}><i></i>Skip</label>
    <div class="sx-br">
      ${freeReady(bk) ? `<button class="sx-pull free" id="sxFree">Free daily pull<span class="dot-n"></span></button>` : ''}
      <button class="sx-pull" data-pull="1">Summon 1 ${payHTML(1, bk)}</button>
      <button class="sx-pull gold" data-pull="10">Summon 10 ${payHTML(10, bk)}${dot}</button>
    </div>
    <div class="sx-note">UR pity ${g.pity5}/${HARD_PITY} · SSR pity ${g.pity4}/10 · ${fmt(g.total)} pulls on this banner</div>`;
  $('#sxBack').onclick = closeSummon;
  smEl.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { smFocus = +b.dataset.focus; renderSummon(); });
  smEl.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { curBanner = b.dataset.bk; smFocus = 0; renderSummon(); });
  smEl.querySelectorAll('[data-pull]').forEach(b => b.onclick = () => doPull(+b.dataset.pull, bk));
  const fr = $('#sxFree'); if (fr) fr.onclick = () => doPull(1, bk, true);
  $('#sxSkip').onchange = e => { S.settings.skipPull = e.target.checked; persist(); };
  $('#sxRates').onclick = $('#sxHelp').onclick = () => openRates(bk);
  $('#sxHist').onclick = () => openRates(bk, true);
}
/* rates, pity and history for one banner */
function openRates(bk, histOpen) {
  const g = S.gacha[bk], B = bannerInfo(bk), f = B.feat, what = B.skins ? 'outfit' : 'UR';
  const t = e => new Date(e.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const hist = S.gacha.history.filter(h => (h.banner || 'limited') === bk);
  openModal({ title: B.title, ic: 'sparkle', wide: true, body: `<div class="stack">
    <div class="pity">
      <div class="r5"><div class="row" style="justify-content:space-between"><span>UR pity</span><span style="font-variant-numeric:tabular-nums">${g.pity5} / ${HARD_PITY}</span></div><div class="bar"><i style="width:${g.pity5 / HARD_PITY * 100}%"></i></div></div>
      <div class="r4"><div class="row" style="justify-content:space-between"><span>SSR pity</span><span style="font-variant-numeric:tabular-nums">${g.pity4} / 10</span></div><div class="bar"><i style="width:${g.pity4 * 10}%"></i></div></div>
    </div>
    <table class="rates">
      <tr><td>${rtag(5)}</td><td>${BASE5 * 100}% · guaranteed by pull ${HARD_PITY} · ${f ? `50% ${esc(f.name)}, otherwise ${B.skins ? 'another UR outfit' : 'a permanent UR'} and the next UR is guaranteed featured` : `each of the ${B.ur.length} UR ${B.skins ? 'outfits' : 'characters'} is equally likely`}</td></tr>
      <tr><td>${rtag(4)}</td><td>5.1% · at least one every 10 pulls · ${B.skins ? `one of ${B.ssr.length} SSR outfits` : 'a random SSR'}</td></tr>
      ${B.bk === 'weekly' ? `<tr><td>${icon('clock')}</td><td>The featured UR is picked at random every Monday (00:00 UTC). Next change in ${shortLeft(B.ends)}.</td></tr>` : ''}
      <tr><td><span class="cost">${curIcon('coins')}Gold coins</span></td><td>Everything else: ${fmt(COIN_DROP)} coins (${Math.round((1 - FRAG_SSR - FRAG_UR) * 100)}%), an SSR egg fragment (${FRAG_SSR * 100}%) or a UR egg fragment (${FRAG_UR * 100}%)</td></tr>
    </table>
    <p class="tiny">Each banner keeps its own pity. Each duplicate adds a star to that character, up to ${MAX_STARS}; after that duplicates give ${OVERFLOW_PEARLS[5]} pearls (UR) or ${OVERFLOW_PEARLS[4]} (SSR). If a banner has no UR or SSR to give, you get a bigger bag of gold coins instead.</p>
    <details ${histOpen ? 'open' : ''}><summary>History · ${fmt(g.total)} pulls on this banner</summary>
      <div class="hist">${hist.length ? hist.map(h => `<div class="r${h.rarity}"><span>${h.rarity >= 4 ? rtag(h.rarity) : '<span class="cost">' + curIcon('coins') + '</span>'} ${esc(h.name)}</span><time>${t(h)}</time></div>`).join('') : '<p class="tiny">No pulls yet.</p>'}</div>
    </details>
  </div>` });
}

/* pull animation */
let pullEl = null, pullState = null;
const PAL = { 3: ['#5aa9ff', '#9fd3ff', '#ffffff'], 4: ['#ff8a2a', '#ffb067', '#ffe2b8', '#ffffff'], 5: ['#a855f7', '#ff6ec7', '#3ee6d0', '#c58bff', '#ffffff'] };
const TIER_BURST = { 3: 1, 4: 1.55, 5: 2.1 }, TIER_REVEAL = { 3: 1.6, 4: 2.6, 5: 3.2 };
const rpick = a => a[Math.floor(Math.random() * a.length)];
function resultView(r) {
  if (r.kind === 'coins') return { name: `${fmt(r.amount)} gold coins`, type: 'Gold coins', img: null };
  if (r.kind === 'frag') return { name: `${EGG[r.frag].name} fragment`, type: 'Egg fragment', img: null };
  const e = findEntry(r.id) || { name: '?', type: 'item' };
  return { name: e.name, type: TYPES[e.type], img: baseSplash(e), card: baseCard(e) };
}
/* sparkle sprites: pre-rendered once per color so the reveal can draw hundreds cheaply */
const SPR = new Map();
function sprite(kind, col) {
  const key = kind + col; if (SPR.has(key)) return SPR.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d');
  if (kind === 'flare') {
    c.width = c.height = 128; const m = 64;
    let rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, hexA(col, .55)); rg.addColorStop(.18, hexA(col, .26)); rg.addColorStop(.5, hexA(col, .07)); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const ray = (ang, len, w) => {
      g.save(); g.translate(m, m); g.rotate(ang);
      const lg = g.createLinearGradient(0, -len, 0, len);
      lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(.4, hexA(col, .85)); lg.addColorStop(.5, '#ffffff'); lg.addColorStop(.6, hexA(col, .85)); lg.addColorStop(1, hexA(col, 0));
      g.fillStyle = lg; g.beginPath(); g.moveTo(0, -len); g.lineTo(w, 0); g.lineTo(0, len); g.lineTo(-w, 0); g.closePath(); g.fill(); g.restore();
    };
    ray(0, 63, 2.8); ray(Math.PI / 2, 63, 2.8); ray(Math.PI / 4, 30, 1.5); ray(-Math.PI / 4, 30, 1.5);
    rg = g.createRadialGradient(m, m, 0, m, m, 13); rg.addColorStop(0, '#ffffff'); rg.addColorStop(.4, hexA(col, .9)); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.beginPath(); g.arc(m, m, 13, 0, Math.PI * 2); g.fill();
  } else if (kind === 'dot') {
    c.width = c.height = 32; const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(.25, hexA(col, .9)); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
  } else if (kind === 'bokeh') {
    c.width = c.height = 64; const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, hexA(col, .3)); rg.addColorStop(.72, hexA(col, .2)); rg.addColorStop(.9, hexA(col, .34)); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  } else if (kind === 'streak') {
    c.width = 256; c.height = 12; const lg = g.createLinearGradient(0, 0, 256, 0);
    lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(.5, hexA(col, .85)); lg.addColorStop(1, hexA(col, 0));
    g.fillStyle = lg; g.beginPath(); g.ellipse(128, 6, 128, 2.4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(128, 6, 42, 1.1, 0, 0, Math.PI * 2); g.fill();
  }
  SPR.set(key, c); return c;
}
function blit(g, spr, x, y, w, h, rot, a) {
  if (a <= .01 || w < .5) return;
  g.globalAlpha = Math.min(1, a);
  if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(spr, -w / 2, -h / 2, w, h); g.restore(); }
  else g.drawImage(spr, x - w / 2, y - h / 2, w, h);
}
/* draw a sprite whose color drifts through the palette (UR sparkles shift purple → pink → turquoise) */
function blitShift(g, kind, pal, ph, x, y, w, h, rot, a) {
  const n = pal.length, i = Math.floor(ph) % n, f = ph - Math.floor(ph);
  blit(g, sprite(kind, pal[i]), x, y, w, h, rot, a * (1 - f));
  blit(g, sprite(kind, pal[(i + 1) % n]), x, y, w, h, rot, a * f);
}
const SHIFT = { 3: ['#5aa9ff', '#9fd3ff', '#ffffff'], 4: ['#ff8a2a', '#ffb067', '#ffe2b8'], 5: ['#a855f7', '#ff6ec7', '#3ee6d0'] };
const SPARK = {
  3: { secs: 1.4, flare: 1.2, twk: 10, dust: 18, bokeh: 1.5, size: .7, nova: 14 },
  4: { secs: 2.8, flare: 4, twk: 24, dust: 46, bokeh: 4, size: .9, nova: 26 },
  5: { secs: 3.4, flare: 6.5, twk: 36, dust: 72, bokeh: 5.5, size: 1.1, nova: 36 }
};
const easeBack = x => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

/* canvas particles: meteor sparks, charge-in streaks, burst, reveal sparkles */
function startPfx(canvas, tier) {
  const g = canvas.getContext('2d'), parts = [], t0 = performance.now(), tB = TIER_BURST[tier];
  let W2 = 0, H2 = 0, dpr2 = 1, raf = 0, last = t0, burstDone = false, sparkTier = 0, sparkFrom = 0, sparkUntil = 0;
  const acc = { flare: 0, twk: 0, dust: 0, bokeh: 0 };
  const spark = (sp, o) => parts.push(Object.assign({ sp, life: 1, max: 1, size: 10, rot: Math.random() * Math.PI, vr: (Math.random() - .5) * 1.6, ph: Math.random() * 3, dph: .8 + Math.random() * 1.2, seed: Math.random() * 100, vx: 0, vy: 0 }, o));
  const fit = () => { dpr2 = Math.min(2, devicePixelRatio || 1); W2 = canvas.clientWidth; H2 = canvas.clientHeight; canvas.width = W2 * dpr2; canvas.height = H2 * dpr2; };
  fit(); addEventListener('resize', fit);
  const add = (x, y, vx, vy, life, size, col, streak, phys = true) => parts.push({ x, y, vx, vy, life, max: life, size, col, streak, phys });
  const api = {
    intro: true,
    burst(n, speed, palTier = tier) { const pal = PAL[palTier]; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random()); add(W2 / 2, H2 / 2, Math.cos(a) * s, Math.sin(a) * s, 0.7 + Math.random() * 1.1, 1.4 + Math.random() * 3, rpick(pal), Math.random() < .45); } },
    sparkle(sTier) {
      const cfg = SPARK[sTier]; sparkTier = sTier; sparkFrom = performance.now(); sparkUntil = sparkFrom + cfg.secs * 1000;
      Object.keys(acc).forEach(k => acc[k] = 0);
      // opening nova: a ring of stars bursting out from the center
      for (let i = 0; i < cfg.nova; i++) {
        const a = i / cfg.nova * Math.PI * 2 + Math.random() * .2, v = 420 + Math.random() * 380, life = .7 + Math.random() * .5;
        spark('twk', { x: W2 / 2, y: H2 * .48, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: (14 + Math.random() * 14) * cfg.size, drag: true });
      }
      for (let i = 0; i < 3; i++) { const life = 1.1 + i * .2; spark('flare', { x: W2 / 2 + (Math.random() - .5) * W2 * .5, y: H2 * (.25 + Math.random() * .4), life, max: life, size: (46 + Math.random() * 26) * cfg.size }); }
    },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', fit); }
  };
  function frame(now) {
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
    const pal = PAL[tier];
    if (api.intro) {
      if (t < 1) {
        const e = Math.pow(t, 1.7), hx = W2 * (0.88 - 0.38 * e), hy = H2 * (-0.06 + 0.56 * e);
        for (let k = 0; k < 3; k++) add(hx, hy, (Math.random() - .3) * 80, (Math.random() - .8) * 80, .4 + Math.random() * .5, 1 + Math.random() * 2.4, rpick(pal), false);
      }
      if (tier > 3 && t > 1 && t < tB - .1) {
        for (let k = 0; k < (tier === 5 ? 7 : 4); k++) {
          const a = Math.random() * Math.PI * 2, R = Math.max(W2, H2) * 0.6, x = W2 / 2 + Math.cos(a) * R, y = H2 / 2 + Math.sin(a) * R, dur = .45 + Math.random() * .35;
          add(x, y, (W2 / 2 - x) / dur, (H2 / 2 - y) / dur, dur, 1.2 + Math.random() * 2, rpick(pal), true, false);
        }
      }
      if (!burstDone && t >= tB) { burstDone = true; api.burst(tier === 5 ? 260 : tier === 4 ? 150 : 50, tier === 5 ? 1000 : tier === 4 ? 760 : 420); }
    }
    // layered sparkles while a character is revealed; spawning eases off, then everything fades out
    if (now < sparkUntil) {
      const cfg = SPARK[sparkTier], left = (sparkUntil - now) / (sparkUntil - sparkFrom), k = dt * (.25 + .75 * left), sz = cfg.size;
      acc.flare += cfg.flare * k; acc.twk += cfg.twk * k; acc.dust += cfg.dust * k; acc.bokeh += cfg.bokeh * k;
      while (acc.flare >= 1) { acc.flare--; const life = 1 + Math.random() * .7; spark('flare', { x: Math.random() * W2, y: Math.random() * H2 * .85, life, max: life, size: (28 + Math.random() * 40) * sz }); }
      while (acc.twk >= 1) { acc.twk--; const life = .45 + Math.random() * .55; spark('twk', { x: Math.random() * W2, y: Math.random() * H2 * .92, life, max: life, size: (10 + Math.random() * 18) * sz }); }
      while (acc.dust >= 1) { acc.dust--; const life = 1.3 + Math.random() * 1.3; spark('dust', { x: Math.random() * W2, y: H2 * (.2 + Math.random() * .85), vx: (Math.random() - .5) * 20, vy: -(18 + Math.random() * 55), life, max: life, size: (2 + Math.random() * 4.5) * sz }); }
      while (acc.bokeh >= 1) { acc.bokeh--; const life = 2.2 + Math.random() * 1.4; spark('bokeh', { x: Math.random() * W2, y: H2 * (.3 + Math.random() * .8), vx: (Math.random() - .5) * 10, vy: -(10 + Math.random() * 22), life, max: life, size: (28 + Math.random() * 60) * sz }); }
    }
    g.setTransform(dpr2, 0, 0, dpr2, 0, 0); g.clearRect(0, 0, W2, H2); g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.sp) {
        const q = 1 - p.life / p.max, pal = SHIFT[sparkTier] || SHIFT[3];
        p.rot += p.vr * dt; p.ph += p.dph * dt;
        if (p.drag) { p.vx *= .93; p.vy *= .93; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.sp === 'flare') {
          // big lens-flare star: pops in, glows, then shrinks away, throwing off a few glints at its peak
          const pop = q < .22 ? easeBack(q / .22) : 1 - (q - .22) / .78 * .65;
          const a = Math.min(1, q / .1) * Math.pow(1 - q, .7), s = p.size * Math.max(0, pop);
          blitShift(g, 'flare', pal, p.ph, p.x, p.y, s * 2.2, s * 2.2, p.rot, a);
          blitShift(g, 'streak', pal, p.ph + .5, p.x, p.y, s * 5.5, s * .32, 0, a * .75);
          blitShift(g, 'flare', pal, p.ph + 1, p.x, p.y, s * 1.1, s * 1.1, -p.rot * 1.6 + .785, a * .55);
          if (!p.popped && q > .28) {
            p.popped = true;
            for (let k = 0; k < 9; k++) { const ang = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160, life = .6 + Math.random() * .6; spark('dust', { x: p.x, y: p.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life, max: life, size: 2 + Math.random() * 3, drag: true }); }
          }
        } else if (p.sp === 'twk') {
          const a = Math.sin(Math.PI * q) * (.6 + .4 * Math.sin(now * 26 + p.seed)), s = p.size * (.4 + .6 * Math.sin(Math.PI * q));
          blitShift(g, 'flare', pal, p.ph, p.x, p.y, s * 1.6, s * 1.6, p.rot, a);
        } else if (p.sp === 'dust') {
          p.vx += Math.sin(now * 2.4 + p.seed) * 14 * dt;
          const a = Math.sin(Math.PI * q) * (.45 + .55 * Math.abs(Math.sin(now * 18 + p.seed)));
          blitShift(g, 'dot', pal, p.ph, p.x, p.y, p.size * 2.4, p.size * 2.4, 0, a);
        } else {
          blitShift(g, 'bokeh', pal, p.ph, p.x, p.y, p.size, p.size, 0, Math.sin(Math.PI * q) * .8);
        }
        continue;
      }
      if (p.phys) { p.vx *= 0.975; p.vy = p.vy * 0.975 + 40 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.life / p.max * 1.5); g.globalAlpha = a;
      if (p.streak) { g.strokeStyle = p.col; g.lineWidth = p.size * .8; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .045, p.y - p.vy * .045); g.stroke(); }
      else { g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return api;
}
/* fakeout: now and then a UR pull starts out looking like an SSR and transforms mid-intro (never when hard pity guaranteed the UR) */
const FAKEOUT_CHANCE = .3;
function showPull(results, n, bk) {
  closePull(true);
  const best = Math.max(...results.map(r => r.rarity));
  const fake = best === 5 && !results.some(r => r.rarity === 5 && r.hard) && Math.random() < FAKEOUT_CHANCE;
  const shown = fake ? 4 : best;
  pullEl = document.createElement('div');
  pullEl.className = `pull t${shown} r${shown}`;
  pullEl.setAttribute('role', 'dialog'); pullEl.setAttribute('aria-label', 'Summon results');
  pullEl.innerHTML = `<div class="meteor-wrap"><div class="meteor"></div></div><div class="orb"></div><div class="rings"><i></i><i></i><i></i></div><div class="flash"></div>
    ${shown >= 4 ? `<div class="stamp">${RNAME[shown]}</div>` : ''}<div id="pullStage"></div><canvas class="pfx"></canvas><button class="btn ghost sm pull-skip" id="pullSkip">Skip</button>`;
  document.body.appendChild(pullEl);
  const order = results.map((r, i) => i).filter(i => results[i].kind === 'entry');
  pullState = { results, n, bk, i: -1, phase: 'intro', readyAt: 0, order: order.length ? order : [0], fx: startPfx(pullEl.querySelector('.pfx'), shown) };
  pullEl.addEventListener('click', e => { if (e.target.closest('button')) return; tapPull(); });
  $('#pullSkip').onclick = showSummary;
  if (fake) pullState.timer = setTimeout(fakeoutUpgrade, (TIER_BURST[4] + .8) * 1000);   // while the SSR stamp is showing
  else pullState.timer = setTimeout(advancePull, TIER_REVEAL[best] * 1000);
}
function fakeoutUpgrade() {
  const st = pullState; if (!st || st.phase !== 'intro' || !pullEl) return;
  pullEl.classList.remove('t4', 'r4'); pullEl.classList.add('t5', 'r5', 'fakeout');
  const old = pullEl.querySelector('.stamp'); if (old) old.remove();
  pullEl.insertAdjacentHTML('beforeend', `<div class="fake-orb"></div><div class="fake-rings"><i></i><i></i><i></i></div><div class="fake-crack"></div><div class="fake-flash"></div><div class="stamp up">${RNAME[5]}</div>`);
  if (st.fx) st.fx.stop();
  st.fx = startPfx(pullEl.querySelector('.pfx'), 5);
  st.timer = setTimeout(advancePull, 2300);
}
/* taps only move between reveals: the intro always plays (use Skip to jump), and each reveal holds briefly so a double tap can't skip it */
function tapPull() {
  const st = pullState; if (!st || st.phase !== 'reveal' || performance.now() < st.readyAt) return;
  advancePull();
}
function advancePull() {
  const st = pullState; if (!st || st.phase === 'summary') return;
  clearTimeout(st.timer);
  st.i++; st.phase = 'reveal'; st.readyAt = performance.now() + 900;
  if (st.fx) st.fx.intro = false;
  if (st.i >= st.order.length) return showSummary();
  const r = st.results[st.order[st.i]], v = resultView(r);
  pullEl.classList.add('revealing');
  pullEl.classList.remove('r3', 'r4', 'r5'); pullEl.classList.add('r' + r.rarity);
  $('#pullStage').innerHTML = `<div class="rv r${r.rarity} ${v.img ? 'has-art' : ''} ">
    <div class="rv-rays"></div><div class="rv-glow"></div>
    ${v.img ? `<img class="rv-blur" src="${v.img}" alt=""><img class="rv-splash" src="${v.img}" alt="">` : `<div class="rv-coin">${curIcon(r.kind === 'frag' ? 'frag' + r.frag : 'coins')}</div>`}
    <div class="rv-flash"></div><div class="rv-sweep"></div>
    <div class="rv-info">
      <div class="eyebrow" style="color:rgba(255,255,255,.75)">${esc(v.type)}</div>
      <div class="rv-name">${esc(v.name)}</div>
      ${r.kind === 'entry' ? `<div class="rv-tier">${rtag(r.rarity, 'xl')}</div>` : ''}
      ${r.lost ? `<span class="rv-badge dupe">Lost the 50/50 · next UR is guaranteed</span>` : ''}
      ${r.kind === 'entry' ? (r.isNew ? '<span class="rv-badge">New</span>'
        : r.starUp ? `<div class="rv-up">${starRow(r.starUp, r.starUp - 1)}<span>${r.starUp === MAX_STARS ? 'Max stars reached' : `Star ${r.starUp} of ${MAX_STARS}`}</span></div>`
        : `<div class="rv-up">${hasStars(findEntry(r.id)) ? starRow(MAX_STARS) : ''}<span>${hasStars(findEntry(r.id)) ? 'Max stars' : 'Already owned'} · +${r.pearls} ${curIcon('pearls')}</span></div>`) : ''}
    </div>
    ${st.order.length > 1 ? `<div class="rv-count">${st.i + 1} / ${st.order.length}</div>` : ''}
    <div class="rv-hint">Tap to continue</div>
  </div>`;
  if (st.fx) setTimeout(() => st.fx && st.fx.sparkle(r.rarity), 80);
}
function showSummary() {
  const st = pullState; if (!st) return;
  clearTimeout(st.timer); st.phase = 'summary';
  if (st.fx) st.fx.intro = false;
  pullEl.classList.add('revealing');
  $('#pullSkip').hidden = true;
  const one = st.results.length === 1;
  $('#pullStage').innerHTML = `<div class="sum">
    <h2>Summon results</h2>
    <div class="sum-grid ${one ? 'one' : ''}">${st.results.map((r, i) => { const v = resultView(r); return `<div class="scard r${r.rarity}" style="--i:${i}">
      ${v.card ? `<img src="${v.card}" alt="">` : `<div class="coinbox">${curIcon(r.kind === 'frag' ? 'frag' + r.frag : 'coins')}</div>`}
      ${r.isNew ? '<span class="new">NEW</span>' : ''}
      <div class="foot"><span class="st">${r.kind === 'coins' ? 'Gold coins' : r.kind === 'frag' ? 'Egg fragment' : rtag(r.rarity)}</span><span class="nm">${esc(v.name)}</span>${r.starUp ? `<span class="dp">${starRow(r.starUp, r.starUp - 1)}</span>` : r.pearls ? `<span class="dp">+${r.pearls} pearls</span>` : ''}</div></div>`; }).join('')}</div>
    <div class="row" style="justify-content:center">
      <button class="btn gold" id="pullAgain">Pull ×${st.n} again${payHTML(st.n, st.bk)}</button>
      <button class="btn ghost" id="pullDone">Done</button>
    </div>
    <p class="sum-earn"><span class="cost">${curIcon('dust')}+${st.results.length * DUST_PER_PULL} Seaweeds</span>${st.results.reduce((a, r) => a + (r.starlight || 0), 0) ? `<span class="cost">${curIcon('starlight')}+${st.results.reduce((a, r) => a + (r.starlight || 0), 0)} Corals</span>` : ''}</p>
    <p class="tiny" style="color:rgba(255,255,255,.65)">Pearls left: ${fmt(S.wallet.pearls)}</p>
  </div>`;
  $('#pullAgain').onclick = () => doPull(st.n, st.bk);
  $('#pullDone').onclick = () => closePull();
  $('#pullDone').focus({ preventScroll: true });
}
function closePull(silent) {
  if (pullState) { clearTimeout(pullState.timer); if (pullState.fx) pullState.fx.stop(); }
  if (pullEl) pullEl.remove(); pullEl = null; pullState = null;
  if (!silent) { refreshSummon(); refreshCharacters(); }
}
