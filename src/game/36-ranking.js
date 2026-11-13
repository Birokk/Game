/* ---------- Ranking (home Ranking icon → openRanking) ----------
   Leaderboards, one tab each (RANK_TABS): highest Total CS, highest character CS, most achievements, most hours played
   this week, highest VIP level (and its VIP EXP). There is no server leaderboard yet, so the other players are practice
   players made up from a fixed seed (rankBots; the hours tab changes every week); the player's own row uses real data.
   Play time: S.playtime {wk: Monday's dayKey, ms} counts time with the game open and visible (resets every Monday).
   Also here: st6(e), the class that gives a 6★ character's card / avatar the animated prism border of 3★ memories. */
const st6 = e => e && e.type === 'character' && owns(e.id) && starsOf(e.id) >= MAX_STARS ? `st6 st6-r${+e.rarity === 5 ? 5 : 4}` : '';   // SSR gets the orange version

/* play time this week */
const playWeek = () => dayKey(weekStart());
const playState = () => { const wk = playWeek(); if (!S.playtime || S.playtime.wk !== wk) { if (S.playtime) S.playLast = { ...S.playtime }; S.playtime = { wk, ms: 0 }; } return S.playtime; };   // last week's time is kept for the weekly rewards
const playHours = () => playState().ms / 3.6e6;
(() => {
  let last = Date.now(), unsaved = 0;
  setInterval(() => {
    const now = Date.now(), dt = Math.min(now - last, 60000); last = now;
    if (typeof booted === 'undefined' || !booted || document.visibilityState !== 'visible' || titleOn) return;
    playState().ms += dt; unsaved += dt;
    if (unsaved >= 60000) { unsaved = 0; persist(); }
  }, 15000);
})();

/* practice players: a seeded random generator so everyone sees the same board */
const RANK_NAMES = ['Mira', 'Juno', 'Kai', 'Pip', 'Sol', 'Nova', 'Rin', 'Teo', 'Yumi', 'Aiko', 'Lumen', 'Corvin', 'Selene', 'Haru', 'Iris', 'Zephyr', 'Mochi', 'Kestrel', 'Lyra', 'Orin', 'Saki', 'Ember', 'Noel', 'Vesper', 'Tsuki', 'Rowan', 'Elio', 'Fawn', 'Quill', 'Astra'];
const seeded = s => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
function rankBots(wkArg, partArg) {   // wkArg / partArg: a past week's hours (the whole week played)
  const chars = S.pool.filter(e => e.type === 'character' && !e.mc), wk = wkArg || playWeek();
  const weekPart = partArg ?? Math.min(1, (Date.now() - weekStart().getTime()) / (7 * 864e5));
  return RANK_NAMES.map((name, i) => {
    const r = seeded('rank:' + name), rw = seeded('rankwk:' + name + wk), skill = Math.pow(r(), 1.8);
    const vipXp = Math.round(Math.pow(r(), 3.2) * 700000), ch = chars.length ? chars[Math.floor(r() * chars.length)] : null;
    return {
      bot: true, name, uid: 100000 + Math.floor(r() * 899999), lv: 5 + Math.floor(skill * 55),
      total: Math.round(4000 + skill * 380000), char: ch,
      best: 0, bestRoll: .8 + r() * .4,
      ach: Math.round(Math.pow(r(), .7) * ACH.length), hours: Math.round(rw() * 60 * weekPart * 10) / 10,
      vipXp, vip: vipLv(vipXp), hue: Math.floor(r() * 360), skill, ...botTree(name, skill)
    };
  }).map(b => {   // every practice player owns some characters with their own CS; their best one is their Character CS entry
    b.cs = {}; let best = 0, bc = null;
    chars.forEach(c => { const n = botCharCS(b, c); if (n) { b.cs[c.id] = n; if (n > best) { best = n; bc = c; } } });
    return Object.assign(b, { best: Math.min(b.total, best), char: bc });
  });
}
/* a practice player's Great Tree progress: highest floor cleared (0–10) and stars there, seeded so it never changes */
function botTree(name, skill) {
  const r = seeded('ranktree:' + name), n = (typeof CC_TOWER !== 'undefined' && CC_TOWER.stages.length) || 10;
  const tree = Math.max(0, Math.min(n, Math.round((.15 + skill * .95) * n * (.55 + r() * .6))));
  return { tree, treeSt: tree ? Math.min(tree * 3, Math.round(tree * (1.2 + r() * 1.7))) : 0 };
}
/* a practice player's CS for one character (0 = they don't own it); seeded so it never changes */
function botCharCS(b, c) {
  const r = seeded('rankc:' + b.name + ':' + c.id), ur = +c.rarity === 5;
  if (r() > (ur ? .5 : .7)) return 0;
  const roll = Math.pow(r(), 1.5) * (.55 + b.skill * .9);
  return Math.round(ur ? 2000 + roll * 46000 : 1000 + roll * 27000);
}
const rankChars = () => S.pool.filter(e => e.type === 'character' && !e.mc);
/* the leaderboard for one character: everyone who owns it, by that character's CS; you're in it when you own it */
function charBoard(cid) {
  const c = findEntry(cid); if (!c) return [];
  const list = rankBots().filter(b => b.cs[cid]).map(b => ({ ...b, best: b.cs[cid], char: c }));
  if (owns(cid)) list.push({ ...rankMe(), best: charScore(c), char: c });
  return list.sort((a, b) => b.best - a.best || (a.me ? -1 : 1));
}
/* your place on a character's board (null when you don't own it) */
const charRank = cid => { if (!owns(cid)) return null; const i = charBoard(cid).findIndex(p => p.me); return i < 0 ? null : i + 1; };
function rankMe() {
  const chars = ownedOf('character');
  let best = null, bestN = 0; chars.forEach(e => { const n = charScore(e); if (n > bestN) { bestN = n; best = e; } });
  const vx = vipState().xp;
  return { me: true, name: S.player.name, uid: S.profile.uid, lv: playerLv().lv, total: chars.reduce((t, e) => t + charScore(e), 0), best: bestN, char: best,
    ach: S.ach.length, hours: Math.round(playHours() * 10) / 10, vipXp: vx, vip: vipLv(vx),
    tree: typeof ccTowerTop === 'function' ? ccTowerTop() : 0, treeSt: typeof CC_TOWER !== 'undefined' ? CC_TOWER.stages.reduce((t, st) => t + ccCampN(st.id), 0) : 0 };
}
const RANK_TABS = [
  { id: 'total', label: 'Total CS', ic: 'trophy', col: '#c8a2ff', val: p => p.total, show: p => fmt(p.total), unit: 'Total CS', note: 'Every owned character\'s CS added up.', rew: 'Top 3: a title + namecard' },
  { id: 'char', label: 'Character CS', ic: 'star', col: '#ff9fd8', val: p => p.best, show: p => fmt(p.best), unit: 'CS', note: 'Each player\'s best character, or one character\'s own leaderboard: choose it with the character button.', rew: 'Top 3: a title + namecard' },
  { id: 'ach', label: 'Achievements', ic: 'medal', col: '#ffd36b', val: p => p.ach, show: p => `${p.ach} / ${ACH.length}`, unit: 'Achievements', note: 'Achievements completed.', rew: 'Top 3: a title + namecard' },
  { id: 'hours', label: 'Hours this week', ic: 'clock', col: '#8fd3ff', val: p => p.hours, show: p => `${p.hours.toFixed(1)} h`, unit: 'Played', note: 'Time with the game open, since Monday 00:00. Resets every week.', rew: 'Top 10: pearls' },
  { id: 'vip', label: 'VIP', ic: 'crown', col: '#ffcf6b', val: p => p.vipXp, show: p => fmt(p.vipXp), unit: 'VIP EXP', note: 'VIP level, then VIP EXP.', rew: 'Top 3: a title + namecard' },
  { id: 'tree', label: 'Great Tree', ic: 'tree', col: '#8ef0a8', val: p => p.tree * 100 + p.treeSt, show: p => p.tree ? `Floor ${p.tree}` : '—', unit: 'Highest floor', note: 'The highest floor of the Great Tree cleared (more stars there break a tie). Just for glory: this board gives no rewards.', rew: 'No rewards', norew: true }
];
/* ---- the Ranking page (a full glass page since the owner asked for it to be an entire, more organised page; root
   .rkx on the Raids page's layout .rdx): the boards as a rail of cards on the left (your place and the board's reward on
   each), the chosen board's hero block (and, on Character CS, a character button that opens a small picker with the round
   icon of every character in the game), a podium for the top 3, the list from 4th to 50th and your own row pinned under
   it. Esc closes the picker, then the page. ---- */
let rankTab = 'total', rankChar = 'best', rkEl = null, rkPick = false, rkPF = 'all', rkPQ = '';
function openRanking(tab, cid) {
  if (tab) rankTab = tab; if (cid) rankChar = cid;
  if (!RANK_TABS.some(t => t.id === rankTab)) rankTab = 'total';
  closeModal(); rkPick = false; rkPQ = '';
  if (!rkEl) { rkEl = document.createElement('div'); rkEl.className = 'rkx rdx'; rkEl.setAttribute('role', 'dialog'); rkEl.setAttribute('aria-label', 'Ranking'); document.body.appendChild(rkEl); }
  renderRanking();
}
function closeRanking() { if (rkEl) { rkEl.remove(); rkEl = null; } rkPick = false; }
addEventListener('keydown', e => { if (!rkEl || e.key !== 'Escape' || document.querySelector('.modal-back,.rewpop')) return; e.stopPropagation(); if (rkPick) { rkPick = false; renderRanking(); } else closeRanking(); }, true);
const rkAv = (p, n) => p.me ? `<span class="rk-av">${avatarHTML(n)}</span>` : `<span class="rk-av bot" style="--h:${p.hue};--s:${n}px">${esc(p.name[0])}</span>`;
const rkVipName = p => `<b class="vipn vn-${p.vip ? vipGrade(p.vip).toLowerCase() : '0'}">${esc(p.name)}</b>`;
function rkBoard(T) {
  const one = T.id === 'char' && rankChar !== 'best' && findEntry(rankChar);
  const list = one ? charBoard(rankChar) : [...rankBots(), rankMe()].sort((a, b) => T.val(b) - T.val(a) || (a.me ? -1 : b.me ? 1 : 0));
  return { one, list };
}
function rkPickHTML() {
  const L = rankChars().filter(c => (rkPF === 'all' || (rkPF === 'own' ? owns(c.id) : +c.rarity === +rkPF)) && (!rkPQ || c.name.toLowerCase().includes(rkPQ.toLowerCase())))
    .sort((a, b) => b.rarity - a.rarity || (owns(b.id) - owns(a.id)) || a.name.localeCompare(b.name));
  const f = (k, l) => `<button class="rkx-pf ${rkPF === k ? 'on' : ''}" data-rkpf="${k}">${l}</button>`;
  return `<div class="rkx-pickback" id="rkPickBack"><div class="rkx-pickbox" role="dialog" aria-label="Choose a character">
      <div class="rkx-pickh"><span class="rdx-iti">${icon('star')}</span><div><b>Choose a character</b><small>Every character in the game · its own Character CS leaderboard</small></div><button class="inv-x" id="rkPickX" aria-label="Close">${icon('close')}</button></div>
      <div class="rkx-pickf">${f('all', 'All')}${f('own', 'Owned')}${f('5', 'UR')}${f('4', 'SSR')}<input class="input sm rkx-pq" id="rkPQ" placeholder="Search a name" value="${esc(rkPQ)}" maxlength="24"></div>
      <div class="rkx-pgrid">
        ${!rkPQ && rkPF === 'all' ? `<button class="rkx-pc0 ${rankChar === 'best' ? 'on' : ''}" data-rkc="best"><span class="rkx-pring best">${icon('trophy')}</span><b>Best character</b><small>Everyone's best</small></button>` : ''}
        ${L.map(c => { const rk = charRank(c.id); return `<button class="rkx-pc0 ${rankChar === c.id ? 'on' : ''} ${owns(c.id) ? 'own' : 'no'}" data-rkc="${esc(c.id)}" title="${esc(c.name)}"><span class="rkx-pring r${c.rarity}">${thumbImg(c, 'rkx-pimg')}${rk && rk <= 10 ? `<i>#${rk}</i>` : ''}</span><b>${esc(c.name)}</b><small>${owns(c.id) ? `${rtag(c.rarity)} Owned` : rtag(c.rarity) + ' Not owned'}</small></button>`; }).join('') || '<p class="tiny">No character matches.</p>'}
      </div></div></div>`;
}
function renderRanking() {
  if (!rkEl) return;
  const T = RANK_TABS.find(t => t.id === rankTab) || RANK_TABS[0], { one, list } = rkBoard(T);
  const myRank = list.findIndex(p => p.me) + 1, me = myRank ? list[myRank - 1] : null;
  const keep = rkEl.querySelector('.rdx-scroll'), top = keep && keep.dataset.k === T.id + rankChar ? keep.scrollTop : 0;
  const stand = rankStandings(false), myPlace = id => { const i = stand[id].indexOf('@me'); return i >= 0 ? i + 1 : null; };
  const w = wallpaperInfo(), art = w && wpHasArt(w) ? wpSrc(w) : '';
  const row = (p, i) => `<div class="rk-row ${p.me ? 'me' : ''} ${i < 3 ? 'top top' + (i + 1) : i < 10 ? 'top10' : ''}">
    <span class="rk-n">${i < 10 ? `<i><b>${i + 1}</b></i>` : i + 1}</span>${rkAv(p, 44)}
    <span class="rk-who"><span class="rk-nm">${rankGuildTag(p)}${rkVipName(p)}${p.me ? '<small>(you)</small>' : ''}${rankTitleOf(p)}</span><small>Lv ${p.lv} · UID ${p.uid}</small></span>
    ${T.id === 'char' ? `<span class="rk-char">${p.char ? `${thumbImg(p.char, 'rk-cimg')}<span><b>${esc(p.char.name)}</b>${gradeTag(csGrade(p.best))}</span>` : '<small>No character yet</small>'}</span>` : T.id === 'tree' ? `<span class="rk-char rkx-tr">${p.tree ? `${icon('tree')}<span><b>Floor ${p.tree}</b><small>${p.treeSt} ★</small></span>` : '<small>Not climbed yet</small>'}</span>` : '<span></span>'}
    <span class="rk-val">${T.id === 'vip' ? vipBadge(p.vip, 'sm') : ''}<b>${T.show(p)}</b><small>${T.unit}</small></span></div>`;
  const pod = (p, i) => !p ? `<div class="rkx-pod p${i + 1} empty"><span class="rkx-pmed">${i + 1}</span><small>No one yet</small></div>` : `<div class="rkx-pod p${i + 1} ${p.me ? 'me' : ''}">
      <span class="rkx-pmed"><b>${i + 1}</b></span>
      <span class="rkx-pav">${rkAv(p, i ? 62 : 78)}</span>
      <span class="rkx-pnm">${rankGuildTag(p)}${rkVipName(p)}${p.me ? '<small>(you)</small>' : ''}</span>
      <span class="rkx-pttl">${rankTitleOf(p)}</span>
      ${T.id === 'char' && p.char ? `<span class="rkx-pch">${thumbImg(p.char, 'rk-cimg')}<b>${esc(p.char.name)}</b>${gradeTag(csGrade(p.best))}</span>` : ''}
      <span class="rkx-pval">${T.id === 'vip' ? vipBadge(p.vip, 'sm') : ''}<b>${T.show(p)}</b><small>${T.unit}${T.id === 'tree' && p.tree ? ` · ${p.treeSt} ★` : ''}</small></span>
      <span class="rkx-pstep"></span></div>`;
  const it = t => { const pl = myPlace(t.id); return `<button class="rdx-it rkx-it ${t.id === T.id ? 'on' : ''}" data-rktab="${t.id}" style="--bc:${t.col}"><span class="rdx-iti">${icon(t.ic)}</span><span class="rdx-itt"><b>${t.label}</b><small>${pl ? `You: #${pl}` : 'Not ranked'} · ${t.rew}</small></span></button>`; };
  const chosen = one ? `${thumbImg(one, 'rkx-cbi')}<span><small>Character</small><b>${esc(one.name)}</b></span>` : `<span class="rkx-cbt">${icon('trophy')}</span><span><small>Character</small><b>Best character</b></span>`;
  const rewTxt = T.norew ? 'No rewards · just for glory' : T.id === 'hours' ? 'Top 10 get pearls: 1st 30 · 2nd 20 · 3rd 15 · 4th–10th 10' : 'Top 3 get a title + namecard for 7 days';
  rkEl.innerHTML = `<div class="rdx-bg ${art ? 'art' : ''}">${art ? `<img class="rkx-bgart" src="${art}" alt="">` : ''}<i class="rkx-g g1"></i><i class="rkx-g g2"></i><i class="rkx-g g3"></i></div><div class="rdx-shade"></div>
    <header class="rdx-head"><div class="inv-title"><span class="inv-badge">${icon('trophy')}</span><h2 class="ts">Ranking</h2></div>${infoBtn('rank', 'How the weekly rewards work')}
      <span class="rdx-sp"></span>
      <span class="rdx-ward rkx-reset" title="The weekly boards are settled on Monday 00:00">${icon('clock')}<small>Weekly rewards in</small><b>${rankResetTxt()}</b></span>
      <button class="inv-x" id="rkClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="rdx-rail"><span class="rdx-gh">${icon('trophy')}Weekly boards</span>${RANK_TABS.filter(t => !t.norew).map(it).join('')}
      <span class="rdx-gh">${icon('tree')}All-time · no rewards</span>${RANK_TABS.filter(t => t.norew).map(it).join('')}</aside>
    <section class="rdx-main rkx-main" style="--bc:${T.col}">
      <div class="rdx-scroll" data-k="${esc(T.id + rankChar)}">
        <div class="rdx-hero rkx-hero"><span class="rdx-kind">${icon(T.ic)}${T.norew ? 'All-time board' : 'Weekly board'}</span>
          <h1 class="rdx-title">${T.label}${one ? ` <em>${esc(one.name)}</em>` : ''}</h1>
          <p class="rdx-desc">${one ? `${esc(one.name)}: everyone who owns this character, by its CS.` : T.note} ${Backend.on ? '' : 'Offline: the other players are practice players.'}</p>
          <div class="rdx-meta"><span class="${T.norew ? 'rkx-norew' : ''}">${icon(T.norew ? 'tree' : 'gift')}${rewTxt}</span><span>${icon('chars')}${list.length} players</span><span>${icon('star')}Your place ${myRank ? '#' + myRank : '—'}</span>
            ${T.id === 'char' ? `<button class="rkx-cbtn" id="rkPickBtn" aria-haspopup="dialog">${chosen}<span class="rkx-cbc">${icon('grid')}Choose</span></button>` : ''}</div></div>
        ${list.length ? `<div class="rkx-pods">${[1, 0, 2].map(i => pod(list[i], i)).join('')}</div>` : ''}
        <div class="rkx-list">${list.slice(3, 50).map((p, k) => row(p, k + 3)).join('') || (list.length ? '' : `<p class="tiny rk-note">Nobody owns ${one ? esc(one.name) : 'this character'} yet.</p>`)}</div>
      </div>
      <div class="rkx-mine">${me ? row(me, myRank - 1) : `<p class="tiny rk-note">You don't own ${one ? esc(one.name) : 'this character'} yet${one ? '' : ''}.</p>`}</div>
    </section>
    ${rkPick ? rkPickHTML() : ''}`;
  const sc = rkEl.querySelector('.rdx-scroll'); if (sc && top) sc.scrollTop = top;
  const rl = rkEl.querySelector('.rdx-rail'), on = rl && rl.querySelector('.rdx-it.on'); if (on && rl.scrollWidth > rl.clientWidth + 2) rl.scrollLeft = Math.max(0, on.offsetLeft - (rl.clientWidth - on.offsetWidth) / 2);
  rkEl.querySelector('#rkClose').onclick = closeRanking;
  rkEl.querySelectorAll('[data-rktab]').forEach(b => b.onclick = () => { rankTab = b.dataset.rktab; renderRanking(); });
  const pb = rkEl.querySelector('#rkPickBtn'); if (pb) pb.onclick = () => { rkPick = true; renderRanking(); const q = rkEl.querySelector('#rkPQ'); if (q && matchMedia('(pointer:fine)').matches) q.focus(); };
  if (rkPick) {
    const back = rkEl.querySelector('#rkPickBack');
    back.onclick = e => { if (e.target === back) { rkPick = false; renderRanking(); } };
    rkEl.querySelector('#rkPickX').onclick = () => { rkPick = false; renderRanking(); };
    rkEl.querySelectorAll('[data-rkpf]').forEach(b => b.onclick = () => { rkPF = b.dataset.rkpf; renderRanking(); });
    const q = rkEl.querySelector('#rkPQ'); q.oninput = () => { rkPQ = q.value; const g = rkEl.querySelector('.rkx-pgrid'); const tmp = document.createElement('div'); tmp.innerHTML = rkPickHTML(); g.replaceWith(tmp.querySelector('.rkx-pgrid')); bindPick(); };
    const bindPick = () => rkEl.querySelectorAll('[data-rkc]').forEach(b => b.onclick = () => { rankChar = b.dataset.rkc; rkPick = false; renderRanking(); });
    bindPick();
  }
}
if (!ICONS.clock) ICONS.clock = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';

/* ---------- weekly ranking rewards ----------
   Every Monday 00:00 local the week's boards are settled (rankSettle, called from renderMenu): the top 3 of Total CS,
   Character CS (best character), Achievements and VIP get that board's title and namecard for the new week (7 days;
   gold / silver / bronze by place); next week's result replaces them. Hours played gives pearls instead: 1st 30, 2nd 20,
   3rd 15, 4th–10th 10. Results arrive as a Mail letter (pearls as its attachment). State S.rankRew {wk: the week the
   rewards are worn, places: {total, char, ach, vip, hours}}; S.playLast keeps last week's play time. The first week only
   starts the cycle. */
const RANK_REW_BOARDS = [['total', 'Power', 'Total CS'], ['char', 'Heroes', 'Character CS'], ['ach', 'Glory', 'Achievements'], ['vip', 'Fortune', 'VIP']];
const RANK_PLACE = ['', 'Champion', 'Vanguard', 'Challenger'], RANK_METAL = ['', 'Gold', 'Silver', 'Bronze'], RANK_ORD = ['', '1st', '2nd', '3rd'];
const RANK_HOURS_PEARLS = p => p === 1 ? 30 : p === 2 ? 20 : p === 3 ? 15 : p && p <= 10 ? 10 : 0;
const rankHas = (b, p) => !!S.rankRew && S.rankRew.wk === playWeek() && (S.rankRew.places || {})[b] === p;
/* three titles only, one per place: held while you are that place in any ranking (Total CS, Character CS, Achievements, VIP) */
const rankHasPlace = p => RANK_REW_BOARDS.some(([b]) => rankHas(b, p));
[1, 2, 3].forEach(p => {
  UNLOCK['rkt' + p] = [() => rankHasPlace(p), `Finish ${RANK_ORD[p]} in a weekly ranking (worn for 7 days)`];
  TITLES.push({ id: 'rk-' + p, name: RANK_PLACE[p], cls: `t-rk${p}`, need: 'rkt' + p, rank: true });
});
const rankTitle = p => TITLES.find(t => t.id === 'rk-' + p);
/* three namecards only, one per place, held like the titles: be that place in any ranking (rk-1 / rk-2 / rk-3; older per-board ids map to these in cardBG) */
[1, 2, 3].forEach(p => CARDS.push({ id: 'rk-' + p, name: `${RANK_PLACE[p]} Crest · ${RANK_METAL[p]}`, cls: `nc-rk nc-rkp${p}`, need: 'rkt' + p, premium: p === 1 }));
const rankResetTxt = () => { const s = Math.max(0, weekStart().getTime() + 7 * 864e5 - Date.now()) / 1000, d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600); return d ? `${d}d ${h}h` : `${h}h ${Math.floor(s % 3600 / 60)}m`; };
const prevWeekKey = () => { const m = weekStart(); return dayKey(new Date(m.getFullYear(), m.getMonth(), m.getDate() - 7)); };
/* everyone's order on every board (names; you are '@me'). past = use last week's hours (settling), else this week's */
function rankStandings(past) {
  const bots = past ? rankBots(prevWeekKey(), 1) : rankBots(), me = rankMe();
  if (past) me.hours = S.playLast && S.playLast.wk === prevWeekKey() ? Math.round(S.playLast.ms / 3.6e5) / 10 : 0;
  const out = {};
  RANK_TABS.forEach(T => { out[T.id] = [...bots, me].sort((a, b) => T.val(b) - T.val(a) || (a.me ? -1 : b.me ? 1 : 0)).map(p => p.me ? '@me' : p.name); });
  return out;
}
/* the title a ranking row shows: yours, or a practice player's ranking title (their top-3 place this week), else a plain seeded one */
let rankStandCache = null;
function rankTitleOf(p) {
  if (p.me) return titleHTML(titleOf());
  if (!rankStandCache || rankStandCache.wk !== playWeek()) rankStandCache = { wk: playWeek(), s: rankStandings(false) };
  const best = Math.min(...RANK_REW_BOARDS.map(([b]) => { const i = rankStandCache.s[b].indexOf(p.name); return i >= 0 && i < 3 ? i + 1 : 9; }));
  if (best <= 3) return titleHTML(rankTitle(best));
  const base = TITLES.filter(t => !t.rank && !t.vip && t.need !== 'mbtitle');
  return titleHTML(base[Math.floor(seeded('rankttl:' + p.name)() * base.length)]);
}
function rankSettle(force) {
  const wk = playWeek(), st = S.rankRew;
  if (!force && st && st.wk === wk) return;
  if (!force && !st) { S.rankRew = { wk, places: {} }; persist(); return; }   // first week: just start the cycle
  const stand = rankStandings(!force), places = {};
  RANK_TABS.forEach(T => { const i = stand[T.id].indexOf('@me'); places[T.id] = i >= 0 ? i + 1 : null; });
  S.rankRew = { wk, places };
  const got = [...new Set(RANK_REW_BOARDS.map(([b]) => places[b]).filter(p => p && p <= 3))].sort();
  const won = RANK_REW_BOARDS.filter(([b]) => places[b] && places[b] <= 3).map(([b, , label]) => `${label}: ${RANK_ORD[places[b]]}`);
  got.forEach(p => won.push(`Title "${RANK_PLACE[p]}" and namecard "${RANK_PLACE[p]} Crest · ${RANK_METAL[p]}" (${RANK_ORD[p]} place)`));
  const pearls = RANK_HOURS_PEARLS(places.hours);
  sendMail({ id: 'rank-' + wk + (force ? '-' + Date.now().toString(36) : ''), from: 'Ranking', title: 'Weekly ranking results',
    body: `Your places: ${RANK_TABS.map(T => `${T.label} #${places[T.id] || '-'}`).join(' · ')}.\n${won.length ? `Yours to wear for the next 7 days (equip them in Profile settings):\n${won.join('\n')}` : 'No title or namecard this week. Reach the top 3 of a ranking to earn one.'}${pearls ? `\nHours played #${places.hours}: ${pearls} pearls attached.` : ''}`,
    reward: pearls ? { pearls } : null });
  persist();
  if (force) toast(`Rankings settled: ${won.length ? won.length + ' reward' + (won.length === 1 ? '' : 's') : 'no title or namecard'}${pearls ? `, ${pearls} pearls` : ''}. Check your Mail.`);
}
INFO.rank = () => ({ title: 'Weekly ranking rewards', body: `<div class="stack"><p class="desc">Every Monday at 00:00 the rankings are settled and a letter with your results arrives in your Mail.</p>
  <p class="desc"><b>Total CS, Character CS, Achievements and VIP:</b> the top 3 receive a title for their place (Champion for 1st, Vanguard for 2nd, Challenger for 3rd; your best place counts) and that ranking's namecard (gold, silver or bronze). They last 7 days; next week's result replaces them.</p>
  <p class="desc"><b>Hours this week:</b> pearls instead: 1st 30, 2nd 20, 3rd 15, 4th to 10th 10.</p>
  <div class="rk-rewlist"><div><span class="lbl-sm">Titles</span>${[1, 2, 3].map(p => titleHTML(rankTitle(p))).join('')}</div></div></div>` });
