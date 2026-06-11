// Monte-Carlo tournament predictor — ported verbatim from src/lib/simulate.ts.
// Pure & dependency-free, so it runs unchanged in Vitest and inside the Web Worker.
//
//   Layer 1 — primitives: makeRng, poisson, sigmoid, percentileOfSorted
//   Layer 2 — domain:     simulateMatch, knockoutSidePoints, simulateBracket
//   Layer 3 — orchestration: simulate

export const DEFAULTS = { runs: 10000, strengthScale: 40 };
const MATCH = { baseGoals: 1.35, shootoutSharpness: 0.7, fallbackStrength: 50 };

/* Layer 1 — primitives */

/** Deterministic mulberry32 PRNG → reproducible runs from one seed. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth's algorithm for a Poisson(lambda) goal count. */
export function poisson(lambda, rnd) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rnd();
  } while (p > L);
  return k - 1;
}

export const sigmoid = (x) => 1 / (1 + Math.exp(-x));

/** Nearest-rank percentile of an already-ascending-sorted array. */
export function percentileOfSorted(sortedAsc, p) {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const idx = Math.min(n - 1, Math.max(0, Math.round((p / 100) * (n - 1))));
  return sortedAsc[idx];
}

/* Layer 2 — domain */

/** Simulate one knockout match; penalties (strength-weighted flip) break ties. */
export function simulateMatch(homeCode, awayCode, nations, scale, rnd) {
  const sh = nations[homeCode]?.strength ?? MATCH.fallbackStrength;
  const sa = nations[awayCode]?.strength ?? MATCH.fallbackStrength;
  const diff = sh - sa;
  const lambdaH = MATCH.baseGoals * Math.exp(diff / scale / 2);
  const lambdaA = MATCH.baseGoals * Math.exp(-diff / scale / 2);
  const gh = poisson(lambdaH, rnd);
  const ga = poisson(lambdaA, rnd);

  if (gh === ga) {
    const pHome = sigmoid(diff / (scale * MATCH.shootoutSharpness));
    return rnd() < pHome
      ? { winner: homeCode, loser: awayCode, gh, ga }
      : { winner: awayCode, loser: homeCode, gh, ga };
  }
  return gh > ga
    ? { winner: homeCode, loser: awayCode, gh, ga }
    : { winner: awayCode, loser: homeCode, gh, ga };
}

/** Points one nation earns for a single knockout match. */
export function knockoutSidePoints(won, goalsFor, goalsConceded, w) {
  let pts = 0;
  if (won) pts += w.win + w.ko;
  pts += w.goal * goalsFor;
  if (goalsConceded === 0) pts += w.cs;
  return pts;
}

/** Play one full bracket (QF → SF → Final); report who advanced + owner points. */
export function simulateBracket(bracket, nations, w, scale, rnd) {
  const addedByOwner = {};
  const credit = (code, pts) => {
    const owner = nations[code]?.ownerId;
    if (owner) addedByOwner[owner] = (addedByOwner[owner] ?? 0) + pts;
  };
  const score = (o) => {
    const tie = o.gh === o.ga;
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
  credit(fo.winner, w.champ);

  return { addedByOwner, semifinalists, finalists, champion: fo.winner };
}

/* Layer 3 — orchestration */

export function simulate(input) {
  const runs = input.runs ?? DEFAULTS.runs;
  const scale = input.strengthScale ?? DEFAULTS.strengthScale;
  const { weights: w, nations, bracket } = input;
  const rnd = input.seed != null ? makeRng(input.seed) : Math.random;

  const managerIds = input.managers.map((m) => m.membershipId);
  const base = {};
  for (const m of input.managers) base[m.membershipId] = m.baseTotal;

  const addedTotal = {}, winCount = {}, podiumCount = {}, finalTotals = {};
  for (const id of managerIds) { addedTotal[id] = 0; winCount[id] = 0; podiumCount[id] = 0; finalTotals[id] = []; }

  const reachedSf = {}, reachedFinal = {}, champ = {};
  for (const c of Object.keys(nations)) { reachedSf[c] = 0; reachedFinal[c] = 0; champ[c] = 0; }

  for (let r = 0; r < runs; r++) {
    const run = simulateBracket(bracket, nations, w, scale, rnd);
    for (const c of run.semifinalists) reachedSf[c] += 1;
    for (const c of run.finalists) reachedFinal[c] += 1;
    champ[run.champion] += 1;

    let bestTotal = -Infinity;
    const totals = managerIds.map((id) => {
      const add = run.addedByOwner[id] ?? 0;
      addedTotal[id] += add;
      const total = base[id] + add;
      finalTotals[id].push(total);
      if (total > bestTotal) bestTotal = total;
      return { id, total };
    });

    const leaders = totals.filter((t) => t.total === bestTotal);
    for (const t of leaders) winCount[t.id] += 1 / leaders.length;

    const ranked = [...totals].sort((a, b) => b.total - a.total);
    const podiumCut = ranked[Math.min(2, ranked.length - 1)].total;
    for (const t of ranked) if (t.total >= podiumCut) podiumCount[t.id] += 1;
  }

  const managers = input.managers.map((m) => {
    const id = m.membershipId;
    const sorted = finalTotals[id].sort((a, b) => a - b);
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
      distribution: sorted,
    };
  });

  const nationResults = Object.keys(nations)
    .filter((c) => reachedSf[c] > 0 || reachedFinal[c] > 0 || champ[c] > 0)
    .map((c) => ({ code: c, sfProb: reachedSf[c] / runs, finalProb: reachedFinal[c] / runs, champProb: champ[c] / runs }));

  return { runs, managers, nations: nationResults };
}
