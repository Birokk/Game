/* ---------- profile: avatar, frame, title, namecard, showcase of up to 4 characters ---------- */
const ownedChars = () => S.pool.filter(e => e.type === 'character' && owns(e.id));
const UNLOCK = {
  always: [() => true, ''],
  login: [() => S.login.streak >= 1, 'Claim a daily login reward'],
  chars3: [() => ownedChars().length >= 3, 'Own 3 characters'],
  ur: [() => ownedChars().some(e => e.rarity === 5), 'Own a UR character'],
  max: [() => S.pool.some(e => starsOf(e.id) >= MAX_STARS && owns(e.id)), `Raise a character to ${MAX_STARS} stars`],
  mbtitle: [() => (S.unlocks || []).includes('mb-title'), 'Win it from the Mystery Fountain'],
  mbcard: [() => (S.unlocks || []).includes('mb-card'), 'Win it from the Mystery Fountain']
};
const unlocked = o => UNLOCK[o.need][0]();
const TITLES = [
  { id: 'newcomer', name: 'Newcomer', cls: 't-plain', need: 'always' },
  { id: 'wanderer', name: 'Plaza Wanderer', cls: 't-aqua', need: 'always' },
  { id: 'lantern', name: 'Lantern Keeper', cls: 't-ember', need: 'login' },
  { id: 'collector', name: 'Star Collector', cls: 't-violet', need: 'chars3' },
  { id: 'lucky', name: 'Lucky Star', cls: 't-gold', need: 'ur' },
  { id: 'prism', name: 'Prism Ascendant', cls: 't-prism', need: 'max' },
  { id: 'boxbreaker', name: 'Fountain Wisher', cls: 't-mbox', need: 'mbtitle' }
];
const FRAMES = [
  { id: 'simple', name: 'Silver Ring', need: 'always' },
  { id: 'gold', name: 'Gilded Crest', need: 'chars3' },
  { id: 'prism', name: 'Prism Halo', need: 'ur', premium: true }
];
const CARDS = [
  { id: 'pearl', name: 'Pearl Tide', need: 'always' },
  { id: 'starlit', name: 'Starlit Sky', need: 'always' },
  { id: 'lantern', name: 'Lantern Night', need: 'login' },
  { id: 'maple', name: 'Maple Autumn', need: 'chars3' },
  { id: 'aurora', name: 'Prism Aurora', need: 'ur', premium: true },
  { id: 'mystery', name: 'Mystery Night', need: 'mbcard' }
];
const titleOf = () => TITLES.find(t => t.id === S.profile.title && unlocked(t)) || TITLES[0];
const frameOf = () => FRAMES.find(f => f.id === S.profile.frame && unlocked(f)) || FRAMES[0];
/* S.profile.avatar = a wallpaper-style art id: '<id>' (base art / icon) or '<charId>@art3' / '@art6' */
const avatarEntry = () => wpOk(S.profile.avatar) ? wpParse(S.profile.avatar) : null;
const titleHTML = (t = titleOf()) => `<span class="ttl ${t.cls}">${esc(t.name)}</span>`;
/* avatar picture inside a frame; size in px */
function avatarHTML(size, entry = avatarEntry(), frame = frameOf().id) {
  const img = entry ? wpThumb(entry.e ? entry : wpParse(entry.id)) : `<img src="${portrait(S.player.look, 4)}" alt="" class="chibi">`;
  return `<span class="avf f-${frame}" style="--s:${size}px"><span class="avi">${img}</span></span>`;
}
/* namecard background: a design, or the art of an owned character ("char:<id>") */
function cardBG(id) {
  if (id && id.startsWith('char:') && wpOk(id.slice(5))) { const w = wpParse(id.slice(5)); return { cls: 'nc-char', img: wpSrc(w), art: wpHasArt(w) }; }
  const c = CARDS.find(k => k.id === id && unlocked(k)) || CARDS[0];
  return { cls: 'nc-' + c.id };
}
const cardLayer = bg => `<span class="nc ${bg.cls}">${bg.img ? `<img src="${bg.img}" alt="" class="${bg.art ? '' : 'chibi'}">` : ''}</span>`;

/* the profile opens as a card (avatar, name, title, stats, showcase); "Profile settings" switches to customising it */
let pfTab = 'avatar', pfSlot = -1, pfEditName = false, pfMode = 'view';
function openProfile() {
  pfTab = 'avatar'; pfSlot = -1; pfEditName = false; pfMode = 'view';
  openModal({ title: 'Profile', ic: 'chars', kind: 'profile', body: '<div id="pfRoot"></div>', onMount: renderProfile });
}
function renderProfile() {
  const root = $('#pfRoot'); if (!root) return;
  const P = S.profile, chars = ownedChars(), allChars = S.pool.filter(e => e.type === 'character' && !mcOff(e.id));
  P.showcase = P.showcase.map(id => id && findEntry(id) && owns(id) ? id : null);
  const urs = chars.filter(e => e.rarity === 5).length, best = Math.max(0, ...chars.map(e => starsOf(e.id)));
  const lockTag = o => unlocked(o) ? '' : `<span class="pf-lock">${icon('lock')}${esc(UNLOCK[o.need][1])}</span>`;
  const opt = (on, locked, inner, data, label) => `<button class="pf-opt ${on ? 'on' : ''} ${locked ? 'locked' : ''}" ${locked ? 'disabled' : data}>${inner}<span class="pf-ol">${label}</span></button>`;
  let opts;
  if (pfSlot >= 0) {
    opts = `<p class="tiny">Pick a character for showcase slot ${pfSlot + 1}.</p><div class="pf-grid">
      ${opt(!P.showcase[pfSlot], false, `<span class="pf-empty">${icon('close')}</span>`, 'data-show=""', 'Empty slot')}
      ${chars.map(e => opt(P.showcase[pfSlot] === e.id, false, `<span class="pf-thumb r${e.rarity}">${thumbImg(e)}</span>`, `data-show="${esc(e.id)}"`, esc(e.name))).join('')}</div>
      ${chars.length ? '' : '<div class="empty">You don\'t own any characters yet. <button class="link" data-open="summon">Go to the banner</button></div>'}`;
  } else if (pfTab === 'avatar') {
    const list = artChoices().filter(o => o.open), cur = avatarEntry();
    opts = `<p class="tiny">Use any art you own as your avatar: each character's base art and its 3★ / 6★ splash arts once unlocked, and every skin.</p><div class="pf-grid">
      ${opt(!cur, false, avatarHTML(64, null), 'data-av=""', 'My character')}
      ${list.map(o => opt(!!cur && cur.id === o.id, false, avatarHTML(64, wpParse(o.id)), `data-av="${esc(o.id)}"`, esc(wpName(wpParse(o.id))))).join('')}</div>`;
  } else if (pfTab === 'frame') {
    opts = `<div class="pf-grid">${FRAMES.map(f => opt(frameOf() === f, !unlocked(f), avatarHTML(64, avatarEntry(), f.id) + lockTag(f), `data-fr="${f.id}"`, `${esc(f.name)}${f.premium ? ' <span class="prem">Premium</span>' : ''}`)).join('')}</div>`;
  } else if (pfTab === 'title') {
    opts = `<div class="pf-grid wide">${TITLES.map(t => opt(titleOf() === t, !unlocked(t), `<span class="pf-tt">${titleHTML(t)}</span>${lockTag(t)}`, `data-tt="${t.id}"`, '')).join('')}</div>`;
  } else {
    const cur = cardBG(P.card);
    opts = `<p class="tiny">Namecard designs, or any art you own (base, 3★ and 6★ splash arts, skins).</p><div class="pf-grid wide">
      ${CARDS.map(k => opt(cur.cls === 'nc-' + k.id, !unlocked(k), `<span class="pf-nc">${cardLayer({ cls: 'nc-' + k.id })}</span>${lockTag(k)}`, `data-nc="${k.id}"`, `${esc(k.name)}${k.premium ? ' <span class="prem">Premium</span>' : ''}`)).join('')}
      ${artChoices().filter(o => o.open).map(o => opt(P.card === 'char:' + o.id && cur.cls === 'nc-char', false, `<span class="pf-nc">${cardLayer(cardBG('char:' + o.id))}</span>`, `data-nc="char:${esc(o.id)}"`, esc(wpName(wpParse(o.id))))).join('')}</div>`;
  }
  const view = pfMode === 'view';
  const mt = modalEl && modalEl.querySelector('#mTitle'); if (mt) mt.textContent = view ? 'Profile' : 'Profile settings';
  root.innerHTML = `<div class="stack pf-mode-${pfMode}">
    ${view ? '' : `<div class="row pf-back"><button class="btn ghost sm" id="pfBack">${icon('back')}Back to profile</button><span class="tiny">Tap a showcase slot, or pick an avatar, frame, title or namecard below.</span></div>`}
    <div class="pf-card">${cardLayer(cardBG(P.card))}${view ? `<button class="pf-set" id="pfSet" aria-label="Profile settings" data-tip="${esc('<b>Profile settings</b><span>Avatar, frame, title, namecard, showcase and name</span>')}">${icon('gear')}<span>Profile settings</span></button>` : ''}
      <div class="pf-me">${avatarHTML(108)}
        <div class="pf-who"><span class="lbl-sm ts" style="color:#fff">Lv ${playerLv().lv} · UID ${P.uid}</span><span class="pf-namerow">${pfEditName ? `<input class="input pf-name-in" id="pfNameIn" maxlength="16" value="${esc(S.player.name)}" aria-label="Your name">` : `<b class="ts">${esc(S.player.name)}</b>`}<button class="rbtn glass pf-edit" id="pfEdit" aria-label="${pfEditName ? 'Save name' : 'Change name'}">${icon(pfEditName ? 'check' : 'edit')}</button></span>${titleHTML()}</div>
      </div>
      <div class="pf-stats">
        <div><b>${chars.length}/${allChars.length}</b><span>Characters</span></div>
        <div><b>${ownedOf('pet').length}/${S.pool.filter(e => e.type === 'pet').length}</b><span>Pets</span></div>
        <div><b>${S.ach.length}/${ACH.length}</b><span>Achievements</span></div>
        <div><b>${urs}</b><span>URs owned</span></div>
        <div><b>${best}★</b><span>Best stars</span></div>
      </div>
    </div>
    <div><div class="ad-head" style="margin:0 0 8px"><h3>Showcase</h3><span class="row" style="gap:8px;align-items:center"><span class="tiny">Show off up to 4 characters you own · grades</span>${csInfoBtn()}</span></div>
      <div class="pf-show">${P.showcase.map((id, i) => { const e = id && findEntry(id);
        return `<button class="pf-slot ${e ? 'r' + e.rarity : 'none'} ${pfSlot === i ? 'on' : ''}" data-slot="${i}" aria-label="Showcase slot ${i + 1}">${e ? `<img src="${getArt(e)}" alt=""><span class="pf-bdg">${badgeRow(e, 22, true)}</span><span class="pf-cs">${csTag(e, 'sm')}</span><span class="pf-sl">${rtag(e.rarity)}<b>${esc(e.name)}</b>${starsFor(e)}</span>` : `<span class="pf-add">${icon('plus')}<span>Add</span></span>`}</button>`; }).join('')}</div></div>
    ${view ? '' : `<div class="tabs" style="margin:0">${[['avatar', 'Avatar'], ['frame', 'Avatar frame'], ['title', 'Title'], ['card', 'Namecard']].map(([k, l]) => `<button class="tab ${pfSlot < 0 && pfTab === k ? 'on' : ''}" data-pft="${k}">${l}</button>`).join('')}</div>
    ${opts}`}
  </div>`;
  bindCSInfo(root);
  const save = () => { persist(); renderMenu(); renderProfile(); };
  const saveName = () => {
    const v = $('#pfNameIn').value.trim().slice(0, 16);
    if (v && v !== S.player.name) { S.player.name = v; player.name = v; toast(`You're now called ${v}.`); }
    pfEditName = false; save();
  };
  const sb = $('#pfSet'); if (sb) sb.onclick = () => { pfMode = 'edit'; renderProfile(); };
  const bb = $('#pfBack'); if (bb) bb.onclick = () => { pfMode = 'view'; pfSlot = -1; pfEditName = false; renderProfile(); };
  const pe = $('#pfEdit'); if (pe && view) pe.remove();
  if (pe && !view) pe.onclick = () => { if (pfEditName) saveName(); else { pfEditName = true; renderProfile(); const i = $('#pfNameIn'); i.focus(); i.select(); } };
  const ni = $('#pfNameIn'); if (ni) ni.onkeydown = e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { e.stopPropagation(); pfEditName = false; renderProfile(); } };
  root.querySelectorAll('[data-pft]').forEach(b => b.onclick = () => { pfTab = b.dataset.pft; pfSlot = -1; renderProfile(); });
  root.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { if (view) { pfMode = 'edit'; } pfSlot = pfSlot === +b.dataset.slot ? -1 : +b.dataset.slot; renderProfile(); });
  root.querySelectorAll('[data-show]').forEach(b => b.onclick = () => {
    const id = b.dataset.show || null;
    if (id) P.showcase = P.showcase.map(x => x === id ? null : x);   // a character can only sit in one slot
    P.showcase[pfSlot] = id; pfSlot = -1; save();
  });
  root.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { P.avatar = b.dataset.av || null; save(); });
  root.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => { P.frame = b.dataset.fr; save(); });
  root.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { P.title = b.dataset.tt; save(); });
  root.querySelectorAll('[data-nc]').forEach(b => b.onclick = () => { P.card = b.dataset.nc; save(); });
}
