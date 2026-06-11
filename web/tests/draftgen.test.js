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
  it("recognises 35 made picks and puts ZD on the clock at pick 36", () => {
    const st = draftState(ORDER, seed.picks);
    expect(st.made.size).toBe(35);
    expect(st.onClock).toBe(36);
    expect(st.onClockManager).toBe("zd");
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
