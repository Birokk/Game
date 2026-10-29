/* =========================================================
   WORLD — 2.5D isometric plaza: a lantern-festival town at night
   Two ground levels: the tea terrace is one level up and is reached by stairs.
   ========================================================= */
const canvas = $('#world'), ctx = canvas.getContext('2d');
const N = 28, TW = 64, TH = 32, LV = 20;   // LV: screen px per terrace level
const T = { STONE: 0, SLAB: 1, LANE: 2, GRASS: 3, WATER: 4, TERRACE: 5 };
const tiles = new Uint8Array(N * N), blocked = new Uint8Array(N * N), hgt = new Uint8Array(N * N), stairs = new Uint8Array(N * N);
const idx = (x, y) => y * N + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const iso = (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 });
const isoZ = (x, y, v) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 - v });
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(7);
const objects = [], groundDeco = [], carpets = [], lights = [], strings = [];

/* height in levels at a point; stairs (1: down toward +x, 2: down toward +y) ramp between the levels */
function heightAt(x, y) {
  const tx = Math.floor(x), ty = Math.floor(y);
  if (!inMap(tx, ty)) return 0;
  const s = stairs[idx(tx, ty)];
  if (s === 1) return clamp(1 - (x - tx), 0, 1);
  if (s === 2) return clamp(1 - (y - ty), 0, 1);
  return hgt[idx(tx, ty)];
}
function block(x, y) { if (inMap(x, y)) blocked[idx(x, y)] = 1; }
function put(kind, x, y, o = {}) {
  const ob = { kind, x: x + .5, y: y + .5, z: hgt[idx(x, y)], depth: x + y + 1, ...o };
  if (!o.walk) block(x, y);
  objects.push(ob); return ob;
}
/* multi-tile props are sorted against characters by their front corners */
function putBig(kind, x, y, w, d, o = {}) {
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) block(i, j);
  const ob = { kind, x, y, w, d, z: hgt[idx(x, y)], depth: Math.min(x + y + d, x + w + y) - .5, ...o };
  objects.push(ob); return ob;
}
function addBuilding(x, y, w, d, h, o = {}) {
  const b = putBig('building', x, y, w, d, { h, ...o });
  for (let i = 0; i < w; i++) lights.push({ x: x + i + .5, y: y + d + .5, z: b.z, r: 54, a: .2 });
  for (let j = 0; j < d; j++) lights.push({ x: x + w + .5, y: y + j + .5, z: b.z, r: 54, a: .16 });
}
function addLamp(x, y) { put('lamp', x, y); lights.push({ x: x + .7, y: y + .3, z: hgt[idx(x, y)], r: 110, a: .3 }); }
function addRail(x, y, side) { objects.push({ kind: 'rail', x, y, side, z: hgt[idx(x, y)], depth: x + y + 1.5 }); }
function addString(ax, ay, ah, bx, by, bh, n) {
  strings.push({ ax, ay, ah, bx, by, bh, n });
  for (let i = 1; i <= n; i++) { const f = i / (n + 1), x = ax + (bx - ax) * f, y = ay + (by - ay) * f; lights.push({ x, y, z: heightAt(x, y), r: 44, a: .1 }); }
}
function addMaple(x, y) {
  if (!inMap(x, y) || blocked[idx(x, y)] || stairs[idx(x, y)]) return false;
  if (objects.some(o => o.kind === 'maple' && Math.hypot(o.x - x - .5, o.y - y - .5) < 2.2)) return false;
  put('maple', x, y, { v: rnd() }); return true;
}

function buildMap() {
  // tea terrace in the back-left corner, one level up, stairs on its east and south sides
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) { hgt[idx(x, y)] = 1; tiles[idx(x, y)] = T.TERRACE; }
  stairs[idx(10, 5)] = stairs[idx(10, 6)] = 1;
  stairs[idx(5, 10)] = stairs[idx(6, 10)] = 2;
  // paving: big slabs on the square, cobbled lanes, a grassy maple garden with a pond
  for (let y = 10; y <= 18; y++) for (let x = 10; x <= 18; x++) tiles[idx(x, y)] = T.SLAB;
  for (let i = 19; i < N - 1; i++) for (let k = 13; k <= 15; k++) { tiles[idx(i, k)] = T.LANE; tiles[idx(k, i)] = T.LANE; }
  for (let y = 11; y < N - 1; y++) for (let x = 1; x <= 9; x++) tiles[idx(x, y)] = T.GRASS;
  for (let x = 1; x <= 9; x++) tiles[idx(x, 13)] = tiles[idx(x, 14)] = T.LANE;
  for (let y = 19; y <= 22; y++) for (let x = 4; x <= 7; x++) { tiles[idx(x, y)] = T.WATER; block(x, y); }
  // town wall behind, low balustrade in front
  for (let i = 0; i < N; i++) {
    put('wall', i, 0); if (i) put('wall', 0, i, { win: i % 3 === 1 });
    if (i) { put('lowwall', i, N - 1, { lamp: i % 4 === 2 }); if (i < N - 1) put('lowwall', N - 1, i, { lamp: i % 4 === 2 }); }
  }
  // houses
  addBuilding(1, 1, 6, 2, 50, { roof: '#3b3850', door: 3 });          // tea house, up on the terrace
  addBuilding(11, 1, 5, 2, 58, { roof: '#3a3a52', wall: '#ead6b0' });
  addBuilding(16, 1, 4, 2, 72, { roof: '#45394f', wall: '#e2c9a4', door: 2 });
  addBuilding(20, 1, 7, 2, 54, { roof: '#363a50', wall: '#ecdcbc', door: 3 });
  addBuilding(1, 16, 2, 6, 52, { roof: '#3d3650', wall: '#e8d2ae' });
  // terrace: railings, red carpet, game table, flowers, lamps
  for (let k = 1; k < 10; k++) if (k !== 5 && k !== 6) { addRail(9, k, 'R'); addRail(k, 9, 'L'); }
  carpets.push({ x0: 2.3, y0: 4.3, x1: 8.7, y1: 8.7, z: 1 });
  put('table', 5, 6);
  addLamp(9, 3); addLamp(3, 9);
  put('pot', 1, 4); put('pot', 1, 8); put('boxes', 7, 1); addMaple(8, 1);
  // lantern square
  putBig('crate', 13, 13, 2, 2);
  lights.push({ x: 14, y: 14, z: 0, r: 170, a: .3 });
  [[11, 11], [17, 11], [11, 17], [17, 17]].forEach(([x, y]) => addLamp(x, y));
  addString(11.5, 11.5, 66, 17.5, 11.5, 66, 6); addString(11.5, 17.5, 66, 17.5, 17.5, 66, 6);
  addString(11.5, 11.5, 66, 11.5, 17.5, 66, 6); addString(17.5, 11.5, 66, 17.5, 17.5, 66, 6);
  [[10, 10], [18, 10], [10, 18], [18, 18]].forEach(([x, y]) => put('pot', x, y));
  put('crackers', 12, 15); put('crackers', 16, 12);
  carpets.push({ x0: 13.15, y0: 15.15, x1: 14.85, y1: N - 1 });
  // night market
  const GOODS = ['#ffd36b', '#ff6f91', '#7ef3d4', '#c58bff', '#ff9f43', '#9be7ff', '#ffffff'];
  [12, 16, 20, 24].forEach(x => {
    putBig('stall', x, 5, 2, 1, { goods: Array.from({ length: 7 }, (_, k) => ({ u: (k % 4 + .5) / 4, v: k < 4 ? .3 : .7, c: GOODS[Math.floor(rnd() * GOODS.length)], k: Math.floor(rnd() * 3) })) });
    lights.push({ x: x + 1, y: 6.4, z: 0, r: 64, a: .22 });
  });
  addLamp(14, 8); addLamp(22, 8);
  addString(13.5, 3.4, 58, 14.5, 8.5, 66, 4); addString(18, 3.4, 72, 14.5, 8.5, 66, 4);
  addString(18, 3.4, 72, 22.5, 8.5, 66, 4); addString(23.5, 3.4, 54, 22.5, 8.5, 66, 4);
  put('boxes', 11, 8); put('boxes', 26, 7); put('pot', 19, 8); put('pot', 26, 4);
  // firework stage
  putBig('drum', 23, 23, 2, 2);
  carpets.push({ x0: 20.2, y0: 20.2, x1: 26.8, y1: 26.8 });
  addLamp(20, 20); addLamp(26, 20); addLamp(20, 26);
  addString(20.5, 20.5, 66, 26.5, 20.5, 66, 6); addString(20.5, 20.5, 66, 20.5, 26.5, 66, 6);
  put('crackers', 26, 26); put('crackers', 22, 22); put('pot', 26, 23); put('pot', 23, 26);
  // east lane and south lane
  put('bench', 22, 11, { side: 0 }); put('bench', 22, 17, { side: 0 }); put('pot', 24, 11); put('pot', 24, 17);
  put('bench', 11, 22, { side: 1 }); put('bench', 17, 22, { side: 1 });
  [[11, 20], [17, 20], [11, 25], [17, 25]].forEach(([x, y]) => { put('toro', x, y); lights.push({ x: x + .5, y: y + .5, z: 0, r: 60, a: .24 }); });
  [[26, 11], [26, 17], [19, 23], [10, 24], [18, 24], [20, 11]].forEach(([x, y]) => addMaple(x, y));
  // maple garden
  [[3, 16], [8, 18], [8, 24], [2, 11]].forEach(([x, y]) => { put('toro', x, y); lights.push({ x: x + .5, y: y + .5, z: 0, r: 60, a: .24 }); });
  put('bench', 5, 24, { side: 1 }); put('bench', 3, 24, { side: 1 });
  [[4.8, 19.8, 0], [6.6, 20.7, 2], [5.2, 22, 4]].forEach(([x, y, s]) => objects.push({ kind: 'floatl', x, y, s, z: 0, depth: x + y }));
  lights.push({ x: 5.9, y: 21, z: 0, r: 80, a: .2 });
  for (let k = 0, n = 0; k < 200 && n < 9; k++) {
    const x = 1 + Math.floor(rnd() * 9), y = 11 + Math.floor(rnd() * 16);
    if (tiles[idx(x, y)] === T.GRASS && !(y === 11 && (x === 5 || x === 6)) && addMaple(x, y)) n++;
  }
  // fallen leaves everywhere, confetti on the square
  for (let k = 0; k < 520; k++) {
    const x = 1 + rnd() * (N - 2), y = 1 + rnd() * (N - 2), t = tiles[idx(Math.floor(x), Math.floor(y))];
    if (t === T.WATER || (t !== T.GRASS && rnd() < .5)) continue;
    groundDeco.push({ kind: 'leaf', x, y, c: ['#e8642a', '#ff8a3a', '#c8461b', '#ffb055'][Math.floor(rnd() * 4)], r: rnd() * Math.PI, s: 1.6 + rnd() * 1.6 });
  }
  for (let k = 0; k < 160; k++) groundDeco.push({ kind: 'confetti', x: 10.3 + rnd() * 8.4, y: 10.3 + rnd() * 8.4, c: ['#ff4a5a', '#ffd36b', '#ff9ec4', '#fff1b0'][Math.floor(rnd() * 4)], r: rnd() * Math.PI, s: 1.4 });
}
buildMap();

/* shared glow sprites and the paper-lantern sprite */
function makeGlow(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, `rgba(${rgb},.9)`); rg.addColorStop(.35, `rgba(${rgb},.32)`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64); return c;
}
const GLOW = makeGlow('255,180,100'), GLOW_P = makeGlow('190,150,255');
function glow(c, x, y, r, a, spr = GLOW) {
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.max(0, a);
  c.drawImage(spr, x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}
const lanternSprite = (() => {
  const c = document.createElement('canvas'); c.width = 48; c.height = 72; const g = c.getContext('2d'); g.translate(24, 30); const r = 14;
  const b = g.createRadialGradient(-r * .35, -r * .3, r * .1, 0, 0, r * 1.25);
  b.addColorStop(0, '#ffc07a'); b.addColorStop(.45, '#f2462f'); b.addColorStop(1, '#9e141c');
  g.fillStyle = b; g.beginPath(); g.ellipse(0, 0, r, r * 1.1, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(110,10,20,.5)'; g.lineWidth = 1.2;
  [.35, .75].forEach(k => { g.beginPath(); g.ellipse(0, 0, r * k, r * 1.08, 0, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = '#e9b44c'; rr(g, -r * .55, -r * 1.32, r * 1.1, r * .34, 2); g.fill(); rr(g, -r * .55, r, r * 1.1, r * .34, 2); g.fill();
  g.strokeStyle = '#e9b44c'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, r * 1.3); g.lineTo(0, r * 2.2); g.stroke();
  return c;
})();
function drawLantern(c, x, y, r, t) {
  glow(c, x, y, r * 4.2, .5 + Math.sin(t * 3 + x * .37) * .1);
  const k = r / 14; c.drawImage(lanternSprite, x - 24 * k, y - 30 * k, 48 * k, 72 * k);
}

/* ground layer (tiles, terrace walls, stairs, carpets, leaves, baked lamp light), pre-rendered once */
function drawBox(c, x, y, w, d, h, top, left, right, base = 0) {
  const A = iso(x, y), B = iso(x + w, y), C = iso(x + w, y + d), D = iso(x, y + d), u = (p, k) => ({ x: p.x, y: p.y - k });
  if (left) { c.fillStyle = left; poly(c, [u(D, base), u(C, base), u(C, base + h), u(D, base + h)]); }
  if (right) { c.fillStyle = right; poly(c, [u(C, base), u(B, base), u(B, base + h), u(C, base + h)]); }
  if (top) { c.fillStyle = top; poly(c, [u(A, base + h), u(B, base + h), u(C, base + h), u(D, base + h)]); }
}
const GS = 2, OX = N * TW / 2, OY = LV + 8, EDGE = 34;
const ground = document.createElement('canvas');
ground.width = N * TW * GS; ground.height = (N * TH + OY + EDGE + 6) * GS;
const TILE_COL = {
  [T.STONE]: ['#a69380', '#a08d7a'], [T.SLAB]: ['#bba890', '#b3a088'], [T.LANE]: ['#8b7a6b', '#857465'],
  [T.GRASS]: ['#5d7a3f', '#58743b'], [T.WATER]: ['#1f3956', '#1f3956'], [T.TERRACE]: ['#b9a68c', '#b2a085']
};
function strokePath(g, pts, close = true) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); if (close) g.closePath(); g.stroke(); }
function paintTile(g, x, y) {
  const i = idx(x, y), t = tiles[i], h = hgt[i] * LV, st = stairs[i], P = (a, b) => isoZ(a, b, h);
  if (st) {
    for (let k = 0; k < 4; k++) {
      const v = (1 - k / 4) * LV;
      if (st === 1) drawBox(g, x + k / 4, y, .25, 1, v, '#cdbb9b', '#9d8a73', '#8c7a65');
      else drawBox(g, x, y + k / 4, 1, .25, v, '#cdbb9b', '#9d8a73', '#8c7a65');
    }
    return;
  }
  if (h) {
    const lowR = x + 1 >= N || hgt[idx(x + 1, y)] < hgt[i], lowL = y + 1 >= N || hgt[idx(x, y + 1)] < hgt[i];
    drawBox(g, x, y, 1, 1, h, null, lowL ? '#8f7b67' : null, lowR ? '#7a6857' : null);
    g.strokeStyle = 'rgba(50,35,30,.35)'; g.lineWidth = 1;
    if (lowL) { strokePath(g, [isoZ(x, y + 1, h / 2), isoZ(x + 1, y + 1, h / 2)], false); strokePath(g, [isoZ(x + .5, y + 1, h), isoZ(x + .5, y + 1, h / 2)], false); strokePath(g, [isoZ(x, y + 1, h / 2), isoZ(x, y + 1, 0)], false); }
    if (lowR) { strokePath(g, [isoZ(x + 1, y, h / 2), isoZ(x + 1, y + 1, h / 2)], false); strokePath(g, [isoZ(x + 1, y + .5, h), isoZ(x + 1, y + .5, h / 2)], false); strokePath(g, [isoZ(x + 1, y, h / 2), isoZ(x + 1, y, 0)], false); }
  }
  const col = TILE_COL[t][t === T.SLAB ? ((x >> 1) + (y >> 1)) % 2 : (x + y) % 2];
  const pts = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
  g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1;
  g.beginPath(); pts.forEach((p, k) => k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill(); g.stroke();
  if (t === T.STONE || t === T.TERRACE) {
    g.strokeStyle = 'rgba(60,42,34,.2)'; strokePath(g, [P(x + .05, y + .05), P(x + .95, y + .05), P(x + .95, y + .95), P(x + .05, y + .95)]);
    g.strokeStyle = 'rgba(255,240,220,.08)'; strokePath(g, [P(x + .05, y + .95), P(x + .05, y + .05), P(x + .95, y + .05)], false);
  } else if (t === T.SLAB) {
    g.strokeStyle = 'rgba(60,42,34,.28)'; g.lineWidth = 1.2;
    if (x % 2 === 0) strokePath(g, [P(x, y), P(x, y + 1)], false);
    if (y % 2 === 0) strokePath(g, [P(x, y), P(x + 1, y)], false);
  } else if (t === T.LANE) {
    g.strokeStyle = 'rgba(50,35,30,.22)';
    [[.27, .27], [.73, .27], [.27, .73], [.73, .73]].forEach(([u, v]) => { const p = P(x + u, y + v); g.beginPath(); g.ellipse(p.x, p.y, 7, 3.4, 0, 0, Math.PI * 2); g.stroke(); });
  } else if (t === T.GRASS) {
    g.fillStyle = 'rgba(30,50,20,.25)';
    [[.3, .4], [.7, .6], [.5, .2]].forEach(([u, v]) => { const p = P(x + u, y + v); ell(g, p.x, p.y, 3, 1.2); });
  } else if (t === T.WATER) {
    g.strokeStyle = 'rgba(160,200,255,.16)'; g.lineWidth = 1;
    const p = P(x + .5, y + .5); g.beginPath(); g.moveTo(p.x - 12, p.y); g.quadraticCurveTo(p.x - 6, p.y - 3, p.x, p.y); g.quadraticCurveTo(p.x + 6, p.y + 3, p.x + 12, p.y); g.stroke();
    g.strokeStyle = '#9a8874'; g.lineWidth = 3;
    const wet = (a, b) => inMap(a, b) && tiles[idx(a, b)] === T.WATER;
    if (!wet(x, y - 1)) strokePath(g, [P(x, y), P(x + 1, y)], false);
    if (!wet(x - 1, y)) strokePath(g, [P(x, y), P(x, y + 1)], false);
    if (!wet(x + 1, y)) strokePath(g, [P(x + 1, y), P(x + 1, y + 1)], false);
    if (!wet(x, y + 1)) strokePath(g, [P(x, y + 1), P(x + 1, y + 1)], false);
  }
}
function paintCarpet(g, cp) {
  const v = (cp.z || 0) * LV, q = (a, b) => isoZ(a, b, v), { x0, y0, x1, y1 } = cp;
  g.fillStyle = '#a3172a'; poly(g, [q(x0, y0), q(x1, y0), q(x1, y1), q(x0, y1)]);
  g.fillStyle = 'rgba(0,0,0,.12)'; poly(g, [q(x0 + .3, y0 + .3), q(x1 - .3, y0 + .3), q(x1 - .3, y1 - .3), q(x0 + .3, y1 - .3)]);
  g.strokeStyle = '#e8b04a'; g.lineWidth = 1.4; strokePath(g, [q(x0 + .14, y0 + .14), q(x1 - .14, y0 + .14), q(x1 - .14, y1 - .14), q(x0 + .14, y1 - .14)]);
  g.lineWidth = .7; strokePath(g, [q(x0 + .24, y0 + .24), q(x1 - .24, y0 + .24), q(x1 - .24, y1 - .24), q(x0 + .24, y1 - .24)]);
  g.fillStyle = 'rgba(232,176,74,.55)';
  for (let y = Math.ceil(y0 + .5); y < y1 - .4; y++) for (let x = Math.ceil(x0 + .5); x < x1 - .4; x++) poly(g, [q(x - .1, y), q(x, y - .1), q(x + .1, y), q(x, y + .1)]);
}
(function paintGround() {
  const g = ground.getContext('2d'); g.scale(GS, GS); g.translate(OX, OY);
  const L = iso(0, N), B = iso(N, N), R = iso(N, 0);
  const sideL = g.createLinearGradient(0, B.y, 0, B.y + EDGE); sideL.addColorStop(0, '#7a6656'); sideL.addColorStop(1, '#2e231e');
  g.fillStyle = sideL; poly(g, [L, B, { x: B.x, y: B.y + EDGE }, { x: L.x, y: L.y + EDGE }]);
  const sideR = g.createLinearGradient(0, B.y, 0, B.y + EDGE); sideR.addColorStop(0, '#665446'); sideR.addColorStop(1, '#251c18');
  g.fillStyle = sideR; poly(g, [B, R, { x: R.x, y: R.y + EDGE }, { x: B.x, y: B.y + EDGE }]);
  for (let s = 0; s <= 2 * (N - 1); s++) for (let x = Math.max(0, s - N + 1); x <= Math.min(s, N - 1); x++) paintTile(g, x, s - x);
  carpets.forEach(cp => paintCarpet(g, cp));
  groundDeco.forEach(d => {
    const p = isoZ(d.x, d.y, heightAt(d.x, d.y) * LV);
    g.save(); g.translate(p.x, p.y); g.rotate(d.r); g.scale(1, .55); g.fillStyle = d.c;
    if (d.kind === 'leaf') { g.beginPath(); g.ellipse(0, 0, d.s * 1.5, d.s * .8, 0, 0, Math.PI * 2); g.fill(); }
    else g.fillRect(-d.s, -d.s / 2, d.s * 2, d.s);
    g.restore();
  });
  // warm light pools from lamps, lanterns and windows
  g.globalCompositeOperation = 'lighter';
  lights.forEach(l => {
    const p = isoZ(l.x, l.y, l.z * LV);
    g.save(); g.translate(p.x, p.y); g.scale(1, .55);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, l.r);
    rg.addColorStop(0, `rgba(255,178,96,${l.a})`); rg.addColorStop(.5, `rgba(255,150,70,${l.a * .4})`); rg.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, l.r, 0, Math.PI * 2); g.fill(); g.restore();
  });
  g.globalCompositeOperation = 'source-over';
})();

/* roofs: hipped, dark tiles, upturned eaves, a pearl on the ridge */
function drawRoof(c, x, y, w, d, h, col, t) {
  const o = .4, rise = 14 + Math.min(w, d) * 8, ax = x - o, ay = y - o, bx = x + w + o, by = y + d + o, EW = bx - ax, ED = by - ay;
  const W3 = (px, py, v) => ({ px, py, v });
  const P = q => isoZ(q.px, q.py, q.v);
  const A = W3(ax, ay, h), B = W3(bx, ay, h), C = W3(bx, by, h), D = W3(ax, by, h);
  let R1, R2, faces;
  if (EW >= ED) {
    R1 = W3(ax + ED * .42, (ay + by) / 2, h + rise); R2 = W3(bx - ED * .42, (ay + by) / 2, h + rise);
    faces = { back: [[A, B, R2, R1], [A, R1, D]], front: [[D, C, R2, R1], 'main'], side: [[C, B, R2], 'side'] };
  } else {
    R1 = W3((ax + bx) / 2, ay + EW * .42, h + rise); R2 = W3((ax + bx) / 2, by - EW * .42, h + rise);
    faces = { back: [[A, B, R1], [A, R1, R2, D]], front: [[D, C, R2], 'main'], side: [[C, B, R1, R2], 'side'] };
  }
  const main = col, sideC = shade(col, -.18), backC = shade(col, -.32);
  faces.back.forEach(f => { c.fillStyle = backC; poly(c, f.map(P)); });
  const lerp = (p, q, u) => W3(p.px + (q.px - p.px) * u, p.py + (q.py - p.py) * u, p.v + (q.v - p.v) * u);
  [faces.front, faces.side].forEach(([f, kind]) => {
    c.fillStyle = kind === 'main' ? main : sideC; poly(c, f.map(P));
    // tile rows run from the eave up to the ridge
    const e0 = f[0], e1 = f[1], t0 = f.length === 4 ? f[3] : f[2], t1 = f[2];
    c.strokeStyle = shade(col, kind === 'main' ? -.3 : -.4); c.lineWidth = 1.1;
    const n = Math.max(4, Math.round(Math.hypot(e1.px - e0.px, e1.py - e0.py) * 4));
    for (let k = 1; k < n; k++) { const u = k / n, p = P(lerp(e0, e1, u)), q = P(lerp(t0, t1, u)); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); }
  });
  // hip ridges, main ridge and eave trim
  c.strokeStyle = shade(col, .22); c.lineWidth = 2;
  [[D, EW >= ED ? R1 : R2], [C, R2], [B, EW >= ED ? R2 : R1]].forEach(([p, q]) => strokePath(c, [P(p), P(q)], false));
  c.strokeStyle = shade(col, .3); c.lineWidth = 3; strokePath(c, [P(D), P(C), P(B)], false);
  c.strokeStyle = '#1e1b28'; c.lineWidth = 1; strokePath(c, [{ x: P(D).x, y: P(D).y + 2 }, { x: P(C).x, y: P(C).y + 2 }, { x: P(B).x, y: P(B).y + 2 }], false);
  c.strokeStyle = '#25212f'; c.lineWidth = 4.5; strokePath(c, [P(R1), P(R2)], false);
  // upturned eave tips and ridge horns
  c.fillStyle = shade(col, .3);
  [[D, -1], [C, 0], [B, 1]].forEach(([q, s]) => { const p = P(q); poly(c, [{ x: p.x - 6, y: p.y + 1 }, { x: p.x + 6, y: p.y + 1 }, { x: p.x + s * 7, y: p.y - 8 }]); });
  c.fillStyle = '#25212f';
  [[R1, -1], [R2, 1]].forEach(([q, s]) => { const p = P(q); poly(c, [{ x: p.x - 3, y: p.y + 2 }, { x: p.x + 3, y: p.y + 2 }, { x: p.x + s * 6, y: p.y - 9 }]); });
  const m = P(lerp(R1, R2, .5));
  glow(c, m.x, m.y - 6, 22, .4 + Math.sin(t * 2 + x) * .12, GLOW_P);
  c.fillStyle = '#efe6ff'; ell(c, m.x, m.y - 6, 4, 4); c.fillStyle = '#c9b8ff'; ell(c, m.x + 1, m.y - 5, 2.2, 2.2); c.fillStyle = '#fff'; ell(c, m.x - 1.3, m.y - 7.4, 1.2, 1);
}

/* object painters; objects standing on the terrace are drawn shifted up by the caller */
const PAINT = {
  wall(c, o, t) {
    const x = o.x - .5, y = o.y - .5;
    drawBox(c, x, y, 1, 1, 34, null, '#70483a', '#5c3a30');
    if (o.win) { const p = isoZ(x + 1, y + .5, 18); glow(c, p.x, p.y, 16, .5 + Math.sin(t * 2 + y) * .1); c.fillStyle = '#ffc66b'; ell(c, p.x, p.y, 4.5, 6); c.strokeStyle = '#3e2621'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(p.x, p.y, 4.5, 6, 0, 0, Math.PI * 2); c.stroke(); }
    drawBox(c, x - .08, y - .08, 1.16, 1.16, 8, '#3b3750', '#2f2b40', '#272336', 34);
  },
  lowwall(c, o, t) {
    const x = o.x - .5, y = o.y - .5;
    drawBox(c, x, y, 1, 1, 12, '#b3a086', '#9a876f', '#857360');
    drawBox(c, x - .03, y - .03, 1.06, 1.06, 3, '#cdbb9d', '#a8957b', '#948268', 12);
    if (o.lamp) { const p = iso(o.x, o.y); drawLantern(c, p.x, p.y - 26, 5.5, t); }
  },
  building(c, o, t) {
    const { x, y, w, d, h } = o, x1 = x + w, y1 = y + d;
    const wall = o.wall || '#e8d5b2';
    drawBox(c, x, y, w, d, h, null, wall, shade(wall, -.22));
    drawBox(c, x, y, w, d, 7, null, '#857262', '#6f5e51');
    const L = (u, v) => isoZ(x + u, y1, v), R = (u, v) => isoZ(x1, y + u, v);
    const quad = (F, u0, u1, v0, v1, col) => { c.fillStyle = col; poly(c, [F(u0, v0), F(u1, v0), F(u1, v1), F(u0, v1)]); };
    const fl = .88 + Math.sin(t * 2.3 + x * 1.7) * .07;
    const bays = (F, n, dark) => {
      for (let i = 0; i < n; i++) {
        const door = F === L && i === (o.door ?? Math.floor(n / 2));
        const v0 = door ? 7 : h * .36, v1 = door ? h * .72 : h * .74;
        quad(F, i + .2, i + .8, v0, v1, dark ? '#d98a3c' : '#ffbe62');
        c.globalAlpha = fl * (dark ? .45 : .75); quad(F, i + .27, i + .73, v0 + 2, v1 - 2, '#fff1c4'); c.globalAlpha = 1;
        c.strokeStyle = 'rgba(90,45,25,.85)'; c.lineWidth = 1; c.beginPath();
        for (let k = 1; k < 4; k++) { const u = i + .2 + .6 * k / 4, a = F(u, v0), b = F(u, v1); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
        for (let k = 1; k < 3; k++) { const v = v0 + (v1 - v0) * k / 3, a = F(i + .2, v), b = F(i + .8, v); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
        c.stroke();
        c.strokeStyle = '#4a2a20'; c.lineWidth = 1.6; strokePath(c, [F(i + .2, v0), F(i + .8, v0), F(i + .8, v1), F(i + .2, v1)]);
        if (door) { const p = F(i + .5, v1 + 5); c.fillStyle = '#a3172a'; rr(c, p.x - 9, p.y - 4, 18, 8, 2); c.fill(); c.strokeStyle = '#e8b04a'; c.lineWidth = 1; c.stroke(); }
      }
      for (let i = 0; i <= n; i++) quad(F, Math.max(0, i - .05), Math.min(n, i + .05), 0, h, dark ? '#6e1f1f' : '#8e2a24');
      quad(F, 0, n, h - 7, h, dark ? '#2f1d1a' : '#3e2621');
    };
    bays(L, w, false); bays(R, d, true);
    drawRoof(c, x, y, w, d, h, o.roof || '#3b3950', t);
    const e = .4;
    [iso(x - e, y1 + e), iso(x1 + e, y1 + e), iso(x1 + e, y - e)].forEach(p => {
      c.strokeStyle = 'rgba(40,20,20,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y - h); c.lineTo(p.x, p.y - h + 9); c.stroke();
      drawLantern(c, p.x, p.y - h + 15, 6, t);
    });
  },
  lamp(c, o, t) {
    const p = iso(o.x, o.y), ink = '#2b2630';
    c.fillStyle = 'rgba(20,10,20,.3)'; ell(c, p.x, p.y, 8, 3.5);
    c.fillStyle = ink; rr(c, p.x - 4.5, p.y - 6, 9, 6, 2); c.fill(); rr(c, p.x - 2, p.y - 68, 4, 64, 2); c.fill();
    c.strokeStyle = ink; c.lineWidth = 3; c.beginPath(); c.moveTo(p.x, p.y - 66); c.quadraticCurveTo(p.x + 2, p.y - 80, p.x + 14, p.y - 77); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x + 14, p.y - 77); c.lineTo(p.x + 14, p.y - 72); c.stroke();
    glow(c, p.x + 14, p.y - 64, 40, .7 + Math.sin(t * 4 + o.x) * .05);
    c.fillStyle = ink; poly(c, [{ x: p.x + 8, y: p.y - 70 }, { x: p.x + 20, y: p.y - 70 }, { x: p.x + 17, y: p.y - 74 }, { x: p.x + 11, y: p.y - 74 }]);
    c.fillStyle = '#ffe9a8'; rr(c, p.x + 9.5, p.y - 70, 9, 11, 2.5); c.fill();
    c.fillStyle = ink; c.fillRect(p.x + 8.5, p.y - 59.5, 11, 2);
  },
  rail(c, o) {
    const a = o.side === 'R' ? iso(o.x + 1, o.y) : iso(o.x, o.y + 1), b = iso(o.x + 1, o.y + 1), H = 13;
    c.strokeStyle = '#3b2628'; c.lineWidth = 1.6; c.beginPath();
    for (let k = 1; k < 5; k++) { const f = k / 5, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; c.moveTo(x, y); c.lineTo(x, y - H); }
    c.stroke();
    c.strokeStyle = '#4a2c2a'; c.lineWidth = 3; strokePath(c, [{ x: a.x, y: a.y - H }, { x: b.x, y: b.y - H }], false);
    c.strokeStyle = '#8a5a48'; c.lineWidth = 1; strokePath(c, [{ x: a.x, y: a.y - H - 1.2 }, { x: b.x, y: b.y - H - 1.2 }], false);
    c.fillStyle = '#5a2f2c'; [a, b].forEach(p => { rr(c, p.x - 2, p.y - H - 4, 4, H + 4, 1.5); c.fill(); });
    c.fillStyle = '#e8b04a'; [a, b].forEach(p => ell(c, p.x, p.y - H - 4.5, 1.6, 1.6));
  },
  stall(c, o, t) {
    const { x, y, w, d } = o, ink = '#3b2628';
    const post = (px, py) => { const p = iso(px, py); c.fillStyle = ink; c.fillRect(p.x - 1.3, p.y - 44, 2.6, 44); };
    post(x + .12, y + .2); post(x + w - .12, y + .2);
    drawBox(c, x + .1, y + .2, w - .2, d - .35, 15, '#9a6a44', '#b4283a', '#8e1f2f');
    o.goods.forEach(gd => {
      const p = isoZ(x + .15 + gd.u * (w - .3), y + .25 + gd.v * (d - .45), 15);
      c.fillStyle = gd.c; c.strokeStyle = 'rgba(40,20,30,.6)'; c.lineWidth = 1;
      if (gd.k === 0) { rr(c, p.x - 4, p.y - 7, 8, 7, 1.5); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(p.x - 4, p.y - 7, 8, 2); }
      else if (gd.k === 1) { c.beginPath(); c.arc(p.x, p.y - 4, 4, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.6)'; ell(c, p.x - 1.4, p.y - 5.5, 1.2, 1); }
      else { rr(c, p.x - 2.6, p.y - 10, 5.2, 10, 2.5); c.fill(); c.stroke(); }
    });
    post(x + .12, y + d - .1); post(x + w - .12, y + d - .1);
    for (let k = 0; k < 6; k++) {
      const u0 = x - .05 + (w + .1) * k / 6, u1 = x - .05 + (w + .1) * (k + 1) / 6;
      c.fillStyle = k % 2 ? '#f3e2c4' : '#d83a3a';
      poly(c, [isoZ(u0, y + .05, 50), isoZ(u1, y + .05, 50), isoZ(u1, y + d + .3, 40), isoZ(u0, y + d + .3, 40)]);
      const a = isoZ(u0, y + d + .3, 40), b = isoZ(u1, y + d + .3, 40);
      c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + 7, b.x, b.y); c.closePath(); c.fill();
    }
    const lp = isoZ(x + w, y + d + .3, 40); drawLantern(c, lp.x, lp.y + 9, 5, t);
  },
  table(c, o, t) {
    const x = o.x - .5, y = o.y - .5;
    const stool = (px, py) => { const p = iso(px, py); c.fillStyle = '#8e1f2f'; rr(c, p.x - 5, p.y - 8, 10, 8, 2.5); c.fill(); c.fillStyle = '#d9474f'; ell(c, p.x, p.y - 8, 5, 2.4); };
    stool(x + .5, y - .1); stool(x - .1, y + .5);
    drawBox(c, x + .14, y + .14, .72, .72, 13, '#6b3f2a', '#5a3424', '#4a2a1d');
    c.fillStyle = '#2f7a52'; poly(c, [isoZ(x + .22, y + .22, 13), isoZ(x + .78, y + .22, 13), isoZ(x + .78, y + .78, 13), isoZ(x + .22, y + .78, 13)]);
    c.fillStyle = '#f5efe0';
    [[.35, .3], [.45, .3], [.55, .3], [.7, .45], [.7, .55], [.4, .7], [.5, .7], [.3, .5]].forEach(([u, v]) => { const p = isoZ(x + u, y + v, 13); c.fillRect(p.x - 1.6, p.y - 2.4, 3.2, 2.4); });
    stool(x + 1.1, y + .5); stool(x + .5, y + 1.1);
  },
  pot(c, o, t) {
    const x = o.x - .5, y = o.y - .5;
    drawBox(c, x + .3, y + .3, .4, .4, 9, '#8a5a3c', '#a86b45', '#7d4e33');
    const p = iso(o.x, o.y), cy = p.y - 9, sh = Math.sin(t * 2 + o.x * 3) * .5 + .5;
    glow(c, p.x, cy - 10, 24, .35 + sh * .2, GLOW_P);
    [[-2.5, 13, '#6a4fd6'], [-1.9, 16, '#9b7bff'], [-1.57, 19, '#c9a8ff'], [-1.2, 16, '#9b7bff'], [-.65, 13, '#6a4fd6']].forEach(([a, len, col]) => {
      const tx = p.x + Math.cos(a) * len, ty = cy + Math.sin(a) * len, nx = Math.cos(a + Math.PI / 2) * 3.4, ny = Math.sin(a + Math.PI / 2) * 3.4;
      const mx = p.x + Math.cos(a) * len * .45, my = cy + Math.sin(a) * len * .45;
      c.fillStyle = col; poly(c, [{ x: p.x, y: cy }, { x: mx + nx, y: my + ny }, { x: tx, y: ty }, { x: mx - nx, y: my - ny }]);
      c.fillStyle = 'rgba(255,255,255,.35)'; poly(c, [{ x: p.x, y: cy }, { x: mx + nx * .5, y: my + ny * .5 }, { x: tx, y: ty }]);
    });
    c.fillStyle = '#4a8a4a'; ell(c, p.x - 5, cy, 3.2, 1.6); ell(c, p.x + 5, cy, 3.2, 1.6);
  },
  maple(c, o, t) {
    const p = iso(o.x, o.y), s = 1 + o.v * .3, sway = Math.sin(t * 1.2 + o.x) * 1.2;
    c.fillStyle = 'rgba(20,10,20,.28)'; ell(c, p.x, p.y, 20 * s, 8 * s);
    c.fillStyle = '#5a3424'; rr(c, p.x - 3, p.y - 22 * s, 6, 22 * s, 2); c.fill();
    c.strokeStyle = '#5a3424'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(p.x, p.y - 18 * s); c.lineTo(p.x - 9 * s, p.y - 30 * s); c.moveTo(p.x, p.y - 20 * s); c.lineTo(p.x + 8 * s, p.y - 32 * s); c.stroke();
    const blobs = [[-13, -36, 13], [13, -38, 13], [0, -50, 17], [-8, -60, 12], [9, -58, 12], [0, -34, 13]];
    const layer = (dx, dy, k, col) => { c.fillStyle = col; blobs.forEach(([bx, by, r]) => ell(c, p.x + (bx + dx + sway * (-by / 60)) * s, p.y + (by + dy) * s, r * k * s, r * k * .9 * s)); };
    layer(1.5, 3, 1, '#a8361a'); layer(0, 0, .92, '#e2581f'); layer(-2.5, -3, .6, '#ff8a3a'); layer(-4, -6, .28, '#ffc06a');
  },
  toro(c, o, t) {
    const p = iso(o.x, o.y), st = '#a39a8c', sd = '#7f786d';
    c.fillStyle = 'rgba(20,10,20,.28)'; ell(c, p.x, p.y, 10, 4);
    c.fillStyle = sd; rr(c, p.x - 8, p.y - 5, 16, 5, 2); c.fill();
    c.fillStyle = st; rr(c, p.x - 3, p.y - 17, 6, 13, 1.5); c.fill();
    c.fillStyle = sd; rr(c, p.x - 8, p.y - 20, 16, 4, 1.5); c.fill();
    glow(c, p.x, p.y - 26, 26, .55 + Math.sin(t * 3 + o.x * 2) * .08);
    c.fillStyle = st; rr(c, p.x - 6.5, p.y - 31, 13, 11, 2); c.fill();
    c.fillStyle = '#ffd27a'; rr(c, p.x - 3.5, p.y - 29, 7, 7, 1.5); c.fill();
    c.fillStyle = sd; poly(c, [{ x: p.x - 11, y: p.y - 31 }, { x: p.x + 11, y: p.y - 31 }, { x: p.x + 3, y: p.y - 38 }, { x: p.x - 3, y: p.y - 38 }]);
    c.fillStyle = st; ell(c, p.x, p.y - 39, 2.5, 2.5);
  },
  crate(c, o, t) {
    const { x, y } = o, cp = iso(x + 1, y + 1);
    glow(c, cp.x, cp.y - 30, 110, .3 + Math.sin(t * 2) * .05);
    drawBox(c, x + .12, y + .12, 1.76, 1.76, 30, null, '#c92a31', '#9e1d25');
    c.strokeStyle = '#e8b04a'; c.lineWidth = 2;
    const L = (u, v) => isoZ(x + .12 + u, y + 1.88, v), R = (u, v) => isoZ(x + 1.88, y + .12 + u, v);
    [L, R].forEach(F => {
      strokePath(c, [F(.08, 3), F(1.68, 3), F(1.68, 27), F(.08, 27)]);
      c.fillStyle = '#e8b04a'; poly(c, [F(.88, 22), F(1.2, 15), F(.88, 8), F(.56, 15)]);
      c.fillStyle = '#c92a31'; poly(c, [F(.88, 19), F(1.06, 15), F(.88, 11), F(.7, 15)]);
    });
    drawBox(c, x + .05, y + .05, 1.9, 1.9, 6, '#d33a3f', '#a51f27', '#871820', 30);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const p = isoZ(x + .45 + i * .55, y + .45 + j * .55, 36);
      c.fillStyle = '#b8222b'; rr(c, p.x - 5, p.y - 6, 10, 6, 2); c.fill();
      c.fillStyle = '#e8b04a'; ell(c, p.x, p.y - 6, 5, 2.6); c.fillStyle = '#3a1418'; ell(c, p.x, p.y - 6, 3.4, 1.7);
    }
  },
  drum(c, o, t) {
    const { x, y } = o, p = iso(x + 1, y + 1), top = p.y - 38, rx = 30, ry = 15;
    glow(c, p.x, top, 90, .22);
    c.fillStyle = 'rgba(20,10,20,.3)'; ell(c, p.x, p.y, 40, 18);
    c.strokeStyle = '#3b2628'; c.lineWidth = 4; c.beginPath(); c.moveTo(p.x - 26, p.y - 4); c.lineTo(p.x - 18, top + 14); c.moveTo(p.x + 26, p.y - 4); c.lineTo(p.x + 18, top + 14); c.moveTo(p.x, p.y + 4); c.lineTo(p.x, top + 18); c.stroke();
    const body = c.createLinearGradient(p.x - rx, 0, p.x + rx, 0); body.addColorStop(0, '#8e1820'); body.addColorStop(.4, '#d0323a'); body.addColorStop(1, '#7a141b');
    c.fillStyle = body; c.beginPath(); c.ellipse(p.x, top + 22, rx, ry, 0, 0, Math.PI); c.lineTo(p.x - rx, top); c.ellipse(p.x, top, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
    c.fillStyle = '#e8b04a';
    for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI; ell(c, p.x + Math.cos(a) * rx * .98, top + Math.sin(a) * ry + 2, 1.3, 1.3); ell(c, p.x + Math.cos(a) * rx * .98, top + 20 + Math.sin(a) * ry, 1.3, 1.3); }
    c.fillStyle = '#ecd9b0'; ell(c, p.x, top, rx, ry); c.fillStyle = '#b8222b'; ell(c, p.x, top, rx * .42, ry * .42);
    c.fillStyle = '#e8b04a'; ell(c, p.x, top, rx * .16, ry * .16);
    c.strokeStyle = '#6b3f2a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(p.x - 14, top - 16); c.lineTo(p.x + 6, top - 2); c.moveTo(p.x + 14, top - 16); c.lineTo(p.x - 6, top - 2); c.stroke();
    c.fillStyle = '#ffd36b'; ell(c, p.x - 14, top - 16, 2.4, 2.4); ell(c, p.x + 14, top - 16, 2.4, 2.4);
  },
  crackers(c, o, t) {
    const p = iso(o.x, o.y);
    c.fillStyle = 'rgba(20,10,20,.28)'; ell(c, p.x, p.y, 11, 4.5);
    [[-6, -1, 20], [6, -1, 16], [0, 3, 25]].forEach(([dx, dy, h]) => {
      const bx = p.x + dx, by = p.y + dy;
      c.fillStyle = '#c92a31'; rr(c, bx - 4.5, by - h, 9, h, 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(bx + 1.5, by - h, 3, h);
      c.fillStyle = '#e8b04a'; c.fillRect(bx - 4.5, by - h + 3, 9, 2); c.fillRect(bx - 4.5, by - 5, 9, 2);
      c.fillStyle = '#e04048'; ell(c, bx, by - h, 4.5, 2);
      c.strokeStyle = '#3b2628'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx, by - h); c.quadraticCurveTo(bx + 3, by - h - 5, bx + 1, by - h - 8); c.stroke();
    });
  },
  boxes(c, o) {
    const x = o.x - .5, y = o.y - .5;
    const gift = (bx, by, s, h, base, col) => {
      drawBox(c, bx, by, s, s, h, shade(col, .12), col, shade(col, -.2), base);
      c.strokeStyle = '#e8b04a'; c.lineWidth = 1.6;
      strokePath(c, [isoZ(bx + s / 2, by + s, base), isoZ(bx + s / 2, by + s, base + h), isoZ(bx + s / 2, by, base + h)], false);
      strokePath(c, [isoZ(bx + s, by + s / 2, base), isoZ(bx + s, by + s / 2, base + h), isoZ(bx, by + s / 2, base + h)], false);
    };
    gift(x + .1, y + .1, .5, 12, 0, '#b8222b'); gift(x + .45, y + .45, .45, 10, 0, '#d0323a'); gift(x + .2, y + .2, .35, 9, 12, '#e8b04a');
  },
  bench(c, o) {
    const x = o.x - .5, y = o.y - .5;
    c.fillStyle = 'rgba(20,10,20,.22)'; const s = iso(o.x, o.y); ell(c, s.x, s.y, 16, 6);
    const wd = ['#a8714a', '#8a5a3c', '#734a31'];
    if (o.side) { drawBox(c, x + .1, y + .3, .8, .34, 7, ...wd); drawBox(c, x + .1, y + .66, .8, .1, 17, ...wd); }
    else { drawBox(c, x + .22, y + .1, .1, .8, 17, ...wd); drawBox(c, x + .34, y + .1, .34, .8, 7, ...wd); }
  },
  floatl(c, o, t) {
    const p = iso(o.x + Math.sin(t * .3 + o.s) * .15, o.y + Math.cos(t * .25 + o.s) * .15), b = Math.sin(t * 1.5 + o.s) * 1;
    glow(c, p.x, p.y - 4, 26, .55);
    c.fillStyle = 'rgba(255,200,120,.25)'; ell(c, p.x, p.y + 2, 10, 3);
    c.fillStyle = '#ff9ec4'; [-5, 5].forEach(dx => ell(c, p.x + dx, p.y - 2 + b, 4.5, 2.6)); c.fillStyle = '#ffc6dc'; ell(c, p.x, p.y - 3 + b, 3.8, 3.4);
    c.fillStyle = '#fff4d0'; ell(c, p.x, p.y - 7 + b, 1.6, 2.4);
  }
};

/* ---------- entities ---------- */
const HAIRS = ['#ff5f8f', '#5b6cff', '#ffcf4a', '#8a5a3c', '#a066ff', '#2b2b3a', '#3fd0c9', '#ff8a3d', '#f4f4f4', '#ff3d5a'];
const SKINS = ['#ffe0c7', '#f6c9a4', '#d9a07a', '#a8724f', '#7a4e33'];
const SHIRTS = ['#ff7eb6', '#7ef3d4', '#ffd36b', '#9be7ff', '#c79bff', '#ffffff', '#2f3a66', '#ff8a3d', '#a3e635'];
const PANTS = ['#2f3a66', '#ffffff', '#5a6b8a', '#1e2440', '#ffe08a', '#7a4e33'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const BOT_NAMES = ['Mira', 'Juno', 'Kai', 'Pip', 'Sol', 'Nova', 'Rin', 'Teo', 'Yumi'];
const BOT_LINES = ['bruh...', 'nah.', 'anyone trading?', 'just pulled a UR!!', 'gg', 'when does the event start?', 'hi :)', 'lol', 'the fireworks are so pretty', 'meet at the big red crate', 'pity at 46, send help', 'nice skin!', 'brb', 'anyone up for a game on the terrace?', 'the market has new lanterns'];
const BOT_REPLIES = ['hey!', 'lol', 'same', 'real', 'hiii', 'haha', 'true', '👋'];
const EMOTES = ['😂', '😍', '😮', '😢', '👋', '❤️', '😤', '✨'];
const CHIBI_S = .95;

function walkable(x, y) {
  const r = .22;
  for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
    if (tx < 0 || ty < 0 || tx >= N || ty >= N || blocked[idx(tx, ty)]) return false;
  }
  return true;
}
/* a step is fine if the ground there is (nearly) level with where you stand; terrace edges are cliffs */
const canStand = (fx, fy, x, y) => walkable(x, y) && Math.abs(heightAt(x, y) - heightAt(fx, fy)) < .3;
function lineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / .12);
  let px = ax, py = ay;
  for (let i = 1; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    if (!canStand(px, py, x, y)) return false;
    px = x; py = y;
  }
  return true;
}
/* tile pathfinding (breadth-first, 8 directions) so walkers use the stairs */
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function linkOK(ax, ay, bx, by) {
  if (!inMap(bx, by) || blocked[idx(bx, by)]) return false;
  const mx = (ax + bx) / 2 + .5, my = (ay + by) / 2 + .5, dx = (bx - ax) * .02, dy = (by - ay) * .02;
  return Math.abs(heightAt(mx - dx, my - dy) - heightAt(mx + dx, my + dy)) < .3;
}
function findPath(sx, sy, gx, gy) {
  const s = idx(Math.floor(sx), Math.floor(sy)), goal = idx(clamp(Math.floor(gx), 0, N - 1), clamp(Math.floor(gy), 0, N - 1));
  const prev = new Int32Array(N * N).fill(-1); prev[s] = s;
  const q = [s]; let best = s, bestD = Infinity;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi], cx = cur % N, cy = (cur / N) | 0, dd = Math.hypot(cx + .5 - gx, cy + .5 - gy);
    if (dd < bestD) { bestD = dd; best = cur; }
    if (cur === goal) break;
    for (const [dx, dy] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (!inMap(nx, ny) || prev[idx(nx, ny)] !== -1) continue;
      if (dx && dy ? !(linkOK(cx, cy, nx, cy) && linkOK(nx, cy, nx, ny) && linkOK(cx, cy, cx, ny) && linkOK(cx, ny, nx, ny)) : !linkOK(cx, cy, nx, ny)) continue;
      prev[idx(nx, ny)] = cur; q.push(idx(nx, ny));
    }
  }
  const pts = [];
  for (let k = best; k !== s; k = prev[k]) pts.push({ x: k % N + .5, y: ((k / N) | 0) + .5 });
  pts.reverse();
  if (best === goal && walkable(gx, gy)) { if (pts.length) pts[pts.length - 1] = { x: gx, y: gy }; else pts.push({ x: gx, y: gy }); }
  return pts;
}
function randomWalkableNear(cx, cy, rad) {
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(clamp(cx + (Math.random() * 2 - 1) * rad, 1, N - 2)) + .5, y = Math.floor(clamp(cy + (Math.random() * 2 - 1) * rad, 1, N - 2)) + .5;
    if (walkable(x, y)) return { x, y };
  }
  return null;
}
function makeEntity(name, x, y, look, bot) {
  return { name, x, y, z: 0, look, bot, path: null, phase: 0, moving: false, dir: 'down', ex: 0, bubble: null, emote: null, idle: Math.random() * 3, nextTalk: 4 + Math.random() * 12, stuck: 0 };
}
if (S.player.mc) S.player.look = { ...MC_LOOK[S.player.mc] };
const player = makeEntity(S.player.name, 13.5, 16.5, S.player.look, false);
const bots = BOT_NAMES.map(n => {
  const p = randomWalkableNear(14, 14, 11) || { x: 12.5, y: 17.5 };
  return makeEntity(n, p.x, p.y, { ...MC_LOOK[Math.random() < .5 ? 'f' : 'm'] }, true);
});
const entities = [player, ...bots];
$('#onlineCount').textContent = `${entities.length} here`;

/* chat */
const chatLog = [];
function logChat(name, text, color, sys) {
  chatLog.push({ name, text, color, sys }); if (chatLog.length > 6) chatLog.shift();
  $('#chatlog').innerHTML = chatLog.map(m => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div><b style="color:${m.color}">${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
}
function say(e, text) {
  e.bubble = { text, until: now + 4.5 };
  logChat(e.name, text, e === player ? 'var(--mint)' : e.look.hair === '#2b2b3a' ? '#c9d2f5' : e.look.hair, false);
}
function emote(e, em) { e.emote = { e: em, until: now + 3 }; }
logChat('', 'Welcome to Blank: Project. The other players here are demo bots until multiplayer is connected.', '', true);

$('#chatForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const inp = $('#chatInput'), text = inp.value.trim(); if (!text) return;
  say(player, text); inp.value = ''; inp.blur();
  if (Math.random() < .45) {
    const near = bots.filter(b => Math.hypot(b.x - player.x, b.y - player.y) < 8);
    const b = near.length ? pick(near) : pick(bots);
    setTimeout(() => say(b, pick(BOT_REPLIES)), 1200 + Math.random() * 1500);
  }
});
const emotesEl = $('#emotes');
emotesEl.innerHTML = EMOTES.map(e => `<button type="button" aria-label="Emote ${e}">${e}</button>`).join('');
emotesEl.querySelectorAll('button').forEach((b, i) => b.onclick = () => { emote(player, EMOTES[i]); emotesEl.hidden = true; });
$('#emoteToggle').onclick = () => { emotesEl.hidden = !emotesEl.hidden; };

let hintTimer;
function showHint() { const h = $('#hint'); h.classList.remove('gone'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('gone'), 6000); }

/* ---------- zones, map, minimap, teleport, people ---------- */
// Each area of the plaza is a zone for now; later these can become separate maps.
const ZONES = [
  { id: 'square', name: 'Lantern Square', desc: 'The heart of the festival. Meet by the firework crate.', r: [10, 10, 19, 19], at: [14, 16.6], c: '#ffd36b' },
  { id: 'terrace', name: 'Tea Terrace', desc: 'A raised terrace with a tea house and a game table.', r: [0, 0, 10, 10], at: [5.5, 7.6], c: '#ff9a5a' },
  { id: 'market', name: 'Night Market', desc: 'Stalls full of lanterns, sweets and trinkets.', r: [10, 0, 28, 10], at: [18.5, 7.5], c: '#ff6f91' },
  { id: 'garden', name: 'Maple Garden', desc: 'Red maples around a pond of floating lanterns.', r: [0, 10, 10, 28], at: [6.5, 16.5], c: '#ff7a3d' },
  { id: 'stage', name: 'Firework Stage', desc: 'The big drum, red carpet and the best view of the sky.', r: [19, 19, 28, 28], at: [21.5, 22.5], c: '#c58bff' }
];
const CROSSROADS = { id: 'lanes', name: 'Lantern Lanes', desc: 'Cobbled lanes linking every corner of the plaza.', c: '#efe3c8' };
const zoneAt = (x, y) => ZONES.find(z => x >= z.r[0] && x < z.r[2] && y >= z.r[1] && y < z.r[3]) || CROSSROADS;
function findSpawn(x, y) {
  for (let rad = 0; rad <= 5; rad++)
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const px = Math.floor(x) + dx + .5, py = Math.floor(y) + dy + .5;
      if (walkable(px, py)) return { x: px, y: py };
    }
  return { x: 13.5, y: 16.5 };
}
let curZone = zoneAt(player.x, player.y), tele = null;

/* pre-rendered map base, reused by the minimap and the map window */
const MTW = 24, MTH = 12, MEDGE = 10;
const kindAt = new Array(N * N).fill(null);
objects.forEach(o => {
  if (o.w) { for (let j = o.y; j < o.y + o.d; j++) for (let i = o.x; i < o.x + o.w; i++) kindAt[idx(i, j)] = o.kind === 'building' ? 'roof' : 'prop'; }
  else if (o.kind === 'wall' || o.kind === 'maple') kindAt[idx(Math.floor(o.x), Math.floor(o.y))] = o.kind;
});
const mapBase = document.createElement('canvas');
mapBase.width = N * MTW; mapBase.height = N * MTH + MEDGE + 8;
const miso = (x, y) => ({ x: (x - y) * MTW / 2 + N * MTW / 2, y: (x + y) * MTH / 2 + 6 });
(function paintMapBase() {
  const g = mapBase.getContext('2d');
  const L = miso(0, N), B = miso(N, N), R = miso(N, 0);
  g.fillStyle = '#5a4638'; poly(g, [L, B, { x: B.x, y: B.y + MEDGE }, { x: L.x, y: L.y + MEDGE }]);
  g.fillStyle = '#46362c'; poly(g, [B, R, { x: R.x, y: R.y + MEDGE }, { x: B.x, y: B.y + MEDGE }]);
  const TC = { [T.STONE]: '#b8a48c', [T.SLAB]: '#d3c09f', [T.LANE]: '#968473', [T.GRASS]: '#6b8a48', [T.WATER]: '#2f5478', [T.TERRACE]: '#d8c4a2' };
  const KC = { roof: '#3f3c56', prop: '#c0303a', wall: '#5b3c31', maple: '#e2581f' };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y), k = kindAt[i], base = hgt[i] * 3 + (stairs[i] ? 1.5 : 0);
    let col = KC[k] || TC[tiles[i]];
    if (!k && carpets.some(cp => x + .5 > cp.x0 && x + .5 < cp.x1 && y + .5 > cp.y0 && y + .5 < cp.y1)) col = '#a3172a';
    const lift = base + (k === 'roof' ? 6 : k === 'wall' ? 3 : k === 'maple' ? 4 : k === 'prop' ? 2 : 0);
    const pts = [miso(x, y), miso(x + 1, y), miso(x + 1, y + 1), miso(x, y + 1)].map(p => ({ x: p.x, y: p.y - lift }));
    if (lift) { g.fillStyle = k ? shade(KC[k], -.35) : '#8a7563'; poly(g, [pts[3], pts[2], { x: pts[2].x, y: pts[2].y + lift }, { x: pts[3].x, y: pts[3].y + lift }]); poly(g, [pts[2], pts[1], { x: pts[1].x, y: pts[1].y + lift }, { x: pts[2].x, y: pts[2].y + lift }]); }
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = .6;
    g.beginPath(); pts.forEach((p, n) => n ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill(); g.stroke();
    if (k === 'maple') { g.fillStyle = '#ffa04a'; ell(g, (pts[0].x + pts[2].x) / 2 - 2, (pts[0].y + pts[2].y) / 2 - 1, 2.4, 1.4); }
  }
})();
/* draw the map into a canvas; returns a function mapping world coords to CSS px */
function drawMap(cv, cssW, cssH, opt = {}) {
  const d = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(cssW * d)) { cv.width = Math.round(cssW * d); cv.height = Math.round(cssH * d); }
  const g = cv.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cssW, cssH);
  const sc = opt.follow ? opt.zoom : Math.min(cssW / mapBase.width, cssH / mapBase.height) * .96;
  let ox = (cssW - mapBase.width * sc) / 2, oy = (cssH - mapBase.height * sc) / 2;
  if (opt.follow) { const p = miso(player.x, player.y); ox = cssW / 2 - p.x * sc; oy = cssH / 2 - p.y * sc; }
  const toPx = (x, y) => { const p = miso(x, y); return { x: ox + p.x * sc, y: oy + (p.y - heightAt(x, y) * 3) * sc }; };
  g.imageSmoothingEnabled = true;
  g.drawImage(mapBase, ox, oy, mapBase.width * sc, mapBase.height * sc);
  if (opt.zones) ZONES.forEach(z => {
    const [x0, y0, x1, y1] = z.r, P = (x, y) => { const p = miso(x, y); return { x: ox + p.x * sc, y: oy + p.y * sc }; };
    const pts = [P(Math.max(x0, 1), Math.max(y0, 1)), P(Math.min(x1, N - 1), Math.max(y0, 1)), P(Math.min(x1, N - 1), Math.min(y1, N - 1)), P(Math.max(x0, 1), Math.min(y1, N - 1))];
    g.fillStyle = hexA(z.c, z.id === curZone.id ? .26 : .12); g.strokeStyle = hexA(z.c, .9); g.lineWidth = 1.5; g.setLineDash([5, 4]);
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
  });
  plazaEggs.forEach(e => { const p = toPx(e.x, e.y); g.fillStyle = e.r === 'ur' ? '#ff6ec7' : '#ffd36b'; ell(g, p.x, p.y - 1, 2.6, 3.4); });
  bots.forEach(b => { const p = toPx(b.x, b.y); g.fillStyle = 'rgba(10,15,31,.55)'; ell(g, p.x, p.y, 3.6, 3.6); g.fillStyle = b.look.hair === '#2b2b3a' ? '#c9d2f5' : b.look.hair; ell(g, p.x, p.y, 2.6, 2.6); });
  const pp = toPx(player.x, player.y);
  g.strokeStyle = 'rgba(126,243,212,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(pp.x, pp.y, 7 + Math.sin(now * 4) * 1.5, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#0a0f1f'; ell(g, pp.x, pp.y, 4.6, 4.6); g.fillStyle = '#7ef3d4'; ell(g, pp.x, pp.y, 3.4, 3.4);
  return toPx;
}
function drawMinimap() {
  const cv = $('#minimap'); if (!cv || hudEl.hidden) return;
  drawMap(cv, cv.clientWidth, cv.clientHeight, { follow: true, zoom: .55 });
}

/* teleport */
function teleport(x, y) {
  if (tele) return;
  closeModal(); $('#people').hidden = true;
  const to = findSpawn(x, y);
  tele = { from: { x: player.x, y: player.y }, to, t0: now, moved: false };
  player.path = null; marker = null; player.moving = false;
}
function updateTele() {
  if (!tele) return;
  const k = now - tele.t0;
  if (!tele.moved && k >= .45) {
    player.x = tele.to.x; player.y = tele.to.y; tele.moved = true;
    const p = isoZ(player.x, player.y, heightAt(player.x, player.y) * LV); cam.x = p.x; cam.y = p.y - 20;
    const f = document.createElement('div'); f.className = 'tele-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 700);
  }
  if (k >= .95) tele = null;
}
function drawTeleFx(c) {
  if (!tele) return;
  const k = now - tele.t0, at = k < .45 ? tele.from : tele.to, f = k < .45 ? k / .45 : (k - .45) / .5, p = isoZ(at.x, at.y, heightAt(at.x, at.y) * LV);
  const beam = c.createLinearGradient(0, p.y - 110, 0, p.y);
  beam.addColorStop(0, 'rgba(126,243,212,0)'); beam.addColorStop(.6, `rgba(190,255,240,${.55 * (1 - Math.abs(f - .5))})`); beam.addColorStop(1, 'rgba(255,255,255,.0)');
  c.fillStyle = beam; c.fillRect(p.x - 16, p.y - 110, 32, 110);
  for (let i = 0; i < 3; i++) {
    const ff = (f + i * .25) % 1;
    c.strokeStyle = `rgba(126,243,212,${(1 - ff) * .9})`; c.lineWidth = 2;
    c.beginPath(); c.ellipse(p.x, p.y, 8 + ff * 26, 4 + ff * 13, 0, 0, Math.PI * 2); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.9)';
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + now * 3, rr2 = 14 + f * 10; ell(c, p.x + Math.cos(a) * rr2, p.y - 20 - f * 40 + Math.sin(a) * 6, 1.6, 1.6); }
}
const teleAlpha = () => { if (!tele) return 1; const k = now - tele.t0; return k < .45 ? 1 - k / .45 : Math.min(1, (k - .45) / .45); };

/* zone title */
function showZoneTitle(z) {
  const el = $('#zoneTitle');
  el.style.setProperty('--zc', z.c);
  el.querySelector('b').textContent = z.name; el.querySelector('small').textContent = z.desc;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  $('#zoneName').textContent = z.name; $('#miniLabel').textContent = z.name;
}
function checkZone() {
  const z = zoneAt(player.x, player.y);
  if (z.id !== curZone.id) { curZone = z; showZoneTitle(z); if ($('#people') && !$('#people').hidden) renderPeople(); }
}
function onEnterPlaza() { showZoneTitle(curZone); }

/* map window */
let mapTimer;
function openMap() {
  openModal({ title: 'Map', ic: 'map', wide: true, kind: 'map', body: `<div class="stack">
    <div class="map-wrap"><canvas id="mapCanvas"></canvas><div id="mapPins"></div></div>
    <div class="zone-list" id="zoneList"></div>
    <p class="tiny">Raw template: every location is an area of the plaza for now. Tap a pin or a card to teleport. Press M in the plaza to open the map.</p>
  </div>`, onMount: () => { renderMapWindow(); clearInterval(mapTimer); mapTimer = setInterval(() => { if (!modalEl || modalEl.dataset.kind !== 'map') return clearInterval(mapTimer); renderMapWindow(true); }, 400); } });
}
function renderMapWindow(dotsOnly) {
  const cv = $('#mapCanvas'); if (!cv) return;
  const w = cv.clientWidth, h = cv.clientHeight;
  const toPx = drawMap(cv, w, h, { zones: true });
  if (dotsOnly) return;
  const count = z => entities.filter(e => zoneAt(e.x, e.y).id === z.id).length;
  $('#mapPins').innerHTML = ZONES.map(z => { const p = toPx((z.r[0] + z.r[2]) / 2, (z.r[1] + z.r[3]) / 2); return `<button class="pin ${z.id === curZone.id ? 'here' : ''}" style="left:${p.x}px;top:${p.y}px;--zc:${z.c}" data-tp="${z.id}">${esc(z.name)}</button>`; }).join('');
  $('#zoneList').innerHTML = ZONES.map(z => `<div class="zcard" style="--zc:${z.c}">
      <h4><i></i>${esc(z.name)}</h4><p>${esc(z.desc)}</p>
      <div class="row" style="justify-content:space-between"><span class="tiny">${count(z)} here</span>${z.id === curZone.id ? '<span class="chip">You are here</span>' : `<button class="btn mint sm" data-tp="${z.id}">${icon('map')}Teleport</button>`}</div>
    </div>`).join('');
  document.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { const z = ZONES.find(x => x.id === b.dataset.tp); if (z.id === curZone.id) { closeModal(); return; } teleport(z.at[0], z.at[1]); });
}

/* people panel */
function renderPeople() {
  const el = $('#people'); if (!el) return;
  const list = [player, ...bots.slice().sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))];
  el.innerHTML = `<div class="lbl-sm" style="padding:4px 8px">In the plaza · ${entities.length}</div>` + list.map(e => {
    const z = zoneAt(e.x, e.y), you = e === player, dist = Math.round(Math.hypot(e.x - player.x, e.y - player.y));
    return `<div class="prow"><i style="background:${you ? 'var(--mint)' : e.look.hair}"></i><span style="min-width:0"><b>${esc(e.name)}${you ? ' (you)' : ''}</b><small>${esc(z.name)}${you ? '' : ` · ${dist} m`}</small></span>${you ? '' : `<button class="btn ghost sm" data-goto="${esc(e.name)}">Go</button>`}</div>`;
  }).join('') + `<p class="tiny" style="padding:4px 8px">Other players are demo bots for now.</p>`;
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const t = bots.find(x => x.name === b.dataset.goto); if (t) teleport(t.x, t.y + 1); });
}
setInterval(() => { const el = $('#people'); if (el && !el.hidden) renderPeople(); }, 1500);
$('#peopleBtn').onclick = () => { const el = $('#people'); el.hidden = !el.hidden; if (!el.hidden) renderPeople(); };
$('#mapBtn').onclick = openMap;
$('#minimapBtn').onclick = openMap;

/* input */
const keys = new Set();
const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
document.addEventListener('keydown', e => {
  if (titleOn && !pullEl) {
    if (e.key === 'Escape' && modalEl) closeModal();
    else if (!modalEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('#ttStart').click(); }
    return;
  }
  if (pullEl) {
    if (e.key === 'Escape') { if (pullState && pullState.phase === 'summary') closePull(); else showSummary(); }
    else if ((e.key === ' ' || e.key === 'Enter') && pullState && pullState.phase !== 'summary') { e.preventDefault(); tapPull(); }
    return;
  }
  if (e.key === 'Escape') {
    if (modalEl) { closeModal(); return; }
    if (smEl) { closeSummon(); return; }
    if (csEl) { if (csView) { csView = false; csEl.classList.remove('viewing'); } else closeCharacters(); return; }
    if (uiHidden) { setUiHidden(false); return; }
    if (!emotesEl.hidden) { emotesEl.hidden = true; return; }
    if (typing()) { document.activeElement.blur(); return; }
    setMenu(!menuOpen); return;
  }
  if (typing() || menuOpen || modalEl) return;
  if (e.key === 'Enter') { e.preventDefault(); $('#chatInput').focus(); return; }
  if (e.key.toLowerCase() === 'm') { openMap(); return; }
  keys.add(e.key.toLowerCase());
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

let W = 0, H = 0, dpr = 1, zoom = 1, marker = null, now = 0;
const cam = { x: iso(14, 14).x, y: iso(14, 14).y };
/* screen point → ground point; tries the terrace level first so clicks on it land on top */
function screenToTile(sx, sy) {
  const wx = (sx - W / 2) / zoom + cam.x, wy0 = (sy - H / 2) / zoom + cam.y;
  for (const lv of [1, 0]) {
    const wy = wy0 + lv * LV, a = wx / (TW / 2), b = wy / (TH / 2), x = (a + b) / 2, y = (b - a) / 2;
    if (!lv || heightAt(x, y) > .5) return { x, y };
  }
}
canvas.addEventListener('pointerdown', e => {
  if (menuOpen || modalEl || pullEl || tele) return;
  $('#people').hidden = true;
  emotesEl.hidden = true;
  const t = screenToTile(e.clientX, e.clientY);
  if (t.x < 0 || t.y < 0 || t.x >= N || t.y >= N) return;
  player.path = findPath(player.x, player.y, t.x, t.y); player.stuck = 0;
  marker = { x: t.x, y: t.y, t: now };
});

function resize() {
  W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  zoom = clamp(Math.min(H / 560, W / 420), 1, 2.1);
}
addEventListener('resize', resize); resize();

/* update */
function stepEntity(e, vx, vy, dt) {
  const len = Math.hypot(vx, vy);
  if (len < .001) { e.moving = false; return false; }
  vx /= len; vy /= len;
  const sp = 3.3 * dt, nx = e.x + vx * sp, ny = e.y + vy * sp;
  let moved = false;
  if (canStand(e.x, e.y, nx, e.y)) { e.x = nx; moved = true; }
  if (canStand(e.x, e.y, e.x, ny)) { e.y = ny; moved = true; }
  const sxv = vx - vy, syv = vx + vy;
  if (Math.abs(syv) > Math.abs(sxv) * .35) e.dir = syv < 0 ? 'up' : 'down';
  e.ex = clamp(sxv * 1.6, -1.8, 1.8);
  e.moving = moved; if (moved) e.phase += dt * 11;
  return moved;
}
/* walk along e.path, skipping corners when the straight line is clear; returns false when finished */
function followPath(e, dt) {
  if (!e.path || !e.path.length) { e.path = null; e.moving = false; return false; }
  if (e.path.length > 1 && lineClear(e.x, e.y, e.path[1].x, e.path[1].y)) e.path.shift();
  const tg = e.path[0], dx = tg.x - e.x, dy = tg.y - e.y;
  if (Math.hypot(dx, dy) < .1) { e.path.shift(); if (!e.path.length) { e.path = null; e.moving = false; return false; } return true; }
  if (!stepEntity(e, dx, dy, dt)) { e.stuck += dt; if (e.stuck > .5) { e.path = null; e.moving = false; return false; } }
  else e.stuck = 0;
  return true;
}
function update(dt) {
  let kx = 0, ky = 0;
  updateTele();
  if (!menuOpen && !modalEl && !typing() && !tele) {
    if (keys.has('w') || keys.has('arrowup')) { kx -= 1; ky -= 1; }
    if (keys.has('s') || keys.has('arrowdown')) { kx += 1; ky += 1; }
    if (keys.has('a') || keys.has('arrowleft')) { kx -= 1; ky += 1; }
    if (keys.has('d') || keys.has('arrowright')) { kx += 1; ky -= 1; }
  }
  if (kx || ky) { player.path = null; marker = null; stepEntity(player, kx, ky, dt); }
  else if (player.path) followPath(player, dt);
  else player.moving = false;
  checkZone();
  bots.forEach(b => {
    if (b.idle > 0) { b.idle -= dt; b.moving = false; }
    else if (!b.path) {
      const t = randomWalkableNear(b.x, b.y, 7);
      b.path = t ? findPath(b.x, b.y, t.x, t.y) : null; b.stuck = 0;
      if (!b.path || !b.path.length) { b.path = null; b.idle = 1; }
    } else if (!followPath(b, dt * .8)) { b.idle = 1 + Math.random() * 4; if (Math.random() < .5) b.dir = 'down'; b.ex = 0; }
    b.nextTalk -= dt;
    if (b.nextTalk <= 0) { b.nextTalk = 8 + Math.random() * 16; if (Math.random() < .6) say(b, pick(BOT_LINES)); else emote(b, pick(EMOTES)); }
  });
  entities.forEach(e => { e.z = heightAt(e.x, e.y) * LV; });
  updateFireworks(dt); updateLeaves(dt); updateEggs(dt);
  const p = isoZ(player.x, player.y, player.z), k = 1 - Math.pow(.002, dt);
  cam.x += (p.x - cam.x) * k; cam.y += (p.y - 20 - cam.y) * k;
}

/* fireworks: rockets from the crate, the stage and behind the rooftops; a spark fountain on the crate */
const rockets = [], sparks = [], flashes = [];
const FW_PAL = [['#ffd36b', '#fff1b0', '#ffb347'], ['#ff8a5c', '#ffd36b', '#fff1b0'], ['#ff6ec7', '#ffd6f0', '#c58bff'], ['#5ff2dd', '#fff1b0', '#ffd36b'], ['#ffd36b', '#ff6f6f', '#fff1b0']];
let fwTimer = 1;
function burst(r) {
  const n = 90 + Math.floor(Math.random() * 40), sp = 140 + Math.random() * 70;
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2 + Math.random() * .08, v = sp * (.78 + Math.random() * .3);
    sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1 + Math.random() * .6, max: 1.7, col: rpick(r.pal), s: 2.3 });
  }
  for (let k = 0; k < n / 3; k++) {
    const a = Math.random() * Math.PI * 2, v = sp * .4 * Math.random();
    sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .7 + Math.random() * .4, max: 1.1, col: '#fff6d8', s: 1.3 });
  }
  flashes.push({ x: r.x, y: r.y, life: .45, max: .45 });
  if (sparks.length > 1600) sparks.splice(0, sparks.length - 1600);
}
function updateFireworks(dt) {
  fwTimer -= dt;
  if (fwTimer <= 0) {
    fwTimer = .7 + Math.random() * 1.6;
    // from the crate, the stage drum, or somewhere around the player so bursts stay in view
    const roll = Math.random(), src = roll < .2 ? [14, 14, 36] : roll < .35 ? [24, 24, 40] : [clamp(player.x + (Math.random() - .5) * 14, 1, N - 2), clamp(player.y + (Math.random() - .5) * 14, 1, N - 2), 60];
    const p = iso(src[0], src[1]);
    rockets.push({ x: p.x, y: p.y - src[2], top: p.y - src[2] - (130 + Math.random() * 130), vy: -340, dx: (Math.random() - .5) * 30, pal: rpick(FW_PAL) });
  }
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.y += r.vy * dt; r.x += r.dx * dt;
    if (Math.random() < .7) sparks.push({ x: r.x, y: r.y, vx: (Math.random() - .5) * 20, vy: 30, life: .35, max: .35, col: '#ffd9a0', s: 1.2 });
    if (r.y <= r.top) { burst(r); rockets.splice(i, 1); }
  }
  const cp = iso(14, 14);
  for (let k = Math.random() < 50 * dt % 1 ? 1 : 0, n = Math.floor(50 * dt) + k; n > 0; n--)
    sparks.push({ x: cp.x + (Math.random() - .5) * 24, y: cp.y - 40, vx: (Math.random() - .5) * 60, vy: -(80 + Math.random() * 110), life: .8, max: .8, col: rpick(['#ffd36b', '#fff1b0', '#ffb347']), s: 1.3 });
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.life -= dt;
    if (p.life <= 0) { sparks.splice(i, 1); continue; }
    p.vx *= .985; p.vy = p.vy * .985 + 55 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
}
function drawFireworks(c) {
  flashes.forEach(f => glow(c, f.x, f.y, 110, f.life / f.max * .7));
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  sparks.forEach(p => {
    let a = Math.min(1, p.life / p.max * 1.6); if (p.life < .35 && Math.random() < .4) a *= .3;
    c.globalAlpha = a; c.strokeStyle = p.col; c.lineWidth = p.s;
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .06, p.y - p.vy * .06); c.stroke();
    if (p.s > 2) { c.fillStyle = '#fff8e0'; ell(c, p.x, p.y, 1.1, 1.1); }
  });
  c.globalAlpha = 1; c.fillStyle = '#fff3c8'; rockets.forEach(r => ell(c, r.x, r.y, 1.8, 1.8));
  c.globalCompositeOperation = 'source-over';
}

/* drifting maple leaves and confetti (screen space) */
const newLeaf = anyY => ({ x: Math.random(), y: anyY ? Math.random() : -.05, vx: (Math.random() - .3) * .02, vy: .025 + Math.random() * .035, r: Math.random() * 6, vr: (Math.random() - .5) * 3, s: 2.5 + Math.random() * 3, c: rpick(['#ff7a3d', '#ffb347', '#e8442f', '#ffd36b', '#ff6f91']), conf: Math.random() < .45, ph: Math.random() * 6 });
const leaves = Array.from({ length: 28 }, () => newLeaf(true));
function updateLeaves(dt) {
  leaves.forEach((l, i) => {
    l.y += l.vy * dt; l.x += (l.vx + Math.sin(now + l.ph) * .01) * dt; l.r += l.vr * dt;
    if (l.y > 1.05 || l.x < -.05 || l.x > 1.05) leaves[i] = newLeaf(false);
  });
}
function drawLeaves(c) {
  c.globalAlpha = .8;
  leaves.forEach(l => {
    c.save(); c.translate(l.x * W, l.y * H); c.rotate(l.r); c.scale(1, Math.cos(now * 3 + l.ph)); c.fillStyle = l.c;
    if (l.conf) c.fillRect(-l.s / 2, -l.s / 4, l.s, l.s / 2); else { c.beginPath(); c.ellipse(0, 0, l.s, l.s * .55, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
  });
  c.globalAlpha = 1;
}

/* catchable eggs in the plaza */
const plazaEggs = [];
let eggTimer = 45;
function spawnEgg() { const p = randomWalkableNear(14, 14, 12); if (p) plazaEggs.push({ x: p.x, y: p.y, r: Math.random() < .15 ? 'ur' : 'ssr', ph: Math.random() * 6 }); }
spawnEgg(); spawnEgg();
function updateEggs(dt) {
  eggTimer -= dt;
  if (eggTimer <= 0) { eggTimer = 60 + Math.random() * 90; if (plazaEggs.length < 3) spawnEgg(); }
  if (menuOpen || tele) return;
  for (let i = plazaEggs.length - 1; i >= 0; i--) {
    const g = plazaEggs[i], d = Math.hypot(g.x - player.x, g.y - player.y);
    if (d > 1.4) { g.warned = false; continue; }
    if (d > .65 || g.warned) continue;
    if (spendStamina(EGG_STAMINA)) {
      plazaEggs.splice(i, 1); S.pets.eggs.push(g.r); persist(); renderMenu();
      toast(`Caught a ${EGG[g.r].name}! −${EGG_STAMINA} stamina. Hatch it in Pets.`); logChat('', `You caught a ${EGG[g.r].name}.`, '', true);
    } else { g.warned = true; toast(`Catching an egg costs ${EGG_STAMINA} stamina. You have ${stamina()}.`); }
  }
}
function drawPlazaEgg(c, g, t) {
  const b = Math.sin(t * 2.5 + g.ph) * 2, p = isoZ(g.x, g.y, heightAt(g.x, g.y) * LV), ur = g.r === 'ur';
  glow(c, p.x, p.y - 12 + b, 34, .6, ur ? GLOW_P : GLOW);
  c.fillStyle = 'rgba(20,10,20,.3)'; ell(c, p.x, p.y, 7, 2.8);
  c.save(); c.translate(p.x, p.y - 12 + b); c.rotate(Math.sin(t * 3 + g.ph) * .12);
  const gr = c.createLinearGradient(-7, -9, 7, 9);
  if (ur) { gr.addColorStop(0, '#c58bff'); gr.addColorStop(.5, '#ff6ec7'); gr.addColorStop(1, '#3ee6d0'); } else { gr.addColorStop(0, '#fffaf0'); gr.addColorStop(1, '#f3c58a'); }
  c.fillStyle = gr; c.strokeStyle = OUTLINE; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -10); c.bezierCurveTo(6, -10, 8, 1, 7, 4); c.bezierCurveTo(6, 9, -6, 9, -7, 4); c.bezierCurveTo(-8, 1, -6, -10, 0, -10); c.fill(); c.stroke();
  c.fillStyle = ur ? 'rgba(255,255,255,.9)' : '#ff8a2a';
  if (ur) { ell(c, -2.5, -4, 1.6, 2.2); } else { ell(c, -2, -3, 1.6, 1.6); ell(c, 3, 1, 1.4, 1.4); ell(c, -1, 4, 1.1, 1.1); }
  c.restore();
}
PAINT.pegg = (c, o, t) => drawPlazaEgg(c, o.g, t);

/* lantern strings hang above everyone, so they draw after the sorted pass */
function drawStrings(c) {
  strings.forEach((s, si) => {
    const a = isoZ(s.ax, s.ay, heightAt(s.ax, s.ay) * LV + s.ah), b = isoZ(s.bx, s.by, heightAt(s.bx, s.by) * LV + s.bh);
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 22 + Math.hypot(b.x - a.x, b.y - a.y) * .08 };
    c.strokeStyle = 'rgba(40,20,20,.85)'; c.lineWidth = 1; c.beginPath(); c.moveTo(a.x, a.y); c.quadraticCurveTo(m.x, m.y, b.x, b.y); c.stroke();
    for (let i = 1; i <= s.n; i++) {
      const f = i / (s.n + 1), u = 1 - f, qx = u * u * a.x + 2 * u * f * m.x + f * f * b.x, qy = u * u * a.y + 2 * u * f * m.y + f * f * b.y;
      const sway = Math.sin(now * 1.6 + i + si) * 1.2;
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + sway, qy + 5); c.stroke();
      drawLantern(c, qx + sway, qy + 10, 4.6, now + i);
    }
  });
}

/* render */
const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .7, r: Math.random() * 1.3 + .3, p: Math.random() * 6 }));
function drawBubble(c, x, y, text) {
  c.font = '800 11px Nunito, system-ui, sans-serif';
  const words = text.split(' '), lines = [];
  let cur = '';
  words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (c.measureText(test).width > 140 && cur) { lines.push(cur); cur = w; } else cur = test; });
  if (cur) lines.push(cur);
  if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 18) + '…'; }
  const w = Math.max(...lines.map(l => c.measureText(l).width)) + 16, h = lines.length * 14 + 8;
  c.fillStyle = 'rgba(255,255,255,.96)'; rr(c, x - w / 2, y - h, w, h, 8); c.fill();
  poly(c, [{ x: x - 5, y: y - 1 }, { x: x + 5, y: y - 1 }, { x, y: y + 5 }]);
  c.fillStyle = '#1b2240'; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, x, y - h + 11 + i * 14));
}
function render() {
  const c = ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = c.createRadialGradient(W / 2, H * .45, 40, W / 2, H * .5, Math.max(W, H) * .85);
  bg.addColorStop(0, '#3a2440'); bg.addColorStop(.5, '#1d1328'); bg.addColorStop(1, '#0b0712');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  stars.forEach(s => { c.fillStyle = `rgba(255,236,220,${.25 + Math.sin(now * 1.5 + s.p) * .2})`; ell(c, s.x * W, s.y * H, s.r, s.r); });

  c.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - cam.x * zoom), dpr * (H / 2 - cam.y * zoom));
  c.drawImage(ground, -OX, -OY, ground.width / GS, ground.height / GS);
  if (marker && now - marker.t < .8) {
    const p = isoZ(marker.x, marker.y, heightAt(marker.x, marker.y) * LV), f = (now - marker.t) / .8;
    c.strokeStyle = `rgba(126,243,212,${1 - f})`; c.lineWidth = 2;
    c.beginPath(); c.ellipse(p.x, p.y, 6 + f * 10, 3 + f * 5, 0, 0, Math.PI * 2); c.stroke();
  }
  const list = objects.slice();
  entities.forEach(e => list.push({ kind: 'ent', e, depth: e.x + e.y }));
  plazaEggs.forEach(g => list.push({ kind: 'pegg', g, depth: g.x + g.y }));
  list.sort((a, b) => a.depth - b.depth);
  list.forEach(o => {
    if (o.kind === 'ent') {
      const e = o.e, p = isoZ(e.x, e.y, e.z);
      if (e === player) { c.strokeStyle = '#7ef3d4'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y, 13, 5.5, 0, 0, Math.PI * 2); c.stroke(); }
      const al = e === player ? teleAlpha() : 1;
      if (al < 1) { c.save(); c.globalAlpha = al; }
      drawChibi(c, p.x, p.y, e.look, { s: CHIBI_S * (al < 1 ? .55 + .45 * al : 1), moving: e.moving, phase: e.phase, dir: e.dir, ex: e.ex, t: now + e.x });
      if (al < 1) c.restore();
    } else if (o.z) { c.save(); c.translate(0, -o.z * LV); PAINT[o.kind](c, o, now); c.restore(); }
    else PAINT[o.kind](c, o, now);
  });
  drawTeleFx(c);
  drawStrings(c);
  drawFireworks(c);
  // overlay pass: names, bubbles, emotes
  entities.forEach(e => {
    const p = isoZ(e.x, e.y, e.z);
    if (S.settings.names) {
      c.font = '700 9px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.lineWidth = 3; c.strokeStyle = 'rgba(10,15,31,.6)'; c.strokeText(e.name, p.x, p.y + 5);
      c.fillStyle = e === player ? '#7ef3d4' : '#ffffff'; c.fillText(e.name, p.x, p.y + 5);
    }
    const top = p.y - (e.look.style === 2 ? 62 : e.look.style === 4 ? 60 : 55) * CHIBI_S;
    if (e.bubble && e.bubble.until > now) drawBubble(c, p.x, top, e.bubble.text);
    else if (e.emote && e.emote.until > now) {
      const by = top - Math.sin(Math.min(1, (e.emote.until - now) * 2) * Math.PI / 2) * 2;
      c.fillStyle = 'rgba(255,255,255,.96)'; rr(c, p.x - 13, by - 26, 26, 24, 8); c.fill();
      poly(c, [{ x: p.x - 4, y: by - 3 }, { x: p.x + 4, y: by - 3 }, { x: p.x, y: by + 3 }]);
      c.font = '15px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(e.emote.e, p.x, by - 13.5);
    }
  });
  // screen space: leaves and confetti, then a warm vignette
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawLeaves(c);
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
  vg.addColorStop(0, 'rgba(10,5,15,0)'); vg.addColorStop(1, 'rgba(10,5,15,.5)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
}

let last = performance.now(), frameN = 0;
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t; now = t / 1000;
  update(dt);
  frameN++;
  // the wallpaper covers the world while the menu is open, so skip drawing it then
  if (!menuOpen && !modalEl && !pullEl) { render(); if (frameN % 3 === 0) drawMinimap(); }
  requestAnimationFrame(loop);
}
