/* =========================================================
   WORLD — a small pixel-art valley seen from above (3/4 view).
   You spawn at a campsite; across a river bridge is a little village, south of it a forest, west a lake,
   and snowy mountains close the valley to the north. Dense forest closes the other sides and the camera
   never leaves the map, so the edge of the world is never visible.
   Everything is drawn into a small pixel buffer and scaled up with sharp pixels.
   ========================================================= */
const canvas = $('#world'), ctx = canvas.getContext('2d');
const MW = 60, MH = 44, N = MW, TS = 16;          // map size in tiles (N is kept for the multiplayer bounds), tile = 16 px
const T = { GRASS: 0, DARK: 1, DIRT: 2, COBBLE: 3, WATER: 4, SAND: 5, BRIDGE: 6, ROCK: 7, DOCK: 8, STEP: 9, FIELD: 10 };
const tiles = new Uint8Array(MW * MH), blocked = new Uint8Array(MW * MH);
const idx = (x, y) => y * MW + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const tileAt = (x, y) => inMap(x, y) ? tiles[idx(x, y)] : T.ROCK;
const heightAt = () => 0;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(11);
const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const objects = [];      // sorted by their base line: { kind, x, y (tile coords of the base), spr, ... }
const smokers = [];      // chimneys and the campfire puff smoke
const MOUNT_ROWS = 10;   // rows 0-9 are the mountain backdrop

/* ---------- pixel helpers ---------- */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const P = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, w, h); };
function disc(g, cx, cy, r, col) { g.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * .6)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
/* dark 1px outline around every opaque pixel, the classic sprite look */
function outline(cv, col = [38, 24, 32]) {
  const g = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8ClampedArray(a);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] > 40) continue;
    const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && src[(yy * w + xx) * 4 + 3] > 40;
    if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { a[i] = col[0]; a[i + 1] = col[1]; a[i + 2] = col[2]; a[i + 3] = 255; }
  }
  g.putImageData(d, 0, 0); return cv;
}

/* ---------- map ---------- */
function setT(x, y, t) { if (inMap(x, y)) tiles[idx(x, y)] = t; }
function block(x, y) { if (inMap(x, y)) blocked[idx(x, y)] = 1; }
function put(kind, x, y, o = {}) { const ob = { kind, x, y, ...o }; objects.push(ob); return ob; }
function carve(pts, r, t) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
    for (let k = 0; k <= n; k++) {
      const cx = ax + (bx - ax) * k / n, cy = ay + (by - ay) * k / n;
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
        if (Math.hypot(x + .5 - cx, y + .5 - cy) <= r) setT(x, y, t);
    }
  }
}
const isWater = t => t === T.WATER;
const RIVER = [[30, 7], [30, 13], [29, 18], [30, 22], [31, 27], [29, 31], [25, 33], [20, 35]];
const LAKE = { x: 13, y: 36, rx: 9.5, ry: 5 };
const HOUSES = [
  { x: 37, y: 13, w: 5, d: 4, roof: '#4a6fb5' }, { x: 44, y: 12, w: 5, d: 4, roof: '#c4483a' }, { x: 51, y: 15, w: 4, d: 4, roof: '#4a6fb5' },
  { x: 37, y: 27, w: 4, d: 4, roof: '#c4483a' }, { x: 47, y: 27, w: 6, d: 4, roof: '#6a5aa8', sign: true }
];
function treeAt(x, y, kind) {
  if (!inMap(x, y) || blocked[idx(x, y)] || isWater(tileAt(x, y)) || [T.DIRT, T.COBBLE, T.BRIDGE, T.DOCK, T.STEP, T.FIELD].includes(tileAt(x, y))) return false;
  block(x, y);
  put(kind || (rnd() < .45 ? 'pine' : 'oak'), x + .5 + (rnd() - .5) * .4, y + .85, { v: Math.floor(rnd() * 3) });
  return true;
}
function buildMap() {
  tiles.fill(T.GRASS);
  for (let y = 0; y < MOUNT_ROWS; y++) for (let x = 0; x < MW; x++) { setT(x, y, T.ROCK); block(x, y); }
  // forest floor along the edges and in the south-east
  for (let y = MOUNT_ROWS; y < MH; y++) for (let x = 0; x < MW; x++) if (x < 5 || x >= 55 || y >= 41 || (x >= 29 && y >= 33)) setT(x, y, T.DARK);
  // lake with a sandy shore, the river from the mountains into it
  for (let y = 26; y < MH; y++) for (let x = 0; x < 28; x++) {
    const d = Math.hypot((x + .5 - LAKE.x) / LAKE.rx, (y + .5 - LAKE.y) / LAKE.ry);
    if (d < 1) setT(x, y, T.WATER); else if (d < 1.22) setT(x, y, T.SAND);
  }
  carve(RIVER, 1.25, T.WATER);
  // camp clearing, paths, the bridge, the village square and the forest trail
  for (let y = 18; y < 29; y++) for (let x = 9; x < 24; x++) if (Math.hypot((x + .5 - 16) / 6, (y + .5 - 23) / 4.6) < 1 && !isWater(tileAt(x, y))) setT(x, y, T.DIRT);
  carve([[21, 22.5], [27, 22.5]], .9, T.DIRT); carve([[33, 22.5], [39, 22.5]], .9, T.DIRT);
  for (let y = 21; y < 24; y++) for (let x = 26; x < 35; x++) if (isWater(tileAt(x, y))) setT(x, y, T.BRIDGE);
  for (let y = 18; y < 26; y++) for (let x = 38; x < 52; x++) setT(x, y, T.COBBLE);
  [[39.5, 17], [46.5, 16], [53, 19], [39, 26], [50, 26]].forEach(([x, y]) => carve([[x, y], [x, 22]], .5, T.COBBLE));
  carve([[44.5, 26], [44.5, 33], [41, 36], [36, 38.5], [33, 38.5]], .75, T.DIRT);
  carve([[16, 18], [17, 14], [21, 12]], .6, T.DIRT);
  for (let x = 27; x < 34; x++) if (isWater(tileAt(x, 12))) setT(x, 12, T.STEP);   // stepping stones across the river up north
  for (let y = 29; y < 35; y++) for (let x = 13; x < 15; x++) setT(x, y, T.DOCK);   // a dock into the lake
  for (let y = 20; y < 25; y++) for (let x = 53; x < 55; x++) setT(x, y, T.FIELD);
  for (let i = 0; i < MW * MH; i++) if (isWater(tiles[i])) blocked[i] = 1;
  // houses (the whole footprint blocks) with a chimney each
  HOUSES.forEach(h => {
    for (let y = h.y; y < h.y + h.d; y++) for (let x = h.x; x < h.x + h.w; x++) block(x, y);
    const o = put('house', h.x + h.w / 2, h.y + h.d, { h, spr: houseSprite(h.w, h.d, h.roof, h.sign) });
    smokers.push({ x: (h.x + h.w * .72) * TS, y: (h.y + h.d) * TS - o.spr.height + 4, t: rnd() * 2 });
  });
  // the camp
  const camp = (kind, x, y, cells, o) => { cells.forEach(([cx, cy]) => block(cx, cy)); return put(kind, x, y, o); };
  camp('tent', 12.5, 20.2, [[11, 19], [12, 19], [13, 19]], { col: '#e07b39' });
  camp('tent', 20.5, 19.6, [[19, 18], [20, 18], [21, 18]], { col: '#4f9a5a' });
  camp('fire', 16.5, 22.9, [[16, 22]]);
  smokers.push({ x: 16.5 * TS, y: 22.9 * TS - 14, t: 0, fire: true });
  camp('log', 13.6, 23.7, [[13, 23]]); camp('log', 19.4, 23.9, [[19, 23]]); camp('log', 16.5, 25.4, [], { small: true });
  camp('crate', 22.4, 20.4, [[22, 20]]); camp('crate', 23.2, 21.1, [[23, 21]]);
  camp('lamp', 9.6, 23.4, [[9, 23]]); camp('sign', 24.6, 23.6, [[24, 23]]);
  camp('pot', 18, 22.2, []);
  // the village
  camp('well', 44.5, 22.2, [[44, 21]]);
  camp('stall', 48.5, 23.3, [[47, 22], [48, 22], [49, 22]]);
  [[42.5, 17.4], [43.4, 17.6], [36.4, 22.4], [50.6, 20.4]].forEach(([x, y]) => camp('barrel', x, y, [[Math.floor(x), Math.floor(y - .4)]]));
  [[51.4, 21.6], [52.2, 21.4]].forEach(([x, y]) => camp('crate', x, y, [[Math.floor(x), Math.floor(y - .4)]]));
  [[38.6, 19.4], [51.4, 25.4], [41.4, 26.6]].forEach(([x, y]) => camp('lamp', x, y, [[Math.floor(x), Math.floor(y - .4)]]));
  camp('hay', 54, 29.2, [[53, 28], [54, 28]]);
  for (let x = 52; x < 56; x++) { camp('fenceH', x + .5, 19.8, [[x, 19]]); camp('fenceH', x + .5, 25.8, [[x, 25]]); }
  for (let y = 20; y < 25; y++) camp('fenceV', 52.5, y + .9, [[52, y]]);
  for (let y = 20; y < 25; y++) for (let x = 53; x < 55; x++) put('wheat', x + .5, y + .9, { ph: rnd() * 6 });
  // a bench and flowers on the lake shore, a stump clearing in the forest
  camp('log', 9.5, 29.6, [[9, 29]]); camp('rock', 23.5, 30.6, [[23, 30]]);
  camp('stump', 34.5, 38.6, [[34, 38]]); put('shroom', 35.6, 39.4); put('shroom', 33.4, 37.6);
  // trees: walls of forest on the edges, a real forest in the south-east, a few around the meadow
  for (let y = MOUNT_ROWS; y < MH; y++) for (let x = 0; x < MW; x++) {
    const edge = x < 4 || x >= 56 || y >= 42, forest = x >= 29 && y >= 33, nearEdge = x === 4 || x === 55 || y === 41;
    if (edge) treeAt(x, y);
    else if (nearEdge && rnd() < .6) treeAt(x, y);
    else if (forest && rnd() < .42) treeAt(x, y, rnd() < .65 ? 'pine' : 'oak');
    else if (y < 15 && rnd() < .12) treeAt(x, y, 'pine');
    else if (!forest && y > 14 && rnd() < .025 && !(x > 7 && x < 26 && y > 16 && y < 30) && !(x > 34 && x < 56 && y > 10 && y < 33)) treeAt(x, y, 'oak');
  }
  for (let x = 0; x < MW; x++) { if (!blocked[idx(x, MOUNT_ROWS)] && rnd() < .35) { block(x, MOUNT_ROWS); put('rock', x + .5, MOUNT_ROWS + .8, { v: Math.floor(rnd() * 3) }); } }
  for (let k = 0; k < 26; k++) { const x = Math.floor(rnd() * MW), y = MOUNT_ROWS + 1 + Math.floor(rnd() * 30); if (tileAt(x, y) === T.GRASS && !blocked[idx(x, y)]) put('bush', x + .5, y + .8, { v: Math.floor(rnd() * 3) }); }
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x < 2 || x >= MW - 2 || y >= MH - 2) block(x, y);
}

/* ---------- sprites (built once, cached) ---------- */
const WSPR = {};
function oakSprite(v) {
  const c = mk(36, 46), g = c.getContext('2d'), j = (a, s) => a + Math.round((hash(v, s, 3) - .5) * 4);
  P(g, 15, 30, 6, 13, '#6b4a2e'); P(g, 15, 30, 2, 13, '#4f3520'); P(g, 13, 41, 10, 2, '#5a3d24');
  const blobs = [[18, 17, 13], [j(9, 1), 21, 8], [j(27, 2), 21, 8], [18, j(27, 3), 9], [j(12, 4), 10, 7], [j(24, 5), 10, 7]];
  blobs.forEach(([x, y, r]) => disc(g, x, y, r, '#2f6b33'));
  blobs.forEach(([x, y, r]) => disc(g, x - 1, y - 2, r - 2, ['#3f8a3a', '#468f3c', '#3b8240'][v]));
  blobs.forEach(([x, y, r]) => disc(g, x - 2, y - 4, Math.max(1, r - 6), '#62ad4c'));
  for (let k = 0; k < 26; k++) { const x = 6 + Math.floor(hash(v, k, 9) * 24), y = 4 + Math.floor(hash(k, v, 8) * 26); if (g.getImageData(x, y, 1, 1).data[3]) P(g, x, y, 1, 1, hash(x, y) < .5 ? '#7cc35a' : '#2a5a2c'); }
  return outline(c);
}
function pineSprite(v) {
  const c = mk(28, 48), g = c.getContext('2d');
  P(g, 12, 38, 4, 8, '#5e3f26'); P(g, 12, 38, 1, 8, '#432c1a');
  const tiers = [[14, 30, 12], [14, 21, 10], [14, 13, 8], [14, 6, 5]];
  tiers.forEach(([cx, top, hw], i) => {
    for (let y = 0; y < 11; y++) { const w = Math.round(hw * (y + 2) / 12); P(g, cx - w, top + y - 4, w * 2, 1, '#24563a'); P(g, cx - w, top + y - 4, Math.max(1, w), 1, ['#2f7046', '#317548', '#2c6a43'][v]); }
    P(g, cx - Math.round(hw * .5), top + 4, 2, 1, '#4c9a5c');
  });
  P(g, 13, 1, 2, 2, '#2f7046');
  return outline(c);
}
function rockSprite(v) {
  const c = mk(18, 13), g = c.getContext('2d');
  disc(g, 9, 7, 5 + (v % 2), '#7d7f86'); disc(g, 8, 5, 3 + (v % 2), '#a3a5ab'); P(g, 6, 3, 2, 1, '#c8cad0');
  if (v === 2) { disc(g, 14, 9, 2, '#7d7f86'); }
  return outline(c);
}
function bushSprite(v) {
  const c = mk(20, 15), g = c.getContext('2d');
  disc(g, 7, 8, 5, '#2f6b33'); disc(g, 13, 8, 5, '#2f6b33'); disc(g, 10, 6, 5, '#3f8a3a'); disc(g, 9, 5, 2, '#62ad4c');
  if (v === 1) [[6, 8], [12, 6], [14, 9]].forEach(([x, y]) => P(g, x, y, 1, 1, '#e8475a'));
  if (v === 2) [[7, 6], [13, 8]].forEach(([x, y]) => P(g, x, y, 1, 1, '#ffffff'));
  return outline(c);
}
function houseSprite(w, d, roof, sign) {
  const W = w * TS + 2, Hh = d * TS + 18, c = mk(W, Hh), g = c.getContext('2d'), wallTop = Hh - 24;
  const rD = shade(roof, -.3), rL = shade(roof, .22);
  // roof with tile rows, a light ridge and a dark eave
  for (let y = 4; y < wallTop + 2; y++) P(g, 1, y, W - 2, 1, (y - 4) % 5 === 4 ? rD : roof);
  for (let y = 4; y < wallTop; y += 5) for (let x = 2 + ((y / 5) % 2) * 3; x < W - 2; x += 6) P(g, x, y, 1, 4, rD);
  P(g, 1, 3, W - 2, 2, rL); P(g, 1, wallTop + 1, W - 2, 2, shade(roof, -.5));
  // chimney
  const cx = Math.round(W * .72) - 3; P(g, cx, 0, 7, 9, '#8a8278'); P(g, cx, 0, 7, 2, '#a9a196'); P(g, cx + 5, 2, 2, 7, '#6e675e');
  // front wall: plaster, timber beams, door, windows with flower boxes
  P(g, 2, wallTop + 3, W - 4, Hh - wallTop - 3, '#ead9b5'); P(g, 2, wallTop + 3, W - 4, 2, '#6b4a2e'); P(g, 2, Hh - 2, W - 4, 2, '#8a7a62');
  for (let x = 2; x < W - 2; x += 32) P(g, x, wallTop + 3, 2, Hh - wallTop - 3, '#6b4a2e'); P(g, W - 4, wallTop + 3, 2, Hh - wallTop - 3, '#6b4a2e');
  const dx = Math.round(W / 2) - 4; P(g, dx - 1, Hh - 15, 10, 14, '#4a2f1a'); P(g, dx, Hh - 14, 8, 13, '#7a4f2c'); P(g, dx + 3, Hh - 14, 1, 13, '#5e3b20'); P(g, dx + 6, Hh - 8, 1, 1, '#ffd36b');
  [[8, Hh - 17], [W - 16, Hh - 17]].forEach(([x, y]) => { P(g, x - 1, y - 1, 9, 9, '#6b4a2e'); P(g, x, y, 7, 7, '#9fd3e6'); P(g, x + 3, y, 1, 7, '#6b4a2e'); P(g, x, y + 3, 7, 1, '#6b4a2e'); P(g, x, y, 2, 2, '#d8f2ff'); P(g, x - 1, y + 8, 9, 2, '#3f8a3a'); P(g, x + 1, y + 7, 1, 1, '#ff7eb6'); P(g, x + 5, y + 7, 1, 1, '#ffd36b'); });
  if (sign) { P(g, dx - 10, Hh - 21, 2, 6, '#5e3b20'); P(g, dx - 15, Hh - 17, 11, 7, '#9a6b3f'); P(g, dx - 13, Hh - 15, 7, 1, '#ffd36b'); P(g, dx - 13, Hh - 13, 5, 1, '#ffd36b'); }
  return outline(c);
}
function tentSprite(col) {
  const c = mk(36, 30), g = c.getContext('2d'), d = shade(col, -.25), l = shade(col, .2);
  for (let y = 0; y < 24; y++) { const w = Math.round(y * 16 / 23); P(g, 18 - w, 4 + y, w, 1, l); P(g, 18, 4 + y, w, 1, d); }
  for (let y = 10; y < 24; y++) { const w = Math.round((y - 10) * 5 / 13); P(g, 18 - w, 4 + y, w * 2 + 1, 1, '#3a2418'); }
  P(g, 17, 1, 2, 4, '#6b4a2e'); P(g, 2, 27, 32, 1, shade(col, -.45));
  return outline(c);
}
function simpleSprite(kind) {
  let c, g;
  const S2 = (w, h) => { c = mk(w, h); g = c.getContext('2d'); };
  if (kind === 'log') { S2(24, 11); P(g, 2, 3, 19, 6, '#7a5233'); P(g, 2, 3, 19, 2, '#946640'); disc(g, 20, 6, 3, '#c49a62'); P(g, 20, 6, 1, 1, '#7a5233'); }
  else if (kind === 'crate') { S2(14, 14); P(g, 1, 1, 12, 12, '#a4743f'); P(g, 1, 1, 12, 2, '#c08a4e'); P(g, 1, 6, 12, 1, '#6e4a2a'); P(g, 6, 1, 1, 12, '#6e4a2a'); }
  else if (kind === 'barrel') { S2(14, 16); P(g, 2, 1, 10, 14, '#8a5a32'); P(g, 1, 3, 12, 10, '#8a5a32'); P(g, 3, 1, 3, 14, '#a4703f'); P(g, 1, 4, 12, 1, '#55555c'); P(g, 1, 11, 12, 1, '#55555c'); P(g, 3, 1, 8, 1, '#5e3b20'); }
  else if (kind === 'lamp') { S2(10, 30); P(g, 4, 8, 2, 21, '#3b3b44'); P(g, 2, 27, 6, 2, '#3b3b44'); P(g, 1, 1, 8, 2, '#3b3b44'); P(g, 2, 3, 6, 6, '#ffe39a'); P(g, 3, 4, 2, 3, '#fff6cf'); P(g, 1, 9, 8, 1, '#3b3b44'); }
  else if (kind === 'sign') { S2(18, 18); P(g, 8, 6, 2, 11, '#5e3b20'); P(g, 1, 3, 16, 7, '#9a6b3f'); P(g, 12, 4, 4, 5, '#9a6b3f'); P(g, 3, 5, 9, 1, '#4a2f1a'); P(g, 3, 7, 6, 1, '#4a2f1a'); }
  else if (kind === 'well') { S2(22, 28); P(g, 2, 2, 18, 3, '#b8463a'); P(g, 4, 0, 14, 2, '#d0574a'); P(g, 3, 5, 2, 12, '#6b4a2e'); P(g, 17, 5, 2, 12, '#6b4a2e'); P(g, 5, 8, 12, 1, '#6b4a2e'); P(g, 10, 9, 2, 4, '#8a8278'); disc(g, 11, 20, 8, '#8a8278'); disc(g, 11, 18, 6, '#a9a196'); disc(g, 11, 18, 4, '#2f5a8a'); P(g, 9, 17, 2, 1, '#7fb6e8'); }
  else if (kind === 'stall') { S2(38, 32); for (let x = 1; x < 37; x++) P(g, x, 2, 1, 8, Math.floor(x / 4) % 2 ? '#ffffff' : '#d94a4a'); for (let x = 1; x < 37; x += 4) P(g, x, 10, 4, 2, Math.floor(x / 4) % 2 ? '#e8e8e8' : '#b83a3a'); P(g, 2, 10, 2, 20, '#6b4a2e'); P(g, 34, 10, 2, 20, '#6b4a2e'); P(g, 2, 20, 34, 10, '#9a6b3f'); P(g, 2, 20, 34, 2, '#b8854f'); [[6, '#e8475a'], [10, '#ffb347'], [14, '#e8475a'], [20, '#c9a227'], [25, '#7cc35a'], [29, '#ffb347']].forEach(([x, col]) => { P(g, x, 17, 3, 3, col); }); }
  else if (kind === 'hay') { S2(26, 18); disc(g, 13, 10, 8, '#d9b44a'); disc(g, 12, 8, 6, '#e8cc6a'); for (let k = 0; k < 10; k++) P(g, 5 + k * 2, 6 + (k % 3) * 3, 1, 2, '#b8932f'); }
  else if (kind === 'fenceH') { S2(18, 12); P(g, 1, 1, 2, 10, '#7a5233'); P(g, 15, 1, 2, 10, '#7a5233'); P(g, 1, 3, 16, 2, '#946640'); P(g, 1, 7, 16, 2, '#946640'); }
  else if (kind === 'fenceV') { S2(6, 20); P(g, 2, 1, 2, 18, '#946640'); P(g, 1, 1, 4, 3, '#7a5233'); P(g, 1, 15, 4, 3, '#7a5233'); }
  else if (kind === 'stump') { S2(18, 12); P(g, 3, 4, 12, 7, '#7a5233'); disc(g, 9, 4, 6, '#c49a62'); disc(g, 9, 4, 3, '#a87c48'); P(g, 9, 4, 1, 1, '#7a5233'); }
  else if (kind === 'shroom') { S2(8, 8); P(g, 3, 4, 2, 3, '#f2e6d0'); disc(g, 4, 3, 2, '#d94a4a'); P(g, 3, 2, 1, 1, '#ffffff'); }
  else if (kind === 'pot') { S2(12, 10); disc(g, 6, 5, 4, '#3b3b44'); P(g, 3, 2, 6, 1, '#55555c'); P(g, 4, 3, 4, 1, '#7fb26a'); }
  return outline(c);
}
function objSprite(o) {
  const k = o.kind, key = k + (o.v ?? '') + (o.col || '');
  if (WSPR[key]) return WSPR[key];
  return WSPR[key] = k === 'oak' ? oakSprite(o.v) : k === 'pine' ? pineSprite(o.v) : k === 'rock' ? rockSprite(o.v || 0) : k === 'bush' ? bushSprite(o.v) : k === 'tent' ? tentSprite(o.col) : simpleSprite(k);
}

/* ---------- characters: 16x24 pixel sprites built from a look (hair, skin, shirt, pants, style) ---------- */
const charCache = new Map();
function charSprite(look, dir, f) {
  const key = `${look.hair}${look.skin}${look.shirt}${look.pants}${look.style}|${dir}|${f}`;
  if (charCache.has(key)) return charCache.get(key);
  const side = dir === 'left' || dir === 'right', c = mk(18, 27), g = c.getContext('2d');
  const p = (x, y, w, h, col) => P(g, x + 1, y + 1, w, h, col);
  const hair = look.hair, hairD = shade(hair, -.3), hairL = shade(hair, .35), skin = look.skin, skinD = shade(skin, -.14);
  const shirt = look.shirt, shirtD = shade(shirt, -.22), shirtL = shade(shirt, .25), pants = look.pants, pantsD = shade(pants, -.3), boot = '#4a3226', eye = '#2a2030';
  const long = look.style === 1 || look.style === 3, step = [0, 1, 0, -1][f] || 0, oy = f % 2 ? 1 : 0;
  // legs and boots (they don't bob)
  if (!side) {
    const lh = 3 - Math.max(0, step), rh = 3 - Math.max(0, -step);
    p(5, 18, 2, lh, pants); p(5, 18 + lh, 2, 2, boot); p(9, 18, 2, rh, pants); p(9, 18 + rh, 2, 2, boot);
  } else {
    p(6 - step, 18, 2, 3, pantsD); p(6 - step, 21, 3, 2, boot); p(7 + step, 18, 2, 3, pants); p(7 + step, 21, 3, 2, boot);
  }
  if (dir === 'down') {
    if (long) { p(2, 8 + oy, 2, 7, hairD); p(12, 8 + oy, 2, 7, hairD); }
    p(5, 11 + oy, 6, 5, shirt); p(7, 11 + oy, 2, 1, shirtL); p(10, 11 + oy, 1, 5, shirtD); p(5, 16 + oy, 6, 2, pants); p(5, 16 + oy, 6, 1, pantsD);
    p(4, 12 + oy + (step > 0 ? 1 : 0), 1, 4, shirtD); p(4, 16 + oy + (step > 0 ? 1 : 0), 1, 1, skin);
    p(11, 12 + oy + (step < 0 ? 1 : 0), 1, 4, shirtD); p(11, 16 + oy + (step < 0 ? 1 : 0), 1, 1, skin);
    // big round head: face, then the hair cap with bangs and sides
    p(4, 4 + oy, 8, 6, skin); p(5, 10 + oy, 6, 1, skinD);
    p(5, 1 + oy, 6, 1, hair); p(4, 2 + oy, 8, 1, hair); p(3, 3 + oy, 10, 2, hair); p(3, 5 + oy, 2, long ? 5 : 3, hair); p(11, 5 + oy, 2, long ? 5 : 3, hair);
    p(5, 5 + oy, 1, 1, hair); p(8, 5 + oy, 1, 1, hair); p(10, 5 + oy, 1, 1, hair); p(5, 2 + oy, 3, 1, hairL); p(4, 3 + oy, 1, 1, hairL);
    if (!long) { p(4, 0 + oy, 1, 1, hair); p(7, 0 + oy, 1, 1, hair); p(10, 0 + oy, 1, 1, hair); }
    p(5, 6 + oy, 2, 2, eye); p(9, 6 + oy, 2, 2, eye); p(5, 6 + oy, 1, 1, '#ffffff'); p(9, 6 + oy, 1, 1, '#ffffff');
    p(5, 9 + oy, 1, 1, '#ff9aa8'); p(10, 9 + oy, 1, 1, '#ff9aa8'); p(7, 9 + oy, 2, 1, '#c97a7a');
  } else if (dir === 'up') {
    p(5, 11 + oy, 6, 5, shirt); p(5, 11 + oy, 1, 5, shirtD); p(5, 16 + oy, 6, 2, pants);
    p(4, 12 + oy + (step > 0 ? 1 : 0), 1, 4, shirtD); p(4, 16 + oy + (step > 0 ? 1 : 0), 1, 1, skin);
    p(11, 12 + oy + (step < 0 ? 1 : 0), 1, 4, shirtD); p(11, 16 + oy + (step < 0 ? 1 : 0), 1, 1, skin);
    p(5, 1 + oy, 6, 1, hair); p(4, 2 + oy, 8, 1, hair); p(3, 3 + oy, 10, 7, hair); p(4, 10 + oy, 8, 1, hairD); p(5, 2 + oy, 3, 1, hairL); p(4, 4 + oy, 1, 2, hairL);
    if (long) { p(4, 10 + oy, 8, 3, hair); p(5, 13 + oy, 6, 1, hair); p(7, 14 + oy, 2, 1, hairD); }
    else { p(4, 0 + oy, 1, 1, hair); p(10, 0 + oy, 1, 1, hair); }
  } else {
    if (long) { p(2, 7 + oy, 3, 7, hairD); }
    p(5, 11 + oy, 6, 5, shirt); p(5, 11 + oy, 1, 5, shirtD); p(5, 16 + oy, 6, 2, pants);
    p(7 + step, 12 + oy, 2, 4, shirtD); p(7 + step, 16 + oy, 2, 1, skin);
    p(4, 4 + oy, 8, 6, skin); p(12, 7 + oy, 1, 1, skin); p(5, 10 + oy, 6, 1, skinD);
    p(5, 1 + oy, 6, 1, hair); p(4, 2 + oy, 8, 1, hair); p(3, 3 + oy, 9, 2, hair); p(3, 5 + oy, 4, long ? 6 : 4, hair); p(10, 5 + oy, 2, 1, hair); p(5, 2 + oy, 3, 1, hairL);
    if (!long) { p(5, 0 + oy, 1, 1, hair); p(8, 0 + oy, 1, 1, hair); }
    p(9, 6 + oy, 2, 2, eye); p(9, 6 + oy, 1, 1, '#ffffff'); p(10, 9 + oy, 1, 1, '#ff9aa8');
  }
  outline(c);
  let out = c;
  if (dir === 'left') { out = mk(18, 27); const og = out.getContext('2d'); og.translate(18, 0); og.scale(-1, 1); og.drawImage(c, 0, 0); }
  charCache.set(key, out);
  return out;
}

/* ---------- static ground: tiles, shores, the mountain backdrop ---------- */
const ground = mk(MW * TS, MH * TS);
const COL = {
  [T.GRASS]: ['#5fa143', '#6cb34c', '#548f3b'], [T.DARK]: ['#3f7a35', '#478640', '#356b2e'], [T.DIRT]: ['#b88a55', '#c99b64', '#a37645'],
  [T.COBBLE]: ['#8f8a80', '#a9a499', '#6f6b63'], [T.WATER]: ['#3d7fc4', '#4a8fd2', '#2f6aa8'], [T.SAND]: ['#e3c98f', '#ecd7a3', '#cfb276'],
  [T.BRIDGE]: ['#9a6b3f', '#b07d4b', '#6e4a2a'], [T.DOCK]: ['#9a6b3f', '#b07d4b', '#6e4a2a'], [T.STEP]: ['#3d7fc4', '#4a8fd2', '#2f6aa8'],
  [T.FIELD]: ['#8a6a3a', '#9a7a44', '#6e522a'], [T.ROCK]: ['#7a8090', '#8a90a0', '#6a7080']
};
function paintTile(g, x, y) {
  const t = tileAt(x, y), [base, lite, dark] = COL[t], X = x * TS, Y = y * TS;
  P(g, X, Y, TS, TS, base);
  if (t === T.GRASS || t === T.DARK || t === T.SAND || t === T.DIRT || t === T.FIELD) {
    for (let k = 0; k < 18; k++) { const px = Math.floor(hash(x, y, k) * TS), py = Math.floor(hash(y, x, k + 40) * TS); P(g, X + px, Y + py, 1, 1, k % 2 ? lite : dark); }
    if ((t === T.GRASS || t === T.DARK) && hash(x, y, 7) < .35) { const px = 2 + Math.floor(hash(x, y, 8) * 11), py = 4 + Math.floor(hash(x, y, 9) * 9); P(g, X + px, Y + py, 1, 3, dark); P(g, X + px + 2, Y + py - 1, 1, 4, dark); P(g, X + px + 1, Y + py, 1, 3, lite); }
    if (t === T.GRASS && hash(x, y, 11) < .06) { const px = 3 + Math.floor(hash(x, y, 12) * 9), py = 3 + Math.floor(hash(x, y, 13) * 9), fc = ['#ffffff', '#ffd94a', '#ff8ab4', '#a98bff'][Math.floor(hash(x, y, 14) * 4)]; P(g, X + px, Y + py - 1, 1, 1, fc); P(g, X + px - 1, Y + py, 3, 1, fc); P(g, X + px, Y + py + 1, 1, 1, fc); P(g, X + px, Y + py, 1, 1, '#ffd94a'); }
    if (t === T.FIELD) for (let r = 2; r < TS; r += 4) P(g, X, Y + r, TS, 1, dark);
    // soft edges where grass meets paths
    if (t === T.DIRT || t === T.SAND) [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      const n = tileAt(x + dx, y + dy); if (n !== T.GRASS && n !== T.DARK) return;
      const gc = COL[n];
      for (let k = 0; k < 10; k++) { const a = Math.floor(hash(x, y, k + dx * 7 + dy * 13) * TS), b = Math.floor(hash(y, x, k + 70) * 3); const px = dx ? (dx < 0 ? b : TS - 1 - b) : a, py = dy ? (dy < 0 ? b : TS - 1 - b) : a; P(g, X + px, Y + py, 1, 1, gc[k % 3]); }
    });
  } else if (t === T.COBBLE) {
    for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { const sx = X + q * 6 + (r % 2) * 3 - 2, sy = Y + r * 4; P(g, sx + 1, sy + 1, 4, 2, lite); P(g, sx + 1, sy + 3, 4, 1, dark); P(g, sx + 1, sy + 1, 1, 1, '#c2bdb2'); }
  } else if (t === T.WATER || t === T.STEP) {
    for (let k = 0; k < 6; k++) { const px = Math.floor(hash(x, y, k) * 13), py = Math.floor(hash(y, x, k + 5) * TS); P(g, X + px, Y + py, 3, 1, k % 2 ? lite : dark); }
    // shore: a dirt lip above the water and foam along the edge
    if (!isWater(tileAt(x, y - 1)) && tileAt(x, y - 1) !== T.STEP && tileAt(x, y - 1) !== T.BRIDGE) { P(g, X, Y, TS, 3, '#6b4a2e'); P(g, X, Y + 3, TS, 1, '#cfe8ff'); }
    if (!isWater(tileAt(x - 1, y)) && tileAt(x - 1, y) !== T.STEP && tileAt(x - 1, y) !== T.BRIDGE) P(g, X, Y, 1, TS, '#cfe8ff');
    if (!isWater(tileAt(x + 1, y)) && tileAt(x + 1, y) !== T.STEP && tileAt(x + 1, y) !== T.BRIDGE) P(g, X + TS - 1, Y, 1, TS, '#cfe8ff');
    if (!isWater(tileAt(x, y + 1)) && tileAt(x, y + 1) !== T.STEP && tileAt(x, y + 1) !== T.BRIDGE) P(g, X, Y + TS - 1, TS, 1, '#cfe8ff');
    if (t === T.STEP) { disc(g, X + 8, Y + 9, 5, '#6f7378'); disc(g, X + 7, Y + 7, 4, '#9ea3a8'); P(g, X + 5, Y + 5, 2, 1, '#c8cbd0'); }
    else if (hash(x, y, 30) < .07 && Math.hypot((x + .5 - LAKE.x) / LAKE.rx, (y + .5 - LAKE.y) / LAKE.ry) < .85) { disc(g, X + 8, Y + 8, 3, '#3f8a3a'); P(g, X + 8, Y + 6, 1, 2, '#2f6aa8'); if (hash(x, y, 31) < .4) P(g, X + 7, Y + 7, 2, 2, '#ff9ac4'); }
  } else if (t === T.BRIDGE || t === T.DOCK) {
    const vert = t === T.BRIDGE;
    for (let k = 0; k < TS; k += 4) vert ? P(g, X + k, Y, 1, TS, dark) : P(g, X, Y + k, TS, 1, dark);
    for (let k = 0; k < 4; k++) P(g, X + Math.floor(hash(x, y, k) * TS), Y + Math.floor(hash(y, x, k) * TS), 1, 1, lite);
    if (vert) { if (tileAt(x, y - 1) !== T.BRIDGE) { P(g, X, Y, TS, 2, '#5e3b20'); P(g, X + 2, Y - 3, 2, 5, '#5e3b20'); } if (tileAt(x, y + 1) !== T.BRIDGE) { P(g, X, Y + TS - 2, TS, 2, '#5e3b20'); } }
    else { if (tileAt(x - 1, y) !== T.DOCK) P(g, X, Y, 2, TS, '#5e3b20'); if (tileAt(x + 1, y) !== T.DOCK) P(g, X + TS - 2, Y, 2, TS, '#5e3b20'); }
  }
  // reeds where the lake meets land
  if (t === T.SAND && [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => isWater(tileAt(x + dx, y + dy))) && hash(x, y, 50) < .3) { P(g, X + 4, Y + 6, 1, 8, '#4c7a3a'); P(g, X + 6, Y + 4, 1, 10, '#5a8a44'); P(g, X + 6, Y + 3, 1, 3, '#7a4f2c'); }
}
function paintMountains(g) {
  const H0 = MOUNT_ROWS * TS + 4, W = MW * TS;
  // sky in pixel bands
  const sky = ['#8fcff2', '#9dd6f4', '#abdcf6', '#bae3f7', '#c8e9f8', '#d6eff9'];
  for (let y = 0; y < H0; y++) P(g, 0, y, W, 1, sky[Math.min(sky.length - 1, Math.floor(y / H0 * sky.length * 1.4))]);
  // far blue range, then the near rocky peaks with snow caps
  const ridge = (x, s, base, amp) => base - amp * (.55 * Math.abs(Math.sin(x * .011 + s)) + .3 * Math.abs(Math.sin(x * .031 + s * 2)) + .15 * Math.sin(x * .09 + s * 3));
  for (let x = 0; x < W; x++) {
    const top = Math.round(ridge(x, 1.3, 120, 90));
    P(g, x, top, 1, H0 - top, '#8ea3cf'); P(g, x, top, 1, 3, '#e8f1ff');
    if ((x + top) % 7 === 0) P(g, x, top + 4, 1, 6, '#7f93c0');
  }
  for (let x = 0; x < W; x++) {
    const top = Math.round(ridge(x, 4.1, 158, 105)), snow = top + 6 + Math.round(4 * Math.sin(x * .2));
    for (let y = top; y < H0; y++) {
      const shadeSide = Math.sin(x * .011 + 4.1) * Math.cos(x * .011 + 4.1) > 0;
      let col = y < snow ? (shadeSide ? '#c9d6ec' : '#f4f8ff') : (shadeSide ? '#5f6676' : '#7a8192');
      if (y >= snow && hash(x, y, 2) < .06) col = '#8d95a6';
      if (y > H0 - 22) col = hash(x, y, 4) < .5 ? '#6a6f78' : '#5a5f68';
      P(g, x, y, 1, 1, col);
    }
  }
  // a rocky foot that fades into the meadow
  for (let x = 0; x < W; x += 2) { const h = 6 + Math.floor(hash(x, 1, 3) * 10); P(g, x, H0 - 2, 2, h, hash(x, 2) < .5 ? '#6a6f78' : '#808590'); P(g, x, H0 - 2 + h, 2, 2, '#4f8a3a'); }
}
function paintGround() {
  const g = ground.getContext('2d');
  for (let y = MOUNT_ROWS; y < MH; y++) for (let x = 0; x < MW; x++) paintTile(g, x, y);
  paintMountains(g);
}

/* ---------- minimap base: one 4px square per tile ---------- */
const MPX = 4, mapBase = mk(MW * MPX, MH * MPX);
function paintMapBase() {
  const g = mapBase.getContext('2d');
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) P(g, x * MPX, y * MPX, MPX, MPX, y < MOUNT_ROWS ? (y < 4 ? '#e9f1ff' : '#7a8192') : COL[tileAt(x, y)][0]);
  objects.forEach(o => {
    if (o.kind === 'oak' || o.kind === 'pine') P(g, o.x * MPX - 2, o.y * MPX - 4, 4, 4, '#2a5a2c');
    else if (o.kind === 'house') P(g, o.h.x * MPX, o.h.y * MPX, o.h.w * MPX, o.h.d * MPX, o.h.roof);
    else if (o.kind === 'tent') P(g, o.x * MPX - 4, o.y * MPX - 4, 8, 4, o.col);
    else if (o.kind === 'fire') P(g, o.x * MPX - 2, o.y * MPX - 3, 4, 4, '#ffb347');
  });
}

buildMap(); paintGround(); paintMapBase();

/* ---------- people ---------- */
const HAIRS = ['#ff5f8f', '#5b6cff', '#ffcf4a', '#8a5a3c', '#a066ff', '#2b2b3a', '#3fd0c9', '#ff8a3d', '#f4f4f4', '#ff3d5a'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const BOT_NAMES = ['Mira', 'Juno', 'Kai', 'Pip', 'Sol', 'Nova', 'Rin', 'Teo', 'Yumi'];
const BOT_LINES = ['bruh...', 'nah.', 'anyone trading?', 'just pulled a UR!!', 'gg', 'when does the event start?', 'hi :)', 'lol', 'the lake is so pretty', 'meet at the campfire', 'pity at 46, send help', 'nice skin!', 'brb', 'anyone exploring the forest?', 'the market has fresh apples'];
const BOT_REPLIES = ['hey!', 'lol', 'same', 'real', 'hiii', 'haha', 'true', '👋'];
const EMOTES = ['😂', '😍', '😮', '😢', '👋', '❤️', '😤', '✨'];

function walkable(x, y) {
  const r = .22;
  for (const [ox, oy] of [[-r, -r * .5], [r, -r * .5], [-r, r * .5], [r, r * .5]]) {
    const tx = Math.floor(x + ox), ty = Math.floor(y + oy);
    if (!inMap(tx, ty) || blocked[idx(tx, ty)]) return false;
  }
  return true;
}
const canStand = (fx, fy, x, y) => walkable(x, y);
function lineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / .12);
  for (let i = 1; i <= n; i++) if (!walkable(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
  return true;
}
/* tile pathfinding (breadth-first, 8 directions; diagonals only when both sides are open) */
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const open = (x, y) => inMap(x, y) && !blocked[idx(x, y)];
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
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(clamp(cx + (Math.random() * 2 - 1) * rad, 2, MW - 3)) + .5, y = Math.floor(clamp(cy + (Math.random() * 2 - 1) * rad, MOUNT_ROWS + 1, MH - 3)) + .5;
    if (walkable(x, y)) return { x, y };
  }
  return null;
}
function makeEntity(name, x, y, look, bot) {
  return { name, x, y, z: 0, look, bot, path: null, phase: 0, moving: false, dir: 'down', ex: 0, bubble: null, emote: null, idle: Math.random() * 3, nextTalk: 4 + Math.random() * 12, stuck: 0 };
}
if (S.player.mc) S.player.look = { ...MC_LOOK[S.player.mc] };
const SPAWN = { x: 16.5, y: 25.6 };
const player = makeEntity(S.player.name, SPAWN.x, SPAWN.y, S.player.look, false);
const bots = BOT_NAMES.map((n, i) => {
  const p = randomWalkableNear(i % 2 ? 44 : 16, i % 2 ? 22 : 23, 7) || { x: SPAWN.x + 1, y: SPAWN.y };
  return makeEntity(n, p.x, p.y, { ...MC_LOOK[Math.random() < .5 ? 'f' : 'm'] }, true);
});
const entities = [player, ...bots];
const others = () => entities.filter(e => e !== player);
const updateOnline = () => { $('#onlineCount').textContent = `${entities.length} here`; };
updateOnline();
/* village chickens and lake ducks, just for life */
const critters = [
  ...[[46, 19], [41, 24], [53, 27]].map(([x, y]) => ({ kind: 'hen', x, y, tx: x, ty: y, wait: Math.random() * 3, dir: 1, home: { x, y } })),
  ...[0, 2.4].map(a => ({ kind: 'duck', a, sp: .06 + Math.random() * .04 }))
];

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
logChat('', 'Welcome to Blank: Project.', '', true);

$('#chatForm').addEventListener('submit', ev => {
  ev.preventDefault();
  const inp = $('#chatInput'), text = inp.value.trim(); if (!text) return;
  say(player, text.slice(0, 120)); netChat(text.slice(0, 120)); inp.value = ''; inp.blur();
  if (bots.length && Math.random() < .45) {
    const near = bots.filter(b => Math.hypot(b.x - player.x, b.y - player.y) < 8);
    const b = near.length ? pick(near) : pick(bots);
    setTimeout(() => say(b, pick(BOT_REPLIES)), 1200 + Math.random() * 1500);
  }
});
const emotesEl = $('#emotes');
emotesEl.innerHTML = EMOTES.map(e => `<button type="button" aria-label="Emote ${e}">${e}</button>`).join('');
emotesEl.querySelectorAll('button').forEach((b, i) => b.onclick = () => { emote(player, EMOTES[i]); netEmote(EMOTES[i]); emotesEl.hidden = true; });
$('#emoteToggle').onclick = () => { emotesEl.hidden = !emotesEl.hidden; };

let hintTimer;
function showHint() { const h = $('#hint'); h.classList.remove('gone'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('gone'), 6000); }

/* ---------- zones, map, minimap, teleport, people ---------- */
const ZONES = [
  { id: 'camp', name: "Traveler's Camp", desc: 'A cosy campsite by the fire. Every journey starts here.', r: [5, 14, 27, 30], at: [16.5, 25.6], c: '#ffb35c' },
  { id: 'village', name: 'Riverside Village', desc: 'Little houses, a well and a market across the bridge.', r: [32, 11, 56, 33], at: [44.5, 24.5], c: '#7ec8ff' },
  { id: 'forest', name: 'Whispering Forest', desc: 'Tall pines and a quiet trail south of the village.', r: [29, 33, 56, 44], at: [40.5, 36.5], c: '#5fd17a' },
  { id: 'lake', name: 'Mirror Lake', desc: 'A calm lake with a wooden dock and lily pads.', r: [0, 30, 29, 44], at: [13.5, 31.5], c: '#5fd0ff' },
  { id: 'foot', name: 'Mountain Foot', desc: 'A windy meadow under the snowy peaks.', r: [0, 0, 60, 14], at: [20.5, 12.5], c: '#d7dcff' }
];
const CROSSROADS = { id: 'river', name: 'Riverbank', desc: 'Grassy banks along the river.', c: '#a8e6a0' };
const zoneAt = (x, y) => ZONES.find(z => x >= z.r[0] && x < z.r[2] && y >= z.r[1] && y < z.r[3]) || CROSSROADS;
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

/* draw the map into a canvas; returns a function mapping world coords to CSS px */
function drawMap(cv, cssW, cssH, opt = {}) {
  const d = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(cssW * d)) { cv.width = Math.round(cssW * d); cv.height = Math.round(cssH * d); }
  const g = cv.getContext('2d');
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, cssW, cssH);
  const sc = opt.follow ? opt.zoom : Math.min(cssW / mapBase.width, cssH / mapBase.height) * .98;
  let ox = (cssW - mapBase.width * sc) / 2, oy = (cssH - mapBase.height * sc) / 2;
  if (opt.follow) { ox = cssW / 2 - player.x * MPX * sc; oy = cssH / 2 - player.y * MPX * sc; }
  const toPx = (x, y) => ({ x: ox + x * MPX * sc, y: oy + y * MPX * sc });
  g.imageSmoothingEnabled = false;
  g.drawImage(mapBase, ox, oy, mapBase.width * sc, mapBase.height * sc);
  if (opt.zones) ZONES.forEach(z => {
    const a = toPx(Math.max(z.r[0], 2), Math.max(z.r[1], MOUNT_ROWS)), b = toPx(Math.min(z.r[2], MW - 2), Math.min(z.r[3], MH - 2));
    g.fillStyle = hexA(z.c, z.id === curZone.id ? .24 : .1); g.strokeStyle = hexA(z.c, .9); g.lineWidth = 1.5; g.setLineDash([5, 4]);
    g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); g.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); g.setLineDash([]);
  });
  plazaEggs.forEach(e => { const p = toPx(e.x, e.y); g.fillStyle = e.r === 'ur' ? '#ff6ec7' : '#ffd36b'; ell(g, p.x, p.y - 1, 2.6, 3.4); });
  others().forEach(b => { const p = toPx(b.x, b.y); g.fillStyle = 'rgba(10,15,31,.6)'; ell(g, p.x, p.y, 3.6, 3.6); g.fillStyle = b.look.hair; ell(g, p.x, p.y, 2.6, 2.6); });
  const pp = toPx(player.x, player.y);
  g.strokeStyle = 'rgba(126,243,212,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(pp.x, pp.y, 7 + Math.sin(now * 4) * 1.5, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#0a0f1f'; ell(g, pp.x, pp.y, 4.6, 4.6); g.fillStyle = '#7ef3d4'; ell(g, pp.x, pp.y, 3.4, 3.4);
  return toPx;
}
function drawMinimap() {
  const cv = $('#minimap'); if (!cv || hudEl.hidden) return;
  drawMap(cv, cv.clientWidth, cv.clientHeight, { follow: true, zoom: .7 });
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
    cam.x = player.x * TS; cam.y = player.y * TS - 12;
    const f = document.createElement('div'); f.className = 'tele-flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 700);
  }
  if (k >= .95) tele = null;
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
    <p class="tiny">Tap a pin or a card to teleport. Press M in the world to open the map.</p>
  </div>`, onMount: () => { renderMapWindow(); clearInterval(mapTimer); mapTimer = setInterval(() => { if (!modalEl || modalEl.dataset.kind !== 'map') return clearInterval(mapTimer); renderMapWindow(true); }, 400); } });
}
function renderMapWindow(dotsOnly) {
  const cv = $('#mapCanvas'); if (!cv) return;
  const toPx = drawMap(cv, cv.clientWidth, cv.clientHeight, { zones: true });
  if (dotsOnly) return;
  const count = z => entities.filter(e => zoneAt(e.x, e.y).id === z.id).length;
  $('#mapPins').innerHTML = ZONES.map(z => { const p = toPx(z.at[0], z.at[1]); return `<button class="pin ${z.id === curZone.id ? 'here' : ''}" style="left:${p.x}px;top:${p.y}px;--zc:${z.c}" data-tp="${z.id}">${esc(z.name)}</button>`; }).join('');
  $('#zoneList').innerHTML = ZONES.map(z => `<div class="zcard" style="--zc:${z.c}">
      <h4><i></i>${esc(z.name)}</h4><p>${esc(z.desc)}</p>
      <div class="row" style="justify-content:space-between"><span class="tiny">${count(z)} here</span>${z.id === curZone.id ? '<span class="chip">You are here</span>' : `<button class="btn mint sm" data-tp="${z.id}">${icon('map')}Teleport</button>`}</div>
    </div>`).join('');
  document.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { const z = ZONES.find(x => x.id === b.dataset.tp); if (z.id === curZone.id) { closeModal(); return; } teleport(z.at[0], z.at[1]); });
}

/* people panel */
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

/* the screen shows a small pixel buffer scaled up by a whole number, so pixels stay sharp */
let W = 0, H = 0, dpr = 1, scale = 3, marker = null, now = 0;
const buf = mk(320, 180), bctx = buf.getContext('2d');
const cam = { x: player.x * TS, y: player.y * TS - 12 };
let view = { x: 0, y: 0, w: 320, h: 180 };
function screenToTile(sx, sy) { return { x: (view.x + sx / scale) / TS, y: (view.y + sy / scale) / TS }; }
canvas.addEventListener('pointerdown', e => {
  if (menuOpen || modalEl || pullEl || tele) return;
  $('#people').hidden = true;
  emotesEl.hidden = true;
  const t = screenToTile(e.clientX, e.clientY);
  if (!inMap(Math.floor(t.x), Math.floor(t.y))) return;
  player.path = findPath(player.x, player.y, t.x, t.y); player.stuck = 0;
  marker = { x: t.x, y: t.y, t: now };
});
function resize() {
  W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  // a whole-number zoom that shows about 15-17 tiles of height, but never more than the map
  scale = Math.max(2, Math.round(H / 260), Math.ceil(W / (MW * TS)), Math.ceil(H / ((MH - 1) * TS)));
  buf.width = Math.ceil(W / scale); buf.height = Math.ceil(H / scale);
}
addEventListener('resize', resize); resize();

/* update */
function stepEntity(e, vx, vy, dt) {
  const len = Math.hypot(vx, vy);
  if (len < .001) { e.moving = false; return false; }
  vx /= len; vy /= len;
  const sp = 3.6 * dt, nx = e.x + vx * sp, ny = e.y + vy * sp;
  let moved = false;
  if (walkable(nx, e.y)) { e.x = nx; moved = true; }
  if (walkable(e.x, ny)) { e.y = ny; moved = true; }
  e.dir = Math.abs(vx) > Math.abs(vy) * 1.1 ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
  e.moving = moved; if (moved) e.phase += dt * 9;
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
    else if (!b.path) {
      const t = randomWalkableNear(b.x, b.y, 7);
      b.path = t ? findPath(b.x, b.y, t.x, t.y) : null; b.stuck = 0;
      if (!b.path || !b.path.length) { b.path = null; b.idle = 1; }
    } else if (!followPath(b, dt * .75)) { b.idle = 1 + Math.random() * 4; if (Math.random() < .5) b.dir = 'down'; }
    b.nextTalk -= dt;
    if (b.nextTalk <= 0) { b.nextTalk = 8 + Math.random() * 16; if (Math.random() < .6) say(b, pick(BOT_LINES)); else emote(b, pick(EMOTES)); }
  });
  critters.forEach(c => {
    if (c.kind === 'duck') { c.a += c.sp * dt; return; }
    if (c.wait > 0) { c.wait -= dt; return; }
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
    if (d < .05) { c.wait = 1 + Math.random() * 4; const a = Math.random() * 7, r = Math.random() * 2.5; const nx = c.home.x + Math.cos(a) * r, ny = c.home.y + Math.sin(a) * r; if (walkable(nx, ny)) { c.tx = nx; c.ty = ny; } return; }
    c.x += dx / d * dt * 1.2; c.y += dy / d * dt * 1.2; if (Math.abs(dx) > .01) c.dir = dx < 0 ? -1 : 1;
  });
  netUpdate(dt);
  updateEggs(dt); updateFx(dt);
  const k = 1 - Math.pow(.003, dt);
  cam.x += (player.x * TS - cam.x) * k; cam.y += (player.y * TS - 12 - cam.y) * k;
}

/* ---------- ambient effects: smoke, sparks, butterflies, clouds, birds, cloud shadows ---------- */
const puffs = [], embers = [];
const butterflies = Array.from({ length: 6 }, (_, i) => ({ x: (i < 3 ? 16 : 44) + (Math.random() - .5) * 10, y: (i < 3 ? 22 : 21) + (Math.random() - .5) * 8, a: Math.random() * 7, c: ['#ffffff', '#ffd94a', '#ff8ab4'][i % 3] }));
const clouds = Array.from({ length: 6 }, (_, i) => ({ x: i * 190 + Math.random() * 80, y: 8 + Math.random() * 60, w: 40 + Math.random() * 50, sp: 3 + Math.random() * 4 }));
const birds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * MW * TS, y: 30 + Math.random() * 60, sp: 12 + Math.random() * 8, ph: Math.random() * 6 }));
function updateFx(dt) {
  smokers.forEach(s => {
    s.t -= dt;
    if (s.t <= 0) { s.t = s.fire ? .18 : .5; puffs.push({ x: s.x + (Math.random() - .5) * 3, y: s.y, r: s.fire ? 1.5 : 2.5, life: s.fire ? 1.6 : 3, max: s.fire ? 1.6 : 3 }); }
    if (s.fire && Math.random() < dt * 9) embers.push({ x: s.x + (Math.random() - .5) * 8, y: s.y + 8, vx: (Math.random() - .5) * 8, vy: -14 - Math.random() * 14, life: .9, max: .9 });
  });
  for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life -= dt; if (p.life <= 0) { puffs.splice(i, 1); continue; } p.y -= dt * 9; p.x += dt * 4 + Math.sin(now + i) * dt * 2; p.r += dt * 1.6; }
  for (let i = embers.length - 1; i >= 0; i--) { const p = embers[i]; p.life -= dt; if (p.life <= 0) { embers.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; }
  butterflies.forEach(b => { b.a += dt * (1 + Math.sin(now * .7 + b.x)); b.x += Math.cos(b.a) * dt * .9; b.y += Math.sin(b.a * 1.3) * dt * .6; });
  clouds.forEach(c => { c.x += c.sp * dt; if (c.x > MW * TS + 60) c.x = -c.w - 60; });
  birds.forEach(b => { b.x += b.sp * dt; if (b.x > MW * TS + 20) { b.x = -20; b.y = 30 + Math.random() * 60; } });
}

/* catchable eggs in the world */
const plazaEggs = [];
let eggTimer = 45;
function spawnEgg() { const p = randomWalkableNear(30, 26, 22); if (p) plazaEggs.push({ x: p.x, y: p.y, r: Math.random() < .15 ? 'ur' : 'ssr', ph: Math.random() * 6 }); }
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

/* ---------- render ---------- */
const OBJ_BOX = { oak: [18, 44], pine: [14, 46], rock: [9, 12], bush: [10, 14], tent: [18, 28], log: [12, 9], crate: [7, 13], barrel: [7, 15], lamp: [5, 29], sign: [9, 17], well: [11, 26], stall: [19, 30], hay: [13, 16], fenceH: [9, 11], fenceV: [3, 19], stump: [9, 11], shroom: [4, 7], pot: [6, 9] };
function drawHen(g, x, y, dir, t) {
  g.save(); g.translate(Math.round(x), Math.round(y)); if (dir < 0) g.scale(-1, 1);
  const b = Math.floor(t * 4) % 2;
  P(g, -3, -6 + b, 6, 4, '#ffffff'); P(g, 2, -8 + b, 2, 3, '#ffffff'); P(g, 3, -9 + b, 1, 1, '#e8475a'); P(g, 4, -7 + b, 1, 1, '#ffb347'); P(g, 3, -7 + b, 1, 1, '#2a2030'); P(g, -2, -2, 1, 2, '#ffb347'); P(g, 1, -2, 1, 2, '#ffb347'); P(g, -4, -7 + b, 2, 2, '#e8e8e8');
  g.restore();
}
function drawDuck(g, x, y, t) {
  const b = Math.sin(t * 3) > 0 ? 0 : 1;
  P(g, x - 4, y - 3 + b, 7, 3, '#ffffff'); P(g, x + 1, y - 6 + b, 3, 3, '#3f8a3a'); P(g, x + 4, y - 5 + b, 2, 1, '#ffb347'); P(g, x - 5, y + b, 9, 1, '#9fd3f5');
}
function drawFire(g, x, y, t) {
  [[-6, 0], [-4, -2], [0, -3], [4, -2], [6, 0], [3, 2], [-3, 2]].forEach(([dx, dy]) => { P(g, x + dx - 1, y + dy, 3, 2, '#7d7f86'); P(g, x + dx - 1, y + dy, 2, 1, '#a3a5ab'); });
  P(g, x - 4, y - 2, 8, 2, '#6b4a2e'); P(g, x - 2, y - 3, 4, 2, '#5a3d24');
  const f = Math.floor(t * 10);
  for (let k = 0; k < 7; k++) {
    const h = 4 + Math.floor(hash(k, f, 1) * 8), cx = x - 3 + k;
    P(g, cx, y - 2 - h, 1, h, k % 3 === 0 ? '#ff6a2a' : '#ffa03a');
    P(g, cx, y - 2 - Math.floor(h * .55), 1, Math.floor(h * .55), '#ffe17a');
  }
}
function drawBubble(c, x, y, text) {
  c.font = '800 12px Nunito, system-ui, sans-serif';
  const words = text.split(' '), lines = [];
  let cur = '';
  words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (c.measureText(test).width > 150 && cur) { lines.push(cur); cur = w; } else cur = test; });
  if (cur) lines.push(cur);
  if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 18) + '…'; }
  const w = Math.max(...lines.map(l => c.measureText(l).width)) + 16, h = lines.length * 15 + 8;
  c.fillStyle = 'rgba(255,255,255,.96)'; c.strokeStyle = '#26181f'; c.lineWidth = 2;
  c.fillRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), h); c.strokeRect(Math.round(x - w / 2), Math.round(y - h), Math.round(w), h);
  poly(c, [{ x: x - 5, y: y }, { x: x + 5, y: y }, { x, y: y + 6 }]);
  c.fillStyle = '#1b2240'; c.textAlign = 'center'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, x, y - h + 11 + i * 15));
}
function render() {
  const g = bctx, bw = buf.width, bh = buf.height, WW = MW * TS, WH = MH * TS;
  // camera stays inside the map, so the edge of the world never shows
  view = { x: Math.round(clamp(cam.x - bw / 2, 0, WW - bw)), y: Math.round(clamp(cam.y - bh / 2, 0, WH - bh)), w: bw, h: bh };
  const vx = view.x, vy = view.y;
  g.imageSmoothingEnabled = false;
  g.drawImage(ground, -vx, -vy);
  // sky life above the mountains
  if (vy < MOUNT_ROWS * TS) {
    clouds.forEach(cl => { const x = Math.round(cl.x - vx), y = Math.round(cl.y - vy); g.fillStyle = '#ffffff'; g.fillRect(x, y + 4, cl.w, 6); g.fillRect(x + 6, y, cl.w * .5, 6); g.fillRect(x + cl.w * .45, y + 2, cl.w * .4, 4); g.fillStyle = '#dcebf7'; g.fillRect(x + 2, y + 9, cl.w - 4, 2); });
    birds.forEach(b => { const x = Math.round(b.x - vx), y = Math.round(b.y - vy), w = Math.sin(now * 8 + b.ph) > 0 ? 1 : 0; g.fillStyle = '#3a3f55'; g.fillRect(x - 3, y - w, 3, 1); g.fillRect(x + 1, y - w, 3, 1); g.fillRect(x, y, 1, 1); });
  }
  // water shimmer on visible water tiles
  const t2 = Math.floor(now * 2.5);
  for (let ty = Math.max(MOUNT_ROWS, Math.floor(vy / TS)); ty <= Math.min(MH - 1, Math.floor((vy + bh) / TS)); ty++)
    for (let tx = Math.floor(vx / TS); tx <= Math.min(MW - 1, Math.floor((vx + bw) / TS)); tx++) {
      if (tileAt(tx, ty) !== T.WATER) continue;
      for (let k = 0; k < 2; k++) {
        const h = hash(tx, ty, t2 * 3 + k); if (h > .55) continue;
        g.fillStyle = h < .2 ? '#bfe2ff' : '#7fb8ec';
        g.fillRect(tx * TS - vx + Math.floor(hash(ty, tx, t2 + k) * 12), ty * TS - vy + Math.floor(hash(tx + k, ty, t2) * 15), 3, 1);
      }
    }
  // soft cloud shadows drifting over the land
  g.fillStyle = 'rgba(20,40,30,.08)';
  clouds.forEach((cl, i) => { const sx = ((cl.x * 1.6 + i * 300) % (WW + 300)) - 150 - vx, sy = MOUNT_ROWS * TS + 60 + i * 70 - vy; if (sx > -160 && sx < bw + 40 && sy > -60 && sy < bh + 60) { g.fillRect(Math.round(sx), Math.round(sy), 110, 34); g.fillRect(Math.round(sx + 16), Math.round(sy - 10), 70, 54); } });
  // click marker
  if (marker && now - marker.t < .8) { const f = (now - marker.t) / .8, mx = Math.round(marker.x * TS - vx), my = Math.round(marker.y * TS - vy), r = Math.round(3 + f * 6); g.strokeStyle = `rgba(126,243,160,${1 - f})`; g.lineWidth = 1; g.strokeRect(mx - r + .5, my - Math.round(r / 2) + .5, r * 2, r); }
  // everything that stands on the ground, back to front
  const list = [], inView = (x, y, w, h) => x + w > vx - 4 && x - w < vx + bw + 4 && y > vy - 4 && y - h < vy + bh + 60;
  objects.forEach(o => {
    const px = o.x * TS, py = o.y * TS;
    if (o.kind === 'house') { if (inView(px, py, o.spr.width / 2, o.spr.height)) list.push({ y: py, d: () => g.drawImage(o.spr, Math.round(px - o.spr.width / 2 - vx), Math.round(py - o.spr.height - vy + 2)) }); return; }
    if (o.kind === 'fire') { if (inView(px, py, 10, 22)) list.push({ y: py, d: () => drawFire(g, Math.round(px - vx), Math.round(py - vy), now) }); return; }
    if (o.kind === 'wheat') { if (inView(px, py, 8, 12)) list.push({ y: py, d: () => { const sw = Math.round(Math.sin(now * 2 + o.ph) * 1); for (let k = -5; k <= 5; k += 2) { P(g, px - vx + k + sw, py - vy - 10, 1, 9, '#d9b44a'); P(g, px - vx + k + sw, py - vy - 12, 1, 3, '#f0d070'); } } }); return; }
    const box = OBJ_BOX[o.kind]; if (!box || !inView(px, py, box[0], box[1])) return;
    const spr = objSprite(o);
    list.push({ y: py, d: () => {
      if (o.kind === 'oak' || o.kind === 'pine') { g.fillStyle = 'rgba(20,40,20,.25)'; g.fillRect(Math.round(px - vx - 9), Math.round(py - vy - 3), 18, 4); }
      g.drawImage(spr, Math.round(px - vx - box[0]), Math.round(py - vy - box[1]));
    } });
  });
  entities.forEach(e => list.push({ y: e.y * TS, e }));
  critters.forEach(c => {
    if (c.kind === 'hen') list.push({ y: c.y * TS, d: () => drawHen(g, c.x * TS - vx, c.y * TS - vy, c.dir, now + c.home.x) });
    else { const x = (LAKE.x + Math.cos(c.a) * LAKE.rx * .55) * TS - vx, y = (LAKE.y + 1 + Math.sin(c.a) * LAKE.ry * .45) * TS - vy; list.push({ y: -1, d: () => drawDuck(g, Math.round(x), Math.round(y), now + c.a) }); }
  });
  plazaEggs.forEach(e => list.push({ y: e.y * TS, d: () => {
    const x = Math.round(e.x * TS - vx), y = Math.round(e.y * TS - vy), b = Math.round(Math.sin(now * 2.5 + e.ph) * 1.5), ur = e.r === 'ur';
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 4, y - 1, 8, 2);
    P(g, x - 3, y - 9 + b, 6, 7, '#26181f'); P(g, x - 2, y - 10 + b, 4, 9, '#26181f');
    P(g, x - 2, y - 8 + b, 4, 5, ur ? '#ff6ec7' : '#fff1d6'); P(g, x - 1, y - 9 + b, 2, 7, ur ? '#c58bff' : '#ffe2b0'); P(g, x - 1, y - 7 + b, 1, 1, ur ? '#8ff7ea' : '#ff8a2a'); P(g, x + 1, y - 5 + b, 1, 1, ur ? '#ffffff' : '#ff8a2a');
    if (Math.floor(now * 3 + e.ph) % 3 === 0) P(g, x + 3, y - 11 + b, 1, 1, '#ffffff');
  } }));
  list.sort((a, b) => a.y - b.y);
  list.forEach(it => {
    if (!it.e) return it.d();
    const e = it.e, x = Math.round(e.x * TS - vx), y = Math.round(e.y * TS - vy), al = e === player ? teleAlpha() : 1;
    if (e === player) { g.strokeStyle = '#5be36a'; g.lineWidth = 1; g.beginPath(); g.ellipse(x + .5, y + .5, 7, 3, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x - 5, y - 1, 10, 2); g.fillRect(x - 4, y - 2, 8, 4);
    if (al < 1) g.globalAlpha = al;
    g.drawImage(charSprite(e.look, e.dir || 'down', e.moving ? Math.floor(e.phase) % 4 : 0), x - 9, y - 25);
    g.globalAlpha = 1;
    if (e === player) { const b = Math.round(Math.sin(now * 5) * 1.5); g.fillStyle = '#26181f'; g.fillRect(x - 3, y - 34 + b, 7, 1); g.fillStyle = '#5be36a'; g.fillRect(x - 2, y - 33 + b, 5, 1); g.fillRect(x - 1, y - 32 + b, 3, 1); g.fillRect(x, y - 31 + b, 1, 1); }
  });
  // smoke, embers, butterflies
  puffs.forEach(p => { const a = p.life / p.max; g.fillStyle = `rgba(230,230,235,${.55 * a})`; const r = Math.round(p.r); g.fillRect(Math.round(p.x - vx - r), Math.round(p.y - vy - r), r * 2, r * 2); });
  embers.forEach(p => { g.fillStyle = p.life / p.max > .5 ? '#ffe17a' : '#ff7a2a'; g.fillRect(Math.round(p.x - vx), Math.round(p.y - vy), 1, 1); });
  butterflies.forEach(b => { const x = Math.round(b.x * TS - vx), y = Math.round(b.y * TS - vy - 10), w = Math.sin(now * 14 + b.a) > 0; g.fillStyle = b.c; g.fillRect(x - (w ? 2 : 1), y, w ? 2 : 1, 2); g.fillRect(x + 1, y, w ? 2 : 1, 2); g.fillStyle = '#3a2a30'; g.fillRect(x, y, 1, 2); });
  // warm firelight around the camp, a soft vignette
  const fx = 16.5 * TS - vx, fy = 22.4 * TS - vy;
  if (fx > -80 && fx < bw + 80 && fy > -80 && fy < bh + 80) { const r = 54 + Math.sin(now * 9) * 2, lg = g.createRadialGradient(fx, fy, 2, fx, fy, r); lg.addColorStop(0, 'rgba(255,170,80,.32)'); lg.addColorStop(1, 'rgba(255,140,60,0)'); g.globalCompositeOperation = 'lighter'; g.fillStyle = lg; g.fillRect(fx - r, fy - r, r * 2, r * 2); g.globalCompositeOperation = 'source-over'; }
  // blit the pixel buffer, then crisp text on top
  const c = ctx;
  c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
  c.drawImage(buf, 0, 0, bw * scale * dpr, bh * scale * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .8);
  vg.addColorStop(0, 'rgba(10,15,25,0)'); vg.addColorStop(1, 'rgba(10,15,25,.32)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  if (tele) { const at = now - tele.t0 < .45 ? tele.from : tele.to, sx = (at.x * TS - vx) * scale, sy = (at.y * TS - vy) * scale, f = (now - tele.t0) / .95; const beam = c.createLinearGradient(0, sy - 160, 0, sy); beam.addColorStop(0, 'rgba(126,243,160,0)'); beam.addColorStop(.6, `rgba(190,255,200,${.6 * (1 - Math.abs(f - .5) * 2)})`); beam.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = beam; c.fillRect(sx - 20, sy - 160, 40, 160); }
  entities.forEach(e => {
    const sx = (e.x * TS - vx) * scale, sy = (e.y * TS - vy) * scale;
    if (sx < -100 || sx > W + 100 || sy < -60 || sy > H + 80) return;
    if (S.settings.names) {
      c.font = '700 11px Cinzel, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.lineWidth = 3; c.strokeStyle = 'rgba(20,12,18,.85)'; c.strokeText(e.name, sx, sy + 4);
      c.fillStyle = e === player ? '#8dffa0' : '#ffffff'; c.fillText(e.name, sx, sy + 4);
    }
    const top = sy - 27 * scale - (e === player ? 9 * scale : 0);
    if (e.bubble && e.bubble.until > now) drawBubble(c, sx, top, e.bubble.text);
    else if (e.emote && e.emote.until > now) {
      c.fillStyle = 'rgba(255,255,255,.96)'; c.strokeStyle = '#26181f'; c.lineWidth = 2; c.fillRect(sx - 14, top - 28, 28, 25); c.strokeRect(sx - 14, top - 28, 28, 25);
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
  // the wallpaper covers the world while the menu is open, so skip drawing it then
  if (!menuOpen && !modalEl && !pullEl) { render(); if (frameN % 3 === 0) drawMinimap(); }
  requestAnimationFrame(loop);
}
