"use client";

import * as React from "react";
import { Avatar, Card, Chip, Flag, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";

export type DraftManager = { id: string; name: string; color: string; isYou: boolean };
export type DraftPick = { pickNumber: number; round: number; ownerId: string; code: string; flag: string; name: string };
export type DraftNation = { code: string; name: string; flag: string; group: string; owned: boolean; strength: number; points: number; ownerId: string | null };

function rating(n: DraftNation) {
  return n.owned ? n.points * 3 + 40 : n.strength;
}

// ── Snake board grid ──
function SnakeBoard({ managers, order, picks }: { managers: DraftManager[]; order: string[]; picks: DraftPick[] }) {
  const mById = new Map(managers.map((m) => [m.id, m]));
  // byRound[ownerId][roundIndex] = pick
  const byRound = new Map<string, Record<number, DraftPick>>();
  const counts: Record<string, number> = {};
  for (const p of [...picks].sort((a, b) => a.pickNumber - b.pickNumber)) {
    counts[p.ownerId] = counts[p.ownerId] ?? 0;
    const r = byRound.get(p.ownerId) ?? {};
    r[counts[p.ownerId]] = p;
    byRound.set(p.ownerId, r);
    counts[p.ownerId]++;
  }
  const cols = order;
  const numRounds = order.length ? Math.ceil(picks.length / order.length) : 0;

  return (
    <div>
      <div className="mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((id) => {
          const m = mById.get(id)!;
          return (
            <div key={id} className="flex flex-col items-center gap-1">
              <Avatar name={m.name} color={m.color} size={26} />
              <span className="text-[9.5px] font-bold" style={{ color: m.isYou ? "var(--accent)" : "var(--faint)" }}>{m.name}</span>
            </div>
          );
        })}
      </div>
      {Array.from({ length: numRounds }, (_, r) => (
        <div key={r} className="mb-1.5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
          {cols.map((id) => {
            const m = mById.get(id)!;
            const pick = byRound.get(id)?.[r];
            return (
              <div
                key={id}
                className="relative flex flex-col items-center gap-1"
                style={{
                  borderRadius: 12, padding: "8px 2px 6px",
                  background: m.isYou ? "rgba(198,255,58,0.09)" : "var(--surface)",
                  border: `1px solid ${m.isYou ? "rgba(198,255,58,0.25)" : "var(--line)"}`,
                }}
              >
                <span className="absolute left-1 top-0.5 text-[8px] font-bold" style={{ color: "var(--faint)" }}>{pick?.pickNumber}</span>
                <span className="flag" style={{ fontSize: 20, lineHeight: 1 }}>{pick?.flag}</span>
                <span className="text-[9px] font-extrabold tracking-wide">{pick?.code}</span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        <Icon name="swap" size={13} color="var(--faint)" />
        <span className="text-[11px]" style={{ color: "var(--faint)" }}>Custom order · {numRounds} rounds · {picks.length} picks</span>
      </div>
    </div>
  );
}

// ── Big board ──
function NationRow({ n, owner }: { n: DraftNation; owner?: DraftManager }) {
  return (
    <div className="flex items-center gap-3 border-b py-2.5 last:border-b-0" style={{ borderColor: "var(--line)" }}>
      <Flag flag={n.flag} size={34} />
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold">{n.name}</div>
        <div className="text-[11px]" style={{ color: "var(--faint)" }}>Group {n.group}{owner ? ` · ${owner.name}` : " · Free agent"}</div>
      </div>
      {n.owned ? <span className="display" style={{ fontSize: 20 }}>{n.points}</span>
        : <Chip tone="muted" style={{ fontSize: 10 }}>RTG {Math.round(n.strength)}</Chip>}
    </div>
  );
}

function BigBoard({ nations, managers }: { nations: DraftNation[]; managers: DraftManager[] }) {
  const [tab, setTab] = React.useState<"owned" | "free">("owned");
  const mById = new Map(managers.map((m) => [m.id, m]));
  const owned = nations.filter((n) => n.owned).sort((a, b) => b.points - a.points);
  const free = nations.filter((n) => !n.owned).sort((a, b) => b.strength - a.strength);
  const list = tab === "owned" ? owned : free;
  return (
    <div>
      <div className="mb-3 flex gap-1">
        {([["owned", `Drafted · ${owned.length}`], ["free", `On the board · ${free.length}`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="flex-1 rounded-full py-2 text-[12.5px] font-bold"
            style={{
              background: tab === k ? "var(--accent)" : "transparent",
              color: tab === k ? "var(--accent-ink)" : "var(--dim)",
              border: `1px solid ${tab === k ? "transparent" : "var(--line)"}`,
            }}
          >{label}</button>
        ))}
      </div>
      <Card style={{ padding: "2px 14px" }}>
        {list.map((n) => <NationRow key={n.code} n={n} owner={n.ownerId ? mById.get(n.ownerId) : undefined} />)}
      </Card>
    </div>
  );
}

// ── Mock draft (interactive snake) ──
function MockDraft({ managers, order, nations, rounds, onClose }: {
  managers: DraftManager[]; order: string[]; nations: DraftNation[]; rounds: number; onClose: () => void;
}) {
  const youId = managers.find((m) => m.isYou)?.id ?? order[0];
  const snake = React.useMemo(() => {
    const o: string[] = [];
    for (let r = 0; r < rounds; r++) {
      const row = r % 2 === 0 ? order : [...order].reverse();
      row.forEach((id) => o.push(id));
    }
    return o;
  }, [order, rounds]);

  const [pickIdx, setPickIdx] = React.useState(0);
  const [taken, setTaken] = React.useState<Record<string, string>>({});
  const [rosters, setRosters] = React.useState<Record<string, string[]>>(() => {
    const r: Record<string, string[]> = {};
    managers.forEach((m) => (r[m.id] = []));
    return r;
  });

  const finished = pickIdx >= snake.length;
  const current = finished ? null : snake[pickIdx];
  const isYou = current === youId;
  const round = Math.floor(pickIdx / managers.length) + 1;
  const mById = new Map(managers.map((m) => [m.id, m]));

  const available = React.useMemo(
    () => nations.filter((n) => !taken[n.code]).sort((a, b) => rating(b) - rating(a)),
    [nations, taken],
  );

  const makePick = React.useCallback((code: string, id: string) => {
    setTaken((t) => ({ ...t, [code]: id }));
    setRosters((r) => ({ ...r, [id]: [...r[id], code] }));
    setPickIdx((i) => i + 1);
  }, []);

  React.useEffect(() => {
    if (finished || isYou || !current) return;
    const avail = nations.filter((n) => !taken[n.code]).sort((a, b) => rating(b) - rating(a));
    const top = avail.slice(0, 3);
    const choice = top[Math.floor(Math.random() * top.length)] || avail[0];
    const t = setTimeout(() => choice && makePick(choice.code, current), 650);
    return () => clearTimeout(t);
  }, [pickIdx, finished, isYou, current, taken, nations, makePick]);

  const cur = current ? mById.get(current) : null;
  const nByCode = new Map(nations.map((n) => [n.code, n]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden"
        style={{ background: "var(--bg)", border: "1px solid var(--line-strong)", borderRadius: 20 }}
      >
        <div className="border-b p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="display" style={{ fontSize: 20 }}>Mock Draft</span>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ border: "1px solid var(--line)", background: "var(--chip-bg)", color: "var(--dim)" }}>
              <Icon name="close" size={15} />
            </button>
          </div>
          {!finished ? (
            <div className="flex items-center gap-3" style={{ background: isYou ? "var(--accent)" : "var(--surface-2)", border: `1px solid ${isYou ? "transparent" : "var(--line)"}`, borderRadius: 12, padding: "10px 13px" }}>
              <Avatar name={cur!.name} color={cur!.color} size={32} ring={isYou} />
              <div className="flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: isYou ? "rgba(10,14,21,0.6)" : "var(--faint)" }}>Pick {pickIdx + 1} of {snake.length} · Round {round}</div>
                <div className="text-[16px] font-extrabold" style={{ color: isYou ? "var(--accent-ink)" : "var(--text)" }}>{isYou ? "You're on the clock" : `${cur!.name} is picking…`}</div>
              </div>
              {!isYou && <div className="h-[18px] w-[18px] animate-spin-slow rounded-full" style={{ border: "2px solid var(--line)", borderTopColor: "var(--dim)" }} />}
            </div>
          ) : (
            <div className="flex items-center gap-2.5" style={{ background: "var(--accent)", borderRadius: 12, padding: "12px 14px" }}>
              <Icon name="check" size={20} color="var(--accent-ink)" />
              <span className="text-[15px] font-extrabold" style={{ color: "var(--accent-ink)" }}>Draft complete — here&apos;s your squad</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {finished ? (
            <div>
              <SectionLabel>Your nations</SectionLabel>
              <Card style={{ padding: "2px 14px" }}>
                {rosters[youId].map((code, i) => {
                  const n = nByCode.get(code)!;
                  return (
                    <div key={code} className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{ borderColor: "var(--line)" }}>
                      <Flag flag={n.flag} size={36} />
                      <div className="flex-1">
                        <div className="text-[14.5px] font-bold">{n.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--faint)" }}>Group {n.group}</div>
                      </div>
                      <Chip tone="muted">R{i + 1}</Chip>
                    </div>
                  );
                })}
              </Card>
              <button onClick={onClose} className="mt-4 w-full rounded-[12px] py-3.5 text-[15px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>Done</button>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-1.5 rounded-[12px] px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: "var(--faint)" }}>Your squad</span>
                {Array.from({ length: rounds }, (_, i) => {
                  const code = rosters[youId][i];
                  return code
                    ? <span key={i} className="flag" style={{ fontSize: 20 }}>{nByCode.get(code)!.flag}</span>
                    : <span key={i} className="rounded-[7px]" style={{ width: 22, height: 22, border: "1.5px dashed var(--line-strong)" }} />;
                })}
              </div>
              <SectionLabel right={isYou ? <Chip tone="accent">Tap to draft</Chip> : undefined}>Best available</SectionLabel>
              <div className="grid grid-cols-2 gap-2" style={{ opacity: isYou ? 1 : 0.55, pointerEvents: isYou ? "auto" : "none" }}>
                {available.slice(0, 18).map((n) => (
                  <button key={n.code} onClick={() => makePick(n.code, youId)} className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2.5 text-left" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                    <span className="flag" style={{ fontSize: 20 }}>{n.flag}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{n.name}</span>
                    {isYou && <Icon name="plus" size={14} color="var(--accent)" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function DraftClient({ managers, order, picks, nations }: {
  managers: DraftManager[]; order: string[]; picks: DraftPick[]; nations: DraftNation[];
}) {
  const [view, setView] = React.useState<"board" | "big">("board");
  const [mock, setMock] = React.useState(false);
  const rounds = managers.length ? Math.round(picks.length / managers.length) : 4;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>Custom draft · {rounds} rounds</div>
          <h1 className="display" style={{ fontSize: 30 }}>The Draft</h1>
        </div>
        <button onClick={() => setMock(true)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          <Icon name="bolt" size={14} color="var(--accent-ink)" /> Mock draft
        </button>
      </div>

      <div className="flex max-w-[360px] gap-1 rounded-full p-1" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        {([["board", "Draft board", "grid"], ["big", "Big board", "list"]] as const).map(([k, label, icon]) => (
          <button key={k} onClick={() => setView(k)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold" style={{ background: view === k ? "var(--accent)" : "transparent", color: view === k ? "var(--accent-ink)" : "var(--dim)" }}>
            <Icon name={icon as "grid" | "list"} size={14} color={view === k ? "var(--accent-ink)" : "var(--dim)"} /> {label}
          </button>
        ))}
      </div>

      {view === "board" ? (
        <Card style={{ padding: 14, maxWidth: 760 }}>
          <SnakeBoard managers={managers} order={order} picks={picks} />
        </Card>
      ) : (
        <div className="max-w-[640px]"><BigBoard nations={nations} managers={managers} /></div>
      )}

      {mock && <MockDraft managers={managers} order={order} nations={nations} rounds={rounds} onClose={() => setMock(false)} />}
    </div>
  );
}
