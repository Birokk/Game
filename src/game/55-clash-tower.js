/* ---------- Card Clash: the Great Tree (a giant tree of floors; it was a stone tower, the Cloud Spire) ----------
   The owner asked for a special tower, then for it to be a big tree in the middle of the world map (56-clash-world.js):
   every cleared floor opens the one above it, 10 floors for now, the campaign's
   star system (3 stars per floor, every goal needs a win, stars kept once earned, 1 pearl per new star) but no
   milestone rewards. Floors are played with your own deck (like campaign Chapters 1 and 2) against a floor guardian.
   The tree is drawn floor by floor from the roots at the bottom; only the next floor or two above the one you can
   play are visible, everything higher is hidden in a bank of clouds (and not even in the page), so scrolling up never
   shows how tall the tree is. Floors reuse the campaign's stage machinery (54-clash-campaign.js): the same match
   setup (ccCampMatch), star bookkeeping (ccCampStarsOf, ccCampFinish), coach tips and end screen; a floor is a stage
   whose chapter is CC_TOWER (`tower: true`). Stars live with the campaign's: S.cc.camp.stars['T1' … 'T10'].
   The top of this file is pure (no DOM), so Node can test it. */

const CC_TOWER_DECKS = {
  // the Sky Sovereign's deck: the heaviest hitters of every playstyle
  spire: ['AGG-U08', 'AGG-U08', 'AGG-U07', 'AGG-U07', 'DEF-U04', 'DEF-U04', 'CON-U02', 'CON-U02', 'CON-U04', 'CON-U04', 'MOB-U06', 'MOB-U06', 'SUP-U06', 'SUP-U06', 'SUP-U02', 'SUP-U02',
    'AGG-S02', 'AGG-S02', 'CON-S04', 'CON-S04', 'DEF-S02', 'DEF-S02', 'DEF-T02', 'DEF-T02', 'CON-T02', 'CON-T02', 'SUP-E02', 'SUP-E02', 'DEF-E02', 'DEF-E02']
};
const CC_TOWER = {
  id: 'tower', tower: true, own: true, name: 'The Great Tree', sub: 'Great Tree', miles: [],
  stages: [
    { id: 'T1', no: 1, name: 'The Root Gate', twist: 'A Guardian bars the roots', hp: [20, 8], first: 0, seed: 401, botDeck: 'p-balanced',
      intro: 'Among the roots of the Great Tree a Guardian bars the door. Nobody climbs without getting past it first.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U02', 1, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }, { k: 'round', n: 18, t: 'Win by round 18' }],
      tips: ccOne('The Great Tree: every floor you clear opens the one above. The Guardian holds the middle, so the side lanes are open.') },
    { id: 'T2', no: 2, name: 'The Echoing Hollow', twist: 'Arcane Surge: spells deal +1', ev: 'surge', hp: [20, 10], first: 0, seed: 402, bot: CC_CAMP_DECKS.arcane,
      intro: 'A hollow deep in the trunk where every spell echoes twice as loud. Battle mages wait for you, a Mage already in the back row.',
      setup: G => { ccCampUnit(G, 1, 'CON-U01', 0, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'kills', n: 6, t: 'Destroy 6 enemy units' }, { k: 'hp', n: 10, t: 'Finish with 10 HP or more' }],
      tips: ccOne('<b>Arcane Surge</b>: spells deal +1 damage, theirs and yours. A Mage sits unguarded in the left back row.') },
    { id: 'T3', no: 3, name: 'The Ironbark Armory', twist: 'Heavy armour · a Bulwark on guard', hp: [20, 10], first: 0, seed: 403, bot: CC_CAMP_DECKS.fort,
      intro: 'Shields of ironbark hang from the branches, and the floor guardian wears all of it. A Bulwark already holds the left lane.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U04', 0, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'round', n: 20, t: 'Win by round 20' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }],
      tips: ccOne('The Bulwark has 8 HP: don\'t trade into it. Win the other two lanes and hit the hero.') },
    { id: 'T4', no: 4, name: 'Windswept Boughs', twist: 'Tailwind: moving is free · rogues strike first', ev: 'wind', hp: [20, 16], first: 1, seed: 404, bot: CC_CAMP_DECKS.storm,
      intro: 'A walkway winds round the outside of the trunk, high above the forest. The wind carries everyone, and rogues dart from lane to lane. They strike first.',
      setup: G => { ccCampUnit(G, 1, 'MOB-U03', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'kills', n: 8, t: 'Destroy 8 enemy units' }],
      tips: ccOne('<b>Tailwind</b>: moving costs no AP. Their rogues will switch lanes to find an open one, so keep every lane covered.') },
    { id: 'T5', no: 5, name: 'The Thorn Warden', twist: 'Guardian floor: a Champion and a trap', boss: true, hp: [20, 16], first: 1, seed: 405, bot: CC_CAMP_DECKS.warlord,
      intro: 'Halfway up, the Thorn Warden keeps the way. A Champion stands in the middle over a Thorns trap, and the Warden moves first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U08', 1, 0); ccCampTrap(G, 1, 'DEF-T02', 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('The Thorn Warden: a Champion (5 ATK) in the middle with Thorns under it, and it moves first. Don\'t attack into that lane with your best unit.') },
    { id: 'T6', no: 6, name: 'The Starleaf Library', twist: 'Starfall: draw 3 a turn · a Counter Trap', ev: 'starfall', hp: [20, 11], first: 0, seed: 406, bot: CC_CAMP_DECKS.arcane,
      intro: 'Shelves carved into the heartwood hold star charts on glowing leaves. Starlight gives both sides three cards a turn, and a Stormcaller studies in the right back row.',
      setup: G => { ccCampUnit(G, 1, 'CON-U04', 2, 1); ccCampTrap(G, 1, 'DEF-T01', 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }, { k: 'hp', n: 8, t: 'Finish with 8 HP or more' }],
      tips: ccOne('<b>Starfall</b>: three cards a turn, so hands fill up fast. A Counter Trap waits in the left lane.') },
    { id: 'T7', no: 7, name: 'The Dewdrop Hall', twist: 'A trap in every lane · they strike first', hp: [20, 20], first: 1, seed: 407, bot: CC_CAMP_DECKS.traps,
      intro: 'Every shining dewdrop hides a snare. A trap waits in all three lanes, a Knight guards the middle and an Archer covers the right. They strike first.',
      setup: G => { ccCampTrap(G, 1, 'MOB-T02', 0); ccCampTrap(G, 1, 'DEF-T02', 1); ccCampTrap(G, 1, 'CON-T02', 2); ccCampUnit(G, 1, 'DEF-U01', 1, 0); ccCampUnit(G, 1, 'MOB-U04', 2, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'lost', n: 5, t: 'Lose no more than 5 units' }, { k: 'round', n: 16, t: 'Win by round 16' }],
      tips: ccOne('Three traps, one per lane. Spring them with cheap units before your best ones walk in.') },
    { id: 'T8', no: 8, name: 'The Crimson Bloom', twist: 'Blood Moon · raiders strike first', ev: 'bloodmoon', hp: [20, 16], first: 1, seed: 408, bot: CC_CAMP_DECKS.raiders,
      intro: 'Red moonlight floods a crown of crimson blossoms. Raiders charge out of the petals, a Berserker and a Raider in front, and they strike first.',
      setup: G => { ccCampUnit(G, 1, 'AGG-U03', 0, 0); ccCampUnit(G, 1, 'AGG-U02', 2, 0); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'round', n: 12, t: 'Win by round 12' }],
      tips: ccOne('<b>Blood Moon</b>: every unit has +1 ATK, and they move first with two attackers out. Block both lanes right away.') },
    { id: 'T9', no: 9, name: 'The Frostbough', twist: 'Rainstorm: 5 AP · the bot strikes first', ev: 'rain', hp: [20, 12], first: 1, seed: 409, bot: CC_CAMP_DECKS.frost,
      intro: 'Icy branches ring like bells in the storm near the top of the tree. A Frost Witch hides behind a Stonewall in the middle, and they strike first.',
      setup: G => { ccCampUnit(G, 1, 'DEF-U07', 1, 0); ccCampUnit(G, 1, 'CON-U02', 1, 1); },
      stars: [{ k: 'win', t: 'Clear the floor' }, { k: 'hp', n: 6, t: 'Finish with 6 HP or more' }, { k: 'kills', n: 10, t: 'Destroy 10 enemy units' }],
      tips: ccOne('<b>Rainstorm</b>: 5 AP a turn for both. The Frost Witch stuns what she hits; the Stonewall shields her.') },
    { id: 'T10', no: 10, name: 'The Sky Sovereign', twist: 'Guardian floor: a full war council', boss: true, hp: [20, 16], first: 1, seed: 410, bot: CC_TOWER_DECKS.spire,
      intro: 'At the top of the known tree the Sky Sovereign holds court: a Champion and a Commander in line, traps in two lanes, 16 HP, and it moves first.',
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

/* ---------- the tree screen (kept the twr- names from the tower it used to be) ---------- */
let twrEl = null, twrSel = null;
/* the tree's shared SVG paints: bark, round-trunk shading, the hollows' rims and glow per floor state, wood, banners */
const TWR_DEFS = `<svg class="twr-defs" width="0" height="0" aria-hidden="true"><defs>
  <pattern id="trBark" width="44" height="90" patternUnits="userSpaceOnUse"><rect width="44" height="90" fill="#5b3c27"/>
    <path d="M6 0C2 22 11 44 5 66S8 84 6 90M20 0C24 18 16 40 22 60S18 80 21 90M34 0C30 26 38 46 33 70S36 84 35 90" stroke="#2e1c11" stroke-width="3.2" fill="none"/>
    <path d="M12 0C9 24 15 46 12 70S13 86 12 90M28 0C31 20 25 42 28 64" stroke="#7d5737" stroke-width="1.6" fill="none" opacity=".7"/></pattern>
  <linearGradient id="twrCyl" x1="0" x2="1"><stop offset="0" stop-color="#07040f" stop-opacity=".8"/><stop offset=".14" stop-color="#07040f" stop-opacity=".32"/><stop offset=".36" stop-color="#ffe9cf" stop-opacity=".09"/><stop offset=".62" stop-color="#07040f" stop-opacity=".12"/><stop offset=".88" stop-color="#07040f" stop-opacity=".55"/><stop offset="1" stop-color="#07040f" stop-opacity=".9"/></linearGradient>
  <linearGradient id="trRim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8794d"/><stop offset=".5" stop-color="#6e4a2e"/><stop offset="1" stop-color="#3a2416"/></linearGradient>
  <linearGradient id="twrFrG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c4"/><stop offset=".45" stop-color="#d9a24a"/><stop offset="1" stop-color="#6b4416"/></linearGradient>
  <linearGradient id="trLimb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4a30"/><stop offset="1" stop-color="#2e1c11"/></linearGradient>
  <linearGradient id="trPlank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b48452"/><stop offset=".45" stop-color="#7a5232"/><stop offset="1" stop-color="#3a2416"/></linearGradient>
  <linearGradient id="trPlankG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9b0"/><stop offset=".4" stop-color="#c9913f"/><stop offset="1" stop-color="#5a3b16"/></linearGradient>
  <radialGradient id="twrGl-lk" cx=".5" cy=".55" r=".7"><stop offset="0" stop-color="#2a1c18"/><stop offset=".7" stop-color="#140d0b"/><stop offset="1" stop-color="#0a0606"/></radialGradient>
  <radialGradient id="twrGl-nw" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#f6dcff"/><stop offset=".6" stop-color="#b58cff"/><stop offset="1" stop-color="#3a2878"/></radialGradient>
  <radialGradient id="twrGl-cl" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#fff6d6"/><stop offset=".35" stop-color="#ffc870"/><stop offset=".75" stop-color="#c2662c"/><stop offset="1" stop-color="#4a1f10"/></radialGradient>
  <radialGradient id="twrGl-pf" cx=".5" cy=".5" r=".65"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ffd8f2"/><stop offset=".55" stop-color="#c9b4ff"/><stop offset=".78" stop-color="#93dcff"/><stop offset="1" stop-color="#26286a"/></radialGradient>
  <linearGradient id="twrBan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a81f45"/><stop offset="1" stop-color="#520a20"/></linearGradient>
  <linearGradient id="twrCr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#d9c4ff"/><stop offset="1" stop-color="#7fb8ff"/></linearGradient>
  <linearGradient id="twrWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2416"/><stop offset=".5" stop-color="#6a4426"/><stop offset="1" stop-color="#2e1c10"/></linearGradient>
  <radialGradient id="trShroom" cx=".5" cy=".7" r=".7"><stop offset="0" stop-color="#e9fbff"/><stop offset=".5" stop-color="#7fe0ff"/><stop offset="1" stop-color="#2b6f9a"/></radialGradient>
</defs></svg>`;
/* a small seeded random for each floor's details (the same every time) */
function twrRand(seed) { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
/* the trunk's half width at the bottom of a floor: the tree narrows as it rises, and each floor's top meets the next floor's bottom */
const trW = no => 122 - Math.min(no, 14) * 2.6;
/* leaves by height: deep green low down, lush green with pink blossoms in the middle, silver-lavender with crystal fruit up high */
const TR_LEAF = [['#2c6337', '#3b8146', '#24522d', '#7fc27a'], ['#357a40', '#4b9a50', '#2b6636', '#a6e48e'], ['#6a78c0', '#8796de', '#56609f', '#e2e8ff']];
const TR_SHADE = ['#143220', '#1b4226', '#323a78'];
function trLeaves(r, cx, cy, k, tier, sp = 30) {
  const P = TR_LEAF[tier]; let sh = '', out = '', hi = '', fx = '';
  for (let i = 0; i < k; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * sp, x = cx + Math.cos(a) * d * 1.45, y = cy + Math.sin(a) * d * .78, rad = 14 + r() * 15, f = v => v.toFixed(0);
    sh += `<circle cx="${f(x + rad * .2)}" cy="${f(y + rad * .28)}" r="${f(rad * 1.04)}" fill="${TR_SHADE[tier]}"/>`;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${P[i % 3]}"/>`;
    hi += `<circle cx="${f(x - rad * .3)}" cy="${f(y - rad * .35)}" r="${f(rad * .45)}" fill="${P[3]}" opacity=".35"/>`;
    if (r() < .6) for (let q = 0; q < 3; q++) { const b = -2.5 + q * .55 + r() * .3, ex = x + Math.cos(b) * rad * .96, ey = y + Math.sin(b) * rad * .96;
      hi += `<ellipse cx="${f(ex)}" cy="${f(ey)}" rx="4.2" ry="2.2" transform="rotate(${f(b * 57.3 + 90)} ${f(ex)} ${f(ey)})" fill="${P[3]}" opacity=".55"/>`; }
    if (tier === 1 && r() < .45) hi += `<circle cx="${f(x + rad * .3)}" cy="${f(y + rad * .1)}" r="3.2" fill="#ffb8dc"/><circle cx="${f(x + rad * .3)}" cy="${f(y + rad * .1)}" r="1.3" fill="#fff3a8"/>`;
    if (tier === 2 && r() < .35) hi += `<path d="M${f(x + 4)} ${f(y + 6)}l4 9-4 7-4-7z" fill="url(#twrCr)" opacity=".95"/>`;
    if (r() < .28) fx += `<circle class="tr-glint" cx="${f(x + (r() - .5) * rad)}" cy="${f(y + (r() - .5) * rad)}" r="1.7" fill="#fffbe0" style="animation-delay:-${(r() * 3).toFixed(1)}s"/>`; }
  return sh + out + hi + fx;
}
/* a point on a cubic Bézier */
const trBz = (t, a, b, c, d) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
/* one floor of the trunk, drawn in a 400×200 box (after the owner asked for a nicer tree, inspired by glowing spirit
   trees: luminous veins, hanging tendrils, glowing fungi): bark with long twisting ridges that carry on from floor to
   floor, seeded knots, moss low down and frost high up, **veins of light flowing up the bark** on lit floors, glowing
   bracket fungi, a big hollow lit by the floor's state (dark = locked, crystal = next to clear, warm = cleared, prism =
   all 3 stars) with a ring of runes, a big branch on one side and a smaller one on the other with layered leaves,
   **glowing tendrils swaying** under them and a hanging lantern each, an owl with blinking eyes on floor 3, crimson
   banners on guardian floors, and a wooden walkway with a rope railing round the trunk at the bottom */
function twrFacade(no, boss, state) {
  const r = twrRand(no * 7919 + 13), gl = { perfect: 'pf', clear: 'cl', new: 'nw' }[state] || 'lk', lit = gl !== 'lk', ghost = state === 'ghost';
  const tier = no <= 3 ? 0 : no <= 6 ? 1 : 2, wb = trW(no), wt = trW(no + 1), L0 = 200 - wb, L1 = 200 - wt, R0 = 200 + wb, R1 = 200 + wt, j = () => (r() - .5) * 16;
  const trunk = `M${L1} 0C${(L1 + j()).toFixed(0)} 62 ${(L0 + j()).toFixed(0)} 128 ${L0} 200L${R0} 200C${(R0 + j()).toFixed(0)} 128 ${(R1 + j()).toFixed(0)} 62 ${R1} 0Z`;
  let knots = '';
  for (let k = 0; k < 2; k++) { const left = (k + no) % 2, x = left ? L0 + 18 + r() * 14 : R0 - 18 - r() * 14, y = 40 + r() * 110;
    knots += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="6" ry="9" fill="#2e1c11" stroke="#8a6040" stroke-width="2"/><ellipse cx="${x.toFixed(0)}" cy="${(y - 1).toFixed(0)}" rx="2.5" ry="4" fill="#1a0f08"/>`; }
  // long bark ridges: each starts and ends at the same fraction of the trunk's width, so they run on into the floors above and below
  let ridges = '', veins = '';
  [.14, .3, .52, .7, .86].forEach((u, k) => { const xt = L1 + u * (R1 - L1), xb = L0 + u * (R0 - L0), c1 = xt + (r() - .5) * 30, c2 = xb + (r() - .5) * 30;
    const d = `M${xt.toFixed(0)} 0C${c1.toFixed(0)} 66 ${c2.toFixed(0)} 134 ${xb.toFixed(0)} 200`;
    ridges += `<path d="${d}" stroke="#1a0f08" stroke-width="7" fill="none" opacity=".5"/><path d="${d}" stroke="#a87a50" stroke-width="2.2" fill="none" opacity=".4" transform="translate(-3.5 0)"/>`;
    if (lit && !ghost && (k === 1 || k === 3)) veins += `<path d="${d}" stroke="#9fe6ff" stroke-width="6" fill="none" opacity=".18" stroke-dasharray="46 20" class="tr-vein" style="animation-delay:-${k * .7}s"/><path d="${d}" stroke="#e6f9ff" stroke-width="1.8" fill="none" opacity=".85" stroke-dasharray="46 20" class="tr-vein" style="animation-delay:-${k * .7}s"/>`; });
  const fungus = (side, y) => { const x = side < 0 ? L0 + (L1 - L0) * (1 - y / 200) + 6 : R0 + (R1 - R0) * (1 - y / 200) - 6, sx = side < 0 ? 1 : -1, c = lit && !ghost ? 'url(#trShroom)' : '#6a5440';
    return [0, 9, 17].map((o, q) => `<path d="M${x.toFixed(0)} ${(y + o).toFixed(0)}q${sx * (16 - q * 3)} -7 ${sx * (24 - q * 4)} 2q${-sx * 11} 5 ${-sx * (24 - q * 4)} -2z" fill="${c}" stroke="#2a1a10" stroke-width="1"/>`).join('') + (lit && !ghost ? `<circle class="tr-glint" cx="${(x + sx * 12).toFixed(0)}" cy="${(y + 4).toFixed(0)}" r="9" fill="#9fe6ff" opacity=".25"/>` : ''); };
  const fungi = fungus(no % 2 ? 1 : -1, 112 + r() * 30) + (no % 3 === 0 ? fungus(no % 2 ? -1 : 1, 150 + r() * 14) : '');
  const big = no % 2 ? 1 : -1;   // odd floors: big branch on the left, even floors on the right
  const limb = (side, size) => { const t = side < 0 ? '' : ' transform="translate(400 0) scale(-1 1)"', x0 = side < 0 ? L1 + (L0 - L1) * .35 : 400 - (R1 + (R0 - R1) * .35);
    const tipX = size ? -34 : 14, tipY = size ? 20 : 44, lx = 62;
    const shape = size ? `M${x0 + 8} 50C104 34 40 10 ${tipX} ${tipY}C36 34 98 72 ${x0 + 8} 98Z` : `M${x0 + 8} 60C100 52 52 40 ${tipX} ${tipY}C56 56 98 76 ${x0 + 8} 86Z`;
    const twig = size ? `<path d="M30 30C20 52 6 62 -8 66" stroke="#3a2416" stroke-width="5" fill="none"/>` : '';
    // glowing tendrils hanging from the underside of the branch, swaying
    const ub = size ? [tipX, 36, 98, x0 + 8, tipY, 34, 72, 98] : [tipX, 56, 98, x0 + 8, tipY, 56, 76, 86];
    let tend = '';
    if (!ghost) for (const tt of size ? [.18, .3, .44, .58, .72] : [.3, .55]) { const bx = trBz(tt, ub[0], ub[1], ub[2], ub[3]), by = trBz(tt, ub[4], ub[5], ub[6], ub[7]), len = 26 + r() * 40, bend = (r() - .5) * 14;
      tend += `<g class="tr-tend" style="animation-delay:-${(r() * 4).toFixed(1)}s"><path d="M${bx.toFixed(0)} ${by.toFixed(0)}q${bend.toFixed(0)} ${(len / 2).toFixed(0)} ${(bend / 3).toFixed(0)} ${len.toFixed(0)}" stroke="${tier === 2 ? '#aab4e8' : '#4f8a52'}" stroke-width="1.6" fill="none" opacity=".85"/>${lit ? `<circle class="tr-bulb" cx="${(bx + bend / 3).toFixed(0)}" cy="${(by + len).toFixed(0)}" r="2.6" fill="${tier === 2 ? '#e6ecff' : '#d8ffb8'}" style="animation-delay:-${(r() * 3).toFixed(1)}s"/>` : ''}</g>`; }
    // an owl sits on floor 3's big branch, blinking
    const owl = size && no === 3 && !ghost ? (() => { const ox = trBz(.52, x0 + 8, 104, 40, tipX), oy = trBz(.52, 50, 34, 10, tipY) - 2;
      return `<g transform="translate(${ox.toFixed(0)} ${oy.toFixed(0)})"><path d="M-8 0c-2-10 0-18 8-19 8 1 10 9 8 19z" fill="#4a3426"/><path d="M-7 -17l1-5 4 3M7 -17l-1-5-4 3" fill="#4a3426"/><path d="M-5 -2c0-5 10-5 10 0" fill="#8a6a4e"/><g class="tr-blink"><circle cx="-3.4" cy="-12" r="2.8" fill="#ffe28a"/><circle cx="3.4" cy="-12" r="2.8" fill="#ffe28a"/><circle cx="-3.4" cy="-12" r="1.2" fill="#1a0f08"/><circle cx="3.4" cy="-12" r="1.2" fill="#1a0f08"/></g><path d="M-1 -9l1 2 1-2z" fill="#d9a24a"/></g>`; })() : '';
    return `<g${t}><path d="${shape}" fill="url(#trLimb)"/>${twig}${tend}${size ? trLeaves(r, -20, 58, 6, tier, 20) + trLeaves(r, 44, 26, 6, tier, 22) : ''}${trLeaves(r, tipX + 4, tipY - 8, size ? 14 : 7, tier, size ? 40 : 24)}${owl}
      ${ghost ? '' : `<path d="M${lx} ${size ? 34 : 54}V104" stroke="#2a1a10" stroke-width="1.6"/><path d="M${lx - 7} 104h14l-2 4h-10z" fill="#3a2416"/><rect x="${lx - 8}" y="108" width="16" height="18" rx="3" fill="url(#twrGl-${lit ? (gl === 'nw' ? 'nw' : 'cl') : 'lk'})" stroke="#3a2416" stroke-width="2"/><path d="M${lx - 7} 126h14l-2 4h-10z" fill="#3a2416"/>`}</g>`; };
  const ban = x => `<g class="twr-ban"><rect x="${x - 2}" y="4" width="30" height="4" rx="2" fill="#c9913f"/><path d="M${x} 7h26v92l-13-10-13 10z" fill="url(#twrBan)" stroke="#f3c56a" stroke-width="1.8"/><path d="M${x + 5} 36l3 11 5-7 5 7 3-11-4 3-4-6-4 6z" fill="#f3c56a"/></g>`;
  const moss = tier === 0 ? `<path d="M${L0 + 2} 200c4-14 14-20 26-18 10-12 26-10 32 0" fill="#3b7a44" opacity=".85"/><path d="M${R0 - 2} 200c-6-12-18-16-28-12-8-8-20-6-26 2" fill="#2f6b3a" opacity=".8"/>` : '';
  const frost = tier === 2 ? `<path d="${trunk}" fill="#cfe0ff" opacity="${(.05 + (no - 7) * .025).toFixed(3)}"/>` : '';
  const pw = boss ? 182 : 166, plank = boss ? 'trPlankG' : 'trPlank';
  return `<svg class="twr-fs" viewBox="0 0 400 200" aria-hidden="true">
    ${limb(-big, 0)}
    <path d="${trunk}" fill="url(#trBark)"/>${ridges}${knots}${frost}<path d="${trunk}" fill="url(#twrCyl)"/>${veins}${fungi}
    ${limb(big, 1)}
    ${boss ? ban(L1 + 8) + ban(R1 - 34) : ''}
    <path d="M144 152C140 98 160 36 200 34C240 36 260 98 256 152Z" fill="url(#${boss ? 'twrFrG' : 'trRim'})"/>
    <path d="M155 147C152 102 168 48 200 46C232 48 248 102 245 147Z" fill="url(#twrGl-${ghost ? 'lk' : gl})"/>
    <path d="M168 60c10 6 16 20 14 34M232 60c-10 6-16 20-14 34" stroke="#1a0f08" stroke-width="2" fill="none" opacity=".35"/>
    ${lit && !ghost ? [[-62, 112], [-56, 72], [-38, 42], [0, 26], [38, 42], [56, 72], [62, 112]].map(([dx, y], q) => `<path class="tr-rune" d="M${200 + dx} ${y - 4}l3 4-3 4-3-4z" fill="${gl === 'nw' ? '#e9d6ff' : '#ffe6a8'}" style="animation-delay:-${(q * .4).toFixed(1)}s"/>`).join('') : ''}
    <path d="M146 147C168 158 232 158 254 147L252 158C230 166 170 166 148 158Z" fill="url(#${boss ? 'twrFrG' : 'trRim'})"/>
    ${moss}
    ${ghost ? '' : `<path d="M${200 - pw} 184Q200 176 ${200 + pw} 184L${200 + pw} 194Q200 206 ${200 - pw} 194Z" fill="url(#${plank})"/>
    <path d="M${200 - pw} 184.5Q200 176.5 ${200 + pw} 184.5" stroke="${boss ? '#fff1c4' : '#d9b07a'}" stroke-width="1.6" fill="none" opacity=".7"/>
    <path d="M${230 - pw} 183v12M${270 - pw} 181v13M${pw + 130} 181v13M${pw + 170} 183v12" stroke="#2a1a10" stroke-width="1.4" opacity=".55"/>
    <path d="M${208 - pw} 184v-15M${262 - pw} 181v-15M${pw + 138} 181v-15M${pw + 192} 184v-15" stroke="#4a2e1c" stroke-width="3.5"/>
    <path d="M${208 - pw} 171Q${235 - pw} 179 ${262 - pw} 168M${pw + 138} 168Q${pw + 165} 179 ${pw + 192} 171" stroke="#d9b07a" stroke-width="1.6" fill="none"/>`}
  </svg>`;
}
/* the roots at the foot of the tree: the trunk flaring into big roots, an open door with crystal light, root steps,
   two lantern posts and glowing mushrooms */
const TWR_BASE = `<svg class="twr-fs" viewBox="0 0 400 240" aria-hidden="true">
  <path d="M${200 - trW(1)} 0C104 90 84 150 26 216L374 216C316 150 296 90 ${200 + trW(1)} 0Z" fill="url(#trBark)"/>
${[.14, .3, .52, .7, .86].map(u => { const xt = 200 - trW(1) + u * trW(1) * 2, xb = 26 + u * 348, d = `M${xt.toFixed(0)} 0C${xt.toFixed(0)} 90 ${((xt + xb) / 2).toFixed(0)} 150 ${xb.toFixed(0)} 216`;
    return `<path d="${d}" stroke="#1a0f08" stroke-width="7" fill="none" opacity=".5"/><path d="${d}" stroke="#a87a50" stroke-width="2.2" fill="none" opacity=".4" transform="translate(-3.5 0)"/>`; }).join('')}
  <path d="M${200 - trW(1)} 0C104 90 84 150 26 216L374 216C316 150 296 90 ${200 + trW(1)} 0Z" fill="url(#twrCyl)"/>
${[.3, .7].map((u, k) => { const xt = 200 - trW(1) + u * trW(1) * 2, xb = 26 + u * 348, d = `M${xt.toFixed(0)} 0C${xt.toFixed(0)} 90 ${((xt + xb) / 2).toFixed(0)} 150 ${xb.toFixed(0)} 216`;
    return `<path d="${d}" stroke="#9fe6ff" stroke-width="6" fill="none" opacity=".18" stroke-dasharray="46 20" class="tr-vein" style="animation-delay:-${k}s"/><path d="${d}" stroke="#e6f9ff" stroke-width="1.8" fill="none" opacity=".85" stroke-dasharray="46 20" class="tr-vein" style="animation-delay:-${k}s"/>`; }).join('')}
  ${[[-70, 196], [-64, 160], [-48, 126], [-24, 100], [0, 92], [24, 100], [48, 126], [64, 160], [70, 196]].map(([dx, y], q) => `<path class="tr-rune" d="M${200 + dx} ${y - 4}l3 4-3 4-3-4z" fill="#e9d6ff" style="animation-delay:-${(q * .35).toFixed(2)}s"/>`).join('')}
  <path d="M60 196C30 210 6 222 -24 232L-20 240H60C68 222 82 210 100 202ZM340 196C370 210 394 222 424 232L420 240H340C332 222 318 210 300 202Z" fill="url(#trLimb)"/>
  <path d="M96 206C80 222 70 232 56 240H118C120 226 126 214 136 206ZM304 206C320 222 330 232 344 240H282C280 226 274 214 264 206Z" fill="#3d2717"/>
  <path d="M140 214V136a60 60 0 0 1 120 0v78z" fill="url(#trRim)"/>
  <path d="M152 214V138a48 48 0 0 1 96 0v76z" fill="url(#twrGl-nw)"/>
  <path d="M152 214V138c0-18 9-33 24-41v117z" fill="url(#twrWood)"/><path d="M248 214V138c0-18-9-33-24-41v117z" fill="url(#twrWood)"/>
  <path d="M152 156h24M152 190h24M224 156h24M224 190h24" stroke="#1a120c" stroke-width="3"/><circle cx="172" cy="174" r="2.5" fill="#d9a24a"/><circle cx="228" cy="174" r="2.5" fill="#d9a24a"/>
  <rect x="128" y="214" width="144" height="9" rx="4" fill="#6e4a2e"/><rect x="110" y="222" width="180" height="9" rx="4" fill="#5a3c27"/><rect x="92" y="230" width="216" height="10" rx="4" fill="#4a2e1c"/>
  <path d="M130 214.6h140M112 222.6h176M94 230.6h212" stroke="#c99a68" stroke-width="1" opacity=".55"/>
  <path d="M66 146h8v76h-8zM326 146h8v76h-8z" fill="#3a2416"/><path d="M60 126h20l-2 4H62zM320 126h20l-2 4h-16z" fill="#3a2416"/>
  <rect x="61" y="130" width="18" height="20" rx="3" fill="url(#twrGl-cl)" stroke="#3a2416" stroke-width="2"/><rect x="321" y="130" width="18" height="20" rx="3" fill="url(#twrGl-cl)" stroke="#3a2416" stroke-width="2"/>
  <path d="M28 226c0-10 18-10 18 0zM354 230c0-12 22-12 22 0zM112 234c0-7 12-7 12 0zM280 236c0-7 12-7 12 0z" fill="url(#trShroom)"/><path d="M36 226v8M365 230v8M118 234v5M286 236v4" stroke="#cfe9ef" stroke-width="2.4"/>
</svg>`;
function openTower(id) {
  closeModal(); ccSave(); if (ccdEl) { ccdEl.remove(); ccdEl = null; } if (cmpEl) { cmpEl.remove(); cmpEl = null; } if (wmEl) { wmEl.remove(); wmEl = null; }
  if (!twrEl) { twrEl = document.createElement('div'); twrEl.className = 'cmp twr'; twrEl.setAttribute('role', 'dialog'); twrEl.setAttribute('aria-label', 'The Great Tree'); document.body.appendChild(twrEl); }
  const L = ccTowerFloors(), open = L.filter(ccCampOpen);
  twrSel = id || (L.find(s => s.id === twrSel) ? twrSel : null) || (open.find(s => !ccCampHave(s.id)[0]) || open[open.length - 1] || L[0]).id;
  renderTower(true);
}
function closeTower() { if (twrEl) { twrEl.remove(); twrEl = null; } bthHome(); }
/* which floors show: every cleared one, the next one to clear, one more above it, and a third half lost in the clouds
   (drawn even past the last floor, as the tree going on); nothing higher is drawn at all, so scrolling up only ever
   reaches clouds and the tree's height never shows */
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
  const msg = V.c > V.n ? `<b>The clouds hide branches still growing</b><small>More floors are coming soon.</small>` : `<b>Hidden in the clouds</b><small>Clear floor ${V.c} to see higher.</small>`;
  twrEl.innerHTML = `${TWR_DEFS}
    <header class="cmp-head twr-head"><div class="inv-title"><span class="inv-badge">${icon('tree')}</span><h2 class="ts">Great Tree</h2></div>
      <div class="twr-stats"><span class="twr-chip">${icon('up')}<small>Highest floor</small><b>${top || '–'}</b></span><span class="twr-chip st">${CC_STAR_SVG}<b>${stars}</b><small>stars</small></span></div>
      <span class="cmp-sp"></span>
      <button class="btn ghost" id="twrCamp" title="World map">${icon('compass')}<span class="twr-bl">World map</span></button><button class="btn ghost" id="twrDeck" title="Deck">${CC_IC}<span class="twr-bl">Deck</span></button><button class="btn ghost" id="twrQuick" title="Quick match">${icon('bolt')}<span class="twr-bl">Quick match</span></button>
      <button class="inv-x" id="twrClose" aria-label="Close">${icon('close')}</button></header>
    <section class="twr-stage"><div class="twr-sky"><i class="twr-stars s1"></i><i class="twr-stars s2"></i><i class="twr-rays"></i><i class="twr-moon"></i><i class="twr-aur"></i><i class="twr-aur a2"></i>
        <i class="twr-skycl c1"></i><i class="twr-skycl c2"></i><i class="twr-shoot h1"></i><i class="twr-shoot h2"></i><i class="twr-shoot h3"></i>
        <span class="twr-birds"><i class="twr-bird b0"><svg viewBox="0 0 24 10"><path d="M0 4Q6 -1 12 6Q18 -1 24 4" fill="none" stroke="#120c22" stroke-width="2" stroke-linecap="round"/></svg></i><i class="twr-bird b1"><svg viewBox="0 0 24 10"><path d="M0 4Q6 -1 12 6Q18 -1 24 4" fill="none" stroke="#120c22" stroke-width="2" stroke-linecap="round"/></svg></i><i class="twr-bird b2"><svg viewBox="0 0 24 10"><path d="M0 4Q6 -1 12 6Q18 -1 24 4" fill="none" stroke="#120c22" stroke-width="2" stroke-linecap="round"/></svg></i></span></div>
      <div class="twr-view"><div class="twr-col">
        <i class="twr-far"></i><i class="twr-aura"></i>${[.7, 2.4, 4.3, 6.6, 8.8].map((k, i) => `<i class="twr-wisp w${i % 3}" style="--b:${k}"></i>`).join('')}
        ${[[1.7, 'l'], [3.3, 'r k2'], [4.9, 'l sm'], [6.2, 'r'], [7.9, 'l k2'], [9.6, 'r sm']].map(([k, c]) => `<i class="twr-isle ${c}" style="--b:${k}"></i>`).join('')}
        <div class="twr-cap ${seen && V.vis > seen ? 'lift' : ''}"><i class="twr-cl c1"></i><i class="twr-cl c2"></i><i class="twr-cl c3"></i>
          <div class="twr-capmsg">${icon('lock')}<span>${msg}</span></div></div>
        <div class="twr-fl ghost" aria-hidden="true">${twrFacade(V.vis + 2, false, 'ghost')}</div>
        <div class="twr-fl haze ${hz && hz.boss ? 'boss' : ''}" aria-hidden="true">${twrFacade(V.vis + 1, !!(hz && hz.boss), 'locked')}<span class="twr-win"><span class="twr-med"><b>?</b></span></span></div>
        ${shown.map(floor).join('')}
        <div class="twr-base">${TWR_BASE}<span class="twr-sign">${esc(CC_TOWER.name)}</span><i class="twr-torch b l"></i><i class="twr-torch b r"></i><i class="twr-spore s1"></i><i class="twr-spore s2"></i><i class="twr-spore s3"></i></div>
        <div class="twr-ground"><svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 200V118C140 92 290 56 400 40h200c110 16 260 52 400 78v82z" fill="#0d1510"/><path d="M0 118C140 92 290 56 400 40h200c110 16 260 52 400 78" fill="none" stroke="#2f5a3a" stroke-width="3"/><path d="M90 104l18-14 14 12zM820 92l22-16 16 18zM300 62l12-10 10 9zM690 60l14-10 12 10z" fill="#1c2a20"/><path d="M130 90c0-14 14-20 22-12 6-10 22-8 24 4 10-2 16 8 12 14zM820 94c0-12 12-18 20-11 5-9 20-7 22 4 9-2 14 7 10 13zM350 56c0-10 10-14 16-8 4-7 16-6 18 3 7-1 11 5 8 10zM630 54c0-10 10-14 16-8 4-7 16-6 18 3 7-1 11 5 8 10z" fill="#1d3a26"/><path d="M138 84c4-6 10-7 14-4M828 89c4-5 9-6 13-3M357 52c3-4 7-5 10-3M637 50c3-4 7-5 10-3" stroke="#3f7d47" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>
      </div></div>
      <canvas class="twr-fxc" aria-hidden="true"></canvas>
      <button class="twr-jump" id="twrJump" hidden>${icon('up')}<span>Floor ${Math.min(V.c, V.n)}</span></button>
    </section>
    <aside class="cmp-side twr-side">${ccCampPanel(st)}</aside>`;
  sv.towerSeen = V.vis; persist();
  const view = twrEl.querySelector('.twr-view');
  twrEl.querySelector('#twrClose').onclick = closeTower;
  twrEl.querySelector('#twrCamp').onclick = () => { if (twrEl) { twrEl.remove(); twrEl = null; } openWorld(); };
  twrEl.querySelector('#twrDeck').onclick = () => { closeTower(); openDeck(); };
  twrEl.querySelector('#twrQuick').onclick = () => openQuickMatch();
  twrEl.querySelectorAll('[data-floor]').forEach(b => b.onclick = () => twrSelect(b.dataset.floor));
  twrEl.querySelector('#twrJump').onclick = () => twrCenter(twrEl.querySelector(`[data-floor="${(V.L[Math.min(V.c, V.n) - 1] || V.L[0]).id}"]`), true);
  const stage = twrEl.querySelector('.twr-stage'), par = () => stage.style.setProperty('--sy', Math.round(view.scrollHeight - view.scrollTop - view.clientHeight));   // the sky moves a little as you climb
  view.addEventListener('scroll', () => { twrJumpCheck(); par(); }, { passive: true });
  twrFxStart(stage.querySelector('.twr-fxc'));
  twrBindPanel(st);
  requestAnimationFrame(() => { if (!twrEl) return; if (keep != null) view.scrollTop = view.scrollHeight - keep; else twrCenter(twrEl.querySelector('.twr-fl.sel'), false); twrJumpCheck(); par(); });
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

/* ---------- the living background: fireflies, falling leaves and rising spirit motes on one canvas over the tree ----------
   Screen pixels (at most 1.5× device pixels), time-based motion, its own requestAnimationFrame loop that stops by itself
   when the tree screen goes away; reduced motion: half the particles, slower. Glows are pre-drawn sprites (drawImage). */
const twrFx = { cv: null, raf: 0 };
function twrGlowSprite(col, r) {
  const c = document.createElement('canvas'); c.width = c.height = r * 2; const g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
}
function twrFxStart(cv) {
  cancelAnimationFrame(twrFx.raf); if (!cv) return;
  const red = matchMedia('(prefers-reduced-motion: reduce)').matches, ctx = cv.getContext('2d');
  const spr = { warm: twrGlowSprite('rgba(255,236,140,.55)', 24), cry: twrGlowSprite('rgba(214,186,255,.55)', 24), mote: twrGlowSprite('rgba(170,230,255,.6)', 14) };
  const LEAF = ['#4b9a50', '#3b8146', '#ffb8dc', '#8796de', '#a6e48e'];
  let w = 0, h = 0, dpr = 1, last = performance.now();
  const F = [], L = [], M = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const fit = () => { const W = cv.clientWidth, H = cv.clientHeight; if (W === w && H === h) return; w = W; h = H; dpr = Math.min(1.5, devicePixelRatio || 1); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const k = (red ? .5 : 1) * Math.max(.5, Math.min(1.4, w * h / 900000));
    F.length = 0; L.length = 0; M.length = 0;
    for (let i = 0; i < Math.round(46 * k); i++) F.push({ x: rnd(0, w), y: rnd(0, h), a: rnd(0, 6.3), sp: rnd(10, 26), ph: rnd(0, 6.3), s: rnd(.55, 1.1), c: Math.random() < .62 ? 'warm' : 'cry' });
    for (let i = 0; i < Math.round(14 * k); i++) L.push({ x: rnd(0, w), y: rnd(-h, h), vy: rnd(16, 34), sw: rnd(16, 42), f: rnd(.4, 1), ph: rnd(0, 6.3), rot: rnd(0, 6.3), vr: rnd(-1.6, 1.6), sz: rnd(5, 9), c: LEAF[Math.floor(Math.random() * LEAF.length)] });
    for (let i = 0; i < Math.round(22 * k); i++) M.push({ x: rnd(0, w), y: rnd(0, h), vy: rnd(8, 20), life: rnd(0, 1), dur: rnd(5, 10) }); };
  const frame = now => {
    if (!twrEl || !document.body.contains(cv)) { twrFx.raf = 0; return; }
    fit(); const dt = Math.min(.05, (now - last) / 1000) * (red ? .6 : 1), t = now / 1000; last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of M) { m.y -= m.vy * dt; m.life += dt / m.dur; if (m.life > 1 || m.y < -10) { m.life = 0; m.y = h + 10; m.x = rnd(0, w); }
      const a = Math.sin(m.life * Math.PI) * .8; ctx.globalAlpha = a; ctx.drawImage(spr.mote, m.x + Math.sin(t + m.dur) * 6 - 7, m.y - 7, 14, 14); }
    for (const p of F) { p.a += (Math.sin(t * .7 + p.ph) * 1.2) * dt; p.x += Math.cos(p.a) * p.sp * dt; p.y += Math.sin(p.a) * p.sp * .6 * dt;
      if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20; if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;
      const g = .35 + .65 * (.5 + .5 * Math.sin(t * 2.4 + p.ph)), z = 24 * p.s * (.8 + g * .4); ctx.globalAlpha = g; ctx.drawImage(spr[p.c], p.x - z, p.y - z, z * 2, z * 2); }
    ctx.globalCompositeOperation = 'source-over';
    for (const l of L) { l.y += l.vy * dt; l.rot += l.vr * dt; if (l.y > h + 20) { l.y = -20; l.x = rnd(0, w); }
      const x = l.x + Math.sin(t * l.f + l.ph) * l.sw; ctx.save(); ctx.translate(x, l.y); ctx.rotate(l.rot); ctx.scale(Math.cos(t * l.f * 2 + l.ph), 1); ctx.globalAlpha = .85;
      ctx.fillStyle = l.c; ctx.beginPath(); ctx.ellipse(0, 0, l.sz, l.sz * .45, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-l.sz, 0); ctx.lineTo(l.sz, 0); ctx.stroke(); ctx.restore(); }
    ctx.globalAlpha = 1;
    twrFx.raf = requestAnimationFrame(frame);
  };
  twrFx.cv = cv; twrFx.raf = requestAnimationFrame(frame);
}
