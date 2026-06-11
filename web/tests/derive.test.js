import { describe, it, expect } from "vitest";
import { deriveNations, validateScore, STAGE } from "../src/logic/derive.js";

const NATIONS = [{ code: "ARG" }, { code: "NED" }, { code: "ESP" }, { code: "BRA" }];
const schedule = [
  { id: "g1", stage: "Group", home: "ARG", away: "NED" },
  { id: "g2", stage: "Group", home: "ESP", away: "BRA" },
  { id: "qf1", stage: "QF", home: "ARG", away: "ESP" },
  { id: "fin", stage: "Final", home: "ARG", away: "BRA" },
];

describe("validateScore", () => {
  it("rejects non-integer / negative scores", () => {
    expect(validateScore({ stage: "Group" }, { hs: 1.5, as: 0 }).ok).toBe(false);
    expect(validateScore({ stage: "Group" }, { hs: -1, as: 0 }).ok).toBe(false);
  });
  it("allows a group draw but rejects a KO draw with no shootout winner", () => {
    expect(validateScore({ stage: "Group" }, { hs: 1, as: 1 }).ok).toBe(true);
    expect(validateScore({ stage: "QF" }, { hs: 1, as: 1 }).ok).toBe(false);
    expect(validateScore({ stage: "QF" }, { hs: 1, as: 1, shootoutWinner: "home" }).ok).toBe(true);
  });
});

describe("deriveNations", () => {
  it("accumulates a group win with a clean sheet", () => {
    const acc = deriveNations(NATIONS, schedule, { g1: { hs: 2, as: 0 } });
    expect(acc.ARG).toMatchObject({ W: 1, D: 0, L: 0, GF: 2, CS: 1, KOW: 0 });
    expect(acc.NED).toMatchObject({ W: 0, L: 1, GF: 0, CS: 0 });
    expect(acc.ARG.groupOnly).toMatchObject({ W: 1, GF: 2, CS: 1 });
  });

  it("counts a knockout win (KOW) and marks the loser out (not alive)", () => {
    const acc = deriveNations(NATIONS, schedule, {
      g1: { hs: 1, as: 0 }, g2: { hs: 1, as: 0 },
      qf1: { hs: 1, as: 1, shootoutWinner: "home" },
    });
    expect(acc.ARG.KOW).toBe(1);
    expect(acc.ARG.groupOnly.KOW).toBeUndefined(); // KO not in the group-only slice
    expect(acc.ESP.alive).toBe(false); // lost the QF
    expect(acc.ARG.alive).toBe(true);
    // KO shootout draw: scoreline stays level, both keep the goal, ARG clean sheet? (conceded 1) no
    expect(acc.ARG.GF).toBe(2); // 1 (group) + 1 (qf)
  });

  it("eliminates group-only teams once the knockouts start", () => {
    const acc = deriveNations(NATIONS, schedule, {
      g1: { hs: 0, as: 0 }, // ARG & NED only ever played a group game
      qf1: { hs: 2, as: 0 }, // a KO match has been played → koPlayed
    });
    expect(acc.NED.alive).toBe(false); // stuck in group stage after KO began
  });

  it("crowns exactly the Final winner as champion", () => {
    const acc = deriveNations(NATIONS, schedule, { fin: { hs: 3, as: 1 } });
    expect(acc.ARG.champion).toBe(true);
    expect(acc.BRA.champion).toBe(false);
  });

  it("has a sane STAGE map (Group not KO, Final is KO)", () => {
    expect(STAGE.Group.ko).toBe(false);
    expect(STAGE.Final.ko).toBe(true);
  });
});
