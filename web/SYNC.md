# WB26WC — Cloud Sync (Tier B, Supabase)

Cloud sync lets all 8 managers share the **same results & draft** live across
their phones. It's **opt-in**, **off by default**, and the app works fully
without it (local-only, plus the no-account "Share link & code" flow).

## What syncs (and what doesn't)

| Synced (shared) | Never synced (local per-device) |
|---|---|
| `results` (entered match scores) | `currentUserId` ("who am I") |
| `draftPicks`, `draftSeedVersion` | `settings` (seed, runs, reduce-motion) |

Only non-personal game data leaves the device. Your identity is always local.

**Conflict policy:** per-match **last-write-wins** via a deterministic merge
(incoming results win per match; locally-only matches are preserved). The pool
row's `updated_at` is the version. Fully **offline-first**: edits queue locally
and flush on reconnect/focus; realtime + focus/visibility pulls keep devices current.

## Enable it (one-time, ~5 minutes)

### 1. Create a Supabase project
<https://supabase.com> → New project (free tier is ample for 8 users). Note the
**Project URL** and the **anon public key** (Project Settings → API).

### 2. Create the table + policies
SQL Editor → run:

```sql
create table public.pools (
  id          text primary key,
  passcode    text,
  shared      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.pools enable row level security;

-- Anyone with the (hard-to-guess) pool id may read/insert/update. No personal
-- data is stored. Tighten later if you want stricter rules.
create policy "anon read"   on public.pools for select using (true);
create policy "anon insert" on public.pools for insert with check (true);
create policy "anon update" on public.pools for update using (true) with check (true);

-- Realtime updates
alter publication supabase_realtime add table public.pools;
```

### 3. Set env vars in Vercel
`wilboi_world_cup` project → Settings → Environment Variables (the `web` root):

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

Redeploy. (`VITE_*` vars are inlined at build time. With them set, a ~55 KB-gzip
Supabase chunk is **lazy-loaded only when someone enables sync**; without them,
it's tree-shaken out completely.)

### 4. Use it
Settings → **Cloud sync** → **Create pool** (optional passcode). Share the pool
**ID** with the group; they tap **Join pool** and paste it. Status shows
*Synced / Syncing / Offline / Not connected* with a last-synced time. **Leave
pool** disconnects.

## Security & privacy notes

- Pool IDs are 14 random unambiguous chars (~72 bits) — not enumerable.
- The optional passcode is checked **client-side** (convenience, not a hard
  server gate). For non-sensitive game data among friends this is fine; if you
  want server-enforced passcodes, move the check into a Supabase RPC/policy.
- The anon key is public by design; RLS is the access boundary. No emails,
  names, or device identifiers are stored — only match scores and draft picks.
- Stored server-side: one row per pool — `{ id, passcode?, shared, updated_at }`.
