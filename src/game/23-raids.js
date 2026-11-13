/* ---------- Raids: dungeons that cost stamina and drop Wardrobe clothes ----------
   Three gear dungeons (shared R and SSR sets, a UR set of their own) and the Golden Vault (gold, 5 stages; S.raidStage).
   Each gear clear costs RAID_STAMINA and gives 1 clothing piece, or 2 with RAID_DOUBLE chance:
   UR 4%, SSR 10%, R the rest. The sets are ordinary Wardrobe clothes (S.clothes, flag raid + set) so the admin edits
   their pictures in admin → Raids or Wardrobe; without a picture each piece shows white line art for its slot.
   No summon animation: the drops pop up in a see-through results window.
   A clear is won in a Card Clash battle against the raid's guardian (raidBattle → startClash(…, raid) → raidMatch): your
   own deck against the dungeon's deck (RAID_FOE); the stamina is only spent when you win (raidFinish). Every player also
   gets RAID_INSTANT instant clears a day across all raids (the old Clear buttons, S.raidInst {day, n}). */
const RAID_STAMINA = 10, RAID_DOUBLE = .33, RAID_RATES = { 5: .08, 4: .20 }, RAID_INSTANT = 10;
const CRN = { 3: 'R', 4: 'SSR', 5: 'UR' };
const RAID_SETS = [
  { set: 'r', rarity: 3, name: "Wanderer's", pieces: { hat: 'Hood', top: 'Tunic', pants: 'Trousers', shoes: 'Boots', acc: 'Charm', hand: 'Gloves' } },
  { set: 'ssr', rarity: 4, name: 'Ember Guard', pieces: { hat: 'Helm', top: 'Coat', pants: 'Greaves', shoes: 'Sabatons', acc: 'Amulet', hand: 'Gauntlets' } },
  { set: 'ur', rarity: 5, name: 'Starlit Regalia', pieces: { hat: 'Crown', top: 'Robe', pants: 'Skirt', shoes: 'Slippers', acc: 'Pendant', hand: 'Scepter' } },
  { set: 'ur2', rarity: 5, name: 'Abyssal Tide', pieces: { hat: 'Tiara', top: 'Gown', pants: 'Train', shoes: 'Heels', acc: 'Pearl Choker', hand: 'Trident' } },
  { set: 'ur3', rarity: 5, name: 'Moonlit Bloom', pieces: { hat: 'Flower Crown', top: 'Kimono', pants: 'Hakama', shoes: 'Geta', acc: 'Hairpin', hand: 'Moon Fan' } }
];
/* dungeons: three gear raids share the R and SSR sets but each drops its own UR set (RAID_UR_HOME: built-in UR set → dungeon;
   admin-made UR raid sets pick their dungeon in admin → Raids, x.dungeon), and one gold raid with stages (GOLD_STAGES) */
/* the guardian of each built-in raid (tuned in Node, scratchpad raid/sim.js: an average player = the bot's own policy with
   each starter deck, 30 runs: ruins ~83% wins, abyss ~77%, garden ~87%, vault I ~83% down to V ~50%) */
const RAID_BASE = [
  { id: 'ruins', kind: 'gear', name: 'Whispering Ruins', desc: 'Old stone halls beneath the forest, guarded by restless spirits. Every clear leaves behind pieces of forgotten outfits.', foe: { deck: 'traps', hp: 14, skin: 'forest', back: 'forest' } },
  { id: 'abyss', kind: 'gear', name: 'Abyssal Depths', desc: 'A drowned palace at the bottom of the sea, lit by glowing coral. Its queen\'s wardrobe still drifts through the halls.', foe: { deck: 'frost', hp: 12, skin: 'cyber', back: 'celestial' } },
  { id: 'garden', kind: 'gear', name: 'Moonlit Garden', desc: 'A hidden shrine garden that only opens under the full moon. Petals fall like snow over the old festival robes.', foe: { deck: 'storm', hp: 14, skin: 'sakura', back: 'sakura' } },
  { id: 'vault', kind: 'gold', name: 'Golden Vault', desc: 'A treasure vault sealed by the old merchant guild. Deeper stages cost more stamina but hold far more gold.', foe: { deck: 'raiders', hp: 8, skin: 'inferno', back: 'royal' } }
];
/* ---- raid editor (admin → Raids): the built-in raids above plus the admin's edits and new raids, kept as content
   S.raidDefs {id: changed fields of a built-in raid, or a whole new raid with custom: true}. raidSync() rebuilds RAIDS in
   place from both, so every place that reads RAIDS sees the edits. Fields: kind 'gear' | 'gold', name, desc, icon, hidden
   (not shown to players), foe {deck, hp, skin, back} (the guardian), gear: stam (stamina per clear), ur / ssr (drop %,
   R = the rest), dbl (% of clears with 2 drops); gold: stages [{st, gold, exp, lv}] (1–6). ---- */
const RAIDS = [];
const RAID_ICS = ['raid', 'coin', 'swords', 'dragon', 'tree', 'crown', 'star', 'shield', 'peak', 'wave', 'shell', 'fountain', 'door', 'tower', 'map', 'bolt', 'heart', 'gift', 'compass', 'arena'];
function raidDefs() { if (!S.raidDefs || typeof S.raidDefs !== 'object' || Array.isArray(S.raidDefs)) S.raidDefs = {}; return S.raidDefs; }
const RAID_NUM = (v, d, lo, hi) => { const n = Math.round(+v); return Number.isFinite(n) && v !== '' && v != null ? clamp(n, lo, hi) : d; };
function raidNorm(x) {
  x.kind = x.kind === 'gold' ? 'gold' : 'gear';
  x.name = String(x.name || (x.kind === 'gold' ? 'New gold raid' : 'New gear raid')).slice(0, 30); x.desc = String(x.desc || '').slice(0, 300);
  x.foe = { deck: 'traps', hp: 14, skin: 'default', back: 'default', ...(x.foe || {}) }; x.foe.hp = RAID_NUM(x.foe.hp, 14, 1, 60);
  if (x.kind === 'gear') { x.stam = RAID_NUM(x.stam, RAID_STAMINA, 1, 200); x.ur = RAID_NUM(x.ur, 8, 0, 100); x.ssr = RAID_NUM(x.ssr, 20, 0, 100 - x.ur); x.dbl = RAID_NUM(x.dbl, 33, 0, 100); }
  else x.stages = (Array.isArray(x.stages) && x.stages.length ? x.stages : GOLD_STAGES).slice(0, 6).map(g => ({ st: RAID_NUM(g.st, 5, 1, 200), gold: RAID_NUM(g.gold, 3000, 0, 9999999), exp: RAID_NUM(g.exp, 10, 0, 9999), lv: RAID_NUM(g.lv, 1, 1, 999) }));
  x.hidden = !!x.hidden;
  return x;
}
function raidSync() {
  const D = raidDefs(), L = RAID_BASE.map(b => { const o = D[b.id] || {}; return raidNorm({ ...b, ...o, id: b.id, kind: b.kind, foe: { ...b.foe, ...(o.foe || {}) }, base: true }); });
  Object.values(D).filter(x => x && x.custom && x.id && !RAID_BASE.some(b => b.id === x.id)).sort((a, b) => (a.at || 0) - (b.at || 0)).forEach(x => L.push(raidNorm({ ...x, foe: { ...(x.foe || {}) } })));
  RAIDS.length = 0; RAIDS.push(...L); return RAIDS;
}
const raidShown = () => RAIDS.filter(x => !x.hidden);
const raidGear = () => { const L = raidShown().filter(x => x.kind === 'gear'); return L.length ? L : RAIDS.filter(x => x.kind === 'gear'); };   // where random gear comes from (Quick match wins, the guild boss)
const RAID_UR_HOME = { ur: 'ruins', ur2: 'abyss', ur3: 'garden' };
const raidOf = id => RAIDS.find(x => x.id === id) || raidShown()[0] || RAIDS[0];
const urHome = x => x.dungeon || RAID_UR_HOME[x.set] || 'ruins';   // 'none' = drops in no raid
const raidIc = d => d.icon || (d.kind === 'gold' ? 'coin' : 'raid');
const raidStam = d => d.stam || RAID_STAMINA;
const raidRates = d => ({ 5: (d.ur ?? 8) / 100, 4: (d.ssr ?? 20) / 100 });
const raidDbl = d => (d.dbl ?? 33) / 100;
const goldStages = d => d && d.stages && d.stages.length ? d.stages : GOLD_STAGES;
/* the guardian decks the admin can pick: the starters, the campaign decks and the Great Tree's war council */
const raidDeckList = () => [...CC_PRESETS.map(p => ({ id: p.id, name: p.name })), ...Object.keys(CC_CAMP_DECKS).map(k => ({ id: k, name: raidDeckName(k) })), { id: 'spire', name: 'Sky Sovereign deck' }];
function raidDeckName(k) { const p = CC_PRESETS.find(x => x.id === k); return p ? p.name : k === 'spire' ? 'Sky Sovereign deck' : QM_RIVAL_NM[k] || (k ? k[0].toUpperCase() + k.slice(1) + ' deck' : 'Guardian deck'); }
function raidDeckCards(k) { const p = CC_PRESETS.find(x => x.id === k); return (p ? p.cards : CC_CAMP_DECKS[k] || (k === 'spire' && CC_TOWER_DECKS.spire) || CC_CAMP_DECKS.traps).slice(); }
/* gold raid stages: stamina per clear, gold per clear (±15%), EXP per clear, player level needed */
const GOLD_STAGES = [
  { st: 5, gold: 3000, exp: 10, lv: 1 }, { st: 10, gold: 7000, exp: 15, lv: 10 }, { st: 15, gold: 12000, exp: 20, lv: 20 },
  { st: 20, gold: 18000, exp: 25, lv: 30 }, { st: 25, gold: 26000, exp: 30, lv: 40 }
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
/* make sure the three raid sets exist in the wardrobe (pieces the admin already edited are kept as they are) */
function ensureRaidSet() {
  S.clothes = Array.isArray(S.clothes) ? S.clothes : [];
  RAID_SETS.forEach(st => WARD_SLOTS.forEach(([slot]) => {
    const id = `raid-${st.set}-${slot}`;
    if (!S.clothes.some(x => x.id === id)) S.clothes.push({ id, name: `${st.name} ${st.pieces[slot]}`, slot, rarity: st.rarity, char: null, img: null, raid: true, set: st.set });
  }));
}
/* a set's display name (raid sets from RAID_SETS, admin-made sets carry setName) and every set that drops in raids */
const clothSetName = x => x.setName || (RAID_SETS.find(s => s.set === x.set) || {}).name || 'Clothing';
function raidSetList() {
  const seen = {}; raidPieces().forEach(x => { if (x.set && !seen[x.set]) seen[x.set] = { set: x.set, rarity: x.rarity, name: clothSetName(x) }; });
  return Object.values(seen).sort((a, b) => b.rarity - a.rarity);
}
const raidPieces = r => (S.clothes || []).filter(x => x.raid && (r == null || x.rarity === r));
/* what a gear dungeon drops at a rarity: its own UR set, the shared SSR and R sets */
const dungeonPieces = (d, r) => raidPieces(r).filter(x => r !== 5 || urHome(x) === d.id);
/* default picture of a clothing piece: white line art for its slot (the admin uploads the real design) */
const LINE_ART = {
  hat: '<path d="M14 40h36"/><path d="M20 40c0-12 4-22 12-22s12 10 12 22"/><path d="M24 30h16"/><circle cx="32" cy="15" r="3"/>',
  top: '<path d="M22 14l-10 6 4 10 6-3v23h20V27l6 3 4-10-10-6"/><path d="M26 14c1 4 3 6 6 6s5-2 6-6"/><path d="M32 22v26"/>',
  pants: '<path d="M20 12h24l2 38h-9l-5-26-5 26h-9z"/><path d="M20 18h24"/><path d="M32 18v6"/>',
  shoes: '<path d="M22 14v20c-6 2-10 5-10 9v3h30c4 0 8-2 8-6 0-3-6-5-14-6V14z"/><path d="M12 46h38"/><path d="M28 24h8"/><path d="M28 30h8"/>',
  acc: '<path d="M18 14c0 12 6 20 14 22 8-2 14-10 14-22"/><path d="M32 36l-6 8 6 8 6-8z"/><circle cx="32" cy="44" r="1.5"/>',
  hand: '<path d="M24 50V30l-6-6c-2-2 0-5 2-4l6 5V12c0-3 4-3 4 0v12-14c0-3 4-3 4 0v14-12c0-3 4-3 4 0v14-10c0-3 4-3 4 0v22c0 6-4 12-10 12z"/><path d="M24 44h16"/>'
};
const lineCache = {};
function clothLine(slot) {
  if (lineCache[slot]) return lineCache[slot];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${LINE_ART[slot] || LINE_ART.top}</svg>`;
  return lineCache[slot] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const ctag = (r, cls = '') => `<span class="rtag r${r} ${cls}">${CRN[r] || ''}</span>`;   // the summon rarity tags, plus R
INFO.raid = () => { const d = raidOf(raidSel).kind === 'gear' ? raidOf(raidSel) : raidGear()[0], R = raidRates(d), p = r => r === 3 ? Math.max(0, Math.round((1 - R[5] - R[4]) * 100)) : Math.round(R[r] * 100);
  return { title: `${d.name} · drops`, body: `<p class="desc">Clear a raid by <b>winning a card battle</b> against its guardian with your own deck. A clear costs ${raidStam(d)} stamina, spent only when you win, and gives 1 clothing piece; ${Math.round(raidDbl(d) * 100)}% of clears give 2. Every clear also gives ${EXP.raid} EXP. You also get <b>${RAID_INSTANT} instant clears a day</b> (all raids together): same cost and drops, no battle.</p>
    <table class="cs-table"><thead><tr><th>Drop</th><th>Chance</th></tr></thead><tbody>
      <tr><td>${ctag(5)} 2★ UR piece</td><td>${RAID_STAR2 * 100}%</td></tr>
      ${[5, 4, 3].map(r => `<tr><td>${ctag(r)} ${CRN[r]} piece</td><td>${p(r)}%</td></tr>`).join('')}
    </tbody></table><p class="tiny">The 2★ roll comes first; otherwise the piece is UR, SSR or R at the rates above, picked at random from that rarity's raid sets.</p>` }; };
function rollRaidPiece(d) {
  const R = raidRates(d), x = Math.random(), r = x < R[5] ? 5 : x < R[5] + R[4] ? 4 : 3;
  for (let k = r; k >= 3; k--) { const list = dungeonPieces(d, k); if (list.length) return rpick(list); }   // a raid without pieces at that rarity drops the next one down
  return null;
}
/* the wardrobe holds at most INV_CAP (999) pieces: a clear only runs when every possible drop (2 per clear) fits */
const wardCount = () => (S.clothes || []).reduce((t, x) => t + (S.owned[x.id] || 0), 0);
const wardFree = () => Math.max(0, INV_CAP - wardCount());
function wardFullMsg(times) {
  const need = 2 * times;
  openModal({ title: 'Wardrobe full', ic: 'hanger', small: true, body: `<div class="stack" style="text-align:center">
    <p class="desc">Your wardrobe holds <b>${fmt(wardCount())} / ${INV_CAP}</b> pieces. A clear can drop up to 2 pieces, so clearing ×${times} needs ${need} free spaces${wardFree() ? ` (you have ${wardFree()})` : ''}.</p>
    <p class="tiny">Fuse spare clothes (3 → 1) or merge UR stars to make space, then come back.</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" data-close>Close</button><button class="btn gold" id="wfFuse">${icon('fuse')}Fuse clothes</button></div></div>`,
    onMount: b => { b.querySelector('[data-close]').onclick = closeModal; $('#wfFuse').onclick = () => openFuse(3); } });
}
/* instant clears: RAID_INSTANT a day, shared by every raid (gear and gold), reset at local midnight */
function raidInst() { const d = dayKey(); if (!S.raidInst || S.raidInst.day !== d) S.raidInst = { day: d, n: 0 }; return S.raidInst; }
const raidInstLeft = () => Math.max(0, RAID_INSTANT - raidInst().n);
/* the pieces `times` gear clears give (added to the wardrobe) */
function rollGearDrops(d, times) {
  const drops = [];
  let n = 0; for (let t = 0; t < times; t++) n += Math.random() < raidDbl(d) ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const ur = dungeonPieces(d, 5), st2 = Math.random() < RAID_STAR2 && ur.length, x = st2 ? rpick(ur) : rollRaidPiece(d); if (!x) continue;   // 1.5%: a 2★ UR piece
    const isNew = !owns(x.id); addCloth(x.id, st2 ? 2 : 1); drops.push({ x, isNew, st: st2 ? 2 : (hasClothStars(x) ? 1 : 0) });
  }
  return drops.sort((a, b) => b.x.rarity - a.x.rarity);
}
function clearRaid(times) {
  const d = raidOf(raidSel);
  times = Math.min(times, raidInstLeft());
  if (times < 1) { toast(`No instant clears left today (${RAID_INSTANT} a day). Win a battle to clear, or come back tomorrow.`); return; }
  if (d.kind === 'gold') return clearGold(times);
  if (wardFree() < 2 * times) { wardFullMsg(times); return; }
  const cost = raidStam(d) * times;
  if (stamina() < cost) { toast(`This needs ${cost} stamina. You have ${stamina()}.`); openStamina(); return; }
  spendStamina(cost); questAdd('raid', times); raidInst().n += times;
  const drops = rollGearDrops(d, times);
  gainExp(EXP.raid * times); persist(); renderMenu(); renderRaids();
  showRaidDrops(drops, times);
}
/* instant clears ask first (the owner: a misclick used to clear at once): the same checks as clearRaid, then a small
   glass window with the cost, the clears left and what you get; Yes runs clearRaid */
function confirmRaidClear(times) {
  const d = raidOf(raidSel), gold = d.kind === 'gold', gi = goldStage(d), g = goldStages(d)[gi];
  times = Math.min(times, raidInstLeft());
  if (times < 1) { toast(`No instant clears left today (${RAID_INSTANT} a day). Win a battle to clear, or come back tomorrow.`); return; }
  if (gold && !goldOpen(gi, d)) { toast(`Stage ${ROMAN[gi]} opens at player level ${g.lv}.`); return; }
  if (!gold && wardFree() < 2 * times) { wardFullMsg(times); return; }
  const cost = (gold ? g.st : raidStam(d)) * times, have = stamina(), left = raidInstLeft();
  if (have < cost) { toast(`This needs ${cost} stamina. You have ${have}.`); openStamina(); return; }
  const name = gold ? `${d.name} ${ROMAN[gi]}` : d.name;
  const get = gold ? `${curIcon('coins')}~${fmt(g.gold * times)} gold · ${expTag(g.exp * times)}` : `${icon('hanger')}${times}–${times * 2} clothing pieces · ${expTag(EXP.raid * times)}`;
  openModal({ title: 'Instant clear?', ic: raidIc(d), small: true, kind: 'raidclr', body: `<div class="rcf">
    <p class="desc">Clear <b>${esc(name)}</b> ${times > 1 ? `<b>${times} times</b>` : 'once'} without a battle?</p>
    <div class="rcf-rows">
      <span><small>Stamina</small><b>${curIcon('stamina')}${fmt(have)} → ${fmt(have - cost)}</b><em>−${cost}</em></span>
      <span><small>Instant clears today</small><b>${left} → ${left - times} left</b><em>of ${RAID_INSTANT}</em></span>
      <span><small>You get</small><b>${get}</b></span></div>
    <div class="row rcf-btns"><button class="btn ghost" id="rcfNo">Cancel</button><button class="btn gold" id="rcfYes">Clear ×${times} ${curIcon('stamina')}${cost}</button></div></div>`,
    onMount: () => { $('#rcfNo').onclick = closeModal; $('#rcfYes').onclick = () => { closeModal(); clearRaid(times); }; } });
}
/* gold raid: no wardrobe space needed; each clear gives the stage's gold (±15%) and EXP */
/* each gold raid remembers its own picked stage (S.raidStages {id: i}; the Golden Vault's older S.raidStage still counts) */
const goldStage = (d = raidOf(raidSel)) => { const L = goldStages(d), v = (S.raidStages || {})[d.id] ?? (d.id === 'vault' ? S.raidStage : 0); return Math.min(L.length - 1, Math.max(0, v || 0)); };
const setGoldStage = (d, i) => { S.raidStages = S.raidStages || {}; S.raidStages[d.id] = i; if (d.id === 'vault') S.raidStage = i; };
const goldOpen = (i, d = raidOf(raidSel)) => playerLv().lv >= goldStages(d)[i].lv;
const rollGold = (g, times) => { let coins = 0; for (let t = 0; t < times; t++) coins += Math.round(g.gold * (.85 + Math.random() * .3) / 10) * 10; return coins; };
function clearGold(times) {
  const d = raidOf(raidSel), i = goldStage(d), g = goldStages(d)[i];
  if (!goldOpen(i, d)) { toast(`Stage ${ROMAN[i]} opens at player level ${g.lv}.`); return; }
  const cost = g.st * times;
  if (stamina() < cost) { toast(`This needs ${cost} stamina. You have ${stamina()}.`); openStamina(); return; }
  spendStamina(cost); questAdd('raid', times); raidInst().n += times;
  const coins = rollGold(g, times);
  S.wallet.coins += coins; gainExp(g.exp * times); persist(); renderMenu(); renderRaids();
  showRewards(`${d.name} ${ROMAN[i]}${times > 1 ? ` ×${times}` : ''}`, { coins, exp: g.exp * times }, `${cost} stamina spent · ${stamina()} left`);
}
/* ---- raid battles: win a Card Clash match against the dungeon's guardian to clear it once ----
   The guardian is a character from the pool (picked by the seed, like Quick match), plays the dungeon's deck on its
   own board skin and card back, with a little less HP than a hero; you play your selected deck. */
const raidFoe = id => raidOf(id).foe;
const raidHp = (id, stage) => { const d = raidOf(id); return d.foe.hp + (d.kind === 'gold' ? 2 * (stage || 0) : 0); };   // deeper gold stages: a tougher guardian
const raidLabel = r => { const d = raidOf(r.id); return d.kind === 'gold' ? `${d.name} ${ROMAN[r.stage || 0]}` : d.name; };
const raidMatch = (deck, seed, names, r) => ccCreateMatch(seed, deck.cards.slice(), raidDeckCards(raidFoe(r.id).deck), names, { hp: [CC_CFG.hp, r.hp] });
function raidBattle(id = raidSel, stage = goldStage(raidOf(id))) {
  const d = raidOf(id), gold = d.kind === 'gold', G = goldStages(d); stage = Math.min(stage || 0, G.length - 1); const cost = gold ? G[stage].st : raidStam(d);
  if (gold && !goldOpen(stage, d)) { toast(`Stage ${ROMAN[stage]} opens at player level ${G[stage].lv}.`); return; }
  if (!gold && wardFree() < 2) { wardFullMsg(1); return; }
  if (stamina() < cost) { toast(`This raid needs ${cost} stamina to clear. You have ${stamina()}.`); openStamina(); return; }
  const deck = ccCampMyDeck(); if (!ccValidateDeck(deck.cards).ok) { toast('Build a deck with 30 cards first.', true); openDeck(); return; }
  raidSel = id; if (gold) setGoldStage(d, stage);
  startClash({ id: deck.id, name: deck.name, cards: deck.cards.slice() }, (Math.random() * 4294967296) >>> 0, null, null, { id, stage: gold ? stage : 0, cost, hp: raidHp(id, stage) });
}
/* the battle ended: a win spends the stamina and gives one clear's rewards; a loss or draw spends nothing */
function raidFinish(G, r) {
  if (G.winner !== 0) return { win: false, cost: r.cost };
  const d = raidOf(r.id), gold = d.kind === 'gold';
  if (!spendStamina(r.cost)) return { win: true, broke: true, cost: r.cost };   // stamina went elsewhere during the battle
  questAdd('raid', 1);
  if (gold) { const g = goldStages(d)[r.stage] || goldStages(d)[0], coins = rollGold(g, 1); S.wallet.coins += coins; gainExp(g.exp); return { win: true, gold: true, coins, exp: g.exp, cost: r.cost }; }
  const drops = rollGearDrops(d, 1); gainExp(EXP.raid); return { win: true, drops, exp: EXP.raid, cost: r.cost };
}
function raidEndHTML(res) {
  if (!res.win) return `<div class="ccm-rw rb"><span class="lbl-sm">Raid not cleared</span><p class="tiny">No stamina was spent. Try again with another plan, or use an instant clear.</p></div>`;
  if (res.broke) return `<div class="ccm-rw rb"><span class="lbl-sm">Not enough stamina</span><p class="tiny">You won, but there wasn't ${res.cost} stamina left to clear the raid.</p></div>`;
  const items = res.gold ? `<span class="rb-it r3">${curIcon('coins')}<b>${fmt(res.coins)}</b><small>Gold</small></span>`
    : res.drops.map(d => `<span class="rb-it r${d.x.rarity}"><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<i class="rb-new">NEW</i>' : ''}${ctag(d.x.rarity)}<small>${esc(d.x.name)}</small></span>`).join('');
  return `<div class="ccm-rw rb"><span class="lbl-sm">Raid cleared · ${curIcon('stamina')}${res.cost} spent</span><div class="rb-row">${items}<span class="rb-it xp">${expTag(res.exp)}</span></div></div>`;
}
const raidEndBtns = r => `<div class="ccm-endb"><button class="btn gold" id="rbAgain">${icon('swords')}Battle again ${curIcon('stamina')}${r.cost}</button><button class="btn ghost" id="rbBack">${icon('raid')}Raids</button></div>`;
INFO.vault = () => { const d = raidOf(raidSel).kind === 'gold' ? raidOf(raidSel) : RAIDS.find(x => x.kind === 'gold') || RAID_BASE[3], GOLD_STAGES_V = goldStages(d); return ({ title: d.name, body: `<p class="desc">Win a card battle against the vault's guardian to clear a stage (deeper stages have a tougher guardian), or use one of your ${RAID_INSTANT} instant clears a day. Each clear gives gold (the stage's amount, give or take 15%) and EXP. No clothes drop, so it needs no wardrobe space. Deeper stages open at higher player levels.</p>
  <table class="cs-table"><thead><tr><th>Stage</th><th>Stamina</th><th>Gold per clear</th><th>EXP</th><th>Opens at</th></tr></thead><tbody>${GOLD_STAGES_V.map((g, i) => `<tr><td>${ROMAN[i]}</td><td>${g.st}</td><td>~${fmt(g.gold)}</td><td>${g.exp}</td><td>Lv ${g.lv}</td></tr>`).join('')}</tbody></table>` }); };
/* results: a see-through window over the raid screen with every piece on a soft glow, rarity badge, NEW tag */
function showRaidDrops(drops, times) {
  const st = raidStam(raidOf(raidSel)), again = Math.min(times, raidInstLeft());
  const old = document.querySelector('.rdrop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Raid rewards');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Clear rewards${times > 1 ? ` ×${times}` : ''}</h2>
      <div class="rdrop-grid">${drops.map((d, i) => `<div class="rdrop-it r${d.x.rarity}" style="--i:${i}"><span class="rdrop-glow"></span><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<span class="rdrop-new">NEW</span>' : ''}${d.st ? clothStarRow(d.st, 'drop') : ''}<span class="rdrop-r">${ctag(d.x.rarity, 'lg')}</span><b>${esc(d.x.name)}</b></div>`).join('') || '<p class="tiny">Nothing dropped.</p>'}</div>
      <div class="row" style="justify-content:center;gap:12px">${again ? `<button class="btn gold" id="rdAgain">Instant clear ×${again} ${curIcon('stamina')}${st * again}</button>` : ''}<button class="btn ${again ? 'ghost' : 'gold'}" id="rdDone">Done</button></div>
      <p class="tiny">Wear the pieces from any character's Wardrobe tab. Stamina left: ${stamina()} · instant clears left today: ${raidInstLeft()} / ${RAID_INSTANT}</p></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#rdDone').onclick = close;
  const ag = el.querySelector('#rdAgain'); if (ag) ag.onclick = () => { close(); confirmRaidClear(again); };
}

let raidEl = null, raidSel = 'ruins';
/* ---- the Raids page (.rdx, its own layout since the owner found the old one messy): a list of raid cards on the left,
   the raid's hero block, one panel (drops or vault stages) and ONE action bar: your deck vs the guardian, the day's
   instant clears as a button pair and the big crystal Battle button ---- */
function raidSubOf(x) {
  if (x.kind === 'gold') { const G = goldStages(x); return `${G.length} stage${G.length > 1 ? 's' : ''} · up to ~${fmt(Math.max(...G.map(g => g.gold)))} gold`; }
  const ur = [...new Set(dungeonPieces(x, 5).map(clothSetName))].join(' · ');
  return ur ? `UR set · ${ur}` : 'Gear raid';
}
function raidBar(open, cost) {
  const left = raidInstLeft(), dk = ccCampMyDeck(), ok = ccValidateDeck(dk.cards).ok, d = raidOf(raidSel), f = d.foe, n5 = Math.min(5, left);
  const inst = !left ? '<span class="rdx-iu">All used · back at midnight</span>'
    : `<button class="rdx-ib" data-clear="1" ${open ? '' : 'disabled'}><b>×1</b><span>${curIcon('stamina')}${cost}</span></button>${left > 1 ? `<button class="rdx-ib" data-clear="${n5}" ${open ? '' : 'disabled'}><b>×${n5}</b><span>${curIcon('stamina')}${cost * n5}</span></button>` : ''}`;
  return `<div class="rdx-bar">
      <div class="rdx-vs">
        <button class="rdx-side me" id="raidDeck" title="Change the deck you play with"><span class="rdx-si">${icon('cards')}</span><span class="rdx-st"><small>Your deck</small><b>${ok ? esc(dk.name) : 'No ready deck'}</b><em>${ok ? 'Change' : 'Build a 30-card deck'}</em></span></button>
        <span class="rdx-vsx">VS</span>
        <div class="rdx-side op"><span class="rdx-si">${icon(raidIc(d))}</span><span class="rdx-st"><small>Guardian</small><b>${esc(raidDeckName(f.deck))}</b><em>${icon('heart')}${raidHp(d.id, goldStage(d))} HP</em></span></div>
      </div>
      <div class="rdx-inst"><span class="rdx-il">${icon('bolt')}Instant clears <b>${left} / ${RAID_INSTANT}</b></span><div class="rdx-ibs">${inst}</div></div>
      <button class="rdx-go" id="raidBattle" ${open ? '' : 'disabled'}><span class="rdx-goi">${icon('swords')}</span><span class="rdx-got"><b>Battle</b><small>${curIcon('stamina')}${cost} on a win</small></span></button>
    </div>`;
}
function openRaids(id) {
  closeModal(); ensureRaidSet(); raidSync();
  if (id && RAIDS.some(x => x.id === id)) raidSel = id;   // openRaids('vault'): the gold "+" opens the Golden Vault
  else if (!raidShown().some(x => x.id === raidSel) && raidShown().length) raidSel = raidShown()[0].id;   // the picked raid was hidden or deleted
  if (!raidEl) { raidEl = document.createElement('div'); raidEl.className = 'raid rdx'; raidEl.setAttribute('role', 'dialog'); raidEl.setAttribute('aria-label', 'Raids'); document.body.appendChild(raidEl); }
  renderRaids();
}
function closeRaids() { if (raidEl) { raidEl.remove(); raidEl = null; } const d = document.querySelector('.rdrop'); if (d) d.remove(); bthHome(); }
function renderRaids() {
  if (!raidEl) return;
  const d = raidOf(raidSel), gold = d.kind === 'gold', bgk = MEDIA.get('raid:bg:' + d.id) ? 'raid:bg:' + d.id : 'raid:bg', bg = MEDIA.get(bgk);
  const keep = raidEl.querySelector('.rdx-scroll'), top = keep ? keep.scrollTop : 0;
  const item = x => `<button class="rdx-it ${x.id === d.id ? 'on' : ''} ${x.kind}" data-raid="${x.id}"><span class="rdx-iti">${icon(raidIc(x))}</span><span class="rdx-itt"><b>${esc(x.name)}</b><small>${esc(raidSubOf(x))}</small></span></button>`;
  const GS = goldStages(d), gi = goldStage(d), g = GS[gi], full = wardFree() < 2, shown = raidShown();
  const meta = gold ? [[curIcon('stamina'), `${g.st} stamina per clear`], [curIcon('coins'), `~${fmt(g.gold)} gold · +${g.exp} EXP`], [icon('swords'), 'Win a battle to clear']]
    : [[curIcon('stamina'), `${raidStam(d)} stamina per clear`], [icon('hanger'), '1–2 clothing pieces'], [icon('swords'), 'Win a battle to clear']];
  /* one drop row per clothing set: several UR sets in one raid stack under each other (the owner's ask) */
  const setsOf = L => { const m = new Map(); L.forEach(x => { const k = x.set || x.id; if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return [...m.values()]; };
  const dropRow = (r, L) => `<div class="rdx-row r${r}"><span class="rdx-rl">${ctag(r)}<small>${esc(L.length ? clothSetName(L[0]) : '—')}${r === 4 || r === 3 ? '<i>every gear raid</i>' : ''}</small></span>
          <div class="raid-pieces">${L.map(x => `<span class="raid-pc r${r} ${owns(x.id) ? '' : 'bw'}" title="${esc(x.name)}${owns(x.id) ? ` · owned ×${S.owned[x.id]}` : ''}"><img src="${clothImg(x)}" alt="">${owns(x.id) ? `<i>${S.owned[x.id]}</i>` : ''}</span>`).join('') || '<span class="tiny">No pieces yet</span>'}</div>${L.length ? `<span class="rdx-own ${L.every(x => owns(x.id)) ? 'all' : ''}"><small>Owned</small><b>${L.filter(x => owns(x.id)).length} / ${L.length}</b></span>` : ''}</div>`;
  const panel = gold ? `<div class="rdx-panel gold"><div class="rdx-ph"><b>Stages</b><small>Deeper stages cost more stamina and hold more gold</small></div>
      <div class="gv-stages">${GS.map((st, i) => { const open = goldOpen(i, d); return `<button class="gv-st ${i === gi ? 'on' : ''} ${open ? '' : 'locked'}" data-gstage="${i}" ${open ? '' : `title="Opens at player level ${st.lv}"`}>
        <b>${ROMAN[i]}</b><span class="gv-gold">${curIcon('coins')}~${fmt(st.gold)}</span><small>${open ? `${curIcon('stamina')}${st.st} · +${st.exp} EXP` : `${icon('lock')}Lv ${st.lv}`}</small></button>`; }).join('')}</div></div>`
    : `<div class="rdx-panel"><div class="rdx-ph"><b>Possible drops</b><small>Tap ${infoBtn('raid', 'Drop chances')} for the chances</small><button class="rdx-sec" id="raidFuse">${icon('fuse')}Fuse clothes</button></div>
      ${[5, 4, 3].map(r => { const G = setsOf(dungeonPieces(d, r)); return (G.length ? G : [[]]).map(L => dropRow(r, L)).join(''); }).join('')}</div>`;
  raidEl.innerHTML = `<div class="rdx-bg ${bg ? 'art' : gold ? 'gold' : ''}">${bg ? artImg(bgk) : ''}</div><div class="rdx-shade"></div>
    <header class="rdx-head"><div class="inv-title"><span class="inv-badge">${icon('raid')}</span><h2 class="ts">Raids</h2></div><span class="rdx-sp"></span>
      ${gold ? '' : `<span class="rdx-ward ${full ? 'full' : ''}" title="Raid drops need free wardrobe space">${icon('hanger')}<b>${fmt(wardCount())} / ${INV_CAP}</b>${full ? '<em>Full</em>' : ''}</span>`}
      <div class="cur" id="raidStam" data-k="stamina">${curIcon('stamina')}<b>${stamina()}/${stamMax()}</b><button class="plus" id="raidPlus" aria-label="Refill stamina">${icon('plus')}</button></div>
      <button class="inv-x" id="raidClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="rdx-rail">${shown.some(x => x.kind === 'gear') ? `<span class="rdx-gh">${icon('hanger')}Gear raids</span>${shown.filter(x => x.kind === 'gear').map(item).join('')}` : ''}
      ${shown.some(x => x.kind === 'gold') ? `<span class="rdx-gh">${icon('coin')}Gold raids</span>${shown.filter(x => x.kind === 'gold').map(item).join('')}` : ''}</aside>
    <section class="rdx-main"><div class="rdx-scroll">
      <div class="rdx-hero"><span class="rdx-kind">${icon(raidIc(d))}${gold ? 'Gold raid' : 'Gear raid'}${d.hidden ? ' · hidden from players' : ''}</span>
        <h1 class="rdx-title">${esc(d.name)}${gold ? ` <em>${ROMAN[gi]}</em>` : ''}</h1><p class="rdx-desc">${esc(d.desc)}</p>
        <div class="rdx-meta">${meta.map(([ic, t]) => `<span>${ic}${t}</span>`).join('')}${gold ? infoBtn('vault', 'How the Golden Vault works') : ''}</div></div>
      ${panel}</div>
      ${raidBar(gold ? goldOpen(gi, d) : true, gold ? g.st : raidStam(d))}</section>`;
  const sc = raidEl.querySelector('.rdx-scroll'); if (sc && top) sc.scrollTop = top;
  const rl = raidEl.querySelector('.rdx-rail'), on = rl && rl.querySelector('.rdx-it.on'); if (on && rl.scrollWidth > rl.clientWidth + 2) rl.scrollLeft = Math.max(0, on.offsetLeft - (rl.clientWidth - on.offsetWidth) / 2);
  raidEl.querySelector('#raidClose').onclick = closeRaids;
  raidEl.querySelector('#raidPlus').onclick = openStamina;
  raidEl.querySelectorAll('[data-raid]').forEach(b => b.onclick = () => { raidSel = b.dataset.raid; renderRaids(); });
  raidEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => confirmRaidClear(+b.dataset.clear));
  const bt = raidEl.querySelector('#raidBattle'); if (bt) bt.onclick = () => raidBattle(raidSel, goldStage(d));
  const dkb = raidEl.querySelector('#raidDeck'); if (dkb) dkb.onclick = () => { if (ccValidateDeck(ccCampMyDeck().cards).ok || ccAllDecks().some(x => ccValidateDeck(x.cards).ok)) ccDeckPicker(renderRaids); else { closeRaids(); openDeck(); } };
  raidEl.querySelectorAll('[data-gstage]').forEach(b => b.onclick = () => { const i = +b.dataset.gstage; if (!goldOpen(i, d)) { toast(`Stage ${ROMAN[i]} opens at player level ${GS[i].lv}.`); return; } setGoldStage(d, i); persist(); renderRaids(); });
  const fu = raidEl.querySelector('#raidFuse'); if (fu) fu.onclick = () => openFuse(3);
}
setInterval(() => { const s = raidEl && raidEl.querySelector('#raidStam b'); if (s) s.textContent = `${stamina()}/${stamMax()}`; }, 5000);

/* ---------- admin → Raids: the raid editor (pick a raid or add one, edit it), the raid screen wallpaper and the design
   of every raid piece. Every change is saved at once into the content S.raidDefs (see raidSync) ---------- */
let raidEd = null;
const raidDefOf = id => { const D = raidDefs(); if (!D[id]) D[id] = {}; return D[id]; };   // the stored changes of a raid (a whole def for a new raid)
/* quiet = a text or number field: save without redrawing the page (it fires on blur, and a redraw then would swallow the
   click that caused the blur), only the list card, the header and the R % are refreshed */
function raidEdSave(id, fn, quiet) {
  const def = raidDefOf(id); fn(def); persist(); raidSync(); if (raidEl) renderRaids();
  if (!quiet) { renderRaidsTab(); return; }
  const d = raidOf(id), card = document.querySelector(`[data-raed="${id}"] .rae-itt`), h = document.querySelector('.rae-edh b'), r = document.querySelector('#raeR');
  if (card) card.innerHTML = raidCardTxt(d); if (h) h.textContent = d.name; if (r) r.textContent = Math.max(0, 100 - (d.ur || 0) - (d.ssr || 0)) + '%';
}
const raidCardTxt = x => `<b>${esc(x.name)}</b><small>${x.kind === 'gold' ? `${goldStages(x).length} stages` : `${raidStam(x)} stamina · UR ${x.ur}%`} · ${esc(raidDeckName(x.foe.deck))} ${x.foe.hp} HP</small>`;
function raidNew(kind) {
  const id = 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  raidDefs()[id] = kind === 'gold'
    ? { id, custom: true, at: Date.now(), kind: 'gold', hidden: true, name: 'New gold raid', desc: 'A new treasure vault. Write its story here.', foe: { deck: 'raiders', hp: 8, skin: 'inferno', back: 'royal' }, stages: GOLD_STAGES.map(g => ({ ...g })) }
    : { id, custom: true, at: Date.now(), kind: 'gear', hidden: true, name: 'New gear raid', desc: 'A new dungeon. Write its story here.', foe: { deck: 'traps', hp: 14, skin: 'default', back: 'default' }, stam: RAID_STAMINA, ur: 8, ssr: 20, dbl: 33 };
  raidEd = id; persist(); raidSync(); renderRaidsTab(); toast('New raid added. It stays hidden from players until you tick "Shown to players".');
}
function raidEditorHTML(d) {
  const sel = (key, list, val) => `<select class="input sm" data-rfoe="${key}">${list.map(o => `<option value="${esc(o.id)}" ${o.id === val ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select>`;
  const urSets = raidSetList().filter(st => st.rarity === 5), home = st => urHome(raidPieces(5).find(p => p.set === st.set) || {});
  const w = MEDIA.get('raid:bg:' + d.id), rR = Math.max(0, 100 - (d.ur || 0) - (d.ssr || 0));
  const num = (k, v, lo, hi, lbl, sfx = '') => `<label class="rae-f"><span>${lbl}</span><span class="rae-n"><input class="input sm" type="number" min="${lo}" max="${hi}" step="1" data-rnum="${k}" value="${v}">${sfx}</span></label>`;
  return `<div class="rae-ed">
    <div class="rae-edh"><span class="rae-ic">${icon(raidIc(d))}</span><div><small>${d.kind === 'gold' ? 'Gold raid' : 'Gear raid'}${d.base ? ' · built in' : ' · made by you'}</small><b>${esc(d.name)}</b></div>
      <label class="rae-show"><input type="checkbox" id="raeShown" ${d.hidden ? '' : 'checked'}><span>Shown to players</span></label></div>
    <div class="rae-grid">
      <label class="rae-f wide"><span>Name</span><input class="input" id="raeName" maxlength="30" value="${esc(d.name)}"></label>
      <label class="rae-f wide"><span>Description</span><textarea class="input" id="raeDesc" rows="3" maxlength="300">${esc(d.desc)}</textarea></label>
      <div class="rae-f wide"><span>Icon</span><div class="rae-ics">${RAID_ICS.filter(k => ICONS[k]).map(k => `<button type="button" class="rae-icb ${raidIc(d) === k ? 'on' : ''}" data-ric="${k}" title="${k}">${icon(k)}</button>`).join('')}</div></div>
    </div>
    ${d.kind === 'gear' ? `<div class="rae-sec"><b>Clears and drops</b><div class="rae-grid four">
        ${num('stam', d.stam, 1, 200, 'Stamina per clear')}${num('ur', d.ur, 0, 100, 'UR drop chance', '%')}${num('ssr', d.ssr, 0, 100, 'SSR drop chance', '%')}${num('dbl', d.dbl, 0, 100, 'Clears with 2 drops', '%')}</div>
        <p class="tiny">R pieces drop the rest of the time: <b id="raeR">${rR}%</b>. When the raid has no piece of a rarity, the next rarity down drops instead.</p></div>
      <div class="rae-sec"><b>UR sets in this raid</b><p class="tiny">Tick the UR sets that drop here (a set drops in one raid at a time). The SSR and R sets drop in every gear raid. Several UR sets show under each other on the raid page.</p>
        <div class="rae-sets">${urSets.map(st => { const h = home(st), on = h === d.id, other = !on && h !== 'none' && RAIDS.find(x => x.id === h); return `<label class="rae-set ${on ? 'on' : ''}"><input type="checkbox" data-rset="${esc(st.set)}" ${on ? 'checked' : ''}><span class="rae-setpc">${raidPieces(5).filter(p => p.set === st.set).slice(0, 3).map(p => `<img src="${clothImg(p)}" alt="">`).join('')}</span><span><b>${esc(st.name)}</b><small>${on ? 'Drops here' : other ? `Drops in ${esc(other.name)}` : 'Drops nowhere'}</small></span></label>`; }).join('') || '<p class="tiny">No UR raid sets yet.</p>'}</div>
        <div class="row rae-newset"><input class="input sm" id="raeSetName" maxlength="24" placeholder="New UR set name, e.g. Coral Empress"><button class="btn mint sm" id="raeSetAdd">${icon('plus')}Add a UR set to this raid</button></div>
        <p class="tiny">A new set is 6 pieces (Hat, Top, Pants, Shoes, Accessory, Hand) in white line art: upload their designs further down this page.</p></div>`
    : `<div class="rae-sec"><b>Stages</b><p class="tiny">Each stage: stamina per clear, gold per clear (give or take 15%), EXP per clear and the player level it opens at. The guardian gets +2 HP per stage. Up to 6 stages.</p>
        <div class="rae-stages"><span class="rae-sh"><i>Stage</i><i>Stamina</i><i>Gold</i><i>EXP</i><i>Opens at Lv</i><i></i></span>${d.stages.map((g, i) => `<span class="rae-st"><b>${ROMAN[i]}</b>${['st', 'gold', 'exp', 'lv'].map(k => `<input class="input sm" type="number" min="${k === 'lv' || k === 'st' ? 1 : 0}" step="1" data-rstage="${i}" data-rsk="${k}" value="${g[k]}" aria-label="Stage ${ROMAN[i]} ${k}">`).join('')}<button class="link" data-rstdel="${i}" ${d.stages.length < 2 ? 'disabled' : ''}>Remove</button></span>`).join('')}</div>
        ${d.stages.length < 6 ? `<button class="btn ghost sm" id="raeStAdd">${icon('plus')}Add a stage</button>` : ''}</div>`}
    <div class="rae-sec"><b>Guardian</b><p class="tiny">The card battle you win to clear the raid: the guardian plays this deck${d.kind === 'gold' ? ' (+2 HP per stage)' : ''}. The character it plays as is picked at random from the pool.</p>
      <div class="rae-grid four"><label class="rae-f"><span>Deck</span>${sel('deck', raidDeckList(), d.foe.deck)}</label>${num('hp', d.foe.hp, 1, 60, 'Hero HP')}
        <label class="rae-f"><span>Board skin</span>${sel('skin', CC_SKINS, d.foe.skin)}</label><label class="rae-f"><span>Card back</span>${sel('back', CC_BACKS, d.foe.back)}</label></div></div>
    <div class="rae-sec"><b>Wallpaper</b><div class="row" style="gap:10px;align-items:center"><div class="ev-adprev" style="width:180px">${w ? `<img src="${w}" alt="">` : '<span class="tiny">The raid screen wallpaper</span>'}</div>
      <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${w ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rdbg="${d.id}"></label>${w ? `<button class="link" data-rdbgdel="${d.id}">Remove</button>` : ''}${artFrameBtn('raid:bg:' + d.id, 'screen', `${d.name} wallpaper`)}</div></div></div>
    <div class="row rae-acts"><button class="btn gold sm" id="raeOpen">${icon('eye')}Open this raid</button>${d.base ? `<button class="btn ghost sm" id="raeReset">Back to the default</button>` : `<button class="btn ghost sm danger" id="raeDel">${icon('trash')}Delete raid</button>`}</div>
  </div>`;
}
function renderRaidsTab() {
  const p = $('#adPanel'); if (!p) return; ensureRaidSet(); raidSync();
  if (!raidEd || !RAIDS.some(x => x.id === raidEd)) raidEd = RAIDS[0].id;
  const d = raidOf(raidEd), bg = MEDIA.get('raid:bg');
  const card = x => `<button class="rae-it ${x.id === d.id ? 'on' : ''} ${x.kind}" data-raed="${x.id}"><span class="rae-ic">${icon(raidIc(x))}</span><span class="rae-itt">${raidCardTxt(x)}</span>${x.hidden ? '<em class="rae-hid">Hidden</em>' : ''}</button>`;
  p.innerHTML = `<div class="stack">
    <div><h3>Raids</h3><p class="tiny">Pick a raid to edit it, or add a new one. Gear raids drop clothes (they share the R and SSR sets, and each has its own UR sets); gold raids give gold in stages. Changes are saved at once and every player sees them. New raids start hidden: tick "Shown to players" when it's ready.</p></div>
    <div class="rae">
      <aside class="rae-list"><span class="rae-gh">${icon('hanger')}Gear raids</span>${RAIDS.filter(x => x.kind === 'gear').map(card).join('')}
        <span class="rae-gh">${icon('coin')}Gold raids</span>${RAIDS.filter(x => x.kind === 'gold').map(card).join('')}
        <div class="rae-new"><button class="btn mint sm" id="raeNewGear">${icon('plus')}New gear raid</button><button class="btn ghost sm" id="raeNewGold">${icon('plus')}New gold raid</button></div></aside>
      ${raidEditorHTML(d)}
    </div>
    <div class="row"><div class="ev-adprev" style="width:220px">${bg ? `<img src="${bg}" alt="">` : '<span class="tiny">No wallpaper</span>'}</div>
      <div class="stack" style="gap:8px"><b>Raid screen wallpaper</b><span class="tiny">Used by every raid without a wallpaper of its own. 1920×1080 works best.</span><div class="row"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="raidBgUp"></label>${bg ? '<button class="btn ghost sm" id="raidBgDel">Remove</button>' : ''}${artFrameBtn('raid:bg', 'screen', 'Raid screen wallpaper')}<button class="btn ghost sm" id="raidOpen">Open Raids</button></div></div></div>
    <div><h3>Raid clothing sets</h3><p class="tiny">The name and design of every piece. The SSR and R sets drop in every gear raid; each UR set drops in the raid picked here (or in the raid editor above).</p></div>
    ${raidSetList().map(st => `<div class="sk-group"><b>${ctag(st.rarity)} ${esc(st.name)} set</b>${st.rarity === 5 ? ` <label class="tiny raid-home">Drops in <select class="input sm" data-rhome="${esc(st.set)}">${RAIDS.filter(x => x.kind === 'gear').map(x => `<option value="${x.id}" ${urHome(raidPieces(5).find(p => p.set === st.set) || {}) === x.id ? 'selected' : ''}>${esc(x.name)}${x.hidden ? ' (hidden)' : ''}</option>`).join('')}<option value="none" ${urHome(raidPieces(5).find(p => p.set === st.set) || {}) === 'none' ? 'selected' : ''}>Nowhere</option></select></label>` : ' <span class="tiny">· every gear raid</span>'}<div class="raid-ad">${raidPieces().filter(x => x.set === st.set).map(x => `<div class="raid-adit r${x.rarity}">
        <span class="raid-pc r${x.rarity}"><img src="${clothImg(x)}" alt=""></span>
        <input class="input" data-rnm="${esc(x.id)}" maxlength="30" value="${esc(x.name)}" aria-label="Piece name">
        <span class="tiny">${(WARD_SLOTS.find(s => s[0] === x.slot) || [])[1]}</span>
        <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${x.img ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rimg="${esc(x.id)}"></label>${x.img ? `<button class="link" data-rreset="${esc(x.id)}">Line art</button>` : ''}</div></div>`).join('')}</div></div>`).join('')}
    <p class="tiny">The pieces are normal Wardrobe clothes: anyone can wear them, and the Wardrobe tab shows them too.</p>
  </div>`;
  // the raid list and the editor
  p.querySelectorAll('[data-raed]').forEach(b => b.onclick = () => { raidEd = b.dataset.raed; renderRaidsTab(); });
  $('#raeNewGear').onclick = () => raidNew('gear'); $('#raeNewGold').onclick = () => raidNew('gold');
  $('#raeShown').onchange = e => raidEdSave(d.id, f => { f.hidden = !e.target.checked; });
  $('#raeName').onchange = e => raidEdSave(d.id, f => { f.name = e.target.value.trim().slice(0, 30) || d.name; }, true);
  $('#raeDesc').onchange = e => raidEdSave(d.id, f => { f.desc = e.target.value.trim().slice(0, 300); }, true);
  p.querySelectorAll('[data-ric]').forEach(b => b.onclick = () => raidEdSave(d.id, f => { f.icon = b.dataset.ric; }));
  p.querySelectorAll('[data-rnum]').forEach(i => i.onchange = () => { const k = i.dataset.rnum; raidEdSave(d.id, f => { if (k === 'hp') f.foe = { ...(f.foe || {}), hp: +i.value }; else f[k] = +i.value; }, true); const n = raidOf(d.id); i.value = k === 'hp' ? n.foe.hp : n[k]; });
  p.querySelectorAll('[data-rfoe]').forEach(i => i.onchange = () => raidEdSave(d.id, f => { f.foe = { ...(f.foe || {}), [i.dataset.rfoe]: i.value }; }));
  p.querySelectorAll('[data-rstage]').forEach(i => i.onchange = () => { const j = +i.dataset.rstage, k = i.dataset.rsk; raidEdSave(d.id, f => { f.stages = raidOf(d.id).stages.map(g => ({ ...g })); f.stages[j][k] = +i.value; }, true); i.value = raidOf(d.id).stages[j][k]; });
  p.querySelectorAll('[data-rstdel]').forEach(b => b.onclick = () => raidEdSave(d.id, f => { f.stages = raidOf(d.id).stages.filter((_, j) => j !== +b.dataset.rstdel); }));
  const sta = $('#raeStAdd'); if (sta) sta.onclick = () => raidEdSave(d.id, f => { const G = raidOf(d.id).stages, last = G[G.length - 1]; f.stages = [...G.map(g => ({ ...g })), { st: last.st + 5, gold: Math.round(last.gold * 1.4 / 100) * 100, exp: last.exp + 5, lv: last.lv + 10 }]; });
  p.querySelectorAll('[data-rset]').forEach(i => i.onchange = () => { raidPieces(5).filter(x => x.set === i.dataset.rset).forEach(x => { x.dungeon = i.checked ? d.id : 'none'; }); persist(); renderRaidsTab(); });
  const sa = $('#raeSetAdd'); if (sa) sa.onclick = () => {
    const name = $('#raeSetName').value.trim(); if (!name) { toast('Give the set a name first.'); return; }
    const set = `set-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    WARD_SLOTS.forEach(([slot, label]) => S.clothes.push({ id: `${set}-${slot}`, name: `${name} ${label}`, slot, rarity: 5, char: null, img: null, set, setName: name, raid: true, dungeon: d.id }));
    persist(); renderRaidsTab(); toast(`Added the ${name} set (6 UR pieces) to ${d.name}.`);
  };
  $('#raeOpen').onclick = () => { closeModal(); openRaids(d.id); };
  const rs = $('#raeReset'); if (rs) rs.onclick = () => { if (!rs.dataset.sure) { rs.dataset.sure = 1; rs.textContent = 'Tap again to reset'; return; } delete raidDefs()[d.id]; persist(); raidSync(); renderRaidsTab(); toast(`${raidOf(d.id).name} is back to its default.`); };
  const dl = $('#raeDel'); if (dl) dl.onclick = async () => {
    if (!dl.dataset.sure) { dl.dataset.sure = 1; dl.textContent = 'Tap again to delete'; return; }
    raidPieces(5).filter(x => x.dungeon === d.id).forEach(x => { x.dungeon = 'none'; });   // its UR sets stay in the wardrobe and drop nowhere until moved
    delete raidDefs()[d.id]; if (MEDIA.get('raid:bg:' + d.id)) await mediaDel('raid:bg:' + d.id);
    if (raidSel === d.id) raidSel = 'ruins'; raidEd = null; persist(); raidSync(); renderRaidsTab(); toast(`${d.name} deleted.`);
  };
  // wallpapers and pieces
  $('#raidBgUp').onchange = async ev => { try { if (await mediaSet('raid:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderRaidsTab(); toast('Raid wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = $('#raidBgDel'); if (del) del.onclick = async () => { await mediaDel('raid:bg'); renderRaidsTab(); };
  $('#raidOpen').onclick = () => { closeModal(); openRaids(); };
  p.querySelectorAll('[data-rhome]').forEach(sel => sel.onchange = () => { raidPieces(5).filter(x => x.set === sel.dataset.rhome).forEach(x => { x.dungeon = sel.value; }); persist(); renderRaidsTab(); toast(sel.value === 'none' ? 'That UR set now drops nowhere.' : 'UR set moved to ' + raidOf(sel.value).name + '.'); });
  p.querySelectorAll('[data-rdbg]').forEach(i => i.onchange = async () => { try { if (await mediaSet('raid:bg:' + i.dataset.rdbg, await resizeImage(i.files[0], 1920, 'image/jpeg'))) { renderRaidsTab(); toast('Raid wallpaper saved.'); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-rdbgdel]').forEach(b => b.onclick = async () => { await mediaDel('raid:bg:' + b.dataset.rdbgdel); renderRaidsTab(); });
  p.querySelectorAll('[data-rnm]').forEach(i => i.onchange = () => { const x = S.clothes.find(c => c.id === i.dataset.rnm); x.name = i.value.trim() || x.name; persist(); });
  p.querySelectorAll('[data-rimg]').forEach(i => i.onchange = async () => {
    const x = S.clothes.find(c => c.id === i.dataset.rimg);
    try { if (await mediaSet('cloth:' + x.id, await resizeImage(i.files[0], 512))) { x.img = 'idb:cloth:' + x.id; persist(); renderRaidsTab(); toast('Design saved.'); } } catch (e) { toast(e.message, true); }
  });
  p.querySelectorAll('[data-rreset]').forEach(b => b.onclick = async () => { const x = S.clothes.find(c => c.id === b.dataset.rreset); await mediaDel('cloth:' + x.id); x.img = null; persist(); renderRaidsTab(); });
}
ICONS.raid = '<path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-5a3 3 0 0 1 6 0v5"/><path d="M3 21h18"/><path d="M12 4V2"/>';
ensureRaidSet(); raidSync();

ICONS.coin = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 9.5v5"/>';
