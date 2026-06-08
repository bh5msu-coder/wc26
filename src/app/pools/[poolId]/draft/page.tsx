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

  // Full draft order (membershipId per overall pick). Use the pool's stored
  // custom order if set, otherwise a standard snake from membership order.
  let order: string[];
  if (pool.draftOrder.length) {
    order = pool.draftOrder;
  } else {
    const base = pool.managers.map((m) => m.membershipId);
    order = [];
    for (let r = 0; r < pool.rounds; r++) {
      order.push(...(r % 2 === 0 ? base : [...base].reverse()));
    }
  }

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

  const youId = pool.managers.find((m) => m.isYou)?.membershipId ?? null;
  const picksMade = picks.length;
  const onClockId = picksMade < order.length ? order[picksMade] : null;

  return (
    <DraftClient
      managers={managers}
      order={order}
      picks={picks}
      nations={nations}
      rounds={pool.rounds}
      poolId={params.poolId}
      youId={youId}
      onClockId={onClockId}
      myQueue={pool.myQueue}
      myAutoDraft={pool.myAutoDraft}
    />
  );
}
