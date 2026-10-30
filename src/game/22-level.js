/* ---------- player level: EXP from playing, a reward for every level (Level rewards window) ----------
   S.player.xp = total EXP earned; S.lvClaimed = levels whose reward was taken. The EXP icon (icon slot 'exp', editable in
   Settings or admin → Icons) only shows where EXP is offered as a reward. */
const LV_MAX = 60;
const lvNeed = lv => 100 + (lv - 1) * 50;                 // EXP to go from lv to lv + 1
const EXP = { pull: 10, login: 50, spin: 20, ach: 30, hatch: 25, farm: 5 };
const EXP_WAYS = [['pull', 'Summon', 'per pull'], ['login', 'Daily login', 'per day'], ['spin', 'Daily spin', 'per spin'], ['ach', 'Achievement', 'each'], ['hatch', 'Hatch a pet', 'each'], ['farm', 'Farm', 'per pearl collected']];
CUR_SVG.exp = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#3fd47e" stroke="#16683a" stroke-width="1.4"/><circle cx="12" cy="12" r="7.4" fill="none" stroke="#c8ffd9" stroke-width=".9" opacity=".8"/><path d="M12 5.2l1.9 4.3 4.6.4-3.5 3 1.1 4.6L12 15l-4.1 2.5 1.1-4.6-3.5-3 4.6-.4z" fill="#fff8c8" stroke="#16683a" stroke-width=".8" stroke-linejoin="round"/></svg>';
ICONS.level = '<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z"/><path d="M12 8v6"/><path d="M9.5 10.5L12 8l2.5 2.5"/>';
const expTag = n => `<span class="exp-tag">${curIcon('exp')}+${fmt(n)} EXP</span>`;
function playerLv() {
  let xp = Math.max(0, S.player.xp || 0), lv = 1;
  while (lv < LV_MAX && xp >= lvNeed(lv)) { xp -= lvNeed(lv); lv++; }
  return { lv, xp, need: lv < LV_MAX ? lvNeed(lv) : 0 };
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
function claimLevels(list) {
  const got = {};
  list.forEach(lv => { if (lvClaimed(lv) || lv > playerLv().lv) return; (S.lvClaimed = S.lvClaimed || []).push(lv); lvReward(lv).forEach(([k, n]) => { S.wallet[k] = (S.wallet[k] || 0) + n; got[k] = (got[k] || 0) + n; }); });
  if (!Object.keys(got).length) return;
  persist(); renderMenu(); refreshSummon(); renderLevel();
  toast('Claimed ' + Object.entries(got).map(([k, n]) => `${fmt(n)} ${({ coins: 'gold', pearls: 'pearls', tickets: 'Limited tickets', wishes: 'Wish tickets', bottles: 'stamina bottles' })[k] || k}`).join(', ') + '.');
}
function openLevel() { openModal({ title: 'Level rewards', ic: 'level', wide: true, kind: 'level', body: '<div id="lvRoot"></div>', onMount: () => { renderLevel(true); } }); }
function renderLevel(scrollToNext) {
  const root = $('#lvRoot'); if (!root) return;
  const P = playerLv(), ready = [], keep = $('#lvList') ? $('#lvList').scrollTop : 0;
  for (let i = 1; i <= P.lv; i++) if (!lvClaimed(i)) ready.push(i);
  const rows = Array.from({ length: LV_MAX }, (_, i) => i + 1).map(lv => { const got = lvClaimed(lv), can = !got && lv <= P.lv;
    return `<div class="lv-row ${got ? 'got' : ''} ${can ? 'can' : ''} ${lv > P.lv ? 'locked' : ''}" data-lvrow="${lv}">
      <span class="lv-node">${lv <= P.lv ? icon('check') : ''}</span>
      <div class="lv-card"><div class="lv-head"><b>Player Lv ${lv}</b>${got ? '<span class="lv-btn done">Claimed</span>' : can ? `<button class="lv-btn go" data-lvclaim="${lv}">Claim</button>` : `<span class="lv-btn">Reach Lv ${lv}</span>`}</div>
        <div class="lv-items">${lvReward(lv).map(([k, n]) => `<span class="lv-item k-${k}">${curIcon(k)}<em>${fmt(n)}</em></span>`).join('')}</div></div></div>`; }).join('');
  root.innerHTML = `<div class="lv">
    <aside class="lv-side">
      <span class="lv-tagline">Player Level</span>
      <div class="lv-medal-card"><span class="lv-cur">Current Level</span>
        <div class="lv-medal"><span class="lv-core">${icon('level')}</span><b>${P.lv}</b></div>
        ${P.need ? `<div class="lv-bar"><i style="width:${P.xp / P.need * 100}%"></i></div><span class="tiny">${fmt(P.xp)} / ${fmt(P.need)} EXP to level ${P.lv + 1}</span>` : '<span class="tiny">Max level reached.</span>'}
      </div>
      <div class="lv-ways"><span class="lbl-sm">How to earn EXP</span>${EXP_WAYS.map(([k, l, per]) => `<div><span>${l}</span>${expTag(EXP[k])}<small>${per}</small></div>`).join('')}</div>
      ${ready.length ? `<button class="btn gold" id="lvAll">Claim all (${ready.length})</button>` : ''}
    </aside>
    <div class="lv-list" id="lvList">${rows}</div></div>`;
  root.querySelectorAll('[data-lvclaim]').forEach(b => b.onclick = () => claimLevels([+b.dataset.lvclaim]));
  const all = $('#lvAll'); if (all) all.onclick = () => claimLevels(ready);
  $('#lvList').scrollTop = keep;
  if (scrollToNext) { const t = root.querySelector('.lv-row.can') || root.querySelector(`[data-lvrow="${P.lv}"]`), list = $('#lvList'); if (t && list) list.scrollTop = t.offsetTop - list.offsetTop - 8; }
}
