/* ---------- memory stars look + hold-to-view ----------
   Memories have 0–3 stars (MEM_MAXST; copies and fusing live in 26-fusion.js: memCopiesSt, memCopies, fuseMemStar).
   Every memory picture sits in a frame whose border follows its stars (.mem-fr.mst0–3): 0★ white, 1★ R blue,
   2★ SSR orange, 3★ the UR prism colours, animated. Holding any element with data-memview="memId|stars" for a moment
   opens the memory big in the middle of a transparent screen (openMemView); a tap anywhere closes it. */
const MEM_MAXST = 3;
const memStarRow = (st, cls = '') => `<span class="mem-st ${cls}" aria-label="${st} of ${MEM_MAXST} stars">${Array.from({ length: MEM_MAXST }, (_, i) => `<i class="${i < st ? 'on' : ''}">★</i>`).join('')}</span>`;
function openMemView(id, st) {
  const m = memOf(id); if (!m) return;
  const old = document.querySelector('.memview'); if (old) old.remove();
  const art = artFrom(m.img), el = document.createElement('div');
  el.className = 'memview'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', m.name);
  el.innerHTML = `<div class="mv-card mem-fr mst${st}">${art ? `<img src="${art}" alt="${esc(m.name)}">` : `<span class="wd-ph">${icon('memory')}</span>`}</div>
    <div class="mv-info">${rtag(m.rarity)}<b class="ts">${esc(m.name)}</b>${memStarRow(st, 'big')}${m.desc ? `<p>${esc(m.desc)}</p>` : ''}</div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 180); document.removeEventListener('keydown', key); };
  const key = e => { if (e.key === 'Escape') close(); };
  el.addEventListener('click', close);
  document.addEventListener('keydown', key);
  document.body.appendChild(el);
}
/* hold (about half a second) to view; the click that ends a hold doesn't also equip / select */
(() => {
  let t = null, sx = 0, sy = 0, fired = false;
  const cancel = () => { clearTimeout(t); t = null; };
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-memview]'); if (!el) return;
    sx = e.clientX; sy = e.clientY; fired = false; cancel();
    t = setTimeout(() => { t = null; fired = true; const [id, st] = el.dataset.memview.split('|'); openMemView(id, +st || 0); }, 480);
  });
  document.addEventListener('pointermove', e => { if (t && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel(); });
  document.addEventListener('pointerup', cancel);
  document.addEventListener('pointercancel', cancel);
  document.addEventListener('click', e => { if (fired && e.target.closest('[data-memview]')) { e.stopPropagation(); e.preventDefault(); fired = false; } }, true);
  document.addEventListener('contextmenu', e => { if (e.target.closest('[data-memview]')) e.preventDefault(); });
})();
