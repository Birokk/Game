/* ---------- clothes fusion and pets on characters ----------
   Fusion: 3 clothes of one rarity → 1 random piece of the next rarity (R → SSR, SSR → UR). Only spare copies can go in
   (owned minus the ones being worn). Pieces go into a pot one at a time or all at once ("Add all"), and "Fuse ×N" turns
   every full set of 3 into a new piece; what's left over stays in the pot.
   Pets: each character can have one owned pet with them (S.petEq[charId] = petId); a pet is with one character at a time. */
ICONS.paw = '<circle cx="7" cy="9" r="2"/><circle cx="12" cy="6.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M12 12c-3 0-6 3-6 5.5S8 21 12 19c4 2 6 .5 6-1.5S15 12 12 12z"/>';
ICONS.fuse = '<path d="M5 5l5 5"/><path d="M19 5l-5 5"/><path d="M12 10v4"/><circle cx="12" cy="17" r="3"/><circle cx="4" cy="4" r="1.6"/><circle cx="20" cy="4" r="1.6"/>';
const FUSE_NEXT = { 3: 4, 4: 5 };
const spareOf = id => Math.max(0, (S.owned[id] || 0) - wearersOf(id).length);
let fuseR = 3, fusePot = [];   // the pot: cloth ids in the order they were added
function openFuse(r) {
  if (FUSE_NEXT[r] || ['star', 'mem', 'memst', 'pet'].includes(r)) fuseR = r;
  fusePot = [];
  openModal({ title: 'Fusion', ic: 'fuse', wide: true, kind: 'fuse', body: '<div id="fuRoot"></div>', onMount: renderFuse });
}
function renderFuse() {
  const root = $('#fuRoot'); if (!root) return;
  const tabs = fuseTabsHTML();
  if (fuseR === 'star') return renderStarUp(root, tabs);
  if (fuseR === 'pet') return renderPetFuse(root, tabs);
  if (fuseR === 'memst') return renderMemStarFuse(root, tabs);
  if (fuseR === 'mem') return renderMemFuse(root, tabs);
  const to = FUSE_NEXT[fuseR], inPot = id => fusePot.filter(x => x === id).length;
  const list = S.clothes.filter(x => +x.rarity === fuseR && spareOf(x.id) > 0).sort((a, b) => spareOf(b.id) - spareOf(a.id) || a.name.localeCompare(b.name));
  const targets = S.clothes.filter(x => +x.rarity === to), n = Math.floor(fusePot.length / 3);
  root.innerHTML = `<div class="fu">
    ${tabs}
    <div class="fu-pot">
      <div class="fu-slots">${[0, 1, 2].map(i => { const id = fusePot[fusePot.length - (fusePot.length % 3 || (fusePot.length ? 3 : 0)) + i], x = id && clothOf(id);
        return `<span class="fu-slot r${fuseR} ${x ? 'full' : ''}">${x ? `<img src="${clothImg(x)}" alt="">` : '<i>+</i>'}</span>`; }).join('')}
        <span class="fu-arrow">${icon('fuse')}</span><span class="fu-slot r${to} out"><b>?</b>${ctag(to)}</span></div>
      <div class="fu-count"><b>${fusePot.length}</b> in the pot · makes <b>${n}</b> ${CRN[to]} piece${n === 1 ? '' : 's'}${fusePot.length % 3 ? ` · ${3 - fusePot.length % 3} more for the next one` : ''}</div>
      <div class="row" style="justify-content:center;gap:8px"><button class="btn ghost sm" id="fuAll" ${list.some(x => spareOf(x.id) > inPot(x.id)) ? '' : 'disabled'}>Add all</button><button class="btn ghost sm" id="fuClear" ${fusePot.length ? '' : 'disabled'}>Clear</button>
        <button class="btn gold" id="fuGo" ${n && targets.length ? '' : 'disabled'}>${icon('fuse')}Fuse ×${n}</button></div>
      ${targets.length ? '' : `<p class="tiny" style="text-align:center">No ${CRN[to]} clothes exist yet, so there's nothing to fuse into.</p>`}
    </div>
    <span class="lbl-sm">Spare ${CRN[fuseR]} clothes · tap to add one, − to take one out (worn pieces don't count)</span>
    ${list.length ? `<div class="fu-list">${list.map(x => { const sp = spareOf(x.id), k = inPot(x.id);
      return `<div class="fu-it r${x.rarity} ${k ? 'on' : ''}"><button class="fu-add" data-fua="${esc(x.id)}" ${k >= sp ? 'disabled' : ''} aria-label="Add ${esc(x.name)}"><img src="${clothImg(x)}" alt="">${ctag(x.rarity)}<span class="fu-nm">${esc(x.name)}</span><span class="fu-n">${k}/${sp}</span></button>${k ? `<button class="fu-rm" data-fur-rm="${esc(x.id)}" aria-label="Take one out">−</button>` : ''}</div>`; }).join('')}</div>`
      : `<div class="cs-pill">No spare ${CRN[fuseR]} clothes. Clear raids to find more.</div>`}
  </div>`;
  bindFuseTabs(root);
  root.querySelectorAll('[data-fua]').forEach(b => b.onclick = () => { const id = b.dataset.fua; if (inPot(id) < spareOf(id)) fusePot.push(id); renderFuse(); });
  root.querySelectorAll('[data-fur-rm]').forEach(b => b.onclick = () => { const i = fusePot.lastIndexOf(b.dataset.furRm); if (i >= 0) fusePot.splice(i, 1); renderFuse(); });
  $('#fuAll').onclick = () => { list.forEach(x => { for (let k = inPot(x.id); k < spareOf(x.id); k++) fusePot.push(x.id); }); renderFuse(); };
  $('#fuClear').onclick = () => { fusePot = []; renderFuse(); };
  $('#fuGo').onclick = doFuse;
}
/* categories on the left (Wardrobe, Memories, Pets); the chosen category's tabs along the top */
const FU_CATS = [['wardrobe', 'wardrobe', 'Wardrobe', [[3, () => `${ctag(3)} → ${ctag(4)}`], [4, () => `${ctag(4)} → ${ctag(5)}`], ['star', () => `${ctag(5)} Stars`]]],
  ['memory', 'memory', 'Memories', [['mem', () => 'Exchange'], ['memst', () => 'Memory Stars']]], ['pets', 'paw', 'Pets', [['pet', () => 'Pet Stars']]]];
const fuseCat = () => FU_CATS.find(c => c[3].some(([k]) => k === fuseR)) || FU_CATS[0];
function fuseTabsHTML() {
  const cat = fuseCat();
  return `<nav class="tabs fu-cats" aria-label="Fusion categories">${FU_CATS.map(c => `<button class="tab ${c === cat ? 'on' : ''}" data-fucat="${c[0]}">${icon(c[1])}${c[2]}</button>`).join('')}</nav>
    <div class="tabs fu-subs">${cat[3].map(([k, l]) => `<button class="tab ${k === fuseR ? 'on' : ''}" data-fur="${k}">${l()}</button>`).join('')}</div>`;
}
function bindFuseTabs(root) {
  root.querySelectorAll('[data-fur]').forEach(b => b.onclick = () => { fuseR = ['star', 'mem', 'memst', 'pet'].includes(b.dataset.fur) ? b.dataset.fur : +b.dataset.fur; fusePot = []; renderFuse(); });
  root.querySelectorAll('[data-fucat]').forEach(b => b.onclick = () => { const c = FU_CATS.find(x => x[0] === b.dataset.fucat); fuseR = c[3][0][0]; fusePot = []; renderFuse(); });
}
function doFuse() {
  const to = FUSE_NEXT[fuseR], targets = S.clothes.filter(x => +x.rarity === to), n = Math.floor(fusePot.length / 3);
  if (!n || !targets.length) return;
  const used = fusePot.splice(0, n * 3);
  if (used.some(id => spareOf(id) < used.filter(x => x === id).length)) { fusePot = []; renderFuse(); toast('Some of those pieces are no longer spare. Try again.'); return; }
  used.forEach(id => { S.owned[id] = (S.owned[id] || 0) - 1; });
  const got = Array.from({ length: n }, () => { const x = pick(targets), isNew = !S.owned[x.id]; S.owned[x.id] = (S.owned[x.id] || 0) + 1; return { x, isNew }; });
  persist(); refreshCharacters(); renderFuse(); if (typeof raidEl !== 'undefined' && raidEl) renderRaids();
  showFuseResults(got, used.length);
}
function showFuseResults(got, spent) {
  const old = document.querySelector('.rdrop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Fusion results');
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">Fusion results</h2>
      <div class="rdrop-grid">${got.map((d, i) => `<div class="rdrop-it r${d.x.rarity}" style="--i:${i}"><span class="rdrop-glow"></span><img src="${clothImg(d.x)}" alt="">${d.isNew ? '<span class="rdrop-new">NEW</span>' : ''}<span class="rdrop-r">${ctag(d.x.rarity)}</span><b>${esc(d.x.name)}</b></div>`).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn gold" id="fuDone">Done</button></div>
      <p class="tiny">${spent} pieces fused into ${got.length}. Wear them from any character's Wardrobe tab.</p></div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('#fuDone').onclick = close;
}

/* pets with characters */
/* every pet copy is separate (like clothes): S.petEq[charId] = petId and S.petEqSt[charId] = the stars of the copy it holds.
   petCopies(id) lists the copies (highest stars first) with who holds each; a holder whose copy is gone is sent away. */
const petEqStar = cid => ((S.petEqSt || {})[cid]) || 0;
function petCopies(id) {
  const st = petCopiesSt(id), ids = petUids(id);
  const out = st.map((v, k) => ({ id, st: v, k, uid: ids[k], gr: petGradeU(ids[k]), who: null })).sort((x, y) => y.st - x.st || y.gr - x.gr);
  const holders = Object.keys(S.petEq || {}).filter(cid => S.petEq[cid] === id && owns(cid));
  S.petEqU = S.petEqU || {};
  holders.sort((x, y) => petEqStar(y) - petEqStar(x)).forEach(cid => {
    const c = out.find(x => !x.who && x.uid === S.petEqU[cid]) || out.find(x => !x.who && x.st === petEqStar(cid)) || out.find(x => !x.who);
    if (c) { c.who = cid; S.petEqU[cid] = c.uid; if (c.st !== petEqStar(cid)) { S.petEqSt = S.petEqSt || {}; S.petEqSt[cid] = c.st; } } else { delete S.petEq[cid]; }
  });
  return out;
}
const petEqOf = cid => { const id = (S.petEq || {})[cid], p = id && findEntry(id); return p && p.type === 'pet' && owns(p.id) && petCopies(p.id).some(x => x.who === cid) ? p : null; };
/* fuse two copies of the same pet: the best copy below max stars gets +1★, the lowest spare copy is used up */
function petFusePlan(id) {
  const cps = petCopies(id), tgt = cps.filter(c => c.st < MAX_STARS).sort((a, b) => b.st - a.st || !!b.who - !!a.who)[0];
  const feed = tgt && cps.filter(c => c !== tgt && !c.who).sort((a, b) => a.st - b.st)[0];
  return tgt && feed ? { tgt, feed } : null;
}
function fusePet(id) {
  const p = findEntry(id), plan = petFusePlan(id); if (!p || !plan) return;
  const arr = petCopiesSt(id); arr[plan.tgt.k] = plan.tgt.st + 1; petRemoveCopies(id, [plan.feed.k]);   // the upgraded copy keeps its identity (and grade)
  if (plan.tgt.who) { S.petEqSt = S.petEqSt || {}; S.petEqSt[plan.tgt.who] = plan.tgt.st + 1; }
  persist(); refreshCharacters(); renderFuse(); if (typeof renderPets === 'function') renderPets();
  toast(`${p.name} is now ${plan.tgt.st + 1}★${plan.tgt.who ? ` (with ${(findEntry(plan.tgt.who) || {}).name})` : ''}.`);
}
/* a square picture of a drawn pet (for pets without uploaded art; pet splash arts are 1254×1254) */
const petWideCache = new Map();
function petWide(p) {
  const key = JSON.stringify(p.look) + '|' + p.rarity; if (petWideCache.has(key)) return petWideCache.get(key);
  const W = 400, H = 400, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H);
  if (+p.rarity === 5) { bg.addColorStop(0, 'rgba(168,85,247,.65)'); bg.addColorStop(.55, 'rgba(255,110,199,.3)'); bg.addColorStop(1, '#141d3c'); }
  else { bg.addColorStop(0, 'rgba(255,170,80,.5)'); bg.addColorStop(1, '#141d3c'); }
  g.fillStyle = '#141d3c'; g.fillRect(0, 0, W, H); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const gl = g.createRadialGradient(200, 240, 10, 200, 240, 200); gl.addColorStop(0, 'rgba(255,255,255,.32)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.7)'; [[50, 50, 2], [350, 40, 1.6], [360, 160, 2.2], [36, 200, 1.4], [330, 300, 1.6], [70, 320, 1.2]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); });
  drawPet(g, 200, 372, p.look || {}, { s: 5.4 });
  const url = c.toDataURL('image/png'); petWideCache.set(key, url); return url;
}
function petCard(p, st = 0, noStars) {
  const art = mediaArt(p);
  return `<span class="pt-art"><img src="${art || petWide(p)}" alt=""></span>${rtag(p.rarity)}<span class="pt-nm"><b>${esc(p.name)}</b>${noStars ? '' : `<span class="pt-st">${starRow(st, false)}</span>`}</span>`;
}
/* splash art picker for a pet, like the character's Skins carousel: base, then the 3★ / 6★ arts (locked until those stars) */
function petArtPicker(p) {
  const opts = ASC.filter(a => a.k === 'base' || artFrom(p[a.k])); if (opts.length < 2) return '';
  const cur = artKey(p);
  return `<div class="lbl-sm">Splash art</div><div class="pt-arts">${opts.map(a => { const open = ascOpen(p, a), src = a.k === 'base' ? (artFrom(p.art) || petWide(p)) : artFrom(p[a.k]);
    return `<button class="pt-artc ${cur === a.k ? 'on' : ''} ${open ? '' : 'bw'}" data-ptart="${a.k}" data-ptid="${esc(p.id)}" ${open ? '' : `data-lock="${a.stars}"`}><img src="${src}" alt=""><span>${a.k === 'base' ? 'Base' : a.label}</span>${cur === a.k ? `<span class="skc-on">${icon('check')}</span>` : ''}${open ? '' : `<span class="skc-lock">${icon('lock')}</span>`}</button>`; }).join('')}</div>`;
}
function petTabHTML(c) {
  const eq = petEqOf(c.id), n = S.pool.filter(e => e.type === 'pet' && owns(e.id)).reduce((t, p) => t + (S.owned[p.id] || 0), 0);
  return `<div class="lbl-sm">Pet · ${eq ? '1' : '0'}/1 with ${esc(c.name)}</div>
    <button class="pt-slot ${eq ? 'full r' + eq.rarity : ''}" id="petSlot" aria-label="Choose a pet">${eq ? petCard(eq, petEqStar(c.id)) + pgBadge(petEqGrade(c.id)) : `<span class="mem-empty">${icon('paw')}<span class="tiny">Tap to choose a pet</span></span>`}</button>
    ${eq ? petArtPicker(eq) : ''}
    <div class="row" style="gap:8px">${eq ? '<button class="btn ghost sm" id="petOff">Send the pet away</button>' : ''}<button class="btn ghost sm" id="petFuse">${icon('fuse')}Fuse pets</button></div>
    <p class="tiny">${n ? `You have ${n} pet${n === 1 ? '' : 's'}. ` : ''}Tap the slot to pick one. Each copy can be with one character at a time; fuse two copies of the same pet for a star.</p>`;
}
/* see-through picker: every owned pet copy as its own card; copies with someone else can't be picked */
function openPetPick(c) {
  const old = document.querySelector('.wdpick'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop wdpick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Pets');
  const render = () => {
    const list = S.pool.filter(e => e.type === 'pet' && owns(e.id)).flatMap(p => petCopies(p.id).map(cp => ({ ...cp, p })))
      .sort((a, b) => (a.who === c.id ? -1 : b.who === c.id ? 1 : 0) || !!a.who - !!b.who || b.p.rarity - a.p.rarity || b.st - a.st || a.p.name.localeCompare(b.p.name));
    el.innerHTML = `<div class="rdrop-box wdp-box"><div class="wdp-head"><h2 class="ts">Pet</h2><span class="tiny">${list.length} pet${list.length === 1 ? '' : 's'} · tap one to bring it along</span><button class="inv-x" data-wdpx aria-label="Close">${icon('close')}</button></div>
      ${list.length ? `<div class="pt-list wdp-pets">${list.map((cp, i) => { const mine = cp.who === c.id, busy = cp.who && !mine;
        return `<button class="pt-card r${cp.p.rarity} ${pet6(cp.st, cp.p.rarity)} ${mine ? 'on' : ''} ${busy ? 'busy' : ''}" data-pp="${i}" ${busy ? 'disabled' : ''}>${petCard(cp.p, cp.st)}${pgBadge(cp.gr)}${mine ? `<span class="skc-on">${icon('check')}</span>` : ''}${busy ? `<span class="wd-worn">With ${esc((findEntry(cp.who) || {}).name || '')}</span>` : ''}</button>`; }).join('')}</div>`
        : '<div class="cs-pill">You don\'t have any pets yet. Hatch eggs in the Hatchery.</div>'}
      <div class="row" style="justify-content:center;gap:10px">${petEqOf(c.id) ? '<button class="btn ghost" data-ppoff>Send the pet away</button>' : ''}<button class="btn gold" data-wdpx>Done</button></div></div>`;
    el.querySelectorAll('[data-wdpx]').forEach(b => b.onclick = () => el.remove());
    const off = el.querySelector('[data-ppoff]'); if (off) off.onclick = () => { delete S.petEq[c.id]; persist(); renderCharacters(); render(); };
    el.querySelectorAll('[data-pp]').forEach(b => b.onclick = () => {
      const cp = list[+b.dataset.pp]; if (!cp || (cp.who && cp.who !== c.id)) return;
      S.petEq = S.petEq || {}; S.petEqSt = S.petEqSt || {};
      if (cp.who === c.id) { delete S.petEq[c.id]; toast(`${cp.p.name} went back to the Hatchery.`); }
      else { S.petEq[c.id] = cp.p.id; S.petEqSt[c.id] = cp.st; S.petEqU = S.petEqU || {}; S.petEqU[c.id] = cp.uid; toast(`${cp.p.name} (${cp.st}★) is now with ${c.name}.`); }
      persist(); renderCharacters(); render();
    });
  };
  render();
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}
function bindPetTab(c) {
  const sl = $('#petSlot'); if (sl) sl.onclick = () => openPetPick(c);
  const pf = $('#petFuse'); if (pf) pf.onclick = () => openFuse('pet');
  csEl.querySelectorAll('[data-ptart]').forEach(b => b.onclick = () => {
    const p = findEntry(b.dataset.ptid); if (!p) return;
    if (b.dataset.lock) { toast(`This splash art unlocks at ${b.dataset.lock} stars. ${p.name} has ${starsOf(p.id)}.`); return; }
    S.artPick[p.id] = b.dataset.ptart; persist(); renderCharacters(); toast(`${p.name} now shows the ${b.dataset.ptart === 'base' ? 'base' : ASC.find(a => a.k === b.dataset.ptart).label} splash art.`);
  });
  const off = $('#petOff'); if (off) off.onclick = () => { delete S.petEq[c.id]; persist(); renderCharacters(); };
}

/* ---------- clothing stars (UR pieces only): 1★ base, two 1★ → one 2★, two 2★ → one 3★ ----------
   S.owned[id] stays the total number of copies; S.cstars[id] = { 2: n, 3: n } counts the starred ones (the rest are 1★).
   The star of each worn copy is kept in S.wearSt[charId][slot]; wearing a piece takes its best spare copy. */
const CLOTH_MAXST = 3, RAID_STAR2 = .015;   // raids: 1.5% of drops are a 2★ UR piece
const hasClothStars = x => !!x && +x.rarity === 5;
function cstarCounts(id) {
  const c = (S.cstars || {})[id] || {}, tot = S.owned[id] || 0;
  let n3 = Math.min(c[3] || 0, tot), n2 = Math.min(c[2] || 0, tot - n3);
  return { 1: Math.max(0, tot - n2 - n3), 2: n2, 3: n3 };
}
function wornStars(id, except) {
  const out = { 1: 0, 2: 0, 3: 0 };
  Object.keys(S.wear || {}).forEach(cid => { if (cid === except) return; Object.entries(S.wear[cid] || {}).forEach(([slot, x]) => { if (x === id) out[clamp(((S.wearSt || {})[cid] || {})[slot] || 1, 1, 3)]++; }); });
  return out;
}
const spareAt = (id, k, except) => cstarCounts(id)[k] - wornStars(id, except)[k];
const bestSpareStar = (id, except) => [3, 2, 1].find(k => spareAt(id, k, except) > 0) || 0;
const bestOwnedStar = id => { const c = cstarCounts(id); return c[3] ? 3 : c[2] ? 2 : c[1] ? 1 : 0; };
const wornStarOf = (cid, slot) => ((S.wearSt || {})[cid] || {})[slot] || 1;
/* add one copy of a piece at a given star */
function addCloth(id, k = 1) { S.owned[id] = (S.owned[id] || 0) + 1; if (k > 1) { S.cstars = S.cstars || {}; const c = S.cstars[id] = S.cstars[id] || {}; c[k] = (c[k] || 0) + 1; } }
/* merge two spare copies at star k into one at k + 1 */
function mergeStar(id, k) {
  if (k >= CLOTH_MAXST || spareAt(id, k) < 2) return false;
  S.cstars = S.cstars || {}; const c = S.cstars[id] = { ...cstarCounts(id) }; delete c[1];
  if (k > 1) c[k] -= 2; c[k + 1] = (c[k + 1] || 0) + 1; S.owned[id] -= 1;
  return true;
}
const clothStarRow = (n, cls = '') => n ? `<span class="cl-stars ${cls}">${Array.from({ length: CLOTH_MAXST }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>` : '';
/* the star-up tab of the fusion window */
/* ---------- auto-equip: highest rarity per slot, preferring the set with the most available pieces ---------- */
function autoEquip(c) {
  const avail = x => clothFits(x, c) && (S.owned[x.id] || 0) - wearersOf(x.id).filter(id => id !== c.id).length > 0;
  const pool = S.clothes.filter(avail);
  if (!pool.length) { toast('No clothes available to wear.'); return; }
  const setCount = {}; pool.forEach(x => { if (x.set) { const s = setCount[x.set] = setCount[x.set] || new Set(); s.add(x.slot); } });
  // the main set: highest rarity, then most available pieces, then most stars; its pieces win over loose pieces of the same rarity, even 3★ ones
  const sets = Object.keys(setCount).map(id => { const ps = pool.filter(x => x.set === id); return { id, r: Math.max(...ps.map(x => +x.rarity)), n: setCount[id].size, st: ps.reduce((t, x) => t + bestSpareStar(x.id, c.id), 0) }; })
    .sort((a, b) => b.r - a.r || b.n - a.n || b.st - a.st);
  const main = sets[0] && sets[0].id;
  const W = {}, St = {};
  WARD_SLOTS.forEach(([slot]) => {
    const best = pool.filter(x => x.slot === slot).sort((a, b) => b.rarity - a.rarity || ((b.set === main) - (a.set === main)) || ((setCount[b.set] || { size: 0 }).size - (setCount[a.set] || { size: 0 }).size) || bestSpareStar(b.id, c.id) - bestSpareStar(a.id, c.id) || a.name.localeCompare(b.name))[0];
    if (best) { W[slot] = best.id; St[slot] = hasClothStars(best) ? (bestSpareStar(best.id, c.id) || 1) : 1; }
  });
  S.wear[c.id] = W; S.wearSt = S.wearSt || {}; S.wearSt[c.id] = St;
  persist(); renderCharacters(); toast(`${c.name} is wearing the best available clothes (${Object.keys(W).length}/${WARD_SLOTS.length}).`);
}
/* memories: one character at a time */
const memHolders = (id, except) => Object.keys(S.memEq || {}).filter(cid => cid !== except && owns(cid) && (S.memEq[cid] || []).includes(id));
/* a memory is "held" only when every owned copy is with someone else */
const memHolder = (id, except) => { const h = memHolders(id, except); return h.length >= (S.owned[id] || 0) ? h[0] || null : null; };
/* every owned copy of a memory, one entry each: [{ id, st, who }] (st = its stars 0–3, who = character holding that copy).
   Stars live in S.memSt[memId] = [stars per copy] (synced with S.owned like pets); a holder's copy is S.memEqSt[charId]. */
function memCopiesSt(id) {
  S.memSt = S.memSt || {};
  const a = S.memSt[id] || [], n = S.owned[id] || 0;
  while (a.length < n) a.push(0);
  if (a.length > n) { a.sort((x, y) => y - x); a.length = n; }
  S.memSt[id] = a; return a;
}
const memEqStar = cid => ((S.memEqSt || {})[cid]) || 0;
function memCopies(id) {
  const out = memCopiesSt(id).slice().sort((a, b) => b - a).map(st => ({ id, st, who: null }));
  memHolders(id).sort((a, b) => memEqStar(b) - memEqStar(a)).forEach(cid => {
    const c = out.find(x => !x.who && x.st === memEqStar(cid)) || out.find(x => !x.who);
    if (c) { c.who = cid; if (c.st !== memEqStar(cid)) { S.memEqSt = S.memEqSt || {}; S.memEqSt[cid] = c.st; } }
  });
  return out;
}
/* memory stars: fuse 1 copy into another of the same memory → +1★ (0★ base, up to 3★); the lowest spare copy is used up */
function memFusePlan(id) {
  const cps = memCopies(id), tgt = cps.filter(c => c.st < MEM_MAXST).sort((a, b) => b.st - a.st || !!b.who - !!a.who)[0];
  const feed = tgt && cps.filter(c => c !== tgt && !c.who).sort((a, b) => a.st - b.st)[0];
  return tgt && feed ? { tgt, feed } : null;
}
function fuseMemStar(id) {
  const m = memOf(id), plan = memFusePlan(id); if (!m || !plan) return;
  const arr = memCopiesSt(id); arr.splice(arr.indexOf(plan.tgt.st), 1); arr.splice(arr.indexOf(plan.feed.st), 1); arr.push(plan.tgt.st + 1);
  S.owned[id] -= 1; S.memSt[id] = arr;
  if (plan.tgt.who) { S.memEqSt = S.memEqSt || {}; S.memEqSt[plan.tgt.who] = plan.tgt.st + 1; }
  persist(); refreshCharacters(); renderFuse();
  toast(`${m.name} is now ${plan.tgt.st + 1}★${plan.tgt.who ? ` (with ${(findEntry(plan.tgt.who) || {}).name})` : ''}.`);
}
/* the see-through picker that opens from the Memory slot */
function openMemPick(c) {
  const old = document.querySelector('.wdpick'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop wdpick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Memories');
  const render = () => {
    const E = memEqOf(c.id), cur = E[0];
    const list = (S.memories || []).filter(m => (!m.char || m.char === c.id) && owns(m.id)).flatMap(m => memCopies(m.id).map(cp => ({ ...cp, m })))
      .sort((a, b) => b.m.rarity - a.m.rarity || a.m.name.localeCompare(b.m.name) || (a.who === c.id ? -1 : b.who === c.id ? 1 : 0) || (!!a.who - !!b.who));
    el.innerHTML = `<div class="rdrop-box wdp-box"><div class="wdp-head"><h2 class="ts">Memory</h2><span class="tiny">${list.length} memor${list.length === 1 ? 'y' : 'ies'} in your inventory · tap one to equip it</span><button class="inv-x" data-wdpx aria-label="Close">${icon('close')}</button></div>
      ${list.length ? `<div class="up-list wdp-cells">${list.map((cp, i) => { const mine = cp.who === c.id, busy = cp.who && !mine;
        return invCell({ r: cp.m.rarity, pic: `${memCellPic(cp.m, cp.st)}${mine ? `<span class="skc-on">${icon('check')}</span>` : ''}`, under: `${memStarRow(cp.st)}${mine ? '<span class="up-who">Equipped</span>' : busy ? `<span class="up-who">${whoName(cp.who)}</span>` : ''}`,
          cls: `${mine ? 'on' : ''} ${busy ? 'busy' : ''}`, attrs: `data-mp="${i}" data-memview="${esc(cp.m.id)}|${cp.st}" ${busy ? 'disabled' : ''} title="${esc(cp.m.name)}${busy ? ` · equipped by ${whoName(cp.who)}` : ''}"` }); }).join('')}</div>`
        : '<div class="cs-pill">You don\'t have any memories yet. Pull them on the Memory banner.</div>'}
      <div class="row" style="justify-content:center;gap:10px">${cur ? '<button class="btn ghost" data-mpoff>Remove memory</button>' : ''}<button class="btn gold" data-wdpx>Done</button></div></div>`;
    el.querySelectorAll('[data-wdpx]').forEach(b => b.onclick = () => el.remove());
    const off = el.querySelector('[data-mpoff]'); if (off) off.onclick = () => { S.memEq[c.id] = [null]; persist(); renderCharacters(); render(); };
    el.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => {
      const cp = list[+b.dataset.mp]; if (!cp || (cp.who && cp.who !== c.id)) return;
      if (cp.who === c.id) { S.memEq[c.id] = [null]; toast(`Removed ${cp.m.name}.`); }
      else { S.memEq[c.id] = [cp.m.id]; S.memEqSt = S.memEqSt || {}; S.memEqSt[c.id] = cp.st; toast(`${c.name} now holds ${cp.m.name} (${cp.st}★).`); }
      persist(); renderCharacters(); render();
    });
  };
  render();
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

/* ---------- clothes as individual copies (never stacked in the wardrobe picker or the inventory) ----------
   clothCopies(id) → [{ id, star, who (charId wearing it or null), slot }] built from S.owned / S.cstars / S.wear / S.wearSt */
function clothCopies(id) {
  const x = clothOf(id); if (!x) return [];
  const counts = hasClothStars(x) ? cstarCounts(id) : { 1: S.owned[id] || 0, 2: 0, 3: 0 }, out = [];
  const worn = { 1: [], 2: [], 3: [] };
  Object.keys(S.wear || {}).forEach(cid => Object.entries(S.wear[cid] || {}).forEach(([slot, w]) => { if (w === id) worn[hasClothStars(x) ? clamp(wornStarOf(cid, slot), 1, 3) : 1].push({ cid, slot }); }));
  [3, 2, 1].forEach(k => { for (let i = 0; i < counts[k]; i++) { const w = worn[k][i]; out.push({ id, star: hasClothStars(x) ? k : 0, who: w ? w.cid : null, slot: w ? w.slot : null }); } });
  return out;
}
/* every copy of every owned piece for one slot, best first */
const slotCopies = (c, slot) => S.clothes.filter(x => x.slot === slot && clothFits(x, c) && owns(x.id)).flatMap(x => clothCopies(x.id).map(cp => ({ ...cp, x })))
  .sort((a, b) => b.x.rarity - a.x.rarity || b.star - a.star || a.x.name.localeCompare(b.x.name) || (a.who === c.id ? -1 : b.who === c.id ? 1 : 0) || (!!a.who - !!b.who));
/* the see-through picker that opens when a wardrobe slot is tapped */
function openWardPick(c, slot) {
  const old = document.querySelector('.wdpick'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop wdpick'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', `${WARD_NAME[slot]} pieces`);
  const render = () => {
    const list = slotCopies(c, slot), cur = wearOf(c.id)[slot];
    el.innerHTML = `<div class="rdrop-box wdp-box"><div class="wdp-head"><h2 class="ts">${esc(WARD_NAME[slot])}</h2><span class="tiny">${list.length} piece${list.length === 1 ? '' : 's'} in your inventory · tap one to wear it</span><button class="inv-x" data-wdpx aria-label="Close">${icon('close')}</button></div>
      ${list.length ? `<div class="wdp-grid">${list.map((cp, i) => { const mine = cp.who === c.id, busy = cp.who && !mine, who = busy ? (findEntry(cp.who) || {}).name || '' : '';
        return `<button class="wdp-it r${cp.x.rarity} ${mine ? 'on' : ''} ${busy ? 'busy' : ''}" data-wdp="${i}" ${busy ? 'disabled' : ''}><span class="rdrop-glow"></span><img src="${clothImg(cp.x)}" alt="">${ctag(cp.x.rarity)}${cp.star ? clothStarRow(cp.star, 'item') : ''}<b>${esc(cp.x.name)}</b>${mine ? `<span class="skc-on">${icon('check')}</span>` : ''}${busy ? `<span class="wd-worn">Worn by ${esc(who)}</span>` : ''}</button>`; }).join('')}</div>`
        : `<div class="cs-pill">You don't have any ${esc(WARD_NAME[slot].toLowerCase())} pieces yet. Clear raids or fuse clothes to find some.</div>`}
      <div class="row" style="justify-content:center;gap:10px">${cur ? `<button class="btn ghost" data-wdpoff>Take off</button>` : ''}<button class="btn gold" data-wdpx>Done</button></div></div>`;
    el.querySelectorAll('[data-wdpx]').forEach(b => b.onclick = () => el.remove());
    const off = el.querySelector('[data-wdpoff]'); if (off) off.onclick = () => { const W = { ...wearOf(c.id) }; delete W[slot]; S.wear[c.id] = W; if ((S.wearSt || {})[c.id]) delete S.wearSt[c.id][slot]; persist(); renderCharacters(); render(); };
    el.querySelectorAll('[data-wdp]').forEach(b => b.onclick = () => {
      const cp = list[+b.dataset.wdp]; if (!cp || (cp.who && cp.who !== c.id)) return;
      const W = { ...wearOf(c.id) }; S.wearSt = S.wearSt || {}; S.wearSt[c.id] = { ...(S.wearSt[c.id] || {}) };
      if (cp.who === c.id && cp.slot === slot) { delete W[slot]; delete S.wearSt[c.id][slot]; toast(`${c.name} took off ${cp.x.name}.`); }
      else {
        const k = cp.star || 1;
        if (hasClothStars(cp.x) && spareAt(cp.x.id, k, c.id) < 1) { toast('That copy is already worn.'); return; }
        W[slot] = cp.x.id; S.wearSt[c.id][slot] = k; toast(`${c.name} put on ${cp.x.name}${cp.star ? ` (${cp.star}★)` : ''}.`);
      }
      S.wear[c.id] = W; persist(); renderCharacters(); render();
    });
  };
  render();
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}

/* the drawn pet alone on a transparent background (hatch reveal for pets without art) */
const petCutCache = new Map();
function petCut(p) {
  const key = JSON.stringify(p.look); if (petCutCache.has(key)) return petCutCache.get(key);
  const c = document.createElement('canvas'); c.width = 400; c.height = 400;
  drawPet(c.getContext('2d'), 200, 372, p.look || {}, { s: 5.4 });
  const url = c.toDataURL('image/png'); petCutCache.set(key, url); return url;
}

/* ---------- memory exchange: 3 spare memories of one rarity → 1 random UR memory ---------- */
let memFuseR = 4, memPot = [];   // 3 SSR → 1 random SSR, 3 UR → 1 random UR
const memSpare = id => Math.max(0, (S.owned[id] || 0) - Object.keys(S.memEq || {}).filter(cid => owns(cid) && (S.memEq[cid] || []).includes(id)).length);
function renderMemFuse(root, tabs) {
  const inPot = id => memPot.filter(x => x === id).length, urs = (S.memories || []).filter(m => +m.rarity === memFuseR);
  const list = (S.memories || []).filter(m => +m.rarity === memFuseR && memSpare(m.id) > 0), n = Math.floor(memPot.length / 3);
  root.innerHTML = `<div class="fu">${tabs}
    <div class="tabs fu-subs fu-mini">${[4, 5].map(r => `<button class="tab ${memFuseR === r ? 'on' : ''}" data-mfr="${r}">3 × ${ctag(r)} → 1 × ${ctag(r)}</button>`).join('')}</div>
    <p class="tiny">Exchange 3 spare memories of the same rarity for 1 random memory of that rarity from every memory in the game. Equipped copies are never used.</p>
    <div class="fu-pot"><div class="fu-count"><b>${memPot.length}</b> in the pot · makes <b>${n}</b> ${CRN[memFuseR]} memor${n === 1 ? 'y' : 'ies'}${memPot.length % 3 ? ` · ${3 - memPot.length % 3} more for the next one` : ''}</div>
      <div class="row" style="justify-content:center;gap:8px"><button class="btn ghost sm" id="mfAll" ${list.some(m => memSpare(m.id) > inPot(m.id)) ? '' : 'disabled'}>Add all</button><button class="btn ghost sm" id="mfClear" ${memPot.length ? '' : 'disabled'}>Clear</button>
        <button class="btn gold" id="mfGo" ${n && urs.length ? '' : 'disabled'}>${icon('fuse')}Exchange ×${n}</button></div>
      ${urs.length ? '' : `<p class="tiny" style="text-align:center">No ${CRN[memFuseR]} memories exist yet.</p>`}</div>
    ${list.length ? `<div class="mem-list">${list.map(m => { const k = inPot(m.id), sp = memSpare(m.id), art = artFrom(m.img);
      return `<div class="fu-it"><button class="mem-card r${m.rarity} ${k ? 'on' : ''}" data-mfa="${esc(m.id)}" ${k >= sp ? 'disabled' : ''}>${art ? `<img src="${art}" alt="">` : `<span class="wd-ph">${icon('memory')}</span>`}${rtag(m.rarity)}<span class="fu-n">${k}/${sp}</span><span class="mem-nm">${esc(m.name)}</span></button>${k ? `<button class="fu-rm" data-mfr-rm="${esc(m.id)}" aria-label="Take one out">−</button>` : ''}</div>`; }).join('')}</div>`
      : `<div class="cs-pill">No spare ${CRN[memFuseR]} memories.</div>`}</div>`;
  bindFuseTabs(root);
  root.querySelectorAll('[data-mfr]').forEach(b => b.onclick = () => { memFuseR = +b.dataset.mfr; memPot = []; renderFuse(); });
  root.querySelectorAll('[data-mfa]').forEach(b => b.onclick = () => { const id = b.dataset.mfa; if (inPot(id) < memSpare(id)) memPot.push(id); renderFuse(); });
  root.querySelectorAll('[data-mfr-rm]').forEach(b => b.onclick = () => { const i = memPot.lastIndexOf(b.dataset.mfrRm); if (i >= 0) memPot.splice(i, 1); renderFuse(); });
  $('#mfAll').onclick = () => { list.forEach(m => { for (let k = inPot(m.id); k < memSpare(m.id); k++) memPot.push(m.id); }); renderFuse(); };
  $('#mfClear').onclick = () => { memPot = []; renderFuse(); };
  $('#mfGo').onclick = () => {
    const k = Math.floor(memPot.length / 3); if (!k || !urs.length) return;
    const used = memPot.splice(0, k * 3);
    if (used.some(id => memSpare(id) < used.filter(x => x === id).length)) { memPot = []; renderFuse(); toast('Some of those memories are no longer spare.'); return; }
    used.forEach(id => { S.owned[id] -= 1; if (!S.owned[id]) delete S.owned[id]; });
    const results = Array.from({ length: k }, () => { const m = pick(urs), isNew = !S.owned[m.id]; S.owned[m.id] = (S.owned[m.id] || 0) + 1; return { kind: 'entry', id: m.id, rarity: +m.rarity, isNew, starUp: 0, maxed: !isNew }; });
    persist(); refreshCharacters(); renderFuse();
    showPull(results, k, 'memories', { preview: true, exchange: true, direct: true });   // the summon reveal, nothing else is spent or added
  };
}
