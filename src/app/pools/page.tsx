import Link from "next/link";
import { requireUserId } from "@/lib/session";
import { listPoolsForUser } from "@/server/pools";
import { createPool, joinPool } from "@/server/pool-actions";
import { Icon } from "@/components/ui/Icon";
import { Card, Chip } from "@/components/ui/primitives";

export default async function PoolsPage() {
  const userId = await requireUserId();
  const pools = await listPoolsForUser(userId);

  return (
    <div className="mx-auto max-w-[760px] px-6 py-10">
      <header className="mb-9 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: "var(--accent)" }}>
            <Icon name="trophy" size={20} color="var(--accent-ink)" />
          </div>
          <span className="display" style={{ fontSize: 22 }}>WC26</span>
        </div>
        <Link href="/api/auth/signout" className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "var(--dim)" }}>
          <Icon name="logout" size={16} color="var(--dim)" /> Sign out
        </Link>
      </header>

      <h1 className="display" style={{ fontSize: 34 }}>Your pools</h1>
      <p className="mt-1.5 text-[14px]" style={{ color: "var(--dim)" }}>Jump back into a draft pool or start a new one.</p>

      <div className="mt-7 flex flex-col gap-3">
        {pools.length === 0 && (
          <Card style={{ padding: 20 }}>
            <div className="text-[14px]" style={{ color: "var(--dim)" }}>You&apos;re not in a pool yet. Create one or join with an invite code.</div>
          </Card>
        )}
        {pools.map((p) => (
          <Link key={p.id} href={`/pools/${p.id}`}>
            <Card style={{ padding: "16px 18px" }} className="flex items-center gap-4 transition-colors hover:border-[var(--line-strong)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[13px]" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}>
                <Icon name="trophy" size={22} color="var(--accent)" />
              </div>
              <div className="flex-1">
                <div className="text-[17px] font-extrabold">{p.name}</div>
                <div className="text-[12.5px]" style={{ color: "var(--faint)" }}>{p.season} · {p.members} managers</div>
              </div>
              {p.role === "COMMISSIONER" && <Chip tone="gold" style={{ fontSize: 10 }}>COMMISH</Chip>}
              <Icon name="chevron" size={18} color="var(--faint)" />
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <Card style={{ padding: 18 }}>
          <div className="mb-3 text-[13px] font-extrabold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Create a pool</div>
          <form action={createPool} className="flex flex-col gap-2.5">
            <input name="name" placeholder="Pool name" required className="rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)" }} />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-[14px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
              <Icon name="plus" size={15} color="var(--accent-ink)" /> Create
            </button>
          </form>
        </Card>
        <Card style={{ padding: 18 }}>
          <div className="mb-3 text-[13px] font-extrabold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Join with a code</div>
          <form action={joinPool} className="flex flex-col gap-2.5">
            <input name="inviteCode" placeholder="Invite code" required className="rounded-[10px] px-3.5 py-2.5 text-[14px] outline-none" style={{ background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)" }} />
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-[10px] py-2.5 text-[14px] font-bold" style={{ border: "1px solid var(--line)", color: "var(--text)" }}>
              <Icon name="users" size={15} color="var(--dim)" /> Join
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
