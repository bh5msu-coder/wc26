import { strengthFromPoints, STRENGTH_ADJ } from "../../prisma/seed-data";

/**
 * Live strength revision.
 *
 * A nation's seeded `strength` is a pre-tournament *prior*: the FIFA-points base
 * plus the research overlay (STRENGTH_ADJ). Once matches are played we want the
 * predictor to react to what's actually happening on the pitch — a team romping
 * through its group should get stronger, one losing every game weaker — without
 * ever overwriting (and so compounding on top of) the prior.
 *
 * The prior is fully reconstructable from the immutable `fifaPoints` + the
 * overlay, so on every results sync we recompute `strength = prior + form`,
 * where `form` is a bounded delta derived from the record so far. That makes the
 * revision idempotent: syncing twice with the same results yields the same value.
 *
 * Pure and dependency-free (no `server-only`), so the math is unit-testable.
 */

export type NationForm = {
  W: number;
  D: number;
  L: number;
  GF: number; // goals scored
  CS: number; // clean sheets
  KOW: number; // knockout wins
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The immutable pre-tournament prior: FIFA-points base + research overlay. */
export function priorStrength(code: string, fifaPoints: number | null, fallback: number): number {
  if (fifaPoints == null) return fallback; // no ranking on file — keep whatever was seeded
  return clamp(strengthFromPoints(fifaPoints) + (STRENGTH_ADJ[code] ?? 0), 20, 99);
}

/** Tunables for the in-tournament form signal, named so the model reads clearly. */
export const FORM = {
  parPpg: 1.4, // points-per-game a middling side averages (lots of draws/losses)
  parGfpg: 1.2, // goals-per-game baseline
  parCsRate: 0.35, // clean-sheet rate baseline
  wResult: 4.5, // results are the primary signal
  wAttack: 1.2, // goals scored
  wDefense: 2.0, // clean sheets (defensive solidity)
  wKnockout: 1.5, // each knockout win is hard-earned, beyond the win itself
  priorGames: 1.5, // confidence ramp: 1 game ≈ 0.4, 7 games ≈ 0.82
  maxDrop: -12, // floor on the form delta
  maxGain: 14, // ceiling on the form delta
} as const;

/**
 * Bounded form delta (in strength points) from the results so far. Returns 0
 * until a match is played, ramps up its influence as the sample grows, and is
 * clamped so even a perfect run can't blow past the prior by an absurd margin.
 */
export function liveFormDelta({ W, D, L, GF, CS, KOW }: NationForm): number {
  const games = W + D + L;
  if (games <= 0) return 0;

  const ppg = (3 * W + D) / games; // 0..3
  const gfpg = GF / games;
  const csRate = CS / games; // 0..1

  const raw =
    FORM.wResult * (ppg - FORM.parPpg) +
    FORM.wAttack * (gfpg - FORM.parGfpg) +
    FORM.wDefense * (csRate - FORM.parCsRate) +
    FORM.wKnockout * KOW;

  const confidence = games / (games + FORM.priorGames);
  return clamp(raw * confidence, FORM.maxDrop, FORM.maxGain);
}

/**
 * Live strength = prior blended with current form, re-clamped to the predictor's
 * 20–99 scale. `fallback` (the currently stored strength) is used only when a
 * nation has no FIFA points on record.
 */
export function liveStrength(
  code: string,
  fifaPoints: number | null,
  fallback: number,
  form: NationForm,
): number {
  return clamp(priorStrength(code, fifaPoints, fallback) + liveFormDelta(form), 20, 99);
}
