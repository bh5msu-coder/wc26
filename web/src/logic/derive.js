// Derive per-nation records from entered match results — ported from src/lib/results.ts.
// Results are the only raw input; everything else (W/D/L/GF/CS/KOW/round/alive/champion,
// plus a group-stage-only slice for the side pot) is a pure function of them.

export const STAGE = {
  Group: { ko: false, rank: 1 },
  R32: { ko: true, rank: 2 },
  R16: { ko: true, rank: 3 },
  QF: { ko: true, rank: 4 },
  SF: { ko: true, rank: 5 },
  "3rd": { ko: true, rank: 6 },
  Final: { ko: true, rank: 7 },
};

/** Is a score entry complete & legal for this fixture? KO draws need a shootout winner. */
export function validateScore(fixture, score) {
  if (!score) return { ok: false, error: "No score entered." };
  const { hs, as, shootoutWinner } = score;
  if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0) {
    return { ok: false, error: "Scores must be whole numbers ≥ 0." };
  }
  const ko = STAGE[fixture.stage]?.ko;
  if (ko && hs === as && shootoutWinner !== "home" && shootoutWinner !== "away") {
    return { ok: false, error: "A drawn knockout needs a penalty-shootout winner." };
  }
  return { ok: true };
}

/** Decide the winner of a single fixture. Returns true (home), false (away), or null (draw). */
function decideWinner(fixture, score) {
  const { hs, as, shootoutWinner } = score;
  if (hs > as) return true;
  if (as > hs) return false;
  if (STAGE[fixture.stage]?.ko) {
    if (shootoutWinner === "home") return true;
    if (shootoutWinner === "away") return false;
  }
  return null; // genuine draw (group stage)
}

const blank = () => ({
  W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0,
  champion: false, lostKO: false, stageRank: 0, round: "Group",
  groupOnly: { W: 0, D: 0, L: 0, GF: 0, CS: 0 },
});

/**
 * Fold every entered result into per-nation accumulators.
 * @param nations array of nation records ({code,...})
 * @param schedule array of fixtures ({id,stage,home,away,...})
 * @param results  map fixtureId → { hs, as, shootoutWinner }
 * @returns map code → derived record
 */
export function deriveNations(nations, schedule, results) {
  const acc = {};
  for (const n of nations) acc[n.code] = { code: n.code, ...blank() };
  const fixtureById = new Map(schedule.map((f) => [f.id, f]));
  let koPlayed = false;

  for (const [fixtureId, score] of Object.entries(results || {})) {
    const f = fixtureById.get(fixtureId);
    if (!f) continue;
    const st = STAGE[f.stage];
    if (!st) continue;
    const H = acc[f.home];
    const A = acc[f.away];
    if (!H || !A) continue; // TBD knockout slot not yet assigned real teams
    const { hs, as } = score;
    if (!Number.isInteger(hs) || !Number.isInteger(as)) continue;
    if (st.ko) koPlayed = true;

    // furthest stage reached
    for (const rec of [H, A]) {
      if (st.rank > rec.stageRank) { rec.stageRank = st.rank; rec.round = f.stage; }
    }

    H.GF += hs; A.GF += as;
    if (as === 0) H.CS += 1;
    if (hs === 0) A.CS += 1;
    if (!st.ko) {
      if (as === 0) H.groupOnly.CS += 1;
      if (hs === 0) A.groupOnly.CS += 1;
      H.groupOnly.GF += hs; A.groupOnly.GF += as;
    }

    const homeWin = decideWinner(f, score);
    if (homeWin === true) {
      H.W += 1; A.L += 1;
      if (st.ko) { H.KOW += 1; A.lostKO = true; } else { H.groupOnly.W += 1; A.groupOnly.L += 1; }
    } else if (homeWin === false) {
      A.W += 1; H.L += 1;
      if (st.ko) { A.KOW += 1; H.lostKO = true; } else { A.groupOnly.W += 1; H.groupOnly.L += 1; }
    } else {
      H.D += 1; A.D += 1;
      H.groupOnly.D += 1; A.groupOnly.D += 1;
    }

    if (f.stage === "Final") {
      if (homeWin === true) H.champion = true;
      else if (homeWin === false) A.champion = true;
    }
  }

  // alive: not knocked out, and (once KO has started) not stuck in the group stage
  for (const rec of Object.values(acc)) {
    const eliminatedInGroup = koPlayed && rec.stageRank <= 1;
    rec.alive = !rec.lostKO && !eliminatedInGroup;
  }
  return acc;
}
