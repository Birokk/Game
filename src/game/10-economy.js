/* buy summon tickets (pulls) with pearls */
const TICKET_PEARLS = 3;
function openBuyTickets(bk = 'limited') {
  if (bk !== 'standard') bk = 'limited';   // Limited tickets also pay for the Weekly and Outfit banners
  let n = 1; const k = TK(bk);
  openModal({ title: 'Buy pulls', ic: 'sparkle', body: `<div class="stack">
    <div class="tabs" style="margin:0">${['limited', 'standard'].map(b => `<button class="tab ${b === bk ? 'on' : ''}" data-btk="${b}">${curIcon(TK(b))}${TK_NAME[TK(b)]}s</button>`).join('')}</div>
    <p class="desc">${TK_NAME[k]}s are one pull each on the ${bk === 'standard' ? 'permanent banner' : 'Limited, Weekly and Outfit banners'} and cost ${TICKET_PEARLS} pearls.</p>
    <div class="buy-row">${curIcon(k)}<button class="rbtn glass" id="btMinus" aria-label="One less">−</button><input class="input" id="btN" type="number" min="1" max="999" value="1" aria-label="How many pulls"><button class="rbtn glass" id="btPlus" aria-label="One more">${icon('plus')}</button></div>
    <div class="row" style="justify-content:center">${[1, 10, 50].map(k => `<button class="btn ghost sm" data-bt="${k}">×${k}</button>`).join('')}</div>
    <div class="balance"><span>Total</span><b id="btCost"></b></div>
    <div class="row" style="justify-content:space-between"><span class="tiny">You have ${fmt(S.wallet.pearls)} pearls and ${fmt(S.wallet[k])} ${TK_NAME[k].toLowerCase()}s.</span><button class="btn gold" id="btGo">Buy</button></div>
  </div>`, onMount: () => {
    const set = v => { n = clamp(Math.floor(+v || 1), 1, 999); $('#btN').value = n; $('#btCost').innerHTML = `${curIcon('pearls')}${fmt(n * TICKET_PEARLS)}`; $('#btGo').disabled = S.wallet.pearls < n * TICKET_PEARLS; $('#btGo').textContent = `Buy ${n} pull${n === 1 ? '' : 's'}`; };
    set(1);
    $('#btN').oninput = e => set(e.target.value);
    $('#btMinus').onclick = () => set(n - 1); $('#btPlus').onclick = () => set(n + 1);
    modalEl.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => set(b.dataset.bt));
    modalEl.querySelectorAll('[data-btk]').forEach(b => b.onclick = () => openBuyTickets(b.dataset.btk));
    $('#btGo').onclick = () => {
      const cost = n * TICKET_PEARLS;
      if (S.wallet.pearls < cost) { toast(`You need ${fmt(cost)} pearls.`); return; }
      S.wallet.pearls -= cost; S.wallet[k] += n; persist(); renderMenu(); refreshSummon(); closeModal();
      toast(`Bought ${n} ${TK_NAME[k].toLowerCase()}${n === 1 ? '' : 's'} for ${fmt(cost)} pearls.`);
    };
  } });
}

/* stamina: details; +60 from a recovery bottle or for 1 pearl */
const STAMINA_REFILLS = [1, 1, 2, 2, 3, 3];   // pearl cost of each daily refill
const refillsUsed = () => S.stamRefill && S.stamRefill.day === dayKey() ? S.stamRefill.n : 0;
function addStamina() { const n = giveStamina(BOTTLE_STAMINA); persist(); renderMenu(); openStamina(); toast(`+${n} stamina.${n < BOTTLE_STAMINA ? ` Stamina is capped at ${STAMINA_CAP}.` : ''}`); }
const BOTTLE_STAMINA = 60;
function openStamina() {
  const v = stamina(), left = STAMINA_MS - (Date.now() - S.stamina.t);
  openModal({ title: 'Stamina', ic: 'bolt', body: `<div class="stack">
    <div class="balance"><span>${curIcon('stamina')} Stamina</span><b>${v} / ${STAMINA_MAX}</b></div>
    <p class="tiny">${v >= STAMINA_MAX ? 'Full. ' : `+1 in ${Math.ceil(left / 6e4)} min. `}Stamina refills 1 every 6 minutes up to ${STAMINA_MAX}; bottles, refills and the farm can raise it up to ${STAMINA_CAP}. Catching an egg in the plaza costs ${EGG_STAMINA}.</p>
    <div class="frag-row">${curIcon('bottles')}<div style="display:grid;flex:1"><b>Stamina recovery bottle</b><span class="tiny">Restores ${BOTTLE_STAMINA} stamina · you have ${S.wallet.bottles}</span></div>
      <button class="btn mint sm" id="useBottle" ${S.wallet.bottles ? '' : 'disabled'}>Use</button></div>
    ${(() => { const used = refillsUsed(), cost = STAMINA_REFILLS[used];
      return `<div class="frag-row">${curIcon('pearls')}<div style="display:grid;flex:1"><b>Refill with pearls</b><span class="tiny">${BOTTLE_STAMINA} stamina · ${STAMINA_REFILLS.length - used} of ${STAMINA_REFILLS.length} refills left today · you have ${fmt(S.wallet.pearls)} pearls</span>
        <span class="refills">${STAMINA_REFILLS.map((c, i) => `<i class="${i < used ? 'used' : i === used ? 'next' : ''}">${c}</i>`).join('')}</span></div>
      ${cost ? `<button class="btn gold sm" id="buyStam" ${S.wallet.pearls >= cost ? '' : 'disabled'}>${costHTML(cost)}</button>` : '<button class="btn ghost sm" disabled>Resets tomorrow</button>'}</div>`; })()}
    <p class="tiny">Bottles come from the daily spin.</p></div>`, onMount: () => {
    $('#useBottle').onclick = () => { if (!S.wallet.bottles) return; if (stamina() >= STAMINA_CAP) { toast(`Stamina is at the ${STAMINA_CAP} cap.`); return; } S.wallet.bottles--; addStamina(); };
    const bs = $('#buyStam'); if (bs) bs.onclick = () => {
      const used = refillsUsed(), cost = STAMINA_REFILLS[used];
      if (!cost || S.wallet.pearls < cost) return;
      if (stamina() >= STAMINA_CAP) { toast(`Stamina is at the ${STAMINA_CAP} cap.`); return; }
      S.wallet.pearls -= cost; S.stamRefill = { day: dayKey(), n: used + 1 }; addStamina();
    };
  } });
}

/* daily spin: one free spin a day; the ring is a 1% jackpot */
const SPIN = [
  { give: 'coins', n: 2000, w: 25 }, { give: 'pearls', n: 1, w: 20 }, { give: 'bottles', n: 1, w: 15, name: 'Stamina bottle' }, { give: 'pearls', n: 3, w: 12 },
  { give: 'coins', n: 5000, w: 10 }, { give: 'wishes', n: 1, w: 12, name: 'Standard ticket' }, { give: 'pearls', n: 5, w: 5 }, { give: 'rings', n: 1, w: 1, name: 'Marriage ring', jackpot: true }
];
const spinReady = () => S.spin.last !== dayKey();
const spinName = s => s.name || `${fmt(s.n)} ${s.give === 'coins' ? 'gold coins' : s.n === 1 ? 'pearl' : 'pearls'}`;
let spinAngle = 0;
/* slice size follows the chance: rarer prizes get smaller slices (square-root scale keeps the 1% slice visible) */
function spinSlices() {
  const sz = SPIN.map(s => Math.sqrt(s.w)), tot = sz.reduce((a, b) => a + b, 0);
  let a0 = 0;
  return sz.map(v => { const d = v / tot * 360, r = { a0, sz: d, mid: a0 + d / 2 }; a0 += d; return r; });
}
function openSpin() {
  const SL = spinSlices();
  const conic = SPIN.map((s, i) => `${s.jackpot ? '#e8b04a' : i % 2 ? '#2a2f6a' : '#3d2a6e'} ${SL[i].a0}deg ${SL[i].a0 + SL[i].sz}deg`).join(',');
  openModal({ title: 'Daily spin', ic: 'wheel', kind: 'spin', body: `<div class="stack" style="justify-items:center">
    <div class="wheel-wrap"><span class="wheel-ptr"></span>
      <div class="wheel" id="wheel" style="background:conic-gradient(${conic});transform:rotate(${spinAngle}deg)">
        ${SPIN.map((s, i) => `<div class="wseg ${s.jackpot ? 'jack' : ''}" style="--a:${SL[i].mid}deg;--h:${SL[i].sz / 2}deg;--k:${Math.max(.62, Math.min(1.25, Math.sqrt(SL[i].sz / 45)))}"><span>${curIcon(s.give)}<b>${s.give === 'coins' ? fmt(s.n) : '×' + s.n}</b></span></div>`).join('')}
      </div>
      <button class="wheel-hub" id="spinGo" ${spinReady() ? '' : 'disabled'}>${spinReady() ? 'Spin' : 'Done'}</button></div>
    <div class="tiny" id="spinNote">${spinReady() ? 'One free spin every day.' : 'You already spun today. Come back tomorrow.'}</div>
    <details style="width:100%"><summary>Chances</summary><div class="spin-odds">${SPIN.map(s => `<span>${curIcon(s.give)}${spinName(s)}</span><b>${s.w}%</b>`).join('')}</div></details>
  </div>`, onMount: () => {
    $('#spinGo').onclick = () => {
      if (!spinReady()) return;
      let r = Math.random() * SPIN.reduce((a, s) => a + s.w, 0), i = 0;
      while (r >= SPIN[i].w) { r -= SPIN[i].w; i++; }
      const s = SPIN[i];
      // the reward is granted right away so closing the window mid-spin loses nothing
      S.spin.last = dayKey(); S.wallet[s.give] += s.n; gainExp(EXP.spin); persist(); renderMenu();
      $('#spinGo').disabled = true; $('#spinGo').textContent = '…';
      spinAngle = spinAngle - (spinAngle % 360) + 360 * 6 + (360 - SL[i].mid) % 360 + (Math.random() - .5) * SL[i].sz * .6;
      const wh = $('#wheel'); wh.style.transform = `rotate(${spinAngle}deg)`;
      wh.addEventListener('transitionend', () => {
        if (!$('#spinNote')) return;
        $('#spinGo').textContent = 'Done';
        $('#spinNote').innerHTML = `<span class="spin-win ${s.jackpot ? 'jack' : ''}">${curIcon(s.give)}You won ${spinName(s)}!</span>`;
        if (s.jackpot) { const f = document.createElement('div'); f.className = 'tele-flash jackpot'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); toast('JACKPOT! You won a marriage ring!'); }
      }, { once: true });
    };
  } });
}
