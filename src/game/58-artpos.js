/* =========================================================
   WALLPAPER FRAMING (after the owner asked to adjust a wallpaper whose shape differs from where it is shown, e.g. the
   Monthly Sign-in calendar art). S.artPos[mediaKey] = {x, y, z} (content, shared by every player): x / y = the point of
   the picture kept in view (object-position in %, 50 / 50 = centred), z = zoom 1–3 around that point (CSS `scale`, so it
   never fights an animation on `transform`). artPosStyle(key) is the inline style for an <img> of that key ('' when the
   picture was never framed, so each place keeps its own default); artImg(key, cls) draws the whole <img>.
   Admins frame a picture with the "Adjust position" button beside its upload (artFrameBtn(key, shape, label) → one
   delegated click → openArtFrame): a preview in the shape the game shows it in (ART_SHAPES; full-screen wallpapers also
   get a phone preview), drag the picture or use the Left / right, Up / down and Zoom sliders, Reset, Save. Saving redraws
   the open admin page (keeping its scroll) and any open screen that shows the picture (artPosRefresh). Deleting a picture
   (mediaDel) forgets its framing.
   ========================================================= */
const ART_SHAPES = {
  screen: [16 / 9, 'Full screen'], stage: [16 / 9, 'The 16:9 stage'], card: [9 / 16, 'A Battle card'], msign: [.65, 'The calendar art panel'],
  spin: [.82, 'The Daily spin art panel'], offer: [2.25, 'The offer popup'], map: [1.46, 'The campaign map panel'], thumb: [16 / 9, 'The loading screen']
};
const artPos = k => { const p = (S.artPos || {})[k]; return p ? { x: +p.x, y: +p.y, z: Math.max(1, +p.z || 1) } : null; };
const artPosCss = p => `object-position:${p.x}% ${p.y}%;${p.z > 1 ? `scale:${p.z};transform-origin:${p.x}% ${p.y}%;` : 'scale:none;'}`;
const artPosStyle = k => { const p = k && artPos(k); return p ? artPosCss(p) : ''; };
/* the Base / House / Guild stages can scroll sideways on phones, so a zoomed picture there gets its own clipping box */
const artImgClip = (k, cls = '') => { const p = artPos(k); return p && p.z > 1 ? `<span class="afr-clip">${artImg(k, cls)}</span>` : artImg(k, cls); };
const artImg = (k, cls = '') => { const u = MEDIA.get(k); return u ? `<img ${cls ? `class="${cls}" ` : ''}src="${u}" alt="" ${artPos(k) ? `style="${artPosStyle(k)}"` : ''}>` : ''; };
function artFrameBtn(k, shape = 'screen', label = '') {
  if (!MEDIA.get(k)) return '';
  const on = !!artPos(k);
  return `<button type="button" class="btn ghost sm afr-btn ${on ? 'on' : ''}" data-artframe="${esc(k)}" data-shape="${shape}" data-label="${esc(label)}" title="Choose which part of the picture shows">${icon('image')}${on ? 'Position set' : 'Adjust position'}</button>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-artframe]'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); openArtFrame(b.dataset.artframe, b.dataset.shape, b.dataset.label);
}, true);
let afrEl = null;
function closeArtFrame() { if (afrEl) { afrEl.remove(); afrEl = null; } }
function openArtFrame(k, shape = 'screen', label = '') {
  const u = MEDIA.get(k); if (!u) return toast('Upload a picture first.');
  const [ratio, where] = ART_SHAPES[shape] || ART_SHAPES.screen, full = shape === 'screen' || shape === 'stage';
  const p = { ...(artPos(k) || { x: 50, y: 50, z: 1 }) };
  let reset = false;
  closeArtFrame();
  afrEl = document.createElement('div'); afrEl.className = 'afr'; afrEl.setAttribute('role', 'dialog'); afrEl.setAttribute('aria-label', 'Adjust the wallpaper position');
  afrEl.innerHTML = `<div class="afr-box">
      <header class="afr-head"><div class="inv-title"><span class="inv-badge">${icon('image')}</span><h2 class="ts">Adjust position</h2></div><button class="inv-x" data-afx aria-label="Close">${icon('close')}</button></header>
      <p class="tiny afr-note">${label ? `<b>${esc(label)}</b> · ` : ''}Shown as: ${esc(where)}. Drag the picture (or use the sliders) to choose which part stays in view; zoom in to crop tighter. Players see it exactly like this preview.</p>
      <div class="afr-prevs ${full ? 'two' : ''}">
        <div class="afr-prev main" style="aspect-ratio:${ratio};--r:${ratio}"><img src="${u}" alt="" draggable="false"><i class="afr-cross"></i><small class="afr-tag">${esc(where)}</small></div>
        ${full ? `<div class="afr-prev phone" style="aspect-ratio:9/19.5"><img src="${u}" alt="" draggable="false"><small class="afr-tag">Phone</small></div>` : ''}
      </div>
      <div class="afr-sl">
        <label><span>Left / right <b data-afv="x"></b></span><input type="range" min="0" max="100" step=".5" data-afs="x"></label>
        <label><span>Up / down <b data-afv="y"></b></span><input type="range" min="0" max="100" step=".5" data-afs="y"></label>
        <label><span>Zoom <b data-afv="z"></b></span><input type="range" min="1" max="3" step=".05" data-afs="z"></label>
      </div>
      <div class="afr-btns"><button class="btn ghost" data-afreset>${icon('back')}Reset</button><span class="afr-sp"></span><button class="btn ghost" data-afx>Cancel</button><button class="btn gold" data-afsave>${icon('check')}Save</button></div>
    </div>`;
  document.body.appendChild(afrEl);
  const q = s => afrEl.querySelector(s), imgs = [...afrEl.querySelectorAll('.afr-prev img')];
  const apply = () => {
    imgs.forEach(i => i.setAttribute('style', artPosCss(p)));
    afrEl.querySelectorAll('[data-afs]').forEach(i => { i.value = p[i.dataset.afs]; });
    q('[data-afv="x"]').textContent = `${Math.round(p.x)}%`; q('[data-afv="y"]').textContent = `${Math.round(p.y)}%`; q('[data-afv="z"]').textContent = `${p.z.toFixed(2)}×`;
  };
  afrEl.querySelectorAll('[data-afs]').forEach(i => i.oninput = () => { p[i.dataset.afs] = +i.value; reset = false; apply(); });
  // drag: the picture follows the pointer (how far a pixel moves it depends on how much of the picture is out of view)
  const main = q('.afr-prev.main'), mi = main.querySelector('img');
  main.onpointerdown = e => {
    e.preventDefault(); main.setPointerCapture(e.pointerId); main.classList.add('drag');
    const bw = main.clientWidth, bh = main.clientHeight, nw = mi.naturalWidth || bw, nh = mi.naturalHeight || bh, s = Math.max(bw / nw, bh / nh);
    const ox = Math.max(1, nw * s * p.z - bw), oy = Math.max(1, nh * s * p.z - bh);
    let lx = e.clientX, ly = e.clientY;
    main.onpointermove = ev => { p.x = clamp(p.x - (ev.clientX - lx) / ox * 100, 0, 100); p.y = clamp(p.y - (ev.clientY - ly) / oy * 100, 0, 100); lx = ev.clientX; ly = ev.clientY; reset = false; apply(); };
    main.onpointerup = main.onpointercancel = () => { main.onpointermove = null; main.classList.remove('drag'); };
  };
  main.onwheel = e => { e.preventDefault(); p.z = clamp(+(p.z - Math.sign(e.deltaY) * .1).toFixed(2), 1, 3); reset = false; apply(); };
  q('[data-afreset]').onclick = () => { p.x = 50; p.y = 50; p.z = 1; reset = true; apply(); };
  afrEl.querySelectorAll('[data-afx]').forEach(b => b.onclick = closeArtFrame);
  afrEl.onclick = e => { if (e.target === afrEl) closeArtFrame(); };
  q('[data-afsave]').onclick = () => {
    const m = { ...(S.artPos || {}) };
    if (reset || (p.x === 50 && p.y === 50 && p.z === 1 && !artPos(k))) delete m[k];
    else m[k] = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, z: Math.round(p.z * 100) / 100 };
    S.artPos = m; persist(); closeArtFrame(); artPosRefresh(); toast(reset ? 'Back to the default position.' : 'Position saved.');
  };
  apply();
}
addEventListener('keydown', e => { if (afrEl && e.key === 'Escape') { e.stopPropagation(); closeArtFrame(); } }, true);
/* redraw what shows a framed picture: the open admin page (same scroll) and any open screen */
function artPosRefresh() {
  const run = f => { try { f(); } catch (e) { console.warn(e); } };
  if (modalEl && modalEl.dataset.kind === 'admin') { const m = document.querySelector('.adm-main'), top = m ? m.scrollTop : 0; run(renderAdminTab); const m2 = document.querySelector('.adm-main'); if (m2) m2.scrollTop = top; }
  if (bthEl) run(renderBattle);
  if (cmpEl) run(renderCampaign);
  if (raidEl) run(renderRaids);
  if (evEl) run(renderEvents);
  if (fmEl) run(renderFarm);
  if (titleOn) run(renderTitle);
}
