// Team-strength model — ported from src/lib/form.ts + seed-data.ts.
// Prior = FIFA-points base + research overlay (strengthAdj, carried in nations.json).
// Live = prior blended with a bounded in-tournament form delta. Idempotent.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** FIFA points → 0–100 strength: France ~1877 ≈ 95, weak qualifier ~1300 ≈ 20. */
export function strengthFromPoints(pts) {
  return clamp(Math.round(((pts - 1300) / 580) * 75 + 20), 20, 99);
}

/** Immutable pre-tournament prior for a nation record. */
export function priorStrength(nation) {
  if (!nation || nation.fifaPoints == null) return 50;
  return clamp(strengthFromPoints(nation.fifaPoints) + (nation.strengthAdj || 0), 20, 99);
}

/** Tunables for the in-tournament form signal. */
export const FORM = {
  parPpg: 1.4, parGfpg: 1.2, parCsRate: 0.35,
  wResult: 4.5, wAttack: 1.2, wDefense: 2.0, wKnockout: 1.5,
  priorGames: 1.5, maxDrop: -12, maxGain: 14,
};

/** Bounded form delta from the record so far; 0 before any game is played. */
export function liveFormDelta({ W = 0, D = 0, L = 0, GF = 0, CS = 0, KOW = 0 } = {}) {
  const games = W + D + L;
  if (games <= 0) return 0;
  const ppg = (3 * W + D) / games;
  const gfpg = GF / games;
  const csRate = CS / games;
  const raw =
    FORM.wResult * (ppg - FORM.parPpg) +
    FORM.wAttack * (gfpg - FORM.parGfpg) +
    FORM.wDefense * (csRate - FORM.parCsRate) +
    FORM.wKnockout * KOW;
  const confidence = games / (games + FORM.priorGames);
  return clamp(raw * confidence, FORM.maxDrop, FORM.maxGain);
}

/** Live strength = prior + form, clamped to the predictor's 20–99 scale. */
export function liveStrength(nation, form) {
  return clamp(priorStrength(nation) + liveFormDelta(form || {}), 20, 99);
}
