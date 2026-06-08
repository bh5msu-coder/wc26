import { requireUserId } from "@/lib/session";
import { getPoolView, getDraftPicks } from "@/server/pools";
import { notFound } from "next/navigation";
import { DraftClient, type DraftNation, type DraftPick } from "@/components/draft/DraftClient";

export default async function DraftPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const rawPicks = await getDraftPicks(params.poolId);

  const managers = pool.managers.map((m) => ({ id: m.membershipId, name: m.name, color: m.color, isYou: m.isYou }));

  // round-1 draft order, by pick number
  const order = rawPicks
    .filter((p) => p.round === 1)
    .sort((a, b) => a.pickNumber - b.pickNumber)
    .map((p) => p.membershipId);

  const picks: DraftPick[] = rawPicks.map((p) => ({
    pickNumber: p.pickNumber,
    round: p.round,
    ownerId: p.membershipId,
    code: p.nationCode,
    flag: p.nation.flag,
    name: p.nation.name,
  }));

  const nations: DraftNation[] = pool.nations.map((n) => ({
    code: n.code, name: n.name, flag: n.flag, group: n.group,
    owned: n.ownerId != null, strength: n.strength, points: n.points, ownerId: n.ownerId,
  }));

  return <DraftClient managers={managers} order={order} picks={picks} nations={nations} />;
}
