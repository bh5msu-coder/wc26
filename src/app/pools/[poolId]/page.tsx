import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { Card, SectionLabel, Chip, LiveDot } from "@/components/ui/primitives";
import { HeroCard, StandingRowItem } from "@/components/leaderboard/parts";
import { SyncButton } from "@/components/results/SyncButton";

export default async function TablePage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();

  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));
  const leader = pool.standings[0]?.total ?? 0;
  const isCommissioner = pool.managers.find((m) => m.isYou)?.role === "COMMISSIONER";

  const live = fixtures.find((f) => f.status === "live");
  const liveScore = live
    ? `${nationByCode.get(live.homeCode)?.flag ?? ""} ${live.hs}–${live.as} ${nationByCode.get(live.awayCode)?.flag ?? ""}`
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>The Table</div>
          <h1 className="display" style={{ fontSize: 30 }}>{pool.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isCommissioner && <SyncButton poolId={pool.id} />}
          <Chip tone="live" style={{ padding: "6px 11px", fontSize: 12 }}>
            <LiveDot /> {pool.stageLabel}
          </Chip>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <HeroCard pool={pool} liveScore={liveScore} />

        <div>
          <SectionLabel>Standings</SectionLabel>
          <Card pad={false} style={{ padding: 5 }}>
            <div className="flex flex-col gap-0.5">
              {pool.standings.map((row) => (
                <StandingRowItem key={row.manager.membershipId} row={row} leader={leader} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
