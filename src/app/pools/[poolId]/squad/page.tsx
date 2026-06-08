import { requireUserId } from "@/lib/session";
import { getPoolView } from "@/server/pools";
import { notFound } from "next/navigation";
import { Avatar, Card, Chip, Flag, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { pointParts } from "@/lib/scoring";
import type { PoolView, RosterNation } from "@/lib/types";

function NationLine({ n, weights }: { n: RosterNation; weights: PoolView["weights"] }) {
  const p = pointParts(n, weights);
  const bits = [
    p.result ? `${n.W}W ${n.D}D` : null,
    p.goals ? `${n.GF} G` : null,
    p.clean ? `${n.CS} CS` : null,
    p.ko ? `${n.KOW} KO` : null,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-3 border-b py-3" style={{ borderColor: "var(--line)" }}>
      <Flag flag={n.flag} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14.5px] font-bold">{n.name}</span>
          {n.alive ? (
            <Chip tone="pos" style={{ fontSize: 10, padding: "2px 7px" }}>ALIVE</Chip>
          ) : (
            <Chip tone="muted" style={{ fontSize: 10, padding: "2px 7px" }}>OUT · {n.round}</Chip>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--faint)" }}>
          Group {n.group} · {bits.join(" · ") || "No points yet"}
        </div>
      </div>
      <div className="display" style={{ fontSize: 24 }}>{n.points}</div>
    </div>
  );
}

function SquadCard({ manager, nations, weights, total, alive }: {
  manager: PoolView["managers"][number];
  nations: RosterNation[];
  weights: PoolView["weights"];
  total: number;
  alive: number;
}) {
  return (
    <Card style={{ padding: "14px 16px", border: manager.isYou ? "1px solid rgba(198,255,58,0.3)" : "1px solid var(--line)" }}>
      <div className="mb-2 flex items-center gap-3">
        <Avatar name={manager.name} color={manager.color} size={40} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-extrabold">{manager.name}</span>
            {manager.isYou && <Chip tone="accent" style={{ fontSize: 10, padding: "2px 7px" }}>YOU</Chip>}
            {manager.role === "COMMISSIONER" && <Icon name="bolt" size={14} color="var(--gold)" />}
          </div>
          <div className="text-[11.5px]" style={{ color: "var(--faint)" }}>{alive} alive · {nations.length} drafted</div>
        </div>
        <div className="display" style={{ fontSize: 30 }}>{total}</div>
      </div>
      <div>
        {nations.map((n) => <NationLine key={n.code} n={n} weights={weights} />)}
      </div>
    </Card>
  );
}

export default async function SquadPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();

  const byOwner = new Map<string, RosterNation[]>();
  for (const n of pool.nations) {
    if (!n.ownerId) continue;
    const arr = byOwner.get(n.ownerId) ?? [];
    arr.push(n);
    byOwner.set(n.ownerId, arr);
  }
  for (const arr of byOwner.values()) arr.sort((a, b) => b.points - a.points);

  // you first, then by standings order
  const ordered = [...pool.standings];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>Six nations each</div>
        <h1 className="display" style={{ fontSize: 30 }}>Squads</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {ordered.map((row) => (
          <SquadCard
            key={row.manager.membershipId}
            manager={row.manager}
            nations={byOwner.get(row.manager.membershipId) ?? []}
            weights={pool.weights}
            total={row.total}
            alive={row.alive}
          />
        ))}
      </div>
    </div>
  );
}
