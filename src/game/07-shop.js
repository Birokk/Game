/* ---------- shop: Corals exchange, Seaweeds shop, monthly pulls ---------- */
const SHOP_TICKET = 10, MONTHLY_LIMIT = 5, MONTHLY_PRICE = 75;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
function monthly() { if (S.monthly.key !== monthKey()) S.monthly = { key: monthKey(), limited: 0, standard: 0 }; return S.monthly; }
const nextMonthIn = () => { const n = new Date(), r = new Date(n.getFullYear(), n.getMonth() + 1, 1), d = Math.ceil((r - n) / 864e5); return d <= 1 ? 'tomorrow' : `in ${d} days`; };
const DUST_GIFTS = { sweets: 5, bracelet: 10, plush: 20 };
/* full-screen shop: sidebar of sub-shops on the left, the chosen one on the right (Hot Picks = featured outfits over their art) */
const SHOP_TABS = [['hot', 'sparkle', 'Hot Picks'], ['skins', 'hanger', 'Outfit Shop'], ['topup', 'plus', 'Top Up'], ['pearl', 'gift', 'Pearl Shop'], ['exchange', 'shop', 'Exchange Currency'], ['points', 'star', 'Summon Points']];
/* Exchange Currency sub-tabs: Corals, Seaweeds, Premium (Corals → a copy of an owned character, 720 each, 1 a month) */
const EX_SUBS = [['corals', 'Corals'], ['seaweeds', 'Seaweeds'], ['premium', 'Premium'], ['memories', 'Memories'], ['frags', 'Fragments']], PREM_PRICE = 720, PREM_LIMIT = 1;
const MEMX_PRICE = 300;   // Exchange → Memories: any UR memory for 300 Corals, once per memory per account (S.memEx = [ids])
const memExUsed = id => (S.memEx || []).includes(id);
let exSub = 'corals';
/* Premium exchange: once a month for EACH UR character (S.premEx.ids = characters exchanged this month) */
function premEx() { if (!S.premEx || S.premEx.key !== monthKey()) S.premEx = { key: monthKey(), ids: [] }; if (!Array.isArray(S.premEx.ids)) S.premEx.ids = []; return S.premEx; }
const premUsed = id => premEx().ids.includes(id);
const TOPUP = [[6, '0.99'], [30, '4.99'], [98, '14.99'], [198, '29.99'], [328, '49.99'], [648, '99.99']];
/* bonus pearls: the first purchase of each pack is doubled, later ones give +10%; the $0.99 pack has no bonus (S.topupFirst = [pack indices bought]) */
const topupBonus = i => { const [n, usd] = TOPUP[i]; if (usd === '0.99') return { n: 0, first: false }; const first = !(S.topupFirst || []).includes(i); return { n: first ? n : Math.round(n * .1), first }; };
const TOPUP_FREE = true;   // testing: Top Up packs are free (no real payments yet)
/* Top Up → Daily / Weekly / Monthly packs: a free gift every reset plus paid bundles that beat the base 6 pearls per $1
   (PEARLS_PER_USD) and add character fragments, UR memory tickets and stamina bottles. Each pack can be bought `limit`
   times per reset (daily = local midnight, weekly = Monday, monthly = the 1st). State S.packs[kind] = {key, got: {id: n}}. */
const PEARLS_PER_USD = 6;
const PACKS = {
  daily: { label: 'Daily', key: () => dayKey(), list: [
    { id: 'free', name: 'Daily Gift', usd: 0, items: { coins: 2000, bottles: 1, cfssr: 1 } },
    { id: 'd1', name: 'Morning Pearls', usd: 0.99, limit: 1, items: { pearls: 10, bottles: 1 } },
    { id: 'd2', name: 'Lantern Bundle', usd: 2.99, limit: 1, items: { pearls: 30, cfssr: 2, bottles: 2 } },
    { id: 'd3', name: 'Tide Bundle', usd: 4.99, limit: 1, items: { pearls: 50, cfur: 1, cfssr: 3, bottles: 3 } },
    { id: 'd4', name: 'Pearl Chest', usd: 9.99, limit: 1, items: { pearls: 110, cfur: 2, cfssr: 4, bottles: 5 } }] },
  weekly: { label: 'Weekly', key: () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dayKey(d); }, list: [
    { id: 'free', name: 'Weekly Gift', usd: 0, items: { pearls: 5, cfssr: 3, bottles: 2 } },
    { id: 'w1', name: 'Week Starter', usd: 4.99, limit: 1, items: { pearls: 45, cfssr: 3, bottles: 3 } },
    { id: 'w2', name: 'Explorer Pack', usd: 9.99, limit: 1, items: { pearls: 95, cfur: 2, cfssr: 5, bottles: 5 } },
    { id: 'w3', name: 'Voyager Pack', usd: 19.99, limit: 1, items: { pearls: 200, memtk: 1, cfur: 4, cfssr: 6, bottles: 8 } },
    { id: 'w4', name: "Captain's Hoard", usd: 49.99, limit: 1, items: { pearls: 520, memtk: 2, cfur: 10, cfssr: 12, bottles: 15 } }] },
  monthly: { label: 'Monthly', key: () => monthKey(), list: [
    { id: 'free', name: 'Monthly Gift', usd: 0, items: { pearls: 15, cfur: 2, bottles: 3 } },
    { id: 'm1', name: 'Moon Pack', usd: 9.99, limit: 1, items: { pearls: 100, cfur: 3, cfssr: 5, bottles: 10 } },
    { id: 'm2', name: 'Tidal Treasure', usd: 29.99, limit: 1, items: { pearls: 320, memtk: 1, cfur: 8, cfssr: 10, bottles: 15 } },
    { id: 'm3', name: 'Starlit Vault', usd: 49.99, limit: 1, items: { pearls: 550, memtk: 2, cfur: 15, cfssr: 20, bottles: 20 } },
    { id: 'm4', name: 'Sovereign Trove', usd: 99.99, limit: 1, items: { pearls: 1150, memtk: 4, cfur: 30, cfssr: 40, bottles: 40 } }] } };
const TOP_SUBS = [['pearls', 'Pearls'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
let topSub = 'pearls';
function packState(kind) { S.packs = S.packs || {}; const k = PACKS[kind].key(); if (!S.packs[kind] || S.packs[kind].key !== k) S.packs[kind] = { key: k, got: {} }; return S.packs[kind]; }
const packLeft = (kind, pk) => (pk.usd ? pk.limit || 1 : 1) - (packState(kind).got[pk.id] || 0);
const packFreeReady = kind => packLeft(kind, PACKS[kind].list[0]) > 0;
const packsReady = () => ['daily', 'weekly', 'monthly'].some(packFreeReady);
function packResetTxt(kind) {
  const n = new Date(); let r;
  if (kind === 'daily') { r = new Date(n); r.setHours(24, 0, 0, 0); }
  else if (kind === 'weekly') { r = new Date(n); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() + (8 - r.getDay()) % 7 || 7); }
  else r = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `Resets in ${dhLeft(r - n)}`;
}
function packsHTML(kind) {
  const P = PACKS[kind];
  return `<div class="pk-head"><span class="pk-reset">${icon('clock')}${packResetTxt(kind)}</span><span class="tiny">Base rate ${PEARLS_PER_USD} pearls per $1 · every pack below beats it${TOPUP_FREE ? ' · free while testing' : ''}</span></div>
    <div class="pk-grid">${P.list.map(pk => { const left = packLeft(kind, pk), val = pk.usd ? Math.round((pk.items.pearls || 0) / (pk.usd * PEARLS_PER_USD) * 100 - 100) : 0;
      return `<div class="pk ${pk.usd ? '' : 'free'} ${left > 0 ? '' : 'out'}">
        <div class="pk-top"><b>${esc(pk.name)}</b>${pk.usd ? `<span class="pk-val">+${val}% value</span>` : '<span class="pk-val free">FREE</span>'}</div>
        <div class="pk-items">${Object.entries(pk.items).map(([k, n]) => bpItem(k, n)).join('')}</div>
        <div class="pk-ft"><span class="tiny">${pk.usd ? `${left} / ${pk.limit || 1} left · +${fmt(Math.round(pk.usd * VIP_PER_USD))} VIP EXP` : left > 0 ? 'Claim once per reset' : 'Claimed · come back after the reset'}</span>
          ${left <= 0 ? `<button class="mall-buy" disabled>${pk.usd ? 'Sold out' : 'Claimed'}</button>` : pk.usd ? (TOPUP_FREE ? `<button class="mall-buy ok" data-pack="${kind}|${pk.id}">$${pk.usd} · Free test</button>` : `<button class="mall-buy" disabled>$${pk.usd} · Soon</button>`) : `<button class="mall-buy ok" data-pack="${kind}|${pk.id}">Claim</button>`}</div></div>`; }).join('')}</div>`;
}
function buyPack(kind, id) {
  const pk = PACKS[kind].list.find(x => x.id === id); if (!pk || packLeft(kind, pk) <= 0) return;
  if (pk.usd && !TOPUP_FREE) return;
  const st = packState(kind); st.got[id] = (st.got[id] || 0) + 1;
  Object.entries(pk.items).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; });
  const got = { ...pk.items }; if (pk.usd) { vipFromUsd(pk.usd); got.vip = Math.round(pk.usd * VIP_PER_USD); }
  persist(); renderMenu(); refreshSummon(); renderShop();
  showRewards(pk.name, got, pk.usd ? `${PACKS[kind].label} pack · $${pk.usd}${TOPUP_FREE ? ' · free while testing' : ''}` : `${PACKS[kind].label} free gift`);
}
let shopTab = 'hot', shopEl = null, shopPick = null, hotSub = 'pass';   // Hot Picks: 'pass' (memberships) | 'skins' (new outfits)
/* top-up pack pictures: the admin's upload (Settings → Admin → Top Up icons, media keys topup:0…5) or the pearl icon; no rarity frame */
const topupIcon = i => { const c = MEDIA.get('topup:' + i); return c ? `<img class="cic" src="${c}" alt="">` : curIcon('pearls'); };
function openShop(tab) {
  closeModal();
  if (tab === 'monthly' || tab === 'dust') { tab = 'exchange'; exSub = 'seaweeds'; }   // monthly pulls live in the Seaweeds exchange
  if (tab && tab.startsWith('points')) tab = 'points';
  else if (['daily', 'weekly', 'monthly'].includes(tab)) { topSub = tab; tab = 'topup'; }
  else if (tab === 'frags') { tab = 'exchange'; exSub = 'frags'; }
  else if (tab === 'starlight') { tab = 'exchange'; exSub = 'corals'; } else if (tab === 'premium') { tab = 'exchange'; exSub = 'premium'; }
  shopTab = SHOP_TABS.some(t => t[0] === tab) ? tab : tab ? shopTab : 'hot';
  if (!shopEl) { shopEl = document.createElement('div'); shopEl.className = 'mall'; shopEl.setAttribute('role', 'dialog'); shopEl.setAttribute('aria-label', 'Shop'); document.body.appendChild(shopEl); }
  renderShop();
}
function closeShop() { if (shopEl) { shopEl.remove(); shopEl = null; } renderMenu(); refreshSummon(); }
const shopSkins = () => S.pool.filter(buyable).slice().reverse();
const hotPicks = () => { const all = shopSkins(); return [...all.filter(e => !owns(e.id)), ...all.filter(e => owns(e.id))].slice(0, 4); };
function renderShop() {
  if (!shopEl) return;
  const m = monthly(), W = S.wallet;
  const item = (id, ic, name, sub, price, cur, extra = '', r = 4) => `<div class="mall-item ${extra}"><span class="mall-ic r${r}">${curIcon(ic)}</span><b>${name}</b><span class="tiny">${sub}</span>
    <button class="mall-buy ${W[cur] >= price && !extra.includes('soldout') ? 'ok' : ''}" data-buy="${id}" ${extra.includes('soldout') ? 'disabled' : ''}>${extra.includes('soldout') ? 'Sold out' : `${curIcon(cur)}${fmt(price)}`}</button></div>`;
  const tab = SHOP_TABS.find(t => t[0] === shopTab);
  let strip = shopTab === 'topup' ? TOP_SUBS.map(([k, l]) => `<button class="mall-pill ${k === topSub ? 'on' : ''}" data-topsub="${k}">${l}${k !== 'pearls' && packFreeReady(k) ? '<span class="dot-n"></span>' : ''}</button>`).join('') : shopTab === 'exchange' ? EX_SUBS.map(([k, l]) => `<button class="mall-pill ${k === exSub ? 'on' : ''}" data-exsub="${k}">${l}</button>`).join('') : `<span class="mall-pill on">${tab[2]}</span>`, body = '', bg = '';
  if (shopTab === 'hot') {
    const picks = hotPicks(); if (!picks.some(e => e.id === shopPick)) shopPick = picks[0] ? picks[0].id : null;
    const e = hotSub === 'skins' && shopPick && findEntry(shopPick), par = e && findEntry(e.parent);
    strip = [['pass', 'Memberships'], ['skins', 'New outfits']].map(([k, l]) => `<button class="mall-pill ${k === hotSub ? 'on' : ''}" data-hotsub="${k}">${l}</button>`).join('');
    bg = e ? `<img class="mall-art" src="${baseSplash(e)}" alt="">` : '';
    body = hotSub === 'pass' ? passShopHTML() : e ? `<div class="mall-hot">
        <div class="mall-hot-name"><h1>${esc(e.name)}</h1><span class="mall-time">${rtag(e.rarity)}${par ? esc(par.name) : 'Outfit'}</span></div>
        <div class="mall-thumbs">${picks.map(x => `<button class="mall-thumb ${x.id === shopPick ? 'on' : ''}" data-pick="${esc(x.id)}"><img src="${baseCard(x)}" alt=""><b>${esc(x.name)}</b></button>`).join('')}</div>
        <div class="mall-price"><span>${curIcon('pearls')}<b>${SKIN_PRICE}</b></span>${owns(e.id) ? '<button class="mall-go owned" disabled>Owned</button>' : `<button class="mall-go" data-skin="${esc(e.id)}">Buy ${icon('up')}</button>`}</div>
      </div>` : '<p class="mall-empty">No outfits for sale yet. Add skins in the admin panel.</p>';
  } else if (shopTab === 'skins') {
    const list = shopSkins();
    body = `<p class="tiny">Every outfit costs ${SKIN_PRICE} pearls. Wedding (MR) outfits can't be bought; marry the character to unlock them.</p>
      <div class="mall-skins">${list.map(x => { const par = findEntry(x.parent), own = owns(x.id);
        return `<div class="mall-skin r${x.rarity}"><img src="${baseCard(x)}" alt="" ${baseArt(x) ? `style="${cardImgStyle(x, 'base')}"` : ''}>${rtag(x.rarity)}<span class="mall-skin-nm"><b>${esc(x.name)}</b><small>${par ? esc(par.name) : ''}</small></span>
          ${own ? '<button class="mall-buy" disabled>Owned</button>' : `<button class="mall-buy ${W.pearls >= SKIN_PRICE ? 'ok' : ''}" data-skin="${esc(x.id)}">${curIcon('pearls')}${SKIN_PRICE}</button>`}</div>`; }).join('') || '<p class="mall-empty">No outfits for sale yet.</p>'}</div>`;
  } else if (shopTab === 'topup' && topSub !== 'pearls') body = packsHTML(topSub);
  else if (shopTab === 'topup') {
    body = `<p class="tiny">${TOPUP_FREE ? 'Pearl packs. The first purchase of each pack is doubled, later purchases give +10% (not the $0.99 pack). Real payments aren\'t connected yet, so every pack is free while testing.' : 'Pearl packs. Real payments aren\'t connected yet, so these can\'t be bought for now.'}</p>
      <div class="mall-grid">${TOPUP.map(([n, usd], i) => `<div class="mall-item topup"><span class="mall-ic big raw">${topupIcon(i)}</span><b>${fmt(n)} pearls</b>${(() => { const bo = topupBonus(i); return bo.n ? `<span class="tu-bonus ${bo.first ? 'first' : ''}">${bo.first ? 'First purchase ×2' : '+10% bonus'} · +${fmt(bo.n)}</span>` : '<span class="tu-bonus none">No bonus</span>'; })()}<span class="tiny">$${usd}${TOPUP_FREE ? ' · free while testing' : ''}</span><span class="mall-vipx">+${fmt(Math.round(parseFloat(usd) * VIP_PER_USD))} VIP EXP</span>${TOPUP_FREE ? `<button class="mall-buy ok" data-topup="${i}">Free · test</button>` : `<button class="mall-buy" disabled>$${usd} · Soon</button>`}</div>`).join('')}</div>`;
  } else if (shopTab === 'pearl') {
    body = `<p class="tiny">Spend pearls on summon tickets, marriage rings and name change tickets.</p>
      <div class="mall-grid">${item('pt-tickets', 'tickets', 'Limited ticket', '1 pull on the Limited, Weekly or Outfit banner', TICKET_PEARLS, 'pearls', '', 5)}${item('pt-wishes', 'wishes', 'Standard ticket', '1 pull on the Permanent or Memory banner', TICKET_PEARLS, 'pearls')}${item('pr-ring', 'rings', 'Marriage ring', `Propose at bond level ${BOND_MAX} · you have ${W.rings}`, RING_PRICE, 'pearls', '', 5)}${item('pn-name', 'nametk', 'Name change ticket', `Change your name once (every 72 h) · you have ${W.nametk || 0}`, NAMETK_PEARLS, 'pearls', '', 4)}</div>`;
  } else if (shopTab === 'points') body = ptShopHTML();
  else if (shopTab === 'exchange' && exSub === 'frags') body = fragShopHTML();
  else if (shopTab === 'exchange' && exSub === 'corals') body = `<p class="tiny">Earn Corals from every character you pull: ${STARLIGHT[4]} for an SSR, ${STARLIGHT[5]} for a UR, and ${STARLIGHT_MAX[4]} / ${STARLIGHT_MAX[5]} once that character is already at max stars.</p>
    <div class="mall-grid">${item('st-tickets', 'tickets', 'Limited ticket', '1 pull on the Limited, Weekly or Outfit banner', SHOP_TICKET, 'starlight', '', 5)}${item('st-wishes', 'wishes', 'Standard ticket', '1 pull on the Permanent or Memory banner', SHOP_TICKET, 'starlight')}${item('sn-name', 'nametk', 'Name change ticket', `Change your name once (every 72 h) · you have ${W.nametk || 0}`, NAMETK_CORALS, 'starlight', '', 4)}</div>`;
  else if (shopTab === 'exchange' && exSub === 'memories') { const urs = (S.memories || []).filter(m => +m.rarity === 5).sort((a, b) => memExUsed(a.id) - memExUsed(b.id) || a.name.localeCompare(b.name));
    body = `<div class="mall-limit"><b>Limit: 1 per memory per account</b><span>${urs.filter(m => memExUsed(m.id)).length} / ${urs.length} UR memories exchanged</span></div><p class="tiny">Trade ${MEMX_PRICE} Corals for a copy (0★) of any UR memory. Each memory can be exchanged once.</p>
      ${urs.length ? `<div class="mall-mems">${urs.map(m => { const used = memExUsed(m.id), art = artFrom(m.img), ok = !used && W.starlight >= MEMX_PRICE;
        return `<div class="mall-mem r5"><span class="mall-mem-art mem-fr mst0">${art ? `<img src="${art}" alt="">` : icon('memory')}</span>${rtag(5)}<span class="mall-skin-nm"><b>${esc(m.name)}</b><small>Owned ×${S.owned[m.id] || 0}</small></span>
          ${used ? '<button class="mall-buy" disabled>Exchanged</button>' : `<button class="mall-buy ${ok ? 'ok' : ''}" data-memx="${esc(m.id)}">${curIcon('starlight')}${fmt(MEMX_PRICE)}</button>`}</div>`; }).join('')}</div>`
        : '<p class="mall-empty">No UR memories in the game yet.</p>'}`; }
  else if (shopTab === 'exchange' && exSub === 'premium') { const chars = S.pool.filter(e => e.type === 'character' && +e.rarity === 5 && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    const usedN = chars.filter(e => premUsed(e.id)).length;
    body = `<div class="mall-limit"><b>Limit: ${PREM_LIMIT} per character per month</b><span>${usedN ? `${usedN} character${usedN === 1 ? '' : 's'} exchanged this month · ` : ''}resets on the 1st (${nextMonthIn()})</span></div><p class="tiny">Trade ${PREM_PRICE} Corals for one more copy of a UR character you own: it adds a star, up to ${MAX_STARS}.</p>
      ${chars.length ? `<div class="mall-skins">${chars.map(e => { const st = starsOf(e.id), max = st >= MAX_STARS, used = premUsed(e.id), ok = !used && !max && W.starlight >= PREM_PRICE;
        return `<div class="mall-skin r${e.rarity}"><img src="${getArt(e)}" alt="" ${mediaArt(e) ? `style="${cardImgStyle(e)}"` : ''}>${rtag(e.rarity)}<span class="mall-skin-nm"><b>${esc(e.name)}</b><small>${starRow(st, -1, e)}</small></span>
          ${max ? '<button class="mall-buy" disabled>Max stars</button>' : used ? '<button class="mall-buy" disabled>1/1 this month</button>' : `<button class="mall-buy ${ok ? 'ok' : ''}" data-prem="${esc(e.id)}">${curIcon('starlight')}${fmt(PREM_PRICE)}</button>`}</div>`; }).join('')}</div>`
        : '<p class="mall-empty">You don\'t own any UR characters yet.</p>'}`; }
  else body = `<p class="tiny">Every pull gives ${DUST_PER_PULL} Seaweeds, whatever you get.</p>
    <h3 class="mall-h">Monthly pulls</h3><p class="tiny">${MONTHLY_LIMIT} pulls per banner every month for ${MONTHLY_PRICE} Seaweeds each. Stock resets on the 1st (${nextMonthIn()}).</p>
    <div class="mall-grid">${['limited', 'standard'].map(bk => { const left = MONTHLY_LIMIT - m[bk];
      return item('mo-' + bk, TK(bk), `Monthly ${TK_NAME[TK(bk)]}`, `${left} / ${MONTHLY_LIMIT} left this month`, MONTHLY_PRICE, 'dust', left <= 0 ? 'soldout' : '', bk === 'limited' ? 5 : 4); }).join('')}</div>
    <h3 class="mall-h">Gifts</h3><p class="tiny">Tap one to choose how many to buy.</p>
    <div class="mall-grid">${Object.entries(DUST_GIFTS).map(([k, p], i) => item('dg-' + k, 'g' + k, GIFTS[k].name, `Gift · +${GIFTS[k].xp} bond · ${S.gifts[k]} in bag`, p, 'dust', '', 3 + i)).join('')}</div>`;
  shopEl.innerHTML = `<div class="mall-word">SHOP</div>
    <div class="mall-top"><div class="inv-title"><span class="inv-badge">${icon('shop')}</span><h2 class="ts">Shop</h2></div>
      <div class="inv-cur">${(shopTab === 'points' ? ['spt', 'sptp', 'pearls'] : shopTab === 'exchange' && exSub === 'frags' ? ['cfssr', 'cfur', 'pearls'] : ['pearls', 'starlight', 'dust']).map(k => `<div class="cur">${curIcon(k)}<b>${fmt(k === 'spt' ? PT_FEAT.reduce((a, b) => a + ptOf(b), 0) : k === 'sptp' ? ptOf('perm') : W[k] || 0)}</b></div>`).join('')}<button class="inv-x" id="shopClose" aria-label="Close">${icon('close')}</button></div></div>
    <aside class="mall-side">${SHOP_TABS.map(([k, ic, l]) => `<button class="evp-item ${k === shopTab ? 'on' : ''}" data-stab="${k}"><span class="evp-ic">${icon(ic)}</span><b>${l}</b>${k === 'topup' && packsReady() ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</aside>
    <section class="mall-main ${shopTab === 'hot' && hotSub === 'skins' ? 'hot' : ''} ${shopTab === 'hot' && hotSub === 'pass' ? 'passes' : ''}">${bg}<div class="mall-strip">${strip}</div><div class="mall-body">${body}</div></section>
    <p class="mall-foot">Please spend responsibly.</p>`;
  $('#shopClose').onclick = closeShop;
  shopEl.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { shopTab = b.dataset.stab; renderShop(); });
  shopEl.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { shopPick = b.dataset.pick; renderShop(); });
  shopEl.querySelectorAll('[data-hotsub]').forEach(b => b.onclick = () => { hotSub = b.dataset.hotsub; renderShop(); });
  shopEl.querySelectorAll('[data-pass]').forEach(b => b.onclick = () => confirmPass(b.dataset.pass));
  shopEl.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { buySkin(b.dataset.skin); renderShop(); });
  shopEl.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyShop(b.dataset.buy));
  shopEl.querySelectorAll('[data-topup]').forEach(b => b.onclick = () => { if (!TOPUP_FREE) return; const i = +b.dataset.topup, [n, usd] = TOPUP[i], bo = topupBonus(i);
    S.wallet.pearls += n + bo.n; if (bo.first) S.topupFirst = [...(S.topupFirst || []), i];
    const vx = Math.round(parseFloat(usd) * VIP_PER_USD); vipFromUsd(usd); persist(); renderMenu(); refreshSummon(); renderShop();
    showRewards('Top Up', { pearls: n + bo.n, vip: vx }, `${fmt(n)} pearls${bo.n ? ` + ${fmt(bo.n)} bonus (${bo.first ? 'first purchase ×2' : '+10%'})` : ''} · free while testing`); });
  shopEl.querySelectorAll('[data-topsub]').forEach(b => b.onclick = () => { topSub = b.dataset.topsub; renderShop(); });
  shopEl.querySelectorAll('[data-pack]').forEach(b => b.onclick = () => { const [k, id] = b.dataset.pack.split('|'); buyPack(k, id); });
  shopEl.querySelectorAll('[data-exsub]').forEach(b => b.onclick = () => { exSub = b.dataset.exsub; renderShop(); });
  shopEl.querySelectorAll('[data-frag]').forEach(b => b.onclick = () => fragBuy(b.dataset.frag));
  shopEl.querySelectorAll('[data-ptbuy]').forEach(b => b.onclick = () => { const [src, id] = b.dataset.ptbuy.split('|'); confirmPtBuy(src, id); });
  shopEl.querySelectorAll('[data-prem]').forEach(b => b.onclick = () => confirmPrem(b.dataset.prem));
  shopEl.querySelectorAll('[data-memx]').forEach(b => b.onclick = () => confirmMemEx(b.dataset.memx));
}
/* Shop → Summon Points: a featured banner's page (its featured UR / outfit for PT_PRICE of that banner's points) or the
   Permanent shop (3 UR characters + 3 UR memories this month, 1 of each per month) */
function ptCard(e, src, done) {
  const P = ptOf(src), ok = !done && P >= PT_PRICE, mem = e.type === 'memory', m = mem && memOf(e.id);
  const pic = mem ? `<span class="mall-mem-art mem-fr mst0">${artFrom(m.img) ? `<img src="${artFrom(m.img)}" alt="">` : icon('memory')}</span>` : `<img src="${baseCard(e)}" alt="" ${baseArt(e) ? `style="${cardImgStyle(e, 'base')}"` : ''}>`;
  const sub = mem ? `Owned ×${S.owned[e.id] || 0}` : e.type === 'skin' ? (owns(e.id) ? 'Owned' : (findEntry(e.parent) || {}).name || 'Outfit') : owns(e.id) ? starRow(starsOf(e.id), -1, e) : 'Not owned yet';
  return `<div class="${mem ? 'mall-mem' : 'mall-skin'} r${e.rarity}">${pic}${rtag(e.rarity)}<span class="mall-skin-nm"><b>${esc(e.name)}</b><small>${sub}</small></span>
    ${done ? `<button class="mall-buy" disabled>${src === 'perm' ? '1/1 this month' : 'Owned'}</button>` : `<button class="mall-buy ${ok ? 'ok' : ''}" data-ptbuy="${src}|${esc(e.id)}">${curIcon(src === 'perm' ? 'sptp' : 'spt')}${fmt(PT_PRICE)}</button>`}</div>`;
}
function ptShopHTML() {
  const P = ptState(), { chars, mems } = permShopPicks(), got = id => P.buy.ids.includes(id);
  const head = (name, k, n, note) => `<h3 class="mall-h pt-h">${name}<span class="pt-bal">${curIcon(k)}${fmt(n)}</span><small>${note}</small></h3>`;
  const ban = bk => { const B = bannerInfo(bk), f = B.feat, what = bk === 'skins' ? 'outfit' : 'character';
    return `${head(`${esc(bannerName(bk))}${f ? ` · ${esc(f.name)}` : ''}`, 'spt', ptOf(bk), `1 point per pull here · ${PT_PRICE} = 1 copy`)}
      ${f ? `<div class="mall-skins">${ptCard(f, bk, bk === 'skins' && owns(f.id))}</div>` : `<p class="tiny">No featured ${what} right now: pulls here give Permanent points.</p>`}`; };
  return `${PT_FEAT.map(ban).join('')}
    ${head('Permanent', 'sptp', P.perm, `Permanent and Memory pulls + leftover banner points · new picks on the 1st (${nextMonthIn()}) · 1 of each per month`)}
    ${chars.length ? `<div class="mall-skins">${chars.map(e => ptCard(e, 'perm', got(e.id))).join('')}</div>` : '<p class="tiny">No UR characters in the game yet.</p>'}
    ${mems.length ? `<div class="mall-mems">${mems.map(e => ptCard(e, 'perm', got(e.id))).join('')}</div>` : '<p class="tiny">No UR memories in the game yet.</p>'}`;
}
/* Exchange → Fragments: 60 for a random character of that rarity, 120 for one you choose */
function fragShopHTML() {
  const W = S.wallet, row = (r, k, lbl) => { const have = W[k] || 0, n = fragChars(r).length;
    return `<h3 class="mall-h pt-h">${lbl} character fragments<span class="pt-bal">${curIcon(k)}${fmt(have)}</span><small>${n} ${lbl} character${n === 1 ? '' : 's'} in the game</small></h3>
      <div class="mall-grid">
        <div class="mall-item"><span class="mall-ic r${r}">${curIcon(k)}</span><b>Random ${lbl} character</b><span class="tiny">One copy of a random ${lbl} character</span><button class="mall-buy ${have >= CF_RANDOM && n ? 'ok' : ''}" data-frag="${k}|rand">${curIcon(k)}${CF_RANDOM}</button></div>
        <div class="mall-item"><span class="mall-ic r${r}">${curIcon(k)}</span><b>Choose a ${lbl} character</b><span class="tiny">One copy of the ${lbl} character you pick</span><button class="mall-buy ${have >= CF_PICK && n ? 'ok' : ''}" data-frag="${k}|pick">${curIcon(k)}${CF_PICK}</button></div>
      </div>`; };
  return `<p class="tiny">Every summon drops character fragments (at least 1 UR and 2 SSR on every ×10).</p>${row(5, 'cfur', 'UR')}${row(4, 'cfssr', 'SSR')}`;
}
function fragBuy(code) {
  const [k, how] = code.split('|'), r = k === 'cfur' ? 5 : 4, lbl = r === 5 ? 'UR' : 'SSR', cost = how === 'pick' ? CF_PICK : CF_RANDOM, list = fragChars(r);
  if (!list.length) { toast(`There are no ${lbl} characters yet.`); return; }
  if ((S.wallet[k] || 0) < cost) { toast(`You need ${cost} ${lbl} fragments. You have ${fmt(S.wallet[k] || 0)}.`); return; }
  if (how === 'pick') return openCharPicker({ title: `Choose a ${lbl} character`, note: `${CF_PICK} ${lbl} fragments for one copy of the character you pick.`, list, btn: `${curIcon(k)}${CF_PICK}`, onPick: e => { if ((S.wallet[k] || 0) < cost) return; S.wallet[k] -= cost; giftChar(e); } });
  openModal({ title: 'Fragment exchange', ic: 'shop', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${CF_RANDOM} ${lbl} fragments</b> on a random ${lbl} character?</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="fgNo">Cancel</button><button class="btn gold" id="fgYes">Exchange · ${curIcon(k)}${CF_RANDOM}</button></div></div>`,
    onMount: () => { $('#fgNo').onclick = closeModal; $('#fgYes').onclick = () => { if ((S.wallet[k] || 0) < cost) return; closeModal(); S.wallet[k] -= cost; giftChar(rpick(list)); }; } });
}
function confirmPtBuy(src, id) {
  const e = findEntry(id), P = ptState(); if (!e) return;
  const have = src === 'perm' ? P.perm : (P[src] || {}).n || 0;
  if (src === 'perm' && P.buy.ids.includes(id)) { toast(`You already got ${e.name} this month.`); return; }
  if (e.type === 'skin' && owns(id)) { toast(`You already own ${e.name}.`); return; }
  if (have < PT_PRICE) { toast(`You need ${PT_PRICE} points. You have ${fmt(have)}.`); return; }
  openModal({ title: 'Summon points', ic: 'star', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${PT_PRICE} ${src === 'perm' ? 'Permanent' : esc(bannerName(src))} points</b> on a copy of <b>${esc(e.name)}</b>?${src === 'perm' ? ' You can get each one once this month.' : ''}</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="ptNo">Cancel</button><button class="btn gold" id="ptYes">Exchange · ${curIcon('spt')}${PT_PRICE}</button></div></div>`,
    onMount: () => { $('#ptNo').onclick = closeModal; $('#ptYes').onclick = () => {
      closeModal(); if (src === 'perm') { P.perm -= PT_PRICE; P.buy.ids.push(id); } else P[src].n -= PT_PRICE;
      const res = { kind: 'entry', id, rarity: +e.rarity, ...grantEntry(e) };
      if (e.type === 'character') { res.starlight = (res.maxed ? STARLIGHT_MAX : STARLIGHT)[+e.rarity] || 0; S.wallet.starlight += res.starlight; }
      persist(); renderMenu(); refreshCharacters(); refreshSummon(); renderShop();
      showPull([res], 1, src === 'perm' ? 'standard' : src, { preview: true, exchange: true, direct: true }); }; } });
}
function confirmMemEx(id) {
  const m = memOf(id); if (!m || +m.rarity !== 5) return;
  if (memExUsed(id)) { toast(`You already exchanged for ${m.name}. Each memory can be exchanged once.`); return; }
  if (S.wallet.starlight < MEMX_PRICE) { toast(`You need ${MEMX_PRICE} Corals. You have ${fmt(S.wallet.starlight)}.`); return; }
  openModal({ title: 'Memory exchange', ic: 'memory', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${MEMX_PRICE} Corals</b> on a copy of <b>${esc(m.name)}</b>? You can do this once for each memory.</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="mxNo">Cancel</button><button class="btn gold" id="mxYes">Exchange · ${curIcon('starlight')}${MEMX_PRICE}</button></div></div>`,
    onMount: () => { $('#mxNo').onclick = closeModal; $('#mxYes').onclick = () => {
      closeModal(); const isNew = !S.owned[id]; S.wallet.starlight -= MEMX_PRICE; S.memEx = [...(S.memEx || []), id]; S.owned[id] = (S.owned[id] || 0) + 1;
      persist(); renderMenu(); refreshCharacters(); renderShop();
      showPull([{ kind: 'entry', id, rarity: 5, isNew, starUp: 0, maxed: !isNew }], 1, 'memories', { preview: true, exchange: true, direct: true }); }; } });
}
function confirmPrem(id) {
  const e = findEntry(id); if (!e || !owns(id) || +e.rarity !== 5) return;
  if (premUsed(id)) { toast(`You already exchanged for ${e.name} this month. Every character can be exchanged once a month.`); return; }
  if (starsOf(id) >= MAX_STARS) { toast(`${e.name} is already at max stars.`); return; }
  if (S.wallet.starlight < PREM_PRICE) { toast(`You need ${PREM_PRICE} Corals. You have ${fmt(S.wallet.starlight)}.`); return; }
  openModal({ title: 'Premium exchange', ic: 'shop', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${PREM_PRICE} Corals</b> on a copy of <b>${esc(e.name)}</b>? It will go from ${starsOf(id)}★ to ${starsOf(id) + 1}★. You can do this once a month for each character.</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="prNo">Cancel</button><button class="btn gold" id="prYes">Exchange · ${curIcon('starlight')}${PREM_PRICE}</button></div></div>`,
    onMount: () => { $('#prNo').onclick = closeModal; $('#prYes').onclick = () => {
      closeModal(); S.wallet.starlight -= PREM_PRICE; premEx().ids.push(id); grantEntry(e); persist(); renderMenu(); refreshCharacters(); renderShop();
      toast(`${e.name} is now ${starsOf(id)}★.`); }; } });
}
function buyShop(id) {
  const W = S.wallet, pay = (cur, n) => { if (W[cur] < n) { toast(`Not enough ${cur === 'dust' ? 'Seaweeds' : 'Corals'}. You need ${fmt(n)}.`); return false; } W[cur] -= n; return true; };
  let msg;
  if (id.startsWith('st-')) { const k = id.slice(3); if (!pay('starlight', SHOP_TICKET)) return; W[k]++; msg = `Bought 1 ${TK_NAME[k].toLowerCase()}.`; }
  else if (id.startsWith('dg-')) { openBuyGifts(id.slice(3), 'dust'); return; }   // pick how many
  else if (id.startsWith('pt-')) { const k = id.slice(3); if (W.pearls < TICKET_PEARLS) { toast(`A ticket costs ${TICKET_PEARLS} pearls. You have ${fmt(W.pearls)}.`); return; } W.pearls -= TICKET_PEARLS; W[k]++; msg = `Bought 1 ${TK_NAME[k].toLowerCase()}.`; }
  else if (id === 'pn-name') { if (W.pearls < NAMETK_PEARLS) { toast(`A name change ticket costs ${NAMETK_PEARLS} pearls. You have ${fmt(W.pearls)}.`); return; } W.pearls -= NAMETK_PEARLS; W.nametk = (W.nametk || 0) + 1; msg = 'Bought 1 name change ticket.'; }
  else if (id === 'sn-name') { if (!pay('starlight', NAMETK_CORALS)) return; W.nametk = (W.nametk || 0) + 1; msg = 'Bought 1 name change ticket.'; }
  else if (id === 'pr-ring') { if (W.pearls < RING_PRICE) { toast(`A ring costs ${RING_PRICE} pearls. You have ${fmt(W.pearls)}.`); return; } W.pearls -= RING_PRICE; W.rings++; msg = 'Bought 1 marriage ring.'; }
  else if (id.startsWith('mo-')) { const bk = id.slice(3), m = monthly(); if (m[bk] >= MONTHLY_LIMIT) return; if (!pay('dust', MONTHLY_PRICE)) return; m[bk]++; W[TK(bk)]++; msg = `Bought 1 monthly ${TK_NAME[TK(bk)].toLowerCase()}.`; }
  persist(); renderMenu(); refreshSummon(); renderShop(); toast(msg);
}

/* ---------- achievements: each pays 1 pearl once ---------- */
const ACH_PEARLS = 1;
const ownedOf = t => S.pool.filter(e => e.type === t && owns(e.id));
const totalPulls = () => S.gacha.limited.total + S.gacha.standard.total;
const ACH = [
  { id: 'pull1', name: 'First Wish', desc: 'Summon once', n: () => totalPulls(), goal: 1 },
  { id: 'pull100', name: 'Star Gazer', desc: 'Summon 100 times', n: () => totalPulls(), goal: 100 },
  { id: 'char1', name: 'New Friend', desc: 'Own a character', n: () => ownedOf('character').length, goal: 1 },
  { id: 'char3', name: 'Growing Circle', desc: 'Own 3 characters', n: () => ownedOf('character').length, goal: 3 },
  { id: 'ur', name: 'Lucky Star', desc: 'Own a UR character', n: () => ownedOf('character').filter(e => e.rarity === 5).length, goal: 1 },
  { id: 'star6', name: 'Shining Bright', desc: `Raise a character to ${MAX_STARS} stars`, n: () => Math.max(0, ...ownedOf('character').map(e => starsOf(e.id))), goal: MAX_STARS },
  { id: 'pet', name: 'Egg Whisperer', desc: 'Hatch a pet', n: () => ownedOf('pet').length, goal: 1 },
  { id: 'skin', name: 'Fashionista', desc: 'Own a skin', n: () => ownedOf('skin').length, goal: 1 },
  { id: 'bond5', name: 'Heart to Heart', desc: 'Reach bond level 5 with anyone', n: () => Math.max(0, ...S.pool.filter(e => e.type === 'character').map(e => bondLv(e.id))), goal: 5 },
  { id: 'spin', name: 'Wheel of Fortune', desc: 'Spin the daily wheel', n: () => S.spin.last ? 1 : 0, goal: 1 }
].map(a => ({ ...a, ok: () => a.n() >= a.goal }));
function openAch() {
  openModal({ title: 'Achievements', ic: 'trophy', wide: true, kind: 'ach', body: '<div id="achRoot"></div>', onMount: renderAch });
}
function renderAch() {
  const root = $('#achRoot'); if (!root) return;
  const done = S.ach.length, ready = ACH.filter(a => a.ok() && !S.ach.includes(a.id));
  root.innerHTML = `<div class="stack">
    <div class="balance"><span>${done} / ${ACH.length} achievements</span><b>${ready.length ? `<button class="btn gold sm" id="achAll">Claim all · ${costHTML(ready.length * ACH_PEARLS)}</button>` : `${curIcon('pearls')}${ACH_PEARLS} each`}</b></div>
    <div class="ach-list">${ACH.map(a => { const got = S.ach.includes(a.id), ok = a.ok(), v = Math.min(a.goal, a.n());
      return `<div class="ach ${got ? 'got' : ok ? 'ready' : ''}"><span class="ach-ic">${icon(got ? 'check' : 'trophy')}</span>
        <div style="display:grid;gap:3px;min-width:0"><b>${esc(a.name)}</b><span class="tiny">${esc(a.desc)}</span><span class="bar"><i style="width:${v / a.goal * 100}%"></i></span><span class="tiny">${fmt(v)} / ${fmt(a.goal)}</span>${got ? '' : expTag(EXP.ach)}</div>
        ${got ? '<span class="chip">Done</span>' : `<button class="btn sm ${ok ? 'gold' : 'ghost'}" data-ach="${a.id}" ${ok ? '' : 'disabled'}>${costHTML(ACH_PEARLS)}</button>`}</div>`; }).join('')}</div></div>`;
  const claim = ids => { ids.forEach(id => { if (!S.ach.includes(id)) { S.ach.push(id); S.wallet.pearls += ACH_PEARLS; gainExp(EXP.ach); } }); persist(); renderMenu(); renderAch(); toast(`+${ids.length * ACH_PEARLS} pearl${ids.length * ACH_PEARLS === 1 ? '' : 's'}`); };
  root.querySelectorAll('[data-ach]').forEach(b => b.onclick = () => claim([b.dataset.ach]));
  const all = $('#achAll'); if (all) all.onclick = () => claim(ready.map(a => a.id));
}

/* ---------- redeem codes ---------- */
const CODES = { TESTBLANK: { pearls: 30 }, REGELEBYORU: { pearls: 2000 } };
function openRedeem() {
  openModal({ title: 'Redeem code', ic: 'gift', body: `<form class="form" id="rdForm">
    <p class="desc">Enter a gift code to claim its rewards. Each code works once per account.</p>
    <label class="field"><span>Code</span><input class="input" id="rdIn" maxlength="24" autocomplete="off" placeholder="e.g. TESTBLANK" style="text-transform:uppercase;letter-spacing:.12em"></label>
    <div class="row" style="justify-content:space-between"><span class="err" id="rdErr" hidden></span><button class="btn gold" type="submit" style="margin-left:auto">Redeem</button></div>
  </form>`, onMount: () => {
    const inp = $('#rdIn'); inp.focus();
    $('#rdForm').onsubmit = e => {
      e.preventDefault();
      const code = inp.value.trim().toUpperCase(), err = $('#rdErr'), r = CODES[code];
      const fail = m => { err.textContent = m; err.hidden = false; };
      if (!code) return fail('Type a code first.');
      if (!r) return fail("That code doesn't exist or has expired.");
      if (S.redeemed.includes(code)) return fail('You already redeemed this code.');
      // the rewards arrive as a letter in Mail
      S.redeemed.push(code);
      sendMail({ id: 'code-' + code, from: 'Plaza Team', title: `Gift code: ${code}`, body: `Thank you for redeeming the gift code ${code}!\nYour rewards are attached to this letter. Claim them whenever you like.`, reward: { ...r } });
      persist(); renderMenu(); closeModal();
      toast('Code redeemed! Your rewards were sent to your mail.');
    };
  } });
}
