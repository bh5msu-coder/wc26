# WB26WC — World Cup 2026 Pool

A mobile-first, **framework-free** tracker for an 8-manager World Cup 2026 draft
pool. Each manager snake-drafts 6 nations and scores from every match those
nations play. Vanilla JS (ES modules) + HTML + CSS, **zero runtime dependencies**,
deployed as a static site. State lives client-side (JSON + localStorage).

> Rebuilt from scratch — only the **data** and the **scoring rules** carry over
> from the previous app. See `ARCHITECTURE.md` for the design.

## Features

- **Table** — live standings with FLIP re-sort, count-up tickers, rank-change
  arrows, leader pulse, champion confetti, and a "Today" match hero.
- **Draft** — the live snake-draft board (seeded with the real in-progress picks),
  on-the-clock pick tool, and a value-vs-reach recap.
- **Squad / player detail** — rosters, points-by-nation, head-to-head.
- **Fixtures** — full 104-match schedule, filters, day grouping, venues, and a
  "who has a stake" indicator that deep-links into result entry.
- **Projections** — transparent Monte-Carlo in a Web Worker: win-pool %, top-3 %,
  expected points, and a distribution histogram per manager, with a "simulated N
  times" stamp. Re-run after entering results.
- **Scoring** — rules and prize split rendered from config.
- **PWA** — installable, offline-capable (service worker), with JSON export/import.

## Scoring (data-driven, defaults unchanged)

Per match, for each drafted nation: **win 3 / draw 1 / loss 0**, **+1 per goal**,
**+1 clean sheet**, **+1 knockout-round win**, **+1 champion**. Side pot for the
**group-stage points leader**. Pot split: **1st 60% · 2nd 25% · 3rd 10% · group
leader 5%**. All in `data/pool.json`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/ (static)
npm run preview    # serve the build on http://localhost:4173
```

## Test

```bash
npm test           # 40 Vitest unit tests over the pure logic modules
```

## Enter results & re-run projections

Tap any fixture (or a "Today" match) → enter the score. The app auto-derives
goals, clean sheets, knockout-win and champion bonuses, previews how every
affected manager's total and rank changes, validates hard (a drawn knockout
requires a shootout winner), and saves to localStorage. On the **Projections**
tab, hit **Run / Re-run** to recompute the odds from the new state.

## Back up / share state

**Settings (gear icon) → Export** downloads a JSON backup; **Import** restores it.
The **Share** icon renders the current standings to a PNG for the group chat.

## Deploy to Vercel

Static, no backend. `vercel.json` sets `buildCommand: npm run build` and
`outputDirectory: dist`. Point a Vercel project at the `web/` directory (Root
Directory = `web`) and deploy — or `vercel --prod` from inside `web/`.

## Agent harness

`/.claude/skills/run-wb26wc/` contains `SKILL.md` + `driver.mjs` — a Playwright
driver that builds, runs, and screenshots the app headlessly. See that SKILL.
