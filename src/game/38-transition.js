/* ---------- screen transition: a quick black hole ----------
   Opening a full-screen screen (Summon, Characters, Base, Shop, Bag, Events, Raids, the Plaza) plays a short black hole:
   a dark core ringed by a swirling pink / violet / ice-blue accretion disc swallows the screen from the middle (~200 ms),
   the new screen is drawn underneath, then the hole collapses back into a point (~280 ms). Re-opening a screen that is
   already up (refreshes, banner switches) and reduced-motion users skip it. */
const BH_IN = 200, BH_OUT = 280;
let bhBusy = false;
function blackHole(fn) {
  if (bhBusy || matchMedia('(prefers-reduced-motion: reduce)').matches) { fn(); return; }
  bhBusy = true;
  const el = document.createElement('div');
  el.className = 'bh'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="bh-disc"></i><i class="bh-core"></i>';
  document.body.appendChild(el);
  const spinIn = [{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)' }, { transform: 'translate(-50%,-50%) scale(1) rotate(160deg)' }];
  const spinOut = [{ transform: 'translate(-50%,-50%) scale(1) rotate(160deg)' }, { transform: 'translate(-50%,-50%) scale(0) rotate(360deg)' }];
  const parts = [...el.children];
  parts.forEach(p => p.animate(spinIn, { duration: BH_IN, easing: 'cubic-bezier(.4,.1,.7,.7)', fill: 'forwards' }));
  setTimeout(() => {
    try { fn(); } catch (e) { console.error(e); }
    parts.forEach(p => p.animate(spinOut, { duration: BH_OUT, easing: 'cubic-bezier(.15,.65,.45,1)', fill: 'forwards' }));
    el.animate([{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: BH_OUT, fill: 'forwards' });
    setTimeout(() => { el.remove(); bhBusy = false; }, BH_OUT + 20);
  }, BH_IN);
}
/* wrap a screen opener: only when that screen isn't already open */
const bhWrap = (fn, isOpen) => function (...a) { if (isOpen()) return fn.apply(this, a); blackHole(() => fn.apply(this, a)); };
openSummon = bhWrap(openSummon, () => !!smEl);
openCharacters = bhWrap(openCharacters, () => !!csEl || !charList().length);   // no characters yet: just the toast
openFarm = bhWrap(openFarm, () => !!fmEl);
openShop = bhWrap(openShop, () => !!shopEl);
openInventory = bhWrap(openInventory, () => !!invEl);
openEvents = bhWrap(openEvents, () => !!evEl);
openRaids = bhWrap(openRaids, () => !!raidEl);
$('#enterPlaza').onclick = () => blackHole(() => setMenu(false));
