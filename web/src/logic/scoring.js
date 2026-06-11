// Pure scoring rules — ported verbatim from the original app (src/lib/scoring.ts).
// A nation's points are the same regardless of who drafted it.

export const DEFAULT_WEIGHTS = { win: 3, draw: 1, goal: 1, cs: 1, ko: 1, champ: 1 };

/** Decompose a nation record into its scoring parts (auditable). */
export function pointParts(n, w = DEFAULT_WEIGHTS) {
  return {
    result: w.win * (n.W || 0) + w.draw * (n.D || 0),
    goals: w.goal * (n.GF || 0),
    clean: w.cs * (n.CS || 0),
    ko: w.ko * (n.KOW || 0),
    champ: n.champion ? w.champ : 0,
  };
}

/** Total points for a nation record under the given weights. */
export function points(n, w = DEFAULT_WEIGHTS) {
  const p = pointParts(n, w);
  return p.result + p.goals + p.clean + p.ko + p.champ;
}
