/* ---------- drawing helpers ---------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y); c.closePath(); c.fill(); }
function hexA(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }

function rgbOf(col) {
  if (col.startsWith('rgb')) return col.match(/[\d.]+/g).slice(0, 3).map(Number);
  const h = col.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function mix(a, b, t) { const A = rgbOf(a), B = rgbOf(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
const shade = (col, k) => k < 0 ? mix(col, '#1a0f1f', -k) : mix(col, '#ffffff', k);
/* eye color follows the hair, except for very dark or very light hair */
function eyeColor(hair) {
  const [r, g, b] = rgbOf(hair), lum = r * .3 + g * .59 + b * .11;
  return lum < 70 ? '#b07cff' : lum > 215 ? '#5ab8ff' : mix(hair, '#5a3cff', .18);
}

/* Chibi character (big head, big eyes, outlined): feet at (x,y). o = { s, phase, moving, dir:'down'|'up', ex (eye shift), t } */
const OUTLINE = 'rgba(48,26,40,.9)';
function drawChibi(c, x, y, look, o = {}) {
  const s = o.s || 1, mv = !!o.moving, up = o.dir === 'up', ph = o.phase || 0, t = o.t || 0, ex = o.ex || 0;
  const sw = mv ? Math.sin(ph) * 2.4 : 0;
  const bob = mv ? -Math.abs(Math.cos(ph)) * 1.4 : Math.sin(t * 2.2) * .4;
  const st = look.style | 0, hair = look.hair, hairD = shade(hair, -.3), hairL = shade(hair, .45);
  const shirt = look.shirt, low = look.pants, HY = -35;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.15; c.strokeStyle = OUTLINE;
  const fill = col => { c.fillStyle = col; c.fill(); c.stroke(); };
  const oval = (cx, cy, rx, ry, col) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); fill(col); };
  const box = (bx, by, bw, bh, r, col) => { rr(c, bx, by, bw, bh, r); fill(col); };
  const shape = (pts, col) => { c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); fill(col); };
  c.fillStyle = 'rgba(20,10,20,.28)'; ell(c, 0, 0, 12, 4.4);
  c.translate(0, bob);
  // hair that hangs behind the body
  if (st === 1) box(-15.5, HY - 4, 31, 30, 10, hairD);
  if (st === 3 && !up) { oval(15, HY - 3, 5.5, 8.5, hairD); oval(16.5, HY + 8, 4.2, 7, hairD); }
  // legs and shoes
  const lo = Math.max(0, sw) * .6, ro = Math.max(0, -sw) * .6;
  box(-5.4, -9.5 - lo, 4.6, 9, 2, shade(low, -.25)); box(.8, -9.5 - ro, 4.6, 9, 2, shade(low, -.25));
  box(-6.3, -3.6 - lo, 6, 3.8, 1.8, '#3a2630'); box(.3, -3.6 - ro, 6, 3.8, 1.8, '#3a2630');
  // arms, hands
  box(-11.2, -19.5 + sw * .5, 4.6, 9.5, 2.3, shade(shirt, -.18)); box(6.6, -19.5 - sw * .5, 4.6, 9.5, 2.3, shade(shirt, -.18));
  oval(-8.9, -9.6 + sw * .5, 2.3, 2.3, look.skin); oval(8.9, -9.6 - sw * .5, 2.3, 2.3, look.skin);
  // skirt or shorts, then the torso
  c.beginPath(); c.moveTo(-7, -13.5); c.lineTo(7, -13.5); c.lineTo(8.8, -7.4); c.quadraticCurveTo(0, -5.6, -8.8, -7.4); c.closePath(); fill(low);
  box(-7.6, -22, 15.2, 10.5, 4.5, shirt);
  c.fillStyle = 'rgba(0,0,0,.13)'; rr(c, 1.8, -21.4, 5.2, 9.4, 3); c.fill();
  if (!up) { shape([[-4.2, -21.8], [0, -16.8], [4.2, -21.8]], shade(shirt, .6)); oval(0, -16.4, 1.5, 1.3, '#ff5f7a'); }
  // spikes and bun sit behind the hair cap
  if (st === 2) [[[-12, HY - 8], [-11, HY - 21], [-4.5, HY - 13]], [[-5.5, HY - 13], [-.5, HY - 25], [4.5, HY - 13.5]], [[3, HY - 13], [11, HY - 21], [12, HY - 7]]].forEach(p => shape(p, hair));
  if (st === 4) { oval(0, HY - 18, 7.2, 6.4, hair); c.strokeStyle = '#ffd36b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-9, HY - 22); c.lineTo(7, HY - 13); c.stroke(); c.lineWidth = 1.15; c.strokeStyle = OUTLINE; oval(-9, HY - 22, 1.8, 1.8, '#ff6ec7'); }
  if (up) {
    oval(0, HY - 1, 16.6, 15.6, hair);
    if (st === 1) box(-15, HY + 2, 30, 20, 9, hair);
    if (st === 3) { oval(0, HY + 9, 5, 9.5, hairD); oval(0, HY - 1, 3, 2, '#ff6ec7'); }
    c.strokeStyle = hairL; c.lineWidth = 2.2; c.beginPath(); c.arc(-1, HY - 3, 11, Math.PI * 1.12, Math.PI * 1.6); c.stroke();
    c.restore(); return;
  }
  // head
  oval(0, HY, 15.5, 14.5, look.skin);
  // hair cap with a pointed fringe and side locks
  const fx = ex * .7, side = st === 1 ? 17 : 10;
  c.beginPath();
  c.ellipse(0, HY - 1.5, 16.6, 15.4, 0, .12, Math.PI - .12, true);
  [[-15.8, HY + side], [-12.2, HY + 2], [-11.2, HY - 5], [-8.5, HY + 1], [-5.5, HY - 6], [-2.5, HY + 2], [.5, HY - 6], [3.5, HY + 1.5], [6.5, HY - 6], [9, HY + .5], [11.2, HY - 5], [12.2, HY + 2], [15.8, HY + side]]
    .forEach(([px, py], i) => c.lineTo(px + (i && i < 12 ? fx : 0), py));
  c.closePath(); fill(hair);
  c.strokeStyle = hairL; c.lineWidth = 2.2;
  c.beginPath(); c.arc(-1, HY - 4, 11, Math.PI * 1.13, Math.PI * 1.55); c.stroke();
  c.beginPath(); c.arc(-1, HY - 4, 11, Math.PI * 1.66, Math.PI * 1.78); c.stroke();
  if (st === 0) { c.strokeStyle = OUTLINE; c.lineWidth = 1.15; c.beginPath(); c.moveTo(1, HY - 16); c.quadraticCurveTo(4, HY - 24, 8, HY - 21); c.quadraticCurveTo(4, HY - 21, 3, HY - 16); c.closePath(); fill(hair); }
  if (st === 3) oval(13.5, HY - 7, 2.4, 2.4, '#ff6ec7');
  // eyes
  const iris = look.eyes || eyeColor(hair);
  for (const sx of [-1, 1]) {
    const cx = sx * 5.8 + ex, cy = HY + 8.5;
    const g = c.createLinearGradient(0, cy - 4.2, 0, cy + 4.2);
    g.addColorStop(0, shade(iris, -.55)); g.addColorStop(.55, iris); g.addColorStop(1, shade(iris, .5));
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 3.2, 4.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = shade(iris, -.65); ell(c, cx, cy + .4, 1.5, 2.1);
    c.fillStyle = '#fff'; ell(c, cx - 1.1, cy - 1.6, 1.25, 1.5); ell(c, cx + 1.2, cy + 1.9, .6, .6);
    c.strokeStyle = '#2a1626'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(cx, cy + .4, 3.6, 4.6, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    c.beginPath(); c.moveTo(cx + sx * 3.3, cy - 2.2); c.lineTo(cx + sx * 4.7, cy - 3.2); c.stroke();
  }
  c.fillStyle = 'rgba(255,120,150,.45)'; ell(c, -9.6 + ex, HY + 12, 2.6, 1.3); ell(c, 9.6 + ex, HY + 12, 2.6, 1.3);
  c.strokeStyle = '#7a2f3e'; c.lineWidth = 1; c.beginPath(); c.arc(ex, HY + 11.8, 1.4, .15 * Math.PI, .85 * Math.PI); c.stroke();
  c.restore();
}

/* Pet (same outlined chibi style): feet at (x,y). look = { kind: dragon|bird|fox|cat|bunny|owl, body, accent, belly } */
const PET_KINDS = { dragon: 'Dragon', bird: 'Phoenix', fox: 'Fox', cat: 'Cat', bunny: 'Bunny', owl: 'Owl' };
function drawPet(c, x, y, look, o = {}) {
  const s = o.s || 1, t = o.t || 0, k = look.kind || 'cat', B = look.body || '#c9d4f5', A = look.accent || '#7f8bb3', W = look.belly || '#fff4e0';
  const BD = shade(B, -.18), HY = -24, HR = 13;
  c.save(); c.translate(x, y); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round'; c.lineWidth = 1.15; c.strokeStyle = OUTLINE;
  const fill = col => { c.fillStyle = col; c.fill(); c.stroke(); };
  const oval = (cx, cy, rx, ry, col, rot = 0) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); fill(col); };
  const shape = (pts, col) => { c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); fill(col); };
  const both = f => [-1, 1].forEach(f);
  c.fillStyle = 'rgba(20,10,20,.28)'; ell(c, 0, 0, 12, 4.4);
  const flap = Math.sin(t * 6) * .12;
  c.translate(0, Math.sin(t * 3) * .6);
  // behind the body: tails and wings
  if (k === 'dragon') {
    c.beginPath(); c.moveTo(6, -5); c.quadraticCurveTo(20, -4, 22, -16); c.lineTo(25, -21); c.lineTo(19, -17); c.quadraticCurveTo(17, -9, 6, -11); c.closePath(); fill(B);
    shape([[13, -6], [15, -11], [17, -6]], A); shape([[18, -9], [21, -13], [21, -8]], A);
    both(sx => { c.save(); c.scale(sx, 1); c.rotate(-flap * sx); shape([[7, -15], [23, -28], [21, -20], [26, -17], [19, -13], [21, -9], [10, -9]], A); c.restore(); });
  } else if (k === 'bird') {
    [[9, -6, .7], [11, -4, 1.1], [7, -3, .35]].forEach(([tx, ty, r]) => oval(tx + 5, ty - 2, 3.4, 9, r > .9 ? look.accent : shade(A, .25), r));
    both(sx => { c.save(); c.scale(sx, 1); c.rotate(-flap * sx); oval(13, -16, 5, 10, A, -.9); oval(16, -19, 3, 7, shade(A, .35), -.9); c.restore(); });
  } else if (k === 'fox') {
    oval(13, -14, 7, 12.5, B, .6); oval(17.5, -22, 4, 5, W, .6);
  } else if (k === 'cat') {
    c.lineWidth = 6.5; c.beginPath(); c.moveTo(8, -6); c.quadraticCurveTo(20, -8, 16, -22); c.stroke();
    c.lineWidth = 4; c.strokeStyle = B; c.beginPath(); c.moveTo(8, -6); c.quadraticCurveTo(20, -8, 16, -22); c.stroke();
    c.lineWidth = 1.15; c.strokeStyle = OUTLINE;
  } else if (k === 'bunny') oval(11, -7, 4, 4, W);
  // body, belly, feet
  oval(0, -10, 11, 9.5, B);
  oval(0, -8.5, 7, 6.5, W);
  if (k === 'dragon') { c.strokeStyle = shade(W, -.25); [-10, -7].forEach(py => { c.beginPath(); c.moveTo(-5, py); c.quadraticCurveTo(0, py + 1.5, 5, py); c.stroke(); }); c.strokeStyle = OUTLINE; }
  if (k === 'owl') both(sx => oval(sx * 9.5, -11, 4, 7, A, sx * .25));
  oval(-5, -1.6, 3.6, 2.4, BD); oval(5, -1.6, 3.6, 2.4, BD);
  // ears, horns and crests sit behind the head
  if (k === 'cat') both(sx => { shape([[sx * 11, HY - 6], [sx * 9.5, HY - 18], [sx * 3, HY - 11]], B); shape([[sx * 9.3, HY - 8], [sx * 8.7, HY - 14.5], [sx * 5, HY - 10.5]], '#ff9ec4'); });
  if (k === 'fox') both(sx => { shape([[sx * 12, HY - 5], [sx * 11, HY - 20], [sx * 3, HY - 11]], B); shape([[sx * 11.2, HY - 15], [sx * 11, HY - 20], [sx * 8, HY - 16]], A); });
  if (k === 'bunny') both(sx => { oval(sx * 5.5, HY - 17, 3.8, 10.5, B, sx * .18); oval(sx * 5.5, HY - 16, 1.9, 7.5, '#ffb3cf', sx * .18); });
  if (k === 'dragon') both(sx => { c.beginPath(); c.moveTo(sx * 4, HY - 11); c.quadraticCurveTo(sx * 9, HY - 19, sx * 13, HY - 22); c.quadraticCurveTo(sx * 10, HY - 15, sx * 9, HY - 9); c.closePath(); fill('#ffe08a'); shape([[sx * 12, HY - 3], [sx * 19, HY - 6], [sx * 13, HY + 2]], A); });
  if (k === 'owl') both(sx => shape([[sx * 10, HY - 7], [sx * 12, HY - 17], [sx * 4, HY - 11]], BD));
  if (k === 'bird') [[-4, -.5], [0, 0], [4, .5]].forEach(([dx, r]) => oval(dx, HY - 14, 2.4, 6.5, dx ? A : '#ffd36b', r));
  // head and face
  oval(0, HY, HR, HR * .92, B);
  if (k === 'owl') both(sx => oval(sx * 5, HY + .5, 5.4, 5.6, W));
  if (k === 'fox' || k === 'cat' || k === 'dragon' || k === 'bunny') oval(0, HY + 6.5, 6, 3.8, W);
  const iris = shade(A, -.25);
  both(sx => {
    const cx = sx * 5.2, cy = HY + 1;
    const g = c.createLinearGradient(0, cy - 3.6, 0, cy + 3.6);
    g.addColorStop(0, shade(iris, -.6)); g.addColorStop(1, shade(iris, .35));
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 2.8, 3.6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; ell(c, cx - 1, cy - 1.4, 1.1, 1.3); ell(c, cx + 1, cy + 1.5, .5, .5);
    c.strokeStyle = '#2a1626'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(cx, cy + .3, 3.1, 3.9, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  });
  c.strokeStyle = OUTLINE; c.lineWidth = 1.15;
  c.fillStyle = 'rgba(255,120,150,.45)'; ell(c, -8.6, HY + 5.5, 2.3, 1.2); ell(c, 8.6, HY + 5.5, 2.3, 1.2);
  if (k === 'bird' || k === 'owl') shape([[-2.2, HY + 4.5], [2.2, HY + 4.5], [0, HY + 8]], '#ffb347');
  else {
    c.fillStyle = '#3a2630'; ell(c, 0, HY + 5, 1.3, .9);
    c.strokeStyle = '#7a2f3e'; c.lineWidth = .9; c.beginPath(); c.moveTo(-2.2, HY + 6.8); c.quadraticCurveTo(-1.1, HY + 8, 0, HY + 6.6); c.quadraticCurveTo(1.1, HY + 8, 2.2, HY + 6.8); c.stroke();
    if (k === 'cat' || k === 'fox') { c.strokeStyle = 'rgba(48,26,40,.55)'; c.beginPath(); both(sx => { c.moveTo(sx * 6, HY + 6); c.lineTo(sx * 11, HY + 5); c.moveTo(sx * 6, HY + 7.3); c.lineTo(sx * 11, HY + 8); }); c.stroke(); }
  }
  c.strokeStyle = shade(B, .45); c.lineWidth = 2; c.beginPath(); c.arc(-2, HY - 2, 9, Math.PI * 1.15, Math.PI * 1.5); c.stroke();
  c.restore();
}

/* portraits (with background, for cards) and splashes (transparent, for wallpaper + pulls) */
const portraitCache = new Map(), splashCache = new Map();
function portrait(look, rarity) {
  const key = JSON.stringify(look) + '|' + rarity;
  if (portraitCache.has(key)) return portraitCache.get(key);
  const c = document.createElement('canvas'); c.width = 270; c.height = 480;
  const g = c.getContext('2d');
  const col = (RARITY[rarity] || RARITY[3]).color;
  const bg = g.createLinearGradient(0, 0, 0, 480);
  if (rarity === 5) { bg.addColorStop(0, 'rgba(168,85,247,.7)'); bg.addColorStop(.45, 'rgba(255,110,199,.4)'); bg.addColorStop(.8, 'rgba(62,230,208,.22)'); bg.addColorStop(1, '#141d3c'); }
  else { bg.addColorStop(0, hexA(col, .55)); bg.addColorStop(1, '#141d3c'); }
  g.fillStyle = bg; g.fillRect(0, 0, 270, 480);
  const glow = g.createRadialGradient(135, 250, 10, 135, 250, 210); glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 270, 480);
  g.fillStyle = 'rgba(255,255,255,.7)';
  [[38, 70, 2.2], [226, 56, 1.6], [236, 170, 2.4], [30, 230, 1.4], [206, 300, 1.8], [52, 360, 1.2], [140, 110, 1.5]].forEach(([x, y, r]) => ell(g, x, y, r, r));
  if (look.kind) drawPet(g, 135, 430, look, { s: 5 }); else drawChibi(g, 135, 452, look, { s: 5.6, dir: 'down', t: 0 });
  const url = c.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}
function chibiSplash(look) {
  const key = JSON.stringify(look);
  if (splashCache.has(key)) return splashCache.get(key);
  const c = document.createElement('canvas'); c.width = 450; c.height = 800;
  if (look.kind) drawPet(c.getContext('2d'), 225, 720, look, { s: 8.5 }); else drawChibi(c.getContext('2d'), 225, 760, look, { s: 10.5, dir: 'down', t: 0 });
  const url = c.toDataURL('image/png');
  splashCache.set(key, url);
  return url;
}
const artFrom = ref => !ref ? null : ref.startsWith('idb:') ? (MEDIA.get(ref.slice(4)) || null) : ref.startsWith('data:') ? ref : null;
/* characters can have extra splash arts that unlock at 3 and 6 stars; the player chooses which one shows */
const ASC = [{ k: 'base', stars: 0, label: 'Base' }, { k: 'art3', stars: 3, label: '3★' }, { k: 'art6', stars: 6, label: '6★' }];
const ascOpen = (e, a) => a.k === 'base' || (!!artFrom(e[a.k]) && owns(e.id) && starsOf(e.id) >= a.stars);
function artKey(e) {
  const p = ASC.find(a => a.k === S.artPick[e.id]);
  if (p && ascOpen(e, p)) return p.k;
  for (let i = ASC.length - 1; i > 0; i--) if (ascOpen(e, ASC[i])) return ASC[i].k;   // default: the highest unlocked
  return 'base';
}
const mediaArt = e => { if (!e) return null; const k = e.type === 'character' ? artKey(e) : 'base'; return (k !== 'base' && artFrom(e[k])) || artFrom(e.art); };
/* the main character: chosen once (female or male), fixed preset; every chibi in the plaza is one of these two */
const MC_LOOK = {
  f: { hair: '#ff9ec4', style: 1, skin: '#ffe0c7', shirt: '#ffffff', pants: '#7a5cff' },
  m: { hair: '#3c4cff', style: 2, skin: '#f6c9a4', shirt: '#2f3a66', pants: '#1e2440' }
};
const MC_NAME = { f: 'Female', m: 'Male' };
const mcLook = () => MC_LOOK[S.player.mc] || MC_LOOK.m;
const MC_SWITCH_MS = 72 * 36e5;
const mcEntry = k => findEntry('mc-' + k);
const mcSwitchLeft = () => S.player.mcAt ? Math.max(0, S.player.mcAt + MC_SWITCH_MS - Date.now()) : 0;
const fmtDur = ms => { const h = Math.ceil(ms / 36e5); return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`; };
/* make sure both MC entries exist in the pool (they behave like any character but are never pullable) */
function ensureMC() {
  ['f', 'm'].forEach(k => {
    let e = mcEntry(k);
    if (!e) S.pool.unshift(e = { id: 'mc-' + k, name: `${MC_NAME[k]} MC`, rarity: 5, art: null, desc: 'Your main character. This is who you are in the plaza.', look: { ...MC_LOOK[k] } });
    Object.assign(e, { type: 'character', mc: k, pullable: false, standard: false });
    if (S.featuredId === e.id) S.featuredId = null;
  });
  if (S.player.mc && !S.owned['mc-' + S.player.mc]) S.owned['mc-' + S.player.mc] = 1;
}
ensureMC();
if (!Array.isArray(S.clothes)) S.clothes = [];
if (!S.wear) S.wear = {};
/* wardrobe: clothes the admin adds (S.clothes) and what each character wears (S.wear[charId][slot] = clothId) */
const WARD_SLOTS = [['hat', 'Hat'], ['top', 'Top'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['acc', 'Accessory'], ['hand', 'Hand']];
const WARD_NAME = Object.fromEntries(WARD_SLOTS);
const clothOf = id => S.clothes.find(x => x.id === id);
const clothImg = x => artFrom(x.img);
const clothFits = (x, c) => !x.char || x.char === c.id;
const wearOf = cid => S.wear[cid] || {};
/* memories: art cards the admin adds (S.memories); each character equips up to MEM_SLOTS of them (S.memEq[charId]); no effect yet */
if (!Array.isArray(S.memories)) S.memories = [];
if (!S.memEq) S.memEq = {};
const MEM_SLOTS = 3;
const memOf = id => S.memories.find(x => x.id === id);
const memEqOf = cid => { const a = (S.memEq[cid] || []).slice(0, MEM_SLOTS); while (a.length < MEM_SLOTS) a.push(null); return a.map(id => id && memOf(id) ? id : null); };
const getArt = e => mediaArt(e) || portrait(e.look || S.player.look, e.rarity);
const getSplash = e => mediaArt(e) || chibiSplash(e.look || S.player.look);
