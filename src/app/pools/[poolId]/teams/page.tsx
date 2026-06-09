import { requireUserId } from "@/lib/session";
import { getPoolView } from "@/server/pools";
import { notFound } from "next/navigation";
import { TeamsClient, type TeamNation } from "@/components/teams/TeamsClient";

export default async function TeamsPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();

  const ownerById = new Map(pool.managers.map((m) => [m.membershipId, m]));

  const nations: TeamNation[] = pool.nations.map((n) => {
    const owner = n.ownerId ? ownerById.get(n.ownerId) : undefined;
    return {
      code: n.code, name: n.name, flag: n.flag, group: n.group,
      fifaRank: n.fifaRank, fifaPoints: n.fifaPoints, confederation: n.confederation, titles: n.titles, strength: n.strength,
      W: n.W, D: n.D, L: n.L, GF: n.GF, alive: n.alive, champion: n.champion, round: n.round,
      ownerName: owner?.name ?? null, ownerColor: owner?.color ?? null, points: n.points,
    };
  });

  return <TeamsClient nations={nations} />;
}
