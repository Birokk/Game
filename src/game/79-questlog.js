/* =========================================================
   QUEST LOG (the owner's ask: a questline tab with a home button that lists your active quests, after a reference
   screenshot: category tabs on top, questline pills with their current step on the left, the step's details, place,
   goal, the questline's rewards and Track on the right). Questlines (QLINES) are built from systems that already exist:
   the main character's Ascension (75-mcasc.js), the Origin Orbs (74-mcorb.js) and the tutorial chapter. A questline
   is Available until you accept it (or start it: one step done), then Active until every step is done, then Completed.
   State S.qlog {acc: {id: time}, track: id|null} (player save). Home: the "Quest log" button in the row under the
   profile (red dot while a step can be finished right now) and, on wide screens, a small tracker card for the
   tracked questline under that row.
   ========================================================= */
ICONS.qlog = '<path d="M6 3h10l3 3v15H6z"/><path d="M16 3v3h3"/><path d="M9 10h6M9 14h6M9 18h3"/><path d="M3.5 8l1 1 2-2"/>';
ICONS.pin = '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>';
const QL_CATS = [['all', 'All', 'qlog'], ['main', 'Main story', 'crown'], ['char', 'Character', 'chars'], ['guide', 'Guide', 'book']];
const QL_CAT_COL = { main: '#ff5aa5', char: '#a98bff', guide: '#4fb8ff' };
const qlMc = () => findEntry(mcId());
const goChar = tab => () => { const id = mcId(); if (!id || !findEntry(id)) { toast('Pick your main character first.'); return; } qlLeave(); openCharacters(id); csTab = tab; renderCharacters(); };
const QLINES = [
  { id: 'mcasc', cat: 'main', name: 'The Mirror Trial', sub: 'Main character · SSR → UR', ic: 'sparkle', avail: () => !!mcId(), finished: () => mcAscDone(),
    lore: 'A mirror in the old shrine shows your main character as they could be. Prove you are worth that reflection.',
    steps: () => { const st = mcaStep(), e = qlMc(), nm = e ? esc(e.name) : 'your main character', ms = e ? starsOf(e.id) : 0;
      return [
        { name: 'A Reflection at Six Stars', where: 'Characters · Breakthrough', goal: `Raise ${nm} to <b>${MCA_STARS}★</b>`, desc: 'Origin Orbs give your main character stars, one each. The questline opens at 6★.', prog: [Math.min(ms, MCA_STARS), MCA_STARS], done: mcaReady() || mcAscDone(), go: goChar('bt'), goTxt: 'Breakthrough' },
        { name: 'Shards of the Mirror', where: 'Battle · Quick Match', goal: `Collect <b>${MCA_SHARDS} Mirror Shards</b>`, desc: `Every Quick match win has a ${Math.round(MCA_DROP * 100)}% chance to drop a Mirror Shard, up to ${MCA_SHARDS} at a time. They drop even before 6★.`, prog: [st >= 2 ? MCA_SHARDS : Math.min(mcaShards(), MCA_SHARDS), MCA_SHARDS], done: st >= 1, go: () => { qlLeave(); openQuickMatch(); }, goTxt: 'Quick Match' },
        { name: 'The Offering', where: 'Characters · Breakthrough · Ascension', goal: `Offer <b>${fmt(MCA_GOLD)} gold</b> and ${MCA_SHARDS} shards`, desc: 'Give the mirror its price to wake your reflection.', done: st >= 2, ready: st === 1 && mcaReady() && (S.wallet.coins || 0) >= MCA_GOLD, go: () => { qlLeave(); openMcAsc(); }, goTxt: 'Ascension' },
        { name: 'Beat Your Reflection', where: 'Characters · Breakthrough · Ascension', goal: `Win the <b>Hard</b> Mirror Trial against ${nm}`, desc: `It plans every turn, starts on ${MCA_HP} HP and goes first. You play the Origin Deck, with no auto play. Free, retry as often as you like.`, done: st >= 3, ready: st === 2 && mcaReady(), go: () => { qlLeave(); openMcAsc(); }, goTxt: 'Ascension' },
        { name: 'Ascension', where: 'Characters · Breakthrough · Ascension', goal: `Complete the questline: ${nm} becomes <b>UR</b>`, desc: 'The reflection steps out of the mirror, and your main character rises to UR for good.', done: mcAscDone(), ready: st === 3, go: () => { qlLeave(); openMcAsc(); }, goTxt: 'Ascension' }]; },
    rewards: () => { const e = qlMc(); return [{ pic: e ? baseThumb(e) : icon('chars'), r: 5, n: 'UR', t: 'Main character becomes UR' }, { pic: icon('crown'), r: 4, n: 'UR CS', t: 'UR points in its CS' }]; } },
  { id: 'mcorb', cat: 'char', name: 'Origin Orbs', sub: 'Main character stars', ic: 'star', avail: () => !!mcId(), finished: () => MC_ORB_SRC.every(s => mcOrbState().got.includes(s.id)),
    lore: 'Five Origin Orbs are hidden along your journey. Each one gives your main character a star.',
    steps: () => MC_ORB_SRC.map(s => ({ name: s.lv ? `Orb of Level ${s.lv}` : `Orb of ${(CC_CAMP.find(c => c.id === s.ch) || {}).name || 'the campaign'}`, where: s.lv ? 'Home · Level rewards' : `Battle · Campaign · Chapter ${(CC_CAMP.find(c => c.id === s.ch) || {}).no}`,
      goal: esc(s.txt), desc: s.lv ? 'The orb comes with that level\'s reward. Claim it in the Level window.' : 'The orb is mailed to you when the chapter\'s last stage is cleared.',
      prog: s.lv ? [Math.min(playerLv().lv, s.lv), s.lv] : null, done: mcOrbState().got.includes(s.id),
      go: s.lv ? () => { qlLeave(); openLevel(); } : () => { const ch = CC_CAMP.find(c => c.id === s.ch); qlLeave(); openCampaign(ch ? (ch.stages.find(x => !ccCampHave(x.id)[0]) || ch.stages[0]).id : undefined); }, goTxt: s.lv ? 'Level' : 'Campaign' })),
    note: () => (S.wallet.mcorb || 0) ? `You have <b>${S.wallet.mcorb}</b> Origin Orb${S.wallet.mcorb > 1 ? 's' : ''} to use on your main character's Breakthrough tab.` : '',
    rewards: () => [{ pic: curIcon('mcorb'), r: 5, n: '×5', t: 'Origin Orbs' }, { pic: icon('star'), r: 4, n: '+5★', t: 'Main character stars' }] },
  { id: 'lesson', cat: 'guide', name: 'The First Lesson', sub: 'Card Battle tutorial', ic: 'cards', avail: () => !!CC_CAMP.find(c => c.id === 'c0'), finished: () => { const ch = CC_CAMP.find(c => c.id === 'c0'); return !!ch && ch.stages.every(s => ccCampHave(s.id)[0]); },
    lore: 'Learn Card Battle one lesson at a time, from your first summon to the final exam.',
    steps: () => { const ch = CC_CAMP.find(c => c.id === 'c0'); return (ch ? ch.stages : []).map(s => ({ name: s.name, where: `Battle · Campaign · Stage ${s.id}`, goal: `Clear stage <b>${s.id}</b>`, desc: esc(s.teach || s.intro || s.twist || 'A lesson of the tutorial chapter.'),
      prog: [ccCampN(s.id), 3], progTxt: 'stars', done: !!ccCampHave(s.id)[0], go: () => { qlLeave(); openCampaign(s.id); }, goTxt: 'Play' })); },
    rewards: () => [{ pic: curIcon('pearls'), r: 4, n: '×15', t: '1 pearl a star' }, { pic: curIcon('wishes'), r: 4, n: '×10', t: 'At 15 stars' }, { pic: curIcon('mcorb'), r: 5, n: '×1', t: 'Origin Orb' }] }
];
const qlState = () => { const q = S.qlog = S.qlog && typeof S.qlog === 'object' ? S.qlog : {}; q.acc = q.acc || {}; return q; };
const qlSteps = L => { try { return L.steps(); } catch (e) { return []; } };
const qlStatus = L => { if (!L.avail()) return 'hidden'; if (L.finished()) return 'done'; const s = qlSteps(L); return qlState().acc[L.id] || s.some(x => x.done) ? 'active' : 'avail'; };
const qlCur = L => { const s = qlSteps(L), i = s.findIndex(x => !x.done); return i < 0 ? s.length - 1 : i; };
const qlReady = () => QLINES.some(L => qlStatus(L) === 'active' && qlSteps(L).some(s => !s.done && s.ready));
function qlAccept(id) { qlState().acc[id] = Date.now(); if (!qlState().track) qlState().track = id; persist(); renderMenu(); const L = QLINES.find(x => x.id === id); toast(`Questline accepted: ${L ? L.name : ''}`); }
let qlCat = 'all', qlSel = null, qlOpen = {}, qlEl = null;
/* the Quest log is a page of its own (the owner's ask: "make it an entire page"): a blurred backdrop, a header with the
   category tabs as one glass strip, the questline list on the left and, on the right, a hero banner with the
   questline's art and progress ring, the picked step's card, the step timeline and the rewards. */
const qlArt = L => { if (L.id === 'lesson') return MEDIA.get('battle:campaign') || MEDIA.get('camp:bg:c0') || null; const e = qlMc(); return e ? baseArt(e) : null; };
const qlPct = L => { const s = qlSteps(L); return s.length ? s.filter(x => x.done).length / s.length : 0; };
function qlLeave() { closeModal(); closeQuestLog(true); }
function openQuestLog(id) {
  if (id) qlSel = { q: id, s: null };
  closeModal();
  if (!qlEl) { qlEl = document.createElement('div'); qlEl.className = 'qlx'; qlEl.setAttribute('role', 'dialog'); qlEl.setAttribute('aria-label', 'Quest log');
    qlEl.innerHTML = `${pageBgHTML(null)}<div class="qlx-in" id="qlgRoot"></div>`; document.body.appendChild(qlEl); }
  renderQuestLog();
}
function closeQuestLog(quiet) { if (qlEl) { qlEl.remove(); qlEl = null; } if (!quiet) renderMenu(); }
addEventListener('keydown', e => { if (qlEl && e.key === 'Escape' && !document.querySelector('.modal-back,.rewpop')) { e.stopPropagation(); closeQuestLog(); } }, true);
function renderQuestLog() {
  const root = document.getElementById('qlgRoot'); if (!root) return;
  const keep = root.querySelector('.qlx-left'), sy = keep ? keep.scrollTop : 0;
  const all = QLINES.filter(L => qlStatus(L) !== 'hidden'), vis = all.filter(L => qlCat === 'all' || L.cat === qlCat), tr = qlState().track;
  const act = vis.filter(L => qlStatus(L) === 'active').sort((a, b) => (b.id === tr) - (a.id === tr)), av = vis.filter(L => qlStatus(L) === 'avail'), dn = vis.filter(L => qlStatus(L) === 'done');
  if (!qlSel || !vis.some(L => L.id === qlSel.q)) { const f = act[0] || av[0] || dn[0]; qlSel = f ? { q: f.id, s: null } : null; }
  const cnt = c => all.filter(L => qlStatus(L) === 'active' && (c === 'all' || L.cat === c)).length;
  const nAct = cnt('all'), nReady = all.filter(L => qlStatus(L) === 'active' && qlSteps(L).some(x => !x.done && x.ready)).length, nDone = all.filter(L => qlStatus(L) === 'done').length;
  const head = (L, st) => { const s = qlSteps(L), cur = qlCur(L), open = qlOpen[L.id] ?? (qlSel && qlSel.q === L.id), on = qlSel && qlSel.q === L.id, pc = Math.round(qlPct(L) * 100);
    const rows = st === 'active' ? (open ? s.map((x, i) => [x, i]) : [[s[cur], cur]]) : [];
    return `<div class="qlg-ql ${on ? 'on' : ''} st-${st}" style="--qc:${QL_CAT_COL[L.cat]};--qp:${pc}%"><button class="qlg-qh" data-qlq="${L.id}"><span class="qlg-qi">${icon(L.ic)}</span><span class="qlg-qt"><b>${esc(L.name)}</b><small>${st === 'done' ? 'Completed' : st === 'avail' ? 'New questline · tap to read' : `${s.filter(x => x.done).length} / ${s.length} · ${esc(L.sub)}`}</small></span>${L.id === tr && st === 'active' ? `<span class="qlg-trk" title="Tracked">${icon('pin')}</span>` : ''}${st === 'active' && s.some(x => !x.done && x.ready) ? '<i class="dot-n"></i>' : ''}${st === 'avail' ? '<em class="qlg-new">New</em>' : ''}${st === 'active' ? `<span class="qlg-chev ${open ? 'up' : ''}" data-qltog="${L.id}">${icon('back')}</span>` : ''}<i class="qlg-qbar"></i></button>
      ${rows.map(([x, i]) => `<button class="qlg-st ${x.done ? 'done' : i === cur ? 'cur' : 'lock'} ${on && (qlSel.s ?? cur) === i ? 'on' : ''}" data-qlq="${L.id}" data-qls="${i}"><i>${x.done ? icon('check') : ''}</i><span>${esc(x.name)}</span>${!x.done && x.ready ? '<em>Ready</em>' : ''}</button>`).join('')}</div>`; };
  const group = (title, ic, L, st) => L.length ? `<div class="qlg-gh">${icon(ic)}${title}<span>${L.length}</span></div>${L.map(x => head(x, st)).join('')}` : '';
  const left = group('Active', 'qlog', act, 'active') + group('Available', 'plus', av, 'avail') + group('Completed', 'check', dn, 'done') || `<div class="qlg-empty">${icon('qlog')}<span>No questlines here yet.</span></div>`;
  let right = `<div class="qlg-none">${icon('qlog')}<b>No questlines</b><span>New questlines appear here as you play.</span></div>`;
  if (qlSel) { const L = QLINES.find(x => x.id === qlSel.q), st = qlStatus(L), s = qlSteps(L), cur = qlCur(L), i = qlSel.s ?? cur, x = s[i] || {}, rw = L.rewards(), note = L.note ? L.note() : '', art = qlArt(L), pc = qlPct(L), nd = s.filter(y => y.done).length;
    const show = st !== 'avail', cat = QL_CATS.find(c => c[0] === L.cat)[1];
    const ring = `<span class="qlx-ring" style="--p:${Math.round(pc * 100)}"><b>${nd}<small>/${s.length}</small></b><em>${st === 'done' ? 'Done' : 'steps'}</em></span>`;
    const tl = s.map((y, k) => `<button class="qlx-tl ${y.done ? 'done' : show && k === cur ? 'cur' : ''} ${show && k === i ? 'on' : ''}" ${show ? `data-qlq="${L.id}" data-qls="${k}"` : 'disabled'}><span class="qlx-tn">${y.done ? icon('check') : k + 1}</span><span class="qlx-tt"><b>${esc(y.name)}</b><small>${icon('pin')}${esc(y.where || '')}</small></span>${!y.done && y.ready ? '<em>Ready</em>' : y.done ? '<em class="ok">Done</em>' : show && k === cur ? '<em class="now">Now</em>' : ''}</button>`).join('');
    const card = show ? `<div class="qlx-card ${x.done ? 'done' : ''}">
        <div class="qlx-ch"><small>Step ${i + 1} of ${s.length}${i === cur && st === 'active' ? ' · current' : ''}</small><h3 class="ts">${esc(x.name || '')}</h3></div>
        <span class="qlg-where">${icon('pin')}${esc(x.where || '')}</span>
        <p class="qlg-goal">${x.done ? icon('check') : '<i></i>'}<span>${x.goal || ''}</span>${x.done ? '<em>Done</em>' : x.ready ? '<em class="rd">Ready</em>' : ''}</p>
        <p class="qlg-desc">${x.desc || ''}</p>
        ${x.prog ? `<div class="qlg-prog"><div class="qlg-bar"><i style="width:${Math.round(x.prog[0] / x.prog[1] * 100)}%"></i></div><span>${x.prog[0]} / ${x.prog[1]}${x.progTxt ? ' ' + x.progTxt : ''}</span></div>` : ''}
        ${note ? `<p class="qlg-note">${icon('info')}<span>${note}</span></p>` : ''}
        <div class="qlg-act">${st === 'done' ? `<span class="qlg-fin">${icon('check')}Questline complete</span>` : `${!x.done && x.go ? `<button class="btn gold" id="qlGo">${icon('back')}<span>Go · ${esc(x.goTxt || 'Go')}</span></button>` : ''}<button class="qlg-track ${tr === L.id ? 'on' : ''}" data-qltrack="${L.id}">${icon('pin')}${tr === L.id ? 'Tracking' : 'Track Quest'}</button>`}</div>
      </div>` : `<div class="qlx-card avail"><div class="qlx-ch"><small>New questline</small><h3 class="ts">${esc(L.name)}</h3></div><p class="qlg-desc">${esc(L.lore)}</p><p class="qlg-desc dim">${s.length} steps. Accept it to follow it here, track it on the home screen and get a red dot when a step is ready.</p><div class="qlg-act"><button class="btn gold" data-qlacc="${L.id}">${icon('plus')}Accept questline</button></div></div>`;
    right = `<div class="qlx-main" style="--qc:${QL_CAT_COL[L.cat]}">
      <div class="qlx-hero ${art ? 'art' : ''}">${art ? `<img class="qlx-hart" src="${art}" alt="">` : `<i class="qlx-hic">${icon(L.ic)}</i>`}<i class="qlx-hsh"></i>
        <div class="qlx-ht"><span class="qlx-kind">${icon(L.ic)}${esc(cat)}</span><h2 class="ts">${esc(L.name)}</h2><span class="qlx-sub">${esc(L.sub)}</span><p>${esc(L.lore)}</p>
          <span class="qlx-state ${st}">${st === 'done' ? `${icon('check')}Completed` : st === 'avail' ? `${icon('plus')}Not accepted yet` : tr === L.id ? `${icon('pin')}Active · tracked` : `${icon('qlog')}Active`}</span></div>
        ${ring}</div>
      <div class="qlx-grid">${card}
        <div class="qlx-side"><div class="qlx-box"><h4>${icon('map')}Steps</h4><div class="qlx-tls">${tl}</div></div>
          <div class="qlx-box qlg-rw"><h4>${icon('gift')}Complete the questline to obtain</h4><div class="qlg-rws">${rw.map(r => `<div class="qlg-rc r${r.r}" title="${esc(r.t)}"><span class="qlg-rp">${r.pic}</span><b>${esc(r.n)}</b><small>${esc(r.t)}</small></div>`).join('')}</div></div></div>
      </div></div>`; }
  root.innerHTML = `<header class="qlx-head"><div class="inv-title qlx-pill"><span class="inv-badge">${icon('qlog')}</span><b class="ts">Quest log</b></div>
      <nav class="qlx-tabs">${QL_CATS.map(([id, nm, ic]) => `<button class="${qlCat === id ? 'on' : ''}" data-qlcat="${id}" title="${nm}">${icon(ic)}<span>${nm}</span>${cnt(id) ? `<em>${cnt(id)}</em>` : ''}</button>`).join('')}</nav>
      <div class="qlx-stats"><span>${icon('qlog')}<b>${nAct}</b> active</span>${nReady ? `<span class="rd">${icon('check')}<b>${nReady}</b> ready</span>` : ''}<span>${icon('trophy')}<b>${nDone}</b> / ${all.length} done</span></div>
      <button class="inv-x" id="qlClose" aria-label="Close">${icon('close')}</button></header>
    <div class="qlx-body"><aside class="qlx-left">${left}</aside><section class="qlx-right">${right}</section></div>`;
  const nl = root.querySelector('.qlx-left'); if (nl) nl.scrollTop = sy;
  root.querySelector('#qlClose').onclick = () => closeQuestLog();
  root.querySelectorAll('[data-qlcat]').forEach(b => b.onclick = () => { qlCat = b.dataset.qlcat; qlSel = null; renderQuestLog(); });
  root.querySelectorAll('[data-qlq]').forEach(b => b.onclick = ev => { if (ev.target.closest('[data-qltog]')) return; qlSel = { q: b.dataset.qlq, s: b.dataset.qls != null ? +b.dataset.qls : null }; renderQuestLog(); });
  root.querySelectorAll('[data-qltog]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const id = b.dataset.qltog; qlOpen[id] = !(qlOpen[id] ?? (qlSel && qlSel.q === id)); renderQuestLog(); });
  root.querySelectorAll('[data-qlacc]').forEach(b => b.onclick = () => { qlAccept(b.dataset.qlacc); renderQuestLog(); });
  root.querySelectorAll('[data-qltrack]').forEach(b => b.onclick = () => { const q = qlState(); q.track = q.track === b.dataset.qltrack ? null : b.dataset.qltrack; persist(); renderMenu(); renderQuestLog(); });
  const go = root.querySelector('#qlGo'); if (go && qlSel) { const L = QLINES.find(x => x.id === qlSel.q), x = qlSteps(L)[qlSel.s ?? qlCur(L)]; go.onclick = () => x.go(); }
}
/* the Ascension window offers to accept its questline */
{ const r0 = renderMcAsc;
  renderMcAsc = function () {
    r0.apply(this, arguments);
    const root = $('#mcaRoot'), L = QLINES[0]; if (!root || !root.firstElementChild || qlStatus(L) === 'hidden') return;
    const st = qlStatus(L), bar = document.createElement('div'); bar.className = 'mca-ql';
    bar.innerHTML = st === 'avail' ? `<span>${icon('qlog')}<b>Questline</b>Accept it to follow it in your Quest log.</span><button class="btn gold sm" id="mcaAcc">${icon('plus')}Accept questline</button>`
      : `<span>${icon('qlog')}<b>${st === 'done' ? 'Questline complete' : 'In your Quest log'}</b>${st === 'done' ? '' : 'Track it there to see your next step.'}</span><button class="btn ghost sm" id="mcaLog">${icon('qlog')}Quest log</button>`;
    root.firstElementChild.prepend(bar);
    const a = bar.querySelector('#mcaAcc'); if (a) a.onclick = () => { qlAccept('mcasc'); renderMcAsc(); };
    const l = bar.querySelector('#mcaLog'); if (l) l.onclick = () => { closeModal(); openQuestLog('mcasc'); };
  }; }
/* home: the red dot on the Quest log button and the tracker card under the row of buttons (wide screens only) */
function qlHome() {
  const d = document.getElementById('qlDot'); if (d) d.hidden = !qlReady();
  const sb = document.getElementById('qlSub'); if (sb) { const n = QLINES.filter(L => qlStatus(L) === 'active').length; sb.textContent = n ? n + ' active' : 'Questlines'; }
  let t = document.getElementById('qlTrack'); const q = qlState(), L = QLINES.find(x => x.id === q.track);
  const show = L && qlStatus(L) === 'active' && menuOpen && !qlEl && !document.body.classList.contains('plaza');
  if (!show) { if (t) t.remove(); return; }
  const s = qlSteps(L), x = s[qlCur(L)];
  if (!t) { t = document.createElement('button'); t.id = 'qlTrack'; t.className = 'qlg-tracker'; t.onclick = () => openQuestLog(L.id); document.querySelector('.menu').appendChild(t); }
  t.style.setProperty('--qc', QL_CAT_COL[L.cat]);
  t.innerHTML = `<span class="qlt-k">${icon('pin')}${esc(L.name)}</span><b>${esc(x.name)}</b><span class="qlt-g">${x.goal}</span>${x.prog ? `<i class="qlt-bar"><i style="width:${Math.round(x.prog[0] / x.prog[1] * 100)}%"></i></i>` : ''}${x.ready ? '<em>Ready</em>' : ''}`;
  const ql = document.querySelector('.menu .hm-ql'); if (ql) { const r = ql.getBoundingClientRect(); t.style.left = Math.round(r.left) + 'px'; t.style.top = Math.round(r.bottom + 14) + 'px'; }
}
{ const m0 = renderMenu; renderMenu = function () { const r = m0.apply(this, arguments); safely(qlHome, 'quest log'); return r; }; }
addEventListener('resize', () => { if (typeof menuOpen !== 'undefined' && menuOpen) safely(qlHome, 'quest log'); });
