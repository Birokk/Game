'use strict';
/* Turns results.json (written by sim.js) into the report's data files: {rows, meta} JSON, with both scripts' code in meta. */
const fs = require('fs'), path = require('path');
const R = require('./results.json');   // written by sim30.cjs
const simCode = fs.readFileSync(path.join(__dirname, 'sim30.cjs'), 'utf8'), myCode = fs.readFileSync(__filename, 'utf8');
const NAMES = { f2p: 'Free to play', small: 'Small spender', whale: 'Whale', f2pnm: 'F2P, no membership', f2pcut: 'F2P, no expedition pearls', f2pnb: 'F2P, building the leader wins no extra battles' };
const MAIN = ['f2p', 'small', 'whale'];
const meta = what => [
  { label: 'What', value: what },
  { label: 'Runs', value: `${R.f2p.seeds} simulated 30-day accounts per scenario, same seeds for every scenario` },
  { label: 'sim.js', value: simCode, type: 'code', lang: 'javascript' },
  { label: 'export.js', value: myCode, type: 'code', lang: 'javascript' }
];
const out = (name, rows, what) => fs.writeFileSync(path.join(__dirname, name + '.json'), JSON.stringify({ rows, meta: meta(what) }));

const summary = Object.keys(NAMES).map(k => { const r = R[k];
  return { account: k, name: NAMES[k], group: MAIN.includes(k) ? 'main' : 'variant', usd: r.usd.mean, pearls: r.pearlsIn.med, pulls: r.pulls.med, pulls_p10: r.pulls.p10, pulls_p90: r.pulls.p90,
    pulls_per_day: Math.round(r.pulls.med / 30), ur_copies: r.urCopies.med, ur_owned: r.urChars.med, six_star: r.six.med, top_cs: r.topCS.med, top_cs_p10: r.topCS.p10, top_cs_p90: r.topCS.p90,
    top_grade: Object.entries(r.gradeTop).sort((a, b) => b[1] - a[1])[0][0], second_cs: r.top2CS.med, third_cs: r.top3CS.med, total_cs: r.totalCS.med, sss_chars: r.sssChars.med, ss_chars: r.ssPlus.med,
    s_chars: r.sPlus.med, urplus_chars: r.urPlus.med, level: r.lv.med, vip: r.vip.med, honor: r.honor.med, battle_rank: r.br.med, camp_cleared: r.camp.med, camp_stars: r.campStars.med, tree_cleared: r.tree.med,
    day_camp_done: r.dCamp.med, day_tree_done: r.dTree.med, day_first_6star: r.d6.med, day_first_sss: r.dSSS.med, arena_vp: r.arenaVP.med,
    arena_rank: (() => { const c = {}; r.arenaRank.forEach(x => c[x] = (c[x] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; })(),
    base_market: r.farm.market.med, base_pub: r.farm.pub.med, base_crops: r.farm.crops.med, base_inn: r.farm.inn.med, houses: r.houses.med, outfits: r.skins.med, pet_copies: r.pets.med, ur_memories: r.urMems.med,
    achievements: r.ach.med, max_win_pct: Math.round(r.maxwin * 100), stamina_left: r.stamLeft.med, gold_spent: r.goldSpent.med, raid_clears: r.raidClears.med, qm_wins: r.qmWins.med, ur_gear: r.urRaw.med,
    exped_pearls: r.pearlSrc.expeditions || 0, pearls_mean: Object.values(r.pearlSrc).reduce((a, b) => a + b, 0), exped_share: Math.round(100 * (r.pearlSrc.expeditions || 0) / Object.values(r.pearlSrc).reduce((a, b) => a + b, 0)),
    pulls_free: r.pullSrc.free, pulls_pearls: r.pullSrc.pearls, pulls_limited: r.pullSrc.tickets, pulls_standard: r.pullSrc.wishes,
    pearls_per_usd: r.usd.mean ? Math.round((r.pearlsIn.med - R.f2p.pearlsIn.med) / r.usd.mean * 10) / 10 : null };
});
out('summary', summary, 'One row per scenario: medians over the simulated accounts at the end of day 30 (usd is the mean; *_p10 / *_p90 are the 10th and 90th percentiles).');

const daily = []; MAIN.forEach(k => R[k].timeline.forEach((t, i) => daily.push({ account: k, name: NAMES[k], day: t.d, pulls: t.pulls, top_cs: t.topCS, six_star: t.six, level: t.lv, honor: t.honor, camp: t.camp, tree: t.tree, pearls: t.pearlsIn, usd: t.usd,
  pulls_p10: R[k].timelineBand[i].pullsLo, pulls_p90: R[k].timelineBand[i].pullsHi, top_cs_p10: R[k].timelineBand[i].topLo, top_cs_p90: R[k].timelineBand[i].topHi })));
out('daily', daily, 'Day by day, the median across accounts of each figure at the end of that day.');

const pearls = []; MAIN.concat(['f2pcut']).forEach(k => { for (const [s, n] of Object.entries(R[k].pearlSrc)) pearls.push({ account: k, name: NAMES[k], flow: 'in', source: s, pearls: n });
  for (const [s, n] of Object.entries(R[k].pearlSink)) pearls.push({ account: k, name: NAMES[k], flow: 'out', source: s, pearls: n }); });
out('pearls', pearls, 'Pearls earned (flow in) and spent (flow out) over 30 days, by source: the average account.');

const gearTxt = g => g.replace(/ \((\d{6})★\)$/, (m, st) => { const c = {}; [...st].forEach(x => c[x] = (c[x] || 0) + 1); const k = Object.keys(c).sort().reverse(); return k.length === 1 ? `, all ${k[0]}★` : ', ' + k.map(x => `${c[x]}× ${x}★`).join(' + '); });
const roster = []; MAIN.forEach(k => R[k].story.roster.slice(0, 10).forEach((c, i) => roster.push({ account: k, name: NAMES[k], rank: i + 1, character: c.name, rarity: c.r === 5 ? 'UR' : 'SSR',
  stars: c.stars, breakthrough: c.bt, potential: c.pot, bond: c.bond, married: c.married ? 'yes' : 'no', cs: c.cs, grade: c.grade, sss_stars: c.sss, gear: gearTxt(c.gear), gear_levels: c.glv, pet: c.pet, memory: c.mem, outfits: c.skins })));
out('roster', roster, "The median account's ten best characters at the end of day 30 (the account in the middle when the runs are sorted by best CS + pulls).");

const log = [];
const keep = t => /joined|6★|Step-Up steps|cleared campaign|SSS-awakened|married|Membership|MAX WIN|UR selector|Premium|Fountain/.test(t);
MAIN.forEach(k => { const s = R[k].story; s.events.filter(e => keep(e[1])).forEach(e => log.push({ account: k, name: NAMES[k], kind: 'story', day: e[0], text: e[1].replace(/^./, c => c.toUpperCase()), times: null, usd: null }));
  const agg = {}; s.buys.forEach(([d, usd, what]) => { const key = what.replace(/ \$[\d.]+$/, m => m); const a = agg[key] = agg[key] || { times: 0, usd: 0, first: d }; a.times++; a.usd += usd; });
  Object.entries(agg).sort((a, b) => b[1].usd - a[1].usd).forEach(([what, a]) => log.push({ account: k, name: NAMES[k], kind: 'spend', day: a.first, text: what.replace(/^(daily|weekly|monthly) pack/, (m, w) => w[0].toUpperCase() + w.slice(1) + ' pack').replace(/^Top Up (\d+) pearls$/, 'Top Up pack: $1 pearls'), times: a.times, usd: Math.round(a.usd * 100) / 100 })); });
out('log', log, "The median account's diary (when characters joined, reached 6★, chapters cleared…) and everything it paid for.");
console.log('rows', summary.length, daily.length, pearls.length, roster.length, log.length, 'sizes', ['summary', 'daily', 'pearls', 'roster', 'log'].map(n => fs.statSync(path.join(__dirname, n + '.json')).size));
