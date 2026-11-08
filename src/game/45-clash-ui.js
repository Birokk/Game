/* ---------- Card Clash UI: the Deck tab (deckbuilder) and Quick match against the bot ----------
   The rules live in 44-clash.js; this file only draws the state and turns taps into actions. */

const CC_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6" width="11" height="15" rx="2" transform="rotate(-10 8.5 13.5)"/><rect x="10" y="3" width="11" height="15" rx="2" transform="rotate(8 15.5 10.5)"/></svg>';
const CC_GLYPH = {
  aggression: 'M19.5 2.5l2 2-10.8 10.8 1.8 1.8-1.6 1.6-1.8-1.8-3.4 3.4a1.4 1.4 0 01-2-2l3.4-3.4-1.8-1.8 1.6-1.6 1.8 1.8z',
  defense: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z',
  control: 'M12 3c5 0 9 4.5 10 9-1 4.5-5 9-10 9S3 16.5 2 12c1-4.5 5-9 10-9zm0 5a4 4 0 100 8 4 4 0 000-8z',
  mobility: 'M13.5 2L4 14h6.5l-1.5 8L19 9.5h-6.5z',
  support: 'M12 21s-8.5-5.3-8.5-11.2A4.7 4.7 0 0112 7a4.7 4.7 0 018.5 2.8C20.5 15.7 12 21 12 21z',
  spell: 'M12 2l2.2 7.3L21.5 12l-7.3 2.7L12 22l-2.2-7.3L2.5 12l7.3-2.7z',
  trap: 'M12 3l10 18H2zm0 6l-1 6h2zm0 8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z',
  equipment: 'M6.5 3h11l4 6.5L12 22 2.5 9.5zM6 9.5h12'
};
const ccStyleDot = st => ccIco(st, 'ccg-dot');
function ccCardHTML(id, o = {}) {
  const d = ccDef(id), st = CC_STYLES[d.style], unit = d.type === 'unit';
  return `<div class="ccc ty-${d.type} st-${d.style} ${o.cls || ''}" style="--cs:${st[1]}" ${o.attr || ''} title="${o.tip === false ? '' : esc(`${d.name} · ${CC_TYPES[d.type]} · ${st[0]}\n${d.text}\n${d.id}`)}">
    <div class="ccc-fr"><div class="ccc-art"><i class="ccc-rays"></i>${ccIco(d.id, 'cce')}<i class="ccc-vig"></i></div>
      <div class="ccc-plate"><b class="ccc-name">${esc(d.name)}</b></div>
      <span class="ccc-type">${ccIco(d.style, 'ccc-sti')}${CC_TYPES[d.type]}${unit ? ` · ${d.range === 'ranged' ? 'Ranged' : 'Melee'}` : ''}</span>
      <p class="ccc-txt">${esc(d.text)}</p></div>
    <span class="ccc-cost"><b>${d.ap}</b></span>${unit ? `<span class="ccc-atk"><b>${d.atk}</b></span><span class="ccc-hp"><b>${d.hp}</b></span>` : ''}<i class="ccc-shine"></i>${o.extra || ''}</div>`;
}

/* ---- saved decks (player save S.cc) ---- */
function ccSave() { if (!S.cc) S.cc = { decks: [], sel: 'p-balanced', stats: { w: 0, l: 0, d: 0 } }; if (!S.cc.stats) S.cc.stats = { w: 0, l: 0, d: 0 }; return S.cc; }
function ccAllDecks() { return [...CC_PRESETS.map(d => ({ ...d, preset: true })), ...ccSave().decks]; }
function ccDeck(id) { return ccAllDecks().find(d => d.id === id) || ccAllDecks()[0]; }
const ccCount = (cards, id) => cards.filter(x => x === id).length;
const CC_DECK_MAX = 12;

let ccdEl = null;
const ccdF = { style: 'all', type: 'all', ap: 0, q: '' };
function openDeck() {
  closeModal(); ccSave(); ccArtPrewarm();
  if (!ccdEl) { ccdEl = document.createElement('div'); ccdEl.className = 'ccd'; ccdEl.setAttribute('role', 'dialog'); ccdEl.setAttribute('aria-label', 'Deck'); document.body.appendChild(ccdEl); }
  renderDeck();
}
function closeDeck() { if (ccdEl) { ccdEl.remove(); ccdEl = null; } renderMenu(); }
function renderDeck() {
  if (!ccdEl) return;
  const sv = ccSave(), deck = ccDeck(sv.sel), cards = deck.cards, v = ccValidateDeck(cards), ro = !!deck.preset;
  const grid = ccdEl.querySelector('.ccd-grid'), keep = grid ? grid.scrollTop : 0, listEl = ccdEl.querySelector('.ccd-list'), keepL = listEl ? listEl.scrollTop : 0;
  const pool = CC_CARDS.filter(c => (ccdF.style === 'all' || c.style === ccdF.style) && (ccdF.type === 'all' || c.type === ccdF.type) && (!ccdF.ap || c.ap === ccdF.ap) && (!ccdF.q || (c.name + ' ' + c.text + ' ' + c.id).toLowerCase().includes(ccdF.q.toLowerCase())));
  const chip = (k, val, label, color) => `<button class="ccd-chip ${ccdF[k] === val ? 'on' : ''}" data-f="${k}" data-v="${val}" ${color ? `style="--cs:${color}"` : ''}>${label}</button>`;
  const uniq = [...new Set(cards)].sort((a, b) => ccDef(a).ap - ccDef(b).ap || ccDef(a).name.localeCompare(ccDef(b).name));
  const byType = t => cards.filter(id => ccDef(id).type === t).length, bySt = s => cards.filter(id => ccDef(id).style === s).length;
  const deckRow = d => `<button class="ccd-dk ${d.id === sv.sel ? 'on' : ''}" data-deck="${d.id}"><span class="ccd-dkic">${d.preset ? icon('lock') : CC_IC}</span><b>${esc(d.name)}</b><small class="${ccValidateDeck(d.cards).ok ? 'ok' : ''}">${d.cards.length}/30</small></button>`;
  ccdEl.innerHTML = `<div class="ccd-bg"></div>
    <header class="ccd-head"><div class="inv-title"><span class="inv-badge">${CC_IC}</span><h2 class="ts">Deck</h2></div>
      <span class="ccd-rec" title="Quick match record">${icon('trophy')}<b>${sv.stats.w}</b> W · <b>${sv.stats.l}</b> L · <b>${sv.stats.d}</b> D</span>
      <button class="btn ghost ccd-help" id="ccdSkin" title="Board skins and card backs">${ccSkinIco(ccMySkin(), 'ccd-skic')}Skins</button>
      <button class="btn ghost ccd-help" id="ccdHelp">${icon('info')}How to play</button>
      <button class="btn gold ccd-play" id="ccdPlay">${icon('bolt')}Quick match</button>
      <button class="inv-x" id="ccdClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="ccd-side">
      <span class="ccd-lbl">Starter decks</span>${CC_PRESETS.map(d => deckRow({ ...d, preset: true })).join('')}
      <span class="ccd-lbl">My decks</span>${sv.decks.map(deckRow).join('') || '<span class="tiny">No decks yet. Start one or copy a starter deck.</span>'}
      <button class="btn ghost ccd-new" id="ccdNew" ${sv.decks.length >= CC_DECK_MAX ? 'disabled' : ''}>${icon('plus')}New deck</button>
    </aside>
    <section class="ccd-pool">
      <div class="ccd-filters">
        <div class="ccd-frow">${chip('style', 'all', 'All')}${Object.entries(CC_STYLES).map(([k, [n, c]]) => chip('style', k, `${ccStyleDot(k)}${n}`, c)).join('')}</div>
        <div class="ccd-frow">${chip('type', 'all', 'All types')}${Object.entries(CC_TYPES).map(([k, n]) => chip('type', k, n)).join('')}<span class="ccd-sep"></span>${chip('ap', 0, 'Any AP')}${[1, 2, 3].map(n => chip('ap', n, `${n} AP`)).join('')}
          <input class="ccd-q" id="ccdQ" placeholder="Search cards" value="${esc(ccdF.q)}" aria-label="Search cards"></div>
      </div>
      <div class="ccd-grid">${pool.map(c => { const n = ccCount(cards, c.id); return `<button class="ccd-cell ${n >= 2 ? 'full' : ''}" data-add="${c.id}">${ccCardHTML(c.id, { extra: n ? `<span class="ccc-n">${n}/2</span>` : '' })}</button>`; }).join('') || '<p class="tiny">No cards match these filters.</p>'}</div>
      <p class="ccd-hint tiny">${ro ? 'Starter decks are fixed: tap <b>Copy to edit</b> to make your own version.' : 'Tap a card to add a copy (max 2 per card), tap it in the deck list to remove one.'} All 80 cards are free for everyone.</p>
    </section>
    <aside class="ccd-deck">
      <div class="ccd-dhead">${ro ? `<b class="ccd-dname">${esc(deck.name)}</b>` : `<input class="ccd-dname" id="ccdName" maxlength="24" value="${esc(deck.name)}" aria-label="Deck name">`}
        <span class="ccd-cnt ${v.ok ? 'ok' : cards.length > 30 ? 'bad' : ''}">${cards.length}/30</span></div>
      ${ccLeaderBox(deck.id)}
      <div class="ccd-comp">${['unit', 'spell', 'trap', 'equipment'].map(t => `<span><b>${byType(t)}</b>${CC_TYPES[t]}${t === 'equipment' ? '' : 's'}</span>`).join('')}</div>
      <div class="ccd-bar">${Object.keys(CC_STYLES).map(s => bySt(s) ? `<i style="flex:${bySt(s)};--cs:${CC_STYLES[s][1]}" title="${CC_STYLES[s][0]} ${bySt(s)}"></i>` : '').join('') || '<i class="none"></i>'}</div>
      <div class="ccd-list">${uniq.map(id => { const d = ccDef(id); return `<button class="ccd-li" data-rem="${id}" style="--cs:${CC_STYLES[d.style][1]}" title="${esc(d.text)}">${ccIco(id, 'ccd-li-em')}<span class="ccd-li-ap"><span>${d.ap}</span></span><b>${esc(d.name)}</b><small>${CC_TYPES[d.type]}</small><span class="ccd-li-n">×${ccCount(cards, id)}</span>${ro ? '' : `<span class="ccd-li-x">${icon('close')}</span>`}</button>`; }).join('') || '<p class="tiny">Empty deck. Add 30 cards from the left.</p>'}</div>
      ${v.ok ? '<p class="ccd-ok">Ready to play</p>' : `<p class="ccd-err">${esc(v.errs[0] || '')}</p>`}
      <div class="ccd-acts">
        <button class="btn ghost" id="ccdCopy" ${sv.decks.length >= CC_DECK_MAX ? 'disabled' : ''}>${icon('copy')}${ro ? 'Copy to edit' : 'Duplicate'}</button>
        <button class="btn ghost" id="ccdExport">${icon('upload')}Export</button>
        ${ro ? '' : `<button class="btn ghost" id="ccdImport">${icon('edit')}Import</button><button class="btn ghost" id="ccdClear">${icon('trash')}Clear</button><button class="btn ghost danger" id="ccdDel">Delete</button>`}
      </div>
    </aside>`;
  const ng = ccdEl.querySelector('.ccd-grid'); if (ng) ng.scrollTop = keep;
  const nl = ccdEl.querySelector('.ccd-list'); if (nl) nl.scrollTop = keepL;
  const $$ = s => ccdEl.querySelectorAll(s), one = s => ccdEl.querySelector(s);
  one('#ccdClose').onclick = closeDeck;
  one('#ccdPlay').onclick = openQuickMatch;
  one('#ccdHelp').onclick = () => ccRules(0);
  one('#ccdSkin').onclick = () => ccSkinPicker();
  one('#ccdLead').onclick = () => ccPickLeader(deck.id, () => { openDeck(); });
  $$('[data-deck]').forEach(b => b.onclick = () => { sv.sel = b.dataset.deck; persist(); renderDeck(); });
  $$('[data-f]').forEach(b => b.onclick = () => { const k = b.dataset.f; ccdF[k] = k === 'ap' ? +b.dataset.v : b.dataset.v; renderDeck(); });
  const q = one('#ccdQ'); q.oninput = () => { ccdF.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { renderDeck(); const n = ccdEl && ccdEl.querySelector('#ccdQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
  $$('[data-add]').forEach(b => b.onclick = () => {
    if (ro) return toast('Starter decks can’t be changed. Tap "Copy to edit" first.');
    const id = b.dataset.add;
    if (ccCount(cards, id) >= CC_CFG.copies) return toast(`Max ${CC_CFG.copies} copies of ${ccDef(id).name}`);
    if (cards.length >= CC_CFG.deck) return toast('The deck already has 30 cards');
    cards.push(id); persist(); renderDeck();
  });
  $$('[data-rem]').forEach(b => b.onclick = () => { if (ro) return; const i = cards.lastIndexOf(b.dataset.rem); if (i >= 0) { cards.splice(i, 1); persist(); renderDeck(); } });
  one('#ccdNew').onclick = () => { if (sv.decks.length >= CC_DECK_MAX) return; const d = { id: 'd' + Date.now().toString(36), name: `My deck ${sv.decks.length + 1}`, cards: [] }; sv.decks.push(d); sv.sel = d.id; persist(); renderDeck(); };
  one('#ccdCopy').onclick = () => { if (sv.decks.length >= CC_DECK_MAX) return; const d = { id: 'd' + Date.now().toString(36), name: `${deck.name.replace(/ Deck$/, '')} copy`.slice(0, 24), cards: cards.slice() }; sv.decks.push(d); sv.sel = d.id; persist(); renderDeck(); toast('Copied. You can edit this one.'); };
  one('#ccdExport').onclick = () => { const txt = cards.join(','); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Deck code copied (card IDs)'), () => prompt('Deck code (card IDs):', txt)); };
  const imp = one('#ccdImport'); if (imp) imp.onclick = () => {
    const txt = prompt('Paste a deck code (card IDs separated by commas):'); if (!txt) return;
    const ids = txt.split(/[\s,;]+/).map(s => s.trim().toUpperCase()).filter(Boolean), chk = ccValidateDeck(ids);
    if (ids.some(id => !CC_DEF[id])) return toast(chk.errs.find(e => e.startsWith('Unknown')) || 'Unknown card ID', true);
    if (ids.length > CC_CFG.deck || chk.errs.some(e => e.includes('copies'))) return toast(chk.errs[0], true);
    deck.cards = ids; persist(); renderDeck(); toast(chk.ok ? 'Deck imported' : `Imported (${ids.length}/30)`);
  };
  const clr = one('#ccdClear'); if (clr) clr.onclick = () => { if (!clr.dataset.sure) { clr.dataset.sure = 1; clr.textContent = 'Tap again'; return; } deck.cards = []; persist(); renderDeck(); };
  const nm = one('#ccdName'); if (nm) nm.onchange = () => { deck.name = nm.value.trim().slice(0, 24) || 'My deck'; persist(); renderDeck(); };
  const del = one('#ccdDel'); if (del) del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = 'Tap again'; return; } sv.decks = sv.decks.filter(d => d.id !== deck.id); sv.sel = 'p-balanced'; persist(); renderDeck(); };
}

/* ---- Quick match setup ---- */
let ccQmSeed = 0;
function openQuickMatch() {
  const sv = ccSave(); ccQmSeed = Math.floor(Math.random() * 1e9);
  const ok = ccAllDecks().filter(d => ccValidateDeck(d.cards).ok);
  if (!ccValidateDeck(ccDeck(sv.sel).cards).ok && ok.length) sv.sel = ok[0].id;
  openModal({ title: 'Quick match', ic: 'bolt', kind: 'ccqm', body: `<div class="ccq">
    <p class="ccq-intro">Play Card Clash against a bot. <b>The bot uses the same deck as you</b> (a mirror match), each deck shuffled on its own. The bot plays like an average player and never sees your hand or your face-down traps.</p>
    <span class="ccd-lbl">Your deck</span>
    <div class="ccq-decks">${ccAllDecks().map(d => { const v = ccValidateDeck(d.cards).ok; return `<button class="ccq-dk ${d.id === sv.sel ? 'on' : ''}" data-qdeck="${d.id}" ${v ? '' : 'disabled'}><span>${d.preset ? icon('lock') : CC_IC}</span><b>${esc(d.name)}</b><small>${v ? 'Ready' : `${d.cards.length}/30`}</small></button>`; }).join('')}</div>
    <div class="ccq-row"><label class="ccd-lbl" for="ccqSeed">Match seed</label><input id="ccqSeed" class="ccq-seed" inputmode="numeric" value="${ccQmSeed}"><button class="btn ghost" id="ccqDice">New seed</button></div>
    <p class="tiny ccq-ev" id="ccqEv"></p>
    <p class="tiny">The same seed and the same moves always replay the same match, handy for reporting a bug. Who goes first and the battle event are decided by the seed.</p>
    <p class="tiny ccq-skin">${ccSkinIco(ccMySkin(), 'ccq-skic')}Board: <b>${esc(ccSkinOf(ccMySkin()).name)}</b> · card back: <b>${esc(ccBackOf(ccMyBack()).name)}</b> · <button class="ccq-help" id="ccqSkin">Change</button> · the bot gets random ones.</p>
    <p class="tiny">New to Card Clash? <button class="ccq-help" id="ccqHelp">Read How to play</button> · every win gives +1 pearl.</p>
    <button class="btn gold ccq-go" id="ccqGo">${icon('bolt')}Start match</button></div>`,
    onMount: b => {
      b.querySelectorAll('[data-qdeck]').forEach(x => x.onclick = () => { sv.sel = x.dataset.qdeck; persist(); b.querySelectorAll('[data-qdeck]').forEach(y => y.classList.toggle('on', y === x)); if (ccdEl) renderDeck(); });
      b.querySelector('#ccqHelp').onclick = () => ccRules(0);
      b.querySelector('#ccqSkin').onclick = () => ccSkinPicker(openQuickMatch);
      const evLine = () => { const sd = (parseInt(b.querySelector('#ccqSeed').value, 10) || 0) >>> 0, k = ccPickEvent(sd), E = k && CC_EVENTS[k];
        b.querySelector('#ccqEv').innerHTML = E ? `<span class="ccq-evt" style="--ec:${ccEvCol(k)}">${ccEvIco(k)}<b>${esc(E.name)}</b></span> ${esc(E.text)}` : 'Battle event: none for this seed (clear skies). 60% of matches start with one.'; };
      evLine(); b.querySelector('#ccqSeed').oninput = evLine;
      b.querySelector('#ccqDice').onclick = () => { b.querySelector('#ccqSeed').value = Math.floor(Math.random() * 1e9); evLine(); };
      b.querySelector('#ccqGo').onclick = () => {
        const d = ccDeck(sv.sel); if (!ccValidateDeck(d.cards).ok) return toast('Pick a deck with 30 cards', true);
        const seed = (parseInt(b.querySelector('#ccqSeed').value, 10) || 0) >>> 0;
        closeModal(); startClash(d, seed);
      };
    } });
}

/* ---- the match ---- */
let ccM = null;
const CC_WIN_PEARLS = 1;   // pearls for every Quick match win
const CC_LANES = ['Left', 'Center', 'Right'];
const CC_TIPS = [
  'Melee units fight from the Front row; Ranged units can attack from either row.',
  'A Ranged unit attacking from the Back takes no damage back from a Melee unit.',
  'Killing a unit pushes up to 2 leftover damage into the enemy hero.',
  'Face-down traps trigger when an enemy enters their lane, attacks from it, or casts a spell on a unit there.',
  'From round 20, every unit loses 1 HP at the start of its owner\u2019s turn.',
  'Haste units can attack the turn they arrive. Free Move units can move first and then attack (Dash).',
  'You can only heal your hero by 1 HP each round, so protect it with units.',
  'The bot plays the same deck as you, so you always know what it might have.'
];
/* starting a match: the loading screen covers everything while the board, the forest and the textures are built,
   and the match (and the bot) only starts once the board is revealed */
function startClash(deck, seed) {
  ccStop(); closeModal();
  const foes = S.pool.filter(e => e.type === 'character' && !e.mc), foe = foes.length ? foes[(seed >>> 0) % foes.length] : null;
  const G = ccCreateMatch(seed, deck.cards.slice(), deck.cards.slice(), [S.player.name || 'You', foe ? foe.name : 'Bot']);
  ccSkReset();
  const m = ccM = { G, foe, leader: ccLeaderOf(deck.id), skins: [ccMySkin(), ccBotSkin(seed)], backs: [ccMyBack(), ccBotBack(seed)], deck: { id: deck.id, name: deck.name, cards: deck.cards.slice() }, seed, sel: null, peek: null, busy: true, loading: true, timer: 0, log: false, done: false };
  showLoading(() => { if (ccM !== m) return; m.loading = false; ccFx0(); m.intro = true; ccRender(); ccIntro(() => ccCoinFlip(() => ccEventReveal(() => { if (ccM !== m) return; m.intro = false; m.busy = false; ccRender(); ccDeal(G.players[0].hand.map(c => c.iid)); m.animEnd = performance.now() + 900 + G.players[0].hand.length * 130; ccAfter(true); }))); }, { tips: CC_TIPS, label: 'Preparing the battlefield', min: 1100, run: async set => {
    const tick = () => new Promise(r => setTimeout(r, 16));
    if (ccM !== m) return;
    const el = document.createElement('div'); el.className = 'ccm'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Card Clash match');
    el.innerHTML = '<div class="ccm-stage"><div class="ccm-env"><i class="ccm-circle"></i><i class="ccm-circle c2"></i><i class="ccm-ray r1"></i><i class="ccm-ray r2"></i><i class="ccm-ray r3"></i><i class="ccm-fog"></i></div><div class="ccm-ui"></div><div class="ccx"></div><canvas class="ccm-fxc" width="1600" height="900"></canvas></div>';
    document.body.appendChild(el); m.el = el; m.hide = new Set();
    m.onResize = () => ccFit(); addEventListener('resize', m.onResize); ccFit();
    el.addEventListener('click', e => { if (ccM && !ccM.loading && !ccM.intro) ccClick(e); });
    el.addEventListener('mouseover', e => { if (!ccM) return; const t = e.target.closest('[data-peek]'), k = t ? t.dataset.peek : null; if (ccM.peekHover !== k) { ccM.peekHover = k; ccPeekRender(); } });
    el.addEventListener('mousemove', e => { if (ccM) ccTilt(e); });
    el.addEventListener('mouseleave', () => { if (ccM) { ccM.peekHover = null; ccPeekRender(); } });
    m.onKey = e => { if (e.key === 'Escape' && ccM && !ccM.loading && !document.querySelector('.modal-back')) { if (ccM.sel) { ccM.sel = null; ccRender(); } } };
    addEventListener('keydown', m.onKey);
    set(.15); await tick();
    ccDefs(); set(.3); await tick();
    ccRender(); set(.6); await tick();
    ccFxStart(el); set(.75); await tick();
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    set(1);
  } });
}
function ccStop() { if (!ccM) return; clearTimeout(ccM.timer); clearTimeout(ccM.autoT); ccFxStop(); removeEventListener('resize', ccM.onResize); removeEventListener('keydown', ccM.onKey); if (ccM.el) ccM.el.remove(); ccM = null; }
function ccFit() { if (!ccM) return; const s = Math.min(innerWidth / 1600, innerHeight / 900); ccM.el.style.setProperty('--s', s); }
const ccFx0 = () => { if (ccM) ccM.G.fx = []; };
const ccMyTurn = () => ccM && ccM.G.phase !== 'over' && ccM.G.active === 0 && !ccM.busy;

/* which taps are legal for the current selection: a map of target keys → action */
function ccTargets() {
  const G = ccM.G, sel = ccM.sel, out = new Map();
  if (!sel || !ccMyTurn() || G.phase !== 'main') return out;
  const L = ccLegal(G);
  if (sel.kind === 'hand') {
    const c = G.players[0].hand.find(x => x.iid === sel.iid); if (!c) return out;
    const T = CC_SPELL_T[c.id];
    for (const a of L.filter(a => a.iid === sel.iid)) {
      if (a.k === 'summon') out.set(`s0${a.lane}${a.row}`, a);
      else if (a.k === 'trap') out.set(`t0${a.lane}`, a);
      else if (a.k === 'equip') out.set(`u${a.u}`, a);
      else if (a.k === 'spell') {
        const t = a.t;
        if (T === 'two') { if (!sel.first) { out.set(`u${t.u}`, { pick: t.u }); out.set(`u${t.u2}`, { pick: t.u2 }); } else if (t.u === sel.first || t.u2 === sel.first) { const o = t.u === sel.first ? t.u2 : t.u; out.set(`u${o}`, a); } }
        else if (T === 'side') { if (!sel.first) out.set(`u${t.u}`, { pick: t.u }); else if (t.u === sel.first) out.set(`s0${t.lane}${t.row}`, a); }
        else if (t.hero != null) out.set(`h${t.hero}`, a);
        else if (t.u) out.set(`u${t.u}`, a);
        else out.set('cast', a);
      }
    }
  } else if (sel.kind === 'unit') {
    for (const a of L.filter(a => a.u === sel.iid)) { if (a.k === 'move') out.set(`s0${a.lane}${a.row}`, a); if (a.k === 'attack') out.set('attack', a); }
  }
  return out;
}
function ccClick(e) {
  if (!ccM) return;
  const G = ccM.G, t = e.target;
  const dz = t.closest('[data-disc]'); if (dz) return ccDiscardView(+dz.dataset.disc);
  const btn = t.closest('button[id]');
  if (btn) {
    const id = btn.id;
    if (id === 'ccEnd') { if (ccMyTurn() && G.phase === 'main') ccDo({ k: 'end' }); return; }
    if (id === 'ccAuto' || id === 'ccAutoOff') { const sv = ccSave(); sv.auto = id === 'ccAuto' ? !sv.auto : false; persist(); ccM.autoPlan = null; ccM.sel = null; ccRender(); ccAutoSchedule(); if (sv.auto) toast('Auto play on: it plays your turns until you stop it'); return; }
    if (id === 'ccLogB') { ccM.log = !ccM.log; ccRender(); return; }
    if (id === 'ccLeave') return ccLeave();
    if (id === 'ccRules') return ccRules();
    if (id === 'ccCancel') { ccM.sel = null; ccRender(); return; }
    if (id === 'ccAtk' || id === 'ccCast') { const a = ccTargets().get(id === 'ccAtk' ? 'attack' : 'cast'); if (a) ccDo(a); return; }
    if (id === 'ccRematch') { const d = ccM.deck; startClash(d, Math.floor(Math.random() * 1e9)); return; }
    if (id === 'ccBack') { ccStop(); if (!ccdEl) openDeck(); else renderDeck(); return; }
  }
  const ch = t.closest('[data-choice]'); if (ch) { if (G.phase === 'choice' && G.pending.p === 0) ccDo({ k: 'choice', pick: ch.dataset.choice }); return; }
  const tg = ccTargets();
  const hand = t.closest('[data-hand]');
  if (hand) { const iid = hand.dataset.hand; ccM.sel = ccM.sel && ccM.sel.kind === 'hand' && ccM.sel.iid === iid ? null : { kind: 'hand', iid }; ccM.peek = 'h' + iid; if (!ccMyTurn()) ccM.sel = null; ccRender(); return; }
  const key = (() => { const u = t.closest('[data-u]'); if (u) return 'u' + u.dataset.u; const s = t.closest('[data-slot]'); if (s) return 's' + s.dataset.slot; const tr = t.closest('[data-trap]'); if (tr) return 't' + tr.dataset.trap; const h = t.closest('[data-hero]'); if (h) return 'h' + h.dataset.hero; return null; })();
  if (!key) { if (ccM.sel && !t.closest('.ccm-act,.ccm-peek,.ccm-log')) { ccM.sel = null; ccRender(); } return; }
  const a = tg.get(key);
  if (a && a.pick) { ccM.sel.first = a.pick; ccRender(); return; }
  if (a) { ccDo(a); return; }
  if (key[0] === 'u') {
    const u = ccFind(G, key.slice(1)); ccM.peek = 'u' + u.iid;
    ccM.sel = u.owner === 0 && ccMyTurn() && !(ccM.sel && ccM.sel.kind === 'unit' && ccM.sel.iid === u.iid) ? { kind: 'unit', iid: u.iid } : null;
    ccRender(); return;
  }
  if (key[0] === 't' && key[1] === '0') { const c = G.players[0].traps[+key[2]]; if (c) { ccM.peek = 'c' + c.id; ccRender(); return; } }
  if (ccM.sel) { ccM.sel = null; ccRender(); }
}
function ccDo(a, fromAuto) {
  const G = ccM.G, snap = ccSnap(a);
  if (!fromAuto) ccM.autoPlan = null;
  const err = ccApply(G, a);
  if (err) { toast(err); return false; }
  ccM.sel = null;
  const hit = G.fx.filter(f => f.id === 'hero1' && f.type === 'dmg').reduce((t, f) => t + f.n, 0);
  if (G.active === 1 || G.phase === 'over') ccM.busy = true;
  ccRender(snap);
  if (hit > CC_SLASH_MIN) { const m = ccM; setTimeout(() => { if (ccM === m) ccSlash(hit); }, ccM.impact || 0); }
  ccAfter(true);
  return true;
}
/* after every action: the end screen, the bot's next move (waiting for the animations), or back to you */
function ccAfter(rendered) {
  if (!ccM || ccM.loading) return;
  const G = ccM.G, wait = Math.max(0, (ccM.animEnd || 0) - performance.now());
  if (G.phase === 'over') {
    ccM.busy = true; ccRender();
    const m = ccM;
    setTimeout(() => { if (ccM !== m) return; [0, 1].forEach(p => { if (G.players[p].hp <= 0) { const h = ccM.el.querySelector(`.ccm-hero[data-hero="${p}"]`); if (h) h.classList.add('fx-shatter'); } }); }, Math.max(0, wait - 300));
    ccM.timer = setTimeout(ccEndScreen, Math.max(1300, wait + 900)); return;
  }
  if (G.active === 1) {
    ccM.busy = true; ccRenderTurn();
    ccM.timer = setTimeout(() => ccBotStep(G), G.phase === 'choice' ? 500 : Math.max(650, wait + 200));
    return;
  }
  ccM.busy = false; if (!rendered) ccRender();
  ccAutoSchedule();
}
/* auto play (48-clash-auto.js plans the turn): one action at a time, waiting for each animation */
function ccAutoSchedule() {
  if (!ccM || !ccSave().auto || ccM.loading || ccM.intro) return;
  const G = ccM.G; if (G.phase === 'over' || G.active !== 0 || ccM.busy) return;
  clearTimeout(ccM.autoT);
  ccM.autoT = setTimeout(ccAutoStep, Math.max(420, (ccM.animEnd || 0) - performance.now() + 260));
}
async function ccAutoStep() {
  const m = ccM; if (!m || !ccSave().auto || m.autoBusy) return;
  const G = m.G; if (G.phase === 'over' || G.active !== 0 || m.busy || m.loading || m.intro) return;
  const legal = a => a && (a.k === 'end' ? G.phase === 'main' : !ccApply(ccClone(G), a));
  if (!m.autoPlan || !legal(m.autoPlan[0])) {
    m.autoBusy = true; m.autoThinking = true; ccActRender(ccTargets(), null);
    const plan = await ccAutoPlanAsync(G, CC_AUTO, () => ccM === m && ccSave().auto);
    m.autoBusy = false; m.autoThinking = false;
    if (ccM !== m || !ccSave().auto) return;
    m.autoPlan = plan && plan.length && legal(plan[0]) ? plan : [{ k: G.phase === 'choice' ? 'choice' : 'end', pick: G.phase === 'choice' ? G.pending.opts[0] : undefined }];
  }
  const a = m.autoPlan[0]; m.autoPlan = m.autoPlan.slice(1); m.sel = null;
  if (G.active !== 0 || m.busy) return;
  ccDo(a, true);
}
/* one bot move: cards it plays are shown first (ccReveal), then applied and animated like yours */
function ccBotStep(G) {
  if (!ccM || ccM.G !== G) return;
  let a = ccBotPick(G);
  const go = src => {
    if (!ccM || ccM.G !== G) return;
    const snap = ccSnap(a, src);
    if (ccApply(G, a)) { a = { k: 'end' }; snap.a = a; ccApply(G, a); }
    if (G.active === 0 && G.phase !== 'over') ccM.busy = false;
    ccRender(snap); ccAfter(true);
  };
  if (a && (a.k === 'summon' || a.k === 'spell' || a.k === 'equip' || a.k === 'trap')) ccReveal(a, go); else go(null);
}

/* big hit: when one of your actions deals more than 2 damage to the enemy hero, a diagonal slice slashes in from your side
   with the splash art of the character on your profile picture */
const CC_SLASH_MIN = 2;
function ccSlash(n) {
  if (!ccM) return;
  const stage = ccM.el.querySelector('.ccm-stage'); stage.querySelectorAll('.ccsl').forEach(x => x.remove());
  const le = ccM.leader, lart = le && mediaArt(le), w = lart ? null : avatarEntry() || wallpaperInfo(), art = !!lart || (!!w && wpHasArt(w));
  const src = lart || (w ? wpSrc(w) : portrait(S.player.look, 4)), name = le ? le.name : w ? w.e.name : (S.player.name || 'You');
  const el = document.createElement('div'); el.className = 'ccsl';
  el.innerHTML = `<i class="ccsl-flash"></i><div class="ccsl-move"><div class="ccsl-panel"><img src="${src}" alt="" class="${art ? '' : 'chibi'}"><i class="ccsl-lines"></i><i class="ccsl-shade"></i></div>
    <div class="ccsl-edgew"><i class="ccsl-edge"></i></div><div class="ccsl-txt"><small>${esc(name)}</small><b>\u2212${n}</b><em>${n >= 5 ? 'Crushing blow' : 'Direct hit'}</em></div></div>`;
  stage.appendChild(el);
  const ui = ccM.el.querySelector('.ccm-ui'); ui.classList.remove('ccsl-shake'); void ui.offsetWidth; ui.classList.add('ccsl-shake');
  setTimeout(() => { el.remove(); ui.classList.remove('ccsl-shake'); }, 1900);
}

/* ---- drawing ---- */
function ccUnitHTML(G, u, keyset) {
  const d = ccDef(u.id), atk = ccAtk(G, u), max = ccMaxHp(u), sel = ccM.sel;
  const can = u.owner === 0 && ccMyTurn() && G.players[0].ap >= 1 && ccCanAttack(G, u);
  const st = [];
  if (ccArm(u)) st.push(`<i class="s-arm" title="Armor 1">${CC_SHIELD}</i>`);
  if (u.poison) st.push(`<i class="s-poi" title="Poison: ${u.poison} more tick${u.poison > 1 ? 's' : ''}">${u.poison}</i>`);
  if (u.stunNow || u.stunNext) st.push(`<i class="s-stun" title="Stunned: can’t attack ${u.stunNow ? 'this turn' : 'next turn'}">Z</i>`);
  if (u.eq) st.push(`<i class="s-eq" title="${esc(ccDef(u.eq.id).name)}: ${esc(ccDef(u.eq.id).text)}" style="--cs:${CC_STYLES[ccDef(u.eq.id).style][1]}">${ccIco(u.eq.id)}</i>`);
  if (CC_HASTE.has(u.id)) st.push('<i class="s-kw" title="Haste">H</i>');
  if (CC_FREEMOVE.has(u.id)) st.push('<i class="s-kw" title="Free Move">F</i>');
  if (CC_FLANK.has(u.id)) st.push('<i class="s-kw" title="Flank">K</i>');
  const sick = u.owner === G.active && u.summoned === G.turnNo && !ccCanAttack(G, u) && !u.attacked;
  const cls = [ccM.sel && sel.kind === 'unit' && sel.iid === u.iid ? 'sel' : '', can ? 'ready' : '', u.attacked && u.owner === G.active ? 'spent' : '', keyset.has('u' + u.iid) ? 'tgt' : '', sel && sel.first === u.iid ? 'sel' : '', sick ? 'sick' : '', u.row === 1 && d.range !== 'ranged' ? 'idle' : ''].join(' ');
  return `<div class="ccu st-${d.style} ${cls}" data-u="${u.iid}" data-peek="u${u.iid}" style="--cs:${CC_STYLES[d.style][1]}${ccM.hide && ccM.hide.has(u.iid) ? ';visibility:hidden' : ''}">
    <div class="ccu-fr"><div class="ccu-art"><i class="ccc-rays"></i>${ccIco(d.id, 'cce')}<i class="ccc-vig"></i></div><b class="ccu-name">${esc(d.name)}</b></div>
    <div class="ccu-st">${st.join('')}</div>${d.range === 'ranged' ? `<span class="ccu-rng" title="Ranged">${ccIco('MOB-U04')}</span>` : ''}
    <span class="ccu-atk ${atk > d.atk ? 'up' : atk < d.atk ? 'down' : ''}"><b>${atk}</b></span><span class="ccu-hp ${u.hp < max ? 'hurt' : max > d.hp ? 'up' : ''}"><b>${u.hp}</b></span></div>`;
}
const CC_SHIELD = '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/></svg>';
function ccHalfHTML(G, p, keyset) {
  const P = G.players[p], rows = p === 1 ? [1, 0] : [0, 1];
  const slot = (l, r) => { const u = P.board[l][r], k = `${p}${l}${r}`; return `<div class="cc-slot ${r === 0 ? 'front' : 'back'} ${keyset.has('s' + k) ? 'tgt' : ''}" data-slot="${k}">${u ? ccUnitHTML(G, u, keyset) : `<i class="cc-slot-rune"></i><span class="cc-slot-l">${r === 0 ? 'Front' : 'Back'}</span>`}</div>`; };
  const traps = `<div class="cc-traps">${[0, 1, 2].map(l => { const c = P.traps[l], k = `${p}${l}`; return `<div class="cc-trap ${c ? 'set' : ''} ${keyset.has('t' + k) ? 'tgt' : ''}" data-trap="${k}" ${c && p === 0 ? `data-peek="c${c.id}"` : ''} title="${c ? (p === 0 ? esc(ccDef(c.id).name + ': ' + ccDef(c.id).text) : 'A face-down trap') : `${CC_LANES[l]} lane trap slot`}">${c ? (p === 0 ? `<span class="cc-trap-c st-${ccDef(c.id).style}">${ccIco(c.id, 'cce')}<b>${esc(ccDef(c.id).name)}</b></span>` : '<span class="cc-trap-c back"></span>') : '<i class="cc-trap-rune"></i>'}</div>`; }).join('')}</div>`;
  const rowsHTML = `<div class="cc-rows">${rows.map(r => `<div class="cc-row ${r === 0 ? 'front' : 'back'}">${[0, 1, 2].map(l => slot(l, r)).join('')}</div>`).join('')}</div>`;
  // each half is its own piece: data-bs is the board skin its player equipped (50-clash-skins.js, styles in clash.css)
  const bs = ccHalfSkin(p);
  return `<div class="cc-half ${p === 0 ? 'me' : 'op'}" data-bs="${bs}">${ccSkinDeco(bs)}<div class="cc-field"><i class="cc-crest">${ccSkinCrest(bs, p)}</i><i class="cc-lanediv l1"></i><i class="cc-lanediv l2"></i></div><i class="cc-runes"></i><i class="cc-sheen"></i>${p === 1 ? traps + rowsHTML : rowsHTML + traps}</div>`;
}
/* the bot's portrait: the random character it plays as (else a hooded figure) */
const ccFoeAva = () => ccM && ccM.foe ? `<span class="ccm-foe">${baseThumb(ccM.foe)}</span>` : `<span class="ccm-bot">${ccIco('bot')}</span>`;
function ccRender(snap) {
  if (!ccM) return;
  const G = ccM.G, me = G.players[0], op = G.players[1], keyset = ccTargets(), my = ccMyTurn();
  const ui = ccM.el.querySelector('.ccm-ui');
  const ap = (P, p) => { const max = Math.max(P.ap, ccApBase(G, p)); return `<div class="ccb-ap ${p ? 'op' : 'me'}" title="${p ? 'Bot' : 'Your'} AP"><b>${P.ap}</b><span>${Array.from({ length: max }, (_, i) => `<i class="${i < P.ap ? 'on' : ''}"></i>`).join('')}</span></div>`; };
  const hero = p => { const P = G.players[p]; return `<div class="ccm-hero ${p ? 'op' : 'me'} ${keyset.has('h' + p) ? 'tgt' : ''} ${G.active === p ? 'act' : ''}" data-hero="${p}">
      <span class="ccm-ava">${p === 0 ? avatarHTML(58) : ccFoeAva()}</span>
      <span class="ccm-nm">${esc(G.names[p])}<small>${p === 0 ? esc(ccM.deck.name) : 'Bot · mirror'}</small></span>
      <span class="ccm-gem ${p ? 'red' : 'blue'}"><b>${Math.max(0, P.hp)}</b></span></div>`; };
  const sel = ccM.sel, selCard = sel && sel.kind === 'hand' ? me.hand.find(c => c.iid === sel.iid) : null;
  const legal = my && G.phase === 'main' ? ccLegal(G) : [];
  const n = me.hand.length, handHTML = me.hand.map((c, i) => { const d = ccDef(c.id), playable = d.ap <= me.ap && legal.some(a => a.iid === c.iid), mid = (n - 1) / 2, rot = (i - mid) * 3.2, dy = Math.pow(Math.abs(i - mid), 1.6) * 4;
    return `<button class="ccm-hc ${playable ? 'ok' : ''} ${sel && sel.iid === c.iid ? 'sel' : ''}" data-hand="${c.iid}" data-peek="h${c.iid}" style="--r:${rot}deg;--y:${dy}px;--i:${i}"><span class="ccm-hci">${ccCardHTML(c.id, { tip: false })}</span></button>`; }).join('');
  const ot = G.round >= ccOT(G);
  ui.innerHTML = `
    <div class="ccm-tools"><button class="ccm-auto ${ccSave().auto ? 'on' : ''}" id="ccAuto" title="Auto play: plays your turns for you">${icon('bolt')}<b>Auto</b><i>${ccSave().auto ? 'On' : 'Off'}</i></button><button class="ccm-tb" id="ccRules" title="How to play">?</button><button class="ccm-tb ${ccM.log ? 'on' : ''}" id="ccLogB" title="Match log">${icon('quests')}</button><button class="ccm-tb" id="ccLeave" title="Leave the match">${icon('close')}</button></div>
    <div class="ccm-ophand" title="Cards in the bot's hand">${op.hand.map((_, i) => `<span class="ccm-back" style="--r:${(i - (op.hand.length - 1) / 2) * -5}deg">${ccBackHTML('', ccBackSkin(1))}</span>`).join('')}<small>${op.hand.length}</small></div>
    ${hero(1)}${hero(0)}
    ${ccM.foe ? `<div class="ccm-lead op" title="${esc(ccM.foe.name + ': the bot\'s leader')}">${ccLeaderCard(ccM.foe, true, ccM.seed)}<span class="ccl-tag">Leader</span></div>` : ''}
    ${ccM.leader ? `<div class="ccm-lead me" title="${esc(ccM.leader.name + ': your leader (no skill yet)')}">${ccLeaderCard(ccM.leader)}<span class="ccl-tag">Leader</span></div>` : ''}
    ${ccEventChip(G)}
    <div class="ccb ${G.active === 1 ? 'turn-op' : ''}">
      <i class="ccb-rim"><i class="ccb-stud t"></i><i class="ccb-stud b"></i><i class="ccb-stud l"></i><i class="ccb-stud r"></i></i>
      <span class="ccb-torch tl"></span><span class="ccb-torch tr"></span><span class="ccb-torch bl"></span><span class="ccb-torch br"></span>
      ${ccHalfHTML(G, 1, keyset)}
      <div class="ccb-line"><span class="ccb-flow"></span><i class="ccb-gem l0"></i><i class="ccb-gem l1"></i><i class="ccb-gem l2"></i>
        <div class="ccb-crest ${ot ? 'ot' : ''}" title="${ot ? 'Overtime: every unit loses 1 HP at the start of its owner’s turn' : `Overtime starts in round ${ccOT(G)}`}"><small>${ot ? 'Overtime' : 'Round'}</small><b>${G.round}</b><small>of ${CC_CFG.rounds}</small></div>
        <div class="ccb-orbwrap">${ap(op, 1)}<div id="ccOrb"></div>${ap(me, 0)}</div>
      </div>
      ${ccHalfHTML(G, 0, keyset)}
    </div>
    ${ccSideHTML(G, 1)}${ccSideHTML(G, 0)}
    <div class="ccm-hand">${handHTML}</div>
    <div class="ccm-peek"></div>
    <div class="ccm-act"></div>
    ${ccM.log ? `<div class="ccm-log"><b>Match log</b><ol>${G.log.slice(-40).reverse().map(l => `<li class="k-${l.k} p${l.p}">${esc(l.t)}</li>`).join('')}</ol></div>` : ''}
    ${G.phase === 'choice' && G.pending.p === 0 ? `<div class="ccm-choice"><b>Seer: keep one card</b><p>The other goes back on top of your deck.</p><div>${G.pending.opts.map(o => { const c = me.deck.find(x => x.iid === o); return `<button class="ccm-ch" data-choice="${o}">${ccCardHTML(c.id, { tip: false })}</button>`; }).join('')}</div></div>` : ''}`;
  ui.style.setProperty('--ccT', (performance.now() / 1000).toFixed(2) + 's');   // looping board animations continue across redraws
  ccSkAttach();
  ccM.el.classList.toggle('aiming', !!selCard && my); ccRenderTurn(); ccPeekRender(); ccActRender(keyset, selCard);
  if (snap) ccM.animEnd = performance.now() + ccAnim(snap);
}
/* End Turn is the glowing orb at the right end of the battle line */
function ccRenderTurn() {
  if (!ccM) return; const d = ccM.el.querySelector('#ccOrb'); if (!d) return;
  const G = ccM.G, my = ccMyTurn(), can = my && G.phase === 'main';
  const idle = can && !ccLegal(G).some(a => a.k === 'summon' || a.k === 'spell' || a.k === 'trap' || a.k === 'equip' || a.k === 'attack');
  d.innerHTML = G.phase === 'over' ? '<button class="ccb-orb done" disabled><b>Match<br>over</b></button>'
    : G.active === 0 ? `<button class="ccb-orb ${idle ? 'hint' : ''}" id="ccEnd" ${can ? '' : 'disabled'} title="End your turn"><b>End<br>turn</b></button>`
    : '<button class="ccb-orb op" disabled><b>Enemy<br>turn</b><small class="ccm-think"><i></i><i></i><i></i></small></button>';
}
function ccPeekRender() {
  if (!ccM) return; const box = ccM.el.querySelector('.ccm-peek'); if (!box) return;
  const G = ccM.G, k = ccM.peekHover || ccM.peek;
  let html = '';
  if (k) {
    const kind = k[0], id = k.slice(1);
    if (kind === 'h') { const c = G.players[0].hand.find(x => x.iid === id); if (c) html = ccCardHTML(c.id, { tip: false }); }
    else if (kind === 'c') html = ccCardHTML(id, { tip: false });
    else if (kind === 'u') { const u = ccFind(G, id); if (u) { const d = ccDef(u.id); html = ccCardHTML(u.id, { tip: false }) + `<div class="ccm-pk-st"><span>ATK <b>${ccAtk(G, u)}</b>${ccAtk(G, u) !== d.atk ? ` <s>${d.atk}</s>` : ''}</span><span>HP <b>${u.hp}/${ccMaxHp(u)}</b></span>${ccArm(u) ? '<span>Armor 1</span>' : ''}${u.poison ? `<span>Poison ×${u.poison}</span>` : ''}${u.stunNow ? '<span>Stunned now</span>' : u.stunNext ? '<span>Stunned next turn</span>' : ''}${u.eq ? `<span>Equip: ${esc(ccDef(u.eq.id).name)}</span>` : ''}</div>`; } }
  }
  box.innerHTML = html; box.classList.toggle('on', !!html);
}
function ccActRender(keyset, selCard) {
  const box = ccM.el.querySelector('.ccm-act'); if (!box) return;
  const G = ccM.G, sel = ccM.sel;
  let html = '';
  if (G.phase === 'over') html = '';
  else if (ccSave().auto) html = `<p><b>Auto play is on</b><br>${ccM.autoThinking ? 'Planning the turn…' : G.active === 0 ? 'Playing your turn…' : 'Waiting for the bot…'}</p><div><button class="btn ghost" id="ccAutoOff">Stop auto play</button></div>`;
  else if (!ccMyTurn()) html = `<p>${G.active === 1 ? 'The bot is playing…' : ''}</p>`;
  else if (!sel) html = `<p>Tap a card in your hand to play it, or one of your units to attack or move.</p>`;
  else if (selCard) {
    const d = ccDef(selCard.id), T = CC_SPELL_T[selCard.id];
    const hint = d.ap > G.players[0].ap ? `Not enough AP (needs ${d.ap}).` : !keyset.size ? 'No legal target right now.'
      : d.type === 'unit' ? `Pick an empty ${d.range === 'ranged' ? 'Front or Back' : 'Front'} slot.` : d.type === 'trap' ? 'Pick one of your lane trap slots.' : d.type === 'equipment' ? `Pick one of your units${selCard.id === 'CON-E01' ? ' (Ranged)' : ''} without equipment.`
      : keyset.has('cast') ? 'Ready to cast.' : T === 'two' ? (sel.first ? 'Pick the second unit to swap with.' : 'Pick the first of two units to swap.') : T === 'side' ? (sel.first ? 'Pick where it moves.' : 'Pick one of your units to move.') : T === 'healAny' ? 'Pick a damaged unit of yours, or your hero.' : T === 'hero' ? 'Tap your hero.' : 'Pick a highlighted target.';
    html = `<p><b>${esc(d.name)}</b> · ${d.ap} AP<br>${hint}</p><div>${keyset.has('cast') ? `<button class="btn gold" id="ccCast">Cast ${esc(d.name)}</button>` : ''}<button class="btn ghost" id="ccCancel">Cancel</button></div>`;
  } else if (sel.kind === 'unit') {
    const u = ccFind(G, sel.iid), d = ccDef(u.id), atk = keyset.get('attack'), moves = [...keyset.keys()].filter(k => k[0] === 's').length;
    let why = '';
    if (!atk) why = u.attacked ? 'Already attacked this turn.' : u.stunNow ? 'Stunned this turn.' : u.row === 1 && d.range !== 'ranged' ? 'Melee units can’t attack from the Back row.' : u.summoned === G.turnNo ? 'Just summoned: it can attack next turn.' : G.players[0].ap < 1 ? 'No AP left.' : '';
    const pv = atk ? ccPreview(G, u.iid) : null;
    html = `<p><b>${esc(d.name)}</b>${pv ? `<br>${pv}` : why ? `<br>${why}` : ''}${moves ? `<br><span class="tiny">Move: tap a glowing slot (${ccMoveCost(u, G) ? '1 AP' : 'free'})</span>` : u.moveUsed ? '<br><span class="tiny">Already moved this turn.</span>' : ''}</p>
      <div>${atk ? `<button class="btn gold" id="ccAtk">Attack · 1 AP</button>` : ''}<button class="btn ghost" id="ccCancel">Cancel</button></div>`;
  }
  box.innerHTML = html; box.classList.toggle('on', !!html);
}
/* attack preview on a copy of the match without the enemy's hidden traps */
function ccPreview(G, iid) {
  const g = ccRedact(G, 0), u = ccFind(g, iid), L = g.players[1].board[u.lane], tgt = CC_FLANK.has(u.id) ? (L[1] || L[0]) : (L[0] || L[1]);
  ccApply(g, { k: 'attack', u: iid });
  const sum = (id, type) => g.fx.filter(f => f.id === id && f.type === type).reduce((s, f) => s + f.n, 0);
  const warn = G.players[1].traps[u.lane] ? '<br><span class="ccm-warn">A face-down trap guards this lane.</span>' : '';
  if (!tgt) return `Hits <b>${esc(G.names[1])}</b> directly for <b>${sum('hero1', 'dmg')}</b>.${warn}`;
  const dealt = sum(tgt.iid, 'dmg'), kill = g.fx.some(f => f.id === tgt.iid && f.type === 'die'), back = sum(iid, 'dmg'), dies = g.fx.some(f => f.id === iid && f.type === 'die'), over = sum('hero1', 'dmg');
  return `Hits <b>${esc(ccDef(tgt.id).name)}</b> for <b>${dealt}</b>${kill ? ' (destroys it)' : ''}. Takes <b>${back}</b> back${dies ? ' (dies)' : ''}.${over ? ` Overflow <b>${over}</b> to the hero.` : ''}${warn}`;
}
/* end of the match: the losing hero's gem shatters, then a golden victory or a red defeat animation with the results */
function ccEndScreen() {
  if (!ccM) return;
  const G = ccM.G, sv = ccSave();
  if (!ccM.done) { ccM.done = true; if (G.winner === 0) sv.stats.w++; else if (G.winner === 1) sv.stats.l++; else sv.stats.d++; ccM.rewards = ccGrantRewards(G.winner); persist(); renderMenu(); }
  const res = G.winner === 0 ? ['Victory', 'win'] : G.winner === 1 ? ['Defeat', 'lose'] : ['Draw', 'draw'];
  const ms = Date.now() - G.started, mm = Math.floor(ms / 60000), ss = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  const crack = res[1] === 'lose' ? `<svg class="ccf-crack" viewBox="0 0 1600 900" preserveAspectRatio="none">${Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 6.283 + .3; let x = 800, y = 450, d = `M${x} ${y}`; for (let k = 0; k < 7; k++) { x += Math.cos(a + Math.sin(k * 2.1 + i) * .5) * (60 + k * 22); y += Math.sin(a + Math.cos(k * 1.7 + i) * .5) * (40 + k * 14); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; } return `<path d="${d}" style="--d:${i * .05}s"/>`; }).join('')}</svg>` : '';
  const box = document.createElement('div'); box.className = `ccm-end ccf ${res[1]}`;
  box.innerHTML = `<canvas class="ccf-c" width="1600" height="900"></canvas><div class="ccf-rays"></div>${crack}<div class="ccf-flash"></div>
    <div class="ccf-mid"><div class="ccf-emblem"><svg viewBox="0 0 24 24"><path d="${res[1] === 'win' ? 'M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10zm0 2h14v2H5z' : res[1] === 'lose' ? 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zm-1.2 4l1.4 4.2-2.6 1.6 3.4 6.2-.8-4.8 2.4-1.4L13 6z' : CC_GLYPH.defense}"/></svg></div>
      <h1 class="ccf-t" data-t="${res[0]}">${res[0]}</h1>
      <div class="ccm-endbox"><p>${esc(G.reason)}</p>
      ${ccRewardsHTML(ccM.rewards)}
      <div class="ccm-endst"><span>Rounds<b>${Math.min(G.round, CC_CFG.rounds)}</b></span><span>Turns<b>${G.turnNo}</b></span><span>Time<b>${mm}:${ss}</b></span><span>Your HP<b>${Math.max(0, G.players[0].hp)}</b></span></div>
      <p class="tiny">Deck: ${esc(ccM.deck.name)} (mirror) · seed ${G.seed} · record ${sv.stats.w} W · ${sv.stats.l} L · ${sv.stats.d} D</p>
      <div class="ccm-endb"><button class="btn gold" id="ccRematch">Rematch</button><button class="btn ghost" id="ccBack">Back to Deck</button></div></div></div>`;
  ccM.el.querySelector('.ccm-stage').appendChild(box);
  if (res[1] === 'lose') ccM.el.querySelector('.ccm-ui').classList.add('ccf-shake');
  // particles: gold sparks rising and bursting for a win, red embers and ash drifting for a loss
  const cv = box.querySelector('.ccf-c'), g = cv.getContext('2d'), win = res[1] === 'win', draw = res[1] === 'draw', P = [];
  const add = (burst) => { const a = Math.random() * 6.283, sp = burst ? 3 + Math.random() * 9 : 0; P.push(win || draw
    ? { x: burst ? 800 : Math.random() * 1600, y: burst ? 330 : 920, vx: burst ? Math.cos(a) * sp : (Math.random() - .5) * 1.2, vy: burst ? Math.sin(a) * sp - 2 : -2 - Math.random() * 4, r: 1.5 + Math.random() * 3.5, life: 1, dec: .006 + Math.random() * .01, hue: draw ? 220 : 38 + Math.random() * 18, star: Math.random() < .3 }
    : { x: Math.random() * 1600, y: -20 + Math.random() * 300, vx: (Math.random() - .5) * 1.5, vy: .6 + Math.random() * 2.2, r: 1.5 + Math.random() * 3.5, life: 1, dec: .004 + Math.random() * .006, hue: Math.random() * 20, star: false }); };
  // light on purpose: the board underneath is frozen (.ccm.ended, its particle loop stopped), particles are capped and
  // drawn as two plain circles (no canvas shadowBlur, which made this screen lag)
  ccFxStop(); ccM.el.classList.add('ended');
  for (let i = 0; i < (win ? 110 : 30); i++) add(win);
  let t0 = performance.now();
  const loop = now => {
    if (!box.isConnected) return;
    const t = now - t0; g.clearRect(0, 0, 1600, 900); g.globalCompositeOperation = 'lighter';
    if (t < 7000 && P.length < 200) for (let i = 0; i < (win ? 3 : 2); i++) add(false);
    if (win && t > 900 && t < 1000 && !box._b2) { box._b2 = 1; for (let i = 0; i < 80; i++) add(true); }
    if (t > 7000 && !P.length) return;   // everything has settled: stop drawing
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.x += p.vx; p.y += p.vy; p.life -= p.dec;
      if (win || draw) { p.vy += .04; p.vx *= .99; } else { p.vx += Math.sin((p.y + i) / 40) * .03; }
      if (p.life <= 0 || p.y > 940 || p.y < -60) { P.splice(i, 1); continue; }
      const a = Math.min(1, p.life * 1.4), L = win || draw ? 62 : 50;
      g.fillStyle = `hsla(${p.hue},100%,${L}%,${(a * .22).toFixed(3)})`; g.beginPath(); g.arc(p.x, p.y, p.r * 3.2, 0, 7); g.fill();   // the glow
      g.fillStyle = `hsla(${p.hue},100%,${L + 8}%,${a.toFixed(3)})`;
      if (p.star) { g.save(); g.translate(p.x, p.y); g.rotate(t / 400 + i); g.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? p.r * .6 : p.r * 2.4; g.lineTo(Math.cos(k * .785) * rr, Math.sin(k * .785) * rr); } g.fill(); g.restore(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
function ccLeave() {
  if (!ccM) return;
  if (ccM.G.phase === 'over') { ccStop(); if (!ccdEl) openDeck(); return; }
  openModal({ title: 'Leave the match?', ic: 'close', small: true, kind: 'ccleave', body: `<p>Leaving now counts as a loss.</p><div class="row" style="gap:10px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close2>Keep playing</button><button class="btn gold" id="ccLeaveGo">Leave</button></div>`,
    onMount: b => { b.querySelector('[data-close2]').onclick = closeModal; b.querySelector('#ccLeaveGo').onclick = () => { const sv = ccSave(); sv.stats.l++; persist(); closeModal(); ccStop(); if (!ccdEl) openDeck(); else renderDeck(); }; } });
}
