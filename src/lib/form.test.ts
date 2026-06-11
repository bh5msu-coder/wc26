import { describe, it, expect } from "vitest";
import { priorStrength, liveFormDelta, liveStrength, FORM, type NationForm } from "./form";

const blank: NationForm = { W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0 };
const form = (o: Partial<NationForm>): NationForm => ({ ...blank, ...o });

describe("priorStrength", () => {
  it("rebuilds the FIFA base plus the research overlay (France: 1877 → 95, no adj)", () => {
    expect(priorStrength("FRA", 1877, 50)).toBe(95);
  });

  it("applies the overlay delta (Norway: base 52 + 12 → 64)", () => {
    expect(priorStrength("NOR", 1550, 50)).toBe(64);
  });

  it("falls back to the supplied value when a nation has no FIFA points", () => {
    expect(priorStrength("XXX", null, 41)).toBe(41);
  });

  it("never leaves the 20–99 band", () => {
    expect(priorStrength("AAA", 1000, 50)).toBeGreaterThanOrEqual(20);
    expect(priorStrength("BBB", 3000, 50)).toBeLessThanOrEqual(99);
  });
});

describe("liveFormDelta", () => {
  it("is exactly zero before any game is played", () => {
    expect(liveFormDelta(blank)).toBe(0);
  });

  it("rewards a perfect group stage with a positive delta", () => {
    expect(liveFormDelta(form({ W: 3, GF: 7, CS: 2 }))).toBeGreaterThan(3);
  });

  it("penalises losing every game with a negative delta", () => {
    expect(liveFormDelta(form({ L: 3 }))).toBeLessThan(-3);
  });

  it("ramps with sample size — one win moves less than three", () => {
    const one = liveFormDelta(form({ W: 1, GF: 2, CS: 1 }));
    const three = liveFormDelta(form({ W: 3, GF: 6, CS: 3 }));
    expect(three).toBeGreaterThan(one);
    expect(one).toBeGreaterThan(0);
  });

  it("credits knockout wins on top of the win itself", () => {
    const groupOnly = form({ W: 2, D: 1, GF: 5, CS: 2 });
    const withKo = form({ W: 2, D: 1, GF: 5, CS: 2, KOW: 2 });
    expect(liveFormDelta(withKo)).toBeGreaterThan(liveFormDelta(groupOnly));
  });

  it("stays within the configured clamp bounds", () => {
    const monster = liveFormDelta(form({ W: 7, GF: 30, CS: 7, KOW: 4 }));
    const disaster = liveFormDelta(form({ L: 7 }));
    expect(monster).toBeLessThanOrEqual(FORM.maxGain);
    expect(disaster).toBeGreaterThanOrEqual(FORM.maxDrop);
  });
});

describe("liveStrength", () => {
  it("equals the prior when no games have been played", () => {
    expect(liveStrength("FRA", 1877, 50, blank)).toBe(priorStrength("FRA", 1877, 50));
  });

  it("is idempotent — same record gives the same strength regardless of stored value", () => {
    const rec = form({ W: 2, D: 1, GF: 5, CS: 2 });
    // the 'fallback' (stored strength) must NOT affect the result when fifaPoints exist,
    // so re-running on an already-revised value never compounds
    const a = liveStrength("ENG", 1800, 87, rec);
    const b = liveStrength("ENG", 1800, 62, rec);
    expect(a).toBe(b);
  });

  it("lifts a strong performer above its prior and sinks a poor one below", () => {
    const prior = priorStrength("BRA", 1760, 50);
    expect(liveStrength("BRA", 1760, 50, form({ W: 3, GF: 8, CS: 3 }))).toBeGreaterThan(prior);
    expect(liveStrength("BRA", 1760, 50, form({ L: 3 }))).toBeLessThan(prior);
  });

  it("keeps the result on the predictor's 20–99 scale", () => {
    const hi = liveStrength("ESP", 1876, 50, form({ W: 7, GF: 25, CS: 7, KOW: 4 }));
    const lo = liveStrength("XXX", null, 22, form({ L: 7 }));
    expect(hi).toBeLessThanOrEqual(99);
    expect(lo).toBeGreaterThanOrEqual(20);
  });
});
