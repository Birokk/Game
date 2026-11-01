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
/* the VIP crest: a scallop shell in the level's grade metal holding a glowing pearl (the game's ocean theme). Higher levels
   add more: a sunburst of light behind it (VIP 4+), small pearls along the rim (VIP 7+), a crown (VIP 10+); S / SS / SSS glow. */
const VIP_PAL = { 0: ['#f4f5fa', '#b8bdcb', '#6b7181'], f: ['#eef0f5', '#a7adbd', '#5a6070'], e: ['#ebf2f5', '#9cb0bc', '#4f6372'],
  d: ['#dcfbea', '#5cc796', '#22654a'], c: ['#e0f1ff', '#5aa7ea', '#1f4f88'], b: ['#ece6ff', '#9481f0', '#3d2e98'],
  a: ['#fde3ff', '#d86fe8', '#7a2588'], s: ['#fff6d2', '#f0bf4c', '#9a6512'], ss: ['#ffe0f7', '#c296ff', '#3ab9aa'], sss: ['#ffe1d4', '#ff4256', '#6e0613'] };
let vipCN = 0;
function vipEmblem(lv) {
  const k = lv ? vipGrade(lv).toLowerCase() : '0', P = VIP_PAL[k], id = 'vc' + (++vipCN), HX = 80, HY = 120, R = 66, N = 9, A0 = -152, SPAN = 124;
  const xy = (deg, r, cx = HX, cy = HY) => [cx + Math.cos(deg * Math.PI / 180) * r, cy + Math.sin(deg * Math.PI / 180) * r];
  const pt = (deg, r) => xy(deg, r).map(v => v.toFixed(1)).join(' ');
  const angs = Array.from({ length: N + 1 }, (_, i) => A0 + i * (SPAN / N));
  const scal = angs.slice(0, -1).map((a0, i) => `Q${pt((a0 + angs[i + 1]) / 2, R * 1.13)} ${pt(angs[i + 1], R)}`).join('');
  const shell = `M${HX} ${HY}L${pt(angs[0], R)}${scal}Z`;
  const ribs = angs.slice(0, -1).map((a0, i) => { const a1 = angs[i + 1], am = (a0 + a1) / 2;
    return `<path d="M${HX} ${HY}L${pt(a0, R)}Q${pt(am, R * 1.13)} ${pt(a1, R)}Z" fill="url(#${id}s)"/>${i % 2 ? `<path d="M${HX} ${HY}L${pt(a0, R)}Q${pt(am, R * 1.13)} ${pt(a1, R)}Z" fill="${P[2]}" opacity=".18"/>` : ''}
      <path d="M${HX} ${HY}L${pt(am, R * 1.06)}" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`; }).join('');
  const grooves = angs.slice(1, -1).map(a => `<path d="M${HX} ${HY}L${pt(a, R)}"/>`).join('');
  const C = [80, 82];
  const rays = lv >= 4 ? `<g class="vc-rays">${Array.from({ length: 12 }, (_, i) => { const a = i * 30, L = lv >= 8 ? 78 : 70, w = 7;
    const [x1, y1] = xy(a - w, 18, ...C), [x2, y2] = xy(a, L, ...C), [x3, y3] = xy(a + w, 18, ...C);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}L${x3.toFixed(1)} ${y3.toFixed(1)}Z" fill="url(#${id}r)"/>`; }).join('')}</g>` : '';
  const rimPearls = lv >= 7 ? angs.slice(0, -1).map((a0, i) => { const [x, y] = xy((a0 + angs[i + 1]) / 2, R * 1.05); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="url(#${id}p)" stroke="#fff" stroke-width=".7"/>`; }).join('') : '';
  const crown = lv >= 10 ? `<g transform="translate(0 -8)"><path d="M63 50l4-14 8.5 8.5L80 30l4.5 14.5L93 36l4 14z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><rect x="62" y="48.5" width="36" height="6" rx="2" fill="url(#${id}m)" stroke="#fff" stroke-width="1.2"/><circle cx="80" cy="28" r="3.4" fill="url(#${id}p)"/><circle cx="67" cy="34" r="2.6" fill="url(#${id}p)"/><circle cx="93" cy="34" r="2.6" fill="url(#${id}p)"/></g>` : '';
  return `<span class="vip-crest v-${k}"><svg viewBox="0 0 160 150" aria-label="VIP ${lv}">
    <defs><radialGradient id="${id}s" gradientUnits="userSpaceOnUse" cx="${HX}" cy="${HY}" r="${R * 1.15}"><stop offset="0" stop-color="${P[2]}"/><stop offset=".45" stop-color="${P[1]}"/><stop offset=".85" stop-color="${P[0]}"/><stop offset="1" stop-color="#fff"/></radialGradient>
      <linearGradient id="${id}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P[0]}"/><stop offset=".5" stop-color="${P[1]}"/><stop offset="1" stop-color="${P[2]}"/></linearGradient>
      <linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="${C[0]}" y1="${C[1]}" x2="${C[0]}" y2="${C[1] - 78}"><stop offset="0" stop-color="${P[1]}" stop-opacity=".85"/><stop offset="1" stop-color="${P[0]}" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}p" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f7f0ff"/><stop offset="1" stop-color="#b6a3e4"/></radialGradient>
      <radialGradient id="${id}g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".55" stop-color="${P[0]}" stop-opacity=".6"/><stop offset="1" stop-color="${P[1]}" stop-opacity="0"/></radialGradient></defs>
    ${rays}${crown}
    <path d="${shell}" fill="none" stroke="${P[2]}" stroke-width="7" stroke-linejoin="round" opacity=".55"/>
    ${ribs}
    <g stroke="${P[2]}" stroke-width="1.2" fill="none" opacity=".55">${grooves}</g>
    <path d="${shell}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    ${rimPearls}
    <path d="M64 118q16 9 32 0l-3 13q-13 6-26 0z" fill="url(#${id}m)" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M70 124h20" stroke="rgba(255,255,255,.6)" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="80" cy="102" r="26" fill="url(#${id}g)"/>
    <circle cx="80" cy="102" r="14.5" fill="url(#${id}p)" stroke="#fff" stroke-width="1.8"/>
    <ellipse cx="75" cy="96.5" rx="5" ry="3.4" fill="#fff" opacity=".95" transform="rotate(-30 75 96.5)"/>
    <path d="M122 44l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8z" fill="#fff" class="vc-tw"/>
    <path d="M36 74l1.3 3 3 1.3-3 1.3-1.3 3-1.3-3-3-1.3 3-1.3z" fill="#fff" class="vc-tw t2"/></svg></span>`;
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
      <span class="vipx-lvl"><b>VIP ${v}</b> · ${v === my ? 'Your level' : v < my ? 'Reached' : 'Not reached yet'}</span>
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
