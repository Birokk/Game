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
  openCharPicker({ title: 'Choose a leader', ic: 'crown', note: `The leader stands beside your hero and brings its leader skill (stronger with awakened stars). ${cur ? `Now: <b>${esc(cur.name)}</b> · ${esc(lsName(lsOf(cur)))}.` : ''}`, list: ccLeaderPool(), btn: 'Make leader',
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
    <div class="ccd-lead-info">${e ? `<b>${esc(e.name)}</b><span class="tiny">Brings its leader skill to every match.</span>` : ''}<button class="btn ghost sm" id="ccdLead" ${ccLeaderPool().length ? '' : 'disabled'}>${icon('crown')}Change leader</button></div></div>${e ? `<div class="ccd-lead-sk">${lsInfoHTML(e)}${lsBondLine(e, (ccDeckById(deckId) || {}).cards)}<button class="btn ghost sm" id="ccdLeadBon">${icon('sparkle')}Battle bonuses</button></div>` : ''}</div>`;
}

/* the leader showcase at the top of the Deck screen (the owner found the old leader box too small): the leader's splash
   art across the panel, its card, name, rarity / grade / CS / attribute / bond, the leader skill as a big medallion with
   its tier and what the next tier needs, the attribute bond as a bar, the battle bonuses as four tiles and the CS brackets
   as a track. It folds down to a slim bar while building a deck (S.cc.leadMin) */
function ccLeaderHero(deck) {
  const e = ccLeaderOf(deck.id), sv = ccSave(), min = !!sv.leadMin, can = ccLeaderPool().length;
  const fold = `<button class="ccdh-fold" id="ccdFold" title="${min ? 'Show the leader' : 'Fold the leader away'}" aria-label="${min ? 'Show the leader' : 'Fold the leader away'}">${icon(min ? 'down' : 'up')}</button>`;
  if (!e) return `<section class="ccd-hero none"><div class="ccdh-empty">${icon('crown')}<span><b>No leader yet</b><small>Own a character to lead this deck: it brings its leader skill and battle bonuses to every match.</small></span><button class="btn gold sm" id="ccdLead" ${can ? '' : 'disabled'}>${icon('crown')}Pick a leader</button></div></section>`;
  const own = owns(e.id), cs = own ? charScore(e) : 0, gr = own ? csGrade(typeof gradeScore === 'function' ? gradeScore(e) : cs) : null;
  const st = e.ccStyle && CC_STYLES[e.ccStyle] ? e.ccStyle : null, id = lsOf(e), S = LS[id], t = lsTierOf(e), n = lsAwake(e);
  const b = lsBonus(e) || { src: [] }, nx = own ? csLeadNext(cs) : null, got = own ? csLeadOf(cs).length : 0;
  const bn = st ? deck.cards.filter(c => (ccDef(c) || {}).style === st).length : 0, need = (b.bondN || CC_BOND_N), bOn = st && bn >= need;
  const art = baseArt(e), col = lsCol(id);
  const next = t < 3 ? `Awaken ${t === 1 ? 2 : 4} Breakthrough stars for tier ${t === 1 ? 'II' : 'III'}` : n >= 6 ? 'Max tier · cooldown −1' : 'Awaken all 6 stars for cooldown −1';
  const tile = (k, nm, ic) => `<span class="ccdh-t ${b[k] ? 'on' : ''}">${icon(ic)}<b>${b[k] ? '+' + b[k] : '—'}</b><small>${nm}</small></span>`;
  const bar = `<div class="ccdh-name"><small>Deck leader</small><b>${esc(e.name)}</b><span class="ccdh-tags">${charRtag(e)}${gr ? gradeTag(gr) : ''}${own ? `<span class="ccdh-cs">${fmt(cs)} CS</span>` : ''}${st ? `<span class="ccdh-attr" style="--cs:${CC_STYLES[st][1]}">${ccIco(st)}${esc(CC_STYLES[st][0])}</span>` : ''}${own ? bondTag(e.id, 'sm') : ''}</span></div>`;
  return `<section class="ccd-hero ${min ? 'min' : ''}" style="--lc:${col}">
    <div class="ccdh-art">${art ? `<img src="${art}" alt="">` : ''}</div>${fold}
    ${min ? `<div class="ccdh-slim"><span class="ccdh-av">${baseThumb(e)}</span>${bar}<span class="ccdh-sk sm">${lsIc(id)}<b>${esc(S.name)} ${lsTierTag(t)}</b></span><button class="btn ghost sm" id="ccdLead" ${can ? '' : 'disabled'}>${icon('crown')}Change</button></div>` : `
    <div class="ccdh-card">${ccLeaderCard(e)}</div>
    <div class="ccdh-mid">${bar}
      <div class="ccdh-skill"><span class="ccdh-med">${lsIc(id)}<i class="ccdh-ap">${S.ap[t - 1]}</i></span>
        <span class="ccdh-skt"><small>Leader skill</small><b>${esc(S.name)} ${lsTierTag(t)}</b><em>${esc(lsMeta(id, t))}${lsCdmOf(e) ? ' (−1)' : ''}</em><span>${esc(lsDesc(id, t))}</span><i>${esc(next)}</i></span></div>
      <div class="ccdh-bond ${bOn ? 'on' : ''}" ${st ? `style="--cs:${CC_STYLES[st][1]}"` : ''}>${st ? `${ccIco(st)}<span><b>Attribute bond ${bOn ? 'on' : `${bn} / ${need}`}</b><small>${esc(CC_BOND_TXT[st])}</small></span><i class="ccdh-bb"><i style="width:${Math.min(100, bn / need * 100)}%"></i></i>` : '<span><b>No card attribute</b><small>This leader has no attribute bond.</small></span>'}</div>
    </div>
    <div class="ccdh-side">
      <span class="ccdh-lbl">Battle bonuses</span>
      <div class="ccdh-tiles">${tile('hp', 'Hero HP', 'heart')}${tile('heal', 'Heal', 'sparkle')}${tile('cards', 'Opening cards', 'copy')}${tile('ap1', 'First-turn AP', 'bolt')}</div>
      <span class="ccdh-lbl">CS brackets · ${got} / ${CS_LEAD.length}</span>
      <div class="ccdh-csl">${CS_LEAD.map(([v, , , tx]) => `<i class="${own && cs >= v ? 'on' : ''}" title="${fmt(v)} CS: ${esc(tx)}"></i>`).join('')}</div>
      <small class="ccdh-nx">${!own ? 'Own the character to use its CS' : nx ? `Next at ${fmt(nx[0])} CS: ${esc(nx[3])}` : 'Every bracket reached'}</small>
      <div class="ccdh-btns"><button class="btn ghost sm" id="ccdLead" ${can ? '' : 'disabled'}>${icon('crown')}Change leader</button><button class="btn ghost sm" id="ccdLeadBon">${icon('sparkle')}All bonuses</button></div>
    </div>`}
  </section>`;
}

/* ---- rewards ---- */
const CC_GOLD = { win: 2000, draw: 800, lose: 400 };
/* Quick match rewards (the owner's rules): 1 pearl a win (Normal and up), at most 60 a week (resets Monday, ccSave().qmPw);
   gear only R (blue) pieces, 1 a win and a 50% chance of a 2nd (CC_QM_GEAR2), so at most 2 a game; Easy gives neither */
const CC_QM_WEEK_PEARLS = 60, CC_QM_GEAR2 = .5;
function qmPearlWeek() { const sv = ccSave(), wk = dayKey(weekStart()); if (!sv.qmPw || sv.qmPw.wk !== wk) sv.qmPw = { wk, n: 0 }; return sv.qmPw; }
const qmPearlsLeft = () => Math.max(0, CC_QM_WEEK_PEARLS - qmPearlWeek().n);
const qmRPieces = () => { const d = rpick(raidGear()), L = d ? dungeonPieces(d, 3) : []; return L.length ? L : (S.clothes || []).filter(x => +x.rarity === 3); };
function ccGrantRewards(winner) {
  const D = ccM && ccM.qm ? qmDiff(ccM.qm.diff) : null;   // Quick match difficulty: gold ×0.5–2, 1 pearl and R gear (not on Easy)
  const k = winner === 0 ? 'win' : winner === 1 ? 'lose' : 'draw', out = { k, gold: D ? qmGold(k, D) : CC_GOLD[k], pearls: k === 'win' && (!D || D.pearls) ? 1 : 0, gear: null, gears: [], full: false, capped: false };
  out.gold += afGold(out.gold);   // Cleopatra's Necklace (70-artifacts.js)
  S.wallet.coins = (S.wallet.coins || 0) + out.gold;
  if (out.pearls) { const w = qmPearlWeek(); if (w.n >= CC_QM_WEEK_PEARLS) { out.pearls = 0; out.capped = true; } else w.n += out.pearls; }
  if (out.pearls) S.wallet.pearls = (S.wallet.pearls || 0) + out.pearls;
  if (k === 'win') {
    questAdd('clash', 1);   // guild quest: win a Card Clash match
    if (D && !D.gear) { /* Easy gives no gear */ }
    else { const n = 1 + (Math.random() < CC_QM_GEAR2 ? 1 : 0);
      for (let i = 0; i < n; i++) { if (wardFree() < 1) { out.full = true; break; } const L = qmRPieces(); if (!L.length) break; const x = rpick(L), isNew = !owns(x.id); addCloth(x.id, 1); out.gears.push({ x, isNew, st: hasClothStars(x) ? 1 : 0 }); }
      out.gear = out.gears[0] || null; }
  }
  return out;
}
function ccRewardsHTML(r) {
  if (!r) return '';
  const L = r.gears || (r.gear ? [r.gear] : []);
  return `<div class="ccm-rews">
    <span class="ccm-rw">${curIcon('coins')}<b>+${fmt(r.gold)}</b><small>gold</small></span>
    ${r.pearls ? `<span class="ccm-rw pearl">${curIcon('pearls')}<b>+${r.pearls}</b><small>pearl · ${qmPearlWeek().n} / ${CC_QM_WEEK_PEARLS} this week</small></span>` : r.capped ? `<span class="ccm-rw none"><small>This week's ${CC_QM_WEEK_PEARLS} Quick match pearls are collected · back on Monday</small></span>` : ''}
    ${L.map(g => `<span class="ccm-rw gear r${g.x.rarity}" title="${esc(g.x.name)}"><span class="ccm-rw-pic"><img src="${clothImg(g.x)}" alt="">${g.isNew ? '<i class="ccm-rw-new">NEW</i>' : ''}</span><span class="ccm-rw-txt">${ctag(g.x.rarity)}<b>${esc(g.x.name)}</b>${g.st ? clothStarRow(g.st) : ''}</span></span>`).join('')}${r.full ? '<span class="ccm-rw none"><small>Wardrobe full: no more gear this time</small></span>' : !L.length && r.k !== 'win' ? '<span class="ccm-rw none"><small>Win to earn blue gear</small></span>' : ''}
  </div>`;
}
