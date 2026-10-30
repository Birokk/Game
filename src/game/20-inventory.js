/* ---------- inventory (home "Bag"): full-screen grid of everything the player holds, with a detail panel ---------- */
const INV_CAP = 1000;
const INV_TABS = [['all', 'grid', 'All'], ['summon', 'sparkle', 'Summon'], ['use', 'gift', 'Consumables'], ['pets', 'heart', 'Pets'], ['wardrobe', 'hanger', 'Wardrobe'], ['memory', 'memory', 'Memories'], ['items', 'bag', 'Items']];
const INV_SORTS = [['rarity', 'Rarity'], ['amount', 'Amount'], ['name', 'Name']];
let invEl = null, invTab = 'all', invSel = null, invSort = 'rarity', invDesc = true;
const goTo = fn => () => { closeInventory(); fn(); };
/* every stack the player holds right now: { id, cat, name, n, r, tag, use, lore, pic, act: [label, fn] } */
function invItems() {
  const W = S.wallet, P = S.pets, list = [];
  const cur = (id, k, cat, name, n, r, tag, use, lore, act) => list.push({ id, cat, name, n, r, tag, use, lore, pic: curIcon(k), act });
  cur('tickets', 'tickets', 'summon', 'Limited ticket', W.tickets, 5, 'Summon item', 'Pays for 1 pull on the Limited, Weekly or Outfit banner.', 'A lantern-stamped pass handed out at the festival gate. It still smells faintly of firework smoke.', ['Summon', goTo(() => openSummon('limited'))]);
  cur('wishes', 'wishes', 'summon', 'Wish ticket', W.wishes, 4, 'Summon item', 'Pays for 1 pull on the Permanent banner.', 'Folded from fountain paper. Whisper a name into it before you let it go.', ['Summon', goTo(() => openSummon('standard'))]);
  cur('starlight', 'starlight', 'summon', 'Corals', W.starlight, 5, 'Pull currency', 'Trade for summon tickets in the Corals exchange.', 'Earned from every character you pull. They glow warmer the more often a friend comes home.', ['Shop', goTo(() => openShop('starlight'))]);
  cur('dust', 'dust', 'summon', 'Seaweeds', W.dust, 3, 'Pull currency', 'Spend in the Seaweeds shop and on Monthly pulls.', `Every pull washes up ${DUST_PER_PULL} of them, whatever the wish brings.`, ['Shop', goTo(() => openShop('dust'))]);
  cur('bottles', 'bottles', 'use', 'Stamina bottle', W.bottles, 4, 'Consumable', `Restores ${BOTTLE_STAMINA} stamina.`, 'Bottled lightning from the Firework Stage. Shake before drinking, or don’t.', ['Use', () => { if (!S.wallet.bottles) return; S.wallet.bottles--; stamina(); S.stamina.v += BOTTLE_STAMINA; if (S.stamina.v >= STAMINA_MAX) S.stamina.t = Date.now(); persist(); renderMenu(); renderInventory(); toast(`+${BOTTLE_STAMINA} stamina. You now have ${stamina()}.`); }]);
  cur('rings', 'rings', 'use', 'Marriage ring', W.rings, 5, 'Key item', `Propose to a character at bond level ${BOND_MAX} from their Bond tab.`, 'A pearl set in moon-gold. Only one heart can wear it.', ['Characters', goTo(() => openCharacters())]);
  Object.entries(GIFTS).forEach(([k, g], i) => cur('gift-' + k, 'g' + k, 'use', g.name, S.gifts[k] || 0, 3 + i, 'Gift', `Give it to a character from their Bond tab: +${fmt(g.xp)} bond.`, ['Wrapped with a lantern ribbon.', 'Strung from pearls the fountain gave back.', 'Stuffed with leftover festival stars.'][i] || '', ['Give', goTo(() => openCharacters())]));
  cur('frag-ssr', 'fragssr', 'pets', 'SSR egg fragment', P.frags.ssr, 4, 'Material', `${EGG.ssr.frag} fragments combine into an SSR egg in the Hatchery.`, 'A warm shard of shell. Something inside it is still humming.', ['Hatchery', goTo(openPets)]);
  cur('frag-ur', 'fragur', 'pets', 'UR egg fragment', P.frags.ur, 5, 'Material', `${EGG.ur.frag} fragments combine into a UR egg in the Hatchery.`, 'It shimmers in three colours at once. Pets from these eggs are rare.', ['Hatchery', goTo(openPets)]);
  ['ssr', 'ur'].forEach(r => list.push({ id: 'egg-' + r, cat: 'pets', name: EGG[r].name, n: P.eggs.filter(x => x === r).length, r: EGG[r].r, tag: 'Egg', use: `Put it in an incubator to hatch a random ${r.toUpperCase()} pet (${fmtLeft(EGG[r].mins * 6e4)}).`, lore: 'Keep it warm. It rocks a little when you talk to it.', pic: eggHTML(r), act: ['Hatchery', goTo(openPets)] }));
  (S.clothes || []).filter(x => owns(x.id)).forEach(x => { const slot = (WARD_SLOTS.find(s => s[0] === x.slot) || [, 'Clothing'])[1], img = clothImg(x);
    list.push({ id: x.id, cat: 'wardrobe', name: x.name, n: S.owned[x.id], r: x.rarity, tag: `Wardrobe · ${slot}`, use: `Wear it from ${x.char ? `${esc((findEntry(x.char) || {}).name || 'its character')}'s` : 'any character’s'} Wardrobe tab (${slot} slot).`, lore: '', pic: img ? `<img src="${img}" alt="">` : icon('hanger'), act: ['Characters', goTo(() => openCharacters(x.char))] }); });
  (S.memories || []).filter(x => owns(x.id)).forEach(x => { const img = artFrom(x.img);
    list.push({ id: x.id, cat: 'memory', name: x.name, n: S.owned[x.id], r: x.rarity, tag: 'Memory', use: `Equip it in ${x.char ? `${esc((findEntry(x.char) || {}).name || 'its character')}'s` : 'any character’s'} Memory tab.`, lore: x.desc || '', pic: img ? `<img class="wide" src="${img}" alt="">` : icon('memory'), act: ['Characters', goTo(() => openCharacters(x.char))] }); });
  S.pool.filter(e => (e.type === 'item' || e.type === 'collectible') && owns(e.id)).forEach(e => list.push({ id: e.id, cat: 'items', name: e.name, n: S.owned[e.id], r: e.rarity, tag: e.type === 'item' ? 'Key item' : 'Collectible', use: e.type === 'item' ? 'Kept for a future update.' : 'Part of your collection.', lore: e.desc || '', pic: baseThumb(e), act: ['Collection', goTo(() => openCollection(e.type))] }));
  return list.filter(x => x.n > 0);
}
function invSorted(list) {
  const k = { rarity: x => x.r * 1e9 + x.n, amount: x => x.n, name: null }[invSort], d = invDesc ? -1 : 1;
  return [...list].sort((a, b) => k ? (k(a) - k(b)) * d : a.name.localeCompare(b.name) * -d);
}
function openInventory(tab) {
  closeModal(); invTab = tab || invTab; invSel = null;
  if (!invEl) { invEl = document.createElement('div'); invEl.className = 'inv'; invEl.setAttribute('role', 'dialog'); invEl.setAttribute('aria-label', 'Inventory'); document.body.appendChild(invEl); }
  renderInventory();
}
function closeInventory() { if (invEl) { invEl.remove(); invEl = null; } renderMenu(); }
function renderInventory() {
  if (!invEl) return;
  const all = invItems(), list = invSorted(invTab === 'all' ? all : all.filter(x => x.cat === invTab));
  if (!list.some(x => x.id === invSel)) invSel = list[0] ? list[0].id : null;
  const it = list.find(x => x.id === invSel), scroll = invEl.querySelector('.inv-grid'), top = scroll ? scroll.scrollTop : 0;
  invEl.innerHTML = `<div class="inv-top">
      <div class="inv-title"><span class="inv-badge">${icon('bag')}</span><h2 class="ts">Inventory</h2></div>
      <nav class="inv-tabs">${INV_TABS.map(([k, ic, l]) => `<button class="${invTab === k ? 'on' : ''}" data-invtab="${k}" title="${l}" aria-label="${l}">${icon(ic)}</button>`).join('')}</nav>
      <div class="inv-cur">${['coins', 'pearls'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(S.wallet[k])}</b></div>`).join('')}<button class="inv-x" id="invClose" aria-label="Close">${icon('close')}</button></div>
    </div>
    <div class="inv-main">
      <section class="inv-left">
        <span class="inv-count">${INV_TABS.find(t => t[0] === invTab)[2] === 'All' ? 'Item' : INV_TABS.find(t => t[0] === invTab)[2]} ${list.length}/${INV_CAP}</span>
        <div class="inv-grid">${list.length ? list.map(x => `<button class="inv-cell r${x.r} ${x.id === invSel ? 'on' : ''}" data-inv="${esc(x.id)}" aria-label="${esc(x.name)}, ${fmt(x.n)}"><span class="inv-pic">${x.pic}</span><b>${fmt(x.n)}</b></button>`).join('')
          : `<p class="inv-empty">${icon('bag')}Nothing here yet.</p>`}</div>
        <div class="inv-bar"><label class="inv-sort"><select id="invSort" aria-label="Sort by">${INV_SORTS.map(([k, l]) => `<option value="${k}" ${invSort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <button class="inv-dir ${invDesc ? '' : 'asc'}" id="invDir" aria-label="${invDesc ? 'Highest first' : 'Lowest first'}" title="${invDesc ? 'Highest first' : 'Lowest first'}">${icon('up')}</button></div>
      </section>
      <aside class="inv-detail">${it ? `<div class="inv-dh"><span class="inv-badge sm">${icon(INV_TABS.find(t => t[0] === it.cat)[1])}</span><span>${esc(INV_TABS.find(t => t[0] === it.cat)[2])}</span></div>
        <div class="inv-hero r${it.r}"><span class="inv-medal"><span class="inv-pic">${it.pic}</span></span><div><b class="ts">${esc(it.name)}</b>${rtag(it.r)}<span class="inv-n">×${fmt(it.n)}</span></div></div>
        <div class="inv-body"><span class="inv-tag r${it.r}">${esc(it.tag)}</span><p class="inv-use">${it.use}</p>${it.lore ? `<p class="inv-lore">${esc(it.lore)}</p>` : ''}
          ${it.act ? `<button class="btn gold" id="invAct">${esc(it.act[0])}</button>` : ''}</div>` : '<p class="inv-empty">Pick an item to see what it does.</p>'}</aside>
    </div>`;
  const g = invEl.querySelector('.inv-grid'); if (g) g.scrollTop = top;
  $('#invClose').onclick = closeInventory;
  invEl.querySelectorAll('[data-invtab]').forEach(b => b.onclick = () => { invTab = b.dataset.invtab; invSel = null; renderInventory(); });
  invEl.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => { invSel = b.dataset.inv; renderInventory(); });
  $('#invSort').onchange = e => { invSort = e.target.value; renderInventory(); };
  $('#invDir').onclick = () => { invDesc = !invDesc; renderInventory(); };
  const a = $('#invAct'); if (a && it) a.onclick = it.act[1];
}
