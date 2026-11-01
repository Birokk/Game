/* ---------- monthly memberships (bought with pearls for now, in the shop's Hot Picks) ----------
   Two passes, 30 days each; buying again while active adds 30 more days. Each purchase gives its one-time reward
   right away; every day the game is opened while a pass is active, its daily reward arrives in Mail.
   Perks while active: stamina max / recharge (PASS_STAM in 03-ui.js, best one counts) and daily wheel spins
   (spinsPerDay in 10-economy.js). State: S.member[passId] = end time, S.memberDay[passId] = last day delivered.
   The card pictures (icon slots pass1 / pass2) and the UR memory ticket icon (memtk) are editable in Settings → Admin. */
const PASS_DAYS = 30, PASS_MS = PASS_DAYS * 864e5;
const PASS_MAX_DAYS = 180;   // a membership can be stacked up to 180 days; a purchase that would go past that is refused
const passCanBuy = id => passLeft(id) + PASS_MS <= PASS_MAX_DAYS * 864e5 + 6e4;
const PASSES = [
  { id: 'p1', icon: 'pass1', name: 'Lantern Membership', price: 30, col: '#ffb35a',
    daily: { tickets: 1, pearls: 3 }, once: { pearls: 5, eggur: 1 }, spins: 2 },
  { id: 'p2', icon: 'pass2', name: 'Prism Membership', price: 60, col: '#d58bff',
    daily: { tickets: 2, pearls: 6 }, once: { pearls: 10, eggur: 2, memtk: 1 }, spins: 2 }
];
const passDef = id => PASSES.find(p => p.id === id);
const passLeft = id => Math.max(0, ((S.member || {})[id] || 0) - Date.now());
const passDaysLeft = id => Math.ceil(passLeft(id) / 864e5);
/* default card art: a glowing membership card in the pass colour (replaceable in Settings → Admin) */
const passCardSVG = (p) => `<svg class="cic pass-svg" viewBox="0 0 64 40" aria-hidden="true"><defs><linearGradient id="pg-${p.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.id === 'p2' ? '#c58bff' : '#ffd36b'}"/><stop offset=".55" stop-color="${p.id === 'p2' ? '#ff6ec7' : '#ff9a4a'}"/><stop offset="1" stop-color="${p.id === 'p2' ? '#3ee6d0' : '#c9631c'}"/></linearGradient></defs>
  <rect x="1.5" y="1.5" width="61" height="37" rx="6" fill="url(#pg-${p.id})" stroke="rgba(255,255,255,.85)" stroke-width="1.4"/><rect x="7" y="9" width="11" height="8" rx="2" fill="rgba(255,255,255,.75)"/>
  <path d="M44 8l2.4 5 5.4.6-4 3.7 1.1 5.4L44 20l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="#fff" opacity=".95"/><rect x="7" y="27" width="30" height="3" rx="1.5" fill="rgba(255,255,255,.7)"/><rect x="7" y="32" width="18" height="2.4" rx="1.2" fill="rgba(255,255,255,.5)"/></svg>`;
CUR_SVG.pass1 = passCardSVG(PASSES[0]); CUR_SVG.pass2 = passCardSVG(PASSES[1]);
/* the UR memory ticket: use it from the inventory for a random UR memory */
CUR_SVG.memtk = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="memtkG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58bff"/><stop offset=".5" stop-color="#ff6ec7"/><stop offset="1" stop-color="#3ee6d0"/></linearGradient></defs><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" fill="url(#memtkG)" stroke="#fff" stroke-width="1.1"/><rect x="7.5" y="9" width="9" height="6" rx="1.2" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M8.5 14l2.2-2.3 1.6 1.5 1.4-1.2 1.8 2" fill="none" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>';
CUR_SVG.eggur = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="eggurG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58bff"/><stop offset=".5" stop-color="#ff6ec7"/><stop offset="1" stop-color="#3ee6d0"/></linearGradient></defs><path d="M12 2.5c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z" fill="url(#eggurG)" stroke="#fff" stroke-width="1.2"/></svg>';
const PASS_NAMES = { tickets: 'Limited ticket', pearls: 'pearl', eggur: 'UR egg', memtk: 'UR memory ticket' };
const passItem = (k, n) => `${fmt(n)} ${PASS_NAMES[k] || k}${n > 1 ? 's' : ''}`;
const passPic = k => k === 'eggur' ? eggHTML('ur', 'sm') : curIcon(k);
function passPerks(p) {
  const [mx, ms] = PASS_STAM[p.id];
  return [
    ...Object.entries(p.daily).map(([k, n]) => [k, `${passItem(k, n)} every day`]),
    ['stamina', `Stamina max ${mx} and +1 every ${Math.round(ms / 6e3) / 10} min`],
    ['wheel', `${p.spins} daily wheel spins`],
    ...Object.entries(p.once).map(([k, n]) => [k, `${passItem(k, n)} right away`])
  ];
}

/* daily rewards: one letter per active pass per day, sent the first time the game runs that day */
function passDaily() {
  const d = dayKey(); S.memberDay = S.memberDay || {};
  for (const p of PASSES) {
    if (!passOn(p.id) || S.memberDay[p.id] === d) continue;
    S.memberDay[p.id] = d;
    S.mailbox = [...(S.mailbox || []), { id: `pass-${p.id}-${d}`, from: 'Membership', title: `${p.name}: daily reward`, date: d,
      body: `Thank you for being a member! Here is today's ${p.name} reward.\n${passDaysLeft(p.id)} day${passDaysLeft(p.id) === 1 ? '' : 's'} left on your membership.`, reward: { ...p.daily } }];
    persist();
  }
}
function passMaxMsg(p) { toast(`${p.name} can be stacked up to ${PASS_MAX_DAYS} days. You have ${passDaysLeft(p.id)} days, so another ${PASS_DAYS} would go past the limit.`); }
function confirmPass(id) {
  const p = passDef(id); if (!p) return;
  if (!passCanBuy(id)) return passMaxMsg(p);
  const on = passOn(id);
  openModal({ title: on ? `Extend ${p.name}?` : `Buy ${p.name}?`, ic: 'shop', small: true, body: `<div class="stack" style="text-align:center">
    <span class="pass-card big">${curIcon(p.icon)}</span>
    <p class="desc">${on ? `Adds ${PASS_DAYS} more days (${passDaysLeft(id)} left now).` : `${PASS_DAYS} days of membership.`} You get ${Object.entries(p.once).map(([k, n]) => passItem(k, n)).join(', ')} right away.</p>
    <span class="tiny">You have ${fmt(S.wallet.pearls)} pearls.</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="passNo">Cancel</button><button class="btn gold" id="passYes">Buy · ${costHTML(p.price)}</button></div></div>`,
    onMount: () => { $('#passNo').onclick = closeModal; $('#passYes').onclick = () => { closeModal(); buyPass(id); }; } });
}
function buyPass(id) {
  const p = passDef(id); if (!p) return;
  if (!passCanBuy(id)) return passMaxMsg(p);
  if (S.wallet.pearls < p.price) { toast(`${p.name} costs ${p.price} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= p.price;
  S.member = { ...(S.member || {}), [id]: Math.max(Date.now(), (S.member || {})[id] || 0) + PASS_MS };
  for (const [k, n] of Object.entries(p.once)) { if (k === 'eggur') for (let i = 0; i < n; i++) S.pets.eggs.push('ur'); else S.wallet[k] = (S.wallet[k] || 0) + n; }
  persist(); passDaily(); renderMenu(); renderStamina(); refreshSummon(); renderShop();
  openModal({ title: p.name, ic: 'sparkle', small: true, body: `<div class="stack" style="text-align:center">
    <span class="pass-card big">${curIcon(p.icon)}</span><b class="pass-ok">Membership active · ${passDaysLeft(id)} days</b>
    <div class="ex-got" style="justify-content:center">${Object.entries(p.once).map(([k, n]) => `<span class="ex-item">${passPic(k)}<b>${fmt(n)}</b><small>${PASS_NAMES[k]}${n > 1 ? 's' : ''}</small></span>`).join('')}</div>
    <p class="tiny">Today's daily reward is waiting in your Mail. ${p.id === 'p2' ? 'Use the UR memory ticket from your Bag.' : 'Hatch the UR egg in Pets.'}</p>
    <button class="btn gold" data-close>Great!</button></div>`, onMount: b => { b.querySelector('[data-close]').onclick = closeModal; } });
}
/* the Memberships part of Hot Picks */
function passShopHTML() {
  return `<div class="pass-grid">${PASSES.map(p => { const on = passOn(p.id);
    return `<div class="pass-box ${on ? 'on' : ''}" style="--pc:${p.col}">
      <span class="pass-card">${curIcon(p.icon)}</span>
      <div class="pass-head"><h3>${esc(p.name)}</h3><span class="pass-state">${on ? `Active · ${passDaysLeft(p.id)} day${passDaysLeft(p.id) === 1 ? '' : 's'} left` : `${PASS_DAYS} days`}</span></div>
      <ul class="pass-perks">${passPerks(p).map(([k, t]) => `<li><span class="pass-pi">${k === 'wheel' ? icon('wheel') : passPic(k)}</span>${esc(t)}</li>`).join('')}</ul>
      ${passCanBuy(p.id) ? `<button class="mall-go pass-buy ${S.wallet.pearls >= p.price ? '' : 'poor'}" data-pass="${p.id}">${on ? 'Extend' : 'Buy'} · ${curIcon('pearls')}<b>${p.price}</b></button>` : `<button class="mall-go pass-buy owned" disabled>Max ${PASS_MAX_DAYS} days reached</button>`}
      <span class="tiny pass-cap">Stack up to ${PASS_MAX_DAYS} days${on ? ` · ${passDaysLeft(p.id)} / ${PASS_MAX_DAYS} now` : ''}</span>
    </div>`; }).join('')}</div>`;
}
/* use a UR memory ticket: a random UR memory with the summon reveal */
function useMemTicket() {
  if (!(S.wallet.memtk > 0)) return;
  const urs = (S.memories || []).filter(m => +m.rarity === 5);
  if (!urs.length) { toast('There are no UR memories in the game yet. Keep the ticket for later.'); return; }
  const m = pick(urs), isNew = !S.owned[m.id];
  S.wallet.memtk--; S.owned[m.id] = (S.owned[m.id] || 0) + 1;
  persist(); renderMenu(); if (typeof renderInventory === 'function') renderInventory();
  showPull([{ kind: 'entry', id: m.id, rarity: 5, isNew, starUp: 0, maxed: !isNew }], 1, 'memories', { preview: true, exchange: true, direct: true });
}
