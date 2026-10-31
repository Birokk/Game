/* ---------- shop: Corals exchange, Seaweeds shop, monthly pulls ---------- */
const SHOP_TICKET = 10, MONTHLY_LIMIT = 5, MONTHLY_PRICE = 75;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
function monthly() { if (S.monthly.key !== monthKey()) S.monthly = { key: monthKey(), limited: 0, standard: 0 }; return S.monthly; }
const nextMonthIn = () => { const n = new Date(), r = new Date(n.getFullYear(), n.getMonth() + 1, 1), d = Math.ceil((r - n) / 864e5); return d <= 1 ? 'tomorrow' : `in ${d} days`; };
const DUST_GIFTS = { sweets: 5, bracelet: 10, plush: 20 };
/* full-screen shop: sidebar of sub-shops on the left, the chosen one on the right (Hot Picks = featured outfits over their art) */
const SHOP_TABS = [['hot', 'sparkle', 'Hot Picks'], ['skins', 'hanger', 'Outfit Shop'], ['topup', 'plus', 'Top Up'], ['pearl', 'gift', 'Pearl Shop'], ['exchange', 'shop', 'Exchange Currency']];
/* Exchange Currency sub-tabs: Corals, Seaweeds, Premium (Corals → a copy of an owned character, 720 each, 1 a month) */
const EX_SUBS = [['corals', 'Corals'], ['seaweeds', 'Seaweeds'], ['premium', 'Premium']], PREM_PRICE = 720, PREM_LIMIT = 1;
let exSub = 'corals';
function premEx() { if (!S.premEx || S.premEx.key !== monthKey()) S.premEx = { key: monthKey(), n: 0 }; return S.premEx; }
const TOPUP = [[60, '0.99'], [300, '4.99'], [980, '14.99'], [1980, '29.99'], [3280, '49.99'], [6480, '99.99']];
let shopTab = 'hot', shopEl = null, shopPick = null;
function openShop(tab) {
  closeModal();
  if (tab === 'monthly' || tab === 'dust') { tab = 'exchange'; exSub = 'seaweeds'; }   // monthly pulls live in the Seaweeds exchange
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
  let strip = shopTab === 'exchange' ? EX_SUBS.map(([k, l]) => `<button class="mall-pill ${k === exSub ? 'on' : ''}" data-exsub="${k}">${l}</button>`).join('') : `<span class="mall-pill on">${tab[2]}</span>`, body = '', bg = '';
  if (shopTab === 'hot') {
    const picks = hotPicks(); if (!picks.some(e => e.id === shopPick)) shopPick = picks[0] ? picks[0].id : null;
    const e = shopPick && findEntry(shopPick), par = e && findEntry(e.parent);
    strip = `<span class="mall-pill on">New outfits</span>`;
    bg = e ? `<img class="mall-art" src="${baseSplash(e)}" alt="">` : '';
    body = e ? `<div class="mall-hot">
        <div class="mall-hot-name"><h1>${esc(e.name)}</h1><span class="mall-time">${rtag(e.rarity)}${par ? esc(par.name) : 'Outfit'}</span></div>
        <div class="mall-thumbs">${picks.map(x => `<button class="mall-thumb ${x.id === shopPick ? 'on' : ''}" data-pick="${esc(x.id)}"><img src="${baseCard(x)}" alt=""><b>${esc(x.name)}</b></button>`).join('')}</div>
        <div class="mall-price"><span>${curIcon('pearls')}<b>${SKIN_PRICE}</b></span>${owns(e.id) ? '<button class="mall-go owned" disabled>Owned</button>' : `<button class="mall-go" data-skin="${esc(e.id)}">Buy ${icon('up')}</button>`}</div>
      </div>` : '<p class="mall-empty">No outfits for sale yet. Add skins in the admin panel.</p>';
  } else if (shopTab === 'skins') {
    const list = shopSkins();
    body = `<p class="tiny">Every outfit costs ${SKIN_PRICE} pearls. Wedding (MR) outfits can't be bought; marry the character to unlock them.</p>
      <div class="mall-skins">${list.map(x => { const par = findEntry(x.parent), own = owns(x.id);
        return `<div class="mall-skin r${x.rarity}"><img src="${baseCard(x)}" alt="">${rtag(x.rarity)}<span class="mall-skin-nm"><b>${esc(x.name)}</b><small>${par ? esc(par.name) : ''}</small></span>
          ${own ? '<button class="mall-buy" disabled>Owned</button>' : `<button class="mall-buy ${W.pearls >= SKIN_PRICE ? 'ok' : ''}" data-skin="${esc(x.id)}">${curIcon('pearls')}${SKIN_PRICE}</button>`}</div>`; }).join('') || '<p class="mall-empty">No outfits for sale yet.</p>'}</div>`;
  } else if (shopTab === 'topup') {
    body = `<p class="tiny">Pearl packs. Real payments aren't connected yet, so these can't be bought for now.</p>
      <div class="mall-grid">${TOPUP.map(([n, usd], i) => `<div class="mall-item topup"><span class="mall-ic big r${i > 2 ? 5 : 4}">${curIcon('pearls')}</span><b>${fmt(n)} pearls</b><span class="tiny">${i ? `+${fmt(Math.round(n * .1))} bonus on first purchase` : 'Starter pack'}</span><button class="mall-buy" disabled>$${usd} · Soon</button></div>`).join('')}</div>`;
  } else if (shopTab === 'pearl') {
    body = `<p class="tiny">Spend pearls on summon tickets and marriage rings.</p>
      <div class="mall-grid">${item('pt-tickets', 'tickets', 'Limited ticket', '1 pull on the Limited, Weekly or Outfit banner', TICKET_PEARLS, 'pearls', '', 5)}${item('pt-wishes', 'wishes', 'Standard ticket', '1 pull on the Permanent or Memory banner', TICKET_PEARLS, 'pearls')}${item('pr-ring', 'rings', 'Marriage ring', `Propose at bond level ${BOND_MAX} · you have ${W.rings}`, RING_PRICE, 'pearls', '', 5)}</div>`;
  } else if (shopTab === 'exchange' && exSub === 'corals') body = `<p class="tiny">Earn Corals from every character you pull: ${STARLIGHT[4]} for an SSR, ${STARLIGHT[5]} for a UR, and ${STARLIGHT_MAX[4]} / ${STARLIGHT_MAX[5]} once that character is already at max stars.</p>
    <div class="mall-grid">${item('st-tickets', 'tickets', 'Limited ticket', '1 pull on the Limited, Weekly or Outfit banner', SHOP_TICKET, 'starlight', '', 5)}${item('st-wishes', 'wishes', 'Standard ticket', '1 pull on the Permanent or Memory banner', SHOP_TICKET, 'starlight')}</div>`;
  else if (shopTab === 'exchange' && exSub === 'premium') { const pe = premEx(), left = PREM_LIMIT - pe.n, chars = S.pool.filter(e => e.type === 'character' && +e.rarity === 5 && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    body = `<div class="mall-limit ${left > 0 ? '' : 'used'}"><b>Limit: ${PREM_LIMIT} per month</b><span>${left > 0 ? `${left} / ${PREM_LIMIT} left this month` : `Used this month · resets on the 1st (${nextMonthIn()})`}</span></div><p class="tiny">Trade ${PREM_PRICE} Corals for one more copy of a UR character you own: it adds a star, up to ${MAX_STARS}.</p>
      ${chars.length ? `<div class="mall-skins">${chars.map(e => { const st = starsOf(e.id), max = st >= MAX_STARS, ok = left > 0 && !max && W.starlight >= PREM_PRICE;
        return `<div class="mall-skin r${e.rarity}"><img src="${getArt(e)}" alt="" ${mediaArt(e) ? `style="${cardImgStyle(e)}"` : ''}>${rtag(e.rarity)}<span class="mall-skin-nm"><b>${esc(e.name)}</b><small>${starRow(st, -1, e)}</small></span>
          ${max ? '<button class="mall-buy" disabled>Max stars</button>' : left <= 0 ? '<button class="mall-buy" disabled>Sold out</button>' : `<button class="mall-buy ${ok ? 'ok' : ''}" data-prem="${esc(e.id)}">${curIcon('starlight')}${fmt(PREM_PRICE)}</button>`}</div>`; }).join('')}</div>`
        : '<p class="mall-empty">You don\'t own any UR characters yet.</p>'}`; }
  else body = `<p class="tiny">Every pull gives ${DUST_PER_PULL} Seaweeds, whatever you get.</p>
    <h3 class="mall-h">Monthly pulls</h3><p class="tiny">${MONTHLY_LIMIT} pulls per banner every month for ${MONTHLY_PRICE} Seaweeds each. Stock resets on the 1st (${nextMonthIn()}).</p>
    <div class="mall-grid">${['limited', 'standard'].map(bk => { const left = MONTHLY_LIMIT - m[bk];
      return item('mo-' + bk, TK(bk), `Monthly ${TK_NAME[TK(bk)]}`, `${left} / ${MONTHLY_LIMIT} left this month`, MONTHLY_PRICE, 'dust', left <= 0 ? 'soldout' : '', bk === 'limited' ? 5 : 4); }).join('')}</div>
    <h3 class="mall-h">Gifts</h3><p class="tiny">Tap one to choose how many to buy.</p>
    <div class="mall-grid">${Object.entries(DUST_GIFTS).map(([k, p], i) => item('dg-' + k, 'g' + k, GIFTS[k].name, `Gift · +${GIFTS[k].xp} bond · ${S.gifts[k]} in bag`, p, 'dust', '', 3 + i)).join('')}</div>`;
  shopEl.innerHTML = `<div class="mall-word">SHOP</div>
    <div class="mall-top"><div class="inv-title"><span class="inv-badge">${icon('shop')}</span><h2 class="ts">Shop</h2></div>
      <div class="inv-cur">${['pearls', 'starlight', 'dust'].map(k => `<div class="cur">${curIcon(k)}<b>${fmt(W[k])}</b></div>`).join('')}<button class="inv-x" id="shopClose" aria-label="Close">${icon('close')}</button></div></div>
    <aside class="mall-side">${SHOP_TABS.map(([k, ic, l]) => `<button class="evp-item ${k === shopTab ? 'on' : ''}" data-stab="${k}"><span class="evp-ic">${icon(ic)}</span><b>${l}</b></button>`).join('')}</aside>
    <section class="mall-main ${shopTab === 'hot' ? 'hot' : ''}">${bg}<div class="mall-strip">${strip}</div><div class="mall-body">${body}</div></section>
    <p class="mall-foot">Please spend responsibly.</p>`;
  $('#shopClose').onclick = closeShop;
  shopEl.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { shopTab = b.dataset.stab; renderShop(); });
  shopEl.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { shopPick = b.dataset.pick; renderShop(); });
  shopEl.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => { buySkin(b.dataset.skin); renderShop(); });
  shopEl.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyShop(b.dataset.buy));
  shopEl.querySelectorAll('[data-exsub]').forEach(b => b.onclick = () => { exSub = b.dataset.exsub; renderShop(); });
  shopEl.querySelectorAll('[data-prem]').forEach(b => b.onclick = () => confirmPrem(b.dataset.prem));
}
function confirmPrem(id) {
  const e = findEntry(id); if (!e || !owns(id) || +e.rarity !== 5) return;
  const pe = premEx(); if (pe.n >= PREM_LIMIT) { toast('You already used the Premium exchange this month.'); return; }
  if (starsOf(id) >= MAX_STARS) { toast(`${e.name} is already at max stars.`); return; }
  if (S.wallet.starlight < PREM_PRICE) { toast(`You need ${PREM_PRICE} Corals. You have ${fmt(S.wallet.starlight)}.`); return; }
  openModal({ title: 'Premium exchange', ic: 'shop', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <p class="desc">Spend <b>${PREM_PRICE} Corals</b> on a copy of <b>${esc(e.name)}</b>? It will go from ${starsOf(id)}★ to ${starsOf(id) + 1}★. You can do this once a month.</p>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="prNo">Cancel</button><button class="btn gold" id="prYes">Exchange · ${curIcon('starlight')}${PREM_PRICE}</button></div></div>`,
    onMount: () => { $('#prNo').onclick = closeModal; $('#prYes').onclick = () => {
      closeModal(); S.wallet.starlight -= PREM_PRICE; premEx().n++; grantEntry(e); persist(); renderMenu(); refreshCharacters(); renderShop();
      toast(`${e.name} is now ${starsOf(id)}★.`); }; } });
}
function buyShop(id) {
  const W = S.wallet, pay = (cur, n) => { if (W[cur] < n) { toast(`Not enough ${cur === 'dust' ? 'Seaweeds' : 'Corals'}. You need ${fmt(n)}.`); return false; } W[cur] -= n; return true; };
  let msg;
  if (id.startsWith('st-')) { const k = id.slice(3); if (!pay('starlight', SHOP_TICKET)) return; W[k]++; msg = `Bought 1 ${TK_NAME[k].toLowerCase()}.`; }
  else if (id.startsWith('dg-')) { openBuyGifts(id.slice(3), 'dust'); return; }   // pick how many
  else if (id.startsWith('pt-')) { const k = id.slice(3); if (W.pearls < TICKET_PEARLS) { toast(`A ticket costs ${TICKET_PEARLS} pearls. You have ${fmt(W.pearls)}.`); return; } W.pearls -= TICKET_PEARLS; W[k]++; msg = `Bought 1 ${TK_NAME[k].toLowerCase()}.`; }
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
