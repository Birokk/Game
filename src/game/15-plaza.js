/* =========================================================
   WORLD — a small hand-painted valley seen from a high camera, like the owner's references:
   sandy paths wind through lush bushes and trees, thatched houses with warm windows, fireflies, and small
   big-headed characters with soft round shadows. Only the paths are walkable; the map shows just the paths and
   icons of the important places. Snowy peaks close the valley to the north, dense forest everywhere else, and the
   camera never leaves the map, so the edge of the world never shows.
   Everything is painted procedurally once (ground, sprites) and drawn smooth at full resolution.
   ========================================================= */
const canvas = $('#world'), ctx = canvas.getContext('2d');
const MW = 56, MH = 42, N = MW, TS = 32;            // map size in tiles (N is kept for the multiplayer bounds), tile = 32 world px
const T = { WILD: 0, PATH: 1, WATER: 2, BRIDGE: 3, DOCK: 4, STAIRS: 5, MOUNT: 6 };
const tiles = new Uint8Array(MW * MH), blocked = new Uint8Array(MW * MH);
const idx = (x, y) => y * MW + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const tileAt = (x, y) => inMap(x, y) ? tiles[idx(x, y)] : T.MOUNT;
const heightAt = () => 0;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(21);
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const objects = [];      // things that stand on the ground, drawn back to front by their base line
const smokers = [];      // the campfire and chimneys puff smoke
const glowsAt = [];      // warm light spots (windows, lamps, fire) for the light pass
const MOUNT_ROWS = 5;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const walkT = t => t === T.PATH || t === T.BRIDGE || t === T.DOCK || t === T.STAIRS;

/* ---------- layout: a ring of paths around a wooded hill, with branches to every place ---------- */
const RING = [[11, 22], [15, 14], [22, 11.5], [30, 11.5], [39, 12], [44.5, 12.5], [46.5, 18.5], [44, 27], [38, 32], [28, 34], [19, 32], [13, 27], [11, 22]];
const BRANCHES = [
  [[30, 11.5], [31.5, 9.5]],                          // up to the chief's house
  [[45, 21], [50, 20], [52.5, 19.6]],                 // east to Lathel's house
  [[44.5, 21], [40, 19.4]],                           // the tavern porch, off the square
  [[11, 22], [3, 22.5]],                              // west: the forest gate
  [[19, 32], [15, 31.5]],                             // down to the lake shore
  [[15, 14], [12, 10], [10.5, 7.6]],                  // stairs up to the overlook
  [[44.5, 28.5], [48.5, 30.8]]                        // the cottage by the south road
];
const PLAZAS = [{ x: 11, y: 22.5, rx: 4.2, ry: 3.2 }, { x: 45.5, y: 22.5, rx: 4.4, ry: 3.4 }, { x: 10.5, y: 7.2, rx: 2.4, ry: 1.4 }];
const RIVER = [[35, 4], [36, 9], [35.5, 14], [33, 18], [31, 23], [30.5, 29], [29.5, 34.5], [26, 37], [20, 36.5]];
const LAKE = { x: 12.5, y: 35.5, rx: 8.5, ry: 4.4 };
const HOUSES = [
  { id: 'chief', x: 28, y: 5, w: 7, d: 4, name: "Village Chief's House" },
  { id: 'tavern', x: 36, y: 14, w: 7, d: 4, name: 'Tavern', sign: true },
  { id: 'lathel', x: 50, y: 15, w: 5, d: 4, name: "Lathel's House" },
  { id: 'south', x: 46, y: 27, w: 5, d: 3, name: 'Cottage' }
];
function carve(pts, r, t, onlyOver) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
    for (let k = 0; k <= n; k++) {
      const cx = ax + (bx - ax) * k / n, cy = ay + (by - ay) * k / n;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if (inMap(x, y) && Math.hypot(x + .5 - cx, y + .5 - cy) <= r && (onlyOver === undefined || tiles[idx(x, y)] === onlyOver)) tiles[idx(x, y)] = t;
    }
  }
}
function put(kind, x, y, o = {}) { const ob = { kind, x, y, ...o }; objects.push(ob); return ob; }
function buildMap() {
  tiles.fill(T.WILD);
  for (let y = 0; y < MOUNT_ROWS; y++) for (let x = 0; x < MW; x++) tiles[idx(x, y)] = T.MOUNT;
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (Math.hypot((x + .5 - LAKE.x) / LAKE.rx, (y + .5 - LAKE.y) / LAKE.ry) < 1) tiles[idx(x, y)] = T.WATER;
  carve(RIVER, 1.1, T.WATER, T.WILD);
  carve(RING, 1.25, T.PATH); BRANCHES.forEach(b => carve(b, 1.05, T.PATH));
  PLAZAS.forEach(p => { for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (Math.hypot((x + .5 - p.x) / p.rx, (y + .5 - p.y) / p.ry) < 1) tiles[idx(x, y)] = T.PATH; });
  // where paths cross the river they become bridges; the lake gets a dock; the overlook is up a stair
  carve(RIVER, 1.1, T.BRIDGE, T.PATH);
  for (let y = 31; y < 36; y++) for (let x = 13; x < 15; x++) if (tiles[idx(x, y)] === T.WATER || y < 33) tiles[idx(x, y)] = T.DOCK;
  carve([[13.5, 11.5], [11.2, 8.8]], .9, T.STAIRS, T.PATH);
  for (let i = 0; i < MW * MH; i++) blocked[i] = walkT(tiles[i]) ? 0 : 1;
  // houses sit just above their path; the porch step is walkable
  HOUSES.forEach(h => {
    for (let y = h.y; y < h.y + h.d; y++) for (let x = h.x; x < h.x + h.w; x++) if (inMap(x, y)) { blocked[idx(x, y)] = 1; if (tiles[idx(x, y)] === T.PATH) tiles[idx(x, y)] = T.WILD; }
    const o = put('house', h.x + h.w / 2, h.y + h.d, { h, spr: houseSprite(h) });
    if (h.id !== 'lathel') smokers.push({ x: (h.x + h.w * .78) * TS, y: (h.y + h.d) * TS - o.spr.height * .9, t: rnd() * 2 });
  });
  // camp: tents, the fire, logs; village props
  const camp = (kind, x, y, o) => { const ob = put(kind, x, y, o); if (!o || !o.walk) blocked[idx(Math.floor(x), Math.floor(y - .3))] = 1; return ob; };
  camp('tent', 8.2, 20.4, { col: '#b8743f' }); camp('tent', 13.8, 19.8, { col: '#7a8a52' });
  camp('fire', 11.2, 23); smokers.push({ x: 11.2 * TS, y: 23 * TS - 20, t: 0, fire: true }); glowsAt.push({ x: 11.2, y: 22.8, r: 4.2, c: '255,170,80', fire: true });
  camp('log', 8.6, 24.2); camp('log', 13.9, 24.5); camp('crate', 15, 21.2); camp('barrel', 7.2, 22.2);
  camp('lamp', 15.6, 25.4); glowsAt.push({ x: 15.6, y: 24.3, r: 2.2, c: '255,210,120' });
  camp('well', 45.6, 22.2); camp('board', 48.6, 24.6); camp('lamp', 42, 25.6); glowsAt.push({ x: 42, y: 24.5, r: 2.2, c: '255,210,120' });
  camp('lamp', 48.8, 19.6); glowsAt.push({ x: 48.8, y: 18.5, r: 2.2, c: '255,210,120' });
  camp('barrel', 42.3, 18.4); camp('barrel', 43.1, 18.6); camp('hay', 50.6, 25.6); camp('crate', 41.8, 21.2);
  camp('bench', 10.4, 7.6); camp('lamp', 33, 10.6); glowsAt.push({ x: 33, y: 9.5, r: 2.2, c: '255,210,120' });
  camp('sign', 4.6, 21.3); camp('gate', 2.6, 22.9, { walk: true });
  camp('boat', 16.6, 34.6, { walk: true });
  // fences along a few path edges
  [[51, 31], [52, 31.1], [53, 31.2]].forEach(([x, y]) => camp('fence', x + .5, y, { walk: true }));
  // vegetation everywhere that isn't path, water or house: trees further away, bushes along the path edges
  const nearPath = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (walkT(tileAt(x + i, y + j))) return true; return false; };
  for (let y = MOUNT_ROWS; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, y)]; if (t !== T.WILD || HOUSES.some(h => x >= h.x - 1 && x < h.x + h.w + 1 && y >= h.y - 1 && y < h.y + h.d + 1)) continue;
    if (nearPath(x, y, 1)) { if (hash(x, y, 1) < .3) put('bush', x + .2 + hash(x, y, 2) * .6, y + .6 + hash(x, y, 3) * .3, { v: Math.floor(hash(x, y, 4) * 4), s: .8 + hash(x, y, 5) * .5 }); }
    else if (nearPath(x, y, 2)) { if (hash(x, y, 14) < .12) put('bush', x + .5, y + .8, { v: Math.floor(hash(x, y, 12) * 4), s: .9 + hash(x, y, 13) * .3 }); }
    else if ((x + y) % 2 === 0 && hash(x, y, 6) < (nearPath(x, y, 3) ? .4 : .85)) put(hash(x, y, 7) < .3 ? 'pine' : 'tree', x + .5 + (hash(x, y, 8) - .5) * .8, y + .9, { v: Math.floor(hash(x, y, 9) * 4), s: .75 + hash(x, y, 10) * .35 });
    else if (hash(x, y, 11) < .25) put('bush', x + .5, y + .8, { v: Math.floor(hash(x, y, 12) * 4), s: 1 + hash(x, y, 13) * .4 });
  }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x < 1 || x >= MW - 1 || y >= MH - 1) blocked[idx(x, y)] = 1;
}

/* ---------- painting helpers ---------- */
const WPAL = { gD: '#2e3f24', g: '#4d6534', gL: '#7c9550', gH: '#b4c27e', wood: '#5b4330', woodD: '#3b2b1e', woodL: '#8a6b4a', straw: '#c8b386', strawD: '#8f7a55', strawL: '#e6d6ab' };
function softDot(g, x, y, r, col, a = 1) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
/* a clump of leaves: overlapping round blobs lit from the top-left, with leaf flecks */
function leafBlob(g, x, y, r, seed, pal = [WPAL.gD, WPAL.g, WPAL.gL, WPAL.gH]) {
  const gr = g.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r);
  gr.addColorStop(0, pal[2]); gr.addColorStop(.55, pal[1]); gr.addColorStop(1, pal[0]);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  for (let k = 0; k < r * 1.6; k++) {
    const a = hash(seed, k) * 6.28, d = Math.sqrt(hash(k, seed, 2)) * r * .9, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * .9;
    const lit = (lx - x) + (ly - y) < -r * .2;
    g.fillStyle = lit ? `rgba(196,210,140,${.35 + hash(seed, k, 3) * .3})` : `rgba(28,40,22,${.25 + hash(seed, k, 4) * .3})`;
    g.beginPath(); g.ellipse(lx, ly, r * .16, r * .09, a, 0, 7); g.fill();
  }
}
/* ---------- sprites, painted once ---------- */
const WSPR = {};
function treeSprite(v) {
  const c = mk(150, 170), g = c.getContext('2d');
  softDot(g, 75, 158, 52, 'rgba(10,18,8,A)', .45);
  g.fillStyle = WPAL.woodD; g.beginPath(); g.moveTo(68, 160); g.lineTo(70, 110); g.lineTo(82, 110); g.lineTo(84, 160); g.fill();
  g.fillStyle = WPAL.wood; g.fillRect(73, 112, 5, 46);
  const blobs = [[75, 60, 44], [42, 82, 30], [108, 82, 30], [75, 100, 34], [52, 46, 26], [100, 46, 26], [75, 28, 22]];
  blobs.forEach(([x, y, r], i) => leafBlob(g, x + (hash(v, i) - .5) * 10, y + (hash(i, v) - .5) * 8, r, v * 31 + i));
  return c;
}
function pineSprite(v) {
  const c = mk(110, 170), g = c.getContext('2d');
  softDot(g, 55, 160, 40, 'rgba(10,18,8,A)', .45);
  g.fillStyle = WPAL.woodD; g.fillRect(50, 130, 10, 32);
  for (let i = 0; i < 5; i++) {
    const top = 10 + i * 24, w = 18 + i * 9, y2 = top + 42;
    const gr = g.createLinearGradient(55 - w, top, 55 + w, y2); gr.addColorStop(0, '#5e7a45'); gr.addColorStop(.5, '#3c5530'); gr.addColorStop(1, '#22331c');
    g.fillStyle = gr; g.beginPath(); g.moveTo(55, top); g.quadraticCurveTo(55 + w * .5, top + 20, 55 + w, y2); g.quadraticCurveTo(55, y2 - 8, 55 - w, y2); g.quadraticCurveTo(55 - w * .5, top + 20, 55, top); g.fill();
    for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(150,175,110,${.25 + hash(v, i * 10 + k) * .25})`; g.lineWidth = 1.5; const sx = 55 - w * .7 + hash(i, k, v) * w * .8, sy = top + 14 + hash(k, i) * 22; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx - 6, sy + 6); g.stroke(); }
  }
  return c;
}
function bushSprite(v) {
  const c = mk(90, 70), g = c.getContext('2d');
  softDot(g, 45, 58, 34, 'rgba(10,18,8,A)', .4);
  const pals = [[WPAL.gD, WPAL.g, WPAL.gL], ['#2b3b22', '#56703a', '#8ba35c'], ['#33432a', '#5d6e3e', '#93a064'], ['#2a3a26', '#4a6640', '#77965e']];
  [[30, 40, 18], [58, 40, 18], [44, 30, 20], [44, 46, 16]].forEach(([x, y, r], i) => leafBlob(g, x + (hash(v, i) - .5) * 8, y, r, v * 17 + i, pals[v]));
  if (v === 1) for (let k = 0; k < 6; k++) { g.fillStyle = '#e8d6a0'; g.beginPath(); g.arc(28 + hash(k, 1) * 34, 26 + hash(1, k) * 22, 1.8, 0, 7); g.fill(); }
  if (v === 3) for (let k = 0; k < 5; k++) { g.fillStyle = '#c96a6a'; g.beginPath(); g.arc(28 + hash(k, 3) * 34, 28 + hash(3, k) * 20, 2, 0, 7); g.fill(); }
  return c;
}
/* thatched house: a big straw roof with rows of strands, dark plank walls, glowing windows and a porch */
function houseSprite(h) {
  const W = h.w * TS + 30, roofH = h.d * TS * .95 + 30, wallH = 46, H = roofH + wallH + 22, c = mk(W, H), g = c.getContext('2d');
  const left = 15, right = W - 15, wallTop = roofH - 6, base = wallTop + wallH;
  softDot(g, W / 2, base + 6, W * .55, 'rgba(10,15,8,A)', .5);
  // walls
  const wg = g.createLinearGradient(0, wallTop, 0, base); wg.addColorStop(0, '#3d2d20'); wg.addColorStop(1, WPAL.wood);
  g.fillStyle = wg; g.fillRect(left + 6, wallTop, right - left - 12, wallH);
  g.strokeStyle = 'rgba(25,16,10,.55)'; g.lineWidth = 1;
  for (let x = left + 12; x < right - 8; x += 9) { g.beginPath(); g.moveTo(x, wallTop + 4); g.lineTo(x, base); g.stroke(); }
  g.fillStyle = WPAL.woodD; g.fillRect(left + 4, wallTop, 6, wallH); g.fillRect(right - 10, wallTop, 6, wallH);
  // windows with warm light
  const wins = h.w >= 6 ? [left + 22, right - 44] : [left + 16];
  wins.forEach(x => {
    softDot(g, x + 11, wallTop + 22, 26, 'rgba(255,200,110,A)', .45);
    g.fillStyle = '#2a1d14'; g.fillRect(x - 2, wallTop + 10, 26, 22);
    const lg = g.createLinearGradient(0, wallTop + 12, 0, wallTop + 30); lg.addColorStop(0, '#ffe7a6'); lg.addColorStop(1, '#ffb44e');
    g.fillStyle = lg; g.fillRect(x, wallTop + 12, 22, 18); g.fillStyle = '#2a1d14'; g.fillRect(x + 10, wallTop + 12, 2, 18); g.fillRect(x, wallTop + 20, 22, 2);
  });
  // door with a light inside and a porch with steps
  const dx = (h.w >= 6 ? W / 2 + 6 : right - 40);
  softDot(g, dx + 10, wallTop + 30, 30, 'rgba(255,190,100,A)', .4);
  g.fillStyle = '#2a1d14'; g.fillRect(dx - 2, wallTop + 6, 26, wallH - 4); g.fillStyle = '#c98a45'; g.fillRect(dx, wallTop + 8, 22, wallH - 6);
  g.fillStyle = 'rgba(90,50,20,.6)'; g.fillRect(dx + 10, wallTop + 8, 2, wallH - 6);
  for (let s = 0; s < 3; s++) { g.fillStyle = s % 2 ? '#a07a52' : '#b8916a'; g.fillRect(dx - 10 - s * 3, base + s * 6, 42 + s * 6, 6); g.fillStyle = 'rgba(40,25,15,.5)'; g.fillRect(dx - 10 - s * 3, base + s * 6 + 5, 42 + s * 6, 1); }
  if (h.sign) { g.fillStyle = WPAL.woodD; g.fillRect(dx - 26, wallTop + 2, 3, 14); g.fillStyle = '#8a6b4a'; g.fillRect(dx - 40, wallTop + 14, 26, 16); g.fillStyle = '#f2d77a'; g.fillRect(dx - 34, wallTop + 18, 10, 9); g.fillStyle = '#fff6d8'; g.fillRect(dx - 34, wallTop + 18, 10, 3); g.strokeStyle = '#f2d77a'; g.lineWidth = 2; g.beginPath(); g.arc(dx - 22, wallTop + 22, 3, -1.4, 1.4); g.stroke(); }
  // thatched roof: rounded slab with a ridge, rows of straw strands and a heavy eave
  const roofTop = 6, eave = roofH + 4;
  const rg = g.createLinearGradient(0, roofTop, 0, eave); rg.addColorStop(0, WPAL.strawL); rg.addColorStop(.6, WPAL.straw); rg.addColorStop(1, WPAL.strawD);
  g.fillStyle = rg; g.beginPath();
  g.moveTo(left - 8, eave); g.quadraticCurveTo(left - 2, roofTop + 20, left + 24, roofTop + 4); g.lineTo(right - 24, roofTop + 4); g.quadraticCurveTo(right + 2, roofTop + 20, right + 8, eave);
  g.quadraticCurveTo(W / 2, eave + 10, left - 8, eave); g.fill();
  for (let row = 0; row < 7; row++) {
    const y = roofTop + 12 + row * (eave - roofTop - 12) / 7;
    for (let x = left; x < right; x += 5) {
      const len = 9 + hash(x, row, h.w) * 8, sx = x + hash(row, x) * 4;
      g.strokeStyle = hash(x, row, 7) < .5 ? 'rgba(110,88,55,.55)' : 'rgba(240,226,180,.45)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + (sx - W / 2) * .03, y + len); g.stroke();
    }
    g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(left, y + 12); g.quadraticCurveTo(W / 2, y + 16, right, y + 12); g.stroke();
  }
  g.strokeStyle = 'rgba(70,52,30,.75)'; g.lineWidth = 5; g.beginPath(); g.moveTo(left - 6, eave); g.quadraticCurveTo(W / 2, eave + 10, right + 6, eave); g.stroke();
  g.fillStyle = 'rgba(255,245,210,.5)'; g.fillRect(left + 26, roofTop + 4, right - left - 52, 3);
  if (h.id !== 'lathel') { const cx = right - (right - left) * .22; g.fillStyle = '#6e6a63'; g.fillRect(cx - 7, roofTop - 4, 14, 22); g.fillStyle = '#8f8a82'; g.fillRect(cx - 7, roofTop - 4, 14, 4); }
  return c;
}
function tentSprite(col) {
  const c = mk(110, 90), g = c.getContext('2d'), d = shade(col, -.3), l = shade(col, .15);
  softDot(g, 55, 80, 50, 'rgba(10,15,8,A)', .45);
  g.fillStyle = l; g.beginPath(); g.moveTo(55, 6); g.lineTo(10, 80); g.lineTo(55, 80); g.fill();
  g.fillStyle = d; g.beginPath(); g.moveTo(55, 6); g.lineTo(100, 80); g.lineTo(55, 80); g.fill();
  g.fillStyle = '#1e140d'; g.beginPath(); g.moveTo(55, 32); g.lineTo(40, 80); g.lineTo(70, 80); g.fill();
  g.strokeStyle = 'rgba(255,240,210,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(55, 6); g.lineTo(14, 78); g.stroke();
  g.fillStyle = WPAL.woodD; g.fillRect(53, 0, 4, 10);
  return c;
}
function propSprite(kind) {
  let c, g; const S2 = (w, h) => { c = mk(w, h); g = c.getContext('2d'); };
  if (kind === 'log') { S2(70, 34); softDot(g, 35, 26, 30, 'rgba(10,15,8,A)', .4); g.fillStyle = WPAL.wood; g.fillRect(6, 10, 54, 16); g.fillStyle = WPAL.woodL; g.fillRect(6, 10, 54, 4); g.fillStyle = '#c4a072'; g.beginPath(); g.ellipse(60, 18, 7, 8, 0, 0, 7); g.fill(); g.strokeStyle = '#8a6b4a'; g.beginPath(); g.ellipse(60, 18, 3.5, 4, 0, 0, 7); g.stroke(); }
  else if (kind === 'crate') { S2(40, 40); softDot(g, 20, 34, 20, 'rgba(10,15,8,A)', .4); g.fillStyle = '#8a6440'; g.fillRect(6, 8, 28, 26); g.fillStyle = '#a77d52'; g.fillRect(6, 4, 28, 6); g.strokeStyle = '#4e3622'; g.lineWidth = 2; g.strokeRect(6, 8, 28, 26); g.beginPath(); g.moveTo(6, 8); g.lineTo(34, 34); g.stroke(); }
  else if (kind === 'barrel') { S2(36, 46); softDot(g, 18, 40, 18, 'rgba(10,15,8,A)', .4); const bg2 = g.createLinearGradient(6, 0, 30, 0); bg2.addColorStop(0, '#4e3622'); bg2.addColorStop(.4, '#8a6440'); bg2.addColorStop(1, '#3d2a1a'); g.fillStyle = bg2; g.beginPath(); g.ellipse(18, 24, 12, 16, 0, 0, 7); g.fill(); g.fillStyle = '#6e5038'; g.beginPath(); g.ellipse(18, 9, 10, 4, 0, 0, 7); g.fill(); g.strokeStyle = '#2e2e30'; g.lineWidth = 2; [16, 32].forEach(y => { g.beginPath(); g.moveTo(7, y); g.quadraticCurveTo(18, y + 3, 29, y); g.stroke(); }); }
  else if (kind === 'lamp') { S2(30, 90); softDot(g, 15, 84, 12, 'rgba(10,15,8,A)', .45); g.fillStyle = WPAL.woodD; g.fillRect(13, 14, 4, 72); g.fillRect(13, 14, 14, 3); g.fillStyle = '#2a2420'; g.fillRect(19, 17, 8, 3); softDot(g, 23, 26, 14, 'rgba(255,215,130,A)', .7); g.fillStyle = '#ffe3a0'; g.fillRect(19, 20, 8, 10); g.strokeStyle = '#2a2420'; g.lineWidth = 1.5; g.strokeRect(19, 20, 8, 10); }
  else if (kind === 'well') { S2(70, 80); softDot(g, 35, 72, 32, 'rgba(10,15,8,A)', .45); g.fillStyle = WPAL.woodD; g.fillRect(12, 10, 5, 44); g.fillRect(53, 10, 5, 44); g.fillStyle = WPAL.strawD; g.beginPath(); g.moveTo(4, 16); g.lineTo(35, 0); g.lineTo(66, 16); g.fill(); g.fillStyle = WPAL.straw; g.beginPath(); g.moveTo(8, 15); g.lineTo(35, 3); g.lineTo(62, 15); g.fill(); g.fillStyle = '#7d7a72'; g.beginPath(); g.ellipse(35, 58, 24, 14, 0, 0, 7); g.fill(); g.fillStyle = '#9d9a90'; g.beginPath(); g.ellipse(35, 52, 24, 11, 0, 0, 7); g.fill(); g.fillStyle = '#26394a'; g.beginPath(); g.ellipse(35, 52, 17, 7, 0, 0, 7); g.fill(); }
  else if (kind === 'board') { S2(60, 74); softDot(g, 30, 68, 28, 'rgba(10,15,8,A)', .45); g.fillStyle = WPAL.woodD; g.fillRect(8, 20, 5, 50); g.fillRect(47, 20, 5, 50); g.fillStyle = '#3d2d20'; g.beginPath(); g.moveTo(2, 18); g.lineTo(30, 4); g.lineTo(58, 18); g.fill(); g.fillStyle = WPAL.wood; g.fillRect(8, 20, 44, 34); [[12, 24, '#e8dcc0'], [26, 23, '#efe4c8'], [37, 27, '#d9cba8'], [16, 38, '#e2d5b6']].forEach(([x, y, col]) => { g.fillStyle = col; g.fillRect(x, y, 11, 12); g.fillStyle = 'rgba(80,60,40,.5)'; g.fillRect(x + 2, y + 3, 7, 1); g.fillRect(x + 2, y + 6, 5, 1); }); }
  else if (kind === 'hay') { S2(60, 46); softDot(g, 30, 40, 28, 'rgba(10,15,8,A)', .4); g.fillStyle = WPAL.strawD; g.fillRect(6, 14, 48, 26); g.fillStyle = WPAL.straw; g.fillRect(6, 8, 48, 10); for (let k = 0; k < 30; k++) { g.strokeStyle = hash(k, 5) < .5 ? 'rgba(120,96,60,.6)' : 'rgba(240,226,180,.5)'; g.beginPath(); const x = 8 + hash(k, 2) * 44; g.moveTo(x, 12 + hash(k, 3) * 20); g.lineTo(x + 2, 18 + hash(k, 4) * 20); g.stroke(); } g.fillStyle = '#5b4330'; g.fillRect(6, 24, 48, 2); }
  else if (kind === 'bench') { S2(70, 40); softDot(g, 35, 34, 30, 'rgba(10,15,8,A)', .4); g.fillStyle = WPAL.woodD; g.fillRect(10, 18, 4, 16); g.fillRect(56, 18, 4, 16); g.fillStyle = WPAL.woodL; g.fillRect(6, 14, 58, 7); g.fillStyle = WPAL.wood; g.fillRect(6, 4, 58, 5); }
  else if (kind === 'sign') { S2(50, 60); softDot(g, 25, 54, 18, 'rgba(10,15,8,A)', .4); g.fillStyle = WPAL.woodD; g.fillRect(22, 14, 5, 44); g.fillStyle = WPAL.woodL; g.beginPath(); g.moveTo(4, 12); g.lineTo(40, 12); g.lineTo(47, 19); g.lineTo(40, 26); g.lineTo(4, 26); g.fill(); g.fillStyle = 'rgba(50,30,15,.7)'; g.fillRect(9, 17, 22, 2); g.fillRect(9, 21, 16, 2); }
  else if (kind === 'gate') { S2(70, 100); g.fillStyle = WPAL.woodD; g.fillRect(6, 10, 8, 86); g.fillRect(56, 10, 8, 86); g.fillRect(2, 6, 66, 9); g.fillStyle = 'rgba(30,20,12,.8)'; for (let k = 0; k < 4; k++) g.fillRect(16, 26 + k * 18, 38, 5); g.strokeStyle = '#a33b2e'; g.lineWidth = 5; g.beginPath(); g.moveTo(18, 30); g.lineTo(52, 84); g.moveTo(52, 30); g.lineTo(18, 84); g.stroke(); }
  else if (kind === 'boat') { S2(90, 40); softDot(g, 45, 30, 40, 'rgba(10,30,40,A)', .35); g.fillStyle = '#5b4330'; g.beginPath(); g.moveTo(6, 16); g.quadraticCurveTo(45, 40, 84, 16); g.lineTo(78, 12); g.lineTo(12, 12); g.fill(); g.fillStyle = '#8a6b4a'; g.fillRect(14, 12, 62, 4); g.fillStyle = '#3b2b1e'; g.fillRect(30, 14, 4, 8); g.fillRect(56, 14, 4, 8); }
  else if (kind === 'fence') { S2(40, 40); g.fillStyle = WPAL.woodD; g.fillRect(4, 8, 6, 28); g.fillRect(30, 8, 6, 28); g.fillStyle = WPAL.wood; g.fillRect(2, 14, 36, 4); g.fillRect(2, 24, 36, 4); }
  return c;
}
function spr(o) {
  const k = o.kind, key = k + (o.v ?? '') + (o.col || '');
  if (WSPR[key]) return WSPR[key];
  return WSPR[key] = k === 'tree' ? treeSprite(o.v) : k === 'pine' ? pineSprite(o.v) : k === 'bush' ? bushSprite(o.v) : k === 'tent' ? tentSprite(o.col) : propSprite(k);
}
/* where each sprite's base point sits inside it (px from left, px from top) */
const ANCHOR = { tree: [75, 158], pine: [55, 160], bush: [45, 56], tent: [55, 80], log: [35, 26], crate: [20, 34], barrel: [18, 40], lamp: [15, 84], well: [35, 70], board: [30, 68], hay: [30, 40], bench: [35, 34], sign: [25, 54], gate: [35, 96], boat: [45, 26], fence: [20, 36] };

/* ---------- the painted ground ---------- */
const ground = mk(MW * TS, MH * TS);
function paintGround() {
  const g = ground.getContext('2d'), WW = ground.width, WH = ground.height, R = mulberry32(5);
  // meadow: an olive base with soft blotches and thousands of grass strokes
  g.fillStyle = '#56683c'; g.fillRect(0, 0, WW, WH);
  for (let i = 0; i < 2600; i++) softDot(g, R() * WW, R() * WH, 14 + R() * 46, ['rgba(126,146,84,A)', 'rgba(62,80,42,A)', 'rgba(150,158,98,A)', 'rgba(96,112,60,A)'][i % 4], .22);
  for (let i = 0; i < 26000; i++) { const x = R() * WW, y = R() * WH, l = 3 + R() * 6; g.strokeStyle = R() < .5 ? `rgba(36,52,26,${.25 + R() * .3})` : `rgba(170,186,112,${.2 + R() * .25})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 3, y - l); g.stroke(); }
  // mask helper: soft union of circles over the given tile types
  const mask = (test, rr, soft) => { const m = mk(WW, WH), mg = m.getContext('2d'); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (test(tiles[idx(x, y)], x, y)) { const cx = (x + .5) * TS, cy = (y + .5) * TS, r = TS * rr; const gr = mg.createRadialGradient(cx, cy, r * soft, cx, cy, r); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); mg.fillStyle = gr; mg.fillRect(cx - r, cy - r, r * 2, r * 2); } return m; };
  const through = (m, paint) => { const t = mk(WW, WH), tg = t.getContext('2d'); paint(tg); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(m, 0, 0); tg.drawImage(m, 0, 0); g.drawImage(t, 0, 0); };
  // water: deep teal with a lighter rim and reflections
  const wm = mask(t => t === T.WATER || t === T.BRIDGE || (t === T.DOCK), 1.05, .55);
  through(wm, tg => { tg.fillStyle = '#3f5e5c'; tg.fillRect(0, 0, WW, WH); for (let i = 0; i < 500; i++) softDot(tg, R() * WW, R() * WH, 10 + R() * 30, R() < .5 ? 'rgba(98,140,134,A)' : 'rgba(40,66,66,A)', .3); for (let i = 0; i < 1500; i++) { tg.strokeStyle = `rgba(200,230,220,${.12 + R() * .2})`; tg.lineWidth = 1; const x = R() * WW, y = R() * WH; tg.beginPath(); tg.moveTo(x, y); tg.lineTo(x + 6 + R() * 10, y); tg.stroke(); } });
  // paths: a dark soft edge, then sandy dirt with blotches, ruts and pebbles
  const pm = mask(t => walkT(t) && t !== T.DOCK, 1.15, .45);
  const pmEdge = mask(t => walkT(t) && t !== T.DOCK, 1.45, .3);
  through(pmEdge, tg => { tg.fillStyle = 'rgba(52,48,30,.35)'; tg.fillRect(0, 0, WW, WH); });
  through(pm, tg => {
    tg.fillStyle = '#cdbb94'; tg.fillRect(0, 0, WW, WH);
    for (let i = 0; i < 1800; i++) softDot(tg, R() * WW, R() * WH, 8 + R() * 30, ['rgba(176,156,118,A)', 'rgba(222,208,176,A)', 'rgba(150,132,98,A)'][i % 3], .3);
    for (let i = 0; i < 2200; i++) { tg.fillStyle = R() < .5 ? 'rgba(120,104,80,.5)' : 'rgba(236,226,200,.6)'; const r = .8 + R() * 1.8; tg.beginPath(); tg.ellipse(R() * WW, R() * WH, r * 1.3, r, 0, 0, 7); tg.fill(); }
  });
  // grass tufts creeping over the path edges
  for (let y = MOUNT_ROWS; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (!walkT(tiles[idx(x, y)])) continue;
    const edge = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => !walkT(tileAt(x + dx, y + dy)) && tileAt(x + dx, y + dy) !== T.WATER);
    if (!edge || hash(x, y, 33) > .7) continue;
    for (let k = 0; k < 7; k++) { const px = (x + hash(x, y, k)) * TS, py = (y + hash(y, x, k)) * TS; g.strokeStyle = `rgba(${k % 2 ? '70,92,44' : '130,150,84'},.8)`; g.lineWidth = 1.4; for (let b = -2; b <= 2; b++) { g.beginPath(); g.moveTo(px + b * 2, py); g.lineTo(px + b * 3, py - 5 - hash(k, b) * 5); g.stroke(); } }
  }
  // bridge planks, the dock and the stairs
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = tiles[idx(x, y)]; if (t !== T.BRIDGE && t !== T.DOCK && t !== T.STAIRS) continue;
    const X = x * TS, Y = y * TS;
    if (t === T.STAIRS) { for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#8a6b4a' : '#a07a52'; g.fillRect(X - 2, Y + k * 8, TS + 4, 7); g.fillStyle = 'rgba(40,25,15,.55)'; g.fillRect(X - 2, Y + k * 8 + 6, TS + 4, 2); } continue; }
    for (let k = 0; k < 4; k++) { g.fillStyle = (k + x + y) % 2 ? '#8a6b4a' : '#9c7a54'; if (t === T.BRIDGE) g.fillRect(X + k * 8, Y - 2, 7, TS + 4); else g.fillRect(X - 1, Y + k * 8, TS + 2, 7); }
    g.fillStyle = 'rgba(40,25,15,.5)';
    if (t === T.BRIDGE) { if (!walkT(tileAt(x, y - 1))) g.fillRect(X, Y - 4, TS, 4); if (!walkT(tileAt(x, y + 1))) g.fillRect(X, Y + TS, TS, 4); }
    else { if (tileAt(x - 1, y) !== T.DOCK) g.fillRect(X - 3, Y, 4, TS); if (tileAt(x + 1, y) !== T.DOCK) g.fillRect(X + TS, Y, 4, TS); }
  }
  // lily pads and flowers
  for (let i = 0; i < 40; i++) { const x = LAKE.x + (R() - .5) * LAKE.rx * 1.5, y = LAKE.y + (R() - .5) * LAKE.ry * 1.4; if (tileAt(Math.floor(x), Math.floor(y)) !== T.WATER) continue; g.fillStyle = '#5d7a45'; g.beginPath(); g.arc(x * TS, y * TS, 5 + R() * 4, .3, 6); g.lineTo(x * TS, y * TS); g.fill(); if (R() < .3) { g.fillStyle = '#f2c4d4'; g.beginPath(); g.arc(x * TS + 2, y * TS - 2, 2.5, 0, 7); g.fill(); } }
  for (let i = 0; i < 380; i++) { const x = R() * WW, y = MOUNT_ROWS * TS + R() * (WH - MOUNT_ROWS * TS); if (walkT(tileAt(Math.floor(x / TS), Math.floor(y / TS))) || tileAt(Math.floor(x / TS), Math.floor(y / TS)) === T.WATER) continue; g.fillStyle = ['#e8e2d0', '#e6d27a', '#c9a8d8', '#efc1c1'][i % 4]; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  // the snowy peaks across the top, fading into mist
  const H0 = MOUNT_ROWS * TS + 26, sky = g.createLinearGradient(0, 0, 0, H0); sky.addColorStop(0, '#b9cfd8'); sky.addColorStop(1, '#dfe6df');
  g.fillStyle = sky; g.fillRect(0, 0, WW, H0);
  const ridge = (x, s, b, a) => b - a * (.55 * Math.abs(Math.sin(x * .006 + s)) + .3 * Math.abs(Math.sin(x * .017 + s * 2)) + .15 * Math.sin(x * .05 + s * 3));
  [[1.2, 96, 70, '#9fb3c2', '#e9f0f2'], [3.7, 140, 90, '#73858e', '#f3f6f6']].forEach(([s, b, a, rock, snow]) => {
    g.fillStyle = rock; g.beginPath(); g.moveTo(0, H0); for (let x = 0; x <= WW; x += 4) g.lineTo(x, ridge(x, s, b, a)); g.lineTo(WW, H0); g.fill();
    g.fillStyle = snow; g.beginPath(); for (let x = 0; x <= WW; x += 4) g.lineTo(x, ridge(x, s, b, a)); for (let x = WW; x >= 0; x -= 4) g.lineTo(x, ridge(x, s, b, a) + 10 + 8 * Math.abs(Math.sin(x * .03 + s))); g.fill();
  });
  const mist = g.createLinearGradient(0, H0 - 70, 0, H0 + 10); mist.addColorStop(0, 'rgba(225,232,226,0)'); mist.addColorStop(1, 'rgba(110,128,90,1)');
  g.fillStyle = mist; g.fillRect(0, H0 - 70, WW, 80);
}

/* ---------- map art: only the walkable paths, soft and pale, like a parchment of roads ---------- */
const MPX = 8, mapBase = mk(MW * MPX, MH * MPX);
function paintMapBase() {
  const g = mapBase.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (walkT(tiles[idx(x, y)])) softDot(g, (x + .5) * MPX, (y + .5) * MPX, MPX * 1.6, 'rgba(220,214,198,A)', .35);
  g.fillStyle = '#d9d3c4';
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (walkT(tiles[idx(x, y)])) { g.beginPath(); g.arc((x + .5) * MPX, (y + .5) * MPX, MPX * .82, 0, 7); g.fill(); }
}

buildMap(); paintGround(); paintMapBase();

/* ---------- characters: small chibis with big heads, soft shading and a dark round shadow ---------- */
function drawMini(c, x, y, look, o = {}) {
  const dir = o.dir || 'down', ph = o.phase || 0, mv = !!o.moving, s = o.s || 1;
  const sw = mv ? Math.sin(ph) : 0, bob = mv ? Math.abs(Math.cos(ph)) * 1.2 : Math.sin((o.t || 0) * 2) * .35;
  const hair = look.hair, hairD = shade(hair, -.32), hairL = shade(hair, .3), skin = look.skin, shirt = look.shirt, shirtD = shade(shirt, -.3), pants = look.pants;
  const long = look.style === 1 || look.style === 3, side = dir === 'left' || dir === 'right', fx = dir === 'left' ? -1 : 1;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(12,10,6,.55)'; c.beginPath(); c.ellipse(0, 0, 10, 4.6, 0, 0, 7); c.fill();
  c.translate(0, -bob);
  // legs
  c.fillStyle = shade(pants, -.2);
  if (side) { c.beginPath(); c.ellipse(-2 + sw * 2.5 * fx, -3, 2.2, 3.2, 0, 0, 7); c.ellipse(2 - sw * 2.5 * fx, -3, 2.2, 3.2, 0, 0, 7); c.fill(); }
  else { c.beginPath(); c.ellipse(-2.6, -3 - Math.max(0, sw) * 1.5, 2.2, 3.2, 0, 0, 7); c.ellipse(2.6, -3 - Math.max(0, -sw) * 1.5, 2.2, 3.2, 0, 0, 7); c.fill(); }
  // long hair falls behind the body
  if (long && dir !== 'up') { c.fillStyle = hairD; c.beginPath(); c.ellipse(side ? -3 * fx : 0, -12, side ? 6 : 9, 8, 0, 0, 7); c.fill(); }
  // body: a little rounded tunic with shading
  const bg = c.createLinearGradient(-7, -16, 7, -4); bg.addColorStop(0, shade(shirt, .12)); bg.addColorStop(1, shirtD);
  c.fillStyle = bg; c.beginPath(); c.moveTo(-6, -15); c.quadraticCurveTo(-8, -6, -7, -3.5); c.lineTo(7, -3.5); c.quadraticCurveTo(8, -6, 6, -15); c.quadraticCurveTo(0, -17.5, -6, -15); c.fill();
  c.fillStyle = shirtD; c.beginPath(); c.ellipse(side ? sw * 3 * fx : -7.2, -10 + (side ? 0 : sw), 2, 3.4, 0, 0, 7); if (!side) c.ellipse(7.2, -10 - sw, 2, 3.4, 0, 0, 7); c.fill();
  // the big head
  const hy = -24, hr = 9.6;
  const sg = c.createRadialGradient(-2, hy - 1, 2, 0, hy, hr); sg.addColorStop(0, shade(skin, .1)); sg.addColorStop(1, shade(skin, -.12));
  c.fillStyle = sg; c.beginPath(); c.ellipse(0, hy, hr, hr * .95, 0, 0, 7); c.fill();
  const hg = c.createLinearGradient(0, hy - hr, 0, hy + hr); hg.addColorStop(0, hairL); hg.addColorStop(.5, hair); hg.addColorStop(1, hairD);
  c.fillStyle = hg;
  if (dir === 'up') { c.beginPath(); c.ellipse(0, hy - .5, hr + 1, hr + .4, 0, 0, 7); c.fill(); if (long) { c.beginPath(); c.ellipse(0, hy + 7, 8, 8, 0, 0, 7); c.fill(); } }
  else if (side) {
    c.beginPath(); c.ellipse(-1.5 * fx, hy - 2, hr + .6, hr - .5, 0, 0, 7); c.fill();
    c.fillStyle = sg; c.beginPath(); c.ellipse(4 * fx, hy + 2, 5.2, 5.4, 0, 0, 7); c.fill();
    c.fillStyle = hg; c.beginPath(); c.ellipse(4.5 * fx, hy - 3.4, 5, 2.6, -.3 * fx, 0, 7); c.fill();
    c.fillStyle = '#2a1e24'; c.beginPath(); c.ellipse(6 * fx, hy + 2.2, 1.1, 1.6, 0, 0, 7); c.fill();
  } else {
    c.beginPath(); c.moveTo(-hr - 1, hy + 3); c.quadraticCurveTo(-hr - 1.5, hy - hr - 1.5, 0, hy - hr - 1.2); c.quadraticCurveTo(hr + 1.5, hy - hr - 1.5, hr + 1, hy + 3);
    c.quadraticCurveTo(hr - 2, hy - 2, 4, hy - 3.4); c.lineTo(1.5, hy - 1.6); c.lineTo(-1, hy - 3.6); c.lineTo(-4, hy - 1.8); c.quadraticCurveTo(-hr + 2, hy - 2, -hr - 1, hy + 3); c.fill();
    if (long) { c.fillRect(-hr - 1, hy, 3, 9); c.fillRect(hr - 2, hy, 3, 9); }
    c.fillStyle = '#2a1e24'; c.beginPath(); c.ellipse(-3.4, hy + 2.6, 1.3, 1.8, 0, 0, 7); c.ellipse(3.4, hy + 2.6, 1.3, 1.8, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-3.8, hy + 1.9, .55, 0, 7); c.arc(3, hy + 1.9, .55, 0, 7); c.fill();
    c.fillStyle = 'rgba(240,120,130,.35)'; c.beginPath(); c.ellipse(-5.4, hy + 5, 1.6, .9, 0, 0, 7); c.ellipse(5.4, hy + 5, 1.6, .9, 0, 0, 7); c.fill();
  }
  if (look.style === 2 && dir !== 'up') { c.fillStyle = hair; [[-5, -1], [0, 1], [5, -1]].forEach(([sx, k]) => { c.beginPath(); c.moveTo(sx - 3, hy - hr + 2); c.lineTo(sx + k, hy - hr - 4); c.lineTo(sx + 3, hy - hr + 2); c.fill(); }); }
  c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.ellipse(-3, hy - hr + 3, 4, 1.6, -.3, 0, 7); c.fill();
  c.restore();
}

/* ---------- people ---------- */
const HAIRS = ['#ff5f8f', '#5b6cff', '#ffcf4a', '#8a5a3c', '#a066ff', '#2b2b3a', '#3fd0c9', '#ff8a3d', '#f4f4f4', '#ff3d5a'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const BOT_NAMES = ['Mira', 'Juno', 'Kai', 'Pip', 'Sol', 'Nova', 'Rin', 'Teo', 'Yumi'];
const BOT_LINES = ['bruh...', 'nah.', 'anyone trading?', 'just pulled a UR!!', 'gg', 'when does the event start?', 'hi :)', 'lol', 'the lake is so pretty', 'meet at the campfire', 'pity at 46, send help', 'nice skin!', 'brb', 'is the forest gate still closed?', 'the tavern smells so good'];
const BOT_REPLIES = ['hey!', 'lol', 'same', 'real', 'hiii', 'haha', 'true', '👋'];
const EMOTES = ['😂', '😍', '😮', '😢', '👋', '❤️', '😤', '✨'];
function walkable(x, y) {
  const r = .22;
  for (const [ox, oy] of [[-r, -r * .5], [r, -r * .5], [-r, r * .5], [r, r * .5]]) { const tx = Math.floor(x + ox), ty = Math.floor(y + oy); if (!inMap(tx, ty) || blocked[idx(tx, ty)]) return false; }
  return true;
}
function lineClear(ax, ay, bx, by) { const n = Math.ceil(Math.hypot(bx - ax, by - ay) / .12); for (let i = 1; i <= n; i++) if (!walkable(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false; return true; }
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const open = (x, y) => inMap(x, y) && !blocked[idx(x, y)];
/* breadth-first over open tiles, 8 directions (diagonals only when both sides are open); heads for the nearest reachable spot */
function findPath(sx, sy, gx, gy) {
  const s = idx(clamp(Math.floor(sx), 0, MW - 1), clamp(Math.floor(sy), 0, MH - 1)), goal = idx(clamp(Math.floor(gx), 0, MW - 1), clamp(Math.floor(gy), 0, MH - 1));
  const prev = new Int32Array(MW * MH).fill(-1); prev[s] = s;
  const q = [s]; let best = s, bestD = Infinity;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi], cx = cur % MW, cy = (cur / MW) | 0, dd = Math.hypot(cx + .5 - gx, cy + .5 - gy);
    if (dd < bestD) { bestD = dd; best = cur; }
    if (cur === goal) break;
    for (const [dx, dy] of DIRS8) {
      const nx = cx + dx, ny = cy + dy;
      if (!open(nx, ny) || prev[idx(nx, ny)] !== -1) continue;
      if (dx && dy && !(open(cx + dx, cy) && open(cx, cy + dy))) continue;
      prev[idx(nx, ny)] = cur; q.push(idx(nx, ny));
    }
  }
  const pts = [];
  for (let k = best; k !== s; k = prev[k]) pts.push({ x: k % MW + .5, y: ((k / MW) | 0) + .5 });
  pts.reverse();
  if (best === goal && walkable(gx, gy)) { if (pts.length) pts[pts.length - 1] = { x: gx, y: gy }; else pts.push({ x: gx, y: gy }); }
  return pts;
}
function randomWalkableNear(cx, cy, rad) {
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(clamp(cx + (Math.random() * 2 - 1) * rad, 1, MW - 2)) + .5, y = Math.floor(clamp(cy + (Math.random() * 2 - 1) * rad, MOUNT_ROWS, MH - 2)) + .5;
    if (walkable(x, y)) return { x, y };
  }
  return null;
}
function makeEntity(name, x, y, look, bot) {
  return { name, x, y, z: 0, look, bot, path: null, phase: 0, moving: false, dir: 'down', ex: 0, bubble: null, emote: null, idle: Math.random() * 3, nextTalk: 4 + Math.random() * 12, stuck: 0 };
}
if (S.player.mc) S.player.look = { ...MC_LOOK[S.player.mc] };
const SPAWN = { x: 11.5, y: 24.6 };
const player = makeEntity(S.player.name, SPAWN.x, SPAWN.y, S.player.look, false);
const bots = BOT_NAMES.map((n, i) => { const p = randomWalkableNear(i % 2 ? 45 : 12, 22, 6) || { ...SPAWN }; return makeEntity(n, p.x, p.y, { ...MC_LOOK[Math.random() < .5 ? 'f' : 'm'] }, true); });
const entities = [player, ...bots];
const others = () => entities.filter(e => e !== player);
const updateOnline = () => { $('#onlineCount').textContent = `${entities.length} here`; };
updateOnline();
const critters = [...[[44, 21], [47, 23.5], [43, 24]].map(([x, y]) => ({ kind: 'hen', x, y, tx: x, ty: y, wait: Math.random() * 3, dir: 1, home: { x, y } })), ...[0, 2.6].map(a => ({ kind: 'duck', a, sp: .05 + Math.random() * .04 }))];

/* chat */
const chatLog = [];
function logChat(name, text, color, sys) {
  chatLog.push({ name, text, color, sys }); if (chatLog.length > 6) chatLog.shift();
  $('#chatlog').innerHTML = chatLog.map(m => m.sys ? `<div class="sys">${esc(m.text)}</div>` : `<div><b style="color:${m.color}">${esc(m.name)}</b> ${esc(m.text)}</div>`).join('');
}
function say(e, text) { e.bubble = { text, until: now + 4.5 }; logChat(e.name, text, e === player ? 'var(--mint)' : e.look.hair === '#2b2b3a' ? '#c9d2f5' : e.look.hair, false); }
function emote(e, em) { e.emote = { e: em, until: now + 3 }; }
logChat('', 'Welcome to Blank: Project.', '', true);
$('#chatForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const inp = $('#chatInput'), text = inp.value.trim(); if (!text) return;
  say(player, text.slice(0, 120)); netChat(text.slice(0, 120)); inp.value = ''; inp.blur();
  if (bots.length && Math.random() < .45) { const near = bots.filter(b => Math.hypot(b.x - player.x, b.y - player.y) < 8); const b = near.length ? pick(near) : pick(bots); setTimeout(() => say(b, pick(BOT_REPLIES)), 1200 + Math.random() * 1500); }
});
const emotesEl = $('#emotes');
emotesEl.innerHTML = EMOTES.map(e => `<button type="button" aria-label="Emote ${e}">${e}</button>`).join('');
emotesEl.querySelectorAll('button').forEach((b, i) => b.onclick = () => { emote(player, EMOTES[i]); netEmote(EMOTES[i]); emotesEl.hidden = true; });
$('#emoteToggle').onclick = () => { emotesEl.hidden = !emotesEl.hidden; };
let hintTimer;
function showHint() { const h = $('#hint'); h.classList.remove('gone'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('gone'), 6000); }

/* ---------- places: zones for titles, points of interest for the map ---------- */
ICONS.tent = '<path d="M3 20L12 4l9 16z"/><path d="M12 9l-4 11"/><path d="M12 9l4 11"/>';
ICONS.door = '<path d="M6 21V8a6 6 0 0 1 12 0v13"/><path d="M4 21h16"/><circle cx="14.5" cy="14" r=".8"/>';
ICONS.mug = '<path d="M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M15 11h2a2 2 0 0 1 0 4h-2"/><path d="M6 8c0-2 2-3 4-2 1-2 4-2 5 0"/>';
ICONS.notice = '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r=".9"/>';
ICONS.wave = '<path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>';
ICONS.peak = '<path d="M3 20l6-10 4 6 2-3 6 7z"/><path d="M9 10l1.5 2.5"/>';
ICONS.locked = '<circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M16 8l-8 8"/>';
ICONS.well = '<path d="M5 9h14"/><path d="M7 9V5h10v4"/><path d="M6 13h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>';
const POIS = [
  { id: 'camp', name: "Traveler's Camp", ic: 'tent', x: 11.5, y: 22.5, desc: 'A cosy campsite by the fire. Every journey starts here.' },
  { id: 'square', name: 'Town Square', ic: 'well', lab: 'up', x: 45.5, y: 23.4, desc: 'The heart of the village: a well, the notice board and the tavern.' },
  { id: 'chief', name: "Village Chief's House", ic: 'door', x: 31.5, y: 9.7, desc: 'The old chief watches over the valley.' },
  { id: 'tavern', name: 'Tavern', ic: 'mug', x: 40, y: 19.4, desc: 'Warm light, cold drinks and the latest gossip.' },
  { id: 'lathel', name: "Lathel's House", ic: 'door', x: 52.5, y: 19.7, desc: 'A quiet house at the end of the east road.' },
  { id: 'board', name: 'Notice Board', ic: 'notice', x: 48.6, y: 25.4, desc: 'Requests from the villagers will be pinned here.' },
  { id: 'lake', name: 'Mirror Lake', ic: 'wave', x: 14, y: 32, desc: 'A calm lake with a wooden dock and a little boat.' },
  { id: 'overlook', name: 'Mountain Overlook', ic: 'peak', x: 10.5, y: 7.6, desc: 'Up the stairs: the snowy peaks close the valley.' },
  { id: 'forest', name: 'Whispering Forest', ic: 'locked', lab: 'up', x: 3.5, y: 22.5, desc: 'The forest beyond the gate. Coming in a later update.', locked: true }
];
const ZONES = POIS.filter(p => ['camp', 'square', 'chief', 'lake', 'overlook', 'lathel'].includes(p.id)).map(p => ({ ...p, at: [p.x, p.y], c: '#e8d9b0', rad: p.id === 'square' ? 7 : 5 }));
const CROSSROADS = { id: 'road', name: 'Valley Road', desc: 'Sandy roads winding between the trees.', c: '#d9cfae' };
function zoneAt(x, y) { let best = CROSSROADS, bd = Infinity; ZONES.forEach(z => { const d = Math.hypot(x - z.x, y - z.y); if (d < z.rad && d < bd) { bd = d; best = z; } }); return best; }
function findSpawn(x, y) {
  for (let rad = 0; rad <= 6; rad++)
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const px = Math.floor(x) + dx + .5, py = Math.floor(y) + dy + .5;
      if (walkable(px, py)) return { x: px, y: py };
    }
  return { ...SPAWN };
}
let curZone = zoneAt(player.x, player.y), tele = null;
/* the map: dark backdrop, pale walkable paths, round icons for the places, you as a ringed dot */
function drawMap(cv, cssW, cssH, opt = {}) {
  const d = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(cssW * d)) { cv.width = Math.round(cssW * d); cv.height = Math.round(cssH * d); }
  const g = cv.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cssW, cssH);
  const sc = opt.follow ? opt.zoom : Math.min(cssW / mapBase.width, cssH / ((MH - MOUNT_ROWS + 1) * MPX)) * .94;
  let ox = (cssW - mapBase.width * sc) / 2, oy = (cssH - (MH + MOUNT_ROWS) * MPX * sc) / 2;
  if (opt.follow) { ox = cssW / 2 - player.x * MPX * sc; oy = cssH / 2 - player.y * MPX * sc; }
  const toPx = (x, y) => ({ x: ox + x * MPX * sc, y: oy + y * MPX * sc });
  if (opt.follow) { g.save(); g.beginPath(); g.arc(cssW / 2, cssH / 2, Math.min(cssW, cssH) / 2 - 1, 0, 7); g.clip(); g.fillStyle = 'rgba(28,30,24,.92)'; g.fillRect(0, 0, cssW, cssH); }
  g.imageSmoothingEnabled = true;
  g.drawImage(mapBase, ox, oy, mapBase.width * sc, mapBase.height * sc);
  if (opt.follow) POIS.forEach(p => { const q = toPx(p.x, p.y); g.fillStyle = 'rgba(30,32,28,.9)'; g.beginPath(); g.arc(q.x, q.y, 4.5, 0, 7); g.fill(); g.fillStyle = p.locked ? '#ff6a5a' : '#f1ead8'; g.beginPath(); g.arc(q.x, q.y, 2, 0, 7); g.fill(); });
  plazaEggs.forEach(e => { const p = toPx(e.x, e.y); g.fillStyle = e.r === 'ur' ? '#ff6ec7' : '#ffd36b'; ell(g, p.x, p.y - 1, 2.4, 3); });
  others().forEach(b => { const p = toPx(b.x, b.y); g.fillStyle = 'rgba(20,20,20,.7)'; ell(g, p.x, p.y, 3.2, 3.2); g.fillStyle = '#c9c2b0'; ell(g, p.x, p.y, 2.2, 2.2); });
  const pp = toPx(player.x, player.y);
  g.strokeStyle = '#e8453a'; g.lineWidth = 2.5; g.beginPath(); g.arc(pp.x, pp.y, 6.5, 0, 7); g.stroke();
  g.fillStyle = '#7ef3d4'; ell(g, pp.x, pp.y, 4, 4);
  if (opt.follow) { g.restore(); g.strokeStyle = 'rgba(240,232,210,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(cssW / 2, cssH / 2, Math.min(cssW, cssH) / 2 - 1, 0, 7); g.stroke(); }
  return toPx;
}
function drawMinimap() { const cv = $('#minimap'); if (!cv || hudEl.hidden) return; drawMap(cv, cv.clientWidth, cv.clientHeight, { follow: true, zoom: .7 }); }
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
    player.x = tele.to.x; player.y = tele.to.y; tele.moved = true; cam.x = player.x * TS; cam.y = player.y * TS - 20;
    const f = document.createElement('div'); f.className = 'tele-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 700);
  }
  if (k >= .95) tele = null;
}
const teleAlpha = () => { if (!tele) return 1; const k = now - tele.t0; return k < .45 ? 1 - k / .45 : Math.min(1, (k - .45) / .45); };
function showZoneTitle(z) {
  const el = $('#zoneTitle');
  el.style.setProperty('--zc', z.c);
  el.querySelector('b').textContent = z.name; el.querySelector('small').textContent = z.desc;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  $('#zoneName').textContent = z.name; $('#miniLabel').textContent = z.name;
}
function checkZone() { const z = zoneAt(player.x, player.y); if (z.id !== curZone.id) { curZone = z; showZoneTitle(z); if ($('#people') && !$('#people').hidden) renderPeople(); } }
function onEnterPlaza() { showZoneTitle(curZone); }
let mapTimer;
function openMap() {
  openModal({ title: 'Map', ic: 'map', wide: true, kind: 'map', body: `<div class="wmap"><canvas id="mapCanvas"></canvas><div id="mapPins"></div><p class="wmap-tip">Tap a place to travel there · M opens the map</p></div>`,
    onMount: () => { renderMapWindow(); clearInterval(mapTimer); mapTimer = setInterval(() => { if (!modalEl || modalEl.dataset.kind !== 'map') return clearInterval(mapTimer); renderMapWindow(true); }, 400); } });
}
function renderMapWindow(dotsOnly) {
  const cv = $('#mapCanvas'); if (!cv) return;
  const toPx = drawMap(cv, cv.clientWidth, cv.clientHeight, {});
  if (dotsOnly) return;
  $('#mapPins').innerHTML = POIS.map(p => { const q = toPx(p.x, p.y); return `<button class="wpin ${p.locked ? 'locked' : ''} ${p.lab || ''}" style="left:${q.x}px;top:${q.y}px" data-poi="${p.id}" title="${esc(p.desc)}"><span class="wpin-ic">${icon(p.ic)}</span>${p.lab === 'up' ? '' : ''}${['chief', 'lathel', 'square', 'forest', 'camp', 'lake', 'overlook'].includes(p.id) ? `<b>${esc(p.name)}</b>` : ''}</button>`; }).join('');
  document.querySelectorAll('[data-poi]').forEach(b => b.onclick = () => { const p = POIS.find(x => x.id === b.dataset.poi); if (p.locked) return toast(`${p.name}: ${p.desc}`); teleport(p.x, p.y); });
}
function renderPeople() {
  const el = $('#people'); if (!el) return;
  const list = [player, ...others().sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))];
  el.innerHTML = `<div class="lbl-sm" style="padding:4px 8px">In the valley · ${entities.length}</div>` + list.map(e => {
    const z = zoneAt(e.x, e.y), you = e === player, dist = Math.round(Math.hypot(e.x - player.x, e.y - player.y));
    return `<div class="prow"><i style="background:${you ? 'var(--mint)' : e.look.hair}"></i><span style="min-width:0"><b>${esc(e.name)}${you ? ' (you)' : ''}</b><small>${esc(z.name)}${you ? '' : ` · ${dist} m`}</small></span>${you ? '' : `<button class="btn ghost sm" data-goto="${esc(e.name)}">Go</button>`}</div>`;
  }).join('') + (bots.length ? `<p class="tiny" style="padding:4px 8px">Other players are demo bots for now.</p>` : '');
  el.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const t = others().find(x => x.name === b.dataset.goto); if (t) teleport(t.x, t.y + 1); });
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
const cam = { x: player.x * TS, y: player.y * TS - 20 };
let view = { x: 0, y: 0, w: 1, h: 1 };
function screenToTile(sx, sy) { return { x: (view.x + sx / zoom) / TS, y: (view.y + sy / zoom) / TS }; }
canvas.addEventListener('pointerdown', e => {
  if (menuOpen || modalEl || pullEl || tele) return;
  $('#people').hidden = true; emotesEl.hidden = true;
  const t = screenToTile(e.clientX, e.clientY);
  if (!inMap(Math.floor(t.x), Math.floor(t.y))) return;
  player.path = findPath(player.x, player.y, t.x, t.y); player.stuck = 0;
  marker = { x: t.x, y: t.y, t: now };
});
function resize() {
  W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  // about 17 tiles of height on screen (characters stay small), never more than the map
  zoom = Math.max(H / (17 * TS), W / (MW * TS), H / ((MH - 1) * TS));
}
addEventListener('resize', resize); resize();

/* update */
function stepEntity(e, vx, vy, dt) {
  const len = Math.hypot(vx, vy);
  if (len < .001) { e.moving = false; return false; }
  vx /= len; vy /= len;
  const sp = 3.4 * dt, nx = e.x + vx * sp, ny = e.y + vy * sp;
  let moved = false;
  if (walkable(nx, e.y)) { e.x = nx; moved = true; }
  if (walkable(e.x, ny)) { e.y = ny; moved = true; }
  e.dir = Math.abs(vx) > Math.abs(vy) * 1.1 ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
  e.moving = moved; if (moved) e.phase += dt * 11;
  return moved;
}
function followPath(e, dt) {
  if (!e.path || !e.path.length) { e.path = null; e.moving = false; return false; }
  if (e.path.length > 1 && lineClear(e.x, e.y, e.path[1].x, e.path[1].y)) e.path.shift();
  const tg = e.path[0], dx = tg.x - e.x, dy = tg.y - e.y;
  if (Math.hypot(dx, dy) < .1) { e.path.shift(); if (!e.path.length) { e.path = null; e.moving = false; return false; } return true; }
  if (!stepEntity(e, dx, dy, dt)) { e.stuck += dt; if (e.stuck > .5) { e.path = null; e.moving = false; return false; } } else e.stuck = 0;
  return true;
}
function update(dt) {
  let kx = 0, ky = 0;
  updateTele();
  if (!menuOpen && !modalEl && !typing() && !tele) {
    if (keys.has('w') || keys.has('arrowup')) ky -= 1;
    if (keys.has('s') || keys.has('arrowdown')) ky += 1;
    if (keys.has('a') || keys.has('arrowleft')) kx -= 1;
    if (keys.has('d') || keys.has('arrowright')) kx += 1;
  }
  if (kx || ky) { player.path = null; marker = null; stepEntity(player, kx, ky, dt); }
  else if (player.path) followPath(player, dt);
  else player.moving = false;
  checkZone();
  bots.forEach(b => {
    if (b.idle > 0) { b.idle -= dt; b.moving = false; }
    else if (!b.path) { const t = randomWalkableNear(b.x, b.y, 7); b.path = t ? findPath(b.x, b.y, t.x, t.y) : null; b.stuck = 0; if (!b.path || !b.path.length) { b.path = null; b.idle = 1; } }
    else if (!followPath(b, dt * .7)) { b.idle = 1 + Math.random() * 4; if (Math.random() < .5) b.dir = 'down'; }
    b.nextTalk -= dt;
    if (b.nextTalk <= 0) { b.nextTalk = 8 + Math.random() * 16; if (Math.random() < .6) say(b, pick(BOT_LINES)); else emote(b, pick(EMOTES)); }
  });
  critters.forEach(c => {
    if (c.kind === 'duck') { c.a += c.sp * dt; return; }
    if (c.wait > 0) { c.wait -= dt; return; }
    const dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy);
    if (dd < .05) { c.wait = 1 + Math.random() * 4; const a = Math.random() * 7, r = Math.random() * 2.2, nx = c.home.x + Math.cos(a) * r, ny = c.home.y + Math.sin(a) * r; if (walkable(nx, ny)) { c.tx = nx; c.ty = ny; } return; }
    c.x += dx / dd * dt * 1.1; c.y += dy / dd * dt * 1.1; if (Math.abs(dx) > .01) c.dir = dx < 0 ? -1 : 1;
  });
  netUpdate(dt);
  updateEggs(dt); updateFx(dt);
  const k = 1 - Math.pow(.003, dt);
  cam.x += (player.x * TS - cam.x) * k; cam.y += (player.y * TS - 20 - cam.y) * k;
}

/* ---------- ambience: fireflies, drifting leaves, smoke, embers ---------- */
const flies = Array.from({ length: 70 }, () => ({ x: 2 + Math.random() * (MW - 4), y: MOUNT_ROWS + 2 + Math.random() * (MH - MOUNT_ROWS - 4), a: Math.random() * 7, p: Math.random() * 7 }));
const leaves = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), vx: .01 + Math.random() * .02, vy: .02 + Math.random() * .02, r: Math.random() * 6, s: 3 + Math.random() * 3 }));
const puffs = [], embers = [];
const puffImg = (() => { const c = mk(32, 32), g = c.getContext('2d'); softDot(g, 16, 16, 16, 'rgba(225,225,222,A)', .6); return c; })();
const flyGlow = (() => { const c = mk(24, 24), g = c.getContext('2d'); softDot(g, 12, 12, 12, 'rgba(220,255,140,A)', .85); g.fillStyle = '#fbffd8'; g.beginPath(); g.arc(12, 12, 1.6, 0, 7); g.fill(); return c; })();
function updateFx(dt) {
  flies.forEach(f => { f.a += dt * (.6 + Math.sin(now * .3 + f.p) * .4); f.x += Math.cos(f.a) * dt * .25; f.y += Math.sin(f.a * 1.3) * dt * .18; });
  leaves.forEach(l => { l.x += l.vx * dt; l.y += l.vy * dt; l.r += dt * 2; if (l.y > 1.05 || l.x > 1.05) { l.x = Math.random() * .8 - .1; l.y = -.05; } });
  smokers.forEach(s => {
    s.t -= dt;
    if (s.t <= 0) { s.t = s.fire ? .16 : .45; puffs.push({ x: s.x + (Math.random() - .5) * 4, y: s.y, r: s.fire ? 3 : 5, life: s.fire ? 1.8 : 3.2, max: s.fire ? 1.8 : 3.2 }); }
    if (s.fire && Math.random() < dt * 10) embers.push({ x: s.x + (Math.random() - .5) * 14, y: s.y + 12, vx: (Math.random() - .5) * 12, vy: -24 - Math.random() * 24, life: 1, max: 1 });
  });
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt; if (p.life <= 0) { puffs.splice(i, 1); continue; } p.y -= dt * 16; p.x += dt * 6; p.r += dt * 4; }
  for (let i = embers.length - 1; i >= 0; i--) { const p = embers[i]; p.life -= dt; if (p.life <= 0) { embers.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; }
}

/* catchable eggs */
const plazaEggs = [];
let eggTimer = 45;
function spawnEgg() { const p = randomWalkableNear(28, 22, 22); if (p) plazaEggs.push({ x: p.x, y: p.y, r: Math.random() < .15 ? 'ur' : 'ssr', ph: Math.random() * 6 }); }
spawnEgg(); spawnEgg();
function updateEggs(dt) {
  eggTimer -= dt;
  if (eggTimer <= 0) { eggTimer = 60 + Math.random() * 90; if (plazaEggs.length < 3) spawnEgg(); }
  if (menuOpen || tele) return;
  for (let i = plazaEggs.length - 1; i >= 0; i--) {
    const g = plazaEggs[i], d = Math.hypot(g.x - player.x, g.y - player.y);
    if (d > 1.4) { g.warned = false; continue; }
    if (d > .65 || g.warned) continue;
    if (spendStamina(EGG_STAMINA)) { plazaEggs.splice(i, 1); S.pets.eggs.push(g.r); persist(); renderMenu(); toast(`Caught a ${EGG[g.r].name}! −${EGG_STAMINA} stamina. Hatch it in Pets.`); logChat('', `You caught a ${EGG[g.r].name}.`, '', true); }
    else { g.warned = true; toast(`Catching an egg costs ${EGG_STAMINA} stamina. You have ${stamina()}.`); }
  }
}

/* ---------- render ---------- */
function drawFire(g, x, y, t) {
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; g.fillStyle = k % 2 ? '#6e6a63' : '#8f8a82'; g.beginPath(); g.ellipse(x + Math.cos(a) * 11, y + Math.sin(a) * 5, 4, 3, 0, 0, 7); g.fill(); }
  g.fillStyle = '#3b2b1e'; g.save(); g.translate(x, y - 2); g.rotate(.4); g.fillRect(-9, -2, 18, 4); g.rotate(-.8); g.fillRect(-9, -2, 18, 4); g.restore();
  for (let k = 0; k < 3; k++) {
    const fl = 1 + Math.sin(t * 13 + k * 2) * .18, h = (16 - k * 4) * fl, w = 7 - k * 1.8;
    const fg = g.createLinearGradient(0, y - h - 4, 0, y); fg.addColorStop(0, 'rgba(255,240,170,0)'); fg.addColorStop(.3, ['#ff8a2a', '#ffb13a', '#ffe58a'][k]); fg.addColorStop(1, ['#e04a1a', '#ff7a2a', '#ffcf5a'][k]);
    g.fillStyle = fg; g.beginPath(); g.moveTo(x - w, y - 2); g.quadraticCurveTo(x - w * .6, y - h * .6, x + Math.sin(t * 7 + k) * 2, y - h - 4); g.quadraticCurveTo(x + w * .6, y - h * .6, x + w, y - 2); g.fill();
  }
}
function drawHen(g, x, y, dir, t) {
  g.save(); g.translate(x, y); g.scale(dir, 1);
  g.fillStyle = 'rgba(10,10,6,.4)'; g.beginPath(); g.ellipse(0, 0, 6, 2.4, 0, 0, 7); g.fill();
  const b = Math.sin(t * 6) > .6 ? 1.5 : 0;
  g.fillStyle = '#f2ece0'; g.beginPath(); g.ellipse(0, -6, 6, 4.6, 0, 0, 7); g.fill(); g.beginPath(); g.arc(4.5, -10 + b, 3, 0, 7); g.fill();
  g.fillStyle = '#c94a3a'; g.beginPath(); g.arc(4.5, -13 + b, 1.4, 0, 7); g.fill(); g.fillStyle = '#e8a03a'; g.beginPath(); g.moveTo(7, -10 + b); g.lineTo(9.5, -9 + b); g.lineTo(7, -8.5 + b); g.fill();
  g.fillStyle = '#2a1e24'; g.beginPath(); g.arc(5.3, -10.5 + b, .7, 0, 7); g.fill();
  g.restore();
}
function drawDuck(g, x, y, t) {
  g.fillStyle = 'rgba(200,230,220,.35)'; g.beginPath(); g.ellipse(x, y + 1, 9, 2.4, 0, 0, 7); g.fill();
  g.fillStyle = '#efe8da'; g.beginPath(); g.ellipse(x, y - 3, 6, 3.6, 0, 0, 7); g.fill();
  g.fillStyle = '#3f6a45'; g.beginPath(); g.arc(x + 4.4, y - 7 + Math.sin(t * 2) * .6, 2.6, 0, 7); g.fill();
  g.fillStyle = '#e8a03a'; g.fillRect(x + 6.4, y - 7.4, 3, 1.4);
}
function drawBubble(c, x, y, text) {
  c.font = '700 12px Nunito, system-ui, sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (c.measureText(test).width > 150 && cur) { lines.push(cur); cur = w; } else cur = test; });
  if (cur) lines.push(cur);
  if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 18) + '…'; }
  const w = Math.max(...lines.map(l => c.measureText(l).width)) + 18, h = lines.length * 15 + 10;
  c.fillStyle = 'rgba(245,242,234,.95)'; rr(c, x - w / 2, y - h, w, h, 10); c.fill();
  poly(c, [{ x: x - 5, y: y - 1 }, { x: x + 5, y: y - 1 }, { x, y: y + 5 }]);
  c.fillStyle = '#2a2620'; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, x, y - h + 12 + i * 15));
}
function render() {
  const c = ctx, WW = MW * TS, WH = MH * TS, vw = W / zoom, vh = H / zoom;
  view = { x: clamp(cam.x - vw / 2, 0, WW - vw), y: clamp(cam.y - vh / 2, 0, WH - vh), w: vw, h: vh };
  const vx = view.x, vy = view.y;
  c.setTransform(dpr * zoom, 0, 0, dpr * zoom, -vx * dpr * zoom, -vy * dpr * zoom);
  c.imageSmoothingEnabled = true;
  c.drawImage(ground, vx, vy, vw, vh, vx, vy, vw, vh);
  // water shimmer
  for (let i = 0; i < 26; i++) { const x = (hash(i, Math.floor(now * .6), 1) * MW), y = (hash(Math.floor(now * .6), i, 2) * MH); if (tileAt(Math.floor(x), Math.floor(y)) !== T.WATER) continue; const a = Math.sin((now * .6 % 1) * Math.PI); c.strokeStyle = `rgba(230,245,240,${.45 * a})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x * TS - 6, y * TS); c.lineTo(x * TS + 6, y * TS); c.stroke(); }
  if (marker && now - marker.t < .8) { const f = (now - marker.t) / .8; c.strokeStyle = `rgba(255,250,220,${1 - f})`; c.lineWidth = 2; c.beginPath(); c.ellipse(marker.x * TS, marker.y * TS, 6 + f * 10, 3 + f * 5, 0, 0, 7); c.stroke(); }
  // depth-sorted things
  const list = [], inView = (px, py, w, h) => px + w > vx - 20 && px - w < vx + vw + 20 && py + 20 > vy && py - h < vy + vh + 20;
  objects.forEach(o => {
    const px = o.x * TS, py = o.y * TS;
    if (o.kind === 'house') { const s = o.spr; if (inView(px, py, s.width / 2, s.height)) list.push({ y: py, d: () => c.drawImage(s, px - s.width / 2, py - s.height + 22) }); return; }
    if (o.kind === 'fire') { if (inView(px, py, 20, 30)) list.push({ y: py, d: () => drawFire(c, px, py, now) }); return; }
    const a = ANCHOR[o.kind]; if (!a) return;
    const s = spr(o), k = o.s || 1;
    if (!inView(px, py, a[0] * k, a[1] * k)) return;
    list.push({ y: py, d: () => c.drawImage(s, px - a[0] * k, py - a[1] * k, s.width * k, s.height * k) });
  });
  entities.forEach(e => list.push({ y: e.y * TS, e }));
  critters.forEach(cr => {
    if (cr.kind === 'hen') list.push({ y: cr.y * TS, d: () => drawHen(c, cr.x * TS, cr.y * TS, cr.dir, now + cr.home.x) });
    else list.push({ y: -1, d: () => drawDuck(c, (LAKE.x + Math.cos(cr.a) * LAKE.rx * .55) * TS, (LAKE.y + .6 + Math.sin(cr.a) * LAKE.ry * .45) * TS, now + cr.a) });
  });
  plazaEggs.forEach(e => list.push({ y: e.y * TS, d: () => {
    const x = e.x * TS, y = e.y * TS, b = Math.sin(now * 2.5 + e.ph) * 2, ur = e.r === 'ur';
    softDot(c, x, y - 10 + b, 22, ur ? 'rgba(255,120,210,A)' : 'rgba(255,220,140,A)', .5);
    c.fillStyle = 'rgba(10,8,4,.45)'; c.beginPath(); c.ellipse(x, y, 7, 2.8, 0, 0, 7); c.fill();
    const eg = c.createLinearGradient(x - 6, y - 20, x + 6, y); if (ur) { eg.addColorStop(0, '#c58bff'); eg.addColorStop(.5, '#ff6ec7'); eg.addColorStop(1, '#3ee6d0'); } else { eg.addColorStop(0, '#fffaf0'); eg.addColorStop(1, '#e6c08a'); }
    c.fillStyle = eg; c.beginPath(); c.ellipse(x, y - 9 + b, 6, 8, 0, 0, 7); c.fill();
  } }));
  list.sort((a, b) => a.y - b.y);
  list.forEach(it => {
    if (!it.e) return it.d();
    const e = it.e, al = e === player ? teleAlpha() : 1;
    if (al < 1) c.globalAlpha = al;
    drawMini(c, e.x * TS, e.y * TS, e.look, { dir: e.dir, moving: e.moving, phase: e.phase, t: now + e.x, s: al < 1 ? .6 + .4 * al : 1 });
    c.globalAlpha = 1;
  });
  // smoke and embers
  puffs.forEach(p => { c.globalAlpha = .6 * (p.life / p.max); c.drawImage(puffImg, p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); }); c.globalAlpha = 1;
  embers.forEach(p => { c.fillStyle = p.life > .5 ? '#ffe38a' : '#ff8a3a'; c.fillRect(p.x, p.y, 1.6, 1.6); });
  // warm lights: lamps and the campfire; fireflies
  c.globalCompositeOperation = 'lighter';
  glowsAt.forEach(l => { const fl = l.fire ? 1 + Math.sin(now * 9) * .06 : 1; softDot(c, l.x * TS, l.y * TS, l.r * TS * fl, `rgba(${l.c},A)`, l.fire ? .28 : .16); });
  flies.forEach(f => { const x = f.x * TS, y = f.y * TS; if (x < vx - 20 || x > vx + vw + 20 || y < vy - 20 || y > vy + vh + 20) return; c.globalAlpha = .35 + .65 * Math.abs(Math.sin(now * 1.6 + f.p)); c.drawImage(flyGlow, x - 12, y - 12); });
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  // screen space: falling leaves, out-of-focus foliage in the corners, a soft vignette
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  leaves.forEach(l => { c.save(); c.translate(l.x * W, l.y * H); c.rotate(l.r); c.fillStyle = 'rgba(170,190,90,.75)'; c.beginPath(); c.ellipse(0, 0, l.s, l.s * .45, 0, 0, 7); c.fill(); c.restore(); });
  [[0, H, Math.min(W, H) * .32], [W, H, Math.min(W, H) * .26]].forEach(([x, y, r]) => { const fg = c.createRadialGradient(x, y, r * .2, x, y, r); fg.addColorStop(0, 'rgba(26,36,20,.75)'); fg.addColorStop(.6, 'rgba(40,52,30,.45)'); fg.addColorStop(1, 'rgba(40,52,30,0)'); c.fillStyle = fg; c.fillRect(x - r, y - r, r * 2, r * 2); });
  const vg = c.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .78);
  vg.addColorStop(0, 'rgba(20,16,10,0)'); vg.addColorStop(1, 'rgba(20,16,10,.45)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  // teleport beam, the player's arrow, names, bubbles, emotes
  if (tele) { const at = now - tele.t0 < .45 ? tele.from : tele.to, sx = (at.x * TS - vx) * zoom, sy = (at.y * TS - vy) * zoom, f = (now - tele.t0) / .95; const beam = c.createLinearGradient(0, sy - 160, 0, sy); beam.addColorStop(0, 'rgba(220,255,200,0)'); beam.addColorStop(.6, `rgba(230,255,210,${.6 * (1 - Math.abs(f - .5) * 2)})`); beam.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = beam; c.fillRect(sx - 20, sy - 160, 40, 160); }
  entities.forEach(e => {
    const sx = (e.x * TS - vx) * zoom, sy = (e.y * TS - vy) * zoom;
    if (sx < -100 || sx > W + 100 || sy < -60 || sy > H + 80) return;
    if (e === player) { const b = Math.sin(now * 5) * 2, ay = sy - 40 * zoom + b; c.fillStyle = '#5be36a'; c.beginPath(); c.moveTo(sx - 6, ay - 7); c.lineTo(sx + 6, ay - 7); c.lineTo(sx, ay); c.closePath(); c.fill(); c.strokeStyle = 'rgba(20,30,10,.6)'; c.lineWidth = 1; c.stroke(); }
    if (S.settings.names) {
      c.font = '700 11px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.lineWidth = 3; c.strokeStyle = 'rgba(20,16,10,.75)'; c.strokeText(e.name, sx, sy + 5);
      c.fillStyle = e === player ? '#c8ffb0' : '#f5efe0'; c.fillText(e.name, sx, sy + 5);
    }
    const top = sy - 36 * zoom - (e === player ? 10 * zoom : 0);
    if (e.bubble && e.bubble.until > now) drawBubble(c, sx, top, e.bubble.text);
    else if (e.emote && e.emote.until > now) {
      c.fillStyle = 'rgba(245,242,234,.95)'; rr(c, sx - 14, top - 28, 28, 25, 9); c.fill(); poly(c, [{ x: sx - 4, y: top - 4 }, { x: sx + 4, y: top - 4 }, { x: sx, y: top + 2 }]);
      c.font = '15px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
      c.fillText(e.emote.e, sx, top - 15);
    }
  });
}

let last = performance.now(), frameN = 0;
function loop(t) {
  const dt = Math.min(.05, (t - last) / 1000); last = t; now = t / 1000;
  update(dt);
  frameN++;
  if (!menuOpen && !modalEl && !pullEl) { render(); if (frameN % 3 === 0) drawMinimap(); }
  requestAnimationFrame(loop);
}
