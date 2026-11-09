/* ---------- Card Clash campaign (the owner asked for one; Chapter 0 is the tutorial) ----------
   Chapters of stages. Every stage is a set match (its own decks in a fixed order, both heroes' HP, who goes first, units
   and traps already on the board) that teaches one part of the game, with a coach giving tips during the match.
   Up to 3 stars per stage, each one a goal; star 1 is always "clear the stage" and the others only count on a win.
   Stars are kept for good once earned (one clear can earn some, a later clear the rest). Every new star gives 1 pearl
   (CC_CAMP_STAR_PEARLS); all stars of a chapter unlock its chapter reward (Chapter 0: 10 Standard tickets, a ×10
   Standard summon), claimed on the campaign map. Campaign matches give no Quick match rewards and don't count in the
   deck record. State S.cc.camp = { stars: { stageId: [0|1, 0|1, 0|1] }, got: [chapter ids claimed] }.
   The top of this file is pure (no DOM): the stage data, the match setup and the star bookkeeping, so Node can test it. */

const CC_CAMP_STAR_PEARLS = 1;
/* a unit or face-down trap already on the board when the stage starts (used by a stage's setup) */
function ccCampUnit(G, p, id, lane, row) {
  const d = ccDef(id), c = { iid: 'c' + (++G.iid), id };
  G.players[p].board[lane][row] = { iid: c.iid, id, card: c, owner: p, lane, row, hp: d.hp, hpUp: 0, up: 0, down: 0, armor: CC_ARMORED.has(id) ? 1 : 0, poison: 0, stunNow: false, stunNext: false, summoned: -1, attacked: false, moveUsed: false, moved: false, eq: null, enraged: false, rc: false, dagger: false, sid: ++G.sid };
}
function ccCampTrap(G, p, id, lane) { G.players[p].traps[lane] = { iid: 'c' + (++G.iid), id }; }

/* tip helpers: `when(G, cs)` is checked on your turn, the first tip not shown yet whose test passes appears;
   `hl` names what the coach points at: 'hand:<card id>', 'unit' (one of yours that can attack), 'end', 'hero1', 'ap', 'trap1:<lane>';
   `at: 'low'` puts the bubble under the battle line instead of the top of the screen (for tips about the bot's side) */
const ccMine = G => ccUnits(G, 0);
const ccHas = (G, id) => G.players[0].hand.some(c => c.id === id);
const ccCanHit = G => ccMine(G).some(u => ccCanAttack(G, u)) && G.players[0].ap >= 1;
const ccIdle = G => !ccLegal(G).some(a => a.k !== 'end');

const CC_CAMP = [{
  id: 'c0', no: 0, name: 'The First Lesson', sub: 'Tutorial', reward: { wishes: 10 }, rewardTxt: '10 Standard tickets · a ×10 Standard summon',
  stages: [
    { id: '0-1', name: 'First Steps', teach: 'Summoning and attacking', rules: 2, dummy: true, foeName: 'Dummy', hp: [20, 8], first: 0, seed: 101,
      intro: 'Every card costs AP, and you get 4 AP each turn. Summon units into the front row and attack: a lane with no enemy in it lets your attack hit the enemy hero. Your opponent is a training dummy that never fights back, so take your time.',
      me: ['AGG-U06', 'MOB-U02', 'AGG-U01', 'MOB-U05', 'DEF-U03', 'AGG-U02', 'AGG-U06', 'DEF-U01', 'AGG-U05', 'MOB-U02', 'AGG-U07', 'DEF-U01', 'AGG-U01', 'AGG-U08'],
      bot: Array(12).fill('DEF-U03'),
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 2, t: 'Win by round 2' }, { k: 'lanes', n: 3, t: 'Have a unit in all 3 lanes' }],
      tips: [
        { id: 'hi', t: 'Welcome to Card Clash! You win when the enemy hero\'s HP (the red gem, top left) reaches 0. Every card costs AP, the number in its blue diamond. You get <b>4 AP</b> each turn: the blue crystals on the battle line.', hl: 'ap' },
        { id: 'sum', when: G => !ccMine(G).length, t: 'Tap <b>Warhound</b> in your hand, then tap a glowing slot in the front row to summon it (1 AP).', hl: 'hand:AGG-U06' },
        { id: 'atk', when: ccCanHit, t: 'Warhound and Scout have <b>Haste</b> (the H badge): they can attack the turn they arrive. Tap your unit, then press <b>Attack</b> (1 AP). Nothing stands in its lane, so it hits the hero!', hl: 'unit' },
        { id: 'end', when: G => G.players[0].ap === 0 || ccIdle(G), t: 'Out of AP. Press <b>End Turn</b> (the crystal on the right): next turn you get 4 fresh AP and draw 2 cards.', hl: 'end' },
        { id: 'r2', when: G => G.round >= 2, t: 'Units without Haste attack from your next turn on. For a star, put a unit in the <b>third lane</b> too, then attack to finish the dummy this round.', hl: 'hero1' }
      ] },
    { id: '0-2', name: 'Front and Back', teach: 'Rows, Ranged units and striking back', rules: 5, hp: [20, 12], first: 0, seed: 102,
      intro: 'Each lane has a Front and a Back slot. An attack hits the Front unit of its lane first, then the Back unit, then the hero, so your front row shields your back row. Ranged units can stand in the Back and attack from there without being hit back by Melee units.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U03', 0, 0); ccCampUnit(G, 1, 'AGG-U01', 2, 0); },
      me: ['MOB-U04', 'DEF-U01', 'CON-U01', 'DEF-U03', 'SUP-U08', 'MOB-U04', 'DEF-U01', 'AGG-U01', 'CON-U01', 'AGG-U02', 'DEF-U03', 'MOB-U04', 'AGG-U07', 'SUP-U08', 'DEF-U01', 'AGG-U05'],
      bot: ['AGG-U01', 'DEF-U03', 'DEF-U01', 'AGG-U02', 'AGG-U06', 'AGG-U01', 'DEF-U01', 'DEF-U03', 'AGG-U04', 'AGG-U01', 'DEF-U03', 'AGG-U02', 'DEF-U01', 'AGG-U06'],
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'backHits', n: 3, t: 'Attack 3 times with Ranged units from the Back row' }, { k: 'hp', n: 15, t: 'Finish with 15 HP or more' }],
      tips: [
        { id: 'rows', t: 'Three lanes, each with a <b>Front</b> and a <b>Back</b> slot. Attacks hit the Front unit of their lane first, then the Back unit, then the hero: your front row protects your back row.' },
        { id: 'rng', when: G => ccHas(G, 'MOB-U04'), t: '<b>Melee</b> units can only stand in the Front. <b>Ranged</b> units (the bow badge) may stand in the Back and attack from there. Summon your <b>Archer</b> in a Back slot.', hl: 'hand:MOB-U04' },
        { id: 'ret', when: G => ccMine(G).some(u => ccCanAttack(G, u)), t: 'When units fight, the target strikes back (<b>retaliation</b>). A Ranged unit attacking from the Back takes no retaliation from Melee units: a free hit!', hl: 'unit' },
        { id: 'open', when: G => G.round >= 3, t: 'A lane with no enemy units is open: attacks there hit the enemy hero. Keep a Melee unit in front of your Ranged ones so they stay safe.' }
      ] },
    { id: '0-3', name: 'Spells and Gear', teach: 'Spells and equipment', rules: 7, hp: [20, 10], first: 0, seed: 103,
      intro: 'Spells (the lavender frame) take effect at once and go to your discard pile. Equipment (the silver frame) is attached to one of your units and stays with it. A big wall like the Bulwark falls much faster with both.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U04', 1, 0); ccCampUnit(G, 1, 'DEF-U03', 0, 0); },
      me: ['AGG-S02', 'AGG-U02', 'AGG-E01', 'DEF-U01', 'AGG-U01', 'AGG-S01', 'CON-S02', 'AGG-U08', 'AGG-U07', 'DEF-U01', 'AGG-E02', 'MOB-U05', 'AGG-S02', 'AGG-U05', 'DEF-U01', 'AGG-U02', 'AGG-U07', 'SUP-S01'],
      bot: ['DEF-U03', 'DEF-U08', 'AGG-U01', 'DEF-U07', 'DEF-U03', 'DEF-U05', 'AGG-U01', 'DEF-U03', 'DEF-U08', 'DEF-U07', 'AGG-U01', 'DEF-U03'],
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'spells', n: 2, t: 'Cast 2 spells' }, { k: 'equips', n: 1, t: 'Equip one of your units with gear' }],
      tips: [
        { id: 'sp', when: G => ccHas(G, 'AGG-S02'), t: '<b>Spells</b> work once, then go to your discard pile. <b>Fireball</b> deals 4 damage to an enemy unit: tap it, then tap the target.', hl: 'hand:AGG-S02' },
        { id: 'eq', when: G => ccMine(G).length && G.players[0].hand.some(c => ccDef(c.id).type === 'equipment'), t: '<b>Equipment</b> attaches to one of your units and stays with it. Tap <b>Sharp Blade</b>, then your unit: +1 ATK for good (one item per unit).', hl: 'hand:AGG-E01' },
        { id: 'bc', when: G => ccMine(G).length && ccHas(G, 'AGG-S01'), t: '<b>Battle Cry</b> gives a unit +2 ATK for good. Cast it before attacking to break the Bulwark (8 HP).', hl: 'hand:AGG-S01' },
        { id: 'fr', when: G => ccHas(G, 'CON-S02'), t: '<b>Freeze</b> stuns an enemy unit: it can\'t attack on its next turn. Handy against a strong attacker.', hl: 'hand:CON-S02' }
      ] },
    { id: '0-4', name: 'Traps and Tricks', teach: 'Traps and moving', rules: 8, hp: [20, 10], first: 0, seed: 104,
      intro: 'Traps are set face down in a lane and spring when the enemy acts there. The bot has hidden one too. Units can also move one slot a turn (left, right or between the rows) for 1 AP; some move for free.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U03', 1, 0); ccCampUnit(G, 1, 'AGG-U01', 0, 0); ccCampTrap(G, 1, 'MOB-T01', 2); },
      me: ['AGG-T01', 'MOB-U03', 'DEF-U01', 'MOB-U08', 'DEF-T02', 'MOB-U05', 'AGG-U02', 'AGG-T02', 'MOB-E01', 'DEF-U01', 'AGG-U05', 'MOB-U03', 'AGG-U07', 'DEF-U01', 'AGG-U02', 'MOB-U08', 'AGG-T01', 'AGG-U08'],
      bot: ['DEF-U03', 'AGG-U01', 'DEF-U08', 'DEF-U03', 'AGG-U01', 'DEF-U07', 'DEF-U03', 'AGG-U01', 'DEF-U08', 'DEF-U03', 'AGG-U01', 'DEF-U07'],
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'trapHits', n: 1, t: 'Set off one of your traps' }, { k: 'moves', n: 2, t: 'Move your units 2 times' }],
      tips: [
        { id: 'tr', when: G => G.players[0].hand.some(c => ccDef(c.id).type === 'trap'), t: '<b>Traps</b> go face down on a lane\'s trap stone (the hexagons by the battle line) and spring when the enemy acts in that lane. <b>Retaliation</b> hits an enemy that attacks in its lane: set it where an enemy unit stands.', hl: 'hand:AGG-T01' },
        { id: 'q', at: 'low', t: 'The glowing <b>?</b> on the bot\'s side is its hidden trap, in the right lane. You can\'t see what it is: units that enter or attack in that lane may set it off.', hl: 'trap1:2' },
        { id: 'mv', when: G => ccMine(G).some(u => ccMoveDests(G, u).length && !u.moveUsed), t: '<b>Moving</b>: tap your unit, then a glowing empty slot next to it. It costs 1 AP, but <b>Rogue</b> and <b>Runner</b> have Free Move (F) and move for nothing.', hl: 'unit' },
        { id: 'hit', when: (G, cs) => cs.trapHits > 0, t: 'Your trap went off! Traps are cheap: a well placed one can turn a fight.' }
      ] },
    { id: '0-5', name: 'Final Exam', teach: 'A full match', rules: 0, boss: true, hp: [20, 12], first: 0, seed: 105, deck: 'p-balanced',
      intro: 'A real match with the Balanced starter deck against the bot, which plays the same deck and starts with 12 HP. Everything you learned counts. The ? button in the match opens How to play at any time.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: [
        { id: 'go', t: 'Final exam: a full match with the <b>Balanced</b> starter deck. The bot plays the same deck but starts with 12 HP. Good luck!' },
        { id: 'plan', when: G => G.round >= 2, t: 'Plan each turn: build a front row, keep Ranged units in the back, use spells on big threats and attack into open lanes.' }
      ] }
  ]
}];
const ccCampStages = () => CC_CAMP.flatMap(ch => ch.stages.map(st => ({ ...st, ch })));
const ccCampStage = id => ccCampStages().find(s => s.id === id) || null;

/* the stage's match: its decks (a starter deck shuffled by the stage seed for the exam), HP, first player, no battle event */
function ccCampMatch(st, names) {
  const deck = st.deck ? CC_PRESETS.find(d => d.id === st.deck).cards : null;
  return ccCreateMatch(st.seed, (deck || st.me).slice(), (deck || st.bot).slice(), names, { ev: null, first: st.first, hp: st.hp, order: !deck, setup: st.setup });
}
/* what you did during the match, for the stars: counted from your actions (ccCampNote) and from the match log (ccCampScan) */
const ccCampStats = () => ({ seq: 0, spells: 0, equips: 0, trapsSet: 0, trapHits: 0, moves: 0, backHits: 0, attacks: 0, lost: 0, kills: 0, lanes: 0 });
function ccCampPre(G, a) { const u = a.k === 'attack' ? ccFind(G, a.u) : null; return { k: a.k, back: !!(u && u.row === 1 && ccDef(u.id).range === 'ranged') }; }
function ccCampNote(cs, G, n) {
  if (n.k === 'spell') cs.spells++; else if (n.k === 'equip') cs.equips++; else if (n.k === 'trap') cs.trapsSet++; else if (n.k === 'move') cs.moves++;
  else if (n.k === 'attack') { cs.attacks++; if (n.back) cs.backHits++; }
  ccCampScan(cs, G);
}
function ccCampScan(cs, G) {
  for (const l of G.log) {
    if (l.n <= cs.seq) continue;
    if (l.k === 'trap' && l.p === 0) cs.trapHits++;
    else if (l.k === 'die') { if (l.p === 0) cs.lost++; else cs.kills++; }
  }
  if (G.log.length) cs.seq = Math.max(cs.seq, G.log[G.log.length - 1].n);
  cs.lanes = Math.max(cs.lanes, [0, 1, 2].filter(l => G.players[0].board[l].some(Boolean)).length);
}
/* which of the stage's 3 stars this match earned (all of them need a win) */
function ccCampStarsOf(st, G, cs) {
  const win = G.phase === 'over' && G.winner === 0;
  return st.stars.map(s => {
    if (!win) return false;
    if (s.k === 'win') return true;
    if (s.k === 'round') return G.round <= s.n;
    if (s.k === 'hp') return G.players[0].hp >= s.n;
    if (s.k === 'lost') return cs.lost <= s.n;
    return (cs[s.k] || 0) >= s.n;
  });
}

/* ---------- save + progress ---------- */
function ccCampSave() { const sv = ccSave(); if (!sv.camp) sv.camp = { stars: {}, got: [] }; if (!sv.camp.stars) sv.camp.stars = {}; if (!sv.camp.got) sv.camp.got = []; return sv.camp; }
const ccCampHave = id => ccCampSave().stars[id] || [0, 0, 0];
const ccCampN = id => ccCampHave(id).filter(Boolean).length;
function ccCampOpen(st) { const L = st.ch.stages, i = L.findIndex(s => s.id === st.id); return i <= 0 || !!ccCampHave(L[i - 1].id)[0]; }
const ccCampChN = ch => ch.stages.reduce((t, s) => t + ccCampN(s.id), 0), ccCampChMax = ch => ch.stages.length * 3;
const ccCampClaimable = ch => ccCampChN(ch) >= ccCampChMax(ch) && !ccCampSave().got.includes(ch.id);
const ccCampNext = st => { const L = ccCampStages(), i = L.findIndex(s => s.id === st.id), nx = L[i + 1]; return nx && ccCampOpen(nx) ? nx : null; };
/* the Card Battle gate's red dot: a stage you can play that you haven't cleared yet, or a chapter reward waiting */
const ccCampReady = () => CC_CAMP.some(ch => ccCampClaimable(ch) || ch.stages.some(s => ccCampOpen({ ...s, ch }) && !ccCampHave(s.id)[0]));
/* the stage's opponent: the Training Dummy, or a character from the pool picked by the stage seed (the same every time) */
function ccCampFoe(st) { if (st.dummy) return null; const f = S.pool.filter(e => e.type === 'character' && !e.mc); return f.length ? f[(st.seed >>> 0) % f.length] : null; }
const CC_STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
const ccStars = (have, cls = '') => `<span class="cmp-stars ${cls}">${[0, 1, 2].map(i => `<i class="${have[i] ? 'on' : ''}">${CC_STAR_SVG}</i>`).join('')}</span>`;
const CC_CHEST_SVG = '<svg viewBox="0 0 64 56"><path d="M8 22h48v28a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" fill="#3a2470"/><path d="M8 22c0-10 8-18 24-18s24 8 24 18z" fill="#5a3aa8"/><path d="M8 22h48v6H8z" fill="#f3d98f"/><path d="M28 24h8v12h-8z" fill="#fff3c4"/><circle cx="32" cy="30" r="2.4" fill="#7a5a22"/><path d="M18 6v48M46 6v48" stroke="#f3d98f" stroke-width="3" opacity=".7"/></svg>';

/* ---------- the campaign map ---------- */
let cmpEl = null, cmpSel = null;
/* node positions in % of the stage field: a left-to-right zigzag, and a top-to-bottom one on portrait screens */
const CMP_POS = [[9, 74], [29, 22], [50, 70], [70, 20], [90, 62]], CMP_POS_P = [[24, 8], [74, 29], [26, 50], [74, 71], [30, 92]];
/* the path through the nodes as smooth S curves (horizontal flow or vertical flow), up to node `upto` */
function cmpPathD(P, vert, upto = P.length - 1) {
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 1; i <= upto && i < P.length; i++) { const [x1, y1] = P[i - 1], [x2, y2] = P[i];
    d += vert ? ` C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}` : ` C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`; }
  return d;
}
function openCampaign(id) {
  closeModal(); ccSave(); if (ccdEl) { ccdEl.remove(); ccdEl = null; }
  if (!cmpEl) { cmpEl = document.createElement('div'); cmpEl.className = 'cmp'; cmpEl.setAttribute('role', 'dialog'); cmpEl.setAttribute('aria-label', 'Card Battle campaign'); document.body.appendChild(cmpEl); }
  const L = ccCampStages(), open = L.filter(ccCampOpen);
  cmpSel = id || (L.find(s => s.id === cmpSel) ? cmpSel : null) || (open.find(s => !ccCampHave(s.id)[0]) || open[open.length - 1] || L[0]).id;
  renderCampaign();
}
function closeCampaign() { if (cmpEl) { cmpEl.remove(); cmpEl = null; } renderMenu(); }
function renderCampaign() {
  if (!cmpEl) return;
  const st = ccCampStage(cmpSel) || ccCampStages()[0], ch = st.ch, n = ccCampChN(ch), max = ccCampChMax(ch), got = ccCampSave().got.includes(ch.id), ready = ccCampClaimable(ch);
  const done = Math.min(ch.stages.length - 1, ch.stages.filter(s => ccCampHave(s.id)[0]).length);   // the bright path reaches the first stage not cleared yet
  const node = (s, i) => { const S2 = { ...s, ch }, op = ccCampOpen(S2), have = ccCampHave(s.id), k = have.filter(Boolean).length, [x, y] = CMP_POS[i] || [50, 50], [px, py] = CMP_POS_P[i] || [50, 50];
    return `<button class="cmp-node ${op ? k === 3 ? 'perfect' : k ? 'clear' : 'new' : 'locked'} ${s.id === st.id ? 'sel' : ''} ${s.boss ? 'boss' : ''}" data-stage="${s.id}" style="--x:${x}%;--y:${y}%;--px:${px}%;--py:${py}%" ${op ? '' : 'aria-disabled="true"'}>
      <span class="cmp-med">${op ? `<b>${s.id}</b>` : icon('lock')}${s.boss ? `<i class="cmp-crown">${icon('crown')}</i>` : ''}${op && !k ? '<i class="cmp-newtag">New</i>' : ''}</span>
      ${ccStars(have)}<span class="cmp-nm">${esc(s.name)}</span></button>`; };
  cmpEl.innerHTML = `<div class="cmp-bg"><i class="cmp-moon"></i><i class="cmp-mist"></i></div>
    <header class="cmp-head"><div class="inv-title"><span class="inv-badge">${icon('map')}</span><h2 class="ts">Campaign</h2></div>
      <div class="cmp-chtabs">${CC_CAMP.map(c => `<button class="cmp-cht on">Chapter ${c.no} · ${esc(c.sub)}</button>`).join('')}<button class="cmp-cht soon" disabled>${icon('lock')}Chapter 1 · Coming soon</button></div>
      <span class="cmp-sp"></span>
      <button class="btn ghost" id="cmpDeck">${CC_IC}Deck</button><button class="btn ghost" id="cmpQuick">${icon('bolt')}Quick match</button>
      <button class="inv-x" id="cmpClose" aria-label="Close">${icon('close')}</button></header>
    <section class="cmp-map">
      <div class="cmp-banner"><small>Chapter ${ch.no} · ${esc(ch.sub)}</small><b>${esc(ch.name)}</b><span class="cmp-total">${CC_STAR_SVG}<b>${n}</b> / ${max}</span></div>
      <div class="cmp-field">
        <svg class="cmp-path h" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cmp-p0" d="${cmpPathD(CMP_POS, false)}"/>${done ? `<path class="cmp-p1" d="${cmpPathD(CMP_POS, false, done)}"/>` : ''}</svg>
        <svg class="cmp-path v" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cmp-p0" d="${cmpPathD(CMP_POS_P, true)}"/>${done ? `<path class="cmp-p1" d="${cmpPathD(CMP_POS_P, true, done)}"/>` : ''}</svg>
        ${ch.stages.map(node).join('')}</div>
      <div class="cmp-chest ${ready ? 'ready' : got ? 'got' : ''}"><span class="cmp-chest-ic">${CC_CHEST_SVG}</span>
        <div class="cmp-chest-t"><small>Chapter reward · collect every star</small><b>${esc(ch.rewardTxt)}</b><span class="cmp-bar"><i style="width:${(n / max * 100).toFixed(1)}%"></i></span><small>${n} / ${max} stars</small></div>
        <button class="btn gold sm" id="cmpClaim" ${ready ? '' : 'disabled'}>${got ? 'Claimed' : ready ? 'Claim' : `${max - n} to go`}</button></div>
    </section>
    <aside class="cmp-side">${ccCampPanel(st)}</aside>`;
  cmpEl.querySelector('#cmpClose').onclick = closeCampaign;
  cmpEl.querySelector('#cmpDeck').onclick = () => { closeCampaign(); openDeck(); };
  cmpEl.querySelector('#cmpQuick').onclick = () => openQuickMatch();
  cmpEl.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { cmpSel = b.dataset.stage; renderCampaign(); });
  const cl = cmpEl.querySelector('#cmpClaim'); if (cl && ready) cl.onclick = () => ccCampClaim(ch);
  const go = cmpEl.querySelector('#cmpGo'); if (go) go.onclick = () => ccCampStart(st);
  const ls = cmpEl.querySelector('#cmpLesson'); if (ls) ls.onclick = () => ccRules(st.rules);
}
/* the selected stage: what it teaches, the opponent, the 3 star goals (+1 pearl each the first time) and Start */
function ccCampPanel(st) {
  const op = ccCampOpen(st), have = ccCampHave(st.id), foe = ccCampFoe(st), L = st.ch.stages, prev = L[L.findIndex(s => s.id === st.id) - 1];
  const deck = st.deck ? CC_PRESETS.find(d => d.id === st.deck).name : 'Stage deck (set cards, always the same order)';
  return `<div class="cmp-st ${st.boss ? 'boss' : ''}">
    <div class="cmp-st-top"><span class="cmp-st-no">Stage ${st.id}</span>${st.boss ? '<span class="cmp-bosstag">Final stage</span>' : ''}${ccStars(have, 'big')}</div>
    <h3 class="cmp-st-nm">${esc(st.name)}</h3>
    <span class="cmp-teach">${icon('book')}Teaches: ${esc(st.teach)}</span>
    <p class="cmp-intro">${esc(st.intro)}</p>
    <div class="cmp-foe"><span class="cmp-foe-ic">${foe ? baseThumb(foe) : ccIco('bot')}</span><span><small>Opponent</small><b>${esc(st.dummy ? st.foeName : foe ? foe.name : 'Bot')}</b><em>${st.hp[1]} HP${st.dummy ? ' · never attacks' : ''}</em></span><span><small>Your deck</small><b class="cmp-deckn">${esc(deck)}</b><em>You go first · ${st.hp[0]} HP</em></span></div>
    <span class="ccd-lbl">Star goals</span>
    <ul class="cmp-goals">${st.stars.map((g, i) => `<li class="${have[i] ? 'ok' : ''}"><i class="cmp-gs">${CC_STAR_SVG}</i><span>${esc(g.t)}</span><em>${have[i] ? `${icon('check')}Earned` : `+${CC_CAMP_STAR_PEARLS} ${curIcon('pearls')}`}</em></li>`).join('')}</ul>
    <p class="tiny cmp-note">Stars stay once earned, so you can collect them over several tries. Every goal needs a win.</p>
    <div class="cmp-btns"><button class="btn ghost" id="cmpLesson">${icon('book')}Lesson</button><button class="btn gold cmp-go" id="cmpGo" ${op ? '' : 'disabled'}>${icon('bolt')}${have[0] ? 'Play again' : 'Start'}</button></div>
    ${op ? '' : `<p class="tiny cmp-lock">${icon('lock')}Clear stage ${prev ? prev.id : ''} first.</p>`}</div>`;
}
function ccCampStart(st) { if (!ccCampOpen(st)) return; const sv = ccSave(); startClash({ id: sv.sel, name: `Stage ${st.id}`, cards: [] }, st.seed, st); }
function ccCampClaim(ch) {
  if (!ccCampClaimable(ch)) return;
  const sv = ccCampSave(); sv.got.push(ch.id);
  for (const [k, v] of Object.entries(ch.reward)) S.wallet[k] = (S.wallet[k] || 0) + v;
  persist(); renderCampaign(); renderMenu();
  showRewards('Chapter reward', ch.reward, `Chapter ${ch.no} · ${ch.name}: every star collected!`);
}

/* ---------- the end of a stage: stars earned, new ones paid (1 pearl each) ---------- */
function ccCampFinish() {
  const c = ccM.camp, G = ccM.G, st = c.st; ccCampScan(c.cs, G);
  const now = ccCampStarsOf(st, G, c.cs), sv = ccCampSave(), before = (sv.stars[st.id] || [0, 0, 0]).slice();
  const fresh = now.map((x, i) => x && !before[i]);
  sv.stars[st.id] = before.map((x, i) => x || now[i] ? 1 : 0);
  const pearls = fresh.filter(Boolean).length * CC_CAMP_STAR_PEARLS;
  if (pearls) S.wallet.pearls = (S.wallet.pearls || 0) + pearls;
  if (G.winner === 0) questAdd('clash', 1);   // a stage win counts for the guild quest too
  return { now, before, fresh, pearls, all: sv.stars[st.id], chDone: ccCampClaimable(st.ch) };
}
function ccCampEndHTML() {
  const r = ccM.campRes, st = ccM.camp.st; if (!r) return '';
  return `<div class="ccm-camp">
    <div class="ccm-camp-h"><small>Stage ${st.id}</small><b>${esc(st.name)}</b></div>
    <div class="ccm-camp-stars">${[0, 1, 2].map(i => `<i class="${r.fresh[i] ? 'new' : r.all[i] ? 'on' : ''}" style="--d:${(.5 + i * .28).toFixed(2)}s">${CC_STAR_SVG}</i>`).join('')}</div>
    <ul class="ccm-camp-goals">${st.stars.map((g, i) => `<li class="${r.now[i] ? 'ok' : r.all[i] ? 'had' : ''}">${CC_STAR_SVG}<span>${esc(g.t)}</span><em>${r.fresh[i] ? `New · +${CC_CAMP_STAR_PEARLS} ${curIcon('pearls')}` : r.now[i] ? 'Done' : r.all[i] ? 'Earned before' : 'Not yet'}</em></li>`).join('')}</ul>
    <div class="ccm-rews">${r.pearls ? `<span class="ccm-rw pearl">${curIcon('pearls')}<b>+${r.pearls}</b><small>pearl${r.pearls > 1 ? 's' : ''}</small></span>` : `<span class="ccm-rw none"><small>${ccM.G.winner === 0 ? 'No new stars this time' : 'Win the stage to earn stars'}</small></span>`}</div>
    ${r.chDone ? `<p class="ccm-camp-ch">${icon('gift')}Every star of Chapter ${st.ch.no} collected! Claim <b>${esc(st.ch.rewardTxt)}</b> on the campaign map.</p>` : ''}</div>`;
}
function ccCampEndBtns() {
  const st = ccM.camp.st, nx = ccCampNext(st);
  return `<div class="ccm-endb"><button class="btn ghost" id="ccCampRetry">${icon('back')}Retry</button>${nx ? `<button class="btn gold" id="ccCampNext">Next: ${esc(nx.id)}</button>` : ''}<button class="btn ${nx ? 'ghost' : 'gold'}" id="ccCampMap">${icon('map')}Campaign</button></div>`;
}

/* ---------- the coach: one tip at a time on your turn, pointing at the piece it talks about ---------- */
function ccCoachCheck() {
  const c = ccM && ccM.camp; if (!c || c.tip || ccM.done) return;
  const G = ccM.G; if (G.phase !== 'main' || G.active !== 0 || ccM.busy || ccM.intro || ccM.loading) return;
  const t = (c.st.tips || []).find(t => !c.shown.has(t.id) && (!t.when || t.when(G, c.cs)));
  if (!t) return;
  c.shown.add(t.id); c.tip = t;
  ccM.el.querySelectorAll('.ccco').forEach(x => x.remove());   // screen level (not inside the scaled board), so it stays readable on phones
  const k = (c.st.tips || []).indexOf(t) + 1, le = ccM.leader;
  const el = document.createElement('div'); el.className = 'ccco';
  el.innerHTML = `<span class="ccco-ava">${le ? thumbImg(le) : avatarHTML(56)}</span>
    <div class="ccco-t"><small>Tip ${k} / ${c.st.tips.length} · Stage ${c.st.id}</small><p>${t.t}</p></div>
    <div class="ccco-b"><button class="btn gold sm" id="ccCoachOk">Got it</button><button class="ccq-help" id="ccCoachRules">Lesson</button></div>`;
  ccM.el.appendChild(el);
  if (t.at === 'low') { const ln = ccM.el.querySelector('.ccb-line'); if (ln) el.style.top = Math.round(ln.getBoundingClientRect().bottom + 10) + 'px'; }   // tips about the bot's side sit under the battle line
  ccCoachHL();
}
/* hide the tip (on Got it, or when you act); after Got it the next tip can show right away */
function ccCoachHide(next) {
  const c = ccM && ccM.camp; if (!c) return;
  c.tip = null;
  if (ccM.el) { ccM.el.querySelectorAll('.ccco').forEach(x => x.classList.add('out')); setTimeout(() => ccM && ccM.el && ccM.el.querySelectorAll('.ccco.out').forEach(x => x.remove()), 260); }
  ccCoachHL();
  if (next) setTimeout(ccCoachCheck, 280);
}
/* the glow on what the tip talks about (redrawn after every render) */
function ccCoachHL() {
  if (!ccM || !ccM.el) return;
  ccM.el.querySelectorAll('.cc-coachhl').forEach(x => x.classList.remove('cc-coachhl'));
  const t = ccM.camp && ccM.camp.tip; if (!t || !t.hl) return;
  const G = ccM.G, h = t.hl;
  let el = null;
  if (h.startsWith('hand:')) { const c = G.players[0].hand.find(x => x.id === h.slice(5)); el = c && ccM.el.querySelector(`[data-hand="${c.iid}"]`); }
  else if (h === 'unit') { const u = ccMine(G).find(u => ccCanAttack(G, u)) || ccMine(G).find(u => ccMoveDests(G, u).length && !u.moveUsed) || ccMine(G)[0]; el = u && ccM.el.querySelector(`[data-u="${u.iid}"]`); }
  else if (h === 'end') el = ccM.el.querySelector('#ccEnd');
  else if (h === 'hero1') el = ccM.el.querySelector('.ccm-hero[data-hero="1"]');
  else if (h === 'ap') el = ccM.el.querySelector('.ccb-ap.me');
  else if (h.startsWith('trap1:')) el = ccM.el.querySelector(`[data-trap="1${h.slice(6)}"]`);
  if (el) el.classList.add('cc-coachhl');
}
