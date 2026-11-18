/* ---------- Pet bonuses outside battle + Battle Rank (the owner's plan) ----------
   Pets: a pet only boosts what its own character does (no stacking). Its kind decides the bonus (admin can pick another,
   entry.petBonus): Dragon +% gold from battles · Fox −% Expedition time · Cat +% chance of the 2nd clothing piece in raids ·
   Phoenix % chance to get the stamina of a won battle back · Bunny +% bond EXP for its character · Owl +% player and
   Battle Rank EXP from battles. Grade sets the size (SSR 2% → 10%, UR 3% → 15% at SSS); at 3★ a second bonus (the next
   kind's) comes at half strength. Caps: Expedition time −25%, stamina refund 15%.
   Battle Rank: a Card Battle level earned by playing (every match except Free Training: win 100, draw 60, loss 40 EXP, the
   first win of the day +200). It opens content (no daily limits, only rank): Campaign chapters 1–10 at ranks 3 / 7 / 11 /
   15 / 19 / 21 / 23 / 25 / 27 / 29, Great Tree floor n (from floor 4) at rank 2n, the Quick Match Expert at rank 10, the Arena at rank 5. Anything
   already cleared or joined stays open, and older saves start with a rank worked out from their record and stars. */
const PB_TYPES = {
  gold: ['Battle gold', 'gold from battles', '+'], expd: ['Quick expeditions', 'Expedition time', '−'], drop2: ['Lucky finds', 'chance of a 2nd clothing piece in raids', '+'],
  stam: ['Second breath', 'chance to get the stamina of a won battle back', ''], bond: ['Close friend', 'bond EXP for its character', '+'], exp: ['Wise eyes', 'Battle Rank EXP from battles', '+']
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
const BR_CHAPTER = { c1: 3, c2: 7, c3: 11, c4: 15, c5: 19, c6: 21, c11: 30 };   // the owner's rule: Chapter 6 and Chapter 11 open a block of chapters (6-10, 11-15); inside a block the next chapter only needs the one before
/* Great Tree floor n (from floor 4) needs Battle Rank 1.4n + 2 (floor 10 → 16, floor 20 → 30), never past the top rank, so floors past 20 only ask for rank 30 */
const twrRankNeed = no => Math.min(BR_MAX, Math.ceil(no * 1.4) + 2);
const brStageNeed = st => { if (!st || !st.ch) return 0; if (st.ch.tower) return st.no >= 4 ? twrRankNeed(st.no) : 0; const i = st.ch.stages.findIndex(s => s.id === st.id); return i === 0 ? BR_CHAPTER[st.ch.id] || 0 : 0; };
const brStageBlock = st => { const n = brStageNeed(st); if (!n || brOk(n)) return 0; if (ccCampHave(st.id)[0] || (!st.ch.tower && st.ch.stages.some(s => ccCampHave(s.id)[0]))) return 0; return n; };   // anything already cleared stays open
{ const o0 = ccCampOpen; ccCampOpen = function (st) { return o0.apply(this, arguments) && !brStageBlock(st); }; }
/* player level gates (the owner's rule): from Chapter 6 a chapter also needs a player level to start (EXP only comes from
   quests and stamina, so these pace the hard chapters over a month); anything already started stays open; admins skip */
const LV_CHAPTER = { c6: 25, c11: 40 };   // the owner's rule: level 25 opens Chapters 6-10, level 40 opens Chapters 11-15 (the economy test: a free player reaches them about day 13 and day 27 of a 30-day patch)
const lvStageNeed = st => { if (!st || !st.ch || st.ch.tower) return 0; const i = st.ch.stages.findIndex(s => s.id === st.id); return i === 0 ? LV_CHAPTER[st.ch.id] || 0 : 0; };
const lvStageBlock = st => { const n = lvStageNeed(st); if (!n || playerLv().lv >= n || canAdmin()) return 0; if (st.ch.stages.some(s => ccCampHave(s.id)[0])) return 0; return n; };
{ const o0 = ccCampOpen; ccCampOpen = function (st) { return o0.apply(this, arguments) && !lvStageBlock(st); }; }
const lvLockHTML = st => { const n = lvStageBlock(st); return n ? `<div class="br-lock lv">${icon('lock')}<span><b>Needs player level ${n}</b><small>You are level ${playerLv().lv}. Player EXP comes from daily and weekly quests and from spending stamina (${EXP.stam} EXP per stamina).</small></span></div>` : ''; };
/* why a chapter is closed, for the chapter list */
const ccCampGateTxt = ch => { const st = { ...ch.stages[0], ch }, lv = lvStageBlock(st), br = brStageBlock(st); return [lv ? `player level ${lv}` : '', br ? `Battle Rank ${br}` : ''].filter(Boolean).join(' and '); };
const brLockHTML = st => lvLockHTML(st) + brLockOnly(st);
const brLockOnly = st => { const n = brStageBlock(st); return n ? `<div class="br-lock">${icon('lock')}<span><b>Needs Battle Rank ${n}</b><small>You are rank ${brLv()}. Every Card Battle match gives Battle Rank EXP (a win 100, the first win of the day +200).</small></span></div>` : ''; };
function brChipHTML() {
  const o = brOf(brState().xp);
  return `<button class="br-chip" data-open="brank" title="Battle Rank ${o.r}${o.need ? ` · ${o.xp} / ${o.need} EXP to rank ${o.r + 1}` : ' · max'} · tap for details" aria-label="Battle Rank ${o.r}: how it works"><b>${o.r}</b><span><small>Battle Rank</small><i style="--p:${o.need ? (o.xp / o.need * 100).toFixed(1) : 100}%"></i></span>${icon('info')}</button>`;
}
/* the Battle Rank window (the owner's ask: tap the chip to see how it works and where you stand) */
function brGates() {
  const L = [{ r: 5, ic: 'arena', t: 'The Arena', d: 'Join and attack other players\' defense decks', ok: arJoined() },
    { r: 10, ic: 'bolt', t: 'Quick Match · Expert', d: 'The strongest challenger (also needs 3 Hard wins)', ok: ((ccSave().qmWins || {}).expert || 0) > 0 }];
  Object.entries(BR_CHAPTER).forEach(([id, r]) => { const ch = CC_CAMP.find(c => c.id === id); if (!ch) return;
    const blk = id === 'c6' ? ' (opens Chapters 6–10)' : id === 'c11' ? ' (opens Chapters 11–15)' : '';
    L.push({ r, ic: 'map', t: `Campaign · Chapter ${ch.no}`, d: esc(ch.name) + blk, ok: ch.stages.some(st => ccCampHave(st.id)[0]) }); });
  const F = ccTowerFloors(), fl = F.filter(f => f.no >= 4 && [4, 10, 15].includes(f.no) || f.no === F.length);
  fl.forEach(f => L.push({ r: twrRankNeed(f.no), ic: 'tree', t: `The Great Tree · Floor ${f.no}`, d: esc(f.name), ok: !!ccCampHave(f.id)[0] }));
  return L.sort((a, b) => a.r - b.r);
}
function openBrInfo() {
  const b = brState(), o = brOf(b.xp), st = ccSave().stats || {}, first = b.day !== dayKey(), le = pbLeader(), owl = le ? petPct(le.id, 'exp') : 0;
  const pct = o.need ? o.xp / o.need * 100 : 100, toMax = (() => { let t = o.need ? o.need - o.xp : 0; for (let r = o.r + 1; r < BR_MAX; r++) t += brNeed(r); return t; })();
  const G = brGates(), nxt = G.find(g => g.r > o.r);
  const tile = (ic, v, l, cls = '') => `<div class="brx-tile ${cls}"><span>${icon(ic)}</span><b>${v}</b><small>${l}</small></div>`;
  const body = `<div class="brx">
    <div class="brx-hero"><div class="brx-medal"><i></i><b>${o.r}</b><small>of ${BR_MAX}</small></div>
      <div class="brx-me"><span class="brx-k">Your Battle Rank</span><h3 class="ts">Rank ${o.r}${o.r >= BR_MAX ? ' · Max' : ''}</h3>
        <div class="brx-bar"><i style="width:${pct.toFixed(1)}%"></i></div>
        <span class="brx-xp">${o.need ? `<b>${fmt(o.xp)}</b> / ${fmt(o.need)} EXP to rank ${o.r + 1} · ${fmt(o.need - o.xp)} to go` : 'Top rank reached'}</span>
        <span class="brx-xp">${fmt(b.xp)} Battle Rank EXP earned${toMax ? ` · ${fmt(toMax)} more to rank ${BR_MAX}` : ''}</span></div></div>
    <div class="brx-today ${first ? 'on' : ''}">${icon(first ? 'gift' : 'check')}<span><b>${first ? `First win of the day: +${BR_FIRST_WIN} EXP waiting` : 'First win of the day: claimed'}</b><small>${first ? 'Your next Card Battle win today gives it on top of the win.' : 'It comes back at midnight.'}</small></span></div>
    <h4 class="brx-h">EXP per match</h4>
    <div class="brx-tiles">${tile('trophy', '+' + BR_XP.win, 'Win')}${tile('swords', '+' + BR_XP.draw, 'Draw')}${tile('shield', '+' + BR_XP.lose, 'Loss')}${tile('gift', '+' + BR_FIRST_WIN, 'First win a day', 'hi')}</div>
    <p class="brx-note">Every Card Battle match counts, win, lose or draw: Campaign stages, Raids, the Great Tree, Quick Match, the Arena, the Guild Boss and the region battles. Free Training gives nothing. ${owl ? `<b>Your leader's ${esc(le.name)} pet adds +${owl}%</b> (Owl pets boost Battle Rank EXP).` : 'An Owl pet on your deck leader adds a bonus %.'} There are no daily limits: only your rank holds you back.</p>
    <div class="brx-stats">${tile('trophy', fmt(st.w || 0), 'Wins')}${tile('swords', fmt(st.d || 0), 'Draws')}${tile('shield', fmt(st.l || 0), 'Losses')}</div>
    <h4 class="brx-h">What your rank opens${nxt ? `<span>Next: rank ${nxt.r} · ${esc(nxt.t)}</span>` : ''}</h4>
    <div class="brx-gates">${G.map(g => { const reach = o.r >= g.r, cls = g.ok ? 'done' : reach ? 'open' : 'lock';
      return `<div class="brx-gate ${cls} ${g === nxt ? 'next' : ''}"><span class="brx-gr">${g.r}</span><span class="brx-gi">${icon(g.ic)}</span><span class="brx-gt"><b>${g.t}</b><small>${g.d}</small></span><span class="brx-gs">${g.ok ? `${icon('check')}Done` : reach ? `${icon('check')}Open` : `${icon('lock')}Rank ${g.r}`}</span></div>`; }).join('')}</div>
    <p class="brx-note">Great Tree floors from floor 4 need rank 1.4 × the floor + 2 (floor 10 → 16, floor 20 → ${BR_MAX}). Anything you already cleared, won or joined stays open.${canAdmin() ? ' Admins skip every rank gate.' : ''}</p>
  </div>`;
  openModal({ title: 'Battle Rank', ic: 'trophy', kind: 'brank', body });
}
