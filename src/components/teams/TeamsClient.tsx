"use client";

import * as React from "react";
import { Card, Chip, Flag, GroupChip, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export type TeamNation = {
  code: string; name: string; flag: string; group: string;
  fifaRank: number | null; fifaPoints: number | null; confederation: string | null; titles: number; strength: number;
  W: number; D: number; L: number; GF: number; alive: boolean; champion: boolean; round: string;
  ownerName: string | null; ownerColor: string | null; points: number;
};

const CONFEDS = ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"] as const;
type Sort = "rank" | "strength" | "group";

function StrengthBar({ value }: { value: number }) {
  const c = value >= 80 ? "var(--accent)" : value >= 60 ? "var(--accent-2)" : value >= 40 ? "var(--gold)" : "var(--neg)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--chip-bg)" }}>
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: c }} />
    </div>
  );
}

function TeamCard({ n }: { n: TeamNation }) {
  const played = n.W + n.D + n.L;
  return (
    <Card style={{ padding: 14 }}>
      <div className="flex items-center gap-3">
        <Flag flag={n.flag} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[15px] font-extrabold">{n.name}</span>
            {n.champion && <Icon name="trophy" size={14} color="var(--gold)" />}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <GroupChip group={n.group} fontSize={10} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--faint)" }}>{n.confederation ?? "—"}</span>
            {n.titles > 0 && <span className="text-[10px] font-bold" style={{ color: "var(--gold)" }} title={`${n.titles} World Cup title${n.titles === 1 ? "" : "s"}`}>{"★".repeat(n.titles)}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="display" style={{ fontSize: 22 }}>{n.fifaRank ? `#${n.fifaRank}` : "—"}</div>
          <div className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: "var(--faint)" }}>FIFA</div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="w-9 text-[10px] font-bold uppercase" style={{ color: "var(--faint)" }}>RTG</span>
        <StrengthBar value={n.strength} />
        <span className="w-7 text-right text-[12px] font-extrabold">{Math.round(n.strength)}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-2.5 text-[11.5px]" style={{ borderColor: "var(--line)" }}>
        <span style={{ color: "var(--faint)" }}>
          {played > 0 ? `${n.W}W ${n.D}D ${n.L}L · ${n.GF} GF` : "No matches yet"}
        </span>
        {n.ownerName ? (
          <span className="inline-flex items-center gap-1.5 font-bold">
            <span className="h-2 w-2 rounded-full" style={{ background: n.ownerColor ?? "#888" }} />
            {n.ownerName}
          </span>
        ) : (
          <span style={{ color: "var(--faint)" }}>Undrafted</span>
        )}
      </div>
    </Card>
  );
}

export function TeamsClient({ nations }: { nations: TeamNation[] }) {
  const [conf, setConf] = React.useState<string>("All");
  const [sort, setSort] = React.useState<Sort>("rank");

  const filtered = nations.filter((n) => conf === "All" || n.confederation === conf);
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "strength") return b.strength - a.strength;
    if (sort === "group") return a.group.localeCompare(b.group) || (a.fifaRank ?? 999) - (b.fifaRank ?? 999);
    return (a.fifaRank ?? 999) - (b.fifaRank ?? 999);
  });

  const drafted = nations.filter((n) => n.ownerName).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>The field · {nations.length} nations · {drafted} drafted</div>
          <h1 className="display" style={{ fontSize: 30 }}>Teams</h1>
        </div>
        <div className="flex gap-1 rounded-full p-1" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          {(["rank", "strength", "group"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} className="rounded-full px-3 py-1.5 text-[12px] font-bold capitalize" style={{ background: sort === s ? "var(--accent)" : "transparent", color: sort === s ? "var(--accent-ink)" : "var(--dim)" }}>
              {s === "rank" ? "FIFA rank" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["All", ...CONFEDS].map((c) => {
          const count = c === "All" ? nations.length : nations.filter((n) => n.confederation === c).length;
          if (c !== "All" && count === 0) return null;
          const active = conf === c;
          return (
            <button key={c} onClick={() => setConf(c)} className="rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: active ? "var(--accent)" : "var(--chip-bg)", color: active ? "var(--accent-ink)" : "var(--dim)", border: `1px solid ${active ? "transparent" : "var(--line)"}` }}>
              {c} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((n) => <TeamCard key={n.code} n={n} />)}
      </div>
      {sorted.length === 0 && <SectionLabel>No teams in this confederation.</SectionLabel>}
    </div>
  );
}
