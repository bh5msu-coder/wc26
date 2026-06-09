import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { PredictionsClient, type PredManager, type PredNation } from "@/components/predictions/PredictionsClient";
import { BRACKET } from "../../../../../prisma/seed-data";

export default async function PredictionsPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();

  const totalByMembership = new Map(pool.standings.map((s) => [s.manager.membershipId, s.total]));
  const managers: PredManager[] = pool.managers.map((m) => ({
    membershipId: m.membershipId,
    name: m.name,
    color: m.color,
    isYou: m.isYou,
    baseTotal: totalByMembership.get(m.membershipId) ?? 0,
  }));

  // Use the live quarter-finals once they exist, otherwise the seeded bracket.
  const qf = fixtures.filter((f) => f.stage === "QF" || f.stage.toLowerCase().includes("quarter"));
  const bracket =
    qf.length === 4
      ? {
          quarterfinals: qf.map((f, i) => ({ id: `qf${i + 1}`, home: f.homeCode, away: f.awayCode })),
          semifinals: BRACKET.semifinals,
          final: BRACKET.final,
        }
      : BRACKET;

  // only the live bracket nations feed the simulator
  const bracketCodes = new Set(bracket.quarterfinals.flatMap((m) => [m.home, m.away]));
  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));
  const nations: PredNation[] = Array.from(bracketCodes)
    .map((code) => nationByCode.get(code))
    .filter((n): n is NonNullable<typeof n> => !!n)
    .map((n) => ({ code: n.code, name: n.name, flag: n.flag, strength: n.strength, ownerId: n.ownerId, fifaRank: n.fifaRank }));

  return (
    <PredictionsClient
      managers={managers}
      nations={nations}
      bracket={bracket}
      weights={pool.weights}
      stageLabel={pool.stageLabel}
    />
  );
}
