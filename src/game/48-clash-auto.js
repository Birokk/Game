/* ---------- Card Clash auto play: a planner that plays your side and wins ----------
   Unlike the bot (which only sees its own cards and looks one action ahead), auto play reads the whole match:
   the bot's hand, its face-down traps and the order of both decks (the engine is deterministic, so every
   simulated move happens exactly like the real one). Each of your turns it searches whole sequences of
   actions (a beam search over copies of the match), lets the bot answer each promising end position the way
   the real bot would (its own policy, minus its small random noise), and keeps the plan whose position is best
   after that answer. A won position always beats anything else, a draw counts almost as badly as a loss, and
   the longer the match runs the more the enemy hero's HP weighs, so it never settles for the round-40 draw.
   Pure functions on the match state: no DOM here (the UI in 45-clash-ui.js runs the plan). */

const CC_AUTO = { beam: 10, depth: 12, reply: 12, horizon: 16, lateExtra: 10, endExtra: 12 };
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
/* the real bot's answer: its noise comes from the match state (ccNoise), so this is exactly what it will do */
function ccAutoReply(g, me) {
  let n = 0; while (g.phase !== 'over' && g.active !== me && n++ < 40) { const a = ccBotPick(g); if (ccApply(g, a)) ccApply(g, { k: 'end' }); }
  return g;
}
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
/* the cheap version of a turn used inside simulations: the best ending by the evaluation alone */
function ccAutoBase(G, me, bb = 3) { const f = ccAutoTurn(G, me, bb, 10)[0]; return f ? f.seq : []; }
/* play the match forward exactly (auto play's cheap turns against the real bot) for up to `rounds` rounds */
function ccAutoRollout(g, me, rounds, bb = 3) {
  const end = g.round + rounds; let n = 0;
  while (g.phase !== 'over' && g.round < end && n++ < 300) {
    if (g.active === me) {
      for (const a of ccAutoBase(g, me, bb)) { if (ccApply(g, a) || g.phase === 'over') break; }
      if (g.phase === 'choice' && g.active === me) ccApply(g, ccLegal(g)[0]);
      if (g.phase === 'main' && g.active === me) ccApply(g, { k: 'end' });
    } else ccAutoReply(g, me);
  }
  return g;
}
const ccAutoScore = (g, me) => g.phase === 'over' ? (g.winner === me ? 1e7 - g.turnNo * 1000 : g.winner === 'draw' ? -6e6 - g.players[1 - me].hp * 5000 + g.players[me].hp * 50 : -1e7 + g.turnNo * 1000) : ccAutoEval(g, me);
/* the plan for the rest of this turn: a list of actions ending with { k: 'end' } (or a winning action).
   The most promising ways to end the turn (plus the cheap policy's own choice, so the result can only get
   better) are each played forward exactly: the bot's answer, then auto play's cheap turns against the real bot,
   for up to `o.horizon` rounds or to the end of the match. The plan whose future is best wins: a victory
   (the sooner the better), else the best position, a draw only before a loss. */
function* ccAutoPlanGen(G, o = CC_AUTO) {
  const me = G.active;
  if (G.phase === 'over') return [];
  const endgame = G.round >= 33;   // a long stalemate: search much wider in the last rounds
  const fin = ccAutoTurn(G, me, endgame ? o.beam * 2 : o.beam, o.depth);
  if (fin[0] && fin[0].win) return fin[0].seq;
  yield;
  const cand = fin.slice(0, o.reply + (G.round >= 16 ? o.lateExtra || 0 : 0) + (G.round >= 30 ? o.endExtra || 0 : 0) + (endgame ? 20 : 0));
  const base = ccAutoTurn(G, me, 3, 10)[0];
  if (base && !cand.some(f => ccAutoKey(f.g) === ccAutoKey(base.g))) cand.push(base);
  let best = null, bestS = -Infinity;
  for (const f of cand) {
    const g = ccClone(f.g); ccApply(g, { k: 'end' }); ccAutoReply(g, me);
    ccAutoRollout(g, me, o.horizon);
    const sc = ccAutoScore(g, me) + f.s * .01;
    if (sc > bestS) { bestS = sc; best = f; }
    yield;
  }
  // no win in sight: think much harder (rare, so it costs little overall): a wider search of this turn, and every
  // future played out to the end with a stronger policy for auto play's later turns
  if (bestS < 5e6 && o.deep !== false) {
    const wide = ccAutoTurn(G, me, o.beam * 3, o.depth + 4), pool = best ? [best] : [];
    for (const f of wide.slice(0, o.reply * 4).concat(cand)) if (!pool.some(x => ccAutoKey(x.g) === ccAutoKey(f.g))) pool.push(f);
    yield;
    let best2 = null, bestS2 = -Infinity;
    for (const f of pool) {
      if (best2 && o.until && performance.now() > o.until) break;   // in the browser: out of thinking time, keep the best so far
      const g = ccClone(f.g); ccApply(g, { k: 'end' }); ccAutoReply(g, me);
      ccAutoRollout(g, me, 40, 6);
      const sc = ccAutoScore(g, me) + f.s * .01;
      if (sc > bestS2) { bestS2 = sc; best2 = f; }
      yield;
    }
    if (best2) best = best2;
  }
  return best ? best.seq.concat([{ k: 'end' }]) : [{ k: 'end' }];
}
function ccAutoPlan(G, o = CC_AUTO) { const it = ccAutoPlanGen(G, o); let r; do r = it.next(); while (!r.done); return r.value; }
/* the same plan without freezing the page: yields to the browser between the simulated futures */
async function ccAutoPlanAsync(G, o = CC_AUTO, alive = () => true) {
  const it = ccAutoPlanGen(ccClone(G), { ...o, until: performance.now() + (o.budget || 9000) }); let r, t = performance.now();
  for (;;) {
    r = it.next(); if (r.done) return r.value;
    if (performance.now() - t > 12) { await new Promise(res => setTimeout(res, 0)); if (!alive()) return null; t = performance.now(); }
  }
}
/* the next action for your side: keeps following the turn's plan while it stays legal, otherwise plans again */
function ccAutoPick(G, plan) {
  if (G.phase === 'choice') { const p = ccAutoPlan(G); return { a: p[0], plan: p.slice(1) }; }
  let p = plan && plan.length ? plan : ccAutoPlan(G);
  const ok = a => { if (a.k === 'end') return true; const g = ccClone(G); return !ccApply(g, a); };
  if (!ok(p[0])) p = ccAutoPlan(G);
  return { a: p[0], plan: p.slice(1) };
}
