/* ---------- Free Training (the Battle screen's Free Training card) ----------
   The owner asked for a training ground for Card Battle where you set how the match goes so you can practise: free to
   play (no stamina) and no rewards. You pick both decks, the opponent's brain (from a Dummy that never acts up to the
   Expert planner), both heroes' HP, extra AP every turn, extra cards in the opening hand, who goes first, a battle event,
   a round limit and the opponent's look (character, board skin, card back), or start from a preset. Nothing is counted:
   no gold, pearls, gear, W / L / D record, quests or achievements.
   State S.cc.ft (player save, ftState) keeps the last setup. ftBattle → startClash(..., train) → ftMatch builds the match
   (45-clash-ui.js hooks: the bot's brain, the plaque, the chip, the end box, Leave). */
ICONS.target = '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/><path d="M12 1.5v3.5M12 19v3.5M1.5 12H5M19 12h3.5"/>';
/* the opponent's brain: dummy = never acts; easy / bot / plan / best = the Quick match brains (qmAi, ccBotPickEasy) */
const FT_BRAINS = [
  { id: 'dummy', name: 'Dummy', pips: 0, col: '#8ff5d2', desc: 'Never acts: it only ends its turns. Try combos in peace.' },
  { id: 'easy', name: 'Easy', pips: 1, col: '#9ff5c6', desc: 'Makes mistakes and sometimes ends its turn early.' },
  { id: 'bot', name: 'Normal', pips: 2, col: '#94b8ff', desc: 'An average player, like a Normal Quick match.' },
  { id: 'plan', name: 'Hard', pips: 3, col: '#ffb3dd', desc: 'Plans its whole turn ahead before it moves.' },
  { id: 'best', name: 'Expert', pips: 4, col: '#ff8a8a', desc: 'Plans like auto play: the toughest opponent.' }
];
const ftBrain = id => FT_BRAINS.find(b => b.id === id) || FT_BRAINS[2];
const FT_HP = [1, 60], FT_AP = 6, FT_HAND = 3, FT_ROUNDS = [0, 8, 12, 20];
const FT_DEF = { me: null, foe: 'mirror', brain: 'bot', first: 'coin', hp: [20, 20], ap: [0, 0], hand: [0, 0], ev: 'none', rounds: 0, hpWin: false, skin: 'random', back: 'random', char: null, fixed: false, seed: 1, last: 0, preset: 'standard' };
const FT_PRESETS = [
  { id: 'standard', name: 'Standard match', ic: 'swords', col: '#94b8ff', sub: 'Normal rules against an average player', set: {} },
  { id: 'bag', name: 'Punching bag', ic: 'target', col: '#8ff5d2', sub: 'A Dummy on 60 HP that never fights back', set: { brain: 'dummy', hp: [20, 60], first: 'me' } },
  { id: 'combo', name: 'Combo lab', ic: 'bolt', col: '#ffe3a0', sub: '+4 AP and 3 more cards against a Dummy', set: { brain: 'dummy', hp: [20, 40], ap: [4, 0], hand: [3, 0], first: 'me' } },
  { id: 'stand', name: 'Last stand', ic: 'shield', col: '#ff8a8a', sub: 'You on 10 HP vs an Expert who goes first', set: { brain: 'best', hp: [10, 20], ap: [0, 1], first: 'foe' } },
  { id: 'blitz', name: 'Blitz drill', ic: 'clock', col: '#ffd27a', sub: '12 HP each, ends after round 12', set: { hp: [12, 12], rounds: 12, hpWin: true } },
  { id: 'events', name: 'Event practice', ic: 'sparkle', col: '#c8a2ff', sub: 'A random battle event every match', set: { ev: 'random' } },
  { id: 'boss', name: 'Boss rehearsal', ic: 'crown', col: '#ffb07a', sub: 'The Sky Sovereign’s deck on Expert, 30 HP', set: { foe: 'spire', brain: 'best', hp: [20, 30], first: 'foe' } }
];
const ftCopy = o => JSON.parse(JSON.stringify(o));
/* every deck the opponent can play: a mirror of yours, the starters, the campaign decks, the Great Tree's, your own */
function ftFoeList() {
  const L = [{ id: 'mirror', name: 'Mirror · your own deck', g: 'Mirror' }];
  CC_PRESETS.forEach(p => L.push({ id: p.id, name: p.name, g: 'Starter decks', cards: p.cards }));
  Object.keys(CC_CAMP_DECKS).forEach(k => L.push({ id: k, name: QM_RIVAL_NM[k] || k[0].toUpperCase() + k.slice(1) + ' deck', g: 'Campaign decks', cards: CC_CAMP_DECKS[k] }));
  L.push({ id: 'spire', name: 'Sky Sovereign deck', g: 'The Great Tree', cards: CC_TOWER_DECKS.spire });
  ccSave().decks.filter(d => ccValidateDeck(d.cards).ok).forEach(d => L.push({ id: 'own:' + d.id, name: d.name, g: 'Your decks', cards: d.cards }));
  return L;
}
const ftChars = () => S.pool.filter(e => e.type === 'character' && !e.mc);
/* the saved setup, repaired so an old or edited save can't break the lobby */
function ftState() {
  const sv = ccSave(); if (!sv.ft || typeof sv.ft !== 'object') sv.ft = ftCopy(FT_DEF);
  const f = sv.ft, cl = (v, a, b, d) => Number.isFinite(+v) ? Math.max(a, Math.min(b, Math.round(+v))) : d;
  for (const k in FT_DEF) if (!(k in f)) f[k] = ftCopy(FT_DEF[k]);
  ['hp', 'ap', 'hand'].forEach(k => { if (!Array.isArray(f[k]) || f[k].length !== 2) f[k] = ftCopy(FT_DEF[k]); });
  f.hp = f.hp.map(v => cl(v, FT_HP[0], FT_HP[1], 20)); f.ap = f.ap.map(v => cl(v, 0, FT_AP, 0)); f.hand = f.hand.map(v => cl(v, 0, FT_HAND, 0));
  if (!FT_BRAINS.some(b => b.id === f.brain)) f.brain = 'bot';
  if (!['me', 'foe', 'coin'].includes(f.first)) f.first = 'coin';
  if (!FT_ROUNDS.includes(+f.rounds)) f.rounds = 0;
  if (f.ev !== 'none' && f.ev !== 'random' && !CC_EVENTS[f.ev]) f.ev = 'none';
  if (!ftFoeList().some(x => x.id === f.foe)) f.foe = 'mirror';
  if (f.skin !== 'random' && !CC_SKINS.some(s => s.id === f.skin)) f.skin = 'random';
  if (f.back !== 'random' && !CC_BACKS.some(b => b.id === f.back)) f.back = 'random';
  if (f.char && !ftChars().some(e => e.id === f.char)) f.char = null;
  f.seed = cl(f.seed, 0, 4294967295, 1);
  return f;
}
function ftMyDeck() { const f = ftState(), ok = ccAllDecks().filter(d => ccValidateDeck(d.cards).ok), d = ok.find(x => x.id === f.me); return d || ccCampMyDeck(); }
const ftFoe = f => ftFoeList().find(x => x.id === f.foe) || ftFoeList()[0];
/* the match a setup makes (the same seed + setup = the same shuffle and the same event) */
function ftSetup(seed, f, deck) {
  const F = ftFoe(f), opts = { hp: f.hp.slice() };
  if (f.first === 'me') opts.first = 0; else if (f.first === 'foe') opts.first = 1;
  opts.ev = f.ev === 'none' ? null : f.ev === 'random' ? CC_EV_KEYS[(seed >>> 5) % CC_EV_KEYS.length] : f.ev;
  if (f.ap[0] || f.ap[1]) opts.apB = f.ap.slice();
  if (f.rounds) { opts.rounds = f.rounds; opts.hpWin = !!f.hpWin; opts.limitText = f.hpWin ? `Round ${f.rounds} ended: the hero with more HP wins` : `Round ${f.rounds} ended: training time is up`; }
  if (f.hand[0] || f.hand[1]) { const h = f.hand.slice(); opts.setup = G => [0, 1].forEach(p => { if (h[p]) ccDraw(G, p, h[p], true); }); }
  return { foeDeck: (F.id === 'mirror' ? deck.cards : F.cards).slice(), deckName: F.id === 'mirror' ? 'your deck' : F.name, opts };
}
const ftMatch = (deck, seed, names, t) => { const s = ftSetup(seed, t.cfg, deck); return ccCreateMatch(seed, deck.cards.slice(), s.foeDeck, names, s.opts); };
/* who the opponent plays as: the chosen character, else (not for a Dummy) one picked by the seed like Quick match */
const ftFoeChar = (t, seed) => t.char ? findEntry(t.char) || null : t.brain === 'dummy' ? null : ccQmFoe(seed);
/* a short summary of a setup as chips */
function ftChips(f) {
  return [
    ['target', ftBrain(f.brain).name],
    ['cards', ftFoe(f).id === 'mirror' ? 'Mirror deck' : ftFoe(f).name],
    ['heart', `${f.hp[0]} vs ${f.hp[1]} HP`],
    f.ap[0] || f.ap[1] ? ['bolt', `AP +${f.ap[0]} / +${f.ap[1]}`] : null,
    f.hand[0] || f.hand[1] ? ['cards', `Hand +${f.hand[0]} / +${f.hand[1]}`] : null,
    ['swords', f.first === 'me' ? 'You go first' : f.first === 'foe' ? 'Opponent goes first' : 'Coin flip'],
    f.ev !== 'none' ? ['sparkle', f.ev === 'random' ? 'Random event' : CC_EVENTS[f.ev].name] : null,
    f.rounds ? ['clock', `Ends after round ${f.rounds}${f.hpWin ? ' · more HP wins' : ''}`] : null
  ].filter(Boolean);
}
/* start a match with the saved setup: no stamina, nothing won */
function ftBattle() {
  const f = ftState(), deck = ftMyDeck();
  if (!ccValidateDeck(deck.cards).ok) { toast('Pick a deck with 30 cards first.', true); return; }
  const seed = f.fixed ? f.seed >>> 0 : (Math.random() * 4294967296) >>> 0; f.last = seed; persist();
  const t = { cfg: ftCopy(f), brain: f.brain, seed, char: f.char, skin: f.skin === 'random' ? ccBotSkin(seed) : f.skin, back: f.back === 'random' ? ccBotBack(seed) : f.back };
  closeTraining(false);
  startClash({ id: deck.id, name: deck.name, cards: deck.cards.slice() }, seed, null, null, null, null, null, t);
}
/* the end box: no rewards, the setup, the seed (to replay the same shuffle) */
function ftEndHTML(t) {
  return `<div class="ccm-rw ftr"><span class="lbl-sm">${icon('target')}Free Training · no rewards</span><div class="ftr-ch">${ftChips(t.cfg).map(([ic, x]) => `<span>${icon(ic)}${esc(x)}</span>`).join('')}</div><p class="tiny">Seed ${t.seed}: set it under Shuffle to play the same shuffle again.</p></div>`;
}
const ftEndBtns = () => `<div class="ccm-endb"><button class="btn gold" id="ftAgain">${icon('refresh')}Play again</button><button class="btn ghost" id="ftBack">${icon('target')}Training</button></div>`;
INFO.training = () => ({ title: 'Free Training', body: `<p class="desc">A training ground for Card Battle. Set the match up exactly how you want it and practise: it costs <b>no stamina</b> and gives <b>no rewards</b> (no gold, pearls, gear, record, quests or achievements).</p>
  <ul class="info-list"><li><b>Presets</b> fill in a setup in one tap; change anything afterwards.</li>
  <li><b>Opponent</b>: a Dummy that never acts, or a bot from Easy to Expert (the same brains as Quick match).</li>
  <li><b>Decks</b>: yours (any ready deck) and the opponent's: a mirror of yours, a starter, a campaign deck, the Great Tree's, or one of your own.</li>
  <li><b>Heroes</b>: each side's HP (${FT_HP[0]}–${FT_HP[1]}), extra AP every turn (up to +${FT_AP}) and extra cards in the opening hand (up to +${FT_HAND}). The hand still holds at most ${CC_CFG.handMax} cards, and a hero heals back to ${CC_CFG.hp} at most.</li>
  <li><b>Rules</b>: who goes first, a battle event, and a round limit (a draw, or the hero with more HP wins).</li>
  <li><b>Shuffle</b>: a new shuffle every match, or a fixed seed to replay the same draws. The end of a match shows its seed.</li>
  <li><b>Look</b>: the character the opponent plays as, its board skin and its card back.</li></ul>
  <p class="tiny">Auto play works here too. Leaving a training match costs nothing.</p>` });

/* ---- the lobby: the Quick match / Raids glass page (.rdx): presets on the left, the setup in glass panels, one bar ---- */
let ftEl = null;
function openTraining() {
  closeModal();
  if (!ftEl) {
    ftEl = document.createElement('div'); ftEl.className = 'ftx rdx'; ftEl.setAttribute('role', 'dialog'); ftEl.setAttribute('aria-label', 'Free Training'); document.body.appendChild(ftEl);
    ftEl._key = e => { if (e.key === 'Escape' && ftEl && !document.querySelector('.modal-back')) closeTraining(); };
    addEventListener('keydown', ftEl._key);
  }
  renderTraining();
}
function closeTraining(home = true) { if (ftEl) { removeEventListener('keydown', ftEl._key); ftEl.remove(); ftEl = null; } if (home && !ccdEl) bthHome(); }
function ftApply(id) {
  const p = FT_PRESETS.find(x => x.id === id); if (!p) return;
  const f = ftState(), keep = { me: f.me, skin: f.skin, back: f.back, char: f.char, fixed: f.fixed, seed: f.seed, last: f.last };
  ccSave().ft = Object.assign(ftCopy(FT_DEF), keep, ftCopy(p.set), { preset: id }); persist(); renderTraining();
}
/* a change made by hand: the setup is now "Custom" */
const ftSet = fn => { const f = ftState(); fn(f); f.preset = 'custom'; persist(); renderTraining(); };
function renderTraining() {
  if (!ftEl) return;
  const f = ftState(), deck = ftMyDeck(), valid = ccValidateDeck(deck.cards).ok, B = ftBrain(f.brain), F = ftFoe(f), le = ccLeaderOf(deck.id);
  const ch = f.char ? findEntry(f.char) : null, bg = MEDIA.get('ft:bg');
  const keep = ftEl.querySelector('.rdx-scroll'), top = keep ? keep.scrollTop : 0;
  const sel = (k, opts, v) => `<select class="ftx-sel" data-ftsel="${k}" aria-label="${k}">${opts}</select>`;
  const seg = (k, L, v) => `<span class="ftx-seg" role="group">${L.map(([val, t]) => `<button class="ftx-sg ${String(v) === String(val) ? 'on' : ''}" data-ftseg="${k}" data-v="${val}" aria-pressed="${String(v) === String(val)}">${t}</button>`).join('')}</span>`;
  const step = (k, p, v, max, plus) => `<span class="ftx-step"><button data-ftst="${k}" data-p="${p}" data-d="-1" aria-label="Less" ${v <= 0 ? 'disabled' : ''}>−</button><b>${plus ? '+' : ''}${v}</b><button data-ftst="${k}" data-p="${p}" data-d="1" aria-label="More" ${v >= max ? 'disabled' : ''}>+</button></span>`;
  const rng = (p, v) => `<span class="ftx-rng"><input type="range" min="${FT_HP[0]}" max="${FT_HP[1]}" value="${v}" data-ftr="${p}" aria-label="${p ? 'Opponent' : 'Your'} HP"><b data-ftrv="${p}">${v}</b></span>`;
  const row = (t, s, ctl) => `<div class="ftx-row"><span class="ftx-lb"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</span><span class="ftx-ctl">${ctl}</span></div>`;
  const groups = (L, v) => { const G = [...new Set(L.map(x => x.g))]; return G.map(g => `<optgroup label="${esc(g)}">${L.filter(x => x.g === g).map(x => `<option value="${esc(x.id)}" ${x.id === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join(''); };
  const myDecks = ccAllDecks().filter(d => ccValidateDeck(d.cards).ok).map(d => ({ id: d.id, name: d.name, g: d.preset ? 'Starter decks' : 'Your decks' }));
  const evChip = (k, name, ic, col) => `<button class="ftx-ev ${f.ev === k ? 'on' : ''}" data-ftev="${k}" style="--ec:${col}" aria-pressed="${f.ev === k}" ${CC_EVENTS[k] ? `title="${esc(CC_EVENTS[k].short || '')}"` : ''}>${ic}<b>${esc(name)}</b></button>`;
  const preset = p => `<button class="rdx-it ftx-it ${f.preset === p.id ? 'on' : ''}" data-ftp="${p.id}" style="--mc:${p.col}"><span class="rdx-iti">${icon(p.ic)}</span><span class="rdx-itt"><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></span></button>`;
  const brain = b => `<button class="ftx-br ${b.id === f.brain ? 'on' : ''}" data-ftb="${b.id}" style="--dc:${b.col}" aria-pressed="${b.id === f.brain}">
      <span class="ftx-brh"><span class="qmx-pips">${Array.from({ length: 4 }, (_, i) => `<i class="${i < b.pips ? 'on' : ''}"></i>`).join('')}</span><b>${b.name}</b></span><small>${esc(b.desc)}</small></button>`;
  const opAv = ch ? baseThumb(ch) : f.brain === 'dummy' ? icon('target') : '?', opName = ch ? ch.name : f.brain === 'dummy' ? 'Training Dummy' : 'Random character';
  ftEl.innerHTML = `<div class="rdx-bg ftx-bg ${bg ? 'art' : ''}">${bg ? `<span class="ftx-wp">${artImg('ft:bg')}</span>` : `<div class="ftx-scene">${bthArt('training', true)}</div>`}<i class="hgx-glow g1 ftx-g1"></i><i class="hgx-glow g2 ftx-g2"></i><i class="hgx-glow g3 ftx-g3"></i></div><div class="rdx-shade ftx-shade"></div>
    <header class="rdx-head"><div class="inv-title"><span class="inv-badge">${icon('target')}</span><h2 class="ts">Free Training</h2></div>
      ${infoBtn('training', 'How Free Training works')}<button class="cs-info info-btn" id="ftRules" title="How to play" aria-label="How to play">${icon('book')}</button><span class="rdx-sp"></span>
      <span class="rdx-ward ftx-free" title="Training costs no stamina and gives no rewards">${icon('check')}Free<em>No stamina · no rewards</em></span>
      <button class="rdx-sec ftx-hb" id="ftReset" title="Back to the standard setup">${icon('refresh')}<span>Reset</span></button>
      <button class="inv-x" id="ftClose" aria-label="Close">${icon('close')}</button></header>
    <aside class="rdx-rail"><span class="rdx-gh">${icon('sparkle')}Presets</span>${FT_PRESETS.map(preset).join('')}
      ${f.preset === 'custom' ? `<span class="rdx-gh">${icon('edit')}Your setup</span><div class="rdx-it ftx-it on ftx-cus"><span class="rdx-iti">${icon('edit')}</span><span class="rdx-itt"><b>Custom</b><small>Your own settings</small></span></div>` : ''}</aside>
    <section class="rdx-main"><div class="rdx-scroll">
      <div class="rdx-hero"><span class="rdx-kind">${icon('target')}Card Battle · Practice</span>
        <h1 class="rdx-title ftx-title">Training Ground</h1><p class="rdx-desc">Set the match up exactly how you want it and practise. Nothing is spent and nothing is won, so try anything.</p>
        <div class="rdx-meta">${ftChips(f).map(([ic, x]) => `<span>${icon(ic)}${esc(x)}</span>`).join('')}</div></div>
      <div class="rdx-panel"><div class="rdx-ph"><b>Opponent</b><small>How it plays</small></div><div class="ftx-brs">${FT_BRAINS.map(brain).join('')}</div></div>
      <div class="ftx-grid">
        <div class="rdx-panel"><div class="rdx-ph"><b>Decks</b><small>Any ready deck</small></div>
          ${row('Your deck', le ? `${icon('crown')}Leader ${esc(le.name)}` : 'The deck you play with', sel('me', groups(myDecks, deck.id)))}
          ${row('Opponent’s deck', F.id === 'mirror' ? 'A copy of your deck' : F.g, sel('foe', groups(ftFoeList(), f.foe)))}
          <button class="rdx-sec ftx-edit" id="ftDecks">${icon('cards')}Edit decks</button></div>
        <div class="rdx-panel"><div class="rdx-ph"><b>Heroes</b><small>Each side</small></div>
          <div class="ftx-hero"><span></span><span class="ftx-hh">You</span><span class="ftx-hh">Opponent</span>
            <span class="ftx-lb"><b>Hero HP</b><small>${FT_HP[0]}–${FT_HP[1]} · normal ${CC_CFG.hp}</small></span>${rng(0, f.hp[0])}${rng(1, f.hp[1])}
            <span class="ftx-lb"><b>Extra AP</b><small>Every turn · normal ${CC_CFG.ap}</small></span>${step('ap', 0, f.ap[0], FT_AP, 1)}${step('ap', 1, f.ap[1], FT_AP, 1)}
            <span class="ftx-lb"><b>Opening hand</b><small>Extra cards · normal ${CC_CFG.hand0}</small></span>${step('hand', 0, f.hand[0], FT_HAND, 1)}${step('hand', 1, f.hand[1], FT_HAND, 1)}</div></div>
        <div class="rdx-panel"><div class="rdx-ph"><b>Match rules</b></div>
          ${row('Who goes first', '', seg('first', [['me', 'You'], ['coin', 'Coin flip'], ['foe', 'Opponent']], f.first))}
          ${row('Round limit', f.rounds ? `Ends after round ${f.rounds}` : `Normal: a draw after round ${CC_CFG.rounds}`, seg('rounds', FT_ROUNDS.map(n => [n, n ? n : 'Off']), f.rounds))}
          ${f.rounds ? row('At the limit', '', seg('hpWin', [[0, 'Draw'], [1, 'More HP wins']], f.hpWin ? 1 : 0)) : ''}
          ${row('Shuffle', f.fixed ? 'The same draws every match' : 'A new shuffle every match', seg('fixed', [[0, 'New'], [1, 'Fixed seed']], f.fixed ? 1 : 0))}
          ${f.fixed ? row('Seed', f.last && f.last !== f.seed ? `Last match: ${f.last}` : 'Any number', `<span class="ftx-seed"><input class="ftx-in" id="ftSeed" inputmode="numeric" value="${f.seed}" aria-label="Seed">${f.last && f.last !== f.seed ? `<button class="ftx-sg" id="ftLast">Use last</button>` : ''}</span>`) : ''}
          <div class="ftx-row ftx-evr"><span class="ftx-lb"><b>Battle event</b><small>${f.ev === 'none' ? 'No event' : f.ev === 'random' ? 'A random one every match' : esc(CC_EVENTS[f.ev].short || '')}</small></span>
            <span class="ftx-evs">${evChip('none', 'None', icon('close'), '#cfd6ff')}${evChip('random', 'Random', icon('refresh'), '#f5afe8')}${CC_EV_KEYS.map(k => evChip(k, CC_EVENTS[k].name, ccEvIco(k), ccEvCol(k))).join('')}</span></div></div>
        <div class="rdx-panel"><div class="rdx-ph"><b>Opponent’s look</b><small>Only for show</small></div>
          ${row('Plays as', ch ? esc(ch.name) : f.brain === 'dummy' ? 'The Training Dummy' : 'A random character', `<span class="ftx-ch"><span class="ftx-av">${opAv}</span><button class="ftx-sg" id="ftChar">${icon('chars')}Choose</button>${ch ? `<button class="ftx-sg" id="ftCharX">Random</button>` : ''}</span>`)}
          ${row('Board skin', '', sel('skin', `<option value="random">Random</option>${CC_SKINS.map(s => `<option value="${s.id}" ${f.skin === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`))}
          ${row('Card back', '', sel('back', `<option value="random">Random</option>${CC_BACKS.map(b => `<option value="${b.id}" ${f.back === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}`))}</div>
      </div></div>
      <div class="rdx-bar ftx-bar">
        <div class="rdx-vs">
          <div class="rdx-side me"><span class="rdx-si qmx-av">${le ? baseThumb(le) : icon('cards')}</span><span class="rdx-st"><small>Your deck</small><b>${valid ? esc(deck.name) : 'No ready deck'}</b><em>${icon('heart')}${f.hp[0]} HP${f.ap[0] ? ` · +${f.ap[0]} AP` : ''}</em></span></div>
          <span class="rdx-vsx">VS</span>
          <div class="rdx-side op"><span class="rdx-si qmx-av ftx-opav">${opAv}</span><span class="rdx-st"><small>${esc(B.name)}</small><b>${esc(opName)}</b><em>${icon('heart')}${f.hp[1]} HP · ${esc(F.id === 'mirror' ? 'Mirror deck' : F.name)}</em></span></div>
        </div>
        <div class="rdx-inst ftx-sum"><span class="rdx-il">${icon('check')}Free practice</span><small>No stamina · no rewards · no record</small></div>
        <button class="rdx-go" id="ftGo" ${valid ? '' : 'disabled'}><span class="rdx-goi">${icon('target')}</span><span class="rdx-got"><b>Start</b><small>Free training</small></span></button>
      </div></section>`;
  const sc = ftEl.querySelector('.rdx-scroll'); if (sc && top) sc.scrollTop = top;
  const rl = ftEl.querySelector('.rdx-rail'), onp = rl && rl.querySelector('.rdx-it.on'); if (onp && rl.scrollWidth > rl.clientWidth + 2) rl.scrollLeft = Math.max(0, onp.offsetLeft - (rl.clientWidth - onp.offsetWidth) / 2);
  const $f = s => ftEl.querySelector(s);
  $f('#ftClose').onclick = () => closeTraining();
  $f('#ftRules').onclick = () => ccRules(0);
  $f('#ftReset').onclick = () => { const f0 = ftState(); ccSave().ft = Object.assign(ftCopy(FT_DEF), { me: f0.me }); persist(); renderTraining(); toast('Training setup back to the standard match'); };
  $f('#ftDecks').onclick = () => { closeTraining(false); openDeck(); };
  $f('#ftGo').onclick = ftBattle;
  ftEl.querySelectorAll('[data-ftp]').forEach(b => b.onclick = () => ftApply(b.dataset.ftp));
  ftEl.querySelectorAll('[data-ftb]').forEach(b => b.onclick = () => ftSet(f => { f.brain = b.dataset.ftb; }));
  ftEl.querySelectorAll('[data-ftsel]').forEach(s => s.onchange = () => { const k = s.dataset.ftsel, v = s.value; if (k === 'me') { const f0 = ftState(); f0.me = v; persist(); renderTraining(); } else if (k === 'skin' || k === 'back') { const f0 = ftState(); f0[k] = v; persist(); renderTraining(); } else ftSet(f => { f[k] = v; }); });
  ftEl.querySelectorAll('[data-ftseg]').forEach(b => b.onclick = () => { const k = b.dataset.ftseg, v = b.dataset.v;
    if (k === 'fixed') { const f0 = ftState(); f0.fixed = v === '1'; if (f0.fixed && f0.last) f0.seed = f0.last; persist(); renderTraining(); return; }
    ftSet(f => { if (k === 'rounds') f.rounds = +v; else if (k === 'hpWin') f.hpWin = v === '1'; else f[k] = v; }); });
  ftEl.querySelectorAll('[data-ftst]').forEach(b => b.onclick = () => ftSet(f => { const k = b.dataset.ftst, p = +b.dataset.p, max = k === 'ap' ? FT_AP : FT_HAND; f[k][p] = Math.max(0, Math.min(max, f[k][p] + +b.dataset.d)); }));
  ftEl.querySelectorAll('[data-ftr]').forEach(r => { const p = +r.dataset.ftr, out = ftEl.querySelector(`[data-ftrv="${p}"]`);
    r.oninput = () => { out.textContent = r.value; }; r.onchange = () => ftSet(f => { f.hp[p] = +r.value; }); });
  ftEl.querySelectorAll('[data-ftev]').forEach(b => b.onclick = () => ftSet(f => { f.ev = b.dataset.ftev; }));
  const si = $f('#ftSeed'); if (si) { si.onchange = () => { const f0 = ftState(); f0.seed = (parseInt(si.value, 10) || 0) >>> 0; persist(); renderTraining(); }; si.onkeydown = e => { if (e.key === 'Enter') si.blur(); }; }
  const ls = $f('#ftLast'); if (ls) ls.onclick = () => { const f0 = ftState(); f0.seed = f0.last >>> 0; persist(); renderTraining(); };
  $f('#ftChar').onclick = () => openCharPicker({ title: 'The opponent plays as', ic: 'chars', note: 'Pick the character the opponent plays as in training (its name, portrait and art). It changes nothing in how it plays.', list: ftChars(), btn: 'Choose', onPick: e => { const f0 = ftState(); f0.char = e.id; persist(); renderTraining(); } });
  const cx = $f('#ftCharX'); if (cx) cx.onclick = () => { const f0 = ftState(); f0.char = null; persist(); renderTraining(); };
}

/* admin → Battle screen: the Free Training page's wallpaper (landscape; the card's own wallpaper is battle:training) */
function ftAdminHTML() {
  const u = MEDIA.get('ft:bg');
  return `<div><h3>Free Training</h3><p class="tiny">The wallpaper behind the Free Training page (1920×1080 best). Without one, the training ground scene (or the Free Training card's wallpaper), blurred.</p></div>
    <div class="setx-list ad-art">${setRow('Free Training wallpaper', `<span class="set-wp">${u ? `<img src="${u}" alt="">` : '<i></i>'}</span><label class="sx-btn">${icon('upload')}Change<input type="file" accept="image/*" class="sr" id="ftBgUp"></label>${u ? '<button type="button" class="sx-btn" id="ftBgDel">Default</button>' : ''}${artFrameBtn('ft:bg', 'screen', 'Free Training wallpaper')}`, 'Behind the whole Free Training page')}</div>`;
}
function ftAdminBind(p, redo) {
  const up = p.querySelector('#ftBgUp'); if (up) up.onchange = async () => { try { if (await mediaSet('ft:bg', await resizeImage(up.files[0], 1920, 'image/jpeg'))) { redo(); if (ftEl) renderTraining(); toast('Free Training wallpaper saved.'); } } catch (e) { toast(e.message, true); } };
  const del = p.querySelector('#ftBgDel'); if (del) del.onclick = async () => { await mediaDel('ft:bg'); redo(); if (ftEl) renderTraining(); toast('Free Training wallpaper back to the drawn scene.'); };
}

/* the Battle card's drawn scene: a training yard at dawn with a straw dummy on a rune circle, a target, a weapon rack,
   practice cards floating round the dummy, light beams and motes (portrait 300×520, animated with .ft-sc-*) */
BTH_ART.training = (() => {
  const posts = Array.from({ length: 16 }, (_, i) => { const x = -6 + i * 21, h = 30 + (i % 3) * 5; return `<path d="M${x} ${300 - h}l5 -6 5 6V300h-10z"/>`; }).join('');
  const motes = Array.from({ length: 16 }, (_, i) => `<circle class="ft-sc-sp" cx="${18 + (i * 61) % 270}" cy="${470 - (i * 29) % 140}" r="${1 + (i % 3) * .6}" style="animation-delay:${-(i * .8) % 7}s"/>`).join('');
  const card = (x, y, r, d) => `<g class="ft-sc-card" style="animation-delay:${d}s"><g transform="translate(${x} ${y}) rotate(${r})"><rect x="-17" y="-24" width="34" height="48" rx="5" fill="url(#ftScK)" stroke="#d9fff2" stroke-width="1.6"/><rect x="-12" y="-18" width="24" height="22" rx="3" fill="rgba(10,40,48,.55)"/><path d="M0 -14l6 7-6 8-6-8z" fill="#9ff5d6"/><rect x="-11" y="9" width="22" height="2.4" rx="1.2" fill="rgba(220,255,245,.6)"/><rect x="-8" y="14" width="16" height="2.4" rx="1.2" fill="rgba(220,255,245,.4)"/></g></g>`;
  return `<svg class="bth-svg ft-scene" viewBox="0 0 300 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="ftScSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06131f"/><stop offset=".35" stop-color="#0d3446"/><stop offset=".56" stop-color="#2a8a86"/><stop offset=".64" stop-color="#bff3dc"/><stop offset="1" stop-color="#0b2a2c"/></linearGradient>
    <radialGradient id="ftScSun" cx=".5" cy=".57" r=".46"><stop offset="0" stop-color="#fffbe0" stop-opacity=".95"/><stop offset=".3" stop-color="#b6ffe2" stop-opacity=".45"/><stop offset="1" stop-color="#b6ffe2" stop-opacity="0"/></radialGradient>
    <linearGradient id="ftScHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5a5c"/><stop offset="1" stop-color="#0b2a30"/></linearGradient>
    <linearGradient id="ftScG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5e8a5a"/><stop offset=".5" stop-color="#3a5a3e"/><stop offset="1" stop-color="#14261e"/></linearGradient>
    <linearGradient id="ftScW" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a4226"/><stop offset=".5" stop-color="#a8703e"/><stop offset="1" stop-color="#5a361e"/></linearGradient>
    <radialGradient id="ftScS" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f6e2a0"/><stop offset=".6" stop-color="#d9b464"/><stop offset="1" stop-color="#8a6a30"/></radialGradient>
    <linearGradient id="ftScK" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fa89a"/><stop offset="1" stop-color="#174a66"/></linearGradient>
    <linearGradient id="ftScL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fff6" stop-opacity=".5"/><stop offset="1" stop-color="#8ff5d2" stop-opacity="0"/></linearGradient>
    <radialGradient id="ftScR"><stop offset="0" stop-color="#b6ffe2" stop-opacity=".7"/><stop offset="1" stop-color="#5ec8ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="300" height="520" fill="url(#ftScSky)"/><rect width="300" height="520" fill="url(#ftScSun)"/>
    <g fill="#fff" opacity=".7">${Array.from({ length: 20 }, (_, i) => `<circle cx="${(i * 67) % 300}" cy="${(i * 41) % 140 + 8}" r="${.6 + (i % 3) * .35}"/>`).join('')}</g>
    <path d="M-10 290L30 246L64 270L104 226L150 262L196 222L236 258L270 236L310 262V320H-10z" fill="url(#ftScHill)" opacity=".85"/>
    <path d="M-10 300Q150 286 310 300V340H-10z" fill="#123a34"/>
    <g fill="#3a2414">${posts}</g><path d="M-10 276H310M-10 290H310" stroke="#4a2e18" stroke-width="3"/>
    <g class="ft-sc-beam"><path d="M108 0L134 0L178 520L70 520z" fill="url(#ftScL)"/><path d="M182 0L198 0L238 520L172 520z" fill="url(#ftScL)" opacity=".7"/></g>
    <ellipse cx="150" cy="450" rx="230" ry="130" fill="url(#ftScG)"/>
    <ellipse cx="150" cy="446" rx="118" ry="34" fill="#a8916a" opacity=".55"/>
    <ellipse cx="150" cy="446" rx="98" ry="27" fill="none" stroke="#c6fff0" stroke-width="2" opacity=".5"/>
    <ellipse class="ft-sc-rune" cx="150" cy="446" rx="80" ry="22" fill="none" stroke="#9ff5d6" stroke-width="2.4" stroke-dasharray="5 8" opacity=".85"/>
    <ellipse cx="150" cy="446" rx="54" ry="15" fill="url(#ftScR)"/>
    <g transform="translate(46 352)"><path d="M-2 0L-14 96M2 0L14 96" stroke="#5a361e" stroke-width="5" stroke-linecap="round"/><circle r="30" fill="#f2ead2" stroke="#6a4226" stroke-width="4"/><circle r="22" fill="#e05050"/><circle r="15" fill="#f2ead2"/><circle r="8" fill="#e05050"/><path d="M14 -18L-2 2" stroke="#3a2414" stroke-width="2.4"/><path d="M14 -18l6 -2-2 6z" fill="#f6f0e0"/></g>
    <g transform="translate(252 340)"><rect x="-28" y="0" width="56" height="6" rx="3" fill="url(#ftScW)"/><rect x="-28" y="44" width="56" height="6" rx="3" fill="url(#ftScW)"/><path d="M-24 6V104M24 6V104" stroke="#5a361e" stroke-width="5" stroke-linecap="round"/>
      ${[-15, -3, 9].map((x, i) => `<g transform="translate(${x} ${-14 + i * 3}) rotate(${-6 + i * 6})"><rect x="-2.4" y="0" width="4.8" height="56" rx="2" fill="#c8a070"/><rect x="-8" y="40" width="16" height="4" rx="2" fill="#6a4226"/><rect x="-2" y="44" width="4" height="12" fill="#5a361e"/></g>`).join('')}</g>
    <g class="ft-sc-dummy"><path d="M150 306V446" stroke="#5a361e" stroke-width="9" stroke-linecap="round"/><path d="M104 352H196" stroke="url(#ftScW)" stroke-width="8" stroke-linecap="round"/>
      <path d="M103 352l-9 -5M103 352h-10M103 352l-9 5M197 352l9 -5M197 352h10M197 352l9 5" stroke="#d9b464" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="150" cy="378" rx="30" ry="42" fill="url(#ftScS)"/><path d="M122 360q28 8 56 0M121 392q29 9 58 0" stroke="#7a5424" stroke-width="3" fill="none"/>
      <circle cx="150" cy="376" r="15" fill="none" stroke="#e05050" stroke-width="3"/><circle cx="150" cy="376" r="6" fill="#e05050"/>
      <circle cx="150" cy="316" r="20" fill="url(#ftScS)"/><path d="M141 310l6 6M147 310l-6 6M153 310l6 6M159 310l-6 6" stroke="#5a3a18" stroke-width="2.2" stroke-linecap="round"/><path d="M142 326q8 4 16 0" stroke="#5a3a18" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M134 302q16 -12 32 0" stroke="#c89a48" stroke-width="3" fill="none"/></g>
    ${card(86, 250, -14, 0)}${card(214, 242, 12, -1.4)}${card(150, 214, 0, -2.6)}
    <g fill="#d9fff2">${motes}</g></svg>`;
})();
