// Snake-draft helpers: live draft state, and a deterministic best-available filler.

/** Map every overall pick number → managerId from the custom draft order. */
export function slotMap(draftOrder) {
  const slot = {};
  for (const [mgr, picks] of Object.entries(draftOrder)) for (const n of picks) slot[n] = mgr;
  return slot;
}

export function totalPicks(draftOrder) {
  return Object.values(draftOrder).reduce((a, p) => a + p.length, 0);
}

/** Round (= manager's pick index, 1-based) for an overall pick number. */
export function roundOfPick(draftOrder, pickNumber) {
  for (const picks of Object.values(draftOrder)) {
    const i = picks.indexOf(pickNumber);
    if (i >= 0) return i + 1;
  }
  return null;
}

/**
 * Live draft state given the picks made so far.
 * @returns { total, made: Map<pickNumber,pick>, onClock: pickNumber|null, onClockManager, slot }
 */
export function draftState(draftOrder, madePicks) {
  const slot = slotMap(draftOrder);
  const total = totalPicks(draftOrder);
  const made = new Map(madePicks.map((p) => [p.pickNumber, p]));
  let onClock = null;
  for (let n = 1; n <= total; n++) if (!made.has(n)) { onClock = n; break; }
  return { total, made, onClock, onClockManager: onClock ? slot[onClock] : null, slot };
}

/**
 * Deterministic best-available-by-strength snake draft (filler / what-if).
 * @param strengthOf optional (nation)=>number; defaults to fifaPoints.
 */
export function generateSnakeDraft(nations, draftOrder, { strengthOf } = {}) {
  const slot = slotMap(draftOrder);
  const total = totalPicks(draftOrder);
  const score = strengthOf || ((n) => n.fifaPoints || 0);
  const pool = [...nations].sort((a, b) => score(b) - score(a) || a.code.localeCompare(b.code));
  const taken = new Set();
  const picks = [];
  for (let n = 1; n <= total; n++) {
    const mgr = slot[n];
    const pick = pool.find((x) => !taken.has(x.code));
    if (!pick) break;
    taken.add(pick.code);
    picks.push({ pickNumber: n, round: roundOfPick(draftOrder, n), managerId: mgr, code: pick.code });
  }
  return picks;
}
