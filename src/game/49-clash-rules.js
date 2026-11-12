/* ---------- Card Clash rules book: "How to play" in illustrated pages ----------
   Opened from the match (?) and the Deck screen. Every picture is built from the game's own pieces (real cards,
   unit tokens, a small board) so it always matches what players see. */

let ccRulesPage = 0;
const ccrPin = (n, x, y) => `<i class="ccr-pin" style="left:${x}%;top:${y}%">${n}</i>`;
/* a unit token at half size, the same markup as on the table */
function ccrUnit(id, o = {}) {
  const d = ccDef(id);
  return `<span class="ccr-u ${o.cls || ''}"><span class="ccr-us"><div class="ccu st-${d.style}" style="--cs:${CC_STYLES[d.style][1]}"><div class="ccu-fr"><div class="ccu-art"><i class="ccc-rays"></i>${ccIco(id, 'cce')}<i class="ccc-vig"></i></div><b class="ccu-name">${esc(d.name)}</b></div>
    ${o.st ? `<div class="ccu-st">${o.st}</div>` : ''}${d.range === 'ranged' ? `<span class="ccu-rng">${ccIco('MOB-U04')}</span>` : ''}<span class="ccu-atk"><b>${o.atk ?? d.atk}</b></span><span class="ccu-hp ${o.hurt ? 'hurt' : ''}"><b>${o.hp ?? d.hp}</b></span></div></span></span>`;
}
const ccrCard = (id, w = 150, cls = '') => ccCardHTML(id, { tip: false, cls }).replace('class="ccc ', `style="--w:${w}px" class="ccc `);
const ccrSlot = (inner = '', cls = '') => `<span class="ccr-slot ${cls}">${inner}</span>`;
const ccrArrow = (x1, y1, x2, y2, cls = '') => `<svg class="ccr-arrow ${cls}" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker id="ccrA${cls}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z"/></marker></defs><path d="M${x1} ${y1}L${x2} ${y2}" marker-end="url(#ccrA${cls})"/></svg>`;
/* one lane seen from above: enemy back, enemy front, the battle line, your front, your back */
function ccrLane(o) {
  const cell = (u, cls = '') => ccrSlot(u ? ccrUnit(u.id, u) : '', cls);
  return `<div class="ccr-lanew"><div class="ccr-lane">${o.hero ? `<span class="ccr-hero op">${ccIco('bot')}<b>Enemy hero</b></span>` : ''}
    ${cell(o.eb, 'b')}${cell(o.ef, 'f')}<i class="ccr-lline"></i>${cell(o.mf, 'f')}${cell(o.mb, 'b')}${o.arrows || ''}</div>${o.note ? `<span class="ccr-lnote">${o.note}</span>` : ''}</div>`;
}
function ccrBoard() {
  const half = (op) => `<div class="ccr-bh ${op ? 'op' : 'me'}">${op ? '<div class="ccr-btr"><i></i><i></i><i></i></div>' : ''}
    ${[op ? 'Back' : 'Front', op ? 'Front' : 'Back'].map(r => `<div class="ccr-brow">${[0, 1, 2].map(() => `<span class="ccr-bs">${r}</span>`).join('')}</div>`).join('')}${op ? '' : '<div class="ccr-btr"><i></i><i></i><i></i></div>'}</div>`;
  return `<div class="ccr-board">${half(true)}<div class="ccr-bline"><span class="ccr-bcrest">5</span><span class="ccr-borb">End<br>turn</span></div>${half(false)}
    <span class="ccr-blane l0">Left lane</span><span class="ccr-blane l1">Center</span><span class="ccr-blane l2">Right lane</span>
    ${ccrPin(1, 50, 4)}${ccrPin(2, 50, 24)}${ccrPin(3, 50, 49)}${ccrPin(4, 96, 49)}${ccrPin(5, 3, 49)}${ccrPin(6, 50, 95)}</div>`;
}
const ccrKw = (badge, name, txt) => `<div class="ccr-kw"><span class="ccr-kwb">${badge}</span><div><b>${name}</b><p>${txt}</p></div></div>`;
const ccrApRow = (on, max, op) => `<div class="ccb-ap ${op ? 'op' : 'me'} ccr-ap"><b>${on}</b><span>${Array.from({ length: max }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span></div>`;

const CC_RULES = [
  { t: 'Goal', ic: 'trophy', h: () => `
    <div class="ccr-fig ccr-goal"><div class="ccr-duel"><span class="ccr-hero me">${avatarHTML(64)}<b>You</b><em class="ccm-gem blue"><b>20</b></em></span><span class="ccr-vs">VS</span><span class="ccr-hero op">${ccIco('bot')}<b>Bot</b><em class="ccm-gem red"><b>20</b></em></span></div></div>
    <div class="ccr-txt"><h3>Bring the enemy hero from 20 HP to 0</h3>
      <p>Card Clash is a duel of two decks of 30 cards. Both heroes start with <b>20 HP</b>. Summon units into three lanes, cast spells, hide traps and attack until the other hero falls.</p>
      <p>In a <b>Quick match</b> you face a bot that plays <b>the same deck as you</b>, shuffled on its own, as a random character from the game. It never sees your hand or your face-down traps.</p>
      <p>If both heroes are still standing after <b>round ${CC_CFG.rounds}</b>, the match is a draw.</p>
      <p class="ccr-tip">${curIcon('pearls')} Every win gives <b>+${CC_WIN_PEARLS} pearl</b>.</p></div>` },
  { t: 'The board', ic: 'map', h: () => `
    <div class="ccr-fig">${ccrBoard()}</div>
    <div class="ccr-txt"><h3>Two halves, three lanes</h3>
      <ol class="ccr-legend"><li><b>Enemy traps</b>: one face-down trap per lane.</li><li><b>Enemy rows</b>: a Front and a Back slot in each lane.</li>
      <li><b>The battle line</b> glows crystal on your turn and red on the bot's.</li><li><b>End turn</b> crystal, with the AP crystals above (bot) and below (you).</li>
      <li><b>Round</b> counter (it turns red in Overtime).</li><li><b>Your traps</b> along your edge.</li></ol>
      <p>Units only ever fight <b>inside their own lane</b>: what stands in a lane decides who gets hit.</p></div>` },
  { t: 'Your turn', ic: 'clock', h: () => `
    <div class="ccr-fig ccr-turn"><div class="ccr-step"><span>1</span><b>Draw</b><div class="ccr-mini">${ccBackHTML()}${ccBackHTML()}</div><small>2 cards (the first player draws 1 on turn one)</small></div>
      <div class="ccr-step"><span>2</span><b>Spend AP</b>${ccrApRow(4, 4)}<small>4 AP every turn</small></div>
      <div class="ccr-step"><span>3</span><b>End turn</b><span class="ccr-orb">End<br>turn</span><small>unused AP is lost</small></div></div>
    <div class="ccr-txt"><h3>Draw, act, end</h3>
      <p>Each turn you get <b>4 AP</b> (action points) and draw <b>2 cards</b>. The player who goes second gets <b>6 AP</b> on their first turn to make up for it.</p>
      <p>With AP you can <b>play cards</b> (each shows its cost in the blue crystal), <b>attack</b> (1 AP) and <b>move</b> (1 AP). Every unit can attack once and move once per turn.</p>
      <p>You start with <b>5 cards</b>. Your hand holds at most <b>8</b>: a card drawn into a full hand is discarded. When your deck runs out, your discard pile is shuffled into a new deck.</p></div>` },
  { t: 'Reading a card', ic: 'cards', h: () => `
    <div class="ccr-fig ccr-anat"><div class="ccr-cardwrap">${ccrCard('DEF-U01', 210)}${ccrPin(1, 4, 3)}${ccrPin(2, 104, 54)}${ccrPin(3, 104, 62)}${ccrPin(4, 104, 74)}${ccrPin(5, 3, 97)}${ccrPin(6, 97, 97)}</div>
      <div class="ccr-frames">${['AGG-U07', 'AGG-S02', 'MOB-T02', 'DEF-E02'].map(id => `<div>${ccrCard(id, 92)}<small>${CC_TYPES[ccDef(id).type]}</small></div>`).join('')}</div></div>
    <div class="ccr-txt"><h3>Every card at a glance</h3>
      <ol class="ccr-legend"><li><b>AP cost</b> to play it.</li><li><b>Name</b>.</li><li><b>Type and playstyle</b> (Aggression, Defense, Control, Mobility, Support) and, for units, Melee or Ranged.</li>
      <li><b>What it does</b>.</li><li><b>ATK</b>: damage it deals when it attacks or strikes back.</li><li><b>HP</b>: damage it can take. At 0 it is destroyed.</li></ol>
      <p>The frame tells the type: <b>gold</b> units, <b>lavender</b> spells, <b>iron</b> traps, <b>silver</b> equipment. Every player owns all 80 cards; a deck holds 30 with at most 2 copies of each.</p></div>` },
  { t: 'Units', ic: 'chars', h: () => `
    <div class="ccr-fig ccr-two">${ccrLane({ mf: { id: 'DEF-U01' }, mb: { id: 'MOB-U04' }, note: 'Melee in front, Ranged behind' })}${ccrLane({ mf: { id: 'MOB-U04' }, mb: { id: 'DEF-U01', cls: 'ccr-bad' }, note: 'A Melee unit in the Back can’t attack' })}</div>
    <div class="ccr-txt"><h3>Summoning units</h3>
      <p>Play a unit card on an empty slot of your half. <b>Melee</b> units go in the <b>Front</b> row. <b>Ranged</b> units (bow badge) can go in <b>either row</b> and attack from both.</p>
      <p>A new unit <b>can't attack on the turn it arrives</b>, unless it has <b>Haste</b>, gets <b>Reckless Charge</b>, or has Free Move / Light Boots and moved first (<b>Dash</b>).</p>
      <p>Some units do something when summoned (Seer, Scribe, Herbalist) or every turn (Battle Medic, Priest, Druid, Paladin heal; Bannerbearer and Commander give +1 ATK to the other units in their lane).</p></div>` },
  { t: 'Attacking', ic: 'bolt', h: () => `
    <div class="ccr-fig ccr-three">
      ${ccrLane({ ef: { id: 'DEF-U02' }, eb: { id: 'MOB-U04' }, mf: { id: 'AGG-U07' }, arrows: ccrArrow(50, 70, 50, 38, 'hit'), note: 'Front guards Back' })}
      ${ccrLane({ eb: { id: 'MOB-U04' }, mf: { id: 'AGG-U07' }, arrows: ccrArrow(50, 70, 50, 18, 'hit'), note: 'Else the Back unit' })}
      ${ccrLane({ hero: true, mf: { id: 'AGG-U07' }, arrows: ccrArrow(50, 70, 50, 6, 'face'), note: 'Empty lane: the hero' })}</div>
    <div class="ccr-txt"><h3>Who gets hit</h3>
      <p>Attacking costs <b>1 AP</b>. A unit hits the enemy <b>Front</b> unit in its lane, else the <b>Back</b> unit, else the <b>enemy hero</b>. (Flank units like Phantom go for the Back first.)</p>
      <p><b>Both units hit each other at the same time</b>, so the target strikes back with its ATK. Exception: a <b>Ranged unit attacking from the Back row</b> takes nothing back from a <b>Melee</b> unit.</p>
      <p><b>Overflow:</b> when an attack destroys a unit, up to <b>2</b> leftover damage goes on into the enemy hero.</p></div>` },
  { t: 'Moving', ic: 'swap', h: () => `
    <div class="ccr-fig ccr-move"><div class="ccr-mgrid">${[0, 1, 2, 3, 4, 5].map(i => ccrSlot(i === 1 ? ccrUnit('CON-U07') : '', i === 1 ? 'on' : [0, 2, 4].includes(i) ? 'go' : '')).join('')}${ccrArrow(42, 25, 12, 25, 'mv')}${ccrArrow(58, 25, 88, 25, 'mv')}${ccrArrow(50, 42, 50, 70, 'mv')}</div><small>Left, right, or between Front and Back</small></div>
    <div class="ccr-txt"><h3>One step at a time</h3>
      <p>A unit can move <b>once per turn</b> for <b>1 AP</b>: one slot left or right in its row, or between Front and Back in its lane, onto an empty slot.</p>
      <p><b>Free Move</b> units (and units with Light Boots) move for <b>0 AP</b>. If they move on the turn they arrive, they may attack right away (<b>Dash</b>).</p>
      <p>Moving into a lane can set off the enemy's <b>entry traps</b> there.</p></div>` },
  { t: 'Spells', ic: 'sparkle', h: () => `
    <div class="ccr-fig ccr-cards">${['AGG-S02', 'DEF-S01', 'CON-S02', 'MOB-S01'].map(id => ccrCard(id, 118)).join('')}</div>
    <div class="ccr-txt"><h3>One-shot effects</h3>
      <p>Spells happen at once and go to your discard pile: damage (Fireball, Finishing Blow, Backstab), buffs (Battle Cry, Reinforce, Iron Skin, Strengthen), heals, Freeze and Disarm, moving your units around (Swap, Sidestep) and drawing cards (Recycle, Quick Thinking).</p>
      <p>Pick the spell, then tap a glowing target. Spells that need no target show a <b>Cast</b> button.</p>
      <p>Each <b>Spellweaver</b> you have adds +1 to your unit-damaging spells (max +2). Watch out: enemy <b>Counter Trap</b> and <b>Silence Rune</b> can cancel a spell aimed into their lane.</p></div>` },
  { t: 'Traps', ic: 'lock', h: () => `
    <div class="ccr-fig ccr-traps2">${[['Entry traps', 'AGG-T02', 'When an enemy unit is summoned or moves into the lane'], ['Attack traps', 'DEF-T02', 'When an enemy unit declares an attack from the lane'], ['Spell traps', 'DEF-T01', 'When an enemy spell targets a unit in the lane']].map(([n, id, t]) => `<div class="ccr-trapk">${ccrCard(id, 118)}<b>${n}</b><small>${t}</small></div>`).join('')}</div>
    <div class="ccr-txt"><h3>Hidden until they spring</h3>
      <p>Set a trap in one of your lanes' runestones (one per lane). It stays <b>face down</b>: the bot only sees that a trap is there, never which one, and you see the bot's the same way (a red "?").</p>
      <p>A trap springs once, then goes to the discard pile. <b>Entry traps</b>: Flare Trap and Hidden Spikes (2 damage), Hex Field and Net Trap (stun). <b>Attack traps</b>: Retaliation (2), Thorns (3), Healing Spring, Guardian Angel. <b>Spell traps</b>: Counter Trap, Silence Rune.</p>
      <p>If an attack trap destroys the attacker, the attack is canceled.</p></div>` },
  { t: 'Equipment', ic: 'gear', h: () => `
    <div class="ccr-fig ccr-cards">${['AGG-E01', 'DEF-E02', 'MOB-E01', 'SUP-E02'].map(id => ccrCard(id, 118)).join('')}</div>
    <div class="ccr-txt"><h3>Gear for one unit</h3>
      <p>Equipment is played on one of <b>your units</b> and stays on it (a small badge shows it). A unit carries <b>one</b> piece at a time; when the unit is destroyed, its equipment goes with it.</p>
      <p>Gear raises ATK or HP, grants Free Move (Light Boots), poisons targets (Poison Blade), heals (Healing Charm) or helps the whole lane (Battle Standard). The Arcane Wand only fits Ranged units.</p></div>` },
  { t: 'Keywords', ic: 'info', h: () => `
    <div class="ccr-fig ccr-kws">
      ${ccrKw('<i class="s-kw">H</i>', 'Haste', 'Can attack on the turn it is summoned.')}
      ${ccrKw('<i class="s-kw">F</i>', 'Free Move', 'Its move costs 0 AP. Moving on its first turn lets it attack (Dash).')}
      ${ccrKw('<i class="s-kw">K</i>', 'Flank', 'Attacks the enemy Back unit before the Front one.')}
      ${ccrKw(`<span class="ccu-rng">${ccIco('MOB-U04')}</span>`, 'Ranged', 'Can stand in the Back row and attack from there.')}
      ${ccrKw(`<i class="s-arm">${CC_SHIELD}</i>`, 'Armor', 'Every hit (attack, spell or trap) deals 1 less. Never more than 1.')}
      ${ccrKw('<i class="s-poi">2</i>', 'Poison', '2 damage at the start of its owner’s turn, for the turns shown.')}
      ${ccrKw('<i class="s-stun">Z</i>', 'Stun', 'Can’t attack on its next turn (it can still move).')}
      ${ccrKw(`<span class="ccr-kwb2">${ccIco('SUP-U03')}</span>`, 'Banner', 'Bannerbearer, Commander and Battle Standard give the other units in their lane +1 ATK.')}</div>
    <div class="ccr-txt"><h3>Badges on units</h3><p>Small badges on the left of a unit show its keywords and what is affecting it right now. Tap or hover a unit to see its full card and live stats on the left of the screen.</p>
      <p>A <b>green glow</b> means the unit can attack now, <b>pink</b> is the unit you picked, <b>gold</b> marks a target you can choose.</p></div>` },
  { t: 'Limits & Overtime', ic: 'clock', h: () => `
    <div class="ccr-fig ccr-limits">${[['ATK', '+2 / −2', 'permanent changes, never below 1'], ['Max HP', '+3', 'extra maximum HP'], ['Armor', '1', 'it never stacks higher'], ['Hero heal', '1 / round', 'at most 1 HP per round'], ['Overtime', `round ${CC_CFG.overtime}`, 'every unit loses 1 HP each turn'], ['Draw', `round ${CC_CFG.rounds}`, 'both heroes alive: nobody wins']].map(([a, b, c]) => `<div class="ccr-lim"><small>${a}</small><b>${b}</b><span>${c}</span></div>`).join('')}</div>
    <div class="ccr-txt"><h3>Keeping matches fair and finite</h3>
      <p>Buffs and debuffs have caps, and heroes can heal at most <b>1 HP per round</b>, so protecting your hero with units matters more than healing it.</p>
      <p>From <b>round ${CC_CFG.overtime}</b> the match is in <b>Overtime</b>: at the start of each player's turn every one of their units loses 1 HP. After round ${CC_CFG.rounds} the match ends in a draw.</p></div>` },
  { t: 'Battle events', ic: 'sparkle', h: () => `
    <div class="ccr-fig ccr-evfig">${ccEventsRulesHTML()}</div>
    <div class="ccr-txt"><h3>Some matches start under a battle event</h3>
      <p>When a match starts there is a <b>60% chance</b> of a battle event. It is announced right after the VS screen and shown beside the round medallion for the whole match. It changes the rules for <b>both</b> players, so plan around it.</p>
      <p>The match seed decides the event, so the same seed always gives the same one. Quick match shows the event for the seed you picked.</p></div>` },
  { t: 'Leaders & rewards', ic: 'crown', h: () => `
    <div class="ccr-fig ccr-leadfig">${(() => { const e = ccLeaderOf(ccSave().sel); return e ? `<div class="ccr-lead">${ccLeaderCard(e)}<span class="ccl-tag">Leader</span></div>` : ''; })()}<div class="ccr-rews"><span class="ccm-rw">${curIcon('coins')}<b>+${fmt(CC_GOLD.win)}</b><small>win</small></span><span class="ccm-rw">${curIcon('coins')}<b>+${fmt(CC_GOLD.draw)}</b><small>draw</small></span><span class="ccm-rw">${curIcon('coins')}<b>+${fmt(CC_GOLD.lose)}</b><small>loss</small></span><span class="ccm-rw pearl">${curIcon('pearls')}<b>+${CC_WIN_PEARLS}</b><small>win</small></span></div></div>
    <div class="ccr-txt"><h3>Your leader</h3>
      <p>Every deck has a <b>leader</b>: one of your characters, picked on the Deck screen (<b>Change leader</b>). Its showcase card, with its badges, grade, rarity and stars, stands beside your hero for the whole match, and it is the art you see on the VS screen and in big hits. Leaders have no skill yet.</p>
      <h3>Rewards</h3>
      <p>On Normal a Quick match gives gold: <b>${fmt(CC_GOLD.win)}</b> for a win, ${fmt(CC_GOLD.draw)} for a draw, ${fmt(CC_GOLD.lose)} for a loss. A win also gives <b>${CC_WIN_PEARLS} pearl</b> and <b>one clothing piece</b>, rolled exactly like a gear raid clear (UR 8%, SSR 20%, R 72%, 1.5% a 2★ UR piece). It needs a free wardrobe space.</p>
      <p>The difficulty changes it: ${QM_DIFF.map(d => `<b>${d.name}</b> ${fmt(qmGold('win', d))} gold${d.pearls ? ` + ${d.pearls} pearl${d.pearls > 1 ? 's' : ''}` : ''}${d.gear ? '' : ', no gear'}`).join(' · ')} for a win.</p></div>` },
  { t: 'Auto play', ic: 'bolt', h: () => `
    <div class="ccr-fig ccr-autofig"><span class="ccm-auto on">${icon('bolt')}<b>Auto</b><i>On</i></span><p>Tap <b>Auto</b> in the top right of the match to let the game play your turns. Tap it again (or Stop auto play) to take over.</p></div>
    <div class="ccr-txt"><h3>Let the game play for you</h3>
      <p>Auto play is a good player, not a perfect one. Each turn it tries out whole sequences of moves and predicts how the bot will answer, but it can't see face-down traps and now and then it makes a weaker move. It wins most matches, not all of them. You can still tap cards yourself; it simply plans again.</p>
      <p>It plays at the same pace as you would, with every animation, and a win still gives <b>+${CC_WIN_PEARLS} pearl</b>.</p>
      <p class="ccr-credit">${CC_ICON_CREDIT}</p></div>` }
];
function ccRules(page) {
  if (page != null) ccRulesPage = page;
  openModal({ title: 'How to play', ic: 'info', kind: 'ccrules', body: '<div class="ccr2" id="ccrRoot"></div>', onMount: b => ccRulesRender(b.querySelector('#ccrRoot')) });
}
function ccRulesRender(root) {
  if (!root) return;
  const n = CC_RULES.length, i = ccRulesPage = Math.max(0, Math.min(n - 1, ccRulesPage)), P = CC_RULES[i];
  root.innerHTML = `<nav class="ccr-tabs">${CC_RULES.map((p, k) => `<button class="ccr-tab ${k === i ? 'on' : ''}" data-rp="${k}"><span>${k + 1}</span>${p.t}</button>`).join('')}</nav>
    <article class="ccr-page" data-p="${i}"><header class="ccr-ph"><span class="ccr-pn">${i + 1}<small>/${n}</small></span><h2>${P.t}</h2></header><div class="ccr-body">${P.h()}</div></article>
    <footer class="ccr-nav"><button class="btn ghost" data-rp="${i - 1}" ${i ? '' : 'disabled'}>${icon('back')}Back</button><span class="ccr-dots">${CC_RULES.map((_, k) => `<i class="${k === i ? 'on' : ''}" data-rp="${k}"></i>`).join('')}</span><button class="btn gold" data-rp="${i + 1}" ${i < n - 1 ? '' : 'disabled'}>Next<span class="ccr-nx">${icon('back')}</span></button></footer>`;
  root.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => { ccRulesPage = +b.dataset.rp; ccRulesRender(root); });
  const on = root.querySelector('.ccr-tab.on'), nav = root.querySelector('.ccr-tabs');   // phones: the tabs are one scrolling row
  if (on && nav && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
}
