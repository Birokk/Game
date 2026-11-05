/* ---------- First Top-Up offer: a one-time pack for new players, on sale for 7 days after the account is created ----------
   Contents: 1 UR character chosen in admin → Banners → "First Top-Up offer" (S.banners.ftu.char; default a UR named
   "Pirate", else the first UR character), 240 stamina and 10 Standard tickets. Price S.banners.ftu.usd (default $4.99);
   while TOPUP_FREE it is a free test button and still gives VIP EXP. Shown as a home icon with its countdown (#hmFtu),
   a banner under the VIP bar in Top Up → Pearls, and its own window (openFtu). The clock starts at the account's creation
   time (S.account.since; older saves start it the first time they see the offer, S.ftuStart). State S.ftu {bought}. */
const FTU_DAYS = 7, FTU_MS = FTU_DAYS * 864e5, FTU_STAMINA = 240, FTU_TICKETS = 10, FTU_USD = 4.99;
function ftuStart() {
  const since = S.account && S.account.since;
  if (!S.ftuStart) { S.ftuStart = since || Date.now(); persist(); }
  return since ? Math.min(S.ftuStart, since) : S.ftuStart;
}
const ftuEnds = () => ftuStart() + FTU_MS;
const ftuBought = () => !!(S.ftu && S.ftu.bought);
const ftuLive = () => !ftuBought() && Date.now() < ftuEnds();
const ftuCfg = () => (S.banners.ftu = S.banners.ftu || {});
function ftuChar() {
  const urs = S.pool.filter(e => e.type === 'character' && +e.rarity === 5 && !e.mc), id = ftuCfg().char;
  return (id && urs.find(e => e.id === id)) || urs.find(e => /pirate/i.test(e.name)) || urs[0] || null;
}
const ftuUsd = () => { const v = parseFloat(ftuCfg().usd); return Number.isFinite(v) && v > 0 ? v : FTU_USD; };
const ftuLeftTxt = () => { const s = Math.max(0, ftuEnds() - Date.now()) / 1000, d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : `${h}h ${m}m`; };
function buyFtu() {
  const c = ftuChar(); if (!ftuLive() || !c) return;
  if (!TOPUP_FREE) { toast('Real payments aren\'t connected yet.'); return; }
  S.ftu = { bought: Date.now() };
  const added = giveStamina(FTU_STAMINA); S.wallet.wishes = (S.wallet.wishes || 0) + FTU_TICKETS;
  vipFromUsd(ftuUsd());
  closeModal(); persist(); renderMenu();
  toast(`First Top-Up: +${added} stamina, +${FTU_TICKETS} Standard tickets and +${Math.round(ftuUsd() * VIP_PER_USD)} VIP EXP.`);
  giftChar(c, 'standard');   // the UR plays its reveal
}
function openFtu() {
  if (!ftuLive()) { toast(ftuBought() ? 'You already bought the First Top-Up offer.' : 'The First Top-Up offer has ended.'); return; }
  const c = ftuChar(), art = c && baseArt(c), usd = ftuUsd();
  openModal({ title: 'First Top-Up', ic: 'sparkle', kind: 'ftu', body: `<div class="ftu">
      <div class="ftu-art ${art ? '' : 'none'}">${c ? `<img src="${art || baseSplash(c)}" alt="" class="${art ? '' : 'chibi'}">` : ''}<span class="ftu-who">${rtag(5)}<b>${c ? esc(c.name) : 'No UR character yet'}</b></span></div>
      <div class="ftu-side">
        <span class="ftu-tag">New players only</span>
        <h2 class="ftu-title">First Top-Up</h2>
        <span class="ftu-time">${icon('clock')}Ends in ${ftuLeftTxt()}</span>
        <div class="ftu-items">
          ${c ? `<span class="ftu-it ur"><span class="ftu-card r5"><img src="${baseCard(c)}" alt="" ${baseArt(c) ? `style="${cardImgStyle(c, 'base')}"` : ''}>${rtag(5)}</span><b>${esc(c.name)}</b><small>UR character</small></span>` : ''}
          <span class="ftu-it"><span class="inv-cell r4"><span class="inv-pic">${curIcon('stamina')}</span></span><b>${FTU_STAMINA}</b><small>Stamina</small></span>
          <span class="ftu-it"><span class="inv-cell r4"><span class="inv-pic">${curIcon('wishes')}</span></span><b>×${FTU_TICKETS}</b><small>Standard tickets</small></span>
        </div>
        <span class="ftu-val">One time only · once per account</span>
        <button class="btn gold ftu-buy" id="ftuBuy" ${c ? '' : 'disabled'}>$${usd.toFixed(2)}${TOPUP_FREE ? ' · free test' : ''}</button>
        <span class="tiny">+${fmt(Math.round(usd * VIP_PER_USD))} VIP EXP · available for ${FTU_DAYS} days after you create your account.</span>
      </div></div>`,
    onMount: () => { const b = $('#ftuBuy'); if (b) b.onclick = buyFtu; } });
}
/* the banner under the VIP bar in Top Up → Pearls */
function ftuShopBanner() {
  if (!ftuLive()) return '';
  const c = ftuChar();
  return `<button class="ftu-ban" data-open="ftu">${c && baseArt(c) ? `<img src="${baseArt(c)}" alt="">` : ''}<span class="ftu-ban-t"><b>First Top-Up</b><small>${c ? `UR ${esc(c.name)}` : 'A UR character'} · ${FTU_STAMINA} stamina · ${FTU_TICKETS} Standard tickets</small></span><span class="ftu-ban-r"><em>${icon('clock')}${ftuLeftTxt()}</em><span class="ftu-ban-p">$${ftuUsd().toFixed(2)}</span></span></button>`;
}
/* admin → Banners: the UR character and the price */
function ftuAdminHTML() {
  const urs = S.pool.filter(e => e.type === 'character' && +e.rarity === 5 && !e.mc), cur = ftuChar();
  return `<section class="stack" style="align-content:start">
    <div><h3>First Top-Up offer</h3><p class="tiny">A one-time pack each player can buy during their first ${FTU_DAYS} days: 1 UR character, ${FTU_STAMINA} stamina and ${FTU_TICKETS} Standard tickets.</p></div>
    <label class="field"><span>UR character</span><select class="input" id="ftuChar">${urs.map(u => `<option value="${esc(u.id)}" ${cur && cur.id === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('') || '<option value="">No UR characters yet</option>'}</select></label>
    <label class="field"><span>Price (USD)</span><input class="input" id="ftuUsd" type="number" min="0.99" step="0.01" value="${ftuUsd().toFixed(2)}"></label>
  </section>`;
}
function bindFtuAdmin() {
  const ch = $('#ftuChar'); if (ch) ch.onchange = () => { ftuCfg().char = ch.value || null; persist(); toast('First Top-Up character saved.'); };
  const u = $('#ftuUsd'); if (u) u.onchange = () => { const v = Math.max(0.99, Math.round((parseFloat(u.value) || FTU_USD) * 100) / 100); u.value = v.toFixed(2); ftuCfg().usd = v; persist(); };
}
