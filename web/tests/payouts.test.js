import { describe, it, expect } from "vitest";
import { pot, computePayouts } from "../src/logic/payouts.js";

const pool = {
  meta: { managerCount: 8 },
  economics: {
    entryFee: 50,
    payoutSplit: [
      { place: 1, label: "1st", pct: 0.6 },
      { place: 2, label: "2nd", pct: 0.25 },
      { place: 3, label: "3rd", pct: 0.1 },
      { place: "groupLeader", label: "Group-stage leader", pct: 0.05 },
    ],
  },
};
const standings = [
  { id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }, { id: "d", name: "D" },
];
const groupLeader = { id: "d", name: "D" };

describe("payouts", () => {
  it("pot is entry × managers", () => {
    expect(pot(pool)).toBe(400);
  });
  it("splits 60/25/10/5 onto the right people and sums to the pot", () => {
    const rows = computePayouts(pool, standings, groupLeader);
    expect(rows.map((r) => r.amount)).toEqual([240, 100, 40, 20]);
    expect(rows[0].name).toBe("A");
    expect(rows[3].name).toBe("D"); // group leader
    expect(rows.reduce((s, r) => s + r.amount, 0)).toBe(400);
  });
});
