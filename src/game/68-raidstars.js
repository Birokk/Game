/* ---------- Raid stage stars (the owner's rule) ----------
   Every raid stage has 3 stars, earned by winning its battle: ★ win · ★ win with 10+ HP left · ★ win by round 12. Stars are
   kept once earned (S.raidStars[raidId][stage] = [0|1 ×3]). Any star on a stage unlocks auto play in that stage's battles;
   all 3 stars unlock its instant clears. */
const RAID_STAR_GOALS = [['win', 'Win the battle'], ['hp', 'Win with 10+ HP left', 10], ['round', 'Win by round 12', 12]];
const raidStarsOf = (id, si) => { const a = ((S.raidStars || {})[id] || {})[si] || []; return [0, 1, 2].map(i => a[i] ? 1 : 0); };
const raidStarN = (id, si) => raidStarsOf(id, si).reduce((t, v) => t + v, 0);
const raidAutoOk = (id, si) => canAdmin() || raidStarN(id, si) >= 1;
const raidInstOk = (id, si) => canAdmin() || raidStarN(id, si) >= 3;
const raidStarRow = (id, si) => `<span class="rs-stars" title="${raidStarN(id, si)} / 3 stars">${raidStarsOf(id, si).map(v => `<i class="${v ? 'on' : ''}">★</i>`).join('')}</span>`;
/* scored when a raid battle ends (also on a loss: no stars then) */
function raidScoreStars(G, r) {
  const win = G.winner === 0, got = [win, win && G.players[0].hp >= RAID_STAR_GOALS[1][2], win && G.round <= RAID_STAR_GOALS[2][2]].map(Boolean);
  const si = r.stage || 0, old = raidStarsOf(r.id, si), now = old.map((v, i) => v || got[i] ? 1 : 0);
  S.raidStars = S.raidStars || {}; S.raidStars[r.id] = { ...(S.raidStars[r.id] || {}), [si]: now };
  return { got, old, now, fresh: now.map((v, i) => v && !old[i]) };
}
{ const f0 = raidFinish;
  raidFinish = function (G, r) { const res = f0.apply(this, arguments); if (res) res.stars = raidScoreStars(G, r); return res; }; }
{ const e0 = raidEndHTML;
  raidEndHTML = function (res) {
    const base = e0.apply(this, arguments), st = res && res.stars; if (!st) return base;
    const n = st.now.reduce((t, v) => t + v, 0);
    return base + `<div class="rs-end"><div class="rs-big">${st.now.map((v, i) => `<i class="${v ? 'on' : ''} ${st.fresh[i] ? 'new' : ''}">★</i>`).join('')}</div>
      <ul>${RAID_STAR_GOALS.map(([, t], i) => `<li class="${st.got[i] ? 'ok' : ''}">${st.got[i] ? icon('check') : icon('close')}<span>${esc(t)}</span><em>${st.fresh[i] ? 'New' : st.old[i] ? 'Earned before' : st.got[i] ? 'Done' : 'Not yet'}</em></li>`).join('')}</ul>
      <p class="tiny">${n >= 3 ? 'All 3 stars: instant clears are open on this stage.' : n ? `Auto play is open on this stage. Get all 3 stars to unlock its instant clears.` : 'Win to earn a star and unlock auto play on this stage.'}</p></div>`;
  }; }
/* instant clears need 3 stars on the stage */
{ const c0 = confirmRaidClear;
  confirmRaidClear = function (times) { const d = raidOf(raidSel), si = raidStage(d); if (!raidInstOk(d.id, si)) { toast(`Get all 3 stars on ${d.name} ${ROMAN[si]} to unlock its instant clears (${raidStarN(d.id, si)} / 3).`); return; } return c0.apply(this, arguments); }; }
{ const c1 = clearRaid;
  clearRaid = function (times) { const d = raidOf(raidSel), si = raidStage(d); if (!raidInstOk(d.id, si)) { toast(`Get all 3 stars on this stage to unlock instant clears.`); return; } return c1.apply(this, arguments); }; }
