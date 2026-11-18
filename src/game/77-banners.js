/* =========================================================
   CUSTOM BANNERS (the owner's ask: a more premium admin Banners page where new banners can be added for characters,
   outfits or memories). Content S.banners.custom = [{id, name, kind: 'char'|'skin'|'mem', tag, note, feat, ur: [ids],
   ssr: [ids], start, end ('YYYY-MM-DD' or ''), active, tk: 'tickets'|'wishes', rate (1 / 1.5 / 2), free, ssrMem, col}].
   A live one (active and inside its dates) is a summon tab right after the Limited banner (bannerKeys), with its own
   pity (S.gacha['cb:<id>']), the 50/50 when it has a featured UR, its own ticket, rate and colour, an optional art
   (media banner:<id>, 16:9) and a mini banner on the home carousel. Its pulls give Permanent summon points.
   ========================================================= */
const CB_KINDS = {
  char: { name: 'Character', many: 'characters', ic: 'chars', col: '#ff5aa5', tag: 'Featured', tk: 'tickets', rate: 1 },
  skin: { name: 'Outfit', many: 'outfits', ic: 'skins', col: '#e06ad0', tag: 'Outfits', tk: 'tickets', rate: 1 },
  mem: { name: 'Memory', many: 'memories', ic: 'memory', col: '#34c6c6', tag: 'Memories', tk: 'wishes', rate: 2 }
};
const CB_COLS = ['#ff5aa5', '#ff8a4c', '#f0c14a', '#5fd38a', '#34c6c6', '#4f9bff', '#8f7dff', '#e06ad0', '#ff4d5e'];
function cbList() { const b = S.banners || (S.banners = {}); if (!Array.isArray(b.custom)) b.custom = []; return b.custom; }
function cbOf(bk) { return typeof bk === 'string' && bk.startsWith('cb:') ? cbList().find(c => c.id === bk.slice(3)) || null : null; }
function cbStart(c) { return c.start ? +new Date(c.start + 'T00:00:00') : null; }
function cbEnd(c) { return c.end ? +new Date(c.end + 'T23:59:00') : null; }
function cbState(c) { return !c.active ? 'off' : cbStart(c) && Date.now() < cbStart(c) ? 'soon' : cbEnd(c) && Date.now() > cbEnd(c) ? 'ended' : 'live'; }
function cbGacha(bk) { return S.gacha[bk] || (S.gacha[bk] = { pity5: 0, pity4: 0, guarantee: false, total: 0 }); }
function cbLiveKeys() { return cbList().filter(c => cbState(c) === 'live').map(c => { const k = 'cb:' + c.id; cbGacha(k); return k; }); }
function ssrMemOn(bk) { return SSR_MEM_BK.includes(bk) || (!!cbOf(bk) && cbOf(bk).kind === 'char' && cbOf(bk).ssrMem !== false); }   // function declarations: the summon code calls these before this file has run
/* what each kind of banner can hold, by rarity */
function cbPool(kind, r) {
  if (kind === 'skin') return pullableSkins(r);
  if (kind === 'mem') return pullableMems(r).filter(Boolean);
  return S.pool.filter(e => e.type === 'character' && !e.mc && +e.rarity === r && e.pullable !== false);
}
/* what the admin can choose from (outfits: also XR in the UR slot and ones not pullable); the default pools stay cbPool */
function cbCands(kind, r) { return kind === 'skin' ? bannerSkinCands(r) : cbPool(kind, r); }
function cbInfo(bk) {
  const c = cbOf(bk), K = CB_KINDS[c.kind] || CB_KINDS.char, urs = cbPool(c.kind, 5), ssrs = cbPool(c.kind, 4), uc = cbCands(c.kind, 5), sc = cbCands(c.kind, 4);
  const feat = uc.find(e => e.id === c.feat) || null;
  const pick = (ids, all) => { const L = (ids || []).map(id => all.find(e => e.id === id)).filter(Boolean); return L.length ? L : null; };
  let ur = pick(c.ur, uc) || (feat && c.kind === 'char' ? standardURs().filter(e => e.type === 'character') : urs);
  if (feat && !ur.length) ur = urs.length ? urs : [feat];
  const ssr = pick(c.ssr, sc) || ssrs;
  return { bk, kind: feat ? 'feat' : 'pool', word: K.tag.toUpperCase(), tab: c.tag || K.tag, feat, lose: ur, ur: feat ? ur : ur.filter(e => e), ssr,
    ends: cbEnd(c), title: c.name || `New ${K.name} Banner`, skins: c.kind === 'skin', mems: c.kind === 'mem', note: c.note || (+c.rate > 1 ? `${c.rate}× UR and SSR rates` : ''),
    art: MEDIA.get('banner:' + c.id) || null, col: c.col || K.col, cb: true };
}
/* the home carousel: live custom banners right after the Limited one */
{ const h0 = hmBanners;
  hmBanners = function () {
    const L = h0.apply(this, arguments), now = Date.now();
    const at = Math.max(0, L.findIndex(b => b.id === 'b:limited') + 1);
    const add = cbLiveKeys().map(bk => { const B = bannerInfo(bk), e = B.feat || B.ur.find(x => baseArt(x)) || B.ur[0];
      if (B.ends && B.ends < now) return null;
      return { id: 'b:' + bk, kind: `${CB_KINDS[cbOf(bk).kind].name} banner`, col: B.col, ic: 'summon', title: B.feat ? B.feat.name : B.title, sub: B.feat ? `Rate up · ${B.title}` : B.note || B.title, ends: B.ends, art: B.art || (e ? baseArt(e) : null), go: () => openSummon(bk) }; }).filter(Boolean);
    L.splice(at, 0, ...add); return L;
  }; }

/* ---------- admin → Banners: a gallery of every banner, New banner by kind, and an editor ---------- */
let bnSel = 'limited', bnDelArm = null;
const BN_BUILT = [['beginner', 'Beginner', 'New players'], ['stepup', 'Step-Up', '7 steps'], ['limited', 'Limited', 'Rate up'], ['weekly', 'Weekly', 'Rotates every Monday'], ['skins', 'Outfits', 'Outfit pool'], ['memories', 'Memories', 'Memory pool'], ['standard', 'Permanent', 'Always on']];
const BN_SEC = ['beginner', 'stepup', 'limited', 'standard', 'standard', 'weekly', 'skins'];   // the built-in editor's sections, in order
const bnBuiltState = k => k === 'limited' ? (limitedUR() ? (bannerInfo('limited').ends < Date.now() ? 'ended' : 'live') : 'off') : k === 'beginner' ? (beginPicks().length ? 'live' : 'off') : k === 'stepup' ? (stepFeat() ? 'live' : 'off') : 'always';
const BN_ST = { live: 'Live', soon: 'Scheduled', ended: 'Ended', off: 'Off', always: 'Always on' };
const bnDate = t => t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
function bnCard(k) {
  const B = bannerInfo(k), c = cbOf(k), st = c ? cbState(c) : bnBuiltState(k), e = B.feat || B.ur.find(x => baseArt(x)) || B.ur[0];
  const art = B.art || (e && baseArt(e)), kind = c ? CB_KINDS[c.kind] : null;
  const when = c ? (c.start || c.end ? `${c.start ? bnDate(cbStart(c)) : 'Now'} → ${c.end ? bnDate(cbEnd(c)) : 'no end'}` : 'No dates') : (BN_BUILT.find(b => b[0] === k) || [])[2];
  return `<button class="bna-card ${bnSel === k ? 'on' : ''}" data-bnsel="${esc(k)}" style="--bc:${B.col || 'var(--tc,#8f7dff)'}" ${c ? '' : `data-bk="${k}"`}>
    <span class="bna-art">${art ? `<img src="${art}" alt="">` : `<i>${icon(kind ? kind.ic : 'sparkle')}</i>`}</span><i class="bna-shade"></i>
    <span class="bna-st ${st}">${BN_ST[st]}</span>${c ? `<span class="bna-kind">${icon(kind.ic)}${kind.name}</span>` : '<span class="bna-kind bi">Built-in</span>'}
    <span class="bna-txt"><small>${esc(B.tab)}</small><b>${esc(c ? B.title : bannerName(k))}</b><em>${B.feat ? `${icon('star')}${esc(B.feat.name)}` : esc(when || '')}</em>${c ? `<em class="d">${esc(when)}</em>` : ''}</span></button>`;
}
{ const bnOld = renderBannersTab;
  renderBannersTab = function () {
    if (bnSel.startsWith('cb:') && !cbOf(bnSel)) bnSel = 'limited';
    const L = cbList(), live = L.filter(c => cbState(c) === 'live').length, soon = L.filter(c => cbState(c) === 'soon').length;
    let built = null;
    if (!bnSel.startsWith('cb:') && bnSel !== 'memories') { bnOld(); built = $('#adPanel .admin'); }
    const p = $('#adPanel');
    p.innerHTML = `<div class="bna">
      <header class="bna-hero"><div class="bna-ht"><span class="bna-hic">${icon('sparkle')}</span><div><h3>Banners</h3><p class="tiny">${BN_BUILT.length} built-in · ${L.length} of your own${L.length ? ` · ${live} live${soon ? ` · ${soon} scheduled` : ''}` : ''}. Your banners appear on the summon screen right after the Limited banner while they are on and inside their dates.</p></div></div>
        <div class="bna-new"><span class="tiny">New banner</span>${Object.entries(CB_KINDS).map(([k, K]) => `<button class="bna-nb" data-bnnew="${k}" style="--bc:${K.col}">${icon(K.ic)}<b>${K.name}</b><small>${K.many}</small></button>`).join('')}</div></header>
      ${L.length ? `<h4 class="bna-h">Your banners</h4><div class="bna-grid">${L.map(c => bnCard('cb:' + c.id)).join('')}</div>` : `<div class="bna-empty">${icon('sparkle')}<span><b>No banners of your own yet</b><small>Pick Character, Outfit or Memory above to make one: a featured UR with a 50/50, its own pool, dates, ticket, rates and art.</small></span></div>`}
      <h4 class="bna-h">Built-in banners</h4><div class="bna-grid">${BN_BUILT.map(([k]) => bnCard(k)).join('')}</div>
      <section class="bna-ed" id="bnEd"></section></div>`;
    const ed = $('#bnEd');
    if (bnSel.startsWith('cb:')) bnEditor(ed, cbOf(bnSel));
    else if (bnSel === 'memories') ed.innerHTML = `<div class="bna-pane"><h3>${esc(bannerName('memories'))}</h3><p class="tiny">Every memory is on this banner at double the UR and SSR rates, paid with Standard tickets, with a free UR memory at ${MILES.memories.n} pulls. Memories are added in Characters & items → Memories. To feature one memory with a 50/50, make a <b>Memory</b> banner above.</p></div>`;
    else if (built) { ed.appendChild(built); [...built.children].forEach((sec, i) => { sec.hidden = BN_SEC[i] !== bnSel; }); built.classList.add('bna-built'); }
    p.querySelectorAll('[data-bnsel]').forEach(b => b.onclick = () => { bnSel = b.dataset.bnsel; bnDelArm = null; renderBannersTab(); requestAnimationFrame(() => { const x = $('#bnEd'); if (x) x.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); });
    p.querySelectorAll('[data-bnnew]').forEach(b => b.onclick = () => bnNew(b.dataset.bnnew));
  }; }
function bnNew(kind, from) {
  const K = CB_KINDS[kind], d = new Date(), iso = t => new Date(t).toISOString().slice(0, 10);
  const c = from ? { ...JSON.parse(JSON.stringify(from)), name: `${from.name} (copy)`, active: false } : { name: `New ${K.name} Banner`, kind, tag: K.tag, note: '', feat: null, ur: [], ssr: [], start: iso(d), end: iso(+d + 14 * 864e5), active: false, tk: K.tk, rate: K.rate, free: false, ssrMem: true, col: K.col };
  c.id = 'b' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  cbList().push(c); bnSel = 'cb:' + c.id; persist(); renderBannersTab();
  toast(from ? 'Banner copied (switched off).' : `New ${K.name.toLowerCase()} banner. Pick a featured UR, set the dates and switch it on.`);
}
const bnLbl = e => e.type === 'skin' ? skinLabel(e) : e.name;
const bnSub = e => { if (e.type !== 'skin') return ''; const c = findEntry(e.parent); return `<small class="bna-pks">${c ? esc(c.name) : ''}${+e.rarity === 7 ? ' · XR' : ''}${e.pullable === false ? ' · not pullable' : ''}</small>`; };
const bnThumb = e => { const m = e.type === 'memory' && (S.memories || []).find(x => x.id === e.id); return `<span class="bna-th">${m ? memCellPic(m, 0) : baseThumb(e)}</span>`; };
function bnEditor(ed, c) {
  const K = CB_KINDS[c.kind], urs = cbCands(c.kind, 5), ssrs = cbCands(c.kind, 4), B = bannerInfo('cb:' + c.id), st = cbState(c);
  const O = bannerOdds('cb:' + c.id), tier = r => (O.tiers.find(t => t.r === r) || { p: 0 }).p, featP = B.feat ? (O.groups.find(g => g.key === 'feat') || { items: [{ p: 0 }] }).items[0].p : 0;
  const seg = (key, opts) => `<div class="bna-seg">${opts.map(([v, l]) => `<button type="button" class="${String(c[key]) === String(v) ? 'on' : ''}" data-cbset="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const sw = (key, label, sub, on) => `<label class="bna-sw"><input type="checkbox" data-cbchk="${key}" ${on ? 'checked' : ''}><i></i><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span></label>`;
  const chips = (key, list, all) => list.length ? `<div class="bna-picks">${list.map(e => { const on = (c[key] || []).includes(e.id); return `<button type="button" class="bna-pk ${on ? 'on' : ''}" data-cbpick="${key}" data-id="${esc(e.id)}" title="${esc(bnLbl(e))}">${bnThumb(e)}<span>${esc(e.name)}${bnSub(e)}</span>${on ? `<i>${icon('check')}</i>` : ''}</button>`; }).join('')}</div><p class="tiny">${(c[key] || []).length ? `${(c[key] || []).length} chosen.` : all} Tap to choose; none chosen uses the default.</p>` : `<p class="tiny">No ${K.many} of this rarity yet.</p>`;
  const art = MEDIA.get('banner:' + c.id), e = B.feat || B.ur.find(x => baseArt(x)) || B.ur[0], pv = art || (e && baseArt(e));
  ed.innerHTML = `<div class="bna-ce" style="--bc:${B.col}">
    <div class="bna-form">
      <div class="bna-row2"><label class="field"><span>Banner name</span><input class="input" id="cbName" maxlength="32" value="${esc(c.name)}"></label>
        <label class="field"><span>Tab label</span><input class="input" id="cbTag" maxlength="14" value="${esc(c.tag || '')}" placeholder="${K.tag}"></label></div>
      <label class="field"><span>Line under the name (optional)</span><input class="input" id="cbNote" maxlength="60" value="${esc(c.note || '')}" placeholder="e.g. Summer collab · 2× rates"></label>
      <div class="bna-blk"><h5>Type</h5><div class="bna-seg kinds">${Object.entries(CB_KINDS).map(([k, X]) => `<button type="button" class="${c.kind === k ? 'on' : ''}" data-cbkind="${k}">${icon(X.ic)}${X.name}</button>`).join('')}</div><p class="tiny">Changing the type clears the featured UR and the chosen pools.</p></div>
      <div class="bna-blk"><h5>When</h5>${sw('active', 'Banner is on', st === 'live' ? 'Players can summon on it now' : st === 'soon' ? 'Starts on its start date' : st === 'ended' ? 'Its end date has passed' : 'Hidden from players', c.active)}
        <div class="bna-row2"><label class="field"><span>Starts on</span><input class="input" type="date" id="cbStart" value="${esc(c.start || '')}"></label><label class="field"><span>Ends on</span><input class="input" type="date" id="cbEnd" value="${esc(c.end || '')}"></label></div></div>
      <div class="bna-blk"><h5>Featured UR ${K.name.toLowerCase()}<span>a 50/50 on every UR, then a guarantee</span></h5>
        <div class="bna-picks feat"><button type="button" class="bna-pk none ${c.feat ? '' : 'on'}" data-cbfeat=""><span class="bna-th">${icon('sparkle')}</span><span>None · equal chance</span></button>${urs.map(x => `<button type="button" class="bna-pk ${c.feat === x.id ? 'on' : ''}" data-cbfeat="${esc(x.id)}" title="${esc(bnLbl(x))}">${bnThumb(x)}<span>${esc(x.name)}${bnSub(x)}</span>${c.feat === x.id ? `<i>${icon('star')}</i>` : ''}</button>`).join('')}</div></div>
      <div class="bna-blk"><h5>${c.feat ? `Other UR ${K.many} (when the 50/50 is lost)` : `UR ${K.many} on this banner`}</h5>${chips('ur', urs.filter(x => x.id !== c.feat), c.feat && c.kind === 'char' ? 'Default: the permanent banner\'s URs.' : `Default: every UR ${K.name.toLowerCase()}.`)}</div>
      <div class="bna-blk"><h5>SSR ${K.many}</h5>${chips('ssr', ssrs, `Default: every SSR ${K.name.toLowerCase()}.`)}</div>
      <div class="bna-blk"><h5>Rules</h5>
        <div class="bna-row2"><div class="field"><span>Paid with</span>${seg('tk', [['tickets', `${curIcon('tickets')}Limited tickets`], ['wishes', `${curIcon('wishes')}Standard tickets`]])}</div>
          <div class="field"><span>UR and SSR rates</span>${seg('rate', [[1, '1×'], [1.5, '1.5×'], [2, '2×']])}</div></div>
        ${sw('free', 'Free daily pull', 'One free ×1 a day on this banner', !!c.free)}
        ${c.kind === 'char' ? sw('ssrMem', 'SSR memories', 'A third of SSR results are SSR memories, like the Limited banner', c.ssrMem !== false) : ''}</div>
      <div class="bna-blk"><h5>Look</h5><div class="bna-cols">${CB_COLS.map(x => `<button type="button" class="bna-col ${(c.col || K.col) === x ? 'on' : ''}" data-cbcol="${x}" style="--c:${x}" aria-label="Colour ${x}"></button>`).join('')}<label class="bna-col pick" title="Any colour"><input type="color" id="cbColor" value="${c.col || K.col}"></label></div>
        <div class="bna-artrow"><label class="btn ghost sm">${icon('image')}${art ? 'Replace banner art' : 'Upload banner art'}<input type="file" accept="image/*" class="sr" id="cbArt"></label>${art ? `<button class="btn ghost sm" id="cbArtDel">Remove</button>${artFrameBtn('banner:' + c.id, 'screen', 'Banner art')}` : ''}<span class="tiny">16:9, shown whole on the summon screen; without one the featured UR's splash art.</span></div></div>
    </div>
    <aside class="bna-side">
      <div class="bna-pv"><span class="bna-pvart">${pv ? `<img src="${pv}" alt="" ${art ? `style="${artPosStyle('banner:' + c.id)}"` : ''}>` : `<i>${icon(K.ic)}</i>`}</span><i class="bna-shade"></i>
        <span class="bna-st ${st}">${BN_ST[st]}</span><span class="bna-pvt"><small>${esc(B.tab)} summon${B.feat ? ' · Rate up' : ''}</small><b>${esc(B.feat ? B.feat.name : B.title)}</b><em>${esc(B.feat ? B.title : B.note || `${B.ur.length} UR ${K.many} · equal chance`)}</em>${B.ends ? `<span class="bna-time">${icon('clock')}${B.ends < Date.now() ? 'Ended' : `Ends in ${shortLeft(B.ends)}`}</span>` : ''}</span></div>
      <div class="bna-odds"><div><b>${pctTxt(tier(5))}%</b><small>UR a pull</small></div><div><b>${B.feat ? pctTxt(featP) + '%' : '—'}</b><small>Featured</small></div><div><b>${pctTxt(tier(4))}%</b><small>SSR a pull</small></div><div><b>${HARD_PITY}</b><small>UR pity</small></div></div>
      <ul class="bna-sum"><li>${icon(K.ic)}${B.ur.length} UR · ${B.ssr.length} SSR ${K.many}</li><li>${curIcon(TK('cb:' + c.id))}${TK_NAME[TK('cb:' + c.id)]}s or pearls · ×1 and ×10</li><li>${icon('clock')}${c.start || c.end ? `${c.start ? bnDate(cbStart(c)) : 'Now'} → ${c.end ? bnDate(cbEnd(c)) : 'no end'}` : 'No dates'}</li><li>${curIcon('sptp')}Pulls give Permanent summon points</li></ul>
      <div class="bna-acts"><button class="btn gold sm" id="cbOpen" ${st === 'live' ? '' : 'disabled title="Switch it on and set dates that include today"'}>${icon('sparkle')}Open on the summon screen</button>
        <div class="row"><button class="btn ghost sm" data-cbmove="-1" title="Earlier tab">${icon('back')}Earlier</button><button class="btn ghost sm" data-cbmove="1" title="Later tab">Later<span style="display:inline-flex;transform:scaleX(-1)">${icon('back')}</span></button></div>
        <div class="row"><button class="btn ghost sm" id="cbDup">${icon('copy')}Duplicate</button><button class="btn ghost sm danger" id="cbDel">${bnDelArm === c.id ? 'Tap again to delete' : 'Delete'}</button></div></div>
    </aside></div>`;
  const save = (re = true) => { persist(); renderMenu(); if (re) renderBannersTab(); };
  const q = s => ed.querySelector(s);
  q('#cbName').oninput = ev => { c.name = ev.target.value.trim() || `New ${K.name} Banner`; save(false); };
  q('#cbName').onchange = () => renderBannersTab();
  q('#cbTag').oninput = ev => { c.tag = ev.target.value.trim(); save(false); };
  q('#cbNote').oninput = ev => { c.note = ev.target.value.trim(); save(false); };
  q('#cbStart').onchange = ev => { c.start = ev.target.value || ''; save(); };
  q('#cbEnd').onchange = ev => { c.end = ev.target.value || ''; save(); };
  ed.querySelectorAll('[data-cbkind]').forEach(b => b.onclick = () => { const k = b.dataset.cbkind; if (k === c.kind) return; const X = CB_KINDS[k];
    if (c.tag === K.tag) c.tag = X.tag; if (c.col === K.col) c.col = X.col; c.kind = k; c.feat = null; c.ur = []; c.ssr = []; c.tk = X.tk; c.rate = X.rate; save(); });
  ed.querySelectorAll('[data-cbchk]').forEach(i => i.onchange = () => { c[i.dataset.cbchk] = i.checked; save(); });
  ed.querySelectorAll('[data-cbset]').forEach(b => b.onclick = () => { const k = b.dataset.cbset; c[k] = k === 'rate' ? +b.dataset.v : b.dataset.v; save(); });
  ed.querySelectorAll('[data-cbfeat]').forEach(b => b.onclick = () => { c.feat = b.dataset.cbfeat || null; c.ur = (c.ur || []).filter(id => id !== c.feat); save(); });
  ed.querySelectorAll('[data-cbpick]').forEach(b => b.onclick = () => { const k = b.dataset.cbpick, id = b.dataset.id, L = c[k] || []; c[k] = L.includes(id) ? L.filter(x => x !== id) : [...L, id]; save(); });
  ed.querySelectorAll('[data-cbcol]').forEach(b => b.onclick = () => { c.col = b.dataset.cbcol; save(); });
  q('#cbColor').onchange = ev => { c.col = ev.target.value; save(); };
  q('#cbArt').onchange = async ev => { try { await mediaSet('banner:' + c.id, await resizeImage(ev.target.files[0])); save(); toast('Banner art uploaded.'); } catch (er) { toast(er.message, true); } };
  const ad = q('#cbArtDel'); if (ad) ad.onclick = async () => { await mediaDel('banner:' + c.id); save(); };
  bindAdminArt(ed, renderBannersTab);
  q('#cbOpen').onclick = () => { closeModal(); openSummon('cb:' + c.id); };
  ed.querySelectorAll('[data-cbmove]').forEach(b => b.onclick = () => { const L = cbList(), i = L.indexOf(c), j = i + +b.dataset.cbmove; if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; save(); });
  q('#cbDup').onclick = () => bnNew(c.kind, c);
  q('#cbDel').onclick = async () => { if (bnDelArm !== c.id) { bnDelArm = c.id; return renderBannersTab(); }
    cbList().splice(cbList().indexOf(c), 1); await mediaDel('banner:' + c.id); bnDelArm = null; bnSel = 'limited'; save(); toast('Banner deleted.'); };
}
