/* ---------- pets: egg fragments → eggs → incubators → hatch ---------- */
const EGG = {
  ssr: { name: 'SSR egg', r: 4, mins: 240, frag: 10 },    // 4 hours
  ur: { name: 'UR egg', r: 5, mins: 1440, frag: 10 }      // 24 hours
};
const EGG_STAMINA = 20, INCUBATORS = 3, INC_BUY = [15, 30];   // 3 free incubators, 2 more for 15 and 30 pearls (a 6th is shown as "To be updated")
/* the egg picture: the drawn egg, or the admin's icon (Settings → Admin → SSR / UR egg icon, media keys icon:eggssr / icon:eggur) */
const eggHTML = (r, cls = '') => { const c = customIcon('egg' + r); return c ? `<span class="egg ${r} ${cls} custom"><img src="${c}" alt=""></span>` : `<span class="egg ${r} ${cls}"><i></i></span>`; };
const incBought = () => clamp(S.pets.incN || 0, 0, INC_BUY.length);
function syncIncubators() { const n = INCUBATORS + incBought(); while (S.pets.inc.length < n) S.pets.inc.push(null); }
function buyIncubator() {
  const k = incBought(); if (k >= INC_BUY.length) return;
  const cost = INC_BUY[k];
  if (S.wallet.pearls < cost) { toast(`This incubator costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= cost; S.pets.incN = k + 1; syncIncubators(); persist(); renderMenu(); renderPets(); toast(`Incubator ${INCUBATORS + k + 1} unlocked.`);
}
const petsOf = r => S.pool.filter(e => e.type === 'pet' && e.rarity === EGG[r].r);
/* instant hatch: 1 pearl per 2 minutes left, at least 2 */
const hatchCost = inc => Math.max(2, Math.ceil((inc.ends - Date.now()) / 12e4));
const fmtLeft = ms => { const m = Math.ceil(ms / 6e4); return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`; };
/* duplicate rules shared by summons and hatching: first copy 0 stars, +1 star per copy up to 6, then pearls */
/* skins can also be bought outright */
const SKIN_PRICE = 60;
/* black-and-white preview of a character's MR wedding skin, shown in full once you own it */
function previewMR(c) {
  const k = mrSkinOf(c); if (!k) return;
  const got = owns(k.id), art = artFrom(k.getArt) || artFrom(k.art);
  const el = document.createElement('div'); el.className = `mrp ${got ? 'got' : ''}`;
  el.innerHTML = `${art ? `<img class="cs-blur" src="${art}" alt="">` : ''}<img class="mrp-art ${art ? '' : 'chibi'}" src="${art || getSplash(k)}" alt="${esc(k.name)}"><div class="mrp-shade"></div>
    <div class="mrp-info"><span class="sg-kick">${curIcon('rings')} Wedding outfit</span><b>${esc(k.name)}</b>${rtag(6, 'lg')}<span class="tiny">${got ? 'You own this outfit.' : `Preview. Reach bond level ${BOND_MAX} with ${esc(c.name)} and marry them with a ring to unlock it.`}</span></div>
    <div class="rv-hint">Tap to close</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.onclick = () => el.remove(), 300);
}
const buyable = e => e && e.type === 'skin' && e.rarity !== 6;
function buySkin(id) {
  const e = findEntry(id); if (!e || e.type !== 'skin' || owns(id)) return;
  if (!buyable(e)) { toast(`${e.name} can't be bought. Marry ${(findEntry(e.parent) || {}).name || 'the character'} to unlock it.`); return; }
  if (S.wallet.pearls < SKIN_PRICE) { toast(`${e.name} costs ${SKIN_PRICE} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= SKIN_PRICE; S.owned[id] = 1; persist(); renderMenu(); refreshSummon(); refreshCharacters();
  if ($('#colRoot')) renderDetail(id, 'skin');
  showSkinGet(e);
}
/* duplicates never give pearls: they add stars up to 6; past that, summons give Corals for characters (maxed = the copy added nothing) */
function grantEntry(item) {
  const prev = S.owned[item.id] || 0; S.owned[item.id] = prev + 1;
  const starUp = hasStars(item) && prev && prev - 1 < MAX_STARS ? prev : 0, maxed = !!prev && !starUp;
  return { isNew: !prev, starUp, pearls: 0, maxed };
}

let petTab = 'hatch', petTimer = null;
function openPets(tab) {
  petTab = tab || 'hatch';
  openModal({ title: 'Pets', ic: 'heart', wide: true, kind: 'pets', body: '<div id="petRoot"></div>', onMount: () => {
    renderPets();
    clearInterval(petTimer);
    petTimer = setInterval(() => { if (!modalEl || modalEl.dataset.kind !== 'pets') return clearInterval(petTimer); tickPets(); }, 1000);
  } });
}
function tickPets() {
  S.pets.inc.forEach((inc, i) => {
    if (!inc) return;
    const left = inc.ends - Date.now(), t = $('#incT' + i), b = $('#incB' + i), c = $('#incC' + i);
    if (left <= 0 && !inc.shown) { inc.shown = true; renderPets(); return; }
    if (t) t.textContent = fmtLeft(left);
    if (b) b.style.width = `${100 - left / (inc.ends - inc.start) * 100}%`;
    if (c) c.textContent = hatchCost(inc);
  });
}
function renderPets() {
  const root = $('#petRoot'); if (!root) return;
  syncIncubators();
  const P = S.pets, pets = S.pool.filter(e => e.type === 'pet').sort((a, b) => owns(b.id) - owns(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  const tabs = `<div class="tabs" style="margin:0">${[['hatch', 'Hatchery'], ['mine', `My pets <span>${pets.filter(e => owns(e.id)).length}/${pets.length}</span>`]].map(([k, l]) => `<button class="tab ${petTab === k ? 'on' : ''}" data-ptab="${k}">${l}</button>`).join('')}</div>`;
  if (petTab === 'mine') {
    root.innerHTML = `<div class="stack">${tabs}${pets.length ? `<div class="cards">${pets.map(cardHTML).join('')}</div>` : '<div class="empty">No pets yet. Add some in the admin panel.</div>'}</div>`;
  } else {
    const free = P.inc.indexOf(null);
    root.innerHTML = `<div class="stack">${tabs}
      <div class="pet-inv">
        ${['ssr', 'ur'].map(r => `<div class="frag-row r${EGG[r].r}">${curIcon('frag' + r)}
          <div style="display:grid;gap:4px;flex:1;min-width:0"><b>${EGG[r].name} fragments</b><span class="bar"><i style="width:${Math.min(100, P.frags[r] / EGG[r].frag * 100)}%"></i></span><span class="tiny">${P.frags[r]} / ${EGG[r].frag} · combine into an egg</span></div>
          <button class="btn sm ${P.frags[r] >= EGG[r].frag ? 'gold' : 'ghost'}" data-craft="${r}" ${P.frags[r] >= EGG[r].frag ? '' : 'disabled'}>Combine</button></div>`).join('')}
        <div class="egg-bag"><span class="lbl-sm">Your eggs</span><div class="row">${['ssr', 'ur'].map(r => { const n = P.eggs.filter(x => x === r).length;
          return `<div class="egg-count r${EGG[r].r}">${eggHTML(r, 'sm')}<span><b>${EGG[r].name}</b><span class="tiny">×${n} · hatches in ${fmtLeft(EGG[r].mins * 6e4)}</span></span>
            <button class="btn sm mint" data-place="${r}" ${n && free >= 0 ? '' : 'disabled'}>Incubate</button></div>`; }).join('')}</div></div>
      </div>
      <div><div class="ad-head" style="margin:0 0 8px"><h3>Incubators</h3><span class="tiny">Eggs hatch over time, or right away with pearls</span></div>
      <div class="incs">${P.inc.map((inc, i) => {
        if (!inc) return `<div class="inc empty"><span class="inc-glass"></span><span class="tiny">Empty incubator</span></div>`;
        const left = inc.ends - Date.now(), ready = left <= 0;
        return `<div class="inc r${EGG[inc.r].r} ${ready ? 'ready' : ''}"><span class="inc-glass">${eggHTML(inc.r, ready ? 'shake' : 'idle')}</span>
          <b>${EGG[inc.r].name}</b>
          ${ready ? `<button class="btn gold" data-hatch="${i}">${icon('sparkle')}Hatch!</button>`
            : `<span class="bar"><i id="incB${i}" style="width:${100 - left / (inc.ends - inc.start) * 100}%"></i></span><span class="tiny">${icon('clock').replace('class="ic"', 'class="ic" style="width:12px;height:12px;vertical-align:-2px"')} <span id="incT${i}">${fmtLeft(left)}</span> left</span>
              <button class="btn sm ghost" data-now="${i}">Hatch now · <span class="cost">${curIcon('pearls')}<span id="incC${i}">${hatchCost(inc)}</span></span></button>`}</div>`;
      }).join('')}${INC_BUY.map((cost, k) => k < incBought() ? '' : k === incBought()
          ? `<div class="inc locked buy"><span class="inc-glass">${icon('lock')}</span><b>Incubator ${INCUBATORS + k + 1}</b><button class="btn gold sm" data-incbuy>Unlock · ${costHTML(cost)}</button></div>`
          : `<div class="inc locked"><span class="inc-glass">${icon('lock')}</span><b>Incubator ${INCUBATORS + k + 1}</b><span class="tiny">Unlock incubator ${INCUBATORS + k} first · ${cost} pearls</span></div>`).join('')}
        <div class="inc locked soon"><span class="inc-glass">${icon('lock')}</span><b>Incubator ${INCUBATORS + INC_BUY.length + 1}</b><span class="tiny">To be updated</span></div></div></div>
      <p class="tiny">Fragments drop from summons in place of some gold coins. Eggs also appear around the plaza: walk into one to catch it for ${EGG_STAMINA} stamina.</p>
    </div>`;
  }
  root.querySelectorAll('[data-ptab]').forEach(b => b.onclick = () => { petTab = b.dataset.ptab; renderPets(); });
  root.querySelectorAll('[data-card]').forEach(b => b.onclick = () => { openCollection('pet'); renderDetail(b.dataset.card, 'pet'); });
  root.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => {
    const r = b.dataset.craft; P.frags[r] -= EGG[r].frag; P.eggs.push(r); persist(); renderPets(); renderMenu(); toast(`Combined ${EGG[r].frag} fragments into a ${EGG[r].name}.`);
  });
  root.querySelectorAll('[data-place]').forEach(b => b.onclick = () => {
    const r = b.dataset.place, slot = P.inc.indexOf(null);
    if (!petsOf(r).length) { toast(`There are no ${RNAME[EGG[r].r]} pets yet. Add one in the admin panel first.`); return; }
    if (slot < 0) return;
    P.eggs.splice(P.eggs.indexOf(r), 1);
    const now = Date.now(); P.inc[slot] = { r, start: now, ends: now + EGG[r].mins * 6e4 };
    persist(); renderPets(); renderMenu();
  });
  root.querySelectorAll('[data-now]').forEach(b => b.onclick = () => {
    const i = +b.dataset.now, inc = P.inc[i], cost = hatchCost(inc);
    if (S.wallet.pearls < cost) { toast(`You need ${cost} pearls to hatch this now and have ${fmt(S.wallet.pearls)}.`); return; }
    S.wallet.pearls -= cost; hatch(i);
  });
  root.querySelectorAll('[data-hatch]').forEach(b => b.onclick = () => hatch(+b.dataset.hatch));
  const ib = root.querySelector('[data-incbuy]'); if (ib) ib.onclick = buyIncubator;
}
function hatch(i) {
  const inc = S.pets.inc[i], list = petsOf(inc.r); if (!list.length) return;
  const item = rpick(list), res = grantEntry(item);
  S.pets.inc[i] = null; gainExp(EXP.hatch); persist(); renderMenu(); renderPets(); refreshCharacters();
  showHatch(inc.r, item, res);
}
/* hatch reveal: pitch dark, lights rising from the ground in the rarity colour, the egg wobbles and cracks, the pet appears in the middle */
function showHatch(r, item, res) {
  const el = document.createElement('div'); el.className = `hatch r${item.rarity}`;
  const sparks = Array.from({ length: 42 }, () => `<i style="--x:${(Math.random() * 100).toFixed(1)}%;--d:${(Math.random() * 3).toFixed(2)}s;--t:${(2.4 + Math.random() * 2.4).toFixed(2)}s;--s:${(2 + Math.random() * 4).toFixed(1)}px;--h:${Math.floor(Math.random() * 360)}"></i>`).join('');
  const beams = Array.from({ length: 7 }, (_, i) => `<b style="--x:${(8 + i * 13 + Math.random() * 6).toFixed(1)}%;--d:${(Math.random() * 3).toFixed(2)}s;--w:${(30 + Math.random() * 50).toFixed(0)}px"></b>`).join('');
  el.innerHTML = `<div class="hatch-ground"></div><div class="hatch-beams">${beams}</div><div class="hatch-sparks">${sparks}</div>${eggHTML(r, 'big crack')}<div class="hatch-flash"></div>
    <div class="hatch-pet"><img src="${mediaArt(item) || petCut(item)}" alt="${esc(item.name)}"></div>
    <div class="hatch-info"><div class="eyebrow" style="color:rgba(255,255,255,.75)">${esc(PET_KINDS[(item.look || {}).kind] || 'Pet')}</div><div class="rv-name">${esc(item.name)}</div>${rtag(item.rarity, 'xl')}
      ${res.isNew ? '<span class="rv-badge">New pet</span>' : res.starUp ? `<div class="rv-up">${starRow(res.starUp, res.starUp - 1)}<span>Star ${res.starUp} of ${MAX_STARS}</span></div>` : `<div class="rv-up">${starRow(MAX_STARS)}<span>Max stars · already owned</span></div>`}</div>
    <div class="rv-hint">Tap to continue</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.onclick = () => el.remove(), 1600);
}
