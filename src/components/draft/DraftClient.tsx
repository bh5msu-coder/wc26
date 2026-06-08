"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Card, Chip, Flag, SectionLabel } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/Icon";
import { draftNation } from "@/server/actions";

export type DraftManager = { id: string; name: string; color: string; isYou: boolean };
export type DraftPick = { pickNumber: number; round: number; ownerId: string; code: string; flag: string; name: string };
export type DraftNation = { code: string; name: string; flag: string; group: string; owned: boolean; strength: number; points: number; ownerId: string | null };

function rating(n: DraftNation) {
  return n.owned ? n.points * 3 + 40 : n.strength;
}

// ── Custom-order board grid ──
function SnakeBoard({ managers, order, picks }: { managers: DraftManager[]; order: string[]; picks: DraftPick[] }) {
  const mById = new Map(managers.map((m) => [m.id, m]));
  const memberCount = managers.length || 1;
  const cols = order.slice(0, memberCount); // round-1 order = column order

  // each manager's overall pick numbers, in order
  const slotsByManager = new Map<string, number[]>();
  order.forEach((id, i) => {
    const arr = slotsByManager.get(id) ?? [];
    arr.push(i + 1);
    slotsByManager.set(id, arr);
  });
  const numRounds = Math.max(0, ...Array.from(slotsByManager.values(), (a) => a.length));
  const pickByNumber = new Map(picks.map((p) => [p.pickNumber, p]));

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
            const pickNumber = slotsByManager.get(id)?.[r];
            const pick = pickNumber != null ? pickByNumber.get(pickNumber) : undefined;
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
                <span className="absolute left-1 top-0.5 text-[8px] font-bold" style={{ color: "var(--faint)" }}>{pickNumber}</span>
                {pick ? (
                  <>
                    <span className="flag" style={{ fontSize: 20, lineHeight: 1 }}>{pick.flag}</span>
                    <span className="text-[9px] font-extrabold tracking-wide">{pick.code}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 18, lineHeight: 1, color: "var(--line-strong)" }}>·</span>
                    <span className="text-[9px] font-extrabold tracking-wide" style={{ color: "var(--faint)" }}>—</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        <Icon name="swap" size={13} color="var(--faint)" />
        <span className="text-[11px]" style={{ color: "var(--faint)" }}>Custom order · {numRounds} rounds · {order.length} picks</span>
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
  // `order` is already the full overall-pick sequence (custom order).
  const snake = order;

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

// ── Live draft control ──
function DraftControl({
  managers, nations, order, poolId, youId, onClockId, picksMade, totalPicks,
}: {
  managers: DraftManager[]; nations: DraftNation[]; order: string[]; poolId: string;
  youId: string | null; onClockId: string | null; picksMade: number; totalPicks: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const complete = onClockId == null;
  const yourTurn = !!youId && onClockId === youId;
  const onClock = managers.find((m) => m.id === onClockId);
  const available = React.useMemo(
    () => nations.filter((n) => !n.owned).sort((a, b) => b.strength - a.strength),
    [nations],
  );

  // your next upcoming pick, and how many picks away it is
  const nextIdx = youId ? order.findIndex((id, i) => i >= picksMade && id === youId) : -1;
  const picksAway = nextIdx >= 0 ? nextIdx - picksMade : -1;

  // While it's someone else's turn, poll so your turn appears without a reload.
  React.useEffect(() => {
    if (complete || yourTurn) return;
    const t = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(t);
  }, [complete, yourTurn, router]);

  const draft = (code: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await draftNation(poolId, code);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not draft that nation.");
      }
    });
  };

  const bannerBg = yourTurn ? "var(--accent)" : "var(--surface-2)";
  const bannerInk = yourTurn ? "var(--accent-ink)" : "var(--text)";
  const label = complete
    ? `Draft complete — all ${totalPicks} picks made`
    : yourTurn
      ? `You're on the clock · Pick ${picksMade + 1} of ${totalPicks}`
      : `${onClock?.name ?? "—"} is on the clock · Pick ${picksMade + 1} of ${totalPicks}`;

  return (
    <Card style={{ padding: 16, maxWidth: 760 }}>
      <div className="flex items-center gap-3" style={{ background: bannerBg, border: `1px solid ${yourTurn ? "transparent" : "var(--line)"}`, borderRadius: 12, padding: "11px 14px" }}>
        {onClock && !complete && <Avatar name={onClock.name} color={onClock.color} size={30} ring={yourTurn} />}
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-extrabold" style={{ color: bannerInk }}>{label}</div>
          {!complete && !yourTurn && (
            <div className="mt-0.5 text-[11.5px] font-semibold" style={{ color: "var(--faint)" }}>
              {nextIdx === -1 ? "You have no more picks" : `Your next pick: #${nextIdx + 1} · ${picksAway} away`}
            </div>
          )}
        </div>
        {pending && <div className="h-[18px] w-[18px] animate-spin-slow rounded-full" style={{ border: "2px solid rgba(10,14,21,0.25)", borderTopColor: yourTurn ? "var(--accent-ink)" : "var(--dim)" }} />}
      </div>

      {error && <div className="mt-3 rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: "rgba(255,92,114,0.14)", color: "var(--neg)" }}>{error}</div>}

      {yourTurn && (
        <div className="mt-4">
          <SectionLabel>Pick a nation · best available first</SectionLabel>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {available.map((n) => (
              <button
                key={n.code}
                disabled={pending}
                onClick={() => draft(n.code)}
                className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2.5 text-left disabled:opacity-50"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
              >
                <span className="flag" style={{ fontSize: 20 }}>{n.flag}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{n.name}</span>
                <Chip tone="muted" style={{ fontSize: 10 }}>{Math.round(n.strength)}</Chip>
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Sequential draft order list ──
function OrderList({ managers, order, picks, youId }: {
  managers: DraftManager[]; order: string[]; picks: DraftPick[]; youId: string | null;
}) {
  const mById = new Map(managers.map((m) => [m.id, m]));
  const pickByNumber = new Map(picks.map((p) => [p.pickNumber, p]));
  const picksMade = picks.length;
  const complete = picksMade >= order.length;
  const currentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [picksMade]);

  // per-manager pick count, to label each slot as that manager's Round N
  const roundCounter: Record<string, number> = {};

  return (
    <Card style={{ padding: "5px 7px", maxWidth: 520 }}>
      <div className="flex max-h-[70vh] flex-col overflow-y-auto">
        {order.map((id, i) => {
          const pickNumber = i + 1;
          roundCounter[id] = (roundCounter[id] ?? 0) + 1;
          const r = roundCounter[id];
          const m = mById.get(id);
          const pick = pickByNumber.get(pickNumber);
          const done = !!pick;
          const isCurrent = !complete && i === picksMade;
          const isYou = id === youId;
          const ink = isCurrent ? "var(--accent-ink)" : "var(--text)";
          return (
            <div
              key={i}
              ref={isCurrent ? currentRef : undefined}
              className="flex items-center gap-3 rounded-[10px] px-2.5 py-2"
              style={{
                background: isCurrent ? "var(--accent)" : isYou ? "rgba(198,255,58,0.08)" : "transparent",
                border: `1px solid ${isCurrent ? "transparent" : isYou ? "rgba(198,255,58,0.22)" : "transparent"}`,
                opacity: done ? 0.55 : 1,
                marginBottom: 2,
              }}
            >
              <span className="w-7 text-center display" style={{ fontSize: 15, color: isCurrent ? "var(--accent-ink)" : "var(--faint)" }}>{pickNumber}</span>
              <Avatar name={m?.name ?? "?"} color={m?.color ?? "#888"} size={26} ring={isCurrent} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold" style={{ color: ink }}>
                  {m?.name ?? "—"}{isYou ? " · you" : ""}
                </div>
                <div className="text-[10.5px]" style={{ color: isCurrent ? "rgba(10,14,21,0.6)" : "var(--faint)" }}>Round {r}</div>
              </div>
              {done ? (
                <div className="flex items-center gap-1.5">
                  <span className="flag" style={{ fontSize: 18 }}>{pick!.flag}</span>
                  <span className="text-[11px] font-extrabold">{pick!.code}</span>
                </div>
              ) : isCurrent ? (
                <span className="text-[10.5px] font-extrabold uppercase tracking-wide" style={{ color: "var(--accent-ink)" }}>On the clock</span>
              ) : (
                <Icon name="clock" size={14} color="var(--faint)" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function DraftClient({ managers, order, picks, nations, rounds, poolId, youId, onClockId }: {
  managers: DraftManager[]; order: string[]; picks: DraftPick[]; nations: DraftNation[]; rounds: number;
  poolId: string; youId: string | null; onClockId: string | null;
}) {
  const [view, setView] = React.useState<"board" | "order" | "big">("board");
  const [mock, setMock] = React.useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>Custom draft · {rounds} rounds</div>
          <h1 className="display" style={{ fontSize: 30 }}>The Draft</h1>
        </div>
        <button onClick={() => setMock(true)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[12.5px] font-extrabold" style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}>
          <Icon name="bolt" size={14} color="var(--dim)" /> Mock draft
        </button>
      </div>

      <DraftControl
        managers={managers}
        nations={nations}
        order={order}
        poolId={poolId}
        youId={youId}
        onClockId={onClockId}
        picksMade={picks.length}
        totalPicks={order.length}
      />

      <div className="flex max-w-[460px] gap-1 rounded-full p-1" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        {([["board", "Grid", "grid"], ["order", "Order", "list"], ["big", "Big board", "cards"]] as const).map(([k, label, icon]) => (
          <button key={k} onClick={() => setView(k)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold" style={{ background: view === k ? "var(--accent)" : "transparent", color: view === k ? "var(--accent-ink)" : "var(--dim)" }}>
            <Icon name={icon} size={14} color={view === k ? "var(--accent-ink)" : "var(--dim)"} /> {label}
          </button>
        ))}
      </div>

      {view === "board" ? (
        <Card style={{ padding: 14, maxWidth: 760 }}>
          <SnakeBoard managers={managers} order={order} picks={picks} />
        </Card>
      ) : view === "order" ? (
        <OrderList managers={managers} order={order} picks={picks} youId={youId} />
      ) : (
        <div className="max-w-[640px]"><BigBoard nations={nations} managers={managers} /></div>
      )}

      {mock && <MockDraft managers={managers} order={order} nations={nations} rounds={rounds} onClose={() => setMock(false)} />}
    </div>
  );
}
