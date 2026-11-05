/* ---------- pet grades ----------
   Every pet (per pet, shared by its copies) has a grade F → SSS, the same letters as character grades (PG_NAMES). Pets →
   Upgrade: each try costs gold (PG_GOLD by grade and rarity) and succeeds with a chance that drops as the grade rises and
   is lower for UR pets (PG_CHANCE); a failed try only costs the gold. Auto upgrade keeps trying until the target grade,
   the gold runs out or you press Stop, at ×1 / ×2 / ×4 speed (PG_SPEEDS). The grade will set how strong the pet's buff is
   (no buffs yet). An equipped pet's grade adds CS to its character, rising to 600 at SSS (PG_CS, "Pet grade" line in 27-score).
   State S.petGr[petId] = grade index 0–8. */
const PG_NAMES = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'], PG_MAX = PG_NAMES.length - 1;
const PG_CS = [0, 40, 90, 150, 220, 300, 390, 490, 600];
const PG_CHANCE = { 4: [.95, .85, .75, .62, .5, .38, .27, .17], 5: [.85, .74, .62, .5, .39, .29, .19, .11] };   // chance for grade g → g+1
const PG_GOLD = { 4: [1000, 2000, 4000, 7000, 12000, 20000, 32000, 50000], 5: [1500, 3000, 6000, 10500, 18000, 30000, 48000, 75000] };
const PG_SPEEDS = [1, 2, 4], PG_STEP_MS = 700;
const petGrade = id => Math.max(0, Math.min(PG_MAX, (S.petGr || {})[id] || 0));
const pgRar = p => +p.rarity >= 5 ? 5 : 4;
const pgChance = p => PG_CHANCE[pgRar(p)][petGrade(p.id)] || 0, pgCost = p => PG_GOLD[pgRar(p)][petGrade(p.id)] || 0;
let pgSel = null, pgAuto = null, pgSpeed = 1, pgTarget = PG_MAX, pgLog = [];
const pgPets = () => S.pool.filter(e => e.type === 'pet' && owns(e.id)).sort((a, b) => petGrade(b.id) - petGrade(a.id) || b.rarity - a.rarity || a.name.localeCompare(b.name));
/* one try: pay the gold, roll the chance; returns 'up' | 'fail' | 'gold' | 'max' */
function pgTry(p) {
  const g = petGrade(p.id); if (g >= PG_MAX) return 'max';
  const cost = pgCost(p); if (S.wallet.coins < cost) return 'gold';
  S.wallet.coins -= cost; S.petGr = S.petGr || {};
  const ok = Math.random() < pgChance(p);
  if (ok) S.petGr[p.id] = g + 1;
  pgLog.unshift({ ok, from: g, to: ok ? g + 1 : g, cost }); if (pgLog.length > 8) pgLog.length = 8;
  return ok ? 'up' : 'fail';
}
function pgStop(msg) { clearTimeout(pgAuto); pgAuto = null; persist(); renderMenu(); if (msg) toast(msg); renderPets(); }
function pgRun() {
  const p = findEntry(pgSel); if (!p || !modalEl || modalEl.dataset.kind !== 'pets' || petTab !== 'grade') return pgStop();
  if (petGrade(p.id) >= pgTarget) return pgStop(`${p.name} reached grade ${PG_NAMES[petGrade(p.id)]}.`);
  const r = pgTry(p);
  if (r === 'gold') return pgStop(`Not enough gold for the next try (${fmt(pgCost(p))}).`);
  if (r === 'max') return pgStop(`${p.name} is already at grade SSS.`);
  renderPets();
  pgAuto = setTimeout(pgRun, PG_STEP_MS / pgSpeed);
}
function petGradeHTML() {
  const list = pgPets();
  if (!list.length) return '<div class="cs-pill">No pets yet. Hatch an egg first.</div>';
  if (!list.some(p => p.id === pgSel)) pgSel = list[0].id;
  const p = findEntry(pgSel), g = petGrade(p.id), max = g >= PG_MAX, cost = pgCost(p), ch = pgChance(p);
  const tOpts = PG_NAMES.map((n, i) => i > g ? `<option value="${i}" ${i === pgTarget ? 'selected' : ''}>${n}</option>` : '').join('');
  return `<div class="pg">
    <div class="pg-list">${list.map(x => `<button class="pg-pet r${x.rarity} ${x.id === pgSel ? 'on' : ''}" data-pgsel="${esc(x.id)}" ${pgAuto ? 'disabled' : ''}><img src="${mediaArt(x) || petWide(x)}" alt=""><span class="pg-nm"><b>${esc(x.name)}</b>${rtag(x.rarity)}</span>${gradeTag(PG_NAMES[petGrade(x.id)], 'pg-g')}</button>`).join('')}</div>
    <div class="pg-main r${p.rarity}">
      <div class="pg-hero"><img src="${mediaArt(p) || petWide(p)}" alt=""><div class="pg-big">${gradeTag(PG_NAMES[g], 'big')}${max ? '' : `<span class="pg-arrow">${icon('back')}</span>${gradeTag(PG_NAMES[g + 1], 'big dim')}`}</div></div>
      <h3 class="pg-title">${esc(p.name)} ${rtag(p.rarity)}</h3>
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
      <div class="pg-log">${pgLog.length ? pgLog.map(l => `<span class="${l.ok ? 'ok' : 'no'}">${l.ok ? `Success! ${PG_NAMES[l.from]} → ${PG_NAMES[l.to]}` : `Failed at ${PG_NAMES[l.from]}`} · −${fmt(l.cost)} gold</span>`).join('') : '<span class="tiny">Each try costs gold. A failed try keeps the grade.</span>'}</div>
      <p class="tiny">Chances per grade (${pgRar(p) === 5 ? 'UR' : 'SSR'} pets): ${PG_CHANCE[pgRar(p)].map((c, i) => `${PG_NAMES[i]}→${PG_NAMES[i + 1]} ${Math.round(c * 100)}%`).join(' · ')}. Gold: ${fmt(S.wallet.coins)}.</p>
    </div></div>`;
}
function bindPetGrade(root) {
  root.querySelectorAll('[data-pgsel]').forEach(b => b.onclick = () => { pgSel = b.dataset.pgsel; pgLog = []; const g = petGrade(pgSel); if (pgTarget <= g) pgTarget = PG_MAX; renderPets(); });
  const one = $('#pgOne'); if (one) one.onclick = () => { const p = findEntry(pgSel), r = pgTry(p); if (r === 'gold') toast('Not enough gold.'); persist(); renderMenu(); renderPets(); };
  const t = $('#pgTarget'); if (t) t.onchange = () => { pgTarget = +t.value; };
  root.querySelectorAll('[data-pgspd]').forEach(b => b.onclick = () => { pgSpeed = +b.dataset.pgspd; if (pgAuto) { clearTimeout(pgAuto); pgAuto = setTimeout(pgRun, PG_STEP_MS / pgSpeed); } renderPets(); });
  const a = $('#pgAuto'); if (a) a.onclick = () => { if (pgAuto) return pgStop(); const p = findEntry(pgSel); if (pgTarget <= petGrade(p.id)) pgTarget = PG_MAX; pgAuto = setTimeout(pgRun, 60); renderPets(); };
}
