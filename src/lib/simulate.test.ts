import { describe, it, expect } from "vitest";
import {
  makeRng,
  poisson,
  sigmoid,
  percentileOfSorted,
  simulateMatch,
  knockoutSidePoints,
  simulateBracket,
  simulate,
  type Bracket,
  type SimInput,
  type SimNation,
} from "./simulate";
import type { Weights } from "./types";

const WEIGHTS: Weights = { win: 5, draw: 2, goal: 1, cs: 2, ko: 3, champ: 15 };

const BRACKET: Bracket = {
  quarterfinals: [
    { id: "qf1", home: "ARG", away: "NED" },
    { id: "qf2", home: "ESP", away: "BRA" },
    { id: "qf3", home: "FRA", away: "ENG" },
    { id: "qf4", home: "POR", away: "MAR" },
  ],
  semifinals: [
    { id: "sf1", fromHome: 0, fromAway: 1 },
    { id: "sf2", fromHome: 2, fromAway: 3 },
  ],
  final: { id: "final", fromHome: 0, fromAway: 1 },
};

function nation(code: string, strength: number, ownerId: string | null): SimNation {
  return { code, strength, ownerId };
}

const NATIONS: Record<string, SimNation> = {
  ARG: nation("ARG", 92, "m1"),
  NED: nation("NED", 80, "m2"),
  ESP: nation("ESP", 88, "m1"),
  BRA: nation("BRA", 90, null),
  FRA: nation("FRA", 89, "m2"),
  ENG: nation("ENG", 85, "m3"),
  POR: nation("POR", 84, "m3"),
  MAR: nation("MAR", 78, "m1"),
};

function baseInput(overrides: Partial<SimInput> = {}): SimInput {
  return {
    nations: NATIONS,
    bracket: BRACKET,
    weights: WEIGHTS,
    managers: [
      { membershipId: "m1", baseTotal: 40 },
      { membershipId: "m2", baseTotal: 38 },
      { membershipId: "m3", baseTotal: 35 },
    ],
    runs: 4000,
    strengthScale: 40,
    seed: 12345,
    ...overrides,
  };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/* ── Layer 1: pure math primitives ─────────────────────────────────────── */

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(1);
    const b = makeRng(1);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different streams for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const r = makeRng(99);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("poisson", () => {
  it("returns non-negative integers", () => {
    const r = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const k = poisson(2.5, r);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
    }
  });

  it("has a sample mean close to lambda", () => {
    const r = makeRng(7);
    const samples = Array.from({ length: 20000 }, () => poisson(3, r));
    expect(mean(samples)).toBeCloseTo(3, 1); // within ~0.05
  });
});

describe("sigmoid", () => {
  it("maps 0 to 0.5 and is bounded and monotonic", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);
    expect(sigmoid(-10)).toBeLessThan(0.01);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(1)).toBeGreaterThan(sigmoid(0));
  });
});

describe("percentileOfSorted", () => {
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it("returns min at p0 and max at p100", () => {
    expect(percentileOfSorted(sorted, 0)).toBe(1);
    expect(percentileOfSorted(sorted, 100)).toBe(10);
  });
  it("returns a middle value at p50", () => {
    expect(percentileOfSorted(sorted, 50)).toBe(6); // nearest-rank: round(0.5*9)=5 → index 5
  });
  it("clamps out-of-range percentiles", () => {
    expect(percentileOfSorted(sorted, -20)).toBe(1);
    expect(percentileOfSorted(sorted, 200)).toBe(10);
  });
  it("guards the empty array", () => {
    expect(percentileOfSorted([], 50)).toBe(0);
  });
});

/* ── Layer 2: domain model ─────────────────────────────────────────────── */

describe("knockoutSidePoints", () => {
  it("scores a clean-sheet win: win + ko + goals + cs", () => {
    // 5 (win) + 3 (ko) + 2*1 (goals) + 2 (cs) = 12
    expect(knockoutSidePoints(true, 2, 0, WEIGHTS)).toBe(12);
  });
  it("scores a win while conceding: no clean-sheet bonus", () => {
    // 5 + 3 + 3*1 = 11
    expect(knockoutSidePoints(true, 3, 1, WEIGHTS)).toBe(11);
  });
  it("scores a goalless loss as zero", () => {
    expect(knockoutSidePoints(false, 0, 2, WEIGHTS)).toBe(0);
  });
  it("still rewards goals + clean sheet on a loss (e.g. shootout)", () => {
    // 0 + 1*1 (goal) + 2 (cs) = 3
    expect(knockoutSidePoints(false, 1, 0, WEIGHTS)).toBe(3);
  });
});

describe("simulateMatch", () => {
  it("always yields a distinct winner and loser from the two sides", () => {
    const r = makeRng(3);
    for (let i = 0; i < 500; i++) {
      const o = simulateMatch("ARG", "MAR", NATIONS, 40, r);
      expect(new Set([o.winner, o.loser])).toEqual(new Set(["ARG", "MAR"]));
    }
  });

  it("lets the much stronger side win the large majority of the time", () => {
    const r = makeRng(5);
    const strong: Record<string, SimNation> = {
      STRONG: nation("STRONG", 99, "a"),
      WEAK: nation("WEAK", 1, "b"),
    };
    let strongWins = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (simulateMatch("STRONG", "WEAK", strong, 40, r).winner === "STRONG") strongWins++;
    }
    expect(strongWins / N).toBeGreaterThan(0.85);
  });

  it("treats unknown codes as equal (fallback strength) → roughly 50/50", () => {
    const r = makeRng(8);
    let homeWins = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      if (simulateMatch("???", "@@@", {}, 40, r).winner === "???") homeWins++;
    }
    expect(homeWins / N).toBeGreaterThan(0.4);
    expect(homeWins / N).toBeLessThan(0.6);
  });
});

describe("simulateBracket", () => {
  it("advances the right number of teams and crowns one of the finalists", () => {
    const r = makeRng(42);
    const run = simulateBracket(BRACKET, NATIONS, WEIGHTS, 40, r);
    expect(run.semifinalists).toHaveLength(4); // one per QF
    expect(run.finalists).toHaveLength(2); // one per SF
    expect(run.finalists).toContain(run.champion);
    // finalists are drawn from the semi-finalists
    for (const f of run.finalists) expect(run.semifinalists).toContain(f);
  });

  it("only credits points to owned nations", () => {
    const r = makeRng(42);
    const run = simulateBracket(BRACKET, NATIONS, WEIGHTS, 40, r);
    // BRA is unowned; its membership id can never appear as an owner key.
    expect(Object.keys(run.addedByOwner).every((id) => ["m1", "m2", "m3"].includes(id))).toBe(true);
  });

  it("is deterministic given the same seeded rng", () => {
    const a = simulateBracket(BRACKET, NATIONS, WEIGHTS, 40, makeRng(1));
    const b = simulateBracket(BRACKET, NATIONS, WEIGHTS, 40, makeRng(1));
    expect(a).toEqual(b);
  });
});

/* ── Layer 3: orchestration ────────────────────────────────────────────── */

describe("simulate", () => {
  it("is reproducible for a fixed seed", () => {
    expect(simulate(baseInput())).toEqual(simulate(baseInput()));
  });

  it("reports the requested run count", () => {
    expect(simulate(baseInput({ runs: 1000 })).runs).toBe(1000);
  });

  it("produces probabilities that obey tournament identities", () => {
    const res = simulate(baseInput());
    // exactly one champion, two finalists, four semi-finalists per run
    expect(sum(res.nations.map((n) => n.champProb))).toBeCloseTo(1, 6);
    expect(sum(res.nations.map((n) => n.finalProb))).toBeCloseTo(2, 6);
    expect(sum(res.nations.map((n) => n.sfProb))).toBeCloseTo(4, 6);
    // exactly one pool winner is awarded each run (ties split the credit)
    expect(sum(res.managers.map((m) => m.winProb))).toBeCloseTo(1, 6);
  });

  it("keeps every probability in [0, 1]", () => {
    const res = simulate(baseInput());
    for (const m of res.managers) {
      for (const p of [m.winProb, m.podiumProb]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
    for (const n of res.nations) {
      for (const p of [n.sfProb, n.finalProb, n.champProb]) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never lowers a manager below their base total (points only accrue)", () => {
    const res = simulate(baseInput());
    const baseById = new Map(baseInput().managers.map((m) => [m.membershipId, m.baseTotal]));
    for (const m of res.managers) {
      const b = baseById.get(m.membershipId)!;
      expect(m.expectedAdded).toBeGreaterThanOrEqual(0);
      expect(m.expectedPoints).toBeGreaterThanOrEqual(b);
      expect(m.worst).toBeGreaterThanOrEqual(b);
    }
  });

  it("orders the percentile range coherently (worst ≤ p10 ≤ p90 ≤ best)", () => {
    const res = simulate(baseInput());
    for (const m of res.managers) {
      expect(m.worst).toBeLessThanOrEqual(m.p10);
      expect(m.p10).toBeLessThanOrEqual(m.p90);
      expect(m.p90).toBeLessThanOrEqual(m.best);
    }
  });

  it("only lists nations that reached at least the semi-finals", () => {
    const res = simulate(baseInput());
    for (const n of res.nations) {
      expect(n.sfProb + n.finalProb + n.champProb).toBeGreaterThan(0);
    }
  });

  it("gives a stronger field of teams a higher title chance", () => {
    const res = simulate(baseInput());
    const arg = res.nations.find((n) => n.code === "ARG")!;
    const mar = res.nations.find((n) => n.code === "MAR")!;
    expect(arg.champProb).toBeGreaterThan(mar.champProb);
  });
});
