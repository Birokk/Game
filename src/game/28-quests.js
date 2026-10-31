/* ---------- daily and weekly quests: finish quests for points, claim rewards at 20 / 40 / 60 / 80 / 100 points ----------
   Two tabs with the same design. Daily resets at local midnight (S.quests), weekly on Monday 00:00 local (S.wquests).
   State {day, p: {questId: progress}, done: [claimed quest ids], ms: [claimed milestones]} (weekly also keeps
   days: [dayKeys logged in]). Progress comes from questAdd(id, n) hooks in the features (gifts, stamina, summons,
   fountains, gold, raids, the Base); it counts for both tabs. Logging in completes itself. */
const QUESTS = [
  { id: 'login', name: 'Log into the game', need: 1, pts: 10 },
  { id: 'gift', name: 'Send a gift once', need: 1, pts: 20, go: 'characters' },
  { id: 'stamina', name: 'Spend a total of 160 stamina', need: 160, pts: 20, go: 'raids' },
  { id: 'summon', name: 'Summon on a character banner once', need: 1, pts: 20, go: 'summon' },
  { id: 'fountain', name: 'Make a wish at a fountain', need: 1, pts: 10, go: 'farm' },
  { id: 'gold', name: 'Spend a total of 10,000 gold', need: 10000, pts: 20, go: 'farm' },
  { id: 'raid', name: 'Clear a raid once', need: 1, pts: 20, go: 'raids' },
  { id: 'base', name: 'Collect resources at the Base', need: 1, pts: 10, go: 'farm' }
];
ICONS.shell = '<path d="M12 20.5L4 9.6Q4.3 6.9 6.5 6.1Q7.4 4.1 9.2 4.1Q10.4 2.7 12 3.4Q13.6 2.7 14.8 4.1Q16.6 4.1 17.5 6.1Q19.7 6.9 20 9.6Z"/><path d="M12 20.5L6.5 6.1M12 20.5L9.2 4.1M12 20.5V3.4M12 20.5l2.8-16.4M12 20.5l5.5-14.4"/><path d="M9.6 19.6L8.4 21.4h7.2l-1.2-1.8"/>';
const QUEST_MAX = 100, QUEST_MS = [20, 40, 60, 80, 100];
const QUEST_CHAR_BANNERS = ['limited', 'weekly', 'standard'];   // "character banner" summons
const WQUESTS = [
  { id: 'login', name: 'Log in on 5 days', need: 5, pts: 20 },
  { id: 'gift', name: 'Send 10 gifts', need: 10, pts: 20, go: 'characters' },
  { id: 'stamina', name: 'Spend a total of 666 stamina', need: 666, pts: 20, go: 'raids' },
  { id: 'summon', name: 'Summon 20 times on a character banner', need: 20, pts: 20, go: 'summon' },
  { id: 'fountain', name: 'Make a wish at a fountain 5 times', need: 5, pts: 10, go: 'farm' },
  { id: 'gold', name: 'Spend a total of 50,000 gold', need: 50000, pts: 20, go: 'farm' },
  { id: 'raid', name: 'Clear a raid 20 times', need: 20, pts: 20, go: 'raids' }
];
/* daily milestones: 1 pearl, 2,000 gold, 100 EXP; 60 adds a Standard ticket, 100 a Limited ticket.
   weekly: 2 pearls, 2,000 gold, 100 EXP; 60 adds 5 Standard tickets, 100 adds 5 Limited tickets */
function questReward(m, set = 'daily') {
  const w = set === 'weekly', r = [['pearls', w ? 2 : 1], ['coins', 2000], ['exp', 100]];
  if (m === 60) r.push(['wishes', w ? 5 : 1]);
  if (m === 100) r.push(['tickets', w ? 5 : 1]);
  return r;
}
CUR_SVG.qpt = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="qptG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff4c4"/><stop offset=".55" stop-color="#ffcf4f"/><stop offset="1" stop-color="#d99a1c"/></radialGradient></defs><circle cx="12" cy="12" r="10" fill="url(#qptG)" stroke="#fff1c2" stroke-width="1.4"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#4a2a00" stroke-width="1" opacity=".3"/><path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#4a2a00" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const Q_NAMES = { coins: 'gold', pearls: 'pearl', exp: 'EXP', tickets: 'Limited ticket', wishes: 'Standard ticket' };
const qName = (k, n) => (Q_NAMES[k] || k) + (n > 1 && !['coins', 'exp'].includes(k) ? 's' : '');

/* the Monday (local) that starts this week */
const weekStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
/* today's / this week's quest state; a new day or week starts fresh, and every day you play counts as logging in */
function qState(set = 'daily') {
  const d = dayKey();
  if (set === 'weekly') {
    const w = dayKey(weekStart());
    if (!S.wquests || S.wquests.day !== w) S.wquests = { day: w, days: [], p: {}, done: [], ms: [] };
    const st = S.wquests; if (!st.days.includes(d)) st.days.push(d);
    st.p.login = Math.min(5, st.days.length); return st;
  }
  if (!S.quests || S.quests.day !== d) S.quests = { day: d, p: { login: 1 }, done: [], ms: [] };
  return S.quests;
}
const Q_SETS = { daily: { list: QUESTS, title: 'Daily', next: () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); } },
  weekly: { list: WQUESTS, title: 'Weekly', next: () => { const m = weekStart(); return new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7); } } };
function questAdd(id, n = 1) {
  if (!(n > 0)) return;
  for (const set of Object.keys(Q_SETS)) { const q = Q_SETS[set].list.find(x => x.id === id); if (!q) continue;
    const st = qState(set); st.p[id] = Math.min(q.need, (st.p[id] || 0) + n); }
}
const qProg = (q, set = 'daily') => Math.min(q.need, qState(set).p[q.id] || 0);
const qDone = (q, set = 'daily') => qState(set).done.includes(q.id);
const qCan = (q, set = 'daily') => !qDone(q, set) && qProg(q, set) >= q.need;
const qPts = (set = 'daily') => Math.min(QUEST_MAX, Q_SETS[set].list.filter(q => qDone(q, set)).reduce((s, q) => s + q.pts, 0));
const qmCan = (m, set = 'daily') => qPts(set) >= m && !qState(set).ms.includes(m);
const qSetReady = set => Q_SETS[set].list.some(q => qCan(q, set)) || QUEST_MS.some(m => qmCan(m, set));
const questReady = () => qSetReady('daily') || qSetReady('weekly');

/* spending gold anywhere counts: watch every drop of S.wallet.coins (after boot, so loading doesn't count) */
(() => {
  const w = S.wallet; let v = w.coins || 0;
  Object.defineProperty(w, 'coins', { enumerable: true, configurable: true, get: () => v,
    set: x => { if (booted && x < v) questAdd('gold', v - x); v = x; } });
})();

/* claim finished quests (their points) and reached milestones (their rewards) */
function claimQuests(ids = [], ms = [], set = qTab) {
  const st = qState(set), got = {};
  let pts = 0;
  ids.forEach(id => { const q = Q_SETS[set].list.find(x => x.id === id); if (q && qCan(q, set)) { st.done.push(q.id); pts += q.pts; } });
  ms.forEach(m => { if (!qmCan(m, set)) return; st.ms.push(m); questReward(m, set).forEach(([k, n]) => { got[k] = (got[k] || 0) + n; }); });
  if (!pts && !Object.keys(got).length) return;
  Object.entries(got).forEach(([k, n]) => { if (k !== 'exp') S.wallet[k] = (S.wallet[k] || 0) + n; });
  if (got.exp) gainExp(got.exp);
  persist(); renderMenu(); refreshSummon(); renderQuests();
  const bits = Object.entries(got).map(([k, n]) => `${fmt(n)} ${qName(k, n)}`);
  toast([pts ? `+${pts} points` : '', bits.length ? 'Claimed ' + bits.join(', ') : ''].filter(Boolean).join(' · ') + '.');
}
const Q_GO = { characters: () => openCharacters(), raids: () => openRaids(), summon: () => openSummon('limited'), farm: () => openFarm() };
function qLeft(set = qTab) { const s = Math.max(0, Q_SETS[set].next() - new Date()) / 1000, d = Math.floor(s / 86400);
  return `${d ? `${d}d ` : ''}${Math.floor(s % 86400 / 3600)}h ${Math.floor(s % 3600 / 60)}m`; }
let qTab = 'daily';

function openQuests(tab) {
  if (Q_SETS[tab]) qTab = tab;
  openModal({ title: 'Quests', ic: 'quests', wide: true, kind: 'quests', body: '<div id="dqRoot"></div>', onMount: () => {
    renderQuests();
    const t = setInterval(() => { const r = $('#dqRoot'); if (!r) { clearInterval(t); return; } if (S.quests.day !== dayKey() || S.wquests.day !== dayKey(weekStart())) renderQuests(); else { const el = $('#dqLeft'); if (el) el.textContent = qLeft(); } }, 30000);
  } });
}
function renderQuests() {
  const root = $('#dqRoot'); if (!root) return;
  const set = qTab, L = Q_SETS[set].list, st = qState(set), pts = qPts(set), keep = root.dataset.tab === set && $('#dqList') ? $('#dqList').scrollLeft : 0;
  root.dataset.tab = set;
  const order = q => qCan(q, set) ? 0 : qDone(q, set) ? 2 : 1;
  const list = L.slice().sort((a, b) => order(a) - order(b));
  const nodes = QUEST_MS.map(m => { const got = st.ms.includes(m), can = qmCan(m, set), rw = questReward(m, set);
    const tip = `<b>${m} points</b><span class="dq-tiprw">${rw.map(([k, n]) => `<i>${curIcon(k)}${fmt(n)} ${qName(k, n)}</i>`).join('')}</span><em class="${got ? 'ok' : ''}">${got ? 'Claimed' : can ? 'Tap to claim' : `Reach ${m} points`}</em>`;
    return `<div class="dq-node ${got ? 'got' : can ? 'can' : ''}" style="--x:${m / QUEST_MAX * 100}%">
      <button class="dq-dot" data-qm="${m}" data-tip="${esc(tip)}" aria-label="${m} points reward${got ? ', claimed' : can ? ', ready to claim' : ''}">${got ? icon('check') : icon('gift')}</button>
      <span class="dq-m">${m}</span></div>`; }).join('');
  const cards = list.map(q => { const p = qProg(q, set), got = qDone(q, set), can = qCan(q, set);
    return `<div class="dq-card ${got ? 'got' : can ? 'can' : ''}">
      <div class="dq-face"><span class="dq-disc">${got ? `<span class="dq-check">${icon('check')}</span>` : icon('shell')}</span>
        <span class="dq-pt">${curIcon('qpt')}+${q.pts}</span>
        <p class="dq-name">${esc(q.name)}</p>
        <b class="dq-prog">${fmt(p)} / ${fmt(q.need)}</b></div>
      ${got ? '<span class="dq-btn done">Fulfilled</span>' : can ? `<button class="dq-btn claim" data-qc="${q.id}">Claim</button>` : q.go ? `<button class="dq-btn go" data-qgo="${q.go}">Go</button>` : '<span class="dq-btn">In progress</span>'}
    </div>`; }).join('');
  const readyQ = L.filter(q => qCan(q, set)).map(q => q.id), readyM = QUEST_MS.filter(m => qmCan(m, set));
  root.innerHTML = `<div class="dq">
    <div class="dq-tabs" role="tablist">${Object.entries(Q_SETS).map(([k, x]) => `<button class="dq-tab ${k === set ? 'on' : ''}" role="tab" aria-selected="${k === set}" data-qtab="${k}">${x.title}${k !== set && qSetReady(k) ? '<span class="dot-n"></span>' : ''}</button>`).join('')}</div>
    <div class="dq-top">
      <div class="dq-pts">${curIcon('qpt')}<div><b>${pts}</b><small>Participation</small></div></div>
      <div class="dq-track"><div class="dq-bar"><i style="width:${pts / QUEST_MAX * 100}%"></i></div>${nodes}</div>
    </div>
    <div class="dq-list" id="dqList">${cards}</div>
    <div class="dq-foot">
      ${readyQ.length || readyM.length ? '<button class="btn gold" id="dqAll">Claim all</button>' : `<span class="tiny">Finish ${set} quests to earn points. Rewards at 20, 40, 60, 80 and 100 points.</span>`}
      <span class="dq-refresh">${icon('clock')}Refresh time: <b id="dqLeft">${qLeft()}</b></span>
    </div></div>`;
  $('#dqList').scrollLeft = keep;
  root.querySelectorAll('[data-qc]').forEach(b => b.onclick = () => claimQuests([b.dataset.qc]));
  root.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => { if (qmCan(+b.dataset.qm, set)) claimQuests([], [+b.dataset.qm]); });
  root.querySelectorAll('[data-qtab]').forEach(b => b.onclick = () => { qTab = b.dataset.qtab; renderQuests(); });
  root.querySelectorAll('[data-qgo]').forEach(b => b.onclick = () => { const f = Q_GO[b.dataset.qgo]; closeModal(); if (f) f(); });
  const all = $('#dqAll'); if (all) all.onclick = () => claimQuests(readyQ, QUEST_MS);
}
