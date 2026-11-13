/* ---------- Card Clash extras: battle events (UI), deck leaders, match rewards ----------
   Battle events: the rules live in 44-clash.js (CC_EVENTS, G.ev); here are their colours and icons, the reveal after the VS
   intro (ccEventReveal), the chip on the board (ccEventChip) and the weather in the hall (CSS .ccm-wx + particle zones in
   50-clash-skins.js). Leaders: every deck has a leader, one of your characters (S.cc.leaders = {deckId: charId}); no skill
   yet, its showcase card (the same card as the profile showcase: art, badges, grade, rarity, stars) stands beside your hero
   all match; the bot's leader is the character it plays as. Rewards: gold for every match (more for a win), the win pearl,
   and on a win one clothing piece rolled exactly like a gear raid clear. */

/* ---- battle events: look ---- */
const CC_EV_LOOK = {
  rain: ['#8fc4ff', "<path d='M30 60a17 17 0 0 1 1-34a21 21 0 0 1 39 5a15 15 0 0 1-1 29z'/><path d='M34 72l-5 13M51 72l-5 13M68 72l-5 13' fill='none' stroke='currentColor' stroke-width='6' stroke-linecap='round'/>"],
  bloodmoon: ['#ff4d5e', "<circle cx='50' cy='44' r='30'/><circle cx='40' cy='36' r='6' fill='rgba(0,0,0,.28)'/><circle cx='60' cy='52' r='8' fill='rgba(0,0,0,.22)'/><circle cx='56' cy='30' r='3.5' fill='rgba(0,0,0,.22)'/><path d='M50 74c-5 9-5 15 0 17c5-2 5-8 0-17z'/>"],
  surge: ['#c99bff', "<path d='M50 6l9 34 34 10-34 10-9 34-9-34-34-10 34-10z'/><path d='M82 12l3 8 8 3-8 3-3 8-3-8-8-3 8-3z'/><circle cx='20' cy='80' r='5'/>"],
  wind: ['#9ff5dc', "<path d='M8 38h54a12 12 0 1 0-12-12M8 54h72a12 12 0 1 1-12 12M8 70h36' fill='none' stroke='currentColor' stroke-width='7' stroke-linecap='round'/>"],
  starfall: ['#ffe9a8', "<path d='M68 30l5 14 15 1-12 9 4 15-12-9-12 9 4-15-12-9 15-1z'/><path d='M12 88l34-34M8 68l24-24M32 94l20-20' fill='none' stroke='currentColor' stroke-width='5' stroke-linecap='round' opacity='.7'/>"],
  sanctuary: ['#ffd36b', "<path d='M50 24l27 10v20c0 18-12 30-27 37c-15-7-27-19-27-37V34z'/><ellipse cx='50' cy='12' rx='19' ry='5.5' fill='none' stroke='currentColor' stroke-width='4.5'/>"],
  heat: ['#ff9a3c', "<circle cx='50' cy='50' r='18'/><path d='M50 10v12M50 78v12M10 50h12M78 50h12M22 22l8 8M70 70l8 8M78 22l-8 8M30 70l-8 8' stroke='currentColor' stroke-width='6' stroke-linecap='round'/>"]
};
const ccEvIco = (k, cls = '') => `<svg class="ccev-ic ${cls}" viewBox="0 0 100 100" aria-hidden="true" fill="currentColor">${(CC_EV_LOOK[k] || ['', ''])[1]}</svg>`;
const ccEvCol = k => (CC_EV_LOOK[k] || ['#fff'])[0];
/* the chip beside the round medallion while an event is on */
function ccEventChip(G) {
  const E = G.ev && CC_EVENTS[G.ev]; if (!E) return '';
  return `<div class="ccm-ev" style="--ec:${ccEvCol(G.ev)}" title="${esc(`${E.name}: ${E.text}`)}"><span class="ccm-ev-ic">${ccEvIco(G.ev)}</span><span class="ccm-ev-t"><small>Battle event</small><b>${esc(E.name)}</b><i>${esc(E.short)}</i></span></div>`;
}
/* after the VS intro: the event's card drops in the middle of the table for a moment */
function ccEventReveal(done) {
  const G = ccM && ccM.G, E = G && G.ev && CC_EVENTS[G.ev], L = ccLayer && ccLayer();
  if (!E || !L) return done();
  const c = ccEvCol(G.ev), el = document.createElement('div'); el.className = 'ccx-ev'; el.style.setProperty('--ec', c);
  el.innerHTML = `<i class="cce-bg"></i><i class="cce-rays"></i><div class="cce-box"><span class="cce-ic">${ccEvIco(G.ev)}</span><small>Battle event</small><b>${esc(E.name)}</b><p>${esc(E.text)}</p></div>`;
  L.appendChild(el);
  // the burst, rays and light come out of the icon: its centre from the layout (offsets ignore the drop-in animation), so a
  // rule text that wraps to two lines moves them with it
  const box = el.querySelector('.cce-box'), ic = el.querySelector('.cce-ic'), cy = Math.round(box.offsetTop + ic.offsetTop + ic.offsetHeight / 2) || 400;
  el.style.setProperty('--cy', cy + 'px');
  ccLater(260, () => { ccGlow(800, cy, c, 360, 30); ccBurst(800, cy, { n: 60, c: [c, '#fff'], sp: 9, g: .03, life: 36 }); ccRing(800, cy, c, { r0: 30, r1: 420, w: 6, life: 30 }); ccWxStart(G.ev); });   // the weather starts with the reveal
  ccLater(2500, () => el.classList.add('out'));
  ccLater(2900, () => { el.remove(); done(); });
}
/* ---- coin flip: after the VS intro a coin decides who goes first (G.first comes from the match seed, the coin just
   lands on it). Your face: crystal rim with your deck leader (else your avatar); the other face: crimson with the bot's
   character. Tossed up, turning, landing, bouncing (drawn by ccCoinRun below). */
function ccCoinFlip(done) {
  const G = ccM && ccM.G, L = ccLayer && ccLayer();
  if (!G || !L) return done();
  const meFirst = G.first === 0, le = ccM.leader, foe = ccM.foe;
  const myPic = le ? thumbImg(le) : avatarHTML(150), foePic = ccM.boss ? gbIcon() : foe ? baseThumb(foe) : ccIco('bot');
  const el = document.createElement('div'); el.className = `ccx-coin ${meFirst ? 'me' : 'op'}`;
  el.innerHTML = `<i class="ccn-bg"></i>
    <div class="ccn-title"><small>Coin flip</small><b>Who goes first?</b></div>
    <div class="ccn-keys"><span class="ccn-key me"><i></i>You</span><span class="ccn-key op"><i></i>${esc(G.names[1])}</span></div>
    <i class="ccn-glow"></i><i class="ccn-shadow"></i>
    <div class="ccn-stage"><div class="ccn-toss"><div class="ccn-coin"><i class="ccn-edge"></i>
      <div class="ccn-face me"><span class="ccn-pic">${myPic}</span><span class="ccn-lbl">You</span><i class="ccn-gloss"></i></div>
      <div class="ccn-face op"><span class="ccn-pic">${foePic}</span><span class="ccn-lbl">${esc(G.names[1])}</span><i class="ccn-gloss"></i></div>
    </div></div></div>
    <div class="ccn-res"><b>${meFirst ? 'You go first!' : `${esc(G.names[1])} goes first`}</b><small>${meFirst ? 'You draw 1 card on turn one, the bot gets 6 AP on its first turn' : 'You get 6 AP on your first turn to make up for it'}</small></div>`;
  L.appendChild(el);
  ccCoinRun(el, meFirst);
  const c = meFirst ? ['#ffe3f6', '#e2bcff', '#bfe2ff', '#fff'] : ['#ff4d63', '#ffb3bd', '#ff8a9a', '#fff'];
  ccLater(380, () => ccBurst(800, 436, { n: 18, c: ['#fff3c4', '#f3d98f'], sp: 5, g: .08, life: 22 }));   // the toss
  ccLater(2060, () => { el.classList.add('done'); ccShake(6, 260); ccGlow(800, 436, c[1], 210, 22); ccBurst(800, 436, { n: 70, c, sp: 11, g: .05, life: 38 }); ccRing(800, 436, c[0], { r0: 90, r1: 420, w: 6, life: 30 }); });
  ccLater(3500, () => el.classList.add('out'));
  ccLater(3880, () => { el.remove(); done(); });
}
/* the coin is drawn in 2D and moved frame by frame from here, not with CSS 3D (preserve-3d / backface-visibility broke on
   some devices, and the old CSS spin was switched off by "reduce motion"): turning about its horizontal axis squashes the
   face to |cos| of the angle, the face that points at you is shown, and the gold edge is the band between the two faces,
   thickest when the coin is side-on. Tossed up toward you (bigger), five turns (plus a half turn when the bot starts, so
   it lands on G.first), then a small bounce with a wobble. Always plays, also with reduced motion. */
function ccCoinRun(el, meFirst) {
  const toss = el.querySelector('.ccn-toss'), edge = el.querySelector('.ccn-edge'), sh = el.querySelector('.ccn-shadow');
  const fMe = el.querySelector('.ccn-face.me'), fOp = el.querySelector('.ccn-face.op'), m = ccM;
  const R = 120, TH = 20, A = 350, D = 1700, B = 450, END = Math.PI * (10 + (meFirst ? 0 : 1)), t0 = performance.now();
  const pose = (th, h, by) => {   // th = angle, h = toss height 0..1, by = bounce lift (px)
    const c = Math.cos(th), s = Math.sin(th), sy = Math.max(.035, Math.abs(c)), off = TH * s / 2;
    toss.style.transform = `translateY(${(-120 * h - by).toFixed(1)}px) scale(${(1 + .3 * h).toFixed(3)})`;   // peak: 120 px up at 130%, clear of the title
    const eh = 2 * R * sy + TH * Math.abs(s);
    edge.style.top = (R - eh / 2).toFixed(1) + 'px'; edge.style.height = eh.toFixed(1) + 'px'; edge.style.borderRadius = `${R}px / ${(R * sy).toFixed(1)}px`;
    const front = c >= 0, up = front ? fMe : fOp, dn = front ? fOp : fMe;
    up.style.visibility = 'visible'; dn.style.visibility = 'hidden';
    up.style.transform = `translateY(${(front ? -off : off).toFixed(1)}px) scaleY(${sy.toFixed(3)})`;
    up.style.filter = `brightness(${(.58 + .42 * sy).toFixed(2)})`;
    up.style.setProperty('--gl', (s * 70).toFixed(1) + 'px');
    const lift = h + by / 60; sh.style.transform = `scale(${(1 - .5 * lift).toFixed(3)})`; sh.style.opacity = (1 - .6 * lift).toFixed(2);
  };
  pose(0, 0, 0);
  const step = now => {
    if (!el.isConnected || ccM !== m) return;
    const t = now - t0;
    if (t < A) pose(0, 0, 0);
    else if (t < A + D) { const p = (t - A) / D; pose(END * (1 - Math.pow(1 - p, 2.2)), 4 * p * (1 - p), 0); }
    else if (t < A + D + B) { const q = (t - A - D) / B; pose(END + .26 * Math.sin(q * Math.PI * 3) * (1 - q), 0, 26 * Math.sin(Math.PI * q)); }
    else { pose(END, 0, 0); return; }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
/* the rules book page */
const ccEventsRulesHTML = () => `<div class="ccr-evs">${CC_EV_KEYS.map(k => { const E = CC_EVENTS[k]; return `<div class="ccr-ev" style="--ec:${ccEvCol(k)}"><span class="ccr-ev-ic">${ccEvIco(k)}</span><span><b>${esc(E.name)}</b><small>${esc(E.text)}</small></span></div>`; }).join('')}</div>`;

/* ---- leaders ---- */
const ccLeaderPool = () => ownedChars().slice().sort((a, b) => charScore(b) - charScore(a) || b.rarity - a.rarity || a.name.localeCompare(b.name));
function ccLeaderOf(deckId) {
  const sv = ccSave(), id = (sv.leaders || {})[deckId], e = id && findEntry(id);
  if (e && e.type === 'character' && owns(e.id)) return e;
  const show = (S.profile.showcase || []).map(x => x && findEntry(x)).find(x => x && x.type === 'character' && owns(x.id));
  return show || ccLeaderPool()[0] || (S.player.mc && findEntry('mc-' + S.player.mc)) || null;
}
function ccSetLeader(deckId, id) { const sv = ccSave(); sv.leaders = { ...(sv.leaders || {}), [deckId]: id }; persist(); }
function ccPickLeader(deckId, after) {
  const cur = ccLeaderOf(deckId);
  openCharPicker({ title: 'Choose a leader', ic: 'crown', note: `The leader stands beside your hero for the whole match (no skill yet). ${cur ? `Now: <b>${esc(cur.name)}</b>.` : ''}`, list: ccLeaderPool(), btn: 'Make leader',
    onPick: e => { ccSetLeader(deckId, e.id); toast(`${e.name} now leads this deck`); if (after) after(); } });
}
/* the leader's card: your own leaders use the profile showcase card (badges, grade, rarity, stars); the bot's leader gets
   seeded stars and grade (it has no save) */
function ccLeaderCard(e, bot, seed = 0) {
  if (!e) return '';
  const style = e.ccStyle && CC_STYLES[e.ccStyle], attr = style ? `<span class="ccl-attr" style="--cs:${style[1]}" title="Card attribute: ${style[0]}">${ccIco(e.ccStyle)}</span>` : '';
  if (!bot) return `<div class="pf-slot ccl-card r${e.rarity} ${st6(e)}">${showcaseInner(e)}${attr}</div>`;
  const st = (seed >>> 2) % 7, gr = ['D', 'C', 'B', 'A', 'S', 'SS'][(seed >>> 5) % 6];
  return `<div class="pf-slot ccl-card r${e.rarity}"><img src="${baseCard(e)}" alt="" ${baseArt(e) ? `style="${cardImgStyle(e, 'base')}"` : ''}><span class="pf-cs"><span class="cs-tag sm">${gradeTag(gr)}</span></span><span class="pf-sl">${rtag(e.rarity)}<b>${esc(e.name)}</b>${starRow(st, -1)}</span>${attr}</div>`;
}
/* the leader box on the Deck screen */
function ccLeaderBox(deckId) {
  const e = ccLeaderOf(deckId);
  return `<div class="ccd-lead"><span class="ccd-lbl">Leader</span><div class="ccd-lead-row"><div class="ccd-lead-card">${e ? ccLeaderCard(e) : '<span class="tiny">Own a character to pick a leader.</span>'}</div>
    <div class="ccd-lead-info">${e ? `<b>${esc(e.name)}</b><span class="tiny">Stands beside your hero all match. No skill yet.</span>` : ''}<button class="btn ghost sm" id="ccdLead" ${ccLeaderPool().length ? '' : 'disabled'}>${icon('crown')}Change leader</button></div></div></div>`;
}

/* ---- rewards ---- */
const CC_GOLD = { win: 2000, draw: 800, lose: 400 };
function ccGrantRewards(winner) {
  const D = ccM && ccM.qm ? qmDiff(ccM.qm.diff) : null;   // Quick match difficulty: gold ×0.5–2, 0–3 pearls, gear (not on Easy)
  const k = winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw', out = { k, gold: D ? qmGold(k, D) : CC_GOLD[k], pearls: k === 'win' ? (D ? D.pearls : CC_WIN_PEARLS) : 0, gear: null, full: false };
  S.wallet.coins = (S.wallet.coins || 0) + out.gold;
  if (out.pearls) S.wallet.pearls = (S.wallet.pearls || 0) + out.pearls;
  if (k === 'win') {
    questAdd('clash', 1);   // guild quest: win a Card Clash match
    if (D && !D.gear) { /* Easy gives no gear */ }
    else if (wardFree() < 1) out.full = true;
    else {   // one piece, rolled like a gear raid clear (a random gear dungeon: its UR set, the shared R / SSR sets, 1.5% a 2★ UR)
      const d = rpick(raidGear()), ur = dungeonPieces(d, 5), st2 = Math.random() < RAID_STAR2 && ur.length, x = st2 ? rpick(ur) : rollRaidPiece(d);
      if (x) { const isNew = !owns(x.id); addCloth(x.id, st2 ? 2 : 1); out.gear = { x, isNew, st: st2 ? 2 : (hasClothStars(x) ? 1 : 0) }; }
    }
  }
  return out;
}
function ccRewardsHTML(r) {
  if (!r) return '';
  const g = r.gear;
  return `<div class="ccm-rews">
    <span class="ccm-rw">${curIcon('coins')}<b>+${fmt(r.gold)}</b><small>gold</small></span>
    ${r.pearls ? `<span class="ccm-rw pearl">${curIcon('pearls')}<b>+${r.pearls}</b><small>pearl</small></span>` : ''}
    ${g ? `<span class="ccm-rw gear r${g.x.rarity}" title="${esc(g.x.name)}"><span class="ccm-rw-pic"><img src="${clothImg(g.x)}" alt="">${g.isNew ? '<i class="ccm-rw-new">NEW</i>' : ''}</span><span class="ccm-rw-txt">${ctag(g.x.rarity)}<b>${esc(g.x.name)}</b>${g.st ? clothStarRow(g.st) : ''}</span></span>` : r.full ? '<span class="ccm-rw none"><small>Wardrobe full: no gear this time</small></span>' : r.k !== 'win' ? '<span class="ccm-rw none"><small>Win to earn a gear piece</small></span>' : ''}
  </div>`;
}
