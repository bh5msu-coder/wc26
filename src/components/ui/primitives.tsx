import * as React from "react";
import { groupColor } from "@/lib/groups";

/** Color-coded World Cup group pill, e.g. a tinted "A". */
export function GroupChip({ group, fontSize = 11 }: { group: string; fontSize?: number }) {
  const c = groupColor(group);
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap font-bold"
      style={{ padding: "2px 7px", borderRadius: 999, background: `${c}22`, color: c, fontSize, lineHeight: 1, letterSpacing: "0.02em" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c }} />
      {(group ?? "").toUpperCase()}
    </span>
  );
}

/** Tiny color-coded group dot for compact rows. */
export function GroupDot({ group, size = 8 }: { group: string; size?: number }) {
  return <span title={`Group ${group}`} className="shrink-0" style={{ width: size, height: size, borderRadius: 999, background: groupColor(group), display: "inline-block" }} />;
}

/** Flag tile — emoji flag in a rounded chip with consistent sizing. */
export function Flag({ flag, size = 30, radius }: { flag: string; size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.32);
  return (
    <div
      className="flag flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        width: size, height: size, borderRadius: r, fontSize: size * 0.62, lineHeight: 1,
        background: "var(--chip-bg)", border: "1px solid var(--line)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      <span style={{ filter: "saturate(1.05)" }}>{flag || "🏳️"}</span>
    </div>
  );
}

/** Manager avatar — initials in a tinted disc. */
export function Avatar({
  name, color, size = 34, ring = false,
}: { name: string; color: string; size?: number; ring?: boolean }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length === 1
      ? parts[0].slice(0, 2).toUpperCase()
      : parts.map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center font-extrabold"
      style={{
        width: size, height: size, borderRadius: size, background: color, color: "#0A0E15",
        fontFamily: "var(--font-body)", fontSize: size * 0.36, letterSpacing: "0.02em",
        boxShadow: ring ? `0 0 0 2px var(--bg), 0 0 0 4px ${color}` : "none",
      }}
    >
      {initials}
    </div>
  );
}

type Tone = "pos" | "accent" | "gold" | "live" | "muted" | "accent2";
const TONES: Record<Tone, { bg: string; fg: string }> = {
  pos: { bg: "rgba(52,226,155,0.14)", fg: "var(--pos)" },
  accent: { bg: "rgba(198,255,58,0.14)", fg: "var(--accent)" },
  accent2: { bg: "rgba(59,134,255,0.16)", fg: "var(--accent-2)" },
  gold: { bg: "rgba(255,200,61,0.16)", fg: "var(--gold)" },
  live: { bg: "rgba(255,92,114,0.16)", fg: "var(--neg)" },
  muted: { bg: "var(--chip-bg)", fg: "var(--dim)" },
};

export function Chip({
  children, tone = "muted", className, style,
}: { children: React.ReactNode; tone?: Tone; className?: string; style?: React.CSSProperties }) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap font-bold ${className ?? ""}`}
      style={{
        padding: "3px 9px", borderRadius: 999, background: t.bg, color: t.fg,
        fontSize: 11.5, letterSpacing: "0.02em", lineHeight: 1, ...style,
      }}
    >
      {children}
    </span>
  );
}

export function LiveDot() {
  return (
    <span className="relative inline-flex" style={{ width: 8, height: 8 }}>
      <span className="absolute inset-0 animate-live-pulse rounded-full" style={{ background: "var(--neg)" }} />
      <span className="absolute rounded-full" style={{ inset: 1.5, background: "var(--neg)" }} />
    </span>
  );
}

export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: "0 2px 10px" }}>
      <div
        className="font-bold uppercase"
        style={{ fontSize: 12.5, letterSpacing: "0.08em", color: "var(--faint)" }}
      >
        {children}
      </div>
      {right}
    </div>
  );
}

export function Card({
  children, className, style, pad = true,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties; pad?: boolean }) {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 18,
        padding: pad ? 16 : 0, ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Big display number used across hero + stat blocks. */
export function Stat({ value, label, size = 40, color = "var(--text)" }: { value: React.ReactNode; label?: string; size?: number; color?: string }) {
  return (
    <div className="text-right leading-none">
      <div className="display" style={{ fontSize: size, color }}>{value}</div>
      {label && (
        <div
          className="font-bold uppercase"
          style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--faint)", marginTop: 3 }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
