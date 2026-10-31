ICONS.fountain = '<path d="M3 15h18"/><path d="M4 15c0 3 3.5 5 8 5s8-2 8-5"/><path d="M12 15v-4"/><path d="M8 11h8"/><path d="M8.5 11c0 1.6 1.6 2.5 3.5 2.5s3.5-.9 3.5-2.5"/><path d="M12 11V6"/><path d="M12 6c-2 0-3.5 1.5-4 4"/><path d="M12 6c2 0 3.5 1.5 4 4"/><path d="M12 2.2c.8 1 1.2 1.7 1.2 2.2a1.2 1.2 0 01-2.4 0c0-.5.4-1.2 1.2-2.2z"/>';
/* ---------- Mystery Fountain (formerly Mystery Box): a limited summon event on the Event page ----------
   (Code names keep "mbox" so saves still load.) One fountain holds 10 prizes and each pull takes one out at random (no repeats), so the premium skin gets likelier with every
   pull and is certain by pull 10. The skin can't come out before pull 4 and is weighted lower than the other prizes
   (MB_SKIN_W). Pulling the skin also gives everything still left in the box. Pulls cost pearls, rising from 1 to 60 (MB_COST).
   Admin → Events → Mystery Fountain picks the skin (any existing non-wedding skin) and can refill it (new id = everyone's
   box refills). Content: S.mystery = { id, skin }. Player save: S.mbox = { box, got: [item keys in pull order] }.
   Title and namecard prizes unlock profile cosmetics for good (S.unlocks). */
const MB_COST = [1, 2, 4, 7, 11, 16, 23, 32, 44, 60];   // pearls for pull 1…10 (200 for the whole box)
const MB_SKIN_FROM = 4;                                 // the skin can only drop from this pull on
const MB_GIFTS = { sweets: 3, bracelet: 2, plush: 1 };
const MB_SKIN_W = 0.36;                                  // the skin's weight in the draw (every other prize weighs 1)
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
    { k: 'title', r: 4, name: 'Title: Fountain Wisher', sub: 'Profile title', pic: icon('trophy') },
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
  if (got.length + 1 < MB_SKIN_FROM) return 0;
  const others = MB_COST.length - got.length - 1;
  return others ? MB_SKIN_W / (MB_SKIN_W + others) : 1;
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
/* one draw: every prize left weighs 1, the skin MB_SKIN_W (and 0 before pull 4) */
function drawMbox(got) {
  const i = got.length, left = MB_ITEMS().map(x => x.k).filter(k => !got.includes(k) && (k !== 'skin' || i + 1 >= MB_SKIN_FROM));
  const w = k => k === 'skin' ? MB_SKIN_W : 1, tot = left.reduce((t, k) => t + w(k), 0);
  let r = Math.random() * tot;
  for (const k of left) { r -= w(k); if (r < 0) return k; }
  return left[left.length - 1];
}
function confirmMbox() {
  const st = mboxState(), i = st.got.length; if (i >= MB_COST.length) return;
  const cost = MB_COST[i];
  if (S.wallet.pearls < cost) { toast(`This pull costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  openModal({ title: 'Make a wish?', ic: 'fountain', small: true, body: `<div class="stack" style="justify-items:center;text-align:center">
    <span class="ftn-ic big">${icon('fountain')}</span>
    <p class="desc">Spend <b>${cost} pearl${cost === 1 ? '' : 's'}</b> on pull ${i + 1} of ${MB_COST.length}?</p>
    <span class="tiny">You have ${fmt(S.wallet.pearls)} pearls. Outfit chance this pull: ${Math.round(mboxChance() * 1000) / 10}%.</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="mbNo">Cancel</button><button class="btn gold" id="mbYes">Open · ${costHTML(cost)}</button></div></div>`,
    onMount: () => { $('#mbNo').onclick = closeModal; $('#mbYes').onclick = () => { closeModal(); pullMbox(); }; } });
}
function pullMbox() {
  const st = mboxState(), i = st.got.length; if (i >= MB_COST.length) return;
  const cost = MB_COST[i];
  if (S.wallet.pearls < cost) { toast(`This pull costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  const k = drawMbox(st.got);
  S.wallet.pearls -= cost; st.got.push(k);
  const note = grantMbox(k);
  // the outfit empties the box: everything still inside is yours too
  const rest = k === 'skin' ? MB_ITEMS().map(x => x.k).filter(x => !st.got.includes(x)) : [];
  rest.forEach(x => { st.got.push(x); grantMbox(x); });
  persist(); renderMenu(); refreshSummon();
  showMboxOpen(mbItem(k), note, () => {
    renderEvents();
    const outfit = () => { if (k === 'skin' && !note) { const sk = mboxSkin(); if (sk) showSkinGet(sk); } };
    if (rest.length) showMboxRest(rest, outfit); else outfit();
  });
}
/* after the outfit: the rest of the box in one window */
function showMboxRest(rest, done) {
  openModal({ title: 'The whole fountain is yours', ic: 'fountain', kind: 'mbrest', body: `<div class="stack">
    <p class="desc">You found the outfit, so everything still in the fountain comes with it.</p>
    <div class="mb-rest">${rest.map(mbItem).map(x => `<div class="mb-row r${x.r}"><span class="mb-ic">${x.pic}</span><span class="mb-nm"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}</div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn gold" id="mbRestOk">Collect</button></div></div>`,
    onMount: () => { $('#mbRestOk').onclick = () => { closeModal(); done && done(); }; } });
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
        <div><span class="lbl-sm">Wishes</span><b>${i} / ${MB_COST.length}</b></div>
        <div><span class="lbl-sm">Outfit chance</span><b>${st.got.includes('skin') ? 'Obtained' : ch ? `${Math.round(ch * 1000) / 10}%` : `From pull ${MB_SKIN_FROM}`}</b></div>
        <div><span class="lbl-sm">Next wish</span><b>${done ? 'Empty' : `${curIcon('pearls')}${MB_COST[i]}`}</b></div>
      </div>
      <div class="mb-go"><span class="ftn-ic">${icon('fountain')}</span>
        ${done ? '<button class="btn ghost" disabled>The fountain is empty</button>' : `<button class="btn gold" id="mbPull" ${S.wallet.pearls >= MB_COST[i] ? '' : 'disabled'}>Make a wish · ${costHTML(MB_COST[i])}</button>`}</div>
      <p class="evp-note">Each wish takes one prize out of the fountain, so the outfit gets likelier every time and is guaranteed by pull ${MB_COST.length}. It can't drop before pull ${MB_SKIN_FROM}, and pulling it gives you everything still left in the fountain. Prices: ${MB_COST.join(', ')} pearls.</p>
    </div>
    <div class="mb-list"><span class="lbl-sm">In the fountain · ${MB_COST.length - i} left</span>
      ${MB_ITEMS().map(x => { const got = st.got.includes(x.k), n = st.got.indexOf(x.k) + 1;
        return `<div class="mb-row r${x.r} ${got ? 'got' : ''}"><span class="mb-ic">${x.pic}</span><span class="mb-nm"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}${got ? `<span class="mb-chk" title="Pull ${n}">${icon('check')}</span>` : ''}</div>`; }).join('')}
    </div></div>`;
}
function bindMystery() { const b = $('#mbPull'); if (b) b.onclick = confirmMbox; }

/* the fountain: it rises, the water jet shoots up and the water turns the prize's rarity colour (blue R, orange SSR, prism UR), then the prize appears */
function showMboxOpen(x, note, done) {
  const el = document.createElement('div');
  el.className = `mbx r${x.r}`;
  el.innerHTML = `<div class="mbx-aura"></div><div class="mbx-col"></div><div class="mbx-sparks">${Array.from({ length: 28 }, () => `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--d:${(Math.random() * 1.6).toFixed(2)}s;--s:${(3 + Math.random() * 5).toFixed(1)}px;--t:${(1.6 + Math.random() * 1.4).toFixed(2)}s"></i>`).join('')}</div>
    <div class="mbx-ftn"><i class="jet"></i><i class="fall l"></i><i class="fall r"></i><i class="top"><i class="water"></i></i><i class="stem"></i><i class="basin"><i class="water"></i></i></div>
    <div class="mbx-prize"><span class="mbx-pic">${x.pic}</span>${ctag(x.r, 'lg')}<b>${esc(x.name)}</b><small>${esc(note || x.sub)}</small></div>
    <div class="mbx-hint">Tap to continue</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('go'));
  setTimeout(() => el.classList.add('open'), 950);
  setTimeout(() => el.classList.add('shown'), 1600);
  let closing = false;
  el.addEventListener('click', () => { if (!el.classList.contains('shown') || closing) return; closing = true; el.classList.add('out'); setTimeout(() => { el.remove(); done && done(); }, 300); });
}

/* admin → Events: the Mystery Fountain outfit and a refill */
function mboxAdmin() {
  const skins = S.pool.filter(e => e.type === 'skin' && +e.rarity !== 6), cur = mboxSkin();
  return `<div class="stack" style="gap:8px">
    <label class="tiny">Premium outfit <select class="input" id="mbSkin">${skins.map(k => `<option value="${esc(k.id)}" ${cur && cur.id === k.id ? 'selected' : ''}>${esc(k.name)}</option>`).join('') || '<option value="">No skins yet</option>'}</select></label>
    <div class="row" style="gap:8px"><button class="btn ghost sm" id="mbNew">Refill the fountain</button><span class="tiny">Refilling resets it for every player (their wishes start again at 1 pearl).</span></div>
    <span class="tiny">The event wallpaper is this outfit's art. An uploaded wallpaper is only used when the outfit has no art.</span>
  </div>`;
}
function bindMboxAdmin() {
  const s = $('#mbSkin'); if (s) s.onchange = () => { S.mystery = { ...(S.mystery || { id: 'box-1' }), skin: s.value || null }; persist(); renderEventsTab(); toast('Mystery Fountain outfit saved.'); };
  const n = $('#mbNew'); if (n) n.onclick = () => { S.mystery = { ...(S.mystery || {}), id: 'box-' + Date.now().toString(36) }; persist(); if (evEl) renderEvents(); toast('The Mystery Fountain has been refilled.'); };
}
