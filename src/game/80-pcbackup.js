/* =========================================================
   BACKUP FOR PC (the owner's ask: a backup to download that opens on localhost, with every uploaded image saved under
   its own path). Admin → Game pool → Backup and import / Admin → Server → "Download backup for PC (.zip)" packs a
   folder `backup/`:
     backup/content.json   format 'blank-folder-1': the shared content (S.media values = "f:images/<path>"), the
                           player progress, savedAt
     backup/images/...     every image as its own file, path = its media key split on ":" (art:aria → images/art/aria.png)
     backup/README.txt
   On a PC copy of the project, unzip it into `public/` (→ public/backup/content.json). At boot (`pcFolderLoad`, called
   from 17-boot.js) the game fetches backup/content.json: a backup it has not seen yet (savedAt) replaces the content
   (and, on the very first load, the player progress); its images are always read from backup/images/… Uploading a new
   picture in admin afterwards stores it in the browser as usual (its manifest value is no longer "f:"). Not used inside
   the claude.ai preview or with the server connected.
   ========================================================= */
const PC_STAMP = 'prismplaza.pcbackup';
/* CRC-32 + a store-only zip (images are already compressed) */
const PC_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const pcCrc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = PC_CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function pcZip(files) {   // files: [{name, data: Uint8Array}] → Blob
  const enc = new TextEncoder(), parts = [], cen = [], d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  let off = 0;
  for (const f of files) {
    const nm = enc.encode(f.name), crc = pcCrc(f.data), sz = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, sz, true); h.setUint32(22, sz, true);
    h.setUint16(26, nm.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true); c.setUint32(20, sz, true); c.setUint32(24, sz, true);
    c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    cen.push(new Uint8Array(c.buffer), nm);
    off += 30 + nm.length + sz;
  }
  const cenSize = cen.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cenSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)], { type: 'application/zip' });
}
const PC_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp' };
/* an image (data:, blob:, cloud or preview URL) → its bytes and type */
async function pcImageBytes(v) {
  let blob = null;
  if (v.startsWith('data:')) blob = dataUrlToBlob(v);
  else { try { blob = await (await fetch(v)).blob(); } catch (e) { blob = dataUrlToBlob(await imageToDataUrl(v)); } }
  if (!blob || !blob.size) throw new Error('empty image');
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type || 'image/png' };
}
/* media key → a safe file path that works on Windows, macOS and Linux and in a URL */
const pcSafe = s => (s.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '_') || '_').slice(0, 80);
async function pcBackupZip(say) {
  const keys = [...MEDIA.keys()].sort(), files = [], media = {}, used = new Set(), failed = [];
  let i = 0;
  for (const k of keys) {
    const v = MEDIA.get(k); say && say(`Packing images ${++i}/${keys.length}…`);
    if (typeof v !== 'string') continue;
    try {
      const { bytes, type } = await pcImageBytes(v), ext = PC_EXT[type.split(';')[0]] || 'png';
      let base = 'images/' + k.split(':').map(pcSafe).join('/'), p = `${base}.${ext}`, n = 2;
      while (used.has(p.toLowerCase())) p = `${base}_${n++}.${ext}`;
      used.add(p.toLowerCase()); files.push({ name: 'backup/' + p, data: bytes }); media[k] = 'f:' + p;
    } catch (e) { failed.push(k); console.warn('Could not pack', k, e); }
  }
  const { content, save } = splitState(S), savedAt = new Date().toISOString();
  const out = { format: 'blank-folder-1', savedAt, content: { ...content, media }, player: save, images: Object.keys(media).length, failed };
  const enc = new TextEncoder();
  files.unshift({ name: 'backup/content.json', data: enc.encode(JSON.stringify(out)) },
    { name: 'backup/README.txt', data: enc.encode(`Blank: Project backup · ${savedAt}\r\n\r\n` +
      `content.json  = every character, banner, outfit, event, offer, layout and setting made in the admin panel, plus the player progress.\r\n` +
      `images/       = every uploaded picture, one file each, saved under its own path (the media key: art:aria -> images/art/aria.png).\r\n\r\n` +
      `To open it on your PC:\r\n` +
      `1. Get the project (git clone, or the project zip) and run "npm install" once.\r\n` +
      `2. Copy this "backup" folder into the project's "public" folder, so you have public/backup/content.json.\r\n` +
      `3. Run "npm run dev" and open the address it shows (http://localhost:5173).\r\n` +
      `The game loads this backup by itself. A newer backup folder replaces the content the next time the game starts;\r\n` +
      `the player progress is only taken the first time, so your local progress is never overwritten.\r\n` +
      `For a built copy: "npm run build", then "npm run preview" (the backup folder is copied into dist/).\r\n` +
      (failed.length ? `\r\nThese images could not be read and are missing: ${failed.join(', ')}\r\n` : '')) });
  return { blob: pcZip(files), count: Object.keys(media).length, failed };
}
const pcZipName = () => `blank-project-pc-backup-${new Date().toISOString().slice(0, 10)}.zip`;
async function downloadPcBackup(area) {
  const say = t => { if (area) area.innerHTML = `<p class="tiny" style="margin-top:8px">${t}</p>`; };
  let r;
  try { r = await pcBackupZip(say); } catch (e) { say('Could not make the backup: ' + esc(e.message || String(e))); return; }
  const mb = (r.blob.size / 1048576).toFixed(1), note = `${r.count} images${r.failed.length ? `, ${r.failed.length} could not be read` : ''}`;
  const dl = window.claude && window.claude.use ? await Promise.race([window.claude.use('downloads'), new Promise(x => setTimeout(() => x(null), 3000))]).catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename: pcZipName(), data: r.blob }); say(`Backup saved (${mb} MB, ${note}): ${pcZipName()}. Unzip it into the project's <b>public</b> folder, then run <b>npm run dev</b>.`); }
    catch (e) { say(e && e.code === 'declined' ? 'Download cancelled.' : 'This page could not save a file.'); }
    return;
  }
  const url = URL.createObjectURL(r.blob), a = document.createElement('a');
  a.href = url; a.download = pcZipName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  say(`Backup downloaded (${mb} MB, ${note}): ${pcZipName()}. Unzip it into the project's <b>public</b> folder, then run <b>npm run dev</b>.`);
}
/* at boot on a PC copy: read public/backup/ if it is there */
let pcLoaded = null;
async function pcFolderLoad() {
  if (CLOUD_CONFIGURED || (window.claude && window.claude.use)) return;
  let d = null;
  try { const r = await fetch('backup/content.json', { cache: 'no-store' }); if (r.ok) d = await r.json(); } catch (e) { return; }   // the dev server answers missing files with index.html: not JSON
  if (!d || d.format !== 'blank-folder-1' || !d.content || !Array.isArray(d.content.pool)) return;
  let stamp = null; try { stamp = localStorage.getItem(PC_STAMP); } catch (e) {}
  if (stamp !== d.savedAt) {
    applyContent(d.content);
    if (!stamp && d.player && typeof d.player === 'object') for (const [k, v] of Object.entries(d.player)) if (!CONTENT_KEYS.includes(k)) S[k] = v;   // progress only the first time
    try { localStorage.setItem(PC_STAMP, d.savedAt); } catch (e) {}
    pcLoaded = { first: !stamp, at: d.savedAt, n: d.images || 0 };
  }
  for (const [k, v] of Object.entries(S.media || {})) if (typeof v === 'string' && v.startsWith('f:')) MEDIA.set(k, 'backup/' + v.slice(2).split('/').map(encodeURIComponent).join('/'));
  if (pcLoaded) setTimeout(() => toast(`Loaded the backup from ${new Date(pcLoaded.at).toLocaleString()} (${pcLoaded.n} images${pcLoaded.first ? ', with its progress' : ''}).`), 2600);
}
/* the button in admin → Game pool → Backup and import, and admin → Server */
{ const p0 = renderPoolTab;
  renderPoolTab = function () {
    p0.apply(this, arguments);
    const row = $('#adDownload') && $('#adDownload').parentElement; if (!row || $('#adPcZip')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn gold sm'; b.id = 'adPcZip'; b.innerHTML = `${icon('upload')}Download backup for PC (.zip)`;
    row.prepend(b); b.onclick = () => downloadPcBackup($('#adDataArea'));
    const p = row.previousElementSibling; if (p) p.insertAdjacentHTML('afterend', '<p class="tiny"><b>Backup for PC</b>: a zip with a <b>backup</b> folder: content.json and every image as its own file under its own path (art:aria → images/art/aria.png). Unzip it into the project\'s <b>public</b> folder and the game on localhost loads it by itself.</p>');
  }; }
{ const s0 = typeof renderServerTab === 'function' ? renderServerTab : null;
  if (s0) renderServerTab = async function () {
    const r = await s0.apply(this, arguments), host = $('#adPanel'); if (!host || $('#adPcZip2')) return r;
    const box = document.createElement('div'); box.className = 'ad-card'; box.style.marginTop = '14px';
    box.innerHTML = `<div><h3>Backup for PC</h3><p class="tiny">Downloads a zip with a <b>backup</b> folder: content.json (all content + your progress) and every uploaded image as its own file under its own path. Unzip it into the project's <b>public</b> folder and run <b>npm run dev</b>: the game on localhost loads it by itself.${pcLoaded ? ` This page loaded a backup from ${esc(new Date(pcLoaded.at).toLocaleString())}.` : ''}</p>
      <div class="row"><button type="button" class="btn gold sm" id="adPcZip2">${icon('upload')}Download backup for PC (.zip)</button></div><div id="adPcArea"></div></div>`;
    host.appendChild(box); $('#adPcZip2').onclick = () => downloadPcBackup($('#adPcArea'));
    return r;
  }; }

/* its own admin page (Testing & server → Backup for PC), the owner couldn't find the button inside Game pool */
function renderBackupTab() {
  const keys = [...MEDIA.keys()], chars = S.pool.filter(e => e.type === 'character').length;
  $('#adPanel').innerHTML = `<div class="pcb">
    <div class="pcb-card main"><div><h3>Backup for PC</h3><p class="tiny">One zip with everything you made here and every picture you uploaded, so the game runs on your computer at localhost with all of it.</p></div>
      <div class="row" style="gap:10px;flex-wrap:wrap;margin:10px 0"><span class="chip">${icon('image')}${keys.length} images</span><span class="chip">${icon('chars')}${chars} characters</span><span class="chip">${icon('book')}${S.pool.length} pool entries</span></div>
      <div class="row"><button type="button" class="btn gold" id="adPcZip3">${icon('upload')}Download backup for PC (.zip)</button></div><div id="adPcArea3"></div></div>
    <div class="pcb-card"><div><h3>What is inside</h3><p class="tiny">A folder <b>backup</b> with <b>content.json</b> (characters, banners, outfits, events, offers, layouts, settings and your progress), <b>images/</b> (every uploaded picture as its own file, under its own path: art:aria → images/art/aria.png) and <b>README.txt</b>.</p></div></div>
    <div class="pcb-card"><div><h3>How to use it on your PC</h3><ol class="tiny" style="margin:6px 0 0;padding-left:18px;line-height:1.7">
      <li>Install Node.js from nodejs.org, once.</li>
      <li>Unzip the project zip (the game's code).</li>
      <li>Unzip this backup into the project's <b>public</b> folder (make the folder if it isn't there), so you have <b>public/backup/content.json</b>.</li>
      <li>Double-click <b>start-windows.bat</b> (Mac / Linux: <b>sh start-mac-linux.sh</b>). The game opens at localhost and loads the backup by itself.</li></ol>
      <p class="tiny" style="margin-top:8px">Make the backup in the same browser where you uploaded your pictures: they are kept in that browser.${pcLoaded ? ` This page loaded a backup from ${esc(new Date(pcLoaded.at).toLocaleString())}.` : ''}</p></div></div>
  </div>`;
  $('#adPcZip3').onclick = () => downloadPcBackup($('#adPcArea3'));
}
