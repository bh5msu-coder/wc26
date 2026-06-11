import { describe, it, expect } from "vitest";
import { strengthFromPoints, priorStrength, liveFormDelta, liveStrength, FORM } from "../src/logic/strength.js";

const FRA = { code: "FRA", fifaPoints: 1877, strengthAdj: 0 };
const NOR = { code: "NOR", fifaPoints: 1550, strengthAdj: 12 };
const form = (o) => ({ W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0, ...o });

describe("strengthFromPoints", () => {
  it("maps France ~1877 ≈ 95 and clamps to 20–99", () => {
    expect(strengthFromPoints(1877)).toBe(95);
    expect(strengthFromPoints(1000)).toBe(20);
    expect(strengthFromPoints(3000)).toBe(99);
  });
});

describe("priorStrength", () => {
  it("adds the research overlay (Norway base 52 + 12 = 64)", () => {
    expect(priorStrength(NOR)).toBe(64);
  });
  it("falls back to 50 when no FIFA points", () => {
    expect(priorStrength({ code: "X" })).toBe(50);
  });
});

describe("liveFormDelta", () => {
  it("is zero before any game", () => {
    expect(liveFormDelta(form({}))).toBe(0);
  });
  it("rewards a perfect group stage and punishes a winless one", () => {
    expect(liveFormDelta(form({ W: 3, GF: 7, CS: 2 }))).toBeGreaterThan(3);
    expect(liveFormDelta(form({ L: 3 }))).toBeLessThan(-3);
  });
  it("stays within clamp bounds", () => {
    expect(liveFormDelta(form({ W: 7, GF: 30, CS: 7, KOW: 4 }))).toBeLessThanOrEqual(FORM.maxGain);
    expect(liveFormDelta(form({ L: 7 }))).toBeGreaterThanOrEqual(FORM.maxDrop);
  });
});

describe("liveStrength", () => {
  it("equals the prior with no games and is idempotent in inputs", () => {
    expect(liveStrength(FRA, form({}))).toBe(priorStrength(FRA));
  });
  it("lifts a strong run, sinks a poor one, stays 20–99", () => {
    const prior = priorStrength(FRA);
    expect(liveStrength(FRA, form({ W: 3, GF: 8, CS: 3 }))).toBeGreaterThan(prior);
    expect(liveStrength(FRA, form({ L: 3 }))).toBeLessThan(prior);
    expect(liveStrength({ fifaPoints: 1275 }, form({ L: 7 }))).toBeGreaterThanOrEqual(20);
  });
});
