/* =========================================================
   ADMIN
   ========================================================= */
let adminTab = 'pool', adminEditId = null, adminArt = null, adminConfirm = null, adminAsc = { art3: null, art6: null }, adminIcon = null;
const blankLook = () => ({ hair:'#ff5f8f', style:0, skin:'#ffe0c7', shirt:'#7ef3d4', pants:'#2f3a66' });
function openAdmin(tab) {
  adminTab = tab || adminTab; adminEditId = null; adminArt = null; adminConfirm = null;
  openModal({ title: 'Admin panel', ic: 'wrench', wide: true, kind: 'admin', body: `<div class="tabs" id="adTabs">
      <button class="tab" data-adtab="pool">Game pool</button><button class="tab" data-adtab="banners">Banners</button><button class="tab" data-adtab="icons">Icons</button><button class="tab" data-adtab="wallet">Wallet &amp; summons</button><button class="tab" data-adtab="title">Title screen</button><button class="tab" data-adtab="skins">Skins</button><button class="tab" data-adtab="wardrobe">Wardrobe</button><button class="tab" data-adtab="memories">Memories</button><button class="tab" data-adtab="farm">Farm</button><button class="tab" data-adtab="events">Events</button><button class="tab" data-adtab="pullfx">Summon animation</button><button class="tab" data-adtab="server">Server</button><button class="tab" data-adtab="mr">Marriage skins</button>
    </div><div id="adPanel"></div>`, onMount: () => {
    document.querySelectorAll('[data-adtab]').forEach(b => b.onclick = () => { adminTab = b.dataset.adtab; adminEditId = null; adminArt = null; renderAdminTab(); });
    renderAdminTab();
  } });
}
function renderAdminTab() {
  document.querySelectorAll('[data-adtab]').forEach(b => b.classList.toggle('on', b.dataset.adtab === adminTab));
  if (adminTab === 'icons') return renderIconsTab();
  if (adminTab === 'banners') return renderBannersTab();
  if (adminTab === 'wallet') return renderWalletTab();
  if (adminTab === 'title') return renderTitleTab();
  if (adminTab === 'mr') return renderMRTab();
  if (adminTab === 'skins') return renderSkinsTab();
  if (adminTab === 'wardrobe') return renderWardrobeTab();
  if (adminTab === 'memories') return renderMemoriesTab();
  if (adminTab === 'server') return renderServerTab();
  if (adminTab === 'farm') return renderFarmTab();
  if (adminTab === 'events') return renderEventsTab();
  if (adminTab === 'pullfx') return renderPullFxTab();
  renderPoolTab();
}

/* pool tab */
/* the pool tab has two views: a collection-style grid of everything, and the editor (opened by tapping a card or "Add new") */
let adView = 'browse', adFilter = 'character', adQuery = '', adDelArm = false;
function showPoolView(v) {
  adView = v; const b = $('#adBrowse'), e = $('#adEditView'); if (!b || !e) return;
  b.hidden = v !== 'browse'; e.hidden = v !== 'edit';
  const body = modalEl && modalEl.querySelector('.m-body'); if (body) body.scrollTop = 0;
}
function openEditor(entry, type) {
  fillAdminForm(entry || null);
  if (!entry && type) { $('#adType').value = type; if (type === 'skin') fillParentOptions(null); adminPreview(); $('#adTitle').textContent = `New ${TYPES[type].toLowerCase()}`; }
  showPoolView('edit');
  if (!entry) $('#adName').focus();
}
function renderPoolTab() {
  $('#adPanel').innerHTML = `<div class="pool-browse" id="adBrowse">
    <div class="ad-head" style="margin:0"><h3>Game pool <span class="muted" id="adCount" style="font-family:var(--body);font-size:14px"></span></h3><input class="input pool-search" id="adSearch" type="search" placeholder="Search by name" value="${esc(adQuery)}"></div>
    <div class="tabs" id="adTypeTabs"></div>
    <div class="pool-grid" id="adList"></div>
    <details class="ad-data"><summary>Backup and import</summary>
      <p class="tiny" style="margin-top:8px">A full backup holds every character, banner, skin, clothing item, memory, notice and image (wallpapers and icons too). Download it here, then Import it on another page or browser; signed in as admin on the website, the import goes straight to the cloud.</p>
      <div class="row"><button type="button" class="btn mint sm" id="adDownload">${icon('upload')}Download full backup</button><button type="button" class="btn ghost sm" id="adCopy">${icon('copy')}Copy data</button><button type="button" class="btn ghost sm" id="adImportBtn">Import</button><button type="button" class="btn danger sm" id="adReset">Reset to samples</button></div>
      <div id="adDataArea"></div>
    </details>
  </div>
  <div class="admin pool-edit" id="adEditView" hidden>
    <form class="admin-form" id="adForm" novalidate>
      <div class="ad-head pool-edit-head"><button type="button" class="btn ghost sm" id="adCancel">${icon('back')}Back to the pool</button><h3 id="adTitle">Add to the game pool</h3><button type="button" class="btn danger sm" id="adDel" hidden>Delete</button></div>
      <div class="ad-grid">
        <div class="ad-preview" id="adPrevWrap">
          <div class="frame"><img id="adPrev" alt="Splash art preview"></div>
          <label class="upload">${icon('upload')}<span id="adUpLbl">Upload splash art</span><input type="file" id="adArt" accept="image/*" class="sr"></label>
          <button type="button" class="link" id="adClearArt" hidden>Remove uploaded art</button>
          <p class="tiny">Standard size: 1728×972 (16:9). It fills the whole screen; other shapes (like square art) are cropped to fill it, keeping the upper middle. Larger images are scaled down to 1728px wide. Without art, a placeholder chibi is shown.</p>
          <div class="asc-slots"><div class="lbl-sm">Icon</div><p class="tiny">Square picture used in the character menu, avatars and small portraits. Without one, it is cut from the art.</p>
            <div class="asc-slot"><span class="mini ic-mini"><img id="adP_icon" alt=""></span><div style="display:grid;gap:4px"><b>Icon</b><span class="tiny" id="adS_icon"></span>
              <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}Upload<input type="file" accept="image/*" class="sr" id="adIconUp"></label><button type="button" class="link" id="adIconX">Remove</button></div></div></div>
          </div>
          <div class="asc-slots" id="adAscWrap"><div class="lbl-sm">Star splash arts</div><p class="tiny">Unlock at 3★ and 6★. Leave empty to keep the base art.</p>
            ${['art3', 'art6'].map(k => `<div class="asc-slot"><span class="mini"><img id="adP_${k}" alt=""></span><div style="display:grid;gap:4px"><b>${k === 'art3' ? '3★' : '6★'} art</b><span class="tiny" id="adS_${k}"></span>
              <div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}Upload<input type="file" accept="image/*" class="sr" data-asc="${k}"></label><button type="button" class="link" data-ascx="${k}">Remove</button></div></div></div>`).join('')}
          </div>
        </div>
        <div class="ad-fields">
          <label class="field"><span>Type</span><select class="input" id="adType">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="field"><span>Name</span><input class="input" id="adName" maxlength="40" placeholder="e.g. Sora"><span class="err" id="adNameErr" hidden>Give it a name first.</span></label>
          <label class="field" id="adParentWrap" hidden><span>Skin for</span><select class="input" id="adParent"></select></label>
          <div id="adSkins" hidden></div>
          <div class="field"><span>Rarity</span><div class="seg" id="adRarity">${[4, 5, 6].map(r => `<label class="r${r}" ${r === 6 ? 'id="adMR"' : ''}><input type="radio" name="adR" value="${r}">${RNAME[r]}</label>`).join('')}</div></div>
          <label class="field"><span>Description</span><textarea class="input" id="adDesc" maxlength="240" placeholder="One or two lines of lore"></textarea></label>
          <fieldset class="looks"><legend class="lbl-sm" id="lkLegend">Plaza look</legend>
            <label id="lkKindWrap" hidden>Pet<select class="input" id="lkKind">${Object.entries(PET_KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
            <label><span id="lkHairL">Hair</span><input type="color" id="lkHair"></label>
            <label id="lkStyleWrap">Style<select class="input" id="lkStyle">${HAIR_STYLES.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select></label>
            <label><span id="lkSkinL">Skin</span><input type="color" id="lkSkin"></label>
            <label><span id="lkShirtL">Top</span><input type="color" id="lkShirt"></label>
            <label id="lkPantsWrap">Bottom<input type="color" id="lkPants"></label>
          </fieldset>
          <label class="switch">Can be pulled from summons<input type="checkbox" id="adPull"><i></i></label>
          <label class="switch" id="adStdWrap">On the permanent banner<input type="checkbox" id="adStd"><i></i></label>
          <label class="switch" id="adFeatWrap">Featured UR on the limited banner<input type="checkbox" id="adFeat"><i></i></label>
          <div class="row"><button class="btn mint" type="submit" id="adSave">${icon('plus')}Add to pool</button></div>
        </div>
      </div>
    </form>
  </div>`;
  ['adType', 'adName', 'adParent', 'adDesc', 'lkHair', 'lkStyle', 'lkSkin', 'lkShirt', 'lkPants', 'lkKind'].forEach(id => $('#' + id).addEventListener('input', adminPreview));
  $('#adRarity').addEventListener('change', adminPreview);
  $('#adType').addEventListener('change', adminPreview);
  $('#adArt').addEventListener('change', async ev => {
    try { adminArt = await resizeImage(ev.target.files[0], SPLASH_MAX); adminPreview(); }
    catch (e) { toast(e.message); }
  });
  $('#adClearArt').onclick = () => { adminArt = null; adminPreview(); };
  document.querySelectorAll('[data-asc]').forEach(inp => inp.onchange = async () => { try { adminAsc[inp.dataset.asc] = await resizeImage(inp.files[0], SPLASH_MAX); inp.value = ''; adminPreview(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-ascx]').forEach(b => b.onclick = () => { adminAsc[b.dataset.ascx] = null; adminPreview(); });
  $('#adIconUp').onchange = async ev => { try { adminIcon = await resizeImage(ev.target.files[0], 512); ev.target.value = ''; adminPreview(); } catch (e) { toast(e.message); } };
  $('#adIconX').onclick = () => { adminIcon = null; adminPreview(); };
  $('#adCancel').onclick = () => { fillAdminForm(null); showPoolView('browse'); };
  $('#adDel').onclick = async () => {
    const id = adminEditId; if (!id || MC_IDS[id]) return;
    if (!adDelArm) { adDelArm = true; $('#adDel').textContent = 'Tap again to delete'; return; }
    await deleteEntry(id); fillAdminForm(null); showPoolView('browse');
  };
  $('#adSearch').oninput = e => { adQuery = e.target.value.trim().toLowerCase(); renderAdminList(); };
  $('#adForm').addEventListener('submit', saveAdmin);
  $('#adCopy').onclick = copyData;
  $('#adDownload').onclick = downloadData;
  $('#adImportBtn').onclick = showImport;
  $('#adReset').onclick = showReset;
  fillAdminForm(adminEditId ? findEntry(adminEditId) : null);
  showPoolView(adminEditId && adView === 'edit' ? 'edit' : 'browse');
}
function fillAdminForm(entry) {
  adminEditId = entry ? entry.id : null;
  adminArt = entry ? artFrom(entry.art) : null;
  adminAsc = { art3: entry ? artFrom(entry.art3) : null, art6: entry ? artFrom(entry.art6) : null };
  adminIcon = entry ? artFrom(entry.icon) : null;
  const lk = entry ? { ...blankLook(), ...entry.look } : blankLook();
  $('#adType').value = entry ? entry.type : 'character';
  $('#adName').value = entry ? entry.name : '';
  $('#adDesc').value = entry ? entry.desc || '' : '';
  $('#lkHair').value = lk.hair; $('#lkStyle').value = lk.style; $('#lkSkin').value = lk.skin; $('#lkShirt').value = lk.shirt; $('#lkPants').value = lk.pants;
  if (lk.kind) { $('#lkKind').value = lk.kind; $('#lkHair').value = lk.body; $('#lkSkin').value = lk.belly; $('#lkShirt').value = lk.accent; }
  const r = entry ? entry.rarity : 4;
  document.querySelectorAll('input[name=adR]').forEach(i => i.checked = +i.value === r);
  $('#adFeat').checked = entry ? S.featuredId === entry.id : false;
  $('#adPull').checked = entry ? entry.pullable !== false : true;
  $('#adStd').checked = entry ? !!entry.standard : false;
  $('#adTitle').textContent = entry ? `Editing ${entry.name}` : 'Add to the game pool';
  $('#adSave').innerHTML = entry ? `${icon('edit')}Save changes` : `${icon('plus')}Add to pool`;
  adDelArm = false; const del = $('#adDel'); if (del) { del.hidden = !entry || !!entry.mc; del.textContent = 'Delete'; }
  $('#adNameErr').hidden = true;
  $('#adArt').value = '';
  fillParentOptions(entry ? entry.parent : null);
  $('#adType').disabled = !!(entry && entry.mc);
  adminPreview();
  renderAdminList();
}
/* start a new skin for a character: type, owner, rarity and look come pre-filled */
function newSkinFor(cid) {
  const c = findEntry(cid); if (!c) return;
  fillAdminForm(null);
  $('#adType').value = 'skin'; fillParentOptions(cid); $('#adName').value = `${c.name} · `;
  document.querySelectorAll('input[name=adR]').forEach(i => i.checked = +i.value === c.rarity);
  const lk = { ...blankLook(), ...c.look };
  $('#lkHair').value = lk.hair; $('#lkStyle').value = lk.style; $('#lkSkin').value = lk.skin; $('#lkShirt').value = lk.shirt; $('#lkPants').value = lk.pants;
  $('#adTitle').textContent = `New skin for ${c.name}`; $('#adCancel').hidden = false;
  adminPreview();
  showPoolView('edit');
  const n = $('#adName'); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
}
function fillParentOptions(sel) {
  const chars = S.pool.filter(e => e.type === 'character');
  $('#adParent').innerHTML = chars.length ? chars.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('') : '<option value="">Add a character first</option>';
}
function readLook() {
  if ($('#adType').value === 'pet') return { kind: $('#lkKind').value, body: $('#lkHair').value, belly: $('#lkSkin').value, accent: $('#lkShirt').value };
  return { hair: $('#lkHair').value, style: +$('#lkStyle').value, skin: $('#lkSkin').value, shirt: $('#lkShirt').value, pants: $('#lkPants').value }; }
function adminRarity() { const c = document.querySelector('input[name=adR]:checked'); return c ? +c.value : 4; }
function adminPreview() {
  const r = adminRarity();
  $('#adPrevWrap').className = `ad-preview r${r}`;
  $('#adPrev').src = adminArt || chibiSplash(readLook());
  $('#adClearArt').hidden = !adminArt;
  $('#adUpLbl').textContent = adminArt ? 'Replace splash art' : 'Upload splash art';
  $('#adParentWrap').hidden = $('#adType').value !== 'skin';
  const isChar = $('#adType').value === 'character';
  $('#adAscWrap').hidden = !isChar;
  $('#adP_icon').src = adminIcon || adminArt || chibiSplash(readLook()); $('#adP_icon').classList.toggle('cut', !adminIcon); $('#adS_icon').textContent = adminIcon ? 'Uploaded' : 'Cut from the art'; $('#adIconX').hidden = !adminIcon;
  ['art3', 'art6'].forEach(k => { $('#adP_' + k).src = adminAsc[k] || adminArt || chibiSplash(readLook()); $('#adP_' + k).style.opacity = adminAsc[k] ? 1 : .35; $('#adS_' + k).textContent = adminAsc[k] ? 'Uploaded' : 'Uses the base art'; document.querySelector(`[data-ascx="${k}"]`).hidden = !adminAsc[k]; });
  const ed = adminEditId && findEntry(adminEditId), sk = $('#adSkins');
  sk.hidden = !(ed && isChar && ed.type === 'character');
  if (!sk.hidden) {
    const list = S.pool.filter(x => x.type === 'skin' && x.parent === ed.id);
    sk.innerHTML = `<div class="field"><span>Skins of ${esc(ed.name)} · ${list.length}</span><div class="skin-list">${list.map(x => `<button type="button" class="skin-li r${x.rarity}" data-editskin="${esc(x.id)}"><img src="${getArt(x)}" alt=""><b>${esc(x.name.replace(ed.name + ' · ', ''))}</b>${rtag(x.rarity)}${icon('edit')}</button>`).join('') || '<span class="tiny">No skins yet.</span>'}</div><div class="row" style="gap:6px"><button type="button" class="btn mint sm" data-newskin="${esc(ed.id)}">${icon('plus')}Add a skin</button><span class="tiny">A character can have any number of skins. Wedding (MR) skins are set in the Marriage skins tab.</span></div></div>`;
    sk.querySelectorAll('[data-editskin]').forEach(b => b.onclick = () => fillAdminForm(findEntry(b.dataset.editskin)));
    sk.querySelector('[data-newskin]').onclick = () => newSkinFor(ed.id);
  }
  const pet = $('#adType').value === 'pet';
  document.querySelector('fieldset.looks').hidden = !pet;
  $('#lkLegend').textContent = pet ? 'Pet look' : 'Plaza look'; $('#lkKindWrap').hidden = !pet; $('#lkStyleWrap').hidden = $('#lkPantsWrap').hidden = pet;
  $('#lkHairL').textContent = pet ? 'Body' : 'Hair'; $('#lkSkinL').textContent = pet ? 'Belly' : 'Skin'; $('#lkShirtL').textContent = pet ? 'Accent' : 'Top';
  const isMC = !!(adminEditId && (findEntry(adminEditId) || {}).mc);
  $('#adStdWrap').hidden = $('#adFeatWrap').hidden = r !== 5 || isMC;
  $('#adPull').parentElement.hidden = isMC;
  $('#adMR').hidden = $('#adType').value !== 'skin';
  if ($('#adType').value !== 'skin' && r === 6) document.querySelector('input[name=adR][value="5"]').checked = true;
}
async function saveAdmin(ev) {
  ev.preventDefault();
  const name = $('#adName').value.trim();
  if (!name) { $('#adNameErr').hidden = false; $('#adName').focus(); return; }
  const type = $('#adType').value;
  const data = { type, name, rarity: adminRarity(), desc: $('#adDesc').value.trim(),
    parent: type === 'skin' ? ($('#adParent').value || null) : null, look: readLook(), pullable: $('#adPull').checked, standard: adminRarity() === 5 && $('#adStd').checked };
  if (adminEditId && (findEntry(adminEditId) || {}).mc) Object.assign(data, { type: 'character', pullable: false, standard: false });
  const wasEdit = !!adminEditId;
  let entry;
  if (adminEditId) { entry = findEntry(adminEditId); Object.assign(entry, data); delete entry.sample; }
  else {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'entry';
    entry = { id: `${slug}-${Math.random().toString(36).slice(2, 6)}`, ...data, art: null };
    S.pool.push(entry);
  }
  const key = 'art:' + entry.id;
  if (adminArt && adminArt !== MEDIA.get(key)) { await mediaSet(key, adminArt); entry.art = 'idb:' + key; }
  else if (!adminArt && entry.art) { await mediaDel(key); entry.art = null; }
  const fk = 'face:' + entry.id;
  if (adminIcon) { if (adminIcon !== MEDIA.get(fk)) await mediaSet(fk, adminIcon); entry.icon = 'idb:' + fk; }
  else if (entry.icon) { await mediaDel(fk); entry.icon = null; }
  for (const k of ['art3', 'art6']) {
    const kk = `${k}:${entry.id}`;
    if (entry.type === 'character' && adminAsc[k]) { if (adminAsc[k] !== MEDIA.get(kk)) await mediaSet(kk, adminAsc[k]); entry[k] = 'idb:' + kk; }
    else if (entry[k]) { await mediaDel(kk); entry[k] = null; }
  }
  if (entry.rarity === 5 && $('#adFeat').checked && !entry.mc) S.featuredId = entry.id;
  else if (S.featuredId === entry.id) S.featuredId = null;
  persist(); renderMenu();
  toast(wasEdit ? `Saved ${name}.` : `Added ${name} to the pool.`);
  adFilter = entry.type; fillAdminForm(null); showPoolView('browse');
}
function renderAdminList() {
  const el = $('#adList'); if (!el) return;
  $('#adCount').textContent = `· ${S.pool.length}`;
  const tabs = $('#adTypeTabs');
  if (tabs) {
    tabs.innerHTML = Object.entries(TYPES).map(([k, v]) => `<button type="button" class="tab ${k === adFilter ? 'on' : ''}" data-ptype="${k}">${v}s<span>${S.pool.filter(e => e.type === k).length}</span></button>`).join('');
    tabs.querySelectorAll('[data-ptype]').forEach(b => b.onclick = () => { adFilter = b.dataset.ptype; renderAdminList(); });
  }
  const list = S.pool.filter(e => e.type === adFilter && (!adQuery || e.name.toLowerCase().includes(adQuery)))
    .sort((a, b) => !!b.mc - !!a.mc || b.rarity - a.rarity || a.name.localeCompare(b.name));
  const meta = e => [RNAME[e.rarity] || '', e.mc ? 'Main character' : '', e.id === S.featuredId ? 'Limited' : '', e.standard && e.rarity === 5 ? 'Permanent' : '',
    e.type === 'skin' && e.parent ? (findEntry(e.parent) || {}).name : '', e.type === 'character' && skinsOf(e.id).length ? `${skinsOf(e.id).length} skin${skinsOf(e.id).length === 1 ? '' : 's'}` : '',
    e.pullable === false && !e.mc && e.type !== 'pet' ? 'Not pullable' : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<button type="button" class="pool-add" id="adAddNew">${icon('plus')}<b>Add new ${TYPES[adFilter].toLowerCase()}</b></button>` +
    list.map(e => `<div class="pool-cell"><button type="button" class="skc col pool-card r${e.rarity}" data-edit="${esc(e.id)}"><img src="${baseCard(e)}" alt="" class="${baseArt(e) ? '' : 'chibi'}">${rtag(e.rarity)}<span class="skc-nm">${esc(e.type === 'skin' && e.parent ? e.name.replace(((findEntry(e.parent) || {}).name || '') + ' · ', '') : e.name)}<span class="skc-st">${esc(meta(e))}</span></span></button>
      ${e.type === 'character' ? `<button type="button" class="pool-skin" data-newskin="${esc(e.id)}" aria-label="Add a skin for ${esc(e.name)}" data-tip="${esc(`<b>Add a skin</b><span>New skin for ${esc(e.name)}</span>`)}">${icon('skins')}</button>` : ''}</div>`).join('') +
    (list.length ? '' : `<p class="tiny pool-empty">${adQuery ? 'Nothing matches that name.' : `No ${TYPES[adFilter].toLowerCase()}s yet.`}</p>`);
  $('#adAddNew').onclick = () => openEditor(null, adFilter);
  el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEditor(findEntry(b.dataset.edit)));
  el.querySelectorAll('[data-newskin]').forEach(b => b.onclick = () => newSkinFor(b.dataset.newskin));
}
async function deleteEntry(id) {
  const e = findEntry(id); if (!e || MC_IDS[id]) return;
  S.pool = S.pool.filter(x => x.id !== id);
  S.pool.forEach(x => { if (x.parent === id) x.parent = null; if (x.weddingSkin === id) x.weddingSkin = null; });
  delete S.bond[id]; delete S.owned[id];
  if (S.featuredId === id) S.featuredId = null;
  if (S.wallpaper === id) S.wallpaper = null;
  await mediaDel('art:' + id); await mediaDel('art3:' + id); await mediaDel('art6:' + id); await mediaDel('get:' + id); await mediaDel('face:' + id); delete S.artPick[id]; delete S.equip[id]; for (const c in S.equip) if (S.equip[c] === id) delete S.equip[c];
  persist(); renderMenu(); renderAdminList();
  toast(`Deleted ${e.name}.`);
}
/* full backup: all shared content plus every image (title and loading wallpapers, clothes, memories, icons...).
   Images saved in the cloud are downloaded into the file too, so it works as a real backup anywhere. */
const blobToDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
async function exportData(progress) {
  const media = {}, keys = [...MEDIA.keys()];
  let i = 0;
  for (const k of keys) {
    const v = MEDIA.get(k); progress && progress(`Packing images ${++i}/${keys.length}…`);
    if (typeof v !== 'string') continue;
    if (v.startsWith('data:')) media[k] = v;
    else { try { media[k] = await imageToDataUrl(v); } catch (e) { console.warn('Could not pack', k, e); } }   // cloud or preview storage URL
  }
  return JSON.stringify({ format: 'blank-full-1', savedAt: new Date().toISOString(), content: splitState(S).content, media });
}
function backupName() { return `blank-project-backup-${new Date().toISOString().slice(0, 10)}.json`; }
async function downloadData() {
  const area = $('#adDataArea'), say = t => { area.innerHTML = `<p class="tiny" style="margin-top:8px">${t}</p>`; };
  const json = await exportData(say);
  // inside the claude.ai preview, files are saved through its downloads capability (the viewer confirms)
  const dl = window.claude && window.claude.use ? await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 3000))]).catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename: backupName(), data: new Blob([json], { type: 'application/json' }) }); say(`Backup saved (${(json.length / 1048576).toFixed(1)} MB): ${backupName()}.`); }
    catch (e) { say(e && e.code === 'declined' ? 'Download cancelled.' : 'This page could not save a file. Use Copy data instead.'); }
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' })), a = document.createElement('a');
    a.href = url; a.download = backupName(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
    say(`Backup downloaded (${(json.length / 1048576).toFixed(1)} MB): ${backupName()}. If nothing was saved, use Copy data instead.`);
  } catch (e) { say('This page could not save a file. Use Copy data instead.'); }
}
async function copyData() {
  const area = $('#adDataArea');
  const json = await exportData(t => { area.innerHTML = `<p class="tiny" style="margin-top:8px">${t}</p>`; });
  const showText = () => { area.innerHTML = `<textarea class="input" id="adJson" style="margin-top:10px;min-height:120px" readonly></textarea><p class="tiny">Copy this text and keep it somewhere safe.</p>`; $('#adJson').value = json; $('#adJson').select(); };
  try { navigator.clipboard.writeText(json).then(() => { toast(`Game data copied (${(json.length / 1048576).toFixed(1)} MB).`); area.innerHTML = '<p class="tiny" style="margin-top:8px">Copied. Paste it with Import on the other page.</p>'; }, showText); }
  catch (e) { showText(); }
}
/* restore a full backup: every image goes through mediaSet (so an admin online uploads it to the cloud), then the content */
async function importFull(d, say) {
  const entries = Object.entries(d.media || {}).filter(([k, v]) => typeof v === 'string' && v.startsWith('data:'));
  let i = 0;
  for (const [k, v] of entries) { say(`Restoring images ${++i}/${entries.length}${Backend.canEditContent() ? ' (uploading to the cloud)' : ''}…`); await mediaSet(k, v); }
  applyContent({ ...d.content, media: S.media });
  for (const e of S.pool) for (const k of ['art', 'art3', 'art6', 'getArt', 'icon']) if (e[k] && e[k].startsWith('idb:') && !MEDIA.has(e[k].slice(4))) e[k] = null;
  persist();
  if (Backend.canEditContent()) { say('Publishing the content…'); await pushContent(); }
  hydrateIcons(); applyWallpaper(); renderMenu(); renderTitle(); if ($('#adForm')) fillAdminForm(null);
  return `Restored ${S.pool.length} entries and ${entries.length} images${Backend.canEditContent() ? ', saved to the cloud' : ''}.`;
}
function showImport() {
  const area = $('#adDataArea');
  area.innerHTML = `<div class="row" style="margin-top:10px"><label class="btn ghost sm">${icon('upload')}Choose backup file<input type="file" accept=".json,application/json" class="sr" id="adImpFile"></label><span class="tiny">or paste below</span></div>
    <textarea class="input" id="adImp" style="margin-top:8px;min-height:110px" placeholder="Paste copied game data here"></textarea>
    <div class="row" style="margin-top:8px"><button type="button" class="btn mint sm" id="adImpGo">Replace content with this backup</button><span class="err" id="adImpErr" hidden></span></div>`;
  $('#adImpFile').onchange = async ev => { const f = ev.target.files[0]; if (!f) return; $('#adImp').value = await f.text(); $('#adImpGo').click(); };
  $('#adImpGo').onclick = async () => {
    const err = $('#adImpErr');
    let d;
    try { d = JSON.parse($('#adImp').value); } catch (e) { d = null; }
    if (d && d.format === 'blank-full-1' && d.content && Array.isArray(d.content.pool)) {
      $('#adImpGo').disabled = true;
      const msg = await importFull(d, t => { err.hidden = false; err.style.color = 'var(--mint)'; err.textContent = t; });
      area.innerHTML = `<p class="tiny" style="margin-top:8px">${esc(msg)}</p>`; toast(msg); return;
    }
    const pool = d && (Array.isArray(d) ? d : d.pool);
    if (!Array.isArray(pool) || !pool.every(e => e && e.name && e.id)) { err.hidden = false; err.textContent = 'That text is not valid game data. Paste the full text from Copy data.'; return; }
    for (const e of pool) {
      e.type = TYPES[e.type] ? e.type : e.type === 'weapon' ? 'item' : 'character'; e.rarity = [4, 5].includes(+e.rarity) || (+e.rarity === 6 && e.type === 'skin') ? +e.rarity : 4;
      delete e.element; e.look = { ...blankLook(), ...e.look }; if (e.pullable === undefined) e.pullable = true;
      for (const k of ['art', 'art3', 'art6', 'getArt', 'icon']) { const mk = `${k === 'getArt' ? 'get' : k === 'icon' ? 'face' : k}:${e.id}`; if (e[k] && e[k].startsWith('data:')) { await mediaSet(mk, e[k]); e[k] = `idb:${mk}`; } else if (e[k] && !MEDIA.has(e[k].slice(4))) e[k] = null; }
    }
    if (Array.isArray(d.clothes)) {
      for (const x of d.clothes) { if (x.img && x.img.startsWith('data:')) { await mediaSet('cloth:' + x.id, x.img); x.img = 'idb:cloth:' + x.id; } else x.img = null; }
      S.clothes = d.clothes.filter(x => x && x.id && x.name && WARD_NAME[x.slot]);
    }
    if (Array.isArray(d.memories)) {
      for (const x of d.memories) { if (x.img && x.img.startsWith('data:')) { await mediaSet('mem:' + x.id, x.img); x.img = 'idb:mem:' + x.id; } else x.img = null; }
      S.memories = d.memories.filter(x => x && x.id && x.name).map(x => ({ ...x, rarity: [4, 5].includes(+x.rarity) ? +x.rarity : 4 }));
    }
    if (d.icons) for (const [k, v] of Object.entries(d.icons)) if (typeof v === 'string' && v.startsWith('data:')) await mediaSet('icon:' + k, v);
    S.pool = pool; S.featuredId = d.featuredId || null; ensureMC(); if (d.banners) for (const k of Object.keys(S.banners)) S.banners[k] = { ...S.banners[k], ...(d.banners[k] || {}) };
    persist(); hydrateIcons(); renderMenu(); fillAdminForm(null); area.innerHTML = ''; toast(`Imported ${pool.length} entries.`);
  };
}
function showReset() {
  const area = $('#adDataArea');
  area.innerHTML = `<div class="confirm" style="margin-top:10px">Replace the whole pool with the five sample entries? <button type="button" class="btn danger sm" id="adResetGo">Reset</button><button type="button" class="btn ghost sm" id="adResetNo">Cancel</button></div>`;
  $('#adResetNo').onclick = () => area.innerHTML = '';
  $('#adResetGo').onclick = () => { const s = sampleState(); S.pool = s.pool; S.featuredId = s.featuredId; ensureMC(); if (S.wallpaper && !findEntry(S.wallpaper)) S.wallpaper = null; persist(); renderMenu(); fillAdminForm(null); area.innerHTML = ''; toast('Pool reset to samples.'); };
}

/* banners tab */
function renderBannersTab() {
  const urs = S.pool.filter(e => e.rarity === 5 && !e.mc && e.type !== 'skin' && e.type !== 'pet').sort((a, b) => a.name.localeCompare(b.name));
  const std = standardURs(), f = limitedUR(), gl = S.gacha.limited;
  $('#adPanel').innerHTML = `<div class="admin">
    <section class="stack" style="align-content:start">
      <div><h3>Limited banner</h3><p class="tiny">One featured UR. Win the 50/50 and you get it; lose and you get a random UR from the permanent banner, and the next UR is guaranteed to be the featured one.</p></div>
      <div class="two">
        <label class="field"><span>Banner name</span><input class="input" id="bnLimName" maxlength="30" value="${esc(S.banners.limited.name)}"></label>
        <label class="field"><span>Ends on</span><input class="input" type="date" id="bnLimEnd" value="${esc(S.banners.limited.end)}"></label>
      </div>
      <label class="field"><span>Featured UR</span><select class="input" id="bnLimUR"><option value="">None</option>${urs.map(u => `<option value="${esc(u.id)}" ${u.id === S.featuredId ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
      ${f ? `<div class="sm-hero r5" style="grid-template-columns:96px minmax(0,1fr)"><div class="sm-art"><img src="${getArt(f)}" alt=""></div>
        <div class="stack" style="gap:6px;align-content:start"><b>${esc(f.name)}</b><span class="tiny">UR pity ${gl.pity5} / ${HARD_PITY} · ${gl.guarantee ? 'next UR is guaranteed featured' : 'next UR is a 50/50'}</span></div></div>` : ''}
    </section>
    <section class="stack" style="align-content:start">
      <div><h3>Permanent banner <span class="muted" style="font-family:var(--body);font-size:14px">· ${std.length} UR${std.length === 1 ? '' : 's'}</span></h3>
        <p class="tiny">Switch on the URs that belong here. When this banner drops a UR, each of them has the same chance. Around 7 works well.</p></div>
      <label class="field"><span>Banner name</span><input class="input" id="bnStdName" maxlength="30" value="${esc(S.banners.standard.name)}"></label>
      <div class="ad-list">${urs.length ? urs.map(u => `<label class="ban-row"><img src="${getArt(u)}" alt="">
          <span style="min-width:0"><span class="nm" style="display:block">${esc(u.name)}</span><span class="mt">${u.id === S.featuredId ? 'Featured on limited · ' : ''}${u.pullable === false ? 'Not pullable' : 'UR character'}</span></span>
          <input type="checkbox" data-std="${esc(u.id)}" ${u.standard ? 'checked' : ''} aria-label="${esc(u.name)} on the permanent banner"><i></i></label>`).join('') : '<div class="empty">No URs yet. Add some in the Game pool tab.</div>'}</div>
      <p class="tiny">All ${pullableSSRs().length} pullable SSRs appear on the Limited, Weekly and Permanent banners.</p>
    </section>
    <section class="stack" style="align-content:start">
      <div><h3>Weekly banner</h3><p class="tiny">Every Monday (00:00 UTC) it features a random pullable UR character, the same for every player, never the limited banner's UR and never the same two weeks in a row. Same 50/50 rules as the limited banner, with its own pity.</p></div>
      <label class="field"><span>Banner name</span><input class="input" id="bnWkName" maxlength="30" value="${esc(bannerName('weekly'))}"></label>
      <div class="hist">${[0, 1, 2, 3].map(i => { const u = weeklyUR(weekIndex() + i), d = new Date(WEEK_EPOCH + (weekIndex() + i) * WEEK_MS);
        return `<div><span>${i ? `From ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : '<b>This week</b>'}</span><span>${u ? esc(u.name) : 'No UR characters yet'}</span></div>`; }).join('')}</div>
    </section>
    <section class="stack" style="align-content:start">
      <div><h3>Outfit banner</h3><p class="tiny">Pulls give skins instead of characters: UR outfits at the UR rate, SSR outfits at the SSR rate (MR wedding skins never). Feature one UR outfit for a 50/50, or leave it empty for an equal chance. Rarity and art are set in the Skins tab.</p></div>
      <div class="two">
        <label class="field"><span>Banner name</span><input class="input" id="bnSkName" maxlength="30" value="${esc(bannerName('skins'))}"></label>
        <label class="field"><span>Ends on (optional)</span><input class="input" type="date" id="bnSkEnd" value="${esc(S.banners.skins.end || '')}"></label>
      </div>
      <label class="field"><span>Featured UR outfit</span><select class="input" id="bnSkFeat"><option value="">None (equal chance)</option>${pullableSkins(5).map(k => `<option value="${esc(k.id)}" ${k.id === S.banners.skins.featured ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
      <p class="tiny">${pullableSkins(5).length} UR and ${pullableSkins(4).length} SSR outfits are on this banner.</p>
    </section>
  </div>`;
  $('#bnWkName').oninput = e => { S.banners.weekly.name = e.target.value.trim() || BANNER_DEFAULT_NAME.weekly; persist(); };
  $('#bnSkName').oninput = e => { S.banners.skins.name = e.target.value.trim() || BANNER_DEFAULT_NAME.skins; persist(); };
  $('#bnSkEnd').onchange = e => { S.banners.skins.end = e.target.value || null; persist(); };
  $('#bnSkFeat').onchange = e => { S.banners.skins.featured = e.target.value || null; persist(); toast(e.target.value ? `${findEntry(e.target.value).name} is featured on the outfit banner.` : 'The outfit banner has no featured outfit.'); };
  $('#bnLimName').oninput = e => { S.banners.limited.name = e.target.value.trim() || 'Limited Banner'; persist(); renderMenu(); };
  $('#bnStdName').oninput = e => { S.banners.standard.name = e.target.value.trim() || 'Pearl Wish'; persist(); renderMenu(); };
  $('#bnLimEnd').onchange = e => { if (e.target.value) { S.banners.limited.end = e.target.value; persist(); renderMenu(); } };
  $('#bnLimUR').onchange = e => { S.featuredId = e.target.value || null; persist(); renderMenu(); renderBannersTab(); toast(S.featuredId ? `${findEntry(S.featuredId).name} is now featured on the limited banner.` : 'The limited banner has no featured UR.'); };
  document.querySelectorAll('[data-std]').forEach(i => i.onchange = () => { findEntry(i.dataset.std).standard = i.checked; persist(); renderMenu(); renderBannersTab(); });
}

/* icons tab */
function renderIconsTab() {
  $('#adPanel').innerHTML = `<p class="tiny">Upload your own image for any icon. Square PNG or SVG with a transparent background works best; images are scaled to 128px. Reset puts the default back.</p>
    ${ICON_SLOTS.map(([group, slots]) => `<h3 style="margin-top:16px">${group}</h3><div class="icon-grid">${slots.map(([k, label]) => {
      const custom = !!customIcon(k);
      return `<div class="islot"><div class="iprev">${CUR_SVG[k] ? curIcon(k) : icon(k)}</div>
        <div class="iname">${label}<span class="${custom ? 'cust' : ''}">${custom ? 'Custom' : 'Default'}</span></div>
        <div class="acts"><label class="btn ghost sm">Upload<input type="file" accept="image/*" class="sr" data-iup="${k}"></label>${custom ? `<button class="btn ghost sm" data-ireset="${k}" aria-label="Reset ${label} icon">Reset</button>` : ''}</div></div>`;
    }).join('')}</div>`).join('')}`;
  document.querySelectorAll('[data-iup]').forEach(inp => inp.onchange = async () => {
    try { await mediaSet('icon:' + inp.dataset.iup, await resizeImage(inp.files[0], 128)); iconsChanged(); toast('Icon updated.'); }
    catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-ireset]').forEach(b => b.onclick = async () => { await mediaDel('icon:' + b.dataset.ireset); iconsChanged(); toast('Icon reset to default.'); });
}
function iconsChanged() { hydrateIcons(); renderMenu(); renderIconsTab(); const mi = modalEl && modalEl.querySelector('.m-ic'); if (mi) mi.innerHTML = icon('wrench'); }

/* skins tab: every skin of every character, editable in place: name, rarity, full art (everywhere) and unlock art (new outfit popup only) */
let skDelArm = null;
function renderSkinsTab() {
  const chars = S.pool.filter(e => e.type === 'character').sort((a, b) => !!b.mc - !!a.mc || a.name.localeCompare(b.name));
  const slot = (k, key, label, hint) => { const a = artFrom(k[key]);
    return `<div class="sk-slot"><div class="sk-prev ${key === 'getArt' ? 'wide' : ''}">${a ? `<img src="${a}" alt="">` : key === 'art' ? `<img src="${getArt(k)}" alt="" style="object-fit:contain;object-position:50% 100%">` : '<span class="tiny">Uses the full art</span>'}${key === 'art' ? rtag(k.rarity) : ''}</div>
      <div style="display:grid;gap:4px"><b>${label}</b><span class="tiny">${hint}</span><div class="row" style="gap:6px"><label class="btn ghost sm">${icon('upload')}${a ? 'Replace' : 'Upload'}<input type="file" accept="image/*" class="sr" data-skup="${esc(k.id)}" data-skkey="${key}"></label>${a ? `<button class="link" data-skx="${esc(k.id)}" data-skkey="${key}">Remove</button>` : ''}</div></div></div>`; };
  const short = (k, c) => k.name.replace(c.name + ' · ', '');
  $('#adPanel').innerHTML = `<div class="stack">
    <div><h3>Skins</h3><p class="tiny">Every character can have as many skins as you like: press <b>New skin</b> under a character for each one. Pick each skin's rarity (the tag shows on its card). <b>Full art</b> is the skin's splash art everywhere (character screen, wallpaper, collection, pulls). <b>Unlock art</b> only appears in the "new outfit" animation when the skin is bought or received; without it the full art is used. MR wedding skins come from the Marriage skins tab.</p></div>
    ${chars.map(c => { const list = skinsOf(c.id).sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name));
      return `<div class="sk-group"><div class="ad-head" style="margin:0"><h3 style="font-size:16px">${esc(c.name)} <span class="muted" style="font-family:var(--body);font-size:13px">· ${list.length} skin${list.length === 1 ? '' : 's'}</span></h3><button class="btn mint sm" data-newsk="${esc(c.id)}">${icon('plus')}New skin</button></div>
        ${list.length ? list.map(k => `<div class="sk-row r${k.rarity}"><div class="sk-head">
            <input class="input sk-nm" data-sknm="${esc(k.id)}" maxlength="30" value="${esc(short(k, c))}" aria-label="Skin name">
            ${k.rarity === 6 ? `<span class="row" style="gap:6px">${rtag(6)}<span class="tiny">Unlocked by marriage</span></span>`
              : `<div class="seg sk-rar">${[4, 5].map(r => `<label class="r${r}"><input type="radio" name="skr-${esc(k.id)}" value="${r}" data-skr="${esc(k.id)}" ${k.rarity === r ? 'checked' : ''}>${RNAME[r]}</label>`).join('')}</div><span class="tiny">Buyable for ${SKIN_PRICE} pearls</span>`}
            <span class="row" style="gap:10px"><button class="link" data-skpv="${esc(k.id)}">Preview</button>${k.rarity === 6 ? '' : `<button class="link" data-skdel="${esc(k.id)}" style="color:${skDelArm === k.id ? '#ff6b81' : ''}">${skDelArm === k.id ? 'Tap again to delete' : 'Delete'}</button>`}</span></div>
          ${slot(k, 'art', 'Full art', 'Shown everywhere')}${slot(k, 'getArt', 'Unlock art', 'Only when bought or received')}</div>`).join('') : '<p class="tiny">No skins yet.</p>'}</div>`; }).join('')}
  </div>`;
  document.querySelectorAll('[data-skup]').forEach(inp => inp.onchange = async () => {
    const k = findEntry(inp.dataset.skup), key = inp.dataset.skkey, mk = `${key === 'art' ? 'art' : 'get'}:${k.id}`;
    try { await mediaSet(mk, await resizeImage(inp.files[0], key === 'art' ? SPLASH_MAX : 1920)); k[key] = 'idb:' + mk; persist(); renderSkinsTab(); renderMenu(); toast('Art saved.'); }
    catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-skx]').forEach(b => b.onclick = async () => {
    const k = findEntry(b.dataset.skx), key = b.dataset.skkey; await mediaDel(`${key === 'art' ? 'art' : 'get'}:${k.id}`); k[key] = null; persist(); renderSkinsTab(); renderMenu();
  });
  document.querySelectorAll('[data-sknm]').forEach(inp => inp.onchange = () => {
    const k = findEntry(inp.dataset.sknm), c = findEntry(k.parent), v = inp.value.trim() || 'Outfit';
    k.name = c ? `${c.name} · ${v}` : v; persist(); renderMenu(); toast('Skin renamed.');
  });
  document.querySelectorAll('[data-skr]').forEach(inp => inp.onchange = () => { findEntry(inp.dataset.skr).rarity = +inp.value; persist(); renderSkinsTab(); renderMenu(); });
  document.querySelectorAll('[data-skpv]').forEach(b => b.onclick = () => { const k = findEntry(b.dataset.skpv); closeModal(); showSkinGet(k, k.rarity === 6 ? { vow: true } : {}); });
  document.querySelectorAll('[data-skdel]').forEach(b => b.onclick = async () => {
    const id = b.dataset.skdel;
    if (skDelArm !== id) { skDelArm = id; renderSkinsTab(); return; }
    skDelArm = null;
    await mediaDel('art:' + id); await mediaDel('get:' + id);
    S.pool = S.pool.filter(x => x.id !== id); delete S.owned[id];
    for (const cid in S.equip) if (S.equip[cid] === id) delete S.equip[cid];
    S.pool.forEach(x => { if (x.weddingSkin === id) x.weddingSkin = null; });
    if (S.wallpaper === id) S.wallpaper = null;
    persist(); renderSkinsTab(); renderMenu(); toast('Skin deleted.');
  });
  document.querySelectorAll('[data-newsk]').forEach(b => b.onclick = () => {
    const c = findEntry(b.dataset.newsk), n = skinsOf(c.id).filter(x => x.rarity !== 6).length + 1;
    const k = { id: `${c.id}-skin-${Math.random().toString(36).slice(2, 6)}`, type: 'skin', name: `${c.name} · Outfit ${n}`, rarity: c.rarity, parent: c.id, art: null, pullable: true, desc: '', look: { ...c.look } };
    S.pool.push(k); persist(); renderSkinsTab(); renderMenu();
    const inp = document.querySelector(`[data-sknm="${k.id}"]`); if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); inp.select(); }
    toast(`New skin added for ${c.name}. Give it a name and upload its art.`);
  });
}

/* wardrobe tab: clothes for the character screen's Wardrobe (hat, top, pants, shoes, accessory, hand) */
let wdNewImg = null, wdDelArm = null;
function renderWardrobeTab() {
  const chars = S.pool.filter(e => e.type === 'character').sort((a, b) => !!b.mc - !!a.mc || a.name.localeCompare(b.name));
  $('#adPanel').innerHTML = `<div class="admin">
    <section class="stack" style="align-content:start">
      <div><h3>Add clothing</h3><p class="tiny">Clothes appear in each character's Wardrobe tab, in their slot. Use a square PNG with a transparent background (scaled to 512px). Players own nothing yet: switch on "Owned" below to test it until there is a way to get clothes.</p></div>
      <label class="field"><span>Name</span><input class="input" id="wdName" maxlength="30" placeholder="e.g. Lantern Hat"></label>
      <label class="field"><span>Slot</span><select class="input" id="wdSlotSel">${WARD_SLOTS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <div class="field"><span>Rarity</span><div class="seg" id="wdRar">${[4, 5].map(r => `<label class="r${r}"><input type="radio" name="wdR" value="${r}" ${r === 4 ? 'checked' : ''}>${RNAME[r]}</label>`).join('')}</div></div>
      <label class="field"><span>Who can wear it</span><select class="input" id="wdChar"><option value="">Every character</option>${chars.map(c => `<option value="${esc(c.id)}">${esc(c.name)} only</option>`).join('')}</select></label>
      <div class="row" style="align-items:center"><div class="wd-prev">${wdNewImg ? `<img src="${wdNewImg}" alt="">` : '<span class="tiny">No image</span>'}</div><label class="btn ghost sm">${icon('upload')}${wdNewImg ? 'Replace' : 'Upload'} image<input type="file" accept="image/*" class="sr" id="wdUp"></label></div>
      <div class="row"><button class="btn mint" id="wdAdd">${icon('plus')}Add clothing</button><span class="err" id="wdErr" hidden>Give it a name first.</span></div>
    </section>
    <section class="stack" style="align-content:start">
      <div class="ad-head" style="margin:0"><h3>Clothes <span class="muted" style="font-family:var(--body);font-size:14px">· ${S.clothes.length}</span></h3></div>
      ${WARD_SLOTS.map(([k, l]) => { const list = S.clothes.filter(x => x.slot === k);
        return `<div class="sk-group"><b>${l} · ${list.length}</b>${list.length ? list.map(x => `<div class="wd-row r${x.rarity}"><div class="wd-prev sm">${clothImg(x) ? `<img src="${clothImg(x)}" alt="">` : icon('wardrobe')}</div>
          <div style="min-width:0;display:grid;gap:2px"><span class="nm">${esc(x.name)} ${rtag(x.rarity)}</span><span class="tiny">${x.char ? `${esc((findEntry(x.char) || {}).name || 'Removed character')} only` : 'Every character'}</span></div>
          <div class="row" style="gap:8px;justify-content:flex-end"><label class="switch" style="padding:4px 8px;gap:8px;font-size:12px">Owned<input type="checkbox" data-wdown="${esc(x.id)}" ${owns(x.id) ? 'checked' : ''}><i></i></label><label class="link">Image<input type="file" accept="image/*" class="sr" data-wdimg="${esc(x.id)}"></label><button class="link" data-wddel="${esc(x.id)}" style="color:${wdDelArm === x.id ? '#ff6b81' : ''}">${wdDelArm === x.id ? 'Tap again to delete' : 'Delete'}</button></div></div>`).join('') : '<p class="tiny">None yet.</p>'}</div>`; }).join('')}
    </section></div>`;
  $('#wdUp').onchange = async ev => { try { wdNewImg = await resizeImage(ev.target.files[0], 512); renderWardrobeTab(); } catch (e) { toast(e.message); } };
  $('#wdAdd').onclick = async () => {
    const name = $('#wdName').value.trim(); if (!name) { $('#wdErr').hidden = false; return; }
    const x = { id: `cloth-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name, slot: $('#wdSlotSel').value, rarity: +document.querySelector('input[name=wdR]:checked').value, char: $('#wdChar').value || null, img: null };
    if (wdNewImg) { await mediaSet('cloth:' + x.id, wdNewImg); x.img = 'idb:cloth:' + x.id; }
    S.clothes.push(x); wdNewImg = null; persist(); renderWardrobeTab(); toast(`Added ${name}.`);
  };
  document.querySelectorAll('[data-wdown]').forEach(i => i.onchange = () => { if (i.checked) S.owned[i.dataset.wdown] = 1; else delete S.owned[i.dataset.wdown]; persist(); });
  document.querySelectorAll('[data-wdimg]').forEach(i => i.onchange = async () => { try { const x = clothOf(i.dataset.wdimg); await mediaSet('cloth:' + x.id, await resizeImage(i.files[0], 512)); x.img = 'idb:cloth:' + x.id; persist(); renderWardrobeTab(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-wddel]').forEach(b => b.onclick = async () => {
    const id = b.dataset.wddel;
    if (wdDelArm !== id) { wdDelArm = id; renderWardrobeTab(); return; }
    wdDelArm = null; await mediaDel('cloth:' + id);
    S.clothes = S.clothes.filter(x => x.id !== id); delete S.owned[id];
    for (const cid in S.wear) for (const k in S.wear[cid]) if (S.wear[cid][k] === id) delete S.wear[cid][k];
    persist(); renderWardrobeTab(); toast('Clothing deleted.');
  });
}

/* memories tab: art cards characters can equip in their Memory tab */
let memNewImg = null, memDelArm = null;
function renderMemoriesTab() {
  const chars = S.pool.filter(e => e.type === 'character').sort((a, b) => !!b.mc - !!a.mc || a.name.localeCompare(b.name));
  const list = [...S.memories].sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  $('#adPanel').innerHTML = `<div class="admin">
    <section class="stack" style="align-content:start">
      <div><h3>Add a memory</h3><p class="tiny">Memories are art cards each character can equip (${MEM_SLOTS} slots) in the Memory tab. Use the standard 1728×972 art. Players own none yet: switch on "Owned" below to test until there is a way to get them. Equipping does nothing yet.</p></div>
      <label class="field"><span>Name</span><input class="input" id="memName" maxlength="40" placeholder="e.g. First Lantern Night"></label>
      <div class="field"><span>Rarity</span><div class="seg" id="memRar">${[4, 5].map(r => `<label class="r${r}"><input type="radio" name="memR" value="${r}" ${r === 4 ? 'checked' : ''}>${RNAME[r]}</label>`).join('')}</div></div>
      <label class="field"><span>Who can equip it</span><select class="input" id="memChar"><option value="">Every character</option>${chars.map(c => `<option value="${esc(c.id)}">${esc(c.name)} only</option>`).join('')}</select></label>
      <label class="field"><span>Description</span><textarea class="input" id="memDesc" maxlength="240" placeholder="One or two lines about this memory"></textarea></label>
      <div class="row" style="align-items:center"><div class="mem-prev">${memNewImg ? `<img src="${memNewImg}" alt="">` : '<span class="tiny">No art</span>'}</div><label class="btn ghost sm">${icon('upload')}${memNewImg ? 'Replace' : 'Upload'} art<input type="file" accept="image/*" class="sr" id="memUp"></label></div>
      <div class="row"><button class="btn mint" id="memAdd">${icon('plus')}Add memory</button><span class="err" id="memErr" hidden>Give it a name first.</span></div>
    </section>
    <section class="stack" style="align-content:start">
      <div class="ad-head" style="margin:0"><h3>Memories <span class="muted" style="font-family:var(--body);font-size:14px">· ${list.length}</span></h3></div>
      ${list.length ? list.map(x => `<div class="mem-row r${x.rarity}"><div class="mem-prev sm">${artFrom(x.img) ? `<img src="${artFrom(x.img)}" alt="">` : icon('memory')}</div>
        <div style="min-width:0;display:grid;gap:4px"><input class="input sk-nm" data-memnm="${esc(x.id)}" maxlength="40" value="${esc(x.name)}" aria-label="Memory name">
          <div class="seg sk-rar">${[4, 5].map(r => `<label class="r${r}"><input type="radio" name="memr-${esc(x.id)}" value="${r}" data-memr="${esc(x.id)}" ${x.rarity === r ? 'checked' : ''}>${RNAME[r]}</label>`).join('')}</div>
          <span class="tiny">${x.char ? `${esc((findEntry(x.char) || {}).name || 'Removed character')} only` : 'Every character'}</span>
          <div class="row" style="gap:8px"><label class="switch" style="padding:4px 8px;gap:8px;font-size:12px">Owned<input type="checkbox" data-memown="${esc(x.id)}" ${owns(x.id) ? 'checked' : ''}><i></i></label><label class="link">Art<input type="file" accept="image/*" class="sr" data-memimg="${esc(x.id)}"></label><button class="link" data-memdel="${esc(x.id)}" style="color:${memDelArm === x.id ? '#ff6b81' : ''}">${memDelArm === x.id ? 'Tap again to delete' : 'Delete'}</button></div></div></div>`).join('') : '<p class="tiny">No memories yet.</p>'}
    </section></div>`;
  $('#memUp').onchange = async ev => { try { memNewImg = await resizeImage(ev.target.files[0], SPLASH_MAX); renderMemoriesTab(); } catch (e) { toast(e.message); } };
  $('#memAdd').onclick = async () => {
    const name = $('#memName').value.trim(); if (!name) { $('#memErr').hidden = false; return; }
    const x = { id: `mem-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name, rarity: +document.querySelector('input[name=memR]:checked').value, char: $('#memChar').value || null, desc: $('#memDesc').value.trim(), img: null };
    if (memNewImg) { await mediaSet('mem:' + x.id, memNewImg); x.img = 'idb:mem:' + x.id; }
    S.memories.push(x); memNewImg = null; persist(); renderMemoriesTab(); toast(`Added ${name}.`);
  };
  document.querySelectorAll('[data-memnm]').forEach(i => i.onchange = () => { memOf(i.dataset.memnm).name = i.value.trim() || 'Memory'; persist(); toast('Memory renamed.'); });
  document.querySelectorAll('[data-memr]').forEach(i => i.onchange = () => { memOf(i.dataset.memr).rarity = +i.value; persist(); renderMemoriesTab(); });
  document.querySelectorAll('[data-memown]').forEach(i => i.onchange = () => { if (i.checked) S.owned[i.dataset.memown] = 1; else delete S.owned[i.dataset.memown]; persist(); });
  document.querySelectorAll('[data-memimg]').forEach(i => i.onchange = async () => { try { const x = memOf(i.dataset.memimg); await mediaSet('mem:' + x.id, await resizeImage(i.files[0], SPLASH_MAX)); x.img = 'idb:mem:' + x.id; persist(); renderMemoriesTab(); } catch (e) { toast(e.message); } });
  document.querySelectorAll('[data-memdel]').forEach(b => b.onclick = async () => {
    const id = b.dataset.memdel;
    if (memDelArm !== id) { memDelArm = id; renderMemoriesTab(); return; }
    memDelArm = null; await mediaDel('mem:' + id);
    S.memories = S.memories.filter(x => x.id !== id); delete S.owned[id];
    for (const cid in S.memEq) S.memEq[cid] = (S.memEq[cid] || []).map(m => m === id ? null : m);
    persist(); renderMemoriesTab(); toast('Memory deleted.');
  });
}

/* marriage skins tab: one MR skin per character, unlocked by marrying them */
function mrSkinOf(c) { const e = c.weddingSkin && findEntry(c.weddingSkin); return e && e.type === 'skin' ? e : null; }
function renderMRTab() {
  const chars = S.pool.filter(e => e.type === 'character').sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  $('#adPanel').innerHTML = `<div class="stack">
    <div><h3>Marriage skins <span class="rtag r6">MR</span></h3><p class="tiny">Upload the MR splash art for each character's wedding outfit. Marrying the character (bond level ${BOND_MAX} + 1 ring) unlocks it and plays the pink-red new outfit animation. Use the standard 1728×972 size; it is shown big in the middle of the screen.</p></div>
    <div class="mr-grid">${chars.map(c => { const k = mrSkinOf(c), art = k && artFrom(k.art);
      return `<div class="mr-card"><div class="mr-art">${art ? `<img src="${art}" alt="">` : `<span class="tiny">No MR art yet</span>`}</div>
        <div style="display:grid;gap:6px;min-width:0"><b>${esc(c.name)}</b>${k ? `<span class="tiny">${esc(k.name)}</span>` : '<span class="tiny">No marriage skin</span>'}
          <label class="field"><span>Outfit name</span><input class="input" data-mrname="${esc(c.id)}" maxlength="30" value="${esc(k ? k.name.replace(c.name + ' · ', '') : 'Eternal Vow')}"></label>
          <div class="row" style="gap:6px"><label class="btn mint sm">${icon('upload')}${art ? 'Replace' : 'Upload'} MR art<input type="file" accept="image/*" class="sr" data-mrup="${esc(c.id)}"></label>${k ? `<button class="btn ghost sm" data-mrsave="${esc(c.id)}">Save name</button><button class="btn ghost sm" data-mrprev="${esc(c.id)}">Preview</button><button class="btn danger sm" data-mrdel="${esc(c.id)}">Remove</button>` : ''}</div></div></div>`; }).join('') || '<div class="empty">Add characters in the Game pool first.</div>'}</div></div>`;
  const ensure = cid => {
    const c = findEntry(cid), name = `${c.name} · ${(document.querySelector(`[data-mrname="${cid}"]`).value.trim() || 'Eternal Vow')}`;
    let k = mrSkinOf(c);
    if (!k) { k = { id: `mr-${cid}`, type: 'skin', name, rarity: 6, parent: cid, art: null, pullable: false, desc: `Wedding outfit for ${c.name}. Unlocked by marriage.`, look: { ...c.look } }; S.pool.push(k); c.weddingSkin = k.id; }
    k.name = name; k.rarity = 6; k.pullable = false;
    return k;
  };
  document.querySelectorAll('[data-mrup]').forEach(inp => inp.onchange = async () => {
    try { const k = ensure(inp.dataset.mrup); await mediaSet('art:' + k.id, await resizeImage(inp.files[0], SPLASH_MAX)); k.art = 'idb:art:' + k.id; persist(); renderMRTab(); renderMenu(); toast(`MR art saved for ${findEntry(inp.dataset.mrup).name}.`); }
    catch (e) { toast(e.message); }
  });
  document.querySelectorAll('[data-mrsave]').forEach(b => b.onclick = () => { ensure(b.dataset.mrsave); persist(); renderMRTab(); toast('Saved.'); });
  document.querySelectorAll('[data-mrprev]').forEach(b => b.onclick = () => { closeModal(); showSkinGet(mrSkinOf(findEntry(b.dataset.mrprev)), { vow: true }); });
  document.querySelectorAll('[data-mrdel]').forEach(b => b.onclick = async () => {
    const c = findEntry(b.dataset.mrdel), k = mrSkinOf(c); if (!k) return;
    await mediaDel('art:' + k.id); S.pool = S.pool.filter(x => x.id !== k.id); delete S.owned[k.id]; c.weddingSkin = null; if (S.wallpaper === k.id) S.wallpaper = null;
    persist(); renderMRTab(); renderMenu(); toast('Marriage skin removed.');
  });
}

/* title screen tab */
function renderTitleTab() {
  const bg = MEDIA.get('title:bg');
  $('#adPanel').innerHTML = `<div class="admin">
    <section class="stack" style="align-content:start">
      <div><h3>Title screen wallpaper</h3><p class="tiny">Shown behind the logo and "Tap to start". Use wide art, for example 1920×1080; it fills the screen. Without one, the default moonlit sky is used.</p></div>
      <div class="tt-prev">${bg ? `<img src="${bg}" alt="">` : '<span class="tiny">Default background</span>'}</div>
      <div class="row"><label class="btn mint sm">${icon('upload')}Upload wallpaper<input type="file" accept="image/*" class="sr" id="ttUp"></label>${bg ? '<button class="btn ghost sm" id="ttDel">Remove</button>' : ''}<button class="btn ghost sm" id="ttShow">Show title screen</button></div>
    </section>
    <section class="stack" style="align-content:start">
      <div><h3>Loading screen wallpapers</h3><p class="tiny">One is picked at random each time the game loads after signing in. Wide art works best. Without any, uploaded character art is used.</p></div>
      <div class="ld-thumbs">${S.loadArts.filter(k => MEDIA.get(k)).map(k => `<div class="ld-thumb"><img src="${MEDIA.get(k)}" alt=""><button data-ldel="${k}" aria-label="Remove">${icon('close')}</button></div>`).join('') || '<span class="tiny">No loading wallpapers yet.</span>'}</div>
      <div class="row"><label class="btn mint sm">${icon('upload')}Add wallpapers<input type="file" accept="image/*" class="sr" id="ldUp" multiple></label><button class="btn ghost sm" id="ldTest">Preview loading screen</button></div>
    </section>
    <section class="stack" style="align-content:start">
      <div><h3>Notice board</h3><p class="tiny">One notice per line: <b>Title | text</b>. Shown from the Notice button on the title screen.</p></div>
      <textarea class="input" id="ttNewsIn" style="min-height:160px">${esc(S.titleNews || DEFAULT_NEWS)}</textarea>
      <div class="row"><button class="btn mint sm" id="ttNewsSave">Save notices</button><button class="btn ghost sm" id="ttNewsReset">Reset to default</button></div>
      ${S.support.length ? `<div><h3>Support messages · ${S.support.length}</h3><div class="hist">${S.support.slice().reverse().map(m => `<div><span>${esc(m.topic)}: ${esc(m.msg.slice(0, 60))}</span><time>${new Date(m.t).toLocaleDateString('en-GB')}</time></div>`).join('')}</div></div>` : ''}
    </section></div>`;
  $('#ttUp').onchange = async ev => { try { await mediaSet('title:bg', await resizeImage(ev.target.files[0], 1920, 'image/jpeg')); renderTitle(); renderTitleTab(); toast('Title wallpaper updated.'); } catch (e) { toast(e.message); } };
  const del = $('#ttDel'); if (del) del.onclick = async () => { await mediaDel('title:bg'); renderTitle(); renderTitleTab(); toast('Back to the default title background.'); };
  $('#ttShow').onclick = showTitle;
  $('#ldUp').onchange = async ev => {
    try { for (const f of ev.target.files) { const k = `load:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; await mediaSet(k, await resizeImage(f, 1920, 'image/jpeg')); S.loadArts.push(k); } persist(); renderTitleTab(); toast('Loading wallpapers added.'); }
    catch (e) { toast(e.message); }
  };
  document.querySelectorAll('[data-ldel]').forEach(b => b.onclick = async () => { await mediaDel(b.dataset.ldel); S.loadArts = S.loadArts.filter(k => k !== b.dataset.ldel); persist(); renderTitleTab(); });
  $('#ldTest').onclick = () => { closeModal(); showLoading(); };
  $('#ttNewsSave').onclick = () => { S.titleNews = $('#ttNewsIn').value.trim() || null; persist(); toast('Notices saved.'); };
  $('#ttNewsReset').onclick = () => { S.titleNews = null; persist(); renderTitleTab(); };
}

/* wallet tab */
function renderWalletTab() {
  const gl = S.gacha.limited, gs = S.gacha.standard;
  const ownedCount = Object.values(S.owned).filter(Boolean).length;
  $('#adPanel').innerHTML = `<div class="stack">
    <div><h3>Wallet</h3><p class="tiny">Set balances for testing. Changes apply right away.</p></div>
    <form class="three" id="wForm">${CUR_KEYS.map(k => `<label class="field"><span>${k}</span><input class="input" type="number" min="0" step="1" id="w_${k}" value="${S.wallet[k]}"></label>`).join('')}</form>
    <div class="row"><button class="btn mint sm" id="wSave">Save wallet</button><button class="btn ghost sm" id="wAdd">${curIcon('pearls')}Add 300 pearls</button><button class="btn ghost sm" id="wStam">${curIcon('stamina')}Spend 60 stamina</button><button class="btn ghost sm" id="wFill">Refill stamina</button><button class="btn ghost sm" id="wLogin">Reset daily login</button><button class="btn ghost sm" id="wSpin">Reset daily spin</button></div>
    <div><h3>Bond &amp; marriage</h3><p class="tiny">Test helpers. Rings are also editable in the wallet above.</p></div>
    <div class="row"><button class="btn ghost sm" id="wRings">${curIcon('rings')}Add 5 rings</button><button class="btn ghost sm" id="wGifts">${curIcon('gplush')}Add 5 of each gift</button><button class="btn ghost sm" id="wBond">Max bond for owned characters</button><button class="btn ghost sm" id="wMC">Reset main character choice</button><button class="btn ghost sm" id="wMCcd">Clear MC switch cooldown</button><button class="btn ghost sm" id="wFarmDone">Farm: finish upgrades</button><button class="btn ghost sm" id="wFarmFill">Farm: fill storage</button><button class="btn ghost sm" id="wFarmReset">Farm: reset</button><button class="btn ghost sm" id="wExp">${curIcon('exp')}+1,000 EXP</button><button class="btn ghost sm" id="wLvReset">Reset level and level rewards</button><button class="btn danger sm" id="wBondReset">Reset all bonds and marriages</button></div>
    <div><h3>Summons</h3></div>
    <div class="statgrid">
      <div class="stat r5"><span class="lbl-sm">Limited UR pity</span><b>${gl.pity5} / ${HARD_PITY}</b></div>
      <div class="stat"><span class="lbl-sm">Limited guarantee</span><b>${gl.guarantee ? 'Yes' : 'No'}</b></div>
      <div class="stat r5"><span class="lbl-sm">Permanent UR pity</span><b>${gs.pity5} / ${HARD_PITY}</b></div>
      <div class="stat"><span class="lbl-sm">Total pulls</span><b>${fmt(gl.total + gs.total)}</b></div>
      <div class="stat"><span class="lbl-sm">Entries owned</span><b>${ownedCount} / ${S.pool.length}</b></div>
    </div>
    <div class="row"><button class="btn ghost sm" id="wPity">Reset pity</button><button class="btn danger sm" id="wClear">Clear my collection</button></div>
    <div id="wConfirm"></div>
  </div>`;
  $('#wForm').onsubmit = e => e.preventDefault();
  $('#wSave').onclick = () => { CUR_KEYS.forEach(k => { const v = Math.max(0, Math.floor(+$('#w_' + k).value || 0)); S.wallet[k] = v; }); persist(); renderMenu(); refreshSummon(); toast('Wallet saved.'); };
  $('#wAdd').onclick = () => { S.wallet.pearls += 300; persist(); renderMenu(); renderWalletTab(); toast('Added 300 pearls.'); };
  $('#wStam').onclick = () => toast(spendStamina(60) ? `Spent 60 stamina. ${S.stamina.v}/${STAMINA_MAX} left.` : 'Not enough stamina.');
  $('#wFill').onclick = () => { S.stamina = { v: STAMINA_MAX, t: Date.now() }; persist(); renderStamina(); toast('Stamina refilled.'); };
  $('#wSpin').onclick = () => { S.spin.last = null; persist(); renderMenu(); toast('The daily spin is ready again.'); };
  $('#wLogin').onclick = () => { S.login.last = null; persist(); renderMenu(); toast('Daily login can be claimed again.'); };
  $('#wRings').onclick = () => { S.wallet.rings += 5; persist(); renderMenu(); renderWalletTab(); toast('Added 5 rings.'); };
  $('#wGifts').onclick = () => { Object.keys(GIFTS).forEach(k => S.gifts[k] += 5); persist(); toast('Added 5 of each gift.'); };
  $('#wBond').onclick = () => { S.pool.filter(e => e.type === 'character' && owns(e.id)).forEach(e => S.bond[e.id] = { ...bondOf(e.id), xp: BOND_XP[BOND_MAX] }); persist(); toast('Every owned character is at bond level 10.'); };
  $('#wFarmDone').onclick = () => { FARM_DEFS.forEach(d => { const f = farmOf(d.id); if (f.up) f.up.ends = Date.now() - 1; }); farmTick(); persist(); renderMenu(); toast('Farm upgrades finished.'); };
  $('#wFarmFill').onclick = () => { FARM_DEFS.forEach(d => { const f = farmOf(d.id); f.acc = farmCap(d.id); f.t = Date.now(); }); persist(); renderMenu(); toast('Farm storage filled.'); };
  $('#wExp').onclick = () => { gainExp(1000); renderMenu(); toast(`+1,000 EXP. Level ${playerLv().lv}.`); };
  $('#wLvReset').onclick = () => { S.player.xp = 0; S.lvClaimed = []; persist(); renderMenu(); toast('Level reset to 1.'); };
  $('#wFarmReset').onclick = () => { S.farm = {}; persist(); renderMenu(); toast('Farm reset.'); };
  $('#wMCcd').onclick = () => { S.player.mcAt = null; persist(); toast('Main character switch cooldown cleared.'); };
  $('#wMC').onclick = () => { S.player.mc = null; S.player.mcAt = null; persist(); toast('Main character choice reset. You will pick again on the next start.'); };
  $('#wBondReset').onclick = () => { S.bond = {}; persist(); toast('Bonds and marriages reset.'); };
  $('#wPity').onclick = () => { Object.assign(S.gacha.limited, { pity5: 0, pity4: 0, guarantee: false }); Object.assign(S.gacha.standard, { pity5: 0, pity4: 0 }); persist(); renderWalletTab(); toast('Pity reset.'); };
  $('#wClear').onclick = () => {
    $('#wConfirm').innerHTML = `<div class="confirm">Remove every character and skin you own and clear pull history? <button class="btn danger sm" id="wClearGo">Clear</button><button class="btn ghost sm" id="wClearNo">Cancel</button></div>`;
    $('#wClearNo').onclick = () => $('#wConfirm').innerHTML = '';
    $('#wClearGo').onclick = () => { S.owned = {}; S.wallpaper = null; S.gacha = sampleState().gacha; persist(); renderMenu(); renderWalletTab(); toast('Collection cleared.'); };
  };
}

/* summon animation tab: fakeout wallpapers (S.fakeArts, media keys fake:*) and previews that spend and add nothing */
function previewPull(kind) {
  const pick = r => rpick(S.pool.filter(e => e.type === 'character' && !e.mc && e.rarity === r)) || rpick(S.pool.filter(e => e.rarity === r && e.type !== 'skin'));
  const ent = r => { const e = pick(r); return e ? { kind: 'entry', id: e.id, rarity: r, isNew: true, starUp: 0, pearls: 0 } : { kind: 'coins', amount: 500, rarity: 3 }; };
  const coin = () => ({ kind: 'coins', amount: 500, rarity: 3 }), frag = () => ({ kind: 'frag', frag: 'ssr', rarity: 3 });
  const res = kind === 'blue' ? [coin()] : kind === 'ssr' ? [ent(4)] : kind === 'ten' ? [coin(), ent(4), frag(), coin(), coin(), ent(5), coin(), frag(), coin(), ent(4)] : [ent(5)];
  closeModal(); showPull(res, res.length, 'limited', { preview: true, fake: kind === 'fake' });
}
function renderPullFxTab() {
  const p = $('#adPanel'); if (!p) return;
  const list = (S.fakeArts || []).filter(k => MEDIA.get(k));
  p.innerHTML = `<div class="stack">
    <div><h3>Pull animation</h3><p class="tiny">Players pull the screen down to release a sphere. It rises and turns from blue (gold and fragments) to orange (SSR) to prism (UR), stopping at the best result of the pull. In ${Math.round(FAKEOUT_CHANCE * 100)}% of UR pulls (never on a hard-pity UR) the sphere stops at orange, one of the fakeout wallpapers below slides in, and the sphere transforms into UR.</p></div>
    <div class="row"><button class="btn ghost sm" data-pv="blue">Preview: blue</button><button class="btn ghost sm" data-pv="ssr">Preview: SSR</button><button class="btn ghost sm" data-pv="ur">Preview: UR</button><button class="btn gold sm" data-pv="fake">Preview: fakeout</button><button class="btn ghost sm" data-pv="ten">Preview: ×10</button></div>
    <div><h3>Fakeout wallpapers</h3><p class="tiny">One is picked at random for each fakeout. Wide character art works best (1920×1080; it covers the screen). Without any, the limited banner's featured character is used.</p></div>
    <div class="ld-thumbs">${list.map(k => `<div class="ld-thumb"><img src="${MEDIA.get(k)}" alt=""><button data-fkdel="${k}" aria-label="Remove">${icon('close')}</button></div>`).join('') || '<span class="tiny">No fakeout wallpapers yet.</span>'}</div>
    <div class="row"><label class="btn mint sm">${icon('upload')}Add wallpapers<input type="file" accept="image/*" class="sr" id="fkUp" multiple></label></div>
  </div>`;
  p.querySelectorAll('[data-pv]').forEach(b => b.onclick = () => previewPull(b.dataset.pv));
  $('#fkUp').onchange = async ev => {
    try { for (const f of ev.target.files) { const k = `fake:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`; if (await mediaSet(k, await resizeImage(f, 1920, 'image/jpeg'))) S.fakeArts = [...(S.fakeArts || []), k]; } persist(); renderPullFxTab(); toast('Fakeout wallpapers added.'); }
    catch (e) { toast(e.message, true); }
  };
  p.querySelectorAll('[data-fkdel]').forEach(b => b.onclick = async () => { await mediaDel(b.dataset.fkdel); S.fakeArts = (S.fakeArts || []).filter(k => k !== b.dataset.fkdel); persist(); renderPullFxTab(); });
}
