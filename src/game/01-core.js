/* =========================================================
   Blank: Project — gacha template
   Sections: helpers · media store · data · art · menu & wallpaper · modals · gacha · admin · world
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Number(n || 0).toLocaleString('en-US');

/* ---------- media store (IndexedDB: splash art + custom icons) ---------- */
const MEDIA = new Map();
const DB = {
  _p: null,
  open() {
    if (!this._p) this._p = new Promise((res, rej) => {
      try { const r = indexedDB.open('prismplaza', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
    return this._p;
  },
  async run(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('media', mode); fn(tx.objectStore('media')); tx.oncomplete = () => res(); tx.onerror = tx.onabort = () => rej(tx.error); }); },
  set(k, v) { return this.run('readwrite', s => s.put(v, k)); },
  del(k) { return this.run('readwrite', s => s.delete(k)); },
  async all() { const db = await this.open(); return new Promise((res, rej) => { const out = []; const tx = db.transaction('media', 'readonly'); const cur = tx.objectStore('media').openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out.push([c.key, c.value]); c.continue(); } }; tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); }); }
};
/* media goes through here: the browser cache (IndexedDB) always, and the cloud (Backend) when it is connected.
   S.media is the shared manifest { key: version } so every player can find the admin's images */
/* in the claude.ai preview, images go to the preview's own file storage ("assets" capability): browser storage there can be
   blocked or wiped. The manifest then holds "a:<asset id>" and the image is served from /_blob/<id>. */
/* data: URL → Blob without fetch() (the claude.ai preview's security rules block fetching data: URLs) */
function dataUrlToBlob(u) {
  const i = u.indexOf(','), head = u.slice(5, i), b64 = head.endsWith(';base64'), type = head.split(';')[0] || 'application/octet-stream';
  const body = u.slice(i + 1), bin = b64 ? atob(body) : decodeURIComponent(body), bytes = new Uint8Array(bin.length);
  for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
  return new Blob([bytes], { type });
}
/* any image URL → data URL: fetch when allowed, otherwise draw it on a canvas */
async function imageToDataUrl(src) {
  if (src.startsWith('data:')) return src;
  try { const b = await (await fetch(src)).blob(); return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); }); }
  catch (e) {
    const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('image did not load')); i.src = src; });
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', .92);
  }
}
let previewAssetsP = null;
const previewAssets = () => previewAssetsP || (previewAssetsP = (!CLOUD_CONFIGURED && window.claude && window.claude.use)
  ? Promise.race([window.claude.use('assets'), new Promise(r => setTimeout(() => r(null), 4000))]).catch(() => null) : Promise.resolve(null));
const assetSrc = v => typeof v === 'string' && v.startsWith('a:') ? '/_blob/' + v.slice(2) : null;
async function mediaSet(k, v) {
  let src = v, ver = Date.now();
  if (Backend.canEditContent()) {
    try { src = await Backend.upload(k, v); } catch (e) { toast(`Upload failed: ${e.message}`, true); return false; }
  } else {
    const pa = await previewAssets();
    if (pa) {
      try { const r = await pa.upload(dataUrlToBlob(v)); src = r.url; ver = 'a:' + r.id; }
      catch (e) { toast(`Could not save the image in the preview: ${(e && (e.message || e.code)) || e}`, true); return false; }
    }
  }
  const old = S.media && S.media[k];
  MEDIA.set(k, src); S.media = { ...S.media, [k]: ver }; persist();
  if (assetSrc(old)) previewAssets().then(pa => pa && pa.delete(old.slice(2))).catch(() => {});
  try { await DB.set(k, v); } catch (e) { if (!Backend.on && !assetSrc(ver)) { toast('This browser blocked saving the image, so it will be gone after a reload. Try another browser, or connect the server.', true); return false; } }
  return true;
}
async function mediaDel(k) {
  const old = S.media && S.media[k];
  MEDIA.delete(k); if (S.media) { const m = { ...S.media }; delete m[k]; S.media = m; persist(); }
  if (Backend.canEditContent()) Backend.remove(k).catch(() => {});
  if (assetSrc(old)) previewAssets().then(pa => pa && pa.delete(old.slice(2))).catch(() => {});
  try { await DB.del(k); } catch (e) {}
}
/* standard character splash art: 1728×972 (16:9). Uploads keep that size; full-screen views cover the screen with it */
const SPLASH_MAX = 1728, SPLASH_SIZE = [1728, 968], PET_SIZE = [1254, 1254];   // pets' splash arts are square   // every character / skin art is cropped to exactly this size
/* exact = [w, h]: cover-crop to exactly that size (keeping the middle across and the upper part top to bottom, like the art views) */
function resizeImage(file, max, type = 'image/webp', exact) {
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith('image/')) return rej(new Error('That file is not an image. Pick a PNG, JPG, WebP or SVG.'));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || max, h = img.naturalHeight || max, k = Math.min(1, max / Math.max(w, h));
        const c = document.createElement('canvas');
        if (exact) {
          c.width = exact[0]; c.height = exact[1]; const s = Math.max(c.width / w, c.height / h), dw = w * s, dh = h * s;
          c.getContext('2d').drawImage(img, (c.width - dw) / 2, (c.height - dh) * .3, dw, dh);
        } else { c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); }
        let url = c.toDataURL(type, 0.9);
        if (!url.startsWith('data:' + type)) url = c.toDataURL('image/png');
        res(url);
      };
      img.onerror = () => rej(new Error('Could not read that image. Try another file.'));
      img.src = reader.result;
    };
    reader.onerror = () => rej(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/* ---------- icons ---------- */
const ICONS = {
  farm:'<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/><path d="M9 10h6"/>',
  up:'<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  memory:'<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M7 6V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/><path d="M3 15l4-4 3 3 2-2 5 5"/>',
  wardrobe:'<path d="M8.5 4L4 6.8l1.8 4 2.2-1V20h8V9.8l2.2 1 1.8-4L15.5 4c-.6 1.5-1.9 2.4-3.5 2.4S9.1 5.5 8.5 4z"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7.5l8 6 8-6"/>',
  gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3z"/><path d="M14.7 6.3L17 4l3 3-2.3 2.3"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
  quests:'<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M8.5 9l1.6 1.6L13.5 7.5M8.5 15h7"/>',
  friends:'<circle cx="9" cy="9" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="8.5" r="2.5"/><path d="M16 13.5a4.5 4.5 0 0 1 5 5"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  shop:'<path d="M5 8.5h14l-1.1 10.7a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z"/><path d="M9 8.5a3 3 0 0 1 6 0"/>',
  bag:'<rect x="4" y="7" width="16" height="13" rx="3"/><path d="M4 11.5h16M9 7V5h6v2M11 11.5v2h2v-2"/>',
  team:'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  skins:'<path d="M8.5 4L4 7l2 4 2-1v10h8V10l2 1 2-4-4.5-3a3.5 3.5 0 0 1-7 0z"/>',
  chars:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  sparkle:'<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  door:'<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l4-4-4-4M14 12H4"/>',
  map:'<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  image:'<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 15.5l-5-5L7 19"/>',
  plus:'<path d="M12 6v12M6 12h12"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  send:'<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  smile:'<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  trash:'<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.6 3.4M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 5.4-1.8M9.9 9.9a3 3 0 0 0 4.2 4.2M3.5 3.5l17 17"/>',
  chat:'<path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3.5V17.5H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/>',
  home:'<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V9.5"/>',
  heart:'<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
  hanger:'<path d="M12 8.5a2.2 2.2 0 1 1 2.2-2.2c0 1.2-1 1.6-2.2 2.4v1.1"/><path d="M12 9.8L3.4 16a1 1 0 0 0 .6 1.8h16a1 1 0 0 0 .6-1.8z"/>',
  gift:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-1.5-3.5-6-3.8-6-1.5S10 9 12 9zM12 9c1.5-3.5 6-3.8 6-1.5S14 9 12 9z"/>',
  bolt:'<path d="M13 3L5 13.5h6L10 21l9-11.5h-6z"/>',
  ring:'<circle cx="12" cy="14.5" r="6"/><path d="M9 4.5h6l-3 3.5z"/>',
  wheel:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/><circle cx="12" cy="12" r="2.2"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'
};
const CUR_SVG = {
  coins:'<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#ffd36b" stroke="#c9952b" stroke-width="1.6"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#c9952b" stroke-width="1.4"/><path d="M12 9.2v5.6" stroke="#a8761a" stroke-width="1.8" stroke-linecap="round"/></svg>',
  pearls:'<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="pearlG" cx="34%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#f6eeff"/><stop offset=".75" stop-color="#cfbdf5"/><stop offset="1" stop-color="#9c88dc"/></radialGradient></defs><circle cx="12" cy="12" r="8.6" fill="url(#pearlG)" stroke="#8f7fc9" stroke-width="1"/><ellipse cx="9" cy="8.6" rx="2.6" ry="1.6" fill="#fff" opacity=".95"/><path d="M15.5 16.2a5 5 0 0 1-4 1.4" stroke="#ffc6e4" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  tickets:'<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" fill="#ffa8cc" stroke="#d65f93" stroke-width="1.3"/><path d="M15 6.5v11" stroke="#d65f93" stroke-width="1.3" stroke-dasharray="2 2"/></svg>'
};
CUR_SVG.stamina = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#1f6b4a" stroke="#7ef3d4" stroke-width="1.3"/><path d="M13.2 4.8L7.6 13h4l-1 6.2 5.8-8.4h-4.1z" fill="#d9ff7a" stroke="#4a8a2a" stroke-width=".8" stroke-linejoin="round"/></svg>';
CUR_SVG.fragssr = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 14c0-5.5 3.3-11 7.5-11s7.5 5.5 7.5 11l-2.6-1.8-2.4 2.6-2.5-2.8-2.5 2.8-2.4-2.6z" fill="#ffe9c8" stroke="#c97a2a" stroke-width="1.2" stroke-linejoin="round"/><circle cx="12" cy="7" r="1.4" fill="#ff8a2a"/><circle cx="8.8" cy="10" r="1" fill="#ffb067"/><circle cx="15.3" cy="9.6" r="1" fill="#ffb067"/><path d="M6 17.5l2.4-1.6 2 1.8 1.6-1.4 1.8 1.6 2-1.8 2.2 1.4c-1 2.6-3.3 4-6 4s-5-1.4-6-4z" fill="#ffe9c8" stroke="#c97a2a" stroke-width="1.1" stroke-linejoin="round" opacity=".85"/></svg>';
CUR_SVG.fragur = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="urFragG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c58bff"/><stop offset=".5" stop-color="#ff6ec7"/><stop offset="1" stop-color="#3ee6d0"/></linearGradient></defs><path d="M4.5 14c0-5.5 3.3-11 7.5-11s7.5 5.5 7.5 11l-2.6-1.8-2.4 2.6-2.5-2.8-2.5 2.8-2.4-2.6z" fill="url(#urFragG)" stroke="#6b3fd1" stroke-width="1.2" stroke-linejoin="round"/><path d="M9 6.5l.7 1.6 1.6.7-1.6.7L9 11.1l-.7-1.6-1.6-.7 1.6-.7z" fill="#fff"/><path d="M6 17.5l2.4-1.6 2 1.8 1.6-1.4 1.8 1.6 2-1.8 2.2 1.4c-1 2.6-3.3 4-6 4s-5-1.4-6-4z" fill="url(#urFragG)" stroke="#6b3fd1" stroke-width="1.1" stroke-linejoin="round" opacity=".85"/></svg>';
CUR_SVG.rings = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14.5" r="6.3" fill="none" stroke="#e8b04a" stroke-width="2.6"/><circle cx="12" cy="14.5" r="6.3" fill="none" stroke="#fff3c2" stroke-width=".8"/><polygon points="12,2.5 16,6 12,9.5 8,6" fill="#e6f8ff" stroke="#5ab8ff" stroke-width="1"/><path d="M10 5h4" stroke="#fff" stroke-width=".7"/></svg>';
CUR_SVG.gsweets = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 12L2.5 8.5v7z" fill="#ffd36b" stroke="#a8761a" stroke-width="1" stroke-linejoin="round"/><path d="M17 12l4.5-3.5v7z" fill="#ffd36b" stroke="#a8761a" stroke-width="1" stroke-linejoin="round"/><circle cx="12" cy="12" r="5.5" fill="#ff5f7a" stroke="#a3172a" stroke-width="1.1"/><path d="M8.5 10c2-1.5 5-1.5 7 0M8.5 14c2 1.5 5 1.5 7 0" stroke="#fff" stroke-width="1" fill="none"/></svg>';
CUR_SVG.gbracelet = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true">' + Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return `<circle cx="${(12 + Math.cos(a) * 7).toFixed(1)}" cy="${(12 + Math.sin(a) * 7).toFixed(1)}" r="2.4" fill="${i % 3 ? '#f6eeff' : '#ffc6e4'}" stroke="#8f7fc9" stroke-width=".8"/>`; }).join('') + '</svg>';
CUR_SVG.gplush = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20l1.4-6.4-4.9-4.4 6.5-.7z" fill="#ffd36b" stroke="#a8761a" stroke-width="1.1" stroke-linejoin="round"/><circle cx="10" cy="11" r=".9" fill="#3a2630"/><circle cx="14" cy="11" r=".9" fill="#3a2630"/><path d="M10.6 13.3q1.4 1 2.8 0" stroke="#3a2630" stroke-width=".8" fill="none"/><circle cx="8.4" cy="12.8" r=".9" fill="#ff9ec4"/><circle cx="15.6" cy="12.8" r=".9" fill="#ff9ec4"/></svg>';
CUR_SVG.bottles = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9.5" y="2.5" width="5" height="3" rx="1" fill="#a8714a" stroke="#5a3424" stroke-width=".9"/><path d="M10 5.5h4v3.2c3 1.2 4.5 3.6 4.5 6.3a6.5 6.5 0 0 1-13 0c0-2.7 1.5-5.1 4.5-6.3z" fill="#e6fff7" stroke="#2f8a6a" stroke-width="1.1"/><path d="M6.6 14.5h10.8a5.4 5.4 0 0 1-10.8 0z" fill="#7ef3d4"/><path d="M12.6 11.2l-2.2 3.4h1.8l-.8 3.2 2.6-3.9h-1.8z" fill="#d9ff7a" stroke="#2f6a2a" stroke-width=".5"/></svg>';
CUR_SVG.bondheart = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="bondHG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffd6e6"/><stop offset=".5" stop-color="#ff6f91"/><stop offset="1" stop-color="#b8325a"/></radialGradient></defs><path d="M12 21C5 16.3 2.5 12.6 2.5 9A4.7 4.7 0 0 1 12 6.4 4.7 4.7 0 0 1 21.5 9c0 3.6-2.5 7.3-9.5 12z" fill="url(#bondHG)" stroke="#7a1f3e" stroke-width="1.2" stroke-linejoin="round"/><path d="M6.5 8.2a2.4 2.4 0 0 1 2.6-1.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".85"/></svg>';
CUR_SVG.wishes = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4z" fill="#8ff0dc" stroke="#2a9a86" stroke-width="1.3"/><path d="M15 6.5v11" stroke="#2a9a86" stroke-width="1.3" stroke-dasharray="2 2"/><circle cx="9.5" cy="12" r="2.6" fill="#f6eeff" stroke="#8f7fc9" stroke-width=".9"/></svg>';
CUR_SVG.dust = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 22c-2-4 2-6 0-10s2-6 1-9" fill="none" stroke="#2f9a5a" stroke-width="3.2" stroke-linecap="round"/><path d="M8 22c-2-4 2-6 0-10s2-6 1-9" fill="none" stroke="#7be0a0" stroke-width="1.4" stroke-linecap="round"/><path d="M15 22c2-3-1-5 1-8s-1-5 1-8" fill="none" stroke="#1f7a46" stroke-width="3" stroke-linecap="round"/><path d="M15 22c2-3-1-5 1-8s-1-5 1-8" fill="none" stroke="#5fd08a" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="11.5" cy="22" rx="7" ry="1.4" fill="#d9c79a"/></svg>';
CUR_SVG.starlight = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="coG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3c8"/><stop offset="1" stop-color="#ff4f7b"/></linearGradient></defs><path d="M12 22V14M12 14l-4-4V6M12 14l4-5V5M8 10L5 8V4.5M16 9l3-2V3.5M12 18l-3-2" fill="none" stroke="url(#coG)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 22V14M12 14l-4-4V6M12 14l4-5V5M8 10L5 8V4.5M16 9l3-2V3.5" fill="none" stroke="#fff0f4" stroke-width=".8" stroke-linecap="round" opacity=".6"/><circle cx="8" cy="5.5" r="1.4" fill="#ffd3df"/><circle cx="16" cy="4.5" r="1.4" fill="#ffd3df"/><circle cx="5" cy="4" r="1.2" fill="#ffd3df"/><circle cx="19" cy="3" r="1.2" fill="#ffd3df"/><ellipse cx="12" cy="22" rx="6" ry="1.3" fill="#d9c79a"/></svg>';
const customIcon = k => MEDIA.get('icon:' + k);
const icon = n => customIcon(n) ? `<img class="ic" src="${customIcon(n)}" alt="">` : `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const curIcon = k => customIcon(k) ? `<img class="cic" src="${customIcon(k)}" alt="">` : CUR_SVG[k];
const costHTML = n => `<span class="cost">${curIcon('pearls')}${n}</span>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-ic]').forEach(el => { el.innerHTML = icon(el.dataset.ic); }); }
const ICON_SLOTS = [
  ['Currencies', [['coins', 'Gold coins'], ['pearls', 'Pearls'], ['tickets', 'Limited tickets'], ['wishes', 'Standard tickets (permanent banner)'], ['stamina', 'Stamina'], ['fragssr', 'SSR egg fragment'], ['fragur', 'UR egg fragment'], ['rings', 'Rings'], ['bottles', 'Stamina bottle'], ['dust', 'Seaweeds'], ['starlight', 'Corals'], ['gsweets', 'Gift: Lantern Sweets'], ['gbracelet', 'Gift: Pearl Bracelet'], ['gplush', 'Gift: Star Plushie'], ['exp', 'EXP (shown on EXP rewards)'], ['qpt', 'Daily quest points']]],
  ['Main menu', [['mail', 'Mail'], ['gear', 'Settings'], ['wrench', 'Admin'], ['close', 'Close menu'], ['image', 'Wallpaper'], ['calendar', 'Events'], ['quests', 'Quests'], ['friends', 'Friends'], ['trophy', 'Ranking'], ['shop', 'Shop'], ['bag', 'Bag'], ['team', 'Team'], ['skins', 'Skins'], ['chars', 'Characters'], ['sparkle', 'Summon'], ['door', 'Enter Plaza'], ['gift', 'Daily login'], ['wheel', 'Daily spin'], ['eyeOff', 'Hide UI'], ['eye', 'Show UI / view art'], ['chat', 'World chat'], ['level', 'Level rewards']]],
  ['Character screen', [['home', 'Home'], ['heart', 'Bond'], ['info', 'Character info'], ['hanger', 'Outfits'], ['wardrobe', 'Wardrobe'], ['memory', 'Memory'], ['lock', 'Locked'], ['bondheart', 'Bond level heart']]],
  ['Plaza', [['map', 'Map'], ['grid', 'Menu button'], ['smile', 'Emotes'], ['send', 'Send chat']]],
  ['Small UI', [['clock', 'Timer'], ['plus', 'Plus'], ['edit', 'Edit'], ['trash', 'Delete'], ['upload', 'Upload'], ['copy', 'Copy'], ['back', 'Back'], ['check', 'Selected']]]
];
const CUR_KEYS = ['coins', 'pearls', 'tickets', 'wishes', 'rings', 'bottles', 'dust', 'starlight'];

const RARITY = { 3:{ color:'#74c7ff' }, 4:{ color:'#ffaa5c' }, 5:{ color:'#c77dff' }, 6:{ color:'#ff4f7b' } };
const RNAME = { 4: 'SSR', 5: 'UR', 6: 'MR' };
const rtag = (r, cls = '') => RNAME[r] ? `<span class="rtag r${r} ${cls}">${RNAME[r]}</span>` : '';
const TYPES = { character:'Character', skin:'Skin', pet:'Pet', collectible:'Collectible', item:'Item' };
const HAIR_STYLES = ['Short', 'Long', 'Spiky', 'Ponytail', 'Bun'];

const COST = { 1: 3, 10: 30 };
const HARD_PITY = 50, BASE5 = 0.02, BASE4 = 0.051, COIN_DROP = 500;
const MAX_STARS = 6;
const starsOf = id => { const e = findEntry(id); return e && !hasStars(e) ? 0 : Math.max(0, Math.min(MAX_STARS, (S.owned[id] || 0) - 1)); };
const hasStars = e => !!e && e.type !== 'skin' && e.type !== 'memory';
/* breakthrough: each owned star can be awakened into a glowing star in the character's rarity color */
const btOf = id => (S.bt[id] || []).filter(i => i < starsOf(id));
const starRow = (n, pop = -1, e = null) => { const bt = e ? btOf(e.id) : [], sss = e && e.type === 'character' ? sssActive(e) : []; return `<span class="stars6 ${e ? 'r' + e.rarity : ''}" aria-label="${n} of ${MAX_STARS} stars">${Array.from({ length: MAX_STARS }, (_, i) => `<span class="${i < n ? 'on' : ''} ${i === pop ? 'pop' : ''} ${bt.includes(i) ? 'bt' : ''} ${sss.includes(i) ? 'sss' : ''}">★</span>`).join('')}${e && e.type === 'character' ? csPlus(e) : ''}</span>`; };   // + after the stars from CS grade S
const starsFor = e => hasStars(e) ? starRow(starsOf(e.id), -1, e) : '';
const DUST_PER_PULL = 5, STARLIGHT = { 4: 5, 5: 10 }, STARLIGHT_MAX = { 4: 10, 5: 40 };
const FILLER_COINS = { 3: COIN_DROP, 4: 1500, 5: 10000 }, FRAG_SSR = .27, FRAG_UR = .08;

/* ---------- data & storage ----------
   S holds everything in memory, but it is saved in two parts:
   - content (CONTENT_KEYS): what the admin makes, shared by every player (pool, banners, clothes, memories, notices, media manifest)
   - the player save: everything else (wallet, owned, bond, settings, ...)
   Locally both go to localStorage; with the cloud on, the save syncs per account and content comes from the server. */
const KEY = 'prismplaza.v1', CONTENT_KEY = 'prismplaza.content.v1';
const CONTENT_KEYS = ['pool', 'featuredId', 'banners', 'clothes', 'memories', 'titleNews', 'loadArts', 'media', 'farmLayout', 'events', 'fakeArts', 'upArts', 'mystery'];
const splitState = st => { const save = {}, content = {}; for (const [k, v] of Object.entries(st)) (CONTENT_KEYS.includes(k) ? content : save)[k] = v; return { save, content }; };
const CLOUD_CONFIGURED = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
/* the cloud connection; 16-backend.js fills it in when Supabase is configured, otherwise everything stays local */
const Backend = {
  on: false, user: null, isAdmin: false,
  canEditContent() { return this.on && this.isAdmin; },
  saveChanged() {}, contentChanged() {}, upload: async (k, v) => v, remove: async () => {}
};
function sampleState() {
  return {
    version: 4,
    player: { name: 'Traveler', look: { hair:'#3c4cff', style:2, skin:'#f6c9a4', shirt:'#2f3a66', pants:'#1e2440' } },
    wallet: { coins: 24580, pearls: 90, tickets: 10, wishes: 10, rings: 0, bottles: 0, dust: 0, starlight: 0 },
    settings: { names: true, music: true, sfx: true, gfx: 'high', pullFit: false },
    featuredId: 'aria',
    wallpaper: null,
    owned: {},
    banners: { limited: { name: 'Limited Banner', end: '2026-11-11' }, weekly: { name: 'Weekly Spotlight' }, skins: { name: 'Outfit Wish', featured: null, end: null }, memories: { name: 'Memory Wish' }, standard: { name: 'Pearl Wish' } },
    gacha: { limited: { pity5: 0, pity4: 0, guarantee: false, total: 0 }, weekly: { pity5: 0, pity4: 0, guarantee: false, total: 0 }, skins: { pity5: 0, pity4: 0, guarantee: false, total: 0 }, memories: { pity5: 0, pity4: 0, total: 0 }, standard: { pity5: 0, pity4: 0, total: 0 }, history: [] },
    mailClaimed: [],
    bond: {},
    monthly: { key: null, limited: 0, standard: 0 },
    ach: [], redeemed: [],
    equip: {},
    bt: {}, btPaid: {}, freePull: {},
    account: null, support: [], titleNews: null, loadArts: [],
    artPick: {},
    spin: { last: null },
    gifts: { sweets: 0, bracelet: 0, plush: 0 },
    stamina: { v: 240, t: Date.now() },
    login: { last: null, streak: 0 },
    pets: { frags: { ssr: 0, ur: 0 }, eggs: [], inc: [null, null, null] },
    profile: { avatar: null, frame: 'simple', title: 'newcomer', card: 'pearl', showcase: [null, null, null, null], uid: 100000 + Math.floor(Math.random() * 900000) },
    pool: [
      { id:'aria', type:'character', name:'Aria', rarity:5, parent:null, art:null, pullable:true, sample:true,
        desc:'A starlight idol who sings the plaza awake every morning.', look:{ hair:'#ffcf4a', style:1, skin:'#ffe0c7', shirt:'#ff7eb6', pants:'#ffffff' } },
      { id:'luna', type:'character', name:'Luna', rarity:4, parent:null, art:null, pullable:true, sample:true,
        desc:'Quiet night-shift librarian who knows every secret path in the hedge maze.', look:{ hair:'#a066ff', style:3, skin:'#f6c9a4', shirt:'#3a2a66', pants:'#221a40' } },
      { id:'kenji', type:'character', name:'Kenji', rarity:4, parent:null, art:null, pullable:true, sample:true,
        desc:'Volleyball captain. Will challenge anyone who walks onto the sand court.', look:{ hair:'#ff5f3d', style:2, skin:'#d9a07a', shirt:'#2b2b3a', pants:'#5a6b8a' } },
      { id:'mochi', type:'character', name:'Mochi', rarity:4, parent:null, art:null, pullable:true, sample:true,
        desc:'Runs the fountain café and hands out free bubble tea on event days.', look:{ hair:'#3fd0c9', style:4, skin:'#ffe0c7', shirt:'#9be7ff', pants:'#2f5d8a' } },
      { id:'aria-beach', type:'skin', name:'Aria · Beach Day', rarity:4, parent:'aria', art:null, pullable:true, sample:true,
        desc:'Summer outfit for Aria, first sold during the beach event.', look:{ hair:'#ffcf4a', style:3, skin:'#ffe0c7', shirt:'#4fd1ff', pants:'#ffe08a' } },
      { id:'celeste', type:'character', name:'Celeste', rarity:5, parent:null, art:null, pullable:true, standard:true, sample:true,
        desc:'Tide-reader who keeps the plaza fountain full of wishing pearls.', look:{ hair:'#7fd3ff', style:1, skin:'#ffe0c7', shirt:'#3a5bd9', pants:'#e8f4ff' } },
      { id:'rook', type:'character', name:'Rook', rarity:5, parent:null, art:null, pullable:true, standard:true, sample:true,
        desc:'A masked courier who only takes deliveries after midnight.', look:{ hair:'#2b2b3a', style:2, skin:'#d9a07a', shirt:'#6b3fa0', pants:'#1e1a2e' } },
      { id:'pet-dragon', type:'pet', name:'Aurora Dragon', rarity:5, parent:null, art:null, pullable:false, sample:true,
        desc:'A tiny dragon that hoards shiny pearls and naps on warm lanterns.', look:{ kind:'dragon', body:'#9b7bff', accent:'#3ee6d0', belly:'#ffe9b0' } },
      { id:'pet-phoenix', type:'pet', name:'Ember Phoenix', rarity:5, parent:null, art:null, pullable:false, sample:true,
        desc:'Hatched from the last firework of the festival. Its tail never cools.', look:{ kind:'bird', body:'#ff7a3d', accent:'#ffd36b', belly:'#fff1c4' } },
      { id:'pet-fox', type:'pet', name:'Maple Fox', rarity:4, parent:null, art:null, pullable:false, sample:true,
        desc:'Hides in leaf piles in the Maple Garden and pops out to say hi.', look:{ kind:'fox', body:'#ff8a3a', accent:'#c8461b', belly:'#fff4e0' } },
      { id:'pet-cat', type:'pet', name:'Pearl Cat', rarity:4, parent:null, art:null, pullable:false, sample:true,
        desc:'Sits by the pond all day, staring at the floating lanterns.', look:{ kind:'cat', body:'#c9d4f5', accent:'#7f8bb3', belly:'#ffffff' } },
      { id:'pet-bunny', type:'pet', name:'Mochi Bunny', rarity:4, parent:null, art:null, pullable:false, sample:true,
        desc:'Soft, round and always hungry for sweet rice cakes.', look:{ kind:'bunny', body:'#ffe0ea', accent:'#ff9ec4', belly:'#ffffff' } },
      { id:'pet-owl', type:'pet', name:'Lantern Owl', rarity:4, parent:null, art:null, pullable:false, sample:true,
        desc:'Keeps watch over the Night Market until the last stall closes.', look:{ kind:'owl', body:'#8a5a3c', accent:'#ffd36b', belly:'#f3e2c4' } }
    ]
  };
}
let S = (() => {
  const base = sampleState();
  try {
    const raw = localStorage.getItem(KEY), rawC = localStorage.getItem(CONTENT_KEY);
    if (raw || rawC) {
      // older saves kept the content inside the player save; the content copy wins when both exist
      const d = { ...(raw ? JSON.parse(raw) : {}), ...(rawC ? JSON.parse(rawC) : {}) };
      if (d && Array.isArray(d.pool)) {
        const s = Object.assign(base, d);
        s.wallet = { ...sampleState().wallet, ...(d.wallet || {}) };
        if ('gems' in s.wallet) { delete s.wallet.gems; }
        const fresh = sampleState();
        const og = d.gacha || {};
        if (og.limited) s.gacha = { ...fresh.gacha, ...og, limited: { ...fresh.gacha.limited, ...og.limited }, standard: { ...fresh.gacha.standard, ...og.standard } };
        else s.gacha = { ...fresh.gacha, limited: { pity5: Math.min(og.pity5 || 0, HARD_PITY - 1), pity4: og.pity4 || 0, guarantee: !!og.guarantee, total: og.total || 0 }, history: og.history || [] };
        s.banners = Object.fromEntries(Object.keys(fresh.banners).map(k => [k, { ...fresh.banners[k], ...((d.banners || {})[k] || {}) }]));
        for (const k of Object.keys(fresh.gacha)) if (k !== 'history' && !s.gacha[k]) s.gacha[k] = { ...fresh.gacha[k] };
        s.owned = d.owned || {};
        s.bond = d.bond || {}; s.monthly = { ...fresh.monthly, ...(d.monthly || {}) }; s.ach = d.ach || []; s.redeemed = d.redeemed || []; s.equip = d.equip || {}; s.clothes = d.clothes || []; s.wear = d.wear || {}; s.memories = d.memories || []; s.memEq = d.memEq || {}; s.bt = d.bt || {}; s.btPaid = d.btPaid || {}; s.freePull = d.freePull || {}; s.support = d.support || []; s.artPick = d.artPick || {}; s.spin = { ...fresh.spin, ...(d.spin || {}) }; s.gifts = { ...fresh.gifts, ...(d.gifts || {}) };
        s.stamina = { ...fresh.stamina, ...(d.stamina || {}) }; s.login = { ...fresh.login, ...(d.login || {}) };
        s.profile = { ...fresh.profile, ...(d.profile || {}) }; if (!Array.isArray(s.profile.showcase) || s.profile.showcase.length !== 4) s.profile.showcase = [null, null, null, null];
        s.pool.forEach(e => { delete e.element; if (e.type === 'weapon') e.type = 'item'; if (e.pullable === undefined) e.pullable = true; if (+e.rarity < 4) e.rarity = 4; if (+e.rarity === 6 && e.type !== 'skin') e.rarity = 5; });
        if ((d.version || 1) < 3 && !s.pool.some(e => e.standard)) fresh.pool.filter(e => e.standard && !s.pool.some(x => x.id === e.id)).forEach(e => s.pool.push(e));
        if ((d.version || 1) < 4 && !s.pool.some(e => e.type === 'pet')) fresh.pool.filter(e => e.type === 'pet').forEach(e => s.pool.push(e));
        s.pets = { ...fresh.pets, ...(d.pets || {}) }; s.pets.frags = { ...fresh.pets.frags, ...s.pets.frags };
        if (!Array.isArray(s.pets.inc) || s.pets.inc.length < 3) s.pets.inc = [...(Array.isArray(s.pets.inc) ? s.pets.inc : []), null, null, null].slice(0, Math.max(3, (s.pets.inc || []).length));
        s.version = 4;
        return s;
      }
    }
  } catch (e) {}
  return base;
})();
if (!S.media) S.media = {};
let lastContentJSON = JSON.stringify(splitState(S).content);
let booted = false;   // set by boot; changes made while loading don't count as new progress
function persist() {
  if (booted) S.savedAt = Date.now();
  const { save, content } = splitState(S);
  try {
    const cj = JSON.stringify(content);
    localStorage.setItem(KEY, JSON.stringify(save));
    if (cj !== lastContentJSON) { localStorage.setItem(CONTENT_KEY, cj); lastContentJSON = cj; Backend.contentChanged(content); }
    Backend.saveChanged(save);
    return true;
  } catch (e) { toast('Could not save progress: browser storage is full.'); return false; }
}
/* replace the shared content (from the server or an import) without touching the player save */
function applyContent(c) {
  for (const k of CONTENT_KEYS) if (c[k] !== undefined) S[k] = c[k];
  if (!S.media) S.media = {};
  ensureMC();
  lastContentJSON = JSON.stringify(splitState(S).content);
  localStorage.setItem(CONTENT_KEY, lastContentJSON);
}
const featured = () => S.pool.find(e => e.id === S.featuredId) || S.pool.find(e => e.type === 'character' && e.rarity === 5) || S.pool[0];
/* the two main characters are pool entries mc-f / mc-m; only the chosen one (and its skins) counts as owned */
const MC_IDS = { 'mc-f': 'f', 'mc-m': 'm' };
const mcOff = id => { const m = MC_IDS[id] || MC_IDS[(findEntry(id) || {}).parent]; return !!m && m !== S.player.mc; };
const owns = id => (S.owned[id] || 0) > 0 && !mcOff(id);
/* pool entries, and memories looked up like entries (type 'memory', art = the memory's art) so banners and reveals can show them */
const memEntry = id => { const m = (S.memories || []).find(x => x.id === id); return m ? { id: m.id, type: 'memory', name: m.name, rarity: +m.rarity, art: m.img || null, desc: m.desc || '', look: {}, pullable: true, char: m.char || null } : undefined; };
const findEntry = id => S.pool.find(e => e.id === id) || memEntry(id);
