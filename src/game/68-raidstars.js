/* ---------- Raid stage stars (the owner's rule) ----------
   Every raid stage has 3 stars, earned by winning its battle: ★ win · ★ win with 10+ HP left · ★ win by round 12. Stars are
   kept once earned (S.raidStars[raidId][stage] = [0|1 ×3]). Any star on a stage unlocks auto play in that stage's battles;
   all 3 stars unlock its instant clears. */
const RAID_STAR_PEARLS = 1;
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
  const fresh = now.map((v, i) => !!(v && !old[i])), pearls = fresh.filter(Boolean).length * RAID_STAR_PEARLS;   // every new star: 1 pearl (the owner's rule, like the campaign)
  if (pearls) S.wallet.pearls += pearls;
  return { got, old, now, fresh, pearls };
}
{ const f0 = raidFinish;
  raidFinish = function (G, r) { const res = f0.apply(this, arguments); if (res) res.stars = raidScoreStars(G, r); return res; }; }
{ const e0 = raidEndHTML;
  raidEndHTML = function (res) {
    const base = e0.apply(this, arguments), st = res && res.stars; if (!st) return base;
    const n = st.now.reduce((t, v) => t + v, 0);
    return base + `<div class="rs-end"><div class="rs-big">${st.now.map((v, i) => `<i class="${v ? 'on' : ''} ${st.fresh[i] ? 'new' : ''}">★</i>`).join('')}</div>
      <ul>${RAID_STAR_GOALS.map(([, t], i) => `<li class="${st.got[i] ? 'ok' : ''}">${st.got[i] ? icon('check') : icon('close')}<span>${esc(t)}</span><em>${st.fresh[i] ? `New · +${RAID_STAR_PEARLS} ${curIcon('pearls')}` : st.old[i] ? 'Earned before' : st.got[i] ? 'Done' : 'Not yet'}</em></li>`).join('')}</ul>
      ${st.pearls ? `<p class="rs-pearls">${curIcon('pearls')}<b>+${st.pearls}</b> pearl${st.pearls > 1 ? 's' : ''} for ${st.pearls / RAID_STAR_PEARLS > 1 ? 'the new stars' : 'the new star'}</p>` : ''}<p class="tiny">${n >= 3 ? 'All 3 stars: instant clears are open on this stage.' : n ? `Auto play is open on this stage. Get all 3 stars to unlock its instant clears.` : 'Win to earn a star and unlock auto play on this stage.'}</p></div>`;
  }; }
/* instant clears need 3 stars on the stage */
{ const c0 = confirmRaidClear;
  confirmRaidClear = function (times) { const d = raidOf(raidSel), si = raidStage(d); if (!raidInstOk(d.id, si)) { toast(`Get all 3 stars on ${d.name} ${ROMAN[si]} to unlock its instant clears (${raidStarN(d.id, si)} / 3).`); return; } return c0.apply(this, arguments); }; }
{ const c1 = clearRaid;
  clearRaid = function (times) { const d = raidOf(raidSel), si = raidStage(d); if (!raidInstOk(d.id, si)) { toast(`Get all 3 stars on this stage to unlock instant clears.`); return; } return c1.apply(this, arguments); }; }
/* ---- what a stage asks and gives: the star goals with their state, what the stars unlock and the rewards of one clear
   (the selected stage's strip on the raid page, and the window that opens before a raid battle) ---- */
function raidStageRewards(d, si) {
  const g = raidStg(d, si), gold = d.kind === 'gold';
  if (gold) return [[curIcon('coins'), `~${fmt(g.gold)}`, 'Gold (±15%)'], [curIcon('exp'), `+${g.st * EXP.stam}`, 'EXP (from the stamina)']];
  return [[icon('hanger'), raidPcs(g), `Clothing piece${raidPcs(g) === '1' ? '' : 's'} · ${g.ur ? `UR ${g.ur}% · ` : ''}SSR ${g.ssr}% · R ${raidRpct(g)}%`],
    [curIcon('thread'), `+${GEAR_MATS[Math.max(0, Math.min(GEAR_MATS.length - 1, si || 0))]}`, 'Thread'], [curIcon('exp'), `+${raidStam(d) * EXP.stam}`, 'EXP (from the stamina)']];
}
function raidStageInfoHTML(d, si, cls = '') {
  const st = raidStarsOf(d.id, si), n = raidStarN(d.id, si), auto = n >= 1, inst = n >= 3, adm = canAdmin();   // admins skip the locks: say so instead of "Open"
  return `<div class="rsi ${cls}">
    <div class="rsi-col"><span class="rsi-h">${icon('star')}Stage ${ROMAN[si]} stars <b>${n} / 3</b></span><small class="rsi-sub">Each new star gives ${RAID_STAR_PEARLS} pearl</small>
      <ul class="rsi-goals">${RAID_STAR_GOALS.map(([, t], i) => `<li class="${st[i] ? 'ok' : ''}"><i>★</i><span>${esc(t)}</span><em>${st[i] ? 'Earned' : `+${RAID_STAR_PEARLS} ${curIcon('pearls')}`}</em></li>`).join('')}</ul></div>
    <div class="rsi-col"><span class="rsi-h">${icon('lock')}Stars unlock</span>
      <ul class="rsi-un"><li class="${auto ? 'ok' : ''}"><i>★</i><span>Auto play in this stage's battles</span><em>${auto ? 'Open' : adm ? 'Admin: open' : 'Any star'}</em></li>
        <li class="${inst ? 'ok' : ''}"><i>★★★</i><span>Instant clears on this stage</span><em>${inst ? 'Open' : adm ? 'Admin: open' : `${n} / 3`}</em></li></ul></div>
    <div class="rsi-col"><span class="rsi-h">${icon('gift')}One clear gives</span>
      <ul class="rsi-rw">${raidStageRewards(d, si).map(([ic, v, t]) => `<li>${ic}<b>${v}</b><span>${t}</span></li>`).join('')}</ul></div></div>`;
}
/* the window before a raid battle: the same checks as raidBattle first, then the stage, both sides, the stars, the rewards
   and the stamina it costs on a win; its Battle button starts the match */
function raidPreBattle(id = raidSel, si = raidStage(raidOf(id))) {
  const d = raidOf(id), gold = d.kind === 'gold', L = raidStages(d); si = Math.min(si || 0, L.length - 1); const g = L[si], cost = gold ? g.st : raidStam(d);
  if (!stageOpen(si, d)) { toast(`Stage ${ROMAN[si]} opens at player level ${g.lv}.`); return; }
  if (!gold && wardFree() < 2) { wardFullMsg(1); return; }
  if (stamina() < cost) { toast(`This raid needs ${cost} stamina to clear. You have ${stamina()}.`); openStamina(); return; }
  const dk = ccCampMyDeck(); if (!ccValidateDeck(dk.cards).ok) { toast('Build a deck with 30 cards first.', true); openDeck(); return; }
  const le = ccLeaderOf(dk.id), f = d.foe, have = stamina(), foeSt = ccDeckStyle(raidDeckCards(f.deck));
  openModal({ title: `${d.name} ${ROMAN[si]}`, ic: raidIc(d), kind: 'raidpre', body: `<div class="rpb">
    <div class="rpb-vs">
      <button class="rpb-side me" id="rpbDeck" title="Change the deck you play with">${le ? `<span class="rpb-ava">${baseThumb(le)}</span>` : `<span class="rpb-ava ic">${icon('cards')}</span>`}<span><small>Your deck</small><b>${esc(dk.name)}</b><em>${le ? `Leader ${esc(le.name)} · ` : ''}Change</em></span></button>
      <span class="rpb-x">VS</span>
      <div class="rpb-side op"><span class="rpb-ava ic">${icon(raidIc(d))}</span><span><small>Guardian</small><b>${esc(raidDeckName(f.deck))}</b><em>${icon('heart')}${raidHp(d.id, si)} HP</em></span></div>
    </div>
    ${lsAdvHTML(foeSt, le)}
    ${raidStageInfoHTML(d, si, 'pop')}
    <div class="rcf-rows"><span><small>Stamina on a win</small><b>${curIcon('stamina')}${fmt(have)} → ${fmt(have - cost)}</b><em>−${cost}</em></span></div>
    <p class="tiny rpb-note">A coin flip decides who goes first. A loss, a draw or leaving costs nothing.${raidStarN(d.id, si) ? ' Auto play is open here.' : ' Auto play opens after your first star on this stage.'}</p>
    <div class="row rcf-btns"><button class="btn ghost" id="rpbNo">Cancel</button><button class="btn gold" id="rpbGo">${icon('swords')}Battle! ${curIcon('stamina')}${cost}</button></div></div>`,
    onMount: () => {
      $('#rpbNo').onclick = closeModal;
      $('#rpbGo').onclick = () => { closeModal(); raidBattle(id, si); };
      $('#rpbDeck').onclick = () => ccDeckPicker(() => { renderRaids(); raidPreBattle(id, si); });
    } });
}
