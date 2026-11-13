/* boot */
(async function boot() {
  try { (await DB.all()).forEach(([k, v]) => MEDIA.set(k, v)); }
  catch (e) { console.warn('Image storage unavailable', e); }
  // images kept in the preview's file storage (see mediaSet)
  for (const [k, v] of Object.entries(S.media || {})) { const src = assetSrc(v); if (src) MEDIA.set(k, src); }
  // connect to the server (if configured) before anything is drawn; give up after 8 s and play offline
  const cloud = await Promise.race([initBackend(), new Promise(r => setTimeout(() => r('timeout'), 8000))]);
  if (cloud === 'reload') return;
  if (cloud === 'timeout') { Backend.on = false; cloudStatus = 'offline'; console.warn('Server did not answer in time, playing offline'); }
  ensureRaidSet();   // server content may predate the raid sets
  if (S.settings && !S.settings.hmV) { S.settings.hmSize = 'large'; S.settings.hmV = 1; }   // Large is the default home screen size (the owner's ask): saves that picked Normal before switch once
  // move art saved by the first version (inside localStorage) into IndexedDB
  for (const e of S.pool) if (e.art && e.art.startsWith('data:')) { await mediaSet('art:' + e.id, e.art); e.art = 'idb:art:' + e.id; }
  // keep the save we just loaded cleanly as the backup (used if the main copy is ever unreadable), then save
  if (LOAD_RAW) { try { if (LOAD_RAW.raw) localStorage.setItem(KEY + '.bak', LOAD_RAW.raw); if (LOAD_RAW.rawC) localStorage.setItem(CONTENT_KEY + '.bak', LOAD_RAW.rawC); } catch (e) {} LOAD_RAW = null; }
  mailTidy();   // older saves only hid deleted letters
  persist();
  if (LOAD_FAIL) setTimeout(() => toast(LOAD_FAIL.restored || LOAD_FAIL.restoredC ? 'Your save could not be read, so the last backup was loaded. The unreadable copy was kept.' : 'Your save could not be read. A copy of it was kept, and a new save was started.', true), 2500);
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
