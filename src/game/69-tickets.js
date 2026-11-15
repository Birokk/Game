/* ---------- Skin tickets and instant clear tickets (the owner's ask) ----------
   Skin tickets (wallet sktk): buy any buyable outfit with them instead of pearls, by its rarity: 60 for SSR, 120 for UR
   (SKTK_COST). Only Pearl Honor gives them (the owner's rule): 5 on every 10th level of the free track (37-honor.js
   BP_MILES). buySkin opens a small window to choose how to pay.
   Instant clear tickets (wallet ictk): once the day's free instant clears are used, each extra instant clear uses one
   (23-raids.js raidUseClears). They work on every raid stage you got 3 stars on. From the Pearl Shop (2 pearls each),
   the Arena and Guild shops and special offers. */
const SKTK_COST = { 4: 60, 5: 120 };
const sktkCost = e => SKTK_COST[Math.max(4, Math.min(5, +(e && e.rarity) || 4))];
const ICTK_PEARLS = 2;
CUR_SVG.sktk = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sktkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9f4"/><stop offset=".5" stop-color="#ff8fcf"/><stop offset="1" stop-color="#b06bff"/></linearGradient></defs><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5z" fill="url(#sktkG)" stroke="#fff" stroke-width=".9"/><path d="M12 9.2l1 1.1h1.6l1.4 1.3-.9 1.2-.7-.5V16h-4.8v-3.7l-.7.5-.9-1.2 1.4-1.3H11z" fill="#fff" opacity=".95"/></svg>';
CUR_SVG.ictk = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="ictkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6f0ff"/><stop offset=".5" stop-color="#6fc3ff"/><stop offset="1" stop-color="#7a6bff"/></linearGradient></defs><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5z" fill="url(#ictkG)" stroke="#fff" stroke-width=".9"/><path d="M13.2 8.2L9.6 12.6h2.3l-1.1 3.4 3.6-4.5h-2.3z" fill="#fff"/></svg>';
REW_NAMES.sktk = ['skin ticket', 'skin tickets']; REW_R.sktk = 4;
REW_NAMES.ictk = ['instant clear ticket', 'instant clear tickets']; REW_R.ictk = 4;
OFFER_KEYS.push('ictk');   // skin tickets only come from Pearl Honor
AR_SHOP_POOL.push({ id: 'as-ic', got: { ictk: 2 }, price: 30, lim: 2, w: 1 });
GSHOP_POOL.push({ id: 'gs-ic', got: { ictk: 1 }, price: 12, lim: 2, w: 1 });
ADMIN_ART.sktk = () => adIconRow('sktk', 'Skin ticket icon', `Buys outfits instead of pearls: ${SKTK_COST[4]} for SSR, ${SKTK_COST[5]} for UR`);
ADMIN_ART.ictk = () => adIconRow('ictk', 'Instant clear ticket icon', 'One more raid instant clear after the free ones of the day (3★ stages)');
ADMIN_ART_SECS.icons.push('sktk', 'ictk');

/* the shop items */
{ const b0 = buyShop;
  buyShop = function (id) {
    const W = S.wallet, buy = (cur, n, k, m, what) => {
      if ((W[cur] || 0) < n) { toast(`Not enough pearls. You need ${fmt(n)}.`); return; }
      W[cur] -= n; W[k] = (W[k] || 0) + m; persist(); renderMenu(); renderShop(); toast(`Bought ${m} ${what}${m > 1 ? 's' : ''}.`);
    };
    if (id === 'pn-ictk') return buy('pearls', ICTK_PEARLS, 'ictk', 1, 'instant clear ticket');
    if (id === 'pn-ictk5') return buy('pearls', ICTK_PEARLS * 5, 'ictk', 5, 'instant clear ticket');
    return b0.apply(this, arguments);
  }; }

/* buying an outfit: choose pearls or skin tickets */
{ const b0 = buySkin;
  buySkin = function (id) {
    const e = findEntry(id); if (!e || e.type !== 'skin' || owns(id)) return;
    if (!buyable(e)) return b0.apply(this, arguments);   // MR outfits: its own message
    const W = S.wallet, tk = sktkCost(e), canP = W.pearls >= SKIN_PRICE, canT = (W.sktk || 0) >= tk, par = findEntry(e.parent);
    const art = baseArt(e);
    openModal({ title: 'Buy outfit', ic: 'skins', small: true, kind: 'skinbuy', body: `<div class="skb">
      <div class="skb-top"><span class="skb-art r${e.rarity}"><img src="${baseCard(e)}" alt="" ${art ? `style="${cardImgStyle(e, 'base')}"` : ''}>${rtag(e.rarity)}</span>
        <span class="skb-nm"><b>${esc(e.name)}</b><small>${par ? esc(par.name) : 'Outfit'}</small></span></div>
      <p class="desc">How do you want to pay?</p>
      <div class="skb-pay">
        <button class="skb-o ${canP ? '' : 'no'}" data-skpay="p" ${canP ? '' : 'disabled'}><span class="skb-ic">${curIcon('pearls')}</span><b>${SKIN_PRICE} pearls</b><small>You have ${fmt(W.pearls)}</small></button>
        <button class="skb-o ${canT ? '' : 'no'}" data-skpay="t" ${canT ? '' : 'disabled'}><span class="skb-ic">${curIcon('sktk')}</span><b>${tk} skin tickets</b><small>You have ${fmt(W.sktk || 0)}</small></button>
      </div>
      <p class="tiny">Skin tickets: ${SKTK_COST[4]} for an SSR outfit, ${SKTK_COST[5]} for a UR one. Pearl Honor gives 5 on every 10th level.</p>
      <div class="row rcf-btns"><button class="btn ghost" id="skbNo">Cancel</button>${canT ? '' : '<button class="btn ghost" id="skbGet">Get skin tickets</button>'}</div></div>`,
      onMount: b => {
        b.querySelector('#skbNo').onclick = closeModal;
        const g = b.querySelector('#skbGet'); if (g) g.onclick = () => { closeModal(); openHonor('rewards'); };
        b.querySelectorAll('[data-skpay]').forEach(x => x.onclick = () => {
          closeModal();
          if (x.dataset.skpay === 'p') { b0.call(this, id); if (shopEl) renderShop(); return; }
          if ((S.wallet.sktk || 0) < tk || owns(id)) return;
          S.wallet.sktk -= tk; S.owned[id] = 1; persist(); renderMenu(); refreshSummon(); refreshCharacters();
          if ($('#colRoot')) renderDetail(id, 'skin'); if (shopEl) renderShop();
          showSkinGet(e);
        });
      } });
  }; }

/* the Bag */
{ const i0 = invItems;
  invItems = function () {
    const L = i0.apply(this, arguments), W = S.wallet, go = fn => () => { closeInventory(); fn(); };
    if (W.sktk > 0) L.push({ id: 'sktk', cat: 'use', name: 'Skin ticket', n: W.sktk, r: 4, tag: 'Ticket', use: `Buy an outfit with them instead of pearls: ${SKTK_COST[4]} for SSR, ${SKTK_COST[5]} for UR (MR wedding outfits can't be bought).`, lore: 'A pink ticket stamped with a tiny dress. The tailors of the plaza accept no other coin.', pic: curIcon('sktk'), act: ['Outfit Shop', go(() => openShop('skins'))] });
    if (W.ictk > 0) L.push({ id: 'ictk', cat: 'use', name: 'Instant clear ticket', n: W.ictk, r: 4, tag: 'Ticket', use: `When the ${RAID_INSTANT} free instant clears of the day are used, each extra instant clear on a raid stage you got 3 stars on uses one ticket.`, lore: 'Torn off once the battle is already won. The guardians will remember.', pic: curIcon('ictk'), act: ['Raids', go(() => openRaids())] });
    return L;
  }; }

/* admin → Test tools */
function ticketAdminHTML() { return `<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="wSktk">+120 skin tickets</button><button class="btn ghost sm" id="wIctk">+10 instant clear tickets</button><button class="btn ghost sm" id="wTkReset">Tickets: remove both</button></div>`; }
function ticketAdminBind(root, rerender) {
  const on = (id, fn) => { const b = root.querySelector('#' + id); if (b) b.onclick = () => { fn(); persist(); renderMenu(); rerender && rerender(); }; };
  on('wSktk', () => { S.wallet.sktk = (S.wallet.sktk || 0) + 120; toast('+120 skin tickets.'); });
  on('wIctk', () => { S.wallet.ictk = (S.wallet.ictk || 0) + 10; toast('+10 instant clear tickets.'); });
  on('wTkReset', () => { S.wallet.sktk = 0; S.wallet.ictk = 0; toast('Skin and instant clear tickets removed.'); });
}

/* admin → Item icons: the item icons that had no upload row (the owner noticed Thread was missing) */
ADMIN_ART.thread = () => adIconRow('thread', 'Thread icon', 'Gear material: from gear raid clears and dismantling, spent on gear breakthroughs at Lv 10, 20 and 30');
ADMIN_ART.honorxp = () => adIconRow('honor', 'Honor EXP icon', 'Pearl Honor EXP: earned from the Pearl Honor missions');
ADMIN_ART.vipxp = () => adIconRow('vip', 'VIP EXP icon', 'VIP EXP: from top-ups and the daily quests\' 100-point reward');
ADMIN_ART.qpt = () => adIconRow('qpt', 'Participation points icon', 'The points daily and weekly quests give toward their gift boxes');
ADMIN_ART_SECS.icons.push('thread', 'honorxp', 'vipxp', 'qpt');
