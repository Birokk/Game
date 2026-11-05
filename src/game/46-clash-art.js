/* ---------- Card Clash art: procedural textures for the board ----------
   Everything is painted once with seeded value noise / fBm and Voronoi cells (no image files):
   - each board half (cctPaintHalf): cut flagstone wall with grain, bevels, mortar, moss and cracks; a sunken grass field
     (colour variation, thousands of tufts, dry patches, flowers), worn dirt lanes with pebbles, a raised carved stone plate
     under every slot (engraved rune), sunken trap recesses with a glowing rune, warm brazier light on the outer corners.
     Each half takes its own skin (CC_SKINS), so a bought board skin can repaint one player's side.
   - the battle line beam (cctPaintLine): dark stone with brushed bronze trims and rivets.
   - the forest around it (ccEnvImage): forest floor, rivers with caustics and banks, rocks, ferns, leaf-textured trees, light shafts.
   - small tiles for the UI chrome (cctTiles): stone and brushed bronze, used as CSS backgrounds.
   Halves are measured from the real DOM on the first render (ccArtEnsure), painted, turned into blob URLs and cached. */

const CCT_RES = 1.25;
const CC_SKINS = {
  default: { stone: [150, 143, 124], mortar: [46, 40, 33], plate: [150, 152, 146], grass1: [40, 78, 28], grass2: [96, 142, 50], dry: [156, 150, 78], dirt: [118, 90, 58], moss: [74, 108, 40], rune: [120, 200, 255] }
};
const CC_RUNE_OP = [255, 104, 96];

function cctHash(x, y, s) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function cctNoise(x, y, s, P) {
  let xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  let x1 = xi + 1, y1 = yi + 1;
  if (P) { xi = ((xi % P) + P) % P; yi = ((yi % P) + P) % P; x1 = ((x1 % P) + P) % P; y1 = ((y1 % P) + P) % P; }
  const a = cctHash(xi, yi, s), b = cctHash(x1, yi, s), c = cctHash(xi, y1, s), d = cctHash(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function cctFbm(x, y, s, oct, P) { let t = 0, amp = .5, f = 1, n = 0; for (let i = 0; i < oct; i++) { t += amp * cctNoise(x * f, y * f, s + i * 31, P ? P * f : 0); n += amp; amp *= .5; f *= 2; } return t / n; }
const CCV = { d1: 0, d2: 0, id: 0, sx: 0, sy: 0 };
function cctVor(x, y, C, s, P) {
  const cx = Math.floor(x / C), cy = Math.floor(y / C); let d1 = 1e9, d2 = 1e9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j; let hx = gx, hy = gy;
    if (P) { hx = ((gx % P) + P) % P; hy = ((gy % P) + P) % P; }
    const px = (gx + .1 + .8 * cctHash(hx, hy, s)) * C, py = (gy + .1 + .8 * cctHash(hx, hy, s + 7)) * C, d = Math.hypot(x - px, y - py);
    if (d < d1) { d2 = d1; d1 = d; CCV.id = hx * 7919 + hy * 31 + 1; CCV.sx = px; CCV.sy = py; } else if (d < d2) d2 = d;
  }
  CCV.d1 = d1; CCV.d2 = d2;
}
function cctSd(x, y, o) { const qx = Math.abs(x - o.x - o.w / 2) - o.w / 2 + o.r, qy = Math.abs(y - o.y - o.h / 2) - o.h / 2 + o.r; return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - o.r; }
const cctMix = (a, b, t) => a + (b - a) * t;
const cctClamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
/* light comes from the top left: how much a surface whose outward normal is (nx, ny) faces it */
const cctFacing = (nx, ny) => { const l = Math.hypot(nx, ny) || 1; return -(nx + ny) / l * .7071; };

/* cut flagstone: one pixel. sq squashes cells so stones come out wider than tall */
function cctStone(x, y, sk, s, out, C = 26, sq = 1.3) {
  cctVor(x, y * sq, C, s);
  const e = CCV.d2 - CCV.d1, id = CCV.id;
  const v = .86 + cctHash(id, 3, s) * .22, tint = cctHash(id, 5, s) - .5;
  const grain = cctFbm(x / 8, y / 8, s + 3, 3), sp = cctNoise(x / 1.2, y / 1.2, s + 9);
  let k = v * (.8 + grain * .36) * (.92 + sp * .16);
  const rim = Math.max(0, 1 - e / 6.5);
  k *= 1 + rim * cctFacing(x - CCV.sx, y * sq - CCV.sy) * .38;
  let r = sk.stone[0] * k + tint * 16, g = sk.stone[1] * k + tint * 9, b = sk.stone[2] * k - tint * 6;
  if (e < 2.2) { const m = .72 + cctNoise(x / 1.5, y / 1.5, s + 11) * .35; r = sk.mortar[0] * m; g = sk.mortar[1] * m; b = sk.mortar[2] * m; }
  else if (e < 3.2) { r *= .8; g *= .8; b *= .8; }
  const mo = cctFbm(x / 34, y / 34, s + 21, 3);
  if (mo > .58 && e < 9) { const a = cctClamp((mo - .58) * 5) * (1 - e / 9) * (.5 + sp * .7); r = cctMix(r, sk.moss[0] * (.7 + sp * .5), a); g = cctMix(g, sk.moss[1] * (.7 + sp * .5), a); b = cctMix(b, sk.moss[2] * (.7 + sp * .5), a); }
  const grime = cctFbm(x / 60, y / 60, s + 29, 2); k = .85 + grime * .25; out[0] = r * k; out[1] = g * k; out[2] = b * k;
}
function cctGrass(x, y, sk, s, out) {
  const big = cctFbm(x / 80, y / 80, s + 40, 3), mid = cctFbm(x / 15, y / 15, s + 41, 3), fine = cctNoise(x / 1.4, y / 1.4, s + 42), fine2 = cctNoise(x / .7, y / 2.1, s + 44);
  const t = cctClamp((big * .55 + mid * .45 - .3) * 2.2);
  let r = cctMix(sk.grass1[0], sk.grass2[0], t), g = cctMix(sk.grass1[1], sk.grass2[1], t), b = cctMix(sk.grass1[2], sk.grass2[2], t);
  const dry = cctFbm(x / 46, y / 46, s + 43, 2);
  if (dry > .6) { const a = cctClamp((dry - .6) * 3.2) * .7; r = cctMix(r, sk.dry[0], a); g = cctMix(g, sk.dry[1], a); b = cctMix(b, sk.dry[2], a); }
  const k = .78 + fine * .26 + fine2 * .14; out[0] = r * k; out[1] = g * k; out[2] = b * k;
}
function cctDirt(x, y, sk, s, out) {
  const n = cctFbm(x / 10, y / 10, s + 60, 3), sp = cctNoise(x / 1.1, y / 1.1, s + 61), k = .72 + n * .4 + (sp > .8 ? .22 : sp < .15 ? -.18 : 0);
  out[0] = sk.dirt[0] * k; out[1] = sk.dirt[1] * k; out[2] = sk.dirt[2] * k;
}

function cctPaintHalf(geo, side, skinId) {
  const sk = CC_SKINS[skinId] || CC_SKINS.default, R = CCT_RES, W = Math.round(geo.w * R), H = Math.round(geo.h * R), s = side === 'op' ? 101 : 202;
  const rune = side === 'op' ? CC_RUNE_OP : sk.rune;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const img = g.createImageData(W, H), d = img.data;
  const F = { ...geo.field, r: 14 }, O = { x: 0, y: 0, w: geo.w, h: geo.h, r: 22 };
  const plates = geo.slots.map(r => ({ x: r.x - 9, y: r.y - 9, w: r.w + 18, h: r.h + 18, r: 12 }));
  const traps = geo.traps.map(r => ({ x: r.x - 3, y: r.y - 2, w: r.w + 6, h: r.h + 4, r: 9 }));
  const lanes = [...new Set(geo.slots.map(r => Math.round(r.x + r.w / 2)))];
  const zone = new Uint8Array(W * H), dirtM = new Uint8Array(W * H), out = [0, 0, 0];
  for (let py = 0; py < H; py++) {
    const y = py / R;
    for (let px = 0; px < W; px++) {
      const x = px / R, i = py * W + px;
      let r, gg, b, k = 1;
      let pSd = 1e9, pl = null; for (const p of plates) { const v = cctSd(x, y, p); if (v < pSd) { pSd = v; pl = p; } }
      const sf = cctSd(x, y, F);
      if (pSd < 0) {                                   // raised carved stone plate
        zone[i] = 2;
        const n = cctFbm(x / 13, y / 13, s + 70, 3), sp = cctNoise(x / 1.3, y / 1.3, s + 71), vein = cctFbm(x / 40 + 9, y / 7, s + 72, 2);
        k = (.8 + n * .32) * (.92 + sp * .16) * (vein > .62 ? .9 : 1);
        if (pSd > -5) { const nx = cctSd(x + .6, y, pl) - pSd, ny = cctSd(x, y + .6, pl) - pSd; k *= 1 + (1 + pSd / 5) * cctFacing(nx, ny) * .55; }
        if (pSd > -12.5 && pSd < -10.5) k *= .58; else if (pSd >= -10.5 && pSd < -9.5) k *= 1.14;
        r = sk.plate[0] * k; gg = sk.plate[1] * k; b = sk.plate[2] * k;
      } else if (sf < 0) {                             // sunken grass field
        zone[i] = 1;
        cctGrass(x, y, sk, s, out); r = out[0]; gg = out[1]; b = out[2];
        const n = cctFbm(x / 22, y / 22, s + 50, 2);
        let da = pSd < 12 + n * 16 ? Math.pow(1 - pSd / (12 + n * 16), .7) * .95 : 0;
        for (const lx of lanes) { const hw = 30 + cctFbm(x / 26, y / 26, s + 51, 3) * 26, dx = Math.abs(x - lx); if (dx < hw) da = Math.max(da, Math.pow(1 - dx / hw, .6) * (.42 + n * .5)); }
        if (da > 0) { cctDirt(x, y, sk, s, out); r = cctMix(r, out[0], da); gg = cctMix(gg, out[1], da); b = cctMix(b, out[2], da); dirtM[i] = da * 255; }
        let sh = 1e9; for (const p of plates) sh = Math.min(sh, cctSd(x - 6, y - 7, p));
        if (sh < 4) k *= 1 - cctClamp((4 - sh) / 9) * .5;
        if (sf > -14) { const f = 1 + sf / 14, nx = cctSd(x + .6, y, F) - sf, ny = cctSd(x, y + .6, F) - sf, fa = cctFacing(nx, ny); k *= fa > 0 ? 1 - f * f * (.6 * fa + .1) : 1 + f * f * .14 * -fa; }
        r *= k; gg *= k; b *= k; k = 1;
      } else {
        let tSd = 1e9, tr = null; for (const t of traps) { const v = cctSd(x, y, t); if (v < tSd) { tSd = v; tr = t; } }
        cctStone(x, y, sk, s, out); r = out[0]; gg = out[1]; b = out[2];
        if (tSd < 0) {                                 // sunken trap recess
          zone[i] = 3; k = .38;
          if (tSd > -8) { const f = 1 + tSd / 8, nx = cctSd(x + .6, y, tr) - tSd, ny = cctSd(x, y + .6, tr) - tSd, fa = cctFacing(nx, ny); k *= fa > 0 ? 1 - f * .55 * fa : 1 + f * .5 * -fa; }
        } else if (tSd < 2.5) k = .45;
        if (sf < 3) k *= .42 + sf * .1;                 // dark curb around the field
        const so = cctSd(x, y, O);
        if (so > -7) { const f = 1 + so / 7, nx = cctSd(x + .6, y, O) - so, ny = cctSd(x, y + .6, O) - so; k *= 1 + f * cctFacing(nx, ny) * .55; }
      }
      k *= 1.07 - x / geo.w * .1 - y / geo.h * .05;
      const o = i * 4; d[o] = r * k; d[o + 1] = gg * k; d[o + 2] = b * k; d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const rnd = seeded('cct-half-' + side), Z = (x, y) => zone[Math.floor(y * R) * W + Math.floor(x * R)], DM = (x, y) => dirtM[Math.floor(y * R) * W + Math.floor(x * R)] / 255;
  g.save(); g.scale(R, R); g.lineCap = 'round';
  // grass tufts
  const nT = Math.round(F.w * F.h / 34);
  for (let t = 0; t < nT; t++) {
    const x = F.x + 6 + rnd() * (F.w - 12), y = F.y + 6 + rnd() * (F.h - 12);
    if (Z(x, y) !== 1 || DM(x, y) > .4) continue;
    const L = 30 + rnd() * 30, hue = 82 + rnd() * 34, n = 2 + Math.floor(rnd() * 3), len = 1.8 + rnd() * 3.2;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (rnd() - .5) * 2.4;
      g.strokeStyle = `hsla(${hue},${44 + rnd() * 20}%,${rnd() < .5 ? L * .55 : L}%,${.45 + rnd() * .4})`; g.lineWidth = .55 + rnd() * .45;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * len * .5 + .6, y + Math.sin(a) * len * .5, x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
    }
  }
  // flowers and clover
  for (let t = 0; t < 70; t++) {
    const x = F.x + rnd() * F.w, y = F.y + rnd() * F.h; if (Z(x, y) !== 1 || DM(x, y) > .2) continue;
    if (rnd() < .5) { const c = ['#fff6d8', '#ffe27a', '#f4c2ff', '#ffffff'][Math.floor(rnd() * 4)]; for (let k = 0; k < 4; k++) { g.fillStyle = c; g.beginPath(); g.arc(x + Math.cos(k * 1.57) * 1.1, y + Math.sin(k * 1.57) * 1.1, .9, 0, 7); g.fill(); } g.fillStyle = '#e0a020'; g.beginPath(); g.arc(x, y, .6, 0, 7); g.fill(); }
    else { g.fillStyle = 'rgba(70,130,40,.8)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + Math.cos(k * 2.09) * 1.4, y + Math.sin(k * 2.09) * 1.4, 1.3, 0, 7); g.fill(); } }
  }
  // pebbles in the dirt
  for (let t = 0; t < 900; t++) {
    const x = F.x + rnd() * F.w, y = F.y + rnd() * F.h; if (Z(x, y) !== 1 || DM(x, y) < .45) continue;
    const r = .6 + rnd() * 1.9, c = 120 + rnd() * 70;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + .5, y + .6, r, r * .75, 0, 0, 7); g.fill();
    g.fillStyle = `rgb(${c},${c * .93},${c * .82})`; g.beginPath(); g.ellipse(x, y, r, r * .75, rnd() * 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .35, 0, 7); g.fill();
  }
  // cracks in the wall
  for (let t = 0; t < 40; t++) {
    let x = rnd() * geo.w, y = rnd() * geo.h; if (Z(x, y) !== 0) continue;
    const pts = [[x, y]]; let a = rnd() * 6.28;
    for (let k = 0; k < 4 + rnd() * 4; k++) { a += (rnd() - .5) * 1.4; x += Math.cos(a) * (3 + rnd() * 6); y += Math.sin(a) * (3 + rnd() * 6); pts.push([x, y]); }
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = .7; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px + .7, py + .7) : g.moveTo(px + .7, py + .7)); g.stroke();
    g.strokeStyle = 'rgba(20,14,8,.55)'; g.lineWidth = .8; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke();
  }
  // engraved rune circle on every slot plate
  const [rr, rg, rb] = rune;
  for (const p of plates) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, R0 = Math.min(p.w, p.h) * .26;
    const ring = (off, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx + off, cy + off, R0, 0, 7); g.stroke(); g.beginPath(); g.arc(cx + off, cy + off, R0 * .72, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(cx + off, cy - R0 * .62 + off); g.lineTo(cx + R0 * .62 + off, cy + off); g.lineTo(cx + off, cy + R0 * .62 + off); g.lineTo(cx - R0 * .62 + off, cy + off); g.closePath(); g.stroke();
      for (let k = 0; k < 8; k++) { const a = k * .785; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0 * 1.06 + off, cy + Math.sin(a) * R0 * 1.06 + off); g.lineTo(cx + Math.cos(a) * R0 * 1.22 + off, cy + Math.sin(a) * R0 * 1.22 + off); g.stroke(); } };
    ring(.8, 'rgba(255,255,255,.16)', 1.3); ring(0, 'rgba(20,18,16,.42)', 1.4);
    const gl = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.3); gl.addColorStop(0, `rgba(${rr},${rg},${rb},.16)`); gl.addColorStop(1, `rgba(${rr},${rg},${rb},0)`); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R0 * 1.3, 0, 7); g.fill();
    // worn corners
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(p.x + rnd() * p.w, p.y + rnd() * p.h, .5 + rnd() * 1.4, 0, 7); g.fill(); }
  }
  // glowing rune in every trap recess
  for (const t of traps) {
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    g.save(); g.shadowColor = `rgba(${rr},${rg},${rb},.9)`; g.shadowBlur = 8; g.strokeStyle = `rgba(${rr},${rg},${rb},.75)`; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(cx, cy - 10); g.lineTo(cx + 10, cy); g.lineTo(cx, cy + 10); g.lineTo(cx - 10, cy); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx - 13, cy); g.moveTo(cx + 13, cy); g.lineTo(cx + 22, cy); g.moveTo(cx, cy - 5); g.lineTo(cx, cy + 5); g.stroke(); g.restore();
  }
  // warm brazier light on the outer corners, cool shade toward the battle line, soft vignette
  const cy0 = side === 'op' ? 0 : geo.h;
  g.globalCompositeOperation = 'overlay';
  for (const cx of [0, geo.w]) { const gr = g.createRadialGradient(cx, cy0, 0, cx, cy0, 260); gr.addColorStop(0, 'rgba(255,170,70,.55)'); gr.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = gr; g.fillRect(0, 0, geo.w, geo.h); }
  g.globalCompositeOperation = 'source-over';
  for (const cx of [0, geo.w]) { const gr = g.createRadialGradient(cx, cy0, 0, cx, cy0, 120); gr.addColorStop(0, 'rgba(255,190,110,.18)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 0, geo.w, geo.h); }
  const vg = g.createRadialGradient(geo.w / 2, geo.h / 2, geo.h * .4, geo.w / 2, geo.h / 2, geo.w * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = vg; g.fillRect(0, 0, geo.w, geo.h);
  g.restore();
  return cv;
}

function cctPaintLine(w, h) {
  const R = CCT_RES, W = Math.round(w * R), H = Math.round(h * R), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data, out = [0, 0, 0], sk = { ...CC_SKINS.default, stone: [92, 86, 74], moss: [60, 80, 40] };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const x = px / R, y = py / R, o = (py * W + px) * 4; let r, gg, b;
    const band = y < 6 || y > h - 6;
    if (band) {                                        // brushed bronze trim
      const yy = y < 6 ? y : h - y, brush = cctNoise(x / 60, yy * 2.2, 81) * .5 + cctNoise(x / 4, yy * 6, 82) * .25 + cctNoise(x / 1.2, yy * 9, 83) * .12;
      let k = .62 + brush * .55; if (yy < 1.4) k *= 1.35; if (yy > 4.6) k *= .62;
      r = 196 * k; gg = 146 * k; b = 72 * k;
    } else {
      cctStone(x, y, sk, 91, out, 14, 1.6); r = out[0]; gg = out[1]; b = out[2];
      const c = Math.abs(y - h / 2); if (c < 6.5) { const k = c < 5 ? .35 : .55; r *= k; gg *= k; b *= k; }
    }
    d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); g.save(); g.scale(R, R);
  for (let x = 30; x < w - 20; x += 62) for (const y of [3, h - 3]) {
    const gr = g.createRadialGradient(x - .6, y - .6, .2, x, y, 2.2); gr.addColorStop(0, '#fff2c0'); gr.addColorStop(.5, '#c8963c'); gr.addColorStop(1, '#4a3212'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 2.1, 0, 7); g.fill();
  }
  g.restore();
  return cv;
}

/* small repeating tiles for the UI chrome (hero plaques, AP pills, panels, buttons) */
let cctTileCache = null;
function cctTiles() {
  if (cctTileCache) return cctTileCache;
  const N = 192, a = document.createElement('canvas'); a.width = a.height = N; const g = a.getContext('2d'), img = g.createImageData(N, N), d = img.data;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    cctVor(x, y, 32, 401, N / 32); const e = CCV.d2 - CCV.d1, v = .78 + cctHash(CCV.id, 3, 401) * .3;
    const gr = cctFbm(x / 12, y / 12, 402, 3, N / 12), sp = cctNoise(x / 1.5, y / 1.5, 403, N / 1.5);
    let k = v * (.7 + gr * .5) * (.9 + sp * .2); k *= 1 + Math.max(0, 1 - e / 6) * cctFacing(x - CCV.sx, y - CCV.sy) * .45; if (e < 2) k = .32 + sp * .12;
    const o = (y * N + x) * 4; d[o] = 92 * k; d[o + 1] = 84 * k; d[o + 2] = 70 * k; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const b = document.createElement('canvas'); b.width = 256; b.height = 64; const h = b.getContext('2d'), im2 = h.createImageData(256, 64), d2 = im2.data;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 256; x++) {
    const br = cctNoise(x / 64, y * .9, 404, 4) * .5 + cctNoise(x / 8, y * 2.5, 405, 32) * .3 + cctNoise(x / 2, y * 4, 406, 128) * .2, k = .62 + br * .55;
    const o = (y * 256 + x) * 4; d2[o] = 200 * k; d2[o + 1] = 150 * k; d2[o + 2] = 76 * k; d2[o + 3] = 255;
  }
  h.putImageData(im2, 0, 0);
  return cctTileCache = { stone: a.toDataURL('image/png'), bronze: b.toDataURL('image/png') };
}

/* the forest around the arena */
let ccEnvCache = null;
function ccEnvImage() {
  if (ccEnvCache) return ccEnvCache;
  const W = 1600, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = seeded('cc-world2');
  const img = g.createImageData(W, H), d = img.data;
  const rivers = [[148, .7], [1456, 2.3]], rcx = (x0, ph, y) => x0 + Math.sin(y / 130 + ph) * 34 + Math.sin(y / 47 + ph * 2) * 8;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (x > 300 && x < 1300 && y > 30 && y < 770) { d[o] = 20; d[o + 1] = 26; d[o + 2] = 16; d[o + 3] = 255; continue; }   // under the arena
    const m = cctFbm(x / 90, y / 90, 501, 3), lit = cctFbm(x / 22, y / 22, 502, 3), f = cctNoise(x / 1.6, y / 1.6, 503), lf = cctFbm(x / 7, y / 7, 504, 2);
    let r = cctMix(30, 62, m), gg = cctMix(46, 88, m), b = cctMix(22, 36, m);
    if (lit > .58) { const a = cctClamp((lit - .58) * 3) * .8; r = cctMix(r, 98 * (.7 + lf * .5), a); gg = cctMix(gg, 74 * (.7 + lf * .5), a); b = cctMix(b, 38, a); }
    let k = .78 + f * .3;
    for (const [x0, ph] of rivers) {
      const dx = Math.abs(x - rcx(x0, ph, y)), w = 46 + cctNoise(x / 40, y / 40, 505) * 10;
      if (dx < w) {
        const t = dx / w, dep = 1 - t * t;
        r = cctMix(58, 14, dep); gg = cctMix(132, 62, dep); b = cctMix(132, 90, dep);
        const ca = Math.abs(cctNoise(x / 9, y / 4.5, 506) - cctNoise(x / 11 + 3, y / 5.5, 507));
        if (ca < .05) { const a = (1 - ca / .05) * .55; r = cctMix(r, 210, a); gg = cctMix(gg, 245, a); b = cctMix(b, 250, a); }
        k = .86 + cctNoise(x / 3, y / 1.5, 508) * .2; if (t > .86) k *= .8;
      } else if (dx < w + 16) {
        const t = (dx - w) / 16, sp = cctNoise(x / 1.3, y / 1.3, 509);
        r = cctMix(78, 104, t); gg = cctMix(66, 88, t); b = cctMix(46, 56, t); k = .8 + sp * .35;
      }
    }
    d[o] = r * k; d[o + 1] = gg * k; d[o + 2] = b * k; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // rocks along the banks
  const rock = (x, y, r) => {
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x + r * .35, y + r * .45, r * 1.05, r * .8, 0, 0, 7); g.fill();
    const rg = g.createRadialGradient(x - r * .45, y - r * .45, r * .1, x, y, r * 1.1); rg.addColorStop(0, '#d8d2bd'); rg.addColorStop(.55, '#8a8573'); rg.addColorStop(1, '#3e3b32'); g.fillStyle = rg;
    g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, rr = r * (.82 + R() * .3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .78); } g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(x + (R() - .5) * r, y + (R() - .5) * r * .7, R() * 1.2 + .4, 0, 7); g.fill(); }
    if (R() < .5) { g.fillStyle = 'rgba(80,120,40,.6)'; g.beginPath(); g.ellipse(x - r * .2, y - r * .35, r * .45, r * .22, -.3, 0, 7); g.fill(); }
  };
  for (const [x0, ph] of rivers) for (let k = 0; k < 34; k++) { const y = R() * H, side = R() < .5 ? -1 : 1; rock(rcx(x0, ph, y) + side * (54 + R() * 12), y, 5 + R() * 9); }
  for (let k = 0; k < 18; k++) { const [x0, ph] = rivers[k % 2], y = R() * H; rock(rcx(x0, ph, y) + (R() - .5) * 50, y, 3 + R() * 5); }
  // water sparkles
  for (const [x0, ph] of rivers) for (let k = 0; k < 70; k++) { const y = R() * H, x = rcx(x0, ph, y) + (R() - .5) * 70; g.fillStyle = `rgba(255,255,255,${.25 + R() * .5})`; g.fillRect(x, y, 1 + R() * 2, 1); }
  // ferns
  const fern = (x, y, s) => {
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * 6.283 + R(), len = s * (.7 + R() * .5), hue = 95 + R() * 25;
      g.strokeStyle = `hsla(${hue},45%,${22 + R() * 14}%,.9)`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; g.quadraticCurveTo(x + Math.cos(a + .3) * len * .6, y + Math.sin(a + .3) * len * .6, ex, ey); g.stroke();
      for (let t = .2; t < 1; t += .12) { const px = x + (ex - x) * t, py = y + (ey - y) * t, l = (1 - t) * s * .28; g.strokeStyle = `hsla(${hue},50%,${26 + R() * 18}%,.85)`; g.lineWidth = .9; for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a + sgn * 1.1) * l, py + Math.sin(a + sgn * 1.1) * l); g.stroke(); } }
    }
  };
  for (let k = 0; k < 60; k++) { const x = R() < .5 ? R() * 290 : 1310 + R() * 290; fern(x, R() * H, 10 + R() * 12); }
  // leaf texture used to fill the tree canopies
  const LP = document.createElement('canvas'); LP.width = LP.height = 128; const lg = LP.getContext('2d'); lg.fillStyle = '#1f4a18'; lg.fillRect(0, 0, 128, 128);
  for (let k = 0; k < 1300; k++) {
    const x = R() * 128, y = R() * 128, s = 2 + R() * 4.5, a = R() * 6.283, col = `hsl(${88 + R() * 36},${40 + R() * 30}%,${14 + R() * 30}%)`;
    for (const ox of [-128, 0, 128]) for (const oy of [-128, 0, 128]) { if (Math.abs(x + ox - 64) > 72 || Math.abs(y + oy - 64) > 72) continue; lg.fillStyle = col; lg.beginPath(); lg.ellipse(x + ox, y + oy, s, s * .45, a, 0, 7); lg.fill(); }
  }
  const leafPat = g.createPattern(LP, 'repeat');
  const tree = (x, y, r) => {
    const sh = g.createRadialGradient(x + r * .45, y + r * .55, r * .2, x + r * .45, y + r * .55, r * 1.25); sh.addColorStop(0, 'rgba(0,8,0,.55)'); sh.addColorStop(1, 'rgba(0,8,0,0)'); g.fillStyle = sh; g.beginPath(); g.arc(x + r * .45, y + r * .55, r * 1.25, 0, 7); g.fill();
    const cl = []; const n = 8 + Math.floor(R() * 6);
    for (let k = 0; k < n; k++) { const a = R() * 6.283, dd = r * (.2 + R() * .5); cl.push([x + Math.cos(a) * dd, y + Math.sin(a) * dd, r * (.36 + R() * .26)]); }
    cl.push([x - r * .12, y - r * .14, r * .5]);
    cl.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]));
    for (const [cx, cy, rr] of cl) {
      g.save(); g.fillStyle = leafPat; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill(); g.restore();
      const sg = g.createRadialGradient(cx - rr * .45, cy - rr * .5, rr * .05, cx, cy, rr); sg.addColorStop(0, 'rgba(255,250,190,.32)'); sg.addColorStop(.45, 'rgba(120,170,60,.05)'); sg.addColorStop(1, 'rgba(0,18,0,.62)'); g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, rr, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(230,255,170,.16)'; for (let k = 0; k < 10; k++) { g.beginPath(); g.arc(x - r * .4 + R() * r * .5, y - r * .45 + R() * r * .4, 1 + R() * 2, 0, 7); g.fill(); }
  };
  const spots = [];
  for (let i = 0; i < 80; i++) { const sd = R(); spots.push(sd < .4 ? [R() * 260, R() * H] : sd < .8 ? [1340 + R() * 260, R() * H] : [260 + R() * 1080, R() < .5 ? -14 + R() * 26 : 884 + R() * 26]); }
  spots.sort((a, b) => a[1] - b[1]).forEach(([x, y]) => tree(x, y, 34 + R() * 44));
  // light shafts and atmosphere
  g.globalCompositeOperation = 'screen';
  for (let k = 0; k < 5; k++) { const x = R() * W, w = 60 + R() * 120, gr = g.createLinearGradient(x, 0, x + 380, H); gr.addColorStop(0, 'rgba(255,240,190,.09)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 420, H); g.lineTo(x + 420, H); g.closePath(); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  const lgr = g.createLinearGradient(0, 0, W, H); lgr.addColorStop(0, 'rgba(255,225,150,.1)'); lgr.addColorStop(.5, 'rgba(0,0,0,0)'); lgr.addColorStop(1, 'rgba(0,0,30,.3)'); g.fillStyle = lgr; g.fillRect(0, 0, W, H);
  const vg = g.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, W * .65); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return ccEnvCache = c;
}

/* textures: measured from the real DOM once (ccArtGeo), painted during the match loading screen (ccArtLoad), cached as decoded
   JPEG blob URLs for the session (ccTex) and switched on with the .ccm.tex class; every render re-applies them (ccArtEnsure) */
let ccTex = null;
function ccArtVars(el) { const t = cctTiles(); el.style.setProperty('--tx-stone', `url(${t.stone})`); el.style.setProperty('--tx-bronze', `url(${t.bronze})`); }
function ccArtEnsure() { if (!ccM) return; ccArtVars(ccM.el); if (ccTex) ccArtApply(ccM.el); }
function ccArtGeo(el) {
  const stage = el.querySelector('.ccm-stage'), s = stage.getBoundingClientRect().width / 1600 || 1;
  const rel = (n, base) => { const a = n.getBoundingClientRect(), b = base.getBoundingClientRect(); return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s }; };
  const geo = {};
  for (const side of ['op', 'me']) {
    const h = el.querySelector(`.cc-half.${side}`); if (!h) return null;
    geo[side] = { ...rel(h, h), slots: [...h.querySelectorAll('.cc-slot')].map(n => rel(n, h)), traps: [...h.querySelectorAll('.cc-trap')].map(n => rel(n, h)), field: rel(h.querySelector('.cc-field'), h) };
  }
  const line = el.querySelector('.ccb-line'); if (!line) return null;
  geo.line = rel(line, line);
  return geo;
}
const cctTick = () => new Promise(r => setTimeout(r, 16));
async function ccArtLoad(set = () => {}, from = .5, to = .95) {
  if (!ccM) return;
  const el = ccM.el; ccArtVars(el);
  if (!ccTex) {
    const geo = ccArtGeo(el); if (!geo) return;
    const span = to - from, canv = {};
    canv.op = cctPaintHalf(geo.op, 'op', 'default'); set(from + span * .38); await cctTick();
    canv.me = cctPaintHalf(geo.me, 'me', 'default'); set(from + span * .76); await cctTick();
    canv.line = cctPaintLine(geo.line.w, geo.line.h); set(from + span * .84); await cctTick();
    const urls = {};
    await Promise.all(Object.keys(canv).map(k => new Promise(res => canv[k].toBlob(b => { urls[k] = b ? URL.createObjectURL(b) : canv[k].toDataURL('image/jpeg', .9); res(); }, 'image/jpeg', .9))));
    set(from + span * .92);
    await Promise.all(Object.values(urls).map(u => { const im = new Image(); im.src = u; return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); }));
    ccTex = urls;
  }
  set(to);
  if (ccM && ccM.el === el) ccArtApply(el);
}
function ccArtApply(el) {
  el.style.setProperty('--cc-tex-op', `url(${ccTex.op})`); el.style.setProperty('--cc-tex-me', `url(${ccTex.me})`); el.style.setProperty('--cc-tex-line', `url(${ccTex.line})`);
  el.classList.add('tex');
}
/* warm the forest and tiles up while the player is on the Deck screen */
function ccArtPrewarm() { setTimeout(() => { try { ccEnvImage(); cctTiles(); } catch (e) { /* drawn on demand instead */ } }, 300); }
