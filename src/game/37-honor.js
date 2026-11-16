/* ---------- Pearl Honor: the battle pass (home "Honor" icon → openHonor(tab)) ----------
   A season lasts 30 days like a patch (BP_DAYS, the owner's rule; seasons counted from BP_EPOCH, the same for everyone).
   Levels 1–80 (BP_MAX), 480 Honor EXP per level (BP_LV_XP), so a full month of missions (~38,000 Honor EXP) reaches level 80
   on about the last day. Honor EXP comes from the pass missions: daily (BP_DAILY) and weekly (BP_WEEKLY),
   built like the Quests and counted by the same questAdd hooks; at most 9,000 Honor EXP a week (BP_WEEK_CAP, resets
   Monday 00:00 local). Levels can also be bought with pearls (BP_LV_PEARLS, not capped).
   Two reward tracks per level (bpReward), one item per level and track so the rows line up: Pearl Gift (free) and
   Coral Tide (paid). Two paid options (BP_OFFERS): Coral Tide $9.99 unlocks the paid track and the season milestones
   (BP_MILE: 1 pearl + 5 skin tickets on every 10th level, paid only, the owner's rule); Moon Tide $19.99 also gives
   30 pearls, 3 stamina bottles, 5 Standard + 5 Limited tickets (10 pulls), the Moonlit Halo avatar frame, the Pearl Honor namecard and
   +10 levels at once. The paid track is worth about 980 pearls (bpWorth, BP_VAL; the owner asked for at least $120 of
   items at about 5 pearls per $1 = 600 pearls). Real payments aren't connected: while TOPUP_FREE is on they are free
   test buttons (and still give VIP EXP).
   State S.bp {season, xp, tier: 0 | 1 Coral Tide | 2 Moon Tide (ids glory / crown kept for saves), free: [levels], paid: [levels], mile: [levels], wk: {key, xp}};
   missions S.bpq (daily) / S.bpwq (weekly), same shape as S.quests / S.wquests. Rewards: BP_BIG / BP_FIVE / BP_CYCLE / BP_MILE. The track emblems are icon slots bp0 / bp1 / bp2 (admin → Art & icons). */
const BP_EPOCH = new Date(2026, 10, 2), BP_DAYS = 30, BP_MAX = 80, BP_LV_XP = 480, BP_WEEK_CAP = 9000, BP_LV_PEARLS = 3;   // the epoch keeps the running season as season 1
const BP_NAMES = { free: 'Pearl Gift', paid: 'Coral Tide' };
const BP_OFFERS = [
  { tier: 1, id: 'glory', name: 'Coral Tide', usd: '9.99', now: {}, levels: 0, desc: 'Unlocks the Coral Tide rewards on every level and the season milestones (1 pearl + 5 skin tickets on every 10th level).' },
  { tier: 2, id: 'crown', name: 'Moon Tide', usd: '19.99', was: '24.99', now: { pearls: 30, bottles: 3, wishes: 5, tickets: 5 }, levels: 10, desc: 'Everything in Coral Tide, plus 30 pearls, 3 stamina bottles, 5 Standard and 5 Limited tickets (10 pulls), an avatar frame and a namecard. Also raises 10 Honor levels at once.' }
];
const BP_DAILY = [
  { id: 'login', name: 'Log into the game', need: 1, xp: 100 },
  { id: 'gift', name: 'Send a gift once', need: 1, xp: 100, go: 'characters' },
  { id: 'stamina', name: 'Spend a total of 160 stamina', need: 160, xp: 150, go: 'raids' },
  { id: 'summon', name: 'Summon on a character banner once', need: 1, xp: 150, go: 'summon' },
  { id: 'raid', name: 'Clear a raid once', need: 1, xp: 100, go: 'raids' },
  { id: 'gold', name: 'Spend a total of 10,000 gold', need: 10000, xp: 100, go: 'farm' },
  { id: 'base', name: 'Collect resources at the Base', need: 1, xp: 50, go: 'farm' },
  { id: 'fountain', name: 'Make a wish at a fountain', need: 1, xp: 50, go: 'farm' }
];
const BP_WEEKLY = [
  { id: 'login', name: 'Log in on 5 days', need: 5, xp: 500 },
  { id: 'gift', name: 'Send 10 gifts', need: 10, xp: 500, go: 'characters' },
  { id: 'stamina', name: 'Spend a total of 666 stamina', need: 666, xp: 500, go: 'raids' },
  { id: 'summon', name: 'Summon 20 times on a character banner', need: 20, xp: 600, go: 'summon' },
  { id: 'raid', name: 'Clear a raid 20 times', need: 20, xp: 500, go: 'raids' },
  { id: 'gold', name: 'Spend a total of 50,000 gold', need: 50000, xp: 400, go: 'farm' },
  { id: 'fountain', name: 'Make a wish at a fountain 5 times', need: 5, xp: 300, go: 'farm' }
];
const BP_SETS = {
  bpd: { list: BP_DAILY, title: 'Daily', next: () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); } },
  bpw: { list: BP_WEEKLY, title: 'Weekly', next: () => { const m = weekStart(); return new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7); } }
};
/* mission state (used by qState for the sets bpd / bpw, so questAdd, qProg, qDone and qCan work for them too) */
function bpQState(set) {
  const d = dayKey();
  if (set === 'bpw') {
    const w = dayKey(weekStart());
    if (!S.bpwq || S.bpwq.day !== w) S.bpwq = { day: w, days: [], p: {}, done: [] };
    const st = S.bpwq; if (!st.days.includes(d)) st.days.push(d);
    st.p.login = Math.min(5, st.days.length); return st;
  }
  if (!S.bpq || S.bpq.day !== d) S.bpq = { day: d, p: { login: 1 }, done: [] };
  return S.bpq;
}

/* season */
const bpSeason = (t = Date.now()) => Math.max(0, Math.floor((t - BP_EPOCH.getTime()) / (BP_DAYS * 864e5)));
const bpEnds = () => BP_EPOCH.getTime() + (bpSeason() + 1) * BP_DAYS * 864e5;
function bpState() {
  const s = bpSeason(), wk = dayKey(weekStart());
  if (!S.bp || S.bp.season !== s) S.bp = { season: s, xp: 0, tier: 0, free: [], paid: [], mile: [], wk: { key: wk, xp: 0 } };
  if (!S.bp.mile) S.bp.mile = S.bp.paid.filter(l => l % 10 === 0);   // older saves: a claimed Coral Tide milestone already gave its skin tickets
  if (S.bp.wk.key !== wk) S.bp.wk = { key: wk, xp: 0 };
  return S.bp;
}
const bpLv = () => Math.min(BP_MAX, 1 + Math.floor(bpState().xp / BP_LV_XP));
const bpWeekLeft = () => Math.max(0, BP_WEEK_CAP - bpState().wk.xp);
/* add Honor EXP; capped = counts against the weekly limit. Returns what was added */
function bpGain(n, capped = true) {
  const st = bpState(), before = bpLv(), top = (BP_MAX - 1) * BP_LV_XP;
  let add = Math.max(0, Math.min(n, top - st.xp));
  if (capped) { add = Math.min(add, bpWeekLeft()); st.wk.xp += add; }
  st.xp += add;
  if (bpLv() > before) setTimeout(() => toast(`Pearl Honor level ${bpLv()}!`), 300);
  return add;
}
/* rewards per level (remade at the owner's ask: more pearls, more pulls, more materials, Thread): one item per level and
   track, {reward key: amount}, so the two rows line up. Every 10th level is a big reward (bigger column, BP_BIG), every
   other 5th gives pulls (BP_FIVE, the paid one alternates Limited / Standard), the other 64 levels go round an
   8-step cycle (BP_CYCLE, each step 8 times a season). The season milestones (BP_MILE) are separate: 1 pearl + 5 skin
   tickets on every 10th level, only with Coral Tide or Moon Tide (the owner's rule; skin tickets come from nowhere else). */
const BP_BIG = {
  free: { 10: { tickets: 2 }, 20: { pearls: 10 }, 30: { wishes: 3 }, 40: { fragur: 5 }, 50: { tickets: 3 }, 60: { cfur: 3 }, 70: { pearls: 15 }, 80: { eggur: 1 } },
  paid: { 10: { pearls: 50 }, 20: { memtk: 1 }, 30: { tickets: 5 }, 40: { cfur: 10 }, 50: { pearls: 80 }, 60: { memtk: 1 }, 70: { tickets: 10 }, 80: { ursel: 1 } }
};
const BP_FIVE = { free: [{ wishes: 1 }], paid: [{ tickets: 3 }, { wishes: 3 }] };
const BP_CYCLE = {   // more materials (the owner's ask: stamina bottles, gold, more Thread)
  free: [{ coins: 8000 }, { thread: 25 }, { pearls: 2 }, { bottles: 1 }, { coins: 8000 }, { thread: 25 }, { fragssr: 2 }, { cfssr: 2 }],
  paid: [{ pearls: 10 }, { thread: 60 }, { tickets: 1 }, { bottles: 1 }, { pearls: 10 }, { coins: 20000 }, { wishes: 1 }, { cfur: 2 }]
};
const BP_MILE = { pearls: 1, sktk: 5 };
function bpReward(lv, track) {
  if (track === 'mile') return lv % 10 === 0 ? BP_MILE : null;
  if (lv % 10 === 0) return BP_BIG[track][lv];
  if (lv % 5 === 0) { const L = BP_FIVE[track]; return L[(lv - 5) / 10 % L.length]; }
  const L = BP_CYCLE[track]; return L[(lv - 1 - Math.floor(lv / 5)) % L.length];
}
/* what a track is worth in pearls (BP_VAL: a pull = 3 pearls (its shop price), a UR memory ticket 60, a UR selector 150,
   a UR egg 25, a UR character / egg fragment 2.5, 2,000 gold 1, 10 Thread 1, a Coral 0.3, a skin ticket 1 (60 buy an outfit
   worth 60 pearls)); the paid one includes the milestones */
const BP_VAL = { ...PACK_VAL, thread: .1, starlight: .3, dust: .04, fragssr: .5, fragur: 2.5, eggur: 25, ursel: 150, sktk: 1, exp: .002 };
const BP_TOT = what => { let t = 0; for (let l = 1; l <= BP_MAX; l++) { const r = bpReward(l, 'paid'), m = l % 10 === 0 ? BP_MILE : {}; t += what === 'pulls' ? (r.tickets || 0) + (r.wishes || 0) : (r[what] || 0) + (m[what] || 0); } return t; };
const bpWorthOf = got => Object.entries(got).reduce((t, [k, n]) => t + n * (BP_VAL[k] || 0), 0);
function bpWorth(track) {
  let t = 0; for (let l = 1; l <= BP_MAX; l++) { t += bpWorthOf(bpReward(l, track)); if (track === 'paid' && l % 10 === 0) t += bpWorthOf(BP_MILE); }
  return Math.round(t);
}
/* a reward as a square inventory card in its rarity colours (REW_R), amount under it */
const bpItem = (k, n, extra = '', cls = '', attrs = '') => `<button type="button" class="inv-cell bp-sq r${REW_R[k] || 4} ${cls}" ${attrs} title="${fmt(n)} ${(REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1]}"><span class="inv-pic">${curIcon(k)}${extra}</span><b>${fmt(n)}</b></button>`;
const bpNm = (k, v) => `${fmt(v)} ${(REW_NAMES[k] || [k, k])[v === 1 ? 0 : 1]}`;
/* track 'free' | 'paid' | 'mile' (the season milestones, every 10th level, paid only) */
const bpCanClaim = (lv, track) => { const st = bpState(); return lv <= bpLv() && (track !== 'mile' || lv % 10 === 0) && !st[track].includes(lv) && (track === 'free' || st.tier > 0); };
const bpClaimable = () => { const out = []; for (let lv = 1; lv <= bpLv(); lv++) ['free', 'paid', 'mile'].forEach(t => { if (bpCanClaim(lv, t)) out.push([lv, t]); }); return out; };
const bpMissionsReady = () => Object.keys(BP_SETS).some(set => BP_SETS[set].list.some(q => qCan(q, set)));
const bpReady = () => bpClaimable().length > 0 || bpMissionsReady();
function bpGrant(got) {
  Object.entries(got).forEach(([k, n]) => {
    if (k === 'exp') gainExp(n);
    else if (k === 'fragssr' || k === 'fragur') S.pets.frags[k.slice(4)] = (S.pets.frags[k.slice(4)] || 0) + n;   // egg fragments
    else if (k === 'eggur' || k === 'eggssr') for (let i = 0; i < n; i++) S.pets.eggs.push(k.slice(3));   // whole eggs
    else S.wallet[k] = (S.wallet[k] || 0) + n;
  });
}
function bpClaimAll() {
  const list = bpClaimable(); if (!list.length) return;
  const st = bpState(), got = {};
  list.forEach(([lv, t]) => { st[t].push(lv); Object.entries(bpReward(lv, t)).forEach(([k, n]) => { got[k] = (got[k] || 0) + n; }); });
  bpGrant(got); persist(); renderMenu(); refreshSummon(); renderHonor();
  showRewards('Pearl Honor rewards', got, `${list.length} reward${list.length === 1 ? '' : 's'} claimed`);
}
function bpClaimMissions(set) {
  const st = qState(set), L = BP_SETS[set].list.filter(q => qCan(q, set)); if (!L.length) return;
  const sum = L.reduce((t, q) => t + q.xp, 0); L.forEach(q => st.done.push(q.id));
  const add = bpGain(sum);
  persist(); renderMenu(); renderHonor();
  toast(add < sum ? `+${fmt(add)} Honor EXP · the weekly limit of ${fmt(BP_WEEK_CAP)} is reached${add ? '' : ' (no EXP added)'}.` : `+${fmt(add)} Honor EXP`);
}
function bpBuy(offer) {
  const st = bpState(), o = BP_OFFERS.find(x => x.id === offer); if (!o || st.tier >= o.tier) return;
  if (!TOPUP_FREE) { toast('Real payments aren\'t connected yet.'); return; }
  const usd = st.tier === 1 && o.tier === 2 ? (parseFloat(o.usd) - parseFloat(BP_OFFERS[0].usd)).toFixed(2) : o.usd;
  openModal({ title: `Unlock ${o.name}?`, ic: 'sparkle', small: true, body: `<div class="stack" style="text-align:center;justify-items:center">
    <span class="bp-emb big">${bpEmblem(o.tier)}</span><p class="desc">${o.desc}</p>
    <span class="tiny">$${usd}${st.tier === 1 && o.tier === 2 ? ' (upgrade from Coral Tide)' : ''} · free while testing</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="bpNo">Cancel</button><button class="btn gold" id="bpYes">Unlock · free test</button></div></div>`,
    onMount: () => { $('#bpNo').onclick = closeModal; $('#bpYes').onclick = () => {
      closeModal(); const prev = st.tier; st.tier = o.tier;
      const got = { ...o.now }; if (o.tier === 2) { S.unlocks = [...new Set([...(S.unlocks || []), 'bp-crown'])]; bpGain(o.levels * BP_LV_XP, false); }
      bpGrant(got); vipFromUsd(usd); got.vip = Math.round(parseFloat(usd) * VIP_PER_USD);
      persist(); renderMenu(); refreshSummon(); openHonor('rewards');
      showRewards(o.name + ' unlocked', got, o.tier === 2 ? `${prev ? '' : 'Coral Tide rewards and season milestones unlocked · '}+${o.levels} levels · Moonlit Halo frame and Pearl Honor namecard added to your profile` : 'The Coral Tide rewards and the season milestones are unlocked on every level');
    }; } });
}
function bpBuyLevels() {
  let n = 1; const max = BP_MAX - bpLv(); if (max <= 0) { toast('Pearl Honor is already at the top level.'); return; }
  const draw = () => { const b = $('#bplBody'); if (!b) return; b.innerHTML = `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Each level costs ${BP_LV_PEARLS} pearls and doesn't count toward the weekly EXP limit.</p>
    <div class="row bpl-row"><button class="btn ghost sm" data-bpl="-1">−</button><b class="bpl-n">${n}</b><button class="btn ghost sm" data-bpl="1">+</button><button class="btn ghost sm" data-bpl="10">+10</button></div>
    <span class="tiny">Lv ${bpLv()} → Lv ${bpLv() + n} · you have ${fmt(S.wallet.pearls)} pearls</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Cancel</button><button class="btn gold" id="bplGo" ${S.wallet.pearls < n * BP_LV_PEARLS ? 'disabled' : ''}>Buy · ${costHTML(n * BP_LV_PEARLS)}</button></div></div>`;
    b.querySelectorAll('[data-bpl]').forEach(x => x.onclick = () => { n = Math.max(1, Math.min(max, n + +x.dataset.bpl)); draw(); });
    b.querySelector('[data-close]').onclick = closeModal;
    $('#bplGo').onclick = () => { const c = n * BP_LV_PEARLS; if (S.wallet.pearls < c) return; S.wallet.pearls -= c; bpGain(n * BP_LV_XP, false); persist(); renderMenu(); closeModal(); openHonor('rewards'); toast(`+${n} Pearl Honor level${n > 1 ? 's' : ''}.`); }; };
  openModal({ title: 'Purchase levels', ic: 'plus', small: true, body: '<div id="bplBody"></div>', onMount: draw });
}

/* emblems (gift box for the free track, a medal for the paid ones) */
const bpEmblem = tier => customIcon('bp' + tier) ? `<img class="bp-svg bp-cimg" src="${customIcon('bp' + tier)}" alt="">` : tier ? `<svg viewBox="0 0 64 64" class="bp-svg" aria-hidden="true"><defs><linearGradient id="bpE${tier}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe4f6"/><stop offset=".4" stop-color="#f5afe8"/><stop offset=".72" stop-color="#c8a2ff"/><stop offset="1" stop-color="#94b8ff"/></linearGradient></defs>
  <path d="M20 4h24l-4 18H24z" fill="${tier === 2 ? '#ff7ac8' : '#8f7bff'}" opacity=".85"/><circle cx="32" cy="38" r="20" fill="url(#bpE${tier})" stroke="#fff" stroke-width="2"/><circle cx="32" cy="38" r="14" fill="none" stroke="#2b1855" stroke-width="1.4" opacity=".35"/>
  ${tier === 2 ? '<path d="M36 27a11 11 0 1 0 6 19 9 9 0 1 1-6-19z" fill="#fff" stroke="#2b1855" stroke-width="1.2" stroke-linejoin="round"/><circle cx="40" cy="31" r="1.4" fill="#fff"/><circle cx="44" cy="37" r="1" fill="#fff"/>' : '<circle cx="32" cy="38" r="7" fill="#fff"/><circle cx="29.5" cy="35.5" r="2.2" fill="#f5afe8"/>'}</svg>`
  : `<svg viewBox="0 0 64 64" class="bp-svg" aria-hidden="true"><rect x="12" y="26" width="40" height="28" rx="4" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M8 26h48M32 26v28" stroke="#fff" stroke-width="2.4"/><path d="M32 26c-4-9-15-11-15-4 0 4 9 4 15 4zm0 0c4-9 15-11 15-4 0 4-9 4-15 4z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M50 8l1.4 3.2 3.2 1.4-3.2 1.4L50 17.2 48.6 14l-3.2-1.4 3.2-1.4z" fill="#fff"/></svg>`;
ICONS.medal = '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 3h7l-2 6.3h-3z"/><path d="M12 12.4l.8 1.6 1.7.2-1.3 1.2.4 1.7-1.6-.9-1.6.9.4-1.7-1.3-1.2 1.7-.2z"/>';

/* profile items from Moon Tide */
FRAMES.push({ id: 'crown', name: 'Moonlit Halo', need: 'bpcrown', premium: true });
CARDS.push({ id: 'honor', name: 'Pearl Honor', need: 'bpcrown', premium: true });
UNLOCK.bpcrown = [() => (S.unlocks || []).includes('bp-crown'), 'Unlock Moon Tide in Pearl Honor'];

/* ---------- the Pearl Honor page (a full screen of its own, .bpx; it was a wide window before) ----------
   A drawn moonlit sea behind (or the admin's wallpaper, media key honor:bg, framed with Adjust position) so the
   see-through glass panels and tabs have something to show through. */
let bpTab = 'rewards', bpMTab = 'bpd', bpEl = null;
const BPX_PEARLS = [[6, 9, 19, 0], [14, 6, 23, 7], [23, 12, 17, 3], [31, 7, 26, 12], [42, 10, 21, 5], [53, 5, 28, 15], [61, 11, 18, 9], [70, 8, 24, 1], [78, 13, 20, 11], [87, 6, 27, 6], [94, 9, 22, 14]];
/* the background blur (admin → Pearl Honor, content S.honorBg.blur, 0–30 px, default BPX_BLUR) */
const BPX_BLUR = 12;
const bpxBlur = () => { const b = S.honorBg && S.honorBg.blur; return b == null ? BPX_BLUR : Math.max(0, Math.min(30, +b || 0)); };
function bpxBlurApply() { if (bpEl) bpEl.style.setProperty('--bpxb', bpxBlur() + 'px'); }
function bpxBgHTML() {
  const art = artImg('honor:bg', 'bpx-wp');
  return `${art}<div class="bpx-sky ${art ? 'art' : ''}"><i class="bpx-glow g1"></i><i class="bpx-glow g2"></i><i class="bpx-glow g3"></i>
    ${art ? '' : '<i class="bpx-stars s1"></i><i class="bpx-stars s2"></i><i class="bpx-moon"></i><span class="bpx-sea"><i class="w1"></i><i class="w2"></i><i class="w3"></i></span><i class="bpx-path"></i>'}
    ${BPX_PEARLS.map(([x, s, d, dl]) => `<i class="bpx-pl" style="--x:${x}%;--s:${s}px;--d:${d}s;--dl:-${dl}s;--sw:${(x % 3 - 1) * 24}px"></i>`).join('')}</div><i class="bpx-vig"></i>`;
}
function openHonor(tab) {
  if (tab) bpTab = tab; bpState(); closeModal();
  if (!bpEl) { bpEl = document.createElement('div'); bpEl.className = 'bpx'; bpEl.setAttribute('role', 'dialog'); bpEl.setAttribute('aria-label', 'Pearl Honor');
    bpEl.innerHTML = `<div class="bpx-bg" aria-hidden="true">${bpxBgHTML()}</div><div id="bpRoot" class="bpx-in"></div>`; document.body.appendChild(bpEl); }
  bpxBlurApply();
  renderHonor(true);
}
function bpxBgRefresh() { const b = bpEl && bpEl.querySelector('.bpx-bg'); if (b) b.innerHTML = bpxBgHTML(); }
function closeHonor() { if (bpEl) { bpEl.remove(); bpEl = null; } renderMenu(); }
addEventListener('keydown', e => { if (bpEl && e.key === 'Escape' && !document.querySelector('.modal-back,.mall,.rewpop')) { e.stopPropagation(); closeHonor(); } }, true);
const bpLeftTxt = () => { const s = Math.max(0, bpEnds() - Date.now()) / 1000, d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return `${d}d ${h}h ${m}m`; };
/* where a level column sits inside the scrolling track, whatever its offset parent is */
const bpColX = (t, c) => c.getBoundingClientRect().left - t.getBoundingClientRect().left + t.scrollLeft;
function renderHonor(jump) {
  const root = $('#bpRoot'); if (!root) return;
  const st = bpState(), lv = bpLv(), into = lv >= BP_MAX ? BP_LV_XP : st.xp - (lv - 1) * BP_LV_XP, keep = $('#bpTrack') ? $('#bpTrack').scrollLeft : null;
  const tabs = [['rewards', 'gift', 'Rewards'], ['missions', 'quests', 'Missions'], ['unlock', 'medal', 'Unlock']];
  const dotFor = k => k === 'rewards' ? bpClaimable().length : k === 'missions' ? bpMissionsReady() : 0;
  const head = `<div class="bp-head"><span class="bp-lvc"><small>Lv</small><b>${lv}</b></span>
    <div class="bp-hinfo"><div class="bp-hrow"><span><b class="bp-hlv">Honor level ${lv}</b><span class="bp-hseason"> · Season ${st.season + 1} · Ends in ${bpLeftTxt()}</span></span><span>${lv >= BP_MAX ? 'Max level' : `${curIcon('honor')}${fmt(into)} / ${fmt(BP_LV_XP)}`}</span></div>
      <div class="bp-bar"><i style="width:${Math.min(100, into / BP_LV_XP * 100)}%"></i></div>
      <div class="bp-hrow tiny"><span>${st.tier === 2 ? 'Moon Tide active' : st.tier === 1 ? 'Coral Tide active' : 'Free track'}</span><span>Weekly EXP limit ${fmt(st.wk.xp)} / ${fmt(BP_WEEK_CAP)}</span></div></div>
    <button class="btn gold sm bp-buylv" id="bpBuyLv" ${lv >= BP_MAX ? 'disabled' : ''}>${icon('plus')}Purchase level</button></div>`;
  let body = '';
  if (bpTab === 'rewards') {
    const cell = (l, t) => { const [k, n] = Object.entries(bpReward(l, t))[0], got = st[t].includes(l), can = bpCanClaim(l, t), lock = t === 'paid' && !st.tier;
      return bpItem(k, n, got ? `<span class="bp-ok">${icon('check')}</span>` : lock ? `<span class="bp-lock">${icon('lock')}</span>` : '', `bp-cell ${got ? 'got' : can ? 'can' : l > lv ? 'future' : ''} ${lock ? 'locked' : ''}`, `data-bpc="${l}|${t}"`); };
    const tiers = `<div class="bp-tiers"><span class="bp-th">Lv</span>
      <div class="bp-lab"><span class="bp-emb">${bpEmblem(0)}</span><b>${BP_NAMES.free}</b><small>Free</small></div>
      <div class="bp-lab paid ${st.tier ? '' : 'locked'}"><span class="bp-emb">${bpEmblem(st.tier === 2 ? 2 : 1)}</span><b>${BP_NAMES.paid}</b><small>${st.tier ? `${icon('check')}${st.tier === 2 ? 'Moon Tide' : 'Active'}` : `${icon('lock')}Locked`}</small></div></div>`;
    const cols = Array.from({ length: BP_MAX }, (_, i) => i + 1).map(l => `<div class="bp-col ${l === lv ? 'now' : ''} ${l <= lv ? 'reached' : ''} ${l % 10 === 0 ? 'big' : ''}" data-lv="${l}"><span class="bp-lvt">Lv. ${l}</span>${cell(l, 'free')}${cell(l, 'paid')}</div>`).join('');
    const n = bpClaimable().length;
    const next = Math.min(BP_MAX, Math.ceil((lv + 1) / 10) * 10), mGot = st.mile.length;
    // the season milestones: the same two items on every 10th level (1 pearl + 5 skin tickets), Coral Tide / Moon Tide only
    const miles = Array.from({ length: BP_MAX / 10 }, (_, i) => (i + 1) * 10).map(l => { const got = st.mile.includes(l), can = bpCanClaim(l, 'mile');
      return `<button type="button" class="bp-mile ${l <= lv ? 'on' : ''} ${l === next && lv < BP_MAX ? 'next' : ''} ${got ? 'got' : can ? 'can' : ''} ${st.tier ? '' : 'lk'}" data-bpml="${l}" title="Level ${l} milestone: ${Object.entries(BP_MILE).map(([a, b]) => bpNm(a, b)).join(' + ')}${st.tier ? got ? ' · claimed' : can ? ' · tap to claim' : '' : ` · needs ${BP_NAMES.paid} or Moon Tide`}">
        <span class="bp-mlv">Lv ${l}</span><span class="bp-mits">${Object.entries(BP_MILE).map(([k, v]) => `<i class="r${REW_R[k] || 4} ${got ? 'got' : can ? 'can' : ''} ${st.tier ? '' : 'lk'}">${curIcon(k)}<b>${fmt(v)}</b>${got ? icon('check') : st.tier ? '' : icon('lock')}</i>`).join('')}</span></button>`; }).join('');
    const mlFill = Math.min(100, Math.max(0, (lv - 10) / (BP_MAX - 10) * 100));
    body = `<div class="bp-rew v3">
      <div class="bp-track" id="bpTrack">${tiers}${cols}</div>
      <div class="bp-side"><div class="bp-show"><span class="nc nc-honor"></span><span class="bp-show-av">${avatarHTML(64, avatarEntry(), 'crown')}</span><b>Moon Tide</b><small>Moonlit Halo frame + namecard</small></div>
        ${st.tier ? `<button class="btn gold bp-claim" id="bpClaim" ${n ? '' : 'disabled'}>${n ? `Claim all · ${n}` : 'Nothing to claim'}</button>` : `<button class="btn gold bp-claim" data-bptab="unlock">Unlock ${BP_NAMES.paid}</button><button class="btn ghost sm" id="bpClaim" ${n ? '' : 'disabled'}>${n ? `Claim all · ${n}` : 'Nothing to claim'}</button>`}</div>
    </div>
    <div class="bp-mls ${st.tier ? '' : 'locked'}"><div class="bp-mlh"><b>Season milestones</b><small>${st.tier ? `${mGot} / ${BP_MAX / 10} claimed · ` : ''}Every 10th level: 1 pearl + 5 skin tickets · ${st.tier ? 'tap a reached one to claim it' : `only with ${BP_NAMES.paid} or Moon Tide`}</small></div>
      <div class="bp-mlrow" style="--mf:${mlFill}%"><span class="bp-mlbar" aria-hidden="true"><i></i></span>${miles}</div></div>`;
  } else if (bpTab === 'missions') {
    const set = bpMTab, L = BP_SETS[set].list, order = q => qCan(q, set) ? 0 : qDone(q, set) ? 2 : 1;
    const ready = L.filter(q => qCan(q, set)).length, total = L.reduce((t, q) => t + q.xp, 0);
    const cards = L.slice().sort((a, b) => order(a) - order(b)).map(q => { const p = qProg(q, set), done = qDone(q, set), can = qCan(q, set);
      return `<div class="dq-card ${done ? 'got' : can ? 'can' : ''}">
        <div class="dq-face"><span class="dq-disc">${done ? `<span class="dq-check">${icon('check')}</span>` : icon('shell')}</span>
          <span class="dq-pt">${curIcon('honor')}+${fmt(q.xp)}</span>
          <p class="dq-name">${esc(q.name)}</p>
          <b class="dq-prog">${fmt(p)} / ${fmt(q.need)}</b><span class="dq-pbar" aria-hidden="true"><i style="width:${Math.min(100, p / q.need * 100)}%"></i></span></div>
        ${done ? '<span class="dq-btn done">Fulfilled</span>' : can ? '<button class="dq-btn claim" data-bpmc="1">Claim</button>' : q.go ? `<button class="dq-btn go" data-bpgo="${q.go}">Go</button>` : '<span class="dq-btn">In progress</span>'}
      </div>`; }).join('');
    body = `<div class="dq bp-dq">
      <div class="dq-tabs" role="tablist">${Object.entries(BP_SETS).map(([k, x]) => `<button class="dq-tab ${k === set ? 'on' : ''}" data-bpm="${k}">${x.title}${k !== set && x.list.some(q => qCan(q, k)) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</div>
      <div class="dq-top">
        <div class="dq-pts">${curIcon('honor')}<div><b>${fmt(st.wk.xp)}</b><small>Honor EXP this week</small></div></div>
        <div class="bp-cap"><div class="dq-bar"><i style="width:${Math.min(100, st.wk.xp / BP_WEEK_CAP * 100)}%"></i></div><span class="tiny">Weekly limit ${fmt(st.wk.xp)} / ${fmt(BP_WEEK_CAP)}${bpWeekLeft() <= 0 ? ' · reached: missions give no more EXP until Monday' : ` · ${fmt(total)} Honor EXP from these ${set === 'bpd' ? 'daily' : 'weekly'} missions`}</span></div>
      </div>
      <div class="dq-list">${cards}</div>
      <div class="dq-foot">${ready ? '<button class="btn gold" id="bpMAll">Claim all</button>' : '<span class="tiny">Finish missions to earn Honor EXP.</span>'}
        <span class="dq-refresh">${icon('clock')}Refresh time: <b>${qLeft(set === 'bpd' ? 'daily' : 'weekly')}</b></span></div>
    </div>`;
  } else {
    const card = o => { const owned = st.tier >= o.tier, upg = st.tier === 1 && o.tier === 2, usd = upg ? (parseFloat(o.usd) - parseFloat(BP_OFFERS[0].usd)).toFixed(2) : o.usd;
      const sample = [1, 2, 3, 5, 10, 20, 80].map(l => bpReward(l, 'paid')), worth = bpWorth('paid') + (o.tier === 2 ? Math.round(bpWorthOf(o.now)) : 0);
      return `<div class="bp-offer t${o.tier}"><div class="bp-ofl"><span class="bp-emb big">${bpEmblem(o.tier)}</span><b>${o.name}</b><span class="bp-worth" title="What every reward it unlocks is worth in pearls (a pull = 3 pearls)">${curIcon('pearls')}Worth ≈ <b>${fmt(Math.round(worth / 10) * 10)}</b> pearls</span></div>
        <div class="bp-ofr"><span class="lbl-sm">Get now</span>
          <div class="bp-ofits">${o.tier === 2 ? `${Object.entries(o.now).map(([k, n]) => bpItem(k, n)).join('')}<span class="inv-cell bp-sq r5"><span class="inv-pic bp-avpic">${avatarHTML(40, avatarEntry(), 'crown')}</span><b>Frame</b></span><span class="inv-cell bp-sq r5"><span class="inv-pic"><span class="nc nc-honor"></span></span><b>Namecard</b></span>` : '<span class="tiny">The Coral Tide track on all 80 levels</span>'}</div>
          ${o.tier === 2 ? `<span class="bp-ofx">Also raises <b>${o.levels}</b> Pearl Honor levels at once.</span>` : ''}
          ${o.tier === 1 ? `<span class="lbl-sm">Season milestones · every 10th level</span>
          <div class="bp-ofits">${Object.entries(BP_MILE).map(([k, n]) => bpItem(k, n)).join('')}<span class="tiny bp-ofmx">× ${BP_MAX / 10} = ${Object.entries(BP_MILE).map(([k, n]) => bpNm(k, n * BP_MAX / 10)).join(' + ')} a season</span></div>` : ''}
          <span class="lbl-sm">Available after leveling up</span>
          <div class="bp-ofits">${sample.map(r => Object.entries(r).map(([k, n]) => bpItem(k, n)).join('')).join('')}<span class="bp-more">…</span></div>
          <button class="bp-price" data-bpbuy="${o.id}" ${owned ? 'disabled' : ''}>${owned ? 'Unlocked' : `$${usd}${o.was && !upg ? ` <s>$${o.was}</s>` : ''}${TOPUP_FREE ? ' · free test' : ''}`}</button></div></div>`; };
    body = `<div class="bp-unlock"><div class="bp-uleft"><div class="bp-show big"><span class="nc nc-honor"></span><span class="bp-show-av">${avatarHTML(96, avatarEntry(), 'crown')}</span><b>Moon Tide</b><small>Moonlit Halo frame + Pearl Honor namecard</small></div>
      <p class="tiny">Unlock <b>Coral Tide</b> and raise Pearl Honor to level ${BP_MAX} to collect every Coral Tide reward of the season: ${fmt(BP_TOT('pearls'))} pearls, ${fmt(BP_TOT('pulls'))} pulls, ${fmt(BP_TOT('thread'))} Thread, ${fmt(BP_TOT('bottles'))} stamina bottles, ${fmt(BP_TOT('coins'))} gold, 2 UR memory tickets, a UR selector and the ${BP_MAX / 10} season milestones. Real payments aren't connected yet, so both are free while testing (they still count for VIP EXP).</p></div>
      <div class="bp-offers">${BP_OFFERS.map(card).join('')}</div></div>`;
  }
  root.innerHTML = `<header class="bpx-head">
      <div class="bpx-hl"><div class="inv-title"><span class="inv-badge">${icon('medal')}</span><h2 class="ts">Pearl Honor</h2></div>
        <span class="bpx-season" title="Season ${st.season + 1} ends in ${bpLeftTxt()}">${icon('clock')}<b>Season ${st.season + 1}</b><small>${bpLeftTxt().replace(/ \d+m$/, '')} left</small></span></div>
      <nav class="bpx-tabs" role="tablist">${tabs.map(([k, ic, l]) => `<button class="bpx-tab ${k === bpTab ? 'on' : ''}" role="tab" aria-selected="${k === bpTab}" data-bptab="${k}">${icon(ic)}<span>${l}</span>${k !== bpTab && dotFor(k) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</nav>
      <div class="bpx-hr"><div class="cur" data-k="pearls" title="Pearls">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b><button class="plus" data-open="shop" data-shoptab="topup" aria-label="Get more pearls">${icon('plus')}</button></div>
        ${canAdmin() ? `<button class="btn ghost bpx-adm" id="bpxAdm" title="Admin: the Pearl Honor background (wallpaper and blur)">${icon('image')}<span>Background</span></button>` : ''}
        <button class="inv-x" id="bpxClose" aria-label="Close">${icon('close')}</button></div></header>
    <div class="bpx-body t-${bpTab}">${head}${body}</div>`;
  $('#bpxClose').onclick = closeHonor;
  const adb = $('#bpxAdm'); if (adb) adb.onclick = () => openAdmin('honor');
  root.querySelectorAll('[data-bptab]').forEach(b => b.onclick = () => { bpTab = b.dataset.bptab; renderHonor(true); });
  root.querySelectorAll('[data-bpm]').forEach(b => b.onclick = () => { bpMTab = b.dataset.bpm; renderHonor(); });
  root.querySelectorAll('[data-bpc]').forEach(b => b.onclick = () => { const [l, t] = b.dataset.bpc.split('|'); if (bpCanClaim(+l, t)) bpClaimAll(); else if (t === 'paid' && !st.tier) { bpTab = 'unlock'; renderHonor(); } });
  root.querySelectorAll('[data-bpmc]').forEach(b => b.onclick = () => bpClaimMissions(bpMTab));
  root.querySelectorAll('[data-bpgo]').forEach(b => b.onclick = () => { closeHonor(); Q_GO[b.dataset.bpgo] && Q_GO[b.dataset.bpgo](); });
  root.querySelectorAll('[data-bpbuy]').forEach(b => b.onclick = () => bpBuy(b.dataset.bpbuy));
  const ma = $('#bpMAll'); if (ma) ma.onclick = () => bpClaimMissions(bpMTab);
  const ca = $('#bpClaim'); if (ca) ca.onclick = bpClaimAll;
  $('#bpBuyLv').onclick = bpBuyLevels;
  const tierW = t => { const x = t.querySelector('.bp-tiers'); return x ? x.offsetWidth : 0; };
  root.querySelectorAll('[data-bpml]').forEach(b => b.onclick = () => { if (bpCanClaim(+b.dataset.bpml, 'mile')) return bpClaimAll(); const t = $('#bpTrack'), c = t && t.querySelector(`.bp-col[data-lv="${b.dataset.bpml}"]`); if (!c) return;
    const w = tierW(t); t.scrollTo({ left: Math.max(0, bpColX(t, c) - w - (t.clientWidth - w - c.offsetWidth) / 2), behavior: 'smooth' }); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); });
  const tr = $('#bpTrack');
  if (tr) { if (jump || keep === null) { const c = tr.querySelector('.bp-col.now'); if (c) tr.scrollLeft = Math.max(0, bpColX(tr, c) - tierW(tr) - 10); } else tr.scrollLeft = keep;
    tr.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tr.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false }); }
}

CUR_SVG.honor = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="honG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe4f6"/><stop offset=".5" stop-color="#c8a2ff"/><stop offset="1" stop-color="#94b8ff"/></linearGradient></defs><path d="M8 2h8l-2 7h-4z" fill="#8f7bff"/><circle cx="12" cy="15" r="7" fill="url(#honG)" stroke="#fff" stroke-width="1.3"/><path d="M12 11l1.2 2.5 2.7.4-2 1.9.5 2.7L12 17.3l-2.4 1.2.5-2.7-2-1.9 2.7-.4z" fill="#fff"/></svg>';
