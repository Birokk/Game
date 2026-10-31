/* ---------- CS (Character Score): how built up a character is, graded F → SSS ----------
   Everything a character owns or wears adds points; rarer things add more (SSR < UR < MR). Per character:
     owning it        SSR 1,000 · UR 2,000
     each star        SSR   300 · UR   500   (up to 6)
     each awakened    SSR   500 · UR   800   (Breakthrough stars switched on)
     each owned skin  SSR   400 · UR   800 · MR 1,500
     each worn piece  R 100 · SSR 250 · UR 600, and a full 6-piece set of the same clothes adds R 500 · SSR 1,500 · UR 4,000
     pet with them    SSR   600 · UR 1,200, plus SSR 100 · UR 200 per pet star
     memory equipped  SSR   500 · UR 1,000
     each bond level  SSR   250 · UR   400   (up to 10)
   A fresh UR is 2,000 (E); SSS (30,000) needs a fully built UR with max bond and several skins. From grade S the
   character's stars get a "+" in the grade's colour (csPlus). */
const CS_PTS = {
  base: { 4: 1000, 5: 2000 }, star: { 4: 300, 5: 500 }, bt: { 4: 500, 5: 800 },
  skin: { 4: 400, 5: 800, 6: 1500 }, cloth: { 3: 100, 4: 250, 5: 600 }, set: { 3: 500, 4: 1500, 5: 4000 },
  pet: { 4: 600, 5: 1200 }, petStar: { 4: 100, 5: 200 }, mem: { 4: 500, 5: 1000 }, bond: { 4: 250, 5: 400 }
};
const CS_GRADES = [['F', 0], ['E', 1500], ['D', 3000], ['C', 5000], ['B', 7500], ['A', 10000], ['S', 15000], ['SS', 20000], ['SSS', 30000]];
const csP = (k, r) => CS_PTS[k][r] || CS_PTS[k][4] || 0;
/* the score broken into parts: [{ label, pts }] (empty for characters you don't own) */
function csParts(c) {
  if (!c || !owns(c.id)) return [];
  const r = +c.rarity, st = starsOf(c.id), out = [];
  out.push({ label: 'Character', pts: csP('base', r) });
  if (st) out.push({ label: `${st} star${st === 1 ? '' : 's'}`, pts: st * csP('star', r) });
  const bt = (S.bt[c.id] || []).filter(i => i < st).length;
  if (bt) out.push({ label: `${bt} awakened star${bt === 1 ? '' : 's'}`, pts: bt * csP('bt', r) });
  const sk = skinsOf(c.id).filter(k => owns(k.id));
  if (sk.length) out.push({ label: `${sk.length} skin${sk.length === 1 ? '' : 's'}`, pts: sk.reduce((t, k) => t + csP('skin', +k.rarity), 0) });
  const worn = Object.values(wearOf(c.id)).map(clothOf).filter(Boolean);
  if (worn.length) out.push({ label: `${worn.length} wardrobe piece${worn.length === 1 ? '' : 's'}`, pts: worn.reduce((t, x) => t + csP('cloth', +x.rarity), 0) });
  const set = worn.length === WARD_SLOTS.length && worn[0].set && worn.every(x => x.set === worn[0].set) ? worn[0] : null;
  if (set) out.push({ label: 'Full clothing set', pts: csP('set', +set.rarity) });
  const pet = petEqOf(c.id);
  if (pet) out.push({ label: `Pet: ${pet.name}`, pts: csP('pet', +pet.rarity) + starsOf(pet.id) * csP('petStar', +pet.rarity) });
  const mems = memEqOf(c.id).filter(Boolean).map(memOf).filter(Boolean);
  if (mems.length) out.push({ label: `Memory: ${mems[0].name}`, pts: mems.reduce((t, x) => t + csP('mem', +x.rarity), 0) });
  const bl = bondLv(c.id);
  if (bl) out.push({ label: `Bond level ${bl}`, pts: bl * csP('bond', r) });
  return out;
}
const charScore = c => csParts(c).reduce((t, x) => t + x.pts, 0);
const csGrade = n => { let g = CS_GRADES[0][0]; for (const [k, min] of CS_GRADES) if (n >= min) g = k; return g; };
const csNext = n => CS_GRADES.find(([, min]) => min > n) || null;
/* the "+" after a character's stars once its CS grade is S, SS or SSS */
function csPlus(c) {
  if (!owns(c.id)) return '';
  const g = csGrade(charScore(c));
  return ['S', 'SS', 'SSS'].includes(g) ? `<span class="cs-plus g-${g.toLowerCase()}" title="CS grade ${g}">+</span>` : '';
}
const gradeTag = (g, cls = '') => `<span class="grade g-${g.toLowerCase()} ${cls}">${g}</span>`;
/* just the grade badge for an owned character ('' otherwise); the score itself is only shown on the Home tab */
function csTag(c, cls = '') {
  if (!c || !owns(c.id)) return '';
  const n = charScore(c);
  return `<span class="cs-tag ${cls}" title="Character Score ${fmt(n)}">${gradeTag(csGrade(n))}</span>`;
}
const csInfoBtn = (cls = '') => `<button class="cs-info ${cls}" data-csinfo aria-label="How CS grades work">${icon('info')}</button>`;
function bindCSInfo(root) { (root || document).querySelectorAll('[data-csinfo]').forEach(b => b.onclick = e => { e.stopPropagation(); openCSInfo(); }); }
/* the character screen's Home tab: grade, CS, progress to the next grade and the breakdown */
function csCard(c) {
  if (!owns(c.id)) return '';
  const parts = csParts(c), n = parts.reduce((t, x) => t + x.pts, 0), g = csGrade(n), nx = csNext(n), lo = (CS_GRADES.find(([k]) => k === g) || [0, 0])[1];
  return `<div class="cs-card cs-score">
    <div class="cs-score-top">${gradeTag(g, 'big')}<div class="cs-score-n"><span class="lbl-sm">CS (Character Score)</span><b>${fmt(n)}</b>
      ${nx ? `<span class="bar cs-bar"><i style="width:${(n - lo) / (nx[1] - lo) * 100}%"></i></span><span class="tiny">${fmt(nx[1] - n)} CS to grade ${nx[0]}</span>` : '<span class="tiny">Top grade reached</span>'}</div>${csInfoBtn()}</div>
    <div class="cs-parts">${parts.map(x => `<span><em>${esc(x.label)}</em><b>+${fmt(x.pts)}</b></span>`).join('')}</div></div>`;
}
function openCSInfo() {
  const row = (l, k, rs) => `<tr><td>${l}</td>${[3, 4, 5, 6].map(r => `<td>${rs.includes(r) && CS_PTS[k][r] ? fmt(CS_PTS[k][r]) : '–'}</td>`).join('')}</tr>`;
  openModal({ title: 'Character Score (CS)', ic: 'info', kind: 'csinfo', body: `<div class="stack">
    <p class="desc">Every character has a <b>CS</b>: points for everything it owns or wears. Rarer things give more. The total sets its grade, from F up to SSS.</p>
    <div class="cs-grades">${CS_GRADES.map(([g, min], i) => `<div>${gradeTag(g)}<b>${fmt(min)}</b><small>${CS_GRADES[i + 1] ? `to ${fmt(CS_GRADES[i + 1][1] - 1)}` : 'and up'}</small></div>`).join('')}</div>
    <table class="cs-table"><thead><tr><th>Source</th><th>R</th><th>SSR</th><th>UR</th><th>MR</th></tr></thead><tbody>
      ${row('Owning the character', 'base', [4, 5])}${row('Each star (up to 6)', 'star', [4, 5])}${row('Each awakened Breakthrough star', 'bt', [4, 5])}
      ${row('Each owned skin', 'skin', [4, 5, 6])}${row('Each worn wardrobe piece', 'cloth', [3, 4, 5])}${row('Full 6-piece set of the same clothes', 'set', [3, 4, 5])}
      ${row('Pet with the character', 'pet', [4, 5])}${row('Each star of that pet', 'petStar', [4, 5])}${row('Equipped memory', 'mem', [4, 5])}${row('Each bond level (up to 10)', 'bond', [4, 5])}
    </tbody></table>
    <p class="tiny">The rarity in each column is the rarity of the character, skin, clothing piece, pet or memory. A brand-new UR starts at 2,000 CS (grade E). SSS takes a fully built UR: 6★ with every star awakened, a full UR set, a UR pet, a UR memory, max bond and several skins. From grade S a <b>+</b> appears after the character's stars, gold for S, prism for SS and red for SSS.</p>
  </div>` });
}
