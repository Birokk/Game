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
const OUTLINE = 'rgba(48,26,40,.9)';

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

/* placeholder for characters without uploaded art: a glowing green orb floating above a soft shadow */
function drawOrb(g, cx, cy, r) {
  const sh = g.createRadialGradient(cx, cy + r * 2.1, 1, cx, cy + r * 2.1, r * .9); sh.addColorStop(0, 'rgba(0,0,0,.32)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.translate(cx, cy + r * 2.1); g.scale(1, .28); g.translate(-cx, -(cy + r * 2.1)); g.fillStyle = sh; g.beginPath(); g.arc(cx, cy + r * 2.1, r * .9, 0, 7); g.fill(); g.restore();
  const halo = g.createRadialGradient(cx, cy, r * .6, cx, cy, r * 2.3); halo.addColorStop(0, 'rgba(120,255,160,.5)'); halo.addColorStop(1, 'rgba(120,255,160,0)');
  g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, r * 2.3, 0, 7); g.fill();
  const body = g.createRadialGradient(cx - r * .35, cy - r * .4, r * .05, cx, cy, r);
  body.addColorStop(0, '#f0fff2'); body.addColorStop(.25, '#8dffad'); body.addColorStop(.62, '#2fd36a'); body.addColorStop(1, '#0d6e36');
  g.fillStyle = body; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  g.strokeStyle = 'rgba(220,255,225,.55)'; g.lineWidth = r * .07; g.beginPath(); g.arc(cx, cy, r * .72, Math.PI * .1, Math.PI * .75); g.stroke();
  g.strokeStyle = 'rgba(220,255,225,.3)'; g.beginPath(); g.arc(cx, cy, r * .5, Math.PI * 1.1, Math.PI * 1.7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.9)'; ell(g, cx - r * .38, cy - r * .42, r * .2, r * .12);
  g.fillStyle = '#ffffff';
  [[-1.5, -1.1, .09], [1.45, -.7, .07], [1.25, 1.1, .06], [-1.3, .9, .05]].forEach(([dx, dy, k]) => { const x = cx + dx * r, y = cy + dy * r, a = r * k; g.beginPath(); g.moveTo(x, y - a * 2.4); g.lineTo(x + a * .5, y - a * .5); g.lineTo(x + a * 2.4, y); g.lineTo(x + a * .5, y + a * .5); g.lineTo(x, y + a * 2.4); g.lineTo(x - a * .5, y + a * .5); g.lineTo(x - a * 2.4, y); g.lineTo(x - a * .5, y - a * .5); g.closePath(); g.fill(); });
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
  if (look.kind) drawPet(g, 135, 430, look, { s: 5 }); else drawOrb(g, 135, 200, 62);
  const url = c.toDataURL('image/png');
  portraitCache.set(key, url);
  return url;
}
function chibiSplash(look) {
  const key = JSON.stringify(look);
  if (splashCache.has(key)) return splashCache.get(key);
  const c = document.createElement('canvas'); c.width = 450; c.height = 800;
  if (look.kind) drawPet(c.getContext('2d'), 225, 720, look, { s: 8.5 }); else drawOrb(c.getContext('2d'), 225, 330, 105);
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
const clothImg = x => artFrom(x.img) || clothLine(x.slot);   // white line art until the admin uploads a design
const clothFits = (x, c) => !x.char || x.char === c.id;
const wearersOf = clothId => Object.keys(S.wear || {}).filter(cid => Object.values(S.wear[cid] || {}).includes(clothId));
const wearOf = cid => S.wear[cid] || {};
/* memories: art cards the admin adds (S.memories); each character equips one (MEM_SLOTS) (S.memEq[charId]); no effect yet */
if (!Array.isArray(S.memories)) S.memories = [];
if (!S.memEq) S.memEq = {};
const MEM_SLOTS = 1;
const memOf = id => S.memories.find(x => x.id === id);
const memEqOf = cid => { const a = (S.memEq[cid] || []).slice(0, MEM_SLOTS); while (a.length < MEM_SLOTS) a.push(null); return a.map(id => id && memOf(id) ? id : null); };
const getArt = e => mediaArt(e) || portrait(e.look || S.player.look, e.rarity);
const getSplash = e => mediaArt(e) || chibiSplash(e.look || S.player.look);
/* banners and pulls always show the base splash art, never the player's chosen 3★ / 6★ art */
const baseArt = e => e ? artFrom(e.art) : null;
const baseSplash = e => baseArt(e) || chibiSplash(e.look || S.player.look);
const baseCard = e => baseArt(e) || portrait(e.look || S.player.look, e.rarity);
