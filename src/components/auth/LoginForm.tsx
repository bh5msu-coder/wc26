"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Icon } from "@/components/ui/Icon";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || params.get("from") || "/pools";

  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", { email, redirect: false });
    setPending(false);
    if (res?.error) {
      setError("We couldn't find an account for that email.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  const field = "w-full rounded-[12px] px-4 py-3 text-[15px] outline-none";
  const fieldStyle: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--line)", color: "var(--text)" };

  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-7 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: "var(--accent)" }}>
          <Icon name="trophy" size={20} color="var(--accent-ink)" />
        </div>
        <span className="display" style={{ fontSize: 22 }}>WC26</span>
      </div>

      <h1 className="display" style={{ fontSize: 34 }}>Welcome back</h1>
      <p className="mt-1.5 text-[14px]" style={{ color: "var(--dim)" }}>Enter your email to sign in to your draft pool.</p>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold uppercase tracking-wide" style={{ color: "var(--faint)" }}>Email</span>
          <input className={field} style={fieldStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@wc26.app" required />
        </label>

        {error && <div className="rounded-[10px] px-3.5 py-2.5 text-[13px] font-semibold" style={{ background: "rgba(255,92,114,0.14)", color: "var(--neg)" }}>{error}</div>}

        <button type="submit" disabled={pending} className="mt-1 inline-flex items-center justify-center gap-2 rounded-[12px] py-3.5 text-[15px] font-extrabold disabled:opacity-50" style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
          {pending ? <span className="h-4 w-4 animate-spin-slow rounded-full" style={{ border: "2px solid rgba(10,14,21,0.3)", borderTopColor: "var(--accent-ink)" }} /> : <Icon name="bolt" size={16} color="var(--accent-ink)" />}
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
