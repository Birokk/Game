/* ---------- Card Clash battle event weather over the whole screen ----------
   When a match has a battle event (G.ev, rules in 44-clash.js), its weather plays over everything: the table, the hall
   and the letterbox around the stage. One layer (.ccwx, appended to the match root so it covers the whole viewport):
   a CSS tint / light layer (clash.css "battle event weather"), a canvas drawn in screen pixels (crisp on every screen
   size, at most 1.5× device pixels) and a flash layer for lightning. Started by the event reveal (ccEventReveal in
   51-clash-extra.js), so the weather begins with the event; it stops by itself when the match screen goes away and is
   hidden on the end screen. Kept see-through on purpose: the game must stay readable. Reduced motion: half the
   particles and no lightning flashes. Motion is time based (px per second), so 60 and 120 Hz screens look the same. */
const ccWx = { raf: 0, root: null, cv: null, g: null, ev: null, W: 0, H: 0, dpr: 1, s: 1, k: 1, parts: [], fx: [], lens: [], last: 0, next: {}, lite: false };
const wxR = (a, b) => a + Math.random() * (b - a);
/* how many of each particle at a 1600×900 screen (scaled by screen area, see ccWxN) */
const CC_WX_N = {
  rain: { far: 230, near: 34 }, bloodmoon: { petal: 34, ash: 46 }, surge: { spark: 64, mote: 30 }, wind: { gust: 26, leaf: 20 },
  starfall: { twinkle: 46 }, sanctuary: { mote: 64, feather: 7 }, heat: { ember: 84, wave: 10 }
};
const ccWxN = n => Math.max(4, Math.round(n * ccWx.k * (ccWx.lite ? .5 : 1)));

function ccWxStart(ev) {
  ccWxStop();
  const el = ccM && ccM.el; if (!el || !ev || !CC_WX_N[ev]) return;
  el.insertAdjacentHTML('beforeend', `<div class="ccwx" data-ev="${ev}" aria-hidden="true"><i class="ccwx-tint"></i><canvas class="ccwx-c"></canvas><i class="ccwx-fl"></i></div>`);
  const root = el.querySelector('.ccwx');
  Object.assign(ccWx, { root, cv: root.querySelector('canvas'), ev, parts: [], fx: [], lens: [], next: {}, last: 0, lite: matchMedia('(prefers-reduced-motion: reduce)').matches });
  ccWx.g = ccWx.cv.getContext('2d');
  ccWxSize(); addEventListener('resize', ccWxSize);
  requestAnimationFrame(() => root.classList.add('on'));   // fades in with the reveal
  const loop = now => {
    if (!ccWx.cv || !ccWx.cv.isConnected || !ccM) return ccWxStop();
    ccWx.raf = requestAnimationFrame(loop);
    if (ccM.el.classList.contains('ended')) return;   // hidden on the end screen
    ccWxFrame(now);
  };
  ccWx.raf = requestAnimationFrame(loop);
}
function ccWxStop() {
  cancelAnimationFrame(ccWx.raf); ccWx.raf = 0; removeEventListener('resize', ccWxSize);
  if (ccWx.root) ccWx.root.remove();
  Object.assign(ccWx, { root: null, cv: null, g: null, ev: null, parts: [], fx: [], lens: [] });
}
function ccWxSize() {
  const c = ccWx.cv; if (!c) return;
  const W = innerWidth, H = innerHeight, dpr = Math.min(1.5, devicePixelRatio || 1);
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  Object.assign(ccWx, { W, H, dpr, s: Math.max(.62, Math.min(1.3, Math.min(W / 1600, H / 900))), k: Math.max(.5, Math.min(1.5, W * H / 1.44e6)) });
  ccWxFill();
}
/* keeps every kind at its count; fresh particles start anywhere on screen the first time */
function ccWxFill(fresh = true) {
  const want = CC_WX_N[ccWx.ev]; if (!want) return;
  for (const [kind, n] of Object.entries(want)) {
    const have = ccWx.parts.filter(p => p.k === kind).length, need = ccWxN(n) - have;
    for (let i = 0; i < need; i++) ccWx.parts.push(ccWxSpawn(kind, fresh));
  }
}
function ccWxSpawn(kind, anywhere) {
  const W = ccWx.W, H = ccWx.H, s = ccWx.s;
  switch (kind) {
    case 'far': case 'near': {   // rain: two layers, slanted, each drop lands somewhere and splashes
      const near = kind === 'near', vy = (near ? wxR(1900, 2400) : wxR(1150, 1550)) * s;
      return { k: kind, x: wxR(-80, W + 220), y: anywhere ? wxR(-60, H) : wxR(-160, -20), vy, vx: -vy * .17, len: (near ? wxR(55, 85) : wxR(22, 38)) * s, ty: wxR(H * .12, H * 1.15) };
    }
    case 'petal': return { k: kind, x: anywhere ? wxR(0, W) : wxR(-60, W * .8), y: anywhere ? wxR(0, H) : wxR(-40, -12), vx: wxR(22, 55) * s, vy: wxR(28, 60) * s, a: wxR(0, 6.3), va: wxR(-1.6, 1.6), fl: wxR(2, 4), ph: wxR(0, 6.3), r: wxR(6, 11) * s, c: ['#b3122a', '#d6233f', '#8a0c1e', '#ee4a60'][Math.floor(wxR(0, 4))] };
    case 'ash': return { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : -10, vx: wxR(-8, 14) * s, vy: wxR(18, 48) * s, r: wxR(1.2, 2.8) * s, ph: wxR(0, 6.3) };
    case 'spark': return { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : H + 14, vy: -wxR(30, 80) * s, a: wxR(0, 6.3), va: wxR(-2.4, 2.4), r: wxR(4, 9) * s, ph: wxR(0, 6.3), c: ['201,155,255', '255,150,230', '140,220,255'][Math.floor(wxR(0, 3))] };
    case 'mote': return ccWx.ev === 'sanctuary'
      ? { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : H + 12, vy: -wxR(22, 55) * s, r: wxR(1.4, 3.4) * s, ph: wxR(0, 6.3), c: '255,226,150' }
      : { k: kind, x: wxR(0, W), y: wxR(0, H), vy: -wxR(6, 18) * s, r: wxR(1, 2.4) * s, ph: wxR(0, 6.3), c: '220,190,255' };
    case 'gust': return { k: kind, x: anywhere ? wxR(-400, W) : wxR(-900, -200), y: wxR(H * .04, H * .96), vx: wxR(700, 1150) * s, len: wxR(160, 360) * s, amp: wxR(5, 16) * s, ph: wxR(0, 6.3), a: wxR(.24, .48) };
    case 'leaf': return { k: kind, x: anywhere ? wxR(0, W) : wxR(-120, -20), y: wxR(0, H), vx: wxR(260, 480) * s, vy: wxR(-30, 40) * s, a: wxR(0, 6.3), va: wxR(-5, 5), fl: wxR(4, 8), ph: wxR(0, 6.3), r: wxR(6, 10) * s, c: ['#6fbf62', '#8fbf4a', '#c9a24a', '#d98a3a'][Math.floor(wxR(0, 4))] };
    case 'twinkle': return { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : -12, vy: wxR(14, 42) * s, r: wxR(2.4, 5.2) * s, ph: wxR(0, 6.3), c: Math.random() < .5 ? '255,244,214' : '210,225,255' };
    case 'feather': return { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : -30, vx: wxR(-12, 12) * s, vy: wxR(18, 34) * s, a: wxR(-.6, .6), ph: wxR(0, 6.3), r: wxR(14, 22) * s };
    case 'ember': return { k: kind, x: wxR(0, W), y: anywhere ? wxR(0, H) : H + wxR(0, 30), vx: wxR(-14, 14) * s, vy: -wxR(40, 95) * s, r: wxR(1.5, 3.2) * s, ph: wxR(0, 6.3), life: anywhere ? wxR(.2, 1) : 1, dec: wxR(.12, .3) };
    case 'wave': return { k: kind, y: anywhere ? wxR(0, H) : H + 20, vy: -wxR(26, 50) * s, amp: wxR(3, 7) * s, len: wxR(.006, .012) / s, ph: wxR(0, 6.3), a: wxR(.08, .15) };
  }
  return { k: kind, x: 0, y: H + 999 };
}

function ccWxFrame(now) {
  const g = ccWx.g, W = ccWx.W, H = ccWx.H, s = ccWx.s, t = now / 1000;
  const dt = ccWx.last ? Math.min(.05, (now - ccWx.last) / 1000) : .016; ccWx.last = now;
  g.setTransform(ccWx.dpr, 0, 0, ccWx.dpr, 0, 0); g.clearRect(0, 0, W, H);
  const ev = ccWx.ev, P = ccWx.parts, FX = ccWx.fx, lw = v => Math.max(1, v * s);
  if (ev === 'rain') {
    // streaks in two layers: one path per layer so hundreds of drops stay cheap
    for (const [kind, a, w] of [['far', .3, 1.1], ['near', .42, 2]]) {
      g.strokeStyle = `rgba(200,222,255,${a})`; g.lineWidth = lw(w); g.lineCap = 'round'; g.beginPath();
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i]; if (p.k !== kind) continue;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y >= p.ty) {   // lands: a splash ring and two droplets
          if (p.ty < H && FX.length < 90) FX.push({ k: 'splash', x: p.x, y: p.ty, life: 1, s: (kind === 'near' ? 1.4 : 1) * wxR(.7, 1.2) });
          P[i] = ccWxSpawn(kind, false); continue;
        }
        const f = p.len / p.vy; g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * f, p.y - p.len);
      }
      g.stroke();
    }
    // drops on the "glass": they appear, a few slide down, then dry up
    if (!ccWx.next.lens || now > ccWx.next.lens) { ccWx.next.lens = now + wxR(350, 1100); if (ccWx.lens.length < (ccWx.lite ? 6 : 14)) ccWx.lens.push({ x: wxR(0, W), y: wxR(0, H), r: wxR(3, 8) * s, life: 1, dur: wxR(3, 7), slide: Math.random() < .4 ? wxR(18, 60) * s : 0 }); }
    for (let i = ccWx.lens.length - 1; i >= 0; i--) {
      const d = ccWx.lens[i]; d.life -= dt / d.dur; if (d.life <= 0) { ccWx.lens.splice(i, 1); continue; }
      if (d.slide && d.life < .85) d.y += d.slide * dt;
      const a = Math.min(1, d.life * 3, (1 - d.life) * 8);
      g.fillStyle = `rgba(200,220,255,${(.1 * a).toFixed(3)})`; g.beginPath(); g.arc(d.x, d.y, d.r, 0, 6.283); g.fill();
      g.strokeStyle = `rgba(230,240,255,${(.4 * a).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.arc(d.x, d.y, d.r, .3, 2.9); g.stroke();
      g.fillStyle = `rgba(255,255,255,${(.7 * a).toFixed(3)})`; g.beginPath(); g.arc(d.x - d.r * .35, d.y - d.r * .4, Math.max(.8, d.r * .22), 0, 6.283); g.fill();
    }
    // lightning: a forked bolt in the sky beside the board and a flash over the whole screen
    if (!ccWx.lite) {
      if (!ccWx.next.bolt) ccWx.next.bolt = now + wxR(2500, 5000);
      else if (now > ccWx.next.bolt) { ccWx.next.bolt = now + wxR(7000, 12500); ccWxBolt(); }
    }
  } else if (ev === 'bloodmoon') {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.k === 'petal') {   // crimson petals tumbling and flipping
        p.x += (p.vx + Math.sin(t * 1.2 + p.ph) * 18 * s) * dt; p.y += p.vy * dt; p.a += p.va * dt;
        if (p.y > H + 20 || p.x > W + 30) { P[i] = ccWxSpawn('petal', false); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(Math.cos(t * p.fl + p.ph), 1); g.globalAlpha = .78; g.fillStyle = p.c;
        g.beginPath(); g.moveTo(0, -p.r); g.quadraticCurveTo(p.r * .9, -p.r * .2, 0, p.r); g.quadraticCurveTo(-p.r * .9, -p.r * .2, 0, -p.r); g.fill();
        g.globalAlpha = .35; g.fillStyle = '#ffb0bb'; g.beginPath(); g.ellipse(-p.r * .15, -p.r * .25, p.r * .18, p.r * .45, 0, 0, 6.283); g.fill(); g.restore();
      } else {   // glowing ash
        p.x += (p.vx + Math.sin(t * 1.4 + p.ph) * 10 * s) * dt; p.y += p.vy * dt;
        if (p.y > H + 10) { P[i] = ccWxSpawn('ash', false); continue; }
        const a = .45 + .3 * Math.sin(t * 3 + p.ph); g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,60,80,${(a * .22).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 3.4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(255,130,140,${a.toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
      }
    }
  } else if (ev === 'surge') {
    g.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.y += p.vy * dt;
      if (p.y < -16) { P[i] = ccWxSpawn(p.k, false); continue; }
      if (p.k === 'spark') {   // four-point star sparks turning as they rise
        p.a += p.va * dt; const a = .5 + .45 * Math.sin(t * 4 + p.ph), r = p.r;
        g.fillStyle = `rgba(${p.c},${(a * .18).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, r * 2.2, 0, 6.283); g.fill();
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = `rgba(${p.c},${a.toFixed(3)})`;
        g.beginPath(); g.moveTo(0, -r); g.lineTo(r * .22, -r * .22); g.lineTo(r, 0); g.lineTo(r * .22, r * .22); g.lineTo(0, r); g.lineTo(-r * .22, r * .22); g.lineTo(-r, 0); g.lineTo(-r * .22, -r * .22); g.fill(); g.restore();
      } else { const a = .3 + .3 * Math.sin(t * 2 + p.ph); g.fillStyle = `rgba(${p.c},${a.toFixed(3)})`; g.beginPath(); g.arc(p.x + Math.sin(t + p.ph) * 8 * s, p.y, p.r, 0, 6.283); g.fill(); }
    }
    // arcane rings blooming here and there
    if (!ccWx.next.ring || now > ccWx.next.ring) { ccWx.next.ring = now + wxR(700, 1600); FX.push({ k: 'ring', x: wxR(W * .05, W * .95), y: wxR(H * .08, H * .92), life: 1, c: Math.random() < .6 ? '201,155,255' : '255,150,230' }); }
    g.globalCompositeOperation = 'source-over';
  } else if (ev === 'wind') {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.k === 'gust') {   // long wavy streaks rushing across, fading at both ends
        p.x += p.vx * dt; if (p.x - p.len > W) { P[i] = ccWxSpawn('gust', false); continue; }
        const x0 = p.x - p.len, gr = g.createLinearGradient(x0, 0, p.x, 0);
        gr.addColorStop(0, 'rgba(225,255,246,0)'); gr.addColorStop(.6, `rgba(225,255,246,${p.a})`); gr.addColorStop(1, 'rgba(225,255,246,0)');
        g.strokeStyle = gr; g.lineWidth = lw(2.2); g.beginPath();
        for (let k = 0; k <= 14; k++) { const xx = x0 + p.len * k / 14, yy = p.y + Math.sin(xx / (70 * s) + p.ph + t * 2) * p.amp; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
        g.stroke();
      } else {   // leaves tumbling past
        p.x += p.vx * dt; p.y += (p.vy + Math.sin(t * 3 + p.ph) * 40 * s) * dt; p.a += p.va * dt;
        if (p.x > W + 30) { P[i] = ccWxSpawn('leaf', false); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.scale(1, Math.cos(t * p.fl + p.ph)); g.globalAlpha = .85; g.fillStyle = p.c;
        g.beginPath(); g.moveTo(-p.r, 0); g.quadraticCurveTo(0, -p.r * .7, p.r, 0); g.quadraticCurveTo(0, p.r * .7, -p.r, 0); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-p.r, 0); g.lineTo(p.r, 0); g.stroke(); g.restore();
      }
    }
  } else if (ev === 'starfall') {
    g.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--) {   // little stars drifting down and twinkling
      const p = P[i]; p.y += p.vy * dt; if (p.y > H + 12) { P[i] = ccWxSpawn('twinkle', false); continue; }
      const a = .35 + .6 * Math.max(0, Math.sin(t * 3 + p.ph)), r = p.r * (.7 + .5 * a);
      g.fillStyle = `rgba(${p.c},${(a * .2).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, r * 2.4, 0, 6.283); g.fill();
      g.fillStyle = `rgba(${p.c},${a.toFixed(3)})`; g.beginPath();
      g.moveTo(p.x, p.y - r * 2); g.lineTo(p.x + r * .35, p.y - r * .35); g.lineTo(p.x + r * 2, p.y); g.lineTo(p.x + r * .35, p.y + r * .35); g.lineTo(p.x, p.y + r * 2); g.lineTo(p.x - r * .35, p.y + r * .35); g.lineTo(p.x - r * 2, p.y); g.lineTo(p.x - r * .35, p.y - r * .35); g.fill();
    }
    // shooting stars across the whole screen, now and then
    if (!ccWx.next.shoot || now > ccWx.next.shoot) { ccWx.next.shoot = now + wxR(500, 1500); const vx = wxR(900, 1400) * s; FX.push({ k: 'shoot', x: wxR(-W * .2, W * .7), y: wxR(-H * .1, H * .5), vx, vy: vx * wxR(.3, .5), life: 1, dec: wxR(.9, 1.4) }); }
    g.globalCompositeOperation = 'source-over';
  } else if (ev === 'sanctuary') {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.k === 'mote') {   // golden motes rising
        p.y += p.vy * dt; p.x += Math.sin(t + p.ph) * 12 * s * dt; if (p.y < -12) { P[i] = ccWxSpawn('mote', false); continue; }
        const a = .4 + .35 * Math.sin(t * 2 + p.ph); g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(${p.c},${(a * .28).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(255,244,200,${a.toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
      } else {   // white-gold feathers drifting down, rocking side to side
        p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 1.3 + p.ph) * 30 * s) * dt; if (p.y > H + 30) { P[i] = ccWxSpawn('feather', false); continue; }
        const r = p.r; g.save(); g.translate(p.x, p.y); g.rotate(p.a + Math.sin(t * 1.3 + p.ph) * .5); g.globalAlpha = .7;
        const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#ffd98a'); g.fillStyle = gr;
        g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * .55, -r * .5, r * .45, r * .5, 0, r); g.bezierCurveTo(-r * .3, r * .4, -r * .4, -r * .5, 0, -r); g.fill();
        g.strokeStyle = 'rgba(190,140,50,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * .08, 0, 0, r * 1.25); g.stroke(); g.restore();
      }
    }
  } else if (ev === 'heat') {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.k === 'wave') {   // heat waves: faint wavy lines rising
        p.y += p.vy * dt; if (p.y < -20) { P[i] = ccWxSpawn('wave', false); continue; }
        g.strokeStyle = `rgba(255,214,160,${p.a})`; g.lineWidth = lw(2.6); g.beginPath();
        for (let x = 0; x <= W; x += 24) { const yy = p.y + Math.sin(x * p.len + t * 2.4 + p.ph) * p.amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
        g.stroke();
      } else {   // embers rising and cooling
        p.x += (p.vx + Math.sin(t * 2 + p.ph) * 14 * s) * dt; p.y += p.vy * dt; p.life -= p.dec * dt;
        if (p.life <= 0 || p.y < -10) { P[i] = ccWxSpawn('ember', false); continue; }
        const a = Math.min(1, p.life * 2) * (.6 + .4 * Math.sin(t * 9 + p.ph)), c = p.life > .5 ? '255,214,120' : '255,120,50';
        g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(${c},${(a * .25).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 3.2, 0, 6.283); g.fill();
        g.fillStyle = `rgba(${c},${a.toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
      }
    }
  }
  // one-off effects: splashes, rings, shooting stars, bolts
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i];
    if (f.k === 'splash') {
      f.life -= dt * 2.6; if (f.life <= 0) { FX.splice(i, 1); continue; }
      const q = 1 - f.life, rx = (2 + q * 13) * f.s * s;
      g.strokeStyle = `rgba(205,228,255,${(f.life * .55).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.ellipse(f.x, f.y, rx, rx * .32, 0, 0, 6.283); g.stroke();
      if (f.life > .45) { g.fillStyle = `rgba(225,238,255,${(f.life * .7).toFixed(3)})`; const h = Math.sin(q * 3.14) * 9 * f.s * s; g.fillRect(f.x - rx * .5, f.y - h, 1.6, 1.6); g.fillRect(f.x + rx * .45, f.y - h * .8, 1.6, 1.6); }
    } else if (f.k === 'ring') {
      f.life -= dt * .9; if (f.life <= 0) { FX.splice(i, 1); continue; }
      const r = (10 + (1 - f.life) * 150) * s; g.globalCompositeOperation = 'lighter';
      g.strokeStyle = `rgba(${f.c},${(f.life * .5).toFixed(3)})`; g.lineWidth = lw(3 * f.life + .6); g.beginPath(); g.arc(f.x, f.y, r, 0, 6.283); g.stroke();
      g.setLineDash([4 * s, 7 * s]); g.strokeStyle = `rgba(255,255,255,${(f.life * .3).toFixed(3)})`; g.lineWidth = 1; g.beginPath(); g.arc(f.x, f.y, r * .72, t, t + 6.283); g.stroke(); g.setLineDash([]);
      g.globalCompositeOperation = 'source-over';
    } else if (f.k === 'shoot') {
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= f.dec * dt; if (f.life <= 0 || f.x > W + 200) { FX.splice(i, 1); continue; }
      const tl = .22, tx = f.x - f.vx * tl, ty = f.y - f.vy * tl, gr = g.createLinearGradient(tx, ty, f.x, f.y);
      gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, `rgba(255,248,225,${(f.life * .9).toFixed(3)})`);
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = gr; g.lineWidth = lw(2.6); g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(f.x, f.y); g.stroke();
      g.fillStyle = `rgba(255,250,235,${f.life.toFixed(3)})`; g.beginPath(); g.arc(f.x, f.y, 2.8 * s + .6, 0, 6.283); g.fill();
      g.fillStyle = `rgba(255,240,200,${(f.life * .25).toFixed(3)})`; g.beginPath(); g.arc(f.x, f.y, 9 * s, 0, 6.283); g.fill(); g.globalCompositeOperation = 'source-over';
    } else if (f.k === 'bolt') {
      f.life -= dt * 2.4; if (f.life <= 0) { FX.splice(i, 1); continue; }
      const a = f.life * (f.life > .7 || f.life < .4 ? 1 : .45);   // a quick double flicker
      g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
      for (const path of f.paths) for (const [w, al] of [[10, .14], [4, .45], [1.6, 1]]) {
        g.strokeStyle = `rgba(225,235,255,${(al * a * (path.main ? 1 : .6)).toFixed(3)})`; g.lineWidth = w * s * (path.main ? 1 : .6); g.beginPath();
        path.pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
    }
  }
}
/* a lightning strike: a forked bolt from the top of the screen on one side, and the flash */
function ccWxBolt() {
  const W = ccWx.W, H = ccWx.H, s = ccWx.s, x0 = Math.random() < .5 ? wxR(W * .03, W * .22) : wxR(W * .78, W * .97);
  const walk = (x, y, until, step) => { const pts = [[x, y]]; while (y < until) { x += wxR(-26, 26) * s; y += wxR(22, 46) * s; pts.push([x, y]); } return pts; };
  const main = walk(x0, -10, wxR(H * .35, H * .62)), paths = [{ main: true, pts: main }];
  for (let b = 0; b < 2; b++) { const at = main[Math.floor(wxR(2, main.length - 2))]; if (at) paths.push({ pts: walk(at[0], at[1], at[1] + wxR(60, 140) * s) }); }
  ccWx.fx.push({ k: 'bolt', life: 1, paths });
  const fl = ccWx.root && ccWx.root.querySelector('.ccwx-fl');
  if (fl) { fl.style.setProperty('--fx', `${Math.round(x0 / W * 100)}%`); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
}
