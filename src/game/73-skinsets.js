/* ---------- Skin sets (the owner's ask): the admin groups outfits into themed sets (admin → Characters & items → Skin sets).
   The Index's Skins tab shows them organised by theme, then by set (sets of the same theme sit together under one heading),
   and every set can give battle buffs for owning its skins: a buff counts when the deck leader WEARS one of the set's skins
   (equippedOf) and you own at least n of the set (n = 0 means all of them). Content S.skinSets
   [{id, name, theme, col, skins: [skin ids], buffs: [{n, k, v}]}] (in CONTENT_KEYS); the buffs are their own track on top
   of the shared caps (like the CS brackets), added to lsBonus (65-leader.js), so they show in Battle bonuses, the Deck
   screen's leader showcase and every battle (Arena too; only a future ranked mode drops them). ---------- */
const skinSets = () => Array.isArray(S.skinSets) ? S.skinSets : (S.skinSets = []);
const SS_BUFF = {
  hp: ['Hero HP', v => `Hero +${v} HP`],
  heal: ['Heal passive', v => `Heal passive +${v}`],
  cards: ['Opening cards', v => `+${v} opening card${v > 1 ? 's' : ''}`],
  ap1: ['First-turn AP', v => `+${v} AP on your first turn`],
  fu: ['First unit max HP', v => `Your first unit +${v} max HP`],
  cheap: ['Cheaper first skill', () => 'Your first skill use costs 1 AP less']
};
const SS_COLS = ['#ff9ad8', '#9fd8ff', '#ffd36a', '#9dffb0', '#c8a2ff', '#ff8a8a', '#7fe8e0', '#ffb36b'];
const ssSkins = set => (set.skins || []).map(findEntry).filter(e => e && e.type === 'skin');
const ssOwnedN = set => ssSkins(set).filter(e => owns(e.id)).length;
const ssNeed = (set, b) => { const n = ssSkins(set).length; return !b.n || b.n > n ? n : b.n; };
const ssBuffTxt = b => (SS_BUFF[b.k] || SS_BUFF.hp)[1](b.v || 1);
const ssOf = skinId => skinSets().filter(s => (s.skins || []).includes(skinId));
const ssCol = s => s.col || '#c8a2ff';
/* the buffs a leader gets from the sets of the skin it wears */
function ssBuffsFor(e) {
  const k = e && owns(e.id) && equippedOf(e); if (!k) return [];
  const out = [];
  for (const s of ssOf(k.id)) { const have = ssOwnedN(s); for (const b of s.buffs || []) if (ssSkins(s).length && have >= ssNeed(s, b)) out.push({ set: s, b }); }
  return out;
}
{ const o = lsBonus; lsBonus = function (e) {
  const b = o.apply(this, arguments); if (!b || !e || !owns(e.id)) return b;
  const got = ssBuffsFor(e); b.ss = {};
  for (const { set, b: x } of got) {
    if (x.k === 'cheap') b.cheap = true; else { b[x.k] = (b[x.k] || 0) + (x.v || 1); b.ss[x.k] = (b.ss[x.k] || 0) + (x.v || 1); }
    b.src.push(['Skin set', `${esc(set.name)} · ${ssOwnedN(set)} / ${ssSkins(set).length}`, ssBuffTxt(x)]);
  }
  return b;
}; }

/* a set's buff list as chips (reached ones lit) */
const ssBuffChips = s => { const have = ssOwnedN(s), all = ssSkins(s).length;
  return (s.buffs || []).length ? (s.buffs || []).map(b => { const need = ssNeed(s, b), on = all && have >= need;
    return `<span class="ss-buff ${on ? 'on' : ''}" title="Counts when your deck leader wears a skin of this set">${icon(on ? 'check' : 'lock')}<b>${need === all ? `All ${all}` : `${need} / ${all}`}</b>${esc(ssBuffTxt(b))}</span>`; }).join('') : '<span class="ss-buff none">No buffs</span>'; };

/* ---- the Index: the Skins tab organised by theme and set ---- */
let ssTheme = 'all';
const ssThemeOf = s => (s.theme || '').trim() || s.name;
function ssIndexHTML() {
  const own = e => !colOwnedOnly || owns(e.id), sets = skinSets().filter(s => ssSkins(s).length);
  const themes = [...new Set(sets.map(ssThemeOf))];
  const inSet = new Set(sets.flatMap(s => s.skins));
  const loose = S.pool.filter(e => e.type === 'skin' && !mcOff(e.id) && !inSet.has(e.id) && !(e.parent && mcOff(e.parent))).filter(own).sort((a, b) => owns(b.id) - owns(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  if (ssTheme !== 'all' && ssTheme !== '__other' && !themes.includes(ssTheme)) ssTheme = 'all';
  const chip = (v, l, n) => `<button class="ss-tchip ${ssTheme === v ? 'on' : ''}" data-sstheme="${esc(v)}">${esc(l)}${n != null ? `<small>${n}</small>` : ''}</button>`;
  const head = themes.length ? `<div class="ss-themes">${chip('all', 'All outfits')}${themes.map(t => chip(t, t, sets.filter(s => ssThemeOf(s) === t).length)).join('')}${loose.length ? chip('__other', 'Other outfits') : ''}</div>` : '';
  const setBox = s => { const L = ssSkins(s).filter(own), all = ssSkins(s).length, have = ssOwnedN(s);
    return L.length ? `<section class="ss-set" style="--ssc:${ssCol(s)}"><header class="ss-sh"><span class="ss-ic">${icon('skins')}</span><span class="ss-st"><b>${esc(s.name)}</b><small>${have} / ${all} owned${have >= all ? ' · Complete' : ''}</small></span><i class="ss-bar"><i style="width:${all ? have / all * 100 : 0}%"></i></i></header>
      <div class="ss-buffs">${ssBuffChips(s)}</div><div class="cards col-chars">${L.map(skinColCard).join('')}</div></section>` : ''; };
  const groups = themes.filter(t => ssTheme === 'all' || ssTheme === t).map(t => { const body = sets.filter(s => ssThemeOf(s) === t).map(setBox).join('');
    return body ? `<div class="ss-group"><h4 class="ss-gh">${esc(t)}<small>${sets.filter(s => ssThemeOf(s) === t).length} set${sets.filter(s => ssThemeOf(s) === t).length > 1 ? 's' : ''}</small></h4>${body}</div>` : ''; }).join('');
  const rest = (ssTheme === 'all' || ssTheme === '__other') && loose.length ? `<div class="ss-group">${themes.length ? '<h4 class="ss-gh">Other outfits</h4>' : ''}<div class="cards col-chars">${loose.map(skinColCard).join('')}</div></div>` : '';
  return head + (groups + rest || `<div class="empty">${colOwnedOnly ? 'You don\'t own any outfits here yet.' : 'No outfits yet.'}</div>`);
}
{ const o = renderCollection; renderCollection = function (filter) {
  o.apply(this, arguments);
  const root = $('#colRoot'); if (!root || filter !== 'skin') return;
  const tabs = root.querySelector('.tabs'); [...root.children].forEach(c => { if (c !== tabs) c.remove(); });
  tabs.insertAdjacentHTML('afterend', `<div class="ss-index">${ssIndexHTML()}</div>`);
  root.querySelectorAll('[data-card]').forEach(b => b.onclick = () => renderDetail(b.dataset.card, 'skin'));
  root.querySelectorAll('[data-sstheme]').forEach(b => b.onclick = () => { ssTheme = b.dataset.sstheme; renderCollection('skin'); });
}; }
/* a skin's detail page names its sets and their buffs */
{ const o = renderDetail; renderDetail = function (id) {
  o.apply(this, arguments);
  const e = findEntry(id), info = document.querySelector('#colRoot .dt-info'); if (!e || e.type !== 'skin' || !info) return;
  const L = ssOf(e.id).filter(s => ssSkins(s).length); if (!L.length) return;
  const box = L.map(s => `<div class="ss-dt" style="--ssc:${ssCol(s)}"><b>${icon('skins')}${esc(s.name)} <small>${ssOwnedN(s)} / ${ssSkins(s).length} owned</small></b><div class="ss-buffs">${ssBuffChips(s)}</div></div>`).join('');
  const d = info.querySelector('.desc'); (d || info.lastElementChild).insertAdjacentHTML('beforebegin', `<div class="ss-dts"><small class="tiny">Skin set buffs count in battle when your deck leader wears a skin of the set.</small>${box}</div>`);
}; }

/* ---- the admin page ---- */
let ssEd = null, ssQ = '';
function renderSkinSetsTab() {
  const p = $('#adPanel'); if (!p) return;
  const sets = skinSets(); if (!sets.some(s => s.id === ssEd)) ssEd = sets[0] ? sets[0].id : null;
  const s = sets.find(x => x.id === ssEd);
  const skins = S.pool.filter(e => e.type === 'skin');
  const list = sets.map(x => `<button type="button" class="ssa-it ${x.id === ssEd ? 'on' : ''}" data-ssed="${x.id}" style="--ssc:${ssCol(x)}"><b>${esc(x.name)}</b><small>${esc(x.theme || 'No theme')} · ${ssSkins(x).length} skins · ${(x.buffs || []).length} buff${(x.buffs || []).length === 1 ? '' : 's'}</small></button>`).join('');
  const pick = s ? (() => { const q = ssQ.toLowerCase(), by = {};
    for (const k of skins) { const par = findEntry(k.parent); if (q && !(k.name + ' ' + (par ? par.name : '')).toLowerCase().includes(q)) continue; (by[par ? par.name : 'Other'] = by[par ? par.name : 'Other'] || []).push(k); }
    return Object.entries(by).sort((a, b) => a[0].localeCompare(b[0])).map(([nm, L]) => `<div class="ssa-ch"><span class="tiny">${esc(nm)}</span><div class="ssa-sk">${L.map(k => { const on = s.skins.includes(k.id), other = ssOf(k.id).filter(x => x.id !== s.id);
      return `<button type="button" class="ssa-skin ${on ? 'on' : ''}" data-sstog="${k.id}" title="${esc(k.name)}${other.length ? ' · also in ' + esc(other.map(x => x.name).join(', ')) : ''}">${baseThumb(k)}<span>${esc(k.name.replace(((findEntry(k.parent) || {}).name || '') + ' · ', ''))}</span>${rtag(k.rarity)}${on ? `<i>${icon('check')}</i>` : ''}</button>`; }).join('')}</div></div>`).join('') || '<p class="tiny">No skins match.</p>'; })() : '';
  const need = (b, n) => `<select class="setx-sel" data-ssbn="${b}"><option value="0"${!s.buffs[b].n ? ' selected' : ''}>Own all ${n}</option>${Array.from({ length: Math.max(0, n - 1) }, (_, i) => i + 1).map(i => `<option value="${i}"${s.buffs[b].n === i ? ' selected' : ''}>Own ${i} of ${n}</option>`).join('')}</select>`;
  const buffs = s ? (s.buffs || []).map((b, i) => `<div class="ssa-buff">${need(i, ssSkins(s).length)}<select class="setx-sel" data-ssbk="${i}">${Object.entries(SS_BUFF).map(([k, [l]]) => `<option value="${k}"${b.k === k ? ' selected' : ''}>${l}</option>`).join('')}</select>${b.k === 'cheap' ? '<span class="tiny">−1 AP</span>' : `<input class="input" type="number" min="1" max="10" value="${b.v || 1}" data-ssbv="${i}" aria-label="Amount">`}<span class="tiny ssa-bt">${esc(ssBuffTxt(b))}</span><button type="button" class="sx-btn" data-ssbdel="${i}" aria-label="Remove buff">${icon('trash')}</button></div>`).join('') || '<p class="tiny">No buffs yet.</p>' : '';
  p.innerHTML = `<div class="stack">
    <p class="tiny">Group outfits into themed sets. Sets with the same theme sit together in the Index (Skins tab). Each set can give battle buffs: they count when the deck leader <b>wears</b> one of the set's skins and the player owns enough of the set. They come on top of the usual caps, like the CS brackets.</p>
    <div class="ssa-list">${list}<button type="button" class="ssa-it add" id="ssNew">${icon('plus')}<b>New skin set</b><small>Add one</small></button></div>
    ${s ? `<div class="ssa-ed" style="--ssc:${ssCol(s)}">
      <div class="setx-list">
        ${setRow('Set name', `<input class="input" id="ssName" maxlength="28" value="${esc(s.name)}">`, 'Shown in the Index and in Battle bonuses')}
        ${setRow('Theme', `<input class="input" id="ssTheme" maxlength="24" value="${esc(s.theme || '')}" placeholder="e.g. Nurse">`, 'Sets with the same theme are grouped together')}
        ${setRow('Colour', `<input type="color" id="ssCol" value="${ssCol(s)}">`, 'The set\'s accent colour')}
      </div>
      <h4 class="ssa-h">Buffs <small>${ssSkins(s).length ? `${ssOwnedN(s)} / ${ssSkins(s).length} owned on this account` : 'Add skins first'}</small></h4>
      <div class="ssa-buffs">${buffs}</div>
      <button type="button" class="sx-btn" id="ssAddBuff" ${ssSkins(s).length ? '' : 'disabled'}>${icon('plus')}Add a buff</button>
      <h4 class="ssa-h">Skins in this set <small>${ssSkins(s).length} chosen · tap to add or remove</small></h4>
      <input class="input" id="ssQ" type="search" placeholder="Search skins or characters" value="${esc(ssQ)}">
      <div class="ssa-pick">${pick || '<p class="tiny">No skins in the game pool yet.</p>'}</div>
      <div class="tta-btns"><button type="button" class="sx-btn" id="ssDel">${icon('trash')}Delete set</button><button type="button" class="sx-btn" id="ssOpen">${icon('book')}Open the Index</button></div>
    </div>` : '<p class="tiny">No skin sets yet. Tap New skin set to make one.</p>'}</div>`;
  const save = (fn, redraw = true) => { fn(s); persist(); if (redraw) renderSkinSetsTab(); };
  p.querySelectorAll('[data-ssed]').forEach(b => b.onclick = () => { ssEd = b.dataset.ssed; renderSkinSetsTab(); });
  $('#ssNew').onclick = () => { const id = 'ss-' + Date.now().toString(36); sets.push({ id, name: 'New skin set', theme: '', col: SS_COLS[sets.length % SS_COLS.length], skins: [], buffs: [{ n: 0, k: 'hp', v: 1 }] }); ssEd = id; persist(); renderSkinSetsTab(); toast('New skin set: pick its skins below. Owning all of them gives hero +1 HP until you change the buff.'); };
  if (!s) return;
  const nm = $('#ssName'); nm.oninput = () => save(x => x.name = nm.value.slice(0, 28) || 'Skin set', false);
  const th = $('#ssTheme'); th.oninput = () => save(x => x.theme = th.value.slice(0, 24), false);
  const cl = $('#ssCol'); cl.onchange = () => save(x => x.col = cl.value);
  p.querySelectorAll('[data-sstog]').forEach(b => b.onclick = () => save(x => { const i = x.skins.indexOf(b.dataset.sstog); if (i >= 0) x.skins.splice(i, 1); else x.skins.push(b.dataset.sstog); }));
  const q = $('#ssQ'); q.oninput = () => { ssQ = q.value; clearTimeout(q._t); q._t = setTimeout(() => { renderSkinSetsTab(); const n = $('#ssQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
  $('#ssAddBuff').onclick = () => save(x => (x.buffs = x.buffs || []).push({ n: 0, k: 'hp', v: 1 }));
  p.querySelectorAll('[data-ssbn]').forEach(e => e.onchange = () => save(x => x.buffs[+e.dataset.ssbn].n = +e.value));
  p.querySelectorAll('[data-ssbk]').forEach(e => e.onchange = () => save(x => x.buffs[+e.dataset.ssbk].k = e.value));
  p.querySelectorAll('[data-ssbv]').forEach(e => e.onchange = () => save(x => x.buffs[+e.dataset.ssbv].v = Math.max(1, Math.min(10, Math.round(+e.value) || 1))));
  p.querySelectorAll('[data-ssbdel]').forEach(e => e.onclick = () => save(x => x.buffs.splice(+e.dataset.ssbdel, 1)));
  const dl = $('#ssDel'); dl.onclick = () => { if (!dl.dataset.sure) { dl.dataset.sure = 1; dl.textContent = 'Tap again to delete'; return; } sets.splice(sets.indexOf(s), 1); ssEd = null; persist(); renderSkinSetsTab(); toast('Skin set deleted.'); };
  $('#ssOpen').onclick = () => { closeModal(); openCollection('skin'); };
}
