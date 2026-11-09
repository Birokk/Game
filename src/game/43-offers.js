/* ---------- Special offers (admin → Offers): the First Top-Up and any offer the admin makes ----------
   Content S.offers = [{id, name, active, kind: 'newbie' (N days after the account is created) | 'dated' (start–end dates) |
   'always', days, start, end, usd, limit (purchases per account), char (featured character), items: [{k, n} | {k: 'char'|'skin', id}]}].
   Each offer has an editable wallpaper (media key offer:bg:<id>) and a character PNG cutout (offer:png:<id>) that stands on
   the left of the popup and breaks out over the top of the rectangle. The first time, the First Top-Up is created from the
   old settings (id 'ftu': the admin's UR, 240 stamina, 10 Standard tickets, 7 days, $4.99).
   Players see live offers as a small popup (openOffer, .ofp: wallpaper, cutout, name, time left, rewards, price; arrows when
   several are live), a home icon (#hmOffer, the first live offer's name and time left) and banners in Top Up → Pearls.
   While TOPUP_FREE the price button is a free test that still gives VIP EXP. Player state S.offerBought {offerId: count};
   the 'newbie' clock starts at S.account.since (older saves: the first time they see an offer, S.ftuStart). */
const OFFER_KEYS = ['pearls', 'tickets', 'wishes', 'coins', 'stamina', 'bottles', 'dust', 'starlight', 'cfssr', 'cfur', 'fragssr', 'fragur', 'eggur', 'memtk', 'nametk', 'ursel', 'exp', 'gpts', 'gplush'];
const OFFER_KINDS = [['newbie', 'New players (days after the account is made)'], ['dated', 'Between two dates'], ['always', 'Always on']];
REW_NAMES.stamina = REW_NAMES.stamina || ['stamina', 'stamina']; REW_R.stamina = REW_R.stamina || 4;
function offerList() {
  if (!Array.isArray(S.offers)) {   // first run: turn the old First Top-Up settings into the first offer
    const f = (S.banners && S.banners.ftu) || {}, ur = S.pool.find(e => e.id === f.char) || S.pool.find(e => e.type === 'character' && +e.rarity === 5 && !e.mc && /pirate/i.test(e.name)) || S.pool.find(e => e.type === 'character' && +e.rarity === 5 && !e.mc);
    S.offers = [{ id: 'ftu', name: 'First Top-Up', active: true, kind: 'newbie', days: 7, usd: parseFloat(f.usd) || 4.99, limit: 1, char: ur ? ur.id : null,
      items: [...(ur ? [{ k: 'char', id: ur.id }] : []), { k: 'stamina', n: 240 }, { k: 'wishes', n: 10 }] }];
  }
  return S.offers;
}
const offerOf = id => offerList().find(o => o.id === id);
function newbieStart() {
  const since = S.account && S.account.since;
  if (!S.ftuStart) { S.ftuStart = since || Date.now(); persist(); }
  return since ? Math.min(S.ftuStart, since) : S.ftuStart;
}
const offerDay = s => s ? new Date(s + 'T00:00:00').getTime() : null;
const offerStart = o => o.kind === 'newbie' ? newbieStart() : o.kind === 'dated' ? offerDay(o.start) : 0;
const offerEnds = o => o.kind === 'newbie' ? newbieStart() + clamp(+o.days || 7, 1, 365) * 864e5 : o.kind === 'dated' && o.end ? offerDay(o.end) + 864e5 - 1 : null;
function offerBoughtN(o) {
  S.offerBought = S.offerBought || {};
  if (o.id === 'ftu' && S.ftu && S.ftu.bought && !S.offerBought.ftu) S.offerBought.ftu = 1;   // bought before offers existed
  return S.offerBought[o.id] || 0;
}
const offerLimit = o => clamp(Math.floor(+o.limit) || 1, 1, 99);
function offerLive(o) {
  if (!o || o.active === false || !(o.items || []).length || offerBoughtN(o) >= offerLimit(o)) return false;
  const t = Date.now(), a = offerStart(o), b = offerEnds(o);
  return (!a || a <= t) && (!b || b > t);
}
const liveOffers = () => offerList().filter(offerLive);
const offerUsd = o => { const v = parseFloat(o.usd); return Number.isFinite(v) && v > 0 ? v : 4.99; };
const offerLeftTxt = o => { const b = offerEnds(o); if (!b) return 'Always on'; const s = Math.max(0, b - Date.now()) / 1000, d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : `${h}h ${m}m`; };
const offerItemEntry = it => (it.k === 'char' || it.k === 'skin') && it.id ? findEntry(it.id) : null;
const offerChar = o => findEntry(o.char) || (o.items || []).map(offerItemEntry).find(Boolean) || null;
/* one reward as a small card */
function offerItemHTML(it) {
  const e = offerItemEntry(it);
  // a character or outfit: its round icon like the profile tab's (the owner asked for this instead of the whole picture), rarity tag bottom right
  if (it.k === 'char' || it.k === 'skin') return e ? `<span class="ofp-it ent"><span class="ofp-face"><span class="ofp-fc r${e.rarity}">${baseThumb(e)}</span><span class="ofp-rt">${rtag(e.rarity)}</span></span><b>${esc(e.name)}</b>${it.k === 'skin' ? '<small>Outfit</small>' : ''}</span>` : '';
  const n = +it.n || 0; if (!n || !OFFER_KEYS.includes(it.k)) return '';
  return `<span class="ofp-it"><span class="inv-cell r${REW_R[it.k] || 4}"><span class="inv-pic">${curIcon(it.k)}</span></span><b>${fmt(n)}</b><small>${(REW_NAMES[it.k] || [it.k, it.k])[n === 1 ? 0 : 1]}</small></span>`;
}
function buyOffer(id) {
  const o = offerOf(id); if (!offerLive(o)) return;
  if (!TOPUP_FREE) { toast('Real payments aren\'t connected yet.'); return; }
  S.offerBought = S.offerBought || {}; S.offerBought[o.id] = offerBoughtN(o) + 1;
  const got = {}, ents = [];
  (o.items || []).forEach(it => {
    const e = offerItemEntry(it); if (e) { ents.push(e); return; }
    const n = +it.n || 0; if (!n || !OFFER_KEYS.includes(it.k)) return;
    if (it.k === 'stamina') got.stamina = (got.stamina || 0) + giveStamina(n);
    else if (it.k === 'exp') { gainExp(n); got.exp = (got.exp || 0) + n; }
    else { guildGrant({ [it.k]: n }); got[it.k] = (got[it.k] || 0) + n; }
  });
  vipFromUsd(offerUsd(o)); got.vip = Math.round(offerUsd(o) * VIP_PER_USD);
  closeOffer(); persist(); renderMenu(); refreshSummon(); if (typeof renderShop === 'function') renderShop();
  if (!ents.length) { showRewards(o.name, got, `$${offerUsd(o).toFixed(2)}${TOPUP_FREE ? ' · free while testing' : ''}`); return; }
  toast(`${o.name}: ${Object.entries(got).map(([k, n]) => `+${fmt(n)} ${(REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1]}`).join(', ')}.`);
  const res = ents.map(e => { const r = { kind: 'entry', id: e.id, rarity: +e.rarity, lost: false, hard: true, ...grantEntry(e) }; if (e.type === 'character') { r.starlight = (r.maxed ? STARLIGHT_MAX : STARLIGHT)[+e.rarity] || 0; S.wallet.starlight += r.starlight; } return r; });
  persist(); refreshCharacters();
  showPull(res, res.length, 'standard', { preview: true, exchange: true, direct: true });
}

/* ---------- the popup: a small rectangle with the wallpaper, the cutout breaking out of it on the left, and the offer ---------- */
let ofpEl = null;
function closeOffer() { if (ofpEl) { ofpEl.remove(); ofpEl = null; } }
function openOffer(id, preview) {
  const list = preview ? [offerOf(id)].filter(Boolean) : liveOffers();
  if (!list.length) { toast('There are no special offers right now.'); return; }
  let i = Math.max(0, list.findIndex(o => o.id === id));
  closeOffer();
  ofpEl = document.createElement('div'); ofpEl.className = 'ofp'; ofpEl.setAttribute('role', 'dialog');
  const draw = () => {
    const o = list[i], c = offerChar(o), bg = MEDIA.get('offer:bg:' + o.id), png = MEDIA.get('offer:png:' + o.id), left = offerLimit(o) - offerBoughtN(o);
    ofpEl.setAttribute('aria-label', o.name);
    ofpEl.innerHTML = `<div class="ofp-box ${png ? 'cut' : ''}">
        <div class="ofp-bg">${bg ? `<img src="${bg}" alt="">` : ''}</div>
        ${png ? `<img class="ofp-png" src="${png}" alt="">` : c ? `<span class="ofp-art r${c.rarity}"><img src="${baseCard(c)}" alt="" ${baseArt(c) ? `style="${cardImgStyle(c, 'base')}"` : ''}></span>` : ''}
        <button class="ofp-x" data-ofx aria-label="Close">${icon('close')}</button>
        <div class="ofp-info">
          <h2 class="ofp-name">${esc(o.name)}</h2>
          <span class="ofp-time">${icon('clock')}${offerEnds(o) ? `Ends in ${offerLeftTxt(o)}` : 'Always on'}${offerLimit(o) > 1 ? ` · ${left} left` : ''}</span>
          <div class="ofp-items">${(o.items || []).map(offerItemHTML).join('')}</div>
          <div class="ofp-buyrow">${saleTag(offerUsd(o), 'ofp-sale')}<button class="btn gold ofp-buy sale-btn" data-ofbuy ${preview ? 'disabled' : ''}>${salePrice(offerUsd(o))}${preview ? '<small>Preview</small>' : TOPUP_FREE ? '<small>Free test</small>' : ''}</button></div>
          <span class="ofp-vip">+${fmt(Math.round(offerUsd(o) * VIP_PER_USD))} VIP EXP</span>
        </div>
        ${list.length > 1 ? `<div class="ofp-nav"><button data-ofnav="-1" aria-label="Previous offer">${icon('back')}</button>${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}<button data-ofnav="1" aria-label="Next offer">${icon('back')}</button></div>` : ''}
      </div>`;
    ofpEl.querySelectorAll('[data-ofx]').forEach(b => b.onclick = closeOffer);
    const by = ofpEl.querySelector('[data-ofbuy]'); if (by && !preview) by.onclick = () => buyOffer(o.id);
    ofpEl.querySelectorAll('[data-ofnav]').forEach(b => b.onclick = () => { i = (i + +b.dataset.ofnav + list.length) % list.length; draw(); });
  };
  draw();
  ofpEl.addEventListener('click', e => { if (e.target === ofpEl) closeOffer(); });
  document.body.appendChild(ofpEl);
}
/* banners for every live offer, under the VIP bar in Top Up → Pearls */
function offerShopBanners() {
  return liveOffers().map(o => { const c = offerChar(o), png = MEDIA.get('offer:png:' + o.id), art = png || (c && baseArt(c));
    const names = (o.items || []).map(it => { const e = offerItemEntry(it); return e ? `${RNAME[e.rarity] || ''} ${e.name}`.trim() : +it.n ? `${fmt(+it.n)} ${(REW_NAMES[it.k] || [it.k, it.k])[+it.n === 1 ? 0 : 1]}` : ''; }).filter(Boolean).join(' · ');
    return `<button class="ftu-ban" data-open="offer" data-offer="${esc(o.id)}">${art ? `<img src="${art}" alt="" class="${png ? 'png' : ''}">` : ''}<span class="ftu-ban-t"><b>${esc(o.name)}</b><small>${esc(names)}</small></span><span class="ftu-ban-r"><em>${icon('clock')}${offerLeftTxt(o)}</em><span class="ftu-ban-p">${saleTag(offerUsd(o), 'ban-sale')}${salePrice(offerUsd(o))}</span></span></button>`; }).join('');
}

/* ---------- admin → Offers: the special offer maker ---------- */
let offDelArm = null;
function renderOffersTab() {
  const p = $('#adPanel'); if (!p) return;
  const list = offerList(), chars = S.pool.filter(e => e.type === 'character' && !e.mc), skins = S.pool.filter(e => e.type === 'skin');
  const itemRow = (o, it, j) => `<div class="of-it">
      <select class="input" data-ofik="${j}" data-ofid="${esc(o.id)}">${OFFER_KEYS.map(k => `<option value="${k}" ${it.k === k ? 'selected' : ''}>${(REW_NAMES[k] || [k, k])[1]}</option>`).join('')}<option value="char" ${it.k === 'char' ? 'selected' : ''}>Character</option><option value="skin" ${it.k === 'skin' ? 'selected' : ''}>Outfit</option></select>
      ${it.k === 'char' || it.k === 'skin' ? `<select class="input" data-ofie="${j}" data-ofid="${esc(o.id)}"><option value="">Pick one</option>${(it.k === 'char' ? chars : skins).map(e => `<option value="${esc(e.id)}" ${it.id === e.id ? 'selected' : ''}>${RNAME[e.rarity] || ''} · ${esc(e.name)}</option>`).join('')}</select>`
        : `<input class="input" type="number" min="1" max="999999" data-ofin="${j}" data-ofid="${esc(o.id)}" value="${+it.n || 1}">`}
      <button class="iconbtn" data-ofidel="${j}" data-ofid="${esc(o.id)}" aria-label="Remove">${icon('close')}</button></div>`;
  p.innerHTML = `<div class="stack">
    <div class="ad-head" style="margin:0"><h3>Special offers</h3><button class="btn mint sm" id="ofAdd">${icon('plus')}New offer</button></div>
    <p class="tiny">Offers appear to players as a small popup (home "Offers" icon) and as banners in Top Up → Pearls while they are on. Upload a wallpaper for the popup and a PNG of the character with a transparent background: it stands on the left and comes out over the top of the box.</p>
    ${list.map(o => { const bg = MEDIA.get('offer:bg:' + o.id), png = MEDIA.get('offer:png:' + o.id), live = offerLive(o);
      return `<div class="of-ad">
        <div class="of-prev">${bg ? `<img src="${bg}" alt="" class="of-pbg">` : '<span class="of-pbg none"></span>'}${png ? `<img src="${png}" alt="" class="of-ppng">` : ''}<span class="of-state ${live ? 'on' : ''}">${o.active === false ? 'Off' : live ? 'Live now' : 'Not live'}</span></div>
        <div class="stack" style="gap:8px;min-width:0">
          <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input class="input" data-off="name" data-ofid="${esc(o.id)}" maxlength="40" value="${esc(o.name || '')}" placeholder="Offer name" style="flex:1;min-width:180px">
            <label class="row tiny" style="gap:6px;align-items:center"><input type="checkbox" data-ofact data-ofid="${esc(o.id)}" ${o.active === false ? '' : 'checked'}>Active</label></div>
          <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
            <label class="tiny">When <select class="input" data-off="kind" data-ofid="${esc(o.id)}">${OFFER_KINDS.map(([k, l]) => `<option value="${k}" ${o.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            ${o.kind === 'newbie' ? `<label class="tiny">Days <input class="input" type="number" min="1" max="365" data-off="days" data-ofid="${esc(o.id)}" value="${+o.days || 7}" style="width:80px"></label>` : ''}
            ${o.kind === 'dated' ? `<label class="tiny">Starts <input class="input" type="date" data-off="start" data-ofid="${esc(o.id)}" value="${esc(o.start || '')}"></label><label class="tiny">Ends <input class="input" type="date" data-off="end" data-ofid="${esc(o.id)}" value="${esc(o.end || '')}"></label>` : ''}
            <label class="tiny">Price (USD) <input class="input" type="number" min="0.99" step="0.01" data-off="usd" data-ofid="${esc(o.id)}" value="${offerUsd(o).toFixed(2)}" style="width:100px"></label>
            <label class="tiny">Buys per account <input class="input" type="number" min="1" max="99" data-off="limit" data-ofid="${esc(o.id)}" value="${offerLimit(o)}" style="width:80px"></label>
            <label class="tiny">Character shown <select class="input" data-off="char" data-ofid="${esc(o.id)}"><option value="">From the rewards</option>${chars.map(e => `<option value="${esc(e.id)}" ${o.char === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label></div>
          <span class="lbl-sm">Rewards</span>
          <div class="of-items">${(o.items || []).map((it, j) => itemRow(o, it, j)).join('')}<button class="btn ghost sm" data-ofiadd="${esc(o.id)}">${icon('plus')}Add a reward</button></div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <label class="btn mint sm">${icon('upload')}${bg ? 'Replace' : 'Upload'} wallpaper<input type="file" accept="image/*" class="sr" data-ofbg="${esc(o.id)}"></label>${bg ? `<button class="btn ghost sm" data-ofbgdel="${esc(o.id)}">Remove wallpaper</button>` : ''}
            <label class="btn mint sm">${icon('upload')}${png ? 'Replace' : 'Upload'} character PNG<input type="file" accept="image/png,image/webp,image/*" class="sr" data-ofpng="${esc(o.id)}"></label>${png ? `<button class="btn ghost sm" data-ofpngdel="${esc(o.id)}">Remove PNG</button>` : ''}
            <button class="btn ghost sm" data-ofprev="${esc(o.id)}">${icon('eye')}Preview</button>
            <button class="link" data-ofdel="${esc(o.id)}" style="color:${offDelArm === o.id ? '#ff6b81' : ''}">${offDelArm === o.id ? 'Tap again to delete' : 'Delete'}</button></div>
        </div></div>`; }).join('') || '<p class="tiny">No offers yet.</p>'}
  </div>`;
  const of = id => offerOf(id);
  p.querySelectorAll('[data-off]').forEach(i => i.onchange = () => { const o = of(i.dataset.ofid); if (!o) return; const f = i.dataset.off; let v = i.value;
    if (f === 'usd') v = Math.max(0.99, Math.round((parseFloat(v) || 4.99) * 100) / 100); else if (f === 'days') v = clamp(Math.floor(+v) || 7, 1, 365); else if (f === 'limit') v = clamp(Math.floor(+v) || 1, 1, 99); else v = v.trim ? v.trim() || null : v;
    o[f] = v; if (f === 'name' && !o.name) o.name = 'Special offer'; persist(); renderMenu(); if (f === 'kind') renderOffersTab(); });
  p.querySelectorAll('[data-ofact]').forEach(i => i.onchange = () => { const o = of(i.dataset.ofid); o.active = i.checked; persist(); renderMenu(); renderOffersTab(); });
  p.querySelectorAll('[data-ofik]').forEach(s => s.onchange = () => { const o = of(s.dataset.ofid), it = o.items[+s.dataset.ofik]; it.k = s.value; if (s.value === 'char' || s.value === 'skin') { delete it.n; it.id = null; } else { delete it.id; it.n = it.n || 1; } persist(); renderOffersTab(); });
  p.querySelectorAll('[data-ofie]').forEach(s => s.onchange = () => { const o = of(s.dataset.ofid); o.items[+s.dataset.ofie].id = s.value || null; persist(); });
  p.querySelectorAll('[data-ofin]').forEach(s => s.onchange = () => { const o = of(s.dataset.ofid), v = clamp(Math.floor(+s.value) || 1, 1, 999999); s.value = v; o.items[+s.dataset.ofin].n = v; persist(); });
  p.querySelectorAll('[data-ofidel]').forEach(b => b.onclick = () => { const o = of(b.dataset.ofid); o.items.splice(+b.dataset.ofidel, 1); persist(); renderOffersTab(); });
  p.querySelectorAll('[data-ofiadd]').forEach(b => b.onclick = () => { const o = of(b.dataset.ofiadd); o.items = [...(o.items || []), { k: 'pearls', n: 10 }]; persist(); renderOffersTab(); });
  p.querySelectorAll('[data-ofbg]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('offer:bg:' + i.dataset.ofbg, await resizeImage(ev.target.files[0], 1400, 'image/jpeg'))) { renderOffersTab(); toast('Offer wallpaper saved.'); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-ofbgdel]').forEach(b => b.onclick = async () => { await mediaDel('offer:bg:' + b.dataset.ofbgdel); renderOffersTab(); });
  p.querySelectorAll('[data-ofpng]').forEach(i => i.onchange = async ev => { try { if (await mediaSet('offer:png:' + i.dataset.ofpng, await resizeImage(ev.target.files[0], 1200, 'image/png'))) { renderOffersTab(); toast('Character PNG saved.'); } } catch (e) { toast(e.message, true); } });
  p.querySelectorAll('[data-ofpngdel]').forEach(b => b.onclick = async () => { await mediaDel('offer:png:' + b.dataset.ofpngdel); renderOffersTab(); });
  p.querySelectorAll('[data-ofprev]').forEach(b => b.onclick = () => openOffer(b.dataset.ofprev, true));
  p.querySelectorAll('[data-ofdel]').forEach(b => b.onclick = async () => { const id = b.dataset.ofdel; if (offDelArm !== id) { offDelArm = id; return renderOffersTab(); }
    offDelArm = null; await mediaDel('offer:bg:' + id); await mediaDel('offer:png:' + id); S.offers = offerList().filter(o => o.id !== id); persist(); renderMenu(); renderOffersTab(); toast('Offer deleted.'); });
  $('#ofAdd').onclick = () => { const t = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S.offers = [...offerList(), { id: `of-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name: 'Special offer', active: false, kind: 'dated', start: iso(t), end: iso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 7)), usd: 9.99, limit: 1, char: null, items: [{ k: 'pearls', n: 60 }, { k: 'tickets', n: 5 }] }];
    persist(); renderOffersTab(); toast('New offer added (off until you tick Active).'); };
}
