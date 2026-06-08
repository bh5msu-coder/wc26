import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import { Icon } from "@/components/ui/Icon";

export default async function Home() {
  const userId = await getUserId();
  if (userId) redirect("/pools");

  return (
    <div className="relative mx-auto flex min-h-screen max-w-app flex-col px-6 py-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: "var(--accent)" }}>
            <Icon name="trophy" size={20} color="var(--accent-ink)" />
          </div>
          <span className="display" style={{ fontSize: 22 }}>WC26</span>
        </div>
        <Link href="/login" className="rounded-full px-4 py-2 text-[13px] font-bold" style={{ border: "1px solid var(--line)", color: "var(--text)" }}>Sign in</Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5" style={{ background: "var(--chip-bg)", border: "1px solid var(--line)" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--neg)" }} />
          <span className="text-[12px] font-bold" style={{ color: "var(--dim)" }}>Quarter-finals are live</span>
        </div>
        <h1 className="display max-w-[16ch]" style={{ fontSize: "clamp(44px, 8vw, 92px)", lineHeight: 0.95 }}>
          Draft your nations.<br />Win the World Cup pool.
        </h1>
        <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed" style={{ color: "var(--dim)" }}>
          Snake-draft your squad with friends, then score every goal, clean sheet and knockout run all the way to the final in New York/New Jersey — with a live Monte&nbsp;Carlo predictor calling the title race.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-[12px] px-6 py-3.5 text-[15px] font-extrabold" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            <Icon name="bolt" size={17} color="var(--accent-ink)" /> Enter your pool
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 rounded-[12px] px-6 py-3.5 text-[15px] font-bold" style={{ border: "1px solid var(--line)" }}>
            How it works <Icon name="chevron" size={15} color="var(--dim)" />
          </a>
        </div>

        <div id="how" className="mt-20 grid w-full max-w-[820px] gap-4 text-left sm:grid-cols-3">
          {[
            { icon: "swap" as const, title: "Draft your board", body: "A custom draft order for your whole group. Pick the nations you believe in." },
            { icon: "ball" as const, title: "Score every match", body: "Wins, goals, clean sheets and knockout bonuses stack up live." },
            { icon: "dice" as const, title: "Predict the race", body: "Monte Carlo sims project win odds from the live bracket." },
          ].map((f) => (
            <div key={f.title} className="rounded-[16px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <Icon name={f.icon} size={22} color="var(--accent)" />
              <div className="mt-3 text-[16px] font-extrabold">{f.title}</div>
              <div className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--dim)" }}>{f.body}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
