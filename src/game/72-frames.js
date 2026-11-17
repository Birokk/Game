/* ---------- Avatar frames editor (admin → Look & icons → Avatar frames, the owner's ask, like the Titles editor).
   Every frame (built-in, VIP, Pearl Honor) can be renamed, drawn with another frame's style (or none), and given an
   uploaded picture laid over the avatar (a ring / crest PNG with a transparent middle; its size as % of the avatar, so
   crowns and wings can stick out); the admin can also add new frames with an unlock rule. Content S.frameEdits
   {id: {name, cls, pic, k, ox, oy, need, custom}} (in CONTENT_KEYS), applied to FRAMES in place by frameSync() (at load, after
   applyContent and after every edit). avatarHTML (08-profile.js) draws the look through frameLook(id). ---------- */
const frameEdits = () => S.frameEdits || (S.frameEdits = {});
const FR_DEF = {};   // each built-in frame's own name / unlock, kept before any edit
const FR_K = 130;    // default picture size: 130% of the avatar
function frameSync() {
  for (const f of FRAMES) if (!f.custom && !FR_DEF[f.id]) FR_DEF[f.id] = { name: f.name, need: f.need };
  const ed = frameEdits();
  for (let i = FRAMES.length - 1; i >= 0; i--) if (FRAMES[i].custom && !(ed[FRAMES[i].id] && ed[FRAMES[i].id].custom)) FRAMES.splice(i, 1);
  for (const [id, e] of Object.entries(ed)) if (e && e.custom && !FRAMES.some(f => f.id === id)) FRAMES.push({ id, custom: true, name: e.name || 'New frame', need: 'always' });
  for (const f of FRAMES) {
    const d = FR_DEF[f.id] || { name: 'New frame', need: 'always' }, e = ed[f.id] || {};
    f.name = (e.name || '').trim() || d.name;
    f.need = e.custom && UNLOCK[e.need] ? e.need : d.need;
    f.look = e;
  }
}
/* the style class and the picture of a frame id */
function frameLook(id) {
  const f = FRAMES.find(x => x.id === id), e = (f && f.look) || {};
  const base = e.cls === 'none' ? 'none' : FR_DEF[e.cls] ? e.cls : f && !f.custom ? id : e.custom ? 'simple' : id;
  const pic = e.pic && MEDIA.get('frame:' + id);
  return { cls: 'f-' + base, pic: pic ? `<img class="avf-pic" src="${pic}" alt="" style="--fk:${(e.k || FR_K) / 100};--fx:${(e.ox || 0) / 100};--fy:${(e.oy || 0) / 100}">` : '' };
}

/* the admin page */
let frEd = null;
const frStyleOpts = sel => [['none', 'No ring (picture only)'], ...Object.keys(FR_DEF).map(id => [id, (FRAMES.find(f => f.id === id) || {}).name + ' style'])].map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('');
function renderFramesTab() {
  const p = $('#adPanel'); if (!p) return; frameSync();
  if (!FRAMES.some(f => f.id === frEd)) frEd = FRAMES[0].id;
  const f = FRAMES.find(x => x.id === frEd), e = frameEdits()[f.id] || {}, d = FR_DEF[f.id], pic = e.pic && MEDIA.get('frame:' + f.id);
  const cur = e.cls || (f.custom ? 'simple' : f.id), kind = x => x.vip ? 'VIP' : x.custom ? 'New' : x.premium ? 'Premium' : UNLOCK[x.need] && UNLOCK[x.need][1] ? 'Unlock' : 'Everyone';
  p.innerHTML = `<div class="stack">
    <p class="tiny">Rename any avatar frame, draw it with another frame's style, or upload your own frame picture: a square PNG with a transparent middle, laid over the avatar (crowns, wings and gems can stick out past the circle with the Size slider). Players see the changes everywhere avatars show.</p>
    <div class="fra-list">${FRAMES.map(x => `<button type="button" class="fra-it${x.id === f.id ? ' on' : ''}" data-fred="${x.id}">${avatarHTML(56, avatarEntry(), x.id)}<b>${esc(x.name)}</b><small>${kind(x)}</small></button>`).join('')}
      <button type="button" class="fra-it add" id="frNew">${icon('plus')}<b>New frame</b><small>Add one</small></button></div>
    <div class="tta-ed">
      <div class="tta-prev fra-prev"><span class="tiny">${esc(d ? 'Built-in frame' : 'New frame')}</span><div class="fra-pv">${avatarHTML(120, avatarEntry(), f.id)}</div><div class="fra-pv sm">${avatarHTML(56, avatarEntry(), f.id)}${avatarHTML(36, avatarEntry(), f.id)}</div></div>
      <div class="setx-list">
        ${setRow('Name', `<input class="input" id="frName" maxlength="24" value="${esc(e.name || '')}" placeholder="${esc(d ? d.name : 'New frame')}">`, d ? `Default: ${d.name}` : 'Up to 24 characters')}
        ${setRow('Ring style', `<select class="setx-sel" id="frCls">${frStyleOpts(cur)}</select>`, 'The drawn ring under the picture (or the whole frame without one)')}
        ${setRow('Picture', `<label class="sx-btn">${icon('upload')}${pic ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="frPic"></label>${pic ? `<button type="button" class="sx-btn" id="frPicDel">${icon('trash')}Remove</button>` : ''}`, 'Square PNG, transparent in the middle')}
        ${pic ? setRow('Size', `<input type="range" id="frK" min="90" max="170" step="1" value="${e.k || FR_K}"><b class="fra-k" id="frKv">${e.k || FR_K}%</b>`, 'How big the picture is next to the avatar') +
          setRow('Left / right', `<input type="range" id="frX" min="-50" max="50" step="1" value="${e.ox || 0}"><b class="fra-k" id="frXv">${e.ox || 0}%</b>`, 'Move the picture sideways (in % of the avatar)') +
          setRow('Up / down', `<input type="range" id="frY" min="-50" max="50" step="1" value="${e.oy || 0}"><b class="fra-k" id="frYv">${e.oy || 0}%</b>`, 'Move the picture up or down') +
          setRow('Centre', `<button type="button" class="sx-btn" id="frC">Back to the middle</button>`, 'Size and position as they were') : ''}
        ${f.custom ? setRow('Unlocked by', `<select class="setx-sel" id="frNeed">${ttUnlockOpts(f.need)}</select>`, 'Who can wear it') : ''}
      </div>
      <div class="tta-btns">${f.custom ? `<button type="button" class="sx-btn" id="frDel">${icon('trash')}Delete frame</button>` : `<button type="button" class="sx-btn" id="frReset">Back to the default</button>`}</div>
    </div></div>`;
  const quiet = () => { p.querySelector('.fra-pv').innerHTML = avatarHTML(120, avatarEntry(), f.id); p.querySelector('.fra-pv.sm').innerHTML = avatarHTML(56, avatarEntry(), f.id) + avatarHTML(36, avatarEntry(), f.id); const it = p.querySelector(`[data-fred="${f.id}"]`); if (it) { it.querySelector('.avf').outerHTML = avatarHTML(56, avatarEntry(), f.id); it.querySelector('b').textContent = f.name; } };
  const save = (fn, redraw = true) => { const ed = frameEdits(), o = ed[f.id] || (ed[f.id] = {}); fn(o); if (!f.custom && !Object.keys(o).some(k => o[k] !== undefined && o[k] !== '' && o[k] !== false)) delete ed[f.id]; frameSync(); persist(); safely(renderMenu, 'frames'); if (redraw) renderFramesTab(); else quiet(); };
  p.querySelectorAll('[data-fred]').forEach(b => b.onclick = () => { frEd = b.dataset.fred; renderFramesTab(); });
  $('#frNew').onclick = () => { const id = 'cf-' + Date.now().toString(36); frameEdits()[id] = { custom: true, name: 'New frame', cls: 'simple', need: 'always' }; frEd = id; frameSync(); persist(); renderFramesTab(); toast('New frame added: upload its picture, then pick who can wear it.'); };
  const nm = $('#frName'); nm.oninput = () => save(o => o.name = nm.value.slice(0, 24), false);
  $('#frCls').onchange = ev => save(o => o.cls = ev.target.value === (f.custom ? '' : f.id) ? undefined : ev.target.value);
  const kk = $('#frK'); if (kk) { kk.oninput = () => { $('#frKv').textContent = kk.value + '%'; save(o => o.k = +kk.value, false); }; }
  for (const [id, k] of [['frX', 'ox'], ['frY', 'oy']]) { const r = $('#' + id); if (r) r.oninput = () => { $('#' + id + 'v').textContent = r.value + '%'; save(o => o[k] = +r.value || undefined, false); }; }
  const fc = $('#frC'); if (fc) fc.onclick = () => save(o => { o.k = undefined; o.ox = undefined; o.oy = undefined; });
  const nd = $('#frNeed'); if (nd) nd.onchange = () => save(o => o.need = nd.value);
  $('#frPic').onchange = async ev => { try { if (await mediaSet('frame:' + f.id, await resizeImage(ev.target.files[0], 512, 'image/png'))) { save(o => o.pic = true); toast('Frame picture saved.'); } } catch (er) { toast(er.message, true); } };
  const pd = $('#frPicDel'); if (pd) pd.onclick = async () => { await mediaDel('frame:' + f.id); save(o => { o.pic = false; o.k = undefined; o.ox = undefined; o.oy = undefined; }); };
  const rs = $('#frReset'); if (rs) rs.onclick = async () => { if (!rs.dataset.sure) { rs.dataset.sure = 1; rs.textContent = 'Tap again to reset'; return; } if (e.pic) await mediaDel('frame:' + f.id); delete frameEdits()[f.id]; save(() => {}); toast(`${f.name} is back to its default.`); };
  const dl = $('#frDel'); if (dl) dl.onclick = async () => { if (!dl.dataset.sure) { dl.dataset.sure = 1; dl.textContent = 'Tap again to delete'; return; } if (e.pic) await mediaDel('frame:' + f.id); delete frameEdits()[f.id]; if (S.profile.frame === f.id) S.profile.frame = 'simple'; frEd = null; frameSync(); persist(); renderFramesTab(); toast('Frame deleted.'); };
}
frameSync();
