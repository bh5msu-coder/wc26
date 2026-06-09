import "server-only";
import { prisma } from "@/lib/db";
import { resolveNationCode, normalizeName } from "@/lib/team-codes";

/**
 * Pulls World Cup results from football-data.org (v4) and updates each nation's
 * record + the fixture list. Configured entirely via env so it no-ops safely
 * until a token is provided:
 *   RESULTS_API_TOKEN   — your football-data.org key (required to run)
 *   RESULTS_API_URL     — base URL (default https://api.football-data.org/v4)
 *   RESULTS_COMPETITION — competition code (default "WC")
 *
 * Teams are matched to our nation catalog via team-codes.ts (TLA overrides,
 * then code, then name aliases / DB name). Teams not in the catalog are ignored.
 */

type FdScore = { winner?: string | null; fullTime?: { home: number | null; away: number | null } };
type FdTeam = { tla?: string | null; name?: string | null };
type FdMatch = {
  id: number; status: string; stage: string; utcDate: string;
  homeTeam: FdTeam; awayTeam: FdTeam; score: FdScore;
};
type FdResponse = { matches?: FdMatch[] };

export type SyncResult = { ok: boolean; updated: number; matches: number; message?: string };

const STAGE: Record<string, { label: string; ko: boolean; rank: number }> = {
  GROUP_STAGE: { label: "Group", ko: false, rank: 1 },
  LAST_16: { label: "R16", ko: true, rank: 2 },
  QUARTER_FINALS: { label: "QF", ko: true, rank: 3 },
  SEMI_FINALS: { label: "SF", ko: true, rank: 4 },
  THIRD_PLACE: { label: "3rd", ko: true, rank: 5 },
  FINAL: { label: "Final", ko: true, rank: 6 },
};

type Acc = {
  W: number; D: number; L: number; GF: number; CS: number; KOW: number;
  champion: boolean; lostKO: boolean; stageRank: number; stageLabel: string;
};

export async function syncResults(): Promise<SyncResult> {
  const token = process.env.RESULTS_API_TOKEN;
  if (!token) return { ok: false, updated: 0, matches: 0, message: "RESULTS_API_TOKEN is not set." };

  const base = process.env.RESULTS_API_URL ?? "https://api.football-data.org/v4";
  const comp = process.env.RESULTS_COMPETITION ?? "WC";

  let data: FdResponse;
  try {
    const res = await fetch(`${base}/competitions/${comp}/matches`, {
      headers: { "X-Auth-Token": token },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, updated: 0, matches: 0, message: `Results API returned ${res.status}.` };
    data = (await res.json()) as FdResponse;
  } catch (e) {
    return { ok: false, updated: 0, matches: 0, message: e instanceof Error ? e.message : "Fetch failed." };
  }

  const matches = data.matches ?? [];
  // Don't touch the DB on an empty response — otherwise the fixture rebuild
  // below would wipe the existing schedule and replace it with nothing.
  if (matches.length === 0) {
    return { ok: true, updated: 0, matches: 0, message: "No matches returned." };
  }

  // Build the code/name lookup from the live catalog, then resolve every team
  // through the explicit mapping table (team-codes.ts).
  const allNations = await prisma.nation.findMany({ select: { code: true, name: true } });
  const codeSet = new Set(allNations.map((n) => n.code));
  const nameToCode = new Map(allNations.map((n) => [normalizeName(n.name), n.code] as const));
  const resolve = (t: FdTeam) => resolveNationCode(t, codeSet, nameToCode);

  const acc = new Map<string, Acc>();
  const get = (code: string): Acc => {
    let a = acc.get(code);
    if (!a) {
      a = { W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0, champion: false, lostKO: false, stageRank: 0, stageLabel: "Group" };
      acc.set(code, a);
    }
    return a;
  };

  for (const m of matches) {
    const st = STAGE[m.stage];
    const home = resolve(m.homeTeam);
    const away = resolve(m.awayTeam);
    if (!home || !away) continue;

    // furthest stage reached
    if (st) {
      for (const code of [home, away]) {
        const a = get(code);
        if (st.rank > a.stageRank) { a.stageRank = st.rank; a.stageLabel = st.label; }
      }
    }

    if (m.status !== "FINISHED") continue;
    const hs = m.score?.fullTime?.home ?? 0;
    const as = m.score?.fullTime?.away ?? 0;
    const H = get(home);
    const A = get(away);

    H.GF += hs; A.GF += as;
    if (as === 0) H.CS += 1;
    if (hs === 0) A.CS += 1;

    let homeWin: boolean | null;
    if (hs > as) homeWin = true;
    else if (as > hs) homeWin = false;
    else if (st?.ko && m.score?.winner === "HOME_TEAM") homeWin = true;
    else if (st?.ko && m.score?.winner === "AWAY_TEAM") homeWin = false;
    else homeWin = null; // genuine draw (group stage)

    if (homeWin === true) {
      H.W += 1; A.L += 1;
      if (st?.ko) { H.KOW += 1; A.lostKO = true; }
    } else if (homeWin === false) {
      A.W += 1; H.L += 1;
      if (st?.ko) { A.KOW += 1; H.lostKO = true; }
    } else {
      H.D += 1; A.D += 1;
    }

    if (m.stage === "FINAL") {
      if (homeWin === true) H.champion = true;
      else if (homeWin === false) A.champion = true;
    }
  }

  // Once any knockout match is decided, the group stage is over — so a team
  // that only ever appeared in group games is eliminated, not "alive".
  const koStarted = matches.some((m) => STAGE[m.stage]?.ko && m.status === "FINISHED");

  // update matching nations in one transaction
  const nationOps = [...acc.entries()]
    .filter(([code]) => codeSet.has(code))
    .map(([code, a]) => {
      const eliminatedInGroup = koStarted && a.stageRank <= 1;
      return prisma.nation.update({
        where: { code },
        data: {
          W: a.W, D: a.D, L: a.L, GF: a.GF, CS: a.CS, KOW: a.KOW,
          round: a.stageLabel, alive: !a.lostKO && !eliminatedInGroup, champion: a.champion,
        },
      });
    });
  if (nationOps.length) await prisma.$transaction(nationOps);

  // rebuild the fixture list atomically (delete + inserts in one transaction)
  const sorted = [...matches].sort((x, y) => x.utcDate.localeCompare(y.utcDate));
  const fixtureOps = [
    prisma.fixture.deleteMany({}),
    ...sorted.map((m, i) => {
      const st = STAGE[m.stage];
      const status = m.status === "FINISHED" ? "final" : m.status === "IN_PLAY" || m.status === "PAUSED" ? "live" : "upcoming";
      const when = new Date(m.utcDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return prisma.fixture.create({
        data: {
          id: String(m.id),
          stage: st?.label ?? m.stage ?? "Match",
          status,
          homeCode: resolve(m.homeTeam) || "TBD",
          awayCode: resolve(m.awayTeam) || "TBD",
          hs: m.score?.fullTime?.home ?? null,
          as: m.score?.fullTime?.away ?? null,
          whenLabel: when,
          sort: i,
        },
      });
    }),
  ];
  await prisma.$transaction(fixtureOps);

  return { ok: true, updated: nationOps.length, matches: matches.length };
}
