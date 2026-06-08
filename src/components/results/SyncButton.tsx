"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { syncResultsNow } from "@/server/actions";
import { Icon } from "@/components/ui/Icon";

export function SyncButton({ poolId }: { poolId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  const sync = () => {
    setMsg(null);
    startTransition(async () => {
      try {
        const r = await syncResultsNow(poolId);
        setMsg(`Updated ${r.updated} nation${r.updated === 1 ? "" : "s"} from ${r.matches} matches.`);
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Sync failed.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={sync}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold disabled:opacity-50"
        style={{ background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--line)" }}
      >
        {pending
          ? <span className="h-3.5 w-3.5 animate-spin-slow rounded-full" style={{ border: "2px solid var(--line)", borderTopColor: "var(--dim)" }} />
          : <Icon name="swap" size={13} color="var(--dim)" />}
        {pending ? "Syncing…" : "Sync results"}
      </button>
      {msg && <span className="text-[10.5px]" style={{ color: "var(--faint)" }}>{msg}</span>}
    </div>
  );
}
