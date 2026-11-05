/* ---------- pick-the-copy upgrades (memory stars, pet stars, UR clothing stars) ----------
   The fusion tabs list every copy as an inventory-style card (invCell). Tapping the copy you want to upgrade opens
   openUpgradePop: that copy on the left, slots for the copies it needs, the star change, and a grid of the copies you
   can use (only spare ones: copies with a character are never used up). Pick them, then Fuse. */
const invCell = ({ r, pic, under = '', cls = '', attrs = '', rt = true }) => `<button type="button" class="inv-cell r${r} ${cls}" ${attrs}><span class="inv-pic">${pic}${rt ? `<span class="inv-rt">${ctag(r)}</span>` : ''}</span><b>${under || '&nbsp;'}</b></button>`;
function openUpgradePop({ title, target, from, to, need = 1, cands, stars, onFuse, note }) {
  const max = Math.max(1, need);   // always `need` slots (memories 3, pets 6, capped by the stars left); fill as many as you have copies for
  const old = document.querySelector('.upop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop upop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
  let sel = [];
  const render = () => {
    el.innerHTML = `<div class="rdrop-box up-box">
      <div class="wdp-head"><h2 class="ts">${esc(title)}</h2><span class="tiny">${esc(target.name)}</span><button class="inv-x" data-upx aria-label="Close">${icon('close')}</button></div>
      <div class="up-row">
        <div class="up-col">${invCell({ ...target, under: stars(from), cls: 'up-big', attrs: 'tabindex="-1"' })}<small>Upgrade</small></div>
        <span class="up-sign">+</span>
        <div class="up-col"><div class="up-slots">${Array.from({ length: max }, (_, i) => { const c = sel[i] && cands.find(x => x.key === sel[i]);
          return `<span class="up-slot ${c ? 'full r' + c.r : ''}">${c ? c.pic : '<i>+</i>'}</span>`; }).join('')}</div><small>${max > 1 ? `Add up to ${max} copies` : 'Add 1 copy'}</small></div>
        <span class="up-sign arrow">${icon('back')}</span>
        <div class="up-col up-res">${stars(from + Math.max(1, sel.length) * (to - from))}<small>${from}★ → ${from + Math.max(1, sel.length) * (to - from)}★</small></div>
      </div>
      <span class="lbl-sm">Choose ${max > 1 ? `up to ${max} copies` : '1 copy'} to use · ${sel.length} / ${max}</span>
      ${cands.length ? `<div class="up-grid">${cands.map(c => invCell({ ...c, cls: sel.includes(c.key) ? 'on' : '', attrs: `data-upk="${esc(c.key)}" ${c.attrs || ''}` })).join('')}</div>`
        : '<div class="cs-pill">No spare copy you can use for this upgrade.</div>'}
      ${note ? `<p class="tiny">${note}</p>` : ''}
      <div class="row" style="justify-content:center;gap:10px"><button class="btn ghost" data-upx>Cancel</button><button class="btn gold" id="upGo" ${sel.length ? '' : 'disabled'}>${icon('fuse')}Fuse${sel.length > 1 ? ` ×${sel.length}` : ''}</button></div></div>`;
    el.querySelectorAll('[data-upx]').forEach(b => b.onclick = () => el.remove());
    el.querySelectorAll('[data-upk]').forEach(b => b.onclick = () => { const k = b.dataset.upk, i = sel.indexOf(k);
      if (i >= 0) sel.splice(i, 1); else if (sel.length < max) sel.push(k); else if (max === 1) sel = [k]; render(); });
    const go = el.querySelector('#upGo'); if (go) go.onclick = () => { if (!sel.length) return; el.remove(); onFuse(sel); };
  };
  render();
  el.addEventListener('click', e => { if (e.target === el) el.remove(); });
  document.body.appendChild(el);
}
const whoName = cid => cid ? esc((findEntry(cid) || {}).name || '') : '';

/* Memory Stars tab: every memory copy; fuse one chosen copy into the one you tapped */
/* a memory's square icon: its art cropped to fill the card (framing set in admin → Memories, m.iconPos {x, y, z}), inside the star frame */
const memIconPos = m => ({ x: 50, y: 30, z: 1, ...((m && m.iconPos) || {}) });
const memIconStyle = m => { const p = memIconPos(m); return `object-position:${p.x}% ${p.y}%;transform:scale(${p.z});transform-origin:${p.x}% ${p.y}%`; };
const memCellPic = (m, st) => `<span class="mem-fr mst${st} mem-sq">${artFrom(m.img) ? `<img src="${artFrom(m.img)}" alt="" style="${memIconStyle(m)}">` : icon('memory')}</span>`;
function renderMemStarFuse(root, tabs) {
  const all = (S.memories || []).filter(m => owns(m.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)).flatMap(m => memCopies(m.id).map((cp, i) => ({ ...cp, i, m })));
  root.innerHTML = `<div class="fu">${tabs}
    <p class="tiny">Tap the copy you want to upgrade, then choose another copy of the same memory to fuse into it: +1★ (0★ base, up to ${MEM_MAXST}★). Copies a character holds can be upgraded but are never used up. Hold a memory to view it.</p>
    ${all.length ? `<div class="up-list">${all.map(cp => invCell({ r: cp.m.rarity, pic: memCellPic(cp.m, cp.st), under: `${memStarRow(cp.st)}${cp.who ? `<span class="up-who">${whoName(cp.who)}</span>` : ''}`, cls: cp.st >= MEM_MAXST ? 'maxed' : '', attrs: `data-msup="${esc(cp.m.id)}|${cp.i}" data-memview="${esc(cp.m.id)}|${cp.st}"` })).join('')}</div>`
      : '<div class="cs-pill">You don\'t have any memories yet. Pull them on the Memory banner.</div>'}</div>`;
  bindFuseTabs(root);
  root.querySelectorAll('[data-msup]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.msup.split('|'); upMemCopy(id, +i); });
}
function upMemCopy(id, i) {
  const m = memOf(id), cps = memCopies(id), tgt = cps[i]; if (!m || !tgt) return;
  if (tgt.st >= MEM_MAXST) { toast(`This copy of ${m.name} is already at ${MEM_MAXST}★.`); return; }
  const cands = cps.map((c, j) => ({ ...c, j })).filter(c => c.j !== i && !c.who).map(c => ({ key: String(c.j), r: m.rarity, pic: memCellPic(m, c.st), under: memStarRow(c.st) }));
  openUpgradePop({ title: 'Memory stars', target: { r: m.rarity, pic: memCellPic(m, tgt.st), name: m.name + (tgt.who ? ` · with ${(findEntry(tgt.who) || {}).name}` : '') }, from: tgt.st, to: tgt.st + 1, need: Math.min(3, MEM_MAXST - tgt.st), cands,
    stars: st => memStarRow(st, 'big'), note: 'Each copy you add gives +1★ and is gone after fusing, whatever its stars.',
    onFuse: keys => { const cps2 = memCopies(id), t = cps2[i], feeds = keys.map(k => cps2[+k]).filter(f => f && !f.who); if (!t || !feeds.length) return;
      const arr = memCopiesSt(id), to = t.st + feeds.length; arr.splice(arr.indexOf(t.st), 1); feeds.forEach(f => arr.splice(arr.indexOf(f.st), 1)); arr.push(to); S.owned[id] -= feeds.length; S.memSt[id] = arr;
      if (t.who) { S.memEqSt = S.memEqSt || {}; S.memEqSt[t.who] = to; }
      persist(); refreshCharacters(); renderFuse(); if (typeof renderInventory === 'function') renderInventory(); toast(`${m.name} is now ${to}★${t.who ? ` (with ${(findEntry(t.who) || {}).name})` : ''}.`); } });
}

/* Pets tab: every pet copy; fuse a chosen copy into the one you tapped */
const petCellPic = p => `<img class="art" src="${mediaArt(p) || petWide(p)}" alt="">`;
function renderPetFuse(root, tabs) {
  const all = S.pool.filter(e => e.type === 'pet' && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name)).flatMap(p => petCopies(p.id).map((cp, i) => ({ ...cp, i, p })));
  root.innerHTML = `<div class="fu">${tabs}
    <p class="tiny">Tap the pet copy you want to upgrade, then choose another copy of the same pet to fuse into it: +1★ (up to ${MAX_STARS}★). Pets with a character can be upgraded but are never used up.</p>
    ${all.length ? `<div class="up-list">${all.map(cp => invCell({ r: cp.p.rarity, pic: `${petCellPic(cp.p)}<span class="inv-pst">${cp.st}★</span>`, under: `${starRow(cp.st, false)}${cp.who ? `<span class="up-who">${whoName(cp.who)}</span>` : ''}`, cls: cp.st >= MAX_STARS ? 'maxed' : '', attrs: `data-ptup="${esc(cp.p.id)}|${cp.i}"` })).join('')}</div>`
      : '<div class="cs-pill">You don\'t have any pets yet. Hatch eggs in the Hatchery.</div>'}</div>`;
  bindFuseTabs(root);
  root.querySelectorAll('[data-ptup]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.ptup.split('|'); upPetCopy(id, +i); });
}
function upPetCopy(id, i) {
  const p = findEntry(id), cps = petCopies(id), tgt = cps[i]; if (!p || !tgt) return;
  if (tgt.st >= MAX_STARS) { toast(`This ${p.name} is already at ${MAX_STARS}★.`); return; }
  const cands = cps.map((c, j) => ({ ...c, j })).filter(c => c.j !== i && !c.who).map(c => ({ key: String(c.j), r: p.rarity, pic: `${petCellPic(p)}<span class="inv-pst">${c.st}★</span>`, under: starRow(c.st, false) }));
  openUpgradePop({ title: 'Pet stars', target: { r: p.rarity, pic: petCellPic(p), name: p.name + (tgt.who ? ` · with ${(findEntry(tgt.who) || {}).name}` : '') }, from: tgt.st, to: tgt.st + 1, need: Math.min(6, MAX_STARS - tgt.st), cands,
    stars: st => starRow(st, false), note: 'Each copy you add gives +1★ and is gone after fusing, whatever its stars.',
    onFuse: keys => { const cps2 = petCopies(id), t = cps2[i], feeds = keys.map(k => cps2[+k]).filter(f => f && !f.who); if (!t || !feeds.length) return;
      const arr = petCopiesSt(id), to = t.st + feeds.length; arr[t.k] = to; petRemoveCopies(id, feeds.map(f => f.k));
      if (t.who) { S.petEqSt = S.petEqSt || {}; S.petEqSt[t.who] = to; }
      persist(); refreshCharacters(); renderFuse(); if (typeof renderPets === 'function') renderPets(); if (typeof renderInventory === 'function') renderInventory(); toast(`${p.name} is now ${to}★${t.who ? ` (with ${(findEntry(t.who) || {}).name})` : ''}.`); } });
}

/* UR Stars tab (clothes): every UR copy; a copy merges with another spare copy of the same piece at the same star */
function mergeClothCopy(id, k, tgt) {
  const c = cstarCounts(id); if (k >= CLOTH_MAXST || c[k] < 2) return false;
  const n = { 2: c[2], 3: c[3] }; if (k > 1) n[k] -= 2; n[k + 1] = (n[k + 1] || 0) + 1;
  S.cstars = S.cstars || {}; S.cstars[id] = n; S.owned[id] -= 1;
  if (tgt && tgt.who) { S.wearSt = S.wearSt || {}; S.wearSt[tgt.who] = { ...(S.wearSt[tgt.who] || {}), [tgt.slot]: k + 1 }; }
  return true;
}
function renderStarUp(root, tabs) {
  const all = S.clothes.filter(x => hasClothStars(x) && owns(x.id)).sort((a, b) => a.name.localeCompare(b.name)).flatMap(x => clothCopies(x.id).map((cp, i) => ({ ...cp, i, x })));
  root.innerHTML = `<div class="fu">${tabs}
    <p class="tiny">UR clothes have up to ${CLOTH_MAXST} stars (1★ base). Tap the copy you want to upgrade, then choose another spare copy of the <b>same piece at the same stars</b>: two 1★ make a 2★, two 2★ make a 3★. Worn copies can be upgraded but are never used up.</p>
    ${all.length ? `<div class="up-list">${all.map(cp => invCell({ r: 5, pic: `<img src="${clothImg(cp.x)}" alt="">`, under: `${clothStarRow(cp.star, 'sm')}${cp.who ? `<span class="up-who">${whoName(cp.who)}</span>` : ''}`, cls: cp.star >= CLOTH_MAXST ? 'maxed' : '', attrs: `data-clup="${esc(cp.x.id)}|${cp.i}" title="${esc(cp.x.name)}"` })).join('')}</div>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="mstAll" ${S.clothes.some(x => hasClothStars(x) && (spareAt(x.id, 1) >= 2 || spareAt(x.id, 2) >= 2)) ? '' : 'disabled'}>Merge everything possible</button></div>`
      : '<div class="cs-pill">You don\'t own any UR clothes yet.</div>'}</div>`;
  bindFuseTabs(root);
  root.querySelectorAll('[data-clup]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.clup.split('|'); upClothCopy(id, +i); });
  const allB = $('#mstAll'); if (allB) allB.onclick = () => { let n = 0; S.clothes.filter(hasClothStars).forEach(x => { while (mergeStar(x.id, 1)) n++; while (mergeStar(x.id, 2)) n++; }); persist(); refreshCharacters(); renderFuse(); toast(`${n} merge${n === 1 ? '' : 's'} done.`); };
}
function upClothCopy(id, i) {
  const x = clothOf(id), cps = clothCopies(id), tgt = cps[i]; if (!x || !tgt) return;
  if (tgt.star >= CLOTH_MAXST) { toast(`This ${x.name} is already at ${CLOTH_MAXST}★.`); return; }
  const cands = cps.map((c, j) => ({ ...c, j })).filter(c => c.j !== i && !c.who && c.star === tgt.star).map(c => ({ key: String(c.j), r: 5, pic: `<img src="${clothImg(x)}" alt="">`, under: clothStarRow(c.star, 'sm') }));
  openUpgradePop({ title: 'Clothing stars', target: { r: 5, pic: `<img src="${clothImg(x)}" alt="">`, name: x.name + (tgt.who ? ` · worn by ${(findEntry(tgt.who) || {}).name}` : '') }, from: tgt.star, to: tgt.star + 1, need: 1, cands,
    stars: st => clothStarRow(st, 'slot'), note: `Needs another spare ${x.name} at ${tgt.star}★.`,
    onFuse: () => { const t = clothCopies(id)[i]; if (!t || !mergeClothCopy(id, tgt.star, t)) { toast('That merge is no longer possible.'); return; }
      persist(); refreshCharacters(); renderFuse(); if (typeof renderInventory === 'function') renderInventory(); toast(`${x.name} is now ${tgt.star + 1}★${t.who ? ` (worn by ${(findEntry(t.who) || {}).name})` : ''}.`); } });
}
