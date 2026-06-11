import { describe, it, expect } from "vitest";
import {
  makeRng, poisson, sigmoid, percentileOfSorted,
  simulateMatch, knockoutSidePoints, simulateBracket, simulate,
} from "../src/logic/simulate.js";

const W = { win: 5, draw: 2, goal: 1, cs: 2, ko: 3, champ: 15 };
const BRACKET = {
  quarterfinals: [
    { id: "qf1", home: "ARG", away: "NED" },
    { id: "qf2", home: "ESP", away: "BRA" },
    { id: "qf3", home: "FRA", away: "ENG" },
    { id: "qf4", home: "POR", away: "MAR" },
  ],
  semifinals: [{ id: "sf1", fromHome: 0, fromAway: 1 }, { id: "sf2", fromHome: 2, fromAway: 3 }],
  final: { id: "final", fromHome: 0, fromAway: 1 },
};
const N = (code, strength, ownerId) => ({ code, strength, ownerId });
const NATIONS = {
  ARG: N("ARG", 92, "m1"), NED: N("NED", 80, "m2"), ESP: N("ESP", 88, "m1"), BRA: N("BRA", 90, null),
  FRA: N("FRA", 89, "m2"), ENG: N("ENG", 85, "m3"), POR: N("POR", 84, "m3"), MAR: N("MAR", 78, "m1"),
};
const baseInput = (o = {}) => ({
  nations: NATIONS, bracket: BRACKET, weights: W,
  managers: [{ membershipId: "m1", baseTotal: 40 }, { membershipId: "m2", baseTotal: 38 }, { membershipId: "m3", baseTotal: 35 }],
  runs: 4000, strengthScale: 40, seed: 12345, ...o,
});
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

describe("primitives", () => {
  it("makeRng is deterministic and in [0,1)", () => {
    const a = makeRng(1), b = makeRng(1);
    const sa = Array.from({ length: 8 }, () => a());
    expect(sa).toEqual(Array.from({ length: 8 }, () => b()));
    const r = makeRng(9);
    for (let i = 0; i < 500; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it("poisson mean ≈ lambda; sigmoid bounded/monotone", () => {
    const r = makeRng(7);
    const xs = Array.from({ length: 20000 }, () => poisson(3, r));
    expect(sum(xs) / xs.length).toBeCloseTo(3, 1);
    expect(sigmoid(0)).toBeCloseTo(0.5, 9);
    expect(sigmoid(10)).toBeGreaterThan(0.99);
    expect(sigmoid(1)).toBeGreaterThan(sigmoid(0));
  });
  it("percentileOfSorted boundaries + empty guard", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentileOfSorted(s, 0)).toBe(1);
    expect(percentileOfSorted(s, 100)).toBe(10);
    expect(percentileOfSorted([], 50)).toBe(0);
  });
});

describe("domain", () => {
  it("knockoutSidePoints arithmetic", () => {
    expect(knockoutSidePoints(true, 2, 0, W)).toBe(5 + 3 + 2 + 2); // win+ko+2goals+cs = 12
    expect(knockoutSidePoints(false, 0, 2, W)).toBe(0);
  });
  it("simulateMatch yields a distinct winner; strong beats weak >85%", () => {
    const r = makeRng(3);
    for (let i = 0; i < 300; i++) {
      const o = simulateMatch("ARG", "MAR", NATIONS, 40, r);
      expect(new Set([o.winner, o.loser])).toEqual(new Set(["ARG", "MAR"]));
    }
    const r2 = makeRng(5);
    const strong = { S: N("S", 99, "a"), Wk: N("Wk", 1, "b") };
    let sw = 0; const T = 2000;
    for (let i = 0; i < T; i++) if (simulateMatch("S", "Wk", strong, 40, r2).winner === "S") sw++;
    expect(sw / T).toBeGreaterThan(0.85);
  });
  it("simulateBracket advances 4 SF, 2 finalists, crowns a finalist; only owned credited", () => {
    const run = simulateBracket(BRACKET, NATIONS, W, 40, makeRng(42));
    expect(run.semifinalists).toHaveLength(4);
    expect(run.finalists).toHaveLength(2);
    expect(run.finalists).toContain(run.champion);
    expect(Object.keys(run.addedByOwner).every((id) => ["m1", "m2", "m3"].includes(id))).toBe(true);
  });
});

describe("simulate orchestration", () => {
  it("is reproducible for a fixed seed", () => {
    expect(simulate(baseInput())).toEqual(simulate(baseInput()));
  });
  it("obeys tournament conservation laws", () => {
    const res = simulate(baseInput());
    expect(sum(res.nations.map((n) => n.champProb))).toBeCloseTo(1, 6);
    expect(sum(res.nations.map((n) => n.finalProb))).toBeCloseTo(2, 6);
    expect(sum(res.nations.map((n) => n.sfProb))).toBeCloseTo(4, 6);
    expect(sum(res.managers.map((m) => m.winProb))).toBeCloseTo(1, 6);
  });
  it("keeps probabilities in [0,1] and percentiles ordered", () => {
    const res = simulate(baseInput());
    for (const m of res.managers) {
      for (const p of [m.winProb, m.podiumProb]) { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }
      expect(m.worst).toBeLessThanOrEqual(m.p10);
      expect(m.p10).toBeLessThanOrEqual(m.p90);
      expect(m.p90).toBeLessThanOrEqual(m.best);
      expect(m.expectedAdded).toBeGreaterThanOrEqual(0);
    }
  });
  it("gives a stronger field a higher title chance", () => {
    const res = simulate(baseInput());
    const arg = res.nations.find((n) => n.code === "ARG");
    const mar = res.nations.find((n) => n.code === "MAR");
    expect(arg.champProb).toBeGreaterThan(mar.champProb);
  });
});
