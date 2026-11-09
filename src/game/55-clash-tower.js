/* ---------- Card Clash: the Cloud Spire (a tower of floors) ----------
   The owner asked for a special tower: every cleared floor opens the one above it, 10 floors for now, the campaign's
   star system (3 stars per floor, every goal needs a win, stars kept once earned, 1 pearl per new star) but no
   milestone rewards. Floors are played with your own deck (like campaign Chapters 1 and 2) against a floor guardian.
   The tower is drawn floor by floor from the gate at the bottom; only the next floor or two above the one you can
   play are visible, everything higher is hidden in a bank of clouds (and not even in the page), so scrolling up never
   shows how tall the tower is. Floors reuse the campaign's stage machinery (54-clash-campaign.js): the same match
   setup (ccCampMatch), star bookkeeping (ccCampStarsOf, ccCampFinish), coach tips and end screen; a floor is a stage
   whose chapter is CC_TOWER (`tower: true`). Stars live with the campaign's: S.cc.camp.stars['T1' … 'T10'].
   The top of this file is pure (no DOM), so Node can test it. */

const CC_TOWER_DECKS = {
  // the Sky Sovereign's deck: the heaviest hitters of every playstyle
  spire: ['AGG-U08', 'AGG-U08', 'AGG-U07', 'AGG-U07', 'DEF-U04', 'DEF-U04', 'CON-U02', 'CON-U02', 'CON-U04', 'CON-U04', 'MOB-U06', 'MOB-U06', 'SUP-U06', 'SUP-U06', 'SUP-U02', 'SUP-U02',
    'AGG-S02', 'AGG-S02', 'CON-S04', 'CON-S04', 'DEF-S02', 'DEF-S02', 'DEF-T02', 'DEF-T02', 'CON-T02', 'CON-T02', 'SUP-E02', 'SUP-E02', 'DEF-E02', 'DEF-E02']
};
const CC_TOWER = {
  id: 'tower', tower: true, own: true, name: 'The Cloud Spire', sub: 'Tower', miles: [],
  stages: [
    { id: 'T1', no: 1, name: 'The Tower Gate', twist: 'A Guardian bars the gate', hp: [20, 8], first: 0, seed: 401, botDeck: 'p-balanced',
      intro: 'At the foot of the Cloud Spire a Guardian bars the door. Nobody climbs without getting past it first.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Cloud Spire: every floor you clear opens the one above. The Guardian holds the middle, so the side lanes are open.') },
    { id: 'T2', no: 2, name: 'Hall of Echoes', twist: 'Arcane Surge: spells deal +1', ev: 'surge', hp: [20, 10], first: 0, seed: 402, bot: CC_CAMP_DECKS.arcane,
      intro: 'A round hall where every spell echoes twice as loud. Battle mages wait for you, a Mage already in the back row.',
      setup: G => { ccCampUnit(G, 1, 'CON-U01', 0, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'kills', n: 6, t: 'Destroy 6 enemy units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage, theirs and yours. A Mage sits unguarded in the left back row.') },
    { id: 'T3', no: 3, name: 'The Armory', twist: 'Heavy armour · a Bulwark on guard', hp: [20, 10], first: 0, seed: 403, bot: CC_CAMP_DECKS.fort,
      intro: 'Racks of shields and plate line the walls, and the floor guardian wears all of it. A Bulwark already holds the left lane.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U04', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'round', n: 20, t: 'Win by round 20' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }],
      tips: ccOne('The Bulwark has 8 HP: don\'t trade into it. Win the other two lanes and hit the hero.') },
    { id: 'T4', no: 4, name: 'Windswept Stairs', twist: 'Tailwind: moving is free · rogues strike first', ev: 'wind', hp: [20, 16], first: 1, seed: 404, bot: CC_CAMP_DECKS.storm,
      intro: 'An open stair winds round the outside of the tower. The wind carries everyone, and rogues dart from lane to lane. They strike first.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U03', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }],
      tips: ccOne('<b>Tailwind</b>: moving costs no AP. Their rogues will switch lanes to find an open one, so keep every lane covered.') },
    { id: 'T5', no: 5, name: 'The Iron Warden', twist: 'Guardian floor: a Champion and a trap', boss: true, hp: [20, 16], first: 1, seed: 405, bot: CC_CAMP_DECKS.warlord,
      intro: 'Halfway up, the Iron Warden keeps the stair. A Champion stands in the middle over a Thorns trap, and the Warden moves first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampTrap(G, 1, 'DEF-T02', 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('The Iron Warden: a Champion (5 ATK) in the middle with Thorns under it, and it moves first. Don\'t attack into that lane with your best unit.') },
    { id: 'T6', no: 6, name: 'The Starlit Library', twist: 'Starfall: draw 3 a turn · a Counter Trap', ev: 'starfall', hp: [20, 11], first: 0, seed: 406, bot: CC_CAMP_DECKS.arcane,
      intro: 'Shelves of star charts reach into the dark. Starlight gives both sides three cards a turn, and a Stormcaller studies in the right back row.',
      setup: G => { ccCampUnit(G, 1, 'CON-U04', 2, 1); ccCampTrap(G, 1, 'DEF-T01', 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('<b>Starfall</b>: three cards a turn, so hands fill up fast. A Counter Trap waits in the left lane.') },
    { id: 'T7', no: 7, name: 'Hall of Mirrors', twist: 'A trap in every lane · they strike first', hp: [20, 20], first: 1, seed: 407, bot: CC_CAMP_DECKS.traps,
      intro: 'Every mirror hides a snare. A trap waits in all three lanes, a Knight guards the middle and an Archer covers the right. They strike first.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'DEF-T02', 1); ccCampTrap(G, 1, 'CON-T02', 2); ccCampUnit(G, 1, 'DEF-U01', 1, 0); ccCampUnit(G, 1, 'MOB-U04', 2, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('Three traps, one per lane. Spring them with cheap units before your best ones walk in.') },
    { id: 'T8', no: 8, name: 'The Crimson Gallery', twist: 'Blood Moon · raiders strike first', ev: 'bloodmoon', hp: [20, 16], first: 1, seed: 408, bot: CC_CAMP_DECKS.raiders,
      intro: 'Red moonlight floods a gallery of old war paintings. Raiders charge out of the frames, a Berserker and a Raider in front, and they strike first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U03', 0, 0); ccCampUnit(G, 1, 'AGG-U02', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('<b>Blood Moon</b>: every unit has +1 ATK, and they move first with two attackers out. Block both lanes right away.') },
    { id: 'T9', no: 9, name: 'The Frozen Belfry', twist: 'Rainstorm: 5 AP · the bot strikes first', ev: 'rain', hp: [20, 12], first: 1, seed: 409, bot: CC_CAMP_DECKS.frost,
      intro: 'Icy bells ring in the storm under the top of the tower. A Frost Witch hides behind a Stonewall in the middle, and they strike first.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U07', 1, 0); ccCampUnit(G, 1, 'CON-U02', 1, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn for both. The Frost Witch stuns what she hits; the Stonewall shields her.') },
    { id: 'T10', no: 10, name: 'The Sky Sovereign', twist: 'Guardian floor: a full war council', boss: true, hp: [20, 16], first: 1, seed: 410, bot: CC_TOWER_DECKS.spire,
      intro: 'At the top of the known tower the Sky Sovereign holds court: a Champion and a Commander in line, traps in two lanes, 16 HP, and it moves first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampUnit(G, 1, 'SUP-U06', 0, 0); ccCampTrap(G, 1, 'DEF-T02', 1); ccCampTrap(G, 1, 'CON-T02', 2); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Sky Sovereign: a Champion and a Commander, Thorns in the middle and a Hex Field on the right, and it moves first. This is the hardest floor yet.') }
  ]
};
const ccTowerFloors = () => CC_TOWER.stages.map(s => ({ ...s, ch: CC_TOWER }));
const ccTowerFloor = id => ccTowerFloors().find(s => s.id === id) || null;
/* "Floor 3" for a tower floor, "Stage 1-2" for a campaign stage */
const ccStLabel = st => st.ch && st.ch.tower ? `Floor ${st.no}` : `Stage ${st.id}`;
/* how high you have climbed: floors cleared in a row from the bottom */
function ccTowerTop() { let n = 0; for (const s of CC_TOWER.stages) { if (ccCampHave(s.id)[0]) n++; else break; } return n; }
const ccTowerStars = () => CC_TOWER.stages.reduce((t, s) => t + ccCampN(s.id), 0);
/* the Card Battle gate's red dot also lights while a tower floor is open and not cleared */
const ccTowerReady = () => ccTowerFloors().some(s => ccCampOpen(s) && !ccCampHave(s.id)[0]);
/* back to where a stage came from: the tower (on the floor that just opened, if any) or the campaign map */
function ccCampBack(st) {
  if (!(st && st.ch && st.ch.tower)) return openCampaign(st && st.id);
  const nx = ccCampNext(st); openTower(nx && !ccCampHave(nx.id)[0] ? nx.id : st.id);
}

/* ---------- the tower screen ---------- */
let twrEl = null, twrSel = null;
/* the tower's shared SVG paints (bricks, round-tower shading, stone, glass per floor state, banners, crystals) */
const TWR_DEFS = `<svg class="twr-defs" width="0" height="0" aria-hidden="true"><defs>
  <pattern id="twrBrk" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#3b3454"/><rect x="1" y="1" width="30" height="14" fill="#423a5e"/><rect x="-15" y="17" width="30" height="14" fill="#39324f"/><rect x="17" y="17" width="30" height="14" fill="#3f3759"/>
    <path d="M0 16H32M0 32H32M0 0V16M16 16V32" stroke="#211c33" stroke-width="2"/><path d="M2 2.2H30M2 18.2H14M18 18.2H30" stroke="#6b6294" stroke-width="1" opacity=".55"/></pattern>
  <pattern id="twrBlk" width="64" height="40" patternUnits="userSpaceOnUse"><rect width="64" height="40" fill="#353050"/><rect x="2" y="2" width="60" height="16" rx="2" fill="#3f3860"/><rect x="-30" y="22" width="60" height="16" rx="2" fill="#383152"/><rect x="34" y="22" width="60" height="16" rx="2" fill="#3c3559"/>
    <path d="M2 3H62M2 23H30M34 23H62" stroke="#6b6294" stroke-width="1.2" opacity=".5"/></pattern>
  <linearGradient id="twrCyl" x1="0" x2="1"><stop offset="0" stop-color="#07040f" stop-opacity=".82"/><stop offset=".13" stop-color="#07040f" stop-opacity=".34"/><stop offset=".36" stop-color="#e8dcff" stop-opacity=".07"/><stop offset=".62" stop-color="#07040f" stop-opacity=".12"/><stop offset=".88" stop-color="#07040f" stop-opacity=".55"/><stop offset="1" stop-color="#07040f" stop-opacity=".9"/></linearGradient>
  <linearGradient id="twrCo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#776d9e"/><stop offset=".45" stop-color="#4a4268"/><stop offset="1" stop-color="#221d33"/></linearGradient>
  <linearGradient id="twrCoG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".4" stop-color="#c9913f"/><stop offset="1" stop-color="#5a3b16"/></linearGradient>
  <linearGradient id="twrFr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a80b4"/><stop offset=".5" stop-color="#5a5280"/><stop offset="1" stop-color="#2e2844"/></linearGradient>
  <linearGradient id="twrFrG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".45" stop-color="#d9a24a"/><stop offset="1" stop-color="#6b4416"/></linearGradient>
  <pattern id="twrDn" width="16" height="9" patternUnits="userSpaceOnUse"><rect x="3" y="0" width="10" height="7" fill="#2c2642"/><rect x="3" y="0" width="10" height="1.5" fill="#8a80b4" opacity=".5"/></pattern>
  <radialGradient id="twrGl-lk" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#2a2348"/><stop offset=".7" stop-color="#14102a"/><stop offset="1" stop-color="#0a0816"/></radialGradient>
  <radialGradient id="twrGl-nw" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#f6dcff"/><stop offset=".6" stop-color="#b58cff"/><stop offset="1" stop-color="#3a2878"/></radialGradient>
  <radialGradient id="twrGl-cl" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffc870"/><stop offset=".75" stop-color="#c2662c"/><stop offset="1" stop-color="#4a1f10"/></radialGradient>
  <radialGradient id="twrGl-pf" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ffd8f2"/><stop offset=".55" stop-color="#c9b4ff"/><stop offset=".78" stop-color="#93dcff"/><stop offset="1" stop-color="#26286a"/></radialGradient>
  <linearGradient id="twrBan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a81f45"/><stop offset="1" stop-color="#520a20"/></linearGradient>
  <linearGradient id="twrCr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#d9c4ff"/><stop offset="1" stop-color="#7fb8ff"/></linearGradient>
  <linearGradient id="twrLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f9a62"/><stop offset="1" stop-color="#22462c"/></linearGradient>
  <linearGradient id="twrWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2416"/><stop offset=".5" stop-color="#6a4426"/><stop offset="1" stop-color="#2e1c10"/></linearGradient>
</defs></svg>`;
/* a small seeded random for each floor's weathered stones (the same every time) */
function twrRand(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* one floor's front, drawn in a 400×200 box: a round brick tower (darker at the edges), weathered stones, a big arched
   window lit by the floor's state (dark = locked, crystal = next to clear, warm = cleared, prism = all 3 stars), slit
   windows or (guardian floors) two crimson banners, wall sconces, ivy low down, crystals high up and the cornice */
function twrFacade(no, boss, state) {
  const r = twrRand(no * 7919 + 13), gl = { perfect: 'pf', clear: 'cl', new: 'nw' }[state] || 'lk', lit = gl !== 'lk';
  let stones = '';
  for (let k = 0; k < 8; k++) { const row = Math.floor(r() * 11), x = 46 + Math.floor(r() * 9) * 32 + (row % 2 ? 16 : 0); stones += `<rect x="${x + 1}" y="${row * 16 + 1}" width="30" height="14" fill="${r() > .5 ? '#51497a' : '#2a243e'}" opacity=".75"/>`; }
  const slit = x => `<path d="M${x} 118V74a7 7 0 0 1 14 0v44z" fill="url(#twrGl-${lit ? 'cl' : 'lk'})" stroke="#211c33" stroke-width="3" opacity="${lit ? .9 : .8}"/>`;
  const ban = `<g class="twr-ban"><rect x="70" y="2" width="40" height="5" rx="2.5" fill="#c9913f"/><path d="M73 6h34v104l-17-12-17 12z" fill="url(#twrBan)" stroke="#f3c56a" stroke-width="2"/><path d="M80 40l3.5 14 6.5-9 6.5 9L100 40l-5 4-5-8-5 8z" fill="#f3c56a"/><path d="M80 60h20" stroke="#f3c56a" stroke-width="2"/></g>`;
  const sconce = x => `<path d="M${x - 8} 104h16v3h-5l-2.5 9h-1l-2.5-9h-5z" fill="#17112a" stroke="#7a70a8" stroke-width="1"/>`;
  const ivy = no <= 2 ? `<path d="M56 184C62 160 50 140 64 118S54 76 70 52" stroke="#24412c" stroke-width="3.5" fill="none"/>${[[60, 168], [54, 150], [64, 130], [58, 108], [62, 88], [68, 66], [72, 54]].map(([x, y], i) => `<ellipse cx="${x + (i % 2 ? 6 : -4)}" cy="${y}" rx="7" ry="4.5" transform="rotate(${i % 2 ? 30 : -30} ${x} ${y})" fill="url(#twrLeaf)"/>`).join('')}` : '';
  const crys = no >= 7 ? `<path d="M38 180l5-17 5 17zM47 180l4-11 4 11zM31 180l3-8 3 8z" fill="url(#twrCr)" opacity=".9"/><path d="M362 180l-5-17-5 17zM353 180l-4-11-4 11zM369 180l-3-8-3 8z" fill="url(#twrCr)" opacity=".9"/>` : '';
  const cx0 = boss ? 6 : 26, cw = boss ? 388 : 348, ghost = state === 'ghost';
  return `<svg class="twr-fs" viewBox="0 0 400 200" aria-hidden="true">
    <rect x="46" y="0" width="308" height="184" fill="url(#twrBrk)"/>${stones}
    ${no >= 7 ? `<rect x="46" y="0" width="308" height="184" fill="#bcd6ff" opacity="${(.05 + (no - 7) * .03).toFixed(2)}"/>` : ''}
    <rect x="46" y="0" width="308" height="184" fill="url(#twrCyl)"/><rect x="47" y="0" width="2.5" height="184" fill="#dccdff" opacity=".28"/>
    ${boss ? `${ban}<g transform="translate(220 0)">${ban}</g>` : `${slit(84)}${slit(302)}`}
    <path d="M144 150V86a56 56 0 0 1 112 0v64z" fill="url(#${boss ? 'twrFrG' : 'twrFr'})"/>
    <path d="M154 144V88a46 46 0 0 1 92 0v56z" fill="url(#twrGl-${ghost ? 'lk' : gl})"/>
    <path d="M200 42v102M154 102h92M168 52l16 26M232 52l-16 26" stroke="#120d22" stroke-width="2.6" opacity=".45"/>
    <path d="M192 24h16l-3 14h-10z" fill="url(#${boss ? 'twrFrG' : 'twrFr'})"/>
    <rect x="136" y="144" width="128" height="10" rx="2" fill="url(#twrCo)"/><rect x="136" y="144" width="128" height="2" fill="#d6c8ff" opacity=".4"/>
    ${ghost ? '' : sconce(118) + sconce(282)}${ivy}
    <rect x="${cx0}" y="180" width="${cw}" height="20" fill="url(#${boss ? 'twrCoG' : 'twrCo'})"/><rect x="${cx0}" y="180" width="${cw}" height="2.5" fill="${boss ? '#fff1c4' : '#d6c8ff'}" opacity=".5"/><rect x="${cx0}" y="191" width="${cw}" height="9" fill="url(#twrDn)"/>${crys}
  </svg>`;
}
/* the gate at the foot of the tower: big foundation blocks, an open double door with crystal light, steps and braziers */
const TWR_BASE = `<svg class="twr-fs" viewBox="0 0 400 240" aria-hidden="true">
  <rect x="22" y="0" width="356" height="212" fill="url(#twrBlk)"/><rect x="22" y="0" width="356" height="212" fill="url(#twrCyl)"/>
  <rect x="12" y="0" width="376" height="18" fill="url(#twrCo)"/><rect x="12" y="15" width="376" height="3" fill="#120d22" opacity=".5"/>
  <path d="M136 212V124a64 64 0 0 1 128 0v88z" fill="url(#twrFr)"/>
  <path d="M148 212V126a52 52 0 0 1 104 0v86z" fill="url(#twrGl-nw)"/>
  <path d="M148 212V126c0-20 10-36 26-45v131z" fill="url(#twrWood)"/><path d="M252 212V126c0-20-10-36-26-45v131z" fill="url(#twrWood)"/>
  <path d="M148 150h26M148 186h26M226 150h26M226 186h26" stroke="#1a120c" stroke-width="3"/><circle cx="170" cy="170" r="2.5" fill="#d9a24a"/><circle cx="230" cy="170" r="2.5" fill="#d9a24a"/>
  <path d="M192 56h16l-3 14h-10z" fill="url(#twrFr)"/>
  <path d="M90 160h20v52H90zM290 160h20v52h-20z" fill="url(#twrFr)"/><path d="M80 152h40l-7 10H87zM280 152h40l-7 10h-26z" fill="#1c1530" stroke="#8a80b4" stroke-width="1.2"/>
  <rect x="122" y="212" width="156" height="9" fill="#4d4570"/><rect x="104" y="221" width="192" height="9" fill="#3d365a"/><rect x="86" y="230" width="228" height="10" fill="#2f2946"/>
  <path d="M122 212.5h156M104 221.5h192M86 230.5h228" stroke="#a89ed2" stroke-width="1" opacity=".5"/>
</svg>`;
function openTower(id) {
  closeModal(); ccSave(); if (ccdEl) { ccdEl.remove(); ccdEl = null; } if (cmpEl) { cmpEl.remove(); cmpEl = null; }
  if (!twrEl) { twrEl = document.createElement('div'); twrEl.className = 'cmp twr'; twrEl.setAttribute('role', 'dialog'); twrEl.setAttribute('aria-label', 'Card Battle tower'); document.body.appendChild(twrEl); }
  const L = ccTowerFloors(), open = L.filter(ccCampOpen);
  twrSel = id || (L.find(s => s.id === twrSel) ? twrSel : null) || (open.find(s => !ccCampHave(s.id)[0]) || open[open.length - 1] || L[0]).id;
  renderTower(true);
}
function closeTower() { if (twrEl) { twrEl.remove(); twrEl = null; } renderMenu(); }
/* which floors show: every cleared one, the next one to clear, one more above it, and a third half lost in the clouds
   (drawn even past the last floor, as the tower going on); nothing higher is drawn at all, so scrolling up only ever
   reaches clouds and the tower's height never shows */
function twrView() {
  const L = ccTowerFloors(), n = L.length, c = ccTowerTop() + 1;   // c = the floor to clear next (n + 1 when all are cleared)
  return { L, n, c, vis: Math.min(n, c + 1), haze: c + 2 <= n ? c + 2 : 0 };
}
function twrFloorState(f) { const k = ccCampN(f.id); return ccCampOpen(f) ? (ccCampHave(f.id)[0] ? (k === 3 ? 'perfect' : 'clear') : 'new') : 'locked'; }
function renderTower(center) {
  if (!twrEl) return;
  const old = twrEl.querySelector('.twr-view'), keep = old && !center ? old.scrollHeight - old.scrollTop : null;   // keep the view where it was, counted from the bottom
  const V = twrView(), st = ccTowerFloor(twrSel) || V.L[0], sv = ccSave(), seen = sv.towerSeen || 0, top = ccTowerTop(), stars = ccTowerStars();
  const fresh = f => f.no > seen && seen > 0;   // floors that just came out of the clouds play the reveal
  const floor = f => { const s = twrFloorState(f), have = ccCampHave(f.id);
    return `<button class="twr-fl ${s} ${f.boss ? 'boss' : ''} ${f.id === st.id ? 'sel' : ''} ${fresh(f) ? 'reveal' : ''}" data-floor="${f.id}" aria-label="Floor ${f.no}: ${esc(f.name)}${s === 'locked' ? ', locked' : ''}">${twrFacade(f.no, f.boss, s)}
      <span class="twr-win"><span class="twr-med"><small>Floor</small><b>${f.no}</b>${s === 'locked' ? `<i class="twr-lk">${icon('lock')}</i>` : ''}</span>${f.boss ? `<i class="twr-crown">${icon('crown')}</i>` : ''}${s === 'new' ? '<i class="twr-newtag">Next</i>' : ''}</span>
      <span class="twr-plq"><span class="twr-nm">${esc(f.name)}</span>${ccStars(have)}</span>
      ${s === 'locked' ? '' : '<i class="twr-torch l"></i><i class="twr-torch r"></i>'}</button>`; };
  const hz = V.haze ? V.L[V.haze - 1] : null;
  const shown = V.L.slice(0, V.vis).reverse();   // top to bottom
  const msg = V.c > V.n ? `<b>The clouds hide what is still being built</b><small>More floors are coming soon.</small>` : `<b>Hidden in the clouds</b><small>Clear floor ${V.c} to see higher.</small>`;
  twrEl.innerHTML = `${TWR_DEFS}
    <header class="cmp-head twr-head"><div class="inv-title"><span class="inv-badge">${icon('tower')}</span><h2 class="ts">Tower</h2></div>
      <div class="twr-stats"><span class="twr-chip">${icon('up')}<small>Highest floor</small><b>${top || '–'}</b></span><span class="twr-chip st">${CC_STAR_SVG}<b>${stars}</b><small>stars</small></span></div>
      <span class="cmp-sp"></span>
      <button class="btn ghost" id="twrCamp" title="Campaign">${icon('map')}<span class="twr-bl">Campaign</span></button><button class="btn ghost" id="twrDeck" title="Deck">${CC_IC}<span class="twr-bl">Deck</span></button><button class="btn ghost" id="twrQuick" title="Quick match">${icon('bolt')}<span class="twr-bl">Quick match</span></button>
      <button class="inv-x" id="twrClose" aria-label="Close">${icon('close')}</button></header>
    <section class="twr-stage"><div class="twr-sky"><i class="twr-moon"></i><i class="twr-aur"></i></div>
      <div class="twr-view"><div class="twr-col">
        <i class="twr-far"></i>${[.7, 2.4, 4.3, 6.6, 8.8].map((k, i) => `<i class="twr-wisp w${i % 3}" style="--b:${k}"></i>`).join('')}
        ${[[1.7, 'l'], [3.3, 'r k2'], [4.9, 'l sm'], [6.2, 'r'], [7.9, 'l k2'], [9.6, 'r sm']].map(([k, c]) => `<i class="twr-isle ${c}" style="--b:${k}"></i>`).join('')}
        <div class="twr-cap ${seen && V.vis > seen ? 'lift' : ''}"><i class="twr-cl c1"></i><i class="twr-cl c2"></i><i class="twr-cl c3"></i>
          <div class="twr-capmsg">${icon('lock')}<span>${msg}</span></div></div>
        <div class="twr-fl ghost" aria-hidden="true">${twrFacade(V.vis + 2, false, 'ghost')}</div>
        <div class="twr-fl haze ${hz && hz.boss ? 'boss' : ''}" aria-hidden="true">${twrFacade(V.vis + 1, !!(hz && hz.boss), 'locked')}<span class="twr-win"><span class="twr-med"><b>?</b></span></span></div>
        ${shown.map(floor).join('')}
        <div class="twr-base">${TWR_BASE}<span class="twr-sign">${esc(CC_TOWER.name)}</span><i class="twr-torch b l"></i><i class="twr-torch b r"></i></div>
        <div class="twr-ground"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 200V118C140 92 290 56 400 40h200c110 16 260 52 400 78v82z" fill="#120d22"/><path d="M0 118C140 92 290 56 400 40h200c110 16 260 52 400 78" fill="none" stroke="#4a3f78" stroke-width="3"/><path d="M90 104l18-14 14 12zM820 92l22-16 16 18zM300 62l12-10 10 9zM690 60l14-10 12 10z" fill="#2a2244"/></svg></div>
      </div></div>
      <button class="twr-jump" id="twrJump" hidden>${icon('up')}<span>Floor ${Math.min(V.c, V.n)}</span></button>
    </section>
    <aside class="cmp-side twr-side">${ccCampPanel(st)}</aside>`;
  sv.towerSeen = V.vis; persist();
  const view = twrEl.querySelector('.twr-view');
  twrEl.querySelector('#twrClose').onclick = closeTower;
  twrEl.querySelector('#twrCamp').onclick = () => { if (twrEl) { twrEl.remove(); twrEl = null; } openCampaign(); };
  twrEl.querySelector('#twrDeck').onclick = () => { closeTower(); openDeck(); };
  twrEl.querySelector('#twrQuick').onclick = () => openQuickMatch();
  twrEl.querySelectorAll('[data-floor]').forEach(b => b.onclick = () => twrSelect(b.dataset.floor));
  twrEl.querySelector('#twrJump').onclick = () => twrCenter(twrEl.querySelector(`[data-floor="${(V.L[Math.min(V.c, V.n) - 1] || V.L[0]).id}"]`), true);
  view.addEventListener('scroll', twrJumpCheck, { passive: true });
  twrBindPanel(st);
  requestAnimationFrame(() => { if (!twrEl) return; if (keep != null) view.scrollTop = view.scrollHeight - keep; else twrCenter(twrEl.querySelector('.twr-fl.sel'), false); twrJumpCheck(); });
}
/* scroll the tower so a floor sits in the middle of the view */
function twrCenter(el, smooth) {
  const view = twrEl && twrEl.querySelector('.twr-view'); if (!view || !el) return;
  const y = el.offsetTop + el.offsetHeight / 2 - view.clientHeight / 2;
  view.scrollTo({ top: Math.max(0, y), behavior: smooth ? 'smooth' : 'auto' });
}
/* the "Floor n" button shows while the floor to clear next is out of sight, pointing up or down to it */
function twrJumpCheck() {
  if (!twrEl) return;
  const view = twrEl.querySelector('.twr-view'), j = twrEl.querySelector('#twrJump'), cur = twrEl.querySelector('.twr-fl.new') || twrEl.querySelector('.twr-fl.sel');
  if (!view || !j || !cur) return;
  const a = view.getBoundingClientRect(), b = cur.getBoundingClientRect(), off = b.bottom < a.top + 40 ? 'up' : b.top > a.bottom - 40 ? 'down' : '';
  j.hidden = !off; j.classList.toggle('down', off === 'down');
}
/* picking a floor only redraws the panel and the selection, so the clouds and torches keep moving */
function twrSelect(id) {
  const st = ccTowerFloor(id); if (!st || !twrEl) return;
  twrSel = id;
  twrEl.querySelectorAll('.twr-fl.sel').forEach(x => x.classList.remove('sel'));
  const b = twrEl.querySelector(`[data-floor="${id}"]`); if (b) b.classList.add('sel');
  const side = twrEl.querySelector('.twr-side'); side.innerHTML = ccCampPanel(st); side.scrollTop = 0;
  twrBindPanel(st);
}
function twrBindPanel(st) {
  const go = twrEl.querySelector('#cmpGo'); if (go) go.onclick = () => ccCampStart(st);
  const ls = twrEl.querySelector('#cmpLesson'); if (ls) ls.onclick = () => ccRules(st.rules || 0);
  const dp = twrEl.querySelector('#cmpDeckPick'); if (dp) dp.onclick = () => ccCampDeckPick();
}
