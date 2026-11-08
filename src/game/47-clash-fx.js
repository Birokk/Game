/* ---------- Card Clash effects: particles, card flights, attacks, deaths, the VS intro, turn banners ----------
   Everything here is presentation only: the rules engine (44-clash.js) has already changed the state when these
   play. Before an action the UI takes a snapshot (ccSnap: where every card is and what it looked like), applies the
   action, redraws, then ccAnim replays what happened from the engine's effect list (G.fx) with ghosts in the .ccx
   layer and particles on the .ccm-fxc canvas. Times are in ms; ccAnim returns how long the sequence lasts so the
   bot waits for it. */

/* ---- particles (one canvas over the stage, 1600×900, additive light) ---- */
const ccP = { list: [], raf: 0, cv: null, g: null, t0: 0, amb: 0 };
const CC_AMB_COL = ['#ffd9f4', '#c9a6ff', '#8fb8ff', '#ffe9b0'];
function ccFxStart(el) {
  ccFxStop(); ccP.cv = el.querySelector('.ccm-fxc'); if (!ccP.cv) return;
  ccP.g = ccP.cv.getContext('2d'); ccP.list = []; ccP.t0 = performance.now();
  for (let i = 0; i < 44; i++) ccMote(true);
  const loop = now => { ccP.raf = requestAnimationFrame(loop); ccFxFrame(now); };
  ccP.raf = requestAnimationFrame(loop);
}
function ccFxStop() { cancelAnimationFrame(ccP.raf); ccP.raf = 0; ccP.list = []; ccP.cv = null; }
function ccMote(anywhere) {
  ccP.list.push({ k: 'mote', x: Math.random() * 1600, y: anywhere ? Math.random() * 900 : 920, vx: (Math.random() - .5) * .15, vy: -.12 - Math.random() * .3,
    r: .8 + Math.random() * 2.2, life: 1, dec: 0, ph: Math.random() * 6.28, c: CC_AMB_COL[Math.floor(Math.random() * 4)] });
}
function ccFxFrame(now) {
  const g = ccP.g; if (!g) return;
  g.clearRect(0, 0, 1600, 900); g.globalCompositeOperation = 'lighter';
  let motes = 0;
  for (let i = ccP.list.length - 1; i >= 0; i--) {
    const p = ccP.list[i];
    if (p.delay > 0) { p.delay -= 16; continue; }
    if (p.k === 'mote') {
      motes++; p.x += p.vx + Math.sin(now / 1800 + p.ph) * .12; p.y += p.vy;
      if (p.y < -20) { ccP.list.splice(i, 1); continue; }
      const a = .28 + .22 * Math.sin(now / 700 + p.ph);
      g.fillStyle = p.c; g.globalAlpha = a; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      g.globalAlpha = a * .25; g.beginPath(); g.arc(p.x, p.y, p.r * 3.2, 0, 6.283); g.fill();
      continue;
    }
    p.life -= p.dec;
    if (p.life <= 0) { ccP.list.splice(i, 1); if (p.end) p.end(); continue; }
    if (p.k === 'ring') {
      const e = 1 - p.life, r = p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - e, 3));
      g.globalAlpha = p.life * .9; g.strokeStyle = p.c; g.lineWidth = p.w * p.life + .5;
      g.beginPath(); g.ellipse(p.x, p.y, r, r * (p.sq || 1), 0, 0, 6.283); g.stroke(); continue;
    }
    if (p.k === 'glow') {
      const r = p.r * (1.15 - p.life * .15), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = Math.min(1, p.life * 1.6) * (p.a || 1);
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, 6.283); g.fill(); continue;
    }
    if (p.k === 'bolt') {   // a projectile: glowing head flying from (x0,y0) to (x1,y1) on a slight arc, leaving a trail
      const e = 1 - p.life, ee = e * e * (3 - 2 * e), x = p.x0 + (p.x1 - p.x0) * ee, y = p.y0 + (p.y1 - p.y0) * ee - Math.sin(e * Math.PI) * p.arc;
      for (let k = 0; k < 2; k++) ccP.list.push({ k: 'spark', x, y, vx: (Math.random() - .5) * 1.4, vy: (Math.random() - .5) * 1.4, g: 0, r: 1.5 + Math.random() * 2.2, life: 1, dec: .05, c: p.c });
      const gr = g.createRadialGradient(x, y, 0, x, y, 26); gr.addColorStop(0, '#fff'); gr.addColorStop(.3, p.c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 1; g.fillStyle = gr; g.beginPath(); g.arc(x, y, 26, 0, 6.283); g.fill(); continue;
    }
    // sparks / embers / dust
    const px = p.x, py = p.y; p.vy += p.g || 0; p.vx *= p.fr || .98; p.vy *= p.fr || .98; p.x += p.vx; p.y += p.vy;
    if (p.k === 'ember') p.vx += Math.sin((p.y + i) / 30) * .04;
    g.globalAlpha = Math.min(1, p.life * 1.5);
    if (p.k === 'spark' && (Math.abs(p.vx) + Math.abs(p.vy) > 2.5)) { g.strokeStyle = p.c; g.lineWidth = p.r; g.lineCap = 'round'; g.beginPath(); g.moveTo(px - p.vx * 1.5, py - p.vy * 1.5); g.lineTo(p.x, p.y); g.stroke(); }
    else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r * (p.k === 'dust' ? 1 + (1 - p.life) * 2 : 1), 0, 6.283); g.fill(); }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (motes < 44 && Math.random() < .3) ccMote(false);
  ccSkFrame(now);   // the board skins' own particles (50-clash-skins.js)
}
const ccPx = o => { if (ccP.g) ccP.list.push(o); };
/* a burst of sparks; o: {n, c (colour or list), sp (speed), g (gravity), r, life, k, up} */
function ccBurst(x, y, o = {}) {
  const cols = Array.isArray(o.c) ? o.c : [o.c || '#fff'];
  for (let i = 0; i < (o.n || 24); i++) {
    const a = o.up ? -Math.PI / 2 + (Math.random() - .5) * (o.spread || 2.2) : Math.random() * 6.283, sp = (o.sp || 6) * (.35 + Math.random() * .65);
    ccPx({ k: o.k || 'spark', x: x + (Math.random() - .5) * (o.w || 0), y: y + (Math.random() - .5) * (o.h || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * (o.sq || 1), g: o.g == null ? .12 : o.g, fr: o.fr,
      r: (o.r || 2.2) * (.5 + Math.random()), life: 1, dec: 1 / ((o.life || 34) * (.6 + Math.random() * .6)), c: cols[Math.floor(Math.random() * cols.length)], delay: o.delay || 0 });
  }
}
const ccRing = (x, y, c, o = {}) => ccPx({ k: 'ring', x, y, r0: o.r0 || 10, r1: o.r1 || 90, w: o.w || 5, sq: o.sq || 1, c, life: 1, dec: 1 / (o.life || 26), delay: o.delay || 0 });
const ccGlow = (x, y, c, r = 120, life = 24, a = 1) => ccPx({ k: 'glow', x, y, r, c, a, life: 1, dec: 1 / life });
function ccBolt(x0, y0, x1, y1, c, ms, end) { ccPx({ k: 'bolt', x0, y0, x1, y1, arc: Math.min(120, Math.hypot(x1 - x0, y1 - y0) * .18), c, life: 1, dec: 16 / ms, end }); }

/* ---- geometry ---- */
function ccStageRect() { const st = ccM.el.querySelector('.ccm-stage'), r = st.getBoundingClientRect(); return { r, s: r.width / 1600 || 1 }; }
function ccRectOf(el) {
  if (!el) return null; const { r: sr, s } = ccStageRect(), r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2 - sr.left) / s, y: (r.top + r.height / 2 - sr.top) / s, w: r.width / s, h: r.height / s };
}
/* everything that can move or be hit: units, heroes, traps, my hand cards, the piles */
function ccRectsAll() {
  const m = {}; if (!ccM) return m;
  ccM.el.querySelectorAll('[data-u]').forEach(el => { m[el.dataset.u] = ccRectOf(el); });
  ccM.el.querySelectorAll('[data-hero]').forEach(el => { m['hero' + el.dataset.hero] = ccRectOf(el.querySelector('.ccm-ava') || el); });
  ccM.el.querySelectorAll('[data-trap]').forEach(el => { m['trap' + el.dataset.trap] = ccRectOf(el); });
  ccM.el.querySelectorAll('[data-hand]').forEach(el => { const c = el.querySelector('.ccc'); if (c) { const r = ccRectOf(c); m['h' + el.dataset.hand] = { ...r, w: 176, h: 246 }; } });
  ['me', 'op'].forEach(k => { const p = ccM.el.querySelector(`.ccm-piles.${k} .ccbk`); if (p) m['pile' + k] = ccRectOf(p); });
  return m;
}
const ccRects = ccRectsAll;
/* the snapshot taken before an action is applied */
function ccSnap(a, src) {
  const G = ccM.G, html = {};
  ccM.el.querySelectorAll('[data-u]').forEach(el => { html[el.dataset.u] = el.outerHTML; });
  return { a, src, rects: ccRectsAll(), html, hand: G.players[0].hand.map(c => c.iid), opHand: G.players[1].hand.length, active: G.active, turn: G.turnNo,
    traps: [0, 1].map(p => G.players[p].traps.map(c => c && c.id)), handIds: Object.fromEntries(G.players.flatMap(P => P.hand.map(c => [c.iid, c.id]))) };
}

/* ---- DOM ghosts in the .ccx layer ---- */
const ccLayer = () => ccM && ccM.el.querySelector('.ccx');
function ccGhost(html, r, cls = '') {
  const L = ccLayer(); if (!L || !r) return null;
  const g = document.createElement('div'); g.className = 'ccx-ghost ' + cls;
  g.style.cssText = `left:${r.x - r.w / 2}px;top:${r.y - r.h / 2}px;width:${r.w}px;height:${r.h}px`;
  g.innerHTML = html.replace(/ data-(u|peek|hand|hero|trap|slot)="[^"]*"/g, ''); L.appendChild(g); return g;
}
const ccCardGhost = (id, r, w = 176, face = true) => ccGhost(face ? ccCardHTML(id, { tip: false }).replace('class="ccc ', `style="--w:${w}px" class="ccc `) : `<span class="ccx-back" style="width:${w}px">${ccBackHTML()}</span>`, { x: r.x, y: r.y, w, h: w * 1.4 }, 'card');
const ccLater = (ms, fn) => { const m = ccM; setTimeout(() => { if (ccM && ccM === m) fn(); }, ms); };
function ccNum(x, y, txt, cls, delay = 0) {
  ccLater(delay, () => { const L = ccLayer(); if (!L) return; const n = document.createElement('span'); n.className = 'ccx-num ' + cls; n.textContent = txt;
    n.style.left = x + 'px'; n.style.top = y + 'px'; L.appendChild(n); setTimeout(() => n.remove(), 1500); });
}
function ccShake(px = 7, ms = 380) {
  const ui = ccM && ccM.el.querySelector('.ccm-ui'); if (!ui || !ui.animate) return;
  ui.animate([{ transform: 'none' }, { transform: `translate(${-px}px,${px * .5}px)` }, { transform: `translate(${px * .8}px,${-px * .6}px)` }, { transform: `translate(${-px * .5}px,${px * .3}px)` }, { transform: 'none' }], { duration: ms, easing: 'ease-out' });
}
const ccStyleCol = id => { const d = ccDef(id); return d ? (CC_PAL[d.style] || CC_PAL.control).g : '#c9a6ff'; };

/* ---- the replay of one action ---- */
function ccAnim(snap) {
  if (!ccM || !snap) return 0;
  const G = ccM.G, fx = G.fx.splice(0), now = ccRectsAll(), a = snap.a || {}, me = snap.active;
  const pos = id => now[id] || snap.rects[id];
  const unitEl = id => ccM.el.querySelector(`[data-u="${id}"]`);
  let t = 0, impactAt = 0;
  // 1) the card that was played flies to where it goes
  const handId = a.iid && snap.handIds[a.iid];
  const src = snap.src || (me === 0 ? snap.rects['h' + a.iid] : { x: 1262, y: 6, w: 56, h: 78 });
  if (handId && src && (a.k === 'summon' || a.k === 'trap' || a.k === 'equip' || a.k === 'spell')) {
    const d = ccDef(handId), col = ccStyleCol(handId), face = !(a.k === 'trap' && me === 1);
    const startW = snap.src ? snap.src.w : me === 0 ? 176 : 56;
    const gh = ccCardGhost(handId, src, startW, face);
    let dest, endScale, dur = 440;
    if (a.k === 'summon') { dest = pos(a.iid); endScale = dest ? dest.w / startW : .7; }
    else if (a.k === 'trap') { dest = pos(`trap${me}${a.lane}`); endScale = .28; }
    else if (a.k === 'equip') { dest = pos(a.u); endScale = .3; dur = 460; }
    else { dest = { x: 800, y: me === 0 ? 560 : 250 }; endScale = 190 / startW; dur = 380; }
    if (gh && dest && gh.animate) {
      const dx = dest.x - src.x, dy = dest.y - src.y;
      if (a.k === 'summon') { ccM.hide.add(a.iid); const real = unitEl(a.iid); if (real) real.style.visibility = 'hidden'; }
      const kf = a.k === 'spell'
        ? [{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(${endScale})` }]
        : [{ transform: 'none' }, { transform: `translate(${dx * .55}px,${dy * .55 - 70}px) scale(${(1 + endScale) / 2 * 1.08}) rotate(${me === 0 ? -6 : 6}deg)`, offset: .55 }, { transform: `translate(${dx}px,${dy}px) scale(${endScale})` }];
      gh.animate(kf, { duration: dur, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
      if (a.k === 'spell') {
        // the spell card hangs in the air, flares and bursts into light that flies to its targets
        ccLater(dur, () => { gh.classList.add('cast'); ccGlow(dest.x, dest.y, col, 200, 30, .8); });
        ccLater(dur + 360, () => { gh.remove(); ccBurst(dest.x, dest.y, { n: 46, c: [col, '#fff'], sp: 7, g: .02, life: 30 }); ccRing(dest.x, dest.y, col, { r1: 140, w: 4 }); });
        const tg = [...new Set(fx.filter(f => !['spell', 'trap', 'die', 'move'].includes(f.type)).map(f => f.id))];
        const sp = fx.find(f => f.type === 'spell'), targets = tg.length ? tg : sp ? [sp.id] : [];
        const fly = 340; t = dur + 380;
        targets.forEach(id => { const p = pos(id); if (p) ccLater(t, () => ccBolt(dest.x, dest.y, p.x, p.y, col, fly)); });
        impactAt = targets.length ? t + fly : t; t = impactAt;
      } else {
        ccLater(dur, () => {
          gh.remove();
          if (a.k === 'summon') { ccM.hide.delete(a.iid); const real = unitEl(a.iid); if (real) real.style.visibility = ''; const r = pos(a.iid); if (r) ccLand(r, col, real); }
          else if (a.k === 'trap') { const r = pos(`trap${me}${a.lane}`); if (r) { ccRing(r.x, r.y, me ? '#ff8aa0' : '#a9d4ff', { r1: 70, sq: .45, w: 4 }); ccBurst(r.x, r.y, { n: 16, c: me ? '#ffb3c0' : '#cfe8ff', sp: 3, g: 0, life: 26, w: 60 }); } }
          else if (a.k === 'equip') { const r = pos(a.u); if (r) { ccGlow(r.x, r.y, '#ffe9b0', 110, 22); ccBurst(r.x, r.y, { n: 26, c: ['#fff3c8', col], sp: 4, g: -.05, up: true, life: 34 }); } }
        });
        t = impactAt = dur;
      }
    } else if (gh) gh.remove();
    if (a.k === 'summon' && !(gh && dest && gh.animate)) ccM.hide.delete(a.iid);
  }
  // 2) moving units slide from where they were
  if (a.k === 'move') { const el = unitEl(a.u), b = snap.rects[a.u], n2 = now[a.u]; if (el && b && n2 && el.animate) el.animate([{ transform: `translate(${b.x - n2.x}px,${b.y - n2.y}px)` }, { transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.3,.8,.3,1)' }); t = Math.max(t, 340); }
  // 3) the effect list, in order: trap reveals first, then the attack lunge, then hits, heals, buffs and deaths
  let cursor = t;
  const atkI = fx.findIndex(f => f.type === 'attack');
  fx.forEach((f, i) => {
    if (f.type === 'trap') {
      const p = +f.id[4], lane = +f.id[5], id = snap.traps[p] && snap.traps[p][lane], r = pos(f.id);
      if (r) { ccLater(cursor, () => ccTrapReveal(id, r, p)); cursor += 720; }
    }
  });
  if (atkI >= 0) {
    const att = fx[atkI].id, tgtF = fx.slice(atkI + 1).find(f => f.type === 'dmg' && f.id !== att);
    const from = snap.rects[att] || now[att], to = tgtF ? pos(tgtF.id) : null;
    if (from && to) { ccLater(cursor, () => ccLunge(att, from, to, snap.html[att])); impactAt = cursor + 250; cursor += 560; }
  }
  const hitAt = Math.max(impactAt, atkI >= 0 ? impactAt : cursor - (fx.some(f => f.type === 'trap') ? 360 : 0));
  const offs = {};
  fx.forEach(f => {
    if (f.type === 'attack' || f.type === 'spell' || f.type === 'summon' || f.type === 'set') return;
    const p = pos(f.id); if (!p) return;
    const o = offs[f.id] = (offs[f.id] || 0) + 1, at = (f.type === 'die' ? hitAt + 220 : hitAt) + (o - 1) * 90, yy = p.y - 6 - (o - 1) * 30;
    const isHero = f.id.startsWith('hero'), elOf = () => isHero ? ccM.el.querySelector(`[data-hero="${f.id.slice(4)}"]`) : unitEl(f.id);
    if (f.type === 'dmg') ccLater(at, () => { ccNum(p.x, yy, `−${f.n}`, 'dmg'); ccHitFx(elOf(), p, f.n, isHero, f.id === 'hero0'); });
    else if (f.type === 'heal') ccLater(at, () => { ccNum(p.x, yy, `+${f.n}`, 'heal'); ccGlow(p.x, p.y, 'rgba(120,255,170,.9)', 90, 26); ccBurst(p.x, p.y + 30, { n: 22, c: ['#b8ffd0', '#6dffa8', '#fff'], sp: 2.2, g: -.06, up: true, spread: 1.4, k: 'ember', life: 46, w: 60 }); });
    else if (f.type === 'buff') ccLater(at, () => { ccNum(p.x, yy, 'Buff', 'buff'); ccGlow(p.x, p.y, 'rgba(255,220,130,.9)', 100, 24); ccBurst(p.x, p.y + 40, { n: 26, c: ['#fff3c8', '#ffd36b'], sp: 3, g: -.08, up: true, spread: .9, k: 'ember', life: 40, w: 80 }); ccPulseEl(elOf(), 'buff'); });
    else if (f.type === 'debuff') ccLater(at, () => { ccNum(p.x, yy, 'Weakened', 'debuff'); ccBurst(p.x, p.y - 40, { n: 20, c: ['#d8b6ff', '#8a5cff'], sp: 2.4, g: .1, life: 40, w: 80 }); ccPulseEl(elOf(), 'debuff'); });
    else if (f.type === 'stun') ccLater(at, () => { ccNum(p.x, yy, 'Stunned', 'stun'); ccRing(p.x, p.y - 50, '#9fd8ff', { r0: 16, r1: 44, sq: .35, w: 3, life: 34 }); ccBurst(p.x, p.y - 50, { n: 18, c: ['#d6efff', '#6ab8ff'], sp: 3, g: 0, life: 30 }); ccPulseEl(elOf(), 'stun'); });
    else if (f.type === 'poison') ccLater(at, () => { ccNum(p.x, yy, 'Poisoned', 'poison'); ccBurst(p.x, p.y + 20, { n: 22, c: ['#c8ff9a', '#5cd65c'], sp: 1.6, g: -.05, up: true, k: 'ember', life: 50, w: 70 }); ccPulseEl(elOf(), 'poison'); });
    else if (f.type === 'move' && a.k !== 'move') { const b = snap.rects[f.id], el = elOf(); if (el && b && el.animate) el.animate([{ transform: `translate(${b.x - p.x}px,${b.y - p.y}px)` }, { transform: 'none' }], { duration: 360, delay: hitAt, easing: 'cubic-bezier(.3,.8,.3,1)', fill: 'backwards' }); }
    else if (f.type === 'die') { const b = snap.rects[f.id] || p; ccLater(at, () => ccDissolve(f.id, b, snap.html[f.id])); }
  });
  ccM.impact = hitAt;
  let end = Math.max(cursor, hitAt + (fx.some(f => f.type === 'die') ? 900 : fx.length ? 560 : 0));
  // 4) a new turn: banner, then the cards drawn fly in from the deck
  if (snap.active !== G.active && G.phase !== 'over') { ccLater(end, () => ccTurnBanner(G.active)); end += 950; }
  const drawn = G.players[0].hand.filter(c => !snap.hand.includes(c.iid) && c.iid !== a.iid).map(c => c.iid);
  if (drawn.length) { ccDeal(drawn, end); end += 260 + drawn.length * 130; }
  const opNew = G.players[1].hand.length - snap.opHand + (me === 1 && a.iid ? 1 : 0);
  if (opNew > 0) ccLater(Math.max(0, end - 300), () => { const bs = [...ccM.el.querySelectorAll('.ccm-back')].slice(-opNew); bs.forEach((b, i) => b.animate && b.animate([{ transform: `rotate(var(--r)) translateY(-90px)`, opacity: 0 }, { transform: 'rotate(var(--r))', opacity: 1 }], { duration: 380, delay: i * 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' })); });
  return end;
}

/* a unit lands: a shockwave, dust, the slot's rune flares and a small shake */
function ccLand(r, col, el) {
  ccRing(r.x, r.y + 6, col, { r0: 30, r1: 120, sq: .5, w: 6, life: 24 });
  ccRing(r.x, r.y + 6, '#fff', { r0: 20, r1: 80, sq: .5, w: 2, life: 18 });
  ccBurst(r.x, r.y + 56, { n: 26, c: ['#e9dcff', col, '#ffffff'], sp: 5, g: .05, sq: .35, k: 'dust', r: 2.6, life: 30, w: 90 });
  ccGlow(r.x, r.y, col, 120, 20, .7);
  if (el && el.animate) el.animate([{ transform: 'scale(1.18)', filter: 'brightness(2.2)' }, { transform: 'scale(.97)', filter: 'brightness(1.2)', offset: .6 }, { transform: 'none', filter: 'none' }], { duration: 360, easing: 'ease-out' });
  const slot = el && el.closest('.cc-slot'); if (slot) { slot.classList.remove('fx-land'); void slot.offsetWidth; slot.classList.add('fx-land'); setTimeout(() => slot.classList.remove('fx-land'), 900); }
  ccShake(4, 260);
}
/* an attack: the attacker (as a ghost above everything) winds up, dashes into the target and springs back */
function ccLunge(id, from, to, html) {
  const el = ccM.el.querySelector(`[data-u="${id}"]`), src = el ? el.outerHTML : html; if (!src) return;
  const gh = ccGhost(src.replace(/\b(ready|sel|tgt|spent|sick)\b/g, ''), from, 'unit'); if (!gh || !gh.animate) { if (gh) gh.remove(); return; }
  ccM.hide.add(id); if (el) el.style.visibility = 'hidden';
  const dx = to.x - from.x, dy = to.y - from.y, k = .74;
  gh.animate([{ transform: 'none' }, { transform: `translate(${-dx * .08}px,${-dy * .08}px) scale(1.06) rotate(${dx > 0 ? -4 : 4}deg)`, offset: .3 }, { transform: `translate(${dx * k}px,${dy * k}px) scale(1.12)`, offset: .48 }, { transform: `translate(${dx * k * .9}px,${dy * k * .9}px) scale(1.08)`, offset: .6 }, { transform: 'none' }],
    { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' });
  setTimeout(() => {
    const ix = from.x + dx * k + dx * .12, iy = from.y + dy * k + dy * .12;
    ccBurst(ix, iy, { n: 34, c: ['#fff', '#ffd59a', '#ff8a5a'], sp: 9, g: .15, life: 26 });
    ccRing(ix, iy, '#ffe2b0', { r0: 8, r1: 70, w: 5, life: 16 }); ccGlow(ix, iy, 'rgba(255,220,170,.95)', 90, 14);
    ccShake(6, 300);
  }, 250);
  setTimeout(() => { gh.remove(); if (!ccM) return; ccM.hide.delete(id); const e2 = ccM.el.querySelector(`[data-u="${id}"]`); if (e2) e2.style.visibility = ''; }, 520);
}
function ccHitFx(el, p, n, isHero, mine) {
  ccBurst(p.x, p.y, { n: 12 + n * 4, c: ['#ffb08a', '#ff5a4a', '#fff'], sp: 5 + n, g: .2, life: 24 });
  if (el && el.animate) el.animate([{ transform: 'none', filter: 'none' }, { transform: 'translateX(-7px)', filter: 'brightness(1.8) sepia(1) saturate(4) hue-rotate(-30deg)', offset: .2 }, { transform: 'translateX(6px)', offset: .45 }, { transform: 'translateX(-3px)', offset: .7 }, { transform: 'none', filter: 'none' }], { duration: 420 });
  if (isHero) { ccGlow(p.x, p.y, 'rgba(255,60,60,.9)', 140, 26); if (mine) { const L = ccLayer(); if (L) { const v = document.createElement('i'); v.className = 'ccx-hurt'; L.appendChild(v); setTimeout(() => v.remove(), 900); } } }
}
function ccPulseEl(el, k) { if (el && el.animate) el.animate([{ filter: 'none' }, { filter: k === 'buff' ? 'brightness(1.7) drop-shadow(0 0 14px #ffd36b)' : k === 'stun' ? 'brightness(1.5) drop-shadow(0 0 14px #6ab8ff)' : k === 'poison' ? 'brightness(1.3) drop-shadow(0 0 14px #5cd65c)' : 'brightness(.6) drop-shadow(0 0 14px #8a5cff)', offset: .35 }, { filter: 'none' }], { duration: 700 }); }
/* a destroyed unit burns away from the bottom up, shedding embers in its colour */
function ccDissolve(id, r, html) {
  if (!html || !r) return;
  const gh = ccGhost(html.replace(/\b(ready|sel|tgt|spent|sick)\b/g, ''), r, 'unit burn'); if (!gh) return;
  const m = /--cs:([^;"]+)/.exec(html), col = m ? m[1] : '#ffb36b';
  const steps = 14;
  for (let i = 0; i < steps; i++) ccLater(120 + i * 48, () => { const y = r.y + r.h / 2 - (i / steps) * r.h; ccBurst(r.x, y, { n: 7, c: [col, '#ffd59a', '#fff1d6', '#6a6070'], sp: 1.4, g: -.06, up: true, spread: 2.6, k: 'ember', r: 2, life: 50, w: r.w * .9 }); });
  ccLater(80, () => ccGlow(r.x, r.y, col, 110, 18, .7));
  setTimeout(() => gh.remove(), 900);
}
/* a trap springs: its card flips up out of the slot, shows itself, then fades */
function ccTrapReveal(id, r, p) {
  if (!id) return;
  const L = ccLayer(); if (!L) return;
  const y = p === 1 ? r.y + 150 : r.y - 150, w = 150;
  const gh = ccCardGhost(id, { x: r.x, y }, w, true); if (!gh) return;
  gh.classList.add('trapflip');
  const tag = document.createElement('span'); tag.className = 'ccx-traptag'; tag.textContent = 'Trap!'; gh.appendChild(tag);
  ccRing(r.x, r.y, '#ffd0a0', { r1: 80, sq: .5, w: 5 }); ccBurst(r.x, r.y, { n: 30, c: ['#fff', '#ffcf7a', ccStyleCol(id)], sp: 6, g: .05, life: 30, w: 80 });
  setTimeout(() => gh.remove(), 1150);
}
/* cards drawn fly from the deck pile into the hand */
function ccDeal(iids, delay = 0) {
  ccLater(delay, () => {
    const pile = ccRectOf(ccM.el.querySelector('.ccm-piles.me .ccbk')) || { x: 1490, y: 715 };
    iids.forEach((iid, i) => {
      const hc = ccM.el.querySelector(`[data-hand="${iid}"]`), card = hc && hc.querySelector('.ccc'); if (!card || !card.animate) return;
      const r = ccRectOf(card), rot = parseFloat(hc.style.getPropertyValue('--r')) || 0, a = -rot * Math.PI / 180;
      const dx = pile.x - r.x, dy = pile.y - r.y, lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      card.animate([{ transform: `translate(${lx}px,${ly}px) scale(.18) rotateY(180deg)`, opacity: .2 }, { transform: `translate(${lx * .4}px,${ly * .4 - 120}px) scale(.8) rotateY(90deg)`, opacity: 1, offset: .5 }, { transform: 'none', opacity: 1 }],
        { duration: 560, delay: i * 130, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' });
      ccLater(560 + i * 130, () => { const r2 = ccRectOf(card); if (r2) ccBurst(r2.x, r2.y - 80, { n: 8, c: ['#ffd9f4', '#c9a6ff'], sp: 2, g: 0, life: 22 }); });
    });
  });
}
/* "Your turn" / "Enemy turn" sweeps across the battle line */
function ccTurnBanner(p) {
  const L = ccLayer(); if (!L) return;
  const b = document.createElement('div'); b.className = 'ccx-turn ' + (p === 0 ? 'me' : 'op');
  b.innerHTML = `<i class="ccx-turn-bar"></i><b>${p === 0 ? 'Your turn' : 'Enemy turn'}</b>`;
  L.appendChild(b); setTimeout(() => b.remove(), 1300);
  if (p === 0) { ccGlow(800, 400, 'rgba(201,166,255,.6)', 360, 34, .6); ccBurst(800, 400, { n: 40, c: ['#ffd9f4', '#c9a6ff', '#8fb8ff', '#fff'], sp: 8, g: 0, sq: .25, life: 40 }); }
}
/* the bot shows the card it is about to play (a trap stays face down) before it lands */
function ccReveal(a, done) {
  const G = ccM.G, c = G.players[1].hand.find(x => x.iid === a.iid); if (!c) return done(null);
  const face = a.k !== 'trap', w = 190, to = { x: 800, y: 214 };
  const gh = ccCardGhost(c.id, { x: 1262, y: 6 }, 56, face); if (!gh || !gh.animate) { if (gh) gh.remove(); return done(null); }
  gh.animate([{ transform: 'none', opacity: .4 }, { transform: `translate(${to.x - 1262}px,${to.y - 6}px) scale(${w / 56})`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  ccLater(420, () => { gh.classList.add('shown'); ccGlow(to.x, to.y, face ? ccStyleCol(c.id) : 'rgba(255,90,120,.8)', 180, 30, .55); });
  const m = ccM;
  setTimeout(() => { gh.remove(); if (ccM !== m) return; done({ x: to.x, y: to.y, w, h: w * 1.4 }); }, 1150);
}
/* the duel intro: you on the left, the bot on the right, a slashing VS, then who goes first */
function ccIntro(done) {
  const L = ccLayer(); if (!L) return done();
  const G = ccM.G, w = avatarEntry() || wallpaperInfo(), art = !!w && wpHasArt(w), src = w ? wpSrc(w) : portrait(S.player.look, 4);
  const foe = ccM.foe, foeArt = foe && baseArt(foe);
  const el = document.createElement('div'); el.className = 'ccx-intro';
  el.innerHTML = `<i class="cci-bg"></i>
    <div class="cci-side me"><div class="cci-art">${art ? `<img src="${src}" alt="">` : `<span class="cci-ava">${avatarHTML(220)}</span>`}</div><div class="cci-name"><small>${esc(ccM.deck.name)}</small><b>${esc(G.names[0])}</b></div></div>
    <div class="cci-side op"><div class="cci-art">${foeArt ? `<img src="${foeArt}" alt="">` : foe ? `<span class="cci-ava foe">${baseThumb(foe)}</span>` : `<span class="cci-bot">${ccIco('bot')}</span>`}</div><div class="cci-name"><small>Bot · mirror deck</small><b>${esc(G.names[1])}</b></div></div>
    <i class="cci-cut"></i><b class="cci-vs">VS</b>
    <div class="cci-first"><span>${G.first === 0 ? 'You go first' : `${esc(G.names[1])} goes first`}</span></div>`;
  L.appendChild(el);
  ccLater(520, () => { ccShake(9, 420); ccGlow(800, 430, 'rgba(255,230,250,.95)', 420, 26); ccBurst(800, 430, { n: 90, c: ['#fff', '#ffd9f4', '#c9a6ff', '#ffe9b0'], sp: 13, g: .06, life: 40 }); ccRing(800, 430, '#ffe9fb', { r0: 40, r1: 520, w: 8, life: 34 }); });
  ccLater(2300, () => el.classList.add('out'));
  ccLater(2750, () => { el.remove(); done(); });
}
/* the hovered hand card tilts toward the pointer and its foil follows */
function ccTilt(e) {
  const hc = e.target.closest && e.target.closest('.ccm-hc'); const card = hc && hc.querySelector('.ccc');
  if (ccM.tiltCard && ccM.tiltCard !== card) { ccM.tiltCard.style.removeProperty('--tx'); ccM.tiltCard.style.removeProperty('--ty'); ccM.tiltCard.style.removeProperty('--sx'); }
  ccM.tiltCard = card; if (!card) return;
  const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  card.style.setProperty('--ty', (x * 16).toFixed(1) + 'deg'); card.style.setProperty('--tx', (-y * 12).toFixed(1) + 'deg'); card.style.setProperty('--sx', (130 - (x + .5) * 160).toFixed(0) + '%');
}
