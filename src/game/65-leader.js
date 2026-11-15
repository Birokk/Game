/* ---------- Leader skills: who gets which skill, at which tier, and how it shows ----------
   The rules and the catalogue (LS, 21 skills) live in 44-clash.js so the Node sims see them. Here: each character's
   skill (entry.ccSkill, picked in admin → Game pool; without one the default of its card attribute, LS_DEF), its tier
   from the awakened (Breakthrough) stars (2 → tier 2, 4 → tier 3, 6 → cooldown −1), the lead info handed to the match
   (ccLeadPass, read by ccCreateMatch), the skill medallion beside each leader card in a match, the cast banner, and the
   texts for the Deck screen / admin. The Arena treats everyone the same: tier 1, no cooldown bonus. */
const ccLeadPass = { v: null };
const LS_DEF = { aggression: 'battlecry', defense: 'bulwark', control: 'hex', mobility: 'shadowstep', support: 'mend' };
const CC_BOND_TXT = { aggression: 'Your first attack each turn deals +1 damage.', defense: 'The first unit you summon each turn enters with Armor 1.', control: 'Your first damaging spell each turn deals +1 damage.', mobility: 'Your first move each turn is free.', support: 'At the start of your turn, heal your most damaged unit 1.' };
const lsOf = e => !e ? null : LS[e.ccSkill] ? e.ccSkill : LS_DEF[e.ccStyle] || 'focus';
const lsAwake = e => e && owns(e.id) ? btOf(e.id).length : 0;   // awakened (switched-on) Breakthrough stars
const lsTierOf = e => { const n = lsAwake(e); return n >= 4 ? 3 : n >= 2 ? 2 : 1; };
const lsCdmOf = e => lsAwake(e) >= 6 ? 1 : 0;
/* the lead info for one side; o.pvp = the Arena (tier 1 for everyone), o.tier = a fixed tier (bots) */
function lsLead(e, o = {}) {
  if (!e) return null;
  return { id: lsOf(e), tier: o.pvp ? 1 : o.tier || lsTierOf(e), cd0: 2, cdMod: o.pvp || o.tier ? 0 : lsCdmOf(e), style: e.ccStyle && CC_STYLES[e.ccStyle] ? e.ccStyle : null };
}
/* the bot's tier: 1, 2 for the harder brains and boss stages */
const lsBotTier = (qm, camp, arena) => arena ? 1 : qm && (qm.diff === 'expert' || qm.diff === 'hard') ? 2 : camp && camp.boss ? 2 : 1;
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
