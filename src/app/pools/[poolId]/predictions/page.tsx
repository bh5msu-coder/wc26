import { requireUserId } from "@/lib/session";
import { getPoolView } from "@/server/pools";
import { notFound } from "next/navigation";
import { PredictionsClient, type PredManager, type PredNation } from "@/components/predictions/PredictionsClient";
import { BRACKET } from "../../../../../prisma/seed-data";

export default async function PredictionsPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();

  const totalByMembership = new Map(pool.standings.map((s) => [s.manager.membershipId, s.total]));
  const managers: PredManager[] = pool.managers.map((m) => ({
    membershipId: m.membershipId,
    name: m.name,
    color: m.color,
    isYou: m.isYou,
    baseTotal: totalByMembership.get(m.membershipId) ?? 0,
  }));

  // only the live bracket nations feed the simulator
  const bracketCodes = new Set(BRACKET.quarterfinals.flatMap((m) => [m.home, m.away]));
  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));
  const nations: PredNation[] = Array.from(bracketCodes).map((code) => {
    const n = nationByCode.get(code)!;
    return { code: n.code, name: n.name, flag: n.flag, strength: n.strength, ownerId: n.ownerId };
  });

  return (
    <PredictionsClient
      managers={managers}
      nations={nations}
      bracket={BRACKET}
      weights={pool.weights}
      stageLabel={pool.stageLabel}
    />
  );
}
