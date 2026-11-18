/* ---------- World map regions: a page of their own with a map, places on it and a short campaign (the owner's ask) ----------
   v2 (the owner's ask: "the main tab is a map of the region with buttons for specific stuff like a main lobby, battles…"):
   the page opens on its **Map** tab = the region's own map picture (`region:<id>`) with a button per place (RG_SPOTS, placed
   by the admin, S.farmLayout['rgp:<id>:<spot>']); for now the only place is **Battles**, which opens the **Battles** tab =
   the 3 stages on their own picture (`region:b:<id>`, size S.regionMaps['b:<id>']). More places (main lobby…) come later.
   Tapping a region on the world map (56-clash-world.js) opens its page: the admin's own wallpaper for that region
   (media `region:<id>`, its size in content S.regionMaps[id] = {w, h}; without one a drawn backdrop in the region's
   colour) used as a map, with one button per stage placed by the admin (S.farmLayout['rg:<id>:<n>'] = {x, y}, % of the
   picture). Each region has a campaign of 3 stages (RG_DATA) played with a **region deck**: 20 cards set by the region
   (locked, the owner's rule: "you're forced to play with specific cards") and 10 cards you pick yourself
   (S.cc.rg[regionId] = [10 card ids], prefilled with the region's suggestion). The stages reuse the campaign's stage
   machinery (ccCampMatch, stars, 1 pearl per new star, the coach, the end box): each region is a campaign-style
   "chapter" `rg-<id>` (regionCh: true, own: true, no miles) that is not in CC_CAMP, with stages `rg-<id>-1..3`.
   Kept easy (the owner's ask): stages 1 and 2 use the Easy brain, stage 3 (the region boss) the normal bot, bot HP 8-12,
   you always go first, no weakness / resistance (ch.no 0). The data part runs in the Node sims (camp/simR.js). */
const RG_N = 3, RG_LOCK = 20, RG_PICK = 10;
/* [region id, name, 10 locked cards (×2), 5 suggested picks (×2), stages: [name, twist, bot deck, bot HP, event, intro, coach tip, 2 star goals]] */
const RG_DATA = [
  ['plains', 'Plains', ['Swordsman', 'Knight', 'Archer', 'Guardian', 'Battle Medic', 'Commander', 'Fireball', 'Reinforce', 'Healing Light', 'Sharp Blade'], ['Raider', 'Scout', 'Priest', 'Quick Thinking', 'Counter Trap'], [
    ['The Windmill Road', 'Bandits on the farm road', 'p-rush', 8, null, 'Wheat as far as you can see, and a band of road bandits waiting by the old windmill.', 'Your region deck is a militia: Knights and Guardians hold the line while Archers shoot from the Back row.', [['hp', 12], ['round', 12]]],
    ['Harvest Storm', 'Rainstorm: 5 AP a turn', 'raiders', 10, 'rain', 'A summer storm rolls over the fields. Rain gives both sides more to spend.', '<b>Rainstorm</b>: 5 AP a turn. Summon two units a turn and keep every lane covered.', [['kills', 4], ['hp', 10]]],
    ['The Plains Warden', 'Region boss: a fort in the fields', 'fort', 12, null, 'An old stone fort guards the crossroads, and its warden does not let travellers pass.', 'The Warden plays a wall of shields. Fireball and Sharp Blade break through: hit the hero through the open lane.', [['round', 16], ['lost', 4]]]]],
  ['forest', 'Forest', ['Druid', 'Herbalist', 'Archer', 'Scout', 'Runner', 'Priest', 'Bannerbearer', 'Healing Potion', 'Net Trap', 'Light Boots'], ['Knight', 'Guardian', 'Fireball', 'Strengthen', 'Healing Spring'], [
    ['Mossy Trail', 'Rogues in the ferns', 'storm', 8, null, 'Sunlight through the leaves, and quick rogues hiding in the ferns along the trail.', 'Your forest deck heals and runs: Druids and Herbalists keep your units alive, Runners and Scouts reach open lanes.', [['hp', 12], ['round', 12]]],
    ['The Snare Glade', 'A trap in every lane', 'traps', 10, null, 'Hunters left snares all over this glade. Every lane hides one.', 'Each lane has a face-down trap. Send a cheap unit first to set it off, then attack.', [['kills', 3], ['lost', 4]]],
    ['The Old Grove', 'Region boss: the grove keepers', 'holy', 9, null, 'At the heart of the forest the grove keepers heal everything you hit.', 'The keepers heal their units: finish a unit in one turn, and hit the hero whenever a lane is open.', [['round', 18], ['hp', 8]]]]],
  ['fairy', 'Fairy Forest', ['Mage', 'Seer', 'Spellweaver', 'Priest', 'Druid', 'Arcane Burst', 'Quick Thinking', 'Healing Spring', 'Arcane Wand', 'Strengthen'], ['Knight', 'Guardian', 'Fireball', 'Freeze', 'Battle Medic'], [
    ['Glowcap Path', 'Mushrooms and mischief', 'arcane', 8, null, 'Glowing mushrooms light the path, and the fairies want to test your magic.', 'Your fairy deck is all spells: Spellweaver makes them hit harder, Seer finds the card you need.', [['spells', 3], ['hp', 10]]],
    ['The Moonwell', 'Arcane Surge: spells +1 damage', 'hex', 10, 'surge', 'Moonlight pours into a well of pure magic. Every spell is stronger here, theirs too.', '<b>Arcane Surge</b>: spells deal +1 damage. Keep Arcane Burst for the enemy hero.', [['spells', 4], ['round', 14]]],
    ['The Fairy Queen', 'Region boss: the queen\'s court', 'holy', 11, null, 'The Fairy Queen holds court in a ring of flowers, her healers around her.', 'The Queen heals a lot. Burst her units down in one turn with spells before her Priests undo it.', [['round', 16], ['lost', 4]]]]],
  ['desert', 'Desert', ['Raider', 'Warhound', 'Scout', 'Skirmisher', 'Rogue', 'Lancer', 'Fireball', 'Backstab', 'Hidden Spikes', 'Dagger'], ['Knight', 'Battle Medic', 'Guardian', 'Reinforce', 'Healing Light'], [
    ['The Dune Road', 'Riders over the sand', 'storm', 8, null, 'Hot sand and a caravan road. Raiders ride out of the dunes to meet you.', 'Your desert deck is fast: Raiders and Warhounds hit the hero hard when a lane is open.', [['round', 10], ['hp', 10]]],
    ['The Scorching Oasis', 'Scorching Sun: Overtime from round 12', 'raiders', 10, 'heat', 'The only water for miles, and the sun is merciless. The fight cannot last long.', '<b>Scorching Sun</b>: Overtime from round 12. Race them: attack the hero every turn you can.', [['round', 12], ['kills', 3]]],
    ['The Sand King', 'Region boss: the king of the dunes', 'blaze', 12, null, 'The Sand King waits in a ruined pyramid with his fiercest warriors.', 'The Sand King hits hard. Keep a Knight or Guardian from your picks in front, and Backstab his biggest unit.', [['hp', 8], ['lost', 5]]]]],
  ['blackdesert', 'Black Desert', ['Hexer', 'Alchemist', 'Trickster', 'Assassin', 'Shadowblade', 'Duelist', 'Poison Cloud', 'Disarm', 'Poison Blade', 'Silence Rune'], ['Knight', 'Guardian', 'Battle Medic', 'Healing Light', 'Fireball'], [
    ['Obsidian Flats', 'Black sand and shadows', 'storm', 8, null, 'The sand here is black as night, and shadows move between the dunes.', 'Your shadow deck poisons and weakens: Poison Cloud and Disarm make their units harmless.', [['hp', 12], ['round', 12]]],
    ['The Hexed Ruins', 'Mages in the ruins', 'hex', 10, null, 'Broken towers of a forgotten empire, full of hexers.', 'Their mages stay in the Back row. Assassin and Shadowblade can reach them.', [['kills', 3], ['hp', 10]]],
    ['The Shadow Sultan', 'Region boss: the sultan of night', 'arcane', 9, null, 'The Shadow Sultan rules the black dunes with his court of sorcerers.', 'His sorcerers hit with spells. Poison them early and keep a blocker in every lane.', [['round', 18], ['lost', 5]]]]],
  ['volcano', 'Volcano', ['Berserker', 'Warbringer', 'Champion', 'Swordsman', 'Duelist', 'Fireball', 'Battle Cry', 'Finishing Blow', 'Flare Trap', 'Spiked Gloves'], ['Knight', 'Guardian', 'Battle Medic', 'Healing Light', 'Reinforce'], [
    ['The Ash Slope', 'Fire raiders on the slope', 'raiders', 8, null, 'Ash falls like snow on the volcano\'s slope, and fire raiders charge down it.', 'Your volcano deck is all attack: Berserkers and the Champion hit harder the longer they live.', [['round', 10], ['kills', 3]]],
    ['The Lava River', 'Blood Moon: all units +1 ATK', 'blaze', 10, 'bloodmoon', 'A river of lava under a red moon. Every hit lands harder.', '<b>Blood Moon</b>: +1 ATK for everyone. Trade units well and finish them with Finishing Blow.', [['hp', 8], ['kills', 4]]],
    ['The Fire Lord', 'Region boss: the heart of the volcano', 'warlord', 12, null, 'Inside the crater the Fire Lord waits with his war council.', 'The Fire Lord brings his best fighters. Your Champion and Battle Cry win the trades: go all in.', [['round', 16], ['hp', 6]]]]],
  ['frozen', 'Frozen Mountains', ['Frost Witch', 'Stonewall', 'Guardian', 'Knight', 'Mage', 'Bulwark', 'Freeze', 'Iron Skin', 'Hex Field', 'Heavy Plate'], ['Archer', 'Battle Medic', 'Fireball', 'Swordsman', 'Healing Light'], [
    ['The Snow Pass', 'A blizzard on the pass', 'storm', 8, null, 'Snow up to your knees and wolves of the pass all around.', 'Your frost deck is a wall of ice: Stonewall and Bulwark hold, Frost Witch freezes what gets close.', [['hp', 14], ['lost', 3]]],
    ['The Ice Caves', 'Frozen mages', 'frost', 10, null, 'Deep blue caves where mages of ice have made their home.', 'Freeze their strongest unit before it attacks, then hit the hero with your Mages.', [['hp', 12], ['round', 14]]],
    ['The Frost Giant', 'Region boss: the giant of the peak', 'titan', 11, null, 'At the summit a frost giant guards the highest peak of the world.', 'The Giant brings big units. Freeze and Hex Field slow them while your wall holds.', [['round', 18], ['lost', 4]]]]],
  ['isles', 'Floating Isles', ['Phantom', 'Assassin', 'Scout', 'Runner', 'Skirmisher', 'Archer', 'Swap', 'Sidestep', 'Quick Escape', 'Light Boots'], ['Knight', 'Guardian', 'Fireball', 'Battle Medic', 'Commander'], [
    ['The Sky Bridge', 'A rope bridge in the clouds', 'p-rush', 8, null, 'Islands floating in the sky, linked by rope bridges swaying in the wind.', 'Your sky deck moves: Runners and Scouts slip into open lanes, Swap and Sidestep reposition your units.', [['moves', 3], ['hp', 10]]],
    ['Windy Heights', 'Tailwind: moves are free', 'storm', 10, 'wind', 'The wind never stops up here, and it carries every unit where it wants to go.', '<b>Tailwind</b>: moving costs no AP. Move into the open lane and hit the hero every turn.', [['moves', 4], ['round', 12]]],
    ['The Storm Eagle', 'Region boss: the lord of the winds', 'gale', 10, null, 'The Storm Eagle nests on the highest island, and its riders are faster than anyone.', 'The Eagle\'s riders dodge a lot. Keep a Guardian from your picks in the middle and strike where they leave a gap.', [['round', 16], ['lost', 4]]]]],
  ['cursed', 'Cursed Woods', ['Hexer', 'Frost Witch', 'Alchemist', 'Paladin', 'Priest', 'Poison Cloud', 'Hex Field', 'Healing Light', 'Guardian Angel', 'Poison Blade'], ['Knight', 'Swordsman', 'Archer', 'Fireball', 'Battle Medic'], [
    ['The Dead Trees', 'Shadows between the trees', 'traps', 8, null, 'Twisted dead trees and a fog that never lifts. Something waits in every shadow.', 'Your cursed deck poisons and heals: Poison Cloud wears them down while Paladins and Priests keep you standing.', [['hp', 12], ['kills', 3]]],
    ['The Witch\'s Hut', 'A coven of hexers', 'hex', 10, null, 'A crooked hut where a coven brews its hexes.', 'Their hexers stay in the Back row. Poison them from afar and shield your front with Guardian Angel.', [['spells', 3], ['round', 14]]],
    ['The Lich', 'Region boss: the cursed king', 'arcane', 8, null, 'In a ruined keep the Lich sits on a throne of bones, his spells ready.', 'Poison his units as they come and heal your hero when he pushes.', [['round', 18], ['hp', 8]]]]],
  ['underwater', 'Underwater Kingdom', ['Protector', 'Shieldbearer', 'Fortress Golem', 'Sentinel', 'Herbalist', 'Rally Wall', 'Healing Spring', 'Healing Potion', 'Counter Trap', 'Reinforced Armor'], ['Archer', 'Mage', 'Fireball', 'Swordsman', 'Raider'], [
    ['The Coral Gate', 'Guards of the reef', 'p-balanced', 8, null, 'Glowing coral, schools of fish and the guards of the reef at its gate.', 'Your tide deck is a wall of shells: Fortress Golem and Shieldbearers hold, your picks do the damage.', [['hp', 14], ['lost', 3]]],
    ['The Sunken Ship', 'Rainstorm: 5 AP a turn', 'raiders', 10, 'rain', 'A pirate wreck on the sea floor, still full of pirates.', '<b>Rainstorm</b>: 5 AP a turn. Put up your wall first, then attack with the cards you picked.', [['kills', 3], ['hp', 10]]],
    ['The Sea King', 'Region boss: the throne under the sea', 'bastion', 12, null, 'The Sea King sits on his pearl throne, and his shields are thicker than yours.', 'The Sea King plays a wall too. Fireball and the Mage from your picks break it: aim at one lane.', [['round', 18], ['lost', 4]]]]]
];
const RG_SEED = { plains: 1, forest: 2, fairy: 3, desert: 4, blackdesert: 5, volcano: 6, frozen: 7, isles: 8, cursed: 9, underwater: 10 };
const CC_REGIONS = RG_DATA.map(([id, name, lock, picks, rows]) => ({ id: 'rg-' + id, region: id, no: 0, name, sub: 'Region', own: true, regionCh: true, miles: [],
  lock: ccPreset(lock), picks: ccPreset(picks),
  stages: rows.map(([nm, twist, bot, hp, ev, intro, tip, stars], i) => ({ id: `rg-${id}-${i + 1}`, no: i + 1, name: nm, twist, hp: [20, hp], first: 0, seed: 7000 + RG_SEED[id] * 37 + i,
    ...(bot.startsWith('p-') ? { botDeck: bot } : { bot: CC_CAMP_DECKS[bot] }), ...(ev ? { ev } : {}), ...(i < 2 ? { brain: 'easy' } : { boss: true }),
    intro, stars: [['win'], ...stars].map(ccEasyStar), tips: ccOne(tip) })) }));
const rgCh = id => CC_REGIONS.find(c => c.region === id) || null;
const rgStages = id => { const c = rgCh(id); return c ? c.stages.map(s => ({ ...s, ch: c })) : []; };
const rgStage = sid => { for (const c of CC_REGIONS) { const s = c.stages.find(x => x.id === sid); if (s) return { ...s, ch: c }; } return null; };
/* the region deck: the 20 locked cards + your 10 (at most 2 copies of a card in all) */
const rgCopies = (cards, id) => cards.filter(x => x === id).length;
const rgDeckOf = (ch, picks) => ch.lock.concat(picks || ch.picks);
/* ===UI=== (below here: the browser only) */

const rgSave = () => { const sv = ccSave(); if (!sv.rg || typeof sv.rg !== 'object') sv.rg = {}; return sv.rg; };
function rgPicks(id) { const ch = rgCh(id), m = rgSave(); let p = Array.isArray(m[id]) ? m[id].filter(x => CC_DEF[x]) : ch.picks.slice();
  const ok = []; for (const x of p) if (ok.length < RG_PICK && rgCopies(ch.lock.concat(ok), x) < 2) ok.push(x);
  return ok; }
const rgDeck = id => rgDeckOf(rgCh(id), rgPicks(id));
const rgDeckOk = id => rgPicks(id).length === RG_PICK && ccValidateDeck(rgDeck(id)).ok;
const rgStars = id => rgStages(id).reduce((t, s) => t + ccCampN(s.id), 0);
const rgCleared = id => rgStages(id).filter(s => ccCampHave(s.id)[0]).length;
const rgReady = id => rgStages(id).some(s => ccCampOpen(s) && !ccCampHave(s.id)[0]);
const rgState = s => { const k = ccCampN(s.id); return ccCampOpen(s) ? (ccCampHave(s.id)[0] ? (k === 3 ? 'perfect' : 'clear') : 'new') : 'locked'; };

/* ---------- hooks into the campaign machinery ---------- */
{ const o = ccCampBack; ccCampBack = st => { if (!(st && st.ch && st.ch.regionCh)) return o(st); const nx = ccCampNext(st); openRegion(st.ch.region, nx && !ccCampHave(nx.id)[0] ? nx.id : st.id); }; }
{ const o = ccCampStart; ccCampStart = function (st) {
  if (!(st && st.ch && st.ch.regionCh)) return o.apply(this, arguments);
  st = rgStage(st.id) || st; if (!ccCampOpen(st)) return;
  const id = st.ch.region; if (!rgDeckOk(id)) { toast(`Pick your ${RG_PICK} cards for the ${st.ch.name} deck first`, true); return rgDeckEdit(id); }
  const sv = ccSave(), cards = rgDeck(id);
  startClash({ id: sv.sel, name: `${st.ch.name} deck`, cards: cards.slice() }, st.seed, { ...st, myDeck: cards.slice(), mseed: (Math.random() * 4294967296) >>> 0 });
}; }
{ const o = ccCampEndBtns; ccCampEndBtns = function () { const st = ccM && ccM.camp && ccM.camp.st; if (!(st && st.ch && st.ch.regionCh)) return o.apply(this, arguments);
  const nx = ccCampNext(st);
  return `<div class="ccm-endb"><button class="btn ghost" id="ccCampRetry">${icon('back')}Retry</button>${nx ? `<button class="btn gold" id="ccCampNext">Next: stage ${nx.no}</button>` : ''}<button class="btn ${nx ? 'ghost' : 'gold'}" id="ccCampMap">${icon('compass')}${esc(st.ch.name)}</button></div>`; }; }
{ const o = startClash; startClash = function () { if (rgEl) { rgEl.remove(); rgEl = null; } return o.apply(this, arguments); }; }

/* ---------- the region page: its map with the stage buttons, and the stage panel ---------- */
let rgEl = null, rgId = null, rgSel = null, rgView = 'map';
/* the two pictures: the region map (`region:<id>`, dims key <id>) and the battles map (`region:b:<id>`, dims key b:<id>) */
const rgKey = (id, bat) => bat ? 'region:b:' + id : 'region:' + id;
const rgDim = (id, bat) => { const d = (S.regionMaps || {})[(bat ? 'b:' : '') + id]; return MEDIA.get(rgKey(id, bat)) && d && d.w > 0 && d.h > 0 ? d : { w: 1600, h: 900 }; };
/* the places on the region map (more later: a main lobby, shops…) */
const RG_SPOTS = [{ id: 'battles', name: 'Battles', ic: 'swords', at: [50, 58], sub: id => `${RG_N} stages · ${rgStars(id)} / ${RG_N * 3} stars`, dot: id => rgReady(id) }];
const rgSpotAt = (id, sp) => { const p = (S.farmLayout || {})[`rgp:${id}:${sp.id}`]; return p ? [p.x, p.y] : sp.at; };
const rgSpotIc = (id, sp) => customIcon(`rgs-${id}-${sp.id}`) ? `<img src="${customIcon(`rgs-${id}-${sp.id}`)}" alt="">` : icon(sp.ic);
const RG_POS_DEF = [[22, 66], [50, 40], [78, 60]];
const rgAt = (id, n) => { const p = (S.farmLayout || {})[`rg:${id}:${n}`]; return p ? [p.x, p.y] : RG_POS_DEF[n - 1]; };
function openRegion(id, sel, view) {
  const r = wmReg(id); if (!r || !rgCh(id)) return;
  closeModal(); ccSave(); if (wmEl) { wmEl.remove(); wmEl = null; }
  if (!rgEl) { rgEl = document.createElement('div'); rgEl.className = 'cmp rgn'; rgEl.setAttribute('role', 'dialog'); document.body.appendChild(rgEl); }
  rgEl.setAttribute('aria-label', r.name);
  const L = rgStages(id), open = L.filter(ccCampOpen);
  if (rgId !== id) rgSel = null;
  rgView = view || (sel ? 'battles' : 'map');
  rgId = id; rgSel = sel || (L.find(s => s.id === rgSel) ? rgSel : null) || (open.find(s => !ccCampHave(s.id)[0]) || open[open.length - 1] || L[0]).id;
  renderRegion();
}
function closeRegion(toMap = true) { if (rgEl) { rgEl.remove(); rgEl = null; } removeEventListener('resize', rgFit); if (toMap) openWorld(); }
const rgBack = (r, bat) => (bat && MEDIA.get(rgKey(r.id, true))) || MEDIA.get(rgKey(r.id)) || MEDIA.get('world:map') || '';
const rgDrawn = id => `<div class="rgn-draw"><i class="rgn-dglow"></i><span class="rgn-dic">${wmPin(id)}</span><i class="rgn-dmist m1"></i><i class="rgn-dmist m2"></i></div>`;
function rgSpotHTML(id, sp) { const a = rgSpotAt(id, sp);
  return `<button class="rgn-spot" data-rgspot="${sp.id}" style="left:${a[0]}%;top:${a[1]}%" aria-label="${esc(sp.name)}"><span class="rgn-sic">${rgSpotIc(id, sp)}${sp.dot(id) ? '<i class="cmp-dot"></i>' : ''}</span><b>${esc(sp.name)}</b><small>${esc(sp.sub(id))}</small></button>`; }
function rgPinHTML(s, sel) {
  const k = rgState(s), a = rgAt(s.ch.region, s.no);
  return `<button class="rgn-pin ${k} ${s.boss ? 'boss' : ''} ${s.id === sel ? 'sel' : ''}" data-rgs="${s.id}" style="left:${a[0]}%;top:${a[1]}%" aria-label="Stage ${s.no}: ${esc(s.name)}${k === 'locked' ? ', locked' : ''}">
    <span class="rgn-med">${s.boss ? `<i class="rgn-crown">${icon('crown')}</i>` : ''}<b>${s.no}</b>${k === 'locked' ? `<i class="rgn-lk">${icon('lock')}</i>` : ''}</span>${k === 'new' ? '<i class="rgn-new">Next</i>' : ''}
    <span class="rgn-plq"><span>${esc(s.name)}</span>${ccStars(ccCampHave(s.id))}</span></button>`;
}
function renderRegion() {
  if (!rgEl) return;
  const r = wmReg(rgId), ch = rgCh(rgId), L = rgStages(rgId), st = L.find(s => s.id === rgSel) || L[0], bat = rgView === 'battles', D = rgDim(rgId, bat), up = MEDIA.get(rgKey(rgId, bat)), back = rgBack(r, bat);
  rgEl.style.setProperty('--rc', r.col);
  rgEl.classList.toggle('mapv', !bat);
  const tab = (v, ic, txt, dot) => `<button class="cmp-cht ${rgView === v ? 'on' : ''}" data-rgv="${v}">${icon(ic)}${txt}${dot ? '<i class="cmp-dot"></i>' : ''}</button>`;
  let body;
  if (bat) {
    const pts = L.map(s => rgAt(rgId, s.no)), path = pts.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * D.w / 100).toFixed(1)} ${(p[1] * D.h / 100).toFixed(1)}`).join(' ');
    const lit = L.filter(s => ccCampHave(s.id)[0]).length;
    body = `<section class="rgn-stage"><div class="rgn-map ${up ? 'up' : ''}" data-w="${D.w}" data-h="${D.h}">
        ${up ? `<img class="rgn-img" src="${up}" alt="" draggable="false">` : rgDrawn(rgId)}
        <svg class="rgn-path" viewBox="0 0 ${D.w} ${D.h}" preserveAspectRatio="none" aria-hidden="true"><path d="${path}" class="bg"/><path d="${path}" class="lit" pathLength="${Math.max(1, L.length - 1)}" style="stroke-dasharray:${lit} ${L.length}"/></svg>
        ${L.map(s => rgPinHTML(s, st.id)).join('')}
        <span class="rgn-kind">${icon('swords')}${esc(r.name)} · Battles</span></div></section>
      <aside class="cmp-side rgn-side">${rgPanel(st)}</aside>`;
  } else {
    body = `<section class="rgn-stage"><div class="rgn-map ${up ? 'up' : ''}" data-w="${D.w}" data-h="${D.h}">
        ${up ? `<img class="rgn-img" src="${up}" alt="" draggable="false">` : rgDrawn(rgId)}
        ${RG_SPOTS.map(sp => rgSpotHTML(rgId, sp)).join('')}
        <span class="rgn-kind">${icon('map')}${esc(r.kind)} · Region map</span></div></section>`;
  }
  rgEl.innerHTML = `<div class="cmp-bg rgn-bg ${back ? 'has-art' : ''}">${back ? `<img class="cmp-bgart" src="${back}" alt="">` : ''}<i class="cmp-glow g1"></i><i class="cmp-glow g2"></i><i class="cmp-glow g3"></i></div>
    <header class="cmp-head rgn-head"><div class="inv-title"><span class="inv-badge rgn-badge">${wmPin(rgId)}</span><h2 class="ts">${esc(r.name)}</h2></div>
      ${bat ? `<div class="twr-stats rgn-hs"><span class="twr-chip">${icon('map')}<small>Stages</small><b>${rgCleared(rgId)} / ${RG_N}</b></span><span class="twr-chip st">${CC_STAR_SVG}<b>${rgStars(rgId)}</b><small>/ ${RG_N * 3}</small></span></div>` : ''}
      <nav class="cmp-chtabs rgn-tabs">${tab('map', 'map', 'Map')}${RG_SPOTS.map(sp => tab(sp.id, sp.ic, esc(sp.name), sp.dot(rgId))).join('')}</nav>
      <div class="rgn-hr">${canAdmin() ? `<button class="btn ghost" id="rgAdm" title="Admin: the region's maps and buttons">${icon('wrench')}<span class="twr-bl">Edit region</span></button>` : ''}
      ${bat ? `<button class="btn ghost" id="rgDeckB" title="Region deck">${icon('cards')}<span class="twr-bl">Region deck</span>${rgDeckOk(rgId) ? '' : '<i class="cmp-dot"></i>'}</button>` : ''}
      <button class="btn ghost" id="rgWorld" title="World map">${icon('compass')}<span class="twr-bl">World map</span></button>
      <button class="inv-x" id="rgClose" aria-label="Close">${icon('close')}</button></div></header>
    ${body}`;
  const q = s => rgEl.querySelector(s);
  q('#rgClose').onclick = () => closeRegion(false) || bthHome();
  q('#rgWorld').onclick = () => closeRegion(true);
  const db = q('#rgDeckB'); if (db) db.onclick = () => rgDeckEdit(rgId);
  const adm = q('#rgAdm'); if (adm) adm.onclick = () => { rgaId = rgId; openAdmin('regions'); };
  rgEl.querySelectorAll('[data-rgv]').forEach(b => b.onclick = () => { rgView = b.dataset.rgv; renderRegion(); });
  rgEl.querySelectorAll('[data-rgspot]').forEach(b => b.onclick = () => { rgView = b.dataset.rgspot; renderRegion(); });
  rgEl.querySelectorAll('[data-rgs]').forEach(b => b.onclick = () => { rgSel = b.dataset.rgs; renderRegion(); });
  if (bat) rgBindPanel(st);
  rgFit(); removeEventListener('resize', rgFit); addEventListener('resize', rgFit);
}
/* the map keeps the picture's shape and fits the stage (contain) */
function rgFit() {
  const sg = rgEl && rgEl.querySelector('.rgn-stage'), m = sg && sg.querySelector('.rgn-map'); if (!m) return;
  const D = { w: +m.dataset.w || 1600, h: +m.dataset.h || 900 }, cs = getComputedStyle(sg), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const port = matchMedia('(max-width:640px),(orientation:portrait)').matches, mapv = rgView !== 'battles';
  if (port && mapv) {   // portrait, region map: the map fills the screen's height and scrolls sideways (it starts in the middle)
    const h = Math.max(260, Math.round(innerHeight - sg.getBoundingClientRect().top - 14)); sg.style.height = h + 'px';
    const k = (h - pad) / D.h; m.style.width = Math.floor(D.w * k) + 'px'; m.style.height = Math.floor(D.h * k) + 'px';
    if (!sg._c) { sg._c = 1; sg.scrollLeft = (sg.scrollWidth - sg.clientWidth) / 2; }
    return;
  }
  if (port) sg.style.height = Math.round((sg.clientWidth - pad) * D.h / D.w + pad) + 'px'; else sg.style.height = '';   // portrait battles: the box hugs the map
  const k = Math.min((sg.clientWidth - pad) / D.w, (sg.clientHeight - pad) / D.h);
  m.style.width = Math.floor(D.w * k) + 'px'; m.style.height = Math.floor(D.h * k) + 'px';
}
/* the stage panel: the campaign's panel with the region deck in place of "your deck" */
function rgPanel(st) {
  const ch = st.ch, n = rgPicks(ch.region).length, ok = rgDeckOk(ch.region), have = ccCampHave(st.id), op = ccCampOpen(st), foe = ccCampFoe(st), E = st.ev && CC_EVENTS[st.ev];
  return `<div class="cmp-st ${st.boss ? 'boss' : ''}">
    <div class="cmp-st-top"><span class="cmp-st-no">Stage ${st.no} / ${RG_N}</span>${st.boss ? '<span class="cmp-bosstag">Region boss</span>' : ''}${ccStars(have, 'big')}</div>
    <h3 class="cmp-st-nm">${esc(st.name)}</h3>
    <span class="cmp-teach">${icon('bolt')}${esc(st.twist || '')}</span>
    <p class="cmp-intro">${esc(st.intro)}</p>
    ${E ? `<div class="cmp-ev" style="--ec:${ccEvCol(st.ev)}"><span class="cmp-ev-ic">${ccEvIco(st.ev)}</span><span><b>${esc(E.name)}</b><small>${esc(E.text)}</small></span></div>` : ''}
    <div class="cmp-foe"><span class="cmp-foe-ic">${foe ? baseThumb(foe) : ccIco('bot')}</span><span><small>Opponent</small><b>${esc(foe ? foe.name : 'Bot')}</b><em>${st.hp[1]} HP · ${st.boss ? 'normal' : 'easy'}</em></span>
      <span><small>Your deck</small><b class="cmp-deckn">${esc(ch.name)} deck</b><button class="ccq-help cmp-dpick" id="rgDeckP">Edit deck</button><em>${RG_LOCK} set cards + ${n} / ${RG_PICK} yours · you go first</em></span></div>
    <span class="ccd-lbl">Star goals</span>
    <ul class="cmp-goals">${st.stars.map((g, k) => `<li class="${have[k] ? 'ok' : ''}"><i class="cmp-gs">${CC_STAR_SVG}</i><span>${esc(g.t)}</span><em>${have[k] ? `${icon('check')}Earned` : `+${CC_CAMP_STAR_PEARLS} ${curIcon('pearls')}`}</em></li>`).join('')}</ul>
    <p class="tiny cmp-note">This region is played with its own deck: ${RG_LOCK} cards are set by the region, the other ${RG_PICK} you choose. Stars stay once earned.</p>
    <div class="cmp-btns"><button class="btn ghost" id="cmpLesson">${icon('book')}How to play</button><button class="btn gold cmp-go" id="cmpGo" ${op ? '' : 'disabled'}>${icon('bolt')}${have[0] ? 'Play again' : 'Start'}</button></div>
    ${!op ? `<p class="tiny cmp-lock">${icon('lock')}Clear stage ${st.no - 1} first.</p>` : !ok ? `<p class="tiny cmp-lock">${icon('cards')}Pick your ${RG_PICK} cards in Edit deck (${n} / ${RG_PICK}).</p>` : ''}</div>`;
}
function rgBindPanel(st) {
  const q = s => rgEl.querySelector(s);
  const go = q('#cmpGo'); if (go) go.onclick = () => ccCampStart(st);
  const ls = q('#cmpLesson'); if (ls) ls.onclick = () => ccRules(0);
  const dp = q('#rgDeckP'); if (dp) dp.onclick = () => rgDeckEdit(st.ch.region);
}

/* ---------- the region deck: 20 locked cards and the 10 you pick (tap a card in the pool to add, a pick to remove) ---------- */
let rgdStyle = 'all';
function rgDeckEdit(id) {
  const ch = rgCh(id), r = wmReg(id); if (!ch) return;
  const draw = b => {
    const picks = rgPicks(id), deck = ch.lock.concat(picks), uniq = a => [...new Set(a)];
    const card = (x, cls, attr) => `<button type="button" class="rgd-c ${cls}" ${attr}>${ccMiniCard(x, 78)}${cls.includes('lk') ? `<i class="rgd-lk">${icon('lock')}</i>` : ''}<i class="rgd-n">×${rgCopies(cls.includes('lk') ? ch.lock : picks, x)}</i></button>`;
    const pool = CC_CARDS.filter(c => rgdStyle === 'all' || c.style === rgdStyle);
    b.querySelector('.rgd').innerHTML = `
      <p class="desc">The <b>${esc(r.name)}</b> campaign is played with this deck: <b>${RG_LOCK} cards are set by the region</b> and can't be changed, and you pick the other <b>${RG_PICK}</b>. A card can be in the deck at most twice in all.</p>
      <div class="rgd-h"><b>${icon('lock')}Region cards</b><small>${RG_LOCK} / ${RG_LOCK}</small></div>
      <div class="rgd-row">${uniq(ch.lock).map(x => card(x, 'lk', '')).join('')}</div>
      <div class="rgd-h"><b>${CC_IC}Your picks</b><small class="${picks.length === RG_PICK ? 'ok' : ''}">${picks.length} / ${RG_PICK}</small><span class="cmp-sp"></span><button class="ccq-help" id="rgdSug">Suggested</button><button class="ccq-help" id="rgdClr">Clear</button></div>
      <div class="rgd-row picks">${uniq(picks).map(x => card(x, 'pk', `data-rgrm="${x}"`)).join('')}${Array.from({ length: RG_PICK - picks.length }, () => '<span class="rgd-empty"></span>').join('')}</div>
      <div class="rgd-h"><b>${icon('cards')}All cards</b><small>Tap to add</small><span class="cmp-sp"></span><span class="rgd-f">${['all', ...Object.keys(CC_STYLES)].map(s => `<button class="${rgdStyle === s ? 'on' : ''}" data-rgf="${s}" ${s === 'all' ? '' : `style="--sc:${CC_STYLES[s][1]}"`}>${s === 'all' ? 'All' : CC_STYLES[s][0]}</button>`).join('')}</span></div>
      <div class="rgd-pool">${pool.map(c => { const n = rgCopies(deck, c.id), full = n >= 2 || picks.length >= RG_PICK;
        return `<button type="button" class="rgd-c ${full ? 'off' : ''}" data-rgadd="${c.id}" ${full ? 'disabled' : ''}>${ccMiniCard(c.id, 78)}${n ? `<i class="rgd-n">×${n}</i>` : ''}</button>`; }).join('')}</div>
      <div class="row" style="justify-content:flex-end;gap:8px"><button class="btn gold" id="rgdDone">${icon('check')}Done</button></div>`;
    const set = L => { rgSave()[id] = L; persist(); draw(b); if (rgEl) renderRegion(); };
    b.querySelectorAll('[data-rgadd]').forEach(x => x.onclick = () => { const p = rgPicks(id); if (p.length < RG_PICK && rgCopies(ch.lock.concat(p), x.dataset.rgadd) < 2) set(p.concat(x.dataset.rgadd)); });
    b.querySelectorAll('[data-rgrm]').forEach(x => x.onclick = () => { const p = rgPicks(id), i = p.lastIndexOf(x.dataset.rgrm); if (i >= 0) { p.splice(i, 1); set(p); } });
    b.querySelectorAll('[data-rgf]').forEach(x => x.onclick = () => { rgdStyle = x.dataset.rgf; draw(b); });
    b.querySelector('#rgdSug').onclick = () => set(ch.picks.slice());
    b.querySelector('#rgdClr').onclick = () => set([]);
    b.querySelector('#rgdDone').onclick = closeModal;
  };
  openModal({ title: `${r.name} deck`, ic: 'cards', wide: true, kind: 'rgdeck', body: '<div class="rgd"></div>', onMount: draw });
}

/* the world map: a region's button and tab open its page; the sub line shows its progress */
{ const o = wmGo; wmGo = function (t) { if (t !== 'map' && t !== 'tree' && rgCh(t)) return openRegion(t); return o.apply(this, arguments); }; }
{ const o = wmSub; wmSub = r => r.id === 'tree' ? o(r) : rgCh(r.id) ? (rgCleared(r.id) ? `${rgStars(r.id)} / ${RG_N * 3} stars` : `${RG_N} stages`) : o(r); }
WM_REGIONS.forEach(r => { r.open = true; });

/* ---------- admin → Regions: each region's map picture and where its 3 stage buttons stand ---------- */
let rgaId = 'plains';
/* two sections per region: the region map (its picture + where each place button stands) and the battles map (its picture + the 3 stages) */
function renderRegionsTab() {
  const p = $('#adPanel'); if (!p) return;
  const R = WM_REGIONS.filter(r => rgCh(r.id)), r = wmReg(rgaId) || R[0], id = r.id, ch = rgCh(id);
  const sec = (bat) => { const key = rgKey(id, bat), has = !!MEDIA.get(key), D = rgDim(id, bat), sk = bat ? 'b' : 'm';
    const items = bat ? ch.stages.map(s => ({ k: String(s.no), at: rgAt(id, s.no), pin: `<b>${s.no}</b>`, name: `Stage ${s.no} · ${s.name}`, sub: `${s.twist} · bot ${s.hp[1]} HP${s.boss ? ' · region boss' : ' · easy'}` }))
      : RG_SPOTS.map(sp => ({ k: sp.id, at: rgSpotAt(id, sp), pin: rgSpotIc(id, sp), name: sp.name, sub: 'Opens the region\'s ' + sp.name.toLowerCase(), slot: `rgs-${id}-${sp.id}` }));
    return `<h3 class="rga-h">${bat ? `${icon('swords')}Battles map` : `${icon('map')}Region map`}</h3>
      <p class="tiny">${bat ? `What players see after tapping Battles: the ${RG_N} stages on their own picture.` : `The region's main tab: its own map with a button for each place (only Battles for now; more places like a main lobby come later).`} Any shape, shown whole (e.g. 1920×1080). Drag the buttons onto your picture.</p>
      <div class="setx-list ad-art">${setRow(`${esc(r.name)} · ${bat ? 'battles' : 'region'} map`, `<label class="sx-btn">${icon('upload')}${has ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rgaup="${sk}"></label>${has ? `<button type="button" class="sx-btn" data-rgadel="${sk}">${icon('trash')}Remove</button>` : ''}`, has ? `Your picture · ${D.w}×${D.h}` : 'Without one a drawn backdrop in the region\'s colour')}</div>
      <div class="wma-prev rga-prev" style="aspect-ratio:${D.w}/${D.h};--rc:${r.col}">${has ? `<img class="wm-img" src="${MEDIA.get(key)}" alt="" draggable="false">` : rgDrawn(id)}
        ${items.map(x => `<button class="wma-pin rga-pin" data-rgdrag="${sk}:${x.k}" style="left:${x.at[0]}%;top:${x.at[1]}%;--rc:${r.col}"><span class="wm-pin">${x.pin}</span><b>${esc(x.name)}</b></button>`).join('')}</div>
      <div class="wma-list">${items.map(x => `<div class="wma-row" style="--rc:${r.col}"><span class="wm-pin">${x.pin}</span><div class="wma-f"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small>
          ${x.slot ? `<div class="afa-btns"><label class="sx-btn">${icon('upload')}${customIcon(x.slot) ? 'Replace icon' : 'Upload icon'}<input type="file" accept="image/*" class="sr" data-iconup="${x.slot}"></label>${customIcon(x.slot) ? `<button type="button" class="sx-btn" data-iconreset="${x.slot}">${icon('trash')}Default icon</button>` : ''}</div>` : ''}</div>
        <div class="afa-sl">${[['x', 'Left / right', x.at[0]], ['y', 'Up / down', x.at[1]]].map(([k, n, v]) => `<label><span>${n}</span><input type="range" min="0" max="100" step=".25" value="${v}" data-rgk="${k}" data-rgn="${sk}:${x.k}"><em>${v}%</em></label>`).join('')}</div></div>`).join('')}</div>
      <div class="row" style="gap:8px"><button class="btn ghost sm" data-rgareset="${sk}">${icon('refresh')}Default places</button><button class="btn sm" data-rgaopen="${bat ? 'battles' : 'map'}">${icon('compass')}Open ${bat ? 'Battles' : 'the region'}</button></div>`; };
  p.innerHTML = `<div class="stack"><p class="tiny">Every region on the world map opens its own page. Its <b>Map</b> tab is the region's own map with buttons for its places; <b>Battles</b> opens a campaign of ${RG_N} stages played with the region deck.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap">${R.map(x => `<button class="chip ${x.id === id ? 'on' : ''}" data-rga="${x.id}" style="--rc:${x.col}">${esc(x.name)}</button>`).join('')}</div>
    ${sec(false)}${sec(true)}
    <div class="rga-cards"><b>Set cards (${RG_LOCK})</b><span>${[...new Set(ch.lock)].map(x => esc(ccDef(x).name) + ' ×2').join(' · ')}</span><b>Suggested picks (${RG_PICK})</b><span>${[...new Set(ch.picks)].map(x => esc(ccDef(x).name) + ' ×2').join(' · ')}</span></div></div>`;
  p.querySelectorAll('[data-rga]').forEach(b => b.onclick = () => { rgaId = b.dataset.rga; renderRegionsTab(); });
  const lkey = sk => sk.startsWith('b:') ? `rg:${id}:${sk.slice(2)}` : `rgp:${id}:${sk.slice(2)}`;
  const cur = sk => { const L = (S.farmLayout || {})[lkey(sk)]; if (L) return [L.x, L.y]; return sk.startsWith('b:') ? rgAt(id, +sk.slice(2)) : rgSpotAt(id, RG_SPOTS.find(x => x.id === sk.slice(2))); };
  const setPos = (sk, x, y, save) => {
    S.farmLayout = { ...(S.farmLayout || {}), [lkey(sk)]: { x: Math.round(clamp(x, 0, 100) * 4) / 4, y: Math.round(clamp(y, 0, 100) * 4) / 4 } };
    const a = cur(sk), pin = p.querySelector(`[data-rgdrag="${sk}"]`); pin.style.left = a[0] + '%'; pin.style.top = a[1] + '%';
    p.querySelectorAll(`[data-rgn="${sk}"]`).forEach(i => { const v = i.dataset.rgk === 'x' ? a[0] : a[1]; i.value = v; i.nextElementSibling.textContent = v + '%'; });
    if (save) { persist(); if (rgEl) renderRegion(); }
  };
  p.querySelectorAll('[data-rgk]').forEach(i => { const sk = i.dataset.rgn;
    i.oninput = () => { const a = cur(sk); setPos(sk, i.dataset.rgk === 'x' ? +i.value : a[0], i.dataset.rgk === 'y' ? +i.value : a[1], false); };
    i.onchange = () => { persist(); if (rgEl) renderRegion(); }; });
  p.querySelectorAll('[data-rgdrag]').forEach(pin => pin.onpointerdown = e => {
    e.preventDefault(); pin.setPointerCapture(e.pointerId); const box = pin.parentElement, r0 = pin.querySelector('.wm-pin').getBoundingClientRect();
    const ox = e.clientX - (r0.left + r0.width / 2), oy = e.clientY - (r0.top + r0.height / 2), sk = pin.dataset.rgdrag;
    const move = ev => { const rr = box.getBoundingClientRect(); setPos(sk, (ev.clientX - ox - rr.left) / rr.width * 100, (ev.clientY - oy - rr.top) / rr.height * 100, false); };
    pin.onpointermove = move; pin.onpointerup = ev => { move(ev); pin.onpointermove = pin.onpointerup = null; const a = cur(sk); setPos(sk, a[0], a[1], true); };
  });
  p.querySelectorAll('[data-rgaup]').forEach(inp => inp.onchange = async ev => { const bat = inp.dataset.rgaup === 'b', key = rgKey(id, bat);
    try { const u = await resizeImage(ev.target.files[0]), d = await wmImgSize(u);
      if (d && await mediaSet(key, u)) { S.regionMaps = { ...(S.regionMaps || {}), [(bat ? 'b:' : '') + id]: d }; persist(); renderRegionsTab(); if (rgEl) renderRegion(); toast(`${r.name} ${bat ? 'battles' : 'region'} map saved (${d.w}×${d.h}).`); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-rgadel]').forEach(b => b.onclick = async () => { const bat = b.dataset.rgadel === 'b'; await mediaDel(rgKey(id, bat)); const M = { ...(S.regionMaps || {}) }; delete M[(bat ? 'b:' : '') + id]; S.regionMaps = M; persist(); renderRegionsTab(); if (rgEl) renderRegion(); toast('Back to the drawn backdrop.'); });
  p.querySelectorAll('[data-rgareset]').forEach(b => b.onclick = () => { const pre = b.dataset.rgareset === 'b' ? `rg:${id}:` : `rgp:${id}:`; const L = { ...(S.farmLayout || {}) }; Object.keys(L).filter(k => k.startsWith(pre)).forEach(k => delete L[k]); S.farmLayout = L; persist(); renderRegionsTab(); if (rgEl) renderRegion(); });
  p.querySelectorAll('[data-rgaopen]').forEach(b => b.onclick = () => { closeModal(); openRegion(id, null, b.dataset.rgaopen); });
  bindAdminArt(p, () => { renderRegionsTab(); if (rgEl) renderRegion(); });
}
