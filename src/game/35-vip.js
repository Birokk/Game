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
  [3, '+1 Daily Spin per day'], [3, 'Raids: Clear ×10 button'],
  [4, 'Base production +10% (replaces +5%)'], [4, 'VIP name colour in world chat'],
  [5, 'Expeditions take 1 hour less'], [5, '+1 free daily pull on the Limited banner'],
  [6, 'Exclusive avatar frame: Pearl Regalia'], [6, 'Max stamina +20 (replaces +10)'],
  [7, 'Camp brings back 1 extra piece'], [7, 'Base production +15% (replaces +10%)'],
  [8, 'Exclusive namecard: Abyssal Pearl'], [8, 'Mystery Fountain wishes 10% cheaper'],
  [9, 'Eggs hatch 20% faster'], [9, '+2 Daily Spins per day (replaces +1)'],
  [10, 'Exclusive title: Ocean Monarch'], [10, 'Raids: +10% chance of a second drop'],
  [11, 'Expedition rewards +20%'], [11, 'Pearl Honor levels cost 2 pearls'],
  [12, 'Exclusive animated frame: Tide Emperor'], [12, 'Base production +25% (replaces +15%)']
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
/* the VIP crest: a faceted crystal gem with a pearl in a metal frame in the level's grade colour, wings from VIP 4 (bigger
   from VIP 8), a star from VIP 6 and a crown from VIP 10, on a ribbon that reads "VIP n"; S / SS / SSS levels glow */
const VIP_PAL = { 0: ['#eef0f6', '#a9afbf', '#5d6373'], f: ['#e8eaf0', '#9aa1b2', '#4e5464'], e: ['#e6eef2', '#8fa3b0', '#465a69'],
  d: ['#d2f7e4', '#4fbf8c', '#1f5c43'], c: ['#d8eeff', '#4f9fe6', '#1d4a80'], b: ['#e6e0ff', '#8a76ee', '#3a2b92'],
  a: ['#fcdcff', '#d566e6', '#742282'], s: ['#fff4c8', '#f2bd45', '#94600f'], ss: ['#ffd6f5', '#b98bff', '#2fb8a8'], sss: ['#ffd8c8', '#ff3048', '#64000f'] };
let vipCN = 0;
function vipEmblem(lv) {
  const k = lv ? vipGrade(lv).toLowerCase() : '0', P = VIP_PAL[k], id = 'vc' + (++vipCN);
  const wing = big => `<path d="M50 54C30 40 12 44 4 58c9-2 15-1 20 2-9 2-15 7-17 15 8-4 15-5 21-3-6 4-9 10-9 17 8-6 16-9 25-9z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" ${big ? 'transform="translate(-6 -6) scale(1.12)"' : ''}/>
    <path d="M46 58c-10-3-20-2-28 4M44 66c-9 0-16 2-22 7M44 74c-7 2-12 6-15 11" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.1" stroke-linecap="round"/>`;
  const wings = lv >= 4 ? `<g>${wing(lv >= 8)}</g><g transform="translate(160 0) scale(-1 1)">${wing(lv >= 8)}</g>` : '';
  const crown = lv >= 10 ? `<path d="M60 22l6-14 7 9 7-12 7 12 7-9 6 14z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="80" cy="5" r="3" fill="url(#${id}p)"/><circle cx="66" cy="8" r="2.2" fill="url(#${id}p)"/><circle cx="94" cy="8" r="2.2" fill="url(#${id}p)"/>`
    : lv >= 6 ? `<path d="M80 4l3.4 8.6 9.1.7-7 5.9 2.2 8.9-7.7-4.9-7.7 4.9 2.2-8.9-7-5.9 9.1-.7z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/>` : '';
  const oct = (r, cx = 80, cy = 66) => { const pts = []; for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + i * Math.PI / 4; pts.push(`${(cx + Math.cos(t) * r).toFixed(1)} ${(cy + Math.sin(t) * r * 1.02).toFixed(1)}`); } return 'M' + pts.join('L') + 'Z'; };
  const facets = Array.from({ length: 8 }, (_, i) => { const t = Math.PI / 8 + i * Math.PI / 4; return `M80 66L${(80 + Math.cos(t) * 30).toFixed(1)} ${(66 + Math.sin(t) * 30.6).toFixed(1)}`; }).join('');
  return `<span class="vip-crest v-${k}"><svg viewBox="0 0 160 150" aria-label="VIP ${lv}">
    <defs><linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset=".5" stop-color="${P[1]}"/><stop offset="1" stop-color="${P[2]}"/></linearGradient>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${P[0]}"/><stop offset="1" stop-color="${P[1]}"/></linearGradient>
      <radialGradient id="${id}p" cx="36%" cy="30%" r="72%"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f6efff"/><stop offset="1" stop-color="#b9a6e6"/></radialGradient></defs>
    ${wings}${crown}
    <path d="${oct(46)}" fill="url(#${id}m)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="${oct(38)}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <path d="${oct(31)}" fill="url(#${id}g)" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="${facets}" stroke="rgba(255,255,255,.6)" stroke-width="1"/>
    <path d="M80 66L${(80 + Math.cos(Math.PI * 1.125) * 30).toFixed(1)} ${(66 + Math.sin(Math.PI * 1.125) * 30.6).toFixed(1)}L${(80 + Math.cos(Math.PI * 1.375) * 30).toFixed(1)} ${(66 + Math.sin(Math.PI * 1.375) * 30.6).toFixed(1)}Z" fill="rgba(255,255,255,.45)"/>
    <circle cx="80" cy="66" r="13" fill="url(#${id}p)" stroke="#fff" stroke-width="1.6"/><circle cx="76" cy="62" r="3.4" fill="#fff" opacity=".9"/>
    <path d="M118 30l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6z" fill="#fff" class="vc-tw"/>
    <path d="M30 108h100l-8 9 8 9H30l8-9z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M42 106h76v22H42z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.6"/>
    <text x="80" y="122.5" text-anchor="middle">VIP ${lv}</text></svg></span>`;
}
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
      <ul class="vipx-privs">${privs.map(([l, t]) => `<li>${l === v ? '<span class="vipx-new">NEW</span>' : '<span class="vipx-dot"></span>'}<span>${esc(t)}</span></li>`).join('')}</ul>
      <p class="vipx-soon">${icon('info')}Privileges are planned and arrive in a future update. For now every level gives its daily reward and one-time reward.</p>
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
