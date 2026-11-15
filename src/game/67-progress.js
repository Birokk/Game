/* ---------- Pet bonuses outside battle + Battle Rank (the owner's plan) ----------
   Pets: a pet only boosts what its own character does (no stacking). Its kind decides the bonus (admin can pick another,
   entry.petBonus): Dragon +% gold from battles · Fox −% Expedition time · Cat +% chance of the 2nd clothing piece in raids ·
   Phoenix % chance to get the stamina of a won battle back · Bunny +% bond EXP for its character · Owl +% player and
   Battle Rank EXP from battles. Grade sets the size (SSR 2% → 10%, UR 3% → 15% at SSS); at 3★ a second bonus (the next
   kind's) comes at half strength. Caps: Expedition time −25%, stamina refund 15%.
   Battle Rank: a Card Battle level earned by playing (every match except Free Training: win 100, draw 60, loss 40 EXP, the
   first win of the day +200). It opens content (no daily limits, only rank): Campaign chapters 1–5 at ranks 3 / 7 / 11 /
   15 / 19, Great Tree floor n (from floor 4) at rank 2n, the Quick Match Expert at rank 10, the Arena at rank 5. Anything
   already cleared or joined stays open, and older saves start with a rank worked out from their record and stars. */
const PB_TYPES = {
  gold: ['Battle gold', 'gold from battles', '+'], expd: ['Quick expeditions', 'Expedition time', '−'], drop2: ['Lucky finds', 'chance of a 2nd clothing piece in raids', '+'],
  stam: ['Second breath', 'chance to get the stamina of a won battle back', ''], bond: ['Close friend', 'bond EXP for its character', '+'], exp: ['Wise eyes', 'player and Battle Rank EXP from battles', '+']
};
const PB_KIND = { dragon: 'gold', fox: 'expd', cat: 'drop2', bird: 'stam', bunny: 'bond', owl: 'exp' };
const PB_ORDER = ['gold', 'expd', 'drop2', 'stam', 'bond', 'exp'];
const PB_CAP = { expd: 25, stam: 15 };
const pbTypeOf = p => p && PB_TYPES[p.petBonus] ? p.petBonus : PB_KIND[(p && p.look && p.look.kind) || ''] || 'gold';
/* the bonus a character's pet gives: {type: pct}; empty without a pet */
function petBonusOf(cid) {
  const p = cid && typeof petEqOf === 'function' ? petEqOf(cid) : null; if (!p) return {};
  const gr = ((S.petGr || {})[(S.petEqU || {})[cid]]) || 0, ur = +p.rarity >= 5, pct = ur ? 3 + gr * 1.5 : 2 + gr, t = pbTypeOf(p), out = { [t]: pct };
  if (petEqStar(cid) >= 3) { const t2 = PB_ORDER[(PB_ORDER.indexOf(t) + 1) % PB_ORDER.length]; out[t2] = (out[t2] || 0) + pct / 2; }
  for (const k of Object.keys(out)) out[k] = Math.min(PB_CAP[k] || 99, Math.round(out[k] * 10) / 10);
  return out;
}
const petPct = (cid, t) => petBonusOf(cid)[t] || 0;
const petBonusTxt = cid => Object.entries(petBonusOf(cid)).map(([t, v]) => `${PB_TYPES[t][2]}${v}% ${PB_TYPES[t][1]}`).join(' · ');
/* the leader of the deck you fight with right now (battles and instant clears) */
const pbLeader = () => (ccM && ccM.leader) || ccLeaderOf(ccSave().sel);
/* hooks */
{ const g0 = ccGrantRewards;
  ccGrantRewards = function (winner) {
    const out = g0.apply(this, arguments), le = pbLeader(), cid = le && le.id, extra = Math.round(out.gold * petPct(cid, 'gold') / 100);
    if (extra) { S.wallet.coins += extra; out.gold += extra; }
    if (winner === 0 && cid && Math.random() * 100 < petPct(cid, 'stam')) { giveStamina(CC_QM_STAM); toast(`Your leader's pet got the ${CC_QM_STAM} stamina back`); }
    return out;
  }; }
{ const f0 = raidFinish;
  raidFinish = function (G, r) {
    const res = f0.apply(this, arguments), cid = (pbLeader() || {}).id;
    if (res && res.win && !res.broke && cid) {
      if (res.gold) { const x = Math.round(res.coins * petPct(cid, 'gold') / 100); if (x) { S.wallet.coins += x; res.coins += x; } }
      const xp = Math.round((res.exp || 0) * petPct(cid, 'exp') / 100); if (xp) { gainExp(xp); res.exp += xp; }
      if (Math.random() * 100 < petPct(cid, 'stam')) { giveStamina(r.cost); toast(`Your leader's pet got the ${r.cost} stamina back`); }
    }
    return res;
  }; }
{ const r0 = rollGearDrops;
  rollGearDrops = function (d, times, si) {   // Cat: a better chance of the 2nd piece (the leader of your selected deck)
    const cid = (pbLeader() || {}).id, b = petPct(cid, 'drop2');
    if (!b) return r0.apply(this, arguments);
    const g = raidStg(d, si === undefined ? raidStage(d) : si), keep = g.dbl; g.dbl = Math.min(100, (g.dbl || 0) + b);
    try { return r0.apply(this, arguments); } finally { g.dbl = keep; }
  }; }
{ const b0 = addBond;
  addBond = function (cid, n) { const b = petPct(cid, 'bond'); return b0.call(this, cid, b ? Math.round(n * (1 + b / 100)) : n); }; }
/* Fox: the expedition of its character is shorter */
const pbExpMs = cid => Math.round(EXP_MS * (1 - petPct(cid, 'expd') / 100));
{ const s0 = sendExpedition;
  sendExpedition = function (areaId, charId) { const r = s0.apply(this, arguments); const e = (S.expd || {})[areaId]; if (e && e.char === charId && petPct(charId, 'expd')) e.ends = e.start + pbExpMs(charId); return r; }; }
{ const a0 = autoSendExpeditions;
  autoSendExpeditions = function () { const r = a0.apply(this, arguments); Object.values(S.expd || {}).forEach(e => { if (e && e.char && petPct(e.char, 'expd') && e.ends - e.start >= EXP_MS - 1000) e.ends = e.start + pbExpMs(e.char); }); persist(); return r; }; }

/* ---- Battle Rank ---- */
const BR_MAX = 30, BR_XP = { win: 100, draw: 60, lose: 40 }, BR_FIRST_WIN = 200;
const brNeed = r => 200 + 50 * r;   // rank r → r + 1
function brState() {
  const b = S.brank || (S.brank = { xp: 0, day: '', init: false });
  if (!b.init) {   // older saves: a starting rank from the Card Battle record and the stars
    b.init = true; const st = ccSave().stats || {}, stars = ccCampStages().concat(typeof ccTowerFloors === 'function' ? ccTowerFloors().map(f => ({ id: f.id })) : []).reduce((t, s) => t + ccCampN(s.id), 0);
    b.xp = (st.w || 0) * BR_XP.win + (st.d || 0) * BR_XP.draw + (st.l || 0) * BR_XP.lose + stars * 30;
  }
  return b;
}
function brOf(xp) { let r = 1, left = xp; while (r < BR_MAX && left >= brNeed(r)) { left -= brNeed(r); r++; } return { r, xp: left, need: r < BR_MAX ? brNeed(r) : 0 }; }
const brLv = () => brOf(brState().xp).r;
const brOk = n => brLv() >= n || canAdmin();
function brGain(winner) {
  const b = brState(), k = winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw', before = brLv(), today = dayKey();
  let n = BR_XP[k]; if (k === 'win' && b.day !== today) { b.day = today; n += BR_FIRST_WIN; }
  const le = pbLeader(); if (le) n = Math.round(n * (1 + petPct(le.id, 'exp') / 100));
  b.xp += n; persist();
  const after = brLv(); toast(after > before ? `Battle Rank ${after}! (+${n} EXP)` : `+${n} Battle Rank EXP`);
  return { n, up: after > before, r: after };
}
/* what opens at which rank */
const BR_CHAPTER = { c1: 3, c2: 7, c3: 11, c4: 15, c5: 19 };
const brStageNeed = st => { if (!st || !st.ch) return 0; if (st.ch.tower) return st.no >= 4 ? 2 * st.no : 0; const i = st.ch.stages.findIndex(s => s.id === st.id); return i === 0 ? BR_CHAPTER[st.ch.id] || 0 : 0; };
const brStageBlock = st => { const n = brStageNeed(st); if (!n || brOk(n)) return 0; if (ccCampHave(st.id)[0] || (!st.ch.tower && st.ch.stages.some(s => ccCampHave(s.id)[0]))) return 0; return n; };   // anything already cleared stays open
{ const o0 = ccCampOpen; ccCampOpen = function (st) { return o0.apply(this, arguments) && !brStageBlock(st); }; }
const brLockHTML = st => { const n = brStageBlock(st); return n ? `<div class="br-lock">${icon('lock')}<span><b>Needs Battle Rank ${n}</b><small>You are rank ${brLv()}. Every Card Battle match gives Battle Rank EXP (a win 100, the first win of the day +200).</small></span></div>` : ''; };
function brChipHTML() {
  const o = brOf(brState().xp);
  return `<span class="br-chip" title="Battle Rank ${o.r}${o.need ? ` · ${o.xp} / ${o.need} EXP to rank ${o.r + 1}` : ' · max'}. Win, lose or draw, every match gives Battle Rank EXP; it opens campaign chapters, Great Tree floors, the Expert challenger and the Arena."><b>${o.r}</b><span><small>Battle Rank</small><i style="--p:${o.need ? (o.xp / o.need * 100).toFixed(1) : 100}%"></i></span></span>`;
}
