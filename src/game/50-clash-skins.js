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

/* ---- moving particles, one canvas per half (1044×376, the half's own coordinates) ---- */
const ccSk = { cv: [null, null], g: [null, null], parts: [[], []], skin: [null, null], glitch: [0, 0] };
const CC_SK_W = 1044, CC_SK_H = 376;
function ccSkReset() { ccSk.cv = [null, null]; ccSk.g = [null, null]; ccSk.parts = [[], []]; ccSk.skin = [null, null]; }
function ccSkAttach() {
  if (!ccM || !ccM.el) return;
  [0, 1].forEach(p => {
    const half = ccM.el.querySelector(`.ccb .cc-half.${p ? 'op' : 'me'}`); if (!half) return;
    const bs = half.dataset.bs;
    if (bs === 'default') { ccSk.skin[p] = bs; ccSk.parts[p] = []; return; }
    if (!ccSk.cv[p]) { const c = document.createElement('canvas'); c.className = 'ccsk-cv'; c.width = CC_SK_W; c.height = CC_SK_H; ccSk.cv[p] = c; ccSk.g[p] = c.getContext('2d'); }
    if (ccSk.skin[p] !== bs) { ccSk.skin[p] = bs; ccSk.parts[p] = []; for (let i = 0; i < 60; i++) ccSkSpawn(p, true); }
    half.insertBefore(ccSk.cv[p], half.querySelector('.cc-runes'));
  });
}
const CC_SK_N = { forest: 22, sakura: 30, inferno: 38, cyber: 30 };
const ccR = (a, b) => a + Math.random() * (b - a);
function ccSkSpawn(p, anywhere) {
  const bs = ccSk.skin[p], L = ccSk.parts[p]; if (L.length >= CC_SK_N[bs]) return;
  const outerY = p ? 0 : CC_SK_H;   // the half's outer edge (top for the bot, bottom for you)
  if (bs === 'forest') {
    if (L.filter(q => q.k === 'leaf').length < 4 && Math.random() < .25) L.push({ k: 'leaf', x: anywhere ? ccR(0, CC_SK_W) : -20, y: ccR(10, CC_SK_H - 10), vx: ccR(.18, .4), vy: ccR(-.08, .08), a: ccR(0, 6.3), va: ccR(-.012, .012), s: ccR(.8, 1.3), c: ['#4f9e58', '#6fbf62', '#8fbf4a', '#c9a24a'][Math.floor(ccR(0, 4))] });
    else L.push({ k: 'fly', x: ccR(20, CC_SK_W - 20), y: ccR(16, CC_SK_H - 16), ph: ccR(0, 6.3), sp: ccR(.4, .9), r: ccR(1.4, 2.6), bl: ccR(.8, 1.8) });
  } else if (bs === 'sakura') {
    L.push({ k: 'petal', x: anywhere ? ccR(0, CC_SK_W) : ccR(-40, CC_SK_W * .6), y: anywhere ? ccR(0, CC_SK_H) : -14, vx: ccR(.3, .75), vy: ccR(.22, .5), a: ccR(0, 6.3), va: ccR(-.03, .03), fl: ccR(.03, .07), ph: ccR(0, 6.3), s: ccR(.7, 1.25), c: ['#ffb7d5', '#ffc9de', '#ff9ec7', '#ffe0ec'][Math.floor(ccR(0, 4))] });
  } else if (bs === 'inferno') {
    const fromEdge = !anywhere && Math.random() < .6;
    L.push({ k: 'ember', x: ccR(10, CC_SK_W - 10), y: anywhere ? ccR(0, CC_SK_H) : fromEdge ? outerY + (p ? ccR(0, 40) : ccR(-40, 0)) : ccR(30, CC_SK_H - 30), vx: ccR(-.25, .25), vy: -ccR(.35, 1.1), r: ccR(.8, 2.4), life: anywhere ? ccR(.2, 1) : 1, dec: ccR(.0025, .007), ph: ccR(0, 6.3) });
  } else if (bs === 'cyber') {
    if (Math.random() < .7) { const col = Math.floor(ccR(1, CC_SK_W / 32)) * 32; L.push({ k: 'rain', x: col, y: anywhere ? ccR(0, CC_SK_H) : -60, vy: ccR(1.6, 4.2), len: ccR(24, 70), c: Math.random() < .18 ? '#ff2bd6' : '#29f0ff' }); }
    else L.push({ k: 'bit', x: ccR(20, CC_SK_W - 20), y: ccR(20, CC_SK_H - 20), vy: -ccR(.1, .35), s: ccR(3, 7), ph: ccR(0, 6.3), life: 1, dec: ccR(.002, .006), c: Math.random() < .35 ? '#ff2bd6' : '#29f0ff' });
  }
}
function ccSkFrame(now) {
  for (let p = 0; p < 2; p++) {
    const g = ccSk.g[p], bs = ccSk.skin[p], L = ccSk.parts[p]; if (!g || !bs || bs === 'default' || !ccSk.cv[p].isConnected) continue;
    g.clearRect(0, 0, CC_SK_W, CC_SK_H); const t = now / 1000;
    for (let i = L.length - 1; i >= 0; i--) {
      const q = L[i];
      if (q.k === 'fly') {   // fireflies wander and blink
        q.x += Math.cos(t * q.sp + q.ph) * .38; q.y += Math.sin(t * q.sp * 1.3 + q.ph * 2) * .26;
        if (q.x < 8 || q.x > CC_SK_W - 8 || q.y < 8 || q.y > CC_SK_H - 8) { L.splice(i, 1); continue; }
        const b = Math.max(0, Math.sin(t * q.bl + q.ph)); const a = .15 + b * b * .85;
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r * 7); gr.addColorStop(0, `rgba(233,255,138,${(a * .55).toFixed(3)})`); gr.addColorStop(1, 'rgba(160,255,120,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r * 7, 0, 6.283); g.fill();
        g.fillStyle = `rgba(250,255,200,${a.toFixed(3)})`; g.beginPath(); g.arc(q.x, q.y, q.r, 0, 6.283); g.fill();
      } else if (q.k === 'leaf') {   // a leaf drifting across on the breeze
        q.x += q.vx; q.y += q.vy + Math.sin(t * 1.4 + q.a) * .12; q.a += q.va;
        if (q.x > CC_SK_W + 30) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'source-over'; g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(q.s * (.6 + .4 * Math.cos(t * 2 + q.a)), q.s);
        g.globalAlpha = .7; g.fillStyle = q.c; g.beginPath(); g.moveTo(-9, 0); g.bezierCurveTo(-4, -6, 4, -6, 9, 0); g.bezierCurveTo(4, 6, -4, 6, -9, 0); g.fill();
        g.strokeStyle = 'rgba(30,60,30,.6)'; g.lineWidth = .7; g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore(); g.globalAlpha = 1;
      } else if (q.k === 'petal') {   // sakura petals tumbling down on the wind
        q.x += q.vx + Math.sin(t * 1.1 + q.ph) * .3; q.y += q.vy; q.a += q.va;
        if (q.y > CC_SK_H + 16 || q.x > CC_SK_W + 20) { L.splice(i, 1); continue; }
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
      } else if (q.k === 'rain') {   // data rain running down the grid lines
        q.y += q.vy; if (q.y - q.len > CC_SK_H) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, q.y - q.len, 0, q.y);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, q.c); g.globalAlpha = .55; g.strokeStyle = gr; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(q.x, q.y - q.len); g.lineTo(q.x, q.y); g.stroke();
        g.globalAlpha = .9; g.fillStyle = '#e8fdff'; g.fillRect(q.x - 1.5, q.y - 3, 3, 3); g.globalAlpha = 1;
      } else if (q.k === 'bit') {   // little neon squares floating up and blinking
        q.y += q.vy; q.life -= q.dec; if (q.life <= 0) { L.splice(i, 1); continue; }
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, q.life * 2) * (Math.sin(t * 5 + q.ph) > -.2 ? .8 : .15);
        g.strokeStyle = q.c; g.lineWidth = 1.2; g.strokeRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); g.globalAlpha = 1;
      }
    }
    if (bs === 'cyber') {   // now and then a glitch bar flickers across
      if (now > ccSk.glitch[p]) ccSk.glitch[p] = now + ccR(1800, 4200);
      else if (ccSk.glitch[p] - now > 0 && ccSk.glitch[p] - now < 140) {
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = .28; const y = (ccSk.glitch[p] * 7) % CC_SK_H;
        g.fillStyle = '#ff2bd6'; g.fillRect(((ccSk.glitch[p] * 13) % 600), y, 180 + (ccSk.glitch[p] % 220), 3);
        g.fillStyle = '#29f0ff'; g.fillRect(((ccSk.glitch[p] * 13) % 600) + 8, y + 4, 120 + (ccSk.glitch[p] % 160), 2); g.globalAlpha = 1;
      }
    }
    g.globalCompositeOperation = 'source-over';
    if (L.length < CC_SK_N[bs] && Math.random() < .35) ccSkSpawn(p, false);
  }
}
