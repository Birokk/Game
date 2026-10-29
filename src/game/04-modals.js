/* ---------- modals ---------- */
let modalEl = null;
function openModal({ title, ic, body, wide, kind, onMount }) {
  closeModal();
  const back = document.createElement('div'); back.className = 'modal-back'; back.dataset.kind = kind || '';
  back.innerHTML = `<div class="modal glass-deep ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="mTitle">
    <header class="m-head"><span class="m-ic">${icon(ic)}</span><h2 id="mTitle">${esc(title)}</h2><button class="iconbtn" data-close aria-label="Close">${icon('close')}</button></header>
    <div class="m-body">${body}</div></div>`;
  back.addEventListener('pointerdown', e => { if (e.target === back) closeModal(); });
  back.querySelector('[data-close]').onclick = closeModal;
  document.body.appendChild(back); modalEl = back;
  if (onMount) onMount(back.querySelector('.m-body'));
  back.querySelector('[data-close]').focus({ preventScroll: true });
}
function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; refreshCharacters(); } }

const PLACEHOLDERS = {
  events:  ['Events', 'calendar', 'Limited-time events, the login calendar and the banner schedule.'],
  quests:  ['Quests', 'quests', 'Daily and weekly missions that pay out pearls and coins.'],
  friends: ['Friends', 'friends', 'Friend list, invites, and meeting up with friends in the plaza.'],
  ranking: ['Ranking', 'trophy', 'Leaderboards for collection size, event points and more.'],
  shop:    ['Shop', 'shop', 'Pearl packs, skin bundles and the monthly pass.'],
  bag:     ['Bag', 'bag', 'Items, upgrade materials and summon tickets you own.'],
  team:    ['Team', 'team', 'Pick up to four characters to bring into events.']
};
function openPlaceholder(key) {
  const [title, ic, desc] = PLACEHOLDERS[key];
  openModal({ title, ic, body: `<div class="ph">
    <div class="ph-hero"><span class="m-ic">${icon(ic)}</span><div><span class="tag">Template</span><p>${esc(desc)} This screen gets built in a later update.</p></div></div>
    <div class="skel">${'<div></div>'.repeat(6)}</div></div>` });
}

/* mail */
const MAILS = [
  { id:'welcome', from:'Plaza Team', title:'Welcome to Blank: Project!', body:'A starter gift to begin your collection.', reward:{ pearls:60, coins:1000 }, date:'Oct 28' },
  { id:'maint', from:'Plaza Team', title:'Maintenance compensation', body:'Thanks for your patience during the update.', reward:{ pearls:9 }, date:'Oct 26' },
  { id:'event', from:'Events', title:'Halloween banner opens Oct 31', body:'A spooky limited banner with two new skins.', reward:null, date:'Oct 25' }
];
const rewardHTML = r => Object.entries(r).map(([k, v]) => `<span class="cost">${curIcon(k)}${fmt(v)}</span>`).join('');
function openMail() { openModal({ title: 'Mail', ic: 'mail', body: '<div class="mail" id="mailList"></div>', onMount: renderMail }); }
function renderMail() {
  const el = $('#mailList'); if (!el) return;
  el.innerHTML = MAILS.map(m => {
    const done = S.mailClaimed.includes(m.id);
    return `<div class="mail-row"><div style="min-width:0"><div class="meta">${esc(m.from)} · ${esc(m.date)}</div><h4>${esc(m.title)}</h4><p>${esc(m.body)}</p>${m.reward ? `<div class="reward">${rewardHTML(m.reward)}</div>` : ''}</div>
      <button class="btn sm ${done ? 'ghost' : 'mint'}" data-claim="${m.id}" ${done ? 'disabled' : ''}>${done ? (m.reward ? 'Claimed' : 'Read') : (m.reward ? 'Claim' : 'Mark read')}</button></div>`;
  }).join('');
  el.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => {
    const m = MAILS.find(x => x.id === b.dataset.claim);
    S.mailClaimed.push(m.id);
    if (m.reward) Object.entries(m.reward).forEach(([k, v]) => S.wallet[k] = (S.wallet[k] || 0) + v);
    persist(); renderMail(); renderMenu(); refreshSummon();
    if (m.reward) toast(`Claimed ${Object.entries(m.reward).map(([k, v]) => `${fmt(v)} ${k}`).join(' and ')}.`);
  });
}

/* settings */
function openSettings() {
  openModal({ title: 'Settings', ic: 'gear', body: `<form class="form" id="setForm">
    <div class="switch" style="cursor:default">Main character<span class="row" style="gap:10px"><b style="color:var(--mint)">${S.player.mc ? esc(mcEntry(S.player.mc).name) : 'Not chosen yet'}</b>${S.player.mc ? `<button type="button" class="btn ghost sm" id="setMC" ${mcSwitchLeft() ? 'disabled' : ''}>${mcSwitchLeft() ? `Switch in ${fmtDur(mcSwitchLeft())}` : 'Switch'}</button>` : ''}</span></div>
    <label class="field"><span>Player name</span><input class="input" id="setName" maxlength="16" value="${esc(S.player.name)}"></label>
    <button type="button" class="switch" data-open="wallpaper" style="text-align:left">Main screen wallpaper<b style="color:var(--mint)">${esc(wallpaperEntry() ? wallpaperEntry().name : 'Pearl Tide')}</b></button>
    <label class="switch">Show name tags in the plaza<input type="checkbox" id="setNames" ${S.settings.names ? 'checked' : ''}><i></i></label>
    <label class="switch">Music<input type="checkbox" id="setMusic" ${S.settings.music ? 'checked' : ''}><i></i></label>
    <label class="switch">Sound effects<input type="checkbox" id="setSfx" ${S.settings.sfx ? 'checked' : ''}><i></i></label>
    <label class="field"><span>Graphics</span><select class="input" id="setGfx">${['high', 'medium', 'low'].map(g => `<option value="${g}" ${S.settings.gfx === g ? 'selected' : ''}>${g[0].toUpperCase() + g.slice(1)}</option>`).join('')}</select></label>
    <div class="row" style="justify-content:space-between"><span class="tiny">Audio and graphics settings are placeholders for now.</span><span class="row" style="gap:6px"><button type="button" class="btn ghost sm" id="setRedeem">${icon('gift')}Redeem code</button><button type="button" class="btn ghost sm" id="setTitle">${icon('back')}Title screen</button><button type="button" class="btn ghost sm" data-open="admin">${icon('wrench')}Admin panel</button></span></div>
  </form>`, onMount: () => {
    $('#setName').addEventListener('input', e => { S.player.name = e.target.value.trim() || 'Traveler'; player.name = S.player.name; renderMenu(); persist(); });
    $('#setNames').onchange = e => { S.settings.names = e.target.checked; persist(); };
    $('#setMusic').onchange = e => { S.settings.music = e.target.checked; persist(); };
    $('#setSfx').onchange = e => { S.settings.sfx = e.target.checked; persist(); };
    $('#setGfx').onchange = e => { S.settings.gfx = e.target.value; persist(); };
    $('#setForm').onsubmit = e => e.preventDefault();
    $('#setTitle').onclick = showTitle;
    $('#setRedeem').onclick = openRedeem;
    const mb = $('#setMC'); if (mb) mb.onclick = () => { if (!mcSwitchLeft()) openMCPick(true); };
  } });
}

/* wallpaper picker */
function openWallpaper() {
  openModal({ title: 'Wallpaper', ic: 'image', wide: true, kind: 'wallpaper', body: '<div id="wpRoot"></div>', onMount: renderWallpaperPicker });
}
function renderWallpaperPicker() {
  const root = $('#wpRoot'); if (!root) return;
  const ownedList = S.pool.filter(e => (e.type === 'character' || e.type === 'skin') && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
  const cur = wallpaperEntry();
  const tile = (e) => {
    const on = e ? cur && cur.id === e.id : !cur;
    return `<button class="wpt ${e ? 'r' + e.rarity : ''} ${on ? 'on' : ''}" data-wp="${e ? esc(e.id) : ''}" aria-pressed="${on}">
      <span class="mini"></span>${e ? `<img src="${getSplash(e)}" alt="">` : ''}
      <span class="lab">${e ? esc(e.name) : 'Pearl Tide (default)'}</span>${on ? `<span class="chk">${icon('check')}</span>` : ''}</button>`;
  };
  root.innerHTML = `<p class="tiny" style="margin-bottom:14px">Pick any character or skin you own. Pull on the banner to unlock more.</p>
    <div class="wpgrid">${tile(null)}${ownedList.map(tile).join('')}</div>
    ${ownedList.length ? '' : `<div class="empty" style="margin-top:14px">You don't own any characters yet. <button class="link" data-open="summon">Go to the banner</button></div>`}`;
  root.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => {
    S.wallpaper = b.dataset.wp || null; persist(); applyWallpaper(); renderWallpaperPicker();
  });
}
