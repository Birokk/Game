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
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; refreshCharacters(); } }

const PLACEHOLDERS = {
  quests:  ['Quests', 'quests', 'Daily and weekly missions that pay out pearls and coins.'],
  friends: ['Friends', 'friends', 'Friend list, invites, and meeting up with friends in the plaza.'],
  ranking: ['Ranking', 'trophy', 'Leaderboards for collection size, event points and more.'],
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
const MAIL_CAP = 500, MAIL_R = { pearls: 5, tickets: 5, rings: 5, starlight: 5, wishes: 4, bottles: 4, coins: 3, dust: 3 };
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
    if (m.reward) Object.entries(m.reward).forEach(([k, v]) => { S.wallet[k] = (S.wallet[k] || 0) + v; got[k] = (got[k] || 0) + v; }); });
  persist(); renderMail(); renderMenu(); refreshSummon();
  if (Object.keys(got).length) toast(`Claimed ${Object.entries(got).map(([k, v]) => `${fmt(v)} ${k === 'coins' ? 'gold' : k}`).join(' and ')}.`);
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
const SET_TABS = [['graphics', 'image', 'Graphics'], ['audio', 'audio', 'Audio'], ['game', 'sparkle', 'Game'], ['account', 'user', 'Account'], ['admin', 'wrench', 'Admin']];
const SET_DEFAULTS = { names: true, music: true, sfx: true, gfx: 'high', skipPull: false };
let setEl = null, setTab = 'graphics';
const setRow = (label, ctl, sub = '') => `<div class="sx-row"><span class="sx-l">${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="sx-c">${ctl}</span></div>`;
const setSel = (key, val, opts) => `<label class="sx-sel"><select data-set="${key}" aria-label="${key}">${opts.map(([v, l]) => `<option value="${v}" ${String(val) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
const setOnOff = key => setSel(key, S.settings[key] ? '1' : '0', [['1', 'On'], ['0', 'Off']]);
function openSettings(tab) {
  closeModal();
  setTab = SET_TABS.some(t => t[0] === tab) ? tab : setTab;
  if (setTab === 'admin' && !canAdmin()) setTab = 'graphics';
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
    + setRow('Name tags in the plaza', setOnOff('names'), 'Show names above players and bots')
    + setRow('Graphics options', '<span class="sx-val">More coming soon</span>');
  else if (setTab === 'audio') rows = setRow('Music', setOnOff('music')) + setRow('Sound effects', setOnOff('sfx')) + setRow('Audio', '<span class="sx-val">Sound arrives in a later update</span>');
  else if (setTab === 'game') rows = setRow('Main screen wallpaper', `<button type="button" class="sx-btn" data-open="wallpaper">${esc(wallpaperEntry() ? wallpaperEntry().name : 'Pearl Tide')}</button>`)
    + setRow('Skip summon animation', setOnOff('skipPull'), 'Jump straight to the results')
    + setRow('Redeem code', btn('setRedeem', `${icon('gift')}Redeem`))
    + setRow('Title screen', btn('setTitle', `${icon('back')}Go to title screen`));
  else if (setTab === 'account') {
    const acct = Backend.user ? esc(Backend.user.email || 'Signed in') : 'Guest · this browser only';
    rows = setRow('Account', Backend.on ? btn('setAcct', Backend.user ? 'Sign out' : 'Sign in') : `<span class="sx-val">${acct}</span>`, Backend.on ? acct : '')
      + setRow('Player name', `<input class="sx-in" id="setName" maxlength="16" value="${esc(S.player.name)}" aria-label="Player name">`, 'Up to 16 characters')
      + setRow('Main character', S.player.mc ? `<button type="button" class="sx-btn" id="setMC" ${mcSwitchLeft() ? 'disabled' : ''}>${mcSwitchLeft() ? `Switch in ${fmtDur(mcSwitchLeft())}` : 'Switch'}</button>` : '<span class="sx-val">Not chosen yet</span>', S.player.mc ? `${esc(mcEntry(S.player.mc).name)} · once every 72 hours` : '')
      + setRow('UID', `<span class="sx-val">${esc(String(S.profile.uid || '—'))}</span>`);
  } else rows = setRow('EXP icon', `<span class="set-exp">${curIcon('exp')}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="setExpUp"></label>${customIcon('exp') ? btn('setExpReset', 'Default') : ''}`, 'Shown only where EXP is given as a reward')
      + `<div class="sx-row sx-block"><span class="sx-l">SSR → UR upgrade wallpaper<small>Slides in when an SSR turns into a UR (1% of SSR pulls)</small></span><div class="sx-c">${upArtsHTML()}</div></div>`
      + setRow('Admin panel', btn('setAdmin', `${icon('wrench')}Open`));
  setEl.innerHTML = `<div class="setx-top"><div class="inv-title"><span class="inv-badge">${icon('gear')}</span><h2 class="ts">${cur[2]}</h2></div>
      <nav class="inv-tabs">${tabs.map(([k, ic, l]) => `<button class="${k === setTab ? 'on' : ''}" data-settab="${k}" title="${l}" aria-label="${l}">${icon(ic)}</button>`).join('')}</nav>
      <button class="inv-x" id="setClose" aria-label="Close">${icon('close')}</button></div>
    <div class="setx-list">${rows}</div>
    <div class="setx-foot">${['graphics', 'audio', 'game'].includes(setTab) ? btn('setDefault', 'Default Settings', 'big') : ''}</div>`;
  const on = id => setEl.querySelector('#' + id);
  on('setClose').onclick = closeSettings;
  setEl.querySelectorAll('[data-settab]').forEach(b => b.onclick = () => { setTab = b.dataset.settab; renderSettings(); });
  setEl.querySelectorAll('[data-set]').forEach(sel => sel.onchange = () => { const k = sel.dataset.set; S.settings[k] = k === 'gfx' ? sel.value : sel.value === '1'; persist(); });
  const df = on('setDefault'); if (df) df.onclick = () => { S.settings = { ...S.settings, ...SET_DEFAULTS }; persist(); renderSettings(); toast('Settings set back to default.'); };
  const nm = on('setName'); if (nm) nm.addEventListener('input', e => { S.player.name = e.target.value.trim() || 'Traveler'; player.name = S.player.name; renderMenu(); persist(); });
  const rd = on('setRedeem'); if (rd) rd.onclick = openRedeem;
  const tt = on('setTitle'); if (tt) tt.onclick = showTitle;
  const ab = on('setAcct'); if (ab) ab.onclick = () => Backend.user ? confirmSignOut() : openSignIn(true);
  const mb = on('setMC'); if (mb) mb.onclick = () => { if (!mcSwitchLeft()) openMCPick(true); };
  const ad = on('setAdmin'); if (ad) ad.onclick = () => { closeSettings(); openAdmin(); };
  const eu = on('setExpUp'); if (eu) eu.onchange = async () => { try { if (await mediaSet('icon:exp', await resizeImage(eu.files[0], 128))) { renderSettings(); toast('EXP icon updated.'); } } catch (e) { toast(e.message, true); } };
  bindUpArts(renderSettings);
  const er = on('setExpReset'); if (er) er.onclick = async () => { await mediaDel('icon:exp'); renderSettings(); toast('EXP icon back to the default.'); };
}

/* wallpaper picker */
function openWallpaper() {
  openModal({ title: 'Wallpaper', ic: 'image', wide: true, kind: 'wallpaper', body: '<div id="wpRoot"></div>', onMount: renderWallpaperPicker });
}
function renderWallpaperPicker() {
  const root = $('#wpRoot'); if (!root) return;
  const ownedList = S.pool.filter(e => (e.type === 'character' || e.type === 'skin') && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  const list = wpList();
  const tile = (e) => {
    const n = e ? list.indexOf(e.id) + 1 : 0, on = e ? n > 0 : !list.length;
    return `<button class="wpt ${e ? 'r' + e.rarity : ''} ${on ? 'on' : ''}" data-wp="${e ? esc(e.id) : ''}" aria-pressed="${on}">
      <span class="mini"></span>${e ? `<img src="${getSplash(e)}" alt="">` : ''}
      <span class="lab">${e ? esc(e.name) : 'Pearl Tide (default)'}</span>${on ? `<span class="chk">${e ? n : icon('check')}</span>` : ''}</button>`;
  };
  root.innerHTML = `<p class="tiny" style="margin-bottom:14px">Pick up to ${WP_MAX} characters or skins you own (${list.length}/${WP_MAX} chosen); tap again to remove one. With two or more, tap once on an empty part of the main screen to show arrows and switch between them. Pearl Tide clears the list.</p>
    <div class="wpgrid">${tile(null)}${ownedList.map(tile).join('')}</div>
    ${ownedList.length ? '' : `<div class="empty" style="margin-top:14px">You don't own any characters yet. <button class="link" data-open="summon">Go to the banner</button></div>`}`;
  root.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => {
    const id = b.dataset.wp, cur = wpList();
    if (!id) { S.wallpapers = []; S.wallpaper = null; }
    else if (cur.includes(id)) { S.wallpapers = cur.filter(x => x !== id); if (S.wallpaper === id) S.wallpaper = S.wallpapers[0] || null; }
    else if (cur.length >= WP_MAX) { toast(`You can pick up to ${WP_MAX} wallpapers. Remove one first.`); return; }
    else { S.wallpapers = [...cur, id]; S.wallpaper = id; }
    persist(); applyWallpaper(true); renderWallpaperPicker();
  });
}
