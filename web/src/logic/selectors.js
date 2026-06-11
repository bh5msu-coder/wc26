// Derived state: turn raw data + entered results into everything the UI shows.
// Pure (no DOM), so it's cheap to recompute on every store change.
import { deriveNations } from "./derive.js";
import { liveStrength } from "./strength.js";
import { points } from "./scoring.js";
import { buildStandings, groupStageLeader } from "./standings.js";
import { computePayouts } from "./payouts.js";
import { draftState } from "./draftgen.js";

/** Effective picks: user's live draft if present, else the seeded board. */
export function effectivePicks(state) {
  return state.draftPicks && state.draftPicks.length ? state.draftPicks : state.data.seedPicks;
}

export function computeDerived(state) {
  const { nations, players, pool, schedule } = state.data;
  const picks = effectivePicks(state);
  const weights = pool.weights;

  const raw = deriveNations(nations, schedule, state.results);
  const catalog = new Map(nations.map((n) => [n.code, n]));

  // enrich each record with catalog facts, live strength, and points
  const byCode = {};
  for (const n of nations) {
    const rec = raw[n.code];
    const merged = { ...n, ...rec, strength: liveStrength(n, rec), prior: liveStrength(n, null) };
    merged.points = points(merged, weights);
    merged.groupPoints = points({ ...(rec.groupOnly || {}), KOW: 0, champion: false }, weights);
    byCode[n.code] = merged;
  }

  const standings = buildStandings(byCode, players, picks, weights);
  const groupLeader = groupStageLeader(byCode, players, picks, weights);
  const payouts = computePayouts(pool, standings, groupLeader);
  const draft = draftState(pool.draftOrder, picks);

  return { byCode, standings, groupLeader, payouts, draft, picks, weights };
}

/** Owner (managerId) of each nation under the current picks. */
export function ownerByCode(picks) {
  const m = {};
  for (const p of picks) m[p.code] = p.managerId;
  return m;
}

/** Build the Monte-Carlo SimInput from live strengths + ownership + standings. */
export function buildSimInput(state, derived, { runs, seed }) {
  const owner = ownerByCode(derived.picks);
  const nations = {};
  for (const [code, rec] of Object.entries(derived.byCode)) {
    nations[code] = { code, strength: rec.strength, ownerId: owner[code] || null };
  }
  const managers = state.data.players.map((p) => {
    const row = derived.standings.find((r) => r.id === p.id);
    return { membershipId: p.id, baseTotal: row ? row.total : 0 };
  });
  return { nations, bracket: state.data.bracket, weights: derived.weights, managers, runs, seed };
}

/** Fixtures whose kickoff day equals `now`'s day (in venue tz-agnostic UTC date). */
export function todaysFixtures(state, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return state.data.schedule.filter((f) => f.kickoff.slice(0, 10) === today);
}

/** A fixture's live status from results + clock. */
export function fixtureStatus(fixture, results, now = new Date()) {
  if (results[fixture.id]) return "final";
  const k = new Date(fixture.kickoff).getTime();
  const t = now.getTime();
  if (t >= k && t < k + 2 * 60 * 60 * 1000) return "live";
  if (t >= k) return "final"; // kicked off, awaiting entry
  return "upcoming";
}
