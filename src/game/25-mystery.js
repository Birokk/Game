/* ---------- Mystery Box: a limited summon event on the Event page ----------
   One box holds 10 prizes and each pull takes one out at random (no repeats), so the premium skin gets likelier with every
   pull and is certain by pull 10. The skin can't come out before pull 4. Pulls cost pearls, rising from 1 to 60 (MB_COST).
   Admin → Events → Mystery Box picks the skin (any existing non-wedding skin) and can start a new box (new id = everyone's
   box refills). Content: S.mystery = { id, skin }. Player save: S.mbox = { box, got: [item keys in pull order] }.
   Title and namecard prizes unlock profile cosmetics for good (S.unlocks). */
const MB_COST = [1, 2, 4, 7, 11, 16, 23, 32, 44, 60];   // pearls for pull 1…10 (200 for the whole box)
const MB_SKIN_FROM = 4;                                 // the skin can only drop from this pull on
const MB_GIFTS = { sweets: 3, bracelet: 2, plush: 1 };
const MB_SKIN_DUP = 40;                                 // Corals instead of a skin you already own
function mboxSkin() {
  const all = S.pool.filter(e => e.type === 'skin' && +e.rarity !== 6);
  return findEntry((S.mystery || {}).skin) || all.find(e => e.rarity === 5) || all[0] || null;
}
/* the ten prizes, rarest first: UR skin, then SSR, then R (blue) */
function MB_ITEMS() {
  const sk = mboxSkin();
  return [
    { k: 'skin', r: 5, name: sk ? sk.name : 'Mystery outfit', sub: 'Premium outfit', pic: sk ? baseThumb(sk) : icon('skins') },
    { k: 'std10', r: 4, name: '10 Standard tickets', sub: '10 pulls on the permanent banner', pic: curIcon('wishes') },
    { k: 'lim5', r: 4, name: '5 Limited tickets', sub: '5 pulls on the limited banners', pic: curIcon('tickets') },
    { k: 'pearls', r: 4, name: '30 pearls', sub: 'Premium currency', pic: curIcon('pearls') },
    { k: 'title', r: 4, name: 'Title: Box Breaker', sub: 'Profile title', pic: icon('trophy') },
    { k: 'card', r: 4, name: 'Namecard: Mystery Night', sub: 'Profile namecard', pic: icon('image') },
    { k: 'bottles', r: 4, name: '2 Stamina bottles', sub: `+${BOTTLE_STAMINA} stamina each`, pic: curIcon('bottles') },
    { k: 'gold', r: 3, name: '20,000 gold', sub: 'Gold coins', pic: curIcon('coins') },
    { k: 'gifts', r: 3, name: 'Gift bundle', sub: `${MB_GIFTS.sweets} Sweets, ${MB_GIFTS.bracelet} Bracelets, ${MB_GIFTS.plush} Plushie`, pic: curIcon('gplush') },
    { k: 'exp', r: 3, name: '500 EXP', sub: 'Player experience', pic: curIcon('exp') }
  ];
}
const mbItem = k => MB_ITEMS().find(x => x.k === k);
function mboxState() {
  const id = (S.mystery || {}).id || 'box-1', s = S.mbox && S.mbox.box === id ? S.mbox : (S.mbox = { box: id, got: [] });
  return s;
}
const mboxLeft = () => MB_COST.length - mboxState().got.length;
/* chance that the next pull is the skin (0 before pull 4, then 1 / prizes left) */
function mboxChance() {
  const got = mboxState().got; if (got.includes('skin') || got.length >= MB_COST.length) return 0;
  return got.length + 1 < MB_SKIN_FROM ? 0 : 1 / (MB_COST.length - got.length);
}
function grantMbox(k) {
  const W = S.wallet; let note = '';
  if (k === 'skin') { const sk = mboxSkin(); if (sk && !owns(sk.id)) S.owned[sk.id] = 1; else { W.starlight = (W.starlight || 0) + MB_SKIN_DUP; note = `You already own it: +${MB_SKIN_DUP} Corals instead.`; } }
  else if (k === 'std10') W.wishes += 10;
  else if (k === 'lim5') W.tickets += 5;
  else if (k === 'pearls') W.pearls += 30;
  else if (k === 'title' || k === 'card') { const id = k === 'title' ? 'mb-title' : 'mb-card'; S.unlocks = S.unlocks || []; if (!S.unlocks.includes(id)) S.unlocks.push(id); }
  else if (k === 'bottles') W.bottles += 2;
  else if (k === 'gold') W.coins += 20000;
  else if (k === 'gifts') Object.entries(MB_GIFTS).forEach(([g, n]) => S.gifts[g] = (S.gifts[g] || 0) + n);
  else if (k === 'exp') gainExp(500);
  return note;
}
function pullMbox() {
  const st = mboxState(), i = st.got.length; if (i >= MB_COST.length) return;
  const cost = MB_COST[i];
  if (S.wallet.pearls < cost) { toast(`This pull costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  const left = MB_ITEMS().map(x => x.k).filter(k => !st.got.includes(k) && (k !== 'skin' || i + 1 >= MB_SKIN_FROM));
  const k = left[Math.floor(Math.random() * left.length)];
  S.wallet.pearls -= cost; st.got.push(k);
  const note = grantMbox(k);
  persist(); renderMenu(); refreshSummon();
  showMboxOpen(mbItem(k), note, () => { renderEvents(); if (k === 'skin' && !note) { const sk = mboxSkin(); if (sk) showSkinGet(sk); } });
}
function mysteryBoard() {
  const st = mboxState(), sk = mboxSkin(), i = st.got.length, done = i >= MB_COST.length, ch = mboxChance();
  const art = sk && baseArt(sk);
  return `<div class="mb">
    <div class="mb-stage">
      <div class="mb-prem r5 ${st.got.includes('skin') ? 'got' : ''}">${art ? `<img src="${art}" alt="">` : sk ? `<img src="${baseSplash(sk)}" alt="" class="chibi">` : ''}
        <span class="mb-prem-tag">${rtag(5)}<b>Premium drop</b></span><span class="mb-prem-nm">${sk ? esc(sk.name) : 'No outfit chosen yet'}</span>
        ${st.got.includes('skin') ? `<span class="mb-got">${icon('check')}Obtained</span>` : ''}</div>
      <div class="mb-info">
        <div><span class="lbl-sm">Pulls</span><b>${i} / ${MB_COST.length}</b></div>
        <div><span class="lbl-sm">Outfit chance</span><b>${st.got.includes('skin') ? 'Obtained' : ch ? `${Math.round(ch * 1000) / 10}%` : `From pull ${MB_SKIN_FROM}`}</b></div>
        <div><span class="lbl-sm">Next pull</span><b>${done ? 'Box empty' : `${curIcon('pearls')}${MB_COST[i]}`}</b></div>
      </div>
      <div class="mb-go"><span class="mbx-mini"><i class="lid"></i><i class="body"></i></span>
        ${done ? '<button class="btn ghost" disabled>Box empty</button>' : `<button class="btn gold" id="mbPull" ${S.wallet.pearls >= MB_COST[i] ? '' : 'disabled'}>Open the box · ${costHTML(MB_COST[i])}</button>`}</div>
      <p class="evp-note">Each pull takes one prize out of the box, so the outfit gets likelier every time and is guaranteed by pull ${MB_COST.length}. It can't drop before pull ${MB_SKIN_FROM}. Prices: ${MB_COST.join(', ')} pearls.</p>
    </div>
    <div class="mb-list"><span class="lbl-sm">In the box · ${MB_COST.length - i} left</span>
      ${MB_ITEMS().map(x => { const got = st.got.includes(x.k), n = st.got.indexOf(x.k) + 1;
        return `<div class="mb-row r${x.r} ${got ? 'got' : ''}"><span class="mb-ic">${x.pic}</span><span class="mb-nm"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}${got ? `<span class="mb-chk" title="Pull ${n}">${icon('check')}</span>` : ''}</div>`; }).join('')}
    </div></div>`;
}
function bindMystery() { const b = $('#mbPull'); if (b) b.onclick = pullMbox; }

/* the box opening: it shakes, the lid pops, an aura in the prize's rarity colour rises, then the prize appears */
function showMboxOpen(x, note, done) {
  const el = document.createElement('div');
  el.className = `mbx r${x.r}`;
  el.innerHTML = `<div class="mbx-aura"></div><div class="mbx-col"></div><div class="mbx-sparks">${Array.from({ length: 28 }, () => `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--d:${(Math.random() * 1.6).toFixed(2)}s;--s:${(3 + Math.random() * 5).toFixed(1)}px;--t:${(1.6 + Math.random() * 1.4).toFixed(2)}s"></i>`).join('')}</div>
    <div class="mbx-box"><i class="lid"></i><i class="body"></i><i class="ribbon"></i></div>
    <div class="mbx-prize"><span class="mbx-pic">${x.pic}</span>${ctag(x.r, 'lg')}<b>${esc(x.name)}</b><small>${esc(note || x.sub)}</small></div>
    <div class="mbx-hint">Tap to continue</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.classList.add('open'), 950);
  setTimeout(() => el.classList.add('shown'), 1600);
  let closing = false;
  el.addEventListener('click', () => { if (!el.classList.contains('shown') || closing) return; closing = true; el.classList.add('out'); setTimeout(() => { el.remove(); done && done(); }, 300); });
}

/* admin → Events: the Mystery Box skin and a fresh box */
function mboxAdmin() {
  const skins = S.pool.filter(e => e.type === 'skin' && +e.rarity !== 6), cur = mboxSkin();
  return `<div class="stack" style="gap:8px">
    <label class="tiny">Premium outfit <select class="input" id="mbSkin">${skins.map(k => `<option value="${esc(k.id)}" ${cur && cur.id === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('') || '<option value="">No skins yet</option>'}</select></label>
    <div class="row" style="gap:8px"><button class="btn ghost sm" id="mbNew">Start a new box</button><span class="tiny">A new box refills it for every player (their pulls start again at 1 pearl).</span></div>
  </div>`;
}
function bindMboxAdmin() {
  const s = $('#mbSkin'); if (s) s.onchange = () => { S.mystery = { ...(S.mystery || { id: 'box-1' }), skin: s.value || null }; persist(); toast('Mystery Box outfit saved.'); };
  const n = $('#mbNew'); if (n) n.onclick = () => { S.mystery = { ...(S.mystery || {}), id: 'box-' + Date.now().toString(36) }; persist(); if (evEl) renderEvents(); toast('A new Mystery Box has started.'); };
}
