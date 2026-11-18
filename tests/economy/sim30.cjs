'use strict';
/* 30-day economy simulation of Blank: Project for three new accounts (F2P, small spender, whale).
   Every number below is copied from src/game (see the comments); the player's choices are a fixed "smart player"
   policy shared by all accounts, so only the wallet differs. Run: node tests/economy/sim30.cjs [seeds] (writes results.json here; export30.cjs turns it into the report's data files) */
const SEEDS = +process.argv[2] || 300;
const DAYS = 30;

/* ---------- rng ---------- */
let R = Math.random;
const rngOf = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const pick = a => a[Math.floor(R() * a.length)];
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ---------- roster (assumed launch roster; the default pool only has 3 UR + 3 SSR) ---------- */
const UR_NAMES = ['Aria', 'Celeste', 'Rook', 'Seren', 'Valen', 'Ishara', 'Nox', 'Elowen', 'Kairo', 'Mirelle'];
const SSR_NAMES = ['Luna', 'Kenji', 'Mochi', 'Pip', 'Tamsin', 'Oren', 'Saki', 'Bram', 'Wren', 'Juno', 'Lio', 'Fern'];
const LIMITED = 0, STEP_FEAT = 1, BEGIN_PICKS = [1, 2, 3];          // Aria is the limited rate-up, Celeste the Step-Up rate-up
const N_URMEM = 8, N_SSRMEM = 10;                                     // UR memory i is UR character i's signature memory
const UR_SKIN_OF = [0, 1, 2, 3, 4, 5], SSR_SKIN_OF = [0, 1, 2, 3, 4, 5];   // 6 UR + 6 SSR outfits, for UR characters 0..5
const MBOX_SKIN = 0;                                                  // the Mystery Fountain's premium outfit = Aria's UR outfit

/* ---------- constants from the code ---------- */
const BASE5 = .02, HARD = 50, BASE4 = .051, UPG = .01;                // 12-gacha.js
const LOW = [['fragssr', .2], ['fragur', .06], ['cfssr', .18], ['cfur', .08]];   // else 500 gold
const SSR_MEM = .33, CORAL = { 4: 5, 5: 10 }, CORAL_MAX = { 4: 10, 5: 40 }, DUST = 5;
const STEP_COST = [6, 12, 18, 24, 30, 30, 30], STEP_GOLD = [5e3, 1e4, 15e3, 2e4, 3e4, 4e4, 5e4], STEP_UR_X = [.5, 1, 1.5, 1, 1.5, 1, 1];
const STD_MILES = { 100: 'ur', 200: 'ur', 300: 'sel', 400: 'ur', 500: 'ur', 600: 'sel' };
const PT_PRICE = 200;
const LV_MAX = 60, lvNeed = lv => 100 + 50 * (lv - 1);
const EXPV = { pull: 0, login: 0, spin: 0, ach: 0, hatch: 0, raid: 0, exped: 0, stam: 5 };   // EXP only from quests (A.xp += 500 a day / week) and stamina
const VIP_XP = [250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 128000, 256000, 512000];
const VIP_LVREW = { 1: { pearls: 20, coins: 1e4 }, 2: { pearls: 30, tickets: 2 }, 3: { pearls: 50, tickets: 5 }, 4: { pearls: 80, bottles: 5 }, 5: { pearls: 100, tickets: 10 },
  6: { pearls: 150, memtk: 1 }, 7: { pearls: 200, tickets: 15 }, 8: { pearls: 250, wishes: 20 }, 9: { pearls: 300, tickets: 20 }, 10: { pearls: 400, memtk: 2 }, 11: { pearls: 500, tickets: 30 }, 12: { pearls: 800, memtk: 3 } };
const FARM_PCT = [0, .1, .2, .3, .45, .6, .8, 1], FARM_GOLD = [0, 0, 25e3, 8e4, 2e5, 4.5e5, 9e5, 1.8e6], FARM_H = [0, 5 / 60, .5, 2, 6, 12, 24, 48];
const FARM = { market: { build: 25e3, day: 2e4, res: 'coins' }, pub: { build: 5e4, day: 3, res: 'pearls', perLv: 1, max: 3 }, crops: { build: 0, day: 60, res: 'stamina' }, inn: { build: 1e4, day: 15, res: 'thread' } };
const FARM_ORDER = ['market', 'pub', 'crops', 'inn'];
const EXP_PEARLS = [[0, 0, 47.5], [1, 1, 47.5], [5, 5, 5]], EXP_UR_MULT = [1, 1, 1];   // 0 or 1 pearl, 5 pearls 5% of the time
const BP_BIG = { free: { 10: { tickets: 2 }, 20: { pearls: 10 }, 30: { wishes: 3 }, 40: { fragur: 5 }, 50: { tickets: 3 }, 60: { cfur: 3 }, 70: { pearls: 15 }, 80: { eggur: 1 } },
  paid: { 10: { pearls: 50 }, 20: { memtk: 1 }, 30: { tickets: 5 }, 40: { cfur: 10 }, 50: { pearls: 80 }, 60: { memtk: 1 }, 70: { tickets: 10 }, 80: { ursel: 1 } } };
const BP_FIVE = { free: [{ wishes: 1 }], paid: [{ tickets: 3 }, { wishes: 3 }] };
const BP_CYCLE = { free: [{ coins: 8000 }, { thread: 25 }, { pearls: 2 }, { bottles: 1 }, { coins: 8000 }, { thread: 25 }, { fragssr: 2 }, { cfssr: 2 }],
  paid: [{ pearls: 10 }, { thread: 60 }, { tickets: 1 }, { bottles: 1 }, { pearls: 10 }, { coins: 20000 }, { wishes: 1 }, { cfur: 2 }] };
const BP_MILE = { pearls: 1, sktk: 5 };   // the season milestones: every 10th level, Coral Tide / Moon Tide only (the only skin tickets)
const bpReward = (lv, t) => { if (lv % 10 === 0) return BP_BIG[t][lv]; if (lv % 5 === 0) { const L = BP_FIVE[t]; return L[(lv - 5) / 10 % L.length]; } const L = BP_CYCLE[t]; return L[(lv - 1 - Math.floor(lv / 5)) % L.length]; };
const TOPUP = [[6, .99], [30, 4.99], [98, 14.99], [198, 29.99], [328, 49.99], [648, 99.99]];
const PACKS = {
  daily: { free: { coins: 1000, bottles: 1 }, paid: [[.99, { pearls: 7, bottles: 1 }], [2.99, { pearls: 20, cfssr: 1, bottles: 1 }], [4.99, { pearls: 34, cfssr: 2, bottles: 2 }], [9.99, { pearls: 70, cfur: 1, cfssr: 2, bottles: 3 }]] },
  weekly: { free: { pearls: 3, cfssr: 1, bottles: 1 }, paid: [[4.99, { pearls: 33, cfssr: 2, bottles: 2 }], [9.99, { pearls: 68, cfur: 1, cfssr: 3, bottles: 3 }], [19.99, { pearls: 140, cfur: 2, cfssr: 4, bottles: 5 }], [49.99, { pearls: 360, memtk: 1, cfur: 4, cfssr: 6, bottles: 8 }]] },
  monthly: { free: { pearls: 10, cfur: 1, bottles: 2 }, paid: [[9.99, { pearls: 68, cfur: 1, cfssr: 3, bottles: 4 }], [29.99, { pearls: 210, cfur: 3, cfssr: 5, bottles: 8 }], [49.99, { pearls: 360, memtk: 1, cfur: 5, cfssr: 8, bottles: 10 }], [99.99, { pearls: 750, memtk: 2, cfur: 10, cfssr: 15, bottles: 15 }]] }
};
const CS = { base: { 4: 1000, 5: 2000 }, star: { 4: 300, 5: 500 }, bt: { 4: 500, 5: 800 }, skin: { 4: 400, 5: 800, 6: 1000 }, cloth: { 3: 100, 4: 250 }, set: { 3: 2000, 4: 3000, 5: 4000 },
  pet: { 4: 600, 5: 1200 }, petStar: { 4: 100, 5: 200 }, mem: { 4: 500, 5: 1000 }, bond: { 4: 250, 5: 400 } };
const CS_UR_STAR = [0, 600, 800, 1000], SET_UR3 = 5000, SIG_CS = 1000, MEM_STAR_CS = 200, SIG_MEM_CS = 500, POT_CS = 100, SSS_CS = 1000;
const GRADES = [['F', 0], ['E', 1500], ['D', 3000], ['C', 5000], ['B', 7500], ['A', 1e4], ['S', 15e3], ['SS', 2e4], ['SSS', 3e4]];
const gradeOf = cs => GRADES.filter(g => cs >= g[1]).pop()[0];
const PG_CS = [0, 40, 90, 150, 220, 300, 390, 490, 600];
const PG_CHANCE = { 4: [.95, .85, .75, .62, .5, .38, .27, .17], 5: [.85, .74, .62, .5, .39, .29, .19, .11] };
const PG_GOLD = { 4: [1000, 2000, 4000, 7000, 12000, 20000, 32000, 50000], 5: [1500, 3000, 6000, 10500, 18000, 30000, 48000, 75000] };
const BOND_XP = [0, 400, 1500, 3700, 7200, 12000, 17900, 25000, 32600, 40900, 50000];
const bondLv = xp => BOND_XP.filter(t => xp >= t).length - 1;
const GEAR_TRY = { 3: 75, 4: 125, 5: 190 }, GEAR_BT = { 10: 20, 20: 50, 30: 100 }, GEAR_MATS = [2, 4, 6, 9, 12];
const gearChance = n => Math.max(.35, .9 - .015 * n), gearCap = (r, st) => r === 5 ? [0, 30, 35, 40][st] : r === 4 ? 20 : 10;
const GEAR_STAGES = [{ lv: 1, ur: 0, ssr: .30, dbl: .25 }, { lv: 10, ur: 0, ssr: .36, dbl: .30 }, { lv: 20, ur: .06, ssr: .40, dbl: .33 }, { lv: 30, ur: .09, ssr: .44, dbl: .40 }, { lv: 40, ur: .11, ssr: .48, dbl: 1 }];
const GOLD_STAGES = [{ lv: 1, st: 5, g: 3000, x: 10 }, { lv: 10, st: 10, g: 7000, x: 15 }, { lv: 20, st: 15, g: 12000, x: 20 }, { lv: 30, st: 20, g: 18000, x: 25 }, { lv: 40, st: 25, g: 26000, x: 30 }];
const BR_NEED = r => 200 + 50 * r, BR_CH = [0, 3, 7, 11, 15, 19, 21, 0, 0, 0, 0, 30, 0, 0, 0, 0];   // only the first chapter of a block has a gate (6-10, 11-15)
const AR_RANKS = [['Bronze', 0], ['Silver', 1000], ['Gold', 2000], ['Platinum', 3000], ['Diamond', 4000], ['Mythic', 5000], ['Ascendant', 5250], ['Celestial', 5500]];
const AR_VP = [[25, 0, 25, 0], [22, -2, 22, -2], [20, -4, 20, -4], [18, -6, 18, -6], [15, -8, 15, -8], [12, -10, 12, -10], [10, -8, 10, -6], [10, -10, 10, -10]];
const AR_WEEK = [[5, 50], [10, 80], [15, 120], [20, 160], [25, 200], [30, 260], [40, 320], [50, 400]];
const AR_WIN = [.80, .72, .60, .52, .42, .34, .22, .15];              // assumed win chance against your own rank's brains (easy → expert planner)
const arRank = vp => AR_RANKS.filter(r => vp >= r[1]).length - 1;
const AR_SHOP = [['tickets', 1, 300, 2, 1], ['wishes', 1, 240, 2, 1.2], ['bottles', 1, 60, 1, 1.4], ['coins', 1e4, 45, 3, 1.4], ['pearls', 1, 180, 1, .7], ['starlight', 10, 120, 2, .8], ['cfssr', 3, 90, 2, 1],
  ['cfur', 1, 150, 2, .8], ['fragssr', 3, 75, 2, 1], ['fragur', 1, 120, 1, .7], ['gplush', 1, 75, 2, .9], ['thread', 40, 60, 2, .9], ['nametk', 1, 360, 1, .25], ['eggur', 1, 1050, 1, .2], ['memtk', 1, 2700, 1, .15], ['ictk', 2, 90, 2, 1]];
const G_SHOP = [['tickets', 1, 150, 1, 1], ['wishes', 1, 120, 1, 1.2], ['bottles', 1, 30, 1, 1.4], ['coins', 5000, 24, 3, 1.4], ['cfssr', 3, 45, 2, 1], ['cfur', 1, 75, 2, .8], ['fragssr', 3, 30, 2, 1], ['fragur', 1, 60, 1, .7],
  ['gplush', 1, 45, 2, .9], ['gbracelet', 2, 30, 2, .9], ['thread', 20, 30, 2, .9], ['nametk', 1, 180, 1, .25], ['memtk', 1, 1350, 1, .15], ['ictk', 1, 36, 2, 1]];
const SHOP_PRIO = ['memtk', 'eggur', 'cfur', 'pearls', 'tickets', 'wishes', 'fragur', 'ictk', 'sktk', 'cfssr', 'starlight', 'fragssr', 'gplush', 'bottles', 'thread', 'coins', 'gbracelet'];
const GB_TIERS = [[0, 0, 0, 2000, 0], [1, 1, .2, 5000, 1], [15, 1, .3, 9000, 1], [30, 2, .35, 14000, 2], [45, 2, .45, 20000, 2], [60, 3, .5, 26000, 3], [75, 3, .6, 32000, 3]];

/* campaign stages: [chapter, base win chance for an average player (the owner's Node sims), chance of each extra star on a win] */
const CAMP = [];
[.98, .97, .97, .96, .65].forEach(p => CAMP.push({ ch: 0, p, sx: .8 }));
[.98, .98, .98, .98, .90, .98, .90, .84, .98, .90].forEach(p => CAMP.push({ ch: 1, p, sx: .6 }));
[.97, .93, .97, .97, .93, .78, .97, .93, .90, .76].forEach(p => CAMP.push({ ch: 2, p, sx: .55 }));
for (let c = 3; c <= 5; c++) for (let i = 0; i < 10; i++) CAMP.push({ ch: c, p: i === 4 || i === 9 ? .8 : .9, sx: .7 });
[[.73, .80, .63, .73, .50, .80, .57, .83, .63, .40], [.60, .57, .63, .43, .50, .83, .33, .53, .77, .30], [.63, .37, .57, .73, .37, .73, .67, .60, .40, .27],
 [.80, .67, .57, .40, .37, .70, .57, .40, .47, .37], [.77, .83, .63, .77, .27, .57, .60, .57, .37, .23]].forEach((L, k) => L.forEach(p => CAMP.push({ ch: 6 + k, p, sx: .45 })));   // Chapters 6-10 (harder, weakness / resistance)
[[.44, .44, .72, .46, .39, .78, .61, .39, .72, .20], [.72, .56, .39, .67, .50, .83, .67, .67, .33, .50], [.56, .50, .44, .44, .28, .50, .56, .44, .50, .44],
 [.78, .83, .39, .83, .50, .67, .39, .78, .44, .28], [.50, .78, .50, .39, .50, .78, .56, .28, .22, .22]].forEach((L, k) => L.forEach(p => CAMP.push({ ch: 11 + k, p, sx: .4 })));   // Chapters 11-15 (two-style decks, planning bosses)
CAMP.forEach((s, i) => { s.i = i; s.first = i === 0 || CAMP[i - 1].ch !== s.ch; s.last = i === CAMP.length - 1 || CAMP[i + 1].ch !== s.ch; });
const TREE = [.97, 1, .90, .77, .57, .57, .57, .53, .47, .47, .63, .73, .73, .40, .40, .57, .63, .47, .50, .40].map((p, i) => ({ no: i + 1, p, sx: .5 }));   // 20 floors (the Node sim's average player, neutral leader)
const RAID_P = { gear: [.87, .84, .8, .78, .75], gold: [.85, .78, .7, .6, .5] };   // raid guardians (tuned for ~77–87%, vault V ~50%)

/* ---------- profiles ---------- */
const PROFILES = {
  f2p: { label: 'Free to play', key: 'f2p', memberPearls: true, refills: 2 },
  f2pnm: { label: 'Free to play (no membership at all)', key: 'f2pnm', memberPearls: false, refills: 2 },
  f2pnb: { label: 'Free to play (a stronger leader wins no more often)', key: 'f2pnb', memberPearls: true, refills: 2, noBoost: true },
  f2pcut: { label: 'Free to play (no expedition pearls)', key: 'f2pcut', memberPearls: true, refills: 2, expCut: 0.001 },
  small: { label: 'Small spender', key: 'small', memberPearls: true, refills: 4, honor: 1, skins: 2 },
  whale: { label: 'Whale', key: 'whale', memberPearls: true, refills: 6, honor: 2, whale: true }
};

/* ---------- account ---------- */
function newAccount(P) {
  const A = { P, day: 0, usd: 0, buys: [], w: { pearls: 0, coins: 0, tickets: 0, wishes: 0, bottles: 0, dust: 0, starlight: 0, cfur: 0, cfssr: 0, fragur: 0, fragssr: 0, eggur: 0, eggssr: 0, memtk: 0, ursel: 0, sktk: 0, ictk: 0, thread: 0, gpts: 0, atok: 0, rings: 0, gplush: 0 },
    src: {}, sink: {}, xp: 0, lv: 1, lvGot: 1, vipxp: 0, vipGot: 0, stam: 240, stamSpent: 0, goldSpent: 0,
    chars: [], mems: { ur: Array(N_URMEM).fill(null).map(() => []), ssr: Array(N_SSRMEM).fill(null).map(() => []) }, memEx: new Set(),
    skins: { ur: Array(6).fill(false), ssr: Array(6).fill(false) }, pets: [],
    gear: { ur: [0, 1, 2].map(() => Array(6).fill(null).map(() => [0, 0, 0, 0])), ssr: Array(6).fill(0), r: Array(6).fill(0) },
    g: { beginner: { p5: 0, p4: 0, n: 0 }, stepup: { p5: 0, p4: 0, step: 0, guar: false }, limited: { p5: 0, p4: 0, guar: false, n: 0 }, weekly: { p5: 0, p4: 0, guar: false, n: 0 }, skins: { p5: 0, p4: 0, n: 0 }, memories: { p5: 0, p4: 0, n: 0 }, standard: { p5: 0, p4: 0, n: 0, miles: new Set() } },
    pulls: 0, pullsBy: { beginner: 0, stepup: 0, limited: 0, weekly: 0, skins: 0, memories: 0, standard: 0 }, x10: 0, maxwin: 0, urGot: 0, urCharGot: 0, ssrGot: 0,
    points: { feat: 0, perm: 0 }, prem: new Set(),
    farm: { market: { lv: 0, upEnd: null }, pub: { lv: 0, upEnd: null }, crops: { lv: 1, upEnd: null }, inn: { lv: 0, upEnd: null } }, farmAcc: { market: 0, pub: 0, crops: 0, inn: 0 },
    member: { p1: 0, p2: 0 }, honor: { xp: 0, lv: 1, tier: 0, wk: 0, claimed: 0, claimedPaid: 0 },
    camp: { stars: CAMP.map(() => [0, 0, 0]), clear: CAMP.map(() => false), tree: TREE.map(() => [0, 0, 0]), treeClear: TREE.map(() => false), miles: new Set() },
    raid: { stars: [0, 1, 2, 3].map(() => Array(5).fill(null).map(() => [0, 0, 0])) }, raidClears: 0,
    br: 0, brDay: -1, arena: { vp: 0, best: 0, w: 0, l: 0 }, qm: { w: 0, l: 0, d: 0 }, gb: { fights: 0, dmg: 0 },
    houses: [], ach: new Set(), stats: { gifts: 0, wishes: 0, exped: 0, baseCol: 0, hang: 0 }, mbox: false, timeline: [], events: [], step7: false
  };
  const mk = (name, r, kind, idx) => ({ name, r, kind, idx, own: false, copies: 0, bt: 0, pot: 0, bond: 0, married: false, mem: null, pet: null, sss: false, glv: Array(6).fill(0), wear: null, csv: 0 });
  UR_NAMES.forEach((n, i) => A.chars.push(mk(n, 5, i === LIMITED ? 'lim' : 'std', i)));
  SSR_NAMES.forEach((n, i) => A.chars.push(mk(n, 4, 'ssr', i)));
  const mc = mk('Main character', 5, 'mc', -1); mc.own = true; mc.copies = 1; A.chars.push(mc);
  return A;
}
const urChars = A => A.chars.filter(c => c.r === 5 && c.kind !== 'mc');
const ssrChars = A => A.chars.filter(c => c.r === 4);
const stars = c => c.own ? Math.min(6, c.copies - 1) : 0;
const gain = (A, k, n, from) => { if (!n) return; if (k === 'stamina') { A.stam = Math.min(999, A.stam + n); return; } if (k === 'exp') { A.xp += n; return; } if (k === 'vip') { A.vipxp += n; return; }
  A.w[k] = (A.w[k] || 0) + n; if (from) { const s = A.src[k] = A.src[k] || {}; s[from] = (s[from] || 0) + n; } };
const give = (A, obj, from) => { for (const [k, n] of Object.entries(obj)) gain(A, k, n, from); };
const spend = (A, k, n, why) => { if ((A.w[k] || 0) < n) return false; A.w[k] -= n; if (k === 'coins') A.goldSpent += n; const s = A.sink[k] = A.sink[k] || {}; s[why] = (s[why] || 0) + n; return true; };
const pay = (A, usd, what) => { A.usd += usd; A.vipxp += Math.round(usd * 100); A.buys.push([A.day, usd, what]); };
const log = (A, t) => A.events.push([A.day, t]);

/* ---------- characters, items ---------- */
function grantChar(A, c, from) {
  if (c.own && c.copies >= 7) { gain(A, 'starlight', CORAL_MAX[c.r], 'max-star copies'); return; }
  const first = !c.own; c.own = true; c.copies++; if (from !== 'frag' && from !== 'sel') gain(A, 'starlight', CORAL[c.r], 'pulls');
  if (first && c.r === 5) log(A, `${c.name} joined (${from})`);
  if (c.copies === 7 && c.r === 5) log(A, `${c.name} reached 6★`);
}
const grantMem = (A, r, i) => { const L = A.mems[r === 5 ? 'ur' : 'ssr'][i]; L.push(0); };
const randUR = A => urChars(A)[Math.floor(R() * 10)];
const randStdUR = A => urChars(A).filter(c => c.kind === 'std')[Math.floor(R() * 9)];
const randSSR = A => ssrChars(A)[Math.floor(R() * 12)];
/* the character the player builds first: the owned UR with the most stars (the limited one wins ties), then by CS */
const focusList = A => A.chars.filter(c => c.own).sort((a, b) => (b.r - a.r) || (stars(b) - stars(a)) || (b.csv - a.csv) || ((a.kind === 'lim' ? -1 : 0) - (b.kind === 'lim' ? -1 : 0)) || (a.kind === 'mc') - (b.kind === 'mc'));
const starTarget = A => { const f = focusList(A).filter(c => c.r === 5 && c.kind !== 'mc'); return f.find(c => stars(c) < 6) || null; };

/* ---------- gacha (rollOne in 12-gacha.js) ---------- */
function lowDrop(A, res) { const x = R(); let a = 0; for (const [k, p] of LOW) { a += p; if (x < a) { gain(A, k, 1, 'pulls'); res.low = k; return; } } gain(A, 'coins', 500, 'pulls'); res.low = 'coins'; }
function rollOne(A, bk, force, urX = 1) {
  const g = A.g[bk]; g.p5++; g.p4++; if (bk === 'beginner') g.n++;
  const x = bk === 'memories' ? 2 : 1, p5 = g.p5 >= HARD ? 1 : Math.min(1, BASE5 * x * urX), r = R();
  let rar = 3; const beginUR = bk === 'beginner' && g.n >= 50;
  if (force || beginUR || r < p5) rar = 5; else if (g.p4 >= 10 || r < p5 + BASE4 * x) rar = 4;
  if (rar === 5) { g.p5 = 0; g.p4 = 0; } else if (rar === 4) g.p4 = 0;
  const res = { rar };
  const urPick = (feat) => { if (g.guar || R() < .5) { g.guar = false; return feat; } g.guar = true; return randStdUR(A); };
  if (rar === 5) {
    A.urGot++;
    if (force === 'mem') { grantMem(A, 5, Math.floor(R() * N_URMEM)); res.ur = 'mem'; }
    else if (force === 'feat') { grantChar(A, A.chars[STEP_FEAT], 'Step-Up'); g.guar = false; res.ur = 'char'; }
    else if (beginUR) { grantChar(A, A.chars[pick(BEGIN_PICKS)], 'Beginner pull 50'); res.ur = 'char'; }
    else if (bk === 'beginner' || bk === 'memories') { grantMem(A, 5, Math.floor(R() * N_URMEM)); res.ur = 'mem'; }
    else if (bk === 'skins') { const i = Math.floor(R() * 6); if (A.skins.ur[i]) gain(A, 'starlight', 0); A.skins.ur[i] = true; res.ur = 'skin'; }
    else { const c = bk === 'limited' ? urPick(A.chars[LIMITED]) : bk === 'weekly' ? urPick(A.chars[1 + (A.week % 9)]) : bk === 'stepup' ? urPick(A.chars[STEP_FEAT]) : randStdUR(A); grantChar(A, c, bannerLabel(bk)); res.ur = 'char'; }
    if (res.ur === 'char') A.urCharGot++;
  } else if (rar === 4) {
    A.ssrGot++;
    if (bk === 'memories' || (['limited', 'weekly', 'standard', 'beginner'].includes(bk) && R() < SSR_MEM)) grantMem(A, 4, Math.floor(R() * N_SSRMEM));
    else if (bk === 'skins') A.skins.ssr[Math.floor(R() * 6)] = true;
    else { grantChar(A, randSSR(A), 'pull');
      if (bk !== 'beginner' && R() < UPG) { A.urGot++; A.urCharGot++; const g2 = g; g2.p5 = 0; const c = bk === 'limited' ? urPick(A.chars[LIMITED]) : bk === 'weekly' ? urPick(A.chars[1 + (A.week % 9)]) : bk === 'stepup' ? urPick(A.chars[STEP_FEAT]) : randStdUR(A); grantChar(A, c, 'SSR → UR upgrade'); res.rar = 5; } }
  } else lowDrop(A, res);
  gain(A, 'dust', DUST, 'pulls'); A.xp += EXPV.pull; A.pulls++; A.pullsBy[bk]++;
  if (['limited', 'weekly', 'skins'].includes(bk)) A.points.feat++; else if (bk === 'memories' || bk === 'standard') A.points.perm++;
  if (bk === 'standard') { g.n++; const m = STD_MILES[g.n]; if (m) { if (m === 'ur') { A.urGot++; A.urCharGot++; grantChar(A, randStdUR(A), 'Permanent milestone'); } else gain(A, 'ursel', 1, 'Permanent milestone'); } }
  if (bk === 'memories') { g.n++; if (g.n === 50) grantMem(A, 5, Math.floor(R() * N_URMEM)); }
  return res;
}
const bannerLabel = bk => ({ limited: 'Limited Banner', weekly: 'Weekly Spotlight', standard: 'Permanent Banner', stepup: 'Step-Up' })[bk] || bk;
function pull10(A, bk, opts = {}) {
  A.x10++; const out = [];
  if (A.lv >= 10 && A.pulls >= 100 && R() < .001 && !['beginner', 'stepup'].includes(bk)) {   // Max Win: 5 UR characters + 5 UR memories
    A.maxwin++; log(A, 'MAX WIN on a ×10'); for (let i = 0; i < 5; i++) { grantChar(A, randUR(A), 'Max Win'); grantMem(A, 5, Math.floor(R() * N_URMEM)); }
    A.urGot += 10; A.urCharGot += 5; A.pulls += 10; A.pullsBy[bk] += 10; gain(A, 'dust', 50, 'pulls'); return;
  }
  for (let i = 0; i < 10; i++) out.push(rollOne(A, bk, i === 9 ? opts.force10 : null, opts.urX || 1));
  // every ×10 holds at least 1 UR and 2 SSR character fragments (fragFloor)
  const cu = out.filter(r => r.low === 'cfur').length, cs = out.filter(r => r.low === 'cfssr').length;
  if (cu < 1) gain(A, 'cfur', 1, 'pulls'); if (cs < 2) gain(A, 'cfssr', 2 - cs, 'pulls');
  return out;
}

/* ---------- CS (27-score.js) ---------- */
function bestGear(A, c, used) {
  // options: a full UR set (sig set +1,000), a full SSR set, a full R set, or the best loose pieces
  const opts = [];
  const sig = c.r === 5 && c.kind !== 'mc' ? c.idx % 3 : -1;
  for (let s = 0; s < 3; s++) {
    const slots = A.gear.ur[s].map((st, k) => { const u = used.ur[s][k]; for (let x = 3; x >= 1; x--) { const free = st[x] - (u[x] || 0); if (free > 0) return x; } return 0; });
    if (slots.every(x => x)) { let pts = slots.reduce((t, x) => t + CS_UR_STAR[x], 0) + (slots.every(x => x === 3) ? SET_UR3 : 4000) + (s === sig ? SIG_CS : 0); opts.push({ pts, kind: 'ur', s, slots }); }
  }
  if (A.gear.ssr.every((n, k) => n - used.ssr[k] > 0)) opts.push({ pts: 6 * 250 + 3000, kind: 'ssr' });
  if (A.gear.r.every((n, k) => n - used.r[k] > 0)) opts.push({ pts: 6 * 100 + 2000, kind: 'r' });
  // loose: per slot the best free piece
  const loose = []; let lp = 0;
  for (let k = 0; k < 6; k++) { let best = null;
    for (let s = 0; s < 3; s++) for (let x = 3; x >= 1; x--) if (A.gear.ur[s][k][x] - (used.ur[s][k][x] || 0) > 0 && (!best || CS_UR_STAR[x] > best.pts)) best = { pts: CS_UR_STAR[x], s, x };
    if (!best && A.gear.ssr[k] - used.ssr[k] > 0) best = { pts: 250, ssr: 1 }; if (!best && A.gear.r[k] - used.r[k] > 0) best = { pts: 100, r: 1 };
    loose.push(best); if (best) lp += best.pts; }
  opts.push({ pts: lp, kind: 'loose', loose });
  return opts.sort((a, b) => b.pts - a.pts)[0];
}
function assignGear(A) {
  const used = { ur: [0, 1, 2].map(() => Array(6).fill(null).map(() => ({}))), ssr: Array(6).fill(0), r: Array(6).fill(0) };
  for (const c of focusList(A)) {
    const o = bestGear(A, c, used); c.wear = o;
    if (o.kind === 'ur') o.slots.forEach((x, k) => { used.ur[o.s][k][x] = (used.ur[o.s][k][x] || 0) + 1; });
    else if (o.kind === 'ssr') used.ssr.forEach((_, k) => used.ssr[k]++); else if (o.kind === 'r') used.r.forEach((_, k) => used.r[k]++);
    else o.loose.forEach((b, k) => { if (!b) return; if (b.ssr) used.ssr[k]++; else if (b.r) used.r[k]++; else used.ur[b.s][k][b.x] = (used.ur[b.s][k][b.x] || 0) + 1; });
  }
  A.gearUsed = used;
}
const wornCaps = c => { const o = c.wear; if (!o) return Array(6).fill(0);
  if (o.kind === 'ur') return o.slots.map(x => gearCap(5, x)); if (o.kind === 'ssr') return Array(6).fill(20); if (o.kind === 'r') return Array(6).fill(10);
  return o.loose.map(b => !b ? 0 : b.ssr ? 20 : b.r ? 10 : gearCap(5, b.x)); };
function csParts(A, c) {
  if (!c.own) return { base: 0, total: 0 };
  let p = CS.base[c.r] + stars(c) * CS.star[c.r] + Math.min(c.bt, stars(c)) * CS.bt[c.r];
  if (c.kind !== 'mc' && c.r === 5 && c.idx < 6) { if (A.skins.ur[c.idx]) p += 800; if (A.skins.ssr[c.idx]) p += 400; }
  if (c.married) p += 1000;
  if (c.wear) p += c.wear.pts;
  const caps = wornCaps(c); p += c.glv.reduce((t, l, k) => t + Math.min(l, caps[k]), 0) * 10;
  if (c.pet) { p += CS.pet[c.pet.r] + c.pet.st * CS.petStar[c.pet.r] + PG_CS[c.pet.gr]; }
  if (c.mem) { p += CS.mem[c.mem.r] + c.mem.st * MEM_STAR_CS + (c.mem.r === 5 && c.mem.i === c.idx && c.r === 5 && c.kind !== 'mc' ? SIG_MEM_CS : 0); }
  p += bondLv(c.bond) * CS.bond[c.r] + c.pot * POT_CS;
  const sssN = c.sss && p >= 3e4 ? Math.min(c.bt, stars(c)) : 0;
  return { base: p, total: p + sssN * SSS_CS, sss: sssN };
}
function refreshCS(A) { for (const c of A.chars) { const r = csParts(A, c); c.csv = r.base; c.cst = r.total; c.sssOn = r.sss; } }

/* ---------- pets & memories ---------- */
function hatchEggs(A) {
  while (A.w.fragssr >= 10) { A.w.fragssr -= 10; A.w.eggssr++; }
  while (A.w.fragur >= 10) { A.w.fragur -= 10; A.w.eggur++; }
  for (const k of ['eggur', 'eggssr']) while (A.w[k] > 0) { A.w[k]--; const r = k === 'eggur' ? 5 : 4, kind = r === 5 ? ri(0, 1) : ri(2, 5);
    let p = A.pets.find(x => x.kind === kind); if (!p) A.pets.push(p = { kind, r, copies: [] }); p.copies.push({ st: 0, gr: 0 }); A.xp += EXPV.hatch; A.stats.hatched = (A.stats.hatched || 0) + 1; }
  // fuse spare copies into the best copy below 6★ (keep one copy per pet kind for now; more holders come from other kinds)
  for (const p of A.pets) { p.copies.sort((a, b) => b.st - a.st || b.gr - a.gr); while (p.copies.length > 1 && p.copies[0].st < 6) { p.copies[0].st++; p.copies.pop(); } }
}
function equipPetsMems(A) {
  const F = focusList(A); const petCopies = []; A.pets.forEach(p => p.copies.forEach(cp => petCopies.push({ r: p.r, st: cp.st, gr: cp.gr, ref: cp })));
  petCopies.sort((a, b) => (CS.pet[b.r] + b.st * CS.petStar[b.r] + PG_CS[b.gr]) - (CS.pet[a.r] + a.st * CS.petStar[a.r] + PG_CS[a.gr]));
  F.forEach((c, i) => { const p = petCopies[i]; c.pet = p ? { r: p.r, st: p.st, gr: p.gr, ref: p.ref } : null; });
  // memory stars: fuse spare copies of the same memory into its best copy (max 3★), keeping one copy per memory
  for (const r of ['ur', 'ssr']) for (const L of A.mems[r]) { L.sort((a, b) => b - a); while (L.length > 1 && L[0] < 3) { L[0]++; L.pop(); } }
  const pool = []; A.mems.ur.forEach((L, i) => L.forEach(st => pool.push({ r: 5, i, st }))); A.mems.ssr.forEach((L, i) => L.forEach(st => pool.push({ r: 4, i, st })));
  const taken = new Set();
  for (const c of F) { let best = null, bv = -1;
    pool.forEach((m, j) => { if (taken.has(j)) return; const v = CS.mem[m.r] + m.st * MEM_STAR_CS + (m.r === 5 && m.i === c.idx && c.r === 5 && c.kind !== 'mc' ? SIG_MEM_CS : 0); if (v > bv) { bv = v; best = j; } });
    if (best != null) { taken.add(best); c.mem = pool[best]; } else c.mem = null; }
}

/* ---------- gear: drops, fusion, stars ---------- */
const urPiece = (A, s, st = 1) => { A.gear.ur[s][ri(0, 5)][st]++; A.stats.urRaw = (A.stats.urRaw || 0) + st; };
function gearDrop(A, si, set) {  // one gear raid clear on stage si (rollGearDrops): 1 piece, a 2nd with the stage's chance
  const S = GEAR_STAGES[si], n = R() < S.dbl ? 2 : 1;
  for (let i = 0; i < n; i++) { const x = R(); if (x < S.ur) urPiece(A, set, R() < .015 ? 2 : 1); else if (x < S.ur + S.ssr) A.gear.ssr[ri(0, 5)]++; else A.gear.r[ri(0, 5)]++; }
  gain(A, 'thread', GEAR_MATS[si], 'raids');
}
function gearHousekeeping(A) {
  // UR stars: two spare copies of the same piece at the same star → one copy a star higher; keep at least 2 copies of each piece
  for (const set of A.gear.ur) for (const st of set) { for (let x = 1; x <= 2; x++) while (st[x] >= 2 && st[1] + st[2] + st[3] > 2) { st[x] -= 2; st[x + 1]++; } }
  // 3 → 1 fusion of spares: keep 4 SSR and 4 R pieces per slot for the SSR characters
  const spareS = A.gear.ssr.map(n => Math.max(0, n - 4)), spareR = A.gear.r.map(n => Math.max(0, n - 4));
  let s = spareS.reduce((a, b) => a + b, 0), rr = spareR.reduce((a, b) => a + b, 0);
  while (rr >= 3) { for (let k = 0, t = 3; k < 6 && t; k++) while (spareR[k] && t) { spareR[k]--; A.gear.r[k]--; t--; } rr -= 3; A.gear.ssr[ri(0, 5)]++; s++; spareS.fill(0); A.gear.ssr.forEach((n, k) => spareS[k] = Math.max(0, n - 4)); s = spareS.reduce((a, b) => a + b, 0); }
  while (s >= 3) { for (let k = 0, t = 3; k < 6 && t; k++) while (spareS[k] && t) { spareS[k]--; A.gear.ssr[k]--; t--; } s -= 3; urPiece(A, ri(0, 2)); A.stats.fused = (A.stats.fused || 0) + 1; }
}

/* ---------- player level, VIP, honor ---------- */
function levelUps(A) {
  while (A.lv < LV_MAX) { let need = 0; for (let l = 1; l < A.lv + 1; l++) need += lvNeed(l); if (A.xp < need) break; A.lv++; }
  while (A.lvGot < A.lv) { A.lvGot++; const lv = A.lvGot; gain(A, 'coins', 2000 + lv * 500, 'level rewards'); gain(A, 'pearls', lv % 5 ? 3 : 15, 'level rewards');
    if (lv % 10 === 0) { gain(A, 'tickets', 3, 'level rewards'); gain(A, 'wishes', 2, 'level rewards'); } else if (lv % 5 === 0) gain(A, 'tickets', 1, 'level rewards'); else if (lv % 2 === 0) gain(A, 'bottles', 1, 'level rewards'); }
}
const vipLv = A => VIP_XP.filter(t => A.vipxp >= t).length;
function vipRewards(A) { const v = vipLv(A); while (A.vipGot < v) { A.vipGot++; give(A, VIP_LVREW[A.vipGot], 'VIP level rewards'); } }
function honorGain(A, n) { const room = Math.max(0, 9000 - A.honor.wk), g = Math.min(n, room); A.honor.wk += g; A.honor.xp += g; honorLevels(A); }
function honorLevels(A) { const H = A.honor; while (H.lv < 80 && H.xp >= H.lv * 480) H.lv++;
  while (H.claimed < H.lv) { H.claimed++; give(A, bpReward(H.claimed, 'free'), 'Pearl Honor'); }
  if (H.tier) while (H.claimedPaid < H.lv) { H.claimedPaid++; give(A, bpReward(H.claimedPaid, 'paid'), 'Pearl Honor (paid)'); if (H.claimedPaid % 10 === 0) give(A, BP_MILE, 'Pearl Honor (milestones)'); } }

/* ---------- stamina ---------- */
const memberOn = A => ({ p1: A.member.p1 >= A.day, p2: A.member.p2 >= A.day });
const stamDay = A => { const m = memberOn(A); return m.p2 ? 360 : m.p1 ? 300 : 240; };
const useStam = (A, n) => { if (A.stam < n) return false; A.stam -= n; A.stamSpent += n; A.xp += n * EXPV.stam; return true; };

/* ---------- battles ---------- */
const lead = A => focusList(A)[0];
const buildF = A => { if (process.env.NOBOOST || A.P.noBoost) return 0; const c = lead(A); return clamp((c ? c.cst : 2000) / 60000, 0, .55); };   // assumption: a stronger leader turns some losses into wins
const winP = (A, p) => 1 - (1 - p) * (1 - buildF(A));
const brOf = A => { let r = 1, left = A.br; while (r < 30 && left >= BR_NEED(r)) { left -= BR_NEED(r); r++; } return r; };
const brAdd = (A, k) => { let n = { w: 100, d: 60, l: 40 }[k]; if (k === 'w' && A.brDay !== A.day) { A.brDay = A.day; n += 200; } A.br += n; };
const LV_CH = { 6: 25, 11: 40 };   // player level 25 opens Chapters 6-10, level 40 opens Chapters 11-15
function campOpen(A, i) { const s = CAMP[i]; if (i > 0 && !A.camp.clear[i - 1]) return false; if (s.first && brOf(A) < BR_CH[s.ch]) return false; if (s.first && LV_CH[s.ch] && A.lv < LV_CH[s.ch]) return false; return true; }
function treeOpen(A, i) { if (i > 0 && !A.camp.treeClear[i - 1]) return false; const no = i + 1; return no < 4 || brOf(A) >= Math.min(30, Math.ceil(no * 1.4) + 2); }
function playStage(A, st, starsArr, isTree) {
  const win = R() < winP(A, st.p); brAdd(A, win ? 'w' : 'l');
  if (!win) return false;
  const sx = 1 - (1 - st.sx) * (1 - buildF(A) * .5), got = [1, R() < sx ? 1 : 0, R() < sx ? 1 : 0];
  got.forEach((v, k) => { if (v && !starsArr[k]) { starsArr[k] = 1; gain(A, 'pearls', 1, isTree ? 'Great Tree stars' : 'campaign stars'); } });
  return true;
}
function campMiles(A) {
  for (let ch = 0; ch <= 10; ch++) { const n = CAMP.filter(s => s.ch === ch).reduce((t, s) => t + A.camp.stars[s.i].reduce((a, b) => a + b, 0), 0);
    if (ch === 0) { if (n >= 15 && !A.camp.miles.has('c0')) { A.camp.miles.add('c0'); gain(A, 'wishes', 10, 'campaign rewards'); } }
    else for (const m of [10, 20, 30]) if (n >= m && !A.camp.miles.has(ch + ':' + m)) { A.camp.miles.add(ch + ':' + m); gain(A, 'pearls', 10, 'campaign rewards'); if (m === 10) gain(A, 'coins', 20000, 'campaign rewards'); else if (m === 20) gain(A, 'thread', 30, 'campaign rewards'); else gain(A, 'bottles', 1, 'campaign rewards'); } }
}
function arenaBattle(A) {
  const rk = arRank(A.arena.vp), win = R() < winP(A, AR_WIN[rk]), v = AR_VP[rk];
  A.arena.vp = Math.max(0, A.arena.vp + (win ? v[0] : v[1])); A.arena.best = Math.max(A.arena.best, A.arena.vp);
  if (win) A.arena.w++; else A.arena.l++; gain(A, 'atok', win ? 20 : 5, 'arena'); brAdd(A, win ? 'w' : 'l');
}
function arenaDefense(A) {  // 1–3 attacks per 12 h window, held with a chance around 0.5
  for (let w = 0; w < 2; w++) for (let i = ri(1, 3); i > 0; i--) { const rk = arRank(A.arena.vp), held = R() < clamp(.5 + buildF(A) * .4, .25, .75), v = AR_VP[rk];
    A.arena.vp = Math.max(0, A.arena.vp + (held ? v[2] : v[3])); A.arena.best = Math.max(A.arena.best, A.arena.vp); if (held) gain(A, 'atok', 5, 'arena'); }
}
function guildBoss(A) {
  const base = 16 + 30 * buildF(A), d = Math.max(0, Math.round(base + (R() - .5) * 18));
  const t = GB_TIERS.filter(x => d >= x[0]).pop(); A.gb.fights++; A.gb.dmg += d;
  gain(A, 'coins', t[3], 'guild boss'); gain(A, 'wishes', t[4], 'guild boss'); A.stam = Math.min(999, A.stam + Math.min(50, Math.round(5 + .6 * d)));
  for (let i = 0; i < t[1]; i++) { if (R() < t[2]) urPiece(A, ri(0, 2), R() < .05 ? 2 : 1); else A.gear.ssr[ri(0, 5)]++; }
  brAdd(A, 'w');
}
function qmBattle(A) {
  if (!useStam(A, 5)) return false;
  const pw = winP(A, .54) , x = R(); const k = x < pw ? 'w' : x < pw + .06 ? 'd' : 'l'; A.qm[k]++; brAdd(A, k);
  gain(A, 'coins', { w: 2000, d: 800, l: 400 }[k], 'Quick match');
  if (k === 'w') { const wk = Math.floor((A.day - 1) / 7); if (A.qmPwk !== wk) { A.qmPwk = wk; A.qmPw = 0; } if (A.qmPw < 60) { A.qmPw++; gain(A, 'pearls', 1, 'Quick match wins'); }
    A.gear.r[ri(0, 5)]++; if (R() < .5) A.gear.r[ri(0, 5)]++; }   // R gear only, at most 2 a game
  return true;
}
const topGearStage = A => GEAR_STAGES.filter(s => A.lv >= s.lv).length - 1;
const topGoldStage = A => GOLD_STAGES.filter(s => A.lv >= s.lv).length - 1;
const mainSet = A => { const c = starTarget(A) || lead(A); return c && c.r === 5 && c.kind !== 'mc' ? c.idx % 3 : 0; };
function raidBattle(A, raid, si) {  // raid 0–2 gear raids, 3 = Golden Vault
  const gold = raid === 3, p = winP(A, gold ? RAID_P.gold[si] : RAID_P.gear[si]), win = R() < p; brAdd(A, win ? 'w' : 'l');
  if (!win) return;
  const cost = gold ? GOLD_STAGES[si].st : 10; if (!useStam(A, cost)) return;
  raidClear(A, raid, si, 1);
  const st = A.raid.stars[raid][si], sx = .55 + buildF(A) * .3; const got = [1, R() < sx ? 1 : 0, R() < sx ? 1 : 0];
  got.forEach((v, k) => { if (v && !st[k]) { st[k] = 1; gain(A, 'pearls', 1, 'raid stars'); } });
}
function raidClear(A, raid, si, n) {
  for (let i = 0; i < n; i++) { if (raid === 3) { gain(A, 'coins', Math.round(GOLD_STAGES[si].g * (0.85 + R() * .3)), 'Golden Vault'); }
    else { gearDrop(A, si, raid); A.xp += EXPV.raid; } A.raidClears++; }
}

/* ---------- purchases ---------- */
function buyTopup(A, i, why) { const [p, usd] = TOPUP[i]; A.topFirst = A.topFirst || new Set(); const first = !A.topFirst.has(i); A.topFirst.add(i);
  const bonus = i === 0 ? 0 : first ? p : Math.round(p * .1); pay(A, usd, why || 'Top Up ' + (p) + ' pearls'); gain(A, 'pearls', p + bonus, 'Top Up'); }
function buyPack(A, kind, j) { const [usd, got] = PACKS[kind].paid[j]; pay(A, usd, `${kind} pack $${usd}`); give(A, got, `${kind} packs`); }
function buyMember(A, id, usd) { const cost = 30; if (usd) pay(A, usd, `${id === 'p2' ? 'Prism' : 'Lantern'} Membership`); else if (id === 'p2' || !spend(A, 'pearls', cost, 'memberships')) return false;
  A.member[id] = Math.max(A.member[id], A.day - 1) + 30; if (id === 'p1') { gain(A, 'pearls', 5, 'memberships'); gain(A, 'eggur', 1, 'memberships'); } else { gain(A, 'pearls', 10, 'memberships'); gain(A, 'eggur', 2, 'memberships'); gain(A, 'memtk', 1, 'memberships'); }
  log(A, `bought the ${id === 'p2' ? 'Prism' : 'Lantern'} Membership (${usd ? '$' + usd : cost + ' pearls'})`); return true; }
function buyOutfit(A, type, i, why) {  // pearls (60) or skin tickets (60 SSR / 120 UR)
  const arr = A.skins[type]; if (arr[i]) return false; const tk = type === 'ur' ? 120 : 60;
  if (A.w.sktk >= tk) { A.w.sktk -= tk; arr[i] = true; log(A, `bought ${UR_NAMES[i]}'s ${type.toUpperCase()} outfit with skin tickets`); return true; }
  if (spend(A, 'pearls', 60, 'outfits')) { arr[i] = true; log(A, `bought ${UR_NAMES[i]}'s ${type.toUpperCase()} outfit (${why || '60 pearls'})`); return true; }
  return false;
}
function spendings(A) {
  const P = A.P, d = A.day, dow = (d - 1) % 7;
  if ((P.key === 'small' || P.whale) && d === 1) { buyMember(A, 'p2', 9.99); buyMember(A, 'p1', 4.99); }
  if (P.key === 'small' && d === 1) { pay(A, 9.99, 'Pearl Honor: Coral Tide'); A.honor.tier = 1; honorLevels(A); }
  if (P.key === 'small' && d === 3) buyTopup(A, 2, 'Top Up $14.99 (for outfits)');
  if (P.whale) {
    if (d === 1) { for (let i = 0; i < 6; i++) buyTopup(A, i); pay(A, 4.99, 'First Top-Up offer'); grantChar(A, randStdUR(A), 'First Top-Up offer'); A.urGot++; A.urCharGot++; gain(A, 'stamina', 240); gain(A, 'wishes', 10, 'First Top-Up offer');
      pay(A, 19.99, 'Pearl Honor: Moon Tide'); A.honor.tier = 2; gain(A, 'pearls', 30, 'Pearl Honor (Moon Tide)'); gain(A, 'bottles', 3, 'Pearl Honor (Moon Tide)'); gain(A, 'wishes', 5, 'Pearl Honor (Moon Tide)'); gain(A, 'tickets', 5, 'Pearl Honor (Moon Tide)'); A.honor.xp += 4800; honorLevels(A);
      PACKS.monthly.paid.forEach((_, j) => buyPack(A, 'monthly', j)); }
    if (dow === 0) PACKS.weekly.paid.forEach((_, j) => buyPack(A, 'weekly', j));
    PACKS.daily.paid.forEach((_, j) => buyPack(A, 'daily', j));
  }
}

/* ---------- daily income (no money) ---------- */
const SIGN_TOTAL = { wishes: 10, tickets: 10, pearls: 30, coins: 5e4 };
function dailyFree(A) {
  const d = A.day, dow = (d - 1) % 7, m = memberOn(A);
  if (d === 1) { gain(A, 'pearls', 69, 'starter mail'); gain(A, 'coins', 1000, 'starter mail'); }
  gain(A, 'tickets', 1, 'daily login'); A.xp += EXPV.login;
  // Monthly Sign-in: day-by-day share of the month's total; bonus fragments at 5 / 10 / 15 / 25 days
  if ([7, 14, 21].includes(d)) gain(A, 'pearls', 5, 'monthly sign-in'); if (d === 30) gain(A, 'pearls', 15, 'monthly sign-in');
  if (d <= 20) gain(A, d % 2 ? 'wishes' : 'tickets', 1, 'monthly sign-in'); else gain(A, 'coins', 5e3, 'monthly sign-in');
  if (d === 5 || d === 10) gain(A, 'cfssr', 30, 'monthly sign-in bonus'); if (d === 15 || d === 25) gain(A, 'cfur', 30, 'monthly sign-in bonus');
  give(A, PACKS.daily.free, 'free pack gifts'); if (dow === 0) give(A, PACKS.weekly.free, 'free pack gifts'); if (d === 1) give(A, PACKS.monthly.free, 'free pack gifts');
  const v = vipLv(A); if (v) { gain(A, 'pearls', v, 'VIP daily reward'); gain(A, 'coins', v * 1000, 'VIP daily reward'); }
  if (m.p1) { gain(A, 'tickets', 1, 'memberships'); gain(A, 'pearls', 3, 'memberships'); } if (m.p2) { gain(A, 'tickets', 2, 'memberships'); gain(A, 'pearls', 6, 'memberships'); }
  // daily spin(s): expected value per spin, rolled
  for (let s = (m.p1 || m.p2) ? 2 : 1; s > 0; s--) { const x = R() * 100; A.xp += EXPV.spin;
    if (x < 25) gain(A, 'coins', 2000, 'daily spin'); else if (x < 45) gain(A, 'pearls', 1, 'daily spin'); else if (x < 60) gain(A, 'bottles', 1, 'daily spin'); else if (x < 72) gain(A, 'pearls', 3, 'daily spin');
    else if (x < 84) gain(A, 'wishes', 1, 'daily spin'); else if (x < 94) gain(A, 'coins', 5000, 'daily spin'); else if (x < 99) gain(A, 'pearls', 5, 'daily spin'); else gain(A, 'rings', 1, 'daily spin'); }
  if (R() < 1 / 3) gain(A, 'tickets', 1, 'Base fountain'); A.stats.wishes++;
  gain(A, 'gpts', 30 + 75, 'guild');   // daily login 30 + the 8 guild quests (~75 points with the level bonus)
}
function dailyQuests(A) {
  gain(A, 'pearls', 5, 'daily quests'); gain(A, 'coins', 1e4, 'daily quests'); A.xp += 500; gain(A, 'wishes', 1, 'daily quests'); gain(A, 'tickets', 1, 'daily quests'); A.vipxp += 50;
  if (A.day % 7 === 0) { gain(A, 'pearls', 10, 'weekly quests'); gain(A, 'coins', 1e4, 'weekly quests'); A.xp += 500; gain(A, 'wishes', 5, 'weekly quests'); gain(A, 'tickets', 5, 'weekly quests'); }
  honorGain(A, 800 + (A.day % 7 === 0 ? 3300 : 0));
}

/* ---------- base, expeditions, camp, houses ---------- */
function farmDay(A) {
  for (const id of FARM_ORDER) { const f = A.farm[id]; if (f.upEnd != null && f.upEnd <= A.day) { f.lv++; f.upEnd = null; }
    const out = FARM[id].perLv ? FARM[id].perLv * f.lv : FARM[id].day * FARM_PCT[f.lv]; A.farmAcc[id] += out; const whole = Math.floor(A.farmAcc[id]); A.farmAcc[id] -= whole;
    if (whole) { if (id === 'crops') A.stam = Math.min(999, A.stam + whole); else if (id === 'inn') A.w.thread += whole; else gain(A, FARM[id].res, whole, 'Base'); } }
  A.stats.baseCol += 2;
}
function farmUpgrades(A) {
  for (const id of FARM_ORDER) { const f = A.farm[id]; if (f.upEnd != null || f.lv >= (FARM[id].max || 7)) continue; const to = f.lv + 1, cost = to === 1 ? FARM[id].build : FARM_GOLD[to];
    if (A.w.coins < cost || (to > 1 && A.w.pearls < 5)) continue; spend(A, 'coins', cost, 'Base upgrades'); if (to > 1) spend(A, 'pearls', 5, 'Base upgrade requirements');
    let hours = FARM_H[to]; if (A.P.whale) { const sk = Math.ceil(hours * 6); if (spend(A, 'pearls', sk, 'Base: finish now')) hours = 0; }
    f.upEnd = A.day + Math.ceil(hours / 24); if (!hours) { f.lv++; f.upEnd = null; } }
}
function jobs(A) {
  // a character does one Camp / Expedition job at a time: Tournament (best UR) > 5 expeditions > Tavern (2) > Central (3)
  const F = focusList(A); let k = 0; const next = () => F[k++];
  const t = next(); if (t) { urPiece(A, ri(0, 2), R() < (t.r === 5 ? .1 : .05) ? 2 : 1); A.stats.camp = (A.stats.camp || 0) + 1; }
  for (let i = 0; i < 5; i++) { const c = next(); if (!c) break; for (let run = 0; run < 2; run++) expedition(A, c.r === 5); }
  for (let i = 0; i < 2; i++) { const c = next(); if (!c) break; for (let j = ri(1, 3); j; j--) A.gear.ssr[ri(0, 5)]++; }
  for (let i = 0; i < 3; i++) { const c = next(); if (!c) break; for (let j = ri(1, 3); j; j--) A.gear.r[ri(0, 5)]++; }
}
function expedition(A, ur) {
  const r = ur ? Math.max(R(), R()) : R(); gain(A, 'coins', Math.round((1000 + Math.pow(r, 1.6) * 19000) / 100) * 100, 'expeditions');
  const w = EXP_PEARLS.map((t, i) => t[2] * (ur ? EXP_UR_MULT[i] : 1)), tot = w.reduce((a, b) => a + b, 0); let x = R() * tot, tier = 0;
  for (; tier < w.length - 1; tier++) { if (x < w[tier]) break; x -= w[tier]; } const [lo, hi] = EXP_PEARLS[tier]; let pe = lo + Math.floor(R() * (hi - lo + 1)); if (A.P.expCut) pe = Math.floor(pe * A.P.expCut + R()); gain(A, 'pearls', pe, 'expeditions');
  A.xp += EXPV.exped; if (R() * 100 < (ur ? 12 : 6)) gain(A, 'wishes', 1, 'expeditions'); if (R() * 100 < (ur ? 6 : 3)) gain(A, 'tickets', 1, 'expeditions'); A.stats.exped++;
}
function houses(A) {
  const H = [['h1', 1, 'coins', 5e4], ['h2', 2, 'coins', 15e4], ['h3', 3, 'pearls', 100], ['h4', 4, 'pearls', 200], ['h5', 5, 'pearls', 300]];
  for (const [id, , cur, cost] of H) { if (A.houses.includes(id)) continue; if (cur === 'pearls' && !A.P.whale) continue;
    if (cur === 'coins' && A.w.coins < cost + 6e4) continue; if (spend(A, cur, cost, 'houses')) { A.houses.push(id); log(A, `bought a house (${id})`); } }
  const rooms = H.filter(h => A.houses.includes(h[0])).reduce((t, h) => t + h[1], 0);
  focusList(A).filter(c => c.kind !== 'mc').slice(0, rooms).forEach(c => { c.bond = Math.min(5e4, c.bond + 1000); });
  const L = lead(A); if (L && L.kind !== 'mc') L.bond = Math.min(5e4, L.bond + 600);   // wallpaper taps: 3 × 200 a day for the wallpaper character
}

/* ---------- spending pearls / gold / fragments ---------- */
function pearlBuild(A) {
  const P = A.P, F = focusList(A).filter(c => c.kind !== 'mc');
  const nBuild = P.whale ? F.length : P.key === 'small' ? 2 : 1;
  for (const c of F.slice(0, nBuild)) {
    while (c.bt < stars(c) && A.w.pearls >= 10 + 30) { spend(A, 'pearls', 10, 'Breakthrough'); c.bt++; }
    while (c.pot < (stars(c) + 1) * 6 && A.w.pearls >= (c.pot % 6 === 5 ? 5 : 1) + 30) { spend(A, 'pearls', c.pot % 6 === 5 ? 5 : 1, 'Potential'); c.pot++; }
  }
  if (P.whale) { for (const c of F) { if (bondLv(c.bond) >= 10 && !c.married && (A.w.rings > 0 || A.w.pearls >= 99)) { if (A.w.rings > 0) A.w.rings--; else spend(A, 'pearls', 99, 'rings'); c.married = true; log(A, `married ${c.name}`); } }
    for (let k = A.incB || 0; k < 2; k++) if (spend(A, 'pearls', [15, 30][k], 'incubators')) A.incB = k + 1; }
}
function goldBuild(A) {
  refreshCS(A);
  for (const c of focusList(A)) { if (!c.sss && c.r === 5 && c.kind !== 'mc' && c.csv >= 3e4 && c.bt > 0 && A.w.pearls >= 100 && A.w.coins >= 1e5) { spend(A, 'pearls', 100, 'SSS awakening'); spend(A, 'coins', 1e5, 'SSS awakening'); c.sss = true; log(A, `SSS-awakened ${c.name}`); } }
  const pendingBase = FARM_ORDER.some(id => A.farm[id].lv < 7);
  const reserve = pendingBase ? 3e5 : 0;
  // gear levels on the first characters' worn pieces, then pet grades, then gifts for the leader's bond
  const F = focusList(A).slice(0, A.P.whale ? 6 : 3);
  let guard = 0;
  for (const c of F) { const caps = wornCaps(c); const r5 = c.wear && c.wear.kind === 'ur';
    for (let k = 0; k < 6; k++) { const rar = c.wear ? (c.wear.kind === 'ur' ? 5 : c.wear.kind === 'ssr' ? 4 : c.wear.kind === 'r' ? 3 : (c.wear.loose[k] ? (c.wear.loose[k].ssr ? 4 : c.wear.loose[k].r ? 3 : 5) : 0)) : 0; if (!rar) continue;
      while (c.glv[k] < caps[k] && guard++ < 5000) { const lv = c.glv[k];
        if (GEAR_BT[lv] && lv > 0 && !c['bt' + k + ':' + lv]) { if (!spend(A, 'thread', GEAR_BT[lv], 'gear breakthroughs')) break; c['bt' + k + ':' + lv] = 1; }
        const cost = GEAR_TRY[rar] * (lv + 1); if (A.w.coins - cost < reserve) break; spend(A, 'coins', cost, 'gear upgrades'); A.stats.gearTries = (A.stats.gearTries || 0) + 1; if (R() < gearChance(lv)) c.glv[k]++; } } }
  for (const c of F) { const p = c.pet; if (!p) continue; while (p.ref.gr < 8) { const cost = PG_GOLD[p.r][p.ref.gr]; if (A.w.coins - cost < reserve) break; spend(A, 'coins', cost, 'pet grades'); if (R() < PG_CHANCE[p.r][p.ref.gr]) p.ref.gr++; } p.gr = p.ref.gr; }
  const L = lead(A); if (L && L.kind !== 'mc') while (L.bond < 5e4 && A.w.coins - 1e4 >= reserve + 2e5) { spend(A, 'coins', 1e4, 'bond gifts'); L.bond = Math.min(5e4, L.bond + 400); A.stats.gifts++; }
  while (A.w.gplush > 0 && L && L.kind !== 'mc' && L.bond < 5e4) { A.w.gplush--; L.bond += 400; A.stats.gifts++; }
}
function exchanges(A) {
  // UR selector / fragments / Corals / Seaweeds
  while (A.w.ursel > 0) { const t = starTarget(A) || randStdUR(A); A.w.ursel--; grantChar(A, t, 'sel'); A.urCharGot++; log(A, `used a UR selector on ${t.name}`); }
  while (A.w.cfur >= 120 && starTarget(A)) { A.w.cfur -= 120; const t = starTarget(A); grantChar(A, t, 'frag'); A.urCharGot++; }
  while (A.w.cfur >= 60 && !starTarget(A)) { A.w.cfur -= 60; grantChar(A, randStdUR(A), 'frag'); A.urCharGot++; }
  while (A.w.cfssr >= 60) { A.w.cfssr -= 60; grantChar(A, randSSR(A), 'frag'); }
  const t = starTarget(A); if (t && !A.prem.has(t.idx) && A.w.starlight >= 720) { A.w.starlight -= 720; A.prem.add(t.idx); grantChar(A, t, 'frag'); log(A, `Premium exchange: +1 copy of ${t.name} (720 Corals)`); }
  for (let i = 0; i < N_URMEM && A.w.starlight >= 300 + 100; i++) { const c = A.chars[i]; if (c.own && !A.memEx.has(i) && !A.mems.ur[i].length) { A.w.starlight -= 300; A.memEx.add(i); grantMem(A, 5, i); } }
  while (A.w.starlight >= 400 + 10) { A.w.starlight -= 10; gain(A, 'tickets', 1, 'Coral exchange'); }
  if (!A.monthly) { A.monthly = 0; } while (A.monthly < 10 && A.w.dust >= 75) { A.w.dust -= 75; A.monthly++; gain(A, A.monthly <= 5 ? 'tickets' : 'wishes', 1, 'Seaweed monthly pulls'); }
  // Seaweeds monthly materials (07-shop.js SW_MATS: [wallet key, amount, Seaweeds, buys a month]); keep 75 Seaweeds back for nothing, buy the best value first
  if (!A.swm) A.swm = {}; for (const [k, n, c, lim] of [['cfur', 2, 120, 5], ['fragur', 1, 80, 5], ['bottles', 1, 60, 1], ['ictk', 2, 40, 15], ['cfssr', 5, 50, 6], ['fragssr', 2, 40, 5], ['thread', 20, 30, 10], ['coins', 10000, 25, 10]])
    while ((A.swm[k] || 0) < lim && A.w.dust >= c) { A.w.dust -= c; A.swm[k] = (A.swm[k] || 0) + 1; gain(A, k, n, 'Seaweed materials'); }
  // skin tickets (only from Pearl Honor's paid track now) → outfits of owned characters (UR outfits 120 tickets, SSR 60)
  for (const c of focusList(A)) { if (c.r !== 5 || c.kind === 'mc' || c.idx >= 6) continue;
    for (const [type, tk] of [['ur', 120], ['ssr', 60]]) { if (!A.skins[type][c.idx] && A.w.sktk >= tk) { A.w.sktk -= tk; A.skins[type][c.idx] = true; log(A, `got ${c.name}'s ${type.toUpperCase()} outfit with skin tickets (Pearl Honor)`); } } }
  // summon points: 200 = one copy of the featured UR (Aria) while not maxed
  while (A.points.feat >= PT_PRICE && stars(A.chars[LIMITED]) < 6) { A.points.feat -= PT_PRICE; grantChar(A, A.chars[LIMITED], 'frag'); A.urCharGot++; log(A, 'Summon points: +1 Aria'); }
  while (A.w.memtk > 0) { A.w.memtk--; grantMem(A, 5, Math.floor(R() * N_URMEM)); }
}
function shops(A) {
  const roll = (pool, n) => { const p = [...pool], out = []; while (out.length < n && p.length) { const tot = p.reduce((t, x) => t + x[4], 0); let x = R() * tot, i = 0; for (; i < p.length - 1; i++) { if (x < p[i][4]) break; x -= p[i][4]; } out.push(p.splice(i, 1)[0]); } return out; };
  for (const [cur, pool, n] of [['atok', AR_SHOP, 8], ['gpts', G_SHOP, 6]]) {
    const today = roll(pool, n).sort((a, b) => SHOP_PRIO.indexOf(a[0]) - SHOP_PRIO.indexOf(b[0]));
    for (const it of today) { if (it[0] === 'memtk' && A.w[cur] < it[2] + 50) continue; for (let l = 0; l < it[3]; l++) { if (A.w[cur] < it[2]) break; if (['coins', 'thread', 'nametk', 'gbracelet'].includes(it[0]) && A.w[cur] < 3 * it[2]) break;
      A.w[cur] -= it[2]; if (it[0] === 'exp') {} else if (it[0] === 'nametk' || it[0] === 'gbracelet') {} else gain(A, it[0], it[1], cur === 'atok' ? 'Arena shop' : 'Guild shop'); } } }
}

/* ---------- pulls ---------- */
function pulls(A) {
  // the 5 free daily pulls
  for (const bk of ['limited', 'weekly', 'skins', 'memories', 'standard']) rollOne(A, bk);
  const g = A.g, PS = A.pullSrc = A.pullSrc || { free: 0, pearls: 0, tickets: 0, wishes: 0 }; if (!A.freeDay || A.freeDay !== A.day) { A.freeDay = A.day; PS.free += 5; }
  // Beginner Banner: Standard tickets (8 / ×10) first, else 24 pearls
  while (g.beginner.n < 50) { if (A.w.wishes >= 8) { A.w.wishes -= 8; PS.wishes += 10; } else if (spend(A, 'pearls', 24, 'Beginner Banner')) PS.pearls += 10; else break; pull10(A, 'beginner'); }
  // Step-Up: the best pearl value (rate-up UR guaranteed at step 7)
  while (g.stepup.step < 7 && A.w.pearls >= STEP_COST[g.stepup.step] + reservePearls(A)) { const s = g.stepup.step; spend(A, 'pearls', STEP_COST[s], 'Step-Up'); PS.pearls += 10;
    const before = A.chars[STEP_FEAT].copies, out = pull10(A, 'stepup', { urX: STEP_UR_X[s] });
    if (s === 3 && !(out || []).some(r => r.ur === 'mem')) { grantMem(A, 5, Math.floor(R() * N_URMEM)); A.urGot++; }
    if (s === 6 && A.chars[STEP_FEAT].copies === before) { grantChar(A, A.chars[STEP_FEAT], 'Step-Up step 7'); A.urGot++; A.urCharGot++; }
    gain(A, 'coins', STEP_GOLD[s], 'Step-Up'); g.stepup.step++; if (g.stepup.step === 7) log(A, 'finished all 7 Step-Up steps'); }
  // Limited tickets: the Limited Banner until Aria is 6★, then the Weekly Spotlight
  while (A.w.tickets >= 10) { A.w.tickets -= 10; PS.tickets += 10; pull10(A, stars(A.chars[LIMITED]) < 6 ? 'limited' : 'weekly'); }
  // Standard tickets: Permanent Banner (milestones)
  if (g.beginner.n >= 50) while (A.w.wishes >= 10) { A.w.wishes -= 10; PS.wishes += 10; pull10(A, 'standard'); }
  // pearls: Limited ×10 for 30
  while (A.w.pearls >= 30 + reservePearls(A)) { spend(A, 'pearls', 30, 'Limited Banner pulls'); PS.pearls += 10; pull10(A, stars(A.chars[LIMITED]) < 6 ? 'limited' : 'weekly'); }
}
const reservePearls = A => {  // pearls kept back for the build: Breakthrough / Potential of the first character(s), memberships
  const P = A.P; let r = 0; if (P.memberPearls) { const m = memberOn(A); if (!m.p1) r += 30; }
  const L = focusList(A).filter(c => c.kind !== 'mc')[0]; if (L) r += Math.max(0, stars(L) - L.bt) * 10 + Math.max(0, (stars(L) + 1) * 6 - L.pot) * 2;
  const idle = FARM_ORDER.filter(id => A.farm[id].upEnd == null && A.farm[id].lv < 7).length; r += idle * 5 + (P.whale ? idle * 60 : 0);
  return r;
};

/* ---------- achievements (a model of the 100 in 07-shop.js; 1 pearl each, 50 for the long ones) ---------- */
function achievements(A) {
  const own = A.chars.filter(c => c.own && c.kind !== 'mc'), urs = own.filter(c => c.r === 5), totalCS = A.chars.reduce((t, c) => t + (c.cst || 0), 0);
  const memUR = A.mems.ur.filter(L => L.length).length, memAll = memUR + A.mems.ssr.filter(L => L.length).length, skins = A.skins.ur.filter(Boolean).length + A.skins.ssr.filter(Boolean).length + A.chars.filter(c => c.married).length;
  const petsK = A.pets.length, petCopies = A.pets.reduce((t, p) => t + p.copies.length, 0), cloth = A.gear.ur.flat().reduce((t, s) => t + s[1] + s[2] + s[3], 0) + A.gear.ssr.reduce((a, b) => a + b, 0) + A.gear.r.reduce((a, b) => a + b, 0);
  const campStars = A.camp.stars.reduce((t, s) => t + s[0] + s[1] + s[2], 0), treeTop = A.camp.treeClear.filter(Boolean).length, farmLv = FARM_ORDER.map(id => A.farm[id].lv);
  const T = { pull1: A.pulls >= 1, pull50: A.pulls >= 50, pull100: A.pulls >= 100, pull250: A.pulls >= 250, pull500: A.pulls >= 500, pull1000: A.pulls >= 1000, pull5000: A.pulls >= 5000, maxwin: A.maxwin > 0,
    pullbegin: A.g.beginner.n >= 50, pullstep: A.g.stepup.step >= 7, login7: A.day >= 7, login14: A.day >= 14, login30: A.day >= 30,
    char1: own.length >= 1, char3: own.length >= 3, char5: own.length >= 5, char10: own.length >= 10, char20: own.length >= 20, ur: urs.length >= 1, ur3: urs.length >= 3, ur5: urs.length >= 5, ur10: urs.length >= 10,
    star6: own.some(c => stars(c) >= 6), sss: A.chars.some(c => c.csv >= 3e4), urplus: A.chars.some(c => (c.r === 5 && c.cst >= 4e4) || (c.r === 4 && c.cst >= 25e3)), cs100k: totalCS >= 1e5, cs500k: totalCS >= 5e5,
    bond5: own.some(c => bondLv(c.bond) >= 5), bond10: own.some(c => bondLv(c.bond) >= 10), bond5x5: own.filter(c => bondLv(c.bond) >= 5).length >= 5, wed: A.chars.some(c => c.married), wed3: A.chars.filter(c => c.married).length >= 3,
    gift50: A.stats.gifts >= 50, gift500: A.stats.gifts >= 500, skin: skins >= 1, skin5: skins >= 5, skin10: skins >= 10, pet: petsK >= 1, pet3: petsK >= 3, pet6: petsK >= 6, petcopy10: (A.stats.hatched || 0) >= 10,
    petstar6: A.pets.some(p => p.copies.some(c => c.st >= 6)), petsss: A.pets.some(p => p.copies.some(c => c.gr >= 8)), mem5: memAll >= 5, memur: memUR >= 1, memur3: memUR >= 3, mem3: A.mems.ur.concat(A.mems.ssr).some(L => L.some(s => s >= 3)),
    cloth50: cloth >= 50, cloth200: cloth >= 200, cloth3: A.gear.ur.flat().some(s => s[3] > 0), fullset: A.chars.some(c => c.wear && c.wear.kind !== 'loose'),
    lv10: A.lv >= 10, lv20: A.lv >= 20, lv30: A.lv >= 30, lv60: A.lv >= 60, vip1: vipLv(A) >= 1, vip5: vipLv(A) >= 5, raid10: A.raidClears >= 10, raid100: A.raidClears >= 100, raid1000: A.raidClears >= 1000,
    stam5k: A.stamSpent >= 5000, stam25k: A.stamSpent >= 25000, gold1m: A.goldSpent >= 1e6, gold10m: A.goldSpent >= 1e7, wish30: A.stats.wishes >= 30, exp10: A.stats.exped >= 10, exp50: A.stats.exped >= 50,
    ccwin1: A.qm.w >= 1, ccwin25: A.qm.w >= 25, ccwin100: A.qm.w >= 100, cccamp0: A.camp.clear[4], ccstar50: campStars >= 50, cctree5: treeTop >= 5, cctree10: treeTop >= 10,
    farm4: farmLv.every(l => l >= 1), farm7: farmLv.some(l => l >= 7), farm7all: farmLv.every(l => l >= 7), farm100: A.stats.baseCol >= 100, house1: A.houses.length >= 1, house5: A.houses.length >= 5,
    guild: true, friend5: A.day >= 3, guildhang: A.day >= 4, bp30: A.honor.lv >= 30, bp80: A.honor.lv >= 80, spin: true };
  for (const [id, ok] of Object.entries(T)) if (ok && !A.ach.has(id)) { A.ach.add(id); gain(A, 'pearls', 1, 'achievements'); A.xp += EXPV.ach; }
}

/* ---------- one day ---------- */
function day(A) {
  A.day++; const d = A.day, dow = (d - 1) % 7; A.week = Math.floor((d - 1) / 7);
  if (dow === 0) { A.honor.wk = 0; if (d > 1) { const rk = arRank(A.arena.vp); gain(A, 'pearls', AR_WEEK[rk][0], 'arena weekly rewards'); gain(A, 'atok', AR_WEEK[rk][1], 'arena'); } }
  spendings(A);
  dailyFree(A);
  if (A.P.memberPearls && !A.P.whale && A.P.key !== 'small') { if (!memberOn(A).p1 && A.w.pearls >= 30) buyMember(A, 'p1'); }   // free players: only the Lantern can be bought with pearls
  if (A.P.whale && d === 1) { while (A.honor.lv < 80 && spend(A, 'pearls', 3, 'Pearl Honor levels')) { A.honor.xp = Math.max(A.honor.xp, A.honor.lv * 480); honorLevels(A); } }
  if (A.P.whale && d === 2 && !A.mbox && spend(A, 'pearls', 200, 'Mystery Fountain')) { A.mbox = true; if (!A.skins.ur[MBOX_SKIN]) A.skins.ur[MBOX_SKIN] = true; else gain(A, 'starlight', 40); give(A, { wishes: 10, tickets: 5, pearls: 30, bottles: 2, coins: 2e4, gplush: 1, thread: 60 }, 'Mystery Fountain'); log(A, 'emptied the Mystery Fountain (200 pearls)'); }
  if (A.P.key === 'small') { for (const c of focusList(A).filter(c => c.r === 5 && c.kind !== 'mc' && c.idx < 6).slice(0, 2)) if ((A.boughtSkins || 0) < 2 && d >= 3 && buyOutfit(A, 'ur', c.idx)) A.boughtSkins = (A.boughtSkins || 0) + 1; }
  if (A.P.whale) for (const c of focusList(A)) if (c.r === 5 && c.kind !== 'mc' && c.idx < 6) { buyOutfit(A, 'ur', c.idx); buyOutfit(A, 'ssr', c.idx); }
  // stamina for the day
  A.stam = Math.min(999, A.stam + stamDay(A));
  const refills = [1, 1, 2, 2, 3, 3].slice(0, A.P.refills); for (const c of refills) if (A.stam < 300 && spend(A, 'pearls', c, 'stamina refills')) A.stam += 60;
  farmDay(A); jobs(A);
  // pulls first (they feed the roster for jobs and battles)
  hatchEggs(A); exchanges(A); pulls(A); exchanges(A); hatchEggs(A); refreshCS(A); assignGear(A); equipPetsMems(A); refreshCS(A);
  while (A.w.bottles > 0 && A.stam <= 999 - 60) { A.w.bottles--; A.stam += 60; }
  // ---- battles: about 20 a day (the same time budget for every account) ----
  let B = 20;
  if (d % 2 === 1) { guildBoss(A); guildBoss(A); B -= 2; }
  if (d === 1 || d % 2 === 0) {} // boss fights every 48 h
  for (let i = 0; i < 5; i++) arenaBattle(A); B -= 5; arenaDefense(A);
  // campaign / Great Tree progress: up to 8 tries on the next stage / floor with the best chance
  for (let t = 0; t < 8 && B > 0; t++) {
    const ci = A.camp.clear.findIndex(x => !x), ti = A.camp.treeClear.findIndex(x => !x);
    const cOk = ci >= 0 && campOpen(A, ci), tOk = ti >= 0 && treeOpen(A, ti); if (!cOk && !tOk) break;
    const useTree = tOk && (!cOk || TREE[ti].p > CAMP[ci].p); B--;
    if (useTree) { if (playStage(A, TREE[ti], A.camp.tree[ti], true)) A.camp.treeClear[ti] = true; }
    else if (playStage(A, CAMP[ci], A.camp.stars[ci], false)) { A.camp.clear[ci] = true; if (CAMP[ci].last && CAMP[ci].ch >= 0) log(A, `cleared campaign chapter ${CAMP[ci].ch}`); }
  }
  campMiles(A);
  // raid stars: up to 3 battles on open stages without 3★ (stars unlock auto play and instant clears)
  for (let t = 0; t < 3 && B > 0; t++) { let best = null; for (let raid = 0; raid < 4; raid++) { const top = raid === 3 ? topGoldStage(A) : topGearStage(A); for (let si = top; si >= 0; si--) { const s = A.raid.stars[raid][si]; if (s[0] + s[1] + s[2] < 3) { if (!best || si > best[1]) best = [raid, si]; break; } } }
    if (!best) break; B--; raidBattle(A, best[0], best[1]); }
  // star farming on cleared stages when the frontier is stuck
  for (let t = 0; t < 3 && B > 4; t++) { const i = CAMP.findIndex((s, k) => A.camp.clear[k] && A.camp.stars[k].includes(0)); if (i < 0) break; B--; playStage(A, CAMP[i], A.camp.stars[i], false); }
  campMiles(A);
  // the rest: Quick matches on Normal (5 stamina, 1 pearl + gear on a win), keeping stamina for the 10 instant clears
  const gs = topGoldStage(A), vault3 = A.raid.stars[3].map(s => s[0] + s[1] + s[2] === 3), vs = vault3.lastIndexOf(true);
  const instCost = vs >= 0 ? GOLD_STAGES[vs].st : 10, keep = 10 * instCost;
  while (B > 0 && A.stam - 5 >= keep) { if (!qmBattle(A)) break; B--; }
  // instant clears: 10 free a day (+ instant clear tickets), on the best 3★ stage: the vault while the Base is being built, else gear
  const baseLeft = FARM_ORDER.some(id => A.farm[id].lv < 7);
  if (A.P.whale) { const extra = Math.floor(Math.max(0, A.stam - keep) / instCost); const buy = Math.min(extra, 40); for (let i = 0; i < buy; i++) if (spend(A, 'pearls', 2, 'instant clear tickets')) A.w.ictk++; }
  let ic = 10 + A.w.ictk; const gear3 = [0, 1, 2].map(r => A.raid.stars[r].map(s => s[0] + s[1] + s[2] === 3).lastIndexOf(true));
  const ms = mainSet(A);
  while (ic > 0) { let done = false;
    if (vs >= 0 && (baseLeft || gear3[ms] < 0) && useStam(A, GOLD_STAGES[vs].st)) { raidClear(A, 3, vs, 1); done = true; }
    else if (gear3[ms] >= 0 && useStam(A, 10)) { raidClear(A, ms, gear3[ms], 1); done = true; }
    else { const r = gear3.findIndex(x => x >= 0); if (r >= 0 && useStam(A, 10)) { raidClear(A, r, gear3[r], 1); done = true; } }
    if (!done) break; ic--; if (ic < A.w.ictk) A.w.ictk--; }
  // building
  dailyQuests(A); levelUps(A); vipRewards(A); shops(A); exchanges(A); hatchEggs(A);
  gearHousekeeping(A); refreshCS(A); assignGear(A); equipPetsMems(A);
  pearlBuild(A); houses(A); farmUpgrades(A); refreshCS(A); goldBuild(A); farmUpgrades(A);
  pulls(A); refreshCS(A); assignGear(A); equipPetsMems(A); refreshCS(A); achievements(A); levelUps(A);
  snapshot(A);
}
function snapshot(A) {
  const own = A.chars.filter(c => c.own && c.kind !== 'mc'), urs = own.filter(c => c.r === 5);
  const top = focusList(A)[0];
  if (!A.d6 && urs.some(c => stars(c) >= 6)) A.d6 = A.day; if (!A.dSSS && A.chars.some(c => c.csv >= 3e4)) A.dSSS = A.day; if (!A.dCamp && A.camp.clear.every(Boolean)) A.dCamp = A.day; if (!A.dTree && A.camp.treeClear.every(Boolean)) A.dTree = A.day;
  A.timeline.push({ d: A.day, usd: +A.usd.toFixed(2), pulls: A.pulls, urChars: urs.length, urCopies: A.urCharGot, six: urs.filter(c => stars(c) >= 6).length, lv: A.lv, vip: vipLv(A), honor: A.honor.lv,
    topCS: top ? top.cst : 0, totalCS: A.chars.reduce((t, c) => t + (c.cst || 0), 0), camp: A.camp.clear.filter(Boolean).length, tree: A.camp.treeClear.filter(Boolean).length, br: brOf(A), arena: A.arena.vp,
    pearlsIn: Object.values(A.src.pearls || {}).reduce((a, b) => a + b, 0), gold: A.w.coins, stam: A.stam });
}

/* ---------- run ---------- */
function runOne(P, seed) { R = rngOf(seed); const A = newAccount(P); for (let i = 0; i < DAYS; i++) day(A); refreshCS(A); return A; }
const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + .5))]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

function summarize(P) {
  const runs = []; for (let s = 1; s <= SEEDS; s++) runs.push(runOne(P, s * 7919 + P.key.length));
  const pick = f => runs.map(f), st = f => { const a = pick(f); return { mean: +mean(a).toFixed(2), p10: q(a, .1), med: q(a, .5), p90: q(a, .9) }; };
  const urCharsOwned = A => A.chars.filter(c => c.own && c.r === 5 && c.kind !== 'mc').length;
  const out = {
    label: P.label, key: P.key, seeds: SEEDS,
    usd: st(A => A.usd), pearlsIn: st(A => Object.values(A.src.pearls || {}).reduce((a, b) => a + b, 0)), pulls: st(A => A.pulls), urCopies: st(A => A.urCharGot), urChars: st(urCharsOwned), urAll: st(A => A.urGot),
    ssrChars: st(A => A.chars.filter(c => c.own && c.r === 4).length), six: st(A => A.chars.filter(c => c.own && c.r === 5 && c.kind !== 'mc' && stars(c) >= 6).length),
    sixAny: pick(A => A.chars.some(c => c.own && c.r === 5 && c.kind !== 'mc' && stars(c) >= 6)).filter(Boolean).length / SEEDS,
    ariaStars: st(A => stars(A.chars[LIMITED])), ariaOwned: pick(A => A.chars[LIMITED].own).filter(Boolean).length / SEEDS,
    topCS: st(A => focusList(A)[0].cst), top2CS: st(A => (focusList(A)[1] || {}).cst || 0), top3CS: st(A => (focusList(A)[2] || {}).cst || 0),
    totalCS: st(A => A.chars.reduce((t, c) => t + (c.cst || 0), 0)),
    sssChars: st(A => A.chars.filter(c => c.own && c.csv >= 3e4).length), ssPlus: st(A => A.chars.filter(c => c.own && c.csv >= 2e4).length), sPlus: st(A => A.chars.filter(c => c.own && c.csv >= 15e3).length), urPlus: st(A => A.chars.filter(c => c.own && c.r === 5 && c.cst >= 4e4).length),
    lv: st(A => A.lv), vip: st(A => vipLv(A)), honor: st(A => A.honor.lv), br: st(A => brOf(A)), camp: st(A => A.camp.clear.filter(Boolean).length), campStars: st(A => A.camp.stars.reduce((t, s) => t + s[0] + s[1] + s[2], 0)),
    tree: st(A => A.camp.treeClear.filter(Boolean).length), arenaVP: st(A => A.arena.vp), arenaRank: pick(A => AR_RANKS[arRank(A.arena.vp)][0]),
    farm: Object.fromEntries(FARM_ORDER.map(id => [id, st(A => A.farm[id].lv)])), houses: st(A => A.houses.length), ach: st(A => A.ach.size), skins: st(A => A.skins.ur.filter(Boolean).length + A.skins.ssr.filter(Boolean).length),
    pets: st(A => A.pets.reduce((t, p) => t + p.copies.length, 0)), urMems: st(A => A.mems.ur.filter(L => L.length).length), gearUR: st(A => A.gear.ur.flat().reduce((t, s) => t + s[1] + s[2] + s[3], 0)),
    fullURset: pick(A => focusList(A)[0].wear && focusList(A)[0].wear.kind === 'ur').filter(Boolean).length / SEEDS, maxwin: pick(A => A.maxwin > 0).filter(Boolean).length / SEEDS,
    urRaw: st(A => A.stats.urRaw || 0), pullSrc: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.pullSrc || {})) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)])); })(),
    stamLeft: st(A => A.stam), d6: st(A => A.d6 || 31), dSSS: st(A => A.dSSS || 31), dCamp: st(A => A.dCamp || 31), dTree: st(A => A.dTree || 31), goldSpent: st(A => A.goldSpent), raidClears: st(A => A.raidClears), qmWins: st(A => A.qm.w),
    gradeTop: (() => { const c = {}; runs.forEach(A => { const g = gradeOf(focusList(A)[0].csv); c[g] = (c[g] || 0) + 1; }); return c; })(),
    pearlSrc: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.src.pearls || {})) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1])); })(),
    pearlSink: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.sink.pearls || {})) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1])); })(),
    goldSrc: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.src.coins || {})) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1])); })(),
    goldSink: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.sink.coins || {})) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1])); })(),
    pullsBy: (() => { const o = {}; runs.forEach(A => { for (const [k, v] of Object.entries(A.pullsBy)) o[k] = (o[k] || 0) + v / SEEDS; }); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)])); })(),
    timeline: Array.from({ length: DAYS }, (_, i) => { const keys = Object.keys(runs[0].timeline[0]); return Object.fromEntries(keys.map(k => [k, +q(runs.map(A => A.timeline[i][k]), .5)])); }),
    timelineBand: Array.from({ length: DAYS }, (_, i) => ({ d: i + 1, topLo: q(runs.map(A => A.timeline[i].topCS), .1), topHi: q(runs.map(A => A.timeline[i].topCS), .9), pullsLo: q(runs.map(A => A.timeline[i].pulls), .1), pullsHi: q(runs.map(A => A.timeline[i].pulls), .9) }))
  };
  // the median run (by top CS) as the story
  const order = runs.map((A, i) => [focusList(A)[0].cst + A.pulls, i]).sort((a, b) => a[0] - b[0]), M = runs[order[Math.floor(order.length / 2)][1]];
  out.story = { seed: order[Math.floor(order.length / 2)][1], events: M.events, buys: M.buys,
    roster: focusList(M).map(c => ({ name: c.name, r: c.r, kind: c.kind, stars: stars(c), bt: Math.min(c.bt, stars(c)), pot: c.pot, bond: bondLv(c.bond), married: c.married, cs: c.cst, grade: gradeOf(c.csv), sss: c.sssOn || 0,
      gear: c.wear ? (c.wear.kind === 'ur' ? `UR set ${['Starlit Regalia', 'Abyssal Tide', 'Moonlit Bloom'][c.wear.s]} (${c.wear.slots.join('')}★)` : c.wear.kind === 'ssr' ? 'SSR set Ember Guard' : c.wear.kind === 'r' ? 'R set Wanderer\'s' : 'loose pieces') : '-',
      glv: c.glv.reduce((a, b) => a + b, 0), pet: c.pet ? `${c.pet.r === 5 ? 'UR' : 'SSR'} ${c.pet.st}★ ${['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'][c.pet.gr]}` : '-', mem: c.mem ? `${c.mem.r === 5 ? 'UR' : 'SSR'} ${c.mem.st}★${c.mem.r === 5 && c.mem.i === c.idx && c.r === 5 && c.kind !== 'mc' ? ' (signature)' : ''}` : '-',
      skins: c.r === 5 && c.kind !== 'mc' && c.idx < 6 ? (A_sk => [A_sk.ur[c.idx] ? 'UR' : '', A_sk.ssr[c.idx] ? 'SSR' : ''].filter(Boolean).join(' + ') || '-')(M.skins) : '-' })),
    final: M.timeline[DAYS - 1], wallet: { ...M.w }, farm: Object.fromEntries(FARM_ORDER.map(id => [id, M.farm[id].lv])), arena: AR_RANKS[arRank(M.arena.vp)][0] + ' · ' + M.arena.vp + ' VP', campClear: M.camp.clear.filter(Boolean).length, tree: M.camp.treeClear.filter(Boolean).length };
  return out;
}

const res = {}; for (const P of Object.values(PROFILES)) res[P.key] = summarize(P);
require('fs').writeFileSync(__dirname + '/results.json', JSON.stringify(res, null, 1));
for (const r of Object.values(res)) {
  console.log(`\n=== ${r.label} ===  $${r.usd.mean}  pearls in ${r.pearlsIn.med}  pulls ${r.pulls.med} (p10 ${r.pulls.p10}, p90 ${r.pulls.p90})`);
  console.log(`UR copies ${r.urCopies.med}, UR chars owned ${r.urChars.med}, 6★ URs ${r.six.med} (any 6★ ${Math.round(r.sixAny * 100)}%), Aria stars ${r.ariaStars.med} (owned ${Math.round(r.ariaOwned * 100)}%)`);
  console.log(`top CS ${r.topCS.med} (p10 ${r.topCS.p10} p90 ${r.topCS.p90}), 2nd ${r.top2CS.med}, 3rd ${r.top3CS.med}; grades top`, r.gradeTop, `SSS chars ${r.sssChars.med} SS+ ${r.ssPlus.med} S+ ${r.sPlus.med} UR+ ${r.urPlus.med}`);
  console.log(`lv ${r.lv.med} vip ${r.vip.med} honor ${r.honor.med} BR ${r.br.med} camp ${r.camp.med}/${CAMP.length} stars ${r.campStars.med} tree ${r.tree.med}/${TREE.length} arena ${r.arenaVP.med} farm`, Object.fromEntries(Object.entries(r.farm).map(([k, v]) => [k, v.med])), `ach ${r.ach.med} skins ${r.skins.med} pets ${r.pets.med} urMems ${r.urMems.med} gearUR ${r.gearUR.med} fullURset ${r.fullURset}`);
  console.log('pearl src', r.pearlSrc); console.log('pearl sink', r.pearlSink); console.log('gold src', r.goldSrc); console.log('gold sink', r.goldSink); console.log('pullsBy', r.pullsBy, 'stamLeft', r.stamLeft.med);
}
