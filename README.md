# WC26 — World Cup Draft Pool

A fantasy **World Cup 2026 draft pool**. A group of managers drafts a squad of nations each,
then scores every match — wins, goals, clean sheets and knockout runs — all the way to the
final. Includes a live **Monte Carlo predictor** that projects the title race from the
current bracket.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + Auth.js**,
ready to deploy to **Vercel** with a Postgres database.

> This repo was generated from a hi-fi HTML prototype. The shipped theme is
> **“Broadcast”** (dark, neon-lime). See **`/preview`** for a self-contained,
> no-build HTML reference of the production web layout — open
> `preview/WC26 Web Preview.html` in any browser to see the design and a working
> simulator without installing anything.

---

## Features

| Screen | Route | What it does |
|---|---|---|
| **Table** | `/pools/[id]` | Hero card for your standing, full standings, live scoring feed |
| **Draft** | `/pools/[id]/draft` | Custom-order draft board + big board + interactive mock-draft simulator |
| **Squad** | `/pools/[id]/squad` | Every manager's four nations with a per-nation point breakdown |
| **Fixtures** | `/pools/[id]/fixtures` | Knockout fixtures (live / upcoming / final), pool-owned nations flagged |
| **Predictions** | `/pools/[id]/predictions` | **Monte Carlo** title odds, champion odds, projected scores + ranges |
| **Scoring** | `/pools/[id]/scoring` | Scoring rules — commissioner can tune weights; everything recomputes |

Plus: passwordless email auth (+ optional GitHub OAuth), **multiple pools** per user,
create-a-pool and join-by-invite-code.

---

## Architecture

```
src/
  app/
    layout.tsx              Root layout, loads Anton + Archivo fonts
    globals.css             Design tokens (Broadcast theme) as CSS variables
    page.tsx                Marketing landing (redirects to /pools if signed in)
    login/page.tsx          Sign-in
    pools/page.tsx          Pool list + create/join
    pools/[poolId]/
      layout.tsx            App shell (responsive sidebar + tab bar)
      page.tsx              Table
      draft|squad|fixtures|predictions|scoring/page.tsx
    api/auth/[...nextauth]/route.ts
  auth.config.ts            Edge-safe Auth.js config (used by middleware)
  auth.ts                   Full Auth.js (Prisma adapter + Credentials) — Node only
  middleware.ts             Gates /pools/** behind a session
  components/               Presentational + client components (ui, nav, leaderboard, draft, predictions, scoring, auth)
  lib/
    db.ts                   Prisma client singleton
    types.ts                Shared domain types
    scoring.ts              Point model (parameterised by pool weights)
    simulate.ts             Monte Carlo tournament engine
    session.ts              requireUserId() / getUserId()
  server/
    pools.ts                Data access — builds the computed PoolView
    actions.ts              updateScoring server action (commissioner-only)
    pool-actions.ts         createPool / joinPool server actions
prisma/
  schema.prisma            Postgres schema (Auth.js + tournament + pool models)
  seed-data.ts             Canonical demo universe (8 managers, 48 picks, all 48 nations, fixtures)
  seed.ts                  Seeds DB and prints demo logins
preview/                   No-build HTML reference of the production web design
```

### How scoring works
Each drafted nation earns, per the pool's editable weights (defaults in parentheses):
`win (3) · draw (1) · goal (1) · clean sheet (1) · knockout-win bonus (1) · champion (1)`.
A manager's total is the sum across their drafted nations. See `src/lib/scoring.ts`.

### How the Monte Carlo predictor works (`src/lib/simulate.ts`)
Projects the live knockout bracket forward `N` times (default 10,000). Each match is two
independent **Poisson** goal counts whose rates depend on the strength gap; ties are broken
by a strength-weighted penalty shootout so a knockout always has a winner. Every simulated
result is scored with the pool's weights and added to each manager's current total. Aggregating
the runs yields: each manager's **win probability** + projected score + p10–p90 range, and each
nation's **reach-final** and **champion** odds. The UI exposes run count and an "upset factor".

---

## Local development

```bash
# 1. Install
npm install

# 2. Configure env (see .env.example)
cp .env.example .env
#   Set DATABASE_URL + DIRECT_URL (Postgres) and AUTH_SECRET (openssl rand -base64 32)

# 3. Create schema + seed the demo world
npm run db:push
npm run db:seed

# 4. Run
npm run dev      # http://localhost:3000
```

**Logins are passwordless** — sign in with just an email. Seeded accounts:
`tom@wc26.app` (commissioner), plus `bard@`, `goalie@`, `andy@`, `brain@`, `jarn@`,
`zd@`, `stove@` `wc26.app`. Enter the email on the login page; if an account exists,
you're in.

See **[DEPLOY.md](./DEPLOY.md)** for one-click Vercel + Postgres setup.

---

## Notes & next steps
- Tournament facts (records, fixtures, strengths) are seeded as global data. Wire these to a
  real results feed to go live; the scoring + simulator read straight from them.
- The mock-draft is a client-side simulator. A live multiplayer draft would add a
  `DraftRoom` model + websockets / server actions with optimistic updates.
- The seeded demo pool runs a custom 8-manager / 6-round draft order. Pools store their own
  `rounds`; create-a-pool starts empty so you can wire up your own draft flow.
- Auth is passwordless: sign in with just an email that matches an existing account.
  Add the GitHub provider by setting `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`, or swap in
  an email magic-link provider if you want verified email delivery.
