"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/primitives";

type NavItem = { seg: string; label: string; icon: IconName };
const ITEMS: NavItem[] = [
  { seg: "", label: "Table", icon: "trophy" },
  { seg: "draft", label: "Draft", icon: "swap" },
  { seg: "squad", label: "Squad", icon: "shield" },
  { seg: "teams", label: "Teams", icon: "users" },
  { seg: "fixtures", label: "Fixtures", icon: "calendar" },
  { seg: "bracket", label: "Bracket", icon: "ko" },
  { seg: "predictions", label: "Predictions", icon: "dice" },
  { seg: "scoring", label: "Scoring", icon: "info" },
];

export function AppNav({
  poolId, poolName, stageLabel, you, children,
}: {
  poolId: string;
  poolName: string;
  stageLabel: string;
  you: { name: string; color: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/pools/${poolId}`;
  const isActive = (seg: string) => {
    const href = seg ? `${base}/${seg}` : base;
    return seg ? pathname.startsWith(href) : pathname === base;
  };

  return (
    <div className="min-h-screen md:flex">
      {/* ── Desktop sidebar ── */}
      <aside
        className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col justify-between border-r p-5 md:flex"
        style={{ borderColor: "var(--line)", background: "rgba(10,14,21,0.6)" }}
      >
        <div>
          <Link href="/pools" className="mb-7 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: "var(--accent)" }}>
              <Icon name="trophy" size={20} color="var(--accent-ink)" />
            </div>
            <div className="display leading-none" style={{ fontSize: 22 }}>WC26</div>
          </Link>

          <div className="mb-1 px-2 text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color: "var(--faint)" }}>
            {stageLabel}
          </div>
          <div className="mb-5 px-2 display" style={{ fontSize: 20 }}>{poolName}</div>

          <nav className="flex flex-col gap-1">
            {ITEMS.map((it) => {
              const active = isActive(it.seg);
              return (
                <Link
                  key={it.seg}
                  href={it.seg ? `${base}/${it.seg}` : base}
                  className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    border: `1px solid ${active ? "var(--line)" : "transparent"}`,
                    color: active ? "var(--text)" : "var(--dim)",
                  }}
                >
                  <Icon name={it.icon} size={19} color={active ? "var(--accent)" : "var(--faint)"} strokeWidth={active ? 2.1 : 1.7} />
                  <span className="text-[14px] font-bold">{it.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center justify-between rounded-[14px] p-3" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2.5">
            <Avatar name={you.name} color={you.color} size={32} />
            <div className="text-[13px] font-bold">{you.name}</div>
          </div>
          <Link href="/api/auth/signout" className="opacity-60 hover:opacity-100" aria-label="Sign out">
            <Icon name="logout" size={18} color="var(--dim)" />
          </Link>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur md:hidden"
          style={{ borderColor: "var(--line)", background: "rgba(10,14,21,0.82)" }}
        >
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: "var(--faint)" }}>{stageLabel}</div>
            <div className="display" style={{ fontSize: 20 }}>{poolName}</div>
          </div>
          <Avatar name={you.name} color={you.color} size={32} />
        </header>

        <main className="mx-auto w-full max-w-app flex-1 px-4 pb-28 pt-5 md:px-8 md:pt-8 md:pb-12">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 flex items-start justify-around border-t px-1.5 pb-6 pt-2 backdrop-blur md:hidden"
          style={{ borderColor: "var(--line)", background: "rgba(10,14,21,0.86)" }}
        >
          {ITEMS.map((it) => {
            const active = isActive(it.seg);
            return (
              <Link
                key={it.seg}
                href={it.seg ? `${base}/${it.seg}` : base}
                className="flex flex-1 flex-col items-center gap-1 py-0.5"
              >
                <Icon name={it.icon} size={21} color={active ? "var(--accent)" : "var(--faint)"} strokeWidth={active ? 2.1 : 1.7} />
                <span className="text-[9.5px] font-bold" style={{ color: active ? "var(--text)" : "var(--faint)" }}>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
