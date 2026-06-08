import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { Card, SectionLabel, Chip, LiveDot } from "@/components/ui/primitives";
import { HeroCard, StandingRowItem, FeedRowItem } from "@/components/leaderboard/parts";
import { FEED } from "../../../../prisma/seed-data";

export default async function TablePage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();

  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));
  const managerByHandle = new Map(pool.managers.map((m) => [m.handle, m]));
  const leader = pool.standings[0]?.total ?? 0;

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
        <Chip tone="live" style={{ padding: "6px 11px", fontSize: 12 }}>
          <LiveDot /> {pool.stageLabel}
        </Chip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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

        <div>
          <SectionLabel>Latest scoring</SectionLabel>
          <Card style={{ padding: "4px 14px" }}>
            {FEED.map((ev, i) => (
              <FeedRowItem
                key={i}
                ev={ev}
                flag={nationByCode.get(ev.code)?.flag ?? "🏳️"}
                manager={managerByHandle.get(ev.who)}
              />
            ))}
            <div className="h-0.5" />
          </Card>
        </div>
      </div>
    </div>
  );
}
