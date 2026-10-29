/* boot */
(async function boot() {
  try { (await DB.all()).forEach(([k, v]) => MEDIA.set(k, v)); }
  catch (e) { console.warn('Image storage unavailable', e); }
  // move art saved by the first version (inside localStorage) into IndexedDB
  for (const e of S.pool) if (e.art && e.art.startsWith('data:')) { await mediaSet('art:' + e.id, e.art); e.art = 'idb:art:' + e.id; }
  persist();
  hydrateIcons();
  renderMenu();
  menuEl.inert = false;
  tickWorld(); setInterval(() => { if (menuOpen) tickWorld(); }, 6000);
  renderTitle();
  requestAnimationFrame(loop);
})();
setInterval(() => { if (menuOpen && !modalEl) renderMenu(); }, 60000);
