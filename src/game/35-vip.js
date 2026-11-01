/* ---------- VIP levels ----------
   VIP EXP: 100 per $1 topped up (vipFromUsd, called by the Top Up packs) and 50 a day from the daily quests' 100-point reward.
   Levels 1–12 (VIP_XP = total VIP EXP needed, doubling each level). Every level gives a daily reward (Pearls + Gold) claimed
   once a day in the VIP window (openVip); higher levels replace lower ones (VIP 5 = 5 pearls + 5,000 gold, not VIP 1–5 added).
   Levels never expire. State S.vip {xp, day} (player save). The badge border follows the CS grade colours (vipGrade). */
const VIP_XP = [250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000];
const VIP_MAX = VIP_XP.length, VIP_PER_USD = 100, VIP_QUEST = 50;
const vipDaily = lv => lv > 0 ? { pearls: lv, coins: lv * 1000 } : null;
const vipState = () => (S.vip = S.vip || { xp: 0, day: '' });
const vipLv = (xp = vipState().xp) => { let lv = 0; VIP_XP.forEach((n, i) => { if (xp >= n) lv = i + 1; }); return lv; };
/* VIP 1 = F … VIP 8 = SS, VIP 9–12 = SSS */
const VIP_GRADES = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const vipGrade = lv => lv > 0 ? VIP_GRADES[Math.min(lv, VIP_GRADES.length) - 1] : '';
const vipBadge = (lv = vipLv(), cls = '') => `<span class="vipb ${lv ? 'v-' + vipGrade(lv).toLowerCase() : 'v-0'} ${cls}"><span>VIP <b>${lv}</b></span></span>`;
const vipCanClaim = () => vipLv() > 0 && vipState().day !== dayKey();
function gainVip(n) {
  if (!(n > 0)) return;
  const st = vipState(), before = vipLv();
  st.xp += Math.round(n);
  const after = vipLv();
  if (after > before) setTimeout(() => toast(`VIP level up! You are now VIP ${after}.`), 400);
}
const vipFromUsd = usd => gainVip(Math.round(parseFloat(usd) * VIP_PER_USD));
function claimVip() {
  if (!vipCanClaim()) return;
  const lv = vipLv(), r = vipDaily(lv);
  vipState().day = dayKey();
  Object.entries(r).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; });
  persist(); renderMenu(); refreshSummon(); renderShop(); renderVip();
  showRewards(`VIP ${lv} daily reward`, r, 'Come back tomorrow for the next one');
}
function openVip() { openModal({ title: 'VIP', ic: 'crown', kind: 'vip', body: '<div id="vipRoot"></div>', onMount: () => renderVip() }); }
function renderVip() {
  const root = $('#vipRoot'); if (!root) return;
  const xp = vipState().xp, lv = vipLv(xp), lo = lv ? VIP_XP[lv - 1] : 0, hi = VIP_XP[lv], r = vipDaily(lv), can = vipCanClaim();
  root.innerHTML = `<div class="vip">
    <div class="vip-top">${vipBadge(lv, 'big')}
      <div class="vip-prog"><span class="lbl-sm">VIP EXP</span><b>${fmt(xp)}${hi ? ` <small>/ ${fmt(hi)}</small>` : ''}</b>
        <div class="bar"><i style="width:${hi ? Math.min(100, (xp - lo) / (hi - lo) * 100) : 100}%"></i></div>
        <span class="tiny">${hi ? `${fmt(hi - xp)} VIP EXP to VIP ${lv + 1}` : 'Highest VIP level reached'}</span></div></div>
    <div class="vip-claim">${r ? `<div><span class="lbl-sm">Daily reward · VIP ${lv}</span><span class="vip-rw">${curIcon('pearls')}<b>${r.pearls}</b>${curIcon('coins')}<b>${fmt(r.coins)}</b></span></div>
      <button class="btn gold" id="vipGo" ${can ? '' : 'disabled'}>${can ? 'Claim' : 'Claimed today'}</button>`
      : `<span class="tiny">Reach VIP 1 (${fmt(VIP_XP[0])} VIP EXP) to get a daily reward.</span>`}</div>
    <div class="vip-list" id="vipList">${VIP_XP.map((n, i) => { const L = i + 1, d = vipDaily(L);
      return `<div class="vip-row ${L === lv ? 'on' : ''} ${L <= lv ? 'got' : ''}">${vipBadge(L, 'sm')}<span class="vip-need">${fmt(n)} VIP EXP</span>
        <span class="vip-rw">${curIcon('pearls')}<b>${d.pearls}</b>${curIcon('coins')}<b>${fmt(d.coins)}</b></span><small>daily</small></div>`; }).join('')}</div>
    <p class="tiny">Earn ${VIP_PER_USD} VIP EXP for every $1 topped up, and ${VIP_QUEST} VIP EXP every day from the daily quests' 100-point reward. Each level needs double the VIP EXP of the one before. Claim your reward once a day; a higher level replaces the lower one's reward (they don't add up). VIP levels never expire or reset. More VIP privileges arrive in a future update.</p>
  </div>`;
  const b = $('#vipGo'); if (b) b.onclick = claimVip;
  const row = root.querySelector('.vip-row.on'), list = $('#vipList'); if (row && list) list.scrollTop = row.offsetTop - list.offsetTop - 40;
}
CUR_SVG.vip = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="vipG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe4f6"/><stop offset=".5" stop-color="#c8a2ff"/><stop offset="1" stop-color="#94b8ff"/></linearGradient></defs><path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5z" fill="url(#vipG)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 15.5h8" stroke="#2b1855" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></svg>';
if (!ICONS.crown) ICONS.crown = '<path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5z"/>';
