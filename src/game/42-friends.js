/* ---------- Friends (Menu → Friends → openFriends(tab)), styled after the owner's reference ----------
   Tabs (round icons, FR_TABS): Friends (list), Search (by player ID or name), Requests (received + sent), Find players
   (random suggestions with Refresh). Up to FR_MAX friends. There is no friends server yet: the other players are the
   game's practice players (the Ranking's 30 + the practice guilds' members, frPool), each with a seeded profile
   (frProfile: avatar art, frame, title, namecard, status, last online, owned characters with CS, showcase of their 5 best,
   stats, guild). A request you send is accepted a minute later (FR_ACCEPT_MS); 2 practice players send you a request
   every day. Tapping a player's avatar opens their profile (openFrProfile) with stats and showcased characters.
   State S.friends {list: [uid], sent: [{uid, t}], recv: {day, list: [uid], done: [uid]}, seed} (player save). */
const FR_MAX = 100, FR_ACCEPT_MS = 60e3;
const FR_TABS = [['list', 'friends', 'Friends'], ['search', 'plus', 'Search by ID'], ['req', 'mail', 'Requests'], ['find', 'sparkle', 'Find players']];
const FR_STATUS = ['Collecting every UR!', 'gg', 'Looking for guild mates', 'Pity at 49, send help', 'Daily login streak 100+', 'Fashion first, stats second', 'Hi :)', 'Max bond or bust', 'Raid buddy wanted', 'Your friend hasn\'t written anything yet.', 'Moonlit Garden farmer', 'SSS or nothing'];
function frState() {
  if (!S.friends || typeof S.friends !== 'object') S.friends = {};
  const f = S.friends; f.list = f.list || []; f.sent = f.sent || []; f.seed = f.seed || 1;
  if (!f.recv || f.recv.day !== dayKey()) f.recv = { day: dayKey(), list: [], done: [] };
  // sent requests are accepted after a minute
  const now = Date.now(), ok = f.sent.filter(s => now - s.t >= FR_ACCEPT_MS);
  if (ok.length) { ok.forEach(s => { if (!f.list.includes(s.uid) && f.list.length < FR_MAX) f.list.push(s.uid); }); f.sent = f.sent.filter(s => now - s.t < FR_ACCEPT_MS); setTimeout(() => { persist(); toast(`${ok.map(s => (frByUid(s.uid) || {}).name).filter(Boolean).join(', ')} accepted your friend request.`); }, 0); }
  return f;
}
/* every practice player once, by UID */
let frPoolCache = null;
function frPool() {
  if (frPoolCache && frPoolCache.n === S.pool.length) return frPoolCache.list;
  const seen = new Set(), list = [];
  (typeof rankBots === 'function' ? rankBots() : []).forEach(b => { seen.add(b.name); list.push({ name: b.name, uid: b.uid, lv: b.lv, total: b.total, skill: b.skill, ach: b.ach, vip: b.vip, cs: b.cs }); });
  (typeof practiceGuilds === 'function' ? practiceGuilds() : []).forEach(g => g.members.forEach(m => { if (seen.has(m.name) || m.me) return; seen.add(m.name); list.push({ name: m.name, uid: m.uid, lv: m.lv, total: m.total, skill: clamp((m.total - 3000) / 240000, 0, 1) }); }));
  frPoolCache = { n: S.pool.length, list };
  return list;
}
const frByUid = uid => frPool().find(p => p.uid === uid);
const frIsFriend = uid => frState().list.includes(uid);
const frSent = uid => frState().sent.some(s => s.uid === uid);
/* a practice player's full profile (seeded, never changes) */
const frProfCache = {};
function frProfile(p) {
  if (frProfCache[p.uid]) return frProfCache[p.uid];
  const r = seeded('frp:' + p.name), chars = S.pool.filter(e => e.type === 'character' && !e.mc);
  const cs = p.cs || Object.fromEntries(chars.map(c => [c.id, botCharCS({ name: p.name, skill: p.skill }, c)]).filter(([, n]) => n));
  const owned = Object.entries(cs).map(([id, n]) => ({ e: findEntry(id), cs: n })).filter(x => x.e).sort((a, b) => b.cs - a.cs);
  const mems = S.memories || [];
  const show = owned.slice(0, 5).map(x => ({ ...x, st: Math.min(6, Math.floor(r() * 7 * (.4 + p.skill * .8))), mem: mems.length && r() < .9 ? { m: mems[Math.floor(r() * mems.length)], st: Math.min(3, Math.floor(r() * 4 * (.3 + p.skill))) } : null }));   // each showcased character's equipped memory
  const titles = TITLES.filter(t => !t.rank && !t.vip && t.id !== 'maxwinner'), cards = CARDS.filter(k => !String(k.id).startsWith('rk-') && !k.vip);
  const fav = show[0] && show[0].e, artCard = fav && baseArt(fav) && r() < .45;
  const mins = Math.floor(Math.pow(r(), 2) * 60 * 72);
  const guild = typeof botGuild === 'function' ? botGuild(p.name) : null;
  return frProfCache[p.uid] = {
    ...p, owned, show, avatar: fav ? wpParse(fav.id) : null, frame: ['simple', 'gold', 'prism', 'crown'][Math.floor(Math.pow(r(), 1.5) * 4)],
    title: titles[Math.floor(r() * titles.length)], card: artCard ? { cls: 'nc-char', img: baseSplash(fav), art: true } : { cls: (k => k.cls || 'nc-' + k.id)(cards[Math.floor(r() * cards.length)]) },
    status: FR_STATUS[Math.floor(r() * FR_STATUS.length)], mins, pets: Math.floor(r() * 6), ach: p.ach ?? Math.floor(r() * ACH.length),
    urs: owned.filter(x => +x.e.rarity === 5).length + Math.floor(r() * 4), guild, vip: p.vip ?? 0,
    days: p.days ?? Math.max(3, Math.round((p.lv || 10) * (2.5 + r() * 4)))   // drawn last so the values above stay the same
  };
}
const frSeen = m => m < 5 ? 'Online' : m < 60 ? `${m}min ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
const frAvatar = (fp, size) => avatarHTML(size, fp.avatar, fp.frame);

function frRequest(uid) {
  const f = frState(), p = frByUid(uid); if (!p || frIsFriend(uid) || frSent(uid)) return;
  if (f.list.length >= FR_MAX) { toast(`Your friend list is full (${FR_MAX}).`); return; }
  f.sent.push({ uid, t: Date.now() }); persist(); renderFriends(); toast(`Friend request sent to ${p.name}.`);
}
function frRecvList() {
  const f = frState();
  if (!f.recv.list.length && !f.recv.filled) {   // 2 practice players send you a request every day
    const r = seeded('frrecv:' + dayKey() + ':' + S.profile.uid), pool = frPool().filter(p => !f.list.includes(p.uid));
    for (let i = 0; i < 2 && pool.length; i++) f.recv.list.push(pool.splice(Math.floor(r() * pool.length), 1)[0].uid);
    f.recv.filled = true;
  }
  return f.recv.list.filter(uid => !f.recv.done.includes(uid) && !f.list.includes(uid));
}
function frAnswer(uid, yes) {
  const f = frState(), p = frByUid(uid); f.recv.done.push(uid);
  if (yes) { if (f.list.length >= FR_MAX) { toast(`Your friend list is full (${FR_MAX}).`); return; } f.list.push(uid); toast(`You and ${p ? p.name : 'them'} are now friends.`); }
  persist(); renderMenu(); renderFriends();
}
function frRemove(uid) { const f = frState(); f.list = f.list.filter(x => x !== uid); persist(); renderFriends(); const p = frByUid(uid); toast(`${p ? p.name : 'They'} removed from your friends.`); }
const frReady = () => frRecvList().length > 0;

/* ---------- the Friends window ---------- */
let frTab = 'list', frQuery = '';
function openFriends(tab) { if (tab) frTab = tab; frState(); openModal({ title: 'Friends', ic: 'friends', wide: true, kind: 'friends', body: '<div id="frRoot"></div>', onMount: renderFriends }); }
function frRow(fp, actions) {
  return `<div class="fr-row"><span class="fr-bg">${cardLayer(fp.card)}</span>
    <button class="fr-av" data-frp="${fp.uid}" aria-label="View ${esc(fp.name)}'s profile">${frAvatar(fp, 70)}<b class="fr-lv">${fp.lv}</b></button>
    <span class="fr-who"><span class="fr-nm"><b>${esc(fp.name)}</b>${titleHTML(fp.title)}${fp.guild ? `<span class="fr-gd" title="${esc(fp.guild.name)}">${guildIcon(fp.guild.icon, 20)}</span>` : ''}</span>
      <span class="fr-sub"><span class="fr-on ${fp.mins < 5 ? 'on' : ''}"><i></i>${frSeen(fp.mins)}</span><span class="fr-st">${icon('chat')}${esc(fp.status)}</span></span></span>
    <span class="fr-act">${actions}</span></div>`;
}
function renderFriends() {
  const root = $('#frRoot'); if (!root) return;
  const f = frState(), recv = frRecvList();
  const tabs = `<div class="fr-tabs">${FR_TABS.map(([k, ic, l]) => `<button class="fr-tab ${frTab === k ? 'on' : ''}" data-frt="${k}" aria-label="${l}" title="${l}">${icon(ic)}${k === 'req' && recv.length ? `<span class="dot-n"></span>` : ''}</button>`).join('')}</div>`;
  const view = uid => `<button class="fr-btn" data-frp="${uid}" aria-label="Profile">${icon('chars')}</button>`;
  const addBtn = p => frIsFriend(p.uid) ? '<span class="fr-tag">Friends</span>' : frSent(p.uid) ? '<span class="fr-tag">Request sent</span>' : `<button class="btn gold sm" data-fradd="${p.uid}">${icon('plus')}Add</button>`;
  let body = '';
  if (frTab === 'list') {
    const list = f.list.map(frByUid).filter(Boolean).map(frProfile).sort((a, b) => a.mins - b.mins);
    body = list.length ? list.map(fp => frRow(fp, view(fp.uid))).join('') : `<div class="fr-empty">${icon('friends')}<b>No friends yet</b><span class="tiny">Search for a player ID, accept a request or find players to add.</span><button class="btn gold" data-frt="find">Find players</button></div>`;
  } else if (frTab === 'search') {
    const q = frQuery.trim(), hits = q ? frPool().filter(p => String(p.uid) === q || p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 10) : [];
    body = `<div class="fr-search"><input class="input" id="frQ" inputmode="search" placeholder="Player ID (6 digits) or name" value="${esc(frQuery)}" maxlength="20"><button class="btn gold" id="frGo">${icon('search')}Search</button></div>
      ${q ? (hits.length ? hits.map(p => { const fp = frProfile(p); return frRow(fp, view(fp.uid) + addBtn(p)); }).join('') : `<div class="fr-empty"><b>No player found</b><span class="tiny">Check the ID and try again. Your own ID is ${S.profile.uid}.</span></div>`) : '<p class="tiny fr-hint">Type a player ID (shown at the bottom of their profile and in the Ranking) or part of a name.</p>'}`;
  } else if (frTab === 'req') {
    const rl = recv.map(frByUid).filter(Boolean).map(frProfile), sl = f.sent.map(s => frByUid(s.uid)).filter(Boolean).map(frProfile);
    body = `<div class="fr-h">Received <span>${rl.length}</span></div>${rl.length ? rl.map(fp => frRow(fp, `${view(fp.uid)}<button class="btn gold sm" data-frans="${fp.uid}|1">Accept</button><button class="btn ghost sm" data-frans="${fp.uid}|0">Decline</button>`)).join('') : '<p class="tiny fr-hint">No new requests. New players may send you one tomorrow.</p>'}
      <div class="fr-h">Sent <span>${sl.length}</span></div>${sl.length ? sl.map(fp => frRow(fp, `${view(fp.uid)}<span class="fr-tag">Waiting…</span>`)).join('') : '<p class="tiny fr-hint">Requests you send show here until they are answered.</p>'}`;
  } else {
    const r = seeded('frfind:' + f.seed), pool = frPool().filter(p => !f.list.includes(p.uid)), picks = [];
    while (picks.length < 8 && pool.length) picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    body = `<div class="fr-findh"><span class="tiny">Players you might like to play with</span><button class="btn ghost sm" id="frRefresh">${icon('refresh')}Refresh</button></div>${picks.map(p => { const fp = frProfile(p); return frRow(fp, view(fp.uid) + addBtn(p)); }).join('')}`;
  }
  root.innerHTML = `<div class="fr">${tabs}<div class="fr-list">${body}</div>
    <div class="fr-foot"><span class="fr-count">My Friends <b>${f.list.length} / ${FR_MAX}</b></span><span class="fr-id">Your ID: <b>${S.profile.uid}</b></span><button class="btn ghost fr-addf" data-frt="search">${icon('plus')}Add Friend</button></div></div>`;
  root.querySelectorAll('[data-frt]').forEach(b => b.onclick = () => { frTab = b.dataset.frt; renderFriends(); });
  root.querySelectorAll('[data-frp]').forEach(b => b.onclick = () => openFrProfile(+b.dataset.frp));
  root.querySelectorAll('[data-fradd]').forEach(b => b.onclick = () => frRequest(+b.dataset.fradd));
  root.querySelectorAll('[data-frans]').forEach(b => b.onclick = () => { const [u, y] = b.dataset.frans.split('|'); frAnswer(+u, y === '1'); });
  const q = $('#frQ'); if (q) { const go = () => { frQuery = q.value; renderFriends(); const n = $('#frQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }; $('#frGo').onclick = go; q.onkeydown = e => { if (e.key === 'Enter') go(); }; if (frTab === 'search' && !frQuery) setTimeout(() => q.focus(), 50); }
  const rf = $('#frRefresh'); if (rf) rf.onclick = () => { f.seed++; persist(); renderFriends(); };
}

/* a player's profile: namecard, avatar, name, title, guild, stats and their 5 showcased characters */
function openFrProfile(uid) {
  const p = frByUid(uid); if (!p) return;
  const fp = frProfile(p), friend = frIsFriend(uid);
  const old = document.querySelector('.frpop'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'rdrop frpop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', fp.name + "'s profile");
  const slots = [0, 1, 2, 3].map(i => { const x = fp.show[i]; if (!x) return '<div class="pf-col"><span class="pf-slot none"><span class="pf-add"><span>Empty</span></span></span></div>';
    const mm = x.mem && x.mem.m, mart = mm && artFrom(mm.img);
    const memPrev = mm ? `<span class="pf-mem mem-fr mst${x.mem.st}" data-memview="${esc(mm.id)}|${x.mem.st}" title="${esc(mm.name)} · hold to view">${mart ? `<img src="${mart}" alt="">` : icon('memory')}<span class="pf-mem-tag">${rtag(mm.rarity)}${memStarRow(x.mem.st)}</span></span>` : '<span class="pf-mem none"><span class="tiny">No memory</span></span>';
    return `<div class="pf-col"><span class="pf-slot r${x.e.rarity}"><img src="${baseCard(x.e)}" alt="" ${baseArt(x.e) ? `style="${cardImgStyle(x.e, 'base')}"` : ''}><span class="pf-cs">${gradeTag(csGrade(x.cs), 'sm')}</span><span class="pf-sl">${rtag(x.e.rarity)}<b>${esc(x.e.name)}</b>${starRow(x.st)}</span></span>${memPrev}<span class="frp-cs">${fmt(x.cs)} CS</span></div>`; }).join('');
  el.innerHTML = `<div class="rdrop-box frp-box">
      <button class="inv-x frp-x" data-frx aria-label="Close">${icon('close')}</button>
      <div class="pf-card frp-card">${cardLayer(fp.card)}${arPlaqueHTML(arVpOf(fp.name), true)}
        <div class="pf-me">${frAvatar(fp, 104)}
          <div class="pf-who"><span class="pf-lvrow">${fp.vip ? vipBadge(fp.vip) : ''}<span class="lbl-sm ts" style="color:#fff">Lv ${fp.lv} · UID ${fp.uid}</span></span><span class="pf-namerow"><b class="ts">${esc(fp.name)}</b></span>${titleHTML(fp.title)}
            ${fp.guild ? `<span class="pf-guild">${guildIcon(fp.guild.icon, 24)}<b>${esc(fp.guild.name)}</b></span>` : ''}</div></div></div>
      <div class="frp-status"><span class="fr-on ${fp.mins < 5 ? 'on' : ''}"><i></i>${frSeen(fp.mins)}</span><span>${icon('chat')}${esc(fp.status)}</span></div>
      <div class="pf-stats frp-stats">
        <div><b>${fp.owned.length}</b><span>Characters</span></div><div><b>${fp.pets}</b><span>Pets</span></div><div><b>${fp.ach}/${ACH.length}</b><span>Achievements</span></div>
        <div><b>${fp.urs}</b><span data-norw>URs owned</span></div><div><b>${fmt(fp.days)}</b><span>Days logged in</span></div><div class="tcs"><b>${fmt(fp.total)}</b><span>Total CS</span></div></div>
      <div class="frp-sh"><b>Showcase</b><span class="tiny">Their best characters</span></div>
      <div class="pf-show frp-show">${slots}</div>
      <div class="row" style="justify-content:center;gap:10px">${friend ? `<button class="btn danger sm" data-frrm>Remove friend</button>` : frSent(uid) ? '<span class="fr-tag">Request sent</span>' : `<button class="btn gold" data-fradd2>${icon('plus')}Add friend</button>`}<button class="btn ghost" data-frx>Close</button></div>
    </div>`;
  const close = () => el.remove();
  el.querySelectorAll('[data-frx]').forEach(b => b.onclick = close);
  el.addEventListener('click', e => { if (e.target === el) close(); });
  const rm = el.querySelector('[data-frrm]'); if (rm) rm.onclick = () => { if (rm.dataset.sure) { frRemove(uid); close(); } else { rm.dataset.sure = 1; rm.textContent = 'Tap again to remove'; } };
  const ad = el.querySelector('[data-fradd2]'); if (ad) ad.onclick = () => { frRequest(uid); close(); };
  document.body.appendChild(el);
}
ICONS.chat = ICONS.chat || '<path d="M4 5h16v11H9l-5 4z"/>';
ICONS.search = ICONS.search || '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>';
ICONS.refresh = ICONS.refresh || '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>';
