/* ---------- Card Clash campaign (the owner asked for one; Chapter 0 is the tutorial) ----------
   Chapters of stages. Every stage is a set match (its own decks in a fixed order, both heroes' HP, who goes first, units
   and traps already on the board) that teaches one part of the game, with a coach giving tips during the match.
   Up to 3 stars per stage, each one a goal; star 1 is always "clear the stage" and the others only count on a win.
   Stars are kept for good once earned (one clear can earn some, a later clear the rest). Every new star gives 1 pearl
   (CC_CAMP_STAR_PEARLS); each chapter has star milestones (`miles`) claimed on the campaign map (Chapter 0: all 15 stars
   = 10 Standard tickets, a ×10 Standard summon; Chapters 1-10: 10 stars = 10 pearls + 20,000 gold, 20 = 10 pearls + 30 Thread, 30 = 10 pearls + 1 stamina bottle, CC_MILE_REW).
   Chapter 0 uses set decks; from Chapter 1 on (`own`) you play your own deck against tougher stage decks. A chapter
   opens when the last stage of the one before is cleared. Campaign matches give no Quick match rewards and don't count
   in the deck record. State S.cc.camp = { stars: { stageId: [0|1, 0|1, 0|1] }, got: [milestone ids claimed] }.
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

/* the stage bots' own decks for Chapter 1 (30 cards, at most 2 copies each) */
const CC_CAMP_DECKS = {
  raiders: ['AGG-U02', 'AGG-U02', 'AGG-U06', 'AGG-U06', 'AGG-U01', 'AGG-U01', 'AGG-U03', 'AGG-U03', 'AGG-U04', 'AGG-U04', 'AGG-U08', 'AGG-U08', 'AGG-U07', 'AGG-U07', 'MOB-U05', 'MOB-U05', 'MOB-U02', 'MOB-U02', 'AGG-S02', 'AGG-S02', 'AGG-S01', 'AGG-S01', 'AGG-S03', 'AGG-S03', 'AGG-T02', 'AGG-T02', 'AGG-E01', 'AGG-E01', 'AGG-T01', 'AGG-T01'],
  arcane: ['CON-U01', 'CON-U01', 'CON-U02', 'CON-U02', 'CON-U03', 'CON-U03', 'CON-U04', 'CON-U04', 'CON-U08', 'CON-U08', 'CON-U06', 'CON-U06', 'DEF-U01', 'DEF-U01', 'DEF-U02', 'DEF-U02', 'AGG-S02', 'AGG-S02', 'SUP-S01', 'SUP-S01', 'CON-S04', 'CON-S04', 'CON-S01', 'CON-S01', 'CON-S02', 'CON-S02', 'DEF-T01', 'DEF-T01', 'CON-T01', 'CON-T01'],
  traps: ['DEF-U03', 'DEF-U03', 'DEF-U01', 'DEF-U01', 'DEF-U08', 'DEF-U08', 'MOB-U04', 'MOB-U04', 'SUP-U08', 'SUP-U08', 'DEF-U06', 'DEF-U06', 'AGG-U05', 'AGG-U05', 'AGG-T02', 'AGG-T02', 'MOB-T01', 'MOB-T01', 'MOB-T02', 'MOB-T02', 'CON-T02', 'CON-T02', 'AGG-T01', 'AGG-T01', 'DEF-T02', 'DEF-T02', 'SUP-T02', 'SUP-T02', 'SUP-T01', 'SUP-T01'],
  fort: ['DEF-U03', 'DEF-U03', 'DEF-U01', 'DEF-U01', 'DEF-U08', 'DEF-U08', 'DEF-U07', 'DEF-U07', 'DEF-U02', 'DEF-U02', 'MOB-U04', 'MOB-U04', 'SUP-U08', 'SUP-U08', 'AGG-U05', 'AGG-U05', 'AGG-U01', 'AGG-U01', 'DEF-S03', 'DEF-S03', 'DEF-S01', 'DEF-S01', 'DEF-S02', 'DEF-S02', 'DEF-T02', 'DEF-T02', 'DEF-E01', 'DEF-E01', 'SUP-T01', 'SUP-T01'],
  frost: ['CON-U02', 'CON-U02', 'CON-U03', 'CON-U03', 'CON-U06', 'CON-U06', 'CON-U01', 'CON-U01', 'DEF-U02', 'DEF-U02', 'DEF-U07', 'DEF-U07', 'DEF-U01', 'DEF-U01', 'CON-S02', 'CON-S02', 'CON-S03', 'CON-S03', 'CON-S01', 'CON-S01', 'SUP-S01', 'SUP-S01', 'CON-T02', 'CON-T02', 'MOB-T02', 'MOB-T02', 'CON-E01', 'CON-E01', 'CON-E02', 'CON-E02'],
  storm: ['MOB-U01', 'MOB-U01', 'MOB-U06', 'MOB-U06', 'MOB-U03', 'MOB-U03', 'MOB-U07', 'MOB-U07', 'MOB-U05', 'MOB-U05', 'MOB-U04', 'MOB-U04', 'MOB-U08', 'MOB-U08', 'CON-U07', 'CON-U07', 'MOB-S03', 'MOB-S03', 'MOB-S01', 'MOB-S01', 'AGG-S02', 'AGG-S02', 'MOB-E02', 'MOB-E02', 'MOB-E01', 'MOB-E01', 'MOB-T01', 'MOB-T01', 'AGG-S03', 'AGG-S03'],
  holy: ['SUP-U02', 'SUP-U02', 'SUP-U04', 'SUP-U04', 'DEF-U06', 'DEF-U06', 'SUP-U01', 'SUP-U01', 'SUP-U03', 'SUP-U03', 'SUP-U06', 'SUP-U06', 'DEF-U01', 'DEF-U01', 'DEF-U04', 'DEF-U04', 'DEF-S02', 'DEF-S02', 'DEF-S04', 'DEF-S04', 'SUP-S03', 'SUP-S03', 'SUP-T02', 'SUP-T02', 'SUP-T01', 'SUP-T01', 'SUP-E01', 'SUP-E01', 'SUP-E02', 'SUP-E02'],
  titan: ['AGG-U08', 'AGG-U08', 'AGG-U07', 'AGG-U07', 'AGG-U03', 'AGG-U03', 'DEF-U04', 'DEF-U04', 'SUP-U06', 'SUP-U06', 'CON-U02', 'CON-U02', 'CON-U04', 'CON-U04', 'MOB-U07', 'MOB-U07', 'CON-U08', 'CON-U08', 'AGG-S04', 'AGG-S04', 'AGG-S02', 'AGG-S02', 'CON-S04', 'CON-S04', 'AGG-E02', 'AGG-E02', 'DEF-T02', 'DEF-T02', 'SUP-E02', 'SUP-E02'],
  warlord: ['AGG-U08', 'AGG-U08', 'AGG-U07', 'AGG-U07', 'SUP-U06', 'SUP-U06', 'SUP-U03', 'SUP-U03', 'CON-U02', 'CON-U02', 'CON-U04', 'CON-U04', 'MOB-U01', 'MOB-U01', 'MOB-U07', 'MOB-U07', 'MOB-U06', 'MOB-U06', 'AGG-S02', 'AGG-S02', 'AGG-S04', 'AGG-S04', 'SUP-E02', 'SUP-E02', 'AGG-E02', 'AGG-E02', 'DEF-T02', 'DEF-T02', 'AGG-S01', 'AGG-S01']
};
/* Chapters 6-10: one playstyle each (mono decks), so the weakness / resistance is clear (ccDeckStyle) */
const ccMono = (st, ids) => ids.flatMap(x => [st + '-' + x, st + '-' + x]);
Object.assign(CC_CAMP_DECKS, {
  blaze: ccMono('AGG', ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'S01', 'S02', 'S04', 'T01', 'T02', 'E01', 'E02']),
  bastion: ccMono('DEF', ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'S01', 'S02', 'S03', 'S04', 'T01', 'T02', 'E02']),
  hex: ccMono('CON', ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'S01', 'S02', 'S03', 'S04', 'T01', 'T02', 'E01']),
  gale: ccMono('MOB', ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'S01', 'S02', 'S03', 'S04', 'T01', 'T02', 'E02']),
  choir: ccMono('SUP', ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'S01', 'S02', 'S03', 'S04', 'T01', 'T02', 'E02']),
  // the last boss: support at its heart (weak to Aggression) with the heaviest hitters of every style
  dawn: ['SUP-U02', 'SUP-U02', 'SUP-U04', 'SUP-U04', 'SUP-U06', 'SUP-U06', 'SUP-U03', 'SUP-U03', 'SUP-U08', 'SUP-U08', 'AGG-U08', 'AGG-U08', 'DEF-U04', 'DEF-U04', 'CON-U02', 'CON-U02', 'MOB-U06', 'MOB-U06', 'SUP-S01', 'SUP-S01', 'SUP-S03', 'SUP-S03', 'AGG-S04', 'AGG-S04', 'SUP-T02', 'SUP-T02', 'DEF-T02', 'DEF-T02', 'SUP-E02', 'SUP-E02']
});
/* a chapter's star milestones (the owner's rule): 10 stars = 10 pearls + gold, 20 = 10 pearls + Thread, all 30 = 10 pearls + 1 stamina bottle */
const CC_MILE_REW = { 10: [{ pearls: 10, coins: 20000 }, '10 pearls + 20,000 gold'], 20: [{ pearls: 10, thread: 30 }, '10 pearls + 30 Thread'], 30: [{ pearls: 10, bottles: 1 }, '10 pearls + 1 stamina bottle'] };
const ccMiles = pre => [10, 20, 30].map(n => ({ id: pre + n, n, reward: CC_MILE_REW[n][0], txt: CC_MILE_REW[n][1] }));
const ccOne = t => [{ id: 'go', at: 'low', t }];   // a Chapter 1 stage's single coach tip (under the battle line, so the bot's side stays visible)

const CC_CAMP = [{
  id: 'c0', no: 0, name: 'The First Lesson', sub: 'Tutorial', miles: [{ id: 'c0', n: 15, reward: { wishes: 10 }, txt: '10 Standard tickets · a ×10 Standard summon' }],
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
}, {
  id: 'c1', no: 1, name: 'The Ember Road', sub: 'Ember Road', own: true,
  miles: ccMiles('c1:'),
  stages: [
    { id: '1-1', name: 'Ambush at Dusk', twist: 'Raiders already on the board', hp: [20, 6], first: 0, brain: 'easy', seed: 201, bot: CC_CAMP_DECKS.raiders,
      intro: 'Raiders jump you on the road with a hound already out. They hit hard but break easily: hold the lanes and strike back.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U06', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 12, t: 'Finish with 12 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('Chapter 1: you play <b>your own deck</b> (change it on the stage card). These raiders start with a unit on the board: block it before it reaches your hero.') },
    { id: '1-2', name: 'Stormfront', twist: 'Rainstorm: 5 AP every turn', ev: 'rain', hp: [20, 6], first: 0, brain: 'easy', seed: 202, botDeck: 'p-balanced',
      intro: 'A storm rolls over the road and the leylines run wild: both players get 5 AP every turn. Bigger turns for everyone, so plan them well.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 6, t: 'Destroy 6 enemy units' }, { k: 'lost', n: 4, t: 'Lose no more than 4 units' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn for both sides. Use the extra AP to summon and attack in the same turn.') },
    { id: '1-3', name: 'The Iron Wall', twist: 'A fortress of tough defenders', hp: [20, 6], first: 0, brain: 'easy', seed: 203, bot: CC_CAMP_DECKS.fort,
      intro: 'A border fort blocks the road. Its guards are slow but very tough, and a Guardian already holds the middle lane.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 15, t: 'Win by round 15' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('The fort\'s walls are tough: find the open lane and hit the hero there, or gang up on one defender at a time.') },
    { id: '1-4', name: 'Blood Moon Rising', twist: 'Blood Moon: all units +1 ATK', ev: 'bloodmoon', hp: [20, 8], first: 0, brain: 'easy', seed: 204, bot: CC_CAMP_DECKS.raiders,
      intro: 'The moon turns red and every unit hits harder, yours too. The raiders charge in to make the most of it.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'lost', n: 3, t: 'Lose no more than 3 units' }],
      tips: ccOne('<b>Blood Moon</b>: every unit has +1 ATK, yours too. Trades get bloody, so keep your hero covered.') },
    { id: '1-5', name: 'The Road Captain', twist: 'Mid-chapter boss with a hidden trap', boss: true, hp: [20, 8], first: 0, brain: 'easy', seed: 205, botDeck: 'p-balanced',
      intro: 'The captain of the road guard leads from the middle lane and has hidden a trap on his left.',
      setup: G => { ccCampUnit(G, 1, 'SUP-U06', 1, 0); ccCampTrap(G, 1, 'DEF-T02', 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 16, t: 'Win by round 16' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('The Commander gives +1 ATK to whoever joins it in the middle lane. Take it down early, and mind the trap stone on the left.') },
    { id: '1-6', name: 'Arcane Tempest', twist: 'Arcane Surge: spells +1 damage · a spellcaster deck', ev: 'surge', hp: [20, 9], first: 0, brain: 'easy', seed: 206, bot: CC_CAMP_DECKS.arcane,
      intro: 'Mages of the ember tower guard the pass. Their spells hit harder in the surge, and their traps can cancel yours.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage. These mages love Fireball and Arcane Burst, so don\'t crowd the front row.') },
    { id: '1-7', name: 'Hall of Snares', twist: 'Traps in every lane', hp: [20, 10], first: 0, brain: 'easy', seed: 207, bot: CC_CAMP_DECKS.traps,
      intro: 'An old hall full of snares. Every lane already hides a trap, and the defenders keep setting more.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'AGG-T02', 1); ccCampTrap(G, 1, 'DEF-T02', 2); ccCampUnit(G, 1, 'DEF-U01', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('Every lane has a hidden trap. Cheap units are good bait to set them off before your big ones go in.') },
    { id: '1-8', name: 'Scorched Plains', twist: 'Scorching Sun: Overtime from round 12', ev: 'heat', hp: [20, 5], first: 0, brain: 'easy', seed: 208, botDeck: 'p-defensive',
      intro: 'The road crosses a burning plain. From round 12 every unit loses 1 HP a turn, and the enemy digs in.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 15, t: 'Win by round 15' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('<b>Scorching Sun</b>: Overtime starts in round 12 and wears every unit down. Press the attack before the heat does.') },
    { id: '1-9', name: 'The Long Night', twist: 'You start on 16 HP · a fast squad already out', hp: [16, 8], first: 0, brain: 'easy', seed: 209, botDeck: 'p-rush',
      intro: 'Worn out after the plains, you are attacked at night by a fast squad. They are already out and you start hurt.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U06', 0, 0); ccCampUnit(G, 1, 'MOB-U05', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('You start on 16 HP and the bot has units out. Stabilise the board first, then turn it around.') },
    { id: '1-10', name: 'The Ember Warlord', twist: 'Final boss: a champion guard and a trap', boss: true, hp: [20, 11], first: 0, brain: 'easy', seed: 210, bot: CC_CAMP_DECKS.warlord,
      intro: 'At the end of the road the Ember Warlord waits with a Champion and a Commander already in line and a trap in the middle. He has 11 HP.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampUnit(G, 1, 'SUP-U06', 0, 0); ccCampTrap(G, 1, 'DEF-T02', 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Warlord: 11 HP, a Champion and a Commander up front and a trap in the middle. Good luck!') }
  ]
}, {
  id: 'c2', no: 2, name: 'The Frost Peaks', sub: 'Frost Peaks', own: true, path: 'climb',
  miles: ccMiles('c2:'),
  stages: [
    { id: '2-1', name: 'The Frozen Pass', twist: 'Frost mages that stun and weaken', hp: [20, 8], first: 0, brain: 'easy', seed: 301, bot: CC_CAMP_DECKS.frost,
      intro: 'The road climbs into the mountains. Frost mages hold the pass: their Frost Witch stuns what it hits, and a Guardian shields her.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); ccCampUnit(G, 1, 'CON-U02', 1, 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'lost', n: 4, t: 'Lose no more than 4 units' }],
      tips: ccOne('Chapter 2: the Frost Peaks. The Frost Witch behind the Guardian stuns your units when she hits them: break through the middle or go around it.') },
    { id: '2-2', name: 'Whiteout', twist: 'Tailwind: moving is free · assassins', ev: 'wind', hp: [20, 9], first: 0, brain: 'easy', seed: 302, bot: CC_CAMP_DECKS.storm,
      intro: 'A blizzard hides the slopes and the wind carries everyone: moving costs nothing. Assassins already lurk on both flanks, looking for your weak spots.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U01', 0, 0); ccCampUnit(G, 1, 'MOB-U03', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }, { k: 'round', n: 15, t: 'Win by round 15' }],
      tips: ccOne('<b>Tailwind</b>: moving costs no AP, for the bot too. Its assassins will shift lanes, so keep every lane guarded.') },
    { id: '2-3', name: 'Avalanche', twist: 'Raiders ride the snow · one already out', hp: [20, 8], first: 0, brain: 'easy', seed: 303, bot: CC_CAMP_DECKS.raiders,
      intro: 'Raiders ride the avalanche down the mountain. One is already out, charging at your lines.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U02', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('A raider is already out: block its lane right away, then push the other two.') },
    { id: '2-4', name: 'The Ice Caverns', twist: 'Traps in two lanes · a Protector', hp: [20, 10], first: 0, brain: 'easy', seed: 304, bot: CC_CAMP_DECKS.traps,
      intro: 'Glittering caverns under the glacier. The hunters have set traps in two lanes already, with a Protector in the middle.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'DEF-T02', 2); ccCampUnit(G, 1, 'DEF-U08', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('Traps wait in the left and right lanes: send something cheap in first.') },
    { id: '2-5', name: 'The Frost Witch', twist: 'Mid-chapter boss: stuns, curses and snares', boss: true, hp: [20, 10], first: 0, brain: 'easy', seed: 305, bot: CC_CAMP_DECKS.frost,
      intro: 'The Frost Witch herself. Her apprentices curse and stun from the back row, and snares lie in two lanes.',
      setup: G => { ccCampUnit(G, 1, 'CON-U02', 1, 1); ccCampUnit(G, 1, 'CON-U03', 0, 1); ccCampUnit(G, 1, 'DEF-U07', 1, 0); ccCampTrap(G, 1, 'CON-T02', 1); ccCampTrap(G, 1, 'MOB-T02', 2); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 16, t: 'Win by round 16' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('The Witch and the Hexer attack from the back row; the Stonewall shields them. Hex Field in the middle stuns what walks in.') },
    { id: '2-6', name: 'Sanctuary Peak', twist: 'Sacred Ground: units enter with Armor · healers', ev: 'sanctuary', hp: [20, 5], first: 0, brain: 'easy', seed: 306, bot: CC_CAMP_DECKS.holy,
      intro: 'A mountain shrine whose priests heal everything they touch. On sacred ground every unit enters with Armor 1.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('<b>Sacred Ground</b>: every unit has Armor 1, so small hits barely scratch. Kill the healers first or they undo your damage.') },
    { id: '2-7', name: 'Storm Riders', twist: 'Rainstorm: 5 AP · assassins already out', ev: 'rain', hp: [20, 10], first: 0, brain: 'easy', seed: 307, bot: CC_CAMP_DECKS.storm,
      intro: 'Riders come out of the storm clouds with 5 AP a turn each. A Phantom and a Shadowblade lead the charge; they love to stab the back row.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U06', 1, 0); ccCampUnit(G, 1, 'MOB-U07', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 14, t: 'Win by round 14' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn for both sides. Phantoms hit your back row first, so don\'t leave Ranged units alone.') },
    { id: '2-8', name: 'The Iron Glacier', twist: 'A tough fort on the ice', hp: [20, 9], first: 0, brain: 'easy', seed: 308, bot: CC_CAMP_DECKS.fort,
      intro: 'A fort carved into the glacier, Guardians on both flanks.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 0, 0); ccCampUnit(G, 1, 'DEF-U07', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 18, t: 'Win by round 18' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }],
      tips: ccOne('The fort is tough: strike the open middle lane early.') },
    { id: '2-9', name: 'The Crystal Gate', twist: 'Arcane Surge · battle mages', ev: 'surge', hp: [20, 9], first: 0, brain: 'easy', seed: 309, bot: CC_CAMP_DECKS.arcane,
      intro: 'The gate to the summit is guarded by battle mages whose spells hit harder in the surge, with a Counter Trap in the middle.',
      setup: G => { ccCampUnit(G, 1, 'CON-U04', 2, 1); ccCampTrap(G, 1, 'DEF-T01', 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage. A Stormcaller waits unguarded in the right back row: hit it there before it starts firing.') },
    { id: '2-10', name: 'The Frost Titan', twist: 'Final boss: a champion, a wall and two traps', boss: true, hp: [20, 12], first: 0, brain: 'easy', seed: 310, bot: CC_CAMP_DECKS.titan,
      intro: 'On the summit the Frost Titan waits with a Champion and a Bulwark, traps in two lanes and 12 HP.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampUnit(G, 1, 'DEF-U04', 0, 0); ccCampTrap(G, 1, 'DEF-T02', 1); ccCampTrap(G, 1, 'CON-T02', 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Frost Titan: a Champion and a Bulwark up front, Thorns in the middle and a Hex Field on the left. This is the hardest fight yet.') }
  ]
}];
/* Chapters 3-5 (the owner asked for more chapters up to 5, and for them to be really easy): your own deck against light, fast
   decks (fragile units, no walls), the bot on 7-10 HP, you always go first, friendly battle events and few units on the board. Built from
   compact rows by ccEasyCh: [name, twist, bot deck ('p-…' starter or a CC_CAMP_DECKS key), bot HP, event, intro, tip,
   star goals as [kind, n], setup]; stage 5 and 10 are the bosses. Each chapter has its own path shape: an arc over the
   meadows (3), a winding river along the coast (4), a spiral into the heart of the isles (5). */
const ccEasyStar = ([k, n]) => ({ k, n, t: k === 'win' ? 'Clear the stage' : k === 'hp' ? `Finish with ${n} HP or more` : k === 'round' ? `Win by round ${n}` : k === 'kills' ? `Destroy ${n} enemy units` : k === 'lost' ? `Lose no more than ${n} units` : k === 'spells' ? `Cast ${n} spells` : `Move units ${n} times` });
const ccEasyCh = (no, name, sub, path, rows) => ({ id: 'c' + no, no, name, sub, own: true, easy: true, path,
  miles: ccMiles(`c${no}:`),
  stages: rows.map(([nm, twist, bot, hp, ev, intro, tip, stars, setup], i) => ({ id: `${no}-${i + 1}`, name: nm, twist, hp: [20, hp], first: 0, seed: no * 100 + 101 + i,
    ...(bot.startsWith('p-') ? { botDeck: bot } : { bot: CC_CAMP_DECKS[bot] }), ...(ev ? { ev } : {}), ...(i === 4 || i === 9 ? { boss: true } : {}), ...(setup ? { setup } : {}),
    intro, stars: [['win'], ...stars].map(ccEasyStar), tips: ccOne(tip) })) });
const CC_CAMP_EASY = [
  ccEasyCh(3, 'The Sunlit Meadows', 'Sunlit Meadows', 'arc', [
    ['Morning Dew', 'A gentle start', 'storm', 7, null, 'After the frozen peaks the road comes down into warm green meadows. A sleepy patrol blocks the first gate.', 'Chapter 3: the Sunlit Meadows. An easy road to warm up: fill your lanes and hit the open ones.', [['hp', 14], ['round', 10]]],
    ['Flower Fields', 'Sacred Ground: units enter with Armor', 'storm', 7, 'sanctuary', 'Wildflowers as far as you can see. The meadow is sacred ground here: every unit enters with Armor 1.', '<b>Sacred Ground</b>: everything has Armor 1, yours too. Bigger hits get through.', [['hp', 12], ['kills', 4]]],
    ['The Windmill', 'Tailwind: moving is free', 'p-rush', 8, 'wind', 'An old windmill turns in a friendly breeze. Moving costs no AP, so switch lanes as much as you like.', '<b>Tailwind</b>: moving is free. Slide your units to the lane with no defender.', [['moves', 2], ['hp', 12]]],
    ['Honey Hollow', 'A few bees and a lot of honey', 'storm', 8, null, 'A hollow full of beehives. The keepers send their quick fliers, but they tire fast.', 'The bot\'s units are fast but fragile. Trade them away with your sturdier ones.', [['hp', 12], ['round', 12]]],
    ['The Meadow Knight', 'Boss: a knight with a shield', 'traps', 10, null, 'The Meadow Knight guards the bridge out of the fields behind a Shieldbearer, but he is not much of a fighter.', 'The Meadow Knight: 10 HP and a Shieldbearer in front. Go around the shield through the side lanes.', [['hp', 10], ['round', 14]], G => { ccCampUnit(G, 1, 'DEF-U03', 1, 0); }],
    ['Picnic Hill', 'Quick little fighters', 'storm', 8, null, 'A hill for picnics where the lanterns are lit early. The picnickers defend their baskets with quick little fighters.', 'Quick fighters again: trade them away and keep your stronger units for the hero.', [['spells', 1], ['hp', 12]]],
    ['The Old Orchard', 'Blood Moon: every unit +1 ATK', 'p-rush', 8, 'bloodmoon', 'Apple trees under a red moon: every unit hits a little harder tonight, yours included.', '<b>Blood Moon</b>: +1 ATK for everyone. Attack first and the trades go your way.', [['kills', 4], ['round', 12]]],
    ['Butterfly Brook', 'A shallow brook to cross', 'arcane', 5, null, 'A brook full of butterflies. A few apprentice mages guard the stepping stones.', 'The mages are weak up close: put Melee units in front of them.', [['hp', 12], ['round', 14]]],
    ['Sunset Ridge', 'Rainstorm: 5 AP a turn', 'storm', 9, 'rain', 'A warm summer rain over the ridge gives both sides 5 AP a turn.', '<b>Rainstorm</b>: 5 AP a turn. Play an extra card or attack once more each turn.', [['hp', 10], ['kills', 5]]],
    ['The Scarecrow King', 'Final boss: a straw king', 'p-rush', 10, null, 'At the end of the meadows the Scarecrow King waits with a Warhound at his side. He looks scarier than he is.', 'The Scarecrow King: 10 HP and one Warhound out. Block its lane and push the other two.', [['hp', 10], ['round', 15]], G => { ccCampUnit(G, 1, 'AGG-U06', 1, 0); }]
  ]),
  ccEasyCh(4, 'The Coral Coast', 'Coral Coast', 'river', [
    ['Sandy Shore', 'Waves and seashells', 'storm', 7, null, 'The meadows end at a warm sandy shore. Crabs scuttle off as a lazy beach patrol wakes up.', 'Chapter 4: the Coral Coast. Another easy stretch: keep all three lanes busy.', [['hp', 14], ['round', 10]]],
    ['Tide Pools', 'Tailwind: moving is free', 'storm', 8, 'wind', 'Shallow pools left by the tide. A sea breeze makes every move free.', '<b>Tailwind</b>: moving is free. Dodge into the lane the bot left open.', [['moves', 2], ['hp', 12]]],
    ['The Lighthouse', 'Keepers rush out', 'p-rush', 8, null, 'A lighthouse on the rocks, its lamp sweeping the waves. The keepers rush out to meet you.', 'The rush deck hits early: hold the front row and strike back.', [['kills', 4], ['hp', 12]]],
    ['Seagull Cliffs', 'Noisy birds, weak fighters', 'p-rush', 8, null, 'Cliffs full of seagulls. The cliff guards are loud, quick and easy to knock over.', 'The rush deck attacks early but runs out of steam. Hold the front row and it falls apart.', [['hp', 12], ['round', 12]]],
    ['The Pearl Diver', 'Boss: a diver with a net', 'traps', 10, null, 'The Pearl Diver guards the reef with a net trap in the middle lane. Send something cheap in first.', 'The Pearl Diver: 10 HP and a trap in the middle lane. Use the side lanes or spring it with a cheap unit.', [['hp', 10], ['round', 14]], G => { ccCampTrap(G, 1, 'MOB-T02', 1); }],
    ['Coral Gardens', 'Sacred Ground: units enter with Armor', 'storm', 7, 'sanctuary', 'Glowing coral gardens under clear water. Sacred ground again: every unit enters with Armor 1.', '<b>Sacred Ground</b>: Armor 1 on every unit. Stack your attacks on one target.', [['kills', 3], ['hp', 12]]],
    ['Shipwreck Bay', 'Blood Moon: every unit +1 ATK', 'raiders', 8, 'bloodmoon', 'An old shipwreck under a red moon. A handful of pirates hide in the hull.', '<b>Blood Moon</b>: +1 ATK for everyone. The pirates are few: clear them out fast.', [['kills', 4], ['round', 12]]],
    ['Moonlit Lagoon', 'Arcane Surge: spells +1 damage', 'arcane', 7, 'surge', 'A calm lagoon where the moonlight makes magic stronger: spells deal 1 more damage.', '<b>Arcane Surge</b>: spells deal +1 damage. Cast yours at the enemy hero or its best unit.', [['spells', 1], ['hp', 12]]],
    ['Whale Song Reef', 'Frost apprentices on the coral', 'frost', 9, null, 'A reef where whales sing under the waves. Frost apprentices guard the coral.', 'The frost apprentices are slow: get in close and hit hard before they freeze you.', [['hp', 10], ['kills', 5]]],
    ['The Tide Queen', 'Final boss: the queen of the coast', 'storm', 10, null, 'The Tide Queen rules the coast from a coral throne, a Mage at her side. She is gracious, and not too strong.', 'The Tide Queen: 10 HP and a Mage in the back. Push the open lanes and she falls quickly.', [['hp', 10], ['round', 15]], G => { ccCampUnit(G, 1, 'CON-U01', 1, 1); }]
  ]),
  ccEasyCh(5, 'The Starlit Isles', 'Starlit Isles', 'spiral', [
    ['Driftwood Dock', 'Sail to the first isle', 'storm', 7, null, 'A little boat takes you to the Starlit Isles, floating islands joined by bridges of light. A dock keeper waves you in.', 'Chapter 5: the Starlit Isles. The road spirals in to the heart of the isles. Easy fights all the way.', [['hp', 14], ['round', 10]]],
    ['Lantern Bridge', 'A quick patrol on the bridge', 'p-rush', 8, null, 'A bridge of lanterns between two isles. A quick patrol runs across to stop you.', 'Hold the bridge: block the lanes with sturdy units and let the rush break on them.', [['kills', 4], ['hp', 12]]],
    ['Cloud Meadow', 'Tailwind: moving is free', 'storm', 8, 'wind', 'A meadow of soft clouds. The wind makes every move free.', '<b>Tailwind</b>: moving costs no AP. Shift to where the enemy is weakest.', [['moves', 2], ['hp', 12]]],
    ['The Star Well', 'Arcane Surge: spells +1 damage', 'arcane', 7, 'surge', 'A well that holds starlight. Magic is stronger here: spells deal 1 more damage.', '<b>Arcane Surge</b>: spells +1 damage, the bot\'s too. Rush its mages before they cast.', [['spells', 1], ['round', 12]]],
    ['The Lamplighter', 'Boss: the keeper of the lights', 'traps', 10, null, 'The Lamplighter keeps the isles\' lights burning, a Shieldbearer at his side. He blocks the middle bridge.', 'The Lamplighter: 10 HP and a Shieldbearer in the middle. Go around it through the side lanes.', [['hp', 10], ['round', 14]], G => { ccCampUnit(G, 1, 'DEF-U03', 1, 0); }],
    ['Moonpetal Grove', 'Sacred Ground: units enter with Armor', 'storm', 7, 'sanctuary', 'A grove of glowing flowers on a floating isle. Sacred ground: every unit enters with Armor 1.', '<b>Sacred Ground</b>: Armor 1 on every unit. Focus your hits.', [['kills', 3], ['hp', 12]]],
    ['Comet Falls', 'Raiders in the spray', 'p-rush', 8, null, 'A waterfall pouring off the edge of an isle into the stars. Fast raiders ride the spray.', 'The rush deck comes fast: hold the front and hit back.', [['hp', 12], ['round', 12]]],
    ['Aurora Steps', 'Blood Moon: every unit +1 ATK', 'raiders', 8, 'bloodmoon', 'Steps of light under a red moon climbing to the inner isles. Every unit hits harder.', '<b>Blood Moon</b>: +1 ATK for everyone. Strike first.', [['kills', 4], ['hp', 10]]],
    ['The Crystal Spire', 'A spire of singing crystals', 'frost', 9, null, 'A spire of crystals that hum when you pass. Frost apprentices guard the last bridge.', 'The frost apprentices can stun. Spread your units so one stun doesn\'t stop everything.', [['hp', 10], ['kills', 4]]],
    ['The Star Keeper', 'Final boss: the heart of the isles', 'p-rush', 8, null, 'At the heart of the spiral the Star Keeper waits with a Warhound. Win here and the isles are yours.', 'The Star Keeper: 8 HP and a Warhound in front. You know this by now: fill the lanes and push.', [['hp', 10], ['round', 15]], G => { ccCampUnit(G, 1, 'AGG-U06', 1, 0); }]
  ])
];
CC_CAMP.push(...CC_CAMP_EASY);
/* Chapters 6-10 (the owner's ask: harder chapters after the first five, now with weaknesses and resistances; the same
   star rewards): your own deck against the normal bot (the bosses of Chapters 8-10 plan their whole turn like the Hard
   Quick match challenger, brain 'plan'), more bot HP, the bot going first on the bosses, battle events more often.
   Every chapter leans on one playstyle (the mono decks above), so the right leader makes it weak: Chapter 6 Aggression
   (bring Defense), 7 Defense (bring Control), 8 Control (bring Mobility), 9 Mobility (bring Support), 10 Support (bring
   Aggression), with a few stages of other styles in between. Weakness / resistance only apply from Chapter 6 on
   (lsCampFoeStyle in 65-leader.js; Chapters 0-5 are the basic game). Rows: [name, twist, deck, bot HP, event, intro,
   tip, star goals, setup, options {first, brain, me}]; stages 5 and 10 are the bosses. Each chapter has its own path
   (cmpLayout): a canyon of two V's (6), a battlement (7), a Z (8), a crescent moon (9) and a heart with the last boss in
   the middle (10). */
const ccHardCh = (no, name, sub, path, rows) => ({ id: 'c' + no, no, name, sub, own: true, hard: true, path,
  miles: ccMiles(`c${no}:`),
  stages: rows.map(([nm, twist, bot, hp, ev, intro, tip, stars, setup, o = {}], i) => ({ id: `${no}-${i + 1}`, name: nm, twist, hp: [o.me || 20, hp], first: o.first || 0, seed: no * 100 + 101 + i,
    ...(bot.startsWith('p-') ? { botDeck: bot } : { bot: CC_CAMP_DECKS[bot] }), ...(ev ? { ev } : {}), ...(o.brain ? { brain: o.brain } : {}), ...(i === 4 || i === 9 ? { boss: true } : {}), ...(setup ? { setup } : {}),
    intro, stars: [['win'], ...stars].map(ccEasyStar), tips: ccOne(tip) })) });
const ccU = (...L) => G => L.forEach(([id, lane, row]) => id.includes('-T') ? ccCampTrap(G, 1, id, lane) : ccCampUnit(G, 1, id, lane, row || 0));   // a stage's board: [card, lane, row]
const CC_CAMP_HARD = [
  ccHardCh(6, 'The Ember Wastes', 'Ember Wastes', 'canyon', [
    ['Ashfall Road', 'Raiders on the ash road', 'raiders', 12, null, 'Past the Starlit Isles the sky turns grey with ash. Raiders patrol the road into the Ember Wastes, and from here on every enemy has a weakness and a resistance.', 'From Chapter 6 on every stage has a <b>weakness</b> and a <b>resistance</b>. These raiders are weak to a Defense leader and resist Aggression: pick your leader to match.', [['hp', 10], ['round', 14]]],
    ['Cinder Dunes', 'Scorching Sun: Overtime from round 12', 'blaze', 12, 'heat', 'Black dunes under a burning sun. Overtime comes early here, and the fire raiders want a short fight.', '<b>Scorching Sun</b>: Overtime from round 12. Trade carefully early and keep your hero healthy.', [['hp', 8], ['kills', 6]]],
    ['The Slag Fort', 'A fort of cooled lava', 'bastion', 10, null, 'A fort built from cooled lava blocks the canyon. Its defenders resist Defense leaders but crack against Control.', 'This fort plays <b>Defense</b>: weak to Control, resists Defense. Its Guardian holds the middle, so open the side lanes.', [['round', 16], ['lost', 5]], ccU(['DEF-U02', 1])],
    ['Blood Moon Canyon', 'Blood Moon: all units +1 ATK', 'blaze', 12, 'bloodmoon', 'A red moon over a narrow canyon. Every hit lands harder, and a Warhound is already loose.', '<b>Blood Moon</b>: +1 ATK for everyone. A Warhound is already out: block its lane before you attack.', [['hp', 8], ['round', 14]], ccU(['AGG-U06', 0])],
    ['The Cinder Tyrant', 'Mid-chapter boss: a Champion and two traps', 'warlord', 9, null, 'The Cinder Tyrant rules the canyon with a Champion at his side and traps in both flank lanes. He moves first.', 'The Tyrant plays <b>Aggression</b>: a Defense leader starts him on less HP and your skill ready. Thorns hide on the left, a Flare Trap on the right.', [['hp', 8], ['round', 16]], ccU(['AGG-U08', 1], ['DEF-T02', 0], ['AGG-T02', 2]), { first: 1 }],
    ['Smoke and Mirrors', 'Arcane Surge · mages in the smoke', 'hex', 15, 'surge', 'Thick smoke hides a camp of battle mages. Their spells hit harder in the surge.', '<b>Arcane Surge</b>: spells +1 damage. These mages play <b>Control</b>, weak to Mobility. Rush them before they cast.', [['kills', 8], ['hp', 10]], ccU(['CON-U01', 0, 1])],
    ['The Burning Bridge', 'A trap under a Berserker', 'blaze', 9, null, 'A rope bridge over a river of lava, burning at the far end. The raiders hold the other side.', 'A Flare Trap waits in the middle lane under the Berserker. Go round through the sides.', [['round', 14], ['lost', 4]], ccU(['AGG-U03', 1], ['AGG-T02', 1])],
    ['Ember Storm', 'Rainstorm: 5 AP a turn', 'raiders', 16, 'rain', 'Rain hisses on the hot rocks and gives both sides 5 AP a turn. The raiders use every point of it.', '<b>Rainstorm</b>: 5 AP a turn, the bot\'s too. Expect two or three units a turn from it.', [['hp', 8], ['kills', 8]]],
    ['The Obsidian Gate', 'A wall of black glass', 'bastion', 11, null, 'The gate out of the canyon is a wall of black glass, held by heavy shields.', '<b>Defense</b> again: weak to Control, resists Defense. Its units are slow but tough: hit the hero through the open lane.', [['round', 18], ['hp', 10]], ccU(['DEF-U04', 1], ['DEF-U03', 0])],
    ['The Ember King', 'Final boss: a king of fire', 'blaze', 12, null, 'The Ember King sits on a throne of cooling lava, a Champion before him and Thorns in the middle. He moves first and hits hard.', 'The Ember King plays <b>Aggression</b>. Bring a Defense leader if you have one: a quarter less HP for him and your skill ready.', [['hp', 6], ['round', 18]], ccU(['AGG-U08', 1], ['DEF-T02', 1]), { first: 1 }]
  ]),
  ccHardCh(7, 'The Sunken Bastion', 'Sunken Bastion', 'battlement', [
    ['Tidegate', 'Shields at the tide gate', 'bastion', 11, null, 'Beyond the wastes, a fortress half sunk into the sea. Its tide gates are held by shield-bearers.', 'Chapter 7: the Sunken Bastion mostly plays <b>Defense</b>, weak to a Control leader. Walls hit softly: chip the hero through the gaps.', [['round', 16], ['hp', 10]], ccU(['DEF-U03', 1])],
    ['Flooded Halls', 'Tailwind: moving is free', 'bastion', 11, 'wind', 'Seawater runs through the halls and carries everyone along: moving costs nothing.', '<b>Tailwind</b>: moving is free. Slide into the lane the walls leave open.', [['moves', 3], ['round', 16]], ccU(['DEF-U01', 0], ['DEF-U08', 2])],
    ['The Coral Garrison', 'Sacred Ground: units enter with Armor', 'choir', 9, 'sanctuary', 'Healers garrison the coral towers. On sacred ground every unit enters with Armor 1.', 'These healers play <b>Support</b>: weak to Aggression, resists Support. Kill the healers first.', [['kills', 8], ['round', 18]]],
    ['Barnacle Walls', 'A wall and Thorns', 'fort', 8, null, 'Walls crusted with barnacles, a Guardian on the left and a trap in the middle lane. The defenders have dug in.', 'Thorns wait in the middle. This <b>Defense</b> deck resists Defense leaders: bring Control.', [['lost', 4], ['hp', 10]], ccU(['DEF-U02', 0], ['DEF-T02', 1])],
    ['The Drowned Warden', 'Mid-chapter boss: three walls in front', 'bastion', 16, null, 'The Drowned Warden: a Fortress Golem, a Paladin that heals itself and a Guardian, all on the front row. He moves first.', 'Three walls in front. Spells and Ranged units get around them; the Paladin heals every turn, so finish it in one go.', [['round', 18], ['hp', 8]], ccU(['DEF-U05', 1], ['DEF-U06', 0], ['DEF-U02', 2], ['DEF-T02', 0]), { first: 1 }],
    ['Kelp Labyrinth', 'Starfall: draw 3 a turn', 'gale', 18, 'starfall', 'A maze of kelp where quick raiders hide. Falling stars give both sides three cards a turn.', '<b>Starfall</b>: three cards a turn. This is a <b>Mobility</b> deck, weak to Support: hold every lane, they will slip around.', [['kills', 8], ['hp', 10]]],
    ['The Lighthouse Keep', 'An Archer behind a Knight', 'fort', 8, null, 'An old lighthouse turned into a keep, archers on its walls.', 'An Archer shoots from behind the Knight, and Ranged attacks from the back row get no melee answer. Hit it with spells or a Flank unit.', [['hp', 10], ['round', 16]], ccU(['DEF-U01', 1], ['MOB-U04', 1, 1])],
    ['Storm Surge', 'Rainstorm: 5 AP a turn', 'bastion', 14, 'rain', 'A storm surge floods the outer walls. Rain gives 5 AP a turn: the defenders can raise two walls at once.', '<b>Rainstorm</b>: 5 AP a turn. Use the extra AP to attack twice where the walls are thin.', [['round', 16], ['lost', 5]]],
    ['The Pearl Vault', 'A trap in every lane', 'traps', 17, null, 'The vault where the Bastion keeps its pearls. Every lane is trapped and a Protector stands in the middle.', 'A trap in every lane. Send a cheap unit first to spring each one.', [['hp', 10], ['kills', 6]], ccU(['MOB-T02', 0], ['DEF-T02', 1], ['AGG-T02', 2], ['DEF-U08', 1])],
    ['The Abyssal Admiral', 'Final boss: a Bulwark, a Guardian and Thorns', 'fort', 11, null, 'The Abyssal Admiral commands the Bastion from its flooded throne room: a Bulwark and a Guardian, with Thorns in the middle. He moves first.', 'The Admiral plays <b>Defense</b>: a Control leader takes a quarter of his HP and has its skill ready.', [['hp', 6], ['round', 20]], ccU(['DEF-U04', 1], ['DEF-U02', 0], ['DEF-T02', 1]), { first: 1 }]
  ]),
  ccHardCh(8, 'The Hexwood', 'Hexwood', 'zed', [
    ['Witchlight Path', 'A Hexer in the trees', 'hex', 15, null, 'A dark forest where the trees whisper spells. Witches walk its paths at night.', 'Chapter 8: the Hexwood plays <b>Control</b>, weak to a Mobility leader. Hexers weaken what they hit: attack them first.', [['hp', 10], ['round', 16]], ccU(['CON-U03', 1, 1])],
    ['Poison Fen', 'Poison and curses', 'frost', 8, null, 'A fen of green mist. Alchemists poison whatever they hit.', 'Poison deals 2 damage a turn for 3 turns. Trade away a poisoned unit before it falls for nothing.', [['lost', 5], ['kills', 7]], ccU(['CON-U06', 0, 1], ['DEF-U07', 0])],
    ['The Hanging Lanterns', 'Arcane Surge: spells +1 damage', 'arcane', 13, 'surge', 'Lanterns hang from every branch, glowing with wild magic. Spells hit harder in the surge.', '<b>Arcane Surge</b>: spells +1 damage, the witches\' too. Spread your units so one Arcane Burst doesn\'t hit them all.', [['hp', 8], ['round', 16]]],
    ['Thornveil', 'Hex Fields in two lanes', 'hex', 16, null, 'Briars hide hex circles in two lanes: whatever walks in is stunned.', 'Hex Field stuns a unit that enters its lane. Send a cheap unit in first, or win the middle.', [['round', 16], ['hp', 10]], ccU(['CON-T02', 0], ['CON-T02', 2], ['CON-U08', 1, 1])],
    ['The Hollow Witch', 'Mid-chapter boss: she plans every move', 'hex', 8, null, 'The Hollow Witch plans every move ahead. A Frost Witch and a Hexer cast from her back row behind a Guardian. She moves first.', 'The Hollow Witch <b>plans her whole turn</b> like a Hard Quick match challenger. A Mobility leader makes her weak.', [['hp', 8], ['round', 18]], ccU(['CON-U02', 1, 1], ['CON-U03', 0, 1], ['DEF-U02', 1], ['CON-T02', 1]), { first: 1, brain: 'plan' }],
    ['Moonless Glade', 'Starfall: draw 3 a turn', 'storm', 17, 'starfall', 'A glade without moonlight, full of quick shadows. Three cards a turn for both sides.', 'A <b>Mobility</b> deck in the Hexwood: weak to Support. Assassins move for free, so keep a defender in every lane.', [['kills', 8], ['hp', 10]]],
    ['The Mirror Pond', 'Tailwind: moving is free', 'hex', 17, 'wind', 'A still pond that shows what isn\'t there. A breeze makes every move free.', '<b>Tailwind</b>: moving costs no AP. The witches will dodge away from your strong units.', [['moves', 3], ['round', 16]], ccU(['CON-U07', 0], ['CON-U05', 2, 1])],
    ['The Rotting Oak', 'Traps in the roots', 'traps', 15, null, 'A rotting oak as big as a tower. Hunters set traps in its roots.', 'This one plays <b>Defense</b>: weak to Control. Net Trap stuns for a turn, Thorns hit back.', [['lost', 5], ['hp', 10]], ccU(['MOB-T02', 0], ['DEF-T02', 1], ['DEF-U01', 1])],
    ['The Coven', 'Blood Moon: all units +1 ATK', 'hex', 10, 'bloodmoon', 'Thirteen witches dance under a red moon. Every hit lands harder.', '<b>Blood Moon</b>: +1 ATK for everyone. A Frost Witch already waits in the back row: reach her before she fires.', [['round', 16], ['kills', 8]], ccU(['CON-U02', 0, 1])],
    ['The Witch Queen', 'Final boss: she plans every turn', 'hex', 10, null, 'The Witch Queen of the Hexwood: a Spellweaver and a Frost Witch behind a Guardian, and a Hex Field on the left. She plans every turn and moves first.', 'The Witch Queen plans her whole turn. A Mobility leader takes a quarter of her HP.', [['hp', 6], ['round', 20]], ccU(['CON-U08', 1, 1], ['CON-U02', 0, 1], ['DEF-U02', 1], ['CON-T02', 0]), { first: 1, brain: 'plan' }]
  ]),
  ccHardCh(9, 'The Gale Spires', 'Gale Spires', 'crescent', [
    ['Windward Steps', 'Wind riders on the steps', 'gale', 18, null, 'Stone spires rise above the clouds, joined by narrow steps. Wind riders own the skies here.', 'Chapter 9: the Gale Spires play <b>Mobility</b>, weak to a Support leader. They move for free: guard every lane.', [['hp', 10], ['kills', 7]], ccU(['MOB-U02', 0])],
    ['Cloudbreak', 'Tailwind: moving is free', 'gale', 17, 'wind', 'The wind breaks through the clouds and carries everyone along.', '<b>Tailwind</b>: moving is free for both sides. Their killers will find the lane you leave empty.', [['round', 16], ['lost', 5]], ccU(['MOB-U03', 0], ['MOB-U08', 2])],
    ['Thunder Ledge', 'Rainstorm: 5 AP a turn', 'storm', 16, 'rain', 'A ledge struck by lightning every few seconds. Rain gives 5 AP a turn.', '<b>Rainstorm</b>: 5 AP a turn. The Shadowblade has Haste: block it right away.', [['hp', 8], ['round', 16]], ccU(['MOB-U07', 1])],
    ['The Kite Riders', 'Two Phantoms on kites', 'gale', 12, null, 'Riders on great kites swoop down on the back row.', 'Phantoms hit your back row first (Flank). Don\'t leave a Ranged unit alone behind an empty front.', [['kills', 8], ['hp', 10]], ccU(['MOB-U06', 0], ['MOB-U06', 2])],
    ['The Storm Hawk', 'Mid-chapter boss: it plans every strike', 'gale', 11, null, 'The Storm Hawk plans every strike. An Assassin already circles, and a Net Trap waits on the right. It moves first.', 'The Storm Hawk <b>plans its whole turn</b>. A Support leader makes it weak: a quarter less HP and your skill ready.', [['hp', 8], ['round', 18]], ccU(['MOB-U01', 1], ['MOB-T02', 2]), { first: 1, brain: 'plan' }],
    ['Sky Monastery', 'Scorching Sun: Overtime from round 12', 'holy', 16, 'heat', 'Monks of the high winds tend their shrine under a burning sun. Overtime comes early.', 'A <b>Support</b> deck: weak to Aggression. Healers undo your damage, but Overtime from round 12 wears them down: kill the healers first.', [['kills', 8], ['round', 18]]],
    ['The Broken Bridge', 'Spikes and nets', 'gale', 15, null, 'A bridge of light broken in the middle. Spikes and nets wait on what is left.', 'Hidden Spikes in the middle, a Net Trap on the left. Spring them with cheap units.', [['lost', 4], ['hp', 10]], ccU(['MOB-T01', 1], ['MOB-T02', 0], ['MOB-U05', 2])],
    ['Eye of the Storm', 'Starfall: draw 3 a turn', 'storm', 11, 'starfall', 'At the heart of the storm the air is still and the stars fall. Three cards a turn.', '<b>Starfall</b>: three cards a turn. Two killers are already out: answer them first.', [['round', 16], ['kills', 8]], ccU(['MOB-U01', 0], ['MOB-U07', 2])],
    ['Thunderhead', 'Blood Moon: all units +1 ATK', 'raiders', 12, 'bloodmoon', 'A thunderhead lit red by the moon. Sky raiders dive out of it.', 'An <b>Aggression</b> deck: weak to Defense. Blood Moon makes their charge hurt.', [['hp', 8], ['round', 16]], ccU(['AGG-U02', 1])],
    ['The Tempest Lord', 'Final boss: an Assassin and a Net Trap', 'gale', 13, null, 'The Tempest Lord rides the storm at the top of the highest spire. His Assassin is already out, with a Net Trap behind it.', 'The Tempest Lord plans every turn and moves first. A Support leader takes a quarter of his HP.', [['hp', 6], ['round', 20]], ccU(['MOB-U01', 1], ['MOB-T02', 1]), { first: 1, brain: 'plan' }]
  ]),
  ccHardCh(10, 'The Dawn Citadel', 'Dawn Citadel', 'heart', [
    ['The Last Road', 'A Priest on the road', 'choir', 20, null, 'The last road climbs to the Dawn Citadel, where the healers of the old world keep the light.', 'Chapter 10: the Citadel plays <b>Support</b>, weak to an Aggression leader. Its healers keep units alive: focus one target at a time.', [['hp', 10], ['round', 18]], ccU(['SUP-U02', 1, 1])],
    ['The Gardens of Dawn', 'Blood Moon: all units +1 ATK', 'choir', 20, 'bloodmoon', 'Gardens of white flowers under a red moon. Every hit lands harder.', '<b>Blood Moon</b>: +1 ATK for everyone, so the healers can\'t keep up. Strike first.', [['kills', 8], ['hp', 10]]],
    ['The Bell Tower', 'Banners in the tower', 'choir', 18, null, 'Bells ring the alarm. A Bannerbearer and a Commander rally the defenders: units beside them hit harder.', 'The Bannerbearer and the Commander give +1 ATK to their lane. Take them out first.', [['round', 18], ['lost', 5]], ccU(['SUP-U03', 0], ['SUP-U06', 2])],
    ['The Sunlit Cloister', 'Scorching Sun: Overtime from round 12', 'choir', 24, 'heat', 'A cloister in blazing light. Overtime comes early and the healers can\'t keep up with it.', '<b>Scorching Sun</b>: Overtime from round 12. Healers stall, so Overtime is on your side.', [['hp', 8], ['round', 16]]],
    ['The High Priestess', 'Mid-chapter boss: she heals the whole board', 'choir', 13, null, 'The High Priestess heals her whole board every turn. A Druid and a Priest stand behind a Paladin, and a Guardian Angel protects the middle. She moves first.', 'She <b>plans her whole turn</b>. Guardian Angel stops the first attack in the middle: attack the sides first.', [['hp', 8], ['round', 18]], ccU(['SUP-U04', 1, 1], ['SUP-U02', 0, 1], ['DEF-U06', 1], ['SUP-T02', 1]), { first: 1, brain: 'plan' }],
    ['Halls of Memory', 'Arcane Surge: spells +1 damage', 'arcane', 13, 'surge', 'Halls lined with old memories. Mages guard them with spells that hit harder in the surge.', 'A <b>Control</b> deck: weak to Mobility. Arcane Burst hits your whole front row: don\'t crowd it.', [['kills', 8], ['hp', 10]]],
    ['The Golden Stair', 'Two Sentinels on the stair', 'choir', 19, null, 'A golden stair guarded by Sentinels that shoot from the back row, a Healing Spring between them.', 'Two Sentinels shoot from the back row. Flank units and spells reach them.', [['round', 18], ['hp', 10]], ccU(['SUP-U08', 0, 1], ['SUP-U08', 2, 1], ['SUP-T01', 1])],
    ['Dawnbreak', 'Rainstorm: 5 AP a turn', 'bastion', 14, 'rain', 'Rain falls on the citadel walls at dawn. 5 AP a turn: the walls go up fast.', 'A <b>Defense</b> deck: weak to Control. Use the extra AP to strike twice in one lane.', [['lost', 5], ['hp', 10]], ccU(['DEF-U04', 1])],
    ['The Prism Gate', 'Blood Moon · a Champion out first', 'titan', 13, 'bloodmoon', 'The last gate glows like a prism under a red moon. The titan\'s champions hold it, and they move first.', 'An <b>Aggression</b> deck: weak to Defense. Blood Moon and a Champion already out: block the middle now.', [['hp', 8], ['round', 18]], ccU(['AGG-U08', 1]), { first: 1 }],
    ['The Dawn Sovereign', 'Final boss: the end of the road', 'dawn', 11, null, 'The Dawn Sovereign waits on the throne of light with every kind of fighter at her call: a Champion and a Commander up front and Thorns in the middle. This is the end of the road.', 'The Dawn Sovereign plans every turn and moves first. Her deck is <b>Support</b> at heart, weak to Aggression: bring your best Aggression leader.', [['hp', 6], ['round', 20]], ccU(['AGG-U08', 1], ['SUP-U06', 0], ['DEF-T02', 1]), { first: 1, brain: 'plan' }]
  ])
];
CC_CAMP.push(...CC_CAMP_HARD);
const ccCampStages = () => CC_CAMP.flatMap(ch => ch.stages.map(st => ({ ...st, ch })));
const ccCampStage = id => ccCampStages().find(s => s.id === id) || null;

/* the stage's match: set decks drawn in order (Chapter 0), a starter deck for both (the exam), or your own deck (`myDeck`,
   from Chapter 1 on) against the stage's deck (`bot` cards or a starter `botDeck`); HP, first player, the battle event
   (`ev`) and the board setup. `mseed` = this try's seed (Chapter 1 shuffles differently every try) */
function ccCampMatch(st, names) {
  const pre = id => CC_PRESETS.find(d => d.id === id).cards;
  const me = st.myDeck || (st.deck ? pre(st.deck) : st.me), bot = st.botDeck ? pre(st.botDeck) : st.deck ? pre(st.deck) : st.bot;
  return ccCreateMatch(st.mseed || st.seed, me.slice(), bot.slice(), names, { ev: st.ev || null, first: st.first, hp: st.hp, order: !!st.me && !st.myDeck, setup: st.setup });
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
/* a stage opens when the stage before it is cleared; a chapter's first stage when the last stage of the chapter before is */
function ccCampOpen(st) {
  const L = st.ch.stages, i = L.findIndex(s => s.id === st.id);
  if (i > 0) return !!ccCampHave(L[i - 1].id)[0];
  const ci = CC_CAMP.findIndex(c => c.id === st.ch.id); if (ci <= 0) return true;
  const P = CC_CAMP[ci - 1].stages; return !!ccCampHave(P[P.length - 1].id)[0];
}
const ccCampChOpen = ch => ccCampOpen({ ...ch.stages[0], ch });
const ccCampChN = ch => ch.stages.reduce((t, s) => t + ccCampN(s.id), 0), ccCampChMax = ch => ch.stages.length * 3;
/* the chapter's star milestones with their state (reached, claimed) */
const ccCampMiles = ch => ch.miles.map(m => ({ ...m, ready: ccCampChN(ch) >= m.n, got: ccCampSave().got.includes(m.id) }));
const ccCampClaimable = ch => ccCampMiles(ch).some(m => m.ready && !m.got);
/* a milestone's tooltip, like the quest gift boxes: the stars needed, each reward with its icon, and its state */
const ccCampMileTip = m => `<b>${m.n} stars</b><span class="dq-tiprw">${Object.entries(m.reward).map(([k, v]) => `<i>${curIcon(k)}${fmt(v)} ${(REW_NAMES[k] || [k, k])[v === 1 ? 0 : 1]}</i>`).join('')}</span><em class="${m.got ? 'ok' : ''}">${m.got ? 'Claimed' : m.ready ? 'Tap to claim' : `Reach ${m.n} stars`}</em>`;
const ccCampNext = st => { const L = st.ch && st.ch.tower ? ccTowerFloors() : ccCampStages(), i = L.findIndex(s => s.id === st.id), nx = L[i + 1]; return nx && ccCampOpen(nx) ? nx : null; };
/* the Card Battle gate's red dot: a stage you can play that you haven't cleared yet, or a chapter reward waiting */
const ccCampReady = () => CC_CAMP.some(ch => ccCampClaimable(ch) || ch.stages.some(s => ccCampOpen({ ...s, ch }) && !ccCampHave(s.id)[0]));
/* the stage's opponent: the Training Dummy, or a character from the pool picked by the stage seed (the same every time) */
function ccCampFoe(st) { if (st.dummy) return null; const f = S.pool.filter(e => e.type === 'character' && !e.mc); return f.length ? f[(st.seed >>> 0) % f.length] : null; }
/* the deck you take into an own-deck chapter: your selected deck if it is ready (30 cards), else the first ready one */
function ccCampMyDeck() { const sv = ccSave(), d = ccDeck(sv.sel); return ccValidateDeck(d.cards).ok ? d : ccAllDecks().find(x => ccValidateDeck(x.cards).ok) || d; }
const CC_STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
const ccStars = (have, cls = '') => `<span class="cmp-stars ${cls}">${[0, 1, 2].map(i => `<i class="${have[i] ? 'on' : ''}">${CC_STAR_SVG}</i>`).join('')}</span>`;

/* ---------- the campaign map ---------- */
let cmpEl = null, cmpSel = null;
/* node positions in % of the stage field: up to 6 stages a left-to-right zigzag; more stages a two-row snake (left to
   right on top, a bend on the right, back to the left below); on portrait screens always a top-to-bottom zigzag */
const CMP_POS = [[9, 74], [29, 22], [50, 70], [70, 20], [90, 62]];
/* every chapter has its own path shape (`ch.path`): Chapter 0 a wave, Chapter 1 a snake (top row first), Chapter 2 a
   climb from the bottom left up to the summit at the top right (three rows; on short screens two rows starting at the
   bottom; on portrait screens a swaying line instead of the zigzag), Chapter 3 rolling hills (the low row first, then
   a high rainbow arch back), Chapter 4 a meandering river (a wave on each row), Chapter 5 a ring of isles ending in the
   middle; on portrait screens each of them sways its own way */
const cmpLin = (k, a, b) => Array.from({ length: k }, (_, i) => k > 1 ? a + (b - a) * i / (k - 1) : (a + b) / 2);
function cmpLayout(n, mode, path) {   // mode 'h' tall landscape screens, 'v' portrait, 'q' short landscape screens (flat rows: the field is short)
  if (mode === 'v') { const VX = { climb: i => [22, 52, 82, 52][i % 4], arc: i => 50 + 30 * Math.sin(i * Math.PI / 2.5), river: i => 50 + 30 * Math.sin(i * .95), spiral: i => [24, 50, 76, 62, 38][i % 5],
      canyon: i => [20, 50, 80, 50][i % 4], battlement: i => [24, 24, 76, 76][i % 4], zed: i => [20, 44, 68, 80, 56, 32, 20, 44, 68, 80][i % 10], crescent: i => 50 + 32 * Math.cos(i * Math.PI / Math.max(1, n - 1)), heart: i => [50, 28, 16, 30, 50, 70, 84, 72, 50, 50][i % 10] };
    return Array.from({ length: n }, (_, i) => [VX[path] ? VX[path](i) : i % 2 ? 74 : 26, n > 1 ? 6 + i * 88 / (n - 1) : 50]); }
  // Chapters 3-5 are two-row paths too (10 stages with names don't fit on one line), each with its own shape:
  const q = mode === 'q', A = Math.ceil(n / 2), B = n - A, sin = u => Math.sin(Math.PI * u), U = (i, k) => k > 1 ? i / (k - 1) : .5;
  // Chapter 3: rolling hills, along the low hill at the bottom first, then back over a high rainbow hill on top
  if (path === 'arc') return [...cmpLin(A, 8, 92).map((x, i) => [x, (q ? 82 : 86) - (q ? 8 : 14) * sin(U(i, A))]), ...cmpLin(B, 90, 10).map((x, i) => [x, (q ? 30 : 40) - (q ? 16 : 26) * sin(U(i, B))])];
  // Chapter 4: a river meandering along the coast, a full wave on each row
  if (path === 'river') return [...cmpLin(A, 8, 92).map((x, i) => [x, (q ? 18 : 22) + (q ? 6 : 12) * Math.sin(2 * Math.PI * U(i, A))]), ...cmpLin(B, 92, 8).map((x, i) => [x, (q ? 80 : 74) + (q ? 6 : 12) * Math.sin(2 * Math.PI * U(i, B))])];
  // Chapter 5: a ring of isles, over the top and back under the bottom, ending in the heart of the isles in the middle
  if (path === 'spiral') { if (q) return [...cmpLin(A, 8, 92).map((x, i) => [x, 30 - 14 * sin(U(i, A))]), ...cmpLin(B, 86, 14).map((x, i) => [x, 70 + 14 * sin(U(i, B))])];
    const a2 = Math.floor(n / 2), b2 = n - a2 - 1; return [...cmpLin(a2, 8, 92).map((x, i) => [x, 34 - 22 * sin(U(i, a2))]), ...cmpLin(b2, 88, 22).map((x, i) => [x, 66 + 22 * sin(U(i, b2))]), [50, 50]]; }
  // Chapter 6: a canyon, two V's (down into the gorge and up again on top, then the same below, right to left)
  if (path === 'canyon') { const V = u => 1 - Math.abs(2 * u - 1); return [...cmpLin(A, 8, 92).map((x, i) => [x, (q ? 14 : 12) + (q ? 20 : 28) * V(U(i, A))]), ...cmpLin(B, 92, 8).map((x, i) => [x, (q ? 62 : 60) + (q ? 20 : 28) * V(U(i, B))])]; }
  // Chapter 7: a battlement, a square wave up and down the columns of the fortress wall
  if (path === 'battlement') { const k = Math.ceil(n / 2); return Array.from({ length: n }, (_, i) => { const c = Math.floor(i / 2), up = c % 2 === 0 ? i % 2 === 0 : i % 2 === 1; return [k > 1 ? 9 + c * 82 / (k - 1) : 50, up ? (q ? 20 : 16) : (q ? 80 : 80)]; }); }
  // Chapter 8: a Z, along the top, back down the diagonal and along the bottom
  if (path === 'zed' && q) { const t = Math.round(n * .4), d = n - 2 * t; return [...cmpLin(t, 8, 92).map(x => [x, 16]), ...cmpLin(d, 78, 22).map((x, i) => [x, 16 + 68 * (i + 1) / (d + 1)]), ...cmpLin(t, 8, 92).map(x => [x, 84])]; }   // short screens: the diagonal between the columns
  if (path === 'zed') { const t = Math.round(n * .3), b = t, d = n - t - b, y0 = q ? 16 : 14, y1 = q ? 84 : 86; return [...cmpLin(t, 8, 92).map(x => [x, y0]), ...Array.from({ length: d }, (_, i) => { const f = (i + 1) / (d + 1); return [92 - 84 * f, y0 + (y1 - y0) * f]; }), ...cmpLin(b, 8, 92).map(x => [x, y1])]; }
  // Chapter 9: a crescent moon lying on its back, along the deep outer curve and back along the shallow inner one
  if (path === 'crescent') { const o = Math.ceil(n * .6), k = n - o, bow = u => 1 - (2 * u - 1) ** 2;
    return [...cmpLin(o, 8, 92).map((x, i) => [x, (q ? 28 : 30) + (q ? 54 : 56) * bow(U(i, o))]), ...cmpLin(k, 74, 26).map((x, i) => [x, (q ? 16 : 18) + (q ? 20 : 23) * bow(U(i, k))])]; }
  // Chapter 10: a heart, from its point round both halves, the last boss in the middle
  if (path === 'heart' && q) return [...cmpLin(A, 8, 92).map((x, i) => [x, 34 - 20 * Math.abs(Math.sin(2 * Math.PI * U(i, A)))]), ...cmpLin(B, 76, 24).map((x, i) => [x, 64 + 22 * sin(U(i, B))])];   // short screens: the two lobes on top, the point below
  if (path === 'heart') { const H = [[50, 92], [28, 78], [8, 52], [15, 22], [32, 8], [50, 27], [68, 8], [85, 22], [92, 52], [50, 60]]; const P = H.slice(0, n - 1).concat([H[9]]); return P.map(([x, y]) => [x, q ? 50 + (y - 50) * .82 : y]); }
  if (n <= 5) return CMP_POS.slice(0, n);
  if (path === 'climb') {
    if (mode === 'q') { const b = Math.ceil(n / 2); return [...cmpLin(b, 8, 92).map(x => [x, 80]), ...cmpLin(n - b, 92, 8).map(x => [x, 24])]; }   // bottom row first, then back along the top
    const b = Math.round(n * .3), t = Math.round(n * .3), m = n - b - t;
    // the rows are offset sideways so no node sits right above another
    return [...cmpLin(b, 8, 60).map((x, i) => [x, i % 2 ? 83 : 88]), ...cmpLin(m, 90, 24).map((x, i) => [x, i % 2 ? 45 : 50]), ...cmpLin(t, 34, 80).map((x, i) => [x, i % 2 ? 9 : 13])];
  }
  const top = Math.ceil(n / 2), bot = n - top, gx = k => k > 1 ? 84 / (k - 1) : 0, z = mode === 'q' ? 0 : 1;
  return Array.from({ length: n }, (_, i) => i < top ? [8 + i * gx(top), z ? (i % 2 ? 26 : 12) : 18] : [92 - (i - top) * gx(bot), z ? ((i - top) % 2 ? 58 : 72) : 78]);
}
/* the path through the nodes, up to node `upto`: S curves between neighbours, a bulge outward where the snake turns */
function cmpPathD(P, vert, upto = P.length - 1) {
  let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
  for (let i = 1; i <= upto && i < P.length; i++) {
    const [x1, y1] = P[i - 1], [x2, y2] = P[i], f = v => v.toFixed(1);
    if (vert) d += ` C${f(x1)} ${f((y1 + y2) / 2)} ${f(x2)} ${f((y1 + y2) / 2)} ${f(x2)} ${f(y2)}`;
    else if (Math.abs(x2 - x1) < 6) { const b = x1 > 50 ? 9 : -9; d += ` C${f(x1 + b)} ${f(y1)} ${f(x2 + b)} ${f(y2)} ${f(x2)} ${f(y2)}`; }
    else d += ` C${f((x1 + x2) / 2)} ${f(y1)} ${f((x1 + x2) / 2)} ${f(y2)} ${f(x2)} ${f(y2)}`;
  }
  return d;
}
function openCampaign(id) {
  closeModal(); ccSave(); if (ccdEl) { ccdEl.remove(); ccdEl = null; }
  if (!cmpEl) { cmpEl = document.createElement('div'); cmpEl.className = 'cmp'; cmpEl.setAttribute('role', 'dialog'); cmpEl.setAttribute('aria-label', 'Card Battle campaign'); document.body.appendChild(cmpEl); }
  const L = ccCampStages(), open = L.filter(ccCampOpen);
  cmpSel = id || (L.find(s => s.id === cmpSel) ? cmpSel : null) || (open.find(s => !ccCampHave(s.id)[0]) || open[open.length - 1] || L[0]).id;
  renderCampaign();
}
function closeCampaign() { if (cmpEl) { cmpEl.remove(); cmpEl = null; } bthHome(); }
/* the stage to show when a chapter tab is picked: its first open stage without a star, else its last open one, else its first */
/* the chapter you are on: the first open chapter with a stage not cleared yet, else the last open one */
function ccCampCurCh() { const L = CC_CAMP.filter(ccCampChOpen); return L.find(c => c.stages.some(s => !ccCampHave(s.id)[0])) || L[L.length - 1] || CC_CAMP[0]; }
/* the chapter list shows only the chapters you have cleared, the one you are on and the next one (the owner's rule);
   admins see every chapter in the game, hidden ones marked "Hidden from players" */
const ccCampShown = () => { const i = CC_CAMP.indexOf(ccCampCurCh()); return CC_CAMP.slice(0, i + 2); };
const ccCampList = () => canAdmin() ? CC_CAMP : ccCampShown();
const ccCampChDot = c => ccCampClaimable(c) || c.stages.some(s => ccCampOpen({ ...s, ch: c }) && !ccCampHave(s.id)[0]);
const ccCampChDone = c => c.stages.every(s => ccCampHave(s.id)[0]);
function ccCampChapters() {
  const cur = ccCampStage(cmpSel), curCh = cur ? cur.ch : ccCampCurCh(), shown = ccCampShown(), L = ccCampList();
  const card = c => { const op = ccCampChOpen(c), n = ccCampChN(c), max = ccCampChMax(c), done = ccCampChDone(c), cleared = c.stages.filter(s => ccCampHave(s.id)[0]).length, hidden = !shown.includes(c);
    const prev = CC_CAMP[CC_CAMP.indexOf(c) - 1], gate = !op && typeof ccCampGateTxt === 'function' && prev && prev.stages.every(s => ccCampHave(s.id)[0]) ? ccCampGateTxt(c) : '', state = done ? 'Cleared' : op ? (cleared ? `${cleared} / ${c.stages.length} stages cleared` : 'Ready to start') : gate ? `Needs ${gate}` : `Clear Chapter ${prev ? prev.no : 0} to open`;
    return `<button class="cmpl-ch ${c.id === curCh.id ? 'on' : ''} ${op ? '' : 'lock'} ${done ? 'done' : ''}" data-cpch="${c.id}">
      <span class="cmpl-no">${op ? `<b>${c.no}</b>` : icon('lock')}</span>
      <span class="cmpl-t"><small>Chapter ${c.no} · ${esc(c.sub)}${hidden ? ' · <em>Hidden from players</em>' : ''}</small><b>${esc(c.name)}</b><span class="cmpl-st">${done ? icon('check') : ''}${state}</span></span>
      <span class="cmpl-stars"><span class="cmpl-sn">${CC_STAR_SVG}<b>${n}</b> / ${max}</span><span class="cmpl-bar"><i style="width:${(n / max * 100).toFixed(1)}%"></i></span></span>
      ${ccCampChDot(c) && c.id !== curCh.id ? '<i class="cmp-dot"></i>' : ''}</button>`; };
  const soon = L.length >= CC_CAMP.length ? `<div class="cmpl-ch soon"><span class="cmpl-no">${icon('lock')}</span><span class="cmpl-t"><small>Chapter ${CC_CAMP.length}</small><b>Coming soon</b><span class="cmpl-st">New chapters are on the way</span></span></div>` : '';
  openModal({ title: 'Chapters', ic: 'book', kind: 'cmpch', body: `<div class="cmpl">${canAdmin() ? `<p class="tiny cmpl-adm">${icon('wrench')}Admin view: every chapter is listed. Players only see the chapters they have cleared, the one they are on and the next one.</p>` : ''}
      <div class="cmpl-list">${L.map(card).join('')}${soon}</div></div>`,
    onMount: b => b.querySelectorAll('[data-cpch]').forEach(x => x.onclick = () => { const c = CC_CAMP.find(y => y.id === x.dataset.cpch); if (!c) return; closeModal(); if (c.id !== curCh.id) { cmpSel = cmpPickIn(c); renderCampaign(); } }) });
}
/* the orbit ring round a stage medallion: a fine dashed circle with four small diamonds, turned slowly by CSS (.cmp-orb) */
const CMP_ORB = '<svg class="cmp-orb" viewBox="-50 -50 100 100" aria-hidden="true"><g><circle r="46" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="1.2 3.6"/><path d="M0,-50 2.6,-46.5 0,-43 -2.6,-46.5Z M50,0 46.5,2.6 43,0 46.5,-2.6Z M0,50 2.6,46.5 0,43 -2.6,46.5Z M-50,0 -46.5,2.6 -43,0 -46.5,-2.6Z" fill="currentColor"/></g></svg>';
function cmpPickIn(ch) { const L = ch.stages.map(s => ({ ...s, ch })), op = L.filter(ccCampOpen); return (op.find(s => !ccCampHave(s.id)[0]) || op[op.length - 1] || L[0]).id; }
function renderCampaign() {
  if (!cmpEl) return;
  const st = ccCampStage(cmpSel) || ccCampStages()[0], ch = st.ch, n = ccCampChN(ch), max = ccCampChMax(ch), miles = ccCampMiles(ch), ready = ccCampClaimable(ch);
  const allGot = miles.every(m => m.got);
  const done = Math.min(ch.stages.length - 1, ch.stages.filter(s => ccCampHave(s.id)[0]).length);   // the bright path reaches the first stage not cleared yet
  const nS = ch.stages.length, PH = cmpLayout(nS, 'h', ch.path), PV = cmpLayout(nS, 'v', ch.path), PQ = cmpLayout(nS, 'q', ch.path), wp = MEDIA.get('camp:bg:' + ch.id);
  const node = (s, i) => { const S2 = { ...s, ch }, op = ccCampOpen(S2), have = ccCampHave(s.id), k = have.filter(Boolean).length, [x, y] = PH[i], [px, py] = PV[i], [qx, qy] = PQ[i];
    return `<button class="cmp-node ${op ? k === 3 ? 'perfect' : k ? 'clear' : 'new' : 'locked'} ${s.id === st.id ? 'sel' : ''} ${s.boss ? 'boss' : ''}" data-stage="${s.id}" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--px:${px.toFixed(1)}%;--py:${py.toFixed(1)}%;--qx:${qx.toFixed(1)}%;--qy:${qy.toFixed(1)}%" ${op ? '' : 'aria-disabled="true"'}>
      <span class="cmp-med">${CMP_ORB}${op ? `<b>${s.id}</b>` : `<i class="cmp-lk">${icon('lock')}</i>`}${s.boss ? `<i class="cmp-crown">${icon('crown')}</i>` : ''}${op && !k ? '<i class="cmp-newtag">New</i>' : ''}</span>
      ${ccStars(have)}<span class="cmp-nm">${esc(s.name)}</span></button>`; };
  const otherDot = ccCampList().some(c => c.id !== ch.id && ccCampChDot(c));
  const back = MEDIA.get('camp:bg:' + ch.id) || MEDIA.get('battle:campaign');   // the whole screen sits on a blurred copy, so the glass panels show it
  cmpEl.innerHTML = `<div class="cmp-bg ${back ? 'has-art' : ''}">${back ? `<img class="cmp-bgart" src="${back}" alt="">` : ''}<i class="cmp-glow g1"></i><i class="cmp-glow g2"></i><i class="cmp-glow g3"></i><i class="cmp-moon"></i><i class="cmp-mist"></i></div>
    <header class="cmp-head"><div class="inv-title"><span class="inv-badge">${icon('map')}</span><h2 class="ts">Campaign</h2></div>
      <button class="cmp-chb" id="cmpChapters" aria-haspopup="dialog" title="All chapters"><span class="cmp-chb-ic">${icon('book')}</span><span class="cmp-chb-t"><small>Chapter ${ch.no}</small><b>${esc(ch.name)}</b></span><span class="cmp-chb-all">All chapters<i class="cmp-chb-v"></i></span>${otherDot ? '<i class="cmp-dot"></i>' : ''}</button>
      <span class="cmp-sp"></span>
      <button class="btn ghost cmp-towerb" id="cmpTower">${icon('compass')}World map${ccTowerReady() ? '<i class="cmp-dot"></i>' : ''}</button><button class="btn ghost" id="cmpDeck">${CC_IC}Deck</button>
      <button class="inv-x" id="cmpClose" aria-label="Close">${icon('close')}</button></header>
    <section class="cmp-map ${wp ? 'has-wp' : ''} ${nS > 6 ? 'many' : ''} path-${ch.path || 'wave'}" style="--cmpn:${nS}">${wp ? `${artImg('camp:bg:' + ch.id, 'cmp-wp')}<i class="cmp-wpshade"></i>` : ''}
      <div class="cmp-banner"><small>Chapter ${ch.no} · ${esc(ch.sub)}</small><b>${esc(ch.name)}</b><span class="cmp-total">${CC_STAR_SVG}<b>${n}</b> / ${max}</span></div>
      <div class="cmp-field">
        <svg class="cmp-path h" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cmp-p0" d="${cmpPathD(PH, false)}"/>${done ? `<path class="cmp-p1" d="${cmpPathD(PH, false, done)}"/>` : ''}</svg>
        <svg class="cmp-path v" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cmp-p0" d="${cmpPathD(PV, true)}"/>${done ? `<path class="cmp-p1" d="${cmpPathD(PV, true, done)}"/>` : ''}</svg>
        <svg class="cmp-path q" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cmp-p0" d="${cmpPathD(PQ, false)}"/>${done ? `<path class="cmp-p1" d="${cmpPathD(PQ, false, done)}"/>` : ''}</svg>
        ${ch.stages.map(node).join('')}</div>
      <div class="cmp-chest dqx ${ready ? 'ready' : allGot ? 'got' : ''}">
        <div class="dq-pts cmp-rw-pts"><i class="cmp-rw-star">${CC_STAR_SVG}</i><div><b>${n}</b><small>/ ${max} stars</small></div></div>
        <div class="dq-track cmp-track"><div class="dq-bar"><i style="width:${(n / max * 100).toFixed(1)}%"></i></div>${miles.map(m => { const tip = ccCampMileTip(m);
          return `<div class="dq-node ${m.got ? 'got' : m.ready ? 'can' : ''}" style="--x:${(m.n / max * 100).toFixed(1)}%"><button class="dq-dot" data-cmpm="${m.id}" data-tip="${esc(tip)}" aria-label="${m.n} stars reward${m.got ? ', claimed' : m.ready ? ', ready to claim' : ''}">${m.got ? icon('check') : icon('gift')}</button><span class="dq-m">${m.n}</span></div>`; }).join('')}</div>
        ${ready ? '<button class="btn gold sm" id="cmpClaim">Claim</button>' : ''}</div>
    </section>
    <aside class="cmp-side">${ccCampPanel(st)}</aside>`;
  cmpEl.querySelector('#cmpClose').onclick = closeCampaign;
  cmpEl.querySelector('#cmpDeck').onclick = () => { closeCampaign(); openDeck(); };
  cmpEl.querySelector('#cmpChapters').onclick = () => ccCampChapters();
  cmpEl.querySelector('#cmpTower').onclick = () => openWorld();
  cmpEl.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { cmpSel = b.dataset.stage; renderCampaign(); });
  const cl = cmpEl.querySelector('#cmpClaim'); if (cl && ready) cl.onclick = () => ccCampClaim(ch);
  cmpEl.querySelectorAll('[data-cmpm]').forEach(b => b.onclick = () => { if (ccCampClaimable(ch) && ccCampMiles(ch).find(m => m.id === b.dataset.cmpm).ready) ccCampClaim(ch); });   // like the quest gift boxes: tap a reached one to claim
  const go = cmpEl.querySelector('#cmpGo'); if (go) go.onclick = () => ccCampStart(st);
  const ls = cmpEl.querySelector('#cmpLesson'); if (ls) ls.onclick = () => ccRules(st.rules || 0);
  const dp = cmpEl.querySelector('#cmpDeckPick'); if (dp) dp.onclick = () => ccCampDeckPick();
}
/* the selected stage: what it teaches (or its twist), the opponent, your deck, the 3 star goals (+1 pearl each the first time) and Start */
function ccCampPanel(st) {
  const op = ccCampOpen(st), have = ccCampHave(st.id), foe = ccCampFoe(st), L = st.ch.stages, i = L.findIndex(s => s.id === st.id);
  const prev = i > 0 ? L[i - 1] : (() => { const ci = CC_CAMP.findIndex(c => c.id === st.ch.id), P = ci > 0 ? CC_CAMP[ci - 1].stages : null; return P ? P[P.length - 1] : null; })();
  const own = st.ch.own, my = own ? ccCampMyDeck() : null, myOk = !own || ccValidateDeck(my.cards).ok;
  const deck = own ? my.name : st.deck ? CC_PRESETS.find(d => d.id === st.deck).name : 'Stage deck (set cards, always the same order)';
  const E = st.ev && CC_EVENTS[st.ev], last = i === L.length - 1, T = !!st.ch.tower;
  return `<div class="cmp-st ${st.boss ? 'boss' : ''}">
    <div class="cmp-st-top"><span class="cmp-st-no">${ccStLabel(st)}</span>${st.boss ? `<span class="cmp-bosstag">${T ? 'Guardian' : last ? 'Final boss' : 'Boss'}</span>` : ''}${ccStars(have, 'big')}</div>
    <h3 class="cmp-st-nm">${esc(st.name)}</h3>
    <span class="cmp-teach">${icon(st.teach ? 'book' : 'bolt')}${st.teach ? `Teaches: ${esc(st.teach)}` : esc(st.twist || '')}</span>
    <p class="cmp-intro">${esc(st.intro)}</p>
    ${E ? `<div class="cmp-ev" style="--ec:${ccEvCol(st.ev)}"><span class="cmp-ev-ic">${ccEvIco(st.ev)}</span><span><b>${esc(E.name)}</b><small>${esc(E.text)}</small></span></div>` : ''}
    ${brLockHTML(st)}${lsAdvHTML(lsCampFoeStyle(st), ccLeaderOf(ccSave().sel))}
    <div class="cmp-foe"><span class="cmp-foe-ic">${foe ? baseThumb(foe) : ccIco('bot')}</span><span><small>Opponent</small><b>${esc(st.dummy ? st.foeName : foe ? foe.name : 'Bot')}</b><em>${st.hp[1]} HP${st.dummy ? ' · never attacks' : ''}</em></span><span><small>Your deck</small><b class="cmp-deckn">${esc(deck)}</b>${own ? `<button class="ccq-help cmp-dpick" id="cmpDeckPick">Change deck</button>` : ''}<em>${st.first === 1 ? 'The bot goes first' : 'You go first'} · ${st.hp[0]} HP</em></span></div>
    <span class="ccd-lbl">Star goals</span>
    <ul class="cmp-goals">${st.stars.map((g, k) => `<li class="${have[k] ? 'ok' : ''}"><i class="cmp-gs">${CC_STAR_SVG}</i><span>${esc(g.t)}</span><em>${have[k] ? `${icon('check')}Earned` : `+${CC_CAMP_STAR_PEARLS} ${curIcon('pearls')}`}</em></li>`).join('')}</ul>
    <p class="tiny cmp-note">Stars stay once earned, so you can collect them over several tries. Every goal needs a win.</p>
    <div class="cmp-btns"><button class="btn ghost" id="cmpLesson">${icon('book')}${st.teach ? 'Lesson' : 'How to play'}</button><button class="btn gold cmp-go" id="cmpGo" ${op && myOk ? '' : 'disabled'}>${icon('bolt')}${have[0] ? 'Play again' : 'Start'}</button></div>
    ${!op ? `<p class="tiny cmp-lock">${icon('lock')}Clear ${prev ? ccStLabel({ ...prev, ch: st.ch }).toLowerCase() : 'the stage before'} first.</p>` : !myOk ? `<p class="tiny cmp-lock">${icon('lock')}Build a 30-card deck first (Deck).</p>` : ''}</div>`;
}
/* pick which of your ready decks goes into an own-deck chapter (it becomes your selected deck) */
function ccCampDeckPick() {
  const sv = ccSave(), cur = ccCampMyDeck();
  const where = twrEl ? 'Tower floors are' : `Chapter ${esc(String((ccCampStage(cmpSel) || {}).ch ? ccCampStage(cmpSel).ch.no : 1))} stages are`;
  openModal({ title: 'Your deck', ic: 'cards', kind: 'ccqm', body: `<div class="ccq"><p class="ccq-intro">${where} played with your own deck. Pick a ready deck (30 cards):</p>
    <div class="ccq-decks">${ccAllDecks().map(d => { const v = ccValidateDeck(d.cards).ok; return `<button class="ccq-dk ${d.id === cur.id ? 'on' : ''}" data-cdeck="${d.id}" ${v ? '' : 'disabled'}><span>${d.preset ? icon('lock') : CC_IC}</span><b>${esc(d.name)}</b><small>${v ? 'Ready' : `${d.cards.length}/30`}</small></button>`; }).join('')}</div></div>`,
    onMount: b => b.querySelectorAll('[data-cdeck]').forEach(x => x.onclick = () => { sv.sel = x.dataset.cdeck; persist(); closeModal(); if (twrEl) renderTower(); else renderCampaign(); }) });
}
function ccCampStart(st) {
  st = (st.ch && st.ch.tower ? ccTowerFloor(st.id) : ccCampStage(st.id)) || st; if (!ccCampOpen(st)) return;
  const sv = ccSave();
  if (st.ch.own) {   // your own deck, shuffled differently every try
    const d = ccCampMyDeck(); if (!ccValidateDeck(d.cards).ok) return toast('Build a 30-card deck first', true);
    return startClash({ id: d.id, name: d.name, cards: d.cards.slice() }, st.seed, { ...st, myDeck: d.cards.slice(), mseed: (Math.random() * 4294967296) >>> 0 });
  }
  startClash({ id: sv.sel, name: `Stage ${st.id}`, cards: [] }, st.seed, st);
}
/* claim every reached milestone of the chapter at once */
function ccCampClaim(ch) {
  const L = ccCampMiles(ch).filter(m => m.ready && !m.got); if (!L.length) return;
  const sv = ccCampSave(), tot = {};
  for (const m of L) { sv.got.push(m.id); for (const [k, v] of Object.entries(m.reward)) { tot[k] = (tot[k] || 0) + v; S.wallet[k] = (S.wallet[k] || 0) + v; } }
  persist(); renderCampaign(); renderMenu();
  showRewards(L.length > 1 ? 'Star rewards' : 'Star reward', tot, `Chapter ${ch.no} · ${ch.name}: ${L.map(m => m.n).join(', ')} stars`);
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
    <div class="ccm-camp-h"><small>${ccStLabel(st)}</small><b>${esc(st.name)}</b></div>
    <div class="ccm-camp-stars">${[0, 1, 2].map(i => `<i class="${r.fresh[i] ? 'new' : r.all[i] ? 'on' : ''}" style="--d:${(.5 + i * .28).toFixed(2)}s">${CC_STAR_SVG}</i>`).join('')}</div>
    <ul class="ccm-camp-goals">${st.stars.map((g, i) => `<li class="${r.now[i] ? 'ok' : r.all[i] ? 'had' : ''}">${CC_STAR_SVG}<span>${esc(g.t)}</span><em>${r.fresh[i] ? `New · +${CC_CAMP_STAR_PEARLS} ${curIcon('pearls')}` : r.now[i] ? 'Done' : r.all[i] ? 'Earned before' : 'Not yet'}</em></li>`).join('')}</ul>
    <div class="ccm-rews">${r.pearls ? `<span class="ccm-rw pearl">${curIcon('pearls')}<b>+${r.pearls}</b><small>pearl${r.pearls > 1 ? 's' : ''}</small></span>` : `<span class="ccm-rw none"><small>${ccM.G.winner === 0 ? 'No new stars this time' : 'Win the stage to earn stars'}</small></span>`}</div>
    ${r.chDone ? `<p class="ccm-camp-ch">${icon('gift')}A Chapter ${st.ch.no} star reward is ready: claim it on the campaign map.</p>` : ''}</div>`;
}
function ccCampEndBtns() {
  const st = ccM.camp.st, nx = ccCampNext(st), T = !!st.ch.tower;
  return `<div class="ccm-endb"><button class="btn ghost" id="ccCampRetry">${icon('back')}Retry</button>${nx ? `<button class="btn gold" id="ccCampNext">${T ? `${icon('up')}Climb to floor ${nx.no}` : `Next: ${esc(nx.id)}`}</button>` : ''}<button class="btn ${nx ? 'ghost' : 'gold'}" id="ccCampMap">${icon(T ? 'tree' : 'map')}${T ? 'Great Tree' : 'Campaign'}</button></div>`;
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
    <div class="ccco-t"><small>Tip ${k} / ${c.st.tips.length} · ${ccStLabel(c.st)}</small><p>${t.t}</p></div>
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
