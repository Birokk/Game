/* =========================================================
   GACHA
   ========================================================= */
function rate5(pity) { return pity >= HARD_PITY ? 1 : BASE5; }
const BANNER_KEYS = ['beginner', 'stepup', 'limited', 'weekly', 'skins', 'memories', 'standard'];   // order of the tabs on the summon screen (bannerKeys() hides a finished Beginner Banner)
let curBanner = 'limited';
const limitedUR = () => { const f = findEntry(S.featuredId); return f && f.rarity === 5 && f.pullable !== false ? f : null; };
const standardURs = () => S.pool.filter(e => e.rarity === 5 && e.pullable !== false && e.standard && e.type !== 'pet');
const pullableSSRs = () => S.pool.filter(e => e.rarity === 4 && e.pullable !== false && e.type !== 'pet');
const BANNER_DEFAULT_NAME = { beginner: 'Beginner Banner', stepup: 'Step-Up Summon', limited: 'Limited Banner', weekly: 'Weekly Spotlight', skins: 'Outfit Banner', memories: 'Memory Banner', standard: 'Pearl Banner' };
/* memory banner: pulls give memories at double the usual UR / SSR rates, paid with Standard tickets */
const pullableMems = r => (S.memories || []).filter(m => +m.rarity === r).map(m => memEntry(m.id));
const RATE_X = bk => bk === 'memories' ? 2 : 1;
/* the banners used to be called "… Wish" (the owner renamed them to "… Banner"): an old default name in saved content shows the new one */
const BANNER_OLD_NAME = { 'Beginner Wish': 'Beginner Banner', 'Outfit Wish': 'Outfit Banner', 'Memory Wish': 'Memory Banner', 'Pearl Wish': 'Pearl Banner' };
const bannerName = bk => { const n = (S.banners[bk] && S.banners[bk].name) || BANNER_DEFAULT_NAME[bk]; return BANNER_OLD_NAME[n] || n; };
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
/* ---------- special banners ----------
   Beginner Banner (beginner): 50 pulls in total, ×10 only, 20% off (8 Standard tickets or 24 pearls per ×10). No UR character
   can drop before pull 50 (a UR roll gives a UR memory instead, or an SSR when there are none, and no SSR → UR upgrades);
   pull 50 is a guaranteed UR character from the 3 set in admin → Banners (S.banners.beginner.picks). The tab leaves once done.
   Step-Up (stepup): 7 steps, each a ×10 paid in pearls (STEP_COST: 6, 12, 18, 24 = 60, then 30, 30, 30), characters only,
   with a rate-up UR set in admin (S.banners.stepup.featured, 50/50 like the limited banner). Step 1 has half the UR rate,
   step 5 1.5×; step 4 always holds 1 UR memory, step 7 always holds the rate-up character; pulling a UR never resets the
   steps; every step also gives gold (STEP_GOLD). A new rate-up character (or Restart in admin) starts the steps again. */
const SPECIAL_BK = ['beginner', 'stepup'], isSpecial = bk => SPECIAL_BK.includes(bk);
const BEGIN_PULLS = 50, BEGIN_TK = 8, BEGIN_PEARLS = 24;
const STEP_N = 7, STEP_COST = [6, 12, 18, 24, 30, 30, 30], STEP_GOLD = [5000, 10000, 15000, 20000, 30000, 40000, 50000];
const STEP_UR_X = [.5, 1, 1.5, 1, 1.5, 1, 1], STEP_PERK = ['½ UR rate', '', '1.5× UR rate', '1 UR memory', '1.5× UR rate', '', 'Rate-up guaranteed'];
const urMems = () => (S.memories || []).filter(m => +m.rarity === 5).map(m => memEntry(m.id)).filter(Boolean);
const urCharsAll = () => S.pool.filter(e => e.type === 'character' && !e.mc && +e.rarity === 5 && e.pullable !== false);
const beginPicks = () => ((S.banners.beginner || {}).picks || []).map(id => findEntry(id)).filter(e => e && e.type === 'character' && +e.rarity === 5);
const beginLeft = () => Math.max(0, BEGIN_PULLS - ((S.gacha.beginner || {}).total || 0));
const beginDone = () => beginLeft() <= 0;
const stepFeat = () => { const e = findEntry((S.banners.stepup || {}).featured); return e && e.type === 'character' && +e.rarity === 5 ? e : null; };
const stepKey = () => `${(S.banners.stepup || {}).featured || ''}:${(S.banners.stepup || {}).ver || 0}`;
function stepState() { const g = S.gacha.stepup; if (g.key !== stepKey()) { g.key = stepKey(); g.step = 0; } return g; }
const stepIdx = () => stepState().step || 0;
const stepDone = () => stepIdx() >= STEP_N;
const bannerOpen = bk => bk === 'beginner' ? !beginDone() && beginPicks().length > 0 : bk === 'stepup' ? !!stepFeat() && !stepDone() : true;
const bannerKeys = () => BANNER_KEYS.filter(k => k !== 'beginner' || !beginDone());
/* tickets / pearls a summon needs: special banners only do ×10 (the Step-Up takes pearls only) */
const tkNeed = (n, bk) => bk === 'beginner' ? BEGIN_TK : bk === 'stepup' ? Infinity : n;
const pearlNeed = (n, bk) => bk === 'beginner' ? BEGIN_PEARLS : bk === 'stepup' ? STEP_COST[Math.min(stepIdx(), STEP_N - 1)] : COST[n];
/* one Step-Up step: 10 pulls with that step's UR rate and guarantees, then the step's gold */
function stepPull() {
  const g = stepState(), s = Math.min(g.step || 0, STEP_N - 1), F = stepFeat(), out = [];
  for (let i = 0; i < 10; i++) {
    let force;
    if (i === 9 && s === 3 && urMems().length && !out.some(r => r.rarity === 5 && findEntry(r.id) && findEntry(r.id).type === 'memory')) force = 'mem';
    else if (i === 9 && s === 6 && F && !out.some(r => r.id === F.id)) force = 'feat';
    out.push(rollOne('stepup', force, STEP_UR_X[s]));
  }
  g.step = s + 1; S.wallet.coins += STEP_GOLD[s];
  return { out, gold: STEP_GOLD[s] };
}
/* ---------- summon points ----------
   Every pull on a regular banner gives 1 point (not the Beginner Banner or Step-Up). Pulls on the Limited, Weekly and Outfit
   banners give points for THAT banner (S.spoints[bk] = {key, n}), spent in Shop → Summon Points on copies of the banner's
   featured UR / outfit for PT_PRICE each. When the banner changes (new featured character / outfit, new end date, new week)
   its leftover points move to the Permanent points automatically. Pulls on the Permanent and Memory banners (and featured
   banners with nothing featured) give Permanent points (S.spoints.perm), spent in the Permanent shop: 3 random UR characters
   and 3 random UR memories, the same for everyone, changing every month, max 1 of each per month (S.spoints.buy). */
const PT_PRICE = 200, PT_FEAT = ['limited', 'weekly', 'skins'];
function ptKey(bk) {
  if (bk === 'limited') return S.featuredId && limitedUR() ? `${S.featuredId}:${S.banners.limited.end || ''}` : '';
  if (bk === 'weekly') { const w = weeklyUR(); return w ? `w${weekIndex()}:${w.id}` : ''; }
  if (bk === 'skins') { const f = skinFeatured(); return f ? `${f.id}:${S.banners.skins.end || ''}` : ''; }
  return '';
}
function ptState() {
  const P = S.spoints = S.spoints || {}; P.perm = P.perm || 0;
  for (const bk of PT_FEAT) { const k = ptKey(bk), st = P[bk]; if (!st || st.key !== k) { if (st && st.n > 0) P.perm += st.n; P[bk] = { key: k, n: 0 }; } }   // a changed banner hands its points over
  if (!P.buy || P.buy.key !== monthKey()) P.buy = { key: monthKey(), ids: [] };
  return P;
}
const ptOf = bk => { const P = ptState(); return bk === 'perm' ? P.perm : (P[bk] || {}).n || 0; };
function addPoints(bk, n) {
  if (isSpecial(bk) || !(n > 0)) return;
  const P = ptState();
  if (PT_FEAT.includes(bk) && P[bk].key) P[bk].n += n; else P.perm += n;
}
/* the Permanent shop's monthly picks: 3 UR characters + 3 UR memories, shuffled by the month (same for every player) */
function permShopPicks() {
  const seed = weekHash(+monthKey().replace('-', ''));
  const pick = list => { const a = list.slice().sort((x, y) => x.id.localeCompare(y.id)); let x = seed; for (let i = a.length - 1; i > 0; i--) { x = weekHash(x + i); const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, 3); };
  return { chars: pick(urCharsAll()), mems: pick(urMems()) };
}
if (!ICONS.star) ICONS.star = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>';
/* character fragments (wallet cfur / cfssr) are summon RESULTS in the lowest tier, like gold and egg fragments (LOW_DROPS:
   SSR egg fragment 20%, UR egg fragment 6%, SSR character fragment 18%, UR character fragment 8%, else 500 gold).
   Every ×10 holds at least 1 UR and 2 SSR character fragments (CF_MIN10): missing ones replace egg fragments or gold in
   that pull (fragFloor). Exchange → Fragments: 60 for a random character of that rarity, 120 for one you choose. */
const LOW_DROPS = [['ssr', .2], ['ur', .06], ['cfssr', .18], ['cfur', .08]], CF_MIN10 = { cfur: 1, cfssr: 2 }, CF_RANDOM = 60, CF_PICK = 120;
function lowDrop() { const x = Math.random(); let a = 0; for (const [k, p] of LOW_DROPS) { a += p; if (x < a) return k; } return null; }
/* character banners: SSR results are 67% SSR characters, 33% SSR memories */
const SSR_MEM_BK = ['limited', 'weekly', 'standard', 'beginner'], SSR_MEM_CHANCE = .33;   // SSR results: 67% characters, 33% memories
const lowIc = r => r.kind === 'cfrag' ? r.cf : r.kind === 'frag' ? 'frag' + r.frag : 'coins';
function fragFloor(results, bk) {
  for (const k of ['cfur', 'cfssr']) {
    let need = CF_MIN10[k] - results.filter(r => r.kind === 'cfrag' && r.cf === k).length;
    while (need > 0) {
      const i = results.findIndex(r => r.kind === 'frag') >= 0 ? results.findIndex(r => r.kind === 'frag') : results.findIndex(r => r.kind === 'coins');
      if (i < 0) break;
      const old = results[i];
      if (old.kind === 'frag') S.pets.frags[old.frag]--;
      else { const b = booted; booted = false; S.wallet.coins -= old.amount; booted = b; }   // taking the gold back is not "spending"
      S.wallet[k] = (S.wallet[k] || 0) + 1; results[i] = { kind: 'cfrag', rarity: 3, cf: k };
      const h = S.gacha.history[results.length - 1 - i]; if (h && h.banner === bk) h.name = resultView(results[i]).name;
      need--;
    }
  }
  return results;
}
const fragChars = r => S.pool.filter(e => e.type === 'character' && !e.mc && +e.rarity === r && e.pullable !== false);
CUR_SVG.cfur = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cfuG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ad9"/><stop offset=".5" stop-color="#b98bff"/><stop offset="1" stop-color="#7ff0e0"/></linearGradient></defs><path d="M12 2l7 6-2.6 12H7.6L5 8z" fill="url(#cfuG)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 8h14M12 2l-2.4 6L12 20l2.4-12z" fill="none" stroke="#fff" stroke-width=".9" opacity=".7"/></svg>';
CUR_SVG.cfssr = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cfsG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2b8"/><stop offset=".55" stop-color="#ffaa5c"/><stop offset="1" stop-color="#ff7417"/></linearGradient></defs><path d="M12 2l7 6-2.6 12H7.6L5 8z" fill="url(#cfsG)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M5 8h14M12 2l-2.4 6L12 20l2.4-12z" fill="none" stroke="#fff" stroke-width=".9" opacity=".7"/></svg>';
CUR_SVG.ursel = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="uslG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd1f0"/><stop offset=".5" stop-color="#c39bff"/><stop offset="1" stop-color="#8fe9ff"/></linearGradient></defs><rect x="3" y="4" width="18" height="16" rx="3" fill="#2b1855" stroke="url(#uslG)" stroke-width="2"/><path d="M8 12.5l2.6 2.6L16.5 9" fill="none" stroke="url(#uslG)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="5.5" r="2.6" fill="#ffd36b" stroke="#fff" stroke-width=".8"/></svg>';
CUR_SVG.sptp = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sppG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6f7ff"/><stop offset=".5" stop-color="#8fc8ff"/><stop offset="1" stop-color="#5a8cff"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="#14254f" stroke="url(#sppG)" stroke-width="2"/><path d="M12 5.5l5 3v5.8l-5 3.2-5-3.2V8.5z" fill="url(#sppG)"/><path d="M12 5.5v11.9M7 8.5l10 5.8M17 8.5L7 14.3" stroke="#14254f" stroke-width=".8" opacity=".55"/></svg>';
CUR_SVG.spt = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sptG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2fb"/><stop offset=".5" stop-color="#d9b8ff"/><stop offset="1" stop-color="#8fd8ff"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="#2b1855" stroke="url(#sptG)" stroke-width="2"/><path d="M12 5.2l1.9 4.3 4.6.4-3.5 3 1.1 4.6L12 15l-4.1 2.5 1.1-4.6-3.5-3 4.6-.4z" fill="url(#sptG)"/></svg>';
/* everything a banner needs: featured UR (50/50 with a guarantee), the UR pool otherwise, the SSR pool, look and timer */
function bannerInfo(bk) {
  const std = standardURs(), ssr = pullableSSRs();
  if (bk === 'beginner') { const p = beginPicks(); return { bk, kind: 'pool', word: 'BEGINNER', tab: 'Beginner', feat: null, lose: p, ur: p, ssr: ssr.filter(e => e.type === 'character'), ends: null, title: bannerName('beginner'), begin: true }; }
  if (bk === 'stepup') { const f = stepFeat(), lose = std.filter(e => e.type === 'character'); return { bk, kind: 'feat', word: 'STEP-UP', tab: 'Step-Up', feat: f, lose, ur: lose, ssr: ssr.filter(e => e.type === 'character'), ends: null, title: f ? `${f.name} Step-Up` : bannerName('stepup'), step: true }; }
  if (bk === 'limited') { const f = limitedUR(); return { bk, kind: 'feat', word: 'LIMITED', tab: 'Limited', feat: f, lose: std, ur: std, ssr, ends: +new Date((S.banners.limited.end || '2026-11-11') + 'T23:59:00'), title: `${f ? f.name : 'Limited'} Summon` }; }
  if (bk === 'weekly') { const f = weeklyUR(); return { bk, kind: 'feat', word: 'WEEKLY', tab: 'Weekly', feat: f, lose: std, ur: std, ssr, ends: weekEnds(), title: f ? `${f.name} Spotlight` : bannerName('weekly'), note: 'A new random UR every Monday' }; }
  if (bk === 'skins') { const urs = pullableSkins(5), f = skinFeatured(); return { bk, kind: f ? 'feat' : 'pool', word: 'OUTFITS', tab: 'Outfits', feat: f, lose: urs, ur: urs, ssr: pullableSkins(4), ends: skinsEnd(), title: bannerName('skins'), skins: true }; }
  if (bk === 'memories') { const urs = pullableMems(5); return { bk, kind: 'pool', word: 'MEMORIES', tab: 'Memories', feat: null, lose: urs, ur: urs, ssr: pullableMems(4), ends: null, title: bannerName('memories'), mems: true, note: 'Double UR and SSR rates' }; }
  return { bk, kind: 'pool', word: 'PEARL WISH', tab: 'Permanent', feat: null, lose: std, ur: std, ssr, ends: null, title: bannerName('standard') };
}
/* a summon is paid with summon tickets (1 ticket = 1 pull) when you have enough, otherwise with pearls */
/* each banner has its own ticket: Limited tickets for the limited banner, Standard tickets for the permanent one */
const TK = bk => bk === 'standard' || bk === 'memories' || bk === 'beginner' ? 'wishes' : 'tickets';
const TK_NAME = { tickets: 'Limited ticket', wishes: 'Standard ticket' };
const payFor = (n, bk = curBanner) => S.wallet[TK(bk)] >= tkNeed(n, bk) ? { k: TK(bk), amt: tkNeed(n, bk) } : { k: 'pearls', amt: pearlNeed(n, bk) };
const canPull = (n, bk = curBanner) => (!isSpecial(bk) || (n === 10 && bannerOpen(bk))) && (S.wallet[TK(bk)] >= tkNeed(n, bk) || S.wallet.pearls >= pearlNeed(n, bk));
const payHTML = (n, bk = curBanner) => { const p = payFor(n, bk); return `<span class="cost">${curIcon(p.k)}${p.k === 'pearls' ? p.amt : '×' + p.amt}</span>`; };
const freeReady = bk => !isSpecial(bk) && S.freePull[bk] !== dayKey();
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
/* force: 5 = a UR, 'up' = an SSR that is always upgraded to a UR (Max Win), 'mem' = a UR memory, 'feat' = the featured UR
   (Step-Up guarantees); urX scales only the UR rate (Step-Up steps 1 and 5) */
function rollOne(bk, force, urX = 1) {
  const g = S.gacha[bk]; g.pity5++; g.pity4++; g.total++;
  const r = Math.random(), x = RATE_X(bk), p5 = Math.min(1, rate5(g.pity5) * x * urX);
  const beginUR = bk === 'beginner' && g.total >= BEGIN_PULLS;   // the Beginner Banner's pull 50
  let rarity = 3;
  if (force === 5 || force === 'mem' || force === 'feat' || beginUR) rarity = 5; else if (force === 'up') rarity = 4;
  else if (r < p5) rarity = 5; else if (g.pity4 >= 10 || r < p5 + BASE4 * x) rarity = 4;
  if (rarity === 5) { g.pity5 = 0; g.pity4 = 0; } else if (rarity === 4) g.pity4 = 0;
  let item = null, lost = false;
  const B = bannerInfo(bk);
  if (rarity === 5) {
    if (force === 'mem') item = rpick(urMems());
    else if (force === 'feat') { item = B.feat; g.guarantee = false; }
    else if (beginUR) item = B.ur.length ? rpick(B.ur) : null;
    else if (bk === 'beginner') { const m = urMems(); if (m.length) item = rpick(m); else { rarity = 4; item = B.ssr.length ? rpick(B.ssr) : null; } }   // no UR characters before pull 50
    else ({ item, lost } = pickUR(B, g));
  }
  else if (rarity === 4) {
    const sm = SSR_MEM_BK.includes(bk) && Math.random() < SSR_MEM_CHANCE ? pullableMems(4).filter(Boolean) : [];   // character banners sometimes give an SSR memory
    if (sm.length) item = rpick(sm); else if (B.ssr.length) item = rpick(B.ssr);
  }
  // the lowest tier: 500 gold coins, an egg fragment or a character fragment (LOW_DROPS)
  const low = rarity === 3 ? lowDrop() : null, frag = low === 'ssr' || low === 'ur' ? low : null;
  let res;
  if (frag) { S.pets.frags[frag]++; res = { kind: 'frag', rarity, frag }; }
  else if (low) { S.wallet[low] = (S.wallet[low] || 0) + 1; res = { kind: 'cfrag', rarity, cf: low }; }
  else if (!item) {
    const amount = FILLER_COINS[rarity]; S.wallet.coins += amount;
    res = { kind: 'coins', rarity, amount };
  } else {
    res = { kind: 'entry', id: item.id, rarity, lost, ...grantEntry(item) };
    // Corals for every character pulled; more for copies past max stars
    if (item.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[rarity] || 0; S.wallet.starlight += res.starlight; }
    // the rare upgrade: an SSR turns into a UR after it is revealed
    if (rarity === 4 && bk !== 'beginner' && item.type !== 'memory' && (force === 'up' || Math.random() < UPGRADE_CHANCE)) { const up = upgradeSSR(B, g, res); if (up) { res = up.res; item = up.item; rarity = 5; } }
  }
  res.hard = rarity === 5 && p5 >= 1 && !res.up && !force;   // guaranteed by hard pity: never faked out
  S.wallet.dust += DUST_PER_PULL;
  S.gacha.history.unshift({ name: res.kind === 'entry' ? item.name : resultView(res).name, rarity, banner: bk, t: Date.now() });
  if (S.gacha.history.length > 80) S.gacha.history.length = 80;
  return res;
}
/* Max Win rewards: 5 random UR characters + 5 random UR memories (any banner; characters fill in when there are no UR
   memories). One of the characters arrives through the SSR → UR upgrade animation. Counts as 10 pulls (pity reset). */
function maxWinPicks() {
  const chars = S.pool.filter(e => e.type === 'character' && !e.mc && +e.rarity === 5 && e.pullable !== false);
  const mems = (S.memories || []).filter(m => +m.rarity === 5).map(m => memEntry(m.id)).filter(Boolean);
  if (!chars.length) return null;
  const take = (list, k) => { const out = []; let bag = []; while (out.length < k) { if (!bag.length) bag = list.slice().sort(() => Math.random() - .5); out.push(bag.pop()); } return out; };   // distinct while possible
  return [...take(chars, 5), ...take(mems.length ? mems : chars, 5)];
}
function maxWinResults(bk) {
  const picks = maxWinPicks(); if (!picks) return null;
  const g = S.gacha[bk], ssrs = S.pool.filter(e => e.type === 'character' && !e.mc && +e.rarity === 4);
  const out = picks.map(item => { const res = { kind: 'entry', id: item.id, rarity: 5, lost: false, ...grantEntry(item) };
    if (item.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[5] || 0; S.wallet.starlight += res.starlight; }
    return res; });
  if (ssrs.length) { const s = rpick(ssrs); out[0].up = { id: s.id, name: s.name }; }
  g.total += 10; g.pity5 = 0; g.pity4 = 0; S.wallet.dust += DUST_PER_PULL * 10;
  S.unlocks = S.unlocks || []; if (!S.unlocks.includes('max-win')) S.unlocks.push('max-win');   // the Max Winner title, for good
  out.forEach(r => S.gacha.history.unshift({ name: findEntry(r.id).name, rarity: 5, banner: bk, t: Date.now() }));
  if (S.gacha.history.length > 80) S.gacha.history.length = 80;
  return out.sort(() => Math.random() - .5);
}
function doPull(n, bk = curBanner, free = false) {
  const cost = COST[n];
  if (!S.pool.some(e => e.pullable !== false)) { toast('The summon pool is empty. Add entries in the admin panel.'); return; }
  if (isSpecial(bk)) {
    if (free || n !== 10) return;
    if (!bannerOpen(bk)) { toast(bk === 'beginner' ? (beginDone() ? 'You finished the Beginner Banner.' : 'The Beginner Banner is not set up yet.') : stepFeat() ? 'You finished all 7 steps.' : 'The Step-Up is not set up yet.'); return; }
  }
  if (free) { if (!freeReady(bk)) return; S.freePull[bk] = dayKey(); }
  else {
    if (!canPull(n, bk)) { toast(bk === 'stepup' ? `You need ${pearlNeed(n, bk)} pearls for this step.` : `You need ${tkNeed(n, bk)} ${TK_NAME[TK(bk)].toLowerCase()}${tkNeed(n, bk) > 1 ? 's' : ''} or ${pearlNeed(n, bk)} pearls for this pull.`); return; }
    const pay = payFor(n, bk); S.wallet[pay.k] -= pay.amt;
  }
  // Max Win: 0.1% of ×10 summons hold at least 5 URs (one of them upgraded from an SSR) and play every animation (not on the Beginner Banner or Step-Up);
  // only possible from player level 10 with at least 100 summons already made (maxWinOpen)
  const maxwin = n === 10 && !isSpecial(bk) && maxWinOpen() && Math.random() < MAXWIN_CHANCE;
  let bonus = 0, results;
  if (bk === 'stepup') { const sp = stepPull(); results = sp.out; bonus = sp.gold; }
  else results = (maxwin && maxWinResults(bk)) || Array.from({ length: n }, () => rollOne(bk));
  if (n === 10 && !maxwin) fragFloor(results, bk);   // every ×10: at least 1 UR and 2 SSR character fragments
  addPoints(bk, n);   // summon points: 1 per pull (not on the Beginner Banner or Step-Up)
  if (QUEST_CHAR_BANNERS.includes(bk)) questAdd('summon', n);
  gainExp(EXP.pull * n);
  persist(); renderMenu(); refreshSummon();
  showPull(results, n, bk, { maxwin, bonus });
  // remember the best ×10 pulls so they can be replayed: Max Wins, upgrades, and pulls with 2+ URs (with or without the double animation)
  const st0 = pullState;
  if (n === 10 && st0 && (maxwin || results.some(r => r.up) || results.filter(r => r.rarity === 5).length >= 2)) {
    S.gacha.replays = [{ t: Date.now(), bk, results: JSON.parse(JSON.stringify(results)), fake: st0.fake, double: st0.double, rainbow: st0.rainbow, maxwin }, ...(S.gacha.replays || [])].slice(0, 30);
    persist();
  }
  if (S.settings.skipPull && !maxwin) skipPull();   // a Max Win always plays its animation; Skip still shows URs and upgrades (and lets a double UR animation play first)
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
function closeSummon() { if (smEl) { smEl.remove(); smEl = null; } closeProb(); }
function refreshSummon() { if (smEl) renderSummon(); }
/* The summon screen (remade after the owner sent a "Draw Costume" screen as a reference, then made lighter at the owner's
   request: fewer details, more transparency, some text over the art). The banner's UR art is shown WHOLE in a 16:9 card
   (.smx-card); only the banner's name, kind and timer sit over it, in its lower-left corner on a soft shade (.smx-ov:
   splash arts usually keep faces in the upper part), with a small Probability pill in its top-right corner. Everything
   else is in a see-through glass column beside it (.smx-info): the rate-up character, the pity and the points. Layout:
   header (back, Summon pill, Draw record, Shop, currencies), the banner tabs as a rail on the left, the card + column in
   the middle, the milestones bottom left and Skip + the pull buttons bottom right; behind it a blurred copy of the art.
   Portrait phones stack: tabs row, card, column, then the buttons pinned below. */
function renderSummon() {
  if (!smEl) return;
  if (!bannerKeys().includes(curBanner)) curBanner = 'limited';   // the Beginner Banner is gone once finished
  const bk = curBanner, g = S.gacha[bk], B = bannerInfo(bk), f = B.feat;
  // lineup for banners without uploaded art: the featured UR in the middle with SSRs beside it, or the banner's URs
  let line = f ? [f] : B.ur.slice(0, 5);
  if (f) { const side = B.ssr.filter(e => B.skins || e.type === 'character').slice(0, 4); line = [side[1], side[0], ...line, side[2], side[3]].filter(Boolean); }
  const mid = f ? line.indexOf(f) : Math.floor((line.length - 1) / 2);
  const left = HARD_PITY - g.pity5;
  const dotFor = k => canPull(10, k) || freeReady(k) ? '<span class="dot-n"></span>' : '';
  const hero = f || B.ur[smFocus % Math.max(1, B.ur.length)], heroArt = hero && baseArt(hero);
  const tab = k => { const I = bannerInfo(k), on = k === bk, art = I.feat || I.ur[0];
    return `<button class="smx-tab ${on ? 'on' : ''}" data-bk="${k}" aria-pressed="${on}">${art ? `<img src="${baseSplash(art)}" alt="" class="${baseArt(art) ? '' : 'chibi'}">` : ''}<i class="smx-tsh"></i>
      <small>${I.tab}${I.ends ? ` · ${shortLeft(I.ends)}` : ''}</small><b>${esc(I.feat ? I.feat.name : bannerName(k))}</b>${dotFor(k)}</button>`; };
  const pts = PT_FEAT.includes(bk) && ptKey(bk) ? bk : 'perm';
  const left0 = B.ends && shortLeft(B.ends), time = B.ends ? `<span class="smx-time">${icon('clock')}${left0 === 'Ended' ? 'Ended' : `${bk === 'weekly' ? 'Changes in' : 'Ends in'} ${left0}`}</span>` : '';
  const chips = (L, label) => L.length > 1 ? `<div class="smx-chips"><small>${label}</small><div class="sx-feat">${L.map((u, i) => `<button class="${u === hero ? 'on' : ''}" data-focus="${i}" aria-label="Show ${esc(u.name)}">${baseThumb(u)}</button>`).join('')}</div></div>` : '';
  // the words over the art (lower left) and the column's contents
  let ov, info;
  const step = bk === 'stepup' && f, sg = step ? stepState() : null;
  if (B.begin) {
    ov = { kind: 'Beginner · ×10 only · 20% off', name: B.title, sub: B.ur.length ? `Pull ${BEGIN_PULLS} is a guaranteed UR character` : `No UR characters chosen for pull ${BEGIN_PULLS} yet` };
    info = B.ur.length ? smxBeginner(B, hero) : smxSetup();
  } else if (bk === 'stepup') {
    ov = f ? { kind: 'Step-Up · pearls only', name: f.name, sub: B.title, r5: true } : { kind: 'Step-Up', name: B.title, sub: 'No rate-up character set yet' };
    info = f ? smxFeat(f, sg.guarantee) + smxSteps(sg.step || 0) : smxSetup();
  } else if (!line.length) {
    ov = { kind: B.tab, name: B.title, sub: B.skins ? 'No UR outfits on this banner yet' : B.mems ? 'No UR memories yet' : 'No UR on this banner yet' };
    info = smxSetup(B.skins ? 'skins' : B.mems ? 'memories' : 'banners');
  } else {
    ov = { kind: `${B.tab} summon${f ? ' · Rate up' : ''}`, name: f ? f.name : B.title, sub: f ? B.title : B.note || `${B.ur.length} UR ${B.skins ? 'outfits' : B.mems ? 'memories' : 'characters'} · equal chance`, r5: !!f };
    info = (f ? smxFeat(f, g.guarantee) : chips(B.ur, 'Shown on the banner')) + smxLineup(B)
      + `<button class="smx-pts" id="sxPts" title="Summon points: 1 per pull, spend ${PT_PRICE} in the shop">${curIcon(pts === 'perm' ? 'sptp' : 'spt')}<span>Summon points <b>${fmt(ptOf(pts))}</b></span><em>Exchange</em></button>`;
  }
  smEl.className = 'smx';
  smEl.dataset.bk = bk;
  smEl.innerHTML = `<div class="smx-bg" aria-hidden="true">${heroArt ? `<img src="${heroArt}" alt="">` : ''}<i></i></div>
    <header class="smx-head">
      <button class="smx-back" id="sxBack" aria-label="Back">${icon('back')}</button>
      <div class="inv-title"><span class="inv-badge">${icon('sparkle')}</span><h2 class="ts">Summon</h2></div>
      <button class="smx-link" id="sxHist">${icon('clock')}<span>Draw record</span></button>
      <button class="smx-link" data-open="shop">${icon('shop')}<span>Shop</span></button>
      <span class="smx-sp"></span>
      <div class="smx-cur">${(bk === 'stepup' ? ['pearls'] : [TK(bk), 'pearls']).map(k => `<div class="cur" data-k="${k}" title="${k === 'pearls' ? 'Pearls' : `${TK_NAME[k]}s: 1 ticket = 1 pull on this banner`}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b><button class="plus" data-open="${k === 'pearls' ? 'shop' : 'buytickets'}" ${k === 'pearls' ? 'data-shoptab="topup"' : ''} data-tkbk="${bk}" aria-label="Get more ${k}">${icon('plus')}</button></div>`).join('')}</div>
    </header>
    <nav class="smx-tabs" aria-label="Banners">${bannerKeys().map(tab).join('')}</nav>
    <section class="smx-stage"><div class="smx-show">
      <div class="smx-card ${heroArt ? '' : 'noart'}">
        ${heroArt ? `<img class="smx-art" src="${heroArt}" alt="${esc(hero.name)}">` : !line.length || isSpecial(bk) && !hero ? `<div class="smx-empty">${icon('sparkle')}</div>` : `<div class="smx-line">${line.map((e, i) => `<div class="smx-fig ${i === mid ? 'main' : ''}" style="--i:${Math.abs(i - mid)};z-index:${10 - Math.abs(i - mid)}"><img src="${baseSplash(e)}" alt="${esc(e.name)}"></div>`).join('')}</div>`}
        <i class="smx-ovsh"></i>
        <div class="smx-ov"><small class="smx-kind">${esc(ov.kind)}</small><h2 class="smx-name ${ov.r5 ? 'r5' : ''}">${esc(ov.name)}</h2>${ov.sub ? `<span class="smx-sub">${esc(ov.sub)}</span>` : ''}${time}</div>
        <button class="smx-prob" id="sxRates">${icon('info')}<span>Probability</span></button>
      </div>
      <aside class="smx-info">${info}</aside>
    </div></section>
    <footer class="smx-foot">
      <div class="smx-fl">${MILES[bk] ? milestoneBtn(bk) : ''}</div>
      <label class="smx-skip"><input type="checkbox" id="sxSkip" ${S.settings.skipPull ? 'checked' : ''}><i></i>Skip</label>
      <div class="smx-fr">
        ${isSpecial(bk) ? smxSpecialPull(bk) : `
        ${freeReady(bk) ? `<button class="smx-go free" id="sxFree"><b>Free pull</b><small>Once a day</small><span class="dot-n"></span></button>` : ''}
        <button class="smx-go one" data-pull="1"><b>Summon ×1</b>${payHTML(1, bk)}</button>
        <button class="smx-go ten" data-pull="10"><span class="smx-tag"><span class="l">SSR or higher guaranteed</span><span class="s">SSR+ guaranteed</span></span><b>Summon ×10</b>${payHTML(10, bk)}${dotFor(bk)}</button>`}
      </div>
    </footer>`;
  const q = s => smEl.querySelector(s);
  q('#sxBack').onclick = closeSummon;
  smEl.querySelectorAll('[data-focus]').forEach(b => b.onclick = () => { smFocus = +b.dataset.focus; renderSummon(); });
  smEl.querySelectorAll('[data-bk]').forEach(b => b.onclick = () => { if (b.dataset.bk === bk) return; curBanner = b.dataset.bk; smFocus = 0; renderSummon(); });
  smEl.querySelectorAll('[data-pull]').forEach(b => b.onclick = () => doPull(+b.dataset.pull, bk));
  const fr = q('#sxFree'); if (fr) fr.onclick = () => doPull(1, bk, true);
  q('#sxSkip').onchange = e => { S.settings.skipPull = e.target.checked; persist(); };
  q('#sxRates').onclick = () => openProb(bk);
  const ms = q('#sxMile'); if (ms) ms.onclick = e => { const b = e.target.closest('[data-mile]'), m = b && +b.dataset.mile; if (m && mileN('standard') >= m && !stdMiles().includes(m)) return claimStdMile(m); confirmMilestone(ms.dataset.mbk); };
  q('#sxHist').onclick = () => openDrawRecord(bk);
  const pb = q('#sxPts'); if (pb) pb.onclick = () => openShop('points:' + pts);
  const on = q('.smx-tab.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
/* pieces of the glass column */
const smxSetup = (tab = 'banners') => `<p class="smx-note">Nothing to summon here yet.</p><button class="btn ghost sm" data-open="admin" data-adtab="${tab}">${icon('wrench')}Set it up in admin</button>`;
function smxFeat(f, guar) {
  const own = S.owned[f.id] ? 'Owned' : 'Not owned yet';
  return `<div class="smx-fc"><span class="smx-fic">${baseThumb(f)}</span><span class="smx-fct"><small>Rate up ${rtag(5, 'smx-rt')}</small><b>${esc(f.name)}</b><em>${own}${S.owned[f.id] && hasStars(f) ? starRow(starsOf(f.id), -1, f) : ''}</em></span></div>
    <span class="smx-gt ${guar ? 'on' : ''}">${guar ? `${icon('check')}Your next UR is ${esc(f.name)}` : `Every UR is a 50/50 for ${esc(f.name)}`}</span>`;
}
/* a few of the banner's SSRs */
function smxLineup(B) {
  const L = B.ssr.filter(e => e.type === 'character' || e.type === 'skin').slice(0, 5); if (!L.length) return '';
  return `<div class="smx-lu"><small>SSR ${B.skins ? 'outfits' : 'characters'} on this banner</small><div class="smx-lui">${L.map(e => `<span title="${esc(e.name)}">${baseThumb(e)}</span>`).join('')}${B.ssr.length > L.length ? `<em>+${B.ssr.length - L.length}</em>` : ''}</div></div>`;
}
/* the Beginner Banner: 50 pulls drawn as 5 steps of ×10 leading to the guaranteed UR at pull 50 */
function smxBeginner(B, hero) {
  const done = BEGIN_PULLS - beginLeft(), segs = BEGIN_PULLS / 10;
  return `<div class="smx-bgn">
      <div class="smx-bgn-h"><small>Your beginner pulls</small><div class="smx-pl"><b>${done}</b><span>/ ${BEGIN_PULLS}</span><em>${beginLeft()} to go</em></div></div>
      <div class="smx-bgn-t" style="--n:${segs}">${Array.from({ length: segs }, (_, i) => { const p = Math.max(0, Math.min(1, (done - i * 10) / 10)); return `<span class="smx-seg ${p >= 1 ? 'done' : p > 0 ? 'on' : ''}"><i style="width:${p * 100}%"></i><small>${(i + 1) * 10}</small></span>`; }).join('')}
        <span class="smx-bgn-ur" title="Pull ${BEGIN_PULLS}: a UR character"><b><span>UR</span></b></span></div>
      <p class="smx-note">Every ×10 fills one step; the last one ends on a UR character.</p>
      <div class="smx-bgn-p"><small>Pull ${BEGIN_PULLS} gives one of</small><div class="sx-feat">${B.ur.map((u, i) => `<button class="${u === hero ? 'on' : ''}" data-focus="${i}" aria-label="Show ${esc(u.name)}">${baseThumb(u)}</button>`).join('')}</div></div>
    </div>`;
}
function smxSteps(st) {
  const k = n => n >= 1000 ? (n / 1000) + 'k' : n;
  return `<div class="smx-steps"><small>${st >= STEP_N ? 'All steps done' : `Step ${st + 1} of ${STEP_N}`}</small>
    <div class="stp" role="list" aria-label="Steps">${STEP_COST.map((c, i) => `<div class="stp-n ${i < st ? 'done' : i === st ? 'on' : ''} ${STEP_PERK[i] ? 'perk' : ''}" role="listitem" title="${STEP_PERK[i] ? STEP_PERK[i] + ' · ' : ''}+${fmt(STEP_GOLD[i])} gold">
      <b class="stp-no">${i < st ? icon('check') : i + 1}</b><span class="stp-c">${curIcon('pearls')}${c}</span><span class="stp-g">${curIcon('coins')}${k(STEP_GOLD[i])}</span></div>`).join('')}</div>
    <p class="smx-note">Step 4 always holds a UR memory, step 7 the rate-up character.</p></div>`;
}
function smxSpecialPull(bk) {
  const open = bannerOpen(bk), can = canPull(10, bk), dot = can ? '<span class="dot-n"></span>' : '';
  if (bk === 'beginner') { const was = payFor(10, bk).k === 'pearls' ? COST[10] : '×10'; return `<button class="smx-go ten" data-pull="10" ${open ? '' : 'disabled'}><span class="smx-tag">−20%</span><b>Summon ×10</b><span class="sx-disc"><s>${was}</s>${payHTML(10, bk)}</span>${dot}</button>`; }
  const st = stepIdx();
  return st >= STEP_N ? `<button class="smx-go ten" disabled><b>All steps done</b></button>`
    : `<button class="smx-go ten" data-pull="10" ${open ? '' : 'disabled'}><span class="smx-tag">Step ${st + 1} of ${STEP_N}</span><b>Summon ×10</b>${payHTML(10, bk)}${dot}</button>`;
}
/* small icons on the banner tabs: Beginner = a sprout, Step-Up = steps with an arrow, Weekly = a clock (it changes every week) */
const TAB_IC = {
  beginner: ['<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M12 13c0-4 3-6.5 8-6.5 0 4.5-3 6.5-8 6.5zM12 11C12 7.5 9.5 5 5 5c0 4 2.5 6 7 6z" fill="currentColor"/></svg>', 'Beginner: 50 pulls, 20% off, a UR at pull 50'],
  stepup: ['<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20h5v-4h5v-4h5V8h3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><path d="M14 4h6v6M20 4l-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>', 'Step-Up: 7 steps, better odds as you climb'],
  weekly: ['<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 9v4l3 2M9 2h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M19.5 4.5l1.5 1.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>', 'Weekly: a new UR every Monday']
};
/* one-time milestones. Permanent banner: every 100 pulls from 100 to 600 (STD_MILES): a random permanent UR at 100 / 200 /
   400 / 500 and a UR selector (choose one UR from the admin's list) at 300 and 600; claimed ones in S.gacha.standard.miles.
   Memory Banner: one at 50 pulls → a random UR memory (S.gacha.memories.mile). */
const STD_MILES = [100, 200, 300, 400, 500, 600], STD_SEL = [300, 600];
const MILES = { standard: { n: 600, what: 'UR', where: 'the permanent banner', pool: () => standardURs() }, memories: { n: 50, what: 'UR memory', where: 'the Memory Banner', pool: () => (S.memories || []).filter(m => +m.rarity === 5).map(m => memEntry(m.id)).filter(Boolean) } };
const MILESTONE_PULLS = STD_MILES[0];
function stdMiles() { const g = S.gacha.standard; if (!Array.isArray(g.miles)) g.miles = g.mile ? [100] : []; return g.miles; }
const mileN = (bk = 'standard') => Math.min(MILES[bk].n, (S.gacha[bk] || {}).total || 0);
const mileDone = (bk = 'standard') => bk === 'standard' ? STD_MILES.every(m => stdMiles().includes(m)) : !!(S.gacha[bk] || {}).mile;
const stdReady = () => STD_MILES.find(m => !stdMiles().includes(m) && mileN('standard') >= m);
const stdNext = () => STD_MILES.find(m => !stdMiles().includes(m));
function milestoneBtn(bk = 'standard') {
  if (bk === 'standard') {
    // 6 bubbles joined by a grey line that turns yellow as the pulls add up; the next bubble charges a ring around itself
    const n = mileN('standard'), got = stdMiles(), prog = m => Math.max(0, Math.min(1, (n - (m - 100)) / 100));
    return `<div class="mst" id="sxMile" data-mbk="standard" role="group" aria-label="Milestones: ${n} of 600 pulls"><span class="mst-t">Milestones · <b>${n}</b> / 600 pulls</span><div class="mst-row">${STD_MILES.map((m, i) => {
      const sel = STD_SEL.includes(m), claimed = got.includes(m), reached = n >= m, charging = !reached && n >= m - 100, st = claimed ? 'got' : reached ? 'ready' : charging ? 'charge' : '';
      return `${i ? `<i class="mst-ln"><i style="width:${prog(m) * 100}%"></i></i>` : ''}<button class="mst-b ${st}" data-mile="${m}" style="--p:${(reached ? 1 : prog(m)) * 360}deg" aria-label="${m} pulls: ${sel ? 'UR selector' : 'random UR'}${claimed ? ', claimed' : reached ? ', ready to claim' : ''}"><span class="mst-in">${claimed ? icon('check') : sel ? curIcon('ursel') : '<b>UR</b>'}</span><small>${reached && !claimed ? 'Claim' : m}</small></button>`; }).join('')}</div></div>`;
  }
  const M = MILES[bk], n = mileN(bk), done = mileDone(bk), ready = n >= M.n && !done;
  return `<button class="sx-mile ${ready ? 'ready' : ''} ${done ? 'done' : ''}" id="sxMile" data-mbk="${bk}" style="--p:${n / M.n * 360}deg" aria-label="Milestone: ${n} of ${M.n} pulls"><span class="sx-mile-in">${done ? icon('check') : `<b>${n}</b><small>/${M.n}</small>`}</span><span class="sx-mile-lb">${done ? 'Claimed' : ready ? 'Claim UR' : 'Milestone'}</span></button>`;
}
/* the permanent banner's milestone window: all 6 rewards with their state; Claim takes the lowest one reached */
function openStdMiles() {
  const n = mileN('standard'), got = stdMiles(), ready = stdReady();
  openModal({ title: 'Permanent milestones', ic: 'sparkle', small: true, body: `<div class="stack">
    <p class="tiny">Pulls on ${esc(bannerName('standard'))}: <b>${n}</b>. Every 100 pulls up to 600 gives a reward, once.</p>
    <div class="msl">${STD_MILES.map(m => { const sel = STD_SEL.includes(m), st = got.includes(m) ? 'got' : n >= m ? 'ready' : '';
      return `<div class="msl-row ${st}"><b>${m}</b><span class="msl-ic">${sel ? curIcon('ursel') : rtag(5)}</span><span>${sel ? 'UR selector: choose a UR' : 'A random permanent UR'}</span><em>${st === 'got' ? icon('check') + 'Claimed' : st === 'ready' ? 'Ready' : `${m - n} to go`}</em></div>`; }).join('')}</div>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="msNo">Close</button>${ready ? `<button class="btn gold" id="msYes">${icon('sparkle')}Claim ${ready}-pull reward</button>` : ''}</div></div>`,
    onMount: () => { $('#msNo').onclick = closeModal; const y = $('#msYes'); if (y) y.onclick = () => claimStdMile(ready); } });
}
function claimStdMile(m) {
  if (!m || stdMiles().includes(m) || mileN('standard') < m) return;
  closeModal();
  if (STD_SEL.includes(m)) {
    stdMiles().push(m); S.wallet.ursel = (S.wallet.ursel || 0) + 1; persist(); renderMenu(); refreshSummon();
    toast(`${m}-pull milestone: you got a UR selector.`); openUrSelector(); return;
  }
  const urs = standardURs(); if (!urs.length) { toast('There are no permanent URs for this milestone yet.'); return; }
  stdMiles().push(m);
  const item = rpick(urs), res = { kind: 'entry', id: item.id, rarity: 5, lost: false, hard: true, ...grantEntry(item) };
  if (item.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[5] || 0; S.wallet.starlight += res.starlight; }
  S.gacha.history.unshift({ name: item.name, rarity: 5, banner: 'standard', t: Date.now() });
  persist(); renderMenu(); refreshSummon(); showPull([res], 1, 'standard', { preview: true, milestone: true, fake: false, rainbow: false });
}
function confirmMilestone(bk = 'standard') {
  if (bk === 'standard') return openStdMiles();
  const M = MILES[bk];
  if (mileDone(bk)) { toast(`You already claimed the ${M.n}-pull milestone.`); return; }
  const n = mileN(bk);
  if (n < M.n) { toast(`Pull ${M.n - n} more time${M.n - n === 1 ? '' : 's'} on this banner to claim a free random ${M.what}.`); return; }
  const urs = M.pool(); if (!urs.length) { toast(`There are no ${M.what}s for this milestone yet.`); return; }
  openModal({ title: 'Milestone reward', ic: 'sparkle', small: true, body: `<div class="stack" style="justify-content:center;justify-items:center;text-align:center"><p class="desc">You reached ${M.n} pulls on ${M.where}. Claim a free random ${M.what}?</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="msNo">Later</button><button class="btn gold" id="msYes">${icon('sparkle')}Claim</button></div></div>`,
    onMount: () => { $('#msNo').onclick = closeModal; $('#msYes').onclick = () => {
      closeModal(); const item = rpick(urs), res = { kind: 'entry', id: item.id, rarity: 5, lost: false, hard: true, ...grantEntry(item) };
      S.gacha[bk].mile = true; S.gacha.history.unshift({ name: item.name, rarity: 5, banner: bk, t: Date.now() });
      persist(); renderMenu(); refreshSummon(); showPull([res], 1, bk, { preview: true, milestone: true, fake: false, rainbow: false, direct: true });
    }; } });
}
/* UR selector (wallet ursel, from the 300 / 600 milestones): choose one UR character from the admin's list
   (S.banners.standard.sel; empty = every permanent UR character) */
const selPool = () => { const ids = (S.banners.standard && S.banners.standard.sel) || [], list = ids.map(id => findEntry(id)).filter(e => e && e.type === 'character' && +e.rarity === 5); return list.length ? list : standardURs().filter(e => e.type === 'character'); };
/* a picker of characters (UR selector, fragment exchange): tap one, then confirm; onPick(entry) does the rest */
function openCharPicker({ title, ic = 'sparkle', note, list, btn, onPick }) {
  let pick = null;
  const draw = () => {
    const body = $('#cpRoot'); if (!body) return;
    body.innerHTML = `<p class="tiny">${note}</p><div class="cp-grid">${list.map(e => `<button class="cp-card r${e.rarity} ${pick === e.id ? 'on' : ''}" data-cp="${esc(e.id)}"><img src="${baseCard(e)}" alt="" ${baseArt(e) ? `style="${cardImgStyle(e, 'base')}"` : ''}>${rtag(e.rarity)}<span class="cp-nm"><b>${esc(e.name)}</b><small>${owns(e.id) ? starRow(starsOf(e.id), -1, e) : 'Not owned yet'}</small></span>${pick === e.id ? `<span class="cp-ok">${icon('check')}</span>` : ''}</button>`).join('') || '<p class="mall-empty">Nothing to choose from yet.</p>'}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="cpNo">Later</button><button class="btn gold" id="cpYes" ${pick ? '' : 'disabled'}>${btn}</button></div>`;
    body.querySelectorAll('[data-cp]').forEach(b => b.onclick = () => { pick = b.dataset.cp; draw(); });
    $('#cpNo').onclick = closeModal; $('#cpYes').onclick = () => { const e = findEntry(pick); if (!e) return; closeModal(); onPick(e); };
  };
  openModal({ title, ic, wide: true, body: '<div class="stack" id="cpRoot"></div>', onMount: draw });
}
/* grant one character copy outside a summon (selector, fragments, points) and play its reveal */
function giftChar(e, bk = 'standard') {
  const res = { kind: 'entry', id: e.id, rarity: +e.rarity, lost: false, hard: true, ...grantEntry(e) };
  if (e.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[+e.rarity] || 0; S.wallet.starlight += res.starlight; }
  persist(); renderMenu(); refreshCharacters(); refreshSummon(); if (typeof renderShop === 'function') renderShop(); if (typeof renderInventory === 'function' && invEl) renderInventory();
  showPull([res], 1, bk, { preview: true, exchange: true, direct: true });
}
function openUrSelector() {
  if (!(S.wallet.ursel > 0)) { toast('You have no UR selector.'); return; }
  openCharPicker({ title: 'UR selector', note: `Choose one UR character. You have ${S.wallet.ursel} selector${S.wallet.ursel === 1 ? '' : 's'}.`, list: selPool(), btn: `${curIcon('ursel')}Choose`, onPick: e => { if (!(S.wallet.ursel > 0)) return; S.wallet.ursel--; giftChar(e); } });
}
/* ---- Probability: a full page per banner (after the owner's reference: rarity rates on the left, every obtainable item
   with its icon and exact rate on the right). bannerOdds(bk) works the rates out from the same rules rollOne uses, for one
   pull with no pity: rarity first (BASE5 / BASE4, ×2 on the Memory Banner, the Step-Up step's UR multiplier), then an item
   of that rarity with equal chance, except the featured UR's 50/50 (pickUR); 33% of SSR results on the character banners
   are SSR memories (SSR_MEM_CHANCE); 1% of the other SSR results turn into a UR through the upgrade (UPGRADE_CHANCE),
   which is counted in the UR rows; the lowest tier (R) is gold or a fragment (LOW_DROPS). Rows add up to 100%. ---- */
function bannerOdds(bk) {
  const B = bannerInfo(bk), X = RATE_X(bk), urX = bk === 'stepup' ? STEP_UR_X[Math.min(stepIdx(), STEP_N - 1)] : 1;
  const p5 = Math.min(1, BASE5 * X * urX), p4 = Math.min(1 - p5, BASE4 * X), p3 = 1 - p5 - p4;
  const groups = [], add = (key, title, r, items, note) => { const L = items.filter(x => x.p > 0); if (L.length) groups.push({ key, title, r, items: L, note }); };
  const item = (e, p, type) => ({ e, p, type: type || (e.type === 'memory' ? 'Memory' : e.type === 'skin' ? 'Outfit' : e.type === 'pet' ? 'Pet' : e.type === 'character' ? 'Character' : 'Item') });
  const split = (list, p, type) => list.map(e => item(e, p / list.length, type));
  // SSR results
  const sMem = SSR_MEM_BK.includes(bk) ? pullableMems(4).filter(Boolean) : [], sShare = sMem.length ? SSR_MEM_CHANCE : 0;
  let ssrMain = B.ssr.slice(), ssrP = p4 * (1 - sShare), urFromSsr = 0, gold4 = 0, gold5 = 0;
  const canUp = bk !== 'beginner' && (B.feat || B.ur.length) && !B.mems;
  if (!ssrMain.length) { gold4 = ssrP; ssrP = 0; }
  else if (canUp) { urFromSsr = ssrP * UPGRADE_CHANCE; ssrP -= urFromSsr; }
  // UR results (the roll plus the upgrades, which follow the same rules)
  const urAll = p5 + urFromSsr, urGroups = [];
  if (B.begin) {
    const m = urMems();
    if (m.length) urGroups.push(['urmem', 'UR memories', split(m, p5)]);
    else ssrP += p5;   // no UR memories yet: a UR roll before pull 50 gives an SSR character
  } else if (B.feat) {
    const others = B.lose.filter(e => e.id !== B.feat.id);
    urGroups.push(['feat', 'Rate up', [item(B.feat, others.length ? urAll / 2 : urAll)]]);
    if (others.length) urGroups.push(['ur', `Other UR ${B.skins ? 'outfits' : 'characters'} (if you lose the 50/50)`, split(others, urAll / 2)]);
  } else if (B.ur.length) urGroups.push(['ur', `UR ${B.skins ? 'outfits' : B.mems ? 'memories' : 'characters'}`, split(B.ur, urAll)]);
  else gold5 = urAll;
  urGroups.forEach(([k, t, L]) => add(k, t, 5, L));
  add('ssr', `SSR ${B.skins ? 'outfits' : B.mems ? 'memories' : B.begin || B.step ? 'characters' : 'characters and items'}`, 4, split(ssrMain, ssrP));
  add('ssrmem', 'SSR memories', 4, split(sMem, p4 * sShare));
  const lowName = { ssr: 'SSR egg fragment', ur: 'UR egg fragment', cfssr: 'SSR character fragment', cfur: 'UR character fragment' }, lowIc = { ssr: 'fragssr', ur: 'fragur', cfssr: 'cfssr', cfur: 'cfur' };
  const lowSum = LOW_DROPS.reduce((a, d) => a + d[1], 0);
  add('r', 'R items', 3, [
    ...LOW_DROPS.map(([k, w]) => ({ ic: lowIc[k], name: lowName[k], type: 'Item', p: p3 * w })),
    { ic: 'coins', name: `${fmt(COIN_DROP)} gold coins`, type: 'Gold', p: p3 * (1 - lowSum) },
    ...(gold4 ? [{ ic: 'coins', name: `${fmt(FILLER_COINS[4])} gold coins (no SSR on this banner)`, type: 'Gold', p: gold4 }] : []),
    ...(gold5 ? [{ ic: 'coins', name: `${fmt(FILLER_COINS[5])} gold coins (no UR on this banner)`, type: 'Gold', p: gold5 }] : [])]);
  const sum = r => groups.filter(x => x.r === r).reduce((a, x) => a + x.items.reduce((b, i) => b + i.p, 0), 0);
  const tiers = [5, 4, 3].map(r => ({ r, p: sum(r) }));
  // the Beginner Banner's pull 50 is not a per-pull rate: listed on its own, outside the 100%
  const extra = B.begin && B.ur.length ? [{ key: 'b50', title: `Pull ${BEGIN_PULLS} guarantee`, r: 5, items: B.ur.map(e => item(e, 1 / B.ur.length)), at: `at pull ${BEGIN_PULLS}` }] : [];
  return { B, X, urX, p5, p4, p3, urFromSsr, groups, tiers, extra, sMem: sShare };
}
const prTag = r => r === 3 ? ctag(3) : rtag(r);
const pctTxt = v => { const x = v * 100; return x >= 10 ? x.toFixed(2) : x >= 1 ? x.toFixed(3) : x.toFixed(4); };
let prbEl = null, prbBk = 'limited', prbTier = 0;
function openProb(bk = curBanner) {
  prbBk = bk; prbTier = 0; closeModal();
  if (!prbEl) { prbEl = document.createElement('div'); prbEl.className = 'prb'; prbEl.setAttribute('role', 'dialog'); prbEl.setAttribute('aria-label', 'Probability'); document.body.appendChild(prbEl); }
  renderProb();
}
function closeProb() { if (prbEl) { prbEl.remove(); prbEl = null; } }
addEventListener('keydown', e => { if (prbEl && e.key === 'Escape' && !document.querySelector('.modal-back')) { e.stopPropagation(); closeProb(); } }, true);
function renderProb() {
  if (!prbEl) return;
  const bk = prbBk, O = bannerOdds(bk), B = O.B, g = S.gacha[bk], f = B.feat, hero = f || B.ur[0], art = hero && baseArt(hero);
  const kinds = B.skins ? ['Outfits'] : B.mems ? ['Memories'] : B.begin || B.step ? ['Characters', ...(B.begin && urMems().length ? ['UR memories'] : [])] : ['Characters', ...(O.sMem ? ['Memories'] : [])];
  const tierName = { 5: `${B.skins ? 'UR outfits' : B.mems ? 'UR memories' : B.begin ? 'UR memories (pull 50: a UR character)' : 'UR characters'}`, 4: `SSR ${B.skins ? 'outfits' : B.mems ? 'memories' : O.sMem ? 'characters and memories' : 'characters'}`, 3: 'Gold and fragments' };
  const ava = x => {
    if (x.ic) return `<span class="prb-av r3"><span class="prb-ic">${curIcon(x.ic)}</span></span>`;
    const e = x.e, r = +e.rarity;
    if (e.type === 'memory') { const m = (S.memories || []).find(z => z.id === e.id) || e, u = artFrom(m.img); return `<span class="prb-av r${r} mem"><span>${u ? `<img src="${u}" alt="" style="${memIconStyle(m)}">` : icon('memory')}</span></span>`; }
    return `<span class="prb-av r${r}"><span>${baseThumb(e)}</span></span>`;
  };
  const own = x => { const e = x.e; if (!e) return ''; const n = e.type === 'memory' ? memCopiesSt(e.id).length : S.owned[e.id] || 0; return n ? `<em class="prb-own">${hasStars(e) ? `${starsOf(e.id)}★` : n > 1 ? `×${n}` : 'Owned'}</em>` : ''; };
  const row = (x, at) => `<div class="prb-row ${x.e && B.feat && x.e.id === B.feat.id || at ? 'feat' : ''}">${ava(x)}<span class="prb-nm">${prTag(x.e ? +x.e.rarity : 3)}<b>${esc(x.e ? x.e.name : x.name)}</b><small>${x.type}${at ? ` · ${at}` : ''}</small></span>${own(x)}<span class="prb-p">${pctTxt(x.p)}<i>%</i></span></div>`;
  const shown = O.groups.filter(x => !prbTier || x.r === prbTier), count = shown.reduce((a, x) => a + x.items.length, 0);
  const pityBox = B.begin ? `<div class="prb-pity"><b>Your progress</b>
      <div class="prb-pb"><span>Pulls</span><span class="smx-bar"><i style="width:${(BEGIN_PULLS - beginLeft()) / BEGIN_PULLS * 100}%"></i></span><em>${BEGIN_PULLS - beginLeft()} / ${BEGIN_PULLS}</em></div>
      <div class="prb-pb r4"><span>SSR pity</span><span class="smx-bar"><i style="width:${g.pity4 * 10}%"></i></span><em>${g.pity4} / 10</em></div>
      <p>Pull ${BEGIN_PULLS} is a guaranteed UR character: ${B.ur.map(u => `<b>${esc(u.name)}</b>`).join(', ') || 'the 3 chosen URs'}, ${B.ur.length ? (100 / B.ur.length).toFixed(2) + '% each' : ''}.</p></div>`
    : `<div class="prb-pity"><b>Your pity on this banner</b>
      <div class="prb-pb"><span><span class="u">UR</span> pity</span><span class="smx-bar"><i style="width:${g.pity5 / HARD_PITY * 100}%"></i></span><em>${g.pity5} / ${HARD_PITY}</em></div>
      <div class="prb-pb r4"><span>SSR pity</span><span class="smx-bar"><i style="width:${g.pity4 * 10}%"></i></span><em>${g.pity4} / 10</em></div>
      <p>A UR is guaranteed within <b>${HARD_PITY - g.pity5}</b> more pull${HARD_PITY - g.pity5 === 1 ? '' : 's'}${f ? `; ${g.guarantee ? `it will be <b>${esc(f.name)}</b> (you lost the last 50/50)` : `it is a 50/50 for <b>${esc(f.name)}</b>`}` : ''}. SSR or higher comes at least once every 10 pulls.${B.step ? ` You are on step <b>${Math.min(stepIdx() + 1, STEP_N)}</b> of ${STEP_N}${O.urX !== 1 ? ` (${O.urX}× UR rate on this step)` : ''}.` : ''}${MILES[bk] ? ` Milestones: <b>${mileN(bk)}</b> / ${MILES[bk].n} pulls.` : ''}</p></div>`;
  const rules = [
    B.feat ? `<b>Rate up:</b> every UR you get is a 50/50 for <b>${esc(B.feat.name)}</b>; after a lost 50/50 the next UR is ${esc(B.feat.name)}.` : '',
    B.begin ? `No UR character before pull ${BEGIN_PULLS}: a UR roll gives a UR memory instead. ×10 only, 20% off. No SSR → UR upgrades.` : '',
    B.step ? `Steps 1 to 7 cost ${STEP_COST.join(', ')} pearls. Step 1 has half the UR rate, steps 3 and 5 1.5×. Step 4 always holds a UR memory and step 7 always holds ${B.feat ? esc(B.feat.name) : 'the rate-up character'}.` : '',
    B.mems ? 'The Memory Banner has double the UR and SSR rates.' : '',
    bk === 'weekly' ? `The featured UR changes every Monday (00:00 UTC), next in ${shortLeft(B.ends)}.` : '',
    O.sMem ? `${SSR_MEM_CHANCE * 100}% of SSR results are a random SSR memory instead of an SSR character.` : '',
    O.urFromSsr ? `1% of SSR results turn into a UR (the SSR → UR upgrade): that adds ${pctTxt(O.urFromSsr)}% to the UR rows.` : '',
    `Every ×10 holds at least 1 UR and 2 SSR character fragments (they take the place of egg fragments or gold).`,
    `Duplicates add a star, up to ${MAX_STARS}; after that a duplicate character gives ${STARLIGHT_MAX[5]} Corals (UR) or ${STARLIGHT_MAX[4]} (SSR).`,
    'Rates are for one pull with no pity. Each banner keeps its own pity.'].filter(Boolean);
  prbEl.innerHTML = `<div class="prb-bg" aria-hidden="true">${art ? `<img src="${art}" alt="">` : ''}<i></i></div>
    <header class="prb-head"><button class="smx-back" id="prbBack" aria-label="Back">${icon('back')}</button>
      <div class="inv-title"><span class="inv-badge">${icon('info')}</span><h2 class="ts">Probability</h2></div>
      <span class="prb-bn">${esc(B.title)}</span><span class="smx-sp"></span>
      <button class="inv-x" id="prbClose" aria-label="Close">${icon('close')}</button></header>
    <div class="prb-body">
      <section class="prb-left">
        <p class="prb-can">You can get ${kinds.map(k => `<b>${k}</b>`).join(' and ')} from this banner.</p>
        <small class="prb-lbl">${B.step ? `Step ${Math.min(stepIdx() + 1, STEP_N)} · ×10` : B.begin ? 'Beginner summon · ×10' : 'Regular summon'} · draw rate</small>
        <div class="prb-tiers">
          <button class="prb-tier all ${prbTier ? '' : 'on'}" data-ptier="0"><span class="prb-tn">All items</span><b>100<i>%</i></b></button>
          ${O.tiers.map(t => `<button class="prb-tier r${t.r} ${prbTier === t.r ? 'on' : ''}" data-ptier="${t.r}">${prTag(t.r)}<span class="prb-tn">${tierName[t.r]}</span><b>${pctTxt(t.p)}<i>%</i></b></button>`).join('')}
        </div>
        ${pityBox}
        <details class="prb-rules" ${innerWidth > 900 ? 'open' : ''}><summary>Rules</summary><ul>${rules.map(r => `<li>${r}</li>`).join('')}</ul></details>
      </section>
      <section class="prb-right">
        <div class="prb-rh"><b>Obtainable items</b><small>${count} item${count === 1 ? '' : 's'}${prbTier ? ` · ${prbTier === 3 ? 'R' : RNAME[prbTier]}` : ''}</small></div>
        <div class="prb-list">${O.extra.filter(x => !prbTier || x.r === prbTier).map(x => `<div class="prb-grp r${x.r}"><div class="prb-gh">${prTag(x.r)}<span>${x.title}</span><em>${x.at}</em></div>${x.items.map(i => row(i, x.at)).join('')}</div>`).join('')}${shown.map(x => `<div class="prb-grp r${x.r}"><div class="prb-gh">${prTag(x.r)}<span>${x.title}</span><em>${pctTxt(x.items.reduce((a, i) => a + i.p, 0))}%</em></div>${x.items.map(i => row(i)).join('')}</div>`).join('') || '<p class="tiny">Nothing on this banner yet.</p>'}</div>
      </section>
    </div>`;
  prbEl.querySelector('#prbBack').onclick = prbEl.querySelector('#prbClose').onclick = closeProb;
  prbEl.querySelectorAll('[data-ptier]').forEach(b => b.onclick = () => { prbTier = +b.dataset.ptier; renderProb(); });
}
/* the draw record: best pulls to replay + the history of this banner (what the old Rates window also held) */
function openDrawRecord(bk) {
  const g = S.gacha[bk], B = bannerInfo(bk);
  const t = e => new Date(e.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const hist = S.gacha.history.filter(h => (h.banner || 'limited') === bk);
  openModal({ title: `Draw record · ${B.title}`, ic: 'clock', wide: true, body: `<div class="stack">
    ${replaysHTML()}
    <details open><summary>History · ${fmt(g.total)} pulls on this banner</summary>
      <div class="hist">${hist.length ? hist.map(h => `<div class="r${h.rarity}"><span>${h.rarity >= 4 ? rtag(h.rarity) : '<span class="cost">' + curIcon('coins') + '</span>'} ${esc(h.name)}</span><time>${t(h)}</time></div>`).join('') : '<p class="tiny">No pulls yet.</p>'}</div>
    </details>
    <button class="btn ghost sm" id="drProb" style="justify-self:start">${icon('info')}Probability</button>
  </div>`, onMount: root => { bindReplays(root); const b = root.querySelector('#drProb'); if (b) b.onclick = () => openProb(bk); } });
}
/* the old name still works (the summon screen's ? and older links): openRates(bk) = the Probability page, (bk, true) = the draw record */
function openRates(bk = curBanner, histOpen) { if (histOpen) openDrawRecord(bk); else openProb(bk); }
/* best ×10 pulls (S.gacha.replays, newest first): Max Wins, upgrades, 2+ URs; Replay plays the exact same animation again */
function replayTags(x) { const urs = x.results.filter(r => r.rarity === 5).length, up = x.results.filter(r => r.up).length; return [x.maxwin ? '<span class="rp-tag mw">MAX WIN</span>' : '', urs >= 2 ? `<span class="rp-tag ur">UR ×${urs}</span>` : '', x.double ? '<span class="rp-tag dbl">Double</span>' : '', up ? `<span class="rp-tag up">Upgrade${up > 1 ? ' ×' + up : ''}</span>` : '', x.rainbow ? '<span class="rp-tag rb">Rainbow</span>' : ''].join(''); }
function replaysHTML() {
  const L = S.gacha.replays || [], t = x => new Date(x.t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `<details class="rp" open><summary>Best pulls · replay (${L.length})</summary>${L.length ? `<div class="rp-list">${L.map((x, i) => `<div class="rp-row ${x.maxwin ? 'mw' : ''}"><span class="rp-tags">${replayTags(x)}</span><span class="rp-meta">${esc(bannerName(x.bk))} · ${t(x)}</span><button class="btn gold sm" data-replay="${i}">${icon('sparkle')}Replay</button></div>`).join('')}</div>` : '<p class="tiny">Your ×10 pulls with 2 or more URs, an SSR → UR upgrade or a Max Win are saved here so you can watch them again.</p>'}</details>`;
}
function bindReplays(root) {
  (root || document).querySelectorAll('[data-replay]').forEach(b => b.onclick = () => { const x = (S.gacha.replays || [])[+b.dataset.replay]; if (!x) return; closeModal(); if (typeof closeSummon === 'function' && false) closeSummon();
    showPull(JSON.parse(JSON.stringify(x.results)), 10, x.bk, { preview: true, replay: x.t, fake: !!x.fake, double: !!x.double, rainbow: !!x.rainbow, maxwin: !!x.maxwin }); });
}

/* pull animation */
let pullEl = null, pullState = null;
const PAL = { 3: ['#5aa9ff', '#9fd3ff', '#ffffff'], 4: ['#ff8a2a', '#ffb067', '#ffe2b8', '#ffffff'], 5: ['#a855f7', '#ff6ec7', '#3ee6d0', '#c58bff', '#ffffff'] };
const TIER_BURST = { 3: 1, 4: 1.55, 5: 2.1 }, TIER_REVEAL = { 3: 1.6, 4: 2.6, 5: 3.2 };
const rpick = a => a[Math.floor(Math.random() * a.length)];
function resultView(r) {
  if (r.kind === 'coins') return { name: `${fmt(r.amount)} gold coins`, type: 'Gold coins', img: null };
  if (r.kind === 'frag') return { name: `${EGG[r.frag].name} fragment`, type: 'Egg fragment', img: null };
  if (r.kind === 'cfrag') return { name: `${r.cf === 'cfur' ? 'UR' : 'SSR'} character fragment`, type: 'Character fragment', img: null };
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
  let W2 = 0, H2 = 0, dpr2 = 1, raf = 0, last = t0, burstDone = false, sparkTier = 0, sparkFrom = 0, sparkUntil = 0, ambTier = 0;
  const amb = { flare: 0, twk: 0, dust: 0, bokeh: 0 };
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
    // gentle never-ending sparkles in one rarity's colours (the summon results screen)
    ambient(t) { ambTier = t; sparkTier = t; sparkUntil = 0; },
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
    if (ambTier) {
      const cfg = SPARK[ambTier], k = dt * .3, sz = cfg.size;
      amb.flare += cfg.flare * k * .35; amb.twk += cfg.twk * k * .6; amb.dust += cfg.dust * k; amb.bokeh += cfg.bokeh * k;
      while (amb.flare >= 1) { amb.flare--; const life = 1.2 + Math.random() * .8; spark('flare', { x: Math.random() * W2, y: Math.random() * H2 * .9, life, max: life, size: (22 + Math.random() * 30) * sz }); }
      while (amb.twk >= 1) { amb.twk--; const life = .6 + Math.random() * .7; spark('twk', { x: Math.random() * W2, y: Math.random() * H2, life, max: life, size: (8 + Math.random() * 14) * sz }); }
      while (amb.dust >= 1) { amb.dust--; const life = 2 + Math.random() * 2; spark('dust', { x: Math.random() * W2, y: H2 * (.3 + Math.random() * .8), vx: (Math.random() - .5) * 16, vy: -(16 + Math.random() * 40), life, max: life, size: (2 + Math.random() * 4) * sz }); }
      while (amb.bokeh >= 1) { amb.bokeh--; const life = 2.6 + Math.random() * 1.6; spark('bokeh', { x: Math.random() * W2, y: H2 * (.3 + Math.random() * .8), vx: (Math.random() - .5) * 8, vy: -(8 + Math.random() * 18), life, max: life, size: (26 + Math.random() * 54) * sz }); }
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
const FAKEOUT_CHANCE = .3, DOUBLE_CHANCE = .5, MAXWIN_CHANCE = .001;
const MAXWIN_LV = 10, MAXWIN_PULLS = 100;   // a Max Win can only happen from player level 10 and after 100 summons (every banner counts)
const maxWinOpen = () => playerLv().lv >= MAXWIN_LV && totalPulls() >= MAXWIN_PULLS;
function fakeArt() {
  const own = (S.fakeArts || []).map(k => MEDIA.get(k)).filter(Boolean);
  if (own.length) return rpick(own);
  const f = findEntry(S.featuredId); return f ? baseSplash(f) : null;
}
function showPull(results, n, bk, opts = {}) {
  closePull(true);
  const best = Math.max(...results.map(r => r.up ? 4 : r.rarity));
  // Max Win plays everything: fakeout → double → rainbow
  const maxwin = !!opts.maxwin && best >= 4;
  // secret double: 2 or more URs in one pull (any number of URs), half the time (DOUBLE_CHANCE): after the sphere turns UR, two set wallpapers slide in split on the diagonal
  const double = maxwin || (best === 5 && opts.double !== false && (opts.double || (results.filter(r => r.rarity === 5).length >= 2 && Math.random() < DOUBLE_CHANCE)));
  const fake = maxwin || (!double && best === 5 && !results.some(r => r.rarity === 5 && !r.up && r.hard) && (opts.fake ?? Math.random() < FAKEOUT_CHANCE));
  // rainbow: when the pull holds the limited banner's featured UR, half the time the UR sphere turns rainbow (a sure sign)
  const featId = bk === 'limited' && bannerInfo('limited').feat ? bannerInfo('limited').feat.id : null;
  const rainbow = maxwin || best === 5 && (opts.rainbow ?? (!!featId && results.some(r => r.rarity === 5 && !r.up && r.id === featId) && Math.random() < RAINBOW_CHANCE));
  pullEl = document.createElement('div');
  const pbg = MEDIA.get('pull:bg');
  pullEl.className = `pull t3 r3 charging ${pbg ? 'has-bg' : ''}`;
  pullEl.setAttribute('role', 'dialog'); pullEl.setAttribute('aria-label', 'Summon results');
  pullEl.innerHTML = `${pbg ? artImg('pull:bg', 'pull-bg') : ''}<div class="sph-stage"><canvas class="sph-back"></canvas><div class="sph-beam"></div><div class="sph c3" id="sph"><i class="sph-swirl"></i><i class="sph-core"></i><i class="sph-glint"></i><i class="sph-glint g2"></i><i class="sph-glint g3"></i><i class="sph-glint g4"></i><i class="sph-glint g5"></i><i class="sph-aura"></i></div><canvas class="sph-front"></canvas></div>
    <div class="sph-hint tap" id="sphHint"><b>Tap to release</b><span class="tap-ring"></span></div>
    <div id="pullStage"></div><canvas class="pfx"></canvas><button class="btn ghost sm pull-skip" id="pullSkip">Skip</button>`;
  document.body.appendChild(pullEl);
  const fx = startPfx(pullEl.querySelector('.pfx'), 3); fx.intro = false;
  pullState = { results, n, bk, best, fake, double, rainbow, maxwin, bonus: opts.bonus || 0, cfrag: opts.cfrag || null, replay: opts.replay || null, preview: !!opts.preview, exchange: !!opts.exchange, milestone: !!opts.milestone, i: -1, phase: 'charge', readyAt: 0, order: results.map((r, i) => i), fx, timers: [] };
  pullState.sfx = startSphereFx(pullEl);
  pullEl.addEventListener('click', e => { if (e.target.closest('button')) return; tapPull(); });
  $('#pullSkip').onclick = () => skipPull();
  if (pullState.maxwin) $('#pullSkip').hidden = true;   // no skipping a Max Win's animation (it comes back for the reveals)
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
  const sph = $('#sph'); sph.classList.remove('c3', 'c4', 'c5', 'c6', 'c7', 'pulse'); void sph.offsetWidth; sph.classList.add('c' + t, 'pulse');
  const sf = pullState && pullState.sfx; if (sf) { sf.tier = t; sf.surge(t); }
  if (t >= 5) { pullEl.classList.remove('quake'); void pullEl.offsetWidth; pullEl.classList.add('quake'); }
}
function releaseSphere() {
  const st = pullState; if (!st || st.phase !== 'charge') return;
  st.phase = 'rise'; pullClear(st);
  pullEl.classList.remove('charging', 'dragging'); pullEl.classList.add('rising');
  $('#sph').style.setProperty('--drag', '0px');
  const rise = RISE_MS[st.fake ? 4 : st.best]; pullEl.style.setProperty('--rise', rise / 1000 + 's');   // a fakeout rises at SSR speed
  if (st.best >= 4) pullLater(rise * .3, () => sphereTier(4));
  // once the rise is done the sphere keeps drifting up very slowly until it bursts
  pullLater(rise, () => { if (pullEl) pullEl.classList.add('drift'); });
  let urAt;
  // fakeout: the sphere finishes its rise as an SSR; where the SSR would burst, the wallpaper pops up instead and the sphere turns UR
  const slow = st.maxwin ? 1.35 : 1;   // Max Win takes its time between the steps
  if (st.fake) { const fIn = rise + 400; pullLater(fIn, fakeArtIn); urAt = fIn + 2000 * slow; pullLater(urAt, fakeTransform); pullLater(urAt + 1300 * slow, fakeArtOut); urAt += 500; }
  else if (st.best === 5) { urAt = rise * .62; pullLater(urAt, () => sphereTier(5)); }
  let after = st.fake ? urAt + 1500 : rise + (st.best === 3 ? 250 : 400);
  // double: the sphere is already UR, then the two wallpapers slide in, hold, and blow out
  // the double waits a moment after the sphere turns UR (longer in a Max Win) before its wallpapers slide in
  if (st.double) { const inAt = st.fake ? urAt + (st.maxwin ? 2600 : 2000) : Math.max(urAt + 1900, rise + 300); const hold = st.maxwin ? 3400 : 2800; pullLater(inAt, doubleArtIn); pullLater(inAt + hold, doubleArtOut); after = inAt + hold + 700; urAt = inAt + hold; }
  if (st.rainbow) { const rbAt = st.double ? urAt + (st.maxwin ? 1500 : 800) : Math.max(urAt + 1500, rise + 200); pullLater(rbAt, rainbowSphere);
    // Max Win: after the rainbow the sphere turns blood red (the SSS colours) over its own wallpaper, with red lightning from below
    if (st.maxwin) { const sssAt = rbAt + 3000; pullLater(sssAt, sssSphere); pullLater(sssAt + 4600, burstSphere); }
    else pullLater(rbAt + 2400, burstSphere); }
  else pullLater(after, burstSphere);
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
/* Max Win's last step: the rainbow sphere turns into a glowing red SSS sphere, the Max Win wallpaper (admin, media key mw:bg;
   without one a pulled UR's art, then the fakeout wallpaper) fades in behind it, and the background fills with red lightning
   striking up from the bottom of the screen, flames, embers and sparks in red / orange / pink / gold (tier 7 in startSphereFx) */
function maxWinArt(results) {
  const own = MEDIA.get('mw:bg'); if (own) return own;
  const urs = results.filter(r => r.rarity === 5 && r.kind === 'entry' && findEntry(r.id) && findEntry(r.id).type === 'character').map(r => baseArt(findEntry(r.id))).filter(Boolean);
  return urs[2] || urs[urs.length - 1] || fakeArt();
}
function sssSphere() {
  const st = pullState; if (!st || !pullEl) return;
  const art = maxWinArt(st.results);
  pullEl.querySelectorAll('.rb-screen').forEach(x => x.classList.add('out'));
  pullEl.classList.add('sss');
  pullEl.insertAdjacentHTML('afterbegin', `<div class="mw-screen">${art ? `<img src="${art}" alt="" style="${art === MEDIA.get('mw:bg') ? artPosStyle('mw:bg') : ''}">` : ''}<i class="mw-tint"></i><i class="mw-rays"></i><i class="mw-glow"></i></div>`);
  pullEl.insertAdjacentHTML('beforeend', '<div class="fake-flash mw-flash"></div>');
  sphereTier(7);
  st.fx.burst(240, 1000, 5);
  if (st.sfx) st.sfx.shock();
}
/* the double's wallpapers are set in admin: left (media key dbl:left) and right (dbl:right); a missing side uses the
   pulled URs' own art (first UR on the left, second on the right), then the fakeout wallpaper */
function doubleArts(results) {
  const urs = results.filter(r => r.rarity === 5 && r.kind === 'entry' && !r.up).map(r => { const e = findEntry(r.id); return e && baseArt(e); }).filter(Boolean);
  const left = MEDIA.get('dbl:left') || urs[0] || fakeArt(), right = MEDIA.get('dbl:right') || urs[1] || urs[0] || fakeArt();
  return left || right ? [left || right, right || left] : [];
}
/* Skip on a double UR: no tap, no rise; the sphere is UR at the top at once and the double plays ~1 s later */
function jumpToDouble(st) {
  if (!pullEl) return;
  pullClear(st); st.phase = 'rise';
  const hint = $('#sphHint'); if (hint) hint.hidden = true;
  pullEl.classList.remove('charging', 'dragging'); pullEl.classList.add('rising', 'drift');
  pullEl.style.setProperty('--rise', '.4s');
  const sph = $('#sph'); if (sph) sph.style.setProperty('--drag', '0px');
  sphereTier(5);
  const inAt = 1000, hold = 2800;
  pullLater(inAt, doubleArtIn); pullLater(inAt + hold, doubleArtOut);
  if (st.rainbow) { const rb = inAt + hold + 800; pullLater(rb, rainbowSphere); pullLater(rb + 2400, burstSphere); }
  else pullLater(inAt + hold + 700, burstSphere);
}
function doubleArtIn() {
  const st = pullState; if (!st || !pullEl) return;
  st.dblStarted = true; if ($('#pullSkip')) $('#pullSkip').hidden = true;   // the double itself always plays
  const [a, b] = doubleArts(st.results); if (!a) return;
  pullEl.insertAdjacentHTML('beforeend', `<div class="fk-art dbl"><div class="fk-half a"><img src="${a}" alt=""></div><div class="fk-half b"><img src="${b}" alt=""></div>
    <svg class="fk-split" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="82.24" y1="-2" x2="17.76" y2="102"/></svg><i class="fk-streak"></i></div>`);
  if (st.fx) st.fx.burst(80, 560, 5);
}
function doubleArtOut() {
  const st = pullState; if (!st || !pullEl) return;
  const a = pullEl.querySelector('.fk-art.dbl'); if (a) a.classList.add('out');
  pullEl.insertAdjacentHTML('beforeend', '<div class="fake-flash"></div>');
  pullEl.classList.remove('quake'); void pullEl.offsetWidth; pullEl.classList.add('quake');
  if (st.fx) st.fx.burst(140, 760, 5);
}
function fakeArtIn() {
  const st = pullState, art = fakeArt(); if (!st || !pullEl || !art) return;
  // exactly the normal SSR burst (same flash, particles and shockwave), but where the "SSR" text would appear the wallpaper
  // slides in instead; the sphere comes back as UR over it (fakeTransform)
  pullEl.classList.add('burst', 'fk-burst');
  pullEl.insertAdjacentHTML('beforeend', '<div class="sph-flash"></div>');
  st.fx.burst(150, 760, 4);
  if (st.sfx) st.sfx.shock();
  pullLater(250, () => { if (pullEl) pullEl.insertAdjacentHTML('beforeend', `<div class="fk-art"><img src="${art}" alt=""><i class="fk-streak"></i></div>`); });
}
function fakeTransform() {
  const st = pullState; if (!st || !pullEl) return;
  pullEl.classList.remove('burst', 'fk-burst'); pullEl.querySelectorAll('.sph-flash').forEach(x => x.remove()); pullEl.classList.add('fakeout', 'sph-return');
  if (st.maxwin) pullEl.classList.remove('drift');   // Max Win: the UR sphere comes back in the middle and stays there (no more creeping up)
  pullEl.insertAdjacentHTML('beforeend', '<div class="fake-flash"></div>');   // no ray burst: lightning, flash and the quake carry it
  $('#sph').classList.add('crack');
  sphereTier(5);
  st.fx.burst(120, 640, 5);
}
/* the fakeout wallpaper fades away once the UR sphere has shown itself over it */
function fakeArtOut() { const a = pullEl && pullEl.querySelector('.fk-art:not(.dbl)'); if (a) a.classList.add('out'); }
function burstSphere() {
  const st = pullState; if (!st || !pullEl) return;
  st.phase = 'burst';
  pullEl.classList.add('burst');
  pullEl.insertAdjacentHTML('beforeend', `<div class="sph-flash"></div>${st.best >= 4 ? `<div class="stamp now ${st.best === 5 ? 'up' : ''} ${st.rainbow && !st.maxwin ? 'rb' : ''} ${st.maxwin ? 'mw' : ''}">${st.maxwin ? 'MAX WIN' : RNAME[st.best]}</div>` : ''}`);
  st.fx.burst(st.best === 5 ? 260 : st.best === 4 ? 150 : 60, st.best === 5 ? 1000 : st.best === 4 ? 760 : 460, st.best);
  if (st.sfx) st.sfx.shock();
  pullLater(st.best >= 4 ? 1500 : 700, advancePull);
}
/* the sphere's surroundings, drawn on two canvases (behind and in front of the sphere): glowing sparks drifting upward
   and soft vertical light streaks in the tier's colours (like an anime power-up); orbiting sparks on tilted rings (the
   far half behind the sphere, the near half in front, so it reads as 3D); lightning that crawls over the sphere at SSR and
   lashes out into the air at UR; sparks pulled in while charging; a shockwave ring when it bursts */
const SPH_COL = { 7: ['#ff2a3d', '#ff7a3d', '#ff2a6e', '#ffd36b', '#ff4d4d', '#ffb0c8'], 6: ['#ff4d6d', '#ffa24d', '#fff04d', '#5dff8a', '#4dd2ff', '#a66bff'], 3: ['#2f6bff', '#5aa9ff', '#c4e6ff'], 4: ['#ff7417', '#ffaa5c', '#ffe6c2'], 5: ['#a855f7', '#ff6ec7', '#8ff7ea', '#ffd36b'] };
function startSphereFx(root) {
  const back = root.querySelector('.sph-back'), front = root.querySelector('.sph-front'), sphEl = root.querySelector('#sph');
  const bg = back.getContext('2d'), fg = front.getContext('2d');
  let W = 0, H = 0, dpr = 1, raf = 0, last = performance.now(), nextBolt = 0, flash = 0, shockT = -1, boost = 0;
  const bolts = [], motes = [], rise = [], streaks = [], gbolts = [], flames = [], t0 = performance.now();
  let nextGround = 0;
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; [back, front].forEach(c => { c.width = W * dpr; c.height = H * dpr; }); };
  fit(); addEventListener('resize', fit);
  const api = { tier: 3,
    surge(t) { const big = t >= 5; boost = t >= 7 ? 2.4 : big ? 1.6 : 1; flash = t >= 7 ? .8 : big ? .55 : .25; if (big) { for (let i = 0; i < (t >= 7 ? 9 : 5); i++) bolt(true); } if (t >= 7) for (let i = 0; i < 4; i++) groundBolt(); },
    shock() { shockT = 0; flash = .4; boost = 2; },
    stop() { cancelAnimationFrame(raf); removeEventListener('resize', fit); } };
  const col = (i, ph = 0) => { const c = SPH_COL[api.tier] || SPH_COL[3], k = api.tier >= 5 ? Math.floor(i + ph) : i; return c[((k % c.length) + c.length) % c.length || 0] || c[0]; };   // always a valid colour
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
  // Max Win (tier 7): red lightning striking up from the bottom of the screen, forking as it climbs
  function groundBolt() {
    const sx = Math.random() * W, ex = sx + (Math.random() - .5) * W * .35, ey = H * (.15 + Math.random() * .45);
    const pts = [[sx, H + 8]], len = Math.hypot(ex - sx, ey - H); zig(sx, H + 8, ex, ey, len * .35, 7, pts);
    const branches = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => { const p = pts[Math.floor(pts.length * (.2 + Math.random() * .6))], br = [[p[0], p[1]]]; zig(p[0], p[1], p[0] + (Math.random() - .5) * len * .5, p[1] - Math.random() * len * .4, len * .2, 5, br); return br; });
    const c = ['#ff2a3d', '#ff2a3d', '#ff7a3d', '#ff2a6e', '#ffd36b'][Math.floor(Math.random() * 5)];
    gbolts.push({ pts, branches, life: .42, max: .42, w: 3.6, c }); flash = Math.max(flash, .28);
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
    if (tier >= 7) {
      // Max Win: flames licking up from the bottom edge, a red glow along the floor, and lightning striking up from below
      const fl = bg.createLinearGradient(0, H, 0, H * .55); fl.addColorStop(0, `rgba(255,40,60,${.42 + .12 * Math.sin(t * 6)})`); fl.addColorStop(.45, 'rgba(255,90,40,.14)'); fl.addColorStop(1, 'rgba(0,0,0,0)');
      bg.fillStyle = fl; bg.fillRect(0, H * .55, W, H * .45);
      if (flames.length < 46 && Math.random() < .9) flames.push({ x: Math.random() * W, y: H + 30, r: 30 + Math.random() * 70, vy: 120 + Math.random() * 160, life: 1 + Math.random() * .8, max: 0, c: Math.floor(Math.random() * 6) });
      bg.save(); bg.globalCompositeOperation = 'lighter';
      for (let i = flames.length - 1; i >= 0; i--) { const f = flames[i]; if (!f.max) f.max = f.life; f.life -= dt; f.y -= f.vy * dt; f.x += Math.sin(t * 3 + i) * dt * 30; if (f.life <= 0) { flames.splice(i, 1); continue; }
        const q = f.life / f.max, r = f.r * (.4 + q * .6), gr = bg.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, rgba(col(f.c), .35 * q)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        bg.fillStyle = gr; bg.fillRect(f.x - r, f.y - r, r * 2, r * 2); }
      bg.restore();
      if (now > nextGround) { groundBolt(); if (Math.random() < .35) groundBolt(); nextGround = now + 140 + Math.random() * 380; }
    }
    bg.lineCap = 'round'; bg.lineJoin = 'round';
    for (let i = gbolts.length - 1; i >= 0; i--) {
      const bo = gbolts[i]; bo.life -= dt; if (bo.life <= 0) { gbolts.splice(i, 1); continue; }
      bg.globalAlpha = (bo.life / bo.max) * (Math.random() < .3 ? .45 : 1);
      [bo.pts, ...bo.branches].forEach((pts, j) => { stroke(bg, pts, bo.w * (j ? .5 : 1) * 3, rgba(bo.c, .5), bo.c); stroke(bg, pts, bo.w * (j ? .45 : 1) * .8, '#fff', bo.c); });
      bg.globalAlpha = 1;
    }
    bg.shadowBlur = 0;
    if (shockT >= 0) {   // burst shockwave across the water and the air
      shockT += dt; const q = shockT / .9;
      if (q < 1 && b) { fg.beginPath(); fg.arc(b.x, b.y, 40 + q * Math.max(W, H) * .8, 0, 7); fg.strokeStyle = rgba(col(2), (1 - q) * .8); fg.lineWidth = 10 * (1 - q) + 1; fg.shadowColor = col(1); fg.shadowBlur = 30; fg.stroke(); fg.shadowBlur = 0; }
    }
    if (b && b.o > .05) {
      // soft light rays fanning out behind the sphere, slowly turning (a magic star, not a planet's ring)
      const nr = tier >= 4 ? 6 + tier * 3 : 0, rl = b.r * (2.2 + tier * .45 + pp * 1.4);
      bg.save(); bg.translate(b.x, b.y); bg.globalCompositeOperation = 'lighter';
      for (let j = 0; j < nr; j++) {
        const a = j / nr * Math.PI * 2 + t * .18 * (j % 2 ? 1 : -.6), w = b.r * (.16 + .06 * Math.sin(t * 2 + j)), L = rl * (.7 + .3 * Math.sin(t * 1.3 + j * 1.7));
        const gr = bg.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); gr.addColorStop(0, rgba(col(j % 3, t), .45 * b.o)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        bg.fillStyle = gr; bg.beginPath(); bg.moveTo(Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w); bg.lineTo(Math.cos(a) * L, Math.sin(a) * L); bg.lineTo(Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w); bg.closePath(); bg.fill();
      }
      bg.restore();
      // energy wisps spiralling into the sphere from every direction
      const W2 = root._wisps || (root._wisps = []);
      if (W2.length < 12 + tier * 9 && Math.random() < .65 + pp) W2.push({ a: Math.random() * 7, d: b.r * (2 + Math.random() * 1.6), s: (Math.random() < .5 ? -1 : 1) * (1.4 + Math.random()), c: Math.floor(Math.random() * 3), tr: [] });
      fg.lineCap = 'round';
      for (let i = W2.length - 1; i >= 0; i--) {
        const w = W2[i]; w.a += w.s * dt * (1.2 + pp); w.d -= dt * b.r * (1 + pp * 1.5);
        const x = b.x + Math.cos(w.a) * w.d, y = b.y + Math.sin(w.a) * w.d; w.tr.push([x, y]); if (w.tr.length > 9) w.tr.shift();
        if (w.d < b.r * .85) { W2.splice(i, 1); continue; }
        const fade = Math.min(1, (w.d - b.r * .85) / (b.r * .6)) * b.o;
        fg.strokeStyle = rgba(col(w.c, t * 2), .75 * fade); fg.lineWidth = tier >= 5 ? 2.4 : 1.8; fg.beginPath(); w.tr.forEach(([px, py], k) => k ? fg.lineTo(px, py) : fg.moveTo(px, py)); fg.stroke();
        fg.fillStyle = rgba('#ffffff', .9 * fade); fg.beginPath(); fg.arc(x, y, tier >= 5 ? 2.2 : 1.6, 0, 7); fg.fill();
      }
      // bright flares shooting out of the sphere (SSR and up)
      if (tier >= 4) { const FL = root._fl || (root._fl = []);
        if (Math.random() < (tier >= 5 ? .35 : .18) + pp) { const a = Math.random() * 7; FL.push({ a, d: b.r * .9, v: b.r * (2.4 + Math.random() * 2), life: .45, max: .45, c: Math.floor(Math.random() * 3) }); }
        for (let i = FL.length - 1; i >= 0; i--) { const f = FL[i]; f.life -= dt; if (f.life <= 0) { FL.splice(i, 1); continue; } const d0 = f.d; f.d += f.v * dt;
          const al = f.life / f.max * b.o; fg.strokeStyle = rgba(col(f.c, t), al); fg.lineWidth = 2.2; fg.beginPath(); fg.moveTo(b.x + Math.cos(f.a) * d0 * .8, b.y + Math.sin(f.a) * d0 * .8); fg.lineTo(b.x + Math.cos(f.a) * f.d, b.y + Math.sin(f.a) * f.d); fg.stroke(); } }
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
/* Skip: jump past everything except the URs still to come (upgrades included, with their animation); pressing it again
   while those play goes straight to the results */
function skipPull() {
  const st = pullState; if (!st) return;
  if (st.exchange) return closePull();
  if (st.phase === 'summary') return;
  // a double UR: Skip jumps to just before the double trigger (UR sphere already up), plays it, then skips to the UR reveals
  if (st.double && !['reveal', 'upgrade'].includes(st.phase)) {
    st.skipAfter = true;
    if (!st.dblStarted && !st.jumped && st.phase !== 'burst') { st.jumped = true; jumpToDouble(st); }
    return;
  }
  const cur = st.phase === 'reveal' ? st.i : -1, rest = st.order.slice(cur + 1).filter(i => st.results[i].rarity >= 5);
  if (st.skipping || !rest.length) return showSummary();
  st.skipping = true; st.order = [...st.order.slice(0, cur + 1), ...rest];
  if (pullEl) pullEl.classList.add('skipping');
  advancePull();
}
function advancePull() {
  const st = pullState; if (!st || st.phase === 'summary') return;
  if (st.skipAfter) { st.skipAfter = false; st.skipping = true; const rest = st.order.filter(i => st.results[i].rarity >= 5); if (!rest.length) return showSummary(); st.order = rest; st.i = -1; }
  pullClear(st);
  st.i++; st.phase = 'reveal';
  if ((st.maxwin || st.double) && $('#pullSkip')) $('#pullSkip').hidden = false;
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
    ${v.img ? `<img class="rv-blur" src="${v.img}" alt=""><img class="rv-splash" src="${v.img}" alt="">` : `<div class="rv-coin">${curIcon(lowIc(r))}</div>`}
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
  // the results sit on the same summon background as the pull, with sparkles in the colours of the best rarity pulled
  const top = Math.max(3, ...st.results.map(r => r.rarity >= 6 ? 5 : r.rarity || 3));
  pullEl.classList.add('revealing', 'summary');
  pullEl.classList.remove('t3', 't4', 't5', 't6', 'r3', 'r4', 'r5'); pullEl.classList.add('t' + top, 'r' + top);
  if (st.fx) st.fx.ambient(top);
  $('#pullSkip').hidden = true;
  const one = st.results.length === 1;
  $('#pullStage').innerHTML = `<div class="sum">
    <h2>Summon results${st.maxwin ? ' <span class="sum-mw">MAX WIN</span>' : ''}</h2>${st.maxwin && !st.replay ? `<div class="sum-mwt"><span class="tiny">Title unlocked</span>${titleHTML(TITLES.find(t => t.id === 'maxwinner'))}</div>` : ''}
    <div class="sum-grid ${one ? 'one' : ''}">${st.results.map((r, i) => { const v = resultView(r), e = r.kind === 'entry' && findEntry(r.id), mem = e && e.type === 'memory' && memOf(e.id);
      const pic = mem ? `<span class="scard-mem">${memCellPic(mem, 0)}</span>` : v.card ? `<img src="${v.card}" alt="" class="${e && baseArt(e) ? '' : 'chibi'}" ${e && baseArt(e) ? `style="${cardImgStyle(e, 'base')}"` : ''}>` : `<div class="coinbox">${curIcon(lowIc(r))}</div>`;
      return `<div class="scard r${r.rarity}" style="--i:${i}">
      ${pic}
      ${r.isNew ? '<span class="new">NEW</span>' : ''}${r.up ? '<span class="new upg">UPGRADED</span>' : ''}
      <div class="foot"><span class="st">${r.kind === 'entry' ? (e && e.type === 'character' ? charRtag(e) : rtag(r.rarity)) : ctag(3)}</span><span class="nm">${esc(v.name)}</span>${r.starUp ? `<span class="dp">${starRow(r.starUp, r.starUp - 1)}</span>` : r.maxed ? `<span class="dp">${r.starlight ? `+${r.starlight} Corals` : 'Already owned'}</span>` : ''}</div></div>`; }).join('')}</div>
    <div class="sum-got"><span class="lbl-sm">You got</span><div class="sum-items">${sumItems(st).map(([ic, n, l]) => `<span class="sum-item" title="${l}">${ic}<b>${n}</b><small>${l}</small></span>`).join('')}</div></div>
    <div class="row" style="justify-content:center">
      ${st.preview ? '' : `<button class="btn gold" id="pullAgain">Pull ×${st.n} again${payHTML(st.n, st.bk)}</button>`}
      <button class="btn ghost" id="pullDone">${st.exchange || st.milestone ? 'Done' : st.preview ? 'Close preview' : 'Done'}</button>
    </div>
    ${st.replay ? `<p class="tiny" style="color:rgba(255,255,255,.65)">Replay of your pull from ${new Date(st.replay).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}: nothing was spent or added.</p>` : st.milestone ? `<p class="tiny" style="color:rgba(255,255,255,.65)">Milestone reward: ${(MILES[st.bk] || MILES.standard).n} pulls on ${(MILES[st.bk] || MILES.standard).where}.</p>` : st.exchange ? '<p class="tiny" style="color:rgba(255,255,255,.65)">Memory exchange complete.</p>' : st.preview ? '<p class="tiny" style="color:rgba(255,255,255,.65)">Preview only: nothing was spent or added.</p>' : `<p class="tiny" style="color:rgba(255,255,255,.65)">Pearls left: ${fmt(S.wallet.pearls)}</p>`}
  </div>`;
  const again = $('#pullAgain'); if (again) again.onclick = () => doPull(st.n, st.bk);
  $('#pullDone').onclick = () => closePull();
  $('#pullDone').focus({ preventScroll: true });
}
/* everything a pull gave, added up: characters/skins are the cards above; this row is the rest */
function sumItems(st) {
  const R = st.results, add = (k, n, l, ic = curIcon(k)) => n ? out.push([ic, fmt(n), l]) : 0, out = [];
  add('coins', R.reduce((a, r) => a + (r.kind === 'coins' ? r.amount : 0), 0), 'Gold');
  add('coins', st.bonus || 0, 'Step reward');
  add('cfur', R.filter(r => r.kind === 'cfrag' && r.cf === 'cfur').length, 'UR character fragment');
  add('cfssr', R.filter(r => r.kind === 'cfrag' && r.cf === 'cfssr').length, 'SSR character fragment');
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
