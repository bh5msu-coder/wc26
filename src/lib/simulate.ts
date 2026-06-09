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
 *
 * The module is organised in three layers with a strict one-way dependency
 * (orchestration → domain → primitives), and every layer below `simulate` is a
 * pure, exported function. That means each behaviour — the RNG, the goal
 * sampler, a single match, the scoring rule, one full bracket — can be unit
 * tested in isolation without running ten thousand tournaments:
 *
 *   1. Math primitives — makeRng, poisson, sigmoid, percentileOfSorted
 *   2. Domain model    — simulateMatch, knockoutSidePoints, simulateBracket
 *   3. Orchestration   — simulate (folds many bracket runs into statistics)
 */

// ── public types ────────────────────────────────────────────────────────────
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

export type MatchOutcome = { winner: string; loser: string; gh: number; ga: number };

/** One simulated tournament: who advanced, and the points each owner accrued. */
export type BracketRun = {
  addedByOwner: Record<string, number>; // ownerId → points earned this run
  semifinalists: string[]; // nation codes that reached the semi-finals (QF winners)
  finalists: string[]; // nation codes that reached the final (SF winners)
  champion: string; // nation code that lifted the cup
};

// ── defaults & match-engine constants ───────────────────────────────────────
export const DEFAULTS = { runs: 10_000, strengthScale: 40 } as const;

/** Match-engine tunables, named so the model reads as documentation. */
const MATCH = {
  baseGoals: 1.35, // expected goals per side in an evenly-matched tie
  shootoutSharpness: 0.7, // penalty-flip steepness, relative to strengthScale
  fallbackStrength: 50, // assumed strength when a nation code is unknown
} as const;

/* ===========================================================================
 * Layer 1 — pure math primitives
 * ======================================================================== */

/** Deterministic mulberry32 PRNG → reproducible runs from a single seed. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth's algorithm for sampling a Poisson(lambda) goal count. */
export function poisson(lambda: number, rnd: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

/**
 * Nearest-rank percentile of an array that is ALREADY sorted ascending.
 * The caller sorts once and reuses the sorted array for several percentiles
 * (plus best/worst as the last/first element) — avoiding repeated sorts.
 */
export function percentileOfSorted(sortedAsc: number[], p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const idx = Math.min(n - 1, Math.max(0, Math.round((p / 100) * (n - 1))));
  return sortedAsc[idx];
}

/* ===========================================================================
 * Layer 2 — domain model
 * ======================================================================== */

/** Simulate one knockout match. Penalties (a strength-weighted flip) break ties. */
export function simulateMatch(
  homeCode: string,
  awayCode: string,
  nations: Record<string, SimNation>,
  scale: number,
  rnd: () => number,
): MatchOutcome {
  const sh = nations[homeCode]?.strength ?? MATCH.fallbackStrength;
  const sa = nations[awayCode]?.strength ?? MATCH.fallbackStrength;
  const diff = sh - sa;
  const lambdaH = MATCH.baseGoals * Math.exp(diff / scale / 2);
  const lambdaA = MATCH.baseGoals * Math.exp(-diff / scale / 2);
  const gh = poisson(lambdaH, rnd);
  const ga = poisson(lambdaA, rnd);

  if (gh === ga) {
    // shootout — strength-weighted coin flip; the scoreline stays level
    const pHome = sigmoid(diff / (scale * MATCH.shootoutSharpness));
    return rnd() < pHome
      ? { winner: homeCode, loser: awayCode, gh, ga }
      : { winner: awayCode, loser: homeCode, gh, ga };
  }
  return gh > ga
    ? { winner: homeCode, loser: awayCode, gh, ga }
    : { winner: awayCode, loser: homeCode, gh, ga };
}

/** Pure scoring rule: points one nation earns for a single knockout match. */
export function knockoutSidePoints(
  won: boolean,
  goalsFor: number,
  goalsConceded: number,
  w: Weights,
): number {
  let pts = 0;
  if (won) pts += w.win + w.ko; // match win + knockout bonus
  pts += w.goal * goalsFor; // goals scored
  if (goalsConceded === 0) pts += w.cs; // clean sheet (shutout)
  return pts;
}

/**
 * Play one full bracket (QF → SF → Final) and report who advanced plus the
 * points each owner accrued. Pure given `rnd`, so a seeded RNG makes a single
 * run fully assertable in a test.
 */
export function simulateBracket(
  bracket: Bracket,
  nations: Record<string, SimNation>,
  w: Weights,
  scale: number,
  rnd: () => number,
): BracketRun {
  const addedByOwner: Record<string, number> = {};
  const credit = (code: string, pts: number) => {
    const owner = nations[code]?.ownerId;
    if (owner) addedByOwner[owner] = (addedByOwner[owner] ?? 0) + pts;
  };
  const score = (o: MatchOutcome) => {
    const tie = o.gh === o.ga; // settled on penalties — scoreline level
    const wGoals = tie ? o.gh : Math.max(o.gh, o.ga);
    const lGoals = tie ? o.ga : Math.min(o.gh, o.ga);
    credit(o.winner, knockoutSidePoints(true, wGoals, lGoals, w));
    credit(o.loser, knockoutSidePoints(false, lGoals, wGoals, w));
  };

  const semifinalists = bracket.quarterfinals.map((m) => {
    const o = simulateMatch(m.home, m.away, nations, scale, rnd);
    score(o);
    return o.winner;
  });

  const finalists = bracket.semifinals.map((s) => {
    const o = simulateMatch(semifinalists[s.fromHome], semifinalists[s.fromAway], nations, scale, rnd);
    score(o);
    return o.winner;
  });

  const f = bracket.final;
  const fo = simulateMatch(finalists[f.fromHome], finalists[f.fromAway], nations, scale, rnd);
  score(fo);
  credit(fo.winner, w.champ); // champion bonus

  return { addedByOwner, semifinalists, finalists, champion: fo.winner };
}

/* ===========================================================================
 * Layer 3 — orchestration
 * ======================================================================== */

export function simulate(input: SimInput): SimResult {
  const runs = input.runs ?? DEFAULTS.runs;
  const scale = input.strengthScale ?? DEFAULTS.strengthScale;
  const { weights: w, nations, bracket } = input;
  const rnd = input.seed != null ? makeRng(input.seed) : Math.random;

  const managerIds = input.managers.map((m) => m.membershipId);
  const base: Record<string, number> = {};
  for (const m of input.managers) base[m.membershipId] = m.baseTotal;

  // per-manager accumulators
  const addedTotal: Record<string, number> = {}; // Σ points added across runs
  const winCount: Record<string, number> = {}; // Σ first-place finishes (ties split)
  const podiumCount: Record<string, number> = {}; // Σ top-3 finishes
  const finalTotals: Record<string, number[]> = {}; // every run's total → percentiles
  for (const id of managerIds) {
    addedTotal[id] = 0;
    winCount[id] = 0;
    podiumCount[id] = 0;
    finalTotals[id] = [];
  }

  // per-nation knockout-depth counters
  const reachedSf: Record<string, number> = {};
  const reachedFinal: Record<string, number> = {};
  const champ: Record<string, number> = {};
  for (const c of Object.keys(nations)) {
    reachedSf[c] = 0;
    reachedFinal[c] = 0;
    champ[c] = 0;
  }

  for (let r = 0; r < runs; r++) {
    const run = simulateBracket(bracket, nations, w, scale, rnd);

    for (const c of run.semifinalists) reachedSf[c] += 1;
    for (const c of run.finalists) reachedFinal[c] += 1;
    champ[run.champion] += 1;

    // fold this run's totals into the manager statistics
    let bestTotal = -Infinity;
    const totals = managerIds.map((id) => {
      const add = run.addedByOwner[id] ?? 0;
      addedTotal[id] += add;
      const total = base[id] + add;
      finalTotals[id].push(total);
      if (total > bestTotal) bestTotal = total;
      return { id, total };
    });

    // pool winner(s): a tie for first splits the win evenly
    const leaders = totals.filter((t) => t.total === bestTotal);
    for (const t of leaders) winCount[t.id] += 1 / leaders.length;

    // podium: everyone at or above the 3rd-best total this run
    const ranked = [...totals].sort((a, b) => b.total - a.total);
    const podiumCut = ranked[Math.min(2, ranked.length - 1)].total;
    for (const t of ranked) if (t.total >= podiumCut) podiumCount[t.id] += 1;
  }

  const managers: ManagerResult[] = input.managers.map((m) => {
    const id = m.membershipId;
    const sorted = finalTotals[id].sort((a, b) => a - b); // sort ONCE, reuse below
    return {
      membershipId: id,
      winProb: winCount[id] / runs,
      podiumProb: podiumCount[id] / runs,
      expectedPoints: base[id] + addedTotal[id] / runs,
      expectedAdded: addedTotal[id] / runs,
      p10: percentileOfSorted(sorted, 10),
      p90: percentileOfSorted(sorted, 90),
      best: sorted[sorted.length - 1] ?? base[id],
      worst: sorted[0] ?? base[id],
    };
  });

  const nationResults: NationResult[] = Object.keys(nations)
    .filter((c) => reachedSf[c] > 0 || reachedFinal[c] > 0 || champ[c] > 0)
    .map((c) => ({
      code: c,
      sfProb: reachedSf[c] / runs,
      finalProb: reachedFinal[c] / runs,
      champProb: champ[c] / runs,
    }));

  return { runs, managers, nations: nationResults };
}
