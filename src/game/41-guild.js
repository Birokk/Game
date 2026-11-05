/* ---------- Guilds: home "Guild" button → openFarm('guild'), a screen built like the Base ----------
   Create a guild (GUILD_PEARLS pearls; name + customizable icon: frame, emblem, colour or your own picture) or join one.
   A guild holds up to GUILD_MAX (30) members. There is no guild server yet: the other guilds are practice guilds
   (PRACTICE_GUILDS, seeded, the same for everyone; their members include the Ranking's practice players, rankBots),
   and practice players apply to your own guild every day (guildApps) so a leader can accept them.
   Inside: three places on a 16:9 stage (wallpaper guild:bg, label positions S.farmLayout['g:<id>'], admin → Base):
   - Hall: guild info, notice, members and the total guild CS (every member's Total CS added up); leader tools.
   - Shop: GSHOP_N items picked every day from GSHOP_POOL (the same for everyone, resets at local midnight), paid with
     guild points (wallet gpts).
   - Rewards: the daily login reward of GUILD_DAILY guild points.
   The guild name and icon show on your profile card and next to names in the Ranking.
   State S.guild {id: 'pg:<n>' | 'mine' | null, joined, own: {name, icon, notice, created, members: [...]}, apps: {day, done: []},
   day (daily reward claimed), shop: {key, got: {itemId: n}}} (player save). */
const GUILD_MAX = 30, GUILD_PEARLS = 100, GUILD_DAILY = 30, GUILD_NAME_MAX = 16;
const G_FRAMES = [['round', 'Round'], ['shield', 'Shield'], ['hex', 'Hexagon'], ['diamond', 'Diamond']];
const G_COLORS = ['#8f6bff', '#ff6ec7', '#3fb8ff', '#3fd8a8', '#ffb347', '#ff5a5a', '#c9a24a', '#6b7a99'];
const G_EMBLEMS = {
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6L12 16.4 6.6 19.4l1.2-6L3.3 9.3l6.1-.7z"/>',
  moon: '<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5z"/>',
  flame: '<path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-5 3-6 0 2 1 3.5 2.5 3.5C11 9 10 6 12 2z"/>',
  wave: '<path d="M2 14c3-4 6-4 9 0s6 4 9 0v4c-3 4-6 4-9 0s-6-4-9 0z"/><path d="M2 8c3-4 6-4 9 0s6 4 9 0v3c-3 4-6 4-9 0s-6-4-9 0z" opacity=".7"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  sword: '<path d="M14.5 3H21v6.5L10 20.5l-2-2-3 3L3.5 20l3-3-2-2z"/>',
  leaf: '<path d="M20 4C10 4 4 9 4 16c0 1.5.3 2.8.8 4C6 14 10 10 16 8c-5 3-8 7-9 12 9 0 13-7 13-16z"/>',
  wing: '<path d="M3 18C3 9 9 4 21 4c-1 3-3 4-6 4.5 2 .3 3.5 1 4.5 2.5-2 1.5-4.5 2-7 1.5 1.5 1 2.5 2.5 2.5 4-4 1-8 1.5-12 1.5z"/>'
};
const G_EMBLEM_IDS = Object.keys(G_EMBLEMS);
/* a guild icon: {img} (own picture) or {f: frame, e: emblem, c: colour} */
function guildIcon(ic, size = 40, cls = '') {
  ic = ic || { f: 'round', e: 'star', c: G_COLORS[0] };
  if (ic.img) return `<span class="gico f-${ic.f || 'round'} img ${cls}" style="--gs:${size}px"><img src="${ic.img}" alt=""></span>`;
  return `<span class="gico f-${ic.f || 'round'} ${cls}" style="--gs:${size}px;--gc:${ic.c || G_COLORS[0]}"><svg viewBox="0 0 24 24" aria-hidden="true">${G_EMBLEMS[ic.e] || G_EMBLEMS.star}</svg></span>`;
}

/* practice guilds (seeded): a name, an icon, a notice and their members (some of the Ranking's practice players + other names) */
const GUILD_PG_NAMES = ['Moonlit Order', 'Pearl Vanguard', 'Lantern Keepers', 'Coral Crown', 'Starfall', 'Tidebound', 'Sakura Circle', 'Ember Wolves'];
const GUILD_PG_NOTES = ['Daily login is all we ask. Have fun!', 'Top 3 every week. Active players only.', 'Chill guild, helping new players.', 'We share pull tips in chat.', 'Collect your guild reward every day!', 'Friendly and active. Say hi in the plaza.'];
const G_SYL = ['ka', 'ri', 'mo', 'na', 'lu', 'shi', 'ae', 'ro', 'vi', 'el', 'sa', 'to', 'mi', 'ren', 'yu', 'zo', 'li', 'an', 'ce', 'da'];
const gName = r => { const n = 2 + Math.floor(r() * 2); let s = ''; for (let i = 0; i < n; i++) s += G_SYL[Math.floor(r() * G_SYL.length)]; return s[0].toUpperCase() + s.slice(1); };
const gFiller = (seed, i) => { const r = seeded('gm:' + seed + ':' + i), skill = Math.pow(r(), 1.6); return { name: gName(r), lv: 3 + Math.floor(skill * 55), total: Math.round(3000 + skill * 240000), hue: Math.floor(r() * 360), uid: 100000 + Math.floor(r() * 899999) }; };
let pgCache = null;
function practiceGuilds() {
  if (pgCache && pgCache.n === S.pool.length) return pgCache.list;
  const bots = typeof rankBots === 'function' ? rankBots() : [];
  const list = GUILD_PG_NAMES.map((name, i) => { const r = seeded('guild:' + name); return { id: 'pg:' + i, name, icon: { f: G_FRAMES[Math.floor(r() * G_FRAMES.length)][0], e: G_EMBLEM_IDS[Math.floor(r() * G_EMBLEM_IDS.length)], c: G_COLORS[Math.floor(r() * G_COLORS.length)] }, notice: GUILD_PG_NOTES[Math.floor(r() * GUILD_PG_NOTES.length)], size: 9 + Math.floor(r() * 21), created: Date.now() - Math.floor(30 + r() * 300) * 864e5, members: [] }; });
  bots.forEach(b => { const r = seeded('gbot:' + b.name); if (r() < .2) return; const g = list[Math.floor(r() * list.length)]; if (g.members.length < g.size) g.members.push({ name: b.name, lv: b.lv, total: b.total, hue: b.hue, uid: b.uid, bot: true }); });
  list.forEach((g, gi) => { for (let i = 0; g.members.length < g.size; i++) g.members.push(gFiller(g.id, i)); g.members.sort((a, b) => b.total - a.total); g.leader = g.members[0].name; });
  pgCache = { n: S.pool.length, list };
  return list;
}
/* which practice guild a Ranking practice player is in (null = none) */
const botGuild = name => practiceGuilds().find(g => g.members.some(m => m.name === name)) || null;

function guildState() {
  if (!S.guild || typeof S.guild !== 'object') S.guild = { id: null };
  return S.guild;
}
const inGuild = () => !!guildState().id;
const isLeader = () => guildState().id === 'mine';
/* the guild you're in, as {id, name, icon, notice, leader, members (you included), created} */
function myGuild() {
  const st = guildState(); if (!st.id) return null;
  const me = { name: S.player.name, lv: playerLv().lv, total: rankMe().total, uid: S.profile.uid, me: true };
  if (st.id === 'mine') { const o = st.own; return { id: 'mine', name: o.name, icon: o.icon, notice: o.notice, leader: S.player.name, created: o.created, members: [me, ...(o.members || [])].sort((a, b) => b.total - a.total) }; }
  const g = practiceGuilds().find(x => x.id === st.id); if (!g) { st.id = null; return null; }
  return { ...g, members: [...g.members, me].sort((a, b) => b.total - a.total) };
}
const guildCS = g => g.members.reduce((t, m) => t + (m.total || 0), 0);
const guildDayReady = () => inGuild() && guildState().day !== dayKey();
const guildReady = () => guildDayReady();

function joinGuild(id) {
  const g = practiceGuilds().find(x => x.id === id); if (!g || inGuild()) return;
  if (g.members.length + 1 > GUILD_MAX) { toast(`${g.name} is full (${GUILD_MAX} members).`); return; }
  Object.assign(guildState(), { id, joined: Date.now() });
  persist(); renderMenu(); renderFarm(); toast(`Welcome to ${g.name}!`);
}
function leaveGuild() {
  const g = myGuild(); if (!g) return;
  const leader = isLeader();
  openModal({ title: leader ? 'Disband your guild?' : `Leave ${g.name}?`, ic: 'close', small: true, body: `<div class="stack" style="text-align:center">
      <p class="desc">${leader ? `You are the leader: leaving disbands <b>${esc(g.name)}</b> and its members go back to the guild list. Creating a new guild costs ${GUILD_PEARLS} pearls again.` : 'You can join another guild right away. Your guild points stay with you.'}</p>
      <div class="row" style="justify-content:center"><button class="btn ghost" id="glNo">Cancel</button><button class="btn danger" id="glYes">${leader ? 'Disband' : 'Leave'}</button></div></div>`,
    onMount: () => { $('#glNo').onclick = closeModal; $('#glYes').onclick = () => { const st = guildState(); st.id = null; if (leader) delete st.own; closeModal(); persist(); renderMenu(); fmSel = null; renderFarm(); toast(leader ? 'Your guild was disbanded.' : `You left ${g.name}.`); }; } });
}

/* the icon editor (create / edit): frame, emblem, colour, or your own picture */
function guildEditor(edit) {
  const st = guildState(), base = edit && st.own ? st.own : null;
  let name = base ? base.name : '', gic = base ? { ...base.icon } : { f: 'shield', e: 'star', c: G_COLORS[0] }, notice = base ? base.notice || '' : '';
  const draw = () => {
    const b = $('#geBody'); if (!b) return;
    b.innerHTML = `<div class="ge">
      <div class="ge-prev">${guildIcon(gic, 112)}<b>${esc(name || 'Guild name')}</b></div>
      <label class="ge-l">Guild name<input class="input" id="geName" maxlength="${GUILD_NAME_MAX}" value="${esc(name)}" placeholder="Up to ${GUILD_NAME_MAX} characters"></label>
      <div class="ge-l">Frame<div class="ge-row">${G_FRAMES.map(([k, l]) => `<button class="ge-opt ${gic.f === k ? 'on' : ''}" data-gf="${k}" title="${l}">${guildIcon({ ...gic, img: null, f: k }, 38)}</button>`).join('')}</div></div>
      <div class="ge-l">Emblem<div class="ge-row">${G_EMBLEM_IDS.map(k => `<button class="ge-opt ${!gic.img && gic.e === k ? 'on' : ''}" data-ge="${k}">${guildIcon({ f: gic.f, e: k, c: gic.c }, 38)}</button>`).join('')}</div></div>
      <div class="ge-l">Colour<div class="ge-row">${G_COLORS.map(c => `<button class="ge-sw ${gic.c === c ? 'on' : ''}" data-gc="${c}" style="--gc:${c}" aria-label="Colour ${c}"></button>`).join('')}</div></div>
      <div class="ge-l">Or your own picture<div class="row" style="gap:8px"><label class="btn ghost sm">${icon('upload')}Upload<input type="file" accept="image/*" class="sr" id="geUp"></label>${gic.img ? '<button class="btn ghost sm" id="geNoImg">Use the emblem</button>' : ''}</div></div>
      ${edit ? `<label class="ge-l">Notice<textarea class="input" id="geNote" maxlength="120" rows="2" placeholder="A message for your members">${esc(notice)}</textarea></label>` : ''}
      <div class="row" style="justify-content:center;gap:10px"><button class="btn ghost" id="geNo">Cancel</button><button class="btn gold" id="geGo" ${name.trim() ? '' : 'disabled'}>${edit ? 'Save' : `Create · ${costHTML(GUILD_PEARLS)}`}</button></div>
      ${edit ? '' : `<span class="tiny" style="text-align:center">You have ${fmt(S.wallet.pearls)} pearls. You become the guild's leader.</span>`}</div>`;
    $('#geName').oninput = e => { name = e.target.value.slice(0, GUILD_NAME_MAX); b.querySelector('.ge-prev b').textContent = name || 'Guild name'; $('#geGo').disabled = !name.trim(); };
    b.querySelectorAll('[data-gf]').forEach(x => x.onclick = () => { gic.f = x.dataset.gf; draw(); });
    b.querySelectorAll('[data-ge]').forEach(x => x.onclick = () => { gic.e = x.dataset.ge; gic.img = null; draw(); });
    b.querySelectorAll('[data-gc]').forEach(x => x.onclick = () => { gic.c = x.dataset.gc; draw(); });
    const nt = $('#geNote'); if (nt) nt.oninput = e => { notice = e.target.value; };
    $('#geUp').onchange = async e => { try { gic.img = await resizeImage(e.target.files[0], 160, 'image/png'); draw(); } catch (er) { toast(er.message, true); } };
    const ni = $('#geNoImg'); if (ni) ni.onclick = () => { gic.img = null; draw(); };
    $('#geNo').onclick = closeModal;
    $('#geGo').onclick = () => {
      const nm = name.trim().slice(0, GUILD_NAME_MAX); if (!nm) return;
      if (!edit && practiceGuilds().some(g => g.name.toLowerCase() === nm.toLowerCase())) { toast('A guild with that name already exists.'); return; }
      if (edit) { Object.assign(st.own, { name: nm, icon: gic, notice: notice.trim().slice(0, 120) }); closeModal(); persist(); renderMenu(); renderFarm(); toast('Guild updated.'); return; }
      if (S.wallet.pearls < GUILD_PEARLS) { toast(`Creating a guild costs ${GUILD_PEARLS} pearls. You have ${fmt(S.wallet.pearls)}.`); return; }
      S.wallet.pearls -= GUILD_PEARLS;
      Object.assign(st, { id: 'mine', joined: Date.now(), own: { name: nm, icon: gic, notice: 'Welcome to the guild!', created: Date.now(), members: [] } });
      closeModal(); persist(); renderMenu(); fmSel = 'hall'; renderFarm(); toast(`${nm} is founded! You are its leader.`);
    };
  };
  openModal({ title: edit ? 'Edit guild' : 'Create a guild', ic: 'guild', kind: 'guilded', body: '<div id="geBody"></div>', onMount: draw });
}

/* applications to your own guild: a few practice players a day (seeded by the day) */
function guildApps() {
  const st = guildState(); if (!isLeader()) return [];
  if (!st.apps || st.apps.day !== dayKey()) st.apps = { day: dayKey(), done: [] };
  const taken = new Set((st.own.members || []).map(m => m.name));
  return [0, 1, 2].map(i => gFiller('app:' + dayKey(), i)).filter(m => !taken.has(m.name) && !st.apps.done.includes(m.name));
}
function answerApp(name, yes) {
  const st = guildState(), m = guildApps().find(a => a.name === name); if (!m) return;
  st.apps.done.push(name);
  if (yes) { if ((st.own.members || []).length + 1 >= GUILD_MAX) { toast(`The guild is full (${GUILD_MAX} members).`); return; } st.own.members = [...(st.own.members || []), { ...m, joinedAt: Date.now() }]; toast(`${name} joined the guild.`); }
  persist(); renderFarm();
}
function kickMember(name) {
  const st = guildState(); if (!isLeader()) return;
  st.own.members = (st.own.members || []).filter(m => m.name !== name); persist(); renderFarm(); toast(`${name} left the guild.`);
}

/* daily login reward */
function claimGuildDaily() {
  if (!guildDayReady()) return;
  const st = guildState(); st.day = dayKey(); S.wallet.gpts = (S.wallet.gpts || 0) + GUILD_DAILY;
  persist(); renderMenu(); renderFarm(); showRewards('Guild reward', { gpts: GUILD_DAILY }, 'Daily login reward · come back tomorrow for more');
}

/* the guild shop: GSHOP_N items a day from the pool (weighted, the same for everyone), each with a daily limit */
const GSHOP_N = 6;
const GSHOP_POOL = [
  { id: 'gs-tk', got: { tickets: 1 }, price: 50, lim: 1, w: 1 },
  { id: 'gs-wi', got: { wishes: 1 }, price: 40, lim: 1, w: 1.2 },
  { id: 'gs-bo', got: { bottles: 1 }, price: 10, lim: 3, w: 1.4 },
  { id: 'gs-co', got: { coins: 5000 }, price: 8, lim: 3, w: 1.4 },
  { id: 'gs-cs', got: { cfssr: 3 }, price: 15, lim: 2, w: 1 },
  { id: 'gs-cu', got: { cfur: 1 }, price: 25, lim: 2, w: .8 },
  { id: 'gs-fs', got: { fragssr: 3 }, price: 10, lim: 2, w: 1 },
  { id: 'gs-fu', got: { fragur: 1 }, price: 20, lim: 1, w: .7 },
  { id: 'gs-gp', got: { gplush: 1 }, price: 15, lim: 2, w: .9 },
  { id: 'gs-gb', got: { gbracelet: 2 }, price: 10, lim: 2, w: .9 },
  { id: 'gs-ex', got: { exp: 300 }, price: 10, lim: 2, w: .9 },
  { id: 'gs-nt', got: { nametk: 1 }, price: 60, lim: 1, w: .25 },
  { id: 'gs-mt', got: { memtk: 1 }, price: 450, lim: 1, w: .15 }
];
function guildShopToday() {
  const r = seeded('gshop:' + dayKey()), pool = [...GSHOP_POOL], out = [];
  while (out.length < GSHOP_N && pool.length) { const tot = pool.reduce((t, x) => t + x.w, 0); let v = r() * tot, i = 0; while ((v -= pool[i].w) > 0) i++; out.push(pool.splice(i, 1)[0]); }
  return out;
}
function guildShopState() { const st = guildState(); if (!st.shop || st.shop.key !== dayKey()) st.shop = { key: dayKey(), got: {} }; return st.shop; }
const gshopLeft = it => it.lim - (guildShopState().got[it.id] || 0);
const GIFT_KEYS = { gsweets: 'sweets', gbracelet: 'bracelet', gplush: 'plush' };
function guildGrant(got) {
  const rest = {};
  Object.entries(got).forEach(([k, n]) => { if (GIFT_KEYS[k]) S.gifts[GIFT_KEYS[k]] = (S.gifts[GIFT_KEYS[k]] || 0) + n; else rest[k] = n; });
  bpGrant(rest);
}
function buyGuildItem(id) {
  const it = guildShopToday().find(x => x.id === id); if (!it || gshopLeft(it) <= 0) return;
  if ((S.wallet.gpts || 0) < it.price) { toast(`That costs ${it.price} guild points. You have ${fmt(S.wallet.gpts || 0)}.`); return; }
  S.wallet.gpts -= it.price; guildShopState().got[id] = (guildShopState().got[id] || 0) + 1; guildGrant(it.got);
  persist(); renderMenu(); refreshSummon(); renderFarm(); showRewards('Guild shop', it.got, `−${it.price} guild points`);
}
const gLeftTxt = () => { const n = new Date(), t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n, h = Math.floor(t / 36e5), m = Math.floor(t % 36e5 / 6e4); return `${h}h ${m}m`; };

INFO.guild = () => ({ title: 'Guilds', body: `<p class="desc">Join a guild or create your own for <b>${GUILD_PEARLS} pearls</b> (name and icon of your choice). A guild holds up to <b>${GUILD_MAX} members</b>; its <b>total CS</b> is every member's Total CS added up. Your guild's name and icon show on your profile.</p>
  <p class="desc">Every day the <b>Rewards</b> spot gives <b>${GUILD_DAILY} guild points</b>, spent in the <b>Guild shop</b>, whose ${GUILD_SHOP_TXT} change every day at midnight.</p>
  <p class="tiny">The guild server isn't connected yet, so the other guilds are practice guilds, and practice players apply to your guild each day.</p>` });
const GUILD_SHOP_TXT = `${GSHOP_N} items`;

/* ---------- the guild screen (a view of the Base screen, fmView 'guild') ---------- */
const GUILD_SPOTS = [
  { id: 'hall', name: 'Guild Hall', sub: 'Info & members', x: 36, y: 36, col: '#c58bff', ic: 'guild' },
  { id: 'shop', name: 'Guild Shop', sub: 'Resets daily', x: 18, y: 66, col: '#ffb35a', ic: 'shop' },
  { id: 'reward', name: 'Rewards', sub: 'Daily login', x: 48, y: 70, col: '#5be3a8', ic: 'gift' }
];
const guildPosDef = id => { const p = GUILD_SPOTS.find(s => s.id === String(id).replace(/^g:/, '')); return p ? { x: p.x, y: p.y } : { x: 50, y: 50 }; };
function guildBg() { const bg = MEDIA.get('guild:bg'); return bg ? `<img class="fm-bg" src="${bg}" alt="">` : '<div class="fm-bg gd-bg"></div>'; }
function renderGuild() {
  const g = myGuild();
  const cur = `<div class="fm-cur"><div class="cur" title="Guild points">${curIcon('gpts')}<b>${fmt(S.wallet.gpts || 0)}</b></div><div class="cur">${curIcon('pearls')}<b>${fmt(S.wallet.pearls)}</b></div></div>`;
  if (!g) {   // not in a guild: the list of guilds + Create
    const list = practiceGuilds();
    fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${guildBg()}</div></div>
      <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><h2 class="ts">Guilds</h2>${infoBtn('guild', 'How guilds work')}<span class="fm-rate ts">Join a guild or create your own</span></div>${cur}
      <div class="gd-browse glass-deep"><div class="gd-bh"><b>Find a guild</b><button class="btn gold" id="gdCreate">${icon('plus')}Create a guild · ${costHTML(GUILD_PEARLS)}</button></div>
        <div class="gd-list">${list.map(x => { const n = x.members.length, full = n + 1 > GUILD_MAX;
          return `<div class="gd-row">${guildIcon(x.icon, 52)}<span class="gd-ri"><b>${esc(x.name)}</b><small>${esc(x.notice)}</small><small>Leader ${esc(x.leader)} · Total CS ${fmt(guildCS(x))}</small></span><span class="gd-n ${full ? 'full' : ''}">${n} / ${GUILD_MAX}</span><button class="btn ${full ? 'ghost' : 'gold'} sm" data-gjoin="${x.id}" ${full ? 'disabled' : ''}>${full ? 'Full' : 'Join'}</button></div>`; }).join('')}</div></div>`;
    $('#fmBack').onclick = closeFarm;
    $('#gdCreate').onclick = () => guildEditor(false);
    fmEl.querySelectorAll('[data-gjoin]').forEach(b => b.onclick = () => joinGuild(b.dataset.gjoin));
    return;
  }
  fmEl.innerHTML = `<div class="fm-scroll"><div class="fm-stage">${guildBg()}
      ${GUILD_SPOTS.map(p => { const q = farmPos('g:' + p.id), ready = p.id === 'reward' && guildDayReady();
        return `<button class="fm-spot ${fmSel === p.id ? 'on' : ''}" data-gs="${p.id}" style="left:${q.x}%;top:${q.y}%;--fc:${p.col}">${ready ? `<span class="fm-bubble">${curIcon('gpts')}</span>` : ''}<span class="fm-label"><b>${esc(p.name)}</b><span>${p.id === 'reward' ? (ready ? `+${GUILD_DAILY} guild points` : 'Come back tomorrow') : esc(p.sub)}</span></span></button>`; }).join('')}
    </div></div>
    <div class="fm-top"><button class="cs-back" id="fmBack">${icon('back')}Back</button><span class="gd-tname">${guildIcon(g.icon, 38)}<h2 class="ts">${esc(g.name)}</h2></span>${infoBtn('guild', 'How guilds work')}<span class="fm-rate ts">${g.members.length} / ${GUILD_MAX} members · Total CS ${fmt(guildCS(g))}</span></div>${cur}
    ${fmSel && GUILD_SPOTS.some(s => s.id === fmSel) ? `<aside class="fm-panel glass-deep gd-panel" id="fmPanel">${guildPanel(g, fmSel)}</aside>` : ''}`;
  $('#fmBack').onclick = closeFarm;
  fmEl.querySelectorAll('[data-gs]').forEach(b => b.onclick = e => { e.stopPropagation(); fmSel = fmSel === b.dataset.gs ? null : b.dataset.gs; renderFarm(); });
  fmEl.querySelector('.fm-stage').onclick = () => { if (fmSel) { fmSel = null; renderFarm(); } };
  const pn = $('#fmPanel'); if (!pn) return;
  pn.querySelector('[data-fmx]').onclick = () => { fmSel = null; renderFarm(); };
  const on = (id, f) => { const b = pn.querySelector('#' + id); if (b) b.onclick = f; };
  on('gdLeave', leaveGuild); on('gdEdit', () => guildEditor(true)); on('gdDaily', claimGuildDaily);
  pn.querySelectorAll('[data-gbuy]').forEach(b => b.onclick = () => buyGuildItem(b.dataset.gbuy));
  pn.querySelectorAll('[data-gapp]').forEach(b => b.onclick = () => { const [n, y] = b.dataset.gapp.split('|'); answerApp(n, y === '1'); });
  pn.querySelectorAll('[data-gkick]').forEach(b => b.onclick = () => kickMember(b.dataset.gkick));
}
const gAvatar = m => m.me ? `<span class="gd-av me">${avatarHTML(36)}</span>` : `<span class="gd-av" style="--h:${m.hue || 200}">${esc((m.name || '?')[0])}</span>`;
function guildPanel(g, id) {
  const spot = GUILD_SPOTS.find(s => s.id === id);
  let body = '';
  if (id === 'hall') {
    const apps = guildApps();
    body = `<div class="gd-info">${guildIcon(g.icon, 84)}<div><b>${esc(g.name)}</b><small>Leader ${esc(g.leader)}${g.leader === S.player.name && isLeader() ? ' (you)' : ''}</small><small>Founded ${new Date(g.created).toLocaleDateString()}</small></div></div>
      <div class="gd-stats"><div><b>${g.members.length} / ${GUILD_MAX}</b><span>Members</span></div><div class="tcs"><b>${fmt(guildCS(g))}</b><span>Total guild CS</span></div></div>
      ${g.notice ? `<div class="gd-note"><span class="lbl-sm">Notice</span><p>${esc(g.notice)}</p></div>` : ''}
      ${isLeader() && apps.length ? `<span class="lbl-sm">Applications today</span><div class="gd-mem">${apps.map(a => `<div class="gd-m">${gAvatar(a)}<span class="gd-mi"><b>${esc(a.name)}</b><small>Lv ${a.lv} · Total CS ${fmt(a.total)}</small></span><button class="btn gold sm" data-gapp="${esc(a.name)}|1">Accept</button><button class="iconbtn" data-gapp="${esc(a.name)}|0" aria-label="Decline">${icon('close')}</button></div>`).join('')}</div>` : ''}
      <span class="lbl-sm">Members · by Total CS</span>
      <div class="gd-mem">${g.members.map((m, i) => `<div class="gd-m ${m.me ? 'me' : ''}"><span class="gd-rk">${i + 1}</span>${gAvatar(m)}<span class="gd-mi"><b>${esc(m.name)}${m.me ? ' <small>(you)</small>' : ''}${m.name === g.leader ? ' <em class="gd-lead">Leader</em>' : ''}</b><small>Lv ${m.lv} · UID ${m.uid || '-'}</small></span><span class="gd-cs">${fmt(m.total)}<small>CS</small></span>${isLeader() && !m.me ? `<button class="iconbtn" data-gkick="${esc(m.name)}" title="Remove from the guild">${icon('close')}</button>` : ''}</div>`).join('')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap">${isLeader() ? `<button class="btn ghost" id="gdEdit">${icon('edit')}Edit name, icon & notice</button>` : ''}<button class="btn danger" id="gdLeave">${isLeader() ? 'Disband guild' : 'Leave guild'}</button></div>`;
  } else if (id === 'shop') {
    const items = guildShopToday();
    body = `<div class="gd-shead"><span>${curIcon('gpts')}<b>${fmt(S.wallet.gpts || 0)}</b> guild points</span><span class="tiny">${icon('clock')}New items in ${gLeftTxt()}</span></div>
      <div class="gd-shop">${items.map(it => { const [k, n] = Object.entries(it.got)[0], left = gshopLeft(it), can = left > 0 && (S.wallet.gpts || 0) >= it.price;
        return `<div class="gd-it ${left <= 0 ? 'sold' : ''}"><span class="inv-cell r${REW_R[k] || 4}"><span class="inv-pic">${curIcon(k)}</span></span><b>${fmt(n)} ${(REW_NAMES[k] || [k, k])[n === 1 ? 0 : 1]}</b><small>${left} / ${it.lim} left today</small>
          <button class="btn ${can ? 'gold' : 'ghost'} sm" data-gbuy="${it.id}" ${left > 0 ? '' : 'disabled'}>${left > 0 ? `${curIcon('gpts')}${it.price}` : 'Sold out'}</button></div>`; }).join('')}</div>
      <p class="tiny">${GSHOP_N} items a day, the same for every player. Earn guild points from the daily reward.</p>`;
  } else {
    const ready = guildDayReady();
    body = `<div class="gd-daily">${curIcon('gpts')}<b>+${GUILD_DAILY}</b><span>guild points every day for logging in</span></div>
      <button class="btn gold" id="gdDaily" ${ready ? '' : 'disabled'}>${ready ? 'Claim' : `Claimed · next in ${gLeftTxt()}`}</button>
      <p class="tiny">Spend guild points in the Guild Shop.</p>`;
  }
  return `<div class="fm-ph" style="--fc:${spot.col}"><div><b>${esc(spot.name)}</b><span class="farm-lv">${esc(g.name)}</span></div><button class="iconbtn" data-fmx aria-label="Close">${icon('close')}</button></div>
    <div class="stack">${body}</div>`;
}

ICONS.guild = '<path d="M5 3h14v10c0 4-3.5 6.5-7 8-3.5-1.5-7-4-7-8z"/><path d="M9 9l3-3 3 3-3 5z"/>';
CUR_SVG.gpts = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gptG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".55" stop-color="#e6a63c"/><stop offset="1" stop-color="#9a5b17"/></linearGradient></defs><path d="M4 3h16v10.5c0 4.2-3.8 6.8-8 8.5-4.2-1.7-8-4.3-8-8.5z" fill="url(#gptG)" stroke="#fff" stroke-width="1.2"/><path d="M12 6.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L12 14.7l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#fff"/></svg>';
REW_NAMES.gpts = ['guild point', 'guild points']; REW_R.gpts = 4;
REW_NAMES.gplush = ['Star Plushie', 'Star Plushies']; REW_NAMES.gbracelet = ['Pearl Bracelet', 'Pearl Bracelets']; REW_NAMES.gsweets = ['Lantern Sweets', 'Lantern Sweets'];
REW_R.gplush = 5; REW_R.gbracelet = 4; REW_R.gsweets = 3;
/* the guild icon next to a name in the Ranking (yours, or a practice player's practice guild) */
function rankGuildTag(p) { const g = p.me ? myGuild() : botGuild(p.name); return g ? `<span class="rk-guild" title="${esc(g.name)}">${guildIcon(g.icon, 20)}</span>` : ''; }
