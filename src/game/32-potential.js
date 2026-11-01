/* ---------- Potential: a board of upgrade plans per character (character screen → Potential tab) ----------
   One plan (page) for the base character plus one per star: 1 plan at 0★ … 7 plans at 6★ (POT_PAGES).
   Each plan has 6 upgrades bought in order; a plan opens once its star is reached and the plan before it is complete.
   Costs for now: 1 pearl per upgrade, 5 pearls for the 6th (the plan's core). Rewards come later; every upgrade gives
   +100 CS now (POT_CS, counts toward the grade). State S.pot[charId] = [upgrades bought per plan].
   From plan 2 on, every plan puts a gem above its star (star k ↔ plan k+1): faint when the plan is open, glowing
   when it is complete (potIcon, drawn by starRow). Badges: Hidden / Rising / Full Potential. */
const POT_PAGES = MAX_STARS + 1, POT_STEPS = 6, POT_CS = 100;
const potCost = step => step === POT_STEPS - 1 ? 5 : 1;   // step = 0-based upgrade index inside a plan
const potOf = cid => { S.pot = S.pot || {}; const a = S.pot[cid] || []; while (a.length < POT_PAGES) a.push(0); return a; };
const potPages = c => Math.min(POT_PAGES, 1 + starsOf(c.id));          // plans opened by stars
const potDone = (cid, k) => potOf(cid)[k] >= POT_STEPS;
const potDoneN = cid => potOf(cid).filter(n => n >= POT_STEPS).length;
const potTotal = cid => potOf(cid).reduce((t, n) => t + Math.min(POT_STEPS, n), 0);
const potOpen = (c, k) => owns(c.id) && k < potPages(c) && (k === 0 || potDone(c.id, k - 1));
/* the potential gem (owner's reference: a faceted teardrop with a swirl), in the summon-button crystal colours; replaceable as icon slot "potential" */
let potN = 0;   // every gem gets its own gradient ids (a gradient inside a hidden copy would not paint the others)
const POT_SVG_T = `<svg class="pot-svg" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="potG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe4f6"/><stop offset=".34" stop-color="#f5afe8"/><stop offset=".68" stop-color="#c8a2ff"/><stop offset="1" stop-color="#94b8ff"/></linearGradient>
  <radialGradient id="potH" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#c8a2ff" stop-opacity="0"/></radialGradient></defs>
  <circle cx="20" cy="23" r="17" fill="url(#potH)" opacity=".45"/>
  <path d="M5 26C4 15 13 7 23 8M35 21c1 9-6 16-15 16" fill="none" stroke="url(#potG)" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
  <path d="M20 5C25 12.5 30.5 17.5 30.5 25.5a10.5 10.5 0 0 1-21 0C9.5 17.5 15 12.5 20 5z" fill="url(#potG)" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/>
  <path d="M20 5L14.5 24.5L20 36L25.5 24.5Z M9.6 24.5H30.4" fill="none" stroke="#fff" stroke-width=".8" opacity=".55"/>
  <path d="M15.5 19.5q1.6-4.5 4.5-8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
  <path d="M31 6l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#fff"/></svg>`;
const potIcon = () => { if (customIcon('potential')) return `<img class="pot-svg" src="${customIcon('potential')}" alt="">`; const n = ++potN; return POT_SVG_T.replace(/potG/g, 'potG' + n).replace(/potH/g, 'potH' + n); };
ICONS.potential = '<path d="M12 3c3 4.5 6.5 7.5 6.5 12a6.5 6.5 0 0 1-13 0C5.5 10.5 9 7.5 12 3z"/><path d="M12 3l-3.5 12L12 21.5l3.5-6.5z"/>';
/* the gem shown above star i (0-based): plan i+2; '' when that plan isn't open yet */
function potStarIcon(c, i) {
  if (!c || c.type !== 'character' || !owns(c.id)) return '';
  const k = i + 1; if (k >= potPages(c)) return '';
  return `<i class="pot-ic ${potDone(c.id, k) ? 'done' : ''}" title="Potential plan #${k + 1}${potDone(c.id, k) ? ' complete' : ''}">${potIcon()}</i>`;
}

let potPage = 0;
function buyPot(c, k) {
  if (!potOpen(c, k)) { toast(k >= potPages(c) ? `Plan #${k + 1} opens at ${k}★.` : `Complete plan #${k} first.`); return; }
  const a = potOf(c.id), step = a[k]; if (step >= POT_STEPS) return;
  const cost = potCost(step);
  if (S.wallet.pearls < cost) { toast(`This upgrade costs ${cost} pearl${cost > 1 ? 's' : ''}. You have ${fmt(S.wallet.pearls)}.`); return; }
  S.wallet.pearls -= cost; a[k] = step + 1; S.pot[c.id] = a;
  persist(); renderMenu(); renderCharacters();
  toast(a[k] >= POT_STEPS ? `Plan #${k + 1} complete! ${k ? 'A potential gem lights up above star ' + k + '.' : ''}` : `Upgrade ${a[k]} / ${POT_STEPS} unlocked · +${POT_CS} CS`);
}
const POT_POS = [[16, 24], [50, 14], [84, 24], [84, 70], [50, 84], [50, 48]];   // the 6th (core) sits in the middle
function potTabHTML(c) {
  const pages = potPages(c); if (potPage >= POT_PAGES) potPage = 0;
  const k = potPage, a = potOf(c.id), n = Math.min(POT_STEPS, a[k]), open = potOpen(c, k), total = potTotal(c.id);
  const lines = POT_POS.slice(0, -1).map((p, i) => { const q = POT_POS[i + 1]; return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" class="${i + 1 < n ? 'on' : ''}"/>`; }).join('');
  const nodes = POT_POS.map(([x, y], i) => { const done = i < n, next = open && i === n, core = i === POT_STEPS - 1;
    return `<div class="pot-node ${core ? 'core' : ''} ${done ? 'done' : next ? 'next' : 'locked'}" style="left:${x}%;top:${y}%">
      <span class="pot-orb">${done ? (core ? potIcon() : icon('check')) : next ? (core ? potIcon() : `<b>${i + 1}</b>`) : icon('lock')}</span>
      <span class="pot-lbl">${core ? 'Core' : `Upgrade ${i + 1}`}<small>+${POT_CS} CS</small></span>${next ? '<span class="pot-next">NEXT</span>' : ''}</div>`; }).join('');
  return `<div class="pot">
    <div class="pot-head"><span class="pot-gem-big">${potIcon()}</span><div><b>Potential</b><span class="tiny">${total} / ${POT_PAGES * POT_STEPS} upgrades · +${fmt(total * POT_CS)} CS · ${potDoneN(c.id)} / ${POT_PAGES} plans complete</span></div></div>
    <div class="pot-pages">${Array.from({ length: POT_PAGES }, (_, i) => { const locked = i >= pages, done = potDone(c.id, i);
      return `<button class="pot-pg ${i === k ? 'on' : ''} ${locked ? 'locked' : ''} ${done ? 'done' : ''}" data-potpg="${i}" title="${locked ? `Opens at ${i}★` : `Plan #${i + 1}`}">#${i + 1}${locked ? `<small>${i}★</small>` : done ? `<small>${icon('check')}</small>` : ''}</button>`; }).join('')}</div>
    <div class="pot-board ${open ? '' : 'shut'}"><svg class="pot-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes}
      ${open ? '' : `<div class="pot-shut">${icon('lock')}<span>${k >= pages ? `Plan #${k + 1} opens when ${esc(c.name)} reaches ${k}★` : `Complete plan #${k} to open this one`}</span></div>`}</div>
    <div class="pot-foot">${n >= POT_STEPS ? `<span class="chip pot-ok">${icon('check')}Plan #${k + 1} complete</span>`
      : `<button class="btn gold" id="potBuy" ${open ? '' : 'disabled'}>Unlock ${n === POT_STEPS - 1 ? 'the core' : `upgrade ${n + 1}`} · ${costHTML(potCost(n))}</button>`}</div>
    <p class="tiny">Every star opens one more plan (up to ${POT_PAGES} at ${MAX_STARS}★). Each upgrade gives +${POT_CS} CS; their other rewards arrive in a future update. From plan #2 on, a gem above the matching star lights up when the plan is complete.</p>
  </div>`;
}
function bindPotTab(c) {
  csEl.querySelectorAll('[data-potpg]').forEach(b => b.onclick = () => { potPage = +b.dataset.potpg; renderCharacters(); });
  const bb = $('#potBuy'); if (bb) bb.onclick = () => buyPot(c, potPage);
}
