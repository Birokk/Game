/* ---------- Ranking (home Ranking icon → openRanking) ----------
   Leaderboards, one tab each (RANK_TABS): highest Total CS, highest character CS, most achievements, most hours played
   this week, highest VIP level (and its VIP EXP). There is no server leaderboard yet, so the other players are practice
   players made up from a fixed seed (rankBots; the hours tab changes every week); the player's own row uses real data.
   Play time: S.playtime {wk: Monday's dayKey, ms} counts time with the game open and visible (resets every Monday).
   Also here: st6(e), the class that gives a 6★ character's card / avatar the animated prism border of 3★ memories. */
const st6 = e => e && e.type === 'character' && owns(e.id) && starsOf(e.id) >= MAX_STARS ? `st6 st6-r${+e.rarity === 5 ? 5 : 4}` : '';   // SSR gets the orange version

/* play time this week */
const playWeek = () => dayKey(weekStart());
const playState = () => { const wk = playWeek(); if (!S.playtime || S.playtime.wk !== wk) S.playtime = { wk, ms: 0 }; return S.playtime; };
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
function rankBots() {
  const chars = S.pool.filter(e => e.type === 'character' && !e.mc), wk = playWeek();
  const weekPart = Math.min(1, (Date.now() - weekStart().getTime()) / (7 * 864e5));
  return RANK_NAMES.map((name, i) => {
    const r = seeded('rank:' + name), rw = seeded('rankwk:' + name + wk), skill = Math.pow(r(), 1.8);
    const vipXp = Math.round(Math.pow(r(), 3.2) * 700000), ch = chars.length ? chars[Math.floor(r() * chars.length)] : null;
    return {
      bot: true, name, uid: 100000 + Math.floor(r() * 899999), lv: 5 + Math.floor(skill * 55),
      total: Math.round(4000 + skill * 380000), char: ch,
      best: 0, bestRoll: .8 + r() * .4,
      ach: Math.round(Math.pow(r(), .7) * ACH.length), hours: Math.round(rw() * 60 * weekPart * 10) / 10,
      vipXp, vip: vipLv(vipXp), hue: Math.floor(r() * 360), skill
    };
  }).map(b => {   // every practice player owns some characters with their own CS; their best one is their Character CS entry
    b.cs = {}; let best = 0, bc = null;
    chars.forEach(c => { const n = botCharCS(b, c); if (n) { b.cs[c.id] = n; if (n > best) { best = n; bc = c; } } });
    return Object.assign(b, { best: Math.min(b.total, best), char: bc });
  });
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
    ach: S.ach.length, hours: Math.round(playHours() * 10) / 10, vipXp: vx, vip: vipLv(vx) };
}
const RANK_TABS = [
  { id: 'total', label: 'Total CS', ic: 'trophy', val: p => p.total, show: p => fmt(p.total), unit: 'Total CS', note: 'Every owned character\'s CS added up.' },
  { id: 'char', label: 'Character CS', ic: 'star', val: p => p.best, show: p => fmt(p.best), unit: 'CS', note: 'Each player\'s best character. Pick a character above to see its own leaderboard.' },
  { id: 'ach', label: 'Achievements', ic: 'trophy', val: p => p.ach, show: p => `${p.ach} / ${ACH.length}`, unit: 'Achievements', note: 'Achievements completed.' },
  { id: 'hours', label: 'Hours this week', ic: 'clock', val: p => p.hours, show: p => `${p.hours.toFixed(1)} h`, unit: 'Played', note: 'Time with the game open, since Monday 00:00. Resets every week.' },
  { id: 'vip', label: 'VIP', ic: 'crown', val: p => p.vipXp, show: p => fmt(p.vipXp), unit: 'VIP EXP', note: 'VIP level, then VIP EXP.' }
];
let rankTab = 'total', rankChar = 'best';
function openRanking(tab, cid) { if (tab) rankTab = tab; if (cid) rankChar = cid; openModal({ title: 'Ranking', ic: 'trophy', wide: true, kind: 'ranking', body: '<div id="rkRoot"></div>', onMount: () => renderRanking() }); }
function renderRanking() {
  const root = $('#rkRoot'); if (!root) return;
  const T = RANK_TABS.find(t => t.id === rankTab) || RANK_TABS[0];
  const one = T.id === 'char' && rankChar !== 'best' && findEntry(rankChar);
  const list = one ? charBoard(rankChar) : [...rankBots(), rankMe()].sort((a, b) => T.val(b) - T.val(a) || (a.me ? -1 : b.me ? 1 : 0));
  const myRank = list.findIndex(p => p.me) + 1, me = myRank ? list[myRank - 1] : null;
  // Character CS: pick "Best character" or one character's own leaderboard
  const sub = T.id === 'char' ? `<div class="rk-sub" id="rkSub"><button class="rk-chip ${!one ? 'on' : ''}" data-rkc="best"><span class="rk-chip-ic">${icon('trophy')}</span><b>Best character</b></button>${rankChars().map(c => `<button class="rk-chip ${one && c.id === rankChar ? 'on' : ''} ${owns(c.id) ? 'own' : ''}" data-rkc="${esc(c.id)}">${thumbImg(c, 'rk-chip-img')}<b>${esc(c.name)}</b>${charRank(c.id) && charRank(c.id) <= 10 ? `<small>#${charRank(c.id)}</small>` : ''}</button>`).join('')}</div>` : '';
  const av = p => p.me ? `<span class="rk-av">${avatarHTML(44)}</span>` : `<span class="rk-av bot" style="--h:${p.hue}">${esc(p.name[0])}</span>`;
  const row = (p, i) => `<div class="rk-row ${p.me ? 'me' : ''} ${i < 3 ? 'top top' + (i + 1) : i < 10 ? 'top10' : ''}">
    <span class="rk-n">${i < 10 ? `<i><b>${i + 1}</b></i>` : i + 1}</span>${av(p)}
    <span class="rk-who"><b>${esc(p.name)}${p.me ? ' <small>(you)</small>' : ''}</b><small>Lv ${p.lv} · UID ${p.uid}</small></span>
    ${T.id === 'char' ? `<span class="rk-char">${p.char ? `${thumbImg(p.char, 'rk-cimg')}<span><b>${esc(p.char.name)}</b>${gradeTag(csGrade(p.best))}</span>` : '<small>No character yet</small>'}</span>` : '<span></span>'}
    <span class="rk-val">${T.id === 'vip' ? vipBadge(p.vip, 'sm') : ''}<b>${T.show(p)}</b><small>${T.unit}</small></span></div>`;
  root.innerHTML = `<div class="rk">
    <div class="dq-tabs rk-tabs" role="tablist">${RANK_TABS.map(t => `<button class="dq-tab ${t.id === T.id ? 'on' : ''}" role="tab" aria-selected="${t.id === T.id}" data-rktab="${t.id}">${t.label}</button>`).join('')}</div>
    ${sub}
    <p class="tiny rk-note">${one ? `${esc(one.name)}: everyone who owns this character, by its CS.` : T.note} ${Backend.on ? '' : 'Offline: the other players are practice players.'}</p>
    <div class="rk-list">${list.slice(0, 50).map(row).join('') || '<p class="tiny rk-note">Nobody owns this character yet.</p>'}</div>
    <div class="rk-mine">${me ? row(me, myRank - 1) : `<p class="tiny rk-note">You don't own ${one ? esc(one.name) : 'this character'} yet.</p>`}</div>
  </div>`;
  root.querySelectorAll('[data-rkc]').forEach(b => b.onclick = () => { rankChar = b.dataset.rkc; const x = $('#rkSub') ? $('#rkSub').scrollLeft : 0; renderRanking(); if ($('#rkSub')) $('#rkSub').scrollLeft = x; });
  const on = root.querySelector('.rk-chip.on'); if (on && $('#rkSub') && !$('#rkSub').dataset.kept) { on.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  root.querySelectorAll('[data-rktab]').forEach(b => b.onclick = () => { rankTab = b.dataset.rktab; renderRanking(); });
}
if (!ICONS.clock) ICONS.clock = '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>';
