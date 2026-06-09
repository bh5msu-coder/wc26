import * as React from "react";
import { Avatar, Chip, LiveDot } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import type { PoolView, StandingRow } from "@/lib/types";

export function HeroCard({ pool, liveScore }: { pool: PoolView; liveScore?: string }) {
  const me = pool.standings.find((s) => s.manager.isYou) ?? pool.standings[0];
  const second = pool.standings[1];
  const lead = me.total - (second ? second.total : 0);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 24, padding: "20px 20px 18px",
        background: "linear-gradient(155deg, #18263b 0%, #111824 70%)",
        border: "1px solid var(--line-strong)", boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
      }}
    >
      <div className="absolute" style={{ top: -60, right: -40, width: 200, height: 200, borderRadius: 999, background: "var(--accent)", opacity: 0.16, filter: "blur(34px)" }} />

      <div className="relative mb-4 flex items-center gap-2">
        <Chip tone="accent"><Icon name="trophy" size={12} /> {me.rank === 1 ? "1ST PLACE" : `RANK ${me.rank}`}</Chip>
        <div className="ml-auto text-[12px] font-semibold" style={{ color: "var(--dim)" }}>{me.alive} alive</div>
      </div>

      <div className="relative flex items-end justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={me.manager.name} color={me.manager.color} size={48} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "var(--dim)" }}>Your total</div>
            <div className="text-[18px] font-extrabold">{me.manager.name}</div>
          </div>
        </div>
        <div className="text-right leading-none">
          <div className="display" style={{ fontSize: 64 }}>{me.total}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--faint)" }}>points</div>
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--line)" }}>
        <div className="text-[12.5px] font-semibold" style={{ color: "var(--dim)" }}>
          {lead >= 0 ? <><span className="font-extrabold" style={{ color: "var(--accent)" }}>+{lead}</span> clear at the top</> : <><span className="font-extrabold" style={{ color: "var(--neg)" }}>{lead}</span> off the lead</>}
        </div>
        {liveScore && (
          <div className="ml-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: "var(--chip-bg)", border: "1px solid var(--line)" }}>
            <LiveDot />
            <span className="text-[12px] font-bold">{liveScore}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StandingRowItem({ row, leader }: { row: StandingRow; leader: number }) {
  const me = row.manager.isYou;
  const gap = leader - row.total;
  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: "11px 13px", borderRadius: 12,
        background: me ? "rgba(198,255,58,0.08)" : "transparent",
        border: `1px solid ${me ? "rgba(198,255,58,0.28)" : "transparent"}`,
      }}
    >
      <div className="w-6 text-center display" style={{ fontSize: 20, color: row.rank === 1 ? "var(--accent)" : "var(--faint)" }}>{row.rank}</div>
      <Avatar name={row.manager.name} color={row.manager.color} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold">{row.manager.name}</span>
          {row.alive > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: "var(--dim)" }}>
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--pos)" }} />
              {row.alive} alive
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--chip-bg)" }}>
            <div className="h-full rounded-full" style={{ width: `${leader > 0 ? Math.max(2, (row.total / leader) * 100) : 0}%`, background: me ? "var(--accent)" : row.rank === 1 ? "var(--gold)" : "var(--accent-2)" }} />
          </div>
          <span className="text-[10.5px] font-semibold" style={{ color: "var(--faint)" }}>{row.rank === 1 ? "Leads" : `−${gap}`}</span>
        </div>
      </div>
      <div className="display" style={{ fontSize: 26 }}>{row.total}</div>
    </div>
  );
}
