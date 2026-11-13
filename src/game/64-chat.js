/* ---------- Chat (the home world-chat ticker, or Menu → Chat → openChat(tab)) ----------
   A glass drawer with three channels: World (everyone), Guild (your guild's members) and Friends (one conversation per
   friend). There is no chat server yet, so the other people are the practice players (frPool: the Ranking's 30 + the
   practice guilds' members). Their messages come from a seeded stream (chatStream): every CHAT_SLOT ms a time slot may
   hold one message, picked from the slot number and the channel, so the history is the same after a reload and nothing
   needs saving; a new one turns up every few seconds. Your own messages, and the replies they get (chatReplyLater), are
   kept in S.chat {world: [], guild: {guildId: []}, dm: {uid: []}, seen: {world|guild|dm:<uid>: time}} (player save,
   CHAT_KEEP per channel). Friends answer every message you send them; guild mates and world players sometimes do.
   With the server connected, World messages also go over the plaza's realtime channel (event 'wchat', 18-net.js), and
   the practice players stay out of World (real players only); ?mp=local tests that between two tabs. */
const CHAT_SLOT = { world: 9e3, guild: 26e3 }, CHAT_P = { world: .62, guild: .5 }, CHAT_SHOW = 60, CHAT_KEEP = 80, CHAT_MAX = 120, CHAT_GAP = 1200;
const CHAT_TABS = [['world', 'compass', 'World'], ['guild', 'guild', 'Guild'], ['friends', 'friends', 'Friends']];
const CHAT_QUICK = ['Hi!', 'gg', 'Thanks!', 'lol', 'Good luck!', '👍'];
const CHAT_WORLD = ['anyone trading?', 'just pulled a UR!!', 'gg', 'when does the next event start?', 'hi :)', 'lol', 'pity at 46, send help', 'nice skin!', 'brb', 'is the forest gate still closed?',
  'which deck is best for the Great Tree?', 'Rush deck carries the campaign tbh', 'Arena Gold finally', 'who else is saving for the Limited?', 'the Mystery Fountain outfit is so pretty',
  'raid buddy anyone?', 'how do I get UR memories?', 'Step-Up step 7 = guaranteed rate up, worth it', 'my guild needs 2 more members, DM me', 'Expert quick match is no joke',
  'auto play won me 5 in a row', 'just hit bond 10 :3', 'the scratch card gave me 10 pearls!', 'anyone know the Abyssal Tide drop rate?', 'good morning everyone',
  'Moonlit Garden is the best raid for Moonlit Bloom', 'Sacred Ground + healers = forever match', 'what grade is your best character?', 'SSS awakening finally done', 'who is your main?',
  'Frost Peaks 2-10 is so hard', 'free spin gave me a ring!!', 'I love the new wallpapers', 'Blood Moon events hit hard', 'getting the Pearl Honor pass this season', 'wish me luck on the 10 pull'];
const CHAT_GUILD = ['morning guild!', 'who is fighting the dragon today?', 'boss is getting low, let\'s finish it', 'thanks for accepting me!', 'did everyone do the guild quests?', 'guild shop has a UR memory ticket today',
  'I used both boss battles already', 'gg on the dragon everyone', 'anyone want to do hangout games?', 'our guild level is going up fast', 'remember the daily reward', 'hi hi', 'nice job on the boss',
  'I can teach the Rush deck if anyone wants', 'what deck do you use for the boss?', 'only 3 more quests', 'see you tomorrow!', 'welcome new members ^^'];
const CHAT_DM = ['hey! :)', 'haha nice', 'gg!', 'thanks for the add!', 'did you try the new raid?', 'I\'m saving pearls for the Limited', 'want to compare decks?', 'good luck on your pulls!',
  'I just cleared the Great Tree floor 6', 'which character is your favourite?', 'see you around!', 'that\'s so cool', 'lol same', 'I\'ll be on later tonight'];
const CHAT_BAD = /\b(fuck|shit|bitch|cunt|nigg\w*|fag\w*|retard\w*)\b/gi;   // a tiny filter for your own messages until the server has moderation

function chatState() {
  if (!S.chat || typeof S.chat !== 'object') S.chat = {};
  const c = S.chat; c.world = Array.isArray(c.world) ? c.world : []; c.guild = c.guild && typeof c.guild === 'object' ? c.guild : {}; c.dm = c.dm && typeof c.dm === 'object' ? c.dm : {}; c.seen = c.seen || {};
  return c;
}
const chatTrim = L => { if (L.length > CHAT_KEEP) L.splice(0, L.length - CHAT_KEEP); return L; };
const chatClean = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX).replace(CHAT_BAD, w => '*'.repeat(w.length));
/* World shows the practice players unless real players are connected through the server */
const chatBots = () => !(typeof net !== 'undefined' && net && net.cloud);
/* the seeded stream: one possible message per time slot; `n` newest messages up to now */
function chatStream(ch, n, gid) {
  if (ch === 'world' && !chatBots()) return [];
  const g = ch === 'guild' ? myGuild() : null; if (ch === 'guild' && !g) return [];
  const mates = g ? g.members.filter(m => !m.me) : null, pool = ch === 'world' ? frPool() : mates;
  if (!pool || !pool.length) return [];
  const slot = CHAT_SLOT[ch], now = Date.now(), k0 = Math.floor(now / slot), out = [];
  for (let k = k0; k > k0 - 600 && out.length < n; k--) {
    const r = seeded(`chat:${ch}:${gid || ''}:${k}`); if (r() > CHAT_P[ch]) continue;
    const t = k * slot + Math.floor(r() * slot * .9); if (t > now) continue;
    const p = pool[Math.floor(r() * pool.length)], sys = r() < (ch === 'world' ? .1 : .18);
    out.push({ t, uid: p.uid, name: p.name, sys, x: sys ? chatSysLine(ch, r, p, g) : chatLine(ch, r, pool, p) });
  }
  return out.reverse();
}
function chatLine(ch, r, pool, p) {
  const L = ch === 'world' ? CHAT_WORLD : CHAT_GUILD, x = L[Math.floor(r() * L.length)];
  if (r() < .12) { const o = pool[Math.floor(r() * pool.length)]; if (o && o.uid !== p.uid) return `@${o.name} ${['gg', 'same here', 'nice!', 'lol', 'congrats!!', 'good luck'][Math.floor(r() * 6)]}`; }
  return x;
}
function chatSysLine(ch, r, p, g) {
  const urs = S.pool.filter(e => e.type === 'character' && +e.rarity === 5 && !e.mc), ur = urs.length ? urs[Math.floor(r() * urs.length)].name : 'a UR character';
  if (ch === 'guild') return [`${p.name} claimed the daily guild reward`, `${p.name} dealt ${12 + Math.floor(r() * 50)} damage to the ${(S.gboss && S.gboss.name) || 'Elder Dragon'}`, `${p.name} finished every guild quest today`, `${p.name} won ${['Lantern Pairs', 'Pearl Shells', 'Star Catch'][Math.floor(r() * 3)]} in the Hangout`][Math.floor(r() * 4)];
  return [`${p.name} pulled ${ur} on the ${['Limited', 'Weekly', 'Pearl'][Math.floor(r() * 3)]} Banner!`, `${p.name} reached ${['Gold', 'Platinum', 'Diamond', 'Mythic'][Math.floor(r() * 4)]} in the Arena`, `${p.name} cleared floor ${3 + Math.floor(r() * 8)} of the Great Tree`, `${p.name} awakened a character to SSS`][Math.floor(r() * 4)];
}
/* everything a channel shows, oldest first: the stream plus what was said here (yours, replies, real players) */
function chatMessages(ch, uid) {
  const c = chatState();
  if (ch === 'dm') return (c.dm[uid] || []).slice(-CHAT_SHOW);
  const g = ch === 'guild' ? myGuild() : null; if (ch === 'guild' && !g) return [];
  const own = ch === 'world' ? c.world : (c.guild[g.id] || []);
  return [...chatStream(ch, CHAT_SHOW, g && g.id), ...own].sort((a, b) => a.t - b.t).slice(-CHAT_SHOW);
}
const chatAgo = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 45 ? 'now' : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`; };
/* unread: guild messages and friend replies since you last looked (World is never "unread") */
function chatUnread(ch, uid) {
  const c = chatState();
  if (ch === 'guild') { const seen = Math.max(c.seen.guild || 0, guildState().joined || 0, Date.now() - 2 * 36e5); return inGuild() ? chatMessages('guild').filter(m => !m.me && m.t > seen).length : 0; }   // only since you last looked, joined, or the last 2 hours
  if (ch === 'dm') { const seen = c.seen['dm:' + uid] || 0; return (c.dm[uid] || []).filter(m => !m.me && m.t > seen).length; }
  if (ch === 'friends') return frState().list.reduce((t, u) => t + chatUnread('dm', u), 0);
  return 0;
}
const chatAnyUnread = () => chatUnread('friends') > 0;   // the home ticker's dot: a friend wrote back

/* ---------- sending ---------- */
let chatLastSend = 0;
function chatSend(text) {
  const x = chatClean(text); if (!x) return false;
  if (Date.now() - chatLastSend < CHAT_GAP) { toast('Slow down a little.'); return false; }
  chatLastSend = Date.now();
  const c = chatState(), m = { t: Date.now(), me: 1, x };
  if (chatTab === 'world') { c.world.push(m); chatTrim(c.world); if (typeof net !== 'undefined' && net) net.send('wchat', { id: NET_ID, name: S.player.name, uid: S.profile.uid, lv: playerLv().lv, vip: vipLv(), av: S.profile.avatar || null, fr: frameOf().id, bub: bubbleOf().id, x }); if (chatBots() && Math.random() < .45) chatReplyLater('world', x); }
  else if (chatTab === 'guild') { const g = myGuild(); if (!g) return false; (c.guild[g.id] = c.guild[g.id] || []).push(m); chatTrim(c.guild[g.id]); if (Math.random() < .7) chatReplyLater('guild', x, g.id); }
  else if (chatTab === 'friends' && chatPeer) { (c.dm[chatPeer] = c.dm[chatPeer] || []).push(m); chatTrim(c.dm[chatPeer]); chatReplyLater('dm', x, chatPeer); }
  persist(); return true;
}
/* someone answers a few seconds later (kept in the save, so it stays after a reload) */
function chatReplyLater(ch, said, key) {
  const low = said.toLowerCase(), me = S.player.name;
  const pickTxt = L => L[Math.floor(Math.random() * L.length)];
  const ctx = /\b(hi|hey|hello|morning|yo)\b/.test(low) ? [`hey ${me}!`, 'hi hi', 'hello :)'] : /\bgg\b/.test(low) ? ['gg!', 'gg wp'] : /\bur\b|pulled|pull/.test(low) ? ['congrats!!', 'so lucky', 'nice pull!'] : /\?/.test(said) ? ['not sure, check the (i) on that page', 'I think so?', 'good question', 'ask in the guild maybe'] : /thank/.test(low) ? ['np!', 'anytime :)'] : null;
  setTimeout(() => {
    const c = chatState(); let who, list;
    if (ch === 'world') { const P = frPool(); who = P[Math.floor(Math.random() * P.length)]; list = c.world; }
    else if (ch === 'guild') { const g = myGuild(); if (!g || g.id !== key) return; const M = g.members.filter(m => !m.me); if (!M.length) return; who = M[Math.floor(Math.random() * M.length)]; list = c.guild[key] = c.guild[key] || []; }
    else { who = frByUid(key); if (!who || !frIsFriend(key)) return; list = c.dm[key] = c.dm[key] || []; }
    const x = ch === 'dm' ? pickTxt(ctx || CHAT_DM) : `@${me} ${pickTxt(ctx || ['lol', 'same', 'true', 'haha', 'nice'])}`;
    list.push({ t: Date.now(), uid: who.uid, name: who.name, x }); chatTrim(list); persist();
    if (chatEl) chatRender(); else safely(renderChatDot, 'chat dot');
  }, (ch === 'dm' ? 1800 : 2500) + Math.random() * 3500);
}
/* a real player's World message (server or ?mp=local, from 18-net.js) */
function chatRecv(p) {
  if (!p || typeof p.x !== 'string') return;
  const c = chatState();
  c.world.push({ t: Date.now(), real: 1, uid: +p.uid || 0, name: String(p.name || 'Traveler').slice(0, 16), lv: +p.lv || 1, vip: clamp(+p.vip || 0, 0, 12), av: typeof p.av === 'string' ? p.av.slice(0, 80) : null, fr: typeof p.fr === 'string' ? p.fr.slice(0, 30) : null, bub: typeof p.bub === 'string' ? p.bub.slice(0, 20) : null, x: chatClean(p.x) });
  chatTrim(c.world);
  if (chatEl && chatTab === 'world') chatRender(); else safely(tickWorld, 'ticker');
}

/* ---------- the drawer ---------- */
let chatEl = null, chatTab = 'world', chatPeer = null, chatTimer = 0, chatSig = '';
function openChat(tab = 'world', peer) {
  if (typeof setHmDrop === 'function') setHmDrop(false);
  chatTab = CHAT_TABS.some(t => t[0] === tab) ? tab : 'world'; chatPeer = peer || null;
  if (!chatEl) {
    chatEl = document.createElement('div'); chatEl.className = 'chx'; chatEl.setAttribute('role', 'dialog'); chatEl.setAttribute('aria-label', 'Chat');
    chatEl.innerHTML = '<div class="chx-back"></div><section class="chx-panel"></section>';
    document.body.appendChild(chatEl);
    chatEl.querySelector('.chx-back').onclick = closeChat;
    document.addEventListener('keydown', chatKey);
  }
  chatSig = ''; chatRender(true);
  clearInterval(chatTimer); chatTimer = setInterval(() => { if (!chatEl || !document.body.contains(chatEl)) { clearInterval(chatTimer); return; } chatRender(); }, 1500);
}
function closeChat() {
  if (!chatEl) return; chatSeen(); clearInterval(chatTimer); document.removeEventListener('keydown', chatKey);
  const el = chatEl; chatEl = null; el.classList.add('out'); setTimeout(() => el.remove(), 220);
  persist(); safely(renderChatDot, 'chat dot');
}
function chatKey(e) { if (e.key === 'Escape' && chatEl && !document.querySelector('.modal-back, .rdrop')) { if (chatTab === 'friends' && chatPeer) { chatPeer = null; chatRender(true); } else closeChat(); } }
function chatSeen() {
  const c = chatState(), now = Date.now();
  if (chatTab === 'guild') c.seen.guild = now; else if (chatTab === 'friends' && chatPeer) c.seen['dm:' + chatPeer] = now; else if (chatTab === 'world') c.seen.world = now;
}
/* who a message is from: a practice player's seeded profile, a real player, or you */
function chatWho(m) {
  if (m.me) return { name: S.player.name, lv: playerLv().lv, vip: vipLv(), av: avatarHTML(36) };
  if (m.real) { const w = m.av ? wpParse(m.av) : null; return { name: m.name, lv: m.lv, vip: m.vip, av: w ? avatarHTML(36, w, m.fr || 'simple') : chatIni(m.name, 36) }; }
  const p = frByUid(m.uid) || (myGuild() || { members: [] }).members.find(x => x.uid === m.uid);
  if (!p) return { name: m.name || 'Player', lv: 1, vip: 0, av: chatIni(m.name, 36) };
  const fp = frByUid(m.uid) ? frProfile(p) : null;
  return { name: p.name, lv: p.lv || 1, vip: fp ? fp.vip : 0, av: fp && fp.avatar ? frAvatar(fp, 36) : chatIni(p.name, 36), uid: fp ? p.uid : 0 };
}
/* a round initial for players without an avatar picture */
const chatIni = (name, size) => `<span class="avf f-simple" style="--s:${size}px"><span class="avi chx-ini" style="--h:${Math.floor(seeded('ini:' + name)() * 360)}">${esc(String(name || '?').trim().charAt(0).toUpperCase() || '?')}</span></span>`;
function chatMsgHTML(m) {
  if (m.sys) return `<div class="chm sys"><span>${icon('sparkle')}${esc(m.x)}</span><time>${chatAgo(m.t)}</time></div>`;
  const w = chatWho(m), vn = w.vip ? vipGrade(w.vip).toLowerCase() : '0';
  const txt = esc(m.x).replace(/(^|\s)@([^\s@]{1,16})/g, (a, s, n) => `${s}<b class="chm-at ${n === S.player.name ? 'me' : ''}">@${n}</b>`);
  return `<div class="chm ${m.me ? 'me' : ''} ${m.me ? cbClass(bubbleOf().id) : cbClass(m.bub)}">
    <button class="chm-av" ${w.uid ? `data-chp="${w.uid}"` : 'tabindex="-1"'} aria-label="${esc(w.name)}">${w.av}</button>
    <div class="chm-b"><span class="chm-h"><b class="vipn vn-${vn}">${esc(w.name)}</b><i>Lv ${w.lv}</i>${w.vip ? `<em class="chm-vip v-${vn}">VIP ${w.vip}</em>` : ''}<time>${chatAgo(m.t)}</time></span><p>${txt}</p></div></div>`;
}
function chatRender(force) {
  if (!chatEl) return;
  const panel = chatEl.querySelector('.chx-panel'), g = myGuild(), fr = frState();
  const msgs = chatTab === 'friends' ? (chatPeer ? chatMessages('dm', chatPeer) : null) : chatMessages(chatTab);
  const sig = chatTab + '|' + chatPeer + '|' + (msgs ? msgs.length + ':' + (msgs.length ? msgs[msgs.length - 1].t : 0) : fr.list.join(',') + chatUnread('friends')) + '|' + Math.floor(Date.now() / 30000);
  if (!force && sig === chatSig) return;
  chatSeen();   // what is on screen now counts as read (before the tab dots are drawn)
  const list = panel.querySelector('.chx-list'), atEnd = !list || list.scrollHeight - list.scrollTop - list.clientHeight < 60, keep = list ? list.scrollTop : 0;
  const draft = panel.querySelector('#chxIn') ? panel.querySelector('#chxIn').value : '', focused = document.activeElement && document.activeElement.id === 'chxIn';
  chatSig = sig;
  const dot = n => n ? `<i class="chx-dot">${n > 99 ? '99+' : n}</i>` : '';
  const tabs = CHAT_TABS.map(([id, ic, nm]) => `<button class="chx-tab ${id === chatTab ? 'on' : ''}" data-cht="${id}">${icon(ic)}<span>${nm}</span>${id === 'guild' && chatTab !== 'guild' ? dot(chatUnread('guild')) : id === 'friends' ? dot(chatUnread('friends')) : ''}</button>`).join('');
  let sub = '', body = '', bar = true, ph = 'Say something to everyone…';
  if (chatTab === 'world') {
    sub = `<span class="chx-sub">${icon('compass')}<b>World chat</b><small>${chatBots() ? `${fmt(220 + Math.floor(seeded('online:' + Math.floor(Date.now() / 6e5))() * 380))} players online` : 'Real players · be kind'}</small></span>`;
  } else if (chatTab === 'guild') {
    if (!g) { bar = false; body = `<div class="chx-empty">${icon('guild')}<b>You're not in a guild yet</b><p>Join or create a guild to chat with its members.</p><button class="btn gold" id="chxGuild">${icon('guild')}Find a guild</button></div>`; }
    else { sub = `<span class="chx-sub">${guildIcon(g.icon, 26)}<b>${esc(g.name)}</b><small>${g.members.length} members · ${Math.max(1, Math.round(g.members.length * (.25 + seeded('gon:' + g.id + Math.floor(Date.now() / 6e5))() * .3)))} online</small></span>`; ph = `Message ${g.name}…`; }
  } else if (!chatPeer) {
    bar = false;
    const L = fr.list.map(u => frByUid(u)).filter(Boolean).map(p => ({ p, fp: frProfile(p), last: (chatState().dm[p.uid] || []).slice(-1)[0], un: chatUnread('dm', p.uid) }))
      .sort((a, b) => (b.last ? b.last.t : 0) - (a.last ? a.last.t : 0) || a.fp.mins - b.fp.mins);
    body = L.length ? `<div class="chx-frs">${L.map(({ p, fp, last, un }) => `<button class="chx-fr ${un ? 'un' : ''}" data-chf="${p.uid}"><span class="chx-frav">${frAvatar(fp, 42)}<i class="chx-on ${fp.mins < 5 ? 'on' : ''}"></i></span>
        <span class="chx-frt"><b class="vipn vn-${fp.vip ? vipGrade(fp.vip).toLowerCase() : '0'}">${esc(p.name)}</b><small>${last ? `${last.me ? 'You: ' : ''}${esc(last.x)}` : esc(frSeen(fp.mins))}</small></span>${un ? dot(un) : last ? `<time>${chatAgo(last.t)}</time>` : ''}</button>`).join('')}</div>`
      : `<div class="chx-empty">${icon('friends')}<b>No friends yet</b><p>Add players as friends to chat with them here.</p><button class="btn gold" id="chxFind">${icon('plus')}Find players</button></div>`;
  } else {
    const p = frByUid(chatPeer), fp = p && frProfile(p);
    if (!p) { chatPeer = null; return chatRender(true); }
    sub = `<span class="chx-sub peer"><button class="chx-backb" id="chxBack" aria-label="Back to your friends">${icon('back')}</button><button class="chx-peer" data-chp="${p.uid}">${frAvatar(fp, 30)}<b>${esc(p.name)}</b><small>${esc(frSeen(fp.mins))}</small></button></span>`;
    ph = `Message ${p.name}…`;
  }
  if (msgs) body = msgs.length ? `<div class="chx-list">${msgs.map(chatMsgHTML).join('')}</div>` : `<div class="chx-list"><p class="chx-none">${chatTab === 'friends' ? 'Say hi! Your friend will answer here.' : 'No messages yet. Say something!'}</p></div>`;
  panel.innerHTML = `<header class="chx-head"><span class="chx-ic">${icon('chat')}</span><h2 class="ts">Chat</h2><button class="inv-x" id="chxClose" aria-label="Close">${icon('close')}</button></header>
    <nav class="chx-tabs">${tabs}</nav>${sub}${body}
    ${bar ? `<div class="chx-quick">${CHAT_QUICK.map(q => `<button class="chx-q" data-chq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="chx-bar" id="chxForm"><button type="button" class="chx-cbb ${cbClass(bubbleOf().id)}" id="chxCb" aria-label="Chat bubble skin" title="Chat bubble skin · ${esc(bubbleOf().name)}">${icon('chat')}</button><input class="input" id="chxIn" maxlength="${CHAT_MAX}" autocomplete="off" placeholder="${esc(ph)}" aria-label="Message"><button class="chx-send" type="submit" aria-label="Send">${icon('send')}</button></form>` : ''}`;
  const nl = panel.querySelector('.chx-list'); if (nl) nl.scrollTop = force || atEnd ? nl.scrollHeight : keep;
  const inp = panel.querySelector('#chxIn'); if (inp) { inp.value = draft; if (focused || (force && matchMedia('(pointer: fine)').matches)) inp.focus({ preventScroll: true }); }   // no keyboard popping up on phones
  // wire up
  panel.querySelector('#chxClose').onclick = closeChat;
  panel.querySelectorAll('[data-cht]').forEach(b => b.onclick = () => { chatSeen(); chatTab = b.dataset.cht; chatPeer = null; chatRender(true); });
  panel.querySelectorAll('[data-chp]').forEach(b => b.onclick = () => openFrProfile(+b.dataset.chp));
  panel.querySelectorAll('[data-chf]').forEach(b => b.onclick = () => { chatPeer = +b.dataset.chf; chatRender(true); });
  panel.querySelectorAll('[data-chq]').forEach(b => b.onclick = () => { if (chatSend(b.dataset.chq)) chatRender(true); });
  const bk = panel.querySelector('#chxBack'); if (bk) bk.onclick = () => { chatSeen(); chatPeer = null; chatRender(true); };
  const gb = panel.querySelector('#chxGuild'); if (gb) gb.onclick = () => { closeChat(); openFarm('guild'); };
  const fb = panel.querySelector('#chxFind'); if (fb) fb.onclick = () => { closeChat(); openFriends('find'); };
  const cbb = panel.querySelector('#chxCb'); if (cbb) cbb.onclick = () => openPfPick('bubble');   // the chat bubble skins (Profile settings → Chat bubble)
  const fm = panel.querySelector('#chxForm'); if (fm) fm.onsubmit = e => { e.preventDefault(); const i = panel.querySelector('#chxIn'); if (chatSend(i.value)) { i.value = ''; chatRender(true); } };
  safely(renderChatDot, 'chat dot');
}
/* the home ticker: the newest World message, and a red dot while a friend's reply is unread */
/* ---------- chat bubble skins (the owner asked for 2 to start, really nice and hard to get) ----------
   Equipped in Profile settings → Chat bubble (or the bubble button in the chat bar): S.profile.bubble. Your messages wear it
   (.chm.cb-<id>, styles in main.css "Chat bubble skins"); online the World payload carries it (bub) so others see it too.
   Celestial Crown: reach Celestial, the last rank of the Arena (its emblem's colours: ivory, gold, deep violet and a prism
   rim); Ten Thousand Wishes: summon 10,000 times. Once reached they stay yours (S.unlocks 'cb-celestial' / 'cb-wishes'). */
const CHAT_BUBBLES = [
  { id: 'default', name: 'Classic', need: 'always' },
  { id: 'celestial', name: 'Celestial Crown', need: 'cbcel', rare: true },
  { id: 'wishes', name: 'Ten Thousand Wishes', need: 'cb10k', rare: true }
];
const cbHasCel = () => (S.unlocks || []).includes('cb-celestial') || ((S.arena && S.arena.best) || 0) >= 5500;
const cbHas10k = () => (S.unlocks || []).includes('cb-wishes') || totalPulls() >= 10000;
UNLOCK.cbcel = [cbHasCel, ''];
UNLOCK.cb10k = [cbHas10k, ''];
Object.defineProperty(UNLOCK.cbcel, 1, { get: () => `Reach Celestial, the last rank of the Arena (best so far: ${S.arena && S.arena.joined ? arRankOf((S.arena && S.arena.best) || 0).label : 'not joined'})` });
Object.defineProperty(UNLOCK.cb10k, 1, { get: () => `Summon 10,000 times (${fmt(Math.min(10000, totalPulls()))} / 10,000)` });
const bubbleOf = () => CHAT_BUBBLES.find(b => b.id === S.profile.bubble && unlocked(b)) || CHAT_BUBBLES[0];
const cbClass = id => id && id !== 'default' && CHAT_BUBBLES.some(b => b.id === id) ? 'cb cb-' + id : '';
const chatBubblePreview = b => `<div class="chm me cbp ${cbClass(b.id)}"><div class="chm-b"><p>${b.id === 'celestial' ? 'Bow before the stars ✦' : b.id === 'wishes' ? 'Ten thousand wishes later…' : 'Hello, Plaza!'}</p></div></div>`;
/* once reached, a special bubble stays yours (even if the Arena VP drop later) and a toast says it is new */
function chatBubbleCheck() {
  S.unlocks = S.unlocks || [];
  [['cb-celestial', cbHasCel, 'Celestial Crown'], ['cb-wishes', cbHas10k, 'Ten Thousand Wishes']].forEach(([k, f, n]) => {
    if (!S.unlocks.includes(k) && f()) { S.unlocks.push(k); persist(); toast(`New chat bubble: ${n}! Equip it in Profile settings → Chat bubble.`); }
  });
}
function renderChatDot() { safely(chatBubbleCheck, 'chat bubbles'); const d = document.getElementById('chatDot'); if (d) d.hidden = !chatAnyUnread(); const m = document.getElementById('chatMDot'); if (m) m.hidden = !chatAnyUnread(); }
function chatTickerLine() {
  const L = chatMessages('world'), m = L[L.length - 1];
  if (!m) return null;
  const who = m.me ? S.player.name : m.name || (frByUid(m.uid) || {}).name || 'Player';
  return m.sys ? `<span class="w">[World]</span> ${esc(m.x)}` : `<span class="w">[World]</span> <b>${esc(who)}</b>: ${esc(m.x)}`;
}
