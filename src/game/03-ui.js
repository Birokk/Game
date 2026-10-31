/* ---------- toast ---------- */
let toastTimer;
/* error toasts stay up for 6 s and ordinary toasts don't cover them, so a failure is never hidden by a "Saved" right after */
let toastErrUntil = 0;
function toast(msg, error) {
  if (!error && Date.now() < toastErrUntil) return;
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = `toast glass-deep ${error ? 'err' : ''}`; t.textContent = msg; t.setAttribute('role', error ? 'alert' : 'status');
  if (error) toastErrUntil = Date.now() + 6000;
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), error ? 6000 : 3000);
}

/* ---------- main menu & wallpaper ---------- */
const menuEl = $('#menu'), hudEl = $('#hud'), wpEl = $('#wallpaper');
let menuOpen = true, stdRotate = 0;
function timeLeft() {
  const end = new Date((S.banners.limited.end || '2026-11-11') + 'T23:59:00');
  const ms = end - Date.now();
  if (ms <= 0) return 'Banner ended';
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5);
  return `Ends in <b>${d}d ${h}h</b>`;
}
function shortLeft(endMs) {
  const ms = (endMs || new Date((S.banners.limited.end || '2026-11-11') + 'T23:59:00')) - Date.now();
  if (ms <= 0) return 'Ended';
  const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), p = n => String(n).padStart(2, '0');
  return d ? `${d}d ${p(h)}h` : `${p(h)}h ${p(m)}m`;
}
/* outfit equipped on a character (owned skins only) */
const equippedOf = c => { const k = c && S.equip[c.id] && findEntry(S.equip[c.id]); return k && k.parent === c.id && owns(k.id) ? k : null; };
/* small round pictures (roster, avatars, chips): the custom icon if set, else the art; characters use their equipped outfit */
const thumbImg = (e, cls = '') => {
  const t = (e && e.type === 'character' && equippedOf(e)) || e, ic = artFrom(t.icon);
  return ic ? `<img src="${ic}" alt="" class="ico ${cls}">` : `<img src="${getArt(t)}" alt="" class="${mediaArt(t) ? 'art' : 'chibi'} ${cls}">`;
};
/* banner portraits: the entry's own icon or base art, never the player's equipped outfit or star art */
const baseThumb = (e, cls = '') => { const ic = artFrom(e.icon); return ic ? `<img src="${ic}" alt="" class="ico ${cls}">` : `<img src="${baseCard(e)}" alt="" class="${baseArt(e) ? 'art' : 'chibi'} ${cls}">`; };
function renderMenu() {
  $('#pname').textContent = S.player.name;
  $('#hmAvatar').innerHTML = avatarHTML(56) + `<span class="lvb">${playerLv().lv}</span>`;
  $('#lvDot').hidden = !lvReady();
  $('#hmTitle').innerHTML = titleHTML();
  $('#wallet').innerHTML = `<div class="cur" id="stamPill" title="Stamina">${curIcon('stamina')}<b id="stamVal"></b><button class="plus" id="stamPlus" aria-label="Get more stamina">${icon('plus')}</button></div>` + [['coins', 'Gold coins'], ['pearls', 'Pearls'], ['tickets', 'Limited tickets: 1 pull on the Limited, Weekly or Outfit banner'], ['wishes', 'Standard tickets: 1 pull on the permanent banner']].map(([k, l]) =>
    `<div class="cur" title="${l}">${curIcon(k)}<b>${fmt(S.wallet[k])}</b><button class="plus" data-open="${k === 'tickets' || k === 'wishes' ? 'buytickets' : 'shop'}" data-tkbk="${k === 'wishes' ? 'standard' : 'limited'}" aria-label="Get more ${l.toLowerCase()}">${icon('plus')}</button></div>`).join('');
  const unread = mailList().filter(mailOpen).length;
  const badge = $('#mailBadge'); badge.textContent = unread; badge.hidden = !unread;
  $('#sumDot').hidden = !BANNER_KEYS.some(k => canPull(10, k) || freeReady(k));
  $('#evDot').hidden = !loginReady();
  $('#achDot').hidden = !ACH.some(a => a.ok() && !S.ach.includes(a.id));
  const PS = S.pets;
  $('#farmDot').hidden = !farmReady();
  $('#petDot').hidden = !(PS.inc.some(i => i && i.ends <= Date.now()) || (PS.eggs.length && PS.inc.includes(null)) || ['ssr', 'ur'].some(r => PS.frags[r] >= EGG[r].frag));
  $('#stamPill').onclick = openStamina;
  $('#spinDot').hidden = !spinReady();
  renderStamina();
  const f = limitedUR(), std = standardURs(), sf = std.length ? std[stdRotate % std.length] : null, gl = S.gacha.limited;
  // same card as the summon screen's banner tabs
  $('#promo').innerHTML = `<button class="sx-tab lim promo-tab" data-open="summon" data-banner="limited" aria-label="Open the limited banner">
      <small>Limited · ${shortLeft()}</small>${f ? `<img src="${baseSplash(f)}" alt="" class="${baseArt(f) ? '' : 'chibi'}">` : ''}<b>${f ? esc(f.name) : esc(bannerName('limited'))}<br>Summon</b>${canPull(10, 'limited') || freeReady('limited') ? '<span class="dot-n"></span>' : ''}
    </button>`;
  $('#limTime').innerHTML = `${icon('clock')}Limited ends in ${shortLeft()}`;
  applyWallpaper();
}

/* stamina: 240 max, +1 every 6 minutes (nothing spends it yet) */
const STAMINA_MAX = 240, STAMINA_MS = 6 * 60 * 1000;
const STAMINA_CAP = 999;   // bottles, refills and the farm can go past 240, but never past 999
/* add stamina from any source, up to the 999 cap; returns how much was actually added */
function giveStamina(n) {
  stamina(); const add = Math.max(0, Math.min(n, STAMINA_CAP - S.stamina.v));
  S.stamina.v += add; if (S.stamina.v >= STAMINA_MAX) S.stamina.t = Date.now(); return add;
}
function stamina() {
  const st = S.stamina, now = Date.now();
  if (st.v >= STAMINA_MAX) { st.t = now; return st.v; }
  const k = Math.floor((now - st.t) / STAMINA_MS);
  if (k > 0) { st.v = Math.min(STAMINA_MAX, st.v + k); st.t = st.v >= STAMINA_MAX ? now : st.t + k * STAMINA_MS; persist(); }
  return st.v;
}
function spendStamina(n) { if (stamina() < n) return false; if (S.stamina.v >= STAMINA_MAX) S.stamina.t = Date.now(); S.stamina.v -= n; persist(); renderStamina(); return true; }
function renderStamina() {
  const el = $('#stamVal'); if (!el) return;
  const v = stamina(), left = STAMINA_MS - (Date.now() - S.stamina.t), m = Math.floor(left / 6e4), sec = Math.floor(left % 6e4 / 1e3);
  el.innerHTML = `${v}<span style="color:var(--muted);font-weight:800">/${STAMINA_MAX}</span>`;
  $('#stamPill').title = v >= STAMINA_MAX ? 'Stamina is full' : `Stamina · +1 in ${m}:${String(sec).padStart(2, '0')}`;
}
setInterval(() => { if (menuOpen) renderStamina(); }, 1000);

/* daily login: Limited tickets every day on a 7-day calendar; it lives on the Event page (21-events.js) */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const loginReady = () => S.login.last !== dayKey();
/* world chat ticker: the demo bots chat here until multiplayer exists */
function tickWorld() {
  const el = $('#tickerText'); if (!el) return;
  el.innerHTML = `<span class="w">[World]</span> <b>${esc(pick(BOT_NAMES))}</b>: ${esc(pick(BOT_LINES))}`;
  el.classList.remove('fresh'); void el.offsetWidth; el.classList.add('fresh');
}
$('#ticker').onclick = () => setMenu(false);

/* hide every menu element and keep only the wallpaper; any tap brings it back */
let uiHidden = false;
function setUiHidden(on) { uiHidden = on; menuEl.classList.toggle('ui-hidden', on); }
$('#hideUi').onclick = () => setUiHidden(true);
menuEl.addEventListener('click', e => { if (uiHidden) { e.stopPropagation(); e.preventDefault(); setUiHidden(false); } }, true);
/* a wallpaper id is an entry id (its base splash art) or `<charId>@art3` / `<charId>@art6` (that star splash art), so every
   unlocked art is its own wallpaper, whatever the character has equipped */
function wpParse(id) {
  if (!id) return null;
  const [eid, k] = String(id).split('@'), e = findEntry(eid); if (!e) return null;
  const a = ASC.find(x => x.k === (k || 'base')); if (!a || (k && a.k === 'base')) return null;
  return { id, e, k: a.k, a };
}
const wpOk = id => { const w = wpParse(id); return !!w && owns(w.e.id) && (w.k === 'base' || ascOpen(w.e, w.a)); };
const wpSrc = w => w.k === 'base' ? baseSplash(w.e) : artFrom(w.e[w.k]);
const wpHasArt = w => !!(w.k === 'base' ? baseArt(w.e) : artFrom(w.e[w.k]));
const wpName = w => w.k === 'base' ? w.e.name : `${w.e.name} · ${w.a.label} art`;
const wpIdFor = (e, k = 'base') => k === 'base' ? e.id : `${e.id}@${k}`;
/* every unlocked splash art of the owned characters / skins as a choice: base art, then the 3★ and 6★ arts (locked ones flagged) */
function artChoices(types = ['character', 'skin']) {
  return S.pool.filter(e => types.includes(e.type) && owns(e.id)).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
    .flatMap(e => ASC.filter(a => a.k === 'base' || (e.type === 'character' && artFrom(e[a.k]))).map(a => ({ id: wpIdFor(e, a.k), e, a, open: ascOpen(e, a) })));
}
/* a round picture of one exact art (base: the entry's icon or base art; star art: that art) */
const wpThumb = (w, cls = '') => w.k === 'base' ? baseThumb(w.e, cls) : `<img src="${artFrom(w.e[w.k])}" alt="" class="art ${cls}">`;
function wallpaperInfo() { return wpOk(S.wallpaper) ? wpParse(S.wallpaper) : null; }
function wallpaperEntry() { const w = wallpaperInfo(); return w ? w.e : null; }
/* up to 4 home wallpapers (S.wallpapers); S.wallpaper is the one showing. Anything that sets S.wallpaper joins the list. */
const WP_MAX = 4;
function wpList() {
  let list = (Array.isArray(S.wallpapers) ? S.wallpapers : []).filter(wpOk);
  if (wpOk(S.wallpaper) && !list.includes(S.wallpaper)) list = [S.wallpaper, ...list].slice(0, WP_MAX);
  if (!S.wallpaper || !list.includes(S.wallpaper)) S.wallpaper = list[0] || null;
  if (JSON.stringify(list) !== JSON.stringify(S.wallpapers)) S.wallpapers = list;
  return list;
}
function stepWallpaper(dir) {
  const list = wpList(); if (list.length < 2) return;
  S.wallpaper = list[(list.indexOf(S.wallpaper) + dir + list.length) % list.length]; persist(); applyWallpaper(true); showWpArrows();
}
let wpArrowTimer = null;
function showWpArrows() {
  if (wpList().length < 2) return menuEl.classList.remove('wp-arrows');
  menuEl.classList.add('wp-arrows'); clearTimeout(wpArrowTimer); wpArrowTimer = setTimeout(() => menuEl.classList.remove('wp-arrows'), 4000);
}
$('#wpPrev').onclick = e => { e.stopPropagation(); stepWallpaper(-1); };
$('#wpNext').onclick = e => { e.stopPropagation(); stepWallpaper(1); };
// one tap on an empty part of the main screen shows the arrows (only with 2+ wallpapers)
menuEl.addEventListener('click', e => { if (uiHidden || e.target.closest('button, a, input, select, textarea, label, .cur, #promo')) return; if (menuEl.classList.contains('wp-arrows')) { menuEl.classList.remove('wp-arrows'); clearTimeout(wpArrowTimer); } else showWpArrows(); });
function applyWallpaper(fade) {
  wpList();
  const w = wallpaperInfo(), e = w && w.e;
  if (fade) wpEl.querySelectorAll('#wpSplash, #wpBlur').forEach(img => {   // crossfade: a copy of the old picture fades out over the new one
    if (img.hidden || !img.getAttribute('src')) return;
    const ghost = img.cloneNode(); ghost.removeAttribute('id'); ghost.classList.add('wp-ghost'); img.after(ghost);
    requestAnimationFrame(() => requestAnimationFrame(() => ghost.classList.add('out')));
    setTimeout(() => ghost.remove(), 900);
  });
  wpEl.classList.toggle('has-char', !!e);
  wpEl.classList.toggle('chibi', !!e && !wpHasArt(w));
  wpEl.classList.remove('r3', 'r4', 'r5'); if (e) wpEl.classList.add('r' + e.rarity);
  [$('#wpSplash'), $('#wpBlur')].forEach(img => {
    if (e) { const src = wpSrc(w); if (img.getAttribute('src') !== src) img.src = src; img.hidden = false; }
    else { img.hidden = true; img.removeAttribute('src'); }
  });
  $('#wpName').textContent = e ? wpName(w) : 'Blank: Project';
}
(function seedPearls() {
  const box = $('#wpPearls'); let h = '';
  for (let i = 0; i < 16; i++) {
    const size = 6 + Math.random() * 26, left = Math.random() * 100, dur = 14 + Math.random() * 22, delay = -Math.random() * dur, blur = size > 24 ? 'filter:blur(2px);' : '';
    h += `<i style="width:${size}px;height:${size}px;left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;${blur}"></i>`;
  }
  box.innerHTML = h;
})();
function setMenu(open) {
  menuOpen = open;
  menuEl.classList.toggle('is-open', open);
  wpEl.classList.toggle('on', open);
  menuEl.inert = !open;
  hudEl.hidden = open;
  if (open) setUiHidden(false);
  if (!open) { render(); showHint(); onEnterPlaza(); }
}
$('#enterPlaza').onclick = () => setMenu(false);
$('#openMenu').onclick = () => setMenu(true);

/* ---------- title screen: wallpaper (set in admin), tap to start, guest login, notice / support / repair / terms ---------- */
const titleEl = $('#title');
let titleOn = true;
const DEFAULT_NEWS = 'Welcome to Blank: Project! | The lantern festival is open. Claim your daily login and spin the wheel every day.\nLimited banner: Aria | Aria is on rate-up until the banner ends.\nPets have arrived | Catch eggs in the plaza and hatch them in the Pets screen.';
(function seedMotes() { let h = ''; for (let i = 0; i < 24; i++) { const d = 8 + Math.random() * 12; h += `<i style="left:${Math.random() * 100}%;width:${3 + Math.random() * 5}px;animation-duration:${d}s;animation-delay:${-Math.random() * d}s"></i>`; } $('#ttMotes').innerHTML = h; })();
function renderTitle() {
  const bg = MEDIA.get('title:bg'), img = $('#ttImg');
  img.hidden = !bg; if (bg) img.src = bg; else img.removeAttribute('src');
  titleEl.classList.toggle('has-img', !!bg);
  const acct = S.account ? (S.account.email ? esc(S.account.email) : 'Guest') : '';
  $('#ttWho').innerHTML = S.account ? `Signed in as <b>${esc(S.player.name)}</b> · ${acct} · <button class="link" id="ttSwitch">Switch account</button>` : 'Not signed in';
  $('#ttUid').textContent = S.account ? `UID ${S.profile.uid}` : '';
  const sw = $('#ttSwitch'); if (sw) sw.onclick = e => { e.stopPropagation(); if (Backend.user) confirmSignOut(); else openSignIn(); };
}
function showTitle() { titleOn = true; closeModal(); closeEvents(); closeInventory(); closeShop(); closeSettings(); closeRaids(); closeCharacters(); closeSummon(); setMenu(true); renderTitle(); titleEl.hidden = false; titleEl.classList.remove('leaving'); }
function enterGame() {
  if (!S.player.mc) return openMCPick();
  titleOn = false; closeModal(); renderMenu();
  showLoading(() => { if (loginReady()) setTimeout(openLogin, 450); });
  setTimeout(() => { titleEl.hidden = true; }, 400);
}
/* first sign-in: pick the main character */
function openMCPick(switching) {
  let pick = null;
  openModal({ title: switching ? 'Switch main character' : 'Choose your character', ic: 'chars', wide: true, kind: 'mc', body: `<div class="stack">
    <p class="desc">${switching ? 'Your main character is who you are in the plaza and in your character list. After switching you have to wait 72 hours to switch again.' : "This is who you'll be in the plaza. You can switch later in Settings, once every 72 hours."}</p>
    <div class="mc-pick">${['f', 'm'].map(k => { const e = mcEntry(k); return `<button class="mc-card" data-mc="${k}"><img src="${baseSplash(e)}" alt="" class="${baseArt(e) ? 'art' : ''}"><b>${MC_NAME[k]}</b>${e.name !== MC_NAME[k] + ' MC' ? `<span class="tiny">${esc(e.name)}</span>` : ''}</button>`; }).join('')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn gold" id="mcGo" disabled>Confirm</button></div></div>`, onMount: () => {
    modalEl.querySelectorAll('[data-mc]').forEach(b => b.onclick = () => { pick = b.dataset.mc; modalEl.querySelectorAll('[data-mc]').forEach(x => x.classList.toggle('on', x === b)); $('#mcGo').disabled = false; $('#mcGo').textContent = `Play as ${MC_NAME[pick]}`; });
    if (switching) { const cur = modalEl.querySelector(`[data-mc="${S.player.mc}"]`); if (cur) cur.click(); }
    $('#mcGo').onclick = () => {
      if (!pick) return;
      if (!switching) { setMC(pick); closeModal(); enterGame(); return; }
      if (pick === S.player.mc) { closeModal(); return; }
      setMC(pick, true); closeModal(); closeCharacters(); toast(`You are now playing as ${mcEntry(pick).name}. You can switch again in 72 hours.`);
    };
  } });
}
function setMC(k, switching) {
  const old = S.player.mc && 'mc-' + S.player.mc;
  S.player.mc = k; if (switching) S.player.mcAt = Date.now();
  if (!S.owned['mc-' + k]) S.owned['mc-' + k] = 1;
  S.player.look = { ...MC_LOOK[k] }; player.look = S.player.look;
  if (old && old !== 'mc-' + k) {
    S.profile.showcase = S.profile.showcase.map(id => id && owns(id) ? id : null);
    if (S.wallpaper && !wpOk(S.wallpaper)) { S.wallpaper = null; applyWallpaper(); }
  }
  persist(); renderMenu();
}

/* loading screen after sign-in: a random wallpaper from the admin list, a progress bar and a tip */
const LOAD_TIPS = [
  'Every duplicate adds a star. At 3★ and 6★ some characters reveal new splash art.',
  'Losing the 50/50 on the limited banner guarantees the featured UR next time.',
  'Eggs hide around the plaza. Walk into one to catch it.',
  'Give gifts to raise bond. At bond level 10 you can propose with a ring.',
  'Spin the daily wheel for a 1% chance at a marriage ring.',
  'Tap your avatar to change your title, frame and namecard.',
  'Hide UI on the home screen to enjoy your wallpaper.'
];
function loadingArt() {
  const own = (S.loadArts || []).map(k => MEDIA.get(k)).filter(Boolean);
  if (own.length) return { src: rpick(own), fit: 'cover' };
  const arts = S.pool.filter(e => (e.type === 'character' || e.type === 'skin') && mediaArt(e)).map(mediaArt);   // fallback: uploaded character art
  return arts.length ? { src: rpick(arts), fit: 'contain' } : null;
}
function showLoading(done) {
  const art = loadingArt(), el = document.createElement('div');
  el.className = 'loading';
  el.innerHTML = `${art ? `${art.fit === 'contain' ? `<img class="cs-blur" src="${art.src}" alt="">` : ''}<img class="ld-img ${art.fit}" src="${art.src}" alt="">` : '<div class="tt-bg"><div class="wp-stars"></div><div class="tt-moon"></div></div>'}
    <div class="ld-shade"></div><div class="ld-logo">Blank: Project</div>
    <div class="ld-bottom"><p class="ld-tip"><b>Tip</b> ${esc(rpick(LOAD_TIPS))}</p>
      <div class="ld-row"><span class="ld-prism"></span><span class="ld-txt">Loading</span><span class="ld-pct">0%</span></div>
      <div class="ld-bar"><i></i></div></div>`;
  document.body.appendChild(el);
  const bar = el.querySelector('.ld-bar i'), pct = el.querySelector('.ld-pct'), t0 = performance.now(), dur = 2300 + Math.random() * 700;
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), v = Math.round((1 - Math.pow(1 - k, 2.2)) * 100);
    bar.style.width = v + '%'; pct.textContent = v + '%';
    if (k < 1) return requestAnimationFrame(step);
    el.querySelector('.ld-txt').textContent = 'Ready';
    setTimeout(() => { el.classList.add('out'); done && done(); setTimeout(() => el.remove(), 500); }, 250);
  };
  requestAnimationFrame(step);
}

/* new outfit popup: shown after buying a skin */
function showSkinGet(e, o = {}) {
  const owner = e.parent && findEntry(e.parent), skinName = o.sub || (owner ? e.name.replace(owner.name + ' · ', '') : e.name), art = mediaArt(e);
  const el = document.createElement('div'); el.className = `sg r${o.vow ? 6 : e.rarity} ${o.vow ? 'vow2' : ''}`;
  const words = (o.vow ? 'ETERNAL VOW · TILL THE LAST LANTERN · ' : 'NEW OUTFIT · EXQUISITE FASHION · ').repeat(4);
  el.innerHTML = `<div class="sg-bg"></div><div class="sg-band"></div>
    <div class="sg-words"><span>${words}</span><span>${words}</span></div>
    <div class="sg-streaks">${Array.from({ length: 7 }, (_, i) => `<i style="--i:${i};left:${8 + i * 14 + Math.random() * 6}%"></i>`).join('')}</div>
    <div class="sg-line"></div>
    <div class="sg-sparks">${Array.from({ length: 26 }, () => `<i style="left:${Math.random() * 100}%;animation-delay:${(-Math.random() * 3).toFixed(2)}s;animation-duration:${(2 + Math.random() * 2.5).toFixed(2)}s"></i>`).join('')}</div>
    <img class="sg-art ${art || artFrom(e.getArt) ? '' : 'chibi'}" src="${artFrom(e.getArt) || getSplash(e)}" alt="${esc(e.name)}">
    ${o.vow ? `<div class="sg-hearts">${Array.from({ length: 16 }, () => `<i style="left:${Math.random() * 100}%;animation-delay:${(-Math.random() * 4).toFixed(2)}s;font-size:${(14 + Math.random() * 18).toFixed(0)}px">♥</i>`).join('')}</div>` : ''}
    <div class="sg-name">${o.vow ? `<span class="sg-kick">${curIcon('rings')} Married</span>` : ''}<b>${esc(owner ? owner.name : e.name)}</b><i>${esc(skinName)} ${e.type === 'skin' ? rtag(e.rarity) : ''}</i></div>
    <div class="sg-bonus"><span class="sg-lbl">${o.vow ? 'Vow rewards' : 'Bonus reward'}</span><span class="row" style="gap:8px;align-items:center"><span class="sg-item r${e.rarity}" data-tip="${esc(`<b>Avatar: ${esc(e.name)}</b><span>Use this outfit's art as your profile avatar.</span>`)}">${thumbImg(e)}</span>${o.vow ? `${badgeHTML(BADGES.find(b => b.id === 'married'), true, 44)}${badgeHTML(BADGES.find(b => b.id === 'bond10'), true, 44)}` : ''}</span></div>
    <button class="sg-go" id="sgGo">Go use</button>
    <div class="sg-hint">Press empty area to close</div>
    <button class="sg-x" aria-label="Close">${icon('close')}</button>
    <button class="sg-share" aria-label="Share">${icon('send')}</button>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 350); };
  setTimeout(() => el.addEventListener('click', ev => { if (!ev.target.closest('button, .sg-item')) close(); }), 700);
  el.querySelector('.sg-x').onclick = close;
  el.querySelector('#sgGo').onclick = () => {
    S.wallpaper = e.id; if (e.type === 'skin' && e.parent && owns(e.parent)) S.equip[e.parent] = e.id;
    persist(); applyWallpaper(); renderMenu(); refreshCharacters(); close();
    toast(e.type === 'skin' ? `${e.name} is equipped and set as your wallpaper.` : `${e.name} is now your wallpaper.`);
  };
  el.querySelector('.sg-share').onclick = () => {
    const text = o.vow ? `I married ${owner ? owner.name : e.name} in Blank: Project!` : `I just got ${e.name} in Blank: Project!`;
    try { navigator.clipboard.writeText(text).then(() => toast('Copied to share.'), () => toast(text)); } catch (err) { toast(text); }
  };
}
/* login: only guest for now; email and store sign-in come with the server */
function openSignIn(fromSettings) {
  const on = Backend.on;
  openModal({ title: 'Sign in', ic: 'chars', body: `<div class="stack">
    <p class="desc">${on ? 'Sign in to keep your progress safe and play on any device.' : 'Choose how to play. Your progress is saved in this browser.'}</p>
    ${fromSettings ? '' : `<button class="btn ${on ? 'ghost' : 'gold'} signin" id="siGuest">${icon('chars')}Play as guest</button>`}
    ${on ? `<form class="form si-email" id="siForm">
        <label class="field"><span>Email</span><input class="input" id="siMail" type="email" autocomplete="email" required></label>
        <label class="field"><span>Password</span><input class="input" id="siPass" type="password" autocomplete="current-password" minlength="6" required></label>
        <div class="row"><button class="btn gold" type="submit" data-mode="in">${icon('mail')}Sign in</button><button class="btn ghost" type="submit" data-mode="up">Create account</button></div>
        <span class="err" id="siErr" hidden></span></form>
      <button class="btn ghost signin" id="siGoogle">${icon('sparkle')}Sign in with Google</button>`
      : `<button class="btn ghost signin" disabled>${icon('mail')}Sign in with email<span class="soon">Soon</span></button>
      <button class="btn ghost signin" disabled>${icon('sparkle')}Sign in with Google<span class="soon">Soon</span></button>`}
    <button class="btn ghost signin" disabled>${icon('sparkle')}Sign in with Apple<span class="soon">Soon</span></button>
    <p class="tiny">${on ? 'Guest progress stays in this browser. Signing in to a new account later keeps it; signing in to an existing account loads that account instead.' : "Guest progress can't move between devices yet. Accounts arrive when the server is connected."}</p></div>`,
    onMount: () => {
      const g = $('#siGuest'); if (g) g.onclick = () => { S.account = { type: 'guest', since: S.account?.since || Date.now() }; persist(); renderTitle(); enterGame(); toast(`Welcome, ${S.player.name}!`); };
      const f = $('#siForm'); if (!f) return;
      let mode = 'in';
      f.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; });
      f.onsubmit = async e => {
        e.preventDefault();
        const err = $('#siErr'); err.hidden = true;
        f.querySelectorAll('button').forEach(b => b.disabled = true);
        const r = await cloudEmail(mode, $('#siMail').value.trim(), $('#siPass').value);
        f.querySelectorAll('button').forEach(b => b.disabled = false);
        if (r === 'confirm') { err.hidden = false; err.textContent = 'Account created. Check your email to confirm it, then sign in.'; }
        else if (r) { err.hidden = false; err.textContent = r; }
      };
      $('#siGoogle').onclick = cloudGoogle;
    } });
}
titleEl.addEventListener('click', e => {
  if (e.target.closest('button, a, .tt-side')) return;
  if (S.account) enterGame(); else openSignIn();
});
$('#ttStart').onclick = () => { if (S.account) enterGame(); else openSignIn(); };
$('#ttNews').onclick = openNews;
$('#ttSupport').onclick = openSupport;
$('#ttTerms').onclick = () => openModal({ title: 'Terms & privacy', ic: 'info', body: `<div class="stack"><p class="desc">Blank: Project is in development. ${Backend.on ? 'Signed-in progress is saved on our server; guest progress stays in this browser.' : 'Your progress, art and settings are stored only in this browser. Nothing is sent to a server.'}</p>
  <p class="desc">Summon rates are listed on every banner's Rates page. Paid currency isn't sold yet.</p><p class="tiny">Full terms of service and a privacy policy will be published before launch.</p></div>` });
$('#ttRepair').onclick = () => openModal({ title: 'Repair', ic: 'wrench', small: true, body: `<div class="stack"><p class="desc">Something looks wrong? Repair reloads the game and its images. Your progress is kept.</p>
  <div class="row" style="justify-content:flex-end"><button class="btn ghost" data-close>Cancel</button><button class="btn mint" id="rpGo">Repair and reload</button></div></div>`,
  onMount: () => { $('#rpGo').onclick = () => { persist(); location.reload(); }; modalEl.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal); } });
function openNews() {
  const items = (S.titleNews || DEFAULT_NEWS).split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0]);
  openModal({ title: 'Notice', ic: 'mail', wide: true, body: `<div class="mail">${items.map(([t, b]) => `<div class="mail-row"><div style="min-width:0"><div class="meta">Plaza Team</div><h4>${esc(t)}</h4>${b ? `<p>${esc(b)}</p>` : ''}</div></div>`).join('')}</div>` });
}
/* customer service: FAQ and a contact form; messages are kept locally until a support server exists */
function openSupport() {
  const faq = [
    ['I lost my progress', 'Progress is saved in this browser. Clearing site data or switching browsers starts a new game. Use the same browser to keep playing.'],
    ['How do pity and the 50/50 work?', 'Open a banner and tap Rates. A UR is guaranteed by pull 50, and losing the 50/50 on the limited banner guarantees the featured UR next time.'],
    ['How do I get pets?', 'Catch eggs in the plaza or combine 10 egg fragments from summons, then hatch them in the Pets screen.'],
    ['A purchase or reward is missing', 'Check your Mail first. If it is still missing, send us a message below with your UID.']
  ];
  openModal({ title: 'Customer service', ic: 'chat', wide: true, body: `<div class="stack">
    <div><h3 style="margin-bottom:8px">Frequently asked</h3>${faq.map(([q, a]) => `<details class="faq"><summary>${esc(q)}</summary><p class="desc">${esc(a)}</p></details>`).join('')}</div>
    <form class="form" id="csForm"><h3>Contact us</h3>
      <label class="field"><span>Topic</span><select class="input" id="csTopic"><option>Account and login</option><option>Summons and rewards</option><option>Bug report</option><option>Suggestion</option><option>Other</option></select></label>
      <label class="field"><span>Message</span><textarea class="input" id="csMsg" maxlength="600" placeholder="Tell us what happened"></textarea></label>
      <div class="row" style="justify-content:space-between"><span class="tiny">UID ${S.profile.uid} is attached to your message.</span><button class="btn mint" type="submit">Send</button></div>
      ${S.support.length ? `<p class="tiny">${S.support.length} message${S.support.length === 1 ? '' : 's'} waiting to be delivered.</p>` : ''}
    </form></div>`, onMount: () => {
    $('#csForm').onsubmit = async e => {
      e.preventDefault();
      const msg = $('#csMsg').value.trim(); if (!msg) { $('#csMsg').focus(); return; }
      if (await sendSupport($('#csTopic').value, msg)) { closeModal(); toast('Message sent. Thank you!'); return; }
      S.support.push({ topic: $('#csTopic').value, msg, t: Date.now() }); persist(); closeModal();
      toast('Message saved. It will be delivered when customer service goes online.');
    };
  } });
}
