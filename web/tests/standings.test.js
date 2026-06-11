import { describe, it, expect } from "vitest";
import { buildStandings, groupStageLeader } from "../src/logic/standings.js";
import { DEFAULT_WEIGHTS as W } from "../src/logic/scoring.js";

const players = [
  { id: "a", name: "A", color: "#1", isYou: false },
  { id: "b", name: "B", color: "#2", isYou: true },
];
const picks = [
  { managerId: "a", code: "ARG" },
  { managerId: "b", code: "BRA" },
];
const recs = {
  ARG: { W: 2, D: 0, L: 0, GF: 5, CS: 1, KOW: 1, champion: false, alive: true, groupOnly: { W: 1, D: 0, L: 0, GF: 2, CS: 1 } },
  BRA: { W: 1, D: 1, L: 0, GF: 3, CS: 0, KOW: 0, champion: false, alive: true, groupOnly: { W: 1, D: 1, L: 0, GF: 3, CS: 0 } },
};

describe("buildStandings", () => {
  it("ranks by total points desc and assigns ranks", () => {
    const rows = buildStandings(recs, players, picks, W);
    // ARG: 6 + 5 + 1 + 1 = 13 ; BRA: 4 + 3 = 7
    expect(rows[0].id).toBe("a");
    expect(rows[0].total).toBe(13);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].total).toBe(7);
  });

  it("group scope ignores knockout + champion points", () => {
    const rows = buildStandings(recs, players, picks, W, { scope: "group" });
    const arg = rows.find((r) => r.id === "a");
    // group-only ARG: 3(win) + 2(goals) + 1(cs) = 6 (no KO bonus)
    expect(arg.total).toBe(6);
  });
});

describe("groupStageLeader", () => {
  it("returns the manager leading on group-stage points", () => {
    // group-only: ARG 6, BRA = (3+1 draw)+3 goals = 7 → BRA leads
    expect(groupStageLeader(recs, players, picks, W).id).toBe("b");
  });
});
