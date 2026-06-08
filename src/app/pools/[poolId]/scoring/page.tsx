import { requireUserId } from "@/lib/session";
import { getPoolView } from "@/server/pools";
import { notFound } from "next/navigation";
import { ScoringClient } from "@/components/scoring/ScoringClient";

export default async function ScoringPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();

  const you = pool.managers.find((m) => m.isYou);
  const canEdit = you?.role === "COMMISSIONER";

  return <ScoringClient poolId={pool.id} weights={pool.weights} canEdit={canEdit} />;
}
