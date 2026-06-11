# WB26WC Architecture

Framework-free by design: a tiny hand-built foundation (store + router + DOM
helpers), pure logic modules with zero DOM dependencies, and view functions that
return real DOM nodes. No virtual DOM, no runtime dependencies. Vite bundles;
Vitest tests the logic.

## Layers & one-way dependencies

```
data/ (authored JSON)  →  src/logic/ (pure)  →  src/views/ (DOM)  →  src/main.js (wiring)
                                  ↑                    ↑
                          src/workers/ (sim)    src/core/ + src/components/
```

- **`src/logic/`** — pure, zero-DOM, unit-tested: `scoring`, `derive`, `strength`,
  `standings`, `payouts`, `simulate`, `draftgen`, `selectors`. Runs identically in
  Node (tests) and the Web Worker.
- **`src/core/`** — the "framework": `store` (subscribe/notify + `select`),
  `router` (hash), `dom` (`el`/`mount`), `persistence` (localStorage + migrations),
  `flip` (FLIP animation), `format` (numbers/dates/count-up).
- **`src/components/`** — presentational helpers (`ui`, `charts`, `Modal`).
- **`src/views/`** — one module per route; the only layer touching store + DOM.
- **`src/workers/sim.worker.js`** — imports `logic/simulate.js` unchanged.

## State, render & routing

- **One store** (`createStore`) holds `{ data, results, draftPicks, settings, route }`.
  `setState` shallow-merges and notifies; `select(fn)` gives a memoized slice.
- **Routing** is hash-based (`#/table`, `#/player/:id`, `#/nation/:code`). The router
  reports `{name, params}`; `main.js` tears down the old view's subscriptions, renders
  the new view node, and mounts it. No server rewrites needed (static-host friendly).
- **Render model**: a view is a function `(ctx) → node`. It renders once and
  **subscribes** to the store for live updates (rebuilding its own subtree, or — for
  the standings — updating keyed rows in place so **FLIP** can animate re-ordering).
  `ctx.onCleanup` tears down subscriptions/worker on route change.
- **Persistence**: `results`, `draftPicks`, and `settings` are saved to
  `localStorage` (`wb26wc:state`, `schemaVersion`-tagged with an ordered migration
  chain). Everything else is **derived** and never stored.

## Data model

Authored, version-controlled JSON in `data/`:

| File | Shape |
|---|---|
| `nations.json` | `[{code,name,flag,group,fifaRank,fifaPoints,confederation,titles,strengthAdj}]` (48) |
| `players.json` | `[{id,name,color,isYou}]` (8) |
| `pool.json` | `{meta, weights, draftOrder, economics:{entryFee,payoutSplit}, sim}` |
| `draft.seed.json` | `{picks:[{pickNumber,round,managerId,code}]}` — the live board (35 made) |
| `schedule.json` | `[{id,stage,group?,matchday?,home,away,kickoff(ISO),venueId,status}]` (104) |
| `venues.json` | `[{id,name,city,country,tz}]` (16) |
| `bracket.json` | projected QF→SF→Final topology used by the Monte-Carlo |

**Derived at runtime** (`logic/selectors.computeDerived`): each nation's
`{W,D,L,GF,CS,KOW,round,alive,champion}` + a **group-only** slice (`derive.js`),
live `strength` (`strength.js`), `points` (`scoring.js`), manager `standings`
(`standings.js`), the group-stage leader, `payouts`, and live `draft` state.

`localStorage` user state: `{ schemaVersion, results:{fixtureId→{hs,as,shootoutWinner}},
draftPicks[], settings:{seed,runs,reducedMotion}, lastSimStamp }`.

## Scoring (preserved exactly)

`points = win·W + draw·D + goal·GF + cs·CS + ko·KOW + (champion ? champ : 0)`,
defaults `{win:3, draw:1, goal:1, cs:1, ko:1, champ:1}`. A clean sheet is a match
with 0 conceded; KOW is a knockout-round win; champion is the Final winner only.
The **group-stage leader** side pot scores the group-only slice (no KO/champ).
Pot = `entryFee × managerCount`, split per `economics.payoutSplit`.

## Simulation assumptions (`logic/simulate.js`, ported verbatim)

- **RNG**: mulberry32, seedable → reproducible runs (tests pin a seed).
- **Goals**: each side ~ `Poisson(λ)` (Knuth sampler), with
  `λ_home = 1.35 · exp(Δ/(2·scale))`, `λ_away = 1.35 · exp(−Δ/(2·scale))`,
  `Δ = home.strength − away.strength`, default `scale = 40`.
- **Knockouts**: a tie goes to a shootout, `P(home) = sigmoid(Δ/(scale·0.7))`;
  the scoreline stays level. Champion gets the `champ` bonus.
- **Strength** feeding the sim is the **live** strength: FIFA-points base +
  research overlay (`strengthAdj`) + a bounded in-tournament form delta, clamped
  20–99 — so projections tighten as real results are entered.
- **Output** (default 10,000 runs): per-manager win-pool %, top-3 %, expected
  points, p10/p90, best/worst, and the full distribution; per-nation SF/Final/champ
  probabilities. Conservation laws (Σchamp=1, Σfinal=2, Σsf=4, Σwin=1) are tested.
- Runs in a **Web Worker** so the UI never blocks.

## Build / deploy

Vite (`base: ''`, `worker.format: 'es'`, `build.target: 'esnext'`) → static `dist/`.
`vercel.json` deploys `dist` with long-cache headers on `/assets/*` and no-cache on
`sw.js`. The service worker is network-first for navigations, cache-first for hashed
assets, with a version-bumped cache name.
