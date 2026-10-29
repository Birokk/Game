/* boot */
(async function boot() {
  try { (await DB.all()).forEach(([k, v]) => MEDIA.set(k, v)); }
  catch (e) { console.warn('Image storage unavailable', e); }
  // connect to the server (if configured) before anything is drawn; give up after 8 s and play offline
  const cloud = await Promise.race([initBackend(), new Promise(r => setTimeout(() => r('timeout'), 8000))]);
  if (cloud === 'reload') return;
  if (cloud === 'timeout') { Backend.on = false; cloudStatus = 'offline'; console.warn('Server did not answer in time, playing offline'); }
  // move art saved by the first version (inside localStorage) into IndexedDB
  for (const e of S.pool) if (e.art && e.art.startsWith('data:')) { await mediaSet('art:' + e.id, e.art); e.art = 'idb:art:' + e.id; }
  persist();
  hydrateIcons();
  renderMenu();
  menuEl.inert = false;
  tickWorld(); setInterval(() => { if (menuOpen) tickWorld(); }, 6000);
  updateAdminAccess();
  startNet();
  renderTitle();
  booted = true;
  requestAnimationFrame(loop);
})();
setInterval(() => { if (menuOpen && !modalEl) renderMenu(); }, 60000);
