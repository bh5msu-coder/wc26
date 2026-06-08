import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { Card, Chip, Flag, LiveDot, SectionLabel } from "@/components/ui/primitives";
import type { RosterNation } from "@/lib/types";

type Fx = Awaited<ReturnType<typeof getFixtures>>[number];

function Side({ n, score, won }: { n?: RosterNation; score?: number | null; won?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Flag flag={n?.flag ?? "🏳️"} size={30} />
      <span className="text-[14px] font-bold" style={{ opacity: won === false ? 0.5 : 1 }}>{n?.code ?? "TBD"}</span>
      {n?.ownerId && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} title="Owned in your pool" />}
    </div>
  );
}

function FixtureRow({ fx, nationByCode }: { fx: Fx; nationByCode: Map<string, RosterNation> }) {
  const home = nationByCode.get(fx.homeCode);
  const away = nationByCode.get(fx.awayCode);
  const hasScore = fx.hs != null && fx.as != null;
  const homeWon = hasScore ? (fx.hs as number) > (fx.as as number) : undefined;
  const awayWon = hasScore ? (fx.as as number) > (fx.hs as number) : undefined;

  return (
    <div className="flex items-center justify-between border-b py-3.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
      <div className="flex flex-col gap-2.5">
        <Side n={home} won={fx.status === "final" ? homeWon : undefined} />
        <Side n={away} won={fx.status === "final" ? awayWon : undefined} />
      </div>

      <div className="flex items-center gap-4">
        {hasScore ? (
          <div className="flex flex-col items-end gap-2.5 display" style={{ fontSize: 18 }}>
            <span style={{ opacity: homeWon === false ? 0.5 : 1 }}>{fx.hs}</span>
            <span style={{ opacity: awayWon === false ? 0.5 : 1 }}>{fx.as}</span>
          </div>
        ) : null}

        <div className="w-[112px] text-right">
          {fx.status === "live" && (
            <Chip tone="live" style={{ fontSize: 11 }}><LiveDot /> {fx.minute}</Chip>
          )}
          {fx.status === "upcoming" && (
            <div className="text-[11.5px] font-semibold" style={{ color: "var(--dim)" }}>{fx.whenLabel}</div>
          )}
          {fx.status === "final" && (
            <Chip tone="muted" style={{ fontSize: 11 }}>FT</Chip>
          )}
          {fx.venue && <div className="mt-1 text-[10.5px]" style={{ color: "var(--faint)" }}>{fx.venue}</div>}
        </div>
      </div>
    </div>
  );
}

export default async function FixturesPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();
  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));

  const stages = Array.from(new Set(fixtures.map((f) => f.stage)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>Knockouts</div>
        <h1 className="display" style={{ fontSize: 30 }}>Fixtures</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {stages.map((stage) => (
          <div key={stage}>
            <SectionLabel>{stage}</SectionLabel>
            <Card style={{ padding: "2px 16px" }}>
              {fixtures.filter((f) => f.stage === stage).map((fx) => (
                <FixtureRow key={fx.id} fx={fx} nationByCode={nationByCode} />
              ))}
            </Card>
          </div>
        ))}
      </div>

      <p className="text-[12px]" style={{ color: "var(--faint)" }}>
        A green dot marks a nation drafted in <strong style={{ color: "var(--dim)" }}>{pool.name}</strong>.
      </p>
    </div>
  );
}
