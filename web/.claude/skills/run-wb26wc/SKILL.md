---
name: run-wb26wc
description: Build, run, test, and screenshot the WB26WC World Cup 2026 pool app (the framework-free static site in /web). Use when asked to run, start, preview, build, test, drive, or screenshot wb26wc / the World Cup pool web app.
---

# Run WB26WC

WB26WC is a **framework-free** (vanilla ES modules, zero runtime deps) static web
app in `web/`, built and served with Vite. It's driven headlessly with
**Playwright** (the globally-installed copy) via `driver.mjs`, which exercises the
real UI — standings, the live draft board, result entry, and the Monte-Carlo
projection worker — and writes screenshots.

All paths below are relative to `web/` (the unit root). Run commands from there.

## Prerequisites

Node 22 + the global Playwright install already present in this environment.
No `apt-get` was needed; Playwright's Chromium launches headless out of the box:

```bash
node -e "import('/opt/node22/lib/node_modules/playwright/index.js').then(p=>p.chromium.launch()).then(b=>{console.log('chromium OK');return b.close()})"
```

## Build & test

```bash
cd web
npm install
npm test          # 40 Vitest unit tests (scoring, derive, strength, standings, payouts, simulate, draftgen)
npm run build     # → dist/ (also emits the ES-module sim worker chunk)
```

## Run (agent path) — preview + driver

Start the built site, then drive it. The driver writes PNGs to
`.claude/skills/run-wb26wc/shots/` and prints what it observed.

```bash
cd web
( npm run preview >/tmp/wb26wc-preview.log 2>&1 & )   # serves http://localhost:4173
sleep 2
curl -s -o /dev/null -w "preview HTTP %{http_code}\n" http://localhost:4173/
node .claude/skills/run-wb26wc/driver.mjs http://localhost:4173 .claude/skills/run-wb26wc/shots
```

Expected stdout (verified this session):

```
standings: Stove, ZD, Andy, Bard, Brain, Goalie, Jarn, Tom · you
draft codes (first 8): ESP BRA FRA ENG ARG POR GER NED
projections: Simulated 10,000 times · as of <date>
no console errors            # (or only ERR_CERT_AUTHORITY_INVALID — see Gotchas)
```

The driver accepts `[baseURL] [outDir]`; defaults are `http://localhost:4173` and
`./shots` (relative to the skill dir). It opens a 402×860 mobile viewport, asserts
the standings + draft grid render, enters a 3–0 result through the modal, runs the
projection worker, and screenshots Table / Draft / Result-entry / Projections / Scoring.

Stop the preview when done:

```bash
pkill -f "vite preview" || true
```

## Run (human path)

```bash
cd web && npm run dev    # http://localhost:5173, hot reload
```
Useless headless — there's no display; use the driver above instead.

## Direct invocation (logic without the browser)

The pure logic in `src/logic/*.js` (scoring, derive, strength, standings, payouts,
simulate, draftgen) has zero DOM deps and runs straight in Node — most logic PRs
need only this, no browser:

```bash
cd web
node --input-type=module -e '
import { computeDerived } from "./src/logic/selectors.js";
import nations from "./data/nations.json" with {type:"json"};
import players from "./data/players.json" with {type:"json"};
import pool from "./data/pool.json" with {type:"json"};
import schedule from "./data/schedule.json" with {type:"json"};
import seed from "./data/draft.seed.json" with {type:"json"};
const base = { data:{nations,players,pool,schedule,seedPicks:seed.picks,bracket:{quarterfinals:[],semifinals:[],final:{fromHome:0,fromAway:1}}}, results:{}, draftPicks:null };
const d = computeDerived({ ...base, results:{ "grp-A-1-1":{hs:3,as:0,shootoutWinner:null} } });
console.log(d.standings.find(r=>r.id==="andy").total, "(expect 7: MEX 3-0 = win3+goals3+cs1)");
'
```

## Gotchas

- **`ERR_CERT_AUTHORITY_INVALID` in the driver's console report is expected here.**
  It's the Google Fonts CDN (`fonts.googleapis.com`) being blocked by this
  sandbox's TLS interception — NOT an app error. The app falls back to system
  fonts and works fully offline. Ignore it; treat any *other* console error as real.
- **PostCSS leak from the parent repo.** The repo root has a Next.js Tailwind/PostCSS
  setup; without `web/postcss.config.js` (an empty `{ plugins: {} }`) Vite walks up
  and warns it's processing our hand-written CSS. The empty config is committed —
  keep it.
- **Playwright is CommonJS.** Import it as `import pw from ".../playwright/index.js"; const { chromium } = pw;` — the named `{ chromium }` ESM import throws.
- **The ES-module worker** must be referenced as
  `new Worker(new URL("../workers/sim.worker.js", import.meta.url), { type: "module" })`
  with `worker.format: "es"` in `vite.config.js`, or the built worker chunk won't load.
- **Draft data is real.** `data/draft.seed.json` holds the live board (35 picks, ZD
  on the clock at pick 36). The Draft view continues from there; don't expect an empty board.

## Troubleshooting

- `preview` exits immediately / `EADDRINUSE` on 4173 → an old preview is running:
  `pkill -f "vite preview"`, then retry.
- Driver hangs on `.projrow` → the worker didn't post back; rebuild (`npm run build`)
  so `dist/assets/sim.worker-*.js` exists, and confirm `worker.format: "es"`.
- `Failed to parse source ... invalid JS syntax` during build → a syntax error in a
  `src/**/*.js`; find it fast with `for f in $(find src -name '*.js'); do node --check "$f"; done`.
