/* ---------- Leader skills: who gets which skill, at which tier, and how it shows ----------
   The rules and the catalogue (LS, 21 skills) live in 44-clash.js so the Node sims see them. Here: each character's
   skill (entry.ccSkill, picked in admin → Game pool; without one the default of its card attribute, LS_DEF), its tier
   from the awakened (Breakthrough) stars (2 → tier 2, 4 → tier 3, 6 → cooldown −1), the lead info handed to the match
   (ccLeadPass, read by ccCreateMatch), the skill medallion beside each leader card in a match, the cast banner, and the
   texts for the Deck screen / admin. The Arena uses your full build too (the owner's rule); only a future ranked mode
   (o.pvp) will play everyone at tier 1 with no bonuses. Arena opponents get a tier by their rank (LS_AR_TIER). */
const ccLeadPass = { v: null };
const LS_DEF = { aggression: 'battlecry', defense: 'bulwark', control: 'hex', mobility: 'shadowstep', support: 'mend' };
const CC_BOND_TXT = { aggression: 'Your first attack each turn deals +1 damage.', defense: 'The first unit you summon each turn enters with Armor 1.', control: 'Your first damaging spell each turn deals +1 damage.', mobility: 'Your first move each turn is free.', support: 'At the start of your turn, heal your most damaged unit 1.' };
const lsOf = e => !e ? null : LS[e.ccSkill] ? e.ccSkill : LS_DEF[e.ccStyle] || 'focus';
const lsAwake = e => e && owns(e.id) ? btOf(e.id).length : 0;   // awakened (switched-on) Breakthrough stars
const lsTierOf = e => { const n = lsAwake(e); return Math.min(3, (n >= 4 ? 3 : n >= 2 ? 2 : 1) + (e && owns(e.id) && sigWorn(e) ? 1 : 0)); };   // the signature set adds +1 tier
const lsCdmOf = e => lsAwake(e) >= 6 ? 1 : 0;
/* the lead info for one side; o.pvp = a future ranked mode (tier 1 for everyone, no bonuses), o.tier = a fixed tier (bots) */
function lsLead(e, o = {}) {
  if (!e) return null;
  const mine = !o.pvp && !o.tier, b = mine ? lsBonus(e) : null;
  return { id: lsOf(e), tier: o.pvp ? 1 : o.tier || lsTierOf(e), cd0: Math.max(0, 2 - (b && b.cd0 || 0)), cdMod: mine ? lsCdmOf(e) : 0, style: e.ccStyle && CC_STYLES[e.ccStyle] ? e.ccStyle : null, bondN: b && b.bondN || 0, bonus: b };
}
/* ---- build bonuses (everything but a future ranked mode, the Arena included): every build system has its own job, with shared caps ----
   Bond: hero +1 HP per 2 bond levels · Potential: each
   completed plan's Core unlocks one perk (LS_POT) · Memory: the skill resets once per match (from round 8 at 0★ down to 4
   at 3★; a signature memory 2 rounds sooner; a UR memory +1 AP that turn) · SSS awakening: the Ultimate (kept for good) ·
   Signature set: skill tier +1. Caps: hero HP +8, heal +2 a turn, opening cards +2, first-turn AP +1. */
const LS_CAP = { hp: 8, heal: 2, cards: 2, ap1: 1 };
const LS_POT = [
  ['hp', 2, 'Hero +2 HP'], ['cards', 1, '+1 opening card'], ['cheap', 1, 'The first skill use costs 1 AP less'], ['heal', 1, 'Hero heals 1 at the start of each turn'],
  ['bondN', 10, 'The attribute bond needs 10 cards instead of 12'], ['fu', 1, 'Your first unit each match gets +1 max HP'], ['ap1', 1, '+1 AP on your first turn']
];
const LS_MEM_ROUND = [8, 7, 6, 4];
function lsBonus(e) {
  if (!e || !owns(e.id)) return null;
  const b = { hp: 0, heal: 0, cards: 0, ap1: 0, last: false, cheap: false, fu: 0, rs: 0, rsAp: 0, ult: false, bondN: 0, src: [] };
  const bl = bondLv(e.id), bh = Math.min(5, Math.floor(bl / 2));
  if (bh) { b.hp += bh; b.src.push(['Bond', `Lv ${bl}`, `Hero +${bh} HP`]); }
  LS_POT.forEach(([k, v, t], i) => { if (!potDone(e.id, i)) return; if (k === 'cheap') b.cheap = true; else if (k === 'bondN') b.bondN = v; else b[k] += v; b.src.push(['Potential', `Plan #${i + 1}`, t]); });
  const m = memEqOf(e.id)[0], M = m && memOf(m);
  if (M) { const st = memEqStar(e.id), sig = (e.sigMems || []).includes(m); b.rs = Math.max(3, LS_MEM_ROUND[Math.min(3, st)] - (sig ? 2 : 0)); b.rsAp = +M.rarity === 5 ? 1 : 0; b.src.push(['Memory', `${esc(M.name)} · ${st}★`, `From round ${b.rs} the skill is ready again once${b.rsAp ? ', +1 AP that turn' : ''}${sig ? ' (signature memory)' : ''}`]); }
  if (sssAwakened(e.id)) { b.ult = true; b.src.push(['SSS awakening', 'Awakened', `Ultimate: once per match from round ${CC_ULT_ROUND}, the skill at tier III for 0 AP`]); }   // it stays even if the grade drops
  if (sigWorn(e)) b.src.push(['Signature set', 'All 6 worn', 'Leader skill +1 tier']);
  const n = lsAwake(e); if (n >= 2) b.src.push(['Breakthrough', `${n} stars awakened`, `Skill tier ${n >= 4 ? 'III' : 'II'}${n >= 6 ? ', cooldown −1' : ''}`]);
  const gb = typeof gearBattle === 'function' ? gearBattle(e) : null;
  if (gb) { b.hp += gb.hp; b.heal += gb.heal; b.cards += gb.cards; b.fu += gb.fu; b.ap1 += gb.ap1; if (gb.cheap) b.cheap = true; b.cd0 = gb.cd0; b.gw = gb.weak; b.gr = gb.res; b.src.push(...gb.src); }
  for (const k of Object.keys(LS_CAP)) b[k] = Math.min(LS_CAP[k], b[k]);
  return b;
}
/* ---- weakness / resistance on PvE content: an enemy whose deck is mostly attribute X is weak to CC_WEAK[X] and resists X.
   Weak: the enemy hero starts with 25% less HP and your skill starts ready. Resisted: the enemy has 25% more HP and your
   skill waits 1 turn longer. Campaign (not the tutorial), the Great Tree and raids use the enemy deck; the guild boss
   changes every 48-hour fight (only the skill part: its HP is the guild's shared bar). */
const CC_WEAK = { aggression: 'defense', defense: 'control', control: 'mobility', mobility: 'support', support: 'aggression' };
const LS_ADV = .25;
function ccDeckStyle(cards) { const n = {}; for (const id of cards || []) { const st = (ccDef(id) || {}).style; if (st) n[st] = (n[st] || 0) + 1; } return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || null; }
const ccAdvOf = (foe, me) => !foe || !me ? null : CC_WEAK[foe] === me ? 'weak' : foe === me ? 'res' : null;
const gbFoeStyle = () => Object.keys(CC_STYLES)[((gbKey() % 5) + 5) % 5];
const LS_CAMP_ADV_FROM = 6;   // campaign chapters 0-5 are the basic game: no weakness / resistance (the owner's rule); the Great Tree always has them
const lsCampFoeStyle = st => { if (!st || (st.ch && (st.ch.id === 'c0' || (!st.ch.tower && st.ch.no < LS_CAMP_ADV_FROM)))) return null; const pre = id => (CC_PRESETS.find(d => d.id === id) || {}).cards; return ccDeckStyle(st.botDeck ? pre(st.botDeck) : st.deck ? pre(st.deck) : st.bot); };   // the stage bot's deck (the same pick as ccCampMatch)
/* applied in startClash right after the match is built */
function lsApplyAdv(G, foeStyle, boss) {
  const L = G.lead && G.lead[0], me = ccM && ccM.leader && ccM.leader.ccStyle, adv = ccAdvOf(foeStyle, me), P = G.players[1];
  const gb = ccM && ccM.leader && !ccM.arena ? lsBonus(ccM.leader) : null;   // gear: Accessory deepens a weak spot, Hand softens a resist (5% a milestone)
  if (adv && !boss) { const f = adv === 'weak' ? 1 - LS_ADV - .05 * ((gb && gb.gw) || 0) : 1 + Math.max(.05, LS_ADV - .05 * ((gb && gb.gr) || 0)); P.hp = Math.max(1, Math.round(P.hp * f)); P.max = Math.max(P.max, P.hp); }
  if (L && adv === 'weak') L.cd = 0;
  if (L && adv === 'res') L.cdm = (L.cdm || 0) - 1;
  if (adv) ccLog(G, adv === 'weak' ? `Weak spot: your ${CC_STYLES[me][0]} leader has the advantage` : `Resisted: the enemy resists ${CC_STYLES[me][0]}`, 'sys');
  return { foe: foeStyle, adv };
}
/* the chips on stage panels, raids and the guild boss */
function lsAdvHTML(foeStyle, leader) {
  if (!foeStyle) return '';
  const w = CC_WEAK[foeStyle], adv = ccAdvOf(foeStyle, leader && leader.ccStyle), chip = (st, k) => `<span class="lsa-c ${k}" style="--cs:${CC_STYLES[st][1]}">${ccIco(st)}<small>${k === 'w' ? 'Weak to' : 'Resists'}</small><b>${esc(CC_STYLES[st][0])}</b></span>`;
  return `<div class="lsa">${chip(w, 'w')}${chip(foeStyle, 'r')}<span class="lsa-me ${adv || 'n'}">${adv === 'weak' ? 'Your leader hits its weak spot: enemy −25% HP, skill starts ready' : adv === 'res' ? 'Resisted: enemy +25% HP, your skill waits 1 turn longer' : leader ? `${esc(leader.name)} is neutral here` : ''}</span></div>`;
}
/* the battle bonuses window (Deck screen) */
function lsDetails(e) {
  if (!e) return;
  const b = lsBonus(e) || { src: [] }, B = [['hp', 'Hero HP', '+'], ['heal', 'Heal a turn', '+'], ['cards', 'Opening cards', '+'], ['ap1', 'First-turn AP', '+']];
  openModal({ title: 'Battle bonuses', ic: 'crown', kind: 'lsdet', body: `<div class="lsd">${lsInfoHTML(e)}
    <div class="lsd-sum">${B.map(([k, n]) => `<span class="${b[k] ? 'on' : ''}"><b>${b[k] ? '+' + b[k] : '—'}</b><small>${n}</small><i>max +${LS_CAP[k]}</i></span>`).join('')}</div>
    <div class="lsd-list">${b.src.length ? b.src.map(([sys, what, t]) => `<div class="lsd-row"><b>${esc(sys)}</b><small>${what}</small><span>${t}</span></div>`).join('') : '<p class="tiny">No bonuses yet. Bond, Potential plans, a memory, awakened stars, the signature set and the SSS awakening all make this leader stronger against the game\'s own opponents.</p>'}</div>
    <p class="tiny">These bonuses count in every battle: the campaign, the Great Tree, raids, the guild boss, Quick Match, training and the Arena. Only a ranked mode (coming later) will play everyone at tier I with no bonuses.</p></div>` });
}

/* the bot's tier: 1, 2 for the harder brains and boss stages */
const LS_AR_TIER = [1, 1, 2, 2, 2, 3, 3, 3];   // Arena opponents' skill tier by their rank (Bronze → Celestial): they stand for built players
const lsBotTier = (qm, camp, arena) => arena ? LS_AR_TIER[typeof arRankOf === 'function' && arena.f ? arRankOf(arena.f.vp).i : 0] || 1 : qm && (qm.diff === 'expert' || qm.diff === 'hard') ? 2 : camp && camp.boss ? 2 : 1;
const lsName = id => (LS[id] || {}).name || '';
const lsDesc = (id, t) => { const S = LS[id]; return S ? S.d[Math.max(1, Math.min(3, t || 1)) - 1] : ''; };
const lsIc = (id, cls = '') => ccIco((LS[id] || {}).ic || 'crystal', cls);
const lsCol = id => { const st = (LS[id] || {}).style; return st ? CC_STYLES[st][1] : '#c8d0ff'; };
const lsTierTag = t => `<span class="ls-tier t${t}" title="Skill tier ${t}">${'I'.repeat(t)}</span>`;
/* one line for lists and the admin: name · AP · cooldown */
const lsMeta = (id, t = 1) => { const S = LS[id]; return S ? `${S.ap[t - 1]} AP · every ${S.cd} turns` : ''; };

/* ---- in the match: the skill medallion beside each leader card ---- */
function lsMedalHTML(G, p) {
  const L = G.lead && G.lead[p]; if (!L) return '';
  const S = LS[L.id], my = p === 0, ready = L.cd === 0, cost = lsCost(L), canUse = my && ready && ccMyTurn() && G.phase === 'main' && G.players[0].ap >= cost && ccLegal(G).some(a => a.k === 'skill');
  const sel = my && ccM.sel && ccM.sel.kind === 'skill', max = lsCd(L), frac = ready ? 0 : Math.min(1, L.cd / max);
  const bond = L.bond ? `<br><b>Attribute bond (${esc(CC_STYLES[L.bond][0])}):</b> ${esc(CC_BOND_TXT[L.bond])}` : '';
  const tip = `<b>${esc(S.name)}</b> · tier ${lsTier(L)} · ${cost} AP · every ${max} turns<br>${esc(lsDesc(L.id, lsTier(L)))}${bond}<br>${ready ? (my ? 'Ready' : 'Ready') : `Ready in ${L.cd} turn${L.cd > 1 ? 's' : ''}`}`;
  return `<button class="ccm-skill ${my ? 'me' : 'op'} ${ready ? 'ready' : 'wait'} ${canUse ? 'ok' : ''} ${sel ? 'sel' : ''} ${L.bond ? 'bond' : ''}" ${my ? 'id="ccSkill"' : 'tabindex="-1"'} style="--lc:${lsCol(L.id)};--cdf:${frac.toFixed(3)}" data-tip="${esc(tip)}" aria-label="${esc(`${S.name}: ${lsDesc(L.id, lsTier(L))}`)}">
    <i class="ccs-ring"></i><span class="ccs-ic">${lsIc(L.id)}</span>${ready ? '' : `<i class="ccs-cd"></i><b class="ccs-n">${L.cd}</b>`}
    <span class="ccs-ap">${cost}</span>${lsTierTag(lsTier(L))}${L.bond ? `<span class="ccs-bond" title="Attribute bond on">${ccIco(L.bond)}</span>` : ''}</button>`;
}
/* the banner when a leader uses its skill (both sides): the skill's name over that side's leader */
function lsCastFx(p, id) {
  const L = ccLayer && ccLayer(); if (!L || !LS[id]) return;
  const el = document.createElement('div'); el.className = `ccx-skill ${p ? 'op' : 'me'}`; el.style.setProperty('--lc', lsCol(id));
  el.innerHTML = `<span class="ccxs-ic">${lsIc(id)}</span><span class="ccxs-t"><small>${p ? esc(ccM.G.names[1]) : 'Your leader'}</small><b>${esc(lsName(id))}</b></span>`;
  L.appendChild(el);
  const x = 236, y = p ? 317 : 593;
  ccGlow(x, y, lsCol(id), 150, 22); ccBurst(x, y, { n: 30, c: [lsCol(id), '#fff'], sp: 5, g: -.02, life: 30 }); ccRing(x, y, lsCol(id), { r0: 20, r1: 120, w: 4, life: 22 });
  ccLater(1300, () => el.classList.add('out')); ccLater(1650, () => el.remove());
}

/* ---- outside the match: the skill as text (Deck screen leader box, the leader picker, admin) ---- */
function lsInfoHTML(e, compact) {
  if (!e) return '';
  const id = lsOf(e), t = lsTierOf(e), S = LS[id], n = lsAwake(e), next = t < 3 ? `Awaken ${t === 1 ? 2 : 4} stars (Breakthrough) for tier ${t + 1}` : n >= 6 ? 'Max: tier 3 and cooldown −1' : 'Awaken all 6 stars for cooldown −1';
  return `<div class="ls-info ${compact ? 'sm' : ''}" style="--lc:${lsCol(id)}"><span class="ls-ic">${lsIc(id)}</span><span class="ls-tx"><b>${esc(S.name)} ${lsTierTag(t)}</b><small>${esc(lsMeta(id, t))}${lsCdmOf(e) ? ' (−1)' : ''}</small><span>${esc(lsDesc(id, t))}</span>${compact ? '' : `<i>${esc(next)}</i>`}</span></div>`;
}
const lsBondLine = (e, cards) => {
  const st = e && e.ccStyle && CC_STYLES[e.ccStyle] ? e.ccStyle : null; if (!st) return '<span class="ls-bond off">No card attribute: no attribute bond</span>';
  const n = (cards || []).filter(id => (ccDef(id) || {}).style === st).length, on = n >= CC_BOND_N;
  return `<span class="ls-bond ${on ? 'on' : 'off'}" style="--cs:${CC_STYLES[st][1]}">${ccIco(st)}<b>Attribute bond ${on ? 'on' : 'off'}</b><small>${n} / ${CC_BOND_N} ${esc(CC_STYLES[st][0])} cards · ${esc(CC_BOND_TXT[st])}</small></span>`;
};
/* admin: the skill select for a character, grouped by attribute */
function lsAdminOptions(cur) {
  const groups = [...Object.keys(CC_STYLES), null];
  return `<option value="">Default for its card attribute</option>` + groups.map(st => `<optgroup label="${st ? CC_STYLES[st][0] : 'No attribute'}">${LS_IDS.filter(id => LS[id].style === st).map(id => `<option value="${id}" ${cur === id ? 'selected' : ''}>${esc(LS[id].name)} · ${esc(lsMeta(id))} · ${esc(LS[id].d[0])}</option>`).join('')}</optgroup>`).join('');
}

/* the SSS Ultimate button (your side only, once per match from round CC_ULT_ROUND) */
function lsUltHTML(G) {
  const L = G.lead && G.lead[0]; if (!L || !L.ult || L.ultU) return '';
  const ready = ccUltReady(G, L) && ccMyTurn(), sel = ccM.sel && ccM.sel.kind === 'skill' && ccM.sel.ult;
  return `<button class="ccm-ult ${ready ? 'ok' : ''} ${sel ? 'sel' : ''}" id="ccUlt" style="--lc:${lsCol(L.id)}" data-tip="${esc(`<b>Ultimate · ${LS[L.id].name}</b><br>${lsDesc(L.id, 3)}<br>Once per match from round ${CC_ULT_ROUND}, 0 AP${G.round < CC_ULT_ROUND ? ` · ready in round ${CC_ULT_ROUND}` : ''}`)}">ULT</button>`;
}
