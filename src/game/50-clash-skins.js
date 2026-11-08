/* ---------- Card Clash board skins: each player's half of the table wears the skin they equipped ----------
   The board is two halves (.cc-half.me / .op, built by ccHalfHTML in 45-clash-ui.js); data-bs on each half names
   its skin and clash.css ("Board skins") dresses it: surface, frame, corner ornaments, slot and trap emblems, the
   crest, edge decorations. Skins are bought in Shop → Board Skins for CC_SKIN_PRICE pearls and equipped there,
   from the Deck screen (Board skin) or Quick match. In Quick match the bot wears a random buyable skin (from the
   match seed). The moving bits (fireflies, petals, embers, data rain) are drawn on one canvas per half; the board
   is redrawn after every action, so ccSkAttach moves each canvas back into its new half (a moved canvas keeps
   its context) and the particles carry on without a jump. State: S.cc.skins = [owned ids], S.cc.skin = equipped. */
const CC_SKIN_PRICE = 60;
const CC_SKINS = [
  { id: 'default', name: 'Arcane Obsidian', sub: 'Night stone, gold filigree and rune circles. Everyone has it.' },
  { id: 'forest', name: 'Whispering Grove', sub: 'Moss and old wood, curling vines, glowing mushrooms and fireflies.' },
  { id: 'sakura', name: 'Sakura Dream', sub: 'Dusk plum and rose gold, cherry branches in bloom and falling petals.' },
  { id: 'inferno', name: 'Inferno', sub: 'Basalt and iron, glowing lava cracks, licking flames and rising embers.' },
  { id: 'cyber', name: 'Neon Grid', sub: 'A cyberpunk holo-table: neon grid, HUD brackets, circuits and data rain.' },
];
const CC_SKIN_BUY = CC_SKINS.filter(s => s.id !== 'default');
const ccSkinOf = id => CC_SKINS.find(s => s.id === id) || CC_SKINS[0];
const ccSkinOwned = id => id === 'default' || (ccSave().skins || []).includes(id);
const ccMySkin = () => { const s = ccSave().skin || 'default'; return CC_SKINS.some(k => k.id === s) && ccSkinOwned(s) ? s : 'default'; };
const ccBotSkin = seed => CC_SKIN_BUY[Math.floor((seed >>> 0) / 7) % CC_SKIN_BUY.length].id;
const ccHalfSkin = p => ccM && ccM.skins ? ccM.skins[p] : 'default';

/* each skin's emblem (100×100, filled with currentColor): the crest in the middle of the half and the shop badge */
const CC_SKIN_ICO = {
  forest: "<circle cx='50' cy='31' r='19'/><circle cx='31' cy='44' r='15'/><circle cx='69' cy='44' r='15'/><circle cx='50' cy='50' r='17'/><path d='M45 56h10v18c4 7 12 10 20 11H25c8-1 16-4 20-11z'/><path d='M38 72c-6 2-12 1-16-2M62 72c6 2 12 1 16-2' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round'/>",
  sakura: "<g transform='translate(50 52)'>" + [0, 72, 144, 216, 288].map(a => `<path transform='rotate(${a})' d='M0 -4C-14 -14 -16 -32 -7 -44L0 -38L7 -44C16 -32 14 -14 0 -4Z'/>`).join('') + "<circle r='7' fill='rgba(0,0,0,.35)'/><circle r='3'/></g>",
  inferno: "<path fill-rule='evenodd' d='M50 4C62 24 82 34 80 60C79 82 66 96 50 96C34 96 20 84 20 62C20 46 30 38 34 24C38 36 42 40 47 43C45 28 46 16 50 4ZM50 54C56 62 62 66 61 76C60 84 55 88 50 88C45 88 39 84 39 77C39 71 43 68 45 62C47 66 49 67 50 68C49 63 49 59 50 54Z'/>",
  cyber: "<rect x='27' y='27' width='46' height='46' rx='6'/><path d='M37 12v13M50 12v13M63 12v13M37 75v13M50 75v13M63 75v13M12 37h13M12 50h13M12 63h13M75 37h13M75 50h13M75 63h13' stroke='currentColor' stroke-width='5' stroke-linecap='round'/><rect x='37' y='37' width='26' height='26' rx='2' fill='rgba(0,0,0,.5)'/><path d='M43 50h14M50 43v14' stroke='currentColor' stroke-width='3'/>",
};
const ccSkinIco = (id, cls = '') => id === 'default' ? ccIco('crystal', cls) : `<svg class="ccsk-ic ${cls}" viewBox="0 0 100 100" aria-hidden="true">${CC_SKIN_ICO[id] || ''}</svg>`;
/* the pieces a skin adds inside a half (drawn under the field and the units) */
const ccSkinDeco = bs => bs === 'default' ? '' : `<i class="ccsk-edge"></i><i class="ccsk-edge e2"></i><i class="ccsk-deco"></i><i class="ccsk-deco d2"></i>`;
const ccSkinCrest = (bs, p) => bs === 'default' ? ccIco(p === 0 ? 'crystal' : 'bot') : ccSkinIco(bs);

/* ---- buy / equip ---- */
function ccEquipSkin(id) { if (!ccSkinOwned(id)) return; ccSave().skin = id; persist(); toast(`${ccSkinOf(id).name} equipped on your side of the board`); }
function ccBuySkin(id, after) {
  const k = ccSkinOf(id); if (id === 'default' || ccSkinOwned(id)) return;
  openModal({ title: `Buy ${k.name}?`, ic: 'shop', small: true, kind: 'ccskbuy', body: `<div class="stack" style="text-align:center">
    <div class="ccsk-prev big">${ccSkinPreview(id)}</div>
    <p class="desc">A board skin for Card Clash: your half of the table wears it in every match.</p>
    <span class="tiny">You have ${fmt(S.wallet.pearls)} pearls.</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="ccskNo">Cancel</button><button class="btn gold" id="ccskYes">Buy · ${costHTML(CC_SKIN_PRICE)}</button></div></div>`,
    onMount: b => { b.querySelector('#ccskNo').onclick = () => { closeModal(); if (after) after(); };
      b.querySelector('#ccskYes').onclick = () => {
        if (S.wallet.pearls < CC_SKIN_PRICE) { closeModal(); toast(`Not enough pearls: ${k.name} costs ${CC_SKIN_PRICE}`); return; }
        S.wallet.pearls -= CC_SKIN_PRICE; const sv = ccSave(); sv.skins = [...new Set([...(sv.skins || []), id])]; sv.skin = id;
        persist(); renderMenu(); closeModal(); toast(`${k.name} bought and equipped`); if (after) after(); }; } });
}
/* a skin's look as a small static half-board (shop cards, the picker, the buy window) */
const ccSkUnit = id => { const d = ccDef(id); return `<div class="ccu st-${d.style}" style="--cs:${CC_STYLES[d.style][1]}"><div class="ccu-fr"><div class="ccu-art"><i class="ccc-rays"></i>${ccIco(d.id, 'cce')}<i class="ccc-vig"></i></div><b class="ccu-name">${esc(d.name)}</b></div><div class="ccu-st"></div>${d.range === 'ranged' ? `<span class="ccu-rng">${ccIco('MOB-U04')}</span>` : ''}<span class="ccu-atk"><b>${d.atk}</b></span><span class="ccu-hp"><b>${d.hp}</b></span></div>`; };
function ccSkinPreview(bs) {
  ccDefs();
  const slot = (r, u) => `<div class="cc-slot ${r ? 'back' : 'front'}">${u || `<i class="cc-slot-rune"></i><span class="cc-slot-l">${r ? 'Back' : 'Front'}</span>`}</div>`;
  const rows = `<div class="cc-rows"><div class="cc-row front">${slot(0, ccSkUnit('AGG-U03'))}${slot(0)}${slot(0, ccSkUnit('DEF-U02'))}</div><div class="cc-row back">${slot(1)}${slot(1, ccSkUnit('MOB-U04'))}${slot(1)}</div></div>`;
  const traps = '<div class="cc-traps"><div class="cc-trap"><i class="cc-trap-rune"></i></div><div class="cc-trap set"><span class="cc-trap-c back"></span></div><div class="cc-trap"><i class="cc-trap-rune"></i></div></div>';
  return `<div class="ccsk-scale"><div class="cc-half me" data-bs="${bs}">${ccSkinDeco(bs)}<div class="cc-field"><i class="cc-crest">${ccSkinCrest(bs, 0)}</i><i class="cc-lanediv l1"></i><i class="cc-lanediv l2"></i></div><i class="cc-runes"></i><i class="cc-sheen"></i>${rows}${traps}</div></div>`;
}
function ccSkinCard(k) {
  const own = ccSkinOwned(k.id), eq = ccMySkin() === k.id;
  return `<div class="ccsk-card ${eq ? 'eq' : ''} ${own ? 'own' : ''}" data-sk="${k.id}">
    <div class="ccsk-prev">${ccSkinPreview(k.id)}${eq ? '<span class="ccsk-tag">Equipped</span>' : own ? '<span class="ccsk-tag own">Owned</span>' : ''}</div>
    <div class="ccsk-info"><span class="ccsk-badge sk-${k.id}">${ccSkinIco(k.id)}</span><span><b>${esc(k.name)}</b><small>${esc(k.sub)}</small></span></div>
    <div class="ccsk-act">${eq ? '<button class="mall-buy" disabled>Equipped</button>' : own ? `<button class="mall-buy ok" data-bseq="${k.id}">Equip</button>` : `<button class="mall-buy ${S.wallet.pearls >= CC_SKIN_PRICE ? 'ok' : ''}" data-bsbuy="${k.id}">${curIcon('pearls')}${CC_SKIN_PRICE}</button>`}</div></div>`;
}
const ccSkinGrid = () => `<div class="ccsk-grid">${CC_SKINS.map(ccSkinCard).join('')}</div>`;
function ccSkinBind(root, rerender) {
  root.querySelectorAll('[data-bseq]').forEach(b => b.onclick = () => { ccEquipSkin(b.dataset.bseq); rerender(); });
  root.querySelectorAll('[data-bsbuy]').forEach(b => b.onclick = () => ccBuySkin(b.dataset.bsbuy, rerender));
}
/* Shop → Board Skins */
const ccSkinShopHTML = () => `<p class="tiny">Card Clash board skins: the table is split in half and each player's half wears the skin they equipped. Every skin costs ${CC_SKIN_PRICE} pearls; in Quick match the bot plays on a random one.</p>${ccSkinGrid()}`;
/* the picker (Deck screen and Quick match): the same cards in a window */
function ccSkinPicker(back) {
  openModal({ title: 'Board skins', ic: 'cards', kind: 'ccskins', body: '<div id="ccskRoot"></div>', onMount: b => {
    const root = b.querySelector('#ccskRoot');
    const draw = () => { root.innerHTML = `<p class="tiny">Your half of the Card Clash table wears the skin you equip. Each costs ${CC_SKIN_PRICE} pearls (you have ${fmt(S.wallet.pearls)}).</p>${ccSkinGrid()}${back ? '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn ghost" id="ccskBack">Back</button></div>' : ''}`;
      ccSkinBind(root, () => { if (document.getElementById('ccskRoot')) draw(); else ccSkinPicker(back); if (ccdEl) renderDeck(); });
      const bk = root.querySelector('#ccskBack'); if (bk) bk.onclick = back; };
    draw(); } });
}

/* ---- the hall around the board: the top half of the screen wears the bot's skin, the bottom half yours ----
   Each skinned side gets a scenery layer (.ccm-sky, art drawn for the bottom half and flipped for the top) that
   fades into the other around the middle line, where a seam (.ccm-seam) blends both skins' colours. Colours come
   from CC_SKIN_COL as CSS variables on the match (--ccsT / --ccsT2 = top = bot, --ccsB / --ccsB2 = bottom = you),
   also used by the battle line. The env is built once per match, so this runs once (ccM.skEnv). */
const CC_SKIN_COL = { default: ['#c9a6ff', '#8fb8ff'], forest: ['#9be07a', '#e9ff8a'], sakura: ['#ff9ec7', '#ffe0ec'], inferno: ['#ff6a1f', '#ffc04a'], cyber: ['#29f0ff', '#ff2bd6'] };
const ccSkinCol = (bs, p) => bs === 'default' && p === 1 ? ['#ff5a78', '#ffb3c0'] : CC_SKIN_COL[bs] || CC_SKIN_COL.default;
function ccSkEnv() {
  if (!ccM || !ccM.el || ccM.skEnv) return;
  const env = ccM.el.querySelector('.ccm-env'); if (!env) return;
  ccM.skEnv = true;
  const [me, op] = ccM.skins || ['default', 'default'], cm = ccSkinCol(me, 0), co = ccSkinCol(op, 1), st = ccM.el.style;
  st.setProperty('--ccsT', co[0]); st.setProperty('--ccsT2', co[1]); st.setProperty('--ccsB', cm[0]); st.setProperty('--ccsB2', cm[1]);
  const sky = (bs, side) => `<div class="ccm-sky ${side}" data-bs="${bs}"><i class="sk1"></i><i class="sk2"></i><i class="sk3"></i><i class="sk4"></i><i class="sk5"></i></div>`;
  const ev = ccM.G && ccM.G.ev;   // a battle event also brings its weather to the hall (and rain / wind over the whole table)
  env.insertAdjacentHTML('beforeend', `${sky(op, 'op')}${sky(me, 'me')}${ev ? `<div class="ccm-wx" data-ev="${ev}"><i></i></div>` : ''}<div class="ccm-seam"><i class="w1"></i><i class="w2"></i></div><canvas class="ccsk-envc" width="1600" height="900"></canvas>`);
  const cv = env.querySelector('.ccsk-envc'), g = cv.getContext('2d');
  // the stage is 1600×900 and the middle line sits at y 400: the bot's side above it, yours below
  ccSkZone('env1', cv, g, 0, 0, 1600, 400, op, 1, true);
  ccSkZone('env0', cv, g, 0, 400, 1600, 500, me, 0, true);
  ccSkZone('seam', cv, g, 0, 372, 1600, 56, 'seam', 0, true, [co, cm]);
  if (ev === 'rain' || ev === 'wind') {
    const stage = ccM.el.querySelector('.ccm-stage'); stage.insertAdjacentHTML('beforeend', '<canvas class="ccm-wxc" width="1600" height="900"></canvas>');
    const tc = stage.querySelector('.ccm-wxc'); ccSkZone('wxTop', tc, tc.getContext('2d'), 0, 0, 1600, 900, 'ev:' + ev, 0, false);
  } else if (ev) ccSkZone('wx', cv, g, 0, 0, 1600, 900, 'ev:' + ev, 0, true);
}

/* ---- moving particles: zones on canvases. Each half of the board has its own canvas (1044×376, moved back into its
   half after every redraw); the hall has one canvas (1600×900, never redrawn) with a zone per side plus the seam ---- */
const ccSk = { zones: [], glitch: {} };
function ccSkReset() { ccSk.zones = []; ccSk.glitch = {}; }
function ccSkZone(id, cv, g, x0, y0, w, h, bs, p, env, cols) {
  let z = ccSk.zones.find(q => q.id === id);
  if (!z) { z = { id, parts: [] }; ccSk.zones.push(z); }
  const fresh = z.bs !== bs;
  Object.assign(z, { cv, g, x0, y0, w, h, bs, p, env, cols });
  if (fresh) { z.parts = []; if (bs !== 'default') for (let i = 0; i < 90; i++) ccSkSpawn(z, true); }
  return z;
}
function ccSkAttach() {
  if (!ccM || !ccM.el) return;
  ccSkEnv();
  [0, 1].forEach(p => {
    const half = ccM.el.querySelector(`.ccb .cc-half.${p ? 'op' : 'me'}`); if (!half) return;
    const bs = half.dataset.bs, id = 'half' + p;
    let z = ccSk.zones.find(q => q.id === id);
    if (bs === 'default') { if (z) z.bs = 'default'; return; }
    let cv = z && z.cv;
    if (!cv) { cv = document.createElement('canvas'); cv.className = 'ccsk-cv'; cv.width = 1044; cv.height = 376; }
    z = ccSkZone(id, cv, z && z.g || cv.getContext('2d'), 0, 0, 1044, 376, bs, p, false);
    half.insertBefore(cv, half.querySelector('.cc-runes'));
  });
}
const CC_SK_N = { forest: 22, sakura: 30, inferno: 38, cyber: 30, seam: 34, 'ev:rain': 90, 'ev:wind': 14, 'ev:starfall': 2, 'ev:sanctuary': 22, 'ev:surge': 20, 'ev:heat': 22, 'ev:bloodmoon': 20 };
const ccR = (a, b) => a + Math.random() * (b - a);
/* the hall's zones put most particles beside the board, where they can be seen */
const ccSkX = z => !z.env || Math.random() < .2 ? ccR(10, z.w - 10) : Math.random() < .5 ? ccR(0, 290) : ccR(1310, 1600);
const ccSkMax = z => Math.round((CC_SK_N[z.bs] || 0) * (z.env && z.bs !== 'seam' ? 1.7 : 1));
function ccSkSpawn(z, anywhere) {
  const bs = z.bs, L = z.parts; if (L.length >= ccSkMax(z)) return;
  const W = z.w, H = z.h, outerY = z.p ? 0 : H;   // the outer edge: the top of the bot's side, the bottom of yours
  if (bs === 'forest') {
    if (L.filter(q => q.k === 'leaf').length < (z.env ? 7 : 4) && Math.random() < .25) L.push({ k: 'leaf', x: anywhere ? ccSkX(z) : -20, y: ccR(10, H - 10), vx: ccR(.18, .4), vy: ccR(-.08, .08), a: ccR(0, 6.3), va: ccR(-.012, .012), s: ccR(.8, 1.3), c: ['#4f9e58', '#6fbf62', '#8fbf4a', '#c9a24a'][Math.floor(ccR(0, 4))] });
    else L.push({ k: 'fly', x: ccSkX(z), y: ccR(16, H - 16), ph: ccR(0, 6.3), sp: ccR(.4, .9), r: ccR(1.4, 2.6), bl: ccR(.8, 1.8) });
  } else if (bs === 'sakura') {
    L.push({ k: 'petal', x: anywhere ? ccSkX(z) : z.env ? ccSkX(z) - 60 : ccR(-40, W * .6), y: anywhere ? ccR(0, H) : -14, vx: ccR(.3, .75), vy: ccR(.22, .5), a: ccR(0, 6.3), va: ccR(-.03, .03), fl: ccR(.03, .07), ph: ccR(0, 6.3), s: ccR(.7, 1.25) * (z.env ? 1.15 : 1), c: ['#ffb7d5', '#ffc9de', '#ff9ec7', '#ffe0ec'][Math.floor(ccR(0, 4))] });
  } else if (bs === 'inferno') {
    const fromEdge = !anywhere && Math.random() < .6;
    L.push({ k: 'ember', x: ccSkX(z), y: anywhere ? ccR(0, H) : fromEdge ? outerY + (z.p ? ccR(0, 40) : ccR(-40, 0)) : ccR(30, H - 30), vx: ccR(-.25, .25), vy: -ccR(.35, 1.1), r: ccR(.8, 2.4), life: anywhere ? ccR(.2, 1) : 1, dec: ccR(.0025, .007), ph: ccR(0, 6.3) });
  } else if (bs === 'cyber') {
    if (z.env && Math.random() < .2) { const dir = Math.random() < .5 ? 1 : -1;   // flying cars along the skyline
      L.push({ k: 'car', x: dir > 0 ? -40 : W + 40, y: (z.p ? 318 : 112) + ccR(-16, 16), vx: dir * ccR(2.5, 5.5), c: Math.random() < .5 ? '255,43,214' : '41,240,255' }); }
    else if (Math.random() < .7) { const col = z.env ? Math.round(ccSkX(z) / 32) * 32 : Math.floor(ccR(1, W / 32)) * 32; L.push({ k: 'rain', x: col, y: anywhere ? ccR(0, H) : -60, vy: ccR(1.6, 4.2), len: ccR(24, 70), c: Math.random() < .18 ? '#ff2bd6' : '#29f0ff' }); }
    else L.push({ k: 'bit', x: ccSkX(z), y: ccR(20, H - 20), vy: -ccR(.1, .35), s: ccR(3, 7), ph: ccR(0, 6.3), life: 1, dec: ccR(.002, .006), c: Math.random() < .35 ? '#ff2bd6' : '#29f0ff' });
  } else if (bs === 'ev:rain') {   // battle event weather
    L.push({ k: 'drop', x: ccR(-60, W + 120), y: anywhere ? ccR(-40, H) : ccR(-80, -10), vx: -2.4, vy: ccR(13, 19), len: ccR(14, 28), a: ccR(.16, .36) });
  } else if (bs === 'ev:wind') {
    L.push({ k: 'gust', x: anywhere ? ccR(-300, W) : ccR(-600, -150), y: ccR(30, H - 30), vx: ccR(8, 15), len: ccR(90, 220), amp: ccR(4, 12), ph: ccR(0, 6.3), a: ccR(.07, .18) });
  } else if (bs === 'ev:starfall') {
    L.push({ k: 'shoot', x: ccSkX(z) - 200, y: ccR(-30, 330), vx: ccR(7, 11), vy: ccR(2.5, 4.5), life: 1, dec: ccR(.008, .014), delay: anywhere ? ccR(0, 3500) : ccR(600, 3200) });
  } else if (bs === 'ev:sanctuary') {
    L.push({ k: 'holy', x: ccSkX(z), y: anywhere ? ccR(0, H) : H + 10, vy: ccR(.25, .7), ph: ccR(0, 6.3), r: ccR(1.2, 2.8) });
  } else if (bs === 'ev:surge') {
    L.push({ k: 'glyph', x: ccSkX(z), y: ccR(40, H - 40), vy: ccR(.15, .5), a: ccR(0, 6.3), va: ccR(-.03, .03), s: ccR(3, 7), life: anywhere ? ccR(.3, 1) : 1, dec: ccR(.003, .007), c: Math.random() < .6 ? '201,155,255' : '255,150,230' });
  } else if (bs === 'ev:heat') {
    if (Math.random() < .4) L.push({ k: 'haze', x: ccSkX(z), y: anywhere ? ccR(0, H) : H + 30, vy: ccR(.4, 1), r: ccR(14, 34), ph: ccR(0, 6.3), life: 1, dec: ccR(.003, .006) });
    else L.push({ k: 'ember', x: ccSkX(z), y: anywhere ? ccR(0, H) : H - ccR(0, 60), vx: ccR(-.2, .2), vy: -ccR(.4, 1.1), r: ccR(.8, 2), life: anywhere ? ccR(.2, 1) : 1, dec: ccR(.003, .007), ph: ccR(0, 6.3) });
  } else if (bs === 'ev:bloodmoon') {
    L.push({ k: 'ash', x: ccSkX(z), y: anywhere ? ccR(0, H) : -10, vx: ccR(-.2, .3), vy: ccR(.3, .8), r: ccR(1, 2.4), ph: ccR(0, 6.3) });
  } else if (bs === 'seam') {   // sparks of both sides' colours drifting along the middle line
    const top = Math.random() < .5, c = z.cols[top ? 0 : 1];
    L.push({ k: 'mix', x: ccSkX(z), y: H / 2 + (top ? -1 : 1) * ccR(2, 22), vx: ccR(.3, .9) * (Math.random() < .5 ? -1 : 1), ph: ccR(0, 6.3), r: ccR(1, 2.4), life: anywhere ? ccR(.3, 1) : 1, dec: ccR(.003, .008), c: c[Math.random() < .7 ? 0 : 1] });
  }
}
function ccSkFrame(now) {
  const t = now / 1000, cleared = new Set();
  for (const z of ccSk.zones) {
    const g = z.g; if (!g || !z.bs || !z.cv.isConnected) continue;
    if (!cleared.has(z.cv)) { cleared.add(z.cv); g.clearRect(0, 0, z.cv.width, z.cv.height); }
    if (z.bs === 'default') continue;
    const L = z.parts, W = z.w, H = z.h;
    g.save(); if (z.env) { g.beginPath(); g.rect(z.x0, z.y0 - 24, W, H + 48); g.clip(); } g.translate(z.x0, z.y0);
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i];
      if (q.delay > 0) { q.delay -= 16; continue; }
      if (q.k === 'drop') {   // rain streaks over the table
        q.x += q.vx; q.y += q.vy; if (q.y - q.len > H) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(185,215,255,${q.a})`; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * q.len / q.vy, q.y - q.len); g.stroke(); continue;
      }
      if (q.k === 'gust') {   // wind streaks rushing across
        q.x += q.vx; if (q.x - q.len > W) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(225,255,246,${q.a})`; g.lineWidth = 1.4; g.beginPath();
        for (let k = 0; k <= 10; k++) { const xx = q.x - q.len + q.len * k / 10, yy = q.y + Math.sin(xx / 60 + q.ph + t * 2) * q.amp; k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
        g.stroke(); continue;
      }
      if (q.k === 'shoot') {   // a shooting star with its trail
        q.x += q.vx; q.y += q.vy; q.life -= q.dec; if (q.life <= 0) { L.splice(i, 1); continue; }
        const tx = q.x - q.vx * 16, ty = q.y - q.vy * 16, gr = g.createLinearGradient(tx, ty, q.x, q.y);
        gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(1, `rgba(255,248,225,${(q.life * .9).toFixed(3)})`);
        g.globalCompositeOperation = 'lighter'; g.strokeStyle = gr; g.lineWidth = 2.2; g.beginPath(); g.moveTo(tx, ty); g.lineTo(q.x, q.y); g.stroke();
        g.fillStyle = `rgba(255,250,235,${q.life.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, 2.4, 0, 6.283); g.fill(); continue;
      }
      if (q.k === 'holy') {   // golden motes rising
        q.y -= q.vy; q.x += Math.sin(t + q.ph) * .2; if (q.y < -10) { L.splice(i, 1); continue; }
        const a = .35 + .35 * Math.sin(t * 2 + q.ph); g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,220,140,${(a * .3).toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r * 4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(255,240,190,${a.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill(); continue;
      }
      if (q.k === 'glyph') {   // arcane star-sparks turning as they float up
        q.y -= q.vy; q.a += q.va; q.life -= q.dec; if (q.life <= 0) { L.splice(i, 1); continue; }
        const a = Math.min(1, q.life * 1.6) * (.6 + .4 * Math.sin(t * 4 + q.a)), s2 = q.s;
        g.globalCompositeOperation = 'lighter'; g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.fillStyle = `rgba(${q.c},${a.toFixed(3)})`;
        g.beginPath(); g.moveTo(0, -s2); g.lineTo(s2 * .25, -s2 * .25); g.lineTo(s2, 0); g.lineTo(s2 * .25, s2 * .25); g.lineTo(0, s2); g.lineTo(-s2 * .25, s2 * .25); g.lineTo(-s2, 0); g.lineTo(-s2 * .25, -s2 * .25); g.fill(); g.restore(); continue;
      }
      if (q.k === 'haze') {   // heat shimmer blobs rising
        q.y -= q.vy; q.x += Math.sin(t * 1.5 + q.ph) * .4; q.life -= q.dec; if (q.life <= 0) { L.splice(i, 1); continue; }
        const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); gr.addColorStop(0, `rgba(255,150,60,${(q.life * .12).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,120,40,0)');
        g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill(); continue;
      }
      if (q.k === 'ash') {   // crimson ash under the blood moon
        q.x += q.vx + Math.sin(t * 1.3 + q.ph) * .3; q.y += q.vy; if (q.y > H + 10) { L.splice(i, 1); continue; }
        const a = .45 + .3 * Math.sin(t * 3 + q.ph); g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(255,60,80,${(a * .25).toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r * 3.5, 0, 6.283); g.fill();
        g.fillStyle = `rgba(255,120,130,${a.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill(); continue;
      }
      if (q.k === 'car') {   // a flying car: two headlights and a light trail
        q.x += q.vx; if (q.x < -60 || q.x > W + 60) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(q.x - q.vx * 12, 0, q.x, 0);
        gr.addColorStop(0, `rgba(${q.c},0)`); gr.addColorStop(1, `rgba(${q.c},.8)`); g.strokeStyle = gr; g.lineWidth = 2;
        g.beginPath(); g.moveTo(q.x - q.vx * 12, q.y); g.lineTo(q.x, q.y); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(q.x, q.y, 1.6, 0, 6.283); g.fill(); continue;
      }
      if (q.k === 'fly') {   // fireflies wander and blink
        q.x += Math.cos(t * q.sp + q.ph) * .38; q.y += Math.sin(t * q.sp * 1.3 + q.ph * 2) * .26;
        if (q.x < 8 || q.x > W - 8 || q.y < 8 || q.y > H - 8) { L.splice(i, 1); continue; }
        const b = Math.max(0, Math.sin(t * q.bl + q.ph)), a = .15 + b * b * .85;
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 7); gr.addColorStop(0, `rgba(233,255,138,${(a * .55).toFixed(3)})`); gr.addColorStop(1, 'rgba(160,255,120,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r * 7, 0, 6.283); g.fill();
        g.fillStyle = `rgba(250,255,200,${a.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill();
      } else if (q.k === 'leaf') {   // a leaf drifting across on the breeze
        q.x += q.vx; q.y += q.vy + Math.sin(t * 1.4 + q.a) * .12; q.a += q.va;
        if (q.x > W + 30) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'source-over'; g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(q.s * (.6 + .4 * Math.cos(t * 2 + q.a)), q.s);
        g.globalAlpha = .7; g.fillStyle = q.c; g.beginPath(); g.moveTo(-9, 0); g.bezierCurveTo(-4, -6, 4, -6, 9, 0); g.bezierCurveTo(4, 6, -4, 6, -9, 0); g.fill();
        g.strokeStyle = 'rgba(30,60,30,.6)'; g.lineWidth = .7; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); g.globalAlpha = 1;
      } else if (q.k === 'petal') {   // sakura petals tumbling down on the wind
        q.x += q.vx + Math.sin(t * 1.1 + q.ph) * .3; q.y += q.vy; q.a += q.va;
        if (q.y > H + 16 || q.x > W + 20) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'source-over'; g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(q.s * Math.cos(t * q.fl * 60 + q.ph), q.s);
        g.globalAlpha = .88; g.fillStyle = q.c; g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-6, 3, -6, -5, -2, -8); g.lineTo(0, -6); g.lineTo(2, -8); g.bezierCurveTo(6, -5, 6, 3, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-1, -1, 1.4, 3.2, 0, 0, 6.283); g.fill(); g.restore(); g.globalAlpha = 1;
      } else if (q.k === 'ember') {   // embers rise, sway and cool from yellow to red
        q.x += q.vx + Math.sin(t * 2 + q.ph) * .35; q.y += q.vy; q.life -= q.dec;
        if (q.life <= 0 || q.y < -10) { L.splice(i, 1); continue; }
        const c = q.life > .6 ? '255,214,120' : q.life > .3 ? '255,140,40' : '255,70,20', a = Math.min(1, q.life * 1.6) * (.7 + .3 * Math.sin(t * 9 + q.ph));
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = `rgba(${c},${(a * .3).toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r * 3.4, 0, 6.283); g.fill();
        g.fillStyle = `rgba(${c},${a.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill();
      } else if (q.k === 'rain') {   // data rain running down
        q.y += q.vy; if (q.y - q.len > H) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, q.y - q.len, 0, q.y);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, q.c); g.globalAlpha = .55; g.strokeStyle = gr; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(q.x, q.y - q.len); g.lineTo(q.x, q.y); g.stroke();
        g.globalAlpha = .9; g.fillStyle = '#e8fdff'; g.fillRect(q.x - 1.5, q.y - 3, 3, 3); g.globalAlpha = 1;
      } else if (q.k === 'bit') {   // little neon squares floating up and blinking
        q.y += q.vy; q.life -= q.dec; if (q.life <= 0) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, q.life * 2) * (Math.sin(t * 5 + q.ph) > -.2 ? .8 : .15);
        g.strokeStyle = q.c; g.lineWidth = 1.2; g.strokeRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); g.globalAlpha = 1;
      } else if (q.k === 'mix') {   // seam sparks
        q.x += q.vx; q.y += Math.sin(t * 2.2 + q.ph) * .25; q.life -= q.dec;
        if (q.life <= 0 || q.x < -10 || q.x > W + 10) { L.splice(i, 1); continue; }
        const a = Math.min(1, q.life * 1.8) * (.6 + .4 * Math.sin(t * 6 + q.ph));
        g.globalCompositeOperation = 'lighter'; g.fillStyle = q.c;
        g.globalAlpha = a * .25; g.beginPath(); g.arc(q.x, q.y, q.r * 4, 0, 6.283); g.fill();
        g.globalAlpha = a; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill(); g.globalAlpha = 1;
      }
    }
    if (z.bs === 'cyber') {   // now and then a glitch bar flickers across
      const gl = ccSk.glitch[z.id] || 0;
      if (now > gl) ccSk.glitch[z.id] = now + ccR(1800, 4200);
      else if (gl - now < 140) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = .28; const y = (gl * 7) % H, x = z.env ? (gl % 2 < 1 ? (gl * 13) % 220 : 1330 + (gl * 13) % 120) : (gl * 13) % 600;
        g.fillStyle = '#ff2bd6'; g.fillRect(x, y, 180 + (gl % 120), 3);
        g.fillStyle = '#29f0ff'; g.fillRect(x + 8, y + 4, 110 + (gl % 90), 2); g.globalAlpha = 1;
      }
    }
    g.restore(); g.globalCompositeOperation = 'source-over';
    if (L.length < ccSkMax(z) && Math.random() < (z.env ? .55 : .35)) ccSkSpawn(z, false);
  }
}
