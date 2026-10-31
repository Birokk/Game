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
  if (FUSE_NEXT[r]) fuseR = r;
  fusePot = [];
  openModal({ title: 'Clothes fusion', ic: 'fuse', wide: true, kind: 'fuse', body: '<div id="fuRoot"></div>', onMount: renderFuse });
}
function renderFuse() {
  const root = $('#fuRoot'); if (!root) return;
  const to = FUSE_NEXT[fuseR], inPot = id => fusePot.filter(x => x === id).length;
  const list = S.clothes.filter(x => +x.rarity === fuseR && spareOf(x.id) > 0).sort((a, b) => spareOf(b.id) - spareOf(a.id) || a.name.localeCompare(b.name));
  const targets = S.clothes.filter(x => +x.rarity === to), n = Math.floor(fusePot.length / 3);
  root.innerHTML = `<div class="fu">
    <div class="tabs" style="margin:0">${Object.entries(FUSE_NEXT).map(([f, t]) => `<button class="tab ${+f === fuseR ? 'on' : ''}" data-fur="${f}">${ctag(+f)} → ${ctag(t)}</button>`).join('')}</div>
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
  root.querySelectorAll('[data-fur]').forEach(b => b.onclick = () => { fuseR = +b.dataset.fur; fusePot = []; renderFuse(); });
  root.querySelectorAll('[data-fua]').forEach(b => b.onclick = () => { const id = b.dataset.fua; if (inPot(id) < spareOf(id)) fusePot.push(id); renderFuse(); });
  root.querySelectorAll('[data-fur-rm]').forEach(b => b.onclick = () => { const i = fusePot.lastIndexOf(b.dataset.furRm); if (i >= 0) fusePot.splice(i, 1); renderFuse(); });
  $('#fuAll').onclick = () => { list.forEach(x => { for (let k = inPot(x.id); k < spareOf(x.id); k++) fusePot.push(x.id); }); renderFuse(); };
  $('#fuClear').onclick = () => { fusePot = []; renderFuse(); };
  $('#fuGo').onclick = doFuse;
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
const petEqOf = cid => { const id = (S.petEq || {})[cid], p = id && findEntry(id); return p && p.type === 'pet' && owns(p.id) ? p : null; };
const petOwner = pid => Object.keys(S.petEq || {}).find(cid => S.petEq[cid] === pid && owns(cid)) || null;
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
function petCard(p, cls = '') {
  const art = mediaArt(p);
  return `<span class="pt-art"><img src="${art || petWide(p)}" alt=""></span>${rtag(p.rarity)}<span class="pt-nm"><b>${esc(p.name)}</b>${hasStars(p) ? `<span class="pt-st">${starRow(starsOf(p.id), false, p)}</span>` : ''}</span>`;
}
/* splash art picker for a pet, like the character's Skins carousel: base, then the 3★ / 6★ arts (locked until those stars) */
function petArtPicker(p) {
  const opts = ASC.filter(a => a.k === 'base' || artFrom(p[a.k])); if (opts.length < 2) return '';
  const cur = artKey(p);
  return `<div class="lbl-sm">Splash art</div><div class="pt-arts">${opts.map(a => { const open = ascOpen(p, a), src = a.k === 'base' ? (artFrom(p.art) || petWide(p)) : artFrom(p[a.k]);
    return `<button class="pt-artc ${cur === a.k ? 'on' : ''} ${open ? '' : 'bw'}" data-ptart="${a.k}" data-ptid="${esc(p.id)}" ${open ? '' : `data-lock="${a.stars}"`}><img src="${src}" alt=""><span>${a.k === 'base' ? 'Base' : a.label}</span>${cur === a.k ? `<span class="skc-on">${icon('check')}</span>` : ''}${open ? '' : `<span class="skc-lock">${icon('lock')}</span>`}</button>`; }).join('')}</div>`;
}
function petTabHTML(c) {
  const eq = petEqOf(c.id), pets = S.pool.filter(e => e.type === 'pet' && owns(e.id)).sort((a, b) => b.rarity - a.rarity || starsOf(b.id) - starsOf(a.id) || a.name.localeCompare(b.name));
  return `<div class="lbl-sm">Pet · ${eq ? '1' : '0'}/1 with ${esc(c.name)}</div>
    <div class="pt-slot ${eq ? 'full r' + eq.rarity : ''}">${eq ? petCard(eq) : `<span class="mem-empty">${icon('paw')}<span class="tiny">No pet yet</span></span>`}</div>
    ${eq ? petArtPicker(eq) : ''}
    <div class="lbl-sm">Your pets · ${pets.length}</div>
    ${pets.length ? `<div class="pt-list">${pets.map(p => { const who = petOwner(p.id), here = who === c.id, busy = who && !here;
      return `<button class="pt-card r${p.rarity} ${here ? 'on' : ''} ${busy ? 'busy' : ''}" data-pet="${esc(p.id)}">${petCard(p)}${here ? `<span class="skc-on">${icon('check')}</span>` : ''}${busy ? `<span class="wd-worn">With ${esc((findEntry(who) || {}).name || '')}</span>` : ''}</button>`; }).join('')}</div>`
      : `<div class="cs-pill">You don't have any pets yet. <button class="link" data-open="pets">Hatch eggs in the Hatchery</button></div>`}
    ${eq ? '<button class="btn ghost sm" id="petOff">Send the pet away</button>' : ''}
    <p class="tiny">Each character can have one pet with them, and a pet stays with one character at a time. Tap a pet to bring it along, tap it again to send it away.</p>`;
}
function bindPetTab(c) {
  csEl.querySelectorAll('[data-pet]').forEach(b => b.onclick = () => {
    const p = findEntry(b.dataset.pet); if (!p || !owns(p.id)) return;
    S.petEq = S.petEq || {};
    const who = petOwner(p.id);
    if (who === c.id) { delete S.petEq[c.id]; toast(`${p.name} went back to the Hatchery.`); }
    else if (who) { toast(`${p.name} is with ${(findEntry(who) || {}).name}. Send it away from them first.`); return; }
    else { S.petEq[c.id] = p.id; toast(`${p.name} is now with ${c.name}.`); }
    persist(); renderCharacters();
  });
  csEl.querySelectorAll('[data-ptart]').forEach(b => b.onclick = () => {
    const p = findEntry(b.dataset.ptid); if (!p) return;
    if (b.dataset.lock) { toast(`This splash art unlocks at ${b.dataset.lock} stars. ${p.name} has ${starsOf(p.id)}.`); return; }
    S.artPick[p.id] = b.dataset.ptart; persist(); renderCharacters(); toast(`${p.name} now shows the ${b.dataset.ptart === 'base' ? 'base' : ASC.find(a => a.k === b.dataset.ptart).label} splash art.`);
  });
  const off = $('#petOff'); if (off) off.onclick = () => { delete S.petEq[c.id]; persist(); renderCharacters(); };
}
