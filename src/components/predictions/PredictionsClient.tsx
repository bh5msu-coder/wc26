"use client";

import * as React from "react";
import { Avatar, Card, Chip, Flag, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { simulate, type Bracket, type SimInput } from "@/lib/simulate";
import type { Weights } from "@/lib/types";

export type PredManager = { membershipId: string; name: string; color: string; isYou: boolean; baseTotal: number };
export type PredNation = { code: string; name: string; flag: string; strength: number; ownerId: string | null };

const RUN_OPTIONS = [2000, 10000, 50000];

function Bar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, background: "var(--chip-bg)" }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(1.5, pct * 100)}%`, background: color }} />
    </div>
  );
}

const pct = (x: number) => (x >= 0.1 ? `${Math.round(x * 100)}%` : x >= 0.01 ? `${(x * 100).toFixed(1)}%` : "<1%");

export function PredictionsClient({
  managers, nations, bracket, weights, stageLabel,
}: {
  managers: PredManager[];
  nations: PredNation[];
  bracket: Bracket;
  weights: Weights;
  stageLabel: string;
}) {
  const [runs, setRuns] = React.useState(10000);
  const [scale, setScale] = React.useState(40); // higher = more predictable
  const [seed, setSeed] = React.useState(1);

  const result = React.useMemo(() => {
    const nationMap: SimInput["nations"] = {};
    for (const n of nations) nationMap[n.code] = { code: n.code, strength: n.strength, ownerId: n.ownerId };
    return simulate({
      nations: nationMap,
      bracket,
      weights,
      managers: managers.map((m) => ({ membershipId: m.membershipId, baseTotal: m.baseTotal })),
      runs,
      strengthScale: scale,
      seed,
    });
  }, [nations, bracket, weights, managers, runs, scale, seed]);

  const mById = new Map(managers.map((m) => [m.membershipId, m]));
  const nByCode = new Map(nations.map((n) => [n.code, n]));

  const rankedManagers = [...result.managers].sort((a, b) => b.winProb - a.winProb);
  const maxWin = rankedManagers[0]?.winProb || 1;
  const favourite = rankedManagers[0];
  const champNations = [...result.nations].sort((a, b) => b.champProb - a.champProb);
  const topCup = champNations[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>Monte Carlo · from the {stageLabel.toLowerCase()}</div>
          <h1 className="display" style={{ fontSize: 30 }}>Predictions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="muted"><Icon name="dice" size={13} /> {result.runs.toLocaleString()} simulations</Chip>
          <button onClick={() => setSeed((s) => s + 1)} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            <Icon name="swap" size={14} color="var(--accent-ink)" /> Re-run
          </button>
        </div>
      </div>

      {/* headline */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card style={{ padding: "16px 18px" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--faint)" }}>Pool favourite</div>
          {favourite && (
            <div className="mt-2.5 flex items-center gap-3">
              <Avatar name={mById.get(favourite.membershipId)!.name} color={mById.get(favourite.membershipId)!.color} size={42} />
              <div className="flex-1">
                <div className="text-[17px] font-extrabold">{mById.get(favourite.membershipId)!.name}</div>
                <div className="text-[12px]" style={{ color: "var(--dim)" }}>to win {`"`}the pool{`"`}</div>
              </div>
              <div className="display" style={{ fontSize: 34, color: "var(--accent)" }}>{pct(favourite.winProb)}</div>
            </div>
          )}
        </Card>
        <Card style={{ padding: "16px 18px" }}>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--faint)" }}>Most likely champion</div>
          {topCup && (
            <div className="mt-2.5 flex items-center gap-3">
              <Flag flag={nByCode.get(topCup.code)?.flag ?? "🏳️"} size={42} />
              <div className="flex-1">
                <div className="text-[17px] font-extrabold">{nByCode.get(topCup.code)?.name}</div>
                <div className="text-[12px]" style={{ color: "var(--dim)" }}>lifts the cup most often</div>
              </div>
              <div className="display" style={{ fontSize: 34, color: "var(--gold)" }}>{pct(topCup.champProb)}</div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* title odds per manager */}
        <div>
          <SectionLabel>Title odds</SectionLabel>
          <Card style={{ padding: "6px 16px 10px" }}>
            {rankedManagers.map((r) => {
              const m = mById.get(r.membershipId)!;
              return (
                <div key={r.membershipId} className="border-b py-3 last:border-b-0" style={{ borderColor: "var(--line)" }}>
                  <div className="mb-2 flex items-center gap-2.5">
                    <Avatar name={m.name} color={m.color} size={28} />
                    <span className="text-[14px] font-bold">{m.name}</span>
                    {m.isYou && <Chip tone="accent" style={{ fontSize: 10, padding: "2px 7px" }}>YOU</Chip>}
                    <span className="ml-auto display" style={{ fontSize: 20 }}>{pct(r.winProb)}</span>
                  </div>
                  <Bar pct={r.winProb / maxWin} color={m.isYou ? "var(--accent)" : "var(--accent-2)"} />
                  <div className="mt-1.5 flex items-center justify-between text-[11.5px]" style={{ color: "var(--faint)" }}>
                    <span>Proj. <strong style={{ color: "var(--dim)" }}>{Math.round(r.expectedPoints)}</strong> pts (now {m.baseTotal})</span>
                    <span>Range {r.p10}–{r.p90} · <span style={{ color: "var(--pos)" }}>+{r.expectedAdded.toFixed(1)} exp</span></span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        {/* nation road to final */}
        <div className="flex flex-col gap-6">
          <div>
            <SectionLabel right={<span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Final · Cup</span>}>Road to the final</SectionLabel>
            <Card style={{ padding: "6px 16px 8px" }}>
              {champNations.map((n) => {
                const nat = nByCode.get(n.code);
                const owner = nat?.ownerId ? mById.get(nat.ownerId) : undefined;
                return (
                  <div key={n.code} className="flex items-center gap-3 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
                    <Flag flag={nat?.flag ?? "🏳️"} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold">{nat?.name}</span>
                        {owner && <span className="h-1.5 w-1.5 rounded-full" style={{ background: owner.color }} title={owner.name} />}
                      </div>
                      <div className="mt-1"><Bar pct={n.finalProb} color="var(--accent-2)" height={5} /></div>
                    </div>
                    <div className="w-11 text-right text-[12px] font-bold" style={{ color: "var(--dim)" }}>{pct(n.finalProb)}</div>
                    <div className="w-11 text-right display" style={{ fontSize: 16, color: "var(--gold)" }}>{pct(n.champProb)}</div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* controls */}
          <Card style={{ padding: "16px 18px" }}>
            <div className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--faint)" }}>Simulation settings</div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: "var(--dim)" }}>Runs</span>
              <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--surface-2)" }}>
                {RUN_OPTIONS.map((r) => (
                  <button key={r} onClick={() => setRuns(r)} className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: runs === r ? "var(--accent)" : "transparent", color: runs === r ? "var(--accent-ink)" : "var(--dim)" }}>
                    {r >= 1000 ? `${r / 1000}k` : r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: "var(--dim)" }}>Upset factor</span>
                <span className="text-[12px] font-bold" style={{ color: "var(--accent)" }}>{scale <= 28 ? "Chaos" : scale >= 56 ? "Chalk" : "Balanced"}</span>
              </div>
              <input
                type="range" min={20} max={70} step={2} value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <div className="mt-1 flex justify-between text-[10.5px]" style={{ color: "var(--faint)" }}>
                <span>More upsets</span><span>Form holds</span>
              </div>
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed" style={{ color: "var(--faint)" }}>
              Each run plays out the live bracket with a Poisson goal model weighted by team strength, then scores every owned nation with this pool&apos;s rules. Probabilities are the share of runs in which each outcome happened.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
