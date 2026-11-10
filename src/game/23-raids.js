/* ---------- Raids: dungeons that cost stamina and drop Wardrobe clothes ----------
   Three gear dungeons (shared R and SSR sets, a UR set of their own) and the Golden Vault (gold, 5 stages; S.raidStage).
   Each gear clear costs RAID_STAMINA and gives 1 clothing piece, or 2 with RAID_DOUBLE chance:
   UR 4%, SSR 10%, R the rest. The sets are ordinary Wardrobe clothes (S.clothes, flag raid + set) so the admin edits
   their pictures in admin → Raids or Wardrobe; without a picture each piece shows white line art for its slot.
   No summon animation: the drops pop up in a see-through results window. */
const RAID_STAMINA = 20, RAID_DOUBLE = .33, RAID_RATES = { 5: .08, 4: .20 };
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
const RAIDS = [
  { id: 'ruins', kind: 'gear', name: 'Whispering Ruins', desc: 'Old stone halls beneath the forest, guarded by restless spirits. Every clear leaves behind pieces of forgotten outfits.' },
  { id: 'abyss', kind: 'gear', name: 'Abyssal Depths', desc: 'A drowned palace at the bottom of the sea, lit by glowing coral. Its queen\'s wardrobe still drifts through the halls.' },
  { id: 'garden', kind: 'gear', name: 'Moonlit Garden', desc: 'A hidden shrine garden that only opens under the full moon. Petals fall like snow over the old festival robes.' },
  { id: 'vault', kind: 'gold', name: 'Golden Vault', desc: 'A treasure vault sealed by the old merchant guild. Deeper stages cost more stamina but hold far more gold.' }
];
const RAID_UR_HOME = { ur: 'ruins', ur2: 'abyss', ur3: 'garden' };
const raidOf = id => RAIDS.find(x => x.id === id) || RAIDS[0];
const urHome = x => x.dungeon || RAID_UR_HOME[x.set] || 'ruins';
/* gold raid stages: stamina per clear, gold per clear (±15%), EXP per clear, player level needed */
const GOLD_STAGES = [
  { st: 10, gold: 3000, exp: 10, lv: 1 }, { st: 20, gold: 7000, exp: 15, lv: 10 }, { st: 30, gold: 12000, exp: 20, lv: 20 },
  { st: 40, gold: 18000, exp: 25, lv: 30 }, { st: 50, gold: 26000, exp: 30, lv: 40 }
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
INFO.raid = () => { const p = r => r === 3 ? Math.round((1 - RAID_RATES[5] - RAID_RATES[4]) * 100) : Math.round(RAID_RATES[r] * 100);
  return { title: 'Raid drops', body: `<p class="desc">Each clear costs ${RAID_STAMINA} stamina and gives 1 clothing piece; ${Math.round(RAID_DOUBLE * 100)}% of clears give 2. Every clear also gives ${EXP.raid} EXP.</p>
    <table class="cs-table"><thead><tr><th>Drop</th><th>Chance</th></tr></thead><tbody>
      <tr><td>${ctag(5)} 2★ UR piece</td><td>${RAID_STAR2 * 100}%</td></tr>
      ${[5, 4, 3].map(r => `<tr><td>${ctag(r)} ${CRN[r]} piece</td><td>${p(r)}%</td></tr>`).join('')}
    </tbody></table><p class="tiny">The 2★ roll comes first; otherwise the piece is UR, SSR or R at the rates above, picked at random from that rarity's raid sets.</p>` }; };
function rollRaidPiece(d) {
  const x = Math.random(), r = x < RAID_RATES[5] ? 5 : x < RAID_RATES[5] + RAID_RATES[4] ? 4 : 3;
  const list = dungeonPieces(d, r); return list.length ? rpick(list) : null;
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
function clearRaid(times) {
  const d = raidOf(raidSel);
  if (d.kind === 'gold') return clearGold(times);
  if (wardFree() < 2 * times) { wardFullMsg(times); return; }
  const cost = RAID_STAMINA * times;
  if (stamina() < cost) { toast(`This needs ${cost} stamina. You have ${stamina()}.`); openStamina(); return; }
  spendStamina(cost); questAdd('raid', times);
  const drops = [];
  let n = 0; for (let t = 0; t < times; t++) n += Math.random() < RAID_DOUBLE ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const ur = dungeonPieces(d, 5), st2 = Math.random() < RAID_STAR2 && ur.length, x = st2 ? rpick(ur) : rollRaidPiece(d); if (!x) continue;   // 0.5%: a 2★ UR piece
    const isNew = !owns(x.id); addCloth(x.id, st2 ? 2 : 1); drops.push({ x, isNew, st: st2 ? 2 : (hasClothStars(x) ? 1 : 0) });
  }
  drops.sort((a, b) => b.x.rarity - a.x.rarity);
  gainExp(EXP.raid * times); persist(); renderMenu(); renderRaids();
  showRaidDrops(drops, times);
}
/* gold raid: no wardrobe space needed; each clear gives the stage's gold (±15%) and EXP */
const goldStage = () => Math.min(GOLD_STAGES.length - 1, Math.max(0, S.raidStage || 0));
const goldOpen = i => playerLv().lv >= GOLD_STAGES[i].lv;
function clearGold(times) {
  const i = goldStage(), g = GOLD_STAGES[i];
  if (!goldOpen(i)) { toast(`Stage ${ROMAN[i]} opens at player level ${g.lv}.`); return; }
  const cost = g.st * times;
  if (stamina() < cost) { toast(`This needs ${cost} stamina. You have ${stamina()}.`); openStamina(); return; }
  spendStamina(cost); questAdd('raid', times);
  let coins = 0; for (let t = 0; t < times; t++) coins += Math.round(g.gold * (.85 + Math.random() * .3) / 10) * 10;
  S.wallet.coins += coins; gainExp(g.exp * times); persist(); renderMenu(); renderRaids();
  showRewards(`Golden Vault ${ROMAN[i]}${times > 1 ? ` ×${times}` : ''}`, { coins, exp: g.exp * times }, `${cost} stamina spent · ${stamina()} left`);
}
INFO.vault = () => ({ title: 'Golden Vault', body: `<p class="desc">Each clear gives gold (the stage's amount, give or take 15%) and EXP. No clothes drop, so it needs no wardrobe space. Deeper stages open at higher player levels.</p>
  <table class="cs-table"><thead><tr><th>Stage</th><th>Stamina</th><th>Gold per clear</th><th>EXP</th><th>Opens at</th></tr></thead><tbody>${GOLD_STAGES.map((g, i) => `<tr><td>${ROMAN[i]}</td><td>${g.st}</td><td>~${fmt(g.gold)}</td><td>${g.exp}</td><td>Lv ${g.lv}</td></tr>`).join('')}</tbody></table>` });
/* results: a see-through window over the raid screen with every piece on a soft glow, rarity badge, NEW tag */
function showRaidDrops(drops, times) {
  const cost = RAID_STAMINA * times;
  const old = document.querySelector('.rdrop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Raid rewards');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Clear rewards${times > 1 ? ` ×${times}` : ''}</h2>
      <div class="rdrop-grid">${drops.map((d, i) => `<div class="rdrop-it r${d.x.rarity}" style="--i:${i}"><span class="rdrop-glow"></span><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<span class="rdrop-new">NEW</span>' : ''}${d.st ? clothStarRow(d.st, 'drop') : ''}<span class="rdrop-r">${ctag(d.x.rarity, 'lg')}</span><b>${esc(d.x.name)}</b></div>`).join('') || '<p class="tiny">Nothing dropped.</p>'}</div>
      <div class="row" style="justify-content:center;gap:12px"><button class="btn gold" id="rdAgain">Clear again ${curIcon('stamina')}${cost}</button><button class="btn ghost" id="rdDone">Done</button></div>
      <p class="tiny">Wear the pieces from any character's Wardrobe tab. Stamina left: ${stamina()}</p></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#rdDone').onclick = close;
  el.querySelector('#rdAgain').onclick = () => { close(); clearRaid(times); };
}

let raidEl = null, raidSel = 'ruins';
function openRaids() {
  closeModal(); ensureRaidSet();
  if (!raidEl) { raidEl = document.createElement('div'); raidEl.className = 'raid evp'; raidEl.setAttribute('role', 'dialog'); raidEl.setAttribute('aria-label', 'Raids'); document.body.appendChild(raidEl); }
  renderRaids();
}
function closeRaids() { if (raidEl) { raidEl.remove(); raidEl = null; } const d = document.querySelector('.rdrop'); if (d) d.remove(); bthHome(); }
function renderRaids() {
  if (!raidEl) return;
  const d = raidOf(raidSel), bg = MEDIA.get('raid:bg:' + d.id) || MEDIA.get('raid:bg'), gold = d.kind === 'gold';
  const item = x => `<button class="evp-item ${x.id === d.id ? 'on' : ''}" data-raid="${x.id}"><span class="evp-ic">${icon(x.kind === 'gold' ? 'coin' : 'raid')}</span><b>${esc(x.name)}</b></button>`;
  const gi = goldStage(), g = GOLD_STAGES[gi];
  const body = gold ? `
      <span class="evp-time">${icon('bolt')}${g.st} stamina per clear · ~${fmt(g.gold)} gold ${infoBtn('vault')}</span>
      <p class="evp-sub raid-desc">${esc(d.desc)}</p>
      <div class="raid-drops"><span class="lbl-sm">Stages</span>
        <div class="gv-stages">${GOLD_STAGES.map((s, i) => { const open = goldOpen(i); return `<button class="gv-st ${i === gi ? 'on' : ''} ${open ? '' : 'locked'}" data-gstage="${i}" ${open ? '' : `title="Opens at player level ${s.lv}"`}>
          <b>${ROMAN[i]}</b><span class="gv-gold">${curIcon('coins')}~${fmt(s.gold)}</span><small>${open ? `${curIcon('stamina')}${s.st} · +${s.exp} EXP` : `${icon('lock')}Lv ${s.lv}`}</small></button>`; }).join('')}</div>
      </div>
      <div class="raid-go"><button class="btn gold" data-clear="1" ${goldOpen(gi) ? '' : 'disabled'}>Clear ×1 ${curIcon('stamina')}${g.st}</button><button class="btn mint" data-clear="5" ${goldOpen(gi) ? '' : 'disabled'}>Clear ×5 ${curIcon('stamina')}${g.st * 5}</button></div>`
    : `
      <span class="evp-time">${icon('bolt')}${RAID_STAMINA} stamina per clear · 1–2 drops ${infoBtn('raid')}</span>
      <p class="evp-sub raid-desc">${esc(d.desc)}</p>
      <div class="raid-drops"><span class="lbl-sm">Possible drops</span>
        ${[5, 4, 3].map(r => { const L = dungeonPieces(d, r); return `<div class="raid-row r${r}"><span class="raid-rate">${ctag(r)}</span><div class="raid-pieces">${L.map(x => `<span class="raid-pc r${r} ${owns(x.id) ? '' : 'bw'}" title="${esc(x.name)}${owns(x.id) ? ` · owned ×${S.owned[x.id]}` : ''}"><img src="${clothImg(x)}" alt="">${owns(x.id) ? `<i>${S.owned[x.id]}</i>` : ''}</span>`).join('') || '<span class="tiny">No pieces yet</span>'}</div>${r === 5 ? `<span class="raid-setnm">${esc([...new Set(L.map(x => clothSetName(x)))].join(' · '))}</span>` : r === 4 ? '<span class="raid-setnm">Same in every gear raid</span>' : ''}</div>`; }).join('')}
      </div>
      <div class="raid-go"><button class="btn gold" data-clear="1">Clear ×1 ${curIcon('stamina')}${RAID_STAMINA}</button><button class="btn mint" data-clear="5">Clear ×5 ${curIcon('stamina')}${RAID_STAMINA * 5}</button><button class="btn ghost" id="raidFuse">${icon('fuse')}Fuse clothes</button><span class="raid-ward ${wardFree() < 2 ? 'full' : ''}">${icon('hanger')}Wardrobe ${fmt(wardCount())} / ${INV_CAP}${wardFree() < 2 ? ' · full' : ''}</span></div>`;
  const bgk = MEDIA.get('raid:bg:' + d.id) ? 'raid:bg:' + d.id : 'raid:bg';
  raidEl.innerHTML = `<div class="evp-bg ${bg ? '' : 'none raid-none'} ${gold && !bg ? 'gold-none' : ''}">${bg ? artImg(bgk) : ''}</div><div class="evp-shade"></div>
    <div class="evp-head"><span class="inv-badge">${icon('raid')}</span><h2 class="ts">Raids</h2></div>
    <div class="raid-top"><div class="cur" id="raidStam">${curIcon('stamina')}<b>${stamina()}/${stamMax()}</b><button class="plus" id="raidPlus" aria-label="Refill stamina">${icon('plus')}</button></div><button class="inv-x" id="raidClose" aria-label="Close">${icon('close')}</button></div>
    <aside class="evp-side"><span class="evp-pill">${icon('hanger')}Gear raids</span>
      <div class="evp-list">${RAIDS.filter(x => x.kind === 'gear').map(item).join('')}</div>
      <span class="evp-pill raid-pill2">${icon('coin')}Gold raids</span>
      <div class="evp-list">${RAIDS.filter(x => x.kind === 'gold').map(item).join('')}</div></aside>
    <section class="evp-main raid-main">
      <h1 class="evp-title">${esc(d.name)}</h1>${body}
    </section>`;
  raidEl.querySelector('#raidClose').onclick = closeRaids;
  raidEl.querySelector('#raidPlus').onclick = openStamina;
  raidEl.querySelectorAll('[data-raid]').forEach(b => b.onclick = () => { raidSel = b.dataset.raid; renderRaids(); });
  raidEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => clearRaid(+b.dataset.clear));
  raidEl.querySelectorAll('[data-gstage]').forEach(b => b.onclick = () => { const i = +b.dataset.gstage; if (!goldOpen(i)) { toast(`Stage ${ROMAN[i]} opens at player level ${GOLD_STAGES[i].lv}.`); return; } S.raidStage = i; persist(); renderRaids(); });
  const fu = $('#raidFuse'); if (fu) fu.onclick = () => openFuse(3);
}
setInterval(() => { const s = raidEl && raidEl.querySelector('#raidStam b'); if (s) s.textContent = `${stamina()}/${stamMax()}`; }, 5000);

/* admin → Raids: the dungeon wallpaper and the design of every raid piece */
function renderRaidsTab() {
  const p = $('#adPanel'); if (!p) return; ensureRaidSet();
  const bg = MEDIA.get('raid:bg');
  p.innerHTML = `<div class="stack">
    <div><h3>Raids</h3><p class="tiny">Gear raids (${RAIDS.filter(x => x.kind === 'gear').map(x => esc(x.name)).join(', ')}) share the R and SSR sets; each drops its own UR set (pick the dungeon of every UR raid set below). ${RAID_STAMINA} stamina per clear, 1 drop per clear (2 drops ${Math.round(RAID_DOUBLE * 100)}% of the time). Drop chances: UR ${RAID_RATES[5] * 100}%, SSR ${RAID_RATES[4] * 100}%, R ${Math.round((1 - RAID_RATES[5] - RAID_RATES[4]) * 100)}%.</p></div>
    <div class="row"><div class="ev-adprev" style="width:220px">${bg ? `<img src="${bg}" alt="">` : '<span class="tiny">No wallpaper</span>'}</div>
      <div class="stack" style="gap:8px"><b>Raid screen wallpaper</b><span class="tiny">1920×1080 works best.</span><div class="row"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="raidBgUp"></label>${bg ? '<button class="btn ghost sm" id="raidBgDel">Remove</button>' : ''}${artFrameBtn('raid:bg', 'screen', 'Raid screen wallpaper')}<button class="btn ghost sm" id="raidOpen">Open Raids</button></div></div></div>
    <div class="sk-group"><b>Wallpaper per dungeon</b><span class="tiny">Optional: replaces the raid screen wallpaper for that dungeon.</span><div class="raid-adbg">${RAIDS.map(x => { const w = MEDIA.get('raid:bg:' + x.id); return `<div class="raid-adbgit"><div class="ev-adprev" style="width:160px">${w ? `<img src="${w}" alt="">` : '<span class="tiny">Default</span>'}</div><b>${esc(x.name)}</b><div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${w ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rdbg="${x.id}"></label>${w ? `<button class="link" data-rdbgdel="${x.id}">Remove</button>` : ''}${artFrameBtn('raid:bg:' + x.id, 'screen', `${x.name} wallpaper`)}</div></div>`; }).join('')}</div></div>
    ${raidSetList().map(st => `<div class="sk-group"><b>${ctag(st.rarity)} ${esc(st.name)} set</b>${st.rarity === 5 ? ` <label class="tiny raid-home">Drops in <select class="input sm" data-rhome="${esc(st.set)}">${RAIDS.filter(x => x.kind === 'gear').map(x => `<option value="${x.id}" ${urHome(raidPieces(5).find(p => p.set === st.set) || {}) === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>` : ' <span class="tiny">· every gear raid</span>'}<div class="raid-ad">${raidPieces().filter(x => x.set === st.set).map(x => `<div class="raid-adit r${x.rarity}">
        <span class="raid-pc r${x.rarity}"><img src="${clothImg(x)}" alt=""></span>
        <input class="input" data-rnm="${esc(x.id)}" maxlength="30" value="${esc(x.name)}" aria-label="Piece name">
        <span class="tiny">${(WARD_SLOTS.find(s => s[0] === x.slot) || [])[1]}</span>
        <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${x.img ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rimg="${esc(x.id)}"></label>${x.img ? `<button class="link" data-rreset="${esc(x.id)}">Line art</button>` : ''}</div></div>`).join('')}</div></div>`).join('')}
    <p class="tiny">The pieces are normal Wardrobe clothes: anyone can wear them, and the Wardrobe tab shows them too.</p>
  </div>`;
  $('#raidBgUp').onchange = async ev => { try { if (await mediaSet('raid:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderRaidsTab(); toast('Raid wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = $('#raidBgDel'); if (del) del.onclick = async () => { await mediaDel('raid:bg'); renderRaidsTab(); };
  $('#raidOpen').onclick = () => { closeModal(); openRaids(); };
  p.querySelectorAll('[data-rhome]').forEach(sel => sel.onchange = () => { raidPieces(5).filter(x => x.set === sel.dataset.rhome).forEach(x => { x.dungeon = sel.value; }); persist(); toast('UR set moved to ' + raidOf(sel.value).name + '.'); });
  p.querySelectorAll('[data-rdbg]').forEach(i => i.onchange = async () => { try { if (await mediaSet('raid:bg:' + i.dataset.rdbg, await resizeImage(i.files[0], 1920, 'image/jpeg'))) { renderRaidsTab(); toast('Dungeon wallpaper saved.'); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-rdbgdel]').forEach(b => b.onclick = async () => { await mediaDel('raid:bg:' + b.dataset.rdbgdel); renderRaidsTab(); });
  p.querySelectorAll('[data-rnm]').forEach(i => i.onchange = () => { const x = S.clothes.find(c => c.id === i.dataset.rnm); x.name = i.value.trim() || x.name; persist(); });
  p.querySelectorAll('[data-rimg]').forEach(i => i.onchange = async () => {
    const x = S.clothes.find(c => c.id === i.dataset.rimg);
    try { if (await mediaSet('cloth:' + x.id, await resizeImage(i.files[0], 512))) { x.img = 'idb:cloth:' + x.id; persist(); renderRaidsTab(); toast('Design saved.'); } } catch (e) { toast(e.message, true); }
  });
  p.querySelectorAll('[data-rreset]').forEach(b => b.onclick = async () => { const x = S.clothes.find(c => c.id === b.dataset.rreset); await mediaDel('cloth:' + x.id); x.img = null; persist(); renderRaidsTab(); });
}
ICONS.raid = '<path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-5a3 3 0 0 1 6 0v5"/><path d="M3 21h18"/><path d="M12 4V2"/>';
ensureRaidSet();

ICONS.coin = '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M12 9.5v5"/>';
