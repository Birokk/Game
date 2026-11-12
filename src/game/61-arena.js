/* ---------- Arena (Card Battle against other players' defense decks) ----------
   Join by setting a DEFENSE DECK (a snapshot of one of your 30-card decks + its leader). Then:
   - 5 battles every 12 hours (AR_TICKETS, windows 00:00–12:00 and 12:00–24:00 local, arWin); a battle is used when it starts.
   - You attack one of 3 opponents (their defense deck, played by the bot); win / lose Victory Points (VP) by your rank (AR_VP).
   - Other players attack YOUR defense while you're away (simulated: 1–3 attacks per 12-hour window, arSimDefense); a held
     defense gives VP and arena tokens, a fallen one loses VP.
   - Ranks by VP (AR_RANKS, after the owner's chart): Bronze 0, Silver 1,000, Gold 2,000, Platinum 3,000, Diamond 4,000
     (V → I, 200 VP a division), Mythic 5,000 and Ascendant 5,250 (V → I, 50 VP a division), Celestial 5,500 (VI → I).
   - Arena tokens (wallet atok): every battle (win 20, draw 10, loss 5), every held defense (5) and the weekly mail.
     Spent in the Arena Shop (daily items like the guild shop, arShopToday; also Shop → Arena Shop).
   - Weekly rewards (Monday 00:00 local, arSettle): pearls + tokens by your rank, by mail.
   There is no arena server yet: opponents, attackers and the ranking are practice players (seeded).
   State S.arena {joined, vp, best, def {cards, lead, name, src, at}, win, used, ref, beat [ids], foes {k, list}, simT, seenT,
   wk, log [...], st {w, l, d, dw, dl}, shop {key, got, ref}} (player save). */
ICONS.arena = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 8.5l6 6M15 8.5l-6 6"/>';
ICONS.shield = '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>';
ICONS.scroll = '<path d="M7 4h11a2 2 0 0 1 2 2v1h-4"/><path d="M16 7v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1h10"/><path d="M7 4a2 2 0 0 0-2 2v11"/><path d="M9 9h4M9 13h4"/>';
CUR_SVG.atok = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="atkG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6e6"/><stop offset=".5" stop-color="#ff5d8f"/><stop offset="1" stop-color="#7a1240"/></linearGradient><linearGradient id="atkS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset="1" stop-color="#f0b545"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#atkG)" stroke="#ffe6f0" stroke-width="1.2"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width=".8"/><path d="M12 6.2l4.4 1.8v3.1c0 2.8-1.8 4.9-4.4 6.1-2.6-1.2-4.4-3.3-4.4-6.1V8z" fill="url(#atkS)" stroke="#7a1240" stroke-width=".7"/><path d="M10.1 9.6l3.8 3.8M13.9 9.6l-3.8 3.8" stroke="#7a1240" stroke-width="1.2" stroke-linecap="round"/></svg>';
REW_NAMES.atok = ['arena token', 'arena tokens']; REW_R.atok = 5;
if (typeof OFFER_KEYS !== 'undefined' && !OFFER_KEYS.includes('atok')) OFFER_KEYS.push('atok');

const AR_TICKETS = 5;   // battles every 12 hours
const AR_TOK = { win: 20, draw: 10, lose: 5 }, AR_DEF_TOK = 5;   // arena tokens per battle / per held defense
const AR_RANKS = [
  { id: 'bronze', name: 'Bronze', min: 0, divs: 5, step: 200, c1: '#ffe0c2', c2: '#c9814a', c3: '#4a220c', gem: '#ff9a5c' },
  { id: 'silver', name: 'Silver', min: 1000, divs: 5, step: 200, c1: '#ffffff', c2: '#b3c0d4', c3: '#3a4558', gem: '#a9d4ff' },
  { id: 'gold', name: 'Gold', min: 2000, divs: 5, step: 200, c1: '#fff4c4', c2: '#eab23a', c3: '#6a3c04', gem: '#ffe680' },
  { id: 'platinum', name: 'Platinum', min: 3000, divs: 5, step: 200, c1: '#effffc', c2: '#78d3c6', c3: '#164a4c', gem: '#86fff0' },
  { id: 'diamond', name: 'Diamond', min: 4000, divs: 5, step: 200, c1: '#eef7ff', c2: '#72aefc', c3: '#15307a', gem: '#bfe6ff' },
  { id: 'mythic', name: 'Mythic', min: 5000, divs: 5, step: 50, c1: '#f8eaff', c2: '#a974ff', c3: '#30106c', gem: '#f0b8ff' },
  { id: 'ascendant', name: 'Ascendant', min: 5250, divs: 5, step: 50, c1: '#ffe6ee', c2: '#ff5f8e', c3: '#640a2a', gem: '#ffc2d4' },
  { id: 'celestial', name: 'Celestial', min: 5500, divs: 6, step: 50, c1: '#fffdf2', c2: '#ffcf6a', c3: '#5a2a9a', gem: '#ffffff', prism: true }
];
const AR_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/* VP gained / lost by your rank: [attack win, attack loss, defense win, defense loss] (Mythic V loses more than Mythic IV–I) */
const AR_VP = { bronze: [25, 0, 25, 0], silver: [22, -2, 22, -2], gold: [20, -4, 20, -4], platinum: [18, -6, 18, -6], diamond: [15, -8, 15, -8],
  mythic5: [12, -10, 12, -10], mythic: [12, -5, 12, -5], ascendant: [10, -8, 10, -6], celestial: [10, -10, 10, -10] };
/* the weekly mail by rank: [pearls, arena tokens] */
const AR_WEEK = { bronze: [10, 50], silver: [20, 80], gold: [30, 120], platinum: [45, 160], diamond: [60, 200], mythic: [80, 260], ascendant: [100, 320], celestial: [150, 400] };
/* opponents get tougher with their rank: hero HP and the bot's brain (the Quick match brains: easy / bot / plan / best) */
const AR_HP = [16, 17, 18, 20, 20, 20, 22, 22];
const AR_BRAIN = ['easy', 'easy', 'bot', 'bot', 'plan', 'plan', 'best', 'best'];
const AR_DECKS = ['p-balanced', 'p-rush', 'p-defensive', 'raiders', 'arcane', 'traps', 'frost', 'storm', 'holy', 'fort', 'warlord'];

/* a rank from VP: the rank, its division (V..I, VI..I for Celestial), the label and the VP for the next step */
function arRankOf(vp) {
  vp = Math.max(0, vp || 0);
  let i = AR_RANKS.length - 1; while (i > 0 && vp < AR_RANKS[i].min) i--;
  const r = AR_RANKS[i], k = Math.min(r.divs - 1, Math.floor((vp - r.min) / r.step)), div = r.divs - k;
  const next = k < r.divs - 1 ? r.min + (k + 1) * r.step : AR_RANKS[i + 1] ? AR_RANKS[i + 1].min : null;
  const from = r.min + k * r.step;
  return { r, i, k, div, dn: AR_ROMAN[div - 1], label: `${r.name} ${AR_ROMAN[div - 1]}`, from, next, pct: next == null ? 100 : Math.max(0, Math.min(100, (vp - from) / (next - from) * 100)) };
}
const arVpRow = vp => { const R = arRankOf(vp); return AR_VP[R.r.id === 'mythic' && R.div === 5 ? 'mythic5' : R.r.id]; };
const arCol = id => (AR_RANKS.find(x => x.id === id) || AR_RANKS[0]).c2;

/* the 12-hour windows: 00:00–12:00 and 12:00–24:00 local */
function arWin(t = Date.now()) {
  const d = new Date(t), h = d.getHours() < 12 ? 0 : 12, s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h), e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h + 12);
  return { key: dayKey(d) + ':' + h, start: s.getTime(), end: e.getTime() };
}
const arResetTxt = () => { const t = Math.max(0, arWin().end - Date.now()), h = Math.floor(t / 36e5), m = Math.floor(t % 36e5 / 6e4); return h ? `${h}h ${m}m` : `${m}m`; };
const arWeekTxt = () => { const n = new Date(), s = weekStart(), nx = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7), t = nx - n, d = Math.floor(t / 864e5), h = Math.floor(t % 864e5 / 36e5), m = Math.floor(t % 36e5 / 6e4); return d ? `${d}d ${h}h` : `${h}h ${m}m`; };

function arState() {
  let a = S.arena; if (!a || typeof a !== 'object') a = S.arena = {};
  if (typeof a.vp !== 'number') a.vp = 0;
  if (typeof a.best !== 'number') a.best = a.vp;
  if (!Array.isArray(a.log)) a.log = [];
  if (!a.st || typeof a.st !== 'object') a.st = { w: 0, l: 0, d: 0, dw: 0, dl: 0 };
  const w = arWin(); if (a.win !== w.key) { a.win = w.key; a.used = 0; a.ref = 0; a.beat = []; a.foes = null; }
  if (!Array.isArray(a.beat)) a.beat = [];
  return a;
}
const arJoined = () => !!(S.arena && S.arena.joined && S.arena.def);
const arLeft = () => Math.max(0, AR_TICKETS - (arState().used || 0));
const arPush = e => { const a = arState(); a.log.unshift(e); if (a.log.length > 60) a.log.length = 60; };
const arUid = () => String((S.profile && S.profile.uid) || (S.account && S.account.userId) || 'me');

/* ---- practice players ---- */
const arChars = () => S.pool.filter(e => e.type === 'character' && !e.mc);
const arDeckOf = k => { const pr = CC_PRESETS.find(x => x.id === k); return { cards: (pr ? pr.cards : CC_CAMP_DECKS[k] || CC_PRESETS[0].cards).slice(), name: pr ? pr.name : QM_RIVAL_NM[k] || 'Defense deck' }; };
/* one opponent: everything comes from its id (a seed) and its VP */
function arFoe(id, vp) {
  const r = seeded('arfoe:' + id), name = gName(r), ch = arChars(), lead = ch.length ? ch[Math.floor(r() * ch.length)] : null, dk = AR_DECKS[Math.floor(r() * AR_DECKS.length)];
  const R = arRankOf(vp), D = arDeckOf(dk), seed = Math.floor(r() * 4294967295) >>> 0;
  return { id, name, vp, lv: Math.min(LV_MAX, 8 + R.i * 6 + Math.floor(r() * 10)), lead: lead ? lead.id : null, dk, cards: D.cards, deckName: D.name,
    hp: AR_HP[R.i], brain: AR_BRAIN[R.i], power: Math.round(15000 + vp * 55 + r() * 18000), seed, skin: ccBotSkin(seed), back: ccBotBack(seed) };
}
/* the 3 opponents of this window (or refresh): one a little below you, one level with you, one above */
function arFoes() {
  const a = arState(), k = a.win + ':' + (a.ref || 0);
  if (!a.foes || a.foes.k !== k || Math.abs(a.vp - (a.foes.base ?? a.vp)) > 250) {   // a new window / refresh, or your VP moved far from the list
    const off = [[-150, -30], [-50, 60], [50, 220]];
    a.foes = { k, base: a.vp, list: off.map(([lo, hi], i) => { const r = seeded('arfv:' + arUid() + ':' + k + ':' + Math.round(a.vp / 250) + ':' + i); return { id: `${arUid()}:${k}:${Math.round(a.vp / 250)}:${i}`, vp: Math.max(0, Math.round(a.vp + lo + r() * (hi - lo))) }; }) };
    persist();
  }
  return a.foes.list.map(x => arFoe(x.id, x.vp));
}
const AR_REF_COST = 10;   // refreshing the opponents costs tokens unless all 3 are beaten
const arRefCost = () => arFoes().every(f => arState().beat.includes(f.id)) ? 0 : AR_REF_COST;
function arRefresh() {
  const c = arRefCost(); if ((S.wallet.atok || 0) < c) { toast(`A refresh costs ${c} arena tokens. You have ${fmt(S.wallet.atok || 0)}.`); return; }
  S.wallet.atok = (S.wallet.atok || 0) - c; const a = arState(); a.ref = (a.ref || 0) + 1; arSel = null; persist(); renderArena();
  toast(c ? `New opponents (−${c} arena tokens)` : 'New opponents');
}
/* the ranking: 40 practice players (the Ranking's practice players + more), their VP moves a little each week */
function arBoard() {
  const wk = playWeek(), part = Math.min(1, (Date.now() - weekStart().getTime()) / (7 * 864e5)), ch = arChars();
  const L = Array.from({ length: 40 }, (_, i) => {
    const r = seeded('arpl:' + i), name = RANK_NAMES[i] || gName(r), base = 700 + Math.pow(r(), .55) * 5250, w = seeded('arplw:' + i + ':' + wk)();
    const lead = ch.length ? ch[Math.floor(r() * ch.length)] : null, vp = Math.max(0, Math.round(base + (w - .4) * 180 * part));
    return { name, vp, lv: Math.min(LV_MAX, 12 + Math.floor(r() * 48)), lead, bot: true };
  });
  if (arJoined()) L.push({ name: S.player.name || 'You', vp: arState().vp, lv: playerLv().lv, lead: findEntry(arState().def.lead), me: true });
  return L.sort((x, y) => y.vp - x.vp || (x.me ? -1 : 1));
}

/* ---- your defense: other players attack it while you're away (1–3 attacks per 12-hour window, at most 3 days back) ---- */
function arSimDefense() {
  if (!arJoined()) return 0;
  const a = arState(), now = Date.now(), from = Math.max(a.simT || a.joined, now - 3 * 864e5), ch = arChars();
  let w = arWin(from), n = 0;
  while (w.start <= now) {
    const r = seeded('ardef:' + arUid() + ':' + w.key), k = 1 + Math.floor(r() * 3), ev = [];
    for (let i = 0; i < k; i++) ev.push({ at: w.start + Math.floor(r() * (w.end - w.start)), off: (r() - .45) * 320, name: gName(r), lead: ch.length ? ch[Math.floor(r() * ch.length)].id : null, roll: r() });
    ev.sort((x, y) => x.at - y.at).forEach(e => {
      if (e.at <= from || e.at > now || e.at < a.joined) return;
      const ov = Math.max(0, Math.round(a.vp + e.off)), p = Math.max(.25, Math.min(.75, .5 + (a.vp - ov) / 2000)), held = e.roll < p, row = arVpRow(a.vp);
      const d = held ? row[2] : row[3], tok = held ? AR_DEF_TOK : 0;
      a.vp = Math.max(0, a.vp + d); a.best = Math.max(a.best, a.vp); if (tok) S.wallet.atok = (S.wallet.atok || 0) + tok;
      a.st[held ? 'dw' : 'dl']++;
      arPush({ t: e.at, k: 'def', name: e.name, lead: e.lead, ov, res: held ? 'win' : 'lose', d, tok }); n++;
    });
    w = arWin(w.end + 1000);
  }
  a.log.sort((x, y) => y.t - x.t);
  a.simT = now; if (n) persist();
  return n;
}
const arUnseen = () => arJoined() ? arState().log.filter(e => e.k === 'def' && e.t > (arState().seenT || 0)) : [];
const arReady = () => arJoined() && (arLeft() > 0 || arUnseen().length > 0);

/* ---- weekly rewards: every Monday 00:00 local, by your rank, by mail ---- */
function arSettle(force) {
  if (!arJoined()) return;
  const a = arState(), wk = playWeek();
  if (!force && a.wk === wk) return;
  if (!force && !a.wk) { a.wk = wk; persist(); return; }
  arSimDefense();
  const R = arRankOf(a.vp), [p, t] = AR_WEEK[R.r.id];
  a.wk = wk;
  sendMail({ id: 'arena-' + wk + (force ? '-' + Date.now().toString(36) : ''), from: 'Arena', title: 'Weekly Arena rewards',
    body: `Your Arena rank this week: ${R.label} (${fmt(a.vp)} VP).\nRewards for ${R.r.name}: ${p} pearls and ${t} arena tokens.\nKeep climbing: higher ranks give bigger weekly rewards.`, reward: { pearls: p, atok: t } });
  persist();
  if (force) toast(`Arena week settled: ${R.label}, ${p} pearls + ${t} tokens sent to your Mail.`);
}

/* ---- joining and the defense deck ---- */
function arSetDefense(deckId) {
  const d = ccDeck(deckId); if (!d || !ccValidateDeck(d.cards).ok) { toast('That deck needs 30 cards.', true); return false; }
  const a = arState(), le = ccLeaderOf(d.id), first = !a.joined;
  a.def = { cards: d.cards.slice(), lead: le ? le.id : null, name: d.name, src: d.id, at: Date.now() };
  if (first) { a.joined = Date.now(); a.simT = Date.now(); a.seenT = Date.now(); a.wk = playWeek(); }
  persist(); renderMenu();
  toast(first ? `Welcome to the Arena! ${d.name} defends you while you're away.` : `${d.name} is your defense deck now.`);
  return true;
}
const arDefChanged = () => { const a = S.arena; if (!a || !a.def) return false; const d = ccAllDecks().find(x => x.id === a.def.src); return !!d && ccValidateDeck(d.cards).ok && (d.cards.join() !== a.def.cards.join() || ((ccLeaderOf(d.id) || {}).id || null) !== a.def.lead); };

/* ---- the battle ---- */
let arEl = null, arTab = 'battle', arSel = null, arPick = null;
function arBattle(fid) {
  const a = arState(); if (!arJoined()) return;
  if (arLeft() <= 0) { toast(`No battles left. ${AR_TICKETS} new battles in ${arResetTxt()}.`); return; }
  const f = arFoes().find(x => x.id === fid); if (!f) return;
  if (a.beat.includes(f.id)) { toast('Already defeated. Pick another opponent or refresh.'); return; }
  const deck = ccCampMyDeck(); if (!ccValidateDeck(deck.cards).ok) { toast('Pick a 30-card deck to attack with.', true); return; }
  a.used = (a.used || 0) + 1; persist();
  closeArena(false);
  startClash({ id: deck.id, name: deck.name, cards: deck.cards.slice() }, f.seed, null, null, null, null, { f, brain: f.brain, vp0: a.vp, win: a.win });
}
const arMatch = (deck, seed, names, ar) => ccCreateMatch(seed, deck.cards.slice(), ar.f.cards.slice(), names, { ev: null, hp: [CC_CFG.hp, ar.f.hp] });
function arFinish(G, ar) {
  const a = arState(), res = G.winner === 0 ? 'win' : G.winner === 1 ? 'lose' : 'draw', before = a.vp, R0 = arRankOf(before), row = arVpRow(before);
  const d = res === 'win' ? row[0] : res === 'lose' ? row[1] : 0, tok = AR_TOK[res];
  a.vp = Math.max(0, a.vp + d); a.best = Math.max(a.best, a.vp); S.wallet.atok = (S.wallet.atok || 0) + tok;
  a.st[res === 'win' ? 'w' : res === 'lose' ? 'l' : 'd']++;
  if (res === 'win') { if (a.win === ar.win && !a.beat.includes(ar.f.id)) a.beat.push(ar.f.id); questAdd('clash', 1); }
  arPush({ t: Date.now(), k: 'atk', name: ar.f.name, lead: ar.f.lead, ov: ar.f.vp, res, d, tok });
  const R1 = arRankOf(a.vp);
  persist();
  return { res, d, tok, before, after: a.vp, R0, R1, up: R1.label !== R0.label && a.vp > before, down: R1.label !== R0.label && a.vp < before };
}
function arEndHTML(r) {
  if (!r) return '';
  const sign = r.d > 0 ? '+' : r.d < 0 ? '−' : '±';
  return `<div class="ccm-rw arw ${r.res}"><span class="lbl-sm">Arena · ${r.res === 'win' ? 'Victory' : r.res === 'lose' ? 'Defeat' : 'Draw'}</span>
    <div class="arw-row"><span class="arw-em">${arEmblem(r.R1.r.id)}<i class="ar-dv">${r.R1.dn}</i></span>
      <span class="arw-vp"><b class="${r.d < 0 ? 'neg' : ''}">${sign}${Math.abs(r.d)} VP</b><small>${fmt(r.before)} → ${fmt(r.after)} VP · ${esc(r.R1.label)}</small></span>
      <span class="arw-tok">${curIcon('atok')}<b>+${r.tok}</b><small>Arena tokens</small></span></div>
    ${r.up ? `<p class="arw-up">${icon('up')}Promoted to <b>${esc(r.R1.label)}</b>!</p>` : r.down ? `<p class="arw-dn">Dropped to ${esc(r.R1.label)}</p>` : ''}</div>`;
}
const arEndBtns = () => { const left = arLeft(), lost = ccM && ccM.arenaRes && ccM.arenaRes.res !== 'win';
  return `<div class="ccm-endb">${lost && left ? `<button class="btn gold" id="arAgain">${icon('swords')}Try again · ${left} left</button>` : ''}<button class="btn ${lost && left ? 'ghost' : 'gold'}" id="arBack">${icon('arena')}Arena${left && !(lost && left) ? ` · ${left} battle${left === 1 ? '' : 's'} left` : ''}</button></div>`; };
/* leaving a battle: it counts as a loss (the battle is used) */
function arLeaveRes() { if (!ccM || ccM.done) return; ccM.done = true; ccM.arenaRes = arFinish({ winner: 1 }, ccM.arena); renderMenu(); }

/* ---- rank emblems (default drawings; admins upload their own per rank in admin → Battle screen → Arena) ---- */
let arN = 0;
function arEmblem(id, cls = '') {
  const up = customIcon('ark-' + id); if (up) return `<img class="ar-em up ${cls}" src="${up}" alt="">`;
  const R = AR_RANKS.find(x => x.id === id) || AR_RANKS[0], i = AR_RANKS.indexOf(R), u = 'are' + (arN++);
  const metal = R.prism ? `<stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ffd2ef"/><stop offset=".55" stop-color="#c8a2ff"/><stop offset=".8" stop-color="#8fd8ff"/><stop offset="1" stop-color="#5a2a9a"/>`
    : `<stop offset="0" stop-color="${R.c1}"/><stop offset=".55" stop-color="${R.c2}"/><stop offset="1" stop-color="${R.c3}"/>`;
  const wing = `<path d="M29 44C18 41 8 33 3 20c7 5 14 7 21 8C14 23 9 16 7 7c9 9 17 15 24 22-6-1-10-2-14-4 4 6 9 10 15 12z" fill="url(#${u}m)" stroke="${R.c3}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const leaf = [[24, 83, -50], [17, 74, -35], [13, 63, -18], [12, 51, -2], [14, 40, 14]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="6.4" ry="2.6" transform="rotate(${a} ${x} ${y})"/>`).join('');
  const gemS = [.62, .7, .78, .86, 1.02, 1, 1.04, 1.08][i];
  return `<svg class="ar-em ar-${R.id} ${cls}" viewBox="0 0 100 100" aria-hidden="true"><defs>
      <linearGradient id="${u}m" x1="0" y1="0" x2=".3" y2="1">${metal}</linearGradient>
      <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="${R.gem}"/><stop offset="1" stop-color="${R.c3}"/></linearGradient>
      <radialGradient id="${u}h"><stop offset="0" stop-color="${R.gem}" stop-opacity=".7"/><stop offset="1" stop-color="${R.gem}" stop-opacity="0"/></radialGradient></defs>
    ${i >= 4 ? `<circle cx="50" cy="50" r="49" fill="url(#${u}h)" class="ar-glow"/>` : ''}
    ${i >= 7 ? `<g class="ar-halo" fill="none" stroke="${R.c2}" stroke-width="1.4"><circle cx="50" cy="50" r="45" stroke-dasharray="3 5"/>${Array.from({ length: 8 }, (_, k) => { const t = k / 8 * 6.283, x = 50 + Math.cos(t) * 45, y = 50 + Math.sin(t) * 45; return `<path d="M${x} ${y - 3.4}L${x + 1} ${y - 1}L${x + 3.4} ${y}L${x + 1} ${y + 1}L${x} ${y + 3.4}L${x - 1} ${y + 1}L${x - 3.4} ${y}L${x - 1} ${y - 1}Z" fill="#fff" stroke="none"/>`; }).join('')}</g>` : ''}
    ${i >= 5 ? `<g class="ar-wings">${wing}<g transform="translate(100 0) scale(-1 1)">${wing}</g></g>` : ''}
    ${i >= 3 ? `<g fill="url(#${u}m)" stroke="${R.c3}" stroke-width=".8">${leaf}<g transform="translate(100 0) scale(-1 1)">${leaf}</g></g>` : ''}
    <path d="M50 8L82 20L80 56Q76 78 50 92Q24 78 20 56L18 20Z" fill="url(#${u}m)" stroke="${R.c3}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 15L75 24.5L73.4 55Q70 72 50 84Q30 72 26.6 55L25 24.5Z" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>
    ${i >= 1 ? `<path d="M30 30L50 22L70 30" fill="none" stroke="${R.c3}" stroke-width="1.6" opacity=".55"/>` : ''}
    ${i >= 2 ? `<path d="M34 70L50 78L66 70" fill="none" stroke="${R.c3}" stroke-width="1.6" opacity=".55"/>` : ''}
    <g transform="translate(50 50) scale(${gemS}) translate(-50 -50)"><path d="M50 30L66 48L50 70L34 48Z" fill="url(#${u}g)" stroke="${R.c3}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M34 48H66M50 30L44 48L50 70L56 48Z" fill="none" stroke="rgba(255,255,255,.6)" stroke-width=".9"/></g>
    ${i >= 6 ? `<path d="M33 17L37 4L43.5 11L50 0.5L56.5 11L63 4L67 17Z" fill="url(#${u}m)" stroke="${R.c3}" stroke-width="1.3" stroke-linejoin="round"/><circle cx="50" cy="9" r="2.2" fill="#fff"/>` : ''}
    <path d="M30 22L50 14.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".7"/></svg>`;
}
/* an emblem with its division numeral */
const arBadge = (vp, cls = '') => { const R = arRankOf(vp); return `<span class="ar-badge ${cls}" title="${esc(R.label)} · ${fmt(vp)} VP" style="--rk:${R.r.c2}">${arEmblem(R.r.id)}<i class="ar-dv">${R.dn}</i></span>`; };
const arAva = id => { const e = id && findEntry(id); return e ? baseThumb(e) : `<span class="ar-noav">${icon('user')}</span>`; };
const arAgo = t => { const s = Math.max(0, Date.now() - t) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };

/* ---- the Arena Shop: items picked every day (the same for everyone), each with a daily limit, paid with arena tokens ---- */
const AR_SHOP_N = 8, AR_SHOP_REF = 30;
const AR_SHOP_POOL = [
  { id: 'as-tk', got: { tickets: 1 }, price: 100, lim: 2, w: 1 },
  { id: 'as-wi', got: { wishes: 1 }, price: 80, lim: 2, w: 1.2 },
  { id: 'as-bo', got: { bottles: 1 }, price: 20, lim: 3, w: 1.4 },
  { id: 'as-co', got: { coins: 10000 }, price: 15, lim: 3, w: 1.4 },
  { id: 'as-pe', got: { pearls: 5 }, price: 60, lim: 1, w: .7 },
  { id: 'as-st', got: { starlight: 10 }, price: 40, lim: 2, w: .8 },
  { id: 'as-cs', got: { cfssr: 3 }, price: 30, lim: 2, w: 1 },
  { id: 'as-cu', got: { cfur: 1 }, price: 50, lim: 2, w: .8 },
  { id: 'as-fs', got: { fragssr: 3 }, price: 25, lim: 2, w: 1 },
  { id: 'as-fu', got: { fragur: 1 }, price: 40, lim: 1, w: .7 },
  { id: 'as-gp', got: { gplush: 1 }, price: 25, lim: 2, w: .9 },
  { id: 'as-ex', got: { exp: 500 }, price: 20, lim: 2, w: .9 },
  { id: 'as-nt', got: { nametk: 1 }, price: 120, lim: 1, w: .25 },
  { id: 'as-eg', got: { eggur: 1 }, price: 350, lim: 1, w: .2 },
  { id: 'as-mt', got: { memtk: 1 }, price: 900, lim: 1, w: .15 }
];
const AR_ITEM_NM = { tickets: 'Limited ticket', wishes: 'Standard ticket', bottles: 'Stamina bottle', coins: 'Gold', pearls: 'Pearls', starlight: 'Corals', cfssr: 'SSR character fragments', cfur: 'UR character fragment',
  fragssr: 'SSR egg fragments', fragur: 'UR egg fragment', gplush: 'Star Plushie', exp: 'EXP', nametk: 'Name change ticket', eggur: 'UR egg', memtk: 'UR memory ticket' };
function arShopState() { const a = arState(); if (!a.shop || a.shop.key !== dayKey()) a.shop = { key: dayKey(), got: {}, ref: 0 }; return a.shop; }
function arShopToday() {
  const sh = arShopState(), r = seeded('arshop:' + dayKey() + (sh.ref ? ':' + sh.ref : '')), pool = [...AR_SHOP_POOL], out = [];
  while (out.length < AR_SHOP_N && pool.length) { const tot = pool.reduce((t, x) => t + x.w, 0); let v = r() * tot, i = 0; while ((v -= pool[i].w) > 0) i++; out.push(pool.splice(i, 1)[0]); }
  return out;
}
const arShopLeft = it => it.lim - (arShopState().got[it.id] || 0);
const arShopRerender = () => { if (arEl) renderArena(); if (typeof shopEl !== 'undefined' && shopEl) renderShop(); };
function arBuy(id) {
  const it = arShopToday().find(x => x.id === id); if (!it || arShopLeft(it) <= 0) return;
  if ((S.wallet.atok || 0) < it.price) { toast(`That costs ${it.price} arena tokens. You have ${fmt(S.wallet.atok || 0)}.`); return; }
  S.wallet.atok -= it.price; const sh = arShopState(); sh.got[id] = (sh.got[id] || 0) + 1; guildGrant(it.got);
  persist(); renderMenu(); refreshSummon(); arShopRerender(); showRewards('Arena Shop', it.got, `−${it.price} arena tokens`);
}
function arShopRefresh() {
  if ((S.wallet.atok || 0) < AR_SHOP_REF) { toast(`A refresh costs ${AR_SHOP_REF} arena tokens. You have ${fmt(S.wallet.atok || 0)}.`); return; }
  S.wallet.atok -= AR_SHOP_REF; const sh = arShopState(); sh.ref = (sh.ref || 0) + 1; sh.got = {};
  persist(); renderMenu(); arShopRerender(); toast(`New items (−${AR_SHOP_REF} arena tokens)`);
}
function arShopHTML() {
  const items = arShopToday(), T = S.wallet.atok || 0;
  return `<div class="ars-head"><span class="ars-bal">${curIcon('atok')}<b>${fmt(T)}</b><small>arena tokens</small></span><span class="ars-t">${icon('clock')}New items in ${gLeftTxt()}</span>
      <button class="rdx-sec ars-ref" data-arsref>${icon('refresh')}Refresh · ${curIcon('atok')}${AR_SHOP_REF}</button></div>
    <div class="ars-grid">${items.map((it, i) => { const [k, n] = Object.entries(it.got)[0], left = arShopLeft(it), can = left > 0 && T >= it.price;
      return `<div class="ars-it r${REW_R[k] || 4} ${left > 0 ? '' : 'out'}" style="--i:${i}"><span class="ars-pic">${curIcon(k)}<em>×${fmt(n)}</em></span><b>${esc(AR_ITEM_NM[k] || (REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1])}</b><small>${left > 0 ? `${left} / ${it.lim} left today` : 'Sold out today'}</small>
        <button class="ars-buy ${can ? 'ok' : ''}" data-arbuy="${it.id}" ${left > 0 ? '' : 'disabled'}>${left > 0 ? `${curIcon('atok')}${fmt(it.price)}` : 'Sold out'}</button></div>`; }).join('')}</div>
    <p class="tiny ars-note">Earn arena tokens from every Arena battle (win ${AR_TOK.win}, draw ${AR_TOK.draw}, loss ${AR_TOK.lose}), every defense your deck holds (${AR_DEF_TOK}) and the weekly rewards. The items change every day at midnight.</p>`;
}
const arShopBind = (root) => { root.querySelectorAll('[data-arbuy]').forEach(b => b.onclick = () => arBuy(b.dataset.arbuy)); root.querySelectorAll('[data-arsref]').forEach(b => b.onclick = arShopRefresh); };
/* the main Shop gets an Arena Shop tab too */
if (!SHOP_TABS.some(t => t[0] === 'arena')) SHOP_TABS.push(['arena', 'arena', 'Arena Shop']);

/* ---- the Arena page (.arx on the Raids page layout .rdx) ---- */
const AR_TABS = [['battle', 'swords', 'Battle'], ['defense', 'shield', 'Defense'], ['rank', 'trophy', 'Ranking'], ['rewards', 'gift', 'Rewards'], ['shop', 'shop', 'Arena Shop'], ['log', 'scroll', 'Battle log']];
function openArena(tab) {
  closeModal(); arState(); arSimDefense(); arSettle();
  if (tab) arTab = tab;
  if (!arEl) { arEl = document.createElement('div'); arEl.className = 'arx rdx'; arEl.setAttribute('role', 'dialog'); arEl.setAttribute('aria-label', 'Arena'); document.body.appendChild(arEl); }
  renderArena();
  const un = arUnseen(); if (un.length) setTimeout(() => arAwayPop(un), 350);
}
function closeArena(home = true) { if (arEl) { arEl.remove(); arEl = null; } renderMenu(); if (home) bthHome(); }
addEventListener('keydown', e => { if (arEl && e.key === 'Escape' && !document.querySelector('.modal-back') && !document.querySelector('.rewpop')) closeArena(); });
/* while you were away: what happened to your defense */
function arAwayPop(list) {
  if (!arEl || ccM) return;
  const a = arState(); a.seenT = Date.now(); persist(); renderMenu();
  const held = list.filter(e => e.res === 'win').length, vp = list.reduce((t, e) => t + e.d, 0), tok = list.reduce((t, e) => t + e.tok, 0);
  openModal({ title: 'While you were away', ic: 'shield', kind: 'araway', body: `<div class="ara"><p class="ara-sum"><b>${list.length}</b> attack${list.length === 1 ? '' : 's'} on your defense · <b>${held}</b> held · <b class="${vp < 0 ? 'neg' : 'pos'}">${vp >= 0 ? '+' : '−'}${Math.abs(vp)} VP</b>${tok ? ` · ${curIcon('atok')}<b>+${tok}</b>` : ''}</p>
    <div class="ara-list">${list.slice(0, 8).map(e => `<div class="arl-row ${e.res}"><span class="arl-av">${arAva(e.lead)}</span><span class="arl-t"><b>${esc(e.name)}</b><small>${arBadge(e.ov, 'sm')}${fmt(e.ov)} VP · ${arAgo(e.t)}</small></span><span class="arl-res">${e.res === 'win' ? 'Held' : 'Fell'}</span><span class="arl-d ${e.d < 0 ? 'neg' : ''}">${e.d >= 0 ? '+' : '−'}${Math.abs(e.d)} VP</span></div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn gold" data-close2>OK</button></div></div>`,
    onMount: b => { b.querySelector('[data-close2]').onclick = closeModal; } });
}
function renderArena() {
  if (!arEl) return;
  const a = arState(), joined = arJoined(), R = arRankOf(a.vp), left = arLeft(), bg = MEDIA.get('arena:bg');
  if (!joined && arTab !== 'rewards' && arTab !== 'rank') arTab = 'battle';
  const keep = arEl.querySelector('.rdx-scroll'), top = keep ? keep.scrollTop : 0;
  const pips = `<span class="hgx-pips">${Array.from({ length: AR_TICKETS }, (_, i) => `<i class="${i < left ? 'on' : ''}"></i>`).join('')}</span>`;
  const tabBtn = ([id, ic, nm]) => { const dis = !joined && !['battle', 'rank', 'rewards'].includes(id), dot = id === 'log' && arUnseen().length;
    return `<button class="rdx-it arx-tab ${id === arTab ? 'on' : ''}" data-art="${id}" ${dis ? 'disabled' : ''}><span class="rdx-iti">${icon(ic)}</span><span class="rdx-itt"><b>${nm}</b><small>${arTabSub(id)}</small></span>${dot ? '<i class="cmp-dot"></i>' : ''}</button>`; };
  arEl.style.setProperty('--rk', R.r.c2);
  arEl.innerHTML = `<div class="rdx-bg arx-bg ${bg ? 'art' : ''}">${bg ? artImg('arena:bg') : `<div class="arx-scene">${typeof bthArt === 'function' ? bthArt('arena', true) : ''}</div>`}<i class="hgx-glow g1 arx-g1"></i><i class="hgx-glow g2 arx-g2"></i><i class="hgx-glow g3 arx-g3"></i></div><div class="rdx-shade arx-shade"></div>
    <header class="rdx-head"><div class="inv-title"><span class="inv-badge">${icon('arena')}</span><h2 class="ts">Arena</h2></div>${infoBtn('arena', 'How the Arena works')}
      ${canAdmin() ? `<button class="rdx-sec arx-adm" id="arAdm" title="Admin: Arena wallpaper and rank icons">${icon('image')}<span>Wallpaper</span></button>` : ''}<span class="rdx-sp"></span>
      ${joined ? `<span class="rdx-ward arx-tk" title="Battles left in this 12-hour window">${icon('swords')}Battles <b>${left} / ${AR_TICKETS}</b>${pips}<em>${icon('clock')}${arResetTxt()}</em></span>` : ''}
      <div class="cur" data-k="atok" title="Arena tokens">${curIcon('atok')}<b>${fmt(S.wallet.atok || 0)}</b></div>
      <div class="cur arx-pearl" data-k="pearls">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b></div>
      <button class="inv-x" id="arClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="rdx-rail">
      ${joined ? `<div class="arx-me" style="--rk:${R.r.c2}"><span class="arx-meem">${arEmblem(R.r.id)}<i class="ar-dv">${R.dn}</i></span><span class="arx-met"><small>Your rank</small><b>${esc(R.label)}</b><em>${fmt(a.vp)} VP</em></span>
        <span class="arx-mebar"><i style="width:${R.pct}%"></i></span><span class="arx-menx">${R.next == null ? 'Top division reached' : `${fmt(R.next - a.vp)} VP to ${esc(arRankOf(R.next).label)}`}</span></div>` : ''}
      <span class="rdx-gh">${icon('arena')}Arena</span>${AR_TABS.map(tabBtn).join('')}</aside>
    <section class="rdx-main"><div class="rdx-scroll">${joined ? arTabHTML() : arJoinHTML()}</div>${(joined && arTab === 'battle') || !joined ? arBarHTML() : ''}</section>`;
  const sc = arEl.querySelector('.rdx-scroll'); if (sc && top) sc.scrollTop = top;
  const rl = arEl.querySelector('.rdx-rail'), on = rl && rl.querySelector('.rdx-it.on'); if (on && rl.scrollWidth > rl.clientWidth + 2) rl.scrollLeft = Math.max(0, on.offsetLeft - (rl.clientWidth - on.offsetWidth) / 2);
  arBind();
}
function arTabSub(id) {
  const a = arState();
  if (id === 'battle') return arJoined() ? `${arLeft()} of ${AR_TICKETS} battles left` : 'Join the Arena';
  if (id === 'defense') return a.def ? esc(a.def.name) : 'Set a defense deck';
  if (id === 'rank') return arJoined() ? `#${arBoard().findIndex(p => p.me) + 1} on the board` : 'The top players';
  if (id === 'rewards') return 'Weekly pearls + tokens';
  if (id === 'shop') return `${fmt(S.wallet.atok || 0)} arena tokens`;
  const un = arUnseen().length; return un ? `${un} new defense${un === 1 ? '' : 's'}` : `${a.log.length} battle${a.log.length === 1 ? '' : 's'}`;
}
/* not joined yet: pick the deck that will defend you */
function arJoinHTML() {
  if (arTab === 'rank') return arRankHTML();
  if (arTab === 'rewards') return arRewardsHTML();
  const ok = ccAllDecks().filter(d => ccValidateDeck(d.cards).ok);
  if (!arPick || !ok.some(d => d.id === arPick)) arPick = (ok.find(d => d.id === ccSave().sel) || ok[0] || {}).id || null;
  return `<div class="rdx-hero"><span class="rdx-kind">${icon('arena')}Card Battle · Versus players</span>
      <h1 class="rdx-title arx-title">Arena</h1>
      <p class="rdx-desc">Battle other players' defense decks and climb from Bronze to Celestial. To join, choose a <b>defense deck</b>: it defends you while you're away, played for you when other players attack.</p>
      <div class="rdx-meta"><span>${icon('swords')}${AR_TICKETS} battles every 12 hours</span><span>${icon('trophy')}Victory Points by rank</span><span>${curIcon('pearls')}Weekly pearls</span><span>${curIcon('atok')}Arena tokens</span></div></div>
    <div class="rdx-panel"><div class="rdx-ph"><b>Choose your defense deck</b><small>You can change it any time in the Defense tab</small></div>
      ${ok.length ? `<div class="arx-dks">${ok.map(d => { const le = ccLeaderOf(d.id); return `<button class="arx-dk ${d.id === arPick ? 'on' : ''}" data-arpick="${d.id}"><span class="arx-dkav">${le ? baseThumb(le) : icon('cards')}</span><span class="arx-dkt"><b>${esc(d.name)}</b><small>${le ? `${icon('crown')}${esc(le.name)}` : 'No leader'} · ${d.preset ? 'Starter deck' : 'Your deck'}</small></span>${arMixHTML(d.cards)}</button>`; }).join('')}</div>`
        : `<p class="tiny">You need a ready 30-card deck first. <button class="btn gold sm" id="arBuild">${icon('cards')}Build a deck</button></p>`}</div>
    ${arRankStripHTML()}`;
}
/* a deck's make-up: a bar of its playstyles and its type counts */
function arMixHTML(cards) {
  const st = {}, ty = { unit: 0, spell: 0, trap: 0, equipment: 0 }; cards.forEach(id => { const d = ccDef(id); if (!d) return; st[d.style] = (st[d.style] || 0) + 1; ty[d.type]++; });
  return `<span class="arx-mix"><span class="arx-sbar">${Object.entries(st).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<i style="flex:${n};background:${CC_STYLES[k][1]}" title="${CC_STYLES[k][0]} ×${n}"></i>`).join('')}</span><small>${ty.unit} units · ${ty.spell} spells · ${ty.trap} traps · ${ty.equipment} gear</small></span>`;
}
const arRankStripHTML = () => `<div class="rdx-panel"><div class="rdx-ph"><b>Ranks</b><small>Bronze to Celestial by Victory Points</small></div><div class="arx-strip">${AR_RANKS.map(r => `<span class="arx-sr" style="--rk:${r.c2}">${arEmblem(r.id)}<b>${r.name}</b><small>${fmt(r.min)}+ VP</small></span>`).join('')}</div></div>`;
function arTabHTML() {
  if (arTab === 'defense') return arDefHTML();
  if (arTab === 'rank') return arRankHTML();
  if (arTab === 'rewards') return arRewardsHTML();
  if (arTab === 'shop') return `<div class="rdx-panel arx-shop"><div class="rdx-ph"><b>Arena Shop</b><small>Spend arena tokens · limits reset at midnight</small></div>${arShopHTML()}</div>`;
  if (arTab === 'log') return arLogHTML();
  return arBattleHTML();
}
function arBattleHTML() {
  const a = arState(), R = arRankOf(a.vp), row = arVpRow(a.vp), foes = arFoes(), rc = arRefCost();
  if (!arSel || !foes.some(f => f.id === arSel && !a.beat.includes(f.id))) { const f = foes.find(x => !a.beat.includes(x.id)); arSel = f ? f.id : null; }
  const foe = (f, i) => { const beat = a.beat.includes(f.id), le = f.lead && findEntry(f.lead), art = le && baseArt(le), FR = arRankOf(f.vp);
    return `<button class="arx-foe ${f.id === arSel ? 'on' : ''} ${beat ? 'beat' : ''}" data-arfoe="${f.id}" style="--rk:${FR.r.c2};--i:${i}" ${beat ? 'disabled' : ''}>
      ${art ? `<span class="arx-fart"><img src="${art}" alt=""></span>` : ''}<span class="arx-fsh"></span>
      <span class="arx-ftag">${['Easier', 'Even', 'Tougher'][i]}</span>
      <span class="arx-fhead"><span class="arx-fav">${arAva(f.lead)}</span><span class="arx-fnm"><b>${esc(f.name)}</b><small>Lv ${f.lv} · Power ${fmt(f.power)}</small></span></span>
      <span class="arx-frk">${arBadge(f.vp)}<span><b>${esc(FR.label)}</b><small>${fmt(f.vp)} VP</small></span></span>
      <span class="arx-fdk">${icon('cards')}<span><small>Defense deck</small><b>${esc(f.deckName)}</b></span><em>${icon('heart')}${f.hp} HP</em></span>
      <span class="arx-fvp"><span class="w">Win <b>+${row[0]} VP</b></span><span class="l">Loss <b>${row[1] ? '−' + Math.abs(row[1]) : '0'} VP</b></span></span>
      ${beat ? `<span class="arx-beat">${icon('check')}Defeated</span>` : ''}</button>`; };
  return `<div class="rdx-hero arx-hero"><span class="arx-hem" style="--rk:${R.r.c2}">${arEmblem(R.r.id)}<i class="ar-dv">${R.dn}</i></span>
      <div class="arx-het"><span class="rdx-kind">${icon('arena')}Arena · Card Battle</span><h1 class="rdx-title arx-title">${esc(R.label)}</h1>
        <div class="arx-hvp"><b>${fmt(a.vp)}</b><small>VP</small><span class="arx-hbar"><i style="width:${R.pct}%"></i></span><em>${R.next == null ? 'Top division' : `${fmt(R.next - a.vp)} VP to ${esc(arRankOf(R.next).label)}`}</em></div>
        <div class="rdx-meta"><span>${icon('trophy')}W ${a.st.w} · L ${a.st.l} · D ${a.st.d}</span><span>${icon('shield')}Defense ${a.st.dw} held · ${a.st.dl} fell</span><span>${icon('star')}Best ${fmt(a.best)} VP</span></div></div></div>
    <div class="rdx-panel"><div class="rdx-ph"><b>Opponents</b><small>Pick a defense deck to attack · win ${curIcon('atok')}${AR_TOK.win}, draw ${AR_TOK.draw}, loss ${AR_TOK.lose}</small><button class="rdx-sec" id="arRef">${icon('refresh')}New opponents${rc ? ` · ${curIcon('atok')}${rc}` : ' · free'}</button></div>
      <div class="arx-foes">${foes.map(foe).join('')}</div></div>`;
}
function arBarHTML() {
  const joined = arJoined(), sv = ccSave(), dk = ccCampMyDeck(), valid = ccValidateDeck(dk.cards).ok, le = ccLeaderOf(dk.id), left = arLeft();
  if (!joined) { const d = arPick && ccDeck(arPick), dl = d && ccLeaderOf(d.id);
    return `<div class="rdx-bar arx-bar"><div class="rdx-vs"><div class="rdx-side me"><span class="rdx-si qmx-av">${dl ? baseThumb(dl) : icon('shield')}</span><span class="rdx-st"><small>Defense deck</small><b>${d ? esc(d.name) : 'No ready deck'}</b><em>${dl ? `${icon('crown')}${esc(dl.name)}` : 'Build a 30-card deck'}</em></span></div></div>
      <div class="rdx-inst"><span class="rdx-il">${icon('gift')}Weekly · up to <b>${AR_WEEK.celestial[0]} pearls</b></span></div>
      <button class="rdx-go" id="arJoin" ${d ? '' : 'disabled'}><span class="rdx-goi">${icon('arena')}</span><span class="rdx-got"><b>Join the Arena</b><small>Starts at Bronze V</small></span></button></div>`; }
  const f = arSel && arFoes().find(x => x.id === arSel), FR = f && arRankOf(f.vp);
  return `<div class="rdx-bar arx-bar"><div class="rdx-vs">
      <button class="rdx-side me" id="arDeck" title="Change the deck you attack with"><span class="rdx-si qmx-av">${le ? baseThumb(le) : icon('cards')}</span><span class="rdx-st"><small>Attack deck</small><b>${valid ? esc(dk.name) : 'No ready deck'}</b><em>${valid ? `${le ? `${icon('crown')}${esc(le.name)} · ` : ''}Change` : 'Build a 30-card deck'}</em></span></button>
      <span class="rdx-vsx">VS</span>
      <div class="rdx-side op"><span class="rdx-si qmx-av">${f ? arAva(f.lead) : icon('user')}</span><span class="rdx-st"><small>Opponent</small><b>${f ? esc(f.name) : 'Pick an opponent'}</b><em>${f ? `${esc(FR.label)} · ${esc(f.deckName)}` : 'or refresh the list'}</em></span></div></div>
    <div class="rdx-inst"><span class="rdx-il">${icon('clock')}${AR_TICKETS} new battles in <b>${arResetTxt()}</b></span></div>
    <button class="rdx-go" id="arGo" ${f && valid && left ? '' : 'disabled'}><span class="rdx-goi">${icon('swords')}</span><span class="rdx-got"><b>Battle!</b><small>${left ? `1 of ${left} battle${left === 1 ? '' : 's'} left` : 'No battles left'}</small></span></button></div>`;
}
function arDefHTML() {
  const a = arState(), D = a.def, le = D.lead && findEntry(D.lead), ok = ccAllDecks().filter(d => ccValidateDeck(d.cards).ok), ch = arDefChanged(), defs = a.log.filter(e => e.k === 'def').slice(0, 6);
  return `<div class="rdx-hero"><span class="rdx-kind">${icon('shield')}Arena · Defense</span><h1 class="rdx-title arx-title">Your defense</h1>
      <p class="rdx-desc">Other players attack this deck while you're away; it is played for you. A held defense gives VP and ${curIcon('atok')}${AR_DEF_TOK}, a fallen one loses VP. Changing the deck later doesn't change your defense until you set it again.</p></div>
    <div class="rdx-panel arx-def"><div class="rdx-ph"><b>Defense deck</b><small>Set ${arAgo(D.at)}</small>${ch ? `<button class="rdx-sec" data-ardef="${D.src}">${icon('refresh')}Update: the deck changed</button>` : ''}</div>
      <div class="arx-defrow"><div class="arx-defcard">${le ? ccLeaderCard(le) : `<span class="ar-noav big">${icon('user')}</span>`}</div>
        <div class="arx-defi"><b class="arx-defn">${esc(D.name)}</b><small>${le ? `${icon('crown')}Leader ${esc(le.name)}` : 'No leader'}</small>${arMixHTML(D.cards)}
          <div class="arx-defst"><span><b>${a.st.dw}</b><small>Held</small></span><span><b>${a.st.dl}</b><small>Fell</small></span><span><b>${a.st.dw + a.st.dl ? Math.round(a.st.dw / (a.st.dw + a.st.dl) * 100) : 0}%</b><small>Held rate</small></span></div>
          <div class="arx-cards">${[...new Set(D.cards)].map(id => { const n = D.cards.filter(x => x === id).length, d = ccDef(id); return `<span class="arx-cc st-${d.style}" style="--cs:${CC_STYLES[d.style][1]}" title="${esc(d.name)} · ${esc(d.text)}">${ccIco(id)}<b>${esc(d.name)}</b>${n > 1 ? `<em>×${n}</em>` : ''}</span>`; }).join('')}</div></div></div></div>
    <div class="rdx-panel"><div class="rdx-ph"><b>Change your defense</b><small>Pick one of your ready decks</small></div>
      <div class="arx-dks">${ok.map(d => { const l = ccLeaderOf(d.id), cur = d.id === D.src; return `<div class="arx-dk ${cur ? 'on' : ''}"><span class="arx-dkav">${l ? baseThumb(l) : icon('cards')}</span><span class="arx-dkt"><b>${esc(d.name)}</b><small>${l ? `${icon('crown')}${esc(l.name)}` : 'No leader'}</small></span>${arMixHTML(d.cards)}<button class="btn ${cur && !ch ? 'ghost' : 'gold'} sm" data-ardef="${d.id}" ${cur && !ch ? 'disabled' : ''}>${cur && !ch ? 'Defending' : 'Use'}</button></div>`; }).join('')}</div></div>
    <div class="rdx-panel"><div class="rdx-ph"><b>Recent defenses</b><small>The last attacks on your deck</small></div>${defs.length ? `<div class="arl">${defs.map(arLogRow).join('')}</div>` : '<p class="tiny">No attacks yet. Other players find your deck over the next hours.</p>'}</div>`;
}
const arLogRow = e => `<div class="arl-row ${e.res} ${e.k}"><span class="arl-k" title="${e.k === 'atk' ? 'You attacked' : 'You were attacked'}">${icon(e.k === 'atk' ? 'swords' : 'shield')}</span><span class="arl-av">${arAva(e.lead)}</span>
  <span class="arl-t"><b>${e.k === 'atk' ? `You attacked ${esc(e.name)}` : `${esc(e.name)} attacked you`}</b><small>${arBadge(e.ov, 'sm')}${esc(arRankOf(e.ov).label)} · ${fmt(e.ov)} VP · ${arAgo(e.t)}</small></span>
  <span class="arl-res">${e.k === 'atk' ? (e.res === 'win' ? 'Victory' : e.res === 'lose' ? 'Defeat' : 'Draw') : (e.res === 'win' ? 'Held' : 'Fell')}</span>
  <span class="arl-d ${e.d < 0 ? 'neg' : ''}">${e.d > 0 ? '+' : e.d < 0 ? '−' : '±'}${Math.abs(e.d)} VP</span><span class="arl-tok">${e.tok ? `${curIcon('atok')}+${e.tok}` : ''}</span></div>`;
function arLogHTML() {
  const a = arState(), seen = a.seenT || 0, L = a.log;
  const html = `<div class="rdx-panel"><div class="rdx-ph"><b>Battle log</b><small>Your attacks and the attacks on your defense · the last ${L.length}</small></div>${L.length ? `<div class="arl">${L.map(e => arLogRow(e).replace('class="arl-row', `class="arl-row ${e.k === 'def' && e.t > seen ? 'new' : ''}`)).join('')}</div>` : '<p class="tiny">No battles yet.</p>'}</div>`;
  if (arUnseen().length) { a.seenT = Date.now(); persist(); setTimeout(renderMenu, 0); }
  return html;
}
function arRankHTML() {
  const L = arBoard(), me = L.findIndex(p => p.me), row = (p, i) => `<div class="arr-row ${p.me ? 'me' : ''} ${i < 3 ? 'top top' + (i + 1) : ''}"><span class="arr-n">${i < 3 ? `<i class="arr-medal">${i + 1}</i>` : i + 1}</span><span class="arr-av">${p.me ? avatarHTML(40) : p.lead ? baseThumb(p.lead) : icon('user')}</span>
    <span class="arr-nm"><b>${esc(p.name)}${p.me ? ' <em>You</em>' : ''}</b><small>Lv ${p.lv}${p.lead ? ` · ${icon('crown')}${esc(p.lead.name)}` : ''}</small></span>${arBadge(p.vp)}<span class="arr-rk"><b>${esc(arRankOf(p.vp).label)}</b><small>${fmt(p.vp)} VP</small></span></div>`;
  const top = L.slice(0, 30);
  return `<div class="rdx-panel arx-rank"><div class="rdx-ph"><b>Arena ranking</b><small>By Victory Points · practice players until the arena server is connected</small></div>
    <div class="arr">${top.map(row).join('')}</div>${me >= 30 ? `<div class="arr arr-pin">${row(L[me], me)}</div>` : !arJoined() ? '<p class="tiny">Join the Arena to appear here.</p>' : ''}</div>`;
}
function arRewardsHTML() {
  const cur = arJoined() ? arRankOf(arState().vp).r.id : null;
  return `<div class="rdx-hero"><span class="rdx-kind">${icon('gift')}Arena · Rewards</span><h1 class="rdx-title arx-title">Weekly rewards</h1>
      <p class="rdx-desc">Every Monday at 00:00 your rank is rewarded by mail. Every battle gives arena tokens too: win ${curIcon('atok')}${AR_TOK.win}, draw ${AR_TOK.draw}, loss ${AR_TOK.lose}; every defense your deck holds gives ${AR_DEF_TOK}.</p>
      <div class="rdx-meta"><span>${icon('clock')}Next rewards in ${arWeekTxt()}</span>${cur ? `<span>${icon('trophy')}You: ${esc(arRankOf(arState().vp).label)}</span>` : ''}</div></div>
    <div class="rdx-panel arx-rew"><div class="rdx-ph"><b>Ranks and rewards</b><small>Victory Points won and lost by rank (attack and defense)</small></div>
      <div class="arw-tbl"><div class="arw-th"><span>Rank</span><span>Divisions</span><span>Attack win / loss</span><span>Defense win / loss</span><span>Weekly</span></div>
      ${AR_RANKS.map(r => { const v = AR_VP[r.id], [p, t] = AR_WEEK[r.id], divs = Array.from({ length: r.divs }, (_, k) => `${AR_ROMAN[r.divs - 1 - k]} ${fmt(r.min + k * r.step)}`).join(' · ');
        const vp = x => x > 0 ? `+${x}` : x < 0 ? '−' + Math.abs(x) : '0', att = r.id === 'mythic' ? `${vp(v[0])} / ${vp(AR_VP.mythic5[1])} (V), ${vp(v[1])} (IV–I)` : `${vp(v[0])} / ${vp(v[1])}`, def = r.id === 'mythic' ? `${vp(v[2])} / ${vp(AR_VP.mythic5[3])} (V), ${vp(v[3])} (IV–I)` : `${vp(v[2])} / ${vp(v[3])}`;
        return `<div class="arw-tr ${r.id === cur ? 'on' : ''}" style="--rk:${r.c2}"><span class="arw-rk">${arEmblem(r.id)}<span><b>${r.name}</b><small>${fmt(r.min)}+ VP</small></span>${r.id === cur ? '<em>You</em>' : ''}</span><span class="arw-dv" data-l="Divisions">${divs}</span><span data-l="Attack win / loss">${att}</span><span data-l="Defense win / loss">${def}</span>
          <span class="arw-wk"><span>${curIcon('pearls')}${p}</span><span>${curIcon('atok')}${t}</span></span></div>`; }).join('')}</div></div>`;
}
function arBind() {
  const $a = s => arEl.querySelector(s);
  $a('#arClose').onclick = () => closeArena();
  const ad = $a('#arAdm'); if (ad) ad.onclick = () => openAdmin('battle');
  arEl.querySelectorAll('[data-art]').forEach(b => b.onclick = () => { if (b.disabled) return; arTab = b.dataset.art; renderArena(); });
  arEl.querySelectorAll('[data-arpick]').forEach(b => b.onclick = () => { arPick = b.dataset.arpick; renderArena(); });
  arEl.querySelectorAll('[data-arfoe]').forEach(b => b.onclick = () => { arSel = b.dataset.arfoe; renderArena(); });
  arEl.querySelectorAll('[data-ardef]').forEach(b => b.onclick = () => { if (arSetDefense(b.dataset.ardef)) renderArena(); });
  const j = $a('#arJoin'); if (j) j.onclick = () => { if (arPick && arSetDefense(arPick)) { arTab = 'battle'; renderArena(); } };
  const bd = $a('#arBuild'); if (bd) bd.onclick = () => { closeArena(false); openDeck(); };
  const rf = $a('#arRef'); if (rf) rf.onclick = arRefresh;
  const dk = $a('#arDeck'); if (dk) dk.onclick = () => { if (ccAllDecks().some(x => ccValidateDeck(x.cards).ok)) ccDeckPicker(renderArena); else { closeArena(false); openDeck(); } };
  const go = $a('#arGo'); if (go) go.onclick = () => arBattle(arSel);
  arShopBind(arEl);
}
setInterval(() => { if (!arEl) return; const t = arEl.querySelector('.arx-tk em'); if (t) t.innerHTML = `${icon('clock')}${arResetTxt()}`; if (arEl && arState().win !== (arEl.dataset.win || arState().win)) renderArena(); arEl.dataset.win = arState().win; }, 30000);

INFO.arena = () => ({ title: 'Arena', body: `<p class="desc">Battle other players' defense decks in Card Battle and climb the ranks.</p>
  <ul class="info-list"><li>To join, choose a <b>defense deck</b>. It defends you while you're away: when other players attack you, it is played for you. A held defense gives VP and ${AR_DEF_TOK} arena tokens; a fallen one loses VP.</li>
  <li>You get <b>${AR_TICKETS} battles every 12 hours</b> (at 00:00 and 12:00); unused battles don't carry over. A battle is used when it starts, and leaving it counts as a loss.</li>
  <li>Pick one of 3 opponents (a little below you, level with you, a little above) and play your attack deck against their defense deck. Tougher ranks defend with more HP and smarter play.</li>
  <li><b>Victory Points</b> decide your rank: Bronze, Silver, Gold, Platinum and Diamond (1,000 VP each, divisions V to I every 200 VP), then Mythic (5,000), Ascendant (5,250) and Celestial (5,500), with a division every 50 VP. How many VP you win or lose depends on your rank (see Rewards). VP never go below 0.</li>
  <li><b>Arena tokens</b>: win ${AR_TOK.win}, draw ${AR_TOK.draw}, loss ${AR_TOK.lose}, ${AR_DEF_TOK} per held defense, plus the weekly rewards. Spend them in the <b>Arena Shop</b> (new items every day, also in the Shop).</li>
  <li>Every <b>Monday at 00:00</b> your rank earns <b>pearls and arena tokens</b> by mail.</li></ul>
  <p class="tiny">The arena server isn't connected yet, so the opponents, the attackers and the ranking are practice players.</p>` });

/* ---- admin: Battle screen → Arena (wallpaper + rank icons), test tools ---- */
function arAdminHTML() {
  const u = MEDIA.get('arena:bg');
  return `<div><h3>Arena</h3><p class="tiny">The Arena page's wallpaper (1920×1080 best; without one the drawn arena, blurred) and an icon per rank (square PNG; without one the drawn crest). The Arena's Battle card uses the Arena wallpaper above.</p></div>
    <div class="setx-list ad-art">${setRow('Arena wallpaper', `<span class="set-wp">${u ? `<img src="${u}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="arBgUp"></label>${u ? '<button type="button" class="sx-btn" id="arBgDel">Default</button>' : ''}${artFrameBtn('arena:bg', 'screen', 'Arena wallpaper')}`, 'Behind the whole Arena page')}
      ${AR_RANKS.map(r => setRow(`${r.name} rank icon`, `<span class="set-exp ar-adic">${arEmblem(r.id)}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="ark-${r.id}"></label>${customIcon('ark-' + r.id) ? `<button type="button" class="sx-btn" data-iconreset="ark-${r.id}">Default</button>` : ''}`, `${fmt(r.min)}+ VP · divisions ${AR_ROMAN[r.divs - 1]} to I`)).join('')}
      ${setRow('Arena token icon', `<span class="set-exp">${curIcon('atok')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="atok"></label>${customIcon('atok') ? '<button type="button" class="sx-btn" data-iconreset="atok">Default</button>' : ''}`, 'Earned in the Arena, spent in the Arena Shop')}</div>`;
}
function arAdminBind(p, redo) {
  const up = p.querySelector('#arBgUp'); if (up) up.onchange = async () => { try { if (await mediaSet('arena:bg', await resizeImage(up.files[0], 1920, 'image/jpeg'))) { redo(); if (arEl) renderArena(); toast('Arena wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = p.querySelector('#arBgDel'); if (del) del.onclick = async () => { await mediaDel('arena:bg'); redo(); if (arEl) renderArena(); toast('Arena wallpaper back to the drawn arena.'); };
}
ADMIN_ART.atok = () => setRow('Arena token icon', `<span class="set-exp">${curIcon('atok')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="atok"></label>${customIcon('atok') ? '<button type="button" class="sx-btn" data-iconreset="atok">Default</button>' : ''}`, 'Earned in the Arena, spent in the Arena Shop');
if (!ADMIN_ART_SECS.icons.includes('atok')) ADMIN_ART_SECS.icons.push('atok');
const arTestHTML = () => `<div><h3>Arena</h3><p class="tiny">Test helpers for the Arena.</p></div>
  <div class="row"><button class="btn ghost sm" id="wArTk">${icon('swords')}Arena: battles back to ${AR_TICKETS}</button><button class="btn ghost sm" id="wArVp">${icon('trophy')}Arena: +500 VP</button><button class="btn ghost sm" id="wArVpM">Arena: −500 VP</button><button class="btn ghost sm" id="wArTok">${curIcon('atok')}+500 arena tokens</button><button class="btn ghost sm" id="wArDef">${icon('shield')}Arena: attacks on my defense now</button><button class="btn ghost sm" id="wArWk">${icon('mail')}Arena: settle the week now</button><button class="btn danger sm" id="wArReset">Arena: reset</button></div>`;
function arTestBind() {
  const on = (id, f) => { const b = $('#' + id); if (b) b.onclick = f; };
  on('wArTk', () => { arState().used = 0; persist(); renderMenu(); if (arEl) renderArena(); toast(`Arena: ${AR_TICKETS} battles.`); });
  on('wArVp', () => { const a = arState(); a.vp += 500; a.best = Math.max(a.best, a.vp); persist(); if (arEl) renderArena(); toast(`Arena: ${fmt(a.vp)} VP · ${arRankOf(a.vp).label}.`); });
  on('wArVpM', () => { const a = arState(); a.vp = Math.max(0, a.vp - 500); persist(); if (arEl) renderArena(); toast(`Arena: ${fmt(a.vp)} VP · ${arRankOf(a.vp).label}.`); });
  on('wArTok', () => { S.wallet.atok = (S.wallet.atok || 0) + 500; persist(); renderMenu(); if (arEl) renderArena(); toast('+500 arena tokens.'); });
  on('wArDef', () => { if (!arJoined()) { toast('Join the Arena first.'); return; } const a = arState(); a.simT = Date.now() - 24 * 36e5; a.joined = Math.min(a.joined, a.simT - 1); const n = arSimDefense(); renderMenu(); if (arEl) renderArena(); toast(`${n} attack${n === 1 ? '' : 's'} on your defense (the last 24 hours replayed).`); });
  on('wArWk', () => { if (!arJoined()) { toast('Join the Arena first.'); return; } arSettle(true); renderMenu(); });
  on('wArReset', () => { S.arena = null; S.wallet.atok = 0; persist(); renderMenu(); if (arEl) renderArena(); toast('Arena reset.'); });
}

/* the Arena's drawn scene (its Battle card and the page behind the glass when no wallpaper is set): a colosseum at dusk,
   crimson banners, light beams, a glowing rune circle on the sand and the arena crest floating over it */
BTH_ART.arena = (() => {
  const arch = (x, y, w, h) => `<path d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}z"/>`;
  const tier1 = Array.from({ length: 9 }, (_, i) => arch(-6 + i * 36, 262, 22, 46)).join(''), tier2 = Array.from({ length: 11 }, (_, i) => arch(-4 + i * 29, 214, 16, 30)).join('');
  const crowd = Array.from({ length: 34 }, (_, i) => { const x = i * 9 + (i % 3) * 2, y = 204 + Math.sin(i * 1.7) * 2; return `<circle cx="${x}" cy="${y}" r="${3 + (i % 4) * .5}"/>`; }).join('');
  const sparks = Array.from({ length: 16 }, (_, i) => `<circle class="ar-sc-sp" cx="${20 + (i * 53) % 260}" cy="${440 - (i * 37) % 120}" r="${1 + (i % 3) * .6}" style="animation-delay:${-(i * .7) % 6}s"/>`).join('');
  const banner = (x, flip) => `<g class="ar-sc-ban" style="transform-origin:${x}px 96px${flip ? ';animation-delay:-2.2s' : ''}"><path d="M${x - 18} 96h36v150l-18 -16-18 16z" fill="url(#arScB)" stroke="#ffcf6a" stroke-width="2"/><path d="M${x - 12} 104h24v120l-12-10-12 10z" fill="none" stroke="rgba(255,220,150,.45)" stroke-width="1"/>
    <path d="M${x} 136l10 4v8c0 7-4 12-10 15-6-3-10-8-10-15v-8z" fill="#ffcf6a"/><path d="M${x - 5} 141l10 10M${x + 5} 141l-10 10" stroke="#7a1240" stroke-width="2" stroke-linecap="round"/><rect x="${x - 22}" y="90" width="44" height="7" rx="3" fill="#ffcf6a"/></g>`;
  return `<svg class="bth-svg ar-scene" viewBox="0 0 300 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="arScSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140a24"/><stop offset=".45" stop-color="#3a1236"/><stop offset=".7" stop-color="#7a2440"/><stop offset="1" stop-color="#2a0c1e"/></linearGradient>
    <radialGradient id="arScSun" cx=".5" cy=".42" r=".5"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".9"/><stop offset=".35" stop-color="#ff7a8a" stop-opacity=".45"/><stop offset="1" stop-color="#ff7a8a" stop-opacity="0"/></radialGradient>
    <linearGradient id="arScW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a2440"/><stop offset="1" stop-color="#22091c"/></linearGradient>
    <linearGradient id="arScF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4a5a"/><stop offset="1" stop-color="#2a0f22"/></linearGradient>
    <linearGradient id="arScB" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a1238"/><stop offset=".5" stop-color="#d63a66"/><stop offset="1" stop-color="#7a1238"/></linearGradient>
    <linearGradient id="arScL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d0" stop-opacity=".55"/><stop offset="1" stop-color="#ff9ab8" stop-opacity="0"/></linearGradient>
    <linearGradient id="arScC" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#fffbe8"/><stop offset=".5" stop-color="#ffcf6a"/><stop offset="1" stop-color="#8a4a10"/></linearGradient>
    <radialGradient id="arScG"><stop offset="0" stop-color="#ffd6f0" stop-opacity=".8"/><stop offset="1" stop-color="#ff6fa0" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="520" fill="url(#arScSky)"/><rect width="300" height="520" fill="url(#arScSun)"/>
    <g fill="#fff" opacity=".7">${Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 71) % 300}" cy="${(i * 37) % 150 + 6}" r="${.6 + (i % 3) * .35}"/>`).join('')}</g>
    <path d="M-10 214Q150 180 310 214V330H-10z" fill="url(#arScW)"/>
    <g fill="#1a0614" opacity=".85">${crowd}</g>
    <g fill="#1a0614" opacity=".9">${tier2}</g><path d="M-10 250Q150 226 310 250" stroke="#ffcf6a" stroke-width="1.4" fill="none" opacity=".5"/>
    <g fill="#14040f">${tier1}</g><path d="M-10 312Q150 296 310 312" stroke="#ffcf6a" stroke-width="1.6" fill="none" opacity=".55"/>
    <g class="ar-sc-beam"><path d="M96 0L128 0L176 520L60 520z" fill="url(#arScL)"/><path d="M184 0L204 0L250 520L176 520z" fill="url(#arScL)" opacity=".7"/></g>
    <ellipse cx="150" cy="450" rx="240" ry="120" fill="url(#arScF)"/>
    <ellipse cx="150" cy="430" rx="110" ry="34" fill="none" stroke="#ffb3d0" stroke-width="2" opacity=".55"/>
    <ellipse class="ar-sc-rune" cx="150" cy="430" rx="92" ry="27" fill="none" stroke="#ffe2a8" stroke-width="2.4" stroke-dasharray="6 9" opacity=".8"/>
    <ellipse cx="150" cy="430" rx="62" ry="18" fill="url(#arScG)"/>
    ${banner(38, 0)}${banner(262, 1)}
    <g class="ar-sc-crest"><circle cx="150" cy="330" r="64" fill="url(#arScG)" opacity=".8"/>
      <path d="M92 290L208 370M208 290L92 370" stroke="url(#arScC)" stroke-width="9" stroke-linecap="round"/><path d="M92 290l-8-12 14 4zM208 290l8-12-14 4z" fill="#fffbe8"/>
      <path d="M150 284l36 14v24c0 22-15 38-36 48-21-10-36-26-36-48v-24z" fill="url(#arScB)" stroke="url(#arScC)" stroke-width="5" stroke-linejoin="round"/>
      <path d="M150 306l12 16-12 18-12-18z" fill="#fffbe8" stroke="#ffcf6a" stroke-width="1.5"/></g>
    <g fill="#ffd6a8">${sparks}</g></svg>`;
})();
