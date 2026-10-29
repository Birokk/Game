/* ---------- collection ---------- */
let colOwnedOnly = false;
function openCollection(filter = 'character') {
  openModal({ title: 'Collection', ic: 'chars', wide: true, kind: 'collection', body: '<div id="colRoot"></div>', onMount: () => renderCollection(filter) });
}
const cardHTML = e => {
  const n = S.owned[e.id] || 0;
  return `<button class="card r${e.rarity} ${n ? '' : 'locked'}" data-card="${esc(e.id)}"><img src="${getArt(e)}" alt=""><span class="own">${n ? starsFor(e) : 'Not owned'}</span><div class="card-foot"><div>${rtag(e.rarity)}</div><div class="card-name">${esc(e.name)}</div><div class="card-type">${TYPES[e.type]}</div></div></button>`;
};
/* character cards in the collection: same look as the skin cards (rarity top left, name and stars at the bottom) */
const charCardHTML = e => {
  const own = owns(e.id);
  return `<button class="skc col r${e.rarity} ${own ? '' : 'bw'}" data-card="${esc(e.id)}"><img src="${getArt(e)}" alt="" class="${mediaArt(e) ? '' : 'chibi'}">${rtag(e.rarity)}${own ? '' : `<span class="skc-lock">${icon('lock')}</span>`}<span class="skc-nm">${esc(e.name)}<span class="skc-st">${own ? starRow(starsOf(e.id), -1, e) : 'Not owned'}</span></span></button>`;
};
const FUTURE = { collectible: 'Collectibles' };
function renderCollection(filter) {
  const root = $('#colRoot'); if (!root) return;
  const tabs = [['character', 'Characters'], ['skin', 'Skins'], ['pet', 'Pets'], ['collectible', 'Collectibles'], ['item', 'Items']];
  const inTab = k => S.pool.filter(e => e.type === k && !mcOff(e.id));
  const list = inTab(filter).filter(e => !colOwnedOnly || owns(e.id)).sort((a, b) => owns(b.id) - owns(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  root.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === filter ? 'on' : ''}" data-tab="${k}">${l}<span>${inTab(k).filter(e => owns(e.id)).length}/${inTab(k).length}</span></button>`).join('')}
      <label class="switch">Owned only<input type="checkbox" id="colOwned" ${colOwnedOnly ? 'checked' : ''}><i></i></label></div>
    ${list.length ? `<div class="cards ${filter === 'character' ? 'col-chars' : ''}">${list.map(filter === 'character' ? charCardHTML : cardHTML).join('')}</div>` : `<div class="empty">${colOwnedOnly ? 'You don\'t own anything here yet. <button class="link" data-open="summon">Try the banner</button>.' : FUTURE[filter] ? `${FUTURE[filter]} arrive in a future update.` : 'Nothing here yet. Add some in the <button class="link" data-open="admin">admin panel</button>.'}</div>`}`;
  root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => renderCollection(b.dataset.tab));
  root.querySelectorAll('[data-card]').forEach(b => b.onclick = () => renderDetail(b.dataset.card, filter));
  $('#colOwned').onchange = e => { colOwnedOnly = e.target.checked; renderCollection(filter); };
}
function renderDetail(id, backTo) {
  const root = $('#colRoot'); const e = findEntry(id); if (!root || !e) return;
  const parent = e.parent && findEntry(e.parent);
  const n = S.owned[e.id] || 0;
  const wearable = (e.type === 'character' || e.type === 'skin') && n;
  const art = mediaArt(e);
  root.innerHTML = `<button class="btn ghost sm" id="dBack" style="margin-bottom:14px">${icon('back')}Back</button>
    <div class="dt-hero r${e.rarity} ${n ? '' : 'unowned'}">
      ${art ? `<img class="cs-blur" src="${art}" alt="">` : ''}<img class="dt-art ${art ? '' : 'chibi'}" src="${getSplash(e)}" alt="${esc(e.name)}"><div class="dt-shade"></div>
      <div class="dt-info">
        <div class="eyebrow ts" style="color:#fff">${TYPES[e.type]}${parent ? ` for ${esc(parent.name)}` : ''}</div>
        <h3>${esc(e.name)}</h3>
        <div>${rtag(e.rarity, 'lg')}</div>
        <div class="chips"><span class="chip ${n ? 'gold' : ''}">${n ? 'Owned' : 'Not owned'}</span>${e.pullable === false ? '<span class="chip">Not in summons</span>' : ''}</div>
        ${n && hasStars(e) ? `<div class="stars-big">${starsFor(e)}<span class="tiny">${starsOf(e.id) >= MAX_STARS ? `Max stars. More copies give ${overflowOf(e)} pearls each.` : `${starsOf(e.id)} of ${MAX_STARS} stars. The next copy adds a star.`}</span></div>` : ''}
        <p class="desc">${esc(e.desc || 'No description yet.')}</p>
        <div class="row">${wearable ? `<button class="btn mint" id="dWall">${icon('image')}Set as wallpaper</button>` : ''}${buyable(e) && !n ? `<button class="btn gold" id="dBuy">${icon('skins')}Buy · ${costHTML(SKIN_PRICE)}</button>` : ''}${e.type === 'character' && n ? `<button class="btn ghost" data-open="characters" data-char="${esc(e.id)}">${icon('chars')}Character page</button>` : ''}<button class="btn ghost" data-open="admin">${icon('edit')}Edit in admin</button></div>
        ${n ? '' : `<p class="tiny">${e.rarity === 6 ? 'Marry this character to unlock it.' : e.type === 'skin' ? 'Buy or pull this on the banner to unlock it.' : 'Pull this on the banner to unlock it.'}</p>`}
      </div>
    </div>`;
  $('#dBack').onclick = () => renderCollection(backTo || 'character');
  const db = $('#dBuy'); if (db) db.onclick = () => buySkin(e.id);
  const wl = $('#dWall');
  if (wl) wl.onclick = () => { S.wallpaper = e.id; persist(); applyWallpaper(); toast(`${e.name} is now your wallpaper.`); };
}
