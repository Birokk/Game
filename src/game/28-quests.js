/* ---------- daily quests: finish quests for points, claim rewards at 20 / 40 / 60 / 80 / 100 points ----------
   Progress resets every day (local midnight, like the daily login). S.quests = {day, p: {questId: progress},
   done: [claimed quest ids], ms: [claimed milestones]}. Quest progress comes from questAdd(id, n) hooks in the
   features (gifts, stamina, summons, fountains, gold, raids, the Base); "Log into the game" completes itself. */
const QUESTS = [
  { id: 'login', name: 'Log into the game', need: 1, pts: 10, ic: 'calendar' },
  { id: 'gift', name: 'Send a gift once', need: 1, pts: 20, ic: 'gift', go: 'characters' },
  { id: 'stamina', name: 'Spend a total of 160 stamina', need: 160, pts: 20, cur: 'stamina', go: 'raids' },
  { id: 'summon', name: 'Summon on a character banner once', need: 1, pts: 20, ic: 'sparkle', go: 'summon' },
  { id: 'fountain', name: 'Make a wish at a fountain', need: 1, pts: 10, ic: 'fountain', go: 'farm' },
  { id: 'gold', name: 'Spend a total of 10,000 gold', need: 10000, pts: 20, cur: 'coins', go: 'farm' },
  { id: 'raid', name: 'Clear a raid once', need: 1, pts: 20, ic: 'raid', go: 'raids' },
  { id: 'base', name: 'Collect resources at the Base', need: 1, pts: 10, ic: 'farm', go: 'farm' }
];
const QUEST_MAX = 100, QUEST_MS = [20, 40, 60, 80, 100];
const QUEST_CHAR_BANNERS = ['limited', 'weekly', 'standard'];   // "character banner" summons
/* every milestone: 1 pearl, 2,000 gold, 100 EXP; 60 adds a Standard ticket, 100 a Limited ticket */
function questReward(m) {
  const r = [['pearls', 1], ['coins', 2000], ['exp', 100]];
  if (m === 60) r.push(['wishes', 1]);
  if (m === 100) r.push(['tickets', 1]);
  return r;
}
CUR_SVG.qpt = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="qptG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#9fd8ff"/><stop offset=".55" stop-color="#2f8cff"/><stop offset="1" stop-color="#1747b8"/></radialGradient></defs><circle cx="12" cy="12" r="10" fill="url(#qptG)" stroke="#d8f0ff" stroke-width="1.4"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55"/><path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const Q_NAMES = { coins: 'gold', pearls: 'pearls', exp: 'EXP', tickets: 'Limited ticket', wishes: 'Standard ticket' };

/* today's quest state; a new day starts fresh (and counts as logging in) */
function qState() {
  const d = dayKey();
  if (!S.quests || S.quests.day !== d) S.quests = { day: d, p: { login: 1 }, done: [], ms: [] };
  return S.quests;
}
function questAdd(id, n = 1) {
  const q = QUESTS.find(x => x.id === id); if (!q || !(n > 0)) return;
  const st = qState(); st.p[id] = Math.min(q.need, (st.p[id] || 0) + n);
}
const qProg = q => Math.min(q.need, qState().p[q.id] || 0);
const qDone = q => qState().done.includes(q.id);
const qCan = q => !qDone(q) && qProg(q) >= q.need;
const qPts = () => Math.min(QUEST_MAX, QUESTS.filter(qDone).reduce((s, q) => s + q.pts, 0));
const qmCan = m => qPts() >= m && !qState().ms.includes(m);
const questReady = () => QUESTS.some(qCan) || QUEST_MS.some(qmCan);

/* spending gold anywhere counts: watch every drop of S.wallet.coins (after boot, so loading doesn't count) */
(() => {
  const w = S.wallet; let v = w.coins || 0;
  Object.defineProperty(w, 'coins', { enumerable: true, configurable: true, get: () => v,
    set: x => { if (booted && x < v) questAdd('gold', v - x); v = x; } });
})();

/* claim finished quests (their points) and reached milestones (their rewards) */
function claimQuests(ids = [], ms = []) {
  const st = qState(), got = {};
  let pts = 0;
  ids.forEach(id => { const q = QUESTS.find(x => x.id === id); if (q && qCan(q)) { st.done.push(q.id); pts += q.pts; } });
  ms.forEach(m => { if (!qmCan(m)) return; st.ms.push(m); questReward(m).forEach(([k, n]) => { got[k] = (got[k] || 0) + n; }); });
  if (!pts && !Object.keys(got).length) return;
  Object.entries(got).forEach(([k, n]) => { if (k !== 'exp') S.wallet[k] = (S.wallet[k] || 0) + n; });
  if (got.exp) gainExp(got.exp);
  persist(); renderMenu(); refreshSummon(); renderQuests();
  const bits = Object.entries(got).map(([k, n]) => `${fmt(n)} ${Q_NAMES[k] || k}${(k === 'tickets' || k === 'wishes') && n > 1 ? 's' : ''}`);
  toast([pts ? `+${pts} points` : '', bits.length ? 'Claimed ' + bits.join(', ') : ''].filter(Boolean).join(' · ') + '.');
}
const Q_GO = { characters: () => openCharacters(), raids: () => openRaids(), summon: () => openSummon('limited'), farm: () => openFarm() };
function qLeft() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const s = Math.max(0, m - n) / 1000; return `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m`; }

function openQuests() {
  openModal({ title: 'Daily Quests', ic: 'quests', wide: true, kind: 'quests', body: '<div id="dqRoot"></div>', onMount: () => {
    renderQuests();
    const t = setInterval(() => { const r = $('#dqRoot'); if (!r) { clearInterval(t); return; } if (S.quests.day !== dayKey()) renderQuests(); else { const el = $('#dqLeft'); if (el) el.textContent = qLeft(); } }, 30000);
  } });
}
function renderQuests() {
  const root = $('#dqRoot'); if (!root) return;
  const st = qState(), pts = qPts(), keep = $('#dqList') ? $('#dqList').scrollLeft : 0;
  const order = q => qCan(q) ? 0 : qDone(q) ? 2 : 1;
  const list = QUESTS.slice().sort((a, b) => order(a) - order(b));
  const nodes = QUEST_MS.map(m => { const got = st.ms.includes(m), can = qmCan(m), rw = questReward(m);
    const tip = `<b>${m} points</b><span>${rw.map(([k, n]) => `${fmt(n)} ${Q_NAMES[k]}`).join(' · ')}</span><em class="${got ? 'ok' : ''}">${got ? 'Claimed' : can ? 'Tap to claim' : `Reach ${m} points`}</em>`;
    return `<div class="dq-node ${got ? 'got' : can ? 'can' : ''}" style="--x:${m / QUEST_MAX * 100}%">
      <button class="dq-dot" data-qm="${m}" data-tip="${esc(tip)}" aria-label="${m} points reward${got ? ', claimed' : can ? ', ready to claim' : ''}">${got ? icon('check') : icon('gift')}</button>
      <span class="dq-m">${m}</span>
      <span class="dq-rw">${rw.map(([k, n]) => `<i>${curIcon(k)}${n >= 1000 ? `${n / 1000}k` : n}</i>`).join('')}</span></div>`; }).join('');
  const cards = list.map(q => { const p = qProg(q), got = qDone(q), can = qCan(q);
    return `<div class="dq-card ${got ? 'got' : can ? 'can' : ''}">
      <div class="dq-face"><span class="dq-disc">${got ? `<span class="dq-check">${icon('check')}</span>` : q.cur ? curIcon(q.cur) : icon(q.ic)}</span>
        <span class="dq-pt">${curIcon('qpt')}+${q.pts}</span>
        <p class="dq-name">${esc(q.name)}</p>
        <b class="dq-prog">${fmt(p)} / ${fmt(q.need)}</b></div>
      ${got ? '<span class="dq-btn done">Fulfilled</span>' : can ? `<button class="dq-btn claim" data-qc="${q.id}">Claim</button>` : q.go ? `<button class="dq-btn go" data-qgo="${q.go}">Go</button>` : '<span class="dq-btn">In progress</span>'}
    </div>`; }).join('');
  const readyQ = QUESTS.filter(qCan).map(q => q.id), readyM = QUEST_MS.filter(qmCan);
  root.innerHTML = `<div class="dq">
    <div class="dq-top">
      <div class="dq-pts">${curIcon('qpt')}<div><b>${pts}</b><small>Participation</small></div></div>
      <div class="dq-track"><div class="dq-bar"><i style="width:${pts / QUEST_MAX * 100}%"></i></div>${nodes}</div>
    </div>
    <div class="dq-list" id="dqList">${cards}</div>
    <div class="dq-foot">
      ${readyQ.length || readyM.length ? '<button class="btn gold" id="dqAll">Claim all</button>' : '<span class="tiny">Finish quests to earn points. Rewards at 20, 40, 60, 80 and 100 points.</span>'}
      <span class="dq-refresh">${icon('clock')}Refresh time: <b id="dqLeft">${qLeft()}</b></span>
    </div></div>`;
  $('#dqList').scrollLeft = keep;
  root.querySelectorAll('[data-qc]').forEach(b => b.onclick = () => claimQuests([b.dataset.qc]));
  root.querySelectorAll('[data-qm]').forEach(b => b.onclick = () => { if (qmCan(+b.dataset.qm)) claimQuests([], [+b.dataset.qm]); });
  root.querySelectorAll('[data-qgo]').forEach(b => b.onclick = () => { const f = Q_GO[b.dataset.qgo]; closeModal(); if (f) f(); });
  const all = $('#dqAll'); if (all) all.onclick = () => claimQuests(readyQ, QUEST_MS);
}
