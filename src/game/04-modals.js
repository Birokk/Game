/* ---------- modals ---------- */
let modalEl = null;
/* window sizes: wide = big screen-filling window (menus like shop, mail, settings), default = medium, small = quick confirmations */
function openModal({ title, ic, body, wide, small, kind, onMount }) {
  closeModal();
  // every window shares the settings look: blurred see-through backdrop, title pill with a round badge, round close button;
  // wide windows fill the screen with no box, like Settings
  const back = document.createElement('div'); back.className = `modal-back ${wide ? 'is-wide' : ''}`; back.dataset.kind = kind || '';
  back.innerHTML = `<div class="modal ${wide ? 'wide' : `glass-deep ${small ? 'small' : ''}`}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <header class="m-head"><div class="inv-title"><span class="inv-badge m-ic">${icon(ic)}</span><h2 id="mTitle" class="ts">${esc(title)}</h2></div><button class="inv-x" data-close aria-label="Close">${icon('close')}</button></header>
    <div class="m-body">${body}</div></div>`;
  back.addEventListener('pointerdown', e => { if (e.target === back) closeModal(); });
  back.querySelector('[data-close]').onclick = closeModal;
  document.body.appendChild(back); modalEl = back;
  if (onMount) onMount(back.querySelector('.m-body'));
  back.querySelector('[data-close]').focus({ preventScroll: true });
}
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; document.querySelectorAll(".pfpick").forEach(x => x.remove()); refreshCharacters(); } }

const PLACEHOLDERS = {
  friends: ['Friends', 'friends', 'Friend list, invites, and meeting up with friends in the plaza.'],
  shop:    ['Shop', 'shop', 'Pearl packs, skin bundles and the monthly pass.'],
  team:    ['Team', 'team', 'Pick up to four characters to bring into events.']
};
function openPlaceholder(key) {
  const [title, ic, desc] = PLACEHOLDERS[key];
  openModal({ title, ic, wide: true, body: `<div class="ph">
    <div class="ph-hero"><span class="m-ic">${icon(ic)}</span><div><span class="tag">Template</span><p>${esc(desc)} This screen gets built in a later update.</p></div></div>
    <div class="skel">${'<div></div>'.repeat(6)}</div></div>` });
}

/* mail: list of letters on the left (envelope, title, sender, star), the open letter on the right (title, sender + date,
   text, attachments), Claim all / Delete read below the list. Read in S.mailRead, claimed in S.mailClaimed,
   starred in S.mailFav (kept by Delete read), deleted in S.mailDel. */
const MAILS = [
  { id:'welcome', from:'Plaza Team', title:'Welcome to Blank: Project!', body:'Welcome, traveler!\nThe lanterns are lit and the plaza is waiting for you. Here is a little starter gift to begin your collection. Summon your first friends, decorate your home screen and come say hi in the plaza.\nHave fun, and thank you for playing!', reward:{ pearls:60, coins:1000 }, date:'2026-10-28' },
  { id:'maint', from:'Plaza Team', title:'Maintenance compensation', body:'Thank you for your patience during the latest update.\nAs an apology for the downtime, please accept these pearls. We are always working to make the plaza a better place.', reward:{ pearls:9 }, date:'2026-10-26' },
  { id:'event', from:'Events', title:'Halloween banner opens Oct 31', body:'Something spooky is drifting through the lantern festival...\nA limited Halloween banner opens on October 31 with two brand-new outfits. Save your Limited tickets!', reward:null, date:'2026-10-25' }
];
const MAIL_CAP = 500, MAIL_R = { memtk: 5, pearls: 5, tickets: 5, rings: 5, starlight: 5, wishes: 4, bottles: 4, coins: 3, dust: 3 };
ICONS.mailOpen = '<path d="M3 10l9-6 9 6v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 10l9 6 9-6"/>';
const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2 6.3 20.3l1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
let mailSel = null;
const allMail = () => [...(S.mailbox || []).slice().reverse(), ...MAILS];
const mailList = () => allMail().filter(m => !(S.mailDel || []).includes(m.id));
/* add a letter to the player's mailbox (redeem codes use it); newest is shown first */
function sendMail(m) { S.mailbox = [...(S.mailbox || []), { date: dayKey(), ...m }]; persist(); renderMenu(); }
const mailRead = id => (S.mailRead || []).includes(id) || S.mailClaimed.includes(id);
const mailOpen = m => !mailRead(m.id) || (m.reward && !S.mailClaimed.includes(m.id));   // still needs attention
const mailFav = id => (S.mailFav || []).includes(id);
function openMail() { openModal({ title: 'Mail', ic: 'mail', wide: true, kind: 'mail', body: '<div class="ml" id="mailList"></div>', onMount: renderMail }); }
function claimMail(ids) {
  const got = {};
  ids.forEach(id => { const m = allMail().find(x => x.id === id); if (!m || S.mailClaimed.includes(id)) return; S.mailClaimed.push(id);
    if (m.reward) Object.entries(m.reward).forEach(([k, v]) => { if (k === 'stamina') giveStamina(v); else S.wallet[k] = (S.wallet[k] || 0) + v; got[k] = (got[k] || 0) + v; }); });
  persist(); renderMail(); renderMenu(); refreshSummon();
  if (Object.keys(got).length) showRewards('Mail rewards', got, `${ids.filter(id => S.mailClaimed.includes(id)).length > 1 ? 'Every attachment claimed' : 'Attachment claimed'}`);
}
function deleteMail(ids) { S.mailDel = [...new Set([...(S.mailDel || []), ...ids])]; persist(); renderMail(); renderMenu(); }
function renderMail() {
  const el = $('#mailList'); if (!el) return;
  const list = mailList();
  if (!list.some(m => m.id === mailSel)) mailSel = list[0] ? list[0].id : null;
  const m = list.find(x => x.id === mailSel);
  if (m && !mailRead(m.id)) { S.mailRead = [...(S.mailRead || []), m.id]; persist(); setTimeout(renderMenu); }
  const claimed = m && S.mailClaimed.includes(m.id), keepTop = el.querySelector('.ml-list') ? el.querySelector('.ml-list').scrollTop : 0;
  el.innerHTML = `<section class="ml-left">
      <div class="ml-list">${list.map(x => `<button class="ml-row ${x.id === mailSel ? 'on' : ''} ${mailOpen(x) ? 'new' : ''}" data-mail="${x.id}">
        <span class="ml-env">${icon(mailRead(x.id) ? 'mailOpen' : 'mail')}</span><span class="ml-t"><b>${esc(x.title)}</b><small>${esc(x.from)}</small></span>
        <span class="ml-star ${mailFav(x.id) ? 'on' : ''}">${STAR_SVG}</span></button>`).join('') || '<p class="ml-empty">No mail.</p>'}</div>
      <span class="ml-qty">Quantity: ${list.length}/${MAIL_CAP}</span>
      <div class="ml-btns"><button class="sx-btn" id="mailAll">Claim All</button><button class="sx-btn" id="mailDelRead">Delete Read</button></div>
    </section>
    <section class="ml-right">${m ? `<h2 class="ml-title">${esc(m.title)}</h2>
      <div class="ml-from"><span>${icon('user')}${esc(m.from)}</span><span>${esc(m.date)}</span></div>
      <div class="ml-body">${esc(m.body).replace(/\n/g, '<br>')}</div>
      ${m.reward ? `<div class="ml-att"><span class="ml-att-h">Attachments</span><div class="ml-items">${Object.entries(m.reward).map(([k, v]) => `<span class="ml-item"><span class="inv-pic mall-ic r${MAIL_R[k] || 4}">${curIcon(k)}${claimed ? `<i class="ml-got">${icon('check')}</i>` : ''}</span><b>${fmt(v)}</b></span>`).join('')}</div></div>` : ''}
      <div class="ml-actions"><button class="ml-fav ${mailFav(m.id) ? 'on' : ''}" id="mailFav" aria-label="${mailFav(m.id) ? 'Unstar' : 'Star'} this mail">${STAR_SVG}</button>
        ${m.reward && !claimed ? '<button class="sx-btn big gold" id="mailClaim">Claim</button>' : '<button class="sx-btn big" id="mailDel">Delete</button>'}</div>` : '<p class="ml-empty">Your mailbox is empty.</p>'}</section>`;
  const ls = el.querySelector('.ml-list'); if (ls) ls.scrollTop = keepTop;
  el.querySelectorAll('[data-mail]').forEach(b => b.onclick = () => { mailSel = b.dataset.mail; renderMail(); });
  $('#mailAll').onclick = () => { const ids = list.filter(x => x.reward && !S.mailClaimed.includes(x.id)).map(x => x.id); if (!ids.length) return toast('Nothing to claim.'); claimMail(ids); };
  $('#mailDelRead').onclick = () => { const ids = list.filter(x => mailRead(x.id) && !mailFav(x.id) && (!x.reward || S.mailClaimed.includes(x.id))).map(x => x.id); if (!ids.length) return toast('No read mail to delete. Starred mail is kept.'); deleteMail(ids); toast(`Deleted ${ids.length} mail${ids.length === 1 ? '' : 's'}.`); };
  const c = $('#mailClaim'); if (c) c.onclick = () => claimMail([m.id]);
  const d = $('#mailDel'); if (d) d.onclick = () => { if (mailFav(m.id)) return toast('Unstar this mail first to delete it.'); deleteMail([m.id]); };
  const f = $('#mailFav'); if (f) f.onclick = () => { S.mailFav = mailFav(m.id) ? S.mailFav.filter(x => x !== m.id) : [...(S.mailFav || []), m.id]; persist(); renderMail(); };
}

/* settings */
/* settings: full screen over a blurred, see-through view of the game; round tabs on top, one row per setting */
ICONS.audio = '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.5" height="7" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="7" rx="1.5"/>';
ICONS.user = '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>';
const SET_TABS = [['graphics', 'image', 'Graphics'], ['audio', 'audio', 'Audio'], ['game', 'sparkle', 'Game'], ['account', 'user', 'Account']];   // admin-only art & icons live in admin → Art & icons
const SET_DEFAULTS = { names: true, music: true, sfx: true, gfx: 'high', hmSize: 'large', skipPull: false };
let setEl = null, setTab = 'graphics';
const setRow = (label, ctl, sub = '') => `<div class="sx-row"><span class="sx-l"><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</span><span class="sx-c">${ctl}</span></div>`;   // the label in its own span: a coloured UR / SSR word in it stays on the same line
const setSel = (key, val, opts) => `<label class="sx-sel"><select data-set="${key}" aria-label="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(val) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
const setOnOff = key => setSel(key, S.settings[key] ? '1' : '0', [['1', 'On'], ['0', 'Off']]);
function openSettings(tab) {
  closeModal();
  setTab = SET_TABS.some(t => t[0] === tab) ? tab : setTab;
  if (setTab === 'admin') setTab = 'graphics';
  if (!setEl) { setEl = document.createElement('div'); setEl.className = 'setx'; setEl.setAttribute('role', 'dialog'); setEl.setAttribute('aria-label', 'Settings'); document.body.appendChild(setEl); }
  renderSettings();
}
function closeSettings() { if (setEl) { setEl.remove(); setEl = null; } }
function renderSettings() {
  if (!setEl) return;
  const tabs = SET_TABS.filter(t => t[0] !== 'admin' || canAdmin()), cur = tabs.find(t => t[0] === setTab) || tabs[0];
  const btn = (id, label, cls = '') => `<button type="button" class="sx-btn ${cls}" id="${id}">${label}</button>`;
  let rows = '';
  if (setTab === 'graphics') rows = setRow('Graphics quality', setSel('gfx', S.settings.gfx, [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']]))
    + setRow('Home screen size', setSel('hmSize', S.settings.hmSize || 'large', [['large', 'Large'], ['normal', 'Normal']]), 'Large draws the home screen buttons bigger on big screens')
    + setRow('Name tags in the plaza', setOnOff('names'), 'Show names above players and bots')
    + setRow('Graphics options', '<span class="sx-val">More coming soon</span>');
  else if (setTab === 'audio') rows = setRow('Music', setOnOff('music')) + setRow('Sound effects', setOnOff('sfx')) + setRow('Audio', '<span class="sx-val">Sound arrives in a later update</span>');
  else if (setTab === 'game') rows = setRow('Main screen wallpaper', `<button type="button" class="sx-btn" data-open="wallpaper">${esc(wallpaperInfo() ? wpName(wallpaperInfo()) : 'Pearl Tide')}</button>`)
    + setRow('Skip summon animation', setOnOff('skipPull'), 'Jump straight to the results')
    + setRow('Redeem code', btn('setRedeem', `${icon('gift')}Redeem`))
    + setRow('Title screen', btn('setTitle', `${icon('back')}Go to title screen`))
    + (canAdmin() ? setRow('Admin panel', btn('setAdmin', `${icon('wrench')}Open`), 'Art, icons, wallpapers and every other admin setting') : '');
  else if (setTab === 'account') {
    const acct = Backend.user ? esc(Backend.user.email || 'Signed in') : 'Guest · this browser only';
    rows = setRow('Account', Backend.on ? btn('setAcct', Backend.user ? 'Sign out' : 'Sign in') : `<span class="sx-val">${acct}</span>`, Backend.on ? acct : '')
      + setRow('Player name', `<span class="sx-name">${esc(S.player.name)}</span>${btn('setName', 'Change')}`, nameLeft() ? `Next change in ${nameLeftTxt()} · uses 1 name change ticket` : 'Uses 1 name change ticket · once every 72 hours')
      + setRow('Main character', S.player.mc ? `<button type="button" class="sx-btn" id="setMC" ${mcSwitchLeft() ? 'disabled' : ''}>${mcSwitchLeft() ? `Switch in ${fmtDur(mcSwitchLeft())}` : 'Switch'}</button>` : '<span class="sx-val">Not chosen yet</span>', S.player.mc ? `${esc(mcEntry(S.player.mc).name)} · once every 72 hours` : '')
      + setRow('UID', `<span class="sx-val">${esc(String(S.profile.uid || '—'))}</span>`);
  }
  setEl.innerHTML = `<div class="setx-top"><div class="inv-title"><span class="inv-badge">${icon('gear')}</span><h2 class="ts">${cur[2]}</h2></div>
      <nav class="inv-tabs">${tabs.map(([k, ic, l]) => `<button class="${k === setTab ? 'on' : ''}" data-settab="${k}" title="${l}" aria-label="${l}">${icon(ic)}</button>`).join('')}</nav>
      <button class="inv-x" id="setClose" aria-label="Close">${icon('close')}</button></div>
    <div class="setx-list">${rows}</div>
    <div class="setx-foot">${['graphics', 'audio', 'game'].includes(setTab) ? btn('setDefault', 'Default Settings', 'big') : ''}</div>`;
  const on = id => setEl.querySelector('#' + id);
  on('setClose').onclick = closeSettings;
  setEl.querySelectorAll('[data-settab]').forEach(b => b.onclick = () => { setTab = b.dataset.settab; renderSettings(); });
  setEl.querySelectorAll('[data-set]').forEach(sel => sel.onchange = () => { const k = sel.dataset.set; S.settings[k] = k === 'gfx' || k === 'hmSize' ? sel.value : sel.value === '1'; persist(); if (k === 'hmSize') hmZoom(); });
  const df = on('setDefault'); if (df) df.onclick = () => { S.settings = { ...S.settings, ...SET_DEFAULTS }; persist(); hmZoom(); renderSettings(); toast('Settings set back to default.'); };
  const nm = on('setName'); if (nm) nm.onclick = () => openRename();
  const rd = on('setRedeem'); if (rd) rd.onclick = openRedeem;
  const tt = on('setTitle'); if (tt) tt.onclick = showTitle;
  const ab = on('setAcct'); if (ab) ab.onclick = () => Backend.user ? confirmSignOut() : openSignIn(true);
  const mb = on('setMC'); if (mb) mb.onclick = () => { if (!mcSwitchLeft()) openMCPick(true); };
  const ad = on('setAdmin'); if (ad) ad.onclick = () => { closeSettings(); openAdmin(); };
}

/* wallpaper picker */
function openWallpaper(tab) {
  wpTab = tab === 'mem' ? 'mem' : 'arts';
  openModal({ title: 'Wallpaper', ic: 'image', wide: true, kind: 'wallpaper', body: '<div id="wpRoot"></div>', onMount: renderWallpaperPicker });
}
/* tabs: Splash arts (characters / skins) and Memories (every owned memory with art; its id works as a wallpaper id) */
let wpTab = 'arts';
const memWpChoices = () => (S.memories || []).filter(m => owns(m.id) && artFrom(m.img)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
  .map(m => ({ id: m.id, e: memEntry(m.id), a: ASC.find(x => x.k === 'base'), open: true }));
function renderWallpaperPicker() {
  const root = $('#wpRoot'); if (!root) return;
  // every art is its own choice: the base splash art, then the 3★ and 6★ splash arts (locked until those stars)
  const mems = memWpChoices(), opts = wpTab === 'mem' ? mems : artChoices(), ownedList = opts;
  const list = wpList();
  const tile = o => {
    if (!o) { const on = !list.length; return `<button class="wpt ${on ? 'on' : ''}" data-wp="" aria-pressed="${on}"><span class="mini"></span><span class="lab">Pearl Tide (default)</span>${on ? `<span class="chk">${icon('check')}</span>` : ''}</button>`; }
    const w = wpParse(o.id), n = list.indexOf(o.id) + 1, on = n > 0;
    return `<button class="wpt r${o.e.rarity} ${on ? 'on' : ''} ${o.open ? '' : 'locked'}" data-wp="${esc(o.id)}" aria-pressed="${on}" ${o.open ? '' : `data-lock="${o.a.stars}"`}>
      <span class="mini"></span><img src="${wpSrc(w)}" alt="">
      ${o.a.k !== 'base' ? `<span class="wpt-star">${o.a.label}</span>` : ''}${o.open ? '' : `<span class="wpt-lock">${icon('lock')}<small>${o.a.stars}★</small></span>`}
      <span class="lab">${esc(wpName(w))}</span>${on ? `<span class="chk">${n}</span>` : ''}</button>`;
  };
  const tabs = `<div class="tabs wp-tabs">${[['arts', 'Splash arts'], ['mem', `Memories <span class="wp-tn">${mems.length}</span>`]].map(([k, l]) => `<button class="tab ${wpTab === k ? 'on' : ''}" data-wptab="${k}">${l}</button>`).join('')}</div>`;
  root.innerHTML = `${tabs}<p class="tiny" style="margin-bottom:14px">${wpTab === 'mem' ? `Every memory you own can be a wallpaper too. They share the ${WP_MAX} wallpaper slots with splash arts (${list.length}/${WP_MAX} chosen); tap again to remove one.</p>
    <div class="wpgrid mem">${mems.map(tile).join('')}</div>
    ${mems.length ? '' : `<div class="empty" style="margin-top:14px">You don't own any memories with art yet. <button class="link" data-open="summon">Go to the Memory Banner</button></div>`}` : `Pick up to ${WP_MAX} wallpapers (${list.length}/${WP_MAX} chosen); tap again to remove one. Each splash art is its own wallpaper: the base art and the 3★ / 6★ arts once unlocked, whatever the character has equipped. With two or more, tap once on an empty part of the main screen to show arrows and switch between them. Pearl Tide clears the list.</p>
    <div class="wpgrid">${tile(null)}${opts.map(tile).join('')}</div>
    ${ownedList.length ? '' : `<div class="empty" style="margin-top:14px">You don't own any characters yet. <button class="link" data-open="summon">Go to the banner</button></div>`}`}`;
  root.querySelectorAll('[data-wptab]').forEach(b => b.onclick = () => { wpTab = b.dataset.wptab; renderWallpaperPicker(); });
  root.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => {
    const id = b.dataset.wp, cur = wpList();
    if (b.dataset.lock) { toast(`This splash art unlocks at ${b.dataset.lock} stars.`); return; }
    if (!id) { S.wallpapers = []; S.wallpaper = null; }
    else if (cur.includes(id)) { S.wallpapers = cur.filter(x => x !== id); if (S.wallpaper === id) S.wallpaper = S.wallpapers[0] || null; }
    else if (cur.length >= WP_MAX) { toast(`You can pick up to ${WP_MAX} wallpapers. Remove one first.`); return; }
    else { S.wallpapers = [...cur, id]; S.wallpaper = id; }
    persist(); applyWallpaper(true); renderWallpaperPicker();
  });
}

/* ---------- info buttons: odds, drop chances and rules live behind a round (i) instead of on screen ----------
   INFO[key]() returns { title, body }; infoBtn(key) draws the button, a click anywhere opens the window */
const INFO = {};
const infoBtn = (key, label = 'Drop chances and info') => `<button type="button" class="cs-info info-btn" data-info="${key}" aria-label="${esc(label)}" title="${esc(label)}">${icon('info')}</button>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-info]'); if (!b || !INFO[b.dataset.info]) return;
  e.stopPropagation(); e.preventDefault();
  const { title, body } = INFO[b.dataset.info]();
  openModal({ title, ic: 'info', kind: 'info', body: `<div class="stack info-body">${body}</div>` });
}, true);

/* admin-only pictures (formerly Settings → Admin), in sections so each sits on the admin page it belongs to:
   'icons' = item and currency icons (admin → Item icons), 'shop' = Top Up icons and membership cards (admin → Shop pictures),
   'campaign' = chapter wallpapers (admin → Battle screen), 'camp' / 'exp' = the Base's Camp and Expedition wallpapers (admin → Camp /
   Expedition), 'spin' = the Daily spin art, 'summon' = the summon animation pictures. No section = all of them. Bound by bindAdminArt. */
const adArtBtn = (id, label, cls = '') => `<button type="button" class="sx-btn ${cls}" id="${id}">${label}</button>`;
const ADMIN_ART = {
  exp: () => setRow('EXP icon', `<span class="set-exp">${curIcon('exp')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setExpUp"></label>${customIcon('exp') ? adArtBtn('setExpReset', 'Default') : ''}`, 'Shown only where EXP is given as a reward'),
  egg: () => ['ssr', 'ur'].map(r => setRow(`${r.toUpperCase()} egg icon`, `<span class="set-exp">${eggHTML(r, 'sm')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-eggup="${r}"></label>${customIcon('egg' + r) ? `<button type="button" class="sx-btn" data-eggreset="${r}">Default</button>` : ''}`, 'The full egg in the hatchery, inventory and hatch animation')).join(''),
  topup: () => `<div class="sx-row sx-block"><span class="sx-l">Top Up icons<small>The picture of each pearl pack in the shop's Top Up tab (shown as is, no frame)</small></span><div class="sx-c"><div class="tu-ad">${TOPUP.map(([n], i) => `<div class="tu-slot"><span class="tu-pic">${topupIcon(i)}</span><small>${fmt(n)}</small><label class="sx-btn tu-btn">${icon('upload')}<input type="file" accept="image/*" class="sr" data-tuup="${i}"></label>${MEDIA.get('topup:' + i) ? `<button type="button" class="link" data-tureset="${i}">Default</button>` : ''}</div>`).join('')}</div></div></div>`,
  pass: () => PASSES.map(p => setRow(`${p.name} card`, `<span class="set-exp pass-set">${curIcon(p.icon)}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="${p.icon}"></label>${customIcon(p.icon) ? `<button type="button" class="sx-btn" data-iconreset="${p.icon}">Default</button>` : ''}`, `The membership card in the shop's Hot Picks (${p.price} pearls)`)).join(''),
  memtk: () => setRow('UR memory ticket icon', `<span class="set-exp">${curIcon('memtk')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="memtk"></label>${customIcon('memtk') ? '<button type="button" class="sx-btn" data-iconreset="memtk">Default</button>' : ''}`, 'From the Prism Membership; used from the Bag for a random UR memory'),
  campbg: () => setRow('Camp wallpaper', `<span class="set-wp">${MEDIA.get('camp:bg') ? `<img src="${MEDIA.get('camp:bg')}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setCampBg"></label>${MEDIA.get('camp:bg') ? adArtBtn('setCampBgDel', 'Default') : ''}${artFrameBtn('camp:bg', 'stage', 'Camp wallpaper')}`, 'Behind the Base\'s Camp tab (1920×1080 best). Default: black'),
  chapters: () => CC_CAMP.map(c => { const k = 'camp:bg:' + c.id, u = MEDIA.get(k); return setRow(`Campaign · Chapter ${c.no} wallpaper`, `<span class="set-wp">${u ? `<img src="${u}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-campbg="${c.id}"></label>${u ? `<button type="button" class="sx-btn" data-campbgdel="${c.id}">Default</button>` : ''}${artFrameBtn(k, 'map', `Chapter ${c.no} wallpaper`)}`, `Fills the map of Chapter ${c.no} · ${c.name} on the campaign screen, only inside its panel (1920×1080 best). Default: the night sky`); }).join(''),
  expbg: () => setRow('Expedition wallpaper', `<span class="set-wp">${MEDIA.get('exp:bg') ? `<img src="${MEDIA.get('exp:bg')}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setExpBg"></label>${MEDIA.get('exp:bg') ? adArtBtn('setExpBgDel', 'Default') : ''}${artFrameBtn('exp:bg', 'stage', 'Expedition wallpaper')}`, 'Behind the Base\'s Expedition tab (1920×1080 best). Default: black'),
  spin: () => setRow('Daily spin art', `<span class="set-wp">${MEDIA.get('spin:art') ? `<img src="${MEDIA.get('spin:art')}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setSpinArt"></label>${MEDIA.get('spin:art') ? adArtBtn('setSpinArtDel', 'Default') : ''}${artFrameBtn('spin:art', 'spin', 'Daily spin art')}`, 'The picture on the left of the Daily spin window (portrait, ~600×720)'),
  pullbg: () => `<div class="sx-row sx-block"><span class="sx-l">Summon background<small>Your art behind the summon animation</small></span><div class="sx-c">${pullBgHTML()}</div></div>`,
  dbl: () => `<div class="sx-row sx-block"><span class="sx-l">Double UR wallpapers<small>Left and right, split on the diagonal after the sphere turns UR when a pull holds 2+ URs</small></span><div class="sx-c">${dblArtsHTML()}</div></div>`,
  mw: () => `<div class="sx-row sx-block"><span class="sx-l">Max Win wallpaper<small>Behind the red SSS sphere at the end of a Max Win (default: a pulled UR's art)</small></span><div class="sx-c">${mwBgHTML()}</div></div>`,
  up: () => `<div class="sx-row sx-block"><span class="sx-l">SSR → UR upgrade wallpaper<small>Slides in when an SSR turns into a UR (1% of SSR pulls)</small></span><div class="sx-c">${upArtsHTML()}</div></div>`,
  honorbg: () => setRow('Pearl Honor wallpaper', `<span class="set-wp">${MEDIA.get('honor:bg') ? `<img src="${MEDIA.get('honor:bg')}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setHonorBg"></label>${MEDIA.get('honor:bg') ? adArtBtn('setHonorBgDel', 'Default') : ''}${artFrameBtn('honor:bg', 'screen', 'Pearl Honor wallpaper')}`, 'Behind the whole Pearl Honor page (1920×1080 best; default: a drawn moonlit sea)'),
  honorblur: () => setRow('Pearl Honor background blur', `<input type="range" min="0" max="30" step="1" value="${bpxBlur()}" id="setHonorBlur" class="afr-range" aria-label="Background blur"><b class="set-num" id="setHonorBlurN">${bpxBlur()} px</b>${S.honorBg && S.honorBg.blur != null ? adArtBtn('setHonorBlurDef', 'Default') : ''}`, `How soft the background looks behind the glass panels (0 = sharp, default ${BPX_BLUR} px). Applies to the wallpaper and to the drawn sea.`),
  bp: () => [['bp0', 'Pearl Honor: Pearl Gift icon', 'The free track emblem in Pearl Honor'], ['bp1', 'Pearl Honor: Coral Tide icon', 'The paid track emblem and the Coral Tide offer card'], ['bp2', 'Pearl Honor: Moon Tide icon', 'The Moon Tide offer card ($19.99)']].map(([k, l, d]) => setRow(l, `<span class="set-exp">${bpEmblem(+k[2])}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="${k}"></label>${customIcon(k) ? `<button type="button" class="sx-btn" data-iconreset="${k}">Default</button>` : ''}`, d)).join(''),
  gpts: () => setRow('Guild points icon', `<span class="set-exp">${curIcon('gpts')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="gpts"></label>${customIcon('gpts') ? '<button type="button" class="sx-btn" data-iconreset="gpts">Default</button>' : ''}`, 'Earned from the guild daily reward, spent in the Guild Shop'),
  spt: () => setRow('Banner points icon', `<span class="set-exp">${curIcon('spt')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="spt"></label>${customIcon('spt') ? '<button type="button" class="sx-btn" data-iconreset="spt">Default</button>' : ''}`, 'Summon points of the Limited, Weekly and Outfit banners'),
  sptp: () => setRow('Permanent points icon', `<span class="set-exp">${curIcon('sptp')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="sptp"></label>${customIcon('sptp') ? '<button type="button" class="sx-btn" data-iconreset="sptp">Default</button>' : ''}`, 'Permanent summon points (Permanent and Memory banners)'),
  ursel: () => setRow('UR selector icon', `<span class="set-exp">${curIcon('ursel')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="ursel"></label>${customIcon('ursel') ? '<button type="button" class="sx-btn" data-iconreset="ursel">Default</button>' : ''}`, 'The UR selector from the permanent banner milestones (300 and 600 pulls)'),
  cfur: () => setRow('UR character fragment icon', `<span class="set-exp">${curIcon('cfur')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="cfur"></label>${customIcon('cfur') ? '<button type="button" class="sx-btn" data-iconreset="cfur">Default</button>' : ''}`, 'Dropped by summons; 60 = random UR, 120 = chosen UR'),
  cfssr: () => setRow('SSR character fragment icon', `<span class="set-exp">${curIcon('cfssr')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="cfssr"></label>${customIcon('cfssr') ? '<button type="button" class="sx-btn" data-iconreset="cfssr">Default</button>' : ''}`, 'Dropped by summons; 60 = random SSR, 120 = chosen SSR'),
  nametk: () => setRow('Name change ticket icon', `<span class="set-exp">${curIcon('nametk')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" data-iconup="nametk"></label>${customIcon('nametk') ? '<button type="button" class="sx-btn" data-iconreset="nametk">Default</button>' : ''}`, 'The ticket used to change a player name (shop, Bag, rewards)'),
};
const ADMIN_ART_SECS = {'icons': ['exp', 'egg', 'memtk', 'nametk', 'ursel', 'cfur', 'cfssr', 'spt', 'sptp', 'gpts'], 'honor': ['honorbg', 'honorblur', 'bp'], 'shop': ['topup', 'pass'], 'campaign': ['chapters'], 'camp': ['campbg'], 'exp': ['expbg'], 'spin': ['spin'], 'summon': ['pullbg', 'dbl', 'mw', 'up']};
function adminArtRows(sec) {
  const list = sec ? ADMIN_ART_SECS[sec] || [] : Object.keys(ADMIN_ART);
  return list.map(k => ADMIN_ART[k]()).join('');
}
function bindAdminArt(root, rerender) {
  const on = id => root.querySelector('#' + id);
  const eu = on('setExpUp'); if (eu) eu.onchange = async () => { try { if (await mediaSet('icon:exp', await resizeImage(eu.files[0], 128))) { rerender(); toast('EXP icon updated.'); } } catch (e) { toast(e.message, true); } };
  const xb = on('setExpBg'); if (xb) xb.onchange = async () => { try { if (await mediaSet('exp:bg', await resizeImage(xb.files[0], 1920, 'image/jpeg'))) { rerender(); renderFarm(); toast('Expedition wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  root.querySelectorAll('[data-campbg]').forEach(inp => inp.onchange = async () => { try { if (await mediaSet('camp:bg:' + inp.dataset.campbg, await resizeImage(inp.files[0], 1920, 'image/jpeg'))) { rerender(); if (cmpEl) renderCampaign(); toast('Chapter wallpaper saved.'); } } catch (e) { toast(e.message, true); } });
  root.querySelectorAll('[data-campbgdel]').forEach(b => b.onclick = async () => { await mediaDel('camp:bg:' + b.dataset.campbgdel); rerender(); if (cmpEl) renderCampaign(); toast('Chapter wallpaper back to the night sky.'); });
  const cb = on('setCampBg'); if (cb) cb.onchange = async () => { try { if (await mediaSet('camp:bg', await resizeImage(cb.files[0], 1920, 'image/jpeg'))) { rerender(); renderFarm(); toast('Camp wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const hb = on('setHonorBg'); if (hb) hb.onchange = async () => { try { if (await mediaSet('honor:bg', await resizeImage(hb.files[0], 1920, 'image/jpeg'))) { rerender(); bpxBgRefresh(); toast('Pearl Honor wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const hbl = on('setHonorBlur'); if (hbl) { hbl.oninput = () => { S.honorBg = { ...(S.honorBg || {}), blur: +hbl.value }; on('setHonorBlurN').textContent = hbl.value + ' px'; bpxBlurApply(); };
    hbl.onchange = () => { persist(); rerender(); toast(`Pearl Honor background blur: ${hbl.value} px.`); }; }
  const hbd = on('setHonorBlurDef'); if (hbd) hbd.onclick = () => { if (S.honorBg) delete S.honorBg.blur; persist(); bpxBlurApply(); rerender(); toast('Background blur back to the default.'); };
  const hd = on('setHonorBgDel'); if (hd) hd.onclick = async () => { await mediaDel('honor:bg'); rerender(); bpxBgRefresh(); toast('Pearl Honor wallpaper back to the moonlit sea.'); };
  const sa = on('setSpinArt'); if (sa) sa.onchange = async () => { try { if (await mediaSet('spin:art', await resizeImage(sa.files[0], 900, 'image/jpeg'))) { rerender(); toast('Daily spin art saved.'); } } catch (e) { toast(e.message, true); } };
  const sd = on('setSpinArtDel'); if (sd) sd.onclick = async () => { await mediaDel('spin:art'); rerender(); };
  const cd = on('setCampBgDel'); if (cd) cd.onclick = async () => { await mediaDel('camp:bg'); rerender(); renderFarm(); toast('Camp wallpaper back to black.'); };
  const xd = on('setExpBgDel'); if (xd) xd.onclick = async () => { await mediaDel('exp:bg'); rerender(); renderFarm(); toast('Expedition wallpaper back to black.'); };
  bindUpArts(rerender); bindDblArts(rerender); bindPullBg(rerender); bindMwBg(rerender);
  document.querySelectorAll('[data-eggup]').forEach(i => i.onchange = async () => { try { if (await mediaSet('icon:egg' + i.dataset.eggup, await resizeImage(i.files[0], 256, 'image/png'))) { rerender(); toast('Egg icon updated.'); } } catch (e) { toast(e.message, true); } });
  document.querySelectorAll('[data-iconup]').forEach(i => i.onchange = async () => { try { if (await mediaSet('icon:' + i.dataset.iconup, await (async u => i.dataset.iconup.startsWith('pass') ? u : centerIcon(u, 256))(await resizeImage(i.files[0], 512, 'image/png')))) { rerender(); toast('Icon updated.'); } } catch (e) { toast(e.message, true); } });
  document.querySelectorAll('[data-iconreset]').forEach(b => b.onclick = async () => { await mediaDel('icon:' + b.dataset.iconreset); rerender(); toast('Icon back to the default.'); });
  document.querySelectorAll('[data-eggreset]').forEach(b => b.onclick = async () => { await mediaDel('icon:egg' + b.dataset.eggreset); rerender(); toast('Egg icon back to the default.'); });
  document.querySelectorAll('[data-tuup]').forEach(i => i.onchange = async () => { try { if (await mediaSet('topup:' + i.dataset.tuup, await resizeImage(i.files[0], 512, 'image/png'))) { rerender(); toast('Top Up icon updated.'); } } catch (e) { toast(e.message, true); } });
  document.querySelectorAll('[data-tureset]').forEach(b => b.onclick = async () => { await mediaDel('topup:' + b.dataset.tureset); rerender(); toast('Top Up icon back to the default.'); });
  const er = on('setExpReset'); if (er) er.onclick = async () => { await mediaDel('icon:exp'); rerender(); toast('EXP icon back to the default.'); };
}
