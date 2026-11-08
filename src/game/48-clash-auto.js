/* ---------- Card Clash auto play: a good, fair player for your side ----------
   It sees what a player sees: its own hand, the board and that a face-down trap is there, never the bot's hand, the
   trap itself or either deck's order (it plans on ccRedact's copy, like the bot). Each of your turns it tries whole
   sequences of actions (a beam search over copies of the match) and plays the ending its evaluation likes best; it
   does not play the future forward. Now and then it slips and takes its second or third best line (`slip`, decided
   by ccNoise from the match state, so the same seed and moves still replay the same match). When a hidden trap
   changes the board, the rest of the turn is planned again. Against the bot it wins most matches, not all of them
   (the owner asked for no 100% win rate; tested in Node, see CLAUDE.md). Pure functions, no DOM: the UI in
   45-clash-ui.js runs the plan. */

const CC_AUTO = { beam: 6, depth: 10, reply: 6, horizon: 0, lateFrom: 22, lateHorizon: 10, slip: .15, slipTop: 4, noise: 30 };
function ccAutoUnit(G, u) {
  const d = ccDef(u.id), atk = ccPermAtk(u), max = ccMaxHp(u);
  let v = atk * 1.7 + u.hp * 1.15 + (ccArm(u) ? 2.2 : 0) + (max - d.hp) * .2 + (u.eq ? .8 : 0);
  if (u.row === 1 && d.range !== 'ranged') v -= atk * 1.3;            // a melee unit stuck in the back row does nothing
  if (u.poison) v -= 2 * Math.min(u.poison, Math.ceil(u.hp / 2));
  if (u.stunNext || u.stunNow) v -= atk * .6;
  if (['SUP-U01', 'SUP-U02', 'SUP-U04', 'DEF-U06'].includes(u.id)) v += 1.5;
  if (CC_BANNER.has(u.id)) v += 1.4;
  if (u.id === 'CON-U08') v += 1.2;
  return v;
}
/* damage a side can push into the other hero next time it attacks: its attackers facing an empty lane */
function ccAutoThreat(G, p) {
  const E = G.players[1 - p].board; let t = 0;
  for (const u of ccUnits(G, p)) {
    const d = ccDef(u.id); if (u.row === 1 && d.range !== 'ranged') continue;
    if (u.owner !== G.active ? u.stunNext : u.stunNow) continue;
    if (!E[u.lane][0] && !E[u.lane][1]) t += ccPermAtk(u) + (u.id === 'AGG-U02' ? 1 : 0);
  }
  return t;
}
function ccAutoEval(G, me) {
  if (G.phase === 'over') return G.winner === me ? 1e7 - G.turnNo * 100 : G.winner === 'draw' ? -6e6 : -1e7;
  const P = G.players[me], O = G.players[1 - me];
  let s = P.hp * 2.6 + Math.min(P.hp, 10) * 1.8 - O.hp * (4.2 + Math.max(0, G.round - 12) * .35 + Math.max(0, G.round - 30) * 2.5);
  if (O.hp <= 8) s += (8 - O.hp) * 3.5;
  for (const u of ccUnits(G, me)) s += ccAutoUnit(G, u);
  for (const u of ccUnits(G, 1 - me)) s -= ccAutoUnit(G, u) * 1.08;
  const mine = ccAutoThreat(G, me), theirs = ccAutoThreat(G, 1 - me);
  s += mine * 1.3 - theirs * (1.6 + Math.max(0, 12 - P.hp) * .3);
  if (theirs >= P.hp) s -= 400;            // they could finish me next turn
  if (mine >= O.hp && G.active === me) s += 300;
  // the damage race: how many of their turns until I fall vs how many of mine until they do
  const myClock = mine > 0 ? Math.ceil(O.hp / mine) : 30, theirClock = theirs > 0 ? Math.ceil(P.hp / theirs) : 30;
  if (theirClock < 30 && theirClock <= myClock) s -= Math.min(6, myClock - theirClock + 1) * (8 + Math.max(0, 10 - P.hp));
  // focus fire: the enemy lane closest to breaking open matters most (an empty lane lets every attacker in it hit the hero)
  const laneHp = [0, 1, 2].map(l => O.board[l].reduce((t, u) => t + (u ? u.hp + (ccArm(u) ? 2 : 0) : 0), 0));
  const minL = Math.min(...laneHp);
  // breakthrough: my attack lined up against the weakest enemy lane
  const myLaneAtk = [0, 1, 2].map(l => P.board[l].reduce((t, u) => t + (u && (u.row === 0 || ccDef(u.id).range === 'ranged') ? ccPermAtk(u) : 0), 0));
  s -= Math.min(...[0, 1, 2].map(l => laneHp[l] - myLaneAtk[l] * 1.5)) * (.6 + Math.max(0, G.round - 18) * .08);
  s -= minL * (1.2 + Math.max(0, G.round - 10) * .12);
  s += laneHp.filter(x => x === 0).length * (3 + Math.max(0, G.round - 10) * .5);
  // late game: every enemy unit lost is a lane that may stay open (overtime decay outpaces its 4 AP of refills)
  if (G.round >= 16) { const ot = Math.min(1, (G.round - 15) / 6); s -= ccUnits(G, 1 - me).length * 3 * ot; s -= laneHp.reduce((a, b) => a + b, 0) * .35 * ot; }
  s += (P.hand.length - O.hand.length) * .55 + P.traps.filter(Boolean).length * 1.2 - O.traps.filter(Boolean).length * 1.4;
  return s;
}
const ccAutoKey = g => g.players.map(P => [P.hp, P.ap, P.hand.length, P.traps.map(t => t ? 1 : 0).join(''), P.board.flat().map(u => u ? `${u.iid}${u.lane}${u.row}.${u.hp}.${u.up}${u.attacked ? 'a' : ''}${u.moveUsed ? 'm' : ''}${u.eq ? 'e' : ''}` : '-').join(',')].join('|')).join('/') + g.phase;
/* the bot's answer to an ending (simulated with the bot's own policy on auto play's copy of the match) */
function ccAutoReply(g, me) {
  let n = 0; while (g.phase !== 'over' && g.active !== me && n++ < 40) { const a = ccBotPick(g); if (ccApply(g, a)) ccApply(g, { k: 'end' }); }
  return g;
}
/* a few more rounds played forward with auto play's quick turns (only when `horizon` > 0) */
function ccAutoRollout(g, me, rounds) {
  const end = g.round + rounds; let n = 0;
  while (g.phase !== 'over' && g.round < end && n++ < 300) {
    if (g.active === me) {
      const f = ccAutoTurn(g, me, 3, 10)[0];
      for (const a of f ? f.seq : []) { if (ccApply(g, a) || g.phase === 'over') break; }
      if (g.phase === 'choice' && g.active === me) ccApply(g, ccLegal(g)[0]);
      if (g.phase === 'main' && g.active === me) ccApply(g, { k: 'end' });
    } else ccAutoReply(g, me);
  }
  return g;
}
const ccAutoScore = (g, me) => g.phase === 'over' ? (g.winner === me ? 1e7 - g.turnNo * 1000 : g.winner === 'draw' ? -6e6 : -1e7 + g.turnNo * 1000) : ccAutoEval(g, me);
/* every distinct way this turn could end (beam search over whole action sequences), best first by the evaluation */
function ccAutoTurn(G, me, beam, depth) {
  let layer = [{ g: ccClone(G), seq: [] }];
  const finals = [];
  for (let d = 0; d < depth && layer.length; d++) {
    const next = [];
    for (const n of layer) {
      for (const a of ccLegal(n.g)) {
        if (a.k === 'end') { finals.push(n); continue; }
        const g = ccClone(n.g); if (ccApply(g, a)) continue;
        const seq = n.seq.concat([a]);
        if (g.phase === 'over') { if (g.winner === me) return [{ g, seq, s: 1e9, win: true }]; continue; }
        next.push({ g, seq, s: ccAutoEval(g, me) });
      }
    }
    next.sort((x, y) => y.s - x.s);
    layer = []; const seen = new Set();
    for (const n of next) { const k = ccAutoKey(n.g); if (seen.has(k)) continue; seen.add(k); layer.push(n); if (layer.length >= beam) break; }
  }
  for (const n of layer) if (n.g.phase !== 'choice') finals.push(n);
  const seen = new Set(), out = [];
  for (const f of finals.map(f => ({ ...f, s: f.s == null ? ccAutoEval(f.g, me) : ccAutoEval(f.g, me) })).sort((x, y) => y.s - x.s)) {
    const k = ccAutoKey(f.g); if (seen.has(k)) continue; seen.add(k); out.push(f);
  }
  return out;
}
/* the plan for the rest of this turn: a list of actions ending with { k: 'end' } (or a winning action). Each action
   carries `pre`, the position (as auto play sees it) it expects just before it: when the real board differs (a hidden
   trap went off), the UI plans again. A generator so the browser can breathe between the simulated futures. */
function* ccAutoPlanGen(G, o = CC_AUTO) {
  const me = G.active;
  if (G.phase === 'over') return [];
  const seen = ccRedact(G, me), fin = ccAutoTurn(seen, me, o.beam, o.depth);
  if (!fin.length) return [{ k: G.phase === 'choice' ? 'choice' : 'end', pick: G.phase === 'choice' ? G.pending.opts[0] : undefined }];
  // a slip (`slip` of its turns): no look-ahead, one of its first few ideas instead of the best line
  if (!fin[0].win && ccNoise(G, 4243 + me * 31) < o.slip) return ccAutoSeq(seen, fin[Math.floor(ccNoise(G, 977 + me) * Math.min(fin.length, o.slipTop || 4))]);
  let ranked = fin;
  if (!fin[0].win && o.reply) {   // the most promising endings are judged after the bot's answer and a few more rounds
    const hz = G.round >= (o.lateFrom || 99) ? o.lateHorizon : o.horizon, sc = [];   // long matches: look further, so they don't stall into the round-40 draw
    for (const f of fin.slice(0, o.reply)) {
      yield;
      const g = ccClone(f.g); ccApply(g, { k: 'end' }); ccAutoReply(g, me); if (hz) ccAutoRollout(g, me, hz);
      sc.push({ f, s: ccAutoScore(g, me) + f.s * .01 + (ccNoise(G, 7001 + sc.length) - .5) * (o.noise || 0) });   // `noise`: its judgement is not perfect
    }
    ranked = sc.sort((x, y) => y.s - x.s).map(x => x.f);
  }
  return ccAutoSeq(seen, ranked[0]);
}
/* a chosen ending as a plan: its actions, each with the position expected before it, then End turn */
function ccAutoSeq(seen, pick) {
  const g = ccClone(seen), plan = [];
  for (const a of pick.seq) { plan.push({ ...a, pre: ccAutoKey(g) }); if (ccApply(g, a) || g.phase === 'over') break; }
  if (!pick.win) plan.push({ k: 'end', pre: ccAutoKey(g) });
  return plan;
}
function ccAutoPlan(G, o = CC_AUTO) { const it = ccAutoPlanGen(G, o); let r; do r = it.next(); while (!r.done); return r.value; }
/* the same plan without freezing the page: yields to the browser every 12 ms */
async function ccAutoPlanAsync(G, o = CC_AUTO, alive = () => true) {
  const it = ccAutoPlanGen(ccClone(G), o); let r, t = performance.now();
  for (;;) {
    r = it.next(); if (r.done) return r.value;
    if (performance.now() - t > 12) { await new Promise(res => setTimeout(res, 0)); if (!alive()) return null; t = performance.now(); }
  }
}
/* is this planned action still the right one: legal, and the board is what auto play expected */
function ccAutoStill(G, a) {
  if (!a) return false;
  if (a.pre && a.pre !== ccAutoKey(ccRedact(G, G.active))) return false;
  return a.k === 'end' ? G.phase === 'main' : !ccApply(ccClone(G), a);
}
/* the next action for your side: keeps following the turn's plan while it stays right, otherwise plans again */
function ccAutoPick(G, plan) {
  let p = plan && plan.length && ccAutoStill(G, plan[0]) ? plan : ccAutoPlan(G);
  return { a: p[0], plan: p.slice(1) };
}
