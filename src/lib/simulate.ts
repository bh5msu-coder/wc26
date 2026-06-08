import type { Weights } from "./types";

/**
 * Monte Carlo tournament predictor.
 *
 * Projects the live knockout bracket forward thousands of times and, for each
 * simulated run, scores every owned nation with the pool's weights — exactly
 * the same scoring model used on the live leaderboard. Aggregating over all runs
 * gives each manager a win probability, an expected final score and a likely
 * range, plus each nation's odds to reach the final / lift the cup.
 *
 * The match model: two independent Poisson goal counts whose rates depend on the
 * strength gap, with penalties (strength-weighted coin flip) breaking ties so a
 * knockout always produces a winner.
 */

export type SimNation = {
  code: string;
  strength: number;
  ownerId: string | null; // membershipId of the manager who drafted it, if any
};

export type BracketMatch = { id: string; home: string; away: string };
export type SemiRef = { id: string; fromHome: number; fromAway: number };
export type FinalRef = { id: string; fromHome: number; fromAway: number };

export type Bracket = {
  quarterfinals: BracketMatch[];
  semifinals: SemiRef[];
  final: FinalRef;
};

export type SimManager = { membershipId: string; baseTotal: number };

export type SimInput = {
  nations: Record<string, SimNation>;
  bracket: Bracket;
  weights: Weights;
  managers: SimManager[];
  runs?: number;
  /** controls match randomness; lower = more upsets. default 40 */
  strengthScale?: number;
  seed?: number;
};

export type ManagerResult = {
  membershipId: string;
  winProb: number; // P(finish 1st in the pool)
  podiumProb: number; // P(finish top 3)
  expectedPoints: number; // mean final total
  expectedAdded: number; // mean points gained from here on
  p10: number;
  p90: number;
  best: number;
  worst: number;
};

export type NationResult = {
  code: string;
  sfProb: number;
  finalProb: number;
  champProb: number;
};

export type SimResult = {
  runs: number;
  managers: ManagerResult[];
  nations: NationResult[];
};

// ── tiny deterministic PRNG (mulberry32) for reproducible runs ──
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Knuth Poisson sampler
function poisson(lambda: number, rnd: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

type MatchOutcome = { winner: string; loser: string; gh: number; ga: number };

function simulateMatch(
  homeCode: string,
  awayCode: string,
  nations: Record<string, SimNation>,
  scale: number,
  rnd: () => number,
): MatchOutcome {
  const sh = nations[homeCode]?.strength ?? 50;
  const sa = nations[awayCode]?.strength ?? 50;
  const diff = sh - sa;
  const base = 1.35;
  const lambdaH = base * Math.exp(diff / scale / 2);
  const lambdaA = base * Math.exp(-diff / scale / 2);
  let gh = poisson(lambdaH, rnd);
  let ga = poisson(lambdaA, rnd);

  if (gh === ga) {
    // penalties — strength-weighted coin flip; scoreline stays level
    const pHome = sigmoid(diff / (scale * 0.7));
    if (rnd() < pHome) return { winner: homeCode, loser: awayCode, gh, ga };
    return { winner: awayCode, loser: homeCode, gh, ga };
  }
  return gh > ga
    ? { winner: homeCode, loser: awayCode, gh, ga }
    : { winner: awayCode, loser: homeCode, gh, ga };
}

export function simulate(input: SimInput): SimResult {
  const runs = input.runs ?? 10000;
  const scale = input.strengthScale ?? 40;
  const w = input.weights;
  const rnd = input.seed != null ? makeRng(input.seed) : Math.random;

  const managerIds = input.managers.map((m) => m.membershipId);
  const base: Record<string, number> = {};
  input.managers.forEach((m) => (base[m.membershipId] = m.baseTotal));

  // accumulators
  const added: Record<string, number> = {}; // sum of added points
  const wins: Record<string, number> = {};
  const podium: Record<string, number> = {};
  const finals: Record<string, number[]> = {}; // final totals per run, for percentiles
  managerIds.forEach((id) => {
    added[id] = 0;
    wins[id] = 0;
    podium[id] = 0;
    finals[id] = [];
  });

  const sfCount: Record<string, number> = {};
  const finalCount: Record<string, number> = {};
  const champCount: Record<string, number> = {};
  Object.keys(input.nations).forEach((c) => {
    sfCount[c] = 0;
    finalCount[c] = 0;
    champCount[c] = 0;
  });

  // points a nation earns for winning / losing one knockout match in a sim
  function scoreMatch(o: MatchOutcome, runAdd: Record<string, number>) {
    const add = (code: string, gf: number, conceded: number, won: boolean) => {
      const owner = input.nations[code]?.ownerId;
      if (!owner) return;
      let pts = 0;
      if (won) pts += w.win + w.ko; // match win + knockout bonus
      pts += w.goal * gf; // goals scored
      if (conceded === 0) pts += w.cs; // clean sheet (shutout)
      runAdd[owner] = (runAdd[owner] ?? 0) + pts;
    };
    const tie = o.gh === o.ga; // settled on penalties — scoreline stays level
    const wGoals = tie ? o.gh : Math.max(o.gh, o.ga);
    const lGoals = tie ? o.ga : Math.min(o.gh, o.ga);
    add(o.winner, wGoals, lGoals, true);
    add(o.loser, lGoals, wGoals, false);
  }

  for (let r = 0; r < runs; r++) {
    const runAdd: Record<string, number> = {};

    // Quarter-finals
    const qfWinners: string[] = [];
    for (const m of input.bracket.quarterfinals) {
      const o = simulateMatch(m.home, m.away, input.nations, scale, rnd);
      scoreMatch(o, runAdd);
      qfWinners.push(o.winner);
    }
    qfWinners.forEach((c) => (sfCount[c] += 1));

    // Semi-finals
    const sfWinners: string[] = [];
    for (const s of input.bracket.semifinals) {
      const home = qfWinners[s.fromHome];
      const away = qfWinners[s.fromAway];
      const o = simulateMatch(home, away, input.nations, scale, rnd);
      scoreMatch(o, runAdd);
      sfWinners.push(o.winner);
    }
    sfWinners.forEach((c) => (finalCount[c] += 1));

    // Final
    const f = input.bracket.final;
    const fo = simulateMatch(sfWinners[f.fromHome], sfWinners[f.fromAway], input.nations, scale, rnd);
    scoreMatch(fo, runAdd);
    // champion bonus
    const champOwner = input.nations[fo.winner]?.ownerId;
    if (champOwner) runAdd[champOwner] = (runAdd[champOwner] ?? 0) + w.champ;
    champCount[fo.winner] += 1;

    // tally final totals for this run
    let bestTotal = -Infinity;
    const totals = managerIds.map((id) => {
      const t = base[id] + (runAdd[id] ?? 0);
      added[id] += runAdd[id] ?? 0;
      finals[id].push(t);
      if (t > bestTotal) bestTotal = t;
      return { id, t };
    });
    // winners (ties split)
    const top = totals.filter((x) => x.t === bestTotal);
    top.forEach((x) => (wins[x.id] += 1 / top.length));
    // podium (top 3 by total)
    const ranked = [...totals].sort((a, b) => b.t - a.t);
    const cut = ranked[Math.min(2, ranked.length - 1)].t;
    ranked.filter((x) => x.t >= cut).forEach((x) => (podium[x.id] += 1));
  }

  const percentile = (arr: number[], p: number) => {
    const s = [...arr].sort((a, b) => a - b);
    const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
    return s[idx];
  };

  const managers: ManagerResult[] = input.managers.map((m) => {
    const arr = finals[m.membershipId];
    return {
      membershipId: m.membershipId,
      winProb: wins[m.membershipId] / runs,
      podiumProb: podium[m.membershipId] / runs,
      expectedPoints: base[m.membershipId] + added[m.membershipId] / runs,
      expectedAdded: added[m.membershipId] / runs,
      p10: percentile(arr, 10),
      p90: percentile(arr, 90),
      best: Math.max(...arr),
      worst: Math.min(...arr),
    };
  });

  const nations: NationResult[] = Object.keys(input.nations)
    .filter((c) => sfCount[c] > 0 || finalCount[c] > 0 || champCount[c] > 0)
    .map((c) => ({
      code: c,
      sfProb: sfCount[c] / runs,
      finalProb: finalCount[c] / runs,
      champProb: champCount[c] / runs,
    }));

  return { runs, managers, nations };
}
