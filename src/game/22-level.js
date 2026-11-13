/* ---------- player level: EXP from playing, a reward for every level (Level rewards window) ----------
   S.player.xp = total EXP earned; S.lvClaimed = levels whose reward was taken. The EXP icon (icon slot 'exp', editable in
   Settings or admin → Icons) only shows where EXP is offered as a reward. */
const LV_MAX = 60;
const lvNeed = lv => 100 + (lv - 1) * 50;                 // EXP to go from lv to lv + 1
const EXP = { pull: 10, login: 50, spin: 20, ach: 30, hatch: 25, raid: 15 };
const EXP_WAYS = [['pull', 'Summon', 'per pull'], ['login', 'Daily login', 'per day'], ['spin', 'Daily spin', 'per spin'], ['ach', 'Achievement', 'each'], ['hatch', 'Hatch a pet', 'each'], ['raid', 'Raid', 'per clear']];
CUR_SVG.exp = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#3fd47e" stroke="#16683a" stroke-width="1.4"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#c8ffd9" stroke-width=".9" opacity=".8"/><path d="M12 5.2l1.9 4.3 4.6.4-3.5 3 1.1 4.6L12 15l-4.1 2.5 1.1-4.6-3.5-3 4.6-.4z" fill="#fff8c8" stroke="#16683a" stroke-width=".8" stroke-linejoin="round"/></svg>';
ICONS.level = '<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z"/><path d="M12 8v6"/><path d="M9.5 10.5L12 8l2.5 2.5"/>';
const expTag = n => `<span class="exp-tag">${curIcon('exp')}+${fmt(n)} EXP</span>`;
function playerLv() {
  let xp = Math.max(0, S.player.xp || 0), lv = 1;
  while (lv < LV_MAX && xp >= lvNeed(lv)) { xp -= lvNeed(lv); lv++; }
  return { lv, xp, need: lv < LV_MAX ? lvNeed(lv) : 0 };   // past the max, EXP keeps adding up (xp = what's saved for levels added later)
}
function gainExp(n) {
  if (!n) return;
  const before = playerLv().lv; S.player.xp = (S.player.xp || 0) + n; const after = playerLv().lv;
  persist();
  if (after > before) { renderMenu(); setTimeout(() => toast(`Level up! You are now level ${after}. Rewards are waiting in Level rewards.`), 600); }
  if ($('#lvRoot')) renderLevel();
}
/* the reward for reaching each level: gold every level, more pearls every 5, tickets every 10 */
function lvReward(lv) {
  const r = [['coins', 2000 + lv * 500], ['pearls', lv % 5 ? 3 : 15]];
  if (lv % 10 === 0) r.push(['tickets', 3], ['wishes', 2]);
  else if (lv % 5 === 0) r.push(['tickets', 1]);
  else if (lv % 2 === 0) r.push(['bottles', 1]);
  return r;
}
const lvClaimed = lv => (S.lvClaimed || []).includes(lv);
const lvReady = () => { const L = playerLv().lv; for (let i = 1; i <= L; i++) if (!lvClaimed(i)) return true; return false; };
/* shared "You got" window for claimed rewards: got = {currencyKey: amount} */
const REW_NAMES = { coins: ['gold', 'gold'], pearls: ['pearl', 'pearls'], tickets: ['Limited ticket', 'Limited tickets'], wishes: ['Standard ticket', 'Standard tickets'], bottles: ['stamina bottle', 'stamina bottles'], exp: ['EXP', 'EXP'], starlight: ['Coral', 'Corals'], dust: ['Seaweed', 'Seaweeds'], rings: ['ring', 'rings'], memtk: ['UR memory ticket', 'UR memory tickets'], vip: ['VIP EXP', 'VIP EXP'], nametk: ['name change ticket', 'name change tickets'], ursel: ['UR selector', 'UR selectors'], cfur: ['UR character fragment', 'UR character fragments'], cfssr: ['SSR character fragment', 'SSR character fragments'], fragssr: ['SSR egg fragment', 'SSR egg fragments'], fragur: ['UR egg fragment', 'UR egg fragments'], eggur: ['UR egg', 'UR eggs'], bond: ['bond EXP', 'bond EXP'] };
const REW_R = { tickets: 5, pearls: 5, starlight: 5, rings: 5, wishes: 4, bottles: 4, coins: 3, exp: 3, dust: 3, vip: 5, memtk: 5, nametk: 4, ursel: 5, cfur: 5, cfssr: 4, fragssr: 4, fragur: 5, eggur: 5, bond: 5 };
function showRewards(title, got, sub = '') {
  const items = Object.entries(got).filter(([, n]) => n > 0); if (!items.length) return;
  const old = document.querySelector('.rewpop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop rewpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', title);
  el.innerHTML = `<div class="rdrop-box"><h2 class="ts">${esc(title)}</h2>${sub ? `<p class="tiny">${esc(sub)}</p>` : ''}
    <div class="rew-grid">${items.map(([k, n], i) => `<div class="rew-it" style="--i:${i}"><span class="inv-cell r${REW_R[k] || 4}"><span class="inv-pic">${curIcon(k)}</span></span><b>${fmt(n)}</b><small>${(REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1]}</small></div>`).join('')}</div>
    <div class="row" style="justify-content:center"><button class="btn gold" data-rewok>Great!</button></div></div>`;
  const close = () => el.remove();
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('[data-rewok]').onclick = close;
  document.body.appendChild(el);
}
function claimLevels(list) {
  const got = {};
  list.forEach(lv => { if (lvClaimed(lv) || lv > playerLv().lv) return; (S.lvClaimed = S.lvClaimed || []).push(lv); lvReward(lv).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; got[k] = (got[k] || 0) + n; }); });
  if (!Object.keys(got).length) return;
  const n = list.filter(lv => lvClaimed(lv)).length;
  persist(); renderMenu(); refreshSummon(); renderLevel();
  showRewards('Level rewards', got, `${n} level reward${n === 1 ? '' : 's'} claimed`);
}
/* the Level window, remade in glass (the owner asked for the new UI design and transparency; styles .lvx at the end of
   main.css): a glass card with the level medallion (a turning crystal ring), the EXP bar and claimed / ready counts, the ways
   to earn EXP, and the rewards as a timeline of glass rows (a rail lit up to your level, a diamond node per level, the
   rewards as inventory cards in their rarity colours, Claim / Claimed / Reach Lv n), filtered by All / Ready / Milestones */
let lvFilter = 'all';
const LV_WAY_IC = { pull: 'summon', login: 'calendar', spin: 'wheel', ach: 'ach', hatch: 'paw', raid: 'raid' };
const lvItem = (k, n) => `<span class="inv-cell bp-sq lvx-it r${REW_R[k] || 4}" title="${fmt(n)} ${esc((REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1])}"><span class="inv-pic">${curIcon(k)}</span><b>${fmt(n)}</b></span>`;
function openLevel() { lvFilter = 'all'; openModal({ title: 'Level rewards', ic: 'level', wide: true, kind: 'level', body: '<div id="lvRoot"></div>', onMount: () => { renderLevel(true); } }); }
function renderLevel(scrollToNext) {
  const root = $('#lvRoot'); if (!root) return;
  const P = playerLv(), ready = [], keep = $('#lvList') ? $('#lvList').scrollTop : 0;
  for (let i = 1; i <= P.lv; i++) if (!lvClaimed(i)) ready.push(i);
  const claimedN = Array.from({ length: LV_MAX }, (_, i) => i + 1).filter(lvClaimed).length;
  const show = lv => lvFilter === 'ready' ? !lvClaimed(lv) && lv <= P.lv : lvFilter === 'ms' ? lv % 5 === 0 : true;
  const rows = Array.from({ length: LV_MAX }, (_, i) => i + 1).filter(show).map(lv => { const got = lvClaimed(lv), can = !got && lv <= P.lv, ms = lv % 10 === 0 ? 'ms10' : lv % 5 === 0 ? 'ms5' : '';
    return `<div class="lvx-row ${got ? 'got' : ''} ${can ? 'can' : ''} ${lv > P.lv ? 'locked' : ''} ${lv === P.lv ? 'now' : ''} ${lv < P.lv ? 'past' : ''} ${ms}" data-lvrow="${lv}">
      <span class="lvx-node"><b>${lv}</b></span>
      <div class="lvx-rc"><span class="lvx-lv"><small>Player level</small><b>Lv ${lv}</b>${lv === P.lv ? '<em class="now">You are here</em>' : ms ? `<em>${lv % 10 === 0 ? 'Big reward' : 'Milestone'}</em>` : ''}</span>
        <div class="lvx-items">${lvReward(lv).map(([k, n]) => lvItem(k, n)).join('')}</div>
        <span class="lvx-st">${got ? `<span class="lvx-done">${icon('check')}Claimed</span>` : can ? `<button class="lvx-go" data-lvclaim="${lv}">${icon('gift')}Claim</button>` : `<span class="lvx-lock">${icon('lock')}Reach Lv ${lv}</span>`}</span></div></div>`; }).join('');
  const seg = (k, t) => `<button class="lvx-sg ${lvFilter === k ? 'on' : ''}" data-lvf="${k}" aria-pressed="${lvFilter === k}">${t}</button>`;
  root.innerHTML = `<div class="lvx">
    <aside class="lvx-side">
      <div class="lvx-card lvx-me"><span class="lvx-kind">${icon('level')}Player level</span>
        <div class="lvx-medal"><i class="lvx-ring"></i><i class="lvx-ring r2"></i><span class="lvx-core"><small>Lv</small><b>${P.lv}</b></span></div>
        <b class="lvx-name">${esc(S.player.name || 'Traveler')}</b>
        ${P.need ? `<div class="lvx-bar"><i style="width:${Math.min(100, P.xp / P.need * 100)}%"></i></div><span class="lvx-xp"><b>${fmt(P.xp)}</b> / ${fmt(P.need)} EXP <em>to Lv ${P.lv + 1}</em></span>` : `<div class="lvx-bar"><i style="width:100%"></i></div><span class="lvx-xp">Max level reached <em>${fmt(P.xp)} EXP saved for future levels</em></span>`}
        <div class="lvx-stats"><span><b>${claimedN}</b><small>Claimed</small></span><span class="${ready.length ? 'hot' : ''}"><b>${ready.length}</b><small>Ready</small></span><span><b>${LV_MAX}</b><small>Max level</small></span></div></div>
      <div class="lvx-card lvx-ways"><span class="lvx-h">${icon('sparkle')}How to earn EXP</span>
        ${EXP_WAYS.map(([k, l, per]) => `<div class="lvx-way"><span class="lvx-wi">${icon(LV_WAY_IC[k] || 'star')}</span><span class="lvx-wt"><b>${l}</b><small>${per}</small></span>${expTag(EXP[k])}</div>`).join('')}
        <div class="lvx-way"><span class="lvx-wi">${icon('farm')}</span><span class="lvx-wt"><b>Base · Inn</b><small>per day at Lv 7</small></span>${expTag(farmDef('inn').day)}</div></div>
    </aside>
    <section class="lvx-main">
      <div class="lvx-top"><span class="lvx-tt"><b>Level rewards</b><small>${ready.length ? `${ready.length} reward${ready.length === 1 ? '' : 's'} ready to claim` : 'Level up to unlock more rewards'}</small></span>
        <span class="lvx-seg" role="group">${seg('all', 'All')}${seg('ready', `Ready${ready.length ? ` <i>${ready.length}</i>` : ''}`)}${seg('ms', 'Milestones')}</span>
        <button class="btn gold" id="lvAll" ${ready.length ? '' : 'disabled'}>${icon('gift')}Claim all${ready.length ? ` (${ready.length})` : ''}</button></div>
      <div class="lvx-list" id="lvList">${rows || '<p class="lvx-empty">Nothing here right now. Level up to unlock the next reward.</p>'}</div></section></div>`;
  root.querySelectorAll('[data-lvclaim]').forEach(b => b.onclick = () => claimLevels(ready));   // any Claim takes every ready level
  root.querySelectorAll('[data-lvf]').forEach(b => b.onclick = () => { lvFilter = b.dataset.lvf; renderLevel(true); });
  const all = $('#lvAll'); if (all) all.onclick = () => claimLevels(ready);
  $('#lvList').scrollTop = keep;
  if (scrollToNext) { const t = root.querySelector('.lvx-row.can') || root.querySelector(`[data-lvrow="${P.lv}"]`), list = $('#lvList'); list.scrollTop = t ? Math.max(0, t.offsetTop - 8) : 0; }
}
