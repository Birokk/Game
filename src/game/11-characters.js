/* ---------- character screen (full screen: roster, splash art, Home / Bond / Character info) ---------- */
let wdSlot = 'hat', memSlot = 0;
let csEl = null, csId = null, csTab = 'home', csSkin = null, csView = false, csSkins = false;
const charList = () => S.pool.filter(e => e.type === 'character' && owns(e.id)).sort((a, b) => !!b.mc - !!a.mc || b.rarity - a.rarity || a.name.localeCompare(b.name));
const skinsOf = id => S.pool.filter(e => e.type === 'skin' && e.parent === id);
function openCharacters(id) {
  const list = charList();
  if (!list.length) { toast("You don't own any characters yet. Summon on a banner to get your first one."); return; }
  csId = id && owns(id) ? id : csId && owns(csId) ? csId : list[0].id;
  csTab = 'home'; csSkin = null; csView = false; csSkins = false;
  closeModal(); closeCharacters();
  csEl = document.createElement('div'); csEl.className = 'cs'; csEl.setAttribute('role', 'dialog'); csEl.setAttribute('aria-label', 'Characters');
  document.body.appendChild(csEl);
  csEl.addEventListener('click', e => { if (csView) { e.stopPropagation(); csView = false; csEl.classList.remove('viewing'); } }, true);
  renderCharacters();
}
/* skins carousel: cards scroll sideways; the one in the middle is shown full screen behind the menu.
   Cards: the default (base art), the 3★ / 6★ splash arts if uploaded, then every skin. Card ids: entry id, or "<charId>@art3". */
function outfitCards(c) {
  const eq = equippedOf(c), pick = artKey(c), base = artFrom(c.art);
  const cards = [{ id: c.id, kind: 'base', name: 'Default', rarity: c.rarity, art: base, card: base || portrait(c.look || S.player.look, c.rarity), own: owns(c.id), on: !eq && pick === 'base' }];
  for (const a of ASC.slice(1)) {
    const art = artFrom(c[a.k]); if (!art) continue;
    cards.push({ id: `${c.id}@${a.k}`, kind: a.k, stars: a.stars, name: `${a.label} art`, rarity: c.rarity, art, card: art, own: ascOpen(c, a), on: !eq && pick === a.k });
  }
  for (const k of skinsOf(c.id)) cards.push({ id: k.id, kind: 'skin', entry: k, name: k.name.replace(c.name + ' · ', ''), rarity: k.rarity, art: mediaArt(k), card: getArt(k), own: owns(k.id), on: eq === k });
  return cards;
}
const startCardId = c => { const eq = equippedOf(c), k = artKey(c); return eq ? eq.id : k === 'base' ? c.id : `${c.id}@${k}`; };
function skinCard(o) {
  return `<button class="skc r${o.rarity} ${o.own ? '' : 'bw'} ${o.kind === 'art3' || o.kind === 'art6' ? 'star-art' : ''}" data-skc="${esc(o.id)}"><img src="${o.card}" alt="" class="${o.art ? '' : 'chibi'}"><span class="skc-nm">${esc(o.name)}</span>${o.on ? `<span class="skc-on">${icon('check')}</span>` : ''}${!o.own ? `<span class="skc-lock">${icon('lock')}</span>` : ''}${o.stars ? `<span class="skc-star">${'★'.repeat(o.stars === 6 ? 2 : 1)}${o.stars}</span>` : rtag(o.rarity)}</button>`;
}
function selectSkin(c, id) {
  const o = outfitCards(c).find(x => x.id === id); if (!o || !csEl) return;
  csSkin = id;
  const img = csEl.querySelector('.cs-art'), blur = csEl.querySelector('.cs-blur');
  img.src = o.art || (o.entry ? getSplash(o.entry) : chibiSplash(c.look || S.player.look)); img.classList.toggle('chibi', !o.art);
  if (o.art) { if (blur) blur.src = o.art; else img.insertAdjacentHTML('beforebegin', `<img class="cs-blur" src="${o.art}" alt="">`); } else if (blur) blur.remove();
  csEl.classList.toggle('bw', !o.own);
  csEl.querySelector('.cs-name').textContent = o.kind === 'skin' ? o.entry.name : o.kind === 'base' ? c.name : `${c.name} · ${o.name}`;
  csEl.querySelectorAll('.skc').forEach(x => x.classList.toggle('sel', x.dataset.skc === id));
  const label = o.kind === 'base' ? 'Default outfit' : o.name, wallId = o.kind === 'skin' ? o.entry.id : wpIdFor(c, o.kind);   // each art is its own wallpaper
  $('#skAct').innerHTML = `<div class="sk-title"><b>${esc(label)}</b>${o.stars ? `<span class="chip">${o.stars}★ splash art</span>` : rtag(o.rarity)}</div>
    ${o.own ? (o.on ? `<button class="btn ghost" disabled>${icon('check')}Equipped</button>` : `<button class="btn gold" id="skEquip">${icon('hanger')}Equip ${esc(label.toLowerCase() === 'default outfit' ? 'default outfit' : label)}</button>`)
      : o.stars ? `<div class="cs-pill">${icon('lock')} Unlocks at ${o.stars} stars · ${esc(c.name)} has ${starsOf(c.id)}</div>`
      : !buyable(o.entry) ? `<div class="cs-pill" style="color:#ff9ec4">${curIcon('rings')} Unlocked by marrying ${esc(c.name)}</div>`
      : `<button class="btn gold" id="skBuy">${icon('skins')}Buy · ${costHTML(SKIN_PRICE)}</button>`}
    ${o.own ? `<button class="btn ghost sm" id="skWall">${icon('image')}${S.wallpaper === wallId ? 'Wallpaper set' : 'Set as wallpaper'}</button>` : ''}`;
  const eb = $('#skEquip'); if (eb) eb.onclick = () => {
    if (o.kind === 'skin') S.equip[c.id] = o.entry.id;
    else { delete S.equip[c.id]; S.artPick[c.id] = o.kind; }
    persist(); applyWallpaper(); renderMenu(); renderCharacters();
    toast(o.kind === 'skin' ? `${c.name} is now wearing ${o.name}.` : o.kind === 'base' ? `${c.name} is back in the default outfit.` : `${c.name} now shows the ${o.name}.`);
  };
  const bb = $('#skBuy'); if (bb) bb.onclick = () => buySkin(o.entry.id);
  const wb = $('#skWall'); if (wb) wb.onclick = () => { S.wallpaper = wallId; persist(); applyWallpaper(); selectSkin(c, id); toast('Wallpaper set.'); };
}
function initSkinCar(c) {
  const car = $('#skCar'); if (!car) return;
  const start = csSkin || startCardId(c);
  const center = el => { car.scrollLeft = el.offsetLeft - (car.clientWidth - el.offsetWidth) / 2; };
  const first = car.querySelector(`[data-skc="${start}"]`) || car.firstElementChild;
  center(first); selectSkin(c, first.dataset.skc);
  let t;
  car.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const mid = car.scrollLeft + car.clientWidth / 2;
      let best = null, bd = 1e9;
      car.querySelectorAll('.skc').forEach(x => { const d = Math.abs(x.offsetLeft + x.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = x; } });
      if (best && best.dataset.skc !== csSkin) selectSkin(c, best.dataset.skc);
    }, 70);
  });
  car.querySelectorAll('.skc').forEach(x => x.onclick = () => { car.scrollTo({ left: x.offsetLeft - (car.clientWidth - x.offsetWidth) / 2, behavior: 'smooth' }); selectSkin(c, x.dataset.skc); });
  car.addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); car.scrollLeft += e.deltaY; } }, { passive: false });
}
function closeCharacters() { if (csEl) { csEl.remove(); csEl = null; } }
function refreshCharacters() { if (csEl) renderCharacters(); }
function renderCharacters() {
  const c = findEntry(csId); if (!csEl || !c) return closeCharacters();
  const eq = equippedOf(c), shown = (csTab === 'skins' && csSkin && findEntry(csSkin)) || eq || c, n = S.owned[c.id] || 0, st = starsOf(c.id), skins = skinsOf(c.id);
  const art = mediaArt(shown), shownOwned = owns(shown.id), shownWall = shown === c ? wpIdFor(c, artKey(c)) : shown.id;   // the art on screen as a wallpaper id
  csEl.className = `cs r${c.rarity}`;
  const tabs = [['home', 'home', 'Home'], ['skins', 'hanger', 'Skins'], ['wardrobe', 'wardrobe', 'Wardrobe'], ['memory', 'memory', 'Memory'], ['pet', 'paw', 'Pet'], ['bt', 'sparkle', 'Breakthrough'], ['bond', 'heart', 'Bond'], ['info', 'info', 'Character Info']];
  const head = `<div class="cs-head">
      <div class="cs-elem ts">${c.mc ? 'Main character' : TYPES[c.type]}</div>
      <h2 class="cs-name ts">${esc(shown.name)}</h2>
      ${RNAME[c.rarity] ? `<span class="cs-badge r${c.rarity}">${RNAME[c.rarity]}</span>` : ''}
    </div>
    <div class="cs-sep"></div>
    <div class="cs-traits">${starRow(st, -1, c)}
      ${bondTag(c.id, 'ts')}
      ${bondOf(c.id).married ? `<span class="trait ts"><i class="ic-t" style="--el:#ff9ec4">${curIcon('rings')}</i>Married</span>` : ''}
    </div>
    <div class="cs-badges"><span class="lbl-sm">Badges · ${BADGES.filter(b => b.ok(c)).length}/${BADGES.length}</span><div class="row">${badgeRow(c, 40)}</div></div>
    <div class="cs-sep"></div>`;
  let body;
  if (csTab === 'home') {
    const next = c.mc ? 'Your main character. Switch between female and male in Settings, once every 72 hours.' : !n ? 'Pull this character on the banner to unlock it.' : st >= MAX_STARS ? `Max stars. Extra copies from summons give ${STARLIGHT_MAX[c.rarity] || STARLIGHT_MAX[4]} Corals each.` : `The next copy adds star ${st + 1} of ${MAX_STARS}.`;
    body = `<div class="cs-boxes">
        <div class="cs-box"><span class="lbl-sm">Stars</span><b><em>${st}</em>/${MAX_STARS}</b></div>
        <div class="cs-box"><span class="lbl-sm">Skins</span><b>${skins.filter(s => owns(s.id)).length}/${skins.length}</b></div>
        <div class="cs-box"><span class="lbl-sm">Status</span><b style="font-size:20px">${n ? '<em>Owned</em>' : 'Locked'}</b></div>
      </div>
      <div class="cs-pill">${next}</div>
      ${artKey(c) !== 'base' && !eq ? `<div class="cs-pill" style="color:#e8ff7a">Showing the ${ASC.find(x => x.k === artKey(c)).label} splash art</div>` : ''}
      ${eq ? `<div class="cs-pill" style="color:#e8ff7a">Wearing ${esc(eq.name)}</div>` : ''}
      <div class="cs-card"><p>${esc(c.desc || 'No description yet.')}</p></div>
      ${shownOwned ? `<div class="cs-actions"><button class="btn mint" id="csWall">${icon('image')}${S.wallpaper === shownWall ? 'Wallpaper set' : 'Set as wallpaper'}</button></div>`
        : shown.type === 'skin' && !buyable(shown) ? `<div class="cs-pill" style="color:#ff9ec4">${curIcon('rings')} Unlocked by marrying ${esc(c.name)}</div>`
        : shown.type === 'skin' ? `<button class="btn gold" id="csBuySkin">${icon('skins')}Buy ${esc(shown.name.replace(c.name + ' · ', ''))} · ${costHTML(SKIN_PRICE)}</button>`
        : `<button class="btn gold" data-open="summon" data-banner="${c.id === S.featuredId ? 'limited' : 'standard'}">${icon('sparkle')}Find ${esc(shown.name)} on the banner</button>`}`;
  } else if (csTab === 'skins') {
    const cards = outfitCards(c);
    body = `<div class="lbl-sm">Outfits & splash arts · ${cards.filter(o => o.own).length}/${cards.length} unlocked</div>
      <div class="sk-car" id="skCar">${cards.map(skinCard).join('')}</div>
      <div class="sk-act" id="skAct"></div>`;
  } else if (csTab === 'wardrobe') {
    const W = wearOf(c.id), on = WARD_SLOTS.filter(([k]) => W[k] && clothOf(W[k])).length;
    const items = S.clothes.filter(x => x.slot === wdSlot && clothFits(x, c)).sort((a, b) => owns(b.id) - owns(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
    body = `<div class="lbl-sm">Wardrobe · ${on}/${WARD_SLOTS.length} equipped</div>
      <div class="wd-grid">${WARD_SLOTS.map(([k, l]) => { const x = W[k] && clothOf(W[k]);
        return `<button class="wd-slot ${wdSlot === k ? 'on' : ''} ${x ? 'r' + x.rarity + ' full' : ''}" data-wdslot="${k}">${x && clothImg(x) ? `<img src="${clothImg(x)}" alt="">` : `<span class="wd-ph">${icon('wardrobe')}</span>`}<b>${l}</b><span class="tiny">${x ? esc(x.name) : 'Empty'}</span></button>`; }).join('')}</div>
      <div class="lbl-sm">${WARD_NAME[wdSlot]} · ${items.filter(x => owns(x.id)).length}/${items.length} owned</div>
      ${items.length ? `<div class="wd-list">${items.map(x => { const own = owns(x.id), eqd = W[wdSlot] === x.id, worn = wearersOf(x.id).filter(id => id !== c.id), busy = own && !eqd && worn.length >= (S.owned[x.id] || 0);
        return `<button class="wd-item r${x.rarity} ${own ? '' : 'bw'} ${eqd ? 'on' : ''} ${busy ? 'busy' : ''}" data-wdi="${esc(x.id)}" ${own ? '' : 'disabled'} ${busy ? `title="Worn by ${esc(worn.map(id => (findEntry(id) || {}).name).join(', '))}"` : ''}>${busy ? `<span class="wd-worn">Worn by ${esc((findEntry(worn[0]) || {}).name || '')}</span>` : ''}${clothImg(x) ? `<img src="${clothImg(x)}" alt="">` : `<span class="wd-ph">${icon('wardrobe')}</span>`}${rtag(x.rarity)}${eqd ? `<span class="skc-on">${icon('check')}</span>` : ''}${own ? '' : `<span class="skc-lock">${icon('lock')}</span>`}<span class="wd-nm">${esc(x.name)}</span></button>`; }).join('')}</div>`
        : `<div class="cs-pill">No ${WARD_NAME[wdSlot].toLowerCase()} items yet. New clothes arrive in a future update.</div>`}
      <div class="row" style="gap:8px">${W[wdSlot] ? `<button class="btn ghost sm" id="wdOff">Take off ${esc(WARD_NAME[wdSlot].toLowerCase())}</button>` : ''}<button class="btn ghost sm" id="wdFuse">${icon('fuse')}Fuse clothes</button></div>
      <p class="tiny">Fusion turns 3 spare clothes of one rarity into 1 random piece of the next (R → SSR, SSR → UR).</p>`;
  } else if (csTab === 'memory') {
    const E = memEqOf(c.id), list = S.memories.filter(x => !x.char || x.char === c.id).sort((a, b) => owns(b.id) - owns(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
    const memArt = x => artFrom(x.img);
    body = `<div class="lbl-sm">Memories · ${E.filter(Boolean).length}/${MEM_SLOTS} equipped</div>
      <div class="mem-slots">${E.map((id, i) => { const x = id && memOf(id);
        return `<button class="mem-slot ${memSlot === i ? 'on' : ''} ${x ? 'full r' + x.rarity : ''}" data-memslot="${i}">${x ? `${memArt(x) ? `<img src="${memArt(x)}" alt="">` : ''}${rtag(x.rarity)}<span class="mem-nm">${esc(x.name)}</span>` : `<span class="mem-empty">${icon('plus')}<span class="tiny">Slot ${i + 1}</span></span>`}</button>`; }).join('')}</div>
      <div class="lbl-sm">All memories · ${list.filter(x => owns(x.id)).length}/${list.length} owned</div>
      ${list.length ? `<div class="mem-list">${list.map(x => { const own = owns(x.id), at = E.indexOf(x.id);
        return `<button class="mem-card r${x.rarity} ${own ? '' : 'bw'} ${at >= 0 ? 'on' : ''}" data-memi="${esc(x.id)}" ${own ? '' : 'disabled'} ${x.desc ? `data-tip="${esc(`<b>${esc(x.name)}</b><span>${esc(x.desc)}</span>`)}"` : ''}>${memArt(x) ? `<img src="${memArt(x)}" alt="">` : `<span class="wd-ph">${icon('memory')}</span>`}${rtag(x.rarity)}${at >= 0 ? `<span class="skc-on">${icon('check')}</span>` : ''}${own ? '' : `<span class="skc-lock">${icon('lock')}</span>`}<span class="mem-nm">${esc(x.name)}</span></button>`; }).join('')}</div>`
        : '<div class="cs-pill">No memories yet. They arrive in a future update.</div>'}
      ${E[0] ? `<button class="btn ghost sm" id="memOff">Remove memory</button>` : ''}
      <p class="tiny">Each character can equip one memory: tap one to equip it (tap it again to remove it). Memories have no effect yet.</p>`;
  } else if (csTab === 'pet') {
    body = petTabHTML(c);
  } else if (csTab === 'bt') {
    const done = btOf(c.id);
    body = `<div class="cs-card"><p>Awaken each star you own to turn it into a glowing ${RNAME[c.rarity]} star. Requirements for each star are coming in a future update; for now each star costs ${BT_PEARLS} pearls. Awakened stars can be switched on and off for free.</p></div>
      <div class="bt-stars r${c.rarity}">${Array.from({ length: MAX_STARS }, (_, i) => {
        const owned = i < st, paid = (S.btPaid[c.id] || []).includes(i), on = done.includes(i);
        return `<button class="bt-star ${on ? 'on' : ''} ${owned ? '' : 'locked'}" data-bt-star="${i}" ${owned ? '' : 'disabled'} data-tip="${esc(`<b>Star ${i + 1}</b><span>${!owned ? `Reach ${i + 1} star${i ? 's' : ''} first.` : paid ? (on ? 'Awakened. Tap to switch off.' : 'Tap to switch on.') : `Requirement: coming soon. Awaken now for ${BT_PEARLS} pearls.`}</span>`)}"><span class="bs">★</span><span class="bl">${!owned ? icon('lock') : paid ? (on ? 'On' : 'Off') : costHTML(BT_PEARLS)}</span></button>`; }).join('')}</div>
      <div class="cs-pill">${done.length} of ${st} owned stars awakened</div>`;
  } else if (csTab === 'bond') {
    const bd = bondOf(c.id), lv = bondLv(c.id), full = lv >= BOND_MAX, lo = BOND_XP[lv], hi = BOND_XP[Math.min(BOND_MAX, lv + 1)];
    const wed = c.weddingSkin && findEntry(c.weddingSkin);
    body = `<div class="cs-card bond-heart"><span class="hrt">${curIcon('bondheart')}<b>${lv}</b></span>
        <div style="display:grid;gap:6px;flex:1"><b style="font-family:var(--display);font-weight:400;font-size:22px">Bond Lv. ${lv}${bd.married ? ' · Married' : ''}</b>
          <span class="bar" style="--rc:#ff6f91"><i style="width:${full ? 100 : (bd.xp - lo) / (hi - lo) * 100}%"></i></span>
          <span class="tiny">${full ? 'Max bond reached' : `${fmt(bd.xp - lo)} / ${fmt(hi - lo)} bond to level ${lv + 1} · ${fmt(bd.xp)} / ${fmt(BOND_XP[BOND_MAX])} total`}</span></div></div>
      ${!n ? '<div class="cs-pill">Own this character to give gifts and raise your bond.</div>' : full ? '' : `<div class="row" style="justify-content:space-between"><span class="lbl-sm">Give a gift</span><span class="row" style="gap:6px"><button class="btn ghost sm" id="csGiftGive">${icon('heart')}Give in bulk</button><button class="btn ghost sm" id="csGiftBuy">${icon('gift')}Buy in bulk</button></span></div><div class="gift-list">${Object.entries(GIFTS).map(([k, g]) =>
        `<button class="gift" data-gift="${k}">${curIcon('g' + k)}<span><b>${g.name}</b><span class="tiny">+${g.xp} bond · ${S.gifts[k] ? `×${S.gifts[k]} in your bag` : `buy for ${fmt(g.price)} coins`}</span></span><span class="btn sm ${S.gifts[k] ? 'mint' : 'ghost'}">${S.gifts[k] ? 'Give' : 'Buy & give'}</span></button>`).join('')}</div>`}
      <div class="cs-card vow-box ${bd.married ? 'done' : ''}">
        <div class="top">${curIcon('rings')}<div>${bd.married ? `<b>Married to ${esc(c.name)}</b><span class="tiny">Since ${new Date(bd.married).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>`
          : `<b>Marriage</b><span class="tiny">${full ? 'Bond is full. Propose with 1 ring.' : `Unlocks at bond level ${BOND_MAX}.`} You have ${S.wallet.rings} ring${S.wallet.rings === 1 ? '' : 's'}.</span>`}</div></div>
        ${bd.married ? '' : `<div class="row">${full && n ? `<button class="btn gold sm" id="csPropose" ${S.wallet.rings ? '' : 'disabled'}>${curIcon('rings')}Propose</button>` : ''}<button class="btn ghost sm" id="csRing">Buy a ring · ${costHTML(RING_PRICE)}</button></div>`}
        <div class="row" style="justify-content:space-between"><span class="tiny">Wedding outfit: ${wed ? `${esc(wed.name)} ${rtag(wed.rarity)}` : 'coming in a future update'}</span>${wed ? `<button class="btn ghost sm" id="csMRPrev">${icon('eye')}Preview MR skin</button>` : ''}</div>
      </div>
      <div class="bond-track">${[[3, 'Profile story (coming soon)'], [5, 'Close Bond badge'], [8, 'Memory art (coming soon)'], [10, 'Soulbound badge · marriage']].map(([l, r]) =>
        `<div class="bond-node ${lv >= l ? 'done' : ''}"><b>Lv ${l}</b><span>${r}</span>${icon(lv >= l ? 'check' : 'lock')}</div>`).join('')}</div>`;
  } else {
    body = `<div class="cs-card"><dl class="kv">
        <dt>Name</dt><dd>${esc(c.name)}</dd>
        <dt>Rarity</dt><dd>${rtag(c.rarity)}</dd>
        <dt>Type</dt><dd>${TYPES[c.type]}</dd>
        <dt>Stars</dt><dd>${starRow(st, -1, c)}</dd>
        <dt>Bond</dt><dd>${bondTag(c.id, 'sm')}${bondOf(c.id).married ? ' · Married' : ''}</dd>
      </dl></div>
      <div class="cs-card"><div class="lbl-sm" style="margin-bottom:6px">Profile</div><p>${esc(c.desc || 'No description yet.')}</p></div>
      <div class="row"><button class="btn ghost sm" data-open="admin">${icon('edit')}Edit in admin</button></div>`;
  }
  csEl.innerHTML = `<div class="cs-bg"><div class="cs-rays"></div></div>
    ${art ? `<img class="cs-blur" src="${art}" alt="">` : ''}<img class="cs-art ${art ? '' : 'chibi'}" src="${getSplash(shown)}" alt="${esc(shown.name)}">
    <div class="cs-shade"></div>
    <div class="cs-top cs-ui"><button class="cs-back" id="csBack">${icon('back')}Back</button><button class="cs-help" id="csHelp" aria-label="Help">?</button></div>
    <nav class="cs-list cs-ui" aria-label="Characters">${charList().map(e => { const o = owns(e.id); return `<button class="cs-av r${e.rarity} ${e.id === c.id ? 'on' : ''} ${o ? '' : 'locked'}" data-cs="${esc(e.id)}" aria-label="${esc(e.name)}">
        <span class="ring"><span>${thumbImg(e)}</span></span>${bondLv(e.id) ? bondTag(e.id, 'av') : ''}${o ? '' : `<span class="lockic">${icon('lock')}</span>`}${starsFor(e)}</button>`; }).join('')}</nav>
    <nav class="cs-tabs cs-ui">${tabs.map(([k, ic, l]) => `<button class="cs-tab ts ${csTab === k ? 'on' : ''}" data-cstab="${k}"><span class="ti">${icon(ic)}</span>${l}</button>`).join('')}</nav>
    <div class="cs-side cs-ui">
      <button class="rbtn" id="csViewBtn" aria-label="View the art without the menu">${icon('eye')}</button>
    </div>
    <section class="cs-panel cs-ui">${head}${body}</section>`;
  $('#csBack').onclick = closeCharacters;
  $('#csHelp').onclick = () => openModal({ title: 'Characters', ic: 'chars', body: `<div class="stack">
      <p class="desc">Pick a character on the left. <b>Home</b> shows stars and outfits, <b>Bond</b> is where you give gifts and, at bond level 10, propose with a ring, and <b>Character Info</b> has their profile. Badges under the name show what you've achieved with each character.</p>
      <p class="desc">Every duplicate copy adds a star, up to ${MAX_STARS}. After that each copy from a summon gives ${STARLIGHT_MAX[5]} Corals for a UR or ${STARLIGHT_MAX[4]} for an SSR.</p>
      <p class="desc"><b>Skins</b> lists every outfit: scroll through them to see each one full screen. Outfits you don't own are shown in black and white. The eye button hides the menu so you can look at the art.</p></div>` });
  csEl.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => { csId = b.dataset.cs; csSkin = null; renderCharacters(); });
  csEl.classList.toggle('bw', !owns(shown.id));
  csEl.querySelectorAll('[data-cstab]').forEach(b => b.onclick = () => { csTab = b.dataset.cstab; csSkin = null; renderCharacters(); });
  if (csTab === 'skins') initSkinCar(c);
  const wf = $('#wdFuse'); if (wf) wf.onclick = () => openFuse(3);
  if (csTab === 'pet') bindPetTab(c);
  csEl.querySelectorAll('[data-wdslot]').forEach(b => b.onclick = () => { wdSlot = b.dataset.wdslot; renderCharacters(); });
  csEl.querySelectorAll('[data-wdi]').forEach(b => b.onclick = () => {
    const x = clothOf(b.dataset.wdi); if (!x || !owns(x.id)) return;
    const W = { ...wearOf(c.id) };
    if (W[x.slot] === x.id) delete W[x.slot];
    else {
      // each owned copy can be worn by one character: take it off someone else first
      const others = wearersOf(x.id).filter(id => id !== c.id);
      if (others.length >= (S.owned[x.id] || 0)) { const who = others.map(id => (findEntry(id) || {}).name).filter(Boolean).join(', '); toast(`${x.name} is worn by ${who}. Take it off ${others.length > 1 ? 'one of them' : 'them'} first.`); return; }
      W[x.slot] = x.id;
    }
    S.wear[c.id] = W; persist(); renderCharacters(); toast(W[x.slot] ? `${c.name} put on ${x.name}.` : `${c.name} took off ${x.name}.`);
  });
  csEl.querySelectorAll('[data-memslot]').forEach(b => b.onclick = () => { memSlot = +b.dataset.memslot; renderCharacters(); });
  csEl.querySelectorAll('[data-memi]').forEach(b => b.onclick = () => {
    const x = memOf(b.dataset.memi); if (!x || !owns(x.id)) return;
    const E = memEqOf(c.id), at = E.indexOf(x.id);
    if (at >= 0) { E[at] = null; toast(`Removed ${x.name}.`); }
    else { E[0] = x.id; memSlot = 0; toast(`${c.name} now holds ${x.name}.`); }
    S.memEq[c.id] = E; persist(); renderCharacters();
  });
  const mo = $('#memOff'); if (mo) mo.onclick = () => { const E = memEqOf(c.id); E[memSlot] = null; S.memEq[c.id] = E; persist(); renderCharacters(); };
  const wo = $('#wdOff'); if (wo) wo.onclick = () => { const W = { ...wearOf(c.id) }; delete W[wdSlot]; S.wear[c.id] = W; persist(); renderCharacters(); };
  csEl.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => giveGift(c.id, b.dataset.gift));
  const gg = $('#csGiftGive'); if (gg) gg.onclick = () => openGiveGifts(c.id);
  const gb = $('#csGiftBuy'); if (gb) gb.onclick = () => openBuyGifts(Object.keys(GIFTS).find(k => !S.gifts[k]) || 'sweets', 'coins');
  const pr = $('#csPropose'); if (pr) pr.onclick = () => askMarry(c.id);
  csEl.querySelectorAll('[data-bt-star]').forEach(b => b.onclick = () => toggleStar(c.id, +b.dataset.btStar));
  const bs = $('#csBuySkin'); if (bs) bs.onclick = () => buySkin(shown.id);
  csEl.querySelectorAll('[data-art]').forEach(b => b.onclick = () => { S.artPick[c.id] = b.dataset.art; persist(); applyWallpaper(); renderMenu(); renderCharacters(); toast(`Now showing ${c.name}'s ${ASC.find(a => a.k === b.dataset.art).label.toLowerCase()} splash art.`); });
  const br = $('#csRing'); if (br) br.onclick = buyRing;
  const mp = $('#csMRPrev'); if (mp) mp.onclick = () => previewMR(c);
  $('#csViewBtn').onclick = e => { e.stopPropagation(); csView = true; csEl.classList.add('viewing'); };
  const eqb = $('#csEquip'); if (eqb) eqb.onclick = () => {
    if (shown === c) delete S.equip[c.id]; else S.equip[c.id] = shown.id;
    csSkin = null; persist(); renderMenu(); renderCharacters(); toast(shown === c ? `${c.name} is wearing the default outfit.` : `${c.name} is now wearing ${shown.name.replace(c.name + ' · ', '')}.`);
  };
  const w = $('#csWall'); if (w) w.onclick = () => { S.wallpaper = shownWall; persist(); applyWallpaper(); renderCharacters(); toast(`${wpName(wpParse(shownWall))} is now your wallpaper.`); };
  const on = csEl.querySelector('.cs-av.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  if (csView) csEl.classList.add('viewing');
}
