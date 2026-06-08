"use client";

import * as React from "react";
import { Card } from "@/components/ui/primitives";
import { Icon, type IconName } from "@/components/ui/Icon";
import { updateScoring, type ScoringInput } from "@/server/actions";
import type { Weights } from "@/lib/types";

type Rule = { key: keyof ScoringInput; weightKey: keyof Weights; icon: IconName; color: string; title: string; sub: string; min: number; max: number };

const RULES: Rule[] = [
  { key: "winPts", weightKey: "win", icon: "bolt", color: "var(--accent-2)", title: "Match win", sub: "Every match — groups & knockouts", min: 0, max: 5 },
  { key: "goalPts", weightKey: "goal", icon: "ball", color: "var(--accent)", title: "Goal scored", sub: "For each goal your nation scores", min: 0, max: 3 },
  { key: "csPts", weightKey: "cs", icon: "shield", color: "var(--pos)", title: "Clean sheet", sub: "Each match without conceding", min: 0, max: 3 },
  { key: "koPts", weightKey: "ko", icon: "ko", color: "var(--gold)", title: "Knockout bonus", sub: "On top of the win, every KO round", min: 0, max: 3 },
  { key: "champPts", weightKey: "champ", icon: "trophy", color: "#B073FF", title: "Champion bonus", sub: "One-off if your nation lifts the cup", min: 0, max: 10 },
];

function Stepper({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange: (v: number) => void; disabled?: boolean }) {
  const btn = (label: React.ReactNode, fn: () => void, enabled: boolean) => (
    <button
      type="button" disabled={disabled || !enabled} onClick={fn}
      className="flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-30"
      style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)" }}
    >{label}</button>
  );
  return (
    <div className="flex items-center gap-2">
      {btn(<Icon name="close" size={13} />, () => onChange(Math.max(min, value - 1)), value > min)}
      <span className="display w-9 text-center" style={{ fontSize: 24 }}>{value > 0 ? `+${value}` : value}</span>
      {btn(<Icon name="plus" size={14} />, () => onChange(Math.min(max, value + 1)), value < max)}
    </div>
  );
}

export function ScoringClient({ poolId, weights, canEdit }: { poolId: string; weights: Weights; canEdit: boolean }) {
  const [vals, setVals] = React.useState<ScoringInput>({
    winPts: weights.win, drawPts: weights.draw, goalPts: weights.goal,
    csPts: weights.cs, koPts: weights.ko, champPts: weights.champ,
  });
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);

  const dirty = (Object.keys(vals) as (keyof ScoringInput)[]).some(
    (k) => vals[k] !== { winPts: weights.win, drawPts: weights.draw, goalPts: weights.goal, csPts: weights.cs, koPts: weights.ko, champPts: weights.champ }[k],
  );

  const save = () => {
    setSaved(false);
    start(async () => {
      await updateScoring(poolId, vals);
      setSaved(true);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>The rules</div>
        <h1 className="display" style={{ fontSize: 30 }}>Scoring</h1>
      </div>

      <p className="max-w-[640px] text-[13.5px] leading-relaxed" style={{ color: "var(--dim)" }}>
        You draft a squad of nations. Every match they play earns points all the way to the final.
        {canEdit ? " As commissioner, you can tune any value — the table, squads and predictions all update instantly." : " Only the commissioner can change these values."}
      </p>

      <Card style={{ padding: "6px 18px 12px", maxWidth: 640 }}>
        {RULES.map((r) => (
          <div key={r.key} className="flex items-center gap-3.5 border-b py-3.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: `color-mix(in srgb, ${r.color} 16%, transparent)`, color: r.color }}>
              <Icon name={r.icon} size={20} color={r.color} />
            </div>
            <div className="flex-1">
              <div className="text-[14.5px] font-bold">{r.title}</div>
              <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--faint)" }}>{r.sub}</div>
            </div>
            {canEdit ? (
              <Stepper value={vals[r.key]} min={r.min} max={r.max} disabled={pending} onChange={(v) => { setSaved(false); setVals((s) => ({ ...s, [r.key]: v })); }} />
            ) : (
              <span className="display" style={{ fontSize: 24 }}>+{weights[r.weightKey]}</span>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-3" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", marginTop: 12 }}>
          <Icon name="info" size={16} color="var(--dim)" />
          <span className="text-[12px]" style={{ color: "var(--dim)" }}>A draw always scores +1. Highest total when the final whistle blows in New York/New Jersey wins the pool.</span>
        </div>
      </Card>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button
            onClick={save} disabled={!dirty || pending}
            className="inline-flex items-center gap-2 rounded-[12px] px-5 py-3 text-[14px] font-extrabold disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {pending ? <span className="h-4 w-4 animate-spin-slow rounded-full" style={{ border: "2px solid rgba(10,14,21,0.3)", borderTopColor: "var(--accent-ink)" }} /> : <Icon name="check" size={16} color="var(--accent-ink)" />}
            {pending ? "Saving…" : "Save scoring"}
          </button>
          {saved && !dirty && <span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "var(--pos)" }}><Icon name="check" size={15} color="var(--pos)" /> Saved</span>}
        </div>
      )}
    </div>
  );
}
