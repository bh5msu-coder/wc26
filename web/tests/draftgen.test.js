import { describe, it, expect } from "vitest";
import { draftState, generateSnakeDraft, slotMap, totalPicks, roundOfPick } from "../src/logic/draftgen.js";
import draftOrder from "../data/pool.json" with { type: "json" };
import nations from "../data/nations.json" with { type: "json" };
import seed from "../data/draft.seed.json" with { type: "json" };

const ORDER = draftOrder.draftOrder;

describe("draft order helpers", () => {
  it("has 48 total picks across 8 managers", () => {
    expect(totalPicks(ORDER)).toBe(48);
    expect(Object.keys(slotMap(ORDER)).length).toBe(48);
  });
  it("round = the manager's pick index", () => {
    expect(roundOfPick(ORDER, 1)).toBe(1);   // bard's 1st
    expect(roundOfPick(ORDER, 48)).toBe(6);  // bard's 6th
    expect(roundOfPick(ORDER, 17)).toBe(3);  // stove's 3rd
  });
});

describe("live draftState from the seeded board", () => {
  it("recognises a complete 48-pick draft with nobody on the clock", () => {
    const st = draftState(ORDER, seed.picks);
    expect(st.made.size).toBe(48);
    expect(st.onClock).toBe(null);
    expect(st.onClockManager).toBe(null);
  });
  it("assigns every pick to exactly one manager and no nation twice", () => {
    expect(new Set(seed.picks.map((p) => p.code)).size).toBe(48);
    expect(new Set(seed.picks.map((p) => p.pickNumber)).size).toBe(48);
  });
});

describe("generateSnakeDraft (best-available filler)", () => {
  it("produces exactly 48 unique picks in the custom order", () => {
    const picks = generateSnakeDraft(nations, ORDER);
    expect(picks).toHaveLength(48);
    expect(new Set(picks.map((p) => p.code)).size).toBe(48);
    // pick 1 (bard) should be the strongest nation by fifaPoints (France 1877)
    expect(picks[0]).toMatchObject({ pickNumber: 1, managerId: "bard", code: "FRA" });
  });
  it("is deterministic", () => {
    expect(generateSnakeDraft(nations, ORDER)).toEqual(generateSnakeDraft(nations, ORDER));
  });
});
