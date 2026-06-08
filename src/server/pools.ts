import "server-only";
import { prisma } from "@/lib/db";
import { points } from "@/lib/scoring";
import type { Manager, PoolView, RosterNation, StandingRow, Weights } from "@/lib/types";

function weightsOf(pool: {
  winPts: number; drawPts: number; goalPts: number; csPts: number; koPts: number; champPts: number;
}): Weights {
  return {
    win: pool.winPts, draw: pool.drawPts, goal: pool.goalPts,
    cs: pool.csPts, ko: pool.koPts, champ: pool.champPts,
  };
}

const handleOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function listPoolsForUser(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { pool: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { joinedAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.pool.id,
    name: m.pool.name,
    season: m.pool.season,
    stageLabel: m.pool.stageLabel,
    members: m.pool._count.memberships,
    role: m.role,
  }));
}

/** Build the full computed view for one pool, scoped to the requesting user. */
export async function getPoolView(poolId: string, userId: string): Promise<PoolView | null> {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      memberships: { orderBy: { joinedAt: "asc" } },
      picks: { include: { nation: true } },
    },
  });
  if (!pool) return null;

  // Authorise: requester must be a member.
  const mine = pool.memberships.find((m) => m.userId === userId);
  if (!mine) return null;

  const w = weightsOf(pool);

  const managers: Manager[] = pool.memberships.map((m) => ({
    membershipId: m.id,
    handle: handleOf(m.displayName),
    name: m.displayName,
    fullName: "", // filled below if we fetch users; kept light here
    color: m.color,
    isYou: m.userId === userId,
    role: m.role,
  }));

  // nation catalog joined with this pool's picks
  const pickByCode = new Map(pool.picks.map((p) => [p.nationCode, p]));
  const allNations = await prisma.nation.findMany();

  const nations: RosterNation[] = allNations.map((n) => {
    const pick = pickByCode.get(n.code);
    const rec = { ...n };
    return {
      ...rec,
      ownerId: pick ? pick.membershipId : null,
      pickNumber: pick ? pick.pickNumber : null,
      round_drafted: pick ? pick.round : null,
      points: points(rec, w),
    };
  });

  // standings
  const totalsByOwner = new Map<string, { total: number; alive: number }>();
  for (const n of nations) {
    if (!n.ownerId) continue;
    const cur = totalsByOwner.get(n.ownerId) ?? { total: 0, alive: 0 };
    cur.total += n.points;
    cur.alive += n.alive ? 1 : 0;
    totalsByOwner.set(n.ownerId, cur);
  }

  const standings: StandingRow[] = managers
    .map((mgr) => {
      const t = totalsByOwner.get(mgr.membershipId) ?? { total: 0, alive: 0 };
      return {
        manager: mgr,
        total: t.total,
        alive: t.alive,
        today: 0,
        rank: 0,
      };
    })
    .sort((a, b) => (b.total !== a.total ? b.total - a.total : b.alive - a.alive))
    .map((row, i) => ({ ...row, rank: i + 1 }));

  return {
    id: pool.id,
    name: pool.name,
    season: pool.season,
    stageLabel: pool.stageLabel,
    inviteCode: pool.inviteCode,
    weights: w,
    rounds: pool.rounds,
    draftOrder: pool.draftOrder,
    managers,
    nations,
    standings,
  };
}

export async function getFixtures() {
  return prisma.fixture.findMany({ orderBy: { sort: "asc" } });
}

export async function getDraftPicks(poolId: string) {
  return prisma.pick.findMany({
    where: { poolId },
    include: { nation: true, membership: true },
    orderBy: { pickNumber: "asc" },
  });
}
