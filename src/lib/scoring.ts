import type { NationRecord, Weights } from "./types";

/**
 * Scoring model — identical to the prototype's WC.pointParts / WC.points,
 * but parameterised by the pool's editable weights.
 *
 *   result = win*W + draw*D
 *   goals  = goal*GF
 *   clean  = cs*CS
 *   ko     = ko*KOW
 *   champ  = champion ? champ : 0
 */
export type PointParts = {
  result: number;
  goals: number;
  clean: number;
  ko: number;
  champ: number;
};

export function pointParts(n: NationRecord, w: Weights): PointParts {
  return {
    result: w.win * n.W + w.draw * n.D,
    goals: w.goal * n.GF,
    clean: w.cs * n.CS,
    ko: w.ko * n.KOW,
    champ: n.champion ? w.champ : 0,
  };
}

export function points(n: NationRecord, w: Weights): number {
  const p = pointParts(n, w);
  return p.result + p.goals + p.clean + p.ko + p.champ;
}

export const DEFAULT_WEIGHTS: Weights = { win: 3, draw: 1, goal: 1, cs: 1, ko: 1, champ: 1 };
