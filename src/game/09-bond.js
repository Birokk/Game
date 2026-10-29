/* ---------- bond: gifts give bond xp, level 10 unlocks marriage (costs 1 ring) ---------- */
const BOND_XP = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250], BOND_MAX = 10, RING_PRICE = 300;
const GIFTS = {
  sweets: { name: 'Lantern Sweets', xp: 40, price: 1000 },
  bracelet: { name: 'Pearl Bracelet', xp: 150, price: 4000 },
  plush: { name: 'Star Plushie', xp: 400, price: 10000 }
};
const bondOf = id => S.bond[id] || { xp: 0, married: null };
const BT_PEARLS = 10;
function toggleStar(id, i) {
  const paid = S.btPaid[id] || (S.btPaid[id] = []), on = S.bt[id] || (S.bt[id] = []);
  if (i >= starsOf(id)) return;
  if (!paid.includes(i)) {
    if (S.wallet.pearls < BT_PEARLS) { toast(`Awakening a star costs ${BT_PEARLS} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
    S.wallet.pearls -= BT_PEARLS; paid.push(i); on.push(i); toast(`Star ${i + 1} awakened!`);
  } else if (on.includes(i)) S.bt[id] = on.filter(x => x !== i);
  else on.push(i);
  persist(); renderMenu(); refreshCharacters();
}
const bondTag = (id, cls = '') => `<span class="bond-tag ${cls}" data-tip="${esc(`<b>Bond level ${bondLv(id)}</b><span>Give gifts to raise it. Level ${BOND_MAX} unlocks marriage.</span>`)}">${curIcon('bondheart')}<b>${bondLv(id)}</b></span>`;
function bondLv(id) { const xp = bondOf(id).xp; let l = 0; while (l < BOND_MAX && xp >= BOND_XP[l + 1]) l++; return l; }
function giveGift(id, g) {
  const e = findEntry(id); if (!e || !owns(id)) return;
  const b = { ...bondOf(id) }, before = bondLv(id);
  if (before >= BOND_MAX) { toast(`${e.name} is already at bond level ${BOND_MAX}.`); return; }
  if (!S.gifts[g]) {
    if (S.wallet.coins < GIFTS[g].price) { toast(`${GIFTS[g].name} costs ${fmt(GIFTS[g].price)} gold coins. You have ${fmt(S.wallet.coins)}.`); return; }
    S.wallet.coins -= GIFTS[g].price;   // no gift in the bag: buy one on the spot
  } else S.gifts[g]--;
  b.xp = Math.min(BOND_XP[BOND_MAX], b.xp + GIFTS[g].xp); S.bond[id] = b;
  persist(); renderMenu();
  const after = bondLv(id);
  toast(after > before ? `Bond level ${after} with ${e.name}!${after === BOND_MAX ? ' You can now propose with a ring.' : ''}` : `${e.name} loved the ${GIFTS[g].name}. +${GIFTS[g].xp} bond.`);
  refreshCharacters();
}
function buyRing() {
  if (S.wallet.pearls < RING_PRICE) { toast(`A ring costs ${RING_PRICE} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= RING_PRICE; S.wallet.rings++; persist(); renderMenu(); refreshCharacters(); toast('Bought 1 ring.');
}
function askMarry(id) {
  const e = findEntry(id);
  openModal({ title: 'Propose', ic: 'ring', body: `<div class="stack" style="justify-items:center;text-align:center">
    <span class="vow-ring">${curIcon('rings')}</span>
    <p class="desc">Give a ring to <b>${esc(e.name)}</b>? This uses 1 ring and can't be undone.</p>
    <div class="row"><button class="btn ghost" data-close>Not yet</button><button class="btn gold" id="marryGo">${curIcon('rings')}Propose</button></div></div>`,
    onMount: () => { $('#marryGo').onclick = () => marry(id); modalEl.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal); } });
}
function marry(id) {
  const e = findEntry(id); if (!e || S.wallet.rings < 1 || bondLv(id) < BOND_MAX || bondOf(id).married) return;
  S.wallet.rings--; S.bond[id] = { ...bondOf(id), married: Date.now() };
  // the wedding outfit is set per character in the admin panel (Game pool → Wedding skin)
  const skin = e.weddingSkin && findEntry(e.weddingSkin), newSkin = skin && !owns(skin.id);
  if (newSkin) S.owned[skin.id] = 1;
  persist(); closeModal(); renderMenu(); refreshCharacters();
  // with an MR wedding skin the popup shows it; otherwise the character's own art
  showSkinGet(skin || e, { vow: true, sub: skin ? null : 'Wedding outfit coming soon' });
}

/* ---------- badges: faceted crystal crests; top tiers get wings and a glow ---------- */
const BADGES = [
  { id: 'owned', name: 'Collected', desc: 'Own this character', metal: 'bronze', gem: '#2fbf71', emblem: 'star', ok: e => owns(e.id) },
  { id: 'star3', name: 'Rising Star', desc: 'Raise this character to 3 stars', metal: 'silver', gem: '#3a7bff', emblem: 'star', ok: e => owns(e.id) && starsOf(e.id) >= 3 },
  { id: 'star6', name: 'Max Stars', desc: `Raise this character to ${MAX_STARS} stars`, metal: 'gold', gem: '#9b4dff', emblem: 'star', wings: true, glow: 'gold', ok: e => owns(e.id) && starsOf(e.id) >= MAX_STARS },
  { id: 'bond5', name: 'Close Bond', desc: 'Reach bond level 5', metal: 'rose', gem: '#ff3d6a', emblem: 'heart', ok: e => bondLv(e.id) >= 5 },
  { id: 'bond10', name: 'Soulbound', desc: `Reach bond level ${BOND_MAX}`, metal: 'gold', gem: '#ff5f9a', emblem: 'heart', wings: true, glow: 'gold', ok: e => bondLv(e.id) >= BOND_MAX },
  { id: 'married', name: 'Eternal Vow', desc: `Marry this character (bond level ${BOND_MAX} and 1 ring)`, metal: 'prism', gem: '#2a1650', emblem: 'ring', wings: true, glow: 'prism', ok: e => !!bondOf(e.id).married }
];
const METALS = {
  bronze: ['#ffe0bf', '#c9864a', '#6a3510'],
  silver: ['#ffffff', '#c3cfe6', '#4d5d7d'],
  gold: ['#fff6cc', '#f0bd4f', '#7a4e08'],
  rose: ['#ffe6ef', '#f08aa8', '#7a2042'],
  prism: ['#d9b3ff', '#ff6ec7', '#3ee6d0']
};
let badgeN = 0;
function badgeSVG(b) {
  const n = ++badgeN, [hi, mid, lo] = METALS[b.metal], ink = '#1e1426';
  const wing = `<path d="M17 25C11 22 5 17 2 9C6 12 9 13 12 13C8 10 6 7 6 2C10 7 14 10 18 13C16 9 16 6 17 3C19 9 21 14 22 20Z" fill="url(#bm${n})" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/><path d="M8 11L15 17M10 6L17 14" stroke="rgba(255,255,255,.55)" stroke-width=".8" fill="none"/>`;
  const emblem = b.emblem === 'star'
    ? '<path d="M28 20.5l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z" fill="#fffbe8" stroke="#1e1426" stroke-width=".9" stroke-linejoin="round"/>'
    : b.emblem === 'heart'
      ? '<path d="M28 35C21.5 30.5 20 27 22 24.3C23.8 22 26.6 22.5 28 24.6C29.4 22.5 32.2 22 34 24.3C36 27 34.5 30.5 28 35Z" fill="#fff0f5" stroke="#1e1426" stroke-width=".9"/>'
      : '<circle cx="28" cy="30" r="5.2" fill="none" stroke="#ffe08a" stroke-width="2.4"/><path d="M28 19.5l3.2 3-3.2 3-3.2-3z" fill="#e6f8ff" stroke="#1e1426" stroke-width=".8"/>';
  return `<svg class="bdg-svg" viewBox="0 0 56 56" aria-hidden="true"><defs>
      <linearGradient id="bm${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${mid}"/><stop offset="1" stop-color="${lo}"/></linearGradient>
      <radialGradient id="bg${n}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="${shade(b.gem, .45)}"/><stop offset=".55" stop-color="${b.gem}"/><stop offset="1" stop-color="${shade(b.gem, -.5)}"/></radialGradient></defs>
    ${b.wings ? `<g>${wing}</g><g transform="translate(56 0) scale(-1 1)">${wing}</g>` : ''}
    <path d="M28 4L50 26Q52 28 50 30L30 50Q28 52 26 50L6 30Q4 28 6 26L26 6Q28 4 28 4Z" fill="url(#bm${n})" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M28 11L45 28L28 45L11 28Z" fill="url(#bg${n})" stroke="${ink}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M28 11L28 28L11 28Z" fill="rgba(255,255,255,.28)"/><path d="M28 28L45 28L28 45Z" fill="rgba(0,0,0,.22)"/><path d="M28 11L45 28L28 28Z" fill="rgba(255,255,255,.1)"/>
    ${b.metal === 'prism' ? '<path d="M28 11L45 28L28 45L11 28Z" fill="none" stroke="url(#bm' + n + ')" stroke-width="1.6"/>' : ''}
    ${emblem}
    <path d="M14 22L24 12" stroke="rgba(255,255,255,.8)" stroke-width="1.6" stroke-linecap="round"/>
    ${b.glow ? '<g class="bdg-spark" fill="#fff"><path d="M46 8l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/><path d="M9 44l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z"/></g>' : ''}</svg>`;
}
const badgeHTML = (b, on, size = 46) => `<span class="bdg ${on ? 'got' : 'off'} ${on && b.glow ? 'glow-' + b.glow : ''}" style="--bs:${size}px" tabindex="0"
  data-tip="${esc(`<b>${esc(b.name)}</b><span>Requirement: ${esc(b.desc)}</span><em class="${on ? 'ok' : ''}">${on ? 'Unlocked' : 'Locked'}</em>`)}" aria-label="${esc(b.name)}: ${esc(b.desc)}${on ? ', unlocked' : ', locked'}">${badgeSVG(b)}</span>`;
const badgeRow = (e, size, onlyEarned) => BADGES.filter(b => !onlyEarned || b.ok(e)).map(b => badgeHTML(b, b.ok(e), size)).join('');

/* tooltips for anything with data-tip: hover or keyboard focus, or a tap on touch screens */
const tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl);
let tipTimer;
function showTip(el) {
  tipEl.innerHTML = el.dataset.tip; tipEl.classList.add('on');
  const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const above = r.top - h - 10 > 8;
  tipEl.style.left = `${clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8)}px`;
  tipEl.style.top = `${above ? r.top - h - 10 : r.bottom + 10}px`;
}
const hideTip = () => tipEl.classList.remove('on');
document.addEventListener('pointerover', e => { const t = e.target.closest('[data-tip]'); if (t && e.pointerType !== 'touch') showTip(t); });
document.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]') && e.pointerType !== 'touch') hideTip(); });
document.addEventListener('pointerdown', e => { const t = e.target.closest('[data-tip]'); clearTimeout(tipTimer); if (t && e.pointerType === 'touch') { showTip(t); tipTimer = setTimeout(hideTip, 2600); } else hideTip(); });
document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) showTip(t); });
document.addEventListener('focusout', hideTip);
