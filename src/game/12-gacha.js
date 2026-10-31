/* =========================================================
   GACHA
   ========================================================= */
function rate5(pity) { return pity >= HARD_PITY ? 1 : BASE5; }
const BANNER_KEYS = ['limited', 'weekly', 'skins', 'memories', 'standard'];   // order of the tabs on the summon screen
let curBanner = 'limited';
const limitedUR = () => { const f = findEntry(S.featuredId); return f && f.rarity === 5 && f.pullable !== false ? f : null; };
const standardURs = () => S.pool.filter(e => e.rarity === 5 && e.pullable !== false && e.standard && e.type !== 'pet');
const pullableSSRs = () => S.pool.filter(e => e.rarity === 4 && e.pullable !== false && e.type !== 'pet');
const BANNER_DEFAULT_NAME = { limited: 'Limited Banner', weekly: 'Weekly Spotlight', skins: 'Outfit Wish', memories: 'Memory Wish', standard: 'Pearl Wish' };
/* memory banner: pulls give memories at double the usual UR / SSR rates, paid with Standard tickets */
const pullableMems = r => (S.memories || []).filter(m => +m.rarity === r).map(m => memEntry(m.id));
const RATE_X = bk => bk === 'memories' ? 2 : 1;
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
  if (bk === 'memories') { const urs = pullableMems(5); return { bk, kind: 'pool', word: 'MEMORIES', tab: 'Memories', feat: null, lose: urs, ur: urs, ssr: pullableMems(4), ends: null, title: bannerName('memories'), mems: true, note: 'Double UR and SSR rates' }; }
  return { bk, kind: 'pool', word: 'PEARL WISH', tab: 'Permanent', feat: null, lose: std, ur: std, ssr, ends: null, title: bannerName('standard') };
}
/* a summon is paid with summon tickets (1 ticket = 1 pull) when you have enough, otherwise with pearls */
/* each banner has its own ticket: Limited tickets for the limited banner, Standard tickets for the permanent one */
const TK = bk => bk === 'standard' || bk === 'memories' ? 'wishes' : 'tickets';
const TK_NAME = { tickets: 'Limited ticket', wishes: 'Standard ticket' };
const payFor = (n, bk = curBanner) => S.wallet[TK(bk)] >= n ? { k: TK(bk), amt: n } : { k: 'pearls', amt: COST[n] };
const canPull = (n, bk = curBanner) => S.wallet[TK(bk)] >= n || S.wallet.pearls >= COST[n];
const payHTML = (n, bk = curBanner) => { const p = payFor(n, bk); return `<span class="cost">${curIcon(p.k)}${p.k === 'pearls' ? p.amt : '×' + p.amt}</span>`; };
const freeReady = bk => S.freePull[bk] !== dayKey();
/* a UR from a banner: featured banners use the 50/50 (a guarantee after a loss), pool banners pick evenly */
function pickUR(B, g) {
  if (B.feat) {
    const others = B.lose.filter(e => e.id !== B.feat.id);
    if (g.guarantee || !others.length || Math.random() < .5) { g.guarantee = false; return { item: B.feat, lost: false }; }
    g.guarantee = true; return { item: rpick(others), lost: true };
  }
  return { item: B.ur.length ? rpick(B.ur) : null, lost: false };   // no featured UR: every UR in the pool has an equal chance
}
/* SSR → UR upgrade (1% of SSR pulls): the SSR is taken back and a UR is given with the banner's usual rules
   (50/50 on featured banners, the featured UR straight away when guaranteed); counts as a UR for pity */
const UPGRADE_CHANCE = .01;
function upgradeSSR(B, g, res) {
  if (!B.feat && !B.ur.length) return null;
  const ssr = findEntry(res.id);
  S.owned[res.id] = (S.owned[res.id] || 1) - 1; if (!S.owned[res.id]) delete S.owned[res.id];
  S.wallet.starlight -= res.starlight || 0;
  const { item, lost } = pickUR(B, g); if (!item) return null;
  g.pity5 = 0; g.pity4 = 0;
  const out = { kind: 'entry', id: item.id, rarity: 5, lost, ...grantEntry(item), up: { id: ssr.id, name: ssr.name } };
  if (item.type === 'character') { out.starlight = (out.maxed ? STARLIGHT_MAX : STARLIGHT)[5] || 0; S.wallet.starlight += out.starlight; }
  return { res: out, item };
}
function rollOne(bk) {
  const g = S.gacha[bk]; g.pity5++; g.pity4++; g.total++;
  const r = Math.random(), x = RATE_X(bk), p5 = Math.min(1, rate5(g.pity5) * x);
  let rarity = 3;
  if (r < p5) rarity = 5; else if (g.pity4 >= 10 || r < p5 + BASE4 * x) rarity = 4;
  if (rarity === 5) { g.pity5 = 0; g.pity4 = 0; } else if (rarity === 4) g.pity4 = 0;
  let item = null, lost = false;
  const B = bannerInfo(bk);
  if (rarity === 5) ({ item, lost } = pickUR(B, g));
  else if (rarity === 4) {
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
    if (item.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[rarity] || 0; S.wallet.starlight += res.starlight; }
    // the rare upgrade: an SSR turns into a UR after it is revealed
    if (rarity === 4 && Math.random() < UPGRADE_CHANCE) { const up = upgradeSSR(B, g, res); if (up) { res = up.res; item = up.item; rarity = 5; } }
  }
  res.hard = rarity === 5 && p5 >= 1 && !res.up;   // guaranteed by hard pity: never faked out
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
  if (QUEST_CHAR_BANNERS.includes(bk)) questAdd('summon');
  gainExp(EXP.pull * n);
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
  const what = B.skins ? 'outfit' : B.mems ? 'memory' : 'character';
  smEl.className = 'sx r5';
  smEl.innerHTML = `<div class="sx-word">${B.word}</div>
    ${heroArt ? `<img class="cs-blur" src="${heroArt}" alt=""><img class="sx-hero" src="${heroArt}" alt="${esc(hero.name)}">` : ''}
    <div class="sx-line" ${heroArt ? 'hidden' : ''}>${line.map((e, i) => `<div class="sx-fig ${i === mid ? 'main' : ''} ${baseArt(e) ? 'art' : 'chibi'}" style="--i:${Math.abs(i - mid)};z-index:${10 - Math.abs(i - mid)}"><img src="${baseSplash(e)}" alt="${esc(e.name)}"></div>`).join('')}</div>
    <div class="sx-fade"></div><div class="sx-vig"></div>
    <div class="sx-top"><button class="cs-back" id="sxBack">${icon('back')}Back</button><button class="cs-help" id="sxHelp" aria-label="Rates and rules">?</button></div>
    <div class="sx-cur">${[TK(bk), 'pearls'].map(k => `<div class="cur" title="${k === 'pearls' ? 'Pearls' : `${TK_NAME[k]}s: 1 ticket = 1 pull on this banner`}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b><button class="plus" data-open="${k === 'pearls' ? 'shop' : 'buytickets'}" ${k === 'pearls' ? 'data-shoptab="topup"' : ''} data-tkbk="${bk}" aria-label="Get more ${k}">${icon('plus')}</button></div>`).join('')}</div>
    <nav class="sx-tabs" aria-label="Banners">${BANNER_KEYS.map(tab).join('')}</nav>
    <div class="sx-title">
      <h2>${esc(B.title)}</h2>
      ${line.length ? `<p>Summon <span class="g">${left}</span> more time${left === 1 ? '' : 's'}</p>
      <p>Guaranteed <span class="u">UR</span> ${f && g.guarantee ? `<span class="g">${esc(f.name)}</span>` : what}</p>
      ${f ? `<span class="chip ${g.guarantee ? 'gold' : ''}">${g.guarantee ? `Next UR is guaranteed ${esc(f.name)}` : `50/50 for ${esc(f.name)} on your next UR`}</span>${B.ends ? `<span class="lim-time">${icon('clock')}${B.bk === 'weekly' ? 'Changes in' : 'Ends in'} ${shortLeft(B.ends)}</span>` : ''}${B.note ? `<span class="chip">${B.note}</span>` : ''}`
        : `<span class="chip">${B.ur.length} UR ${what === 'memory' ? 'memories' : what + 's'} · equal chance each${B.ends ? ` · ends in ${shortLeft(B.ends)}` : ' · always open'}</span><div class="sx-feat">${B.ur.map((u, i) => `<button class="${u === hero ? 'on' : ''}" data-focus="${i}" aria-label="Show ${esc(u.name)}">${baseThumb(u)}</button>`).join('')}</div>`}`
      : `<p>${B.skins ? 'No UR outfits on this banner yet.' : B.mems ? 'No UR memories yet.' : 'No UR on this banner yet.'}</p><button class="btn ghost sm" data-open="admin" data-adtab="${B.skins ? 'skins' : B.mems ? 'memories' : 'banners'}">${icon('wrench')}Set it up in admin</button>`}
    </div>
    <div class="sx-rule"></div>
    <div class="sx-bl">
      <button class="sx-rb ts" id="sxRates"><span class="c">${icon('info')}</span>Rates</button>
      <button class="sx-rb ts" id="sxHist"><span class="c">${icon('clock')}</span>History</button>
      <button class="sx-rb ts" data-open="shop"><span class="c">${icon('shop')}</span>Shop</button>
    </div>
    ${bk === 'standard' ? milestoneBtn() : ''}
    <label class="sx-skip ts"><input type="checkbox" id="sxSkip" ${S.settings.skipPull ? 'checked' : ''}><i></i>Skip</label>
    <div class="sx-br">
      ${freeReady(bk) ? `<button class="sx-pull free" id="sxFree">Free daily pull<span class="dot-n"></span></button>` : ''}
      <button class="sx-pull" data-pull="1">Summon 1 ${payHTML(1, bk)}</button>
      <button class="sx-pull gold" data-pull="10">Summon 10 ${payHTML(10, bk)}${dot}</button>
    </div>`;
  $('#sxBack').onclick = closeSummon;
  smEl.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { smFocus = +b.dataset.focus; renderSummon(); });
  smEl.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { curBanner = b.dataset.bk; smFocus = 0; renderSummon(); });
  smEl.querySelectorAll('[data-pull]').forEach(b => b.onclick = () => doPull(+b.dataset.pull, bk));
  const fr = $('#sxFree'); if (fr) fr.onclick = () => doPull(1, bk, true);
  $('#sxSkip').onchange = e => { S.settings.skipPull = e.target.checked; persist(); };
  $('#sxRates').onclick = $('#sxHelp').onclick = () => openRates(bk);
  const ms = $('#sxMile'); if (ms) ms.onclick = confirmMilestone;
  $('#sxHist').onclick = () => openRates(bk, true);
}
/* permanent banner milestone: after the first 100 pulls on it, one free random permanent UR (once) */
const MILESTONE_PULLS = 100;
const mileN = () => Math.min(MILESTONE_PULLS, S.gacha.standard.total || 0), mileDone = () => !!S.gacha.standard.mile;
function milestoneBtn() {
  const n = mileN(), ready = n >= MILESTONE_PULLS && !mileDone();
  return `<button class="sx-mile ${ready ? 'ready' : ''} ${mileDone() ? 'done' : ''}" id="sxMile" style="--p:${n / MILESTONE_PULLS * 360}deg" aria-label="Milestone: ${n} of ${MILESTONE_PULLS} pulls"><span class="sx-mile-in">${mileDone() ? icon('check') : `<b>${n}</b><small>/${MILESTONE_PULLS}</small>`}</span><span class="sx-mile-lb">${mileDone() ? 'Claimed' : ready ? 'Claim UR' : 'Milestone'}</span></button>`;
}
function confirmMilestone() {
  if (mileDone()) { toast('You already claimed the 100-pull milestone.'); return; }
  const n = mileN();
  if (n < MILESTONE_PULLS) { toast(`Pull ${MILESTONE_PULLS - n} more time${MILESTONE_PULLS - n === 1 ? '' : 's'} on this banner to claim a free random UR.`); return; }
  const urs = standardURs(); if (!urs.length) { toast('There are no permanent URs yet.'); return; }
  openModal({ title: 'Milestone reward', ic: 'sparkle', small: true, body: `<div class="stack" style="justify-content:center;justify-items:center;text-align:center"><p class="desc">You reached ${MILESTONE_PULLS} pulls on the permanent banner. Claim a free random UR from it?</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="msNo">Later</button><button class="btn gold" id="msYes">${icon('sparkle')}Claim</button></div></div>`,
    onMount: () => { $('#msNo').onclick = closeModal; $('#msYes').onclick = () => {
      closeModal(); const item = rpick(urs), res = { kind: 'entry', id: item.id, rarity: 5, lost: false, hard: true, ...grantEntry(item) };
      if (item.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[5] || 0; S.wallet.starlight += res.starlight; }
      S.gacha.standard.mile = true; S.gacha.history.unshift({ name: item.name, rarity: 5, banner: 'standard', t: Date.now() });
      persist(); renderMenu(); refreshSummon(); showPull([res], 1, 'standard', { preview: true, milestone: true, fake: false, rainbow: false });
    }; } });
}
/* rates, pity and history for one banner */
function openRates(bk, histOpen) {
  const g = S.gacha[bk], B = bannerInfo(bk), f = B.feat, what = B.skins ? 'outfit' : 'UR', X = RATE_X(bk);
  const t = e => new Date(e.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const hist = S.gacha.history.filter(h => (h.banner || 'limited') === bk);
  openModal({ title: B.title, ic: 'sparkle', wide: true, body: `<div class="stack">
    <div class="pity">
      <div class="r5"><div class="row" style="justify-content:space-between"><span>UR pity</span><span style="font-variant-numeric:tabular-nums">${g.pity5} / ${HARD_PITY}</span></div><div class="bar"><i style="width:${g.pity5 / HARD_PITY * 100}%"></i></div></div>
      <div class="r4"><div class="row" style="justify-content:space-between"><span>SSR pity</span><span style="font-variant-numeric:tabular-nums">${g.pity4} / 10</span></div><div class="bar"><i style="width:${g.pity4 * 10}%"></i></div></div>
    </div>
    <table class="rates">
      <tr><td>${rtag(5)}</td><td>${+(BASE5 * X * 100).toFixed(2)}% · guaranteed by pull ${HARD_PITY} · ${f ? `50% ${esc(f.name)}, otherwise ${B.skins ? 'another UR outfit' : 'a permanent UR'} and the next UR is guaranteed featured` : `each of the ${B.ur.length} UR ${B.skins ? 'outfits' : B.mems ? 'memories' : 'characters'} is equally likely`}</td></tr>
      <tr><td>${rtag(4)}</td><td>${+(BASE4 * X * 100).toFixed(2)}% · at least one every 10 pulls · ${B.skins ? `one of ${B.ssr.length} SSR outfits` : B.mems ? `one of ${B.ssr.length} SSR memories` : 'a random SSR'}</td></tr>
      ${B.bk === 'weekly' ? `<tr><td>${icon('clock')}</td><td>The featured UR is picked at random every Monday (00:00 UTC). Next change in ${shortLeft(B.ends)}.</td></tr>` : ''}
      <tr><td><span class="cost">${curIcon('coins')}Gold coins</span></td><td>Everything else: ${fmt(COIN_DROP)} coins (${Math.round((1 - FRAG_SSR - FRAG_UR) * 100)}%), an SSR egg fragment (${FRAG_SSR * 100}%) or a UR egg fragment (${FRAG_UR * 100}%)</td></tr>
    </table>
    <p class="tiny">Each banner keeps its own pity. Each duplicate adds a star to that character, up to ${MAX_STARS}; after that duplicate characters give ${STARLIGHT_MAX[5]} Corals (UR) or ${STARLIGHT_MAX[4]} (SSR) instead of a star. If a banner has no UR or SSR to give, you get a bigger bag of gold coins instead.</p>
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
    burst(n, speed, palTier = tier) { const pal = PAL[palTier]; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.25 + Math.random()); add(W2 / 2, H2 / 2, Math.cos(a) * s, Math.sin(a) * s, 0.7 + Math.random() * 1.1, 1.4 + Math.random() * 3, rpick(pal), false); } },
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
/* pull intro: pull the screen down to release a magic sphere; it rises slowly and changes colour from blue (lowest)
   through orange (SSR) to prism (UR), stopping at the best rarity in the pull, then bursts into the reveals.
   Fakeout: now and then a UR pull stops at orange, a character wallpaper (admin → Summon animation, S.fakeArts) slides in,
   and the sphere transforms into UR. Never when hard pity guaranteed the UR. */
const FAKEOUT_CHANCE = .3;
function fakeArt() {
  const own = (S.fakeArts || []).map(k => MEDIA.get(k)).filter(Boolean);
  if (own.length) return rpick(own);
  const f = findEntry(S.featuredId); return f ? baseSplash(f) : null;
}
function showPull(results, n, bk, opts = {}) {
  closePull(true);
  const best = Math.max(...results.map(r => r.up ? 4 : r.rarity));
  const fake = best === 5 && !results.some(r => r.rarity === 5 && !r.up && r.hard) && (opts.fake ?? Math.random() < FAKEOUT_CHANCE);
  // rainbow: when the pull holds the limited banner's featured UR, half the time the UR sphere turns rainbow (a sure sign)
  const featId = bk === 'limited' && bannerInfo('limited').feat ? bannerInfo('limited').feat.id : null;
  const rainbow = best === 5 && (opts.rainbow ?? (!!featId && results.some(r => r.rarity === 5 && !r.up && r.id === featId) && Math.random() < RAINBOW_CHANCE));
  pullEl = document.createElement('div');
  const pbg = MEDIA.get('pull:bg');
  pullEl.className = `pull t3 r3 charging ${pbg ? 'has-bg' : ''}`;
  pullEl.setAttribute('role', 'dialog'); pullEl.setAttribute('aria-label', 'Summon results');
  pullEl.innerHTML = `${pbg ? `<img class="pull-bg" src="${pbg}" alt="">` : ''}<div class="sph-stage"><canvas class="sph-back"></canvas><div class="sph-beam"></div><div class="sph c3" id="sph"><i class="sph-swirl"></i><i class="sph-core"></i><i class="sph-ring"></i><i class="sph-band"></i><i class="sph-band b2"></i></div><canvas class="sph-front"></canvas></div>
    <div class="sph-hint tap" id="sphHint"><b>Tap to release</b><span class="tap-ring"></span></div>
    <div id="pullStage"></div><canvas class="pfx"></canvas><button class="btn ghost sm pull-skip" id="pullSkip">Skip</button>`;
  document.body.appendChild(pullEl);
  const fx = startPfx(pullEl.querySelector('.pfx'), 3); fx.intro = false;
  pullState = { results, n, bk, best, fake, rainbow, preview: !!opts.preview, exchange: !!opts.exchange, milestone: !!opts.milestone, i: -1, phase: 'charge', readyAt: 0, order: results.map((r, i) => i), fx, timers: [] };
  pullState.sfx = startSphereFx(pullEl);
  pullEl.addEventListener('click', e => { if (e.target.closest('button')) return; tapPull(); });
  $('#pullSkip').onclick = () => pullState && pullState.exchange ? closePull() : showSummary();
  // tap anywhere to release (Enter / Space / ↓ also work)
  pullEl.addEventListener('pointerdown', e => { if (!pullState || pullState.phase !== 'charge' || e.target.closest('button')) return; e.preventDefault(); releaseSphere(); });
  pullState.onKey = e => { if (pullState && pullState.phase === 'charge' && ['Enter', ' ', 'ArrowDown'].includes(e.key)) { e.preventDefault(); releaseSphere(); } };
  document.addEventListener('keydown', pullState.onKey);
  // direct: skip the sphere and go straight to the reveal (memory exchange)
  if (opts.direct) { pullEl.classList.add('direct'); pullClear(pullState); if (pullState.sfx) { pullState.sfx.stop(); pullState.sfx = null; } advancePull(); }
}
const pullLater = (ms, fn) => pullState && pullState.timers.push(setTimeout(fn, ms));
function pullClear(st) { clearTimeout(st.timer); (st.timers || []).forEach(clearTimeout); st.timers = []; if (st.onKey) document.removeEventListener('keydown', st.onKey); st.onKey = null; }
function sphereTier(t) {
  if (!pullEl) return;
  pullEl.classList.remove('t3', 't4', 't5'); pullEl.classList.add('t' + Math.min(t, 5));
  const sph = $('#sph'); sph.classList.remove('c3', 'c4', 'c5', 'c6', 'pulse'); void sph.offsetWidth; sph.classList.add('c' + t, 'pulse');
  const sf = pullState && pullState.sfx; if (sf) { sf.tier = t; sf.surge(t); }
  if (t >= 5) { pullEl.classList.remove('quake'); void pullEl.offsetWidth; pullEl.classList.add('quake'); }
}
function releaseSphere() {
  const st = pullState; if (!st || st.phase !== 'charge') return;
  st.phase = 'rise'; pullClear(st);
  pullEl.classList.remove('charging', 'dragging'); pullEl.classList.add('rising');
  $('#sph').style.setProperty('--drag', '0px');
  const rise = RISE_MS[st.best]; pullEl.style.setProperty('--rise', rise / 1000 + 's');
  if (st.best >= 4) pullLater(rise * .3, () => sphereTier(4));
  let urAt;
  if (st.fake) { pullLater(rise * .62, fakeArtIn); urAt = rise * .62 + 2000; pullLater(urAt, fakeTransform); }
  else if (st.best === 5) { urAt = rise * .62; pullLater(urAt, () => sphereTier(5)); }
  if (st.rainbow) { const rbAt = Math.max(urAt + 1500, rise + 200); pullLater(rbAt, rainbowSphere); pullLater(rbAt + 2400, burstSphere); }
  else pullLater(st.fake ? urAt + 1500 : rise + (st.best === 3 ? 250 : 400), burstSphere);
}
/* the rarer the pull, the slower the sphere rises (blue, SSR, UR) */
const RISE_MS = { 3: 2300, 4: 3800, 5: 5400 }, RAINBOW_CHANCE = .5;
/* rainbow sphere: the UR sphere shatters into a shiny rainbow one and the whole screen turns rainbow */
function rainbowSphere() {
  const st = pullState; if (!st || !pullEl) return;
  pullEl.classList.add('rainbow');
  pullEl.insertAdjacentHTML('afterbegin', '<div class="rb-screen"><i></i></div>');
  pullEl.insertAdjacentHTML('beforeend', '<div class="fake-flash rb-flash"></div>');
  sphereTier(6);
  st.fx.burst(200, 900, 5);
}
function fakeArtIn() {
  const st = pullState, art = fakeArt(); if (!st || !pullEl || !art) return;
  pullEl.insertAdjacentHTML('beforeend', `<div class="fk-art"><img src="${art}" alt=""><i class="fk-streak"></i></div>`);
}
function fakeTransform() {
  const st = pullState; if (!st || !pullEl) return;
  const a = pullEl.querySelector('.fk-art'); if (a) a.classList.add('out');
  pullEl.classList.add('fakeout');
  pullEl.insertAdjacentHTML('beforeend', '<div class="fake-flash"></div>');   // no ray burst: lightning, flash and the quake carry it
  $('#sph').classList.add('crack');
  sphereTier(5);
  st.fx.burst(120, 640, 5);
}
function burstSphere() {
  const st = pullState; if (!st || !pullEl) return;
  st.phase = 'burst';
  pullEl.classList.add('burst');
  pullEl.insertAdjacentHTML('beforeend', `<div class="sph-flash"></div>${st.best >= 4 ? `<div class="stamp now ${st.best === 5 ? 'up' : ''} ${st.rainbow ? 'rb' : ''}">${RNAME[st.best]}</div>` : ''}`);
  st.fx.burst(st.best === 5 ? 260 : st.best === 4 ? 150 : 60, st.best === 5 ? 1000 : st.best === 4 ? 760 : 460, st.best);
  if (st.sfx) st.sfx.shock();
  pullLater(st.best >= 4 ? 1500 : 700, advancePull);
}
/* the sphere's surroundings, drawn on two canvases (behind and in front of the sphere): glowing sparks drifting upward
   and soft vertical light streaks in the tier's colours (like an anime power-up); orbiting sparks on tilted rings (the
   far half behind the sphere, the near half in front, so it reads as 3D); lightning that crawls over the sphere at SSR and
   lashes out into the air at UR; sparks pulled in while charging; a shockwave ring when it bursts */
const SPH_COL = { 6: ['#ff4d6d', '#ffa24d', '#fff04d', '#5dff8a', '#4dd2ff', '#a66bff'], 3: ['#2f6bff', '#5aa9ff', '#c4e6ff'], 4: ['#ff7417', '#ffaa5c', '#ffe6c2'], 5: ['#a855f7', '#ff6ec7', '#8ff7ea', '#ffd36b'] };
function startSphereFx(root) {
  const back = root.querySelector('.sph-back'), front = root.querySelector('.sph-front'), sphEl = root.querySelector('#sph');
  const bg = back.getContext('2d'), fg = front.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), nextBolt = 0, flash = 0, shockT = -1, boost = 0;
  const bolts = [], motes = [], rise = [], streaks = [], t0 = performance.now();
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; [back, front].forEach(c => { c.width = W * dpr; c.height = H * dpr; }); };
  fit(); addEventListener('resize', fit);
  const api = { tier: 3,
    surge(t) { const big = t === 5; boost = big ? 1.6 : 1; flash = big ? .55 : .25; if (big) { for (let i = 0; i < 5; i++) bolt(true); } },
    shock() { shockT = 0; flash = .4; boost = 2; },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', fit); } };
  const col = (i, ph = 0) => { const c = SPH_COL[api.tier]; return api.tier >= 5 ? c[Math.floor(i + ph) % c.length] : c[i % c.length]; };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  // jagged lightning path by midpoint displacement, with a few side branches
  function zig(x1, y1, x2, y2, rough, depth, out) {
    if (depth <= 0) { out.push([x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - .5) * rough, my = (y1 + y2) / 2 + (Math.random() - .5) * rough;
    zig(x1, y1, mx, my, rough / 2, depth - 1, out); zig(mx, my, x2, y2, rough / 2, depth - 1, out);
  }
  function bolt(big) {
    const b = sph(); if (!b) return;
    const a = Math.random() * Math.PI * 2, sx = b.x + Math.cos(a) * b.r * .92, sy = b.y + Math.sin(a) * b.r * .92;
    let ex, ey;
    if (big) { const d = b.r * (1.8 + Math.random() * 1.8); ex = b.x + Math.cos(a) * d; ey = b.y + Math.sin(a) * d; }
    else { const a2 = a + (Math.random() - .5) * 1.4; ex = b.x + Math.cos(a2) * b.r * .95; ey = b.y + Math.sin(a2) * b.r * .95; }   // crawls over the surface
    const pts = [[sx, sy]], len = Math.hypot(ex - sx, ey - sy); zig(sx, sy, ex, ey, len * .45, big ? 6 : 4, pts);
    const branches = big ? Array.from({ length: 2 }, () => { const p = pts[Math.floor(pts.length * (.3 + Math.random() * .4))], br = [[p[0], p[1]]]; zig(p[0], p[1], p[0] + (Math.random() - .5) * len * .6, p[1] + (Math.random() - .3) * len * .5, len * .25, 4, br); return br; }) : [];
    bolts.push({ pts, branches, life: big ? .32 : .2, max: big ? .32 : .2, w: big ? 3.2 : 1.8, c: col(Math.floor(Math.random() * 4)) });
    if (big) flash = Math.max(flash, .22);
  }
  function sph() { if (!sphEl.isConnected) return null; const r = sphEl.getBoundingClientRect(); if (!r.width) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2, o: +getComputedStyle(sphEl).opacity }; }
  function stroke(g, pts, w, c, glow) { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = w; g.strokeStyle = c; g.shadowColor = glow; g.shadowBlur = 18; g.stroke(); }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000), t = (now - t0) / 1000; last = now;
    const b = sph(), pp = +(getComputedStyle(root).getPropertyValue('--pp') || 0), tier = api.tier;
    bg.setTransform(dpr, 0, 0, dpr, 0, 0); fg.setTransform(dpr, 0, 0, dpr, 0, 0); bg.clearRect(0, 0, W, H); fg.clearRect(0, 0, W, H);
    boost = Math.max(0, boost - dt * .8);
    // soft vertical light streaks that fade in and out across the screen
    if (streaks.length < 7 + tier * 2 && Math.random() < dt * (2.5 + tier)) streaks.push({ x: Math.random() * W, w: 6 + Math.random() * 46, life: 1.6 + Math.random() * 2, max: 0, c: Math.floor(Math.random() * 3) });
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s2 = streaks[i]; if (!s2.max) s2.max = s2.life; s2.life -= dt; if (s2.life <= 0) { streaks.splice(i, 1); continue; }
      const a = Math.sin(Math.PI * (1 - s2.life / s2.max)) * (.16 + boost * .08), gr = bg.createLinearGradient(s2.x - s2.w / 2, 0, s2.x + s2.w / 2, 0);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, rgba(col(s2.c, t), a)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      const vg = bg.createLinearGradient(0, 0, 0, H); bg.fillStyle = gr; bg.fillRect(s2.x - s2.w / 2, 0, s2.w, H);
      vg.addColorStop(0, rgba('#ffffff', a * .5)); vg.addColorStop(.5, 'rgba(255,255,255,0)'); bg.fillStyle = vg; bg.fillRect(s2.x - s2.w * .12, 0, s2.w * .24, H);
    }
    // glowing sparks rising from the bottom of the screen
    const want = (30 + tier * 18) * (1 + boost);
    if (rise.length < want) for (let k = 0; k < 3; k++) rise.push({ x: Math.random() * W, y: H + 10, vy: 40 + Math.random() * 110, r: .8 + Math.random() * 2.6, ph: Math.random() * 7, c: Math.floor(Math.random() * 3) });
    for (let i = rise.length - 1; i >= 0; i--) {
      const m = rise[i]; m.y -= m.vy * dt * (1 + boost * .8); m.x += Math.sin(t * 1.4 + m.ph) * dt * 10; if (m.y < -10) { rise.splice(i, 1); continue; }
      const a = (.45 + .45 * Math.sin(t * 5 + m.ph)) * Math.min(1, m.y / (H * .25));
      const gl = bg.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5); gl.addColorStop(0, rgba(col(m.c, t), a * .9)); gl.addColorStop(1, 'rgba(0,0,0,0)');
      bg.fillStyle = gl; bg.fillRect(m.x - m.r * 5, m.y - m.r * 5, m.r * 10, m.r * 10);
      bg.fillStyle = rgba('#ffffff', a); bg.beginPath(); bg.arc(m.x, m.y, m.r * .55, 0, 7); bg.fill();
    }
    if (shockT >= 0) {   // burst shockwave across the water and the air
      shockT += dt; const q = shockT / .9;
      if (q < 1 && b) { fg.beginPath(); fg.arc(b.x, b.y, 40 + q * Math.max(W, H) * .8, 0, 7); fg.strokeStyle = rgba(col(2), (1 - q) * .8); fg.lineWidth = 10 * (1 - q) + 1; fg.shadowColor = col(1); fg.shadowBlur = 30; fg.stroke(); fg.shadowBlur = 0; }
    }
    if (b && b.o > .05) {
      // orbiting sparks on tilted rings: far side drawn behind the sphere, near side in front
      const rings = tier >= 5 ? 3 : tier === 4 ? 2 : 1;
      for (let k = 0; k < rings; k++) {
        const tilt = [-.35, .5, -1.1][k], rx = b.r * (1.45 + k * .25), ry = rx * .3, sp = [1, -1.3, .8][k] * (1 + pp * 2), n = 14 + tier * 4;
        for (let j = 0; j < n; j++) {
          const a = j / n * Math.PI * 2 + t * sp, cx = Math.cos(a) * rx, cy = Math.sin(a) * ry, depth = Math.sin(a);
          const x = b.x + cx * Math.cos(tilt) - cy * Math.sin(tilt), y = b.y + cx * Math.sin(tilt) + cy * Math.cos(tilt);
          const g = depth < 0 ? bg : fg, size = (1.4 + (depth + 1) * 1.3) * (tier >= 5 ? 1.3 : 1);
          g.fillStyle = rgba(col(j % 3, t * 2), (depth < 0 ? .35 : .9) * b.o); g.beginPath(); g.arc(x, y, size, 0, 7); g.fill();
        }
      }
      // charging: sparks pulled into the sphere
      if (root.classList.contains('charging') && Math.random() < .3 + pp) { const a = Math.random() * 7, d = b.r * (3 + Math.random() * 2); motes.push({ x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, life: .7, max: .7 }); }
      // lightning: crawling arcs from SSR, big strikes at UR
      if (tier >= 4 && now > nextBolt) { bolt(tier >= 5 && Math.random() < .55); nextBolt = now + (tier >= 5 ? 90 + Math.random() * 220 : 260 + Math.random() * 420); }
    }
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]; m.life -= dt; if (m.life <= 0 || !b) { motes.splice(i, 1); continue; }
      m.x += (b.x - m.x) * dt * 4; m.y += (b.y - m.y) * dt * 4;
      fg.fillStyle = rgba(col(2), m.life / m.max); fg.beginPath(); fg.arc(m.x, m.y, 2, 0, 7); fg.fill();
    }
    fg.lineCap = 'round'; fg.lineJoin = 'round';
    for (let i = bolts.length - 1; i >= 0; i--) {
      const bo = bolts[i]; bo.life -= dt; if (bo.life <= 0) { bolts.splice(i, 1); continue; }
      const a = bo.life / bo.max, flick = Math.random() < .25 ? .4 : 1;
      fg.globalAlpha = a * flick;
      [bo.pts, ...bo.branches].forEach((pts, j) => { stroke(fg, pts, bo.w * (j ? .55 : 1) * 2.4, rgba(bo.c, .55), bo.c); stroke(fg, pts, bo.w * (j ? .5 : 1) * .8, '#fff', bo.c); });
      fg.globalAlpha = 1;
    }
    fg.shadowBlur = 0;
    if (flash > 0) { fg.fillStyle = rgba(col(2), flash * .35); fg.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.6); }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
  return api;
}
/* taps only move between reveals: the intro always plays (use Skip to jump), and each reveal holds briefly so a double tap can't skip it */
function tapPull() {
  const st = pullState; if (!st || st.phase !== 'reveal' || performance.now() < st.readyAt) return;
  advancePull();
}
function advancePull() {
  const st = pullState; if (!st || st.phase === 'summary') return;
  pullClear(st);
  st.i++; st.phase = 'reveal';
  if (st.fx) st.fx.intro = false;
  if (st.sfx) { st.sfx.stop(); st.sfx = null; }
  if (st.i >= st.order.length) return st.exchange ? closePull() : showSummary();
  const r = st.results[st.order[st.i]], v = resultView(r);
  st.readyAt = performance.now() + (r.kind === 'entry' ? 900 : 450);
  pullEl.classList.add('revealing');
  // an upgraded pull never shows the SSR it would have been: an orange "SSR" glow transforms straight into the UR
  if (r.up && !r.upShown) {
    st.phase = 'upgrade'; st.readyAt = Infinity;
    pullEl.classList.remove('r3', 'r5'); pullEl.classList.add('r4');
    $('#pullStage').innerHTML = `<div class="rv r4"><div class="rv-glow"></div><div class="up-pre">SSR</div>${st.order.length > 1 ? `<div class="rv-count">${st.i + 1} / ${st.order.length}</div>` : ''}</div>`;
    if (st.fx) setTimeout(() => st.fx && st.fx.sparkle(4), 80);
    pullLater(1000, upgradeReveal);
    return;
  }
  pullEl.classList.add('revealing');
  pullEl.classList.remove('r3', 'r4', 'r5'); pullEl.classList.add('r' + r.rarity);
  $('#pullStage').innerHTML = `<div class="rv r${r.rarity} ${v.img ? 'has-art' : ''} ">
    <div class="rv-glow"></div>
    ${v.img ? `<img class="rv-blur" src="${v.img}" alt=""><img class="rv-splash" src="${v.img}" alt="">` : `<div class="rv-coin">${curIcon(r.kind === 'frag' ? 'frag' + r.frag : 'coins')}</div>`}
    <div class="rv-flash"></div><div class="rv-sweep"></div>
    <div class="rv-info">
      <div class="eyebrow" style="color:rgba(255,255,255,.75)">${esc(v.type)}</div>
      <div class="rv-name">${esc(v.name)}</div>
      <div class="rv-tier">${r.kind === 'entry' ? rtag(r.rarity, 'xl') : ctag(3, 'xl')}</div>
      ${r.up ? '<span class="rv-badge up">Upgraded from SSR!</span>' : ''}
      ${r.lost ? `<span class="rv-badge dupe">Lost the 50/50 · next UR is guaranteed</span>` : ''}
      ${r.kind === 'entry' ? (r.isNew ? '<span class="rv-badge">New</span>'
        : r.starUp ? `<div class="rv-up">${starRow(r.starUp, r.starUp - 1)}<span>${r.starUp === MAX_STARS ? 'Max stars reached' : `Star ${r.starUp} of ${MAX_STARS}`}</span></div>`
        : `<div class="rv-up">${hasStars(findEntry(r.id)) ? starRow(MAX_STARS) : ''}<span>${hasStars(findEntry(r.id)) ? 'Max stars' : 'Already owned'}${r.starlight ? ` · +${r.starlight} ${curIcon('starlight')}` : ''}</span></div>`) : ''}
    </div>
    ${st.order.length > 1 ? `<div class="rv-count">${st.i + 1} / ${st.order.length}</div>` : ''}
    <div class="rv-hint">Tap to continue</div>
  </div>`;
  if (st.fx) setTimeout(() => st.fx && st.fx.sparkle(r.rarity), 80);
}
/* SSR → UR upgrade: the screen shakes and flashes, the upgrade wallpaper slides in over the SSR with an UPGRADE stamp,
   then the UR is revealed (close to the fakeout) */
function upArt() {
  const own = (S.upArts || []).map(k => MEDIA.get(k)).filter(Boolean);
  return own.length ? rpick(own) : fakeArt();
}
function upgradeReveal() {
  const st = pullState; if (!st || !pullEl || st.phase !== 'upgrade') return;
  const rv = $('#pullStage .rv'); if (!rv) return;
  const art = upArt(), pre = rv.querySelector('.up-pre'); if (pre) pre.classList.add('out');
  pullEl.classList.remove('quake'); void pullEl.offsetWidth; pullEl.classList.add('quake', 'r5'); pullEl.classList.remove('r4');
  rv.insertAdjacentHTML('beforeend', `<div class="fake-flash"></div>${art ? `<div class="fk-art up"><img src="${art}" alt=""><i class="fk-streak"></i></div>` : ''}<div class="up-word"><b>UPGRADE</b><span>SSR <i>→</i> UR</span></div>`);
  if (st.fx) { st.fx.burst(140, 700, 5); st.fx.sparkle(5); }
  pullLater(2500, () => {
    const r = st.results[st.order[st.i]]; r.upShown = true;
    const a = $('#pullStage .fk-art'); if (a) a.classList.add('out');
    pullLater(600, () => { st.i--; st.phase = 'reveal'; advancePull(); });
  });
}
function showSummary() {
  const st = pullState; if (!st) return;
  pullClear(st); st.phase = 'summary';
  if (st.fx) st.fx.intro = false;
  pullEl.classList.add('revealing');
  $('#pullSkip').hidden = true;
  const one = st.results.length === 1;
  $('#pullStage').innerHTML = `<div class="sum">
    <h2>Summon results</h2>
    <div class="sum-grid ${one ? 'one' : ''}">${st.results.map((r, i) => { const v = resultView(r); return `<div class="scard r${r.rarity}" style="--i:${i}">
      ${v.card ? `<img src="${v.card}" alt="">` : `<div class="coinbox">${curIcon(r.kind === 'frag' ? 'frag' + r.frag : 'coins')}</div>`}
      ${r.isNew ? '<span class="new">NEW</span>' : ''}${r.up ? '<span class="new upg">UPGRADED</span>' : ''}
      <div class="foot"><span class="st">${r.kind === 'entry' ? rtag(r.rarity) : ctag(3)}</span><span class="nm">${esc(v.name)}</span>${r.starUp ? `<span class="dp">${starRow(r.starUp, r.starUp - 1)}</span>` : r.maxed ? `<span class="dp">${r.starlight ? `+${r.starlight} Corals` : 'Already owned'}</span>` : ''}</div></div>`; }).join('')}</div>
    <div class="sum-got"><span class="lbl-sm">You got</span><div class="sum-items">${sumItems(st).map(([ic, n, l]) => `<span class="sum-item" title="${l}">${ic}<b>${n}</b><small>${l}</small></span>`).join('')}</div></div>
    <div class="row" style="justify-content:center">
      ${st.preview ? '' : `<button class="btn gold" id="pullAgain">Pull ×${st.n} again${payHTML(st.n, st.bk)}</button>`}
      <button class="btn ghost" id="pullDone">${st.exchange || st.milestone ? 'Done' : st.preview ? 'Close preview' : 'Done'}</button>
    </div>
    ${st.milestone ? '<p class="tiny" style="color:rgba(255,255,255,.65)">Milestone reward: 100 pulls on the permanent banner.</p>' : st.exchange ? '<p class="tiny" style="color:rgba(255,255,255,.65)">Memory exchange complete.</p>' : st.preview ? '<p class="tiny" style="color:rgba(255,255,255,.65)">Preview only: nothing was spent or added.</p>' : `<p class="tiny" style="color:rgba(255,255,255,.65)">Pearls left: ${fmt(S.wallet.pearls)}</p>`}
  </div>`;
  const again = $('#pullAgain'); if (again) again.onclick = () => doPull(st.n, st.bk);
  $('#pullDone').onclick = () => closePull();
  $('#pullDone').focus({ preventScroll: true });
}
/* everything a pull gave, added up: characters/skins are the cards above; this row is the rest */
function sumItems(st) {
  const R = st.results, add = (k, n, l, ic = curIcon(k)) => n ? out.push([ic, fmt(n), l]) : 0, out = [];
  add('coins', R.reduce((a, r) => a + (r.kind === 'coins' ? r.amount : 0), 0), 'Gold');
  add('fragssr', R.filter(r => r.kind === 'frag' && r.frag === 'ssr').length, 'SSR egg fragment');
  add('fragur', R.filter(r => r.kind === 'frag' && r.frag === 'ur').length, 'UR egg fragment');
  add('pearls', R.reduce((a, r) => a + (r.pearls || 0), 0), 'Pearls (extra copies)');
  add('dust', st.preview ? 0 : R.length * DUST_PER_PULL, 'Seaweeds');
  add('starlight', R.reduce((a, r) => a + (r.starlight || 0), 0), 'Corals');
  add('exp', st.preview ? 0 : R.length * EXP.pull, 'EXP');
  return out;
}
function closePull(silent) {
  if (pullState) { pullClear(pullState); if (pullState.fx) pullState.fx.stop(); if (pullState.sfx) pullState.sfx.stop(); }
  if (pullEl) pullEl.remove(); pullEl = null; pullState = null;
  if (!silent) { refreshSummon(); refreshCharacters(); }
}
