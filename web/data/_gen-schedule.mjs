// Deterministic schedule generator → writes data/schedule.json.
// Best-effort WC26 shape: 72 group matches (12 groups × round-robin) + 32 knockout
// slots (R32→Final). Dates/kickoffs/venues are plausible and easily hand-corrected
// in the emitted JSON; pairings within a group follow a standard round-robin.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const nations = JSON.parse(readFileSync(join(here, "nations.json"), "utf8"));
const venues = JSON.parse(readFileSync(join(here, "venues.json"), "utf8"));
const vid = venues.map((v) => v.id);

const groups = {};
for (const n of nations) (groups[n.group] ??= []).push(n.code);
const groupLetters = Object.keys(groups).sort();

const pad = (n) => String(n).padStart(2, "0");
const iso = (y, mo, d, h) => `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:00:00Z`;
const KICK = [16, 19, 22, 1]; // rotating UTC kickoff hours

const matches = [];
let vCursor = 0;
const nextVenue = () => vid[vCursor++ % vid.length];

// ── Group stage: standard 4-team round-robin ──────────────────────────────────
// MD1: 0v1, 2v3 · MD2: 0v2, 3v1 · MD3: 0v3, 1v2
const RR = [
  [[0, 1], [2, 3]],
  [[0, 2], [3, 1]],
  [[0, 3], [1, 2]],
];
groupLetters.forEach((g, gi) => {
  const t = groups[g];
  RR.forEach((md, mdi) => {
    const day = mdi === 0 ? 11 + (gi % 7) : mdi === 1 ? 18 + (gi % 6) : 24 + (gi % 4);
    md.forEach(([a, b], k) => {
      const idx = matches.length;
      matches.push({
        id: `grp-${g}-${mdi + 1}-${k + 1}`,
        stage: "Group",
        group: g,
        matchday: mdi + 1,
        home: t[a],
        away: t[b],
        kickoff: iso(2026, 6, day, KICK[(gi * 2 + k) % KICK.length]),
        venueId: nextVenue(),
        status: "upcoming",
      });
      void idx;
    });
  });
});

// ── Knockout slots: teams TBD, filled as results are entered ──────────────────
const koDays = {
  R32: ["2026-06-28", "2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03"],
  R16: ["2026-07-04", "2026-07-05", "2026-07-06", "2026-07-07"],
  QF: ["2026-07-09", "2026-07-10", "2026-07-11"],
  SF: ["2026-07-14", "2026-07-15"],
  "3rd": ["2026-07-18"],
  Final: ["2026-07-19"],
};
const koCounts = { R32: 16, R16: 8, QF: 4, SF: 2, "3rd": 1, Final: 1 };
for (const [stage, count] of Object.entries(koCounts)) {
  const days = koDays[stage];
  const perDay = Math.ceil(count / days.length);
  for (let i = 0; i < count; i++) {
    const d = days[Math.min(days.length - 1, Math.floor(i / perDay))];
    matches.push({
      id: `${stage.toLowerCase().replace(/\s/g, "")}-${i + 1}`,
      stage,
      home: "TBD",
      away: "TBD",
      kickoff: `${d}T${pad(KICK[i % KICK.length])}:00:00Z`,
      venueId: stage === "Final" ? "metlife" : nextVenue(),
      status: "upcoming",
    });
  }
}

writeFileSync(join(here, "schedule.json"), JSON.stringify(matches, null, 2) + "\n");
console.log(`wrote schedule.json: ${matches.length} matches (72 group + ${matches.length - 72} knockout)`);
