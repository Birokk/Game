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
    { k: 'skin', r: sk && +sk.rarity === 7 ? 7 : sk && +sk.rarity === 4 ? 4 : 5, name: sk ? sk.name : 'Mystery outfit', sub: 'Premium outfit', pic: sk ? baseThumb(sk) : icon('skins') },
    { k: 'std10', r: 4, name: '10 Standard tickets', sub: '10 pulls on the permanent banner', pic: curIcon('wishes') },
    { k: 'lim5', r: 4, name: '5 Limited tickets', sub: '5 pulls on the limited banners', pic: curIcon('tickets') },
    { k: 'pearls', r: 4, name: '30 pearls', sub: 'Premium currency', pic: curIcon('pearls') },
    { k: 'title', r: 4, name: 'Title: Fountain Wisher', sub: 'Profile title', pic: icon('trophy') },
    { k: 'card', r: 4, name: 'Namecard: Mystery Night', sub: 'Profile namecard', pic: icon('image') },
    { k: 'bottles', r: 4, name: '2 Stamina bottles', sub: `+${BOTTLE_STAMINA} stamina each`, pic: curIcon('bottles') },
    { k: 'gold', r: 3, name: '20,000 gold', sub: 'Gold coins', pic: curIcon('coins') },
    { k: 'gifts', r: 3, name: 'Gift bundle', sub: `${MB_GIFTS.sweets} Sweets, ${MB_GIFTS.bracelet} Bracelets, ${MB_GIFTS.plush} Plushie`, pic: curIcon('gplush') },
    { k: 'thread', r: 3, name: '60 Thread', sub: 'For gear breakthroughs', pic: curIcon('thread') }
  ];
}
const mbItem = k => MB_ITEMS().find(x => x.k === k);
function mboxState() {
  const id = (S.mystery || {}).id || 'box-1', s = S.mbox && S.mbox.box === id ? S.mbox : (S.mbox = { box: id, got: [] });
  if (s.got.includes('exp')) s.got = s.got.map(k => k === 'exp' ? 'thread' : k);   // the 500 EXP prize became 60 Thread (EXP only from quests and stamina)
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
  else if (k === 'thread') S.wallet.thread = (S.wallet.thread || 0) + 60;
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
    <span class="tiny">You have ${fmt(S.wallet.pearls)} pearls.</span>
    <div class="row" style="justify-content:center"><button class="btn ghost" id="mbNo">Cancel</button><button class="btn gold" id="mbYes">Open · ${costHTML(cost)}</button></div></div>`,
    onMount: () => { $('#mbNo').onclick = closeModal; $('#mbYes').onclick = () => { closeModal(); pullMbox(); }; } });
}
function pullMbox() {
  const st = mboxState(), i = st.got.length; if (i >= MB_COST.length) return;
  const cost = MB_COST[i];
  if (S.wallet.pearls < cost) { toast(`This pull costs ${cost} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
  const k = drawMbox(st.got);
  S.wallet.pearls -= cost; st.got.push(k); questAdd('fountain');
  const note = grantMbox(k);
  // the outfit empties the box: everything still inside is yours too
  const rest = k === 'skin' ? MB_ITEMS().map(x => x.k).filter(x => !st.got.includes(x)) : [];
  rest.forEach(x => { st.got.push(x); grantMbox(x); });
  persist(); renderMenu(); refreshSummon();
  // the outfit goes straight from the fountain into its unlock animation, then the rest of the fountain
  const direct = k === 'skin' && !note, sk = direct && mboxSkin();
  showMboxOpen(mbItem(k), note, () => {
    renderEvents();
    const restWin = () => { if (rest.length) showMboxRest(rest); };
    if (sk) showSkinGet(sk, { onClose: restWin }); else restWin();
  }, { direct: !!sk, n: i + 1 });
}
/* after the outfit: the rest of the box in one window */
function showMboxRest(rest, done) {
  openModal({ title: 'The whole fountain is yours', ic: 'fountain', kind: 'mbrest', body: `<div class="stack">
    <p class="desc">You found the outfit, so everything still in the fountain comes with it.</p>
    <div class="mb-rest">${rest.map(mbItem).map(x => `<div class="mb-row r${x.r}"><span class="mb-ic">${x.pic}</span><span class="mb-nm"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}</div>`).join('')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn gold" id="mbRestOk">Collect</button></div></div>`,
    onMount: () => { $('#mbRestOk').onclick = () => { closeModal(); done && done(); }; } });
}
/* the event page side (like the owner's reference): the outfit's full art is the page wallpaper, a tidy description
   in the top-right corner, and at the bottom an Info button and the big wish button with the n / 10 counter beside it */
const mbRows = () => { const st = mboxState();
  return MB_ITEMS().map(x => { const got = st.got.includes(x.k), n = st.got.indexOf(x.k) + 1;
    return `<div class="mb-row r${x.r} ${got ? 'got' : ''}"><span class="mb-ic">${x.pic}</span><span class="mb-nm"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}${got ? `<span class="mb-chk" title="Wish ${n}">${icon('check')}</span>` : ''}</div>`; }).join(''); };
function mysteryBoard() {
  const st = mboxState(), sk = mboxSkin(), i = st.got.length, done = i >= MB_COST.length, owner = sk && findEntry(sk.parent);
  const hl = t => `<em>${esc(t)}</em>`;
  return `<div class="mb2">
    <p class="mb2-desc">This fountain may hold ${sk ? `the limited outfit ${hl(sk.name)}${owner && !sk.name.includes(owner.name) ? ` for ${hl(owner.name)}` : ''}` : 'a limited outfit'}, Limited and Standard tickets, pearls, the title ${hl('Fountain Wisher')} and more.</p>
    ${st.got.includes('skin') ? `<span class="mb2-drawn"><i>${icon('check')}Outfit obtained</i></span>` : ''}
    <div class="mb2-bottom">
      <button class="mb2-infob" data-info="mbox" aria-label="Info: prizes left, outfit chance and prices"><span>${icon('info')}</span><b>Info</b></button>
      <div class="mb2-bar">
        <span class="mb2-count"><small>${done ? 'All wishes made' : 'Wishes'}</small><b>${i}<i>/ ${MB_COST.length}</i></b></span>
        ${done ? '<button class="mb2-go" disabled><b>The fountain is empty</b></button>'
          : `<button class="mb2-go" id="mbPull" ${S.wallet.pearls >= MB_COST[i] ? '' : 'disabled'}><b>Make a wish</b><span class="mb2-cost">${curIcon('pearls')}${MB_COST[i]}</span><span class="mb2-chev">»</span></button>`}
      </div>
    </div></div>`;
}
/* the Info window, remade in glass (the owner's ask; kind 'mbinfo', styles .mbi at the end of main.css): how it works, three
   stat tiles (wishes made, next price, the outfit's chance on the next wish), the 10 wish prices as steps, and every prize
   as a glass card in its rarity colour (still inside / taken on wish n) */
INFO.mbox = () => { const st = mboxState(), ch = mboxChance(), i = st.got.length, done = i >= MB_COST.length, owned = st.got.includes('skin');
  const total = MB_COST.reduce((x, y) => x + y, 0), spent = MB_COST.slice(0, i).reduce((x, y) => x + y, 0), pct = owned ? 100 : Math.round(ch * 1000) / 10;
  const prize = x => { const got = st.got.includes(x.k), n = st.got.indexOf(x.k) + 1;
    return `<div class="mbi-pz r${x.r} ${got ? 'got' : ''}"><span class="mbi-pic">${x.pic}</span><span class="mbi-pn"><b>${esc(x.name)}</b><small>${esc(x.sub)}</small></span>${ctag(x.r)}<em class="mbi-pst">${got ? `${icon('check')}Wish ${n}` : 'Inside'}</em></div>`; };
  return { title: 'Mystery Fountain', kind: 'mbinfo', body: `<div class="mbi">
    <div class="mbi-card mbi-how"><span class="mbi-ftn"><span class="ftn-ic">${icon('fountain')}</span></span><div><b>How the fountain works</b>
      <p>The fountain holds ${MB_COST.length} prizes. Each wish takes one out at random and it never comes back, so the outfit gets likelier with every wish and is guaranteed by wish ${MB_COST.length}. It can't come out before wish ${MB_SKIN_FROM}. <b>Finding the outfit gives you everything still left in the fountain.</b></p></div></div>
    <div class="mbi-stats">
      <div class="mbi-card mbi-st"><small>Wishes made</small><b>${i}<i>/ ${MB_COST.length}</i></b><span class="mbi-pips">${MB_COST.map((_, k) => `<i class="${k < i ? 'on' : ''}"></i>`).join('')}</span></div>
      <div class="mbi-card mbi-st"><small>Next wish</small><b>${done ? 'Empty' : `${curIcon('pearls')}${MB_COST[i]}`}</b><span class="mbi-tx">${done ? 'Every prize is out' : `${fmt(spent)} of ${fmt(total)} pearls spent`}</span></div>
      <div class="mbi-card mbi-st ${owned ? 'won' : ''}"><small>Outfit chance next wish</small><b>${owned ? 'Obtained' : ch ? `${pct}%` : '0%'}</b><span class="mbi-bar"><i style="width:${owned ? 100 : pct}%"></i></span><span class="mbi-tx">${owned ? 'The outfit is yours' : ch ? 'Rises with every wish' : `From wish ${MB_SKIN_FROM}`}</span></div>
    </div>
    <div class="mbi-card"><span class="mbi-h">${curIcon('pearls')}Wish prices<em>${fmt(total)} pearls for all ${MB_COST.length}</em></span>
      <div class="mbi-steps">${MB_COST.map((c, k) => `<span class="mbi-step ${k < i ? 'done' : k === i ? 'now' : ''}"><small>${k < i ? icon('check') : `Wish ${k + 1}`}</small><b>${curIcon('pearls')}${c}</b></span>`).join('')}</div></div>
    <div class="mbi-card"><span class="mbi-h">${icon('gift')}In the fountain<em>${MB_COST.length - i} of ${MB_COST.length} left</em></span>
      <div class="mbi-prizes">${MB_ITEMS().map(prize).join('')}</div></div>
  </div>` }; };
function bindMystery() { const b = $('#mbPull'); if (b) b.onclick = confirmMbox; }

/* the wish animation (remade at the owner's ask, `.mfw`): a pearl falls into a moonlit fountain pool, the splash
   lights the water, the glow climbs through the rarity colours (blue → orange SSR → prism UR / red XR) with a ripple
   and a jolt at each step, motes of light spiral up out of the water into an orb, and the orb bursts into the prize
   card. Drawn on one canvas (screen pixels, time-based, stops itself when removed). Tapping early jumps to the burst.
   opts.direct (the outfit): no prize card, the burst fades straight into the new-outfit animation (done). */
const MBW_COL = { 3: ['#55b4ff', '#d6efff'], 4: ['#ff9a36', '#ffe3a6'], 7: ['#ff1f3d', '#ffb3a8'] };
const mbwCol = (t, now) => { if (t === 5) { const h = (now / 9) % 360; return [`hsl(${h},95%,64%)`, `hsl(${(h + 70) % 360},100%,86%)`]; } return MBW_COL[t] || MBW_COL[3]; };
function showMboxOpen(x, note, done, opts = {}) {
  const tiers = [3]; if (x.r >= 4) tiers.push(4); if (x.r === 5 || x.r === 7) tiers.push(x.r);
  const T_DROP = 300, T_SPLASH = 1250, T_STEP = 2000, STEP = 800, T_BURST = T_STEP + STEP * (tiers.length - 1) + (tiers.length > 1 ? 900 : 500);
  const sk = x.k === 'skin' ? mboxSkin() : null, bgArt = sk ? baseArt(sk) : '';
  const el = document.createElement('div');
  el.className = `mfw r${x.r}`;
  el.innerHTML = `<div class="mfw-bg">${bgArt ? `<img src="${bgArt}" alt="">` : ''}</div><div class="mfw-sky"></div>
    <canvas class="mfw-cv"></canvas><div class="mfw-flash"></div>
    <div class="mfw-say"><small>Mystery Fountain${opts.n ? ` · Wish ${opts.n} / ${MB_COST.length}` : ''}</small><b>Make a wish…</b></div>
    <div class="mfw-rev"><div class="mfw-rays"></div><div class="mfw-card"><span class="mfw-pic">${x.pic}</span>${ctag(x.r, 'lg')}<b>${esc(x.name)}</b><small>${esc(note || x.sub)}</small></div></div>
    <div class="mfw-hint">Tap to skip</div>`;
  document.body.appendChild(el);
  const cv = el.querySelector('.mfw-cv'), g = cv.getContext('2d'), RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, k = 1;
  const size = () => { dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; k = Math.max(.55, Math.min(W, H * 1.4) / 1100); };
  size(); addEventListener('resize', size);
  let t0 = performance.now(), skipTo = 0, tier = 0, burst = false, revealed = false, last = 0, splashed = false, nextRip = 0;
  const motes = [], drops = [], rips = [], sparks = [];
  const geo = () => { const cx = W / 2, py = H * .74, rx = Math.min(W * .4, 460 * k), ry = rx * .2; return { cx, py, rx, ry, oy: H * .4 }; };
  const rip = (now, big) => rips.push({ t: now, big });
  const say = (txt) => { const b = el.querySelector('.mfw-say b'); if (b) { b.textContent = txt; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); } };
  const flash = (cls) => { const f = el.querySelector('.mfw-flash'); f.className = 'mfw-flash ' + cls; void f.offsetWidth; f.classList.add('on'); };
  const jolt = () => { el.classList.remove('jolt'); void el.offsetWidth; el.classList.add('jolt'); };
  const setTier = (i, now) => { tier = i; el.dataset.t = tiers[i]; const G = geo(); rip(now, true); rip(now + 120, true);
    for (let n = 0; n < (RM ? 14 : 34); n++) { const a = Math.random() * Math.PI * 2; drops.push({ x: G.cx + Math.cos(a) * G.rx * .3 * Math.random(), y: G.py, vx: Math.cos(a) * (60 + Math.random() * 160) * k, vy: -(260 + Math.random() * 360) * k, life: 1.4 }); }
    if (i) { flash('soft'); jolt(); say(['', 'The water burns bright…', tiers[i] === 7 ? 'A crimson light!' : 'A light of every colour!'][i] || ''); } };
  const doBurst = now => { burst = true; const G = geo(); flash('big'); jolt(); el.classList.add('burst');
    for (let n = 0; n < (RM ? 50 : 150); n++) { const a = Math.random() * Math.PI * 2, v = (200 + Math.random() * 700) * k; sparks.push({ x: G.cx, y: G.oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .8 + Math.random() * .9, m: Math.random() }); }
    if (opts.direct) { setTimeout(() => finish(), 650); return; }
    setTimeout(() => { revealed = true; el.classList.add('shown'); el.querySelector('.mfw-hint').textContent = 'Tap to continue'; }, 260); };
  let closing = false;
  const finish = () => { if (closing) return; closing = true; el.classList.add('out'); setTimeout(() => { el.remove(); removeEventListener('resize', size); done && done(); }, 380); };
  el.addEventListener('click', () => { const t = performance.now() - t0 + skipTo; if (!burst) { skipTo += Math.max(0, T_BURST - t); return; } if (revealed) finish(); });
  const glow = (x0, y0, r, col, a) => { const gr = g.createRadialGradient(x0, y0, 0, x0, y0, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x0 - r, y0 - r, r * 2, r * 2); };
  const frame = nowAbs => {
    if (!el.isConnected) return;
    const now = nowAbs - t0 + skipTo, dt = Math.min(.05, (nowAbs - (last || nowAbs)) / 1000); last = nowAbs;
    const G = geo(), [c1, c2] = mbwCol(tiers[tier], nowAbs);
    // timeline
    if (now >= T_SPLASH && !splashed) { splashed = true; nextRip = now + 900; setTier(0, now); say('Your wish sinks into the water…'); }
    for (let i = 1; i < tiers.length; i++) if (tier < i && now >= T_STEP + STEP * (i - 1) + 300) setTier(i, now);
    if (!burst && now >= T_BURST) { while (tier < tiers.length - 1) setTier(tier + 1, now); doBurst(now); }
    const lit = now < T_SPLASH ? 0 : Math.min(1, (now - T_SPLASH) / 700) * (burst ? .7 : 1);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    // the pool: a stone basin seen from above-front, its lip, then the water
    const { cx, py, rx, ry } = G;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(cx, py + ry * 1.25, rx * 1.18, ry * 1.25, 0, 0, Math.PI * 2); g.fill();
    let st = g.createLinearGradient(cx - rx, 0, cx + rx, 0); st.addColorStop(0, '#8c93a6'); st.addColorStop(.45, '#eef1f7'); st.addColorStop(.6, '#dfe3ec'); st.addColorStop(1, '#7d8499');
    g.fillStyle = st; g.beginPath(); g.ellipse(cx, py + ry * .55, rx * 1.12, ry * 1.32, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(20,24,40,.35)'; g.beginPath(); g.ellipse(cx, py + ry * .55, rx * 1.12, ry * 1.32, 0, 0, Math.PI); g.fill();
    g.fillStyle = st; g.beginPath(); g.ellipse(cx, py, rx * 1.12, ry * 1.32, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, py, rx * 1.12, ry * 1.32, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    // the inner wall of the basin (shaded, darker at the back), a carved line on the rim
    const iw = g.createLinearGradient(0, py - ry * 1.12, 0, py + ry); iw.addColorStop(0, '#4a5066'); iw.addColorStop(.5, '#8a91a6'); iw.addColorStop(1, '#c9cedb');
    g.fillStyle = iw; g.beginPath(); g.ellipse(cx, py, rx * 1.03, ry * 1.1, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(90,96,120,.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, py, rx * 1.075, ry * 1.21, 0, 0, Math.PI * 2); g.stroke();
    const wg = g.createRadialGradient(cx, py, 0, cx, py, rx); wg.addColorStop(0, '#12305a'); wg.addColorStop(1, '#050d1e');
    g.fillStyle = wg; g.beginPath(); g.ellipse(cx, py + ry * .04, rx, ry * .96, 0, 0, Math.PI * 2); g.fill();
    if (!lit) { g.globalAlpha = .5; glow(cx + rx * .3, py - ry * .2, rx * .25, '#cfe0ff', .25); g.globalAlpha = 1; }
    g.save(); g.beginPath(); g.ellipse(cx, py, rx, ry, 0, 0, Math.PI * 2); g.clip();
    g.globalCompositeOperation = 'lighter';
    if (lit) { const pulse = .85 + Math.sin(nowAbs / 160) * .15; glow(cx, py, rx * 1.1, c1, .75 * lit * pulse); glow(cx, py, rx * .45, c2, .6 * lit); }
    g.globalAlpha = .18 + lit * .25; g.strokeStyle = lit ? c2 : '#9fc6ff'; g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) { const yy = py - ry + ((i / 7 + nowAbs / 9000) % 1) * ry * 2, w = rx * Math.sqrt(Math.max(0, 1 - ((yy - py) / ry) ** 2)) * .8; g.beginPath(); g.ellipse(cx + Math.sin(nowAbs / 900 + i) * 12 * k, yy, w * .6, 1.5, 0, 0, Math.PI * 2); g.stroke(); }
    for (let i = rips.length - 1; i >= 0; i--) { const r = rips[i], a = (now - r.t) / (r.big ? 1500 : 1100); if (a < 0) continue; if (a >= 1) { rips.splice(i, 1); continue; }
      g.globalAlpha = (1 - a) * .9; g.strokeStyle = c2; g.lineWidth = (r.big ? 3 : 2) * (1 - a) + .5; g.beginPath(); g.ellipse(cx, py, rx * a * (r.big ? 1.05 : .8), ry * a * (r.big ? 1.05 : .8), 0, 0, Math.PI * 2); g.stroke(); }
    if (lit && !burst && now >= nextRip) { rip(now); nextRip = now + 900; }
    g.restore(); g.globalCompositeOperation = 'lighter';
    // the column of light rising out of the water
    if (lit) { const cw = rx * (.32 + .05 * Math.sin(nowAbs / 120)), cg = g.createLinearGradient(0, py, 0, 0); cg.addColorStop(0, 'rgba(0,0,0,0)'); cg.addColorStop(.12, c1); cg.addColorStop(.55, c2); cg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = .26 * lit; g.fillStyle = cg; g.beginPath(); g.moveTo(cx - cw, py); g.quadraticCurveTo(cx - cw * .35, py - H * .3, cx - cw * .12, 0); g.lineTo(cx + cw * .12, 0); g.quadraticCurveTo(cx + cw * .35, py - H * .3, cx + cw, py); g.closePath(); g.fill(); }
    // motes spiralling up into the orb
    if (lit && !burst) { const n = (RM ? 2 : 5) * (1 + tier); for (let i = 0; i < n * dt * 12; i++) { const a = Math.random() * Math.PI * 2; motes.push({ a, r: .3 + Math.random() * .7, p: 0, sp: .45 + Math.random() * .5, s: (1.5 + Math.random() * 3) * k, w: Math.random() < .5 ? 1 : -1 }); } }
    for (let i = motes.length - 1; i >= 0; i--) { const m = motes[i]; m.p += dt * m.sp * (burst ? 3 : 1); if (m.p >= 1) { motes.splice(i, 1); continue; }
      const e = m.p * m.p * (3 - 2 * m.p), sw = (1 - e) * m.r, ang = m.a + m.w * e * 5;
      const mx = cx + Math.cos(ang) * rx * sw, my = py + Math.sin(ang) * ry * sw + (G.oy - py) * e;
      g.globalAlpha = Math.sin(m.p * Math.PI) * .9; g.fillStyle = c2; g.beginPath(); g.arc(mx, my, m.s, 0, Math.PI * 2); g.fill();
      g.globalAlpha *= .35; g.fillStyle = c1; g.beginPath(); g.arc(mx, my, m.s * 3, 0, Math.PI * 2); g.fill(); }
    // the orb gathering above the water
    if (now > T_SPLASH + 300 && !burst) { const gr = Math.min(1, (now - T_SPLASH - 300) / (T_BURST - T_SPLASH - 300)), R = (10 + gr * 34) * k * (1 + Math.sin(nowAbs / 90) * .06 * gr);
      glow(cx, G.oy, R * 5, c1, .55); glow(cx, G.oy, R * 2.2, c2, .85);
      g.globalAlpha = .55 * gr; g.strokeStyle = c2; g.lineWidth = 1.4;
      for (let i = 0; i < 10; i++) { const a = nowAbs / 1600 + i * Math.PI / 5; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 1.4, G.oy + Math.sin(a) * R * 1.4); g.lineTo(cx + Math.cos(a) * R * (3 + gr * 3), G.oy + Math.sin(a) * R * (3 + gr * 3)); g.stroke(); }
      g.globalAlpha = 1; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, G.oy, R * .7, 0, Math.PI * 2); g.fill(); }
    // the falling pearl
    if (now >= T_DROP && now < T_SPLASH) { const p = (now - T_DROP) / (T_SPLASH - T_DROP), e = p * p, x0 = cx + W * .12, y0 = -40;
      const px = x0 + (cx - x0) * (1 - (1 - p) * (1 - p)), pyy = y0 + (py - y0) * e, R = 13 * k * (1 - p * .35), sx = Math.abs(Math.cos(now / 70)) * .7 + .3;
      for (let i = 0; i < 2; i++) sparks.push({ x: px, y: pyy, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 30, life: .5, m: 1, trail: 1 });
      glow(px, pyy, R * 4, '#d9c8ff', .7); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      const pg = g.createRadialGradient(px - R * .3 * sx, pyy - R * .35, R * .1, px, pyy, R); pg.addColorStop(0, '#fff'); pg.addColorStop(.6, '#efe4ff'); pg.addColorStop(1, '#a98be6');
      g.fillStyle = pg; g.beginPath(); g.ellipse(px, pyy, R * sx, R, 0, 0, Math.PI * 2); g.fill(); g.globalCompositeOperation = 'lighter'; }
    // splash drops and burst sparks
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.life -= dt; d.vy += 900 * k * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.life <= 0 || (d.vy > 0 && d.y > py)) { drops.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, d.life * 2); g.fillStyle = c2; g.beginPath(); g.arc(d.x, d.y, 2.4 * k, 0, Math.PI * 2); g.fill(); }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.life -= dt; if (s.life <= 0) { sparks.splice(i, 1); continue; }
      s.vx *= 1 - dt * 1.8; s.vy = s.vy * (1 - dt * 1.8) + (s.trail ? 0 : 140 * k * dt); s.x += s.vx * dt; s.y += s.vy * dt;
      g.globalAlpha = Math.min(1, s.life * 1.6); g.fillStyle = s.trail ? '#efe4ff' : s.m > .5 ? c2 : c1; g.beginPath(); g.arc(s.x, s.y, (s.trail ? 1.6 : 1.5 + s.m * 2.5) * k, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(() => { el.classList.add('go'); t0 = performance.now(); requestAnimationFrame(frame); });
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
