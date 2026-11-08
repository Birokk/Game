/* ---------- Card Clash card backs (skins) and the side boards (deck + discard piles) ----------
   Card backs: every player's cards show their equipped back (S.cc.backs = [owned ids], S.cc.back = equipped) wherever a card
   is face down: the bot's hand and its face-down traps in flight use the bot's back, each side board's deck pile uses its
   owner's. Bought in Shop → Card Clash → Card Backs for CC_BACK_PRICE pearls, equipped there or in the Skins window (Deck
   screen / Quick match). The bot plays with a random bought back (from the seed). Looks: clash.css "Card backs".
   Side boards: beside each half of the table a tray holds that player's draw deck (a stack of backs that gets thinner as it
   empties) and discard pile (the last card face up, the rest under it); tapping a discard pile lists it (ccDiscardView). */
const CC_BACK_PRICE = 40;
const CC_BACKS = [
  { id: 'default', name: 'Arcane Crystal', sub: 'Indigo with a gold rim and the crystal. Everyone has it.' },
  { id: 'forest', name: 'Grove Weave', sub: 'Woven moss and bronze, with the old tree of the grove.' },
  { id: 'sakura', name: 'Blossom Silk', sub: 'Plum silk and rose gold, a sakura flower in bloom.' },
  { id: 'inferno', name: 'Ember Seal', sub: 'Charred iron with glowing seams and a living flame.' },
  { id: 'cyber', name: 'Neon Circuit', sub: 'A navy circuit board lit by a neon chip.' },
  { id: 'celestial', name: 'Moonlit Sky', sub: 'A night full of stars, silver trim and a crescent moon.' },
  { id: 'royal', name: 'Crimson Crown', sub: 'Crimson velvet, a filigree gold frame and a crown.' }
];
const CC_BACK_BUY = CC_BACKS.filter(b => b.id !== 'default');
const ccBackOf = id => CC_BACKS.find(b => b.id === id) || CC_BACKS[0];
const ccBackOwned = id => id === 'default' || (ccSave().backs || []).includes(id);
const ccMyBack = () => { const b = ccSave().back || 'default'; return CC_BACKS.some(k => k.id === b) && ccBackOwned(b) ? b : 'default'; };
const ccBotBack = seed => CC_BACK_BUY[Math.floor((seed >>> 0) / 11) % CC_BACK_BUY.length].id;
const ccBackSkin = p => ccM && ccM.backs ? ccM.backs[p] : 'default';
/* each back's emblem (100×100); the board-skin ones reuse those emblems */
const CC_BACK_EM = {
  celestial: "<path d='M60 12a38 38 0 1 0 26 64a31 31 0 1 1-26-64z'/><path d='M24 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM80 70l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z'/>",
  royal: "<path d='M14 70l-5-40 23 17 18-31 18 31 23-17-5 40z'/><rect x='14' y='74' width='72' height='11' rx='3'/><circle cx='50' cy='16' r='5'/><circle cx='9' cy='30' r='4'/><circle cx='91' cy='30' r='4'/>"
};
const ccBackEm = skin => skin === 'default' || !skin ? ccIco('crystal', 'ccbk-em')
  : `<svg class="ccbk-em ccsk-ic" viewBox="0 0 100 100" aria-hidden="true">${CC_BACK_EM[skin] || CC_SKIN_ICO[skin] || ''}</svg>`;

/* ---- buy / equip ---- */
function ccEquipBack(id) { if (!ccBackOwned(id)) return; ccSave().back = id; persist(); toast(`${ccBackOf(id).name} card back equipped`); }
function ccBuyBack(id, after) {
  const k = ccBackOf(id); if (id === 'default' || ccBackOwned(id)) return;
  openModal({ title: `Buy ${k.name}?`, ic: 'shop', small: true, kind: 'ccskbuy', body: `<div class="stack" style="text-align:center">
    <div class="ccbk-prev big">${ccBackFan(id)}</div>
    <p class="desc">A card back for Card Clash: your draw deck and every face-down card of yours wears it.</p>
    <span class="tiny">You have ${fmt(S.wallet.pearls)} pearls.</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="cbNo">Cancel</button><button class="btn gold" id="cbYes">Buy · ${costHTML(CC_BACK_PRICE)}</button></div></div>`,
    onMount: b => { b.querySelector('#cbNo').onclick = () => { closeModal(); if (after) after(); };
      b.querySelector('#cbYes').onclick = () => {
        if (S.wallet.pearls < CC_BACK_PRICE) { closeModal(); toast(`Not enough pearls: ${k.name} costs ${CC_BACK_PRICE}`); return; }
        S.wallet.pearls -= CC_BACK_PRICE; const sv = ccSave(); sv.backs = [...new Set([...(sv.backs || []), id])]; sv.back = id;
        persist(); renderMenu(); closeModal(); toast(`${k.name} bought and equipped`); if (after) after(); }; } });
}
/* three backs fanned out: the preview on shop cards and in the buy window */
const ccBackFan = id => `<span class="ccbk-fan">${[-14, 0, 14].map((r, i) => `<span class="ccbk-f" style="--r:${r}deg;--i:${i}">${ccBackHTML('', id)}</span>`).join('')}</span>`;
function ccBackCard(k) {
  const own = ccBackOwned(k.id), eq = ccMyBack() === k.id;
  return `<div class="ccsk-card ccbk-card ${eq ? 'eq' : ''} ${own ? 'own' : ''}">
    <div class="ccsk-prev ccbk-prev">${ccBackFan(k.id)}${eq ? '<span class="ccsk-tag">Equipped</span>' : own ? '<span class="ccsk-tag own">Owned</span>' : ''}</div>
    <div class="ccsk-info"><span class="ccsk-badge cb-${k.id}"><span class="ccbk-mini">${ccBackHTML('', k.id)}</span></span><span><b>${esc(k.name)}</b><small>${esc(k.sub)}</small></span></div>
    <div class="ccsk-act">${eq ? '<button class="mall-buy" disabled>Equipped</button>' : own ? `<button class="mall-buy ok" data-cbeq="${k.id}">Equip</button>` : `<button class="mall-buy ${S.wallet.pearls >= CC_BACK_PRICE ? 'ok' : ''}" data-cbbuy="${k.id}">${curIcon('pearls')}${CC_BACK_PRICE}</button>`}</div></div>`;
}
const ccBackGrid = () => `<div class="ccsk-grid">${CC_BACKS.map(ccBackCard).join('')}</div>`;
function ccBackBind(root, rerender) {
  root.querySelectorAll('[data-cbeq]').forEach(b => b.onclick = () => { ccEquipBack(b.dataset.cbeq); rerender(); });
  root.querySelectorAll('[data-cbbuy]').forEach(b => b.onclick = () => ccBuyBack(b.dataset.cbbuy, rerender));
}
/* Shop → Card Clash: two pills, Board Skins and Card Backs */
let ccShopSub = 'boards';
const ccShopStrip = () => [['boards', 'Board Skins'], ['backs', 'Card Backs']].map(([k, l]) => `<button class="mall-pill ${k === ccShopSub ? 'on' : ''}" data-ccsub="${k}">${l}</button>`).join('');
const ccBackShopHTML = () => `<p class="tiny">Card backs for Card Clash: your draw deck and every face-down card of yours wears the back you equipped. Every back costs ${CC_BACK_PRICE} pearls; in Quick match the bot uses a random one.</p>${ccBackGrid()}`;

/* ---- the side board (deck + discard) ---- */
const ccMiniCard = (id, w = 84) => ccCardHTML(id, { tip: false }).replace('class="ccc ', `style="--w:${w}px" class="ccc `);
function ccSideHTML(G, p) {
  const P = G.players[p], k = p ? 'op' : 'me', top = P.disc[P.disc.length - 1], cb = ccBackSkin(p), n = P.deck.length;
  const layers = n ? Math.max(1, Math.min(6, Math.ceil(n / 5))) : 0;
  return `<div class="ccm-side ${k}" data-bs="${ccHalfSkin(p)}"><span class="ccm-side-t">${p ? esc(G.names[1]) + '’s side' : 'Your side'}</span>
    <div class="ccp"><div class="ccm-piles ${k} ccp-deck" title="${p ? 'The bot’s' : 'Your'} draw deck: ${n} card${n === 1 ? '' : 's'}">${n ? Array.from({ length: layers }, (_, i) => `<span class="ccp-l" style="--i:${layers - 1 - i}">${ccBackHTML('', cb)}</span>`).join('') : '<span class="ccp-empty">Empty</span>'}</div><small>Deck <b>${n}</b></small></div>
    <div class="ccp"><button class="ccp-disc" data-disc="${p}" title="${p ? 'The bot’s' : 'Your'} discard pile: ${P.disc.length} card${P.disc.length === 1 ? '' : 's'} (tap to see them)">${P.disc.length > 1 ? '<i class="ccp-under"></i>' : ''}${top ? ccMiniCard(top.id) : '<span class="ccp-empty">Empty</span>'}</button><small>Discard <b>${P.disc.length}</b></small></div>
  </div>`;
}
/* tapping a discard pile lists everything in it, newest first */
function ccDiscardView(p) {
  if (!ccM) return; const G = ccM.G, P = G.players[p], list = P.disc.slice().reverse();
  openModal({ title: `${p ? esc(G.names[1]) + '’s' : 'Your'} discard pile`, ic: 'trash', kind: 'ccdisc', body: `<p class="tiny">${list.length} card${list.length === 1 ? '' : 's'}, newest first. When a draw deck runs out, its discard pile is shuffled into a new deck.</p>
    <div class="ccdv-grid">${list.map(c => `<div class="ccdv-c">${ccMiniCard(c.id, 132)}</div>`).join('') || '<p class="tiny">Nothing here yet.</p>'}</div>` });
}
