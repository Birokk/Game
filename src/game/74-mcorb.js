/* ---------- Origin Orb: the main character's stars (the owner's ask) ----------
   The main character is never pulled, so it can't get stars from duplicates. An Origin Orb (wallet `mcorb`) gives it
   +1★ (up to MAX_STARS), used from its Breakthrough tab or the Bag. Orbs come from: clearing the tutorial chapter
   (Chapter 0's last stage), clearing Chapter 5 and the level 10 reward (lvReward). The campaign ones are sent by mail
   once (S.mcOrb.got = [source ids]), also to older saves that already cleared those chapters (mcOrbCheck from
   renderMenu and right after a stage). */
CUR_SVG.mcorb = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><radialGradient id="mcoG" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffd7f4"/><stop offset=".7" stop-color="#b48cff"/><stop offset="1" stop-color="#4a3aa8"/></radialGradient><radialGradient id="mcoH" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#c9a8ff" stop-opacity=".55"/><stop offset="1" stop-color="#c9a8ff" stop-opacity="0"/></radialGradient></defs><circle cx="12" cy="12" r="11.5" fill="url(#mcoH)"/><circle cx="12" cy="12" r="8" fill="url(#mcoG)" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/><path d="M12 7.2l1.35 2.95 3.2.35-2.4 2.15.68 3.15L12 14.2l-2.83 1.6.68-3.15-2.4-2.15 3.2-.35z" fill="#fff" opacity=".92"/><ellipse cx="9.4" cy="8.6" rx="2" ry="1.1" fill="#fff" opacity=".6" transform="rotate(-30 9.4 8.6)"/></svg>';
REW_NAMES.mcorb = ['Origin Orb', 'Origin Orbs']; REW_R.mcorb = 5;
const MC_ORB_SRC = [
  { id: 'c0', ch: 'c0', txt: 'Clear the tutorial chapter (Chapter 0)' },
  { id: 'c5', ch: 'c5', txt: 'Clear Chapter 5' },
  { id: 'c10', ch: 'c10', txt: 'Clear Chapter 10' },
  { id: 'lv10', lv: 10, txt: 'Reach player level 10 (a level reward)' },
  { id: 'lv20', lv: 20, txt: 'Reach player level 20 (a level reward)' },
];
const mcOrbState = () => { const m = S.mcOrb = S.mcOrb || {}; m.got = m.got || []; return m; };
const mcId = () => S.player && S.player.mc ? 'mc-' + S.player.mc : null;
const mcChCleared = chId => { const ch = CC_CAMP.find(c => c.id === chId); if (!ch) return false; const L = ch.stages; return !!ccCampHave(L[L.length - 1].id)[0]; };
function mcOrbCheck() {
  const m = mcOrbState(), add = MC_ORB_SRC.filter(s => s.ch && !m.got.includes(s.id) && mcChCleared(s.ch));
  if (!add.length) return 0;
  add.forEach(s => m.got.push(s.id));
  mailAdd(add.map(s => { const ch = CC_CAMP.find(c => c.id === s.ch); return { id: 'mcorb-' + s.id, date: dayKey(), from: 'Campaign', title: `${ch.no ? 'Chapter ' + ch.no : 'Tutorial'} cleared!`, body: `You cleared ${ch.no ? `Chapter ${ch.no} · ${ch.name}` : 'the tutorial chapter, The First Lesson'}. Here is an Origin Orb: use it on your main character's Breakthrough tab for +1★.`, reward: { mcorb: 1 } }; }));
  persist(); return add.length;
}
/* the level 10 reward carries one orb */
{ const o = lvReward; lvReward = function (lv) { const r = o.apply(this, arguments); if (lv === 10 || lv === 20) r.push(['mcorb', 1]); return r; }; }
/* a stage clear that finishes Chapter 0 / 5 mails the orb at once; the end box says so */
{ const o = ccCampFinish; ccCampFinish = function () { const r = o.apply(this, arguments); r.mcorb = mcOrbCheck(); return r; }; }
{ const o = ccCampEndHTML; ccCampEndHTML = function () { const h = o.apply(this, arguments), r = ccM && ccM.campRes; if (!h || !r || !r.mcorb) return h;
  return h.replace(/<\/div>$/, `<p class="ccm-camp-ch mco-note">${curIcon('mcorb')}An Origin Orb for your main character was sent to your mail.</p></div>`); }; }
function useMcOrb() {
  const id = mcId(), e = id && findEntry(id); if (!e) { toast('Pick your main character first.'); return; }
  const st = starsOf(id), have = S.wallet.mcorb || 0;
  if (st >= MAX_STARS) { toast(`${e.name} is already at ${MAX_STARS}★.`); return; }
  if (!have) { toast('You have no Origin Orb. Clear the tutorial chapter, Chapter 5 or 10, or reach level 10 or 20.'); return; }
  openModal({ title: 'Use an Origin Orb?', ic: 'sparkle', small: true, body: `<div class="mco-cf">${curIcon('mcorb')}<p class="desc">Give <b>${esc(e.name)}</b> one more star: <b>${st}★ → ${st + 1}★</b>.</p><p class="tiny">Origin Orbs ${have} → ${have - 1}</p><div class="row" style="justify-content:center;gap:8px"><button class="btn ghost" id="mcoNo">Cancel</button><button class="btn gold" id="mcoYes">${icon('sparkle')}Use · ${st + 1}★</button></div></div>`,
    onMount: () => { $('#mcoNo').onclick = closeModal; $('#mcoYes').onclick = () => { if ((S.wallet.mcorb || 0) < 1 || starsOf(id) >= MAX_STARS) return closeModal();
      S.wallet.mcorb--; S.owned[id] = Math.max(1, S.owned[id] || 1) + 1; persist(); closeModal(); renderMenu(); if (csEl) renderCharacters(); if (typeof invEl !== 'undefined' && invEl) renderInventory();
      toast(`${e.name} reached ${starsOf(id)}★!`); }; } });
}
const mcOrbHTML = c => { const have = S.wallet.mcorb || 0, st = starsOf(c.id), m = mcOrbState();
  const src = MC_ORB_SRC.map(s => { const done = s.lv ? lvClaimed(s.lv) : m.got.includes(s.id); return `<li class="${done ? 'ok' : ''}">${done ? icon('check') : icon('lock')}<span>${esc(s.txt)}</span></li>`; }).join('');
  return `<div class="cs-card mco-box"><div class="mco-top"><span class="mco-ic">${curIcon('mcorb')}</span><div><b>Origin Orb</b><span class="tiny">Your main character is never summoned, so its stars come from Origin Orbs: each one gives +1★ (up to ${MAX_STARS}★).</span></div><span class="mco-n">×${fmt(have)}</span></div>
    <ul class="mco-src">${src}</ul>
    <button class="btn gold" id="mcoUse" ${have && st < MAX_STARS ? '' : 'disabled'}>${icon('sparkle')}${st >= MAX_STARS ? `Max stars (${MAX_STARS}★)` : `Use an Origin Orb · ${st}★ → ${st + 1}★`}</button></div>`; };
{ const o = renderCharacters; renderCharacters = function () { o.apply(this, arguments); const c = csEl && findEntry(csId);
  if (!c || csTab !== 'bt' || !MC_IDS[c.id]) return; const at = csEl.querySelector('.bt-stars'); if (!at || csEl.querySelector('.mco-box')) return;
  at.insertAdjacentHTML('beforebegin', mcOrbHTML(c)); const b = csEl.querySelector('#mcoUse'); if (b) b.onclick = useMcOrb; }; }
/* the Bag */
{ const o = invItems; invItems = function () { const L = o.apply(this, arguments);
  L.push({ id: 'mcorb', cat: 'use', name: 'Origin Orb', n: S.wallet.mcorb || 0, r: 5, tag: 'Key item', use: `Gives your main character +1★ (up to ${MAX_STARS}★). From clearing the tutorial chapter, Chapters 5 and 10, and the level 10 and 20 rewards.`, lore: 'It hums with the first light you ever carried.', pic: curIcon('mcorb'), act: ['Use', () => useMcOrb()] });
  return L.filter(x => x.id !== 'mcorb' || x.n > 0); }; }
if (typeof ADMIN_ART !== 'undefined') { ADMIN_ART.mcorb = () => adIconRow('mcorb', 'Origin Orb', 'Raises the main character’s stars'); if (ADMIN_ART_SECS.icons) ADMIN_ART_SECS.icons.push('mcorb'); }
