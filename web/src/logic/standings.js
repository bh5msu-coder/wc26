// Pool standings — sum each manager's drafted-nation points. Sort mirrors the
// original app: total desc, then alive-count desc, then name.
import { points } from "./scoring.js";

/** Build ranked manager rows. scope 'all' = full points; 'group' = group-stage only (side pot). */
export function buildStandings(nationRecords, players, picks, weights, { scope = "all" } = {}) {
  const byManager = {};
  for (const p of players) {
    byManager[p.id] = { id: p.id, name: p.name, color: p.color, isYou: !!p.isYou, total: 0, alive: 0, nations: [] };
  }
  for (const pick of picks) {
    const rec = nationRecords[pick.code];
    const m = byManager[pick.managerId];
    if (!m) continue;
    const slice = scope === "group"
      ? { ...(rec?.groupOnly || { W: 0, D: 0, L: 0, GF: 0, CS: 0 }), KOW: 0, champion: false }
      : (rec || { W: 0, D: 0, L: 0, GF: 0, CS: 0, KOW: 0, champion: false });
    const pts = points(slice, weights);
    m.total += pts;
    if (rec?.alive) m.alive += 1;
    m.nations.push({ code: pick.code, points: pts });
  }
  const rows = Object.values(byManager).sort(
    (a, b) => b.total - a.total || b.alive - a.alive || a.name.localeCompare(b.name),
  );
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

/** The group-stage points leader — winner of the 5% side pot. */
export function groupStageLeader(nationRecords, players, picks, weights) {
  return buildStandings(nationRecords, players, picks, weights, { scope: "group" })[0] || null;
}
