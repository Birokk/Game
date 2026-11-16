/* ---------- Card Clash: the 80 cards, the rules engine and the bot ----------
   Follows the owner's "Card Clash — Full Mechanical Game Design Document v2.1".
   The engine is a pure state machine: ccCreateMatch builds a match, ccApply(G, action) validates and resolves one action,
   ccLegal(G) lists every legal action of the active player. The UI (45-clash-ui.js) only renders G and submits actions.
   Same seed + same actions = same match (the shuffles use the match's own seeded RNG, G.rng). */

const CC_STYLES = { aggression: ['Aggression', '#ff6b5a'], defense: ['Defense', '#5aa9ff'], control: ['Control', '#b07cff'], mobility: ['Mobility', '#3fd6a0'], support: ['Support', '#ffc95a'] };
const CC_TYPES = { unit: 'Unit', spell: 'Spell', trap: 'Trap', equipment: 'Equipment' };
/* [id, name, ap, atk, hp, range, rules text]; spells / traps / equipment have no atk / hp / range */
const CC_RAW = [
  ['AGG-U01', 'Swordsman', 1, 2, 3, 'melee', 'Deals +1 damage when attacking an enemy unit (not the enemy player).'],
  ['AGG-U02', 'Raider', 2, 3, 3, 'melee', 'When this unit attacks the enemy player directly, it deals +1 additional damage.'],
  ['AGG-U03', 'Berserker', 3, 4, 3, 'melee', 'The first time this unit survives taking damage, permanently gain +1 ATK.'],
  ['AGG-U04', 'Duelist', 2, 3, 3, 'melee', 'When this unit attacks another unit, reduce the retaliation damage it takes by 1.'],
  ['AGG-U05', 'Lancer', 2, 3, 4, 'melee', 'Attacks from this unit ignore 1 point of the target’s Armor.'],
  ['AGG-U06', 'Warhound', 1, 2, 2, 'melee', 'Haste: may attack on the turn it is summoned.'],
  ['AGG-U07', 'Warbringer', 3, 4, 4, 'melee', 'No special ability. A sturdy, high-attack frontline unit.'],
  ['AGG-U08', 'Champion', 3, 5, 3, 'melee', 'No special ability. A high-damage frontline unit with relatively low HP.'],
  ['AGG-S01', 'Battle Cry', 1, 0, 0, '', 'Give one friendly unit +2 permanent ATK.'],
  ['AGG-S02', 'Fireball', 2, 0, 0, '', 'Deal 4 spell damage to any enemy unit.'],
  ['AGG-S03', 'Reckless Charge', 1, 0, 0, '', 'One friendly unit summoned this turn may attack this turn if it has not already attacked.'],
  ['AGG-S04', 'Finishing Blow', 3, 0, 0, '', 'Deal 5 spell damage to any enemy unit.'],
  ['AGG-T01', 'Retaliation', 1, 0, 0, '', 'When an enemy unit declares an attack in this lane, deal 2 damage to the attacker before combat. If it dies, the attack is canceled.'],
  ['AGG-T02', 'Flare Trap', 1, 0, 0, '', 'When an enemy unit enters this lane by summoning or moving, deal 2 damage to that unit.'],
  ['AGG-E01', 'Sharp Blade', 1, 0, 0, '', 'Equipped unit gains +1 permanent ATK.'],
  ['AGG-E02', 'Spiked Gloves', 2, 0, 0, '', 'Equipped unit gains +2 permanent ATK.'],
  ['DEF-U01', 'Knight', 2, 3, 5, 'melee', 'No special ability. A solid frontline defender.'],
  ['DEF-U02', 'Guardian', 3, 2, 7, 'melee', 'Armor 1: reduces each incoming attack, spell or damage-trap hit by 1.'],
  ['DEF-U03', 'Shieldbearer', 1, 2, 4, 'melee', 'No special ability. An inexpensive, durable frontline unit.'],
  ['DEF-U04', 'Bulwark', 3, 3, 8, 'melee', 'No special ability. A durable frontline fighter.'],
  ['DEF-U05', 'Fortress Golem', 3, 2, 9, 'melee', 'No special ability. Very high HP but low ATK.'],
  ['DEF-U06', 'Paladin', 3, 2, 6, 'melee', 'At the start of each of your turns, restore 1 HP to this unit.'],
  ['DEF-U07', 'Stonewall', 2, 2, 5, 'melee', 'This unit takes 1 less damage from enemy spells, in addition to Armor if any.'],
  ['DEF-U08', 'Protector', 2, 2, 4, 'melee', 'Armor 1: reduces each incoming attack, spell or damage-trap hit by 1.'],
  ['DEF-S01', 'Reinforce', 1, 0, 0, '', 'Give one friendly unit +3 maximum HP and restore that same 3 HP immediately.'],
  ['DEF-S02', 'Healing Light', 2, 0, 0, '', 'Heal one damaged friendly unit 2 HP, OR heal your player up to 1 HP (player-healing cap).'],
  ['DEF-S03', 'Iron Skin', 1, 0, 0, '', 'Give one friendly unit Armor 1. Armor never stacks above 1.'],
  ['DEF-S04', 'Rally Wall', 2, 0, 0, '', 'Restore 2 HP to each damaged friendly unit on your board.'],
  ['DEF-T01', 'Counter Trap', 1, 0, 0, '', 'When an enemy spell directly targets a unit in this lane, cancel the entire spell. Does not stop board-wide spells.'],
  ['DEF-T02', 'Thorns', 2, 0, 0, '', 'When an enemy unit declares an attack in this lane, deal 3 damage to the attacker before combat. If it dies, the attack is canceled.'],
  ['DEF-E01', 'Reinforced Armor', 1, 0, 0, '', 'Equipped unit gains +2 maximum HP and immediately heals 2 HP.'],
  ['DEF-E02', 'Heavy Plate', 2, 0, 0, '', 'Equipped unit gains +3 maximum HP and immediately heals 3 HP.'],
  ['CON-U01', 'Mage', 2, 2, 4, 'ranged', 'Ranged: can attack from the back row without ordinary melee retaliation.'],
  ['CON-U02', 'Frost Witch', 3, 3, 4, 'ranged', 'When this unit damages a surviving enemy unit with an attack, Stun it for its next turn.'],
  ['CON-U03', 'Hexer', 2, 2, 4, 'ranged', 'When this unit damages a surviving enemy unit with an attack, give it a permanent −1 ATK.'],
  ['CON-U04', 'Stormcaller', 3, 3, 4, 'ranged', 'No special ability. A powerful ranged unit.'],
  ['CON-U05', 'Seer', 1, 1, 3, 'ranged', 'When summoned, look at the top 2 cards of your draw deck; put one into your hand and the other back on top.'],
  ['CON-U06', 'Alchemist', 2, 2, 4, 'ranged', 'When this unit damages a surviving enemy unit with an attack, Poison it for 2 of its turns.'],
  ['CON-U07', 'Trickster', 2, 2, 3, 'melee', 'Free Move: its once-per-turn move costs 0 AP. Dash applies after moving.'],
  ['CON-U08', 'Spellweaver', 3, 2, 5, 'ranged', 'Your unit-damaging spells deal +1 damage per friendly Spellweaver in play (max +2).'],
  ['CON-S01', 'Poison Cloud', 2, 0, 0, '', 'Poison one enemy unit for 3 of its turns. Poison deals 2 true damage per tick.'],
  ['CON-S02', 'Freeze', 1, 0, 0, '', 'Stun one enemy unit for its next turn, preventing its attack but not its movement.'],
  ['CON-S03', 'Disarm', 1, 0, 0, '', 'Permanently reduce the ATK of one enemy unit by 2 (minimum 1 ATK).'],
  ['CON-S04', 'Arcane Burst', 3, 0, 0, '', 'Deal 3 spell damage to each enemy front-row unit across all three lanes.'],
  ['CON-T01', 'Silence Rune', 2, 0, 0, '', 'Cancel the first enemy spell that targets a unit in this lane OR hits a unit here as part of a board-wide spell.'],
  ['CON-T02', 'Hex Field', 1, 0, 0, '', 'When an enemy unit enters this lane by summoning or moving, Stun it.'],
  ['CON-E01', 'Arcane Wand', 1, 0, 0, '', 'Equip a Ranged unit: +1 permanent ATK. Its attacks ignore 1 Armor on the target.'],
  ['CON-E02', 'Poison Blade', 2, 0, 0, '', 'The equipped unit’s attacks Poison enemy units that survive taking damage, for 2 turns.'],
  ['MOB-U01', 'Assassin', 3, 4, 3, 'melee', 'Free Move: its once-per-turn move costs 0 AP. Dash applies after moving.'],
  ['MOB-U02', 'Scout', 1, 2, 2, 'melee', 'Haste: may attack on the turn it is summoned.'],
  ['MOB-U03', 'Rogue', 2, 3, 3, 'melee', 'Free Move: its once-per-turn move costs 0 AP. Dash applies after moving.'],
  ['MOB-U04', 'Archer', 2, 3, 3, 'ranged', 'Ranged: can attack from the back row without ordinary melee retaliation.'],
  ['MOB-U05', 'Skirmisher', 2, 3, 3, 'melee', 'Haste: may attack on the turn it is summoned.'],
  ['MOB-U06', 'Phantom', 3, 4, 3, 'melee', 'Flank: when attacking, targets the enemy back-row unit before the front-row unit.'],
  ['MOB-U07', 'Shadowblade', 3, 4, 3, 'melee', 'Haste: may attack on the turn it is summoned.'],
  ['MOB-U08', 'Runner', 1, 2, 2, 'melee', 'Free Move: its once-per-turn move costs 0 AP. Dash applies after moving.'],
  ['MOB-S01', 'Swap', 1, 0, 0, '', 'Swap the positions of any two friendly units, even across lanes or rows. Both count as moved.'],
  ['MOB-S02', 'Sidestep', 1, 0, 0, '', 'Move one friendly unit to an empty adjacent slot in its row or the other row of its lane. Counts as moving.'],
  ['MOB-S03', 'Backstab', 2, 0, 0, '', 'Deal 4 spell damage to any enemy back-row unit, ignoring front-row guarding.'],
  ['MOB-S04', 'Quick Escape', 1, 0, 0, '', 'Restore 3 HP to one damaged friendly unit.'],
  ['MOB-T01', 'Hidden Spikes', 1, 0, 0, '', 'When an enemy unit enters this lane by summoning or moving, deal 2 damage to that unit.'],
  ['MOB-T02', 'Net Trap', 2, 0, 0, '', 'When an enemy unit enters this lane by summoning or moving, Stun it for its next turn.'],
  ['MOB-E01', 'Light Boots', 1, 0, 0, '', 'Equipped unit’s once-per-turn move costs 0 AP. This grants Dash.'],
  ['MOB-E02', 'Dagger', 1, 0, 0, '', 'Equipped unit gains +1 permanent ATK. Once each turn, after it attacks, it may move for 0 AP if it has not moved yet.'],
  ['SUP-U01', 'Battle Medic', 2, 1, 3, 'ranged', 'Start of your turn: heal 1 HP to the most damaged other friendly unit in this lane.'],
  ['SUP-U02', 'Priest', 2, 1, 4, 'ranged', 'Start of your turn: heal 1 HP to the most damaged other friendly unit in this lane.'],
  ['SUP-U03', 'Bannerbearer', 2, 1, 4, 'melee', 'Other friendly units in the same lane gain +1 ATK while this unit is present.'],
  ['SUP-U04', 'Druid', 3, 2, 4, 'ranged', 'Start of your turn: heal 1 HP to the most damaged friendly unit anywhere on your board.'],
  ['SUP-U05', 'Herbalist', 1, 1, 2, 'ranged', 'When summoned, restore 2 HP to the most damaged other friendly unit.'],
  ['SUP-U06', 'Commander', 3, 2, 5, 'melee', 'Other friendly units in the same lane gain +1 ATK while this unit is present.'],
  ['SUP-U07', 'Scribe', 1, 1, 3, 'ranged', 'When summoned, draw 1 card.'],
  ['SUP-U08', 'Sentinel', 2, 2, 4, 'ranged', 'Ranged: can attack from the back row without ordinary melee retaliation.'],
  ['SUP-S01', 'Quick Thinking', 2, 0, 0, '', 'Deal 3 spell damage to any enemy unit, then draw 1 card.'],
  ['SUP-S02', 'Healing Potion', 2, 0, 0, '', 'Restore player HP, up to the cap of 1 HP per player per round.'],
  ['SUP-S03', 'Strengthen', 1, 0, 0, '', 'Give one friendly unit +1 permanent ATK and +1 maximum / current HP.'],
  ['SUP-S04', 'Recycle', 1, 0, 0, '', 'Draw 2 cards.'],
  ['SUP-T01', 'Healing Spring', 1, 0, 0, '', 'When an enemy unit declares an attack in this lane, heal the most damaged friendly unit in this lane by 2 HP before combat.'],
  ['SUP-T02', 'Guardian Angel', 2, 0, 0, '', 'When an enemy unit declares an attack in this lane, prevent the next 3 damage to your defending unit. If the lane is empty, heal your player up to 1 HP.'],
  ['SUP-E01', 'Healing Charm', 1, 0, 0, '', 'At the start of your turns, this unit restores 1 HP to itself.'],
  ['SUP-E02', 'Battle Standard', 2, 0, 0, '', 'Equipped unit gains +1 permanent ATK. The other friendly unit in its lane gains +1 ATK while this stays equipped.']
];
const CC_STYLE_OF = { AGG: 'aggression', DEF: 'defense', CON: 'control', MOB: 'mobility', SUP: 'support' };
const CC_TYPE_OF = { U: 'unit', S: 'spell', T: 'trap', E: 'equipment' };
const CC_CARDS = CC_RAW.map(([id, name, ap, atk, hp, range, text]) => ({ id, name, ap, atk, hp, range, text, style: CC_STYLE_OF[id.slice(0, 3)], type: CC_TYPE_OF[id[4]] }));
const CC_DEF = Object.fromEntries(CC_CARDS.map(c => [c.id, c]));
const ccDef = id => CC_DEF[id];
const CC_HASTE = new Set(['AGG-U06', 'MOB-U02', 'MOB-U05', 'MOB-U07']);
const CC_FREEMOVE = new Set(['CON-U07', 'MOB-U01', 'MOB-U03', 'MOB-U08']);
const CC_FLANK = new Set(['MOB-U06']);
const CC_ARMORED = new Set(['DEF-U02', 'DEF-U08']);
const CC_BANNER = new Set(['SUP-U03', 'SUP-U06']);
const CC_ENTRY_TRAPS = new Set(['AGG-T02', 'MOB-T01', 'CON-T02', 'MOB-T02']);
const CC_ATTACK_TRAPS = new Set(['AGG-T01', 'DEF-T02', 'SUP-T01', 'SUP-T02']);
/* how each spell targets: enemy / enemyBack / friend / friendNew / friendDamaged / healAny / hero / none / two (Swap) / side (Sidestep) */
const CC_SPELL_T = {
  'AGG-S01': 'friend', 'AGG-S02': 'enemy', 'AGG-S03': 'friendNew', 'AGG-S04': 'enemy',
  'DEF-S01': 'friend', 'DEF-S02': 'healAny', 'DEF-S03': 'friend', 'DEF-S04': 'none',
  'CON-S01': 'enemy', 'CON-S02': 'enemy', 'CON-S03': 'enemy', 'CON-S04': 'none',
  'MOB-S01': 'two', 'MOB-S02': 'side', 'MOB-S03': 'enemyBack', 'MOB-S04': 'friendDamaged',
  'SUP-S01': 'enemy', 'SUP-S02': 'hero', 'SUP-S03': 'friend', 'SUP-S04': 'none'
};
const CC_CFG = { hp: 20, deck: 30, copies: 2, hand0: 5, handMax: 8, ap: 4, ap2: 6, overtime: 20, rounds: 40, overflow: 2 };
/* battle events: a match can start under one of these (decided by the seed, so a replay gets the same one); G.ev = key or null.
   The engine reads them where they apply: AP and draw at the start of a turn, ATK in ccAtk, spell damage, armor on summon,
   move cost, the Overtime round. */
const CC_EVENTS = {
  rain: { name: 'Rainstorm', short: '5 AP a turn', text: 'Rain feeds the leylines: both players get 5 AP every turn instead of 4 (7 instead of 6 on the second player\'s first turn).' },
  bloodmoon: { name: 'Blood Moon', short: 'Units +1 ATK', text: 'A red moon stirs every warrior: all units attack with +1 ATK.' },
  surge: { name: 'Arcane Surge', short: 'Spells +1 damage', text: 'Wild magic in the air: every spell deals 1 more damage.' },
  wind: { name: 'Tailwind', short: 'Free moves', text: 'A strong wind at everyone\'s back: moving a unit costs no AP (still once per unit each turn).' },
  starfall: { name: 'Starfall', short: 'Draw 3 a turn', text: 'Falling stars bring visions: both players draw 3 cards a turn instead of 2 (2 instead of 1 on the very first turn).' },
  sanctuary: { name: 'Sacred Ground', short: 'Units enter with Armor', text: 'Blessed earth shields the brave: every unit enters the board with Armor 1.' },
  heat: { name: 'Scorching Sun', short: 'Overtime from R12', text: 'The heat wears everyone down: Overtime starts in round 12 instead of round 20.' }
};
const CC_EV_KEYS = Object.keys(CC_EVENTS), CC_EV_CHANCE = .6;
/* the seed decides: 60% of matches get an event, each event equally likely (a hash of the seed, the match RNG is untouched) */
function ccPickEvent(seed) {
  const h = s => { s = Math.imul((s ^ s >>> 16) >>> 0, 0x45D9F3B); s = Math.imul((s ^ s >>> 16) >>> 0, 0x45D9F3B); return ((s ^ s >>> 16) >>> 0) / 4294967296; };
  const a = h((seed >>> 0) ^ 0x5EED1E57), b = h(((seed >>> 0) + 0x9E3779B9) >>> 0);
  return a < CC_EV_CHANCE ? CC_EV_KEYS[Math.floor(b * CC_EV_KEYS.length)] : null;
}
const ccOT = G => G.ev === 'heat' ? 12 : CC_CFG.overtime;
const ccApBase = (G, p) => (G.round === 1 && p !== G.first ? CC_CFG.ap2 : CC_CFG.ap) + (G.ev === 'rain' ? 1 : 0) + (G.apB ? G.apB[p] : 0);
const ccRounds = G => G.maxRound || CC_CFG.rounds;   // the round limit (the guild boss flies off sooner)
/* the three ready-made starter decks from the design document (15 names × 2) */
const CC_N2ID = Object.fromEntries(CC_CARDS.map(c => [c.name, c.id]));
const ccPreset = names => names.flatMap(n => [CC_N2ID[n], CC_N2ID[n]]);
const CC_PRESETS = [
  { id: 'p-balanced', name: 'Balanced Deck', cards: ccPreset(['Swordsman', 'Knight', 'Guardian', 'Archer', 'Mage', 'Frost Witch', 'Battle Medic', 'Commander', 'Fireball', 'Reinforce', 'Freeze', 'Quick Thinking', 'Retaliation', 'Sharp Blade', 'Light Boots']) },
  { id: 'p-rush', name: 'Rush Deck', cards: ccPreset(['Swordsman', 'Raider', 'Warhound', 'Berserker', 'Champion', 'Scout', 'Rogue', 'Assassin', 'Fireball', 'Battle Cry', 'Reckless Charge', 'Backstab', 'Flare Trap', 'Sharp Blade', 'Dagger']) },
  { id: 'p-defensive', name: 'Defensive Deck', cards: ccPreset(['Knight', 'Guardian', 'Shieldbearer', 'Stonewall', 'Paladin', 'Battle Medic', 'Priest', 'Druid', 'Reinforce', 'Iron Skin', 'Healing Light', 'Rally Wall', 'Counter Trap', 'Reinforced Armor', 'Healing Charm']) }
];

function ccValidateDeck(ids) {
  const errs = [], n = {};
  if (!Array.isArray(ids)) return { ok: false, errs: ['Not a card list'] };
  if (ids.length !== CC_CFG.deck) errs.push(`The deck has ${ids.length} cards; it needs exactly ${CC_CFG.deck}`);
  for (const id of ids) { if (!CC_DEF[id]) { errs.push(`Unknown card ID ${id}`); continue; } n[id] = (n[id] || 0) + 1; }
  for (const id in n) if (n[id] > CC_CFG.copies) errs.push(`${CC_DEF[id].name}: ${n[id]} copies (max ${CC_CFG.copies})`);
  return { ok: !errs.length, errs };
}

/* ---- seeded RNG (stored as a number in the state, so a cloned state keeps its own stream) ---- */
function ccRand(G) { G.rng = (G.rng + 0x6D2B79F5) >>> 0; let t = G.rng; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function ccShuffle(G, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(ccRand(G) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* opts (all optional; the campaign uses them): ev = battle event key or null, first = 0 | 1 (else the seed decides),
   hp = [your HP, bot HP] at the start, order = keep both decks in the given order (deck[0] is drawn first) instead of
   shuffling, setup(G) = runs after the opening hands, before the first turn (place units / traps); the guild boss also
   uses rounds = an earlier round limit (with limitText = why it ended), apB = [your extra AP, bot extra AP] every turn,
   hitX = [x, x] damage multiplier on each hero (the dragon takes ×3), hpWin = at the round limit the hero with more HP wins
   (Quick match Blitz) instead of a draw */
function ccCreateMatch(seed, deckA, deckB, names, opts = {}) {
  const G = { ev: 'ev' in opts ? opts.ev : ccPickEvent(seed), seed: seed >>> 0, rng: seed >>> 0, round: 1, turnNo: 0, active: 0, first: 0, phase: 'main', winner: null, reason: '', log: [], fx: [], seq: 0, iid: 0, sid: 0, pending: null, names: names || ['You', 'Bot'], started: Date.now(), maxRound: opts.rounds || 0, limitText: opts.limitText || '', apB: opts.apB || null, hitX: opts.hitX || null, hpWin: !!opts.hpWin };
  G.players = [deckA, deckB].map((d, p) => ({ hp: opts.hp ? opts.hp[p] : CC_CFG.hp, ap: 0, hand: [], deck: d.map(id => ({ iid: 'c' + (++G.iid), id })), disc: [], board: [[null, null], [null, null], [null, null]], traps: [null, null, null], healed: 0, shield: 0, p }));
  G.players.forEach(P => P.max = Math.max(CC_CFG.hp, P.hp));   // leader skills heal the hero up to this
  G.lead = ccLeadInit(opts.lead || (typeof ccLeadPass !== 'undefined' ? ccLeadPass.v : null), [deckA, deckB]);
  if (G.lead) G.lead.forEach((L, p) => { if (L && L.hpB) { G.players[p].hp += L.hpB; G.players[p].max += L.hpB; } });   // build bonus: hero HP (bond, Potential, gear)
  G.players.forEach(P => opts.order ? P.deck.reverse() : ccShuffle(G, P.deck));   // cards are drawn from the end of the array
  G.first = G.active = opts.first === 0 || opts.first === 1 ? opts.first : ccRand(G) < 0.5 ? 0 : 1;
  G.players.forEach((P, p) => ccDraw(G, p, CC_CFG.hand0, true));
  if (G.lead) G.lead.forEach((L, p) => { if (L && L.cards) ccDraw(G, p, L.cards, true); });   // build bonus: extra opening cards
  if (opts.setup) opts.setup(G);
  if (G.ev) ccLog(G, `Battle event: ${CC_EVENTS[G.ev].name} (${CC_EVENTS[G.ev].short})`, 'sys');
  ccLog(G, `${G.names[G.first]} goes first`, 'sys');
  ccBeginTurn(G);
  return G;
}

function ccLog(G, t, k, p) { G.log.push({ n: ++G.seq, t, k: k || '', p: p == null ? G.active : p }); if (G.log.length > 200) G.log.shift(); }
function ccFx(G, id, type, n) { G.fx.push({ id, type, n }); }
function ccUnits(G, p) { const out = [], B = G.players[p].board; for (let l = 0; l < 3; l++) for (let r = 0; r < 2; r++) if (B[l][r]) out.push(B[l][r]); return out; }
function ccFind(G, iid) { for (const p of [0, 1]) for (const u of ccUnits(G, p)) if (u.iid === iid) return u; return null; }
function ccMaxHp(u) { return ccDef(u.id).hp + Math.min(3, u.hpUp); }
/* permanent ATK: buffs cap at +2, debuffs at −2, never below 1 */
function ccPermAtk(u) { return Math.max(1, ccDef(u.id).atk + Math.min(2, u.up) - Math.min(2, u.down)); }
function ccAtk(G, u) {
  let a = ccPermAtk(u) + (u.tmp || 0);
  const o = G.players[u.owner].board[u.lane][1 - u.row];
  if (o && CC_BANNER.has(o.id)) a++;
  if (o && o.eq && o.eq.id === 'SUP-E02') a++;
  if (G.ev === 'bloodmoon') a++;
  if (G.active === u.owner && u.moved && ccDef(u.id).style === 'mobility' && (CC_HASTE.has(u.id) || CC_FREEMOVE.has(u.id) || CC_FLANK.has(u.id))) a++;
  return a;
}
const ccArm = u => Math.min(1, u.armor);
function ccAddMax(u, n) { const b = ccMaxHp(u); u.hpUp += n; u.hp += ccMaxHp(u) - b; }
function ccDamage(G, u, n) {
  if (n <= 0 || u.hp <= 0) return 0;
  u.hp -= n; ccFx(G, u.iid, 'dmg', n);
  ccEnrage(G, u);
  return n;
}
function ccEnrage(G, u) { if (u.hp > 0 && u.id === 'AGG-U03' && !u.enraged) { u.enraged = true; u.up++; ccLog(G, `Berserker survives and gains +1 ATK`, 'buff', u.owner); } }
function ccHeal(G, u, n) { const h = Math.min(n, ccMaxHp(u) - u.hp); if (h > 0) { u.hp += h; ccFx(G, u.iid, 'heal', h); } return Math.max(0, h); }
function ccHit(G, p, n) { if (n <= 0) return; if (G.hitX) n *= G.hitX[p]; const P = G.players[p]; if (P.shield > 0) { const s = Math.min(P.shield, n); P.shield -= s; n -= s; ccFx(G, 'hero' + p, 'shield', s); if (n <= 0) return; } const Ls = G.lead && G.lead[p]; if (Ls && Ls.last && !Ls.lastU && P.hp > 1 && P.hp - n <= 0) { Ls.lastU = true; n = P.hp - 1; ccLog(G, `Last stand: ${G.names[p]}’s hero holds on at 1 HP`, 'heal', p); ccFx(G, 'hero' + p, 'buff', 0); } P.hp -= n; ccFx(G, 'hero' + p, 'dmg', n); }   // hitX: the guild boss takes triple damage; shield: a leader skill's ward takes hits first   // hitX: the guild boss takes triple damage
function ccHealHero(G, p, n) { const P = G.players[p], h = Math.max(0, Math.min(n, 1 - P.healed, CC_CFG.hp - P.hp)); if (h > 0) { P.hp += h; P.healed += h; ccFx(G, 'hero' + p, 'heal', h); } return h; }
function ccStun(G, u) { if (u.owner === G.active) u.stunNow = true; else u.stunNext = true; ccFx(G, u.iid, 'stun', 0); }
function ccPoison(G, u, n) { u.poison = Math.max(u.poison, n); ccFx(G, u.iid, 'poison', n); }
/* automatic heals pick the most missing HP; ties: lane left → right, front → back, oldest summon */
function ccMostDamaged(list) { return list.filter(u => u.hp < ccMaxHp(u)).sort((a, b) => (ccMaxHp(b) - b.hp) - (ccMaxHp(a) - a.hp) || a.lane - b.lane || a.row - b.row || a.sid - b.sid)[0] || null; }
function ccSpellBonus(G, p) { return Math.min(2, ccUnits(G, p).filter(u => u.id === 'CON-U08').length); }
function ccDeaths(G) {
  for (const p of [0, 1]) { const P = G.players[p]; for (let l = 0; l < 3; l++) for (let r = 0; r < 2; r++) { const u = P.board[l][r]; if (u && u.hp <= 0) { P.board[l][r] = null; P.disc.push(u.card); if (u.eq) P.disc.push(u.eq); ccFx(G, u.iid, 'die', 0); ccLog(G, `${ccDef(u.id).name} is destroyed`, 'die', p); } } }
}
function ccCheck(G) {
  if (G.phase === 'over') return true;
  const a = G.players[0].hp <= 0, b = G.players[1].hp <= 0;
  if (!a && !b) return false;
  G.phase = 'over'; G.winner = a && b ? 'draw' : a ? 1 : 0; G.reason = a && b ? 'Both heroes fell at once' : `${G.names[a ? 0 : 1]}’s hero fell`;
  ccLog(G, G.winner === 'draw' ? 'Draw!' : `${G.names[G.winner]} wins!`, 'sys');
  return true;
}
function ccDraw(G, p, n, quiet) {
  const P = G.players[p];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) { if (!P.disc.length) { if (!quiet) ccLog(G, `${G.names[p]} has no cards left to draw`, 'sys', p); continue; } P.deck = ccShuffle(G, P.disc.splice(0)); ccLog(G, `${G.names[p]} shuffles the discard pile into a new deck`, 'sys', p); }
    const c = P.deck.pop();
    if (P.hand.length >= CC_CFG.handMax) { P.disc.push(c); ccLog(G, `${G.names[p]}’s hand is full: ${ccDef(c.id).name} is discarded`, 'sys', p); }
    else P.hand.push(c);
  }
}

function ccBeginTurn(G) {
  const p = G.active, P = G.players[p]; G.turnNo++;
  P.ap = ccApBase(G, p);
  const Ld = G.lead && G.lead[p]; if (Ld) { if (Ld.cd > 0) Ld.cd--; Ld.b = 0; ccLeadTurn(G, p, Ld); }   // leader skill cooldown, the attribute bond's once-a-turn bonuses, the build bonuses
  ccLog(G, `Round ${G.round} · ${G.names[p]}’s turn`, 'turn', p);
  for (const u of ccUnits(G, p)) { u.attacked = false; u.moveUsed = false; u.moved = false; u.rc = false; u.dagger = false; u.tmp = 0; u.stunNow = u.stunNext; u.stunNext = false; }
  for (const u of ccUnits(G, p)) if (u.poison > 0) { u.hp -= 2; u.poison--; ccFx(G, u.iid, 'dmg', 2); ccLog(G, `Poison deals 2 to ${ccDef(u.id).name}`, 'dmg', p); ccEnrage(G, u); }
  ccDeaths(G);
  for (const u of ccUnits(G, p)) {
    if (u.id === 'DEF-U06') ccHeal(G, u, 1);
    if (u.eq && u.eq.id === 'SUP-E01') ccHeal(G, u, 1);
    if (u.id === 'SUP-U01' || u.id === 'SUP-U02') { const t = ccMostDamaged([P.board[u.lane][1 - u.row]].filter(Boolean)); if (t) ccHeal(G, t, 1); }
    if (u.id === 'SUP-U04') { const t = ccMostDamaged(ccUnits(G, p)); if (t) ccHeal(G, t, 1); }
  }
  if (Ld && Ld.bond === 'support') { const t = ccMostDamaged(ccUnits(G, p)); if (t) ccHeal(G, t, 1); }   // Support bond: heal the most damaged unit 1
  if (G.round >= ccOT(G)) { const us = ccUnits(G, p); for (const u of us) { u.hp -= 1; ccFx(G, u.iid, 'dmg', 1); ccEnrage(G, u); } if (us.length) ccLog(G, `Overtime: each of ${G.names[p]}’s units loses 1 HP`, 'dmg', p); }
  ccDeaths(G);
  ccDraw(G, p, (G.round === 1 && p === G.first ? 1 : 2) + (G.ev === 'starfall' ? 1 : 0));
  ccCheck(G);
}
function ccEndTurn(G) {
  const p = G.active;
  for (const u of ccUnits(G, p)) { u.stunNow = false; u.rc = false; u.dagger = false; u.tmp = 0; }
  G.players[p].ap = 0;
  G.active = 1 - p;
  if (G.active === G.first) {
    G.round++; G.players.forEach(P => P.healed = 0);
    if (G.round > ccRounds(G)) { const h0 = G.players[0].hp, h1 = G.players[1].hp; G.phase = 'over'; G.winner = G.hpWin && h0 !== h1 ? (h0 > h1 ? 0 : 1) : 'draw'; G.reason = G.limitText || `Round ${ccRounds(G)} ended with both heroes alive`; ccLog(G, G.limitText ? 'Time is up' : 'Draw: round limit reached', 'sys'); return; }
  }
  ccBeginTurn(G);
}

function ccCanAttack(G, u) {
  if (!u || u.owner !== G.active || u.attacked || u.stunNow) return false;
  const d = ccDef(u.id);
  if (u.row === 1 && d.range !== 'ranged') return false;
  if (u.summoned === G.turnNo) { const dash = (CC_FREEMOVE.has(u.id) || (u.eq && u.eq.id === 'MOB-E01')) && u.moved; if (!CC_HASTE.has(u.id) && !u.rc && !dash) return false; }
  return true;
}
function ccMoveDests(G, u) { const B = G.players[u.owner].board, out = []; for (const [l, r] of [[u.lane - 1, u.row], [u.lane + 1, u.row], [u.lane, 1 - u.row]]) if (l >= 0 && l < 3 && !B[l][r]) out.push([l, r]); return out; }
function ccMoveCost0(u, G) { return G && G.ev === 'wind' || CC_FREEMOVE.has(u.id) || (u.eq && u.eq.id === 'MOB-E01') || u.dagger ? 0 : 1; }
function ccMoveCost(u, G) { return ccMoveCost0(u, G) && !(G && ccBondCan(G, u.owner, 'mobility', 8)) ? 1 : 0; }   // Mobility bond: the first move each turn is free
function ccPlace(G, u, l, r) { const B = G.players[u.owner].board; if (B[u.lane] && B[u.lane][u.row] === u) B[u.lane][u.row] = null; u.lane = l; u.row = r; B[l][r] = u; }
/* entry traps: the enemy's face-down trap in the lane the unit just entered */
function ccEnter(G, u) {
  const e = 1 - u.owner, E = G.players[e], t = E.traps[u.lane];
  if (!t || !CC_ENTRY_TRAPS.has(t.id) || u.hp <= 0) return;
  E.traps[u.lane] = null; E.disc.push(t); ccFx(G, 'trap' + e + u.lane, 'trap', 0);
  ccLog(G, `Trap! ${G.names[e]}’s ${ccDef(t.id).name} springs on ${ccDef(u.id).name}`, 'trap', e);
  if (t.id === 'AGG-T02' || t.id === 'MOB-T01') ccDamage(G, u, Math.max(0, 2 - ccArm(u)));
  else ccStun(G, u);
  ccDeaths(G);
}
const ccTakeHand = (P, iid) => { const i = P.hand.findIndex(c => c.iid === iid); return i < 0 ? null : P.hand.splice(i, 1)[0]; };

function ccSpellTargets(G, p, id) { return ccTgtKind(G, p, CC_SPELL_T[id]); }
function ccTgtKind(G, p, kind) {
  const mine = ccUnits(G, p), theirs = ccUnits(G, 1 - p), P = G.players[p], dmg = u => u.hp < ccMaxHp(u);
  switch (kind) {
    case 'enemyDamaged': return theirs.filter(dmg).map(u => ({ u: u.iid }));
    case 'friendMoved': return mine.filter(u => u.moveUsed).map(u => ({ u: u.iid }));
    case 'healAnyS': return [...mine.filter(dmg).map(u => ({ u: u.iid })), ...(P.hp < P.max ? [{ hero: p }] : [])];
    case 'enemy': return theirs.map(u => ({ u: u.iid }));
    case 'enemyBack': return theirs.filter(u => u.row === 1).map(u => ({ u: u.iid }));
    case 'friend': return mine.map(u => ({ u: u.iid }));
    case 'friendNew': return mine.filter(u => u.summoned === G.turnNo && !u.attacked && !u.rc).map(u => ({ u: u.iid }));
    case 'friendDamaged': return mine.filter(dmg).map(u => ({ u: u.iid }));
    case 'healAny': return [...mine.filter(dmg).map(u => ({ u: u.iid })), ...(P.hp < CC_CFG.hp ? [{ hero: p }] : [])];
    case 'hero': return P.hp < CC_CFG.hp ? [{ hero: p }] : [];
    case 'none': return [{}];
    case 'two': { const out = []; for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) out.push({ u: mine[i].iid, u2: mine[j].iid }); return out; }
    case 'side': return mine.flatMap(u => ccMoveDests(G, u).map(([l, r]) => ({ u: u.iid, lane: l, row: r })));
  }
  return [];
}
const ccSameT = (a, b) => (a.u || null) === (b.u || null) && (a.u2 || null) === (b.u2 || null) && (a.hero == null ? null : a.hero) === (b.hero == null ? null : b.hero) && (a.lane == null ? null : a.lane) === (b.lane == null ? null : b.lane) && (a.row == null ? null : a.row) === (b.row == null ? null : b.row);

/* ---- actions ---- */
function ccApply(G, a) {
  if (G.phase === 'over') return 'The match is over';
  if (G.phase === 'choice') { if (a.k !== 'choice') return 'Make your choice first'; return ccChoice(G, a); }
  const p = G.active, P = G.players[p];
  let err = null;
  if (a.k === 'end') { ccLog(G, `${G.names[p]} ends the turn`, 'turn', p); ccEndTurn(G); return null; }
  if (a.k === 'summon') err = ccSummon(G, P, a);
  else if (a.k === 'attack') err = ccAttack(G, P, a);
  else if (a.k === 'move') err = ccMove(G, P, a);
  else if (a.k === 'spell') err = ccSpell(G, P, a);
  else if (a.k === 'trap') err = ccSetTrap(G, P, a);
  else if (a.k === 'equip') err = ccEquip(G, P, a);
  else if (a.k === 'skill') err = ccSkill(G, P, a);
  else err = 'Unknown action';
  if (!err) { ccDeaths(G); ccCheck(G); }
  return err;
}
function ccSummon(G, P, a) {
  const c = P.hand.find(x => x.iid === a.iid), d = c && ccDef(c.id);
  if (!d || d.type !== 'unit') return 'Not a unit in your hand';
  if (!(a.lane >= 0 && a.lane < 3) || (a.row !== 0 && a.row !== 1)) return 'Pick a slot';
  if (P.board[a.lane][a.row]) return 'That slot is taken';
  if (a.row === 1 && d.range !== 'ranged') return 'Melee units go in the front row';
  if (P.ap < d.ap) return 'Not enough AP';
  P.ap -= d.ap; ccTakeHand(P, c.iid);
  const bondArm = ccBondCan(G, P.p, 'defense', 2) && ccBondUse(G, P.p, 2);   // Defense bond: the first unit each turn enters with Armor 1
  const u = { iid: c.iid, id: c.id, card: c, owner: P.p, lane: a.lane, row: a.row, hp: d.hp, hpUp: 0, up: 0, down: 0, armor: CC_ARMORED.has(c.id) || G.ev === 'sanctuary' || bondArm ? 1 : 0, tmp: 0, poison: 0, stunNow: false, stunNext: false, summoned: G.turnNo, attacked: false, moveUsed: false, moved: false, eq: null, enraged: false, rc: false, dagger: false, sid: ++G.sid };
  P.board[a.lane][a.row] = u; ccFx(G, u.iid, 'summon', 0);
  const Lf = G.lead && G.lead[P.p]; if (Lf && Lf.fu && !Lf.fuU) { Lf.fuU = true; ccAddMax(u, Lf.fu); }   // build bonus: the first unit each match gets +max HP
  ccLog(G, `${G.names[P.p]} summons ${d.name} (${d.ap} AP)`, 'play', P.p);
  ccEnter(G, u);
  if (u.hp <= 0) return null;
  if (u.id === 'SUP-U07') ccDraw(G, P.p, 1);
  if (u.id === 'SUP-U05') { const t = ccMostDamaged(ccUnits(G, P.p).filter(x => x !== u)); if (t) { ccHeal(G, t, 2); ccLog(G, `Herbalist heals ${ccDef(t.id).name}`, 'heal', P.p); } }
  if (u.id === 'CON-U05') {
    if (!P.deck.length && P.disc.length) { P.deck = ccShuffle(G, P.disc.splice(0)); ccLog(G, `${G.names[P.p]} shuffles the discard pile into a new deck`, 'sys', P.p); }
    if (P.deck.length === 1) ccDraw(G, P.p, 1);
    else if (P.deck.length > 1) { G.pending = { p: P.p, opts: [P.deck[P.deck.length - 1].iid, P.deck[P.deck.length - 2].iid] }; G.phase = 'choice'; }
  }
  return null;
}
function ccChoice(G, a) {
  const pc = G.pending, P = G.players[pc.p];
  if (!pc.opts.includes(a.pick)) return 'Pick one of the shown cards';
  const pick = P.deck.find(c => c.iid === a.pick), other = P.deck.find(c => c.iid === pc.opts.find(o => o !== a.pick));
  P.deck = P.deck.filter(c => c !== pick && c !== other);
  P.deck.push(other);
  if (P.hand.length >= CC_CFG.handMax) P.disc.push(pick); else P.hand.push(pick);
  ccLog(G, `Seer: ${G.names[pc.p]} takes a card and puts the other back on top`, 'play', pc.p);
  G.pending = null; G.phase = 'main';
  return null;
}
function ccAttack(G, P, a) {
  const u = ccFind(G, a.u);
  if (!u || u.owner !== P.p) return 'Pick one of your units';
  if (!ccCanAttack(G, u)) return 'This unit can’t attack now';
  if (P.ap < 1) return 'Not enough AP';
  P.ap -= 1; u.attacked = true;
  const e = 1 - P.p, E = G.players[e], d = ccDef(u.id), nm = d.name;
  let angel = 0;
  const t = E.traps[u.lane];
  if (t && CC_ATTACK_TRAPS.has(t.id)) {
    E.traps[u.lane] = null; E.disc.push(t); ccFx(G, 'trap' + e + u.lane, 'trap', 0);
    ccLog(G, `Trap! ${G.names[e]}’s ${ccDef(t.id).name} triggers`, 'trap', e);
    if (t.id === 'AGG-T01') ccDamage(G, u, Math.max(0, 2 - ccArm(u)));
    else if (t.id === 'DEF-T02') ccDamage(G, u, Math.max(0, 3 - ccArm(u)));
    else if (t.id === 'SUP-T01') { const h = ccMostDamaged(E.board[u.lane].filter(Boolean)); if (h) ccHeal(G, h, 2); }
    else if (t.id === 'SUP-T02') { if (E.board[u.lane].some(Boolean)) angel = 3; else ccHealHero(G, e, 1); }
    ccDeaths(G);
    if (u.hp <= 0) { ccLog(G, `${nm}’s attack is canceled`, 'sys', P.p); return null; }
  }
  const L = E.board[u.lane], tgt = CC_FLANK.has(u.id) ? (L[1] || L[0]) : (L[0] || L[1]);
  ccFx(G, u.iid, 'attack', 0);
  const bz = ccBondCan(G, P.p, 'aggression', 1) && ccBondUse(G, P.p, 1) ? 1 : 0;   // Aggression bond: the first attack each turn deals +1
  if (!tgt) { const dmg = ccAtk(G, u) + bz + (u.id === 'AGG-U02' ? 1 : 0); ccHit(G, e, dmg); ccLog(G, `${nm} hits ${G.names[e]} for ${dmg}`, 'dmg', P.p); return null; }
  const ign = (u.id === 'AGG-U05' ? 1 : 0) + (u.eq && u.eq.id === 'CON-E01' ? 1 : 0);
  let dmg = Math.max(0, ccAtk(G, u) + bz + (u.id === 'AGG-U01' ? 1 : 0) - Math.max(0, ccArm(tgt) - ign));
  if (angel) { const pr = Math.min(angel, dmg); dmg -= pr; if (pr) ccLog(G, `Guardian Angel prevents ${pr} damage`, 'heal', e); }
  let ret = ccAtk(G, tgt);
  if (d.range === 'ranged' && u.row === 1 && ccDef(tgt.id).range === 'melee') ret = 0;
  if (u.id === 'AGG-U04') ret = Math.max(0, ret - 1);
  ret = Math.max(0, ret - ccArm(u));
  if (tgt.thorn) { ret += tgt.thorn; tgt.thorn = 0; }   // Iron Thorns (a leader skill): the next attacker takes extra damage
  const before = tgt.hp;
  tgt.hp -= dmg; if (dmg > 0) ccFx(G, tgt.iid, 'dmg', dmg);
  u.hp -= ret; if (ret > 0) ccFx(G, u.iid, 'dmg', ret);
  ccLog(G, `${nm} attacks ${ccDef(tgt.id).name}: deals ${dmg}${ret ? `, takes ${ret} back` : ''}`, 'dmg', P.p);
  if (dmg > 0) ccEnrage(G, tgt); if (ret > 0) ccEnrage(G, u);
  if (tgt.hp <= 0) { const over = Math.min(CC_CFG.overflow, dmg - before); if (over > 0) { ccHit(G, e, over); ccLog(G, `Overflow: ${over} damage to ${G.names[e]}`, 'dmg', P.p); } }
  else if (dmg > 0) {
    if (u.id === 'CON-U02') { ccStun(G, tgt); ccLog(G, `${ccDef(tgt.id).name} is stunned`, 'status', P.p); }
    if (u.id === 'CON-U03') { tgt.down++; ccLog(G, `${ccDef(tgt.id).name} loses 1 ATK`, 'status', P.p); }
    if (u.id === 'CON-U06' || (u.eq && u.eq.id === 'CON-E02')) { ccPoison(G, tgt, 2); ccLog(G, `${ccDef(tgt.id).name} is poisoned`, 'status', P.p); }
  }
  if (u.hp > 0 && u.eq && u.eq.id === 'MOB-E02' && !u.moveUsed) u.dagger = true;
  return null;
}
function ccMove(G, P, a) {
  const u = ccFind(G, a.u);
  if (!u || u.owner !== P.p) return 'Pick one of your units';
  if (u.moveUsed) return 'This unit already moved this turn';
  if (!ccMoveDests(G, u).some(([l, r]) => l === a.lane && r === a.row)) return 'Units move one slot left, right, or between front and back';
  const cost = ccMoveCost(u, G);
  if (P.ap < cost) return 'Not enough AP';
  if (!cost && ccMoveCost0(u, G)) ccBondUse(G, P.p, 8);
  P.ap -= cost; u.moveUsed = true; u.moved = true; u.dagger = false;
  const lc = u.lane !== a.lane;
  ccPlace(G, u, a.lane, a.row); ccFx(G, u.iid, 'move', 0);
  ccLog(G, `${G.names[P.p]} moves ${ccDef(u.id).name}${cost ? '' : ' (free)'}`, 'move', P.p);
  if (lc) ccEnter(G, u);
  return null;
}
function ccSetTrap(G, P, a) {
  const c = P.hand.find(x => x.iid === a.iid), d = c && ccDef(c.id);
  if (!d || d.type !== 'trap') return 'Not a trap in your hand';
  if (!(a.lane >= 0 && a.lane < 3) || P.traps[a.lane]) return 'That lane already has a trap';
  if (P.ap < d.ap) return 'Not enough AP';
  P.ap -= d.ap; ccTakeHand(P, c.iid); P.traps[a.lane] = c; ccFx(G, 'trap' + P.p + a.lane, 'set', 0);
  ccLog(G, `${G.names[P.p]} sets a face-down trap in the ${['left', 'center', 'right'][a.lane]} lane`, 'play', P.p);
  return null;
}
function ccEquip(G, P, a) {
  const c = P.hand.find(x => x.iid === a.iid), d = c && ccDef(c.id), u = ccFind(G, a.u);
  if (!d || d.type !== 'equipment') return 'Not equipment in your hand';
  if (!u || u.owner !== P.p) return 'Pick one of your units';
  if (u.eq) return 'That unit already has equipment';
  if (c.id === 'CON-E01' && ccDef(u.id).range !== 'ranged') return 'Arcane Wand needs a Ranged unit';
  if (P.ap < d.ap) return 'Not enough AP';
  P.ap -= d.ap; ccTakeHand(P, c.iid); u.eq = c;
  const up = { 'AGG-E01': 1, 'AGG-E02': 2, 'CON-E01': 1, 'MOB-E02': 1, 'SUP-E02': 1 }[c.id]; if (up) u.up += up;
  if (c.id === 'DEF-E01') ccAddMax(u, 2); if (c.id === 'DEF-E02') ccAddMax(u, 3);
  ccFx(G, u.iid, 'buff', 0);
  ccLog(G, `${G.names[P.p]} equips ${d.name} to ${ccDef(u.id).name}`, 'play', P.p);
  return null;
}
function ccSpell(G, P, a) {
  const c = P.hand.find(x => x.iid === a.iid), d = c && ccDef(c.id), t = a.t || {};
  if (!d || d.type !== 'spell') return 'Not a spell in your hand';
  if (P.ap < d.ap) return 'Not enough AP';
  if (!ccSpellTargets(G, P.p, c.id).some(x => ccSameT(x, t))) return 'Not a legal target';
  P.ap -= d.ap; ccTakeHand(P, c.iid);
  const p = P.p, e = 1 - p, E = G.players[e], tu = t.u ? ccFind(G, t.u) : null;
  ccLog(G, `${G.names[p]} casts ${d.name}${tu ? ` on ${ccDef(tu.id).name}` : ''}`, 'spell', p);
  ccFx(G, tu ? tu.iid : 'hero' + e, 'spell', 0);
  // spell traps: Counter Trap / Silence Rune on a single enemy target; Silence Rune on Arcane Burst (first qualifying lane, left → right)
  let cancel = -1;
  if (tu && tu.owner === e) { const tr = E.traps[tu.lane]; if (tr && (tr.id === 'DEF-T01' || tr.id === 'CON-T01')) cancel = tu.lane; }
  if (c.id === 'CON-S04') for (let l = 0; l < 3; l++) { const tr = E.traps[l]; if (tr && tr.id === 'CON-T01' && E.board[l][0]) { cancel = l; break; } }
  if (cancel >= 0) { const tr = E.traps[cancel]; E.traps[cancel] = null; E.disc.push(tr); P.disc.push(c); ccFx(G, 'trap' + e + cancel, 'trap', 0); ccLog(G, `Trap! ${G.names[e]}’s ${ccDef(tr.id).name} cancels ${d.name}`, 'trap', e); return null; }
  let cb = null;   // Control bond: the first damaging spell each turn deals +1 (to every target it hits)
  const sdmg = (u, n) => { if (cb === null) cb = ccBondCan(G, p, 'control', 4) && ccBondUse(G, p, 4) ? 1 : 0; let x = n + cb + ccSpellBonus(G, p) + (G.ev === 'surge' ? 1 : 0) - ccArm(u); if (u.id === 'DEF-U07') x -= 1; return ccDamage(G, u, Math.max(0, x)); };
  switch (c.id) {
    case 'AGG-S01': tu.up += 2; ccFx(G, tu.iid, 'buff', 0); break;
    case 'AGG-S02': sdmg(tu, 4); break;
    case 'AGG-S03': tu.rc = true; ccFx(G, tu.iid, 'buff', 0); break;
    case 'AGG-S04': sdmg(tu, 5); break;
    case 'DEF-S01': ccAddMax(tu, 3); ccFx(G, tu.iid, 'buff', 0); break;
    case 'DEF-S02': if (tu) ccHeal(G, tu, 2); else ccHealHero(G, p, 1); break;
    case 'DEF-S03': tu.armor = 1; ccFx(G, tu.iid, 'buff', 0); break;
    case 'DEF-S04': for (const u of ccUnits(G, p)) ccHeal(G, u, 2); break;
    case 'CON-S01': ccPoison(G, tu, 3); break;
    case 'CON-S02': ccStun(G, tu); break;
    case 'CON-S03': tu.down += 2; ccFx(G, tu.iid, 'debuff', 0); break;
    case 'CON-S04': for (let l = 0; l < 3; l++) { const u = E.board[l][0]; if (u) sdmg(u, 3); } break;
    case 'MOB-S01': { const u2 = ccFind(G, t.u2), a1 = [tu.lane, tu.row], a2 = [u2.lane, u2.row], B = P.board;
      B[a1[0]][a1[1]] = u2; B[a2[0]][a2[1]] = tu; tu.lane = a2[0]; tu.row = a2[1]; u2.lane = a1[0]; u2.row = a1[1]; tu.moved = u2.moved = true;
      ccFx(G, tu.iid, 'move', 0); ccFx(G, u2.iid, 'move', 0);
      if (a1[0] !== a2[0]) { ccEnter(G, tu); ccEnter(G, u2); } break; }
    case 'MOB-S02': { const lc = tu.lane !== t.lane; ccPlace(G, tu, t.lane, t.row); tu.moved = true; ccFx(G, tu.iid, 'move', 0); if (lc) ccEnter(G, tu); break; }
    case 'MOB-S03': sdmg(tu, 4); break;
    case 'MOB-S04': ccHeal(G, tu, 3); break;
    case 'SUP-S01': sdmg(tu, 3); ccDraw(G, p, 1); break;
    case 'SUP-S02': ccHealHero(G, p, 2); break;
    case 'SUP-S03': tu.up += 1; ccAddMax(tu, 1); ccFx(G, tu.iid, 'buff', 0); break;
    case 'SUP-S04': ccDraw(G, p, 2); break;
  }
  P.disc.push(c);
  return null;
}

function ccLegal(G) {
  if (G.phase === 'over') return [];
  if (G.phase === 'choice') return G.pending.opts.map(o => ({ k: 'choice', pick: o }));
  const p = G.active, P = G.players[p], out = [], mine = ccUnits(G, p);
  for (const c of P.hand) {
    const d = ccDef(c.id); if (d.ap > P.ap) continue;
    if (d.type === 'unit') { for (let l = 0; l < 3; l++) for (let r = 0; r < 2; r++) if (!P.board[l][r] && (r === 0 || d.range === 'ranged')) out.push({ k: 'summon', iid: c.iid, lane: l, row: r }); }
    else if (d.type === 'trap') { for (let l = 0; l < 3; l++) if (!P.traps[l]) out.push({ k: 'trap', iid: c.iid, lane: l }); }
    else if (d.type === 'equipment') { for (const u of mine) if (!u.eq && (c.id !== 'CON-E01' || ccDef(u.id).range === 'ranged')) out.push({ k: 'equip', iid: c.iid, u: u.iid }); }
    else for (const t of ccSpellTargets(G, p, c.id)) out.push({ k: 'spell', iid: c.iid, t });
  }
  for (const u of mine) {
    if (P.ap >= 1 && ccCanAttack(G, u)) out.push({ k: 'attack', u: u.iid });
    if (!u.moveUsed && P.ap >= ccMoveCost(u, G)) for (const [l, r] of ccMoveDests(G, u)) out.push({ k: 'move', u: u.iid, lane: l, row: r });
  }
  const Ld = G.lead && G.lead[p];
  if (Ld && Ld.cd === 0 && P.ap >= lsCost(Ld)) for (const t of ccTgtKind(G, p, LS[Ld.id].tg)) out.push({ k: 'skill', t });
  if (Ld && ccUltReady(G, Ld)) for (const t of ccTgtKind(G, p, LS[Ld.id].tg)) out.push({ k: 'skill', t, ult: true });
  out.push({ k: 'end' });
  return out;
}

/* ---- the bot: an average player. One-step lookahead on a copy of the match where the enemy's face-down traps are
   removed (it never knows what they are, only that they exist), a simple board evaluation and a little noise. ---- */
/* a copy of the match for simulations (bot lookahead, previews, auto play). Card objects ({iid, id}) are never
   changed by the engine, so they are shared; units, boards, hands and piles get their own copies. */
function ccClone(G) {
  const c = { ...G, log: [], fx: [], pending: G.pending ? { ...G.pending, opts: G.pending.opts.slice() } : null, lead: G.lead ? G.lead.map(l => l && { ...l }) : null };
  c.players = G.players.map(P => ({ ...P, hand: P.hand.slice(), deck: P.deck.slice(), disc: P.disc.slice(), traps: P.traps.slice(), board: P.board.map(l => [l[0] ? { ...l[0] } : null, l[1] ? { ...l[1] } : null]) }));
  return c;
}
function ccRedact(G, me) { const c = ccClone(G); c.players[1 - me].traps = [null, null, null]; return c; }
function ccUnitVal(G, u) {
  const d = ccDef(u.id), atk = ccPermAtk(u);
  let v = atk * 1.4 + u.hp + (ccArm(u) ? 1.5 : 0) + d.ap * 0.4 + (u.eq ? 0.8 : 0);
  if (u.row === 1 && d.range !== 'ranged') v -= atk * 1.1;
  if (u.poison) v -= 2 * Math.min(u.poison, Math.ceil(u.hp / 2));
  if (u.stunNext) v -= atk * 0.5;
  if (['SUP-U01', 'SUP-U02', 'SUP-U04', 'DEF-U06'].includes(u.id)) v += 1.2;
  if (CC_BANNER.has(u.id) || u.id === 'CON-U08') v += 1;
  return v;
}
function ccEval(G, me) {
  if (G.phase === 'over') return G.winner === me ? 1e6 : G.winner === 'draw' ? 0 : -1e6;
  const P = G.players[me], O = G.players[1 - me];
  const side = p => { let s = 0; for (const u of ccUnits(G, p)) { s += ccUnitVal(G, u); const d = ccDef(u.id); if ((u.row === 0 || d.range === 'ranged') && !G.players[1 - p].board[u.lane].some(Boolean)) s += ccPermAtk(u) * 1.1; } return s; };
  let s = (P.hp * 2.4 - O.hp * 3.4) + (P.shield - O.shield) * 2 + side(me) - side(1 - me) + (P.hand.length - O.hand.length) * 0.8;
  if (O.hp <= 10) s += (10 - O.hp) * 2;
  if (P.hp <= 8) s -= (8 - P.hp) * 1.5;
  return s;
}
/* the bot's little randomness comes from the match itself (seed, turn, log position), not Math.random, so the same
   seed and the same moves always replay exactly the same match */
function ccNoise(G, i) { let h = (G.seed ^ Math.imul(G.turnNo + 1, 0x9E3779B1) ^ Math.imul(G.seq + 7, 0x85EBCA77) ^ Math.imul(i + 13, 0xC2B2AE3D)) >>> 0; h = Math.imul(h ^ h >>> 16, 0x7FEB352D); h = Math.imul(h ^ h >>> 15, 0x846CA68B); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function ccBotPick(G) {
  const me = G.active, acts = ccLegal(G);
  if (G.phase === 'choice') { const P = G.players[me]; return acts.map(a => ({ a, v: ccDef(P.deck.find(c => c.iid === a.pick).id).ap })).sort((x, y) => y.v - x.v)[0].a; }
  const base = ccRedact(G, me), b0 = ccEval(base, me), O = G.players[1 - me];
  let best = { k: 'end' }, bestS = 0.35, raw1 = 0;
  const sk = acts.filter(a => a.k === 'skill');
  if (sk.length) for (const a of acts) { if (a.k === 'end' || a.k === 'skill') continue; const g = ccClone(base); if (!ccApply(g, a)) raw1 = Math.max(raw1, ccEval(g, me) - b0); }
  for (const a of acts) {
    if (a.k === 'end') continue;
    const g = ccClone(base); if (ccApply(g, a)) continue;
    let s = ccEval(g, me) - b0;
    if (a.k === 'skill') {   // a leader skill is judged with its best follow-up (+ATK then attack…), minus what the best plain action gives anyway
      let b2 = s;
      if (g.phase === 'main' && g.active === me) for (const f of ccLegal(g)) { if (f.k === 'end' || f.k === 'skill') continue; const g2 = ccClone(g); if (!ccApply(g2, f)) b2 = Math.max(b2, ccEval(g2, me) - b0); }
      s = b2 - raw1;
    }
    if (g.phase === 'over' && g.winner === me) return a;
    if ((a.k === 'summon' || a.k === 'move') && O.traps[a.lane]) { const u = a.k === 'move' && ccFind(G, a.u); if (!u || u.lane !== a.lane) s -= 1.2; }
    if (a.k === 'attack') { const u = ccFind(G, a.u), hurt = g.fx.some(f => f.type === 'dmg' && (f.id === 'hero' + (1 - me) || (ccFind(base, f.id) || {}).owner === 1 - me)); s += hurt ? 1.1 : -1; if (O.traps[u.lane]) s -= 0.8; }
    if (a.k === 'trap') s += 1.6 + (G.players[1 - me].board[a.lane].some(Boolean) ? 0.4 : 0);
    if (a.k === 'skill') s += 0.15;
    s += (ccNoise(G, me * 977 + acts.indexOf(a)) - 0.5) * 0.7;
    if (s > bestS) { bestS = s; best = a; }
  }
  return best;
}

/* ---- leader skills: every deck's leader brings one skill (chosen per character in admin → Game pool, entry.ccSkill;
   without one the default of its card attribute, LS_DEF in 65-leader.js). A skill costs AP like a card and then waits a
   cooldown (counted in its owner's turns; it starts 2 turns away, so the first use is on your 2nd turn). Tiers 1–3 come
   from the leader's awakened stars (65-leader.js); tier 3 adds a twist. Skills can't be countered by traps. G.lead[p] =
   {id, t: tier, cd: turns left, cdm: cooldown reduction, bond: attribute or null, used, b: once-a-turn bond flags}.
   Attribute bond: when 12+ of the 30 cards share the leader's attribute: Aggression first attack each turn +1,
   Defense first unit each turn enters with Armor 1, Control first damaging spell each turn +1, Mobility first move each
   turn free, Support heal your most damaged unit 1 at the start of your turn. */
const CC_BOND_N = 12;
const LS = {
  // Aggression
  battlecry: { name: 'Battle Cry', style: 'aggression', ic: 'AGG-S01', ap: [1, 1, 1], cd: 3, tg: 'friend', d: ['A unit gets +1 ATK this turn.', 'A unit gets +2 ATK this turn.', 'A unit gets +2 ATK this turn and can attack even if it was just summoned.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.tmp = (u.tmp || 0) + (k > 1 ? 2 : 1); if (k > 2) u.rc = true; ccFx(G, u.iid, 'buff', 0); } },
  execute: { name: 'Execute', style: 'aggression', ic: 'AGG-S04', ap: [2, 2, 2], cd: 4, tg: 'enemyDamaged', d: ['Deal 3 damage to a damaged enemy unit.', 'Deal 4 damage to a damaged enemy unit.', 'Deal 4 damage to a damaged enemy unit. If it is destroyed, get 1 AP back.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); ccDamage(G, u, Math.max(0, (k > 1 ? 4 : 3) - ccArm(u))); if (k > 2 && u.hp <= 0) G.players[p].ap++; } },
  warpath: { name: 'Warpath', style: 'aggression', ic: 'AGG-U02', ap: [2, 2, 2], cd: 5, tg: 'none', d: ['Deal 2 damage to the enemy hero.', 'Deal 3 damage to the enemy hero.', 'Deal 3 damage to the enemy hero, 4 if one of its lanes has no units.'],
    run(G, p, t, k) { const open = G.players[1 - p].board.some(l => !l[0] && !l[1]); ccHit(G, 1 - p, k > 2 && open ? 4 : k > 1 ? 3 : 2); } },
  charge: { name: 'Charge', style: 'aggression', ic: 'AGG-S03', ap: [2, 2, 2], cd: 4, tg: 'none', d: ['Your Front units get +1 ATK this turn.', 'All your units get +1 ATK this turn.', 'All your units get +2 ATK this turn.'],
    run(G, p, t, k) { for (const u of ccUnits(G, p)) if (k > 1 || u.row === 0) { u.tmp = (u.tmp || 0) + (k > 2 ? 2 : 1); ccFx(G, u.iid, 'buff', 0); } } },
  // Defense
  bulwark: { name: 'Bulwark', style: 'defense', ic: 'DEF-S03', ap: [1, 1, 1], cd: 4, tg: 'friend', d: ['A unit gains Armor 1.', 'A unit gains Armor 1 and heals 2.', 'A unit gains Armor 1, +2 max HP and heals 2.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.armor = 1; if (k > 2) ccAddMax(u, 2); if (k > 1) ccHeal(G, u, 2); ccFx(G, u.iid, 'buff', 0); } },
  holdline: { name: 'Hold the Line', style: 'defense', ic: 'DEF-S01', ap: [2, 2, 2], cd: 4, tg: 'none', d: ['Your Front units get +1 max HP.', 'Your Front units get +2 max HP.', 'Your Front units get +2 max HP and your hero heals 2.'],
    run(G, p, t, k) { for (const u of ccUnits(G, p)) if (u.row === 0) { ccAddMax(u, k > 1 ? 2 : 1); ccFx(G, u.iid, 'buff', 0); } if (k > 2) lsHealHero(G, p, 2); } },
  rampart: { name: 'Rampart', style: 'defense', ic: 'DEF-U02', ap: [1, 1, 1], cd: 4, tg: 'none', d: ['Your hero gets a ward that blocks the next 2 damage.', 'Your hero gets a ward that blocks the next 3 damage.', 'Your hero gets a ward that blocks the next 4 damage.'],
    run(G, p, t, k) { const P = G.players[p]; P.shield = Math.min(6, P.shield + 1 + k); ccFx(G, 'hero' + p, 'buff', 0); } },
  thorns: { name: 'Iron Thorns', style: 'defense', ic: 'DEF-T02', ap: [1, 1, 1], cd: 3, tg: 'friend', d: ['The next unit that attacks this one takes 2 extra damage.', 'The next unit that attacks this one takes 3 extra damage.', 'The unit gains Armor 1, and the next unit that attacks it takes 3 extra damage.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.thorn = k > 1 ? 3 : 2; if (k > 2) u.armor = 1; ccFx(G, u.iid, 'buff', 0); } },
  // Control
  hex: { name: 'Hex', style: 'control', ic: 'CON-S02', ap: [1, 1, 1], cd: 4, tg: 'enemy', d: ['Stun an enemy unit; it loses 1 ATK.', 'Stun an enemy unit; it loses 1 ATK and takes 1 damage.', 'Stun an enemy unit; it loses 1 ATK and takes 2 damage.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); ccStun(G, u); u.down++; ccFx(G, u.iid, 'debuff', 0); if (k > 1) ccDamage(G, u, Math.max(0, (k > 2 ? 2 : 1) - ccArm(u))); } },
  venom: { name: 'Venom', style: 'control', ic: 'CON-S01', ap: [1, 1, 1], cd: 3, tg: 'enemy', d: ['Poison an enemy unit for 2 turns (2 damage each).', 'Poison an enemy unit for 2 turns; it loses 1 ATK.', 'Poison an enemy unit for 3 turns; it loses 1 ATK.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); ccPoison(G, u, k > 2 ? 3 : 2); if (k > 1) { u.down++; ccFx(G, u.iid, 'debuff', 0); } } },
  weaken: { name: 'Weaken', style: 'control', ic: 'CON-S03', ap: [1, 1, 1], cd: 3, tg: 'enemy', d: ['An enemy unit loses 1 ATK.', 'An enemy unit loses 2 ATK.', 'An enemy unit loses 2 ATK and takes 1 damage.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.down += k > 1 ? 2 : 1; ccFx(G, u.iid, 'debuff', 0); if (k > 2) ccDamage(G, u, Math.max(0, 1 - ccArm(u))); } },
  spark: { name: 'Mind Spark', style: 'control', ic: 'CON-S04', ap: [2, 2, 2], cd: 3, tg: 'enemy', d: ['Deal 2 damage to an enemy unit.', 'Deal 3 damage to an enemy unit.', 'Deal 3 damage to an enemy unit and draw a card.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); ccDamage(G, u, Math.max(0, (k > 1 ? 3 : 2) - ccArm(u))); if (k > 2) ccDraw(G, p, 1); } },
  // Mobility
  shadowstep: { name: 'Shadowstep', style: 'mobility', ic: 'MOB-S02', ap: [0, 0, 0], cd: 3, tg: 'friendMoved', d: ['A unit that already moved can move again.', 'A unit that already moved can move again, for free.', 'A unit that already moved can move again, for free, and gets +1 ATK this turn.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.moveUsed = false; if (k > 1) u.dagger = true; if (k > 2) u.tmp = (u.tmp || 0) + 1; ccFx(G, u.iid, 'buff', 0); } },
  blink: { name: 'Blink', style: 'mobility', ic: 'MOB-E01', ap: [1, 0, 0], cd: 3, tg: 'side', d: ['Move a unit one slot; it can attack this turn even if just summoned.', 'The same, for 0 AP.', 'The same, for 0 AP, and it gets +1 ATK this turn.'],
    run(G, p, t, k) { const u = ccFind(G, t.u), lc = u.lane !== t.lane; ccPlace(G, u, t.lane, t.row); u.moved = true; u.rc = true; if (k > 2) u.tmp = (u.tmp || 0) + 1; ccFx(G, u.iid, 'move', 0); if (lc) ccEnter(G, u); } },
  switch: { name: 'Switch', style: 'mobility', ic: 'MOB-S01', ap: [1, 0, 0], cd: 3, tg: 'two', d: ['Two of your units swap places.', 'Two of your units swap places, for 0 AP.', 'Two of your units swap places for 0 AP; both get +1 ATK this turn.'],
    run(G, p, t, k) { const a = ccFind(G, t.u), b = ccFind(G, t.u2), A = [a.lane, a.row], Bp = [b.lane, b.row], B = G.players[p].board;
      B[A[0]][A[1]] = b; B[Bp[0]][Bp[1]] = a; a.lane = Bp[0]; a.row = Bp[1]; b.lane = A[0]; b.row = A[1]; a.moved = b.moved = true;
      if (k > 2) { a.tmp = (a.tmp || 0) + 1; b.tmp = (b.tmp || 0) + 1; }
      ccFx(G, a.iid, 'move', 0); ccFx(G, b.iid, 'move', 0); if (A[0] !== Bp[0]) { ccEnter(G, a); ccEnter(G, b); } } },
  quickstep: { name: 'Quickstep', style: 'mobility', ic: 'MOB-U02', ap: [0, 0, 0], cd: 3, tg: 'friendNew', d: ['A unit summoned this turn can attack right away.', 'The same, and it gets +1 ATK this turn.', 'The same, and it gets +2 ATK this turn.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.rc = true; if (k > 1) u.tmp = (u.tmp || 0) + (k > 2 ? 2 : 1); ccFx(G, u.iid, 'buff', 0); } },
  // Support
  mend: { name: 'Mend', style: 'support', ic: 'DEF-S02', ap: [1, 1, 1], cd: 3, tg: 'healAnyS', d: ['Heal a unit 3, or your hero 1.', 'Heal a unit 4, or your hero 2.', 'Heal a unit 4 and cure its Poison and Stun, or your hero 2.'],
    run(G, p, t, k) { if (t.hero != null) return lsHealHero(G, p, k > 1 ? 2 : 1); const u = ccFind(G, t.u); ccHeal(G, u, k > 1 ? 4 : 3); if (k > 2) { u.poison = 0; u.stunNext = false; u.stunNow = false; } } },
  rally: { name: 'Rally', style: 'support', ic: 'SUP-S04', ap: [0, 0, 0], cd: 4, tg: 'none', d: ['Draw a card.', 'Draw 2 cards.', 'Draw 2 cards and gain 1 AP.'],
    run(G, p, t, k) { ccDraw(G, p, k > 1 ? 2 : 1); if (k > 2) G.players[p].ap++; } },
  inspire: { name: 'Inspire', style: 'support', ic: 'SUP-S03', ap: [2, 2, 2], cd: 4, tg: 'friend', d: ['A unit gets +1 ATK for good.', 'A unit gets +1 ATK and +1 max HP for good.', 'A unit gets +1 ATK and +2 max HP for good.'],
    run(G, p, t, k) { const u = ccFind(G, t.u); u.up++; if (k > 1) ccAddMax(u, k > 2 ? 2 : 1); ccFx(G, u.iid, 'buff', 0); } },
  renewal: { name: 'Renewal', style: 'support', ic: 'DEF-S04', ap: [1, 1, 1], cd: 4, tg: 'none', d: ['Heal all your units 1.', 'Heal all your units 2.', 'Heal all your units 2 and your hero 1.'],
    run(G, p, t, k) { for (const u of ccUnits(G, p)) ccHeal(G, u, k > 1 ? 2 : 1); if (k > 2) lsHealHero(G, p, 1); } },
  // no attribute
  focus: { name: 'Focus', style: null, ic: 'crystal', ap: [0, 0, 0], cd: 9, tg: 'none', d: ['Gain 1 AP this turn.', 'Gain 2 AP this turn.', 'Gain 2 AP this turn and draw a card.'],
    run(G, p, t, k) { G.players[p].ap += k > 1 ? 2 : 1; if (k > 2) ccDraw(G, p, 1); } }
};
const LS_IDS = Object.keys(LS);
const lsTier = L => Math.max(1, Math.min(3, L.t || 1));
const lsCost = L => Math.max(0, LS[L.id].ap[lsTier(L) - 1] - (L.cheap && !L.used ? 1 : 0));   // build bonus: the first use costs 1 AP less
const lsCd = L => Math.max(1, LS[L.id].cd - (L.cdm || 0));
function lsHealHero(G, p, n) { const P = G.players[p], h = Math.max(0, Math.min(n, P.max - P.hp)); if (h > 0) { P.hp += h; ccFx(G, 'hero' + p, 'heal', h); } return h; }   // a skill's heal ignores the 1-a-round limit
/* lead = [{id, tier, cd0, cdMod, style}, …] per side (null = no leader); the bond turns on with CC_BOND_N cards of the leader's attribute */
function ccLeadInit(lead, decks) {
  if (!lead) return null;
  return [0, 1].map(p => { const l = lead[p]; if (!l || !LS[l.id]) return null;
    const st = l.style || null, n = st ? decks[p].filter(id => (ccDef(id) || {}).style === st).length : 0;
    const B = l.bonus || {};
    return { id: l.id, t: l.tier || 1, cd: l.cd0 == null ? 2 : l.cd0, cdm: l.cdMod || 0, bond: st && n >= (l.bondN || CC_BOND_N) ? st : null, used: 0, b: 0,
      hpB: B.hp || 0, heal: B.heal || 0, cards: B.cards || 0, ap1: B.ap1 || 0, last: !!B.last, cheap: !!B.cheap, fu: B.fu || 0, rs: B.rs || 0, rsAp: B.rsAp || 0, ult: !!B.ult }; });
}
const ccBondCan = (G, p, st, bit) => { const L = G.lead && G.lead[p]; return !!(L && L.bond === st && !(L.b & bit)); };
const ccBondUse = (G, p, bit) => { const L = G.lead[p]; L.b |= bit; return true; };
function ccSkill(G, P, a) {
  const L = G.lead && G.lead[P.p], S = L && LS[L.id];
  if (!S) return 'No leader skill';
  if (a.ult) {   // the SSS Ultimate: once per match from round CC_ULT_ROUND, the skill at tier III for 0 AP, cooldown untouched
    if (!ccUltReady(G, L)) return 'The Ultimate is not ready';
    const t = a.t || {}; if (!ccTgtKind(G, P.p, S.tg).some(x => ccSameT(x, t))) return 'Not a legal target';
    L.ultU = true; const tu = t.u ? ccFind(G, t.u) : null;
    ccLog(G, `${G.names[P.p]}’s leader unleashes the Ultimate: ${S.name}${tu ? ` on ${ccDef(tu.id).name}` : ''}`, 'skill', P.p);
    ccFx(G, 'hero' + P.p, 'skill', 0); S.run(G, P.p, t, 3); return null;
  }
  if (L.cd > 0) return `${S.name} is ready in ${L.cd} turn${L.cd > 1 ? 's' : ''}`;
  const cost = lsCost(L), t = a.t || {};
  if (P.ap < cost) return 'Not enough AP';
  if (!ccTgtKind(G, P.p, S.tg).some(x => ccSameT(x, t))) return 'Not a legal target';
  P.ap -= cost; L.cd = lsCd(L); L.used++;
  const tu = t.u ? ccFind(G, t.u) : null;
  ccLog(G, `${G.names[P.p]}’s leader uses ${S.name}${tu ? ` on ${ccDef(tu.id).name}` : ''}`, 'skill', P.p);
  ccFx(G, 'hero' + P.p, 'skill', 0);
  S.run(G, P.p, t, lsTier(L));
  return null;
}

/* ---- build bonuses on a lead (65-leader.js fills them from the character; never in the Arena):
   hpB hero HP, heal = hero heal at the start of each turn, cards = extra opening cards, ap1 = extra AP on the first turn,
   last = once per match the hero survives a killing blow on 1 HP (marriage), cheap = the first skill use costs 1 AP less,
   fu = the first unit each match +max HP, rs = from round rs the skill's cooldown resets once (memory, rsAp extra AP that
   turn), ult = the SSS Ultimate (once per match from round 5). */
const CC_ULT_ROUND = 5;
/* the hero heal passive (nerfed: the owner found 1-2 HP every turn too strong): 1 HP at the start of every other turn of
   yours, at most CC_HEAL_MATCH HP a match per point of heal (heal 1 → 3 HP, heal 2 → 6 HP; it used to be 2 HP every turn) */
const CC_HEAL_EVERY = 2, CC_HEAL_MATCH = 3;
const ccUltReady = (G, L) => !!(L && L.ult && !L.ultU && G.round >= CC_ULT_ROUND && G.phase === 'main');
function ccLeadTurn(G, p, L) {
  const P = G.players[p];
  if (L.heal) { L.hT = (L.hT || 0) + 1; if (L.hT % CC_HEAL_EVERY === 0 && (L.hU || 0) < CC_HEAL_MATCH * L.heal && P.hp < P.max) L.hU = (L.hU || 0) + lsHealHero(G, p, 1); }
  if (!L.t1) { L.t1 = true; if (L.ap1) P.ap += L.ap1; }
  if (L.rs && !L.rsU && G.round >= L.rs && L.cd > 0) { L.rsU = true; L.cd = 0; if (L.rsAp) P.ap += L.rsAp; ccLog(G, `Memory: ${G.names[p]}’s leader skill is ready again`, 'buff', p); }
}
