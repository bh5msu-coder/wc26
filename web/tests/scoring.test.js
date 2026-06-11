import { describe, it, expect } from "vitest";
import { points, pointParts, DEFAULT_WEIGHTS } from "../src/logic/scoring.js";

const W = DEFAULT_WEIGHTS; // {win:3,draw:1,goal:1,cs:1,ko:1,champ:1}

describe("scoring", () => {
  it("scores a clean-sheet group win: 3 + goals + cs", () => {
    // 1W, GF 2, CS 1 → 3 + 2 + 1 = 6
    expect(points({ W: 1, D: 0, L: 0, GF: 2, CS: 1, KOW: 0 }, W)).toBe(6);
  });
  it("adds the knockout-win bonus and champion bonus", () => {
    // 4W (1 KO), GF 8, CS 3, KOW 1, champion → 12 + 8 + 3 + 1 + 1 = 25
    expect(points({ W: 4, D: 0, L: 0, GF: 8, CS: 3, KOW: 1, champion: true }, W)).toBe(25);
  });
  it("scores a goalless loss as zero", () => {
    expect(points({ W: 0, D: 0, L: 1, GF: 0, CS: 0, KOW: 0 }, W)).toBe(0);
  });
  it("decomposes into auditable parts that sum to the total", () => {
    const n = { W: 2, D: 1, L: 1, GF: 5, CS: 2, KOW: 1, champion: true };
    const p = pointParts(n, W);
    expect(p).toEqual({ result: 7, goals: 5, clean: 2, ko: 1, champ: 1 });
    expect(p.result + p.goals + p.clean + p.ko + p.champ).toBe(points(n, W));
  });
  it("respects custom weights", () => {
    const w = { win: 5, draw: 2, goal: 1, cs: 2, ko: 3, champ: 15 };
    expect(points({ W: 1, D: 0, L: 0, GF: 1, CS: 1, KOW: 0 }, w)).toBe(5 + 1 + 2);
  });
});
