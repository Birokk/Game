/* ---------- VIP levels ----------
   VIP EXP: 100 per $1 topped up (vipFromUsd, called by the Top Up packs) and 50 a day from the daily quests' 100-point reward.
   Levels 1–12 (VIP_XP = total VIP EXP needed, doubling each level). Every level gives a daily reward (Pearls + Gold) claimed
   once a day in the VIP window (openVip); higher levels replace lower ones (VIP 5 = 5 pearls + 5,000 gold, not VIP 1–5 added).
   Levels never expire. Each level also has a rank name (VIP_RANKS), a one-time reward (VIP_LVREW, S.vip.got) and a list of
   planned privileges (VIP_PRIVS: ideas only, not active). State S.vip {xp, day, got} (player save). The badge border follows the CS grade colours (vipGrade). */
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
/* rank names (shown on the VIP card) */
const VIP_RANKS = ['Guest', 'Squire', 'Knight', 'Baronet', 'Baron', 'Viscount', 'Count', 'Marquis', 'Duke', 'Archduke', 'Prince', 'Sovereign', 'Emperor'];
/* one-time reward for reaching each level (placeholders), claimed in the VIP window: S.vip.got = [levels] */
const VIP_LVREW = [null,
  { pearls: 20, coins: 10000 }, { pearls: 30, tickets: 2 }, { pearls: 50, tickets: 5 }, { pearls: 80, bottles: 5 },
  { pearls: 100, tickets: 10 }, { pearls: 150, memtk: 1 }, { pearls: 200, tickets: 15 }, { pearls: 250, wishes: 20 },
  { pearls: 300, tickets: 20 }, { pearls: 400, memtk: 2 }, { pearls: 500, tickets: 30 }, { pearls: 800, memtk: 3 }];
/* privileges: ideas only, NOT active yet (shown with a "Soon" note). Each level keeps the ones before it; [level, text] */
const VIP_PRIVS = [
  [1, 'Base production +5%'], [1, 'Expedition gold +5%'],
  [2, '+1 scratch card per day'], [2, 'Max stamina +10'],
  [3, 'Exclusive title: Tidecaller', 1], [3, '+1 Daily Spin per day'], [3, 'Raids: Clear ×10 button'],
  [4, 'Base production +10% (replaces +5%)'], [4, 'VIP name colour in world chat'],
  [5, 'Expeditions take 1 hour less'], [5, '+1 free daily pull on the Limited banner'],
  [6, 'Exclusive avatar frame: Pearl Regalia', 1], [6, 'Max stamina +20 (replaces +10)'],
  [7, 'Camp brings back 1 extra piece'], [7, 'Base production +15% (replaces +10%)'],
  [8, 'Exclusive namecard: Abyssal Pearl', 1], [8, 'Mystery Fountain wishes 10% cheaper'],
  [9, 'Eggs hatch 20% faster'], [9, '+2 Daily Spins per day (replaces +1)'],
  [10, 'Exclusive title: Ocean Monarch', 1], [10, 'Raids: +10% chance of a second drop'],
  [11, 'Exclusive namecard: Emperor\'s Tide', 1], [11, 'Expedition rewards +20%'], [11, 'Pearl Honor levels cost 2 pearls'],
  [12, 'Exclusive animated frame: Tide Emperor', 1], [12, 'Base production +25% (replaces +15%)']
];
const vipGot = lv => (vipState().got || []).includes(lv);
const vipLvReady = () => { const L = vipLv(); for (let i = 1; i <= L; i++) if (!vipGot(i)) return true; return false; };
const vipReady = () => vipCanClaim() || vipLvReady();
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
function claimVipLevel(lv) {
  if (lv > vipLv() || vipGot(lv)) return;
  const st = vipState(), r = VIP_LVREW[lv]; st.got = [...(st.got || []), lv];
  Object.entries(r).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; });
  persist(); renderMenu(); refreshSummon(); renderVip();
  showRewards(`VIP ${lv} · ${VIP_RANKS[lv]} reward`, r, 'One-time reward for reaching this VIP level');
}
let vipView = null;   // the level shown in the VIP window (arrows browse 1–12)
function openVip() { vipView = Math.max(1, vipLv()); openModal({ title: 'VIP', ic: 'crown', kind: 'vip', body: '<div id="vipRoot"></div>', onMount: () => renderVip() }); }
/* the VIP emblem: the level number in a circle whose ring uses that level's grade colour (same colours as the VIP badge border) */
const vipEmblem = lv => `<span class="vip-num ${lv ? 'v-' + vipGrade(lv).toLowerCase() : 'v-0'}" aria-label="VIP ${lv}"><b>${lv}</b></span>`;
function renderVip() {
  const root = $('#vipRoot'); if (!root) return;
  const xp = vipState().xp, my = vipLv(xp), v = Math.min(VIP_MAX, Math.max(1, vipView || 1)), need = VIP_XP[v - 1];
  const lo = my ? VIP_XP[my - 1] : 0, hi = VIP_XP[my], prog = hi ? Math.min(100, (xp - lo) / (hi - lo) * 100) : 100;
  const d = vipDaily(v), canD = v === my && vipCanClaim(), lr = VIP_LVREW[v], got = vipGot(v), canL = v <= my && !got;
  const privs = [...VIP_PRIVS.filter(([l]) => l === v), ...VIP_PRIVS.filter(([l]) => l < v).reverse()];   // this level's new ones first
  root.innerHTML = `<div class="vipx">
    <button class="vipx-nav prev" id="vipPrev" ${v <= 1 ? 'disabled' : ''} aria-label="Previous VIP level">${icon('back')}</button>
    <div class="vipx-left">
      <span class="vipx-rank">${VIP_RANKS[v]}</span>
      ${vipEmblem(v)}
      <span class="vipx-lvl">${v === my ? 'Your level' : v < my ? 'Reached' : 'Not reached yet'}</span>
      <div class="vipx-bar"><span class="vipx-bic">${curIcon('vip')}</span><div class="vipx-track"><i style="width:${v <= my ? 100 : Math.min(100, xp / need * 100)}%"></i></div><b>${fmt(Math.min(xp, need))} / ${fmt(need)}</b></div>
      <div class="vipx-daily"><span class="vipx-pill">Daily Reward</span>
        <div class="vipx-items">${Object.entries(d).map(([k, n]) => bpItem(k, n)).join('')}</div>
        ${v === my ? `<button class="btn gold sm" id="vipGo" ${canD ? '' : 'disabled'}>${canD ? 'Claim' : 'Claimed today'}</button>` : `<span class="tiny">${v > my ? `Reach VIP ${v} for this daily reward` : 'Your higher level gives more each day'}</span>`}</div>
    </div>
    <div class="vipx-right">
      <span class="vipx-pill big">Privileges</span>
      <ul class="vipx-privs">${privs.map(([l, t, on]) => `<li class="${on ? 'on' : ''}">${l === v ? '<span class="vipx-new">NEW</span>' : '<span class="vipx-dot"></span>'}<span>${esc(t)}</span>${on ? `<span class="vipx-act">${vipLv() >= l ? 'Unlocked' : 'Active'}</span>` : ''}</li>`).join('')}</ul>
      <p class="vipx-soon">${icon('info')}Titles, frames and namecards are real: equip them in Profile settings once you reach the level. The other privileges arrive in a future update.</p>
      <div class="vipx-reward"><span class="vipx-rl">Reward</span><div class="vipx-items">${Object.entries(lr).map(([k, n]) => bpItem(k, n)).join('')}</div>
        ${got ? '<span class="vipx-stamp">Claimed</span>' : canL ? `<button class="btn gold" id="vipLvGo">Claim</button>` : `<span class="vipx-lock">${icon('lock')}Reach VIP ${v}<small>${fmt(need - xp)} VIP EXP to go</small></span>`}</div>
    </div>
    <button class="vipx-nav next" id="vipNext" ${v >= VIP_MAX ? 'disabled' : ''} aria-label="Next VIP level">${icon('back')}</button>
    <div class="vipx-foot"><span class="tiny">${my ? `You are VIP ${my} · ${VIP_RANKS[my]} · ${fmt(xp)} VIP EXP${hi ? ` · ${fmt(hi - xp)} to VIP ${my + 1}` : ''}` : `${fmt(VIP_XP[0] - xp)} VIP EXP to VIP 1`} · ${VIP_PER_USD} VIP EXP per $1 topped up, ${VIP_QUEST} a day from the daily quests. Levels never expire.</span>
      <div class="vipx-dots">${VIP_XP.map((_, i) => `<button class="${i + 1 === v ? 'on' : ''} ${i + 1 <= my ? 'got' : ''} ${i + 1 <= my && !vipGot(i + 1) ? 'red' : ''}" data-vipv="${i + 1}" aria-label="VIP ${i + 1}"></button>`).join('')}</div></div>
  </div>`;
  const go = (n) => { vipView = Math.min(VIP_MAX, Math.max(1, n)); renderVip(); };
  $('#vipPrev').onclick = () => go(v - 1); $('#vipNext').onclick = () => go(v + 1);
  root.querySelectorAll('[data-vipv]').forEach(b => b.onclick = () => go(+b.dataset.vipv));
  const b = $('#vipGo'); if (b) b.onclick = claimVip;
  const l = $('#vipLvGo'); if (l) l.onclick = () => claimVipLevel(v);
}
CUR_SVG.vip = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="vipG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe4f6"/><stop offset=".5" stop-color="#c8a2ff"/><stop offset="1" stop-color="#94b8ff"/></linearGradient></defs><path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5z" fill="url(#vipG)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 15.5h8" stroke="#2b1855" stroke-width="1.6" stroke-linecap="round" opacity=".6"/></svg>';
if (!ICONS.crown) ICONS.crown = '<path d="M3 8l4.5 3.5L12 4l4.5 7.5L21 8l-2 11H5z"/>';

/* ---------- VIP cosmetics (equip in Profile settings): glowing titles, frames and namecards, unlocked by reaching the level ---------- */
[3, 6, 8, 10, 11, 12].forEach(l => { UNLOCK['vip' + l] = [() => vipLv() >= l, `Reach VIP ${l}`]; });
TITLES.push({ id: 'vip-tide', name: 'Tidecaller', cls: 't-vtide', need: 'vip3', vip: true }, { id: 'vip-monarch', name: 'Ocean Monarch', cls: 't-vmonarch', need: 'vip10', vip: true });
FRAMES.push({ id: 'vregalia', name: 'Pearl Regalia', need: 'vip6', premium: true, vip: true }, { id: 'vemperor', name: 'Tide Emperor', need: 'vip12', premium: true, vip: true });
CARDS.push({ id: 'vabyss', name: 'Abyssal Pearl', need: 'vip8', premium: true, vip: true }, { id: 'vempire', name: 'Emperor\'s Tide', need: 'vip11', premium: true, vip: true });
