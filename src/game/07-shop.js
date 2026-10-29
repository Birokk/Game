/* ---------- shop: Corals exchange, Seaweeds shop, monthly pulls ---------- */
const SHOP_TICKET = 10, MONTHLY_LIMIT = 5, MONTHLY_PRICE = 75;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
function monthly() { if (S.monthly.key !== monthKey()) S.monthly = { key: monthKey(), limited: 0, standard: 0 }; return S.monthly; }
const nextMonthIn = () => { const n = new Date(), r = new Date(n.getFullYear(), n.getMonth() + 1, 1), d = Math.ceil((r - n) / 864e5); return d <= 1 ? 'tomorrow' : `in ${d} days`; };
const DUST_GIFTS = { sweets: 5, bracelet: 10, plush: 20 };
let shopTab = 'starlight';
function openShop(tab) { shopTab = tab || shopTab; openModal({ title: 'Shop', ic: 'shop', wide: true, kind: 'shop', body: '<div id="shopRoot"></div>', onMount: renderShop }); }
function renderShop() {
  const root = $('#shopRoot'); if (!root) return;
  const m = monthly(), W = S.wallet;
  const item = (id, ic, name, sub, price, cur, extra = '') => `<div class="shop-item ${extra}"><span class="shop-ic">${curIcon(ic)}</span><b>${name}</b><span class="tiny">${sub}</span>
    <button class="btn sm ${W[cur] >= price && !extra.includes('soldout') ? 'gold' : 'ghost'}" data-buy="${id}" ${extra.includes('soldout') ? 'disabled' : ''}>${extra.includes('soldout') ? 'Sold out' : `${curIcon(cur)}${fmt(price)}`}</button></div>`;
  let body;
  if (shopTab === 'starlight') body = `<p class="tiny">Earn Corals from every character you pull: ${STARLIGHT[4]} for an SSR, ${STARLIGHT[5]} for a UR, and ${STARLIGHT_MAX[4]} / ${STARLIGHT_MAX[5]} once that character is already at max stars.</p>
    <div class="shop-grid">${item('st-tickets', 'tickets', 'Limited ticket', '1 pull on the limited banner', SHOP_TICKET, 'starlight')}${item('st-wishes', 'wishes', 'Wish ticket', '1 pull on the permanent banner', SHOP_TICKET, 'starlight')}</div>`;
  else if (shopTab === 'dust') body = `<p class="tiny">Every pull gives ${DUST_PER_PULL} Seaweeds, whatever you get.</p>
    <div class="shop-grid">${Object.entries(DUST_GIFTS).map(([k, p]) => item('dg-' + k, 'g' + k, GIFTS[k].name, `Gift · +${GIFTS[k].xp} bond · ${S.gifts[k]} in bag`, p, 'dust')).join('')}</div>`;
  else body = `<p class="tiny">${MONTHLY_LIMIT} pulls per banner every month for ${MONTHLY_PRICE} Seaweeds each. Stock resets on the 1st (${nextMonthIn()}).</p>
    <div class="shop-grid">${['limited', 'standard'].map(bk => { const left = MONTHLY_LIMIT - m[bk];
      return item('mo-' + bk, TK(bk), `Monthly ${TK_NAME[TK(bk)]}`, `${left} / ${MONTHLY_LIMIT} left this month`, MONTHLY_PRICE, 'dust', left <= 0 ? 'soldout' : ''); }).join('')}</div>`;
  root.innerHTML = `<div class="stack">
    <div class="shop-bal">${['starlight', 'dust', 'tickets', 'wishes'].map(k => `<span class="cur">${curIcon(k)}<b>${fmt(W[k])}</b></span>`).join('')}</div>
    <div class="tabs" style="margin:0">${[['starlight', 'Corals exchange'], ['dust', 'Seaweeds shop'], ['monthly', 'Monthly pulls']].map(([k, l]) => `<button class="tab ${shopTab === k ? 'on' : ''}" data-stab="${k}">${l}</button>`).join('')}</div>
    ${body}</div>`;
  root.querySelectorAll('[data-stab]').forEach(b => b.onclick = () => { shopTab = b.dataset.stab; renderShop(); });
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyShop(b.dataset.buy));
}
function buyShop(id) {
  const W = S.wallet, pay = (cur, n) => { if (W[cur] < n) { toast(`Not enough ${cur === 'dust' ? 'Seaweeds' : 'Corals'}. You need ${fmt(n)}.`); return false; } W[cur] -= n; return true; };
  let msg;
  if (id.startsWith('st-')) { const k = id.slice(3); if (!pay('starlight', SHOP_TICKET)) return; W[k]++; msg = `Bought 1 ${TK_NAME[k].toLowerCase()}.`; }
  else if (id.startsWith('dg-')) { const k = id.slice(3); if (!pay('dust', DUST_GIFTS[k])) return; S.gifts[k]++; msg = `Bought ${GIFTS[k].name}. Give it from a character's Bond tab.`; }
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
  openModal({ title: 'Achievements', ic: 'trophy', kind: 'ach', body: '<div id="achRoot"></div>', onMount: renderAch });
}
function renderAch() {
  const root = $('#achRoot'); if (!root) return;
  const done = S.ach.length, ready = ACH.filter(a => a.ok() && !S.ach.includes(a.id));
  root.innerHTML = `<div class="stack">
    <div class="balance"><span>${done} / ${ACH.length} achievements</span><b>${ready.length ? `<button class="btn gold sm" id="achAll">Claim all · ${costHTML(ready.length * ACH_PEARLS)}</button>` : `${curIcon('pearls')}${ACH_PEARLS} each`}</b></div>
    <div class="ach-list">${ACH.map(a => { const got = S.ach.includes(a.id), ok = a.ok(), v = Math.min(a.goal, a.n());
      return `<div class="ach ${got ? 'got' : ok ? 'ready' : ''}"><span class="ach-ic">${icon(got ? 'check' : 'trophy')}</span>
        <div style="display:grid;gap:3px;min-width:0"><b>${esc(a.name)}</b><span class="tiny">${esc(a.desc)}</span><span class="bar"><i style="width:${v / a.goal * 100}%"></i></span><span class="tiny">${fmt(v)} / ${fmt(a.goal)}</span></div>
        ${got ? '<span class="chip">Done</span>' : `<button class="btn sm ${ok ? 'gold' : 'ghost'}" data-ach="${a.id}" ${ok ? '' : 'disabled'}>${costHTML(ACH_PEARLS)}</button>`}</div>`; }).join('')}</div></div>`;
  const claim = ids => { ids.forEach(id => { if (!S.ach.includes(id)) { S.ach.push(id); S.wallet.pearls += ACH_PEARLS; } }); persist(); renderMenu(); renderAch(); toast(`+${ids.length * ACH_PEARLS} pearl${ids.length * ACH_PEARLS === 1 ? '' : 's'}`); };
  root.querySelectorAll('[data-ach]').forEach(b => b.onclick = () => claim([b.dataset.ach]));
  const all = $('#achAll'); if (all) all.onclick = () => claim(ready.map(a => a.id));
}

/* ---------- redeem codes ---------- */
const CODES = { TESTBLANK: { pearls: 30 } };
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
      S.redeemed.push(code); Object.entries(r).forEach(([k, v]) => S.wallet[k] = (S.wallet[k] || 0) + v);
      persist(); renderMenu(); refreshSummon(); closeModal();
      toast(`Code redeemed: ${Object.entries(r).map(([k, v]) => `${fmt(v)} ${k}`).join(', ')}.`);
    };
  } });
}
