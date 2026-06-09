import * as React from "react";
import { requireUserId } from "@/lib/session";
import { getPoolView, getFixtures } from "@/server/pools";
import { notFound } from "next/navigation";
import { Card, Chip, Flag, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { RosterNation } from "@/lib/types";

// ── Per-team knockout path: Group → R32 → R16 → QF → SF → Final ──
const PATH_STEPS = ["Group", "R32", "R16", "QF", "SF", "Final"];
function roundIndex(round: string): number {
  const r = round.toLowerCase();
  if (r.includes("final")) return 5;
  if (r.includes("3rd") || r.includes("third") || r === "sf" || r.includes("semi")) return 4;
  if (r === "qf" || r.includes("quarter")) return 3;
  if (r.includes("16")) return 2;
  if (r.includes("32")) return 1;
  return 0;
}

function KnockoutPaths({ teams, ownerById }: { teams: RosterNation[]; ownerById: Map<string, { name: string; color: string }> }) {
  if (teams.length === 0) return null;
  const rows = teams
    .map((n) => ({ n, reached: n.champion ? 5 : roundIndex(n.round) }))
    .sort((a, b) => b.reached - a.reached || b.n.strength - a.n.strength);
  return (
    <div>
      <SectionLabel>Drafted teams · road to glory</SectionLabel>
      <Card pad={false} style={{ padding: "2px 16px" }}>
        {rows.map(({ n, reached }) => {
          const owner = n.ownerId ? ownerById.get(n.ownerId) : undefined;
          const color = n.champion ? "var(--gold)" : owner?.color ?? "var(--accent)";
          const out = !n.alive && !n.champion;
          return (
            <div key={n.code} className="flex items-center gap-3 border-b py-3.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
              <Flag flag={n.flag} size={28} />
              <div className="w-28 min-w-0 shrink-0">
                <div className="truncate text-[13px] font-bold">{n.name}</div>
                {owner && <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--faint)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: owner.color }} />{owner.name}</div>}
              </div>
              <div className="flex flex-1 items-center">
                {PATH_STEPS.map((s, i) => (
                  <React.Fragment key={s}>
                    {i > 0 && <div className="h-[3px] flex-1 rounded-full" style={{ background: i <= reached ? color : "var(--line)" }} />}
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full" title={s} style={{ background: i <= reached ? color : "transparent", border: `2px solid ${i <= reached ? color : "var(--line)"}` }} />
                  </React.Fragment>
                ))}
                {n.champion && <Icon name="trophy" size={15} color="var(--gold)" className="ml-1.5" />}
              </div>
              <span className="w-16 shrink-0 text-right text-[10.5px] font-bold uppercase tracking-wide" style={{ color: n.champion ? "var(--gold)" : out ? "var(--neg)" : "var(--pos)" }}>
                {n.champion ? "Champion" : out ? `Out · ${n.round}` : reached > 0 ? `In · ${n.round}` : "Group"}
              </span>
            </div>
          );
        })}
      </Card>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--faint)" }}>
        {PATH_STEPS.map((s) => <span key={s}>{s}</span>)}
      </div>
    </div>
  );
}

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

// ── Bracket geometry + topology model ────────────────────────────────────
// Single-elimination wiring: matches 2k and 2k+1 of a round feed match k of
// the next round. Fixtures arrive ordered by `sort` — the official schedule
// lays knockout matches out in bracket-adjacent order — so this deterministic
// pairing reconstructs the connector topology without extra stored data.
// (If real seeding/feeds-into data is added to Fixture later, swap the pairing
// here; the geometry + SVG rendering stay the same.)
const CARD_W = 176;
const CARD_H = 84;
const COL_GAP = 52; // horizontal gutter the connectors live in
const ROW_GAP = 16; // vertical gap between first-round slots
const COL_W = CARD_W + COL_GAP;

function BracketCanvas({ rounds, nationByCode }: { rounds: { key: string; matches: Fx[] }[]; nationByCode: Map<string, RosterNation> }) {
  // y-center of every match slot, computed per round so each match sits
  // exactly between the two matches that feed it.
  const centers: number[][] = [];
  rounds.forEach((rd, r) => {
    centers[r] = rd.matches.map((_, j) => {
      if (r === 0) return j * (CARD_H + ROW_GAP) + CARD_H / 2;
      const a = centers[r - 1][2 * j];
      const b = centers[r - 1][2 * j + 1];
      if (a == null) return j * (CARD_H + ROW_GAP) + CARD_H / 2;
      return b == null ? a : (a + b) / 2;
    });
  });

  const firstCount = rounds[0]?.matches.length ?? 1;
  const bodyH = Math.max(CARD_H, firstCount * (CARD_H + ROW_GAP) - ROW_GAP);
  const totalW = rounds.length * COL_W - COL_GAP;

  // Connector elbows: from each feeder's right edge → mid-gutter → next
  // match's center height → next match's left edge. Lines whose feeder match
  // is decided light up in accent to trace who advanced.
  const paths: { d: string; live: boolean }[] = [];
  for (let r = 1; r < rounds.length; r++) {
    const nextLeft = r * COL_W;
    const feedRight = (r - 1) * COL_W + CARD_W;
    const midX = feedRight + COL_GAP / 2;
    rounds[r].matches.forEach((_, j) => {
      const cn = centers[r][j];
      [2 * j, 2 * j + 1].forEach((fi) => {
        const cf = centers[r - 1]?.[fi];
        if (cf == null) return;
        const live = rounds[r - 1].matches[fi]?.status === "final";
        paths.push({ d: `M ${feedRight} ${cf} H ${midX} V ${cn} H ${nextLeft}`, live });
      });
    });
  }

  return (
    <div style={{ width: totalW, minWidth: totalW }}>
      <div className="flex">
        {rounds.map((rd) => (
          <div key={rd.key} className="text-[11px] font-extrabold uppercase tracking-wide" style={{ width: COL_W, color: "var(--faint)" }}>
            {ROUND_LABEL[rd.key]}
          </div>
        ))}
      </div>
      <div className="relative mt-2" style={{ width: totalW, height: bodyH }}>
        <svg width={totalW} height={bodyH} className="absolute inset-0" style={{ pointerEvents: "none" }} aria-hidden>
          {paths.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke={p.live ? "var(--accent)" : "var(--line-strong)"} strokeWidth={p.live ? 2 : 1.5} strokeLinejoin="round" opacity={p.live ? 0.85 : 0.5} />
          ))}
        </svg>
        {rounds.map((rd, r) =>
          rd.matches.map((fx, j) => (
            <div key={fx.id} className="absolute flex items-center" style={{ left: r * COL_W, top: centers[r][j] - CARD_H / 2, width: CARD_W, height: CARD_H }}>
              <MatchCard fx={fx} nationByCode={nationByCode} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function BracketPage({ params }: { params: { poolId: string } }) {
  const userId = await requireUserId();
  const pool = await getPoolView(params.poolId, userId);
  if (!pool) notFound();
  const fixtures = await getFixtures();
  const nationByCode = new Map(pool.nations.map((n) => [n.code, n]));
  const ownerById = new Map(pool.managers.map((m) => [m.membershipId, { name: m.name, color: m.color }]));
  const draftedTeams = pool.nations.filter((n) => n.ownerId);

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
          <BracketCanvas
            rounds={liveRounds.map((r) => ({ key: r, matches: byRound.get(r) ?? [] }))}
            nationByCode={nationByCode}
          />

          {third.length > 0 && (
            <div className="mt-6 max-w-[220px]">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Third place</div>
              {third.map((fx) => <MatchCard key={fx.id} fx={fx} nationByCode={nationByCode} />)}
            </div>
          )}
        </div>
      )}

      <KnockoutPaths teams={draftedTeams} ownerById={ownerById} />
    </div>
  );
}
