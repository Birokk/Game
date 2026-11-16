/* ---------- Titles editor (admin → Look & icons → Titles). The owner asked to edit the titles from the settings:
   every title can be renamed, given another of the built-in styles, custom colours, or an uploaded picture (with or
   without its name written over it); the admin can also add new titles with an unlock rule. The edits are content
   (S.titleEdits, in CONTENT_KEYS), so every player sees them: {id: {name, cls, a, b, c, glow, shine, pic, txt, need, custom}}.
   titleSync() applies them to TITLES in place (at load, after applyContent and after every edit) ---------- */
const TITLE_STYLES = [
  ['t-plain', 'Plain'], ['t-aqua', 'Aqua glow'], ['t-ember', 'Ember'], ['t-violet', 'Violet glow'], ['t-gold', 'Gold'],
  ['t-prism', 'Prism (animated)'], ['t-mbox', 'Fountain'], ['t-maxwin', 'Max Win (animated)'], ['t-vtide', 'Tide (animated)'],
  ['t-vmonarch', 'Monarch (animated)'], ['t-rk1', 'Champion gold'], ['t-rk2', 'Vanguard silver'], ['t-rk3', 'Challenger bronze'],
  ['t-custom', 'Custom colours']
];
const titleEdits = () => S.titleEdits || (S.titleEdits = {});
const TT_DEF = {};   // each built-in title's own name / style / unlock, kept before any edit
function titleSync() {
  for (const t of TITLES) if (!t.custom && !TT_DEF[t.id]) TT_DEF[t.id] = { name: t.name, cls: t.cls, need: t.need };
  const ed = titleEdits();
  for (let i = TITLES.length - 1; i >= 0; i--) if (TITLES[i].custom && !(ed[TITLES[i].id] && ed[TITLES[i].id].custom)) TITLES.splice(i, 1);   // deleted new titles
  for (const [id, e] of Object.entries(ed)) if (e && e.custom && !TITLES.some(t => t.id === id)) TITLES.push({ id, custom: true, name: e.name || 'New title', cls: 't-plain', need: 'always' });
  for (const t of TITLES) {
    const d = TT_DEF[t.id] || { name: 'New title', cls: 't-plain', need: 'always' }, e = ed[t.id] || {};
    t.name = (e.name || '').trim() || d.name;
    t.cls = TITLE_STYLES.some(s => s[0] === e.cls) ? e.cls : d.cls;
    t.need = e.custom && UNLOCK[e.need] ? e.need : d.need;
    t.look = e;
  }
}
/* how a title is drawn: its picture (name over it when asked), or its style; custom colours go in as CSS variables */
function titleMarkup(t) {
  if (!t) return '';
  const e = t.look || {}, pic = e.pic && MEDIA.get('title:' + t.id);
  if (pic) return `<span class="ttl t-pic${e.txt ? ' txt' : ''}" title="${esc(t.name)}"><img src="${pic}" alt="${esc(t.name)}">${e.txt ? `<b>${esc(t.name)}</b>` : ''}</span>`;
  if (t.cls === 't-custom') return `<span class="ttl t-custom${e.glow ? ' glow' : ''}${e.shine ? ' shine' : ''}" style="--tca:${e.a || '#5a3fb0'};--tcb:${e.b || '#ff6ec7'};--tcc:${e.c || '#ffffff'}">${esc(t.name)}</span>`;
  return `<span class="ttl ${t.cls}">${esc(t.name)}</span>`;
}

/* the admin page */
let ttEd = null;   // the title being edited
const ttUnlockOpts = sel => Object.entries(UNLOCK).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(k === 'always' ? 'Everyone has it' : v[1] || k)}</option>`).join('');
function renderTitlesTab() {
  const p = $('#adPanel'); if (!p) return; titleSync();
  if (!TITLES.some(t => t.id === ttEd)) ttEd = TITLES[0].id;
  const t = TITLES.find(x => x.id === ttEd), e = titleEdits()[t.id] || {}, d = TT_DEF[t.id], pic = e.pic && MEDIA.get('title:' + t.id);
  const where = t.rank ? 'Weekly ranking reward' : t.vip ? 'VIP reward' : t.custom ? 'New title' : 'Built-in title';
  p.innerHTML = `<div class="stack">
    <p class="tiny">Rename any title, give it another style or your own colours, or upload a picture for it. Players see the changes everywhere a title shows (profile, home, Ranking, friends). Wide transparent PNGs work best for pictures (about 4:1).</p>
    <div class="tta-list">${TITLES.map(x => `<button type="button" class="tta-it${x.id === t.id ? ' on' : ''}" data-tted="${x.id}">${titleMarkup(x)}<small>${esc(x.rank ? 'Ranking' : x.vip ? 'VIP' : x.custom ? 'New' : UNLOCK[x.need] && UNLOCK[x.need][1] ? 'Unlock' : 'Everyone')}</small></button>`).join('')}
      <button type="button" class="tta-it add" id="ttNew">${icon('plus')}<small>New title</small></button></div>
    <div class="tta-ed">
      <div class="tta-prev"><span class="tiny">${esc(where)}</span><div class="tta-pv">${titleMarkup(t)}</div><div class="tta-pv sm hm-id">${titleMarkup(t)}</div></div>
      <div class="setx-list">
        ${setRow('Name', `<input class="input" id="ttName" maxlength="24" value="${esc(e.name || '')}" placeholder="${esc(d ? d.name : 'New title')}">`, d ? `Default: ${d.name}` : 'Up to 24 characters')}
        ${setRow('Style', `<select class="setx-sel" id="ttCls">${TITLE_STYLES.map(s => `<option value="${s[0]}"${s[0] === t.cls ? ' selected' : ''}>${s[1]}</option>`).join('')}</select>`, pic ? 'Not shown while the title has a picture' : 'The look of the title pill')}
        ${t.cls === 't-custom' ? setRow('Colours', `<label class="tta-col">Left<input type="color" id="ttA" value="${e.a || '#5a3fb0'}"></label><label class="tta-col">Right<input type="color" id="ttB" value="${e.b || '#ff6ec7'}"></label><label class="tta-col">Text<input type="color" id="ttC" value="${e.c || '#ffffff'}"></label>`, 'A gradient from left to right') +
          setRow('Glow', `<button type="button" class="sx-btn${e.glow ? ' on' : ''}" id="ttGlow">${e.glow ? 'On' : 'Off'}</button>`, 'A soft glow in its colours') +
          setRow('Moving colours', `<button type="button" class="sx-btn${e.shine ? ' on' : ''}" id="ttShine">${e.shine ? 'On' : 'Off'}</button>`, 'The colours flow through the pill') : ''}
        ${setRow('Picture', `<label class="sx-btn">${icon('upload')}${pic ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" id="ttPic"></label>${pic ? `<button type="button" class="sx-btn" id="ttPicDel">${icon('trash')}Remove</button>` : ''}`, 'Replaces the pill with your picture')}
        ${pic ? setRow('Name on the picture', `<button type="button" class="sx-btn${e.txt ? ' on' : ''}" id="ttTxt">${e.txt ? 'Shown' : 'Hidden'}</button>`, 'Write the title\'s name over the picture') : ''}
        ${t.custom ? setRow('Unlocked by', `<select class="setx-sel" id="ttNeed">${ttUnlockOpts(t.need)}</select>`, 'Who can wear it') : ''}
      </div>
      <div class="tta-btns">${t.custom ? `<button type="button" class="sx-btn" id="ttDel">${icon('trash')}Delete title</button>` : `<button type="button" class="sx-btn" id="ttReset">Back to the default</button>`}</div>
    </div></div>`;
  const save = (fn, redraw = true) => { const ed = titleEdits(), o = ed[t.id] || (ed[t.id] = {}); fn(o); if (!t.custom && !Object.keys(o).some(k => o[k] !== undefined && o[k] !== '' && o[k] !== false)) delete ed[t.id]; titleSync(); persist(); safely(renderMenu, 'titles'); if (redraw) renderTitlesTab(); else { p.querySelectorAll('.tta-pv').forEach(v => v.innerHTML = titleMarkup(t)); const it = p.querySelector(`[data-tted="${t.id}"] .ttl`); if (it) it.outerHTML = titleMarkup(t); } };
  p.querySelectorAll('[data-tted]').forEach(b => b.onclick = () => { ttEd = b.dataset.tted; renderTitlesTab(); });
  $('#ttNew').onclick = () => { const id = 'ct-' + Date.now().toString(36); titleEdits()[id] = { custom: true, name: 'New title', cls: 't-custom', need: 'always' }; ttEd = id; titleSync(); persist(); renderTitlesTab(); toast('New title added: everyone can wear it until you pick an unlock rule.'); };
  const nm = $('#ttName'); nm.oninput = () => save(o => o.name = nm.value.slice(0, 24), false);
  $('#ttCls').onchange = ev => save(o => o.cls = ev.target.value);
  for (const [id, k] of [['ttA', 'a'], ['ttB', 'b'], ['ttC', 'c']]) { const i = $('#' + id); if (i) i.oninput = () => save(o => o[k] = i.value, false); }
  const tg = (id, k) => { const b = $('#' + id); if (b) b.onclick = () => save(o => o[k] = !o[k]); };
  tg('ttGlow', 'glow'); tg('ttShine', 'shine'); tg('ttTxt', 'txt');
  const nd = $('#ttNeed'); if (nd) nd.onchange = () => save(o => o.need = nd.value);
  $('#ttPic').onchange = async ev => { try { if (await mediaSet('title:' + t.id, await resizeImage(ev.target.files[0], 640, 'image/png'))) { save(o => o.pic = true); toast('Title picture saved.'); } } catch (er) { toast(er.message, true); } };
  const pd = $('#ttPicDel'); if (pd) pd.onclick = async () => { await mediaDel('title:' + t.id); save(o => { o.pic = false; o.txt = false; }); };
  const rs = $('#ttReset'); if (rs) rs.onclick = async () => { if (!rs.dataset.sure) { rs.dataset.sure = 1; rs.textContent = 'Tap again to reset'; return; } if (e.pic) await mediaDel('title:' + t.id); delete titleEdits()[t.id]; save(() => {}); toast(`${t.name} is back to its default.`); };
  const dl = $('#ttDel'); if (dl) dl.onclick = async () => { if (!dl.dataset.sure) { dl.dataset.sure = 1; dl.textContent = 'Tap again to delete'; return; } if (e.pic) await mediaDel('title:' + t.id); delete titleEdits()[t.id]; if (S.profile.title === t.id) S.profile.title = 'newcomer'; ttEd = null; titleSync(); persist(); renderTitlesTab(); toast('Title deleted.'); };
}
titleSync();
