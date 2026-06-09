import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { Card, Chip, Flag } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { RosterNation } from "@/lib/types";

type Fx = Awaited<ReturnType<typeof getFixtures>>[number];

// Map any fixture stage label (seed style "Quarter-final" or sync style "QF") to a round key.
function roundOf(stage: string): string | null {
  const s = stage.toLowerCase();
  if (s.includes("32")) return "R32";
  if (s.includes("16")) return "R16";
  if (s.includes("quarter") || s === "qf") return "QF";
  if (s.includes("semi") || s === "sf") return "SF";
  if (s.includes("3rd") || s.includes("third")) return "3rd";
  if (s.includes("final")) return "Final";
  return null;
}

const ROUND_ORDER = ["R32", "R16", "QF", "SF", "Final"] as const;
const ROUND_LABEL: Record<string, string> = {
  R32: "Round of 32", R16: "Round of 16", QF: "Quarter-finals", SF: "Semi-finals", Final: "Final", "3rd": "Third place",
};

function Side({ n, score, won, dim }: { n?: RosterNation; score: number | null; won: boolean; dim: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ opacity: dim ? 0.4 : 1 }}>
      <Flag flag={n?.flag ?? "🏳️"} size={22} />
      <span className="flex-1 truncate text-[12px]" style={{ fontWeight: won ? 800 : 600, color: won ? "var(--accent)" : "var(--text)" }}>{n?.code ?? "TBD"}</span>
      <span className="display" style={{ fontSize: 14, color: won ? "var(--accent)" : "var(--text)" }}>{score ?? ""}</span>
    </div>
  );
}

function MatchCard({ fx, nationByCode }: { fx: Fx; nationByCode: Map<string, RosterNation> }) {
  const final = fx.status === "final" && fx.hs != null && fx.as != null;
  const homeWon = final && (fx.hs as number) > (fx.as as number);
  const awayWon = final && (fx.as as number) > (fx.hs as number);
  return (
    <Card pad={false} style={{ padding: "8px 10px", minWidth: 150 }}>
      <Side n={nationByCode.get(fx.homeCode)} score={fx.hs} won={homeWon} dim={final && !homeWon} />
      <div className="my-1 h-px" style={{ background: "var(--line)" }} />
      <Side n={nationByCode.get(fx.awayCode)} score={fx.as} won={awayWon} dim={final && !awayWon} />
      <div className="mt-1.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: "var(--faint)" }}>
        {fx.status === "live" ? "LIVE" : fx.status === "final" ? "FT" : fx.whenLabel ?? "TBD"}
      </div>
    </Card>
  );
}

export default async function BracketPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();
  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));

  const byRound = new Map<string, Fx[]>();
  for (const fx of fixtures) {
    const r = roundOf(fx.stage);
    if (!r) continue;
    (byRound.get(r) ?? byRound.set(r, []).get(r)!).push(fx);
  }

  const liveRounds = ROUND_ORDER.filter((r) => (byRound.get(r)?.length ?? 0) > 0);
  const third = byRound.get("3rd") ?? [];
  const hasBracket = liveRounds.length > 0;

  // champion = winner of a decided final
  const finalFx = (byRound.get("Final") ?? [])[0];
  const champion =
    finalFx && finalFx.status === "final" && finalFx.hs != null && finalFx.as != null
      ? nationByCode.get(finalFx.hs > finalFx.as ? finalFx.homeCode : finalFx.awayCode)
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>The knockouts</div>
        <h1 className="display" style={{ fontSize: 30 }}>Bracket</h1>
      </div>

      {!hasBracket ? (
        <Card style={{ padding: 24 }}>
          <div className="flex items-center gap-2.5">
            <Icon name="ko" size={18} color="var(--accent)" />
            <span className="text-[15px] font-extrabold">Bracket unlocks after the group stage</span>
          </div>
          <p className="mt-2 text-[13px]" style={{ color: "var(--dim)" }}>
            48 teams, 12 groups — the top two of each group plus the eight best third-placed teams advance to a
            32-team knockout: <strong style={{ color: "var(--text)" }}>Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Final</strong>.
            Matchups appear here automatically as results come in.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {ROUND_ORDER.map((r) => <Chip key={r} tone="muted">{ROUND_LABEL[r]}</Chip>)}
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto pb-2">
          {champion && (
            <Card style={{ padding: "14px 18px", marginBottom: 18, background: "linear-gradient(135deg, rgba(255,200,61,0.16), var(--surface))", border: "1px solid rgba(255,200,61,0.4)" }}>
              <div className="flex items-center gap-3">
                <Icon name="trophy" size={26} color="var(--gold)" />
                <Flag flag={champion.flag} size={36} />
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--gold)" }}>World champions</div>
                  <div className="display" style={{ fontSize: 26 }}>{champion.name}</div>
                </div>
              </div>
            </Card>
          )}
          <div className="flex items-stretch gap-0" style={{ minWidth: "min-content" }}>
            {liveRounds.map((r, ci) => (
              <div
                key={r}
                className="flex flex-col justify-around gap-2 px-3"
                style={{ borderLeft: ci > 0 ? "1px dashed var(--line)" : "none", minWidth: 168 }}
              >
                <div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: "var(--faint)" }}>{ROUND_LABEL[r]}</div>
                {(byRound.get(r) ?? []).map((fx) => <MatchCard key={fx.id} fx={fx} nationByCode={nationByCode} />)}
              </div>
            ))}
          </div>

          {third.length > 0 && (
            <div className="mt-6 max-w-[220px]">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Third place</div>
              {third.map((fx) => <MatchCard key={fx.id} fx={fx} nationByCode={nationByCode} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
