/* ---------- Raids: dungeons that cost stamina and drop Wardrobe clothes ----------
   One dungeon for now. Each clear costs RAID_STAMINA and gives 1 clothing piece, or 2 with RAID_DOUBLE chance, from three sets (R, SSR, UR):
   UR 4%, SSR 10%, R the rest. The sets are ordinary Wardrobe clothes (S.clothes, flag raid + set) so the admin edits
   their pictures in admin → Raids or Wardrobe; without a picture each piece shows white line art for its slot.
   No summon animation: the drops pop up in a see-through results window. */
const RAID_STAMINA = 20, RAID_DOUBLE = .33, RAID_RATES = { 5: .04, 4: .10 };
const CRN = { 3: 'R', 4: 'SSR', 5: 'UR' };
const RAID_SETS = [
  { set: 'r', rarity: 3, name: "Wanderer's", pieces: { hat: 'Hood', top: 'Tunic', pants: 'Trousers', shoes: 'Boots', acc: 'Charm', hand: 'Gloves' } },
  { set: 'ssr', rarity: 4, name: 'Ember Guard', pieces: { hat: 'Helm', top: 'Coat', pants: 'Greaves', shoes: 'Sabatons', acc: 'Amulet', hand: 'Gauntlets' } },
  { set: 'ur', rarity: 5, name: 'Starlit Regalia', pieces: { hat: 'Crown', top: 'Robe', pants: 'Skirt', shoes: 'Slippers', acc: 'Pendant', hand: 'Scepter' } }
];
const RAIDS = [{ id: 'ruins', name: 'Whispering Ruins', desc: 'Old stone halls beneath the forest, guarded by restless spirits. Every clear leaves behind pieces of forgotten outfits.', diff: 'Normal' }];
/* make sure the three raid sets exist in the wardrobe (pieces the admin already edited are kept as they are) */
function ensureRaidSet() {
  S.clothes = Array.isArray(S.clothes) ? S.clothes : [];
  RAID_SETS.forEach(st => WARD_SLOTS.forEach(([slot]) => {
    const id = `raid-${st.set}-${slot}`;
    if (!S.clothes.some(x => x.id === id)) S.clothes.push({ id, name: `${st.name} ${st.pieces[slot]}`, slot, rarity: st.rarity, char: null, img: null, raid: true, set: st.set });
  }));
}
const raidPieces = r => (S.clothes || []).filter(x => x.raid && (r == null || x.rarity === r));
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
function rollRaidPiece() {
  const x = Math.random(), r = x < RAID_RATES[5] ? 5 : x < RAID_RATES[5] + RAID_RATES[4] ? 4 : 3;
  const list = raidPieces(r); return list.length ? rpick(list) : null;
}
function clearRaid(times) {
  const cost = RAID_STAMINA * times;
  if (stamina() < cost) { toast(`This needs ${cost} stamina. You have ${stamina()}.`); openStamina(); return; }
  spendStamina(cost);
  const drops = [];
  let n = 0; for (let t = 0; t < times; t++) n += Math.random() < RAID_DOUBLE ? 2 : 1;
  for (let i = 0; i < n; i++) { const x = rollRaidPiece(); if (!x) continue; const isNew = !owns(x.id); S.owned[x.id] = (S.owned[x.id] || 0) + 1; drops.push({ x, isNew }); }
  drops.sort((a, b) => b.x.rarity - a.x.rarity);
  gainExp(EXP.raid * times); persist(); renderMenu(); renderRaids();
  showRaidDrops(drops, times);
}
/* results: a see-through window over the raid screen with every piece on a soft glow, rarity badge, NEW tag */
function showRaidDrops(drops, times) {
  const old = document.querySelector('.rdrop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Raid rewards');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Clear rewards${times > 1 ? ` ×${times}` : ''}</h2>
      <div class="rdrop-grid">${drops.map((d, i) => `<div class="rdrop-it r${d.x.rarity}" style="--i:${i}"><span class="rdrop-glow"></span><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<span class="rdrop-new">NEW</span>' : ''}<span class="rdrop-r">${ctag(d.x.rarity, 'lg')}</span><b>${esc(d.x.name)}</b></div>`).join('') || '<p class="tiny">Nothing dropped.</p>'}</div>
      <div class="row" style="justify-content:center;gap:12px"><button class="btn gold" id="rdAgain">Clear again ${curIcon('stamina')}${RAID_STAMINA * times}</button><button class="btn ghost" id="rdDone">Done</button></div>
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
function closeRaids() { if (raidEl) { raidEl.remove(); raidEl = null; } const d = document.querySelector('.rdrop'); if (d) d.remove(); renderMenu(); }
function renderRaids() {
  if (!raidEl) return;
  const d = RAIDS.find(x => x.id === raidSel) || RAIDS[0], bg = MEDIA.get('raid:bg');
  const pct = r => r === 3 ? Math.round((1 - RAID_RATES[5] - RAID_RATES[4]) * 100) : Math.round(RAID_RATES[r] * 100);
  raidEl.innerHTML = `<div class="evp-bg ${bg ? '' : 'none raid-none'}">${bg ? `<img src="${bg}" alt="">` : ''}</div><div class="evp-shade"></div>
    <div class="evp-head"><span class="inv-badge">${icon('raid')}</span><h2 class="ts">Raids</h2></div>
    <div class="raid-top"><div class="cur" id="raidStam">${curIcon('stamina')}<b>${stamina()}/${STAMINA_MAX}</b><button class="plus" id="raidPlus" aria-label="Refill stamina">${icon('plus')}</button></div><button class="inv-x" id="raidClose" aria-label="Close">${icon('close')}</button></div>
    <aside class="evp-side"><span class="evp-pill">${icon('raid')}Dungeons</span>
      <div class="evp-list">${RAIDS.map(x => `<button class="evp-item ${x.id === d.id ? 'on' : ''}" data-raid="${x.id}"><span class="evp-ic">${icon('raid')}</span><b>${esc(x.name)}</b></button>`).join('')}</div></aside>
    <section class="evp-main raid-main">
      <h1 class="evp-title">${esc(d.name)}</h1>
      <span class="evp-time">${icon('bolt')}${RAID_STAMINA} stamina per clear · 1–2 drops</span>
      <p class="evp-sub raid-desc">${esc(d.desc)}</p>
      <div class="raid-drops"><span class="lbl-sm">Possible drops</span>
        ${[5, 4, 3].map(r => `<div class="raid-row r${r}"><span class="raid-rate">${ctag(r)}<b>${pct(r)}%</b></span><div class="raid-pieces">${raidPieces(r).map(x => `<span class="raid-pc r${r} ${owns(x.id) ? '' : 'bw'}" title="${esc(x.name)}${owns(x.id) ? ` · owned ×${S.owned[x.id]}` : ''}"><img src="${clothImg(x)}" alt="">${owns(x.id) ? `<i>${S.owned[x.id]}</i>` : ''}</span>`).join('')}</div></div>`).join('')}
      </div>
      <div class="raid-go"><button class="btn gold" data-clear="1">Clear ×1 ${curIcon('stamina')}${RAID_STAMINA}</button><button class="btn mint" data-clear="5">Clear ×5 ${curIcon('stamina')}${RAID_STAMINA * 5}</button><button class="btn ghost" id="raidFuse">${icon('fuse')}Fuse clothes</button></div>
    </section>`;
  raidEl.querySelector('#raidClose').onclick = closeRaids;
  raidEl.querySelector('#raidPlus').onclick = openStamina;
  raidEl.querySelectorAll('[data-raid]').forEach(b => b.onclick = () => { raidSel = b.dataset.raid; renderRaids(); });
  raidEl.querySelectorAll('[data-clear]').forEach(b => b.onclick = () => clearRaid(+b.dataset.clear));
  $('#raidFuse').onclick = () => openFuse(3);
}
setInterval(() => { const s = raidEl && raidEl.querySelector('#raidStam b'); if (s) s.textContent = `${stamina()}/${STAMINA_MAX}`; }, 5000);

/* admin → Raids: the dungeon wallpaper and the design of every raid piece */
function renderRaidsTab() {
  const p = $('#adPanel'); if (!p) return; ensureRaidSet();
  const bg = MEDIA.get('raid:bg');
  p.innerHTML = `<div class="stack">
    <div><h3>Raids</h3><p class="tiny">${esc(RAIDS[0].name)}: ${RAID_STAMINA} stamina per clear, 1 drop per clear (2 drops ${Math.round(RAID_DOUBLE * 100)}% of the time). Drop chances: UR ${RAID_RATES[5] * 100}%, SSR ${RAID_RATES[4] * 100}%, R ${Math.round((1 - RAID_RATES[5] - RAID_RATES[4]) * 100)}%.</p></div>
    <div class="row"><div class="ev-adprev" style="width:220px">${bg ? `<img src="${bg}" alt="">` : '<span class="tiny">No wallpaper</span>'}</div>
      <div class="stack" style="gap:8px"><b>Raid screen wallpaper</b><span class="tiny">1920×1080 works best.</span><div class="row"><label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="raidBgUp"></label>${bg ? '<button class="btn ghost sm" id="raidBgDel">Remove</button>' : ''}<button class="btn ghost sm" id="raidOpen">Open Raids</button></div></div></div>
    ${RAID_SETS.map(st => `<div class="sk-group"><b>${ctag(st.rarity)} ${esc(st.name)} set</b><div class="raid-ad">${raidPieces(st.rarity).filter(x => x.set === st.set).map(x => `<div class="raid-adit r${x.rarity}">
        <span class="raid-pc r${x.rarity}"><img src="${clothImg(x)}" alt=""></span>
        <input class="input" data-rnm="${esc(x.id)}" maxlength="30" value="${esc(x.name)}" aria-label="Piece name">
        <span class="tiny">${(WARD_SLOTS.find(s => s[0] === x.slot) || [])[1]}</span>
        <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${x.img ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-rimg="${esc(x.id)}"></label>${x.img ? `<button class="link" data-rreset="${esc(x.id)}">Line art</button>` : ''}</div></div>`).join('')}</div></div>`).join('')}
    <p class="tiny">The pieces are normal Wardrobe clothes: anyone can wear them, and the Wardrobe tab shows them too.</p>
  </div>`;
  $('#raidBgUp').onchange = async ev => { try { if (await mediaSet('raid:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg'))) { renderRaidsTab(); toast('Raid wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = $('#raidBgDel'); if (del) del.onclick = async () => { await mediaDel('raid:bg'); renderRaidsTab(); };
  $('#raidOpen').onclick = () => { closeModal(); openRaids(); };
  p.querySelectorAll('[data-rnm]').forEach(i => i.onchange = () => { const x = S.clothes.find(c => c.id === i.dataset.rnm); x.name = i.value.trim() || x.name; persist(); });
  p.querySelectorAll('[data-rimg]').forEach(i => i.onchange = async () => {
    const x = S.clothes.find(c => c.id === i.dataset.rimg);
    try { if (await mediaSet('cloth:' + x.id, await resizeImage(i.files[0], 512))) { x.img = 'idb:cloth:' + x.id; persist(); renderRaidsTab(); toast('Design saved.'); } } catch (e) { toast(e.message, true); }
  });
  p.querySelectorAll('[data-rreset]').forEach(b => b.onclick = async () => { const x = S.clothes.find(c => c.id === b.dataset.rreset); await mediaDel('cloth:' + x.id); x.img = null; persist(); renderRaidsTab(); });
}
ICONS.raid = '<path d="M5 21V10l7-6 7 6v11"/><path d="M9 21v-5a3 3 0 0 1 6 0v5"/><path d="M3 21h18"/><path d="M12 4V2"/>';
ensureRaidSet();
