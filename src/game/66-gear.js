/* ---------- Gear levels (the owner's plan): every clothing copy has its own level ----------
   Cap by rarity: R 10, SSR 20, UR 30 / 35 / 40 at 1★ / 2★ / 3★. Each level costs gold + Thread (GEAR_*); the step past
   10 / 20 / 30 also needs a refine material from deeper raid stages (Silk from stage II, Starlit Silk from stage III and up).
   Tailor mastery: the game remembers the highest level reached in each slot; reaching a level up to it again costs a
   quarter of the gold and Thread and no refine material, so the first set is the climb and the next ones are quick.
   Copies are only told apart by their star, so the levels are kept like this (S.gear): a worn copy's level sits on the
   character's slot (wl[charId][slot]); spare leveled copies sit in a pool per piece and star (pool[id][star] = [levels]);
   gearSync (run before every save) moves a level between the pool and a slot whenever what a slot wears changes, so every
   way of wearing / taking off keeps the level with the copy. Combining pieces keeps the best level and gives back the
   Thread of the rest: fusion (3 → 1) and star merges; dismantling gives Thread (+ set tokens for UR pieces); 30 set tokens
   craft the exact piece you want. In battle (65-leader.js lsBonus): every 10 levels a worn piece gives its slot's bonus,
   3 / 6 pieces of a set give half / all of its trait. */
const GEAR_UR_CAP = [30, 30, 35, 40];
const gearCap = (x, st) => !x ? 0 : +x.rarity >= 5 ? GEAR_UR_CAP[Math.max(1, Math.min(3, st || 1))] : +x.rarity === 4 ? 20 : 10;
const gearThread = n => Math.ceil((n + 1) / 2);   // level n → n + 1
const gearGold = n => 400 * (n + 1);
const gearRefine = n => n === 10 ? ['silk', 1] : n === 20 ? ['ssilk', 1] : n === 30 ? ['ssilk', 5] : null;
const gearSpent = L => { let t = 0; for (let n = 0; n < L; n++) t += gearThread(n); return t; };
const GEAR_DIS = { 3: 3, 4: 8, 5: 20 };   // Thread for dismantling (× the star for UR)
const GEAR_TOK = 30;                     // set tokens for one chosen piece
const GEAR_MATS = [[2, 0, 0], [4, .3, 0], [6, .4, .1], [9, .5, .2], [12, .6, .35]];   // per gear raid clear by stage: [Thread, Silk chance, Starlit Silk chance]
const GEAR_SLOT_TXT = { top: 'Hero +1 HP', pants: 'Hero heals 1 a turn (every 2 milestones)', shoes: '+1 opening card (every 2 milestones)', hat: 'Skill ready 1 turn sooner (every 2 milestones)', acc: 'Weak spot: enemy −5% more HP', hand: 'Resisted: the enemy’s extra HP −5%' };
/* set traits: 3 pieces = the first half, 6 = all of it (bonus fields as in lsBonus) */
const GEAR_SETS = { r: [{ hp: 1 }, { hp: 2 }], ssr: [{ fu: 1 }, { fu: 2 }], ur: [{ cheap: 1 }, { cheap: 1, ap1: 1 }], ur2: [{ heal: 1 }, { heal: 1, hp: 2 }], ur3: [{ cards: 1 }, { cards: 1, hp: 2 }] };
const GEAR_SET_BY_R = { 3: GEAR_SETS.r, 4: GEAR_SETS.ssr, 5: GEAR_SETS.ur3 };   // admin-made sets
const gearTraitTxt = t => Object.entries(t).map(([k, v]) => ({ hp: `hero +${v} HP`, fu: `first unit +${v} max HP`, cheap: 'first skill use −1 AP', ap1: `+${v} AP on the first turn`, heal: `heal ${v} a turn`, cards: `+${v} opening card` }[k])).join(', ');
function gS() { const g = S.gear || (S.gear = {}); for (const k of ['pool', 'wl', 'wk', 'mast', 'tok']) g[k] = g[k] || {}; return g; }
const gPool = (id, k) => { const P = gS().pool, a = P[id] = P[id] || {}; return a[k] = a[k] || []; };
const gearWornLv = (cid, slot) => (gS().wl[cid] || {})[slot] || 0;
const gearStarOf = (x, cid, slot) => hasClothStars(x) ? clamp(wornStarOf(cid, slot), 1, 3) : 1;
const gTakeMax = a => { if (!a.length) return 0; let i = 0; a.forEach((v, j) => { if (v > a[i]) i = j; }); return a.splice(i, 1)[0]; };
const gTakeMin = a => { if (!a.length) return 0; let i = 0; a.forEach((v, j) => { if (v < a[i]) i = j; }); return a.splice(i, 1)[0]; };
const gRefund = L => { if (L > 0) S.wallet.thread = (S.wallet.thread || 0) + gearSpent(L); };
/* keep the levels with their copies (run before every save) */
function gearSync() {
  if (!S || !S.wear || !Array.isArray(S.clothes)) return;
  const g = gS();
  for (const cid of new Set([...Object.keys(S.wear), ...Object.keys(g.wk)])) {
    const W = S.wear[cid] || {}, K = g.wk[cid] = g.wk[cid] || {}, L = g.wl[cid] = g.wl[cid] || {};
    for (const [slot] of WARD_SLOTS) {
      const x = W[slot] && clothOf(W[slot]), key = x ? `${x.id}|${gearStarOf(x, cid, slot)}` : '';
      if (K[slot] === key) continue;
      if (K[slot] && L[slot] > 0) { const [oid, ok] = K[slot].split('|'); if (clothOf(oid)) gPool(oid, +ok).push(L[slot]); }
      L[slot] = x ? gTakeMax(gPool(x.id, +key.split('|')[1])) : 0;
      if (key) K[slot] = key; else delete K[slot];
    }
  }
  for (const id of Object.keys(g.pool)) {   // never more leveled spares than spare copies: the lowest go, their Thread comes back
    const x = clothOf(id); if (!x) { delete g.pool[id]; continue; }
    for (const k of Object.keys(g.pool[id])) { const a = g.pool[id][k], sp = Math.max(0, spareAt(id, +k)); a.sort((p, q) => q - p); while (a.length > sp) gRefund(a.pop()); }
  }
}
{ const p0 = persist; persist = function () { try { gearSync(); } catch (e) { noteError && noteError(e, 'gearSync'); } return p0.apply(this, arguments); }; }
/* the level of the i-th spare copy (highest first), for lists */
const gearSpareLv = (id, k, i) => (gPool(id, k).slice().sort((a, b) => b - a))[i] || 0;
/* every copy with its level: worn ones from the slots, spare ones from the pool (highest first) */
function gearCopies(id) {
  const x = clothOf(id); if (!x) return [];
  const seen = {}; return clothCopies(id).map(cp => { const k = cp.star || 1; if (cp.who) return { ...cp, x, k, lv: gearWornLv(cp.who, cp.slot) }; const i = seen[k] = (seen[k] || 0) + 1; return { ...cp, x, k, lv: gearSpareLv(id, k, i - 1), si: i - 1 }; });
}
/* the cost of the next level: mastery (a level reached before in this slot) is cheap */
function gearCost(x, lv) {
  const mast = lv < (gS().mast[x.slot] || 0), f = mast ? .25 : 1, r = mast ? null : gearRefine(lv);
  return { gold: Math.ceil(gearGold(lv) * f), thread: Math.ceil(gearThread(lv) * f), refine: r, mast };
}
/* level up a copy: ref = {who, slot} (worn) or {id, k, si} (the si-th spare) */
function gearUp(ref, times = 1) {
  const g = gS(), worn = !!ref.who, x = clothOf(worn ? (S.wear[ref.who] || {})[ref.slot] : ref.id); if (!x) return 0;
  const k = worn ? gearStarOf(x, ref.who, ref.slot) : ref.k, cap = gearCap(x, k), pool = worn ? null : gPool(x.id, k);
  if (!worn) pool.sort((a, b) => b - a);
  let lv = worn ? gearWornLv(ref.who, ref.slot) : pool[ref.si] || 0, done = 0, why = '';
  if (!worn && ref.si >= pool.length && spareAt(x.id, k) <= pool.length) return 0;
  while (done < times && lv < cap) {
    const c = gearCost(x, lv), W = S.wallet;
    if ((W.coins || 0) < c.gold) { why = 'gold'; break; }
    if ((W.thread || 0) < c.thread) { why = 'Thread'; break; }
    if (c.refine && (W[c.refine[0]] || 0) < c.refine[1]) { why = c.refine[0] === 'silk' ? 'Silk' : 'Starlit Silk'; break; }
    W.coins -= c.gold; W.thread -= c.thread; if (c.refine) W[c.refine[0]] -= c.refine[1];
    lv++; done++; g.mast[x.slot] = Math.max(g.mast[x.slot] || 0, lv);
  }
  if (done) { if (worn) g.wl[ref.who] = { ...(g.wl[ref.who] || {}), [ref.slot]: lv }; else if (ref.si < pool.length) pool[ref.si] = lv; else pool.push(lv); persist(); }
  else if (why) toast(`Not enough ${why} for the next level.`);
  else if (lv >= cap) toast(`${x.name} is at its cap (Lv ${cap}).`);
  return done;
}
/* dismantle a spare copy: Thread (+ its levels' Thread back), UR pieces also give set tokens */
function gearDismantle(id, k, si) {
  const x = clothOf(id); if (!x || spareAt(id, k) < 1) return null;
  const pool = gPool(id, k).sort((a, b) => b - a), lv = si != null && si < pool.length ? pool.splice(si, 1)[0] : 0;
  S.owned[id] = Math.max(0, (S.owned[id] || 0) - 1);
  if (k > 1) { const c = S.cstars[id] = { ...cstarCounts(id) }; delete c[1]; c[k] = Math.max(0, (c[k] || 0) - 1); }
  const th = GEAR_DIS[+x.rarity] * (+x.rarity >= 5 ? k : 1) + gearSpent(lv), tok = +x.rarity >= 5 && x.set ? 5 * k : 0;
  S.wallet.thread = (S.wallet.thread || 0) + th; if (tok) gS().tok[x.set] = (gS().tok[x.set] || 0) + tok;
  persist(); return { th, tok, x };
}
function gearCraft(id) {
  const x = clothOf(id), g = gS(); if (!x || !x.set || (g.tok[x.set] || 0) < GEAR_TOK) return false;
  if (wardFree() < 1) { toast('Your wardrobe is full.'); return false; }
  g.tok[x.set] -= GEAR_TOK; addCloth(id, 1); persist(); return true;
}
/* raid materials for gear raid clears (Thread, and Silk / Starlit Silk on deeper stages); UR drops add set tokens */
function gearRaidMats(si, times, drops) {
  const m = GEAR_MATS[Math.max(0, Math.min(4, si || 0))], W = S.wallet, out = { thread: m[0] * times, silk: 0, ssilk: 0 };
  for (let i = 0; i < times; i++) { if (Math.random() < m[1]) out.silk++; if (Math.random() < m[2]) out.ssilk++; }
  W.thread = (W.thread || 0) + out.thread; W.silk = (W.silk || 0) + out.silk; W.ssilk = (W.ssilk || 0) + out.ssilk;
  (drops || []).forEach(d => { if (+d.x.rarity >= 5 && d.x.set) gS().tok[d.x.set] = (gS().tok[d.x.set] || 0) + 1; });
  return out;
}
const gearMatsTxt = m => [`+${m.thread} Thread`, m.silk ? `+${m.silk} Silk` : '', m.ssilk ? `+${m.ssilk} Starlit Silk` : ''].filter(Boolean).join(' · ');

/* ---- combining keeps the best level: fusion (3 → 1) and star merges ---- */
{ const f0 = doFuse;
  doFuse = function () {
    const n = Math.floor(fusePot.length / 3), used = fusePot.slice(0, n * 3), before = { ...S.owned }, sum = o => Object.values(o).reduce((t, v) => t + (v || 0), 0);
    const free = {}, lv = used.map(id => { if (!(id in free)) free[id] = Math.max(0, spareAt(id, 1) - gPool(id, 1).length); if (free[id] > 0) { free[id]--; return 0; } return gTakeMin(gPool(id, 1)); });
    f0.apply(this, arguments);
    if (!n || sum(S.owned) !== sum(before) - 2 * n) { used.forEach((id, i) => { if (lv[i]) gPool(id, 1).push(lv[i]); }); return; }   // nothing was fused: the levels go back
    const fresh = []; Object.keys(S.owned).forEach(id => { for (let d = (S.owned[id] || 0) - (before[id] || 0) + used.filter(u => u === id).length; d > 0; d--) fresh.push(id); });
    for (let t = 0; t < n; t++) {   // each new piece starts at the best level of its three; the Thread of the other two comes back
      const tri = lv.slice(t * 3, t * 3 + 3).sort((a, b) => b - a), nid = fresh[t];
      gRefund(tri[1]); gRefund(tri[2]);
      if (tri[0] > 0 && nid) gPool(nid, 1).push(Math.min(tri[0], gearCap(clothOf(nid), 1))); else gRefund(tri[0]);
    }
    persist();
  }; }
{ const m0 = mergeStar;
  mergeStar = function (id, k) {
    const a = gPool(id, k).sort((p, q) => q - p), l1 = a[0] || 0, l2 = a[1] || 0;
    if (!m0.apply(this, arguments)) return false;
    a.splice(0, Math.min(2, a.length)); const keep = Math.max(l1, l2); gRefund(Math.min(l1, l2)); if (keep) gPool(id, k + 1).push(keep);
    return true;
  }; }
{ const c0 = mergeClothCopy;
  mergeClothCopy = function (id, k, tgt) {
    const worn = tgt && tgt.who, wl = worn ? gearWornLv(tgt.who, tgt.slot) : 0, a = gPool(id, k).sort((p, q) => q - p), other = a[0] || 0;
    if (!c0.apply(this, arguments)) return false;
    if (a.length) a.shift();
    if (worn) { const g = gS(); g.wl[tgt.who] = { ...(g.wl[tgt.who] || {}), [tgt.slot]: Math.max(wl, other) }; g.wk[tgt.who] = { ...(g.wk[tgt.who] || {}), [tgt.slot]: `${id}|${k + 1}` }; gRefund(Math.min(wl, other)); }
    else { const l2 = a.length ? a.shift() : 0, keep = Math.max(other, l2); gRefund(Math.min(other, l2)); if (keep) gPool(id, k + 1).push(keep); }
    return true;
  }; }

/* ---- battle: what a character's worn gear gives (65-leader.js lsBonus adds it, with the shared caps) ---- */
function gearBattle(e) {
  const out = { hp: 0, heal: 0, cards: 0, cd0: 0, weak: 0, res: 0, fu: 0, cheap: false, ap1: 0, src: [] };
  if (!e || !owns(e.id)) return out;
  const W = wearOf(e.id), sets = {};
  for (const [slot, nm] of WARD_SLOTS) {
    const x = W[slot] && clothOf(W[slot]); if (!x) continue;
    const m = Math.floor(gearWornLv(e.id, slot) / 10), h = Math.floor(m / 2);
    if (x.set) sets[x.set] = (sets[x.set] || 0) + 1;
    if (!m) continue;
    if (slot === 'top') out.hp += m; else if (slot === 'pants') out.heal += h; else if (slot === 'shoes') out.cards += h; else if (slot === 'hat') out.cd0 += h; else if (slot === 'acc') out.weak += m; else if (slot === 'hand') out.res += m;
    out.src.push([`Gear · ${nm}`, `${esc(x.name)} · Lv ${gearWornLv(e.id, slot)}`, `${m} milestone${m > 1 ? 's' : ''}: ${GEAR_SLOT_TXT[slot]}${['pants', 'shoes', 'hat'].includes(slot) && !h ? ' (needs 2)' : ''}`]);
  }
  for (const [set, n] of Object.entries(sets)) {
    if (n < 3) continue;
    const x = S.clothes.find(c => c.set === set), T = GEAR_SETS[set] || GEAR_SET_BY_R[x ? +x.rarity : 3] || GEAR_SETS.r, t = T[n >= 6 ? 1 : 0];
    for (const [k, v] of Object.entries(t)) { if (k === 'cheap') out.cheap = true; else out[k] += v; }
    out.src.push(['Set trait', `${esc(typeof clothSetName === 'function' ? clothSetName(set) : set)} · ${n >= 6 ? 6 : 3} pieces`, gearTraitTxt(t)]);
  }
  return out;
}

/* ---- the Tailor window: level up, dismantle, craft with set tokens ---- */
let gearSel = null, gearTab = 'worn';
function openTailor(focus) {
  if (focus) { gearSel = focus; gearTab = focus.who ? 'worn' : 'spare'; }
  openModal({ title: 'Tailor', ic: 'wardrobe', wide: true, kind: 'tailor', body: '<div id="gearRoot"></div>', onMount: () => renderTailor() });
}
function renderTailor() {
  const root = document.getElementById('gearRoot'); if (!root) return;
  const g = gS(), W = S.wallet;
  const worn = Object.keys(S.wear || {}).filter(cid => owns(cid) && findEntry(cid)).flatMap(cid => WARD_SLOTS.map(([slot]) => { const x = clothOf((S.wear[cid] || {})[slot]); return x ? { who: cid, slot, x, k: gearStarOf(x, cid, slot), lv: gearWornLv(cid, slot) } : null; }).filter(Boolean));
  const spare = S.clothes.filter(x => owns(x.id)).flatMap(x => gearCopies(x.id).filter(cp => !cp.who).map(cp => ({ id: x.id, x, k: cp.k, si: cp.si, lv: cp.lv }))).sort((a, b) => b.lv - a.lv || b.x.rarity - a.x.rarity || a.x.name.localeCompare(b.x.name));
  const list = gearTab === 'worn' ? worn : gearTab === 'spare' ? spare : [];
  const key = c => c.who ? `w|${c.who}|${c.slot}` : `s|${c.id}|${c.k}|${c.si}`;
  if (!gearSel || !list.some(c => key(c) === gearSelKey())) gearSel = list[0] ? (list[0].who ? { who: list[0].who, slot: list[0].slot } : { id: list[0].id, k: list[0].k, si: list[0].si }) : null;
  function gearSelKey() { return !gearSel ? '' : gearSel.who ? `w|${gearSel.who}|${gearSel.slot}` : `s|${gearSel.id}|${gearSel.k}|${gearSel.si}`; }
  const cur = list.find(c => key(c) === gearSelKey());
  const cell = c => `<button class="gt-it r${c.x.rarity} ${key(c) === gearSelKey() ? 'on' : ''}" data-gt="${esc(key(c))}"><img src="${clothImg(c.x)}" alt="">${ctag(c.x.rarity)}${hasClothStars(c.x) ? clothStarRow(c.k, 'item') : ''}<b>Lv ${c.lv}</b><small>${c.who ? esc((findEntry(c.who) || {}).name || '') : 'Spare'}</small></button>`;
  const sets = [...new Set(S.clothes.filter(x => x.set && +x.rarity >= 5).map(x => x.set))];
  let detail = '';
  if (gearTab === 'tok') detail = `<div class="gt-tok">${sets.map(set => { const ps = S.clothes.filter(x => x.set === set), n = g.tok[set] || 0; return `<div class="gt-set"><div class="gt-seth"><b>${esc(typeof clothSetName === 'function' ? clothSetName(set) : set)}</b><span>${n} / ${GEAR_TOK} tokens</span></div><div class="gt-setp">${ps.map(x => `<button class="gt-cr" data-gcraft="${x.id}" ${n >= GEAR_TOK ? '' : 'disabled'}><img src="${clothImg(x)}" alt=""><small>${esc(x.name)}</small></button>`).join('')}</div></div>`; }).join('') || '<p class="tiny">No UR sets yet.</p>'}<p class="tiny">Every UR piece from a raid gives 1 token of its set, dismantling a spare UR piece 5 per star. ${GEAR_TOK} tokens craft the exact piece you want.</p></div>`;
  else if (cur) {
    const cap = gearCap(cur.x, cur.k), c = cur.lv < cap ? gearCost(cur.x, cur.lv) : null, m = Math.floor(cur.lv / 10), next = Math.min(cap, (m + 1) * 10);
    detail = `<div class="gt-det r${cur.x.rarity}"><div class="gt-pic"><img src="${clothImg(cur.x)}" alt="">${ctag(cur.x.rarity)}</div>
      <h3>${esc(cur.x.name)}</h3><small>${esc(WARD_NAME[cur.x.slot])}${cur.who ? ` · worn by ${esc((findEntry(cur.who) || {}).name || '')}` : ' · spare'}${hasClothStars(cur.x) ? ` · ${cur.k}★` : ''}</small>
      <div class="gt-lv"><b>Lv ${cur.lv}</b><span>/ ${cap}</span><i style="--p:${(cur.lv / cap * 100).toFixed(1)}%"></i></div>
      <p class="gt-bon"><b>${esc(WARD_NAME[cur.x.slot])} bonus:</b> ${GEAR_SLOT_TXT[cur.x.slot]} every 10 levels. Now: ${m} milestone${m === 1 ? '' : 's'}.${cur.lv < cap ? ` Next at Lv ${next}.` : ''}${+cur.x.rarity >= 5 && cur.k < 3 ? ' More stars raise the cap.' : +cur.x.rarity < 5 && cur.lv >= cap ? ' A higher rarity goes further: fusion keeps this level.' : ''}</p>
      ${c ? `<div class="gt-cost"><span>${curIcon('coins')}${fmt(c.gold)}</span><span>${curIcon('thread')}${c.thread}</span>${c.refine ? `<span>${curIcon(c.refine[0])}${c.refine[1]} ${c.refine[0] === 'silk' ? 'Silk' : 'Starlit Silk'}</span>` : ''}${c.mast ? '<em>Tailor mastery: ¼ price</em>' : ''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn gold" data-gup="1">Level up</button><button class="btn ghost" data-gup="5">×5</button><button class="btn ghost" data-gup="99">To cap</button></div>` : '<div class="cs-pill">At its cap</div>'}
      ${cur.who ? '' : `<button class="btn ghost sm gt-dis" data-gdis>${icon('trash')}Dismantle · +${GEAR_DIS[+cur.x.rarity] * (+cur.x.rarity >= 5 ? cur.k : 1) + gearSpent(cur.lv)} Thread${+cur.x.rarity >= 5 && cur.x.set ? ` · +${5 * cur.k} tokens` : ''}</button>`}</div>`;
  } else detail = `<p class="tiny">${gearTab === 'worn' ? 'Nobody wears any clothes yet. Equip pieces from a character\'s Wardrobe tab.' : 'No spare pieces.'}</p>`;
  root.innerHTML = `<div class="gt"><div class="gt-top"><div class="gt-tabs">${[['worn', 'Worn'], ['spare', 'Spare'], ['tok', 'Set tokens']].map(([k, n]) => `<button class="tab ${gearTab === k ? 'on' : ''}" data-gtab="${k}">${n}</button>`).join('')}</div>
      <div class="gt-mats"><span title="Thread: from every gear raid clear and dismantling">${curIcon('thread')}<b>${fmt(W.thread || 0)}</b></span><span title="Silk: raid stage II and deeper">${curIcon('silk')}<b>${W.silk || 0}</b></span><span title="Starlit Silk: raid stage III and deeper">${curIcon('ssilk')}<b>${W.ssilk || 0}</b></span><span>${curIcon('coins')}<b>${fmt(W.coins || 0)}</b></span></div></div>
    <div class="gt-body">${gearTab === 'tok' ? '' : `<div class="gt-grid">${list.map(cell).join('') || ''}</div>`}<div class="gt-side">${detail}</div></div>
    <p class="tiny">Caps: R 10 · SSR 20 · UR 30 / 35 / 40 at 1★ / 2★ / 3★. Levels you reached before in a slot cost ¼ (Tailor mastery). Fusion and star merges keep the best level and give back the rest as Thread.</p></div>`;
  root.querySelectorAll('[data-gtab]').forEach(b => b.onclick = () => { gearTab = b.dataset.gtab; gearSel = null; renderTailor(); });
  root.querySelectorAll('[data-gt]').forEach(b => b.onclick = () => { const p = b.dataset.gt.split('|'); gearSel = p[0] === 'w' ? { who: p[1], slot: p[2] } : { id: p[1], k: +p[2], si: +p[3] }; renderTailor(); });
  root.querySelectorAll('[data-gup]').forEach(b => b.onclick = () => { const n = gearUp(gearSel, +b.dataset.gup); if (n) { toast(`+${n} level${n > 1 ? 's' : ''}`); if (typeof refreshCharacters === 'function') refreshCharacters(); } renderTailor(); });
  const dis = root.querySelector('[data-gdis]'); if (dis) dis.onclick = () => { if (dis.dataset.sure !== '1') { dis.dataset.sure = '1'; dis.innerHTML = `${icon('trash')}Tap again to dismantle`; return; } const r = gearDismantle(gearSel.id, gearSel.k, gearSel.si); if (r) toast(`Dismantled ${r.x.name}: +${r.th} Thread${r.tok ? `, +${r.tok} set tokens` : ''}`); gearSel = null; renderTailor(); };
  root.querySelectorAll('[data-gcraft]').forEach(b => b.onclick = () => { const x = clothOf(b.dataset.gcraft); if (x && gearCraft(x.id)) { toast(`Crafted ${x.name}`); renderTailor(); } });
}

/* materials: icons, names, rarity colours */
CUR_SVG.thread = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="6.5" ry="8" fill="#f1d3ff" stroke="#9a63d6" stroke-width="1.4"/><path d="M6.5 9.5c3 1 8 1 11 0M6 12.5c3.5 1 8.5 1 12 0M6.5 15.5c3 1 8 1 11 0" stroke="#9a63d6" stroke-width="1.2" fill="none"/><path d="M18 18c2 1 3 2 2.5 3.5" stroke="#c48bf0" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>';
CUR_SVG.silk = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7c4-3 12-3 16 0v10c-4 3-12 3-16 0z" fill="#cfe9ff" stroke="#5b8fd6" stroke-width="1.4"/><path d="M4 11c4 2 12 2 16 0" stroke="#5b8fd6" stroke-width="1.1" fill="none"/><path d="M9 6l1 12M15 6l-1 12" stroke="#ffffff" stroke-width="1" opacity=".7"/></svg>';
CUR_SVG.ssilk = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ssilkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3f6"/><stop offset=".5" stop-color="#e2bcff"/><stop offset="1" stop-color="#bfe2ff"/></linearGradient></defs><path d="M4 7c4-3 12-3 16 0v10c-4 3-12 3-16 0z" fill="url(#ssilkG)" stroke="#8a5cd6" stroke-width="1.4"/><path d="M12 8.5l1 2.3 2.4.3-1.8 1.6.5 2.4L12 14l-2.1 1.1.5-2.4-1.8-1.6 2.4-.3z" fill="#fff"/></svg>';
Object.assign(REW_NAMES, { thread: ['Thread', 'Thread'], silk: ['Silk', 'Silk'], ssilk: ['Starlit Silk', 'Starlit Silk'] });
Object.assign(REW_R, { thread: 3, silk: 4, ssilk: 5 });
/* CS: every worn gear level adds a little (counts toward the grade) */
{ const b0 = csBaseParts;
  csBaseParts = function (c) { const out = b0.apply(this, arguments); if (out.length && c) { const n = WARD_SLOTS.reduce((t, [slot]) => t + ((S.wear[c.id] || {})[slot] ? gearWornLv(c.id, slot) : 0), 0); if (n) out.push({ label: `Gear levels (${n})`, pts: n * 10 }); } return out; }; }
