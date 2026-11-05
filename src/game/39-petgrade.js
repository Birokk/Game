/* ---------- pet grades ----------
   Every pet (per pet, shared by its copies) has a grade F → SSS, the same letters as character grades (PG_NAMES). Pets →
   Upgrade: each try costs gold (PG_GOLD by grade and rarity) and succeeds with a chance that drops as the grade rises and
   is lower for UR pets (PG_CHANCE); a failed try only costs the gold. Auto upgrade keeps trying until the target grade,
   the gold runs out or you press Stop, at ×1 / ×2 / ×4 speed (PG_SPEEDS). The grade will set how strong the pet's buff is
   (no buffs yet). An equipped pet's grade adds CS to its character, rising to 600 at SSS (PG_CS, "Pet grade" line in 27-score).
   Grades belong to each pet COPY (S.petGr[copy uid] = 0–8; copy ids in S.petIds, see 06-pets.js), so two copies of the
   same pet can have different grades; the CS uses the grade of the copy the character holds (petEqGrade). */
const PG_NAMES = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'], PG_MAX = PG_NAMES.length - 1;
const PG_CS = [0, 40, 90, 150, 220, 300, 390, 490, 600];
const PG_CHANCE = { 4: [.95, .85, .75, .62, .5, .38, .27, .17], 5: [.85, .74, .62, .5, .39, .29, .19, .11] };   // chance for grade g → g+1
const PG_GOLD = { 4: [1000, 2000, 4000, 7000, 12000, 20000, 32000, 50000], 5: [1500, 3000, 6000, 10500, 18000, 30000, 48000, 75000] };
const PG_SPEEDS = [1, 2, 4], PG_STEP_MS = 700;
const petGradeU = uid => Math.max(0, Math.min(PG_MAX, (S.petGr || {})[uid] || 0));
const petEqGrade = cid => { const p = petEqOf(cid); return p ? petGradeU((S.petEqU || {})[cid]) : 0; };
/* older saves kept one grade per pet (S.petGr[petId]): give it to that pet's best copy */
(() => { const g = S.petGr || {}; Object.keys(g).forEach(k => { const e = findEntry(k); if (e && e.type === 'pet') { const cps = owns(k) ? petCopies(k) : []; if (cps[0]) g[cps[0].uid] = Math.max(g[cps[0].uid] || 0, g[k]); delete g[k]; } }); })();
const pgRar = p => +p.rarity >= 5 ? 5 : 4;
let pgSel = null, pgAuto = null, pgSpeed = 1, pgTarget = PG_MAX, pgLog = [];
/* every owned pet copy: {p, st, uid, gr, who} */
const pgCopies = () => S.pool.filter(e => e.type === 'pet' && owns(e.id)).flatMap(p => petCopies(p.id).map(cp => ({ ...cp, p }))).sort((a, b) => b.gr - a.gr || b.p.rarity - a.p.rarity || a.p.name.localeCompare(b.p.name) || b.st - a.st);
const pgCur = () => pgCopies().find(c => c.uid === pgSel);
const pgChance = c => PG_CHANCE[pgRar(c.p)][petGradeU(c.uid)] || 0, pgCost = c => PG_GOLD[pgRar(c.p)][petGradeU(c.uid)] || 0;
/* one try: pay the gold, roll the chance; returns 'up' | 'fail' | 'gold' | 'max' */
function pgTry(c) {
  const g = petGradeU(c.uid); if (g >= PG_MAX) return 'max';
  const cost = pgCost(c); if (S.wallet.coins < cost) return 'gold';
  S.wallet.coins -= cost; S.petGr = S.petGr || {};
  const ok = Math.random() < pgChance(c);
  if (ok) S.petGr[c.uid] = g + 1;
  pgLog.unshift({ ok, from: g, to: ok ? g + 1 : g, cost }); if (pgLog.length > 8) pgLog.length = 8;
  return ok ? 'up' : 'fail';
}
function pgStop(msg) { clearTimeout(pgAuto); pgAuto = null; persist(); renderMenu(); if (msg) toast(msg); renderPets(); }
function pgRun() {
  const c = pgCur(); if (!c || !modalEl || modalEl.dataset.kind !== 'pets' || petTab !== 'grade') return pgStop();
  if (c.gr >= pgTarget) return pgStop(`${c.p.name} reached grade ${PG_NAMES[c.gr]}.`);
  const r = pgTry(c);
  if (r === 'gold') return pgStop(`Not enough gold for the next try (${fmt(pgCost(c))}).`);
  if (r === 'max') return pgStop(`${c.p.name} is already at grade SSS.`);
  renderPets();
  pgAuto = setTimeout(pgRun, PG_STEP_MS / pgSpeed);
}
function petGradeHTML() {
  const list = pgCopies();
  if (!list.length) return '<div class="cs-pill">No pets yet. Hatch an egg first.</div>';
  if (!list.some(c => c.uid === pgSel)) pgSel = list[0].uid;
  const c = pgCur(), p = c.p, g = c.gr, max = g >= PG_MAX, cost = pgCost(c), ch = pgChance(c);
  const tOpts = PG_NAMES.map((n, i) => i > g ? `<option value="${i}" ${i === pgTarget ? 'selected' : ''}>${n}</option>` : '').join('');
  return `<div class="pg">
    <div class="pg-list">${list.map(x => `<button class="pg-pet r${x.p.rarity} ${x.uid === pgSel ? 'on' : ''}" data-pgsel="${x.uid}" ${pgAuto ? 'disabled' : ''}><img src="${mediaArt(x.p) || petWide(x.p)}" alt=""><span class="pg-nm"><b>${esc(x.p.name)}</b><span class="pg-sub">${rtag(x.p.rarity)}${starRow(x.st, false)}</span>${x.who ? `<small>With ${esc((findEntry(x.who) || {}).name || '')}</small>` : ''}</span>${gradeTag(PG_NAMES[x.gr], 'pg-g')}</button>`).join('')}</div>
    <div class="pg-main r${p.rarity}">
      <div class="pg-corner">${gradeTag(PG_NAMES[g], 'big')}<small>Grade</small></div>
      <div class="pg-hero"><img src="${mediaArt(p) || petWide(p)}" alt="">
        <div class="pg-info"><h3 class="pg-title">${esc(p.name)} ${rtag(p.rarity)}</h3><span class="pg-stars">${starRow(c.st, false)}</span>${c.who ? `<span class="tiny">With ${esc((findEntry(c.who) || {}).name || '')}</span>` : '<span class="tiny">Not with a character</span>'}
          <span class="pg-next">${max ? 'Fully upgraded' : `Next grade ${gradeTag(PG_NAMES[g + 1], 'dim')}`}</span></div></div>
      <div class="pg-track">${PG_NAMES.map((n, i) => `<span class="${i <= g ? 'on' : ''}">${n}</span>`).join('')}</div>
      <div class="pg-stats">
        <div><span class="lbl-sm">Success chance</span><b>${max ? '—' : Math.round(ch * 100) + '%'}</b></div>
        <div><span class="lbl-sm">Cost per try</span><b>${max ? '—' : `${curIcon('coins')}${fmt(cost)}`}</b></div>
        <div><span class="lbl-sm">CS on its character</span><b>+${PG_CS[g]}${max ? '' : ` → +${PG_CS[g + 1]}`}</b></div>
        <div><span class="lbl-sm">Buff</span><b class="pg-buff">None yet · strength ${PG_NAMES[g]}</b></div>
      </div>
      ${max ? '<div class="pg-done">Grade SSS reached: this pet is fully upgraded.</div>' : `
      <div class="pg-acts">
        <button class="btn gold" id="pgOne" ${pgAuto || S.wallet.coins < cost ? 'disabled' : ''}>Upgrade · ${curIcon('coins')}${fmt(cost)}</button>
        <label class="pg-target">Auto to <select class="input" id="pgTarget" ${pgAuto ? 'disabled' : ''}>${tOpts}</select></label>
        <div class="pg-speed" role="group" aria-label="Auto speed">${PG_SPEEDS.map(v => `<button class="${v === pgSpeed ? 'on' : ''}" data-pgspd="${v}">×${v}</button>`).join('')}</div>
        <button class="btn ${pgAuto ? 'ghost' : 'mint'}" id="pgAuto">${pgAuto ? 'Stop' : 'Auto upgrade'}</button>
      </div>`}
      <div class="pg-log">${pgLog.length ? pgLog.map(l => `<span class="${l.ok ? 'ok' : 'no'}">${l.ok ? `Success! ${PG_NAMES[l.from]} → ${PG_NAMES[l.to]}` : `Failed at ${PG_NAMES[l.from]}`} · −${fmt(l.cost)} gold</span>`).join('') : '<span class="tiny">Each copy of a pet has its own grade. Each try costs gold; a failed try keeps the grade.</span>'}</div>
      <p class="tiny">Chances per grade (${pgRar(p) === 5 ? 'UR' : 'SSR'} pets): ${PG_CHANCE[pgRar(p)].map((x, i) => `${PG_NAMES[i]}→${PG_NAMES[i + 1]} ${Math.round(x * 100)}%`).join(' · ')}. Gold: ${fmt(S.wallet.coins)}.</p>
    </div></div>`;
}
function bindPetGrade(root) {
  root.querySelectorAll('[data-pgsel]').forEach(b => b.onclick = () => { pgSel = b.dataset.pgsel; pgLog = []; const c = pgCur(); if (c && pgTarget <= c.gr) pgTarget = PG_MAX; renderPets(); });
  const one = $('#pgOne'); if (one) one.onclick = () => { const c = pgCur(); if (!c) return; const r = pgTry(c); if (r === 'gold') toast('Not enough gold.'); persist(); renderMenu(); renderPets(); };
  const t = $('#pgTarget'); if (t) t.onchange = () => { pgTarget = +t.value; };
  root.querySelectorAll('[data-pgspd]').forEach(b => b.onclick = () => { pgSpeed = +b.dataset.pgspd; if (pgAuto) { clearTimeout(pgAuto); pgAuto = setTimeout(pgRun, PG_STEP_MS / pgSpeed); } renderPets(); });
  const a = $('#pgAuto'); if (a) a.onclick = () => { if (pgAuto) return pgStop(); const c = pgCur(); if (c && pgTarget <= c.gr) pgTarget = PG_MAX; pgAuto = setTimeout(pgRun, 60); renderPets(); };
}
