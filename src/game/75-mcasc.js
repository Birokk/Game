/* ---------- Ascension: the main character's SSR → UR questline (the owner's ask) ----------
   Three steps (S.mcAsc {paid, done, at, tries}):
   1. gather 3 Mirror Shards (wallet `mshard`): every Quick match win has a 25% chance to drop one (MCA_DROP, a wrapper over
      ccGrantRewards; no more drop once you hold enough or the quest is done);
   2. the offering: 50,000 gold + the 3 shards (mcAscOffer);
   3. the Mirror Trial: beat your own main character in a Hard card battle with the fixed Origin Deck (MCA_DECK) against the
      MC's own deck (MCA_FOE) on MCA_HP. It runs on the Free Training match path (train.asc / cfg.asc: no stamina, no
      rewards, no record), with its own chip, plaque, end box and buttons; auto play is off in it.
   A win ascends the MC: both MC entries read rarity 5 from then on (mcAscApply: a getter on the entry's `rarity`, the admin's
   own value is kept for the content save through toJSON), so its CS, stars and every rarity tag follow; before that the
   MC is always SSR. */
CUR_SVG.mshard = '<svg class="cic" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="mshG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#cfd8ff"/><stop offset=".7" stop-color="#9a7cff"/><stop offset="1" stop-color="#ff8fd8"/></linearGradient></defs><path d="M12 1.6 18.6 8.4 15.6 22.2 8.2 22.2 5.4 8.4z" fill="url(#mshG)" stroke="#fff" stroke-opacity=".8" stroke-width=".6"/><path d="M12 1.6 12 22.2M5.4 8.4 18.6 8.4M12 1.6 8.2 22.2M12 1.6 15.6 22.2" stroke="#fff" stroke-opacity=".35" stroke-width=".5" fill="none"/><path d="M8.3 9.5 10.6 9.5 9.4 17z" fill="#fff" opacity=".55"/></svg>';
REW_NAMES.mshard = ['Mirror Shard', 'Mirror Shards']; REW_R.mshard = 5;
const MCA_GOLD = 50000, MCA_SHARDS = 3, MCA_DROP = .25, MCA_HP = 32, MCA_BRAIN = 'plan';
const MCA_DECK = ccPreset(['Champion', 'Commander', 'Guardian', 'Knight', 'Archer', 'Mage', 'Frost Witch', 'Battle Medic', 'Assassin', 'Fireball', 'Reinforce', 'Freeze', 'Healing Light', 'Counter Trap', 'Sharp Blade']);
const MCA_FOE = () => (CC_CAMP_DECKS.eclipse || CC_TOWER_DECKS.spire).slice();
const mcAscState = () => { const a = S.mcAsc = S.mcAsc && typeof S.mcAsc === 'object' ? S.mcAsc : {}; a.tries = a.tries || 0; return a; };
const mcAscDone = () => !!(S.mcAsc && S.mcAsc.done);
const mcaShards = () => S.wallet.mshard || 0;
const MCA_STARS = 6;   // the questline opens when the main character reaches 6★ (shards drop before that too)
const mcaReady = () => { const id = mcId(); return !!id && starsOf(id) >= MCA_STARS; };
const mcaStep = () => mcAscDone() ? 4 : mcAscState().won ? 3 : mcAscState().paid ? 2 : mcaShards() >= MCA_SHARDS ? 1 : 0;   // 0 gather · 1 offer · 2 trial · 3 complete · 4 done

/* the MC's rarity: SSR until ascended, UR after (the admin's stored value is kept for the content save) */
function mcAscApply() {
  ['mc-f', 'mc-m'].forEach(id => { const e = S.pool.find(x => x.id === id); if (!e || e._mca) return;
    let base = e.rarity;
    Object.defineProperty(e, 'rarity', { get: () => mcAscDone() ? 5 : 4, set: v => { base = v; }, enumerable: true, configurable: true });
    Object.defineProperty(e, '_mca', { value: true, enumerable: false, configurable: true });
    Object.defineProperty(e, 'toJSON', { value() { const o = {}; Object.keys(this).forEach(k => { o[k] = this[k]; }); o.rarity = base; return o; }, enumerable: false, configurable: true }); });
}
{ const o = ensureMC; ensureMC = function () { const r = o.apply(this, arguments); mcAscApply(); return r; }; }
mcAscApply();

/* drops: a Quick match win has a 25% chance of a Mirror Shard while the quest still needs one */
{ const o = ccGrantRewards; ccGrantRewards = function (winner) { const out = o.apply(this, arguments);
  if (winner === 0 && ccM && ccM.qm && !mcAscDone() && !mcAscState().paid && mcaShards() < MCA_SHARDS && Math.random() < MCA_DROP) { S.wallet.mshard = mcaShards() + 1; out.mshard = 1; }
  return out; }; }
{ const o = ccRewardsHTML; ccRewardsHTML = function (r) { const h = o.apply(this, arguments); if (!h || !r || !r.mshard) return h;
  return h.replace(/<\/div>\s*$/, `<span class="ccm-rw mca-rw">${curIcon('mshard')}<b>+1</b><small>Mirror Shard · ${mcaShards()} / ${MCA_SHARDS}</small></span></div>`); }; }

/* step 2: the offering */
function mcAscOffer() {
  if (mcAscState().paid || mcAscDone()) return;
  if (!mcaReady()) { toast(`The Ascension opens when your main character reaches ${MCA_STARS}★.`); return; }
  if (mcaShards() < MCA_SHARDS) { toast(`You need ${MCA_SHARDS} Mirror Shards. You have ${mcaShards()}.`); return; }
  if ((S.wallet.coins || 0) < MCA_GOLD) { toast(`The offering needs ${fmt(MCA_GOLD)} gold. You have ${fmt(S.wallet.coins || 0)}.`); return; }
  S.wallet.coins -= MCA_GOLD; S.wallet.mshard = mcaShards() - MCA_SHARDS; mcAscState().paid = Date.now();
  persist(); renderMenu(); if (csEl) renderCharacters(); renderMcAsc(); toast('The mirror accepts your offering. The Mirror Trial is open.');
}

/* step 3: the Mirror Trial (the Free Training match path, marked asc) */
let mcaReturn = false;
function mcAscBattle() {
  if (!mcAscState().paid || mcAscDone() || mcAscState().won || !mcaReady()) return;
  const me = mcId(); if (!me || !findEntry(me)) { toast('Pick your main character first.'); return; }
  const seed = (Math.random() * 4294967296) >>> 0, a = mcAscState(); a.tries++;
  const sv = ccSave(); a.autoPrev = !!sv.auto; sv.auto = false; persist();
  const cfg = Object.assign(ftCopy(FT_DEF), { asc: true, brain: MCA_BRAIN, first: 'foe', hp: [CC_CFG.hp, MCA_HP] });
  mcaReturn = true; closeModal();
  startClash({ id: 'mc-origin', name: 'Origin Deck', cards: MCA_DECK.slice() }, seed, null, null, null, null, null, { cfg, brain: MCA_BRAIN, seed, char: me, skin: 'default', back: 'default', asc: true });
}
{ const o = ftSetup; ftSetup = function (seed, f, deck) { if (!f || !f.asc) return o.apply(this, arguments);
  return { foeDeck: MCA_FOE(), deckName: 'the Mirror deck', opts: { ev: null, first: 1, hp: [CC_CFG.hp, MCA_HP] } }; }; }
const mcaMatch = () => !!(ccM && ccM.train && ccM.train.asc);
/* a win only marks the trial as passed; the player completes the questline by hand (mcaComplete) */
function mcaWin() { const a = mcAscState(); if (a.done || a.won) return false; a.won = Date.now(); persist(); return true; }
function mcaComplete() {
  const a = mcAscState(); if (a.done || !a.won) return;
  a.done = Date.now(); persist(); renderMenu(); if (csEl) renderCharacters(); renderMcAsc();
  const e = findEntry(mcId()); if (e) mcaCelebrate(e);
}
{ const o = ccEndScreen; ccEndScreen = function () {
  const asc = mcaMatch(), won = asc && ccM.G.winner === 0; let fresh = false; if (won) fresh = mcaWin();
  const r = o.apply(this, arguments);
  if (asc && ccM && ccM.el) { const box = ccM.el.querySelector('.ccm-end .ftr'); if (box) box.outerHTML = mcaEndHTML(won, fresh);
    const ag = ccM.el.querySelector('#ftAgain'), bk = ccM.el.querySelector('#ftBack');
    if (ag) { if (won) ag.remove(); else ag.innerHTML = `${icon('refresh')}Try again`; }
    if (bk) { bk.innerHTML = `${icon('sparkle')}Questline`; if (won) bk.className = 'btn gold'; } }
  return r; }; }
const mcaEndHTML = (won, fresh) => { const e = findEntry(mcId()) || {};
  return won ? `<div class="ccm-rw mca-end win"><span class="lbl-sm">${icon('sparkle')}The Mirror Trial</span><b>Trial passed!</b><span class="mca-rr">${rtag(4)}<i>→</i>${rtag(5)}</span><small>${fresh ? `Open the questline and complete it to ascend ${esc(e.name || 'your main character')} to UR.` : 'The trial is already passed.'}</small></div>`
    : `<div class="ccm-rw mca-end"><span class="lbl-sm">${icon('sparkle')}The Mirror Trial</span><small>Your reflection still stands. Try again: the trial costs nothing and you can retry as often as you like.</small></div>`; };
/* back from the trial (Leave, Questline, Try again) */
{ const o = openTraining; openTraining = function () { if (mcaReturn) { mcaReturn = false; mcaRestoreAuto(); openMcAsc(); return; } return o.apply(this, arguments); }; }
{ const o = ftBattle; ftBattle = function () { if (mcaReturn) { mcaRestoreAuto(); return mcAscBattle(); } return o.apply(this, arguments); }; }
const mcaRestoreAuto = () => { const a = mcAscState(); if ('autoPrev' in a) { ccSave().auto = a.autoPrev; delete a.autoPrev; persist(); } };
/* in the match: its own chip and plaque, no Auto button */
{ const o = ccRender; ccRender = function () { const r = o.apply(this, arguments);
  if (mcaMatch() && ccM.el) { const ch = ccM.el.querySelector('.ccm-tools .ccm-campst'); if (ch) { ch.title = 'The Mirror Trial: beat your reflection to ascend'; ch.innerHTML = `${icon('sparkle')}<b>Mirror Trial · Hard</b>`; }
    const au = ccM.el.querySelector('#ccAuto'); if (au) au.remove();
    const pl = ccM.el.querySelector('.ccm-hero.op .ccm-nm small'); if (pl) pl.textContent = 'Your reflection · Hard'; }
  return r; }; }
{ const o = ccLeave; ccLeave = function () {
  if (!mcaMatch()) return o.apply(this, arguments);
  if (ccM.G.phase === 'over') { ccStop(); openTraining(); return; }
  openModal({ title: 'Leave the trial?', ic: 'close', small: true, kind: 'ccleave', body: `<p>The trial ends here. Nothing is lost: you can try again from the questline as often as you like.</p><div class="row" style="gap:10px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close2>Keep playing</button><button class="btn gold" id="ccLeaveGo">Leave</button></div>`,
    onMount: b => { b.querySelector('[data-close2]').onclick = closeModal; b.querySelector('#ccLeaveGo').onclick = () => { closeModal(); ccStop(); openTraining(); }; } }); }; }

/* the questline window */
function openMcAsc() {
  openModal({ title: 'Ascension', ic: 'sparkle', kind: 'mcasc', body: '<div id="mcaRoot"></div>', onMount: () => renderMcAsc() });
}
function renderMcAsc() {
  const root = $('#mcaRoot'); if (!root) return;
  const e = findEntry(mcId()), a = mcAscState(), step = mcaStep(), have = mcaShards(), gold = S.wallet.coins || 0;
  if (!e) { root.innerHTML = '<p class="desc">Pick your main character first.</p>'; return; }
  const rd = mcaReady(), mst = starsOf(e.id);
  const st = (i, cls, ic, h, body) => `<div class="mca-st ${step > i ? 'done' : step === i && (i === 0 || rd) ? 'now' : 'lock'} ${cls}"><span class="mca-n">${step > i ? icon('check') : i + 1}</span><div class="mca-sb"><b>${icon(ic)}${h}</b>${body}</div></div>`;
  const shards = Array.from({ length: MCA_SHARDS }, (_, i) => `<i class="${a.paid || mcAscDone() || i < have ? 'on' : ''}">${curIcon('mshard')}</i>`).join('');
  root.innerHTML = `<div class="mca ${mcAscDone() ? 'asc' : ''}">
    <div class="mca-hd"><span class="mca-ava">${baseThumb(e)}</span><div><span class="lbl-sm">Main character questline</span><h3>The Mirror Trial</h3><span class="mca-rr">${rtag(4)}<i>→</i>${rtag(5)}</span></div>
      <p class="tiny">${mcAscDone() ? `${esc(e.name)} has ascended: your main character is <b>UR</b> now, with UR points in its CS.` : `${esc(e.name)} is <b>SSR</b>. Finish these steps to raise your main character to <b>UR</b> for good.`}</p>
      ${!mcAscDone() && !rd ? `<div class="mca-lock">${icon('lock')}<span><b>Opens at ${MCA_STARS}★</b>Your main character is ${mst}★ (Origin Orbs give stars). You can already collect Mirror Shards (up to ${MCA_SHARDS}).</span></div>` : ''}</div>
    ${st(0, '', 'cards', 'Gather Mirror Shards', `<p class="tiny">Every <b>Quick match win</b> has a ${Math.round(MCA_DROP * 100)}% chance to drop a Mirror Shard (any difficulty), up to ${MCA_SHARDS} at a time. They drop even before the questline opens.</p><div class="mca-sh">${shards}<span>${a.paid || mcAscDone() ? 'Offered' : `${Math.min(have, MCA_SHARDS)} / ${MCA_SHARDS}`}</span></div>${step === 0 ? '<button class="btn ghost sm" id="mcaQm">Go to Quick Match</button>' : ''}`)}
    ${st(1, '', 'gift', 'The offering', `<p class="tiny">Give the mirror <b>${fmt(MCA_GOLD)} gold</b> and <b>${MCA_SHARDS} Mirror Shards</b>.</p><div class="mca-cost"><span class="${gold >= MCA_GOLD || step > 1 ? 'ok' : ''}">${curIcon('coins')}${fmt(MCA_GOLD)}</span><span class="${have >= MCA_SHARDS || step > 1 ? 'ok' : ''}">${curIcon('mshard')}${MCA_SHARDS}</span></div>${step === 1 ? `<button class="btn gold sm" id="mcaOffer" ${gold >= MCA_GOLD && rd ? '' : 'disabled'}>${!rd ? `Opens at ${MCA_STARS}★` : gold >= MCA_GOLD ? 'Make the offering' : `Need ${fmt(MCA_GOLD - gold)} more gold`}</button>` : ''}`)}
    ${st(2, 'trial', 'swords', 'Beat your reflection', `<p class="tiny">A <b>Hard</b> card battle against ${esc(e.name)}: it plans every turn, starts on <b>${MCA_HP} HP</b> and goes first. You play the special <b>Origin Deck</b>; no auto play. Free, retry as often as you like.</p>
      <div class="mca-chips"><span>${icon('target')}Hard</span><span>${icon('heart')}${CC_CFG.hp} vs ${MCA_HP} HP</span><span>${icon('cards')}Origin Deck</span>${a.tries ? `<span>${icon('refresh')}${a.tries} ${a.tries === 1 ? 'try' : 'tries'}</span>` : ''}</div>
      <details class="mca-deck"><summary>See the Origin Deck</summary><div>${[...new Set(MCA_DECK)].map(id => `<span>${esc(ccDef(id).name)} ×${MCA_DECK.filter(x => x === id).length}</span>`).join('')}</div></details>
      ${step === 2 ? `<button class="btn gold" id="mcaGo" ${rd ? '' : 'disabled'}>${icon('swords')}${rd ? 'Begin the trial' : `Opens at ${MCA_STARS}★`}</button>` : ''}`)}
    ${st(3, '', 'sparkle', 'Complete the questline', `<p class="tiny">${step >= 3 ? 'You beat your reflection.' : 'Beat your reflection first.'} Complete the questline to ascend ${esc(e.name)} from <b>SSR</b> to <b>UR</b>.</p>${step === 3 ? `<button class="btn gold" id="mcaDone" data-norw>${icon('sparkle')}Complete · ascend to UR</button>` : ''}`)}
    ${mcAscDone() ? `<div class="mca-done">${icon('sparkle')}<b>Ascended</b><span>${new Date(a.done).toLocaleDateString()}</span></div>` : ''}
  </div>`;
  const q = $('#mcaQm'); if (q) q.onclick = () => { closeModal(); if (csEl) closeCharacters(); openQuickMatch(); };
  const of = $('#mcaOffer'); if (of) of.onclick = mcAscOffer;
  const go = $('#mcaGo'); if (go) go.onclick = () => { if (csEl) closeCharacters(); mcAscBattle(); };
  const dn = $('#mcaDone'); if (dn) dn.onclick = mcaComplete;
}
/* the ascension moment: the MC's art, SSR turning into UR */
function mcaCelebrate(e) {
  const el = document.createElement('div'); el.className = 'mca-cele'; const art = baseArt(e);
  el.innerHTML = `<div class="mca-cg"></div>${art ? `<img class="mca-ca" src="${art}" alt="">` : ''}<div class="mca-cm"><span class="lbl-sm">Ascension</span><b>${esc(e.name)}</b><span class="mca-rr big"><span class="o">${rtag(4)}</span><i>→</i><span class="n">${rtag(5)}</span></span><small>Tap to continue</small></div>`;
  document.body.appendChild(el); el.onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
}
/* the main character's Breakthrough tab: a box under the Origin Orb */
{ const o = renderCharacters; renderCharacters = function () { o.apply(this, arguments); const c = csEl && findEntry(csId);
  if (!c || csTab !== 'bt' || !MC_IDS[c.id] || csEl.querySelector('.mca-box')) return;
  const at = csEl.querySelector('.mco-box') || csEl.querySelector('.bt-stars'); if (!at) return;
  const step = mcaStep();
  at.insertAdjacentHTML(at.classList.contains('mco-box') ? 'afterend' : 'beforebegin', `<div class="cs-card mca-box ${mcAscDone() ? 'asc' : ''}"><div class="mco-top"><span class="mco-ic">${curIcon('mshard')}</span><div><b>Ascension · <span data-norw>SSR → UR</span></b><span class="tiny">${mcAscDone() ? 'Ascended: your main character is UR.' : !mcaReady() ? `Opens at ${MCA_STARS}★ · Mirror Shards ${Math.min(mcaShards(), MCA_SHARDS)} / ${MCA_SHARDS}` : `Step ${step + 1} of 4 · ${['Gather Mirror Shards', 'The offering', 'Beat your reflection', 'Complete the questline'][step]}`}</span></div><span class="mco-n">${Math.min(step, 4)} / 4</span></div><button class="btn ${mcAscDone() ? 'ghost' : 'gold'}" id="mcaOpen">${icon(mcAscDone() || mcaReady() ? 'sparkle' : 'lock')}${mcAscDone() ? 'View questline' : mcaStep() === 3 ? 'Complete the questline' : 'Open questline'}</button></div>`);
  const b = csEl.querySelector('#mcaOpen'); if (b) b.onclick = openMcAsc; }; }
/* the Bag */
{ const o = invItems; invItems = function () { const L = o.apply(this, arguments);
  if (mcaShards() > 0) L.push({ id: 'mshard', cat: 'use', name: 'Mirror Shard', n: mcaShards(), r: 5, tag: 'Quest item', use: `Needed for your main character's Ascension: offer ${MCA_SHARDS} with ${fmt(MCA_GOLD)} gold, then beat your reflection. Quick match wins drop them (${Math.round(MCA_DROP * 100)}%).`, lore: 'In its surface you look a little more like who you could be.', pic: curIcon('mshard'), act: ['Questline', () => { closeInventory(); openMcAsc(); }] });
  return L; }; }
if (typeof ADMIN_ART !== 'undefined') { ADMIN_ART.mshard = () => adIconRow('mshard', 'Mirror Shard', 'The main character Ascension item: dropped by Quick match wins'); if (ADMIN_ART_SECS.icons) ADMIN_ART_SECS.icons.push('mshard'); }
