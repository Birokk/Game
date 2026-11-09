/* ---------- Card Clash campaign (the owner asked for one; Chapter 0 is the tutorial) ----------
   Chapters of stages. Every stage is a set match (its own decks in a fixed order, both heroes' HP, who goes first, units
   and traps already on the board) that teaches one part of the game, with a coach giving tips during the match.
   Up to 3 stars per stage, each one a goal; star 1 is always "clear the stage" and the others only count on a win.
   Stars are kept for good once earned (one clear can earn some, a later clear the rest). Every new star gives 1 pearl
   (CC_CAMP_STAR_PEARLS); each chapter has star milestones (`miles`) claimed on the campaign map (Chapter 0: all 15 stars
   = 10 Standard tickets, a ×10 Standard summon; Chapter 1: 10 / 20 / 30 stars = 10 pearls + 1 stamina bottle each).
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
  miles: [10, 20, 30].map(n => ({ id: 'c1:' + n, n, reward: { pearls: 10, bottles: 1 }, txt: '10 pearls + 1 stamina bottle' })),
  stages: [
    { id: '1-1', name: 'Ambush at Dusk', twist: 'Raiders already on the board', hp: [20, 10], first: 0, seed: 201, bot: CC_CAMP_DECKS.raiders,
      intro: 'Raiders jump you on the road with a hound already out. They hit hard but break easily: hold the lanes and strike back.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U06', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 12, t: 'Finish with 12 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('Chapter 1: you play <b>your own deck</b> (change it on the stage card). These raiders start with a unit on the board: block it before it reaches your hero.') },
    { id: '1-2', name: 'Stormfront', twist: 'Rainstorm: 5 AP every turn', ev: 'rain', hp: [20, 10], first: 0, seed: 202, botDeck: 'p-balanced',
      intro: 'A storm rolls over the road and the leylines run wild: both players get 5 AP every turn. Bigger turns for everyone, so plan them well.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 6, t: 'Destroy 6 enemy units' }, { k: 'lost', n: 4, t: 'Lose no more than 4 units' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn for both sides. Use the extra AP to summon and attack in the same turn.') },
    { id: '1-3', name: 'The Iron Wall', twist: 'A fortress of tough defenders', hp: [20, 10], first: 0, seed: 203, bot: CC_CAMP_DECKS.fort,
      intro: 'A border fort blocks the road. Its guards are slow but very tough, and a Guardian already holds the middle lane.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 15, t: 'Win by round 15' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('The fort\'s walls are tough: find the open lane and hit the hero there, or gang up on one defender at a time.') },
    { id: '1-4', name: 'Blood Moon Rising', twist: 'Blood Moon: all units +1 ATK · the bot goes first', ev: 'bloodmoon', hp: [20, 20], first: 1, seed: 204, bot: CC_CAMP_DECKS.raiders,
      intro: 'The moon turns red and every unit hits harder. The raiders strike first this time.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'lost', n: 3, t: 'Lose no more than 3 units' }],
      tips: ccOne('<b>Blood Moon</b>: every unit has +1 ATK, yours too. Trades get bloody, so keep your hero covered.') },
    { id: '1-5', name: 'The Road Captain', twist: 'Mid-chapter boss with a hidden trap', boss: true, hp: [20, 12], first: 0, seed: 205, botDeck: 'p-balanced',
      intro: 'The captain of the road guard leads from the middle lane and has hidden a trap on his left.',
      setup: G => { ccCampUnit(G, 1, 'SUP-U06', 1, 0); ccCampTrap(G, 1, 'DEF-T02', 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 16, t: 'Win by round 16' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('The Commander gives +1 ATK to whoever joins it in the middle lane. Take it down early, and mind the trap stone on the left.') },
    { id: '1-6', name: 'Arcane Tempest', twist: 'Arcane Surge: spells +1 damage · a spellcaster deck', ev: 'surge', hp: [20, 15], first: 0, seed: 206, bot: CC_CAMP_DECKS.arcane,
      intro: 'Mages of the ember tower guard the pass. Their spells hit harder in the surge, and their traps can cancel yours.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage. These mages love Fireball and Arcane Burst, so don\'t crowd the front row.') },
    { id: '1-7', name: 'Hall of Snares', twist: 'Traps in every lane', hp: [20, 20], first: 0, seed: 207, bot: CC_CAMP_DECKS.traps,
      intro: 'An old hall full of snares. Every lane already hides a trap, and the defenders keep setting more.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'AGG-T02', 1); ccCampTrap(G, 1, 'DEF-T02', 2); ccCampUnit(G, 1, 'DEF-U01', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('Every lane has a hidden trap. Cheap units are good bait to set them off before your big ones go in.') },
    { id: '1-8', name: 'Scorched Plains', twist: 'Scorching Sun: Overtime from round 12', ev: 'heat', hp: [20, 10], first: 0, seed: 208, botDeck: 'p-defensive',
      intro: 'The road crosses a burning plain. From round 12 every unit loses 1 HP a turn, and the enemy digs in.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 15, t: 'Win by round 15' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('<b>Scorching Sun</b>: Overtime starts in round 12 and wears every unit down. Press the attack before the heat does.') },
    { id: '1-9', name: 'The Long Night', twist: 'You start on 16 HP · the bot goes first', hp: [16, 16], first: 1, seed: 209, botDeck: 'p-rush',
      intro: 'Worn out after the plains, you are attacked at night by a fast squad. They move first and you start hurt.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U06', 0, 0); ccCampUnit(G, 1, 'MOB-U05', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('You start on 16 HP and the bot goes first with units out. Stabilise the board first, then turn it around.') },
    { id: '1-10', name: 'The Ember Warlord', twist: 'Final boss: a champion guard and a trap', boss: true, hp: [20, 18], first: 1, seed: 210, bot: CC_CAMP_DECKS.warlord,
      intro: 'At the end of the road the Ember Warlord waits with a Champion and a Commander already in line and a trap in the middle. He has 18 HP and moves first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampUnit(G, 1, 'SUP-U06', 0, 0); ccCampTrap(G, 1, 'DEF-T02', 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Warlord: 18 HP, a Champion and a Commander up front and a trap in the middle, and he moves first. Good luck!') }
  ]
}, {
  id: 'c2', no: 2, name: 'The Frost Peaks', sub: 'Frost Peaks', own: true, path: 'climb',
  miles: [10, 20, 30].map(n => ({ id: 'c2:' + n, n, reward: { pearls: 10, bottles: 1 }, txt: '10 pearls + 1 stamina bottle' })),
  stages: [
    { id: '2-1', name: 'The Frozen Pass', twist: 'Frost mages that stun and weaken', hp: [20, 12], first: 0, seed: 301, bot: CC_CAMP_DECKS.frost,
      intro: 'The road climbs into the mountains. Frost mages hold the pass: their Frost Witch stuns what it hits, and a Guardian shields her.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); ccCampUnit(G, 1, 'CON-U02', 1, 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'lost', n: 4, t: 'Lose no more than 4 units' }],
      tips: ccOne('Chapter 2: the Frost Peaks. The Frost Witch behind the Guardian stuns your units when she hits them: break through the middle or go around it.') },
    { id: '2-2', name: 'Whiteout', twist: 'Tailwind: moving is free · assassins', ev: 'wind', hp: [20, 18], first: 0, seed: 302, bot: CC_CAMP_DECKS.storm,
      intro: 'A blizzard hides the slopes and the wind carries everyone: moving costs nothing. Assassins already lurk on both flanks, looking for your weak spots.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U01', 0, 0); ccCampUnit(G, 1, 'MOB-U03', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }, { k: 'round', n: 15, t: 'Win by round 15' }],
      tips: ccOne('<b>Tailwind</b>: moving costs no AP, for the bot too. Its assassins will shift lanes, so keep every lane guarded.') },
    { id: '2-3', name: 'Avalanche', twist: 'Blood Moon · raiders strike first', ev: 'bloodmoon', hp: [20, 12], first: 1, seed: 303, bot: CC_CAMP_DECKS.raiders,
      intro: 'Raiders ride the avalanche down the mountain under a red moon. They strike first and every unit hits harder.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U02', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('<b>Blood Moon</b> and a raider already out, and they move first. Block its lane right away.') },
    { id: '2-4', name: 'The Ice Caverns', twist: 'Starfall: draw 3 a turn · traps everywhere', ev: 'starfall', hp: [20, 20], first: 0, seed: 304, bot: CC_CAMP_DECKS.traps,
      intro: 'Glittering caverns under the glacier. Starlight gives both sides three cards a turn, and the hunters have set traps in two lanes already.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'DEF-T02', 2); ccCampUnit(G, 1, 'DEF-U08', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('<b>Starfall</b>: three cards a turn. Traps wait in the left and right lanes: send something cheap in first.') },
    { id: '2-5', name: 'The Frost Witch', twist: 'Mid-chapter boss: stuns, curses and snares', boss: true, hp: [20, 16], first: 1, seed: 305, bot: CC_CAMP_DECKS.frost,
      intro: 'The Frost Witch herself. Her apprentices curse and stun from the back row, and snares lie in two lanes. She moves first.',
      setup: G => { ccCampUnit(G, 1, 'CON-U02', 1, 1); ccCampUnit(G, 1, 'CON-U03', 0, 1); ccCampUnit(G, 1, 'DEF-U07', 1, 0); ccCampTrap(G, 1, 'CON-T02', 1); ccCampTrap(G, 1, 'MOB-T02', 2); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 16, t: 'Win by round 16' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('The Witch and the Hexer attack from the back row; the Stonewall shields them. Hex Field in the middle stuns what walks in.') },
    { id: '2-6', name: 'Sanctuary Peak', twist: 'Sacred Ground: units enter with Armor · healers', ev: 'sanctuary', hp: [20, 10], first: 0, seed: 306, bot: CC_CAMP_DECKS.holy,
      intro: 'A mountain shrine whose priests heal everything they touch. On sacred ground every unit enters with Armor 1.',
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('<b>Sacred Ground</b>: every unit has Armor 1, so small hits barely scratch. Kill the healers first or they undo your damage.') },
    { id: '2-7', name: 'Storm Riders', twist: 'Rainstorm: 5 AP · assassins strike first', ev: 'rain', hp: [20, 22], first: 1, seed: 307, bot: CC_CAMP_DECKS.storm,
      intro: 'Riders come out of the storm clouds with 5 AP a turn each. A Phantom and a Shadowblade lead the charge; they move first and love to stab the back row.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U06', 1, 0); ccCampUnit(G, 1, 'MOB-U07', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 14, t: 'Win by round 14' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn and the bot goes first. Phantoms hit your back row first, so don\'t leave Ranged units alone.') },
    { id: '2-8', name: 'The Iron Glacier', twist: 'Scorching Sun on the ice · you start on 18 HP', ev: 'heat', hp: [18, 14], first: 0, seed: 308, bot: CC_CAMP_DECKS.fort,
      intro: 'A fort carved into the glacier. A strange sun melts the ice: Overtime from round 12, and you arrive worn out.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 0, 0); ccCampUnit(G, 1, 'DEF-U07', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'round', n: 16, t: 'Win by round 16' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }],
      tips: ccOne('<b>Scorching Sun</b>: Overtime from round 12. The fort is tough and you start on 18 HP: strike the open middle lane early.') },
    { id: '2-9', name: 'The Crystal Gate', twist: 'Arcane Surge · battle mages strike first', ev: 'surge', hp: [20, 15], first: 1, seed: 309, bot: CC_CAMP_DECKS.arcane,
      intro: 'The gate to the summit is guarded by battle mages whose spells hit harder in the surge, with a Counter Trap in the middle.',
      setup: G => { ccCampUnit(G, 1, 'CON-U04', 2, 1); ccCampTrap(G, 1, 'DEF-T01', 1); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage. A Stormcaller waits unguarded in the right back row: hit it there before it starts firing.') },
    { id: '2-10', name: 'The Frost Titan', twist: 'Final boss: a champion, a wall and two traps', boss: true, hp: [20, 18], first: 1, seed: 310, bot: CC_CAMP_DECKS.titan,
      intro: 'On the summit the Frost Titan waits with a Champion and a Bulwark, traps in two lanes and 18 HP. He moves first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampUnit(G, 1, 'DEF-U04', 0, 0); ccCampTrap(G, 1, 'DEF-T02', 1); ccCampTrap(G, 1, 'CON-T02', 0); },
      stars: [{ k: 'win', t: 'Clear the stage' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Frost Titan: a Champion and a Bulwark up front, Thorns in the middle and a Hex Field on the left, and he moves first. This is the hardest fight yet.') }
  ]
}];
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
   bottom; on portrait screens a swaying line instead of the zigzag) */
const cmpLin = (k, a, b) => Array.from({ length: k }, (_, i) => k > 1 ? a + (b - a) * i / (k - 1) : (a + b) / 2);
function cmpLayout(n, mode, path) {   // mode 'h' tall landscape screens, 'v' portrait, 'q' short landscape screens (flat rows: the field is short)
  if (mode === 'v') return Array.from({ length: n }, (_, i) => [path === 'climb' ? [22, 52, 82, 52][i % 4] : i % 2 ? 74 : 26, n > 1 ? 6 + i * 88 / (n - 1) : 50]);
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
function closeCampaign() { if (cmpEl) { cmpEl.remove(); cmpEl = null; } renderMenu(); }
/* the stage to show when a chapter tab is picked: its first open stage without a star, else its last open one, else its first */
function cmpPickIn(ch) { const L = ch.stages.map(s => ({ ...s, ch })), op = L.filter(ccCampOpen); return (op.find(s => !ccCampHave(s.id)[0]) || op[op.length - 1] || L[0]).id; }
function renderCampaign() {
  if (!cmpEl) return;
  const st = ccCampStage(cmpSel) || ccCampStages()[0], ch = st.ch, n = ccCampChN(ch), max = ccCampChMax(ch), miles = ccCampMiles(ch), ready = ccCampClaimable(ch);
  const allGot = miles.every(m => m.got);
  const done = Math.min(ch.stages.length - 1, ch.stages.filter(s => ccCampHave(s.id)[0]).length);   // the bright path reaches the first stage not cleared yet
  const nS = ch.stages.length, PH = cmpLayout(nS, 'h', ch.path), PV = cmpLayout(nS, 'v', ch.path), PQ = cmpLayout(nS, 'q', ch.path), wp = MEDIA.get('camp:bg:' + ch.id);
  const node = (s, i) => { const S2 = { ...s, ch }, op = ccCampOpen(S2), have = ccCampHave(s.id), k = have.filter(Boolean).length, [x, y] = PH[i], [px, py] = PV[i], [qx, qy] = PQ[i];
    return `<button class="cmp-node ${op ? k === 3 ? 'perfect' : k ? 'clear' : 'new' : 'locked'} ${s.id === st.id ? 'sel' : ''} ${s.boss ? 'boss' : ''}" data-stage="${s.id}" style="--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--px:${px.toFixed(1)}%;--py:${py.toFixed(1)}%;--qx:${qx.toFixed(1)}%;--qy:${qy.toFixed(1)}%" ${op ? '' : 'aria-disabled="true"'}>
      <span class="cmp-med">${op ? `<b>${s.id}</b>` : icon('lock')}${s.boss ? `<i class="cmp-crown">${icon('crown')}</i>` : ''}${op && !k ? '<i class="cmp-newtag">New</i>' : ''}</span>
      ${ccStars(have)}<span class="cmp-nm">${esc(s.name)}</span></button>`; };
  const tab = c => { const op = ccCampChOpen(c), dot = ccCampClaimable(c) || c.stages.some(s => ccCampOpen({ ...s, ch: c }) && !ccCampHave(s.id)[0]);
    return `<button class="cmp-cht ${c.id === ch.id ? 'on' : ''} ${op ? '' : 'lock'}" data-ch="${c.id}">${op ? '' : icon('lock')}Chapter ${c.no} · ${esc(c.sub)}${dot && c.id !== ch.id ? '<i class="cmp-dot"></i>' : ''}</button>`; };
  cmpEl.innerHTML = `<div class="cmp-bg"><i class="cmp-moon"></i><i class="cmp-mist"></i></div>
    <header class="cmp-head"><div class="inv-title"><span class="inv-badge">${icon('map')}</span><h2 class="ts">Campaign</h2></div>
      <div class="cmp-chtabs">${CC_CAMP.map(tab).join('')}<button class="cmp-cht soon" disabled>${icon('lock')}Chapter ${CC_CAMP.length} · Coming soon</button></div>
      <span class="cmp-sp"></span>
      <button class="btn ghost cmp-towerb" id="cmpTower">${icon('tower')}Tower${ccTowerReady() ? '<i class="cmp-dot"></i>' : ''}</button><button class="btn ghost" id="cmpDeck">${CC_IC}Deck</button><button class="btn ghost" id="cmpQuick">${icon('bolt')}Quick match</button>
      <button class="inv-x" id="cmpClose" aria-label="Close">${icon('close')}</button></header>
    <section class="cmp-map ${wp ? 'has-wp' : ''} ${nS > 6 ? 'many' : ''} path-${ch.path || 'wave'}" style="--cmpn:${nS}">${wp ? `<img class="cmp-wp" src="${wp}" alt=""><i class="cmp-wpshade"></i>` : ''}
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
  cmpEl.querySelector('#cmpQuick').onclick = () => openQuickMatch();
  cmpEl.querySelector('#cmpTower').onclick = () => openTower();
  cmpEl.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { cmpSel = b.dataset.stage; renderCampaign(); });
  cmpEl.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { const c = CC_CAMP.find(x => x.id === b.dataset.ch); if (c && c.id !== ch.id) { cmpSel = cmpPickIn(c); renderCampaign(); } });
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
  return `<div class="ccm-endb"><button class="btn ghost" id="ccCampRetry">${icon('back')}Retry</button>${nx ? `<button class="btn gold" id="ccCampNext">${T ? `${icon('up')}Climb to floor ${nx.no}` : `Next: ${esc(nx.id)}`}</button>` : ''}<button class="btn ${nx ? 'ghost' : 'gold'}" id="ccCampMap">${icon(T ? 'tower' : 'map')}${T ? 'Tower' : 'Campaign'}</button></div>`;
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
