// localStorage-backed user state with schema versioning + JSON export/import.
const KEY = "wb26wc:state";
const SCHEMA = 2;

const DEFAULTS = () => ({
  schemaVersion: SCHEMA,
  results: {},
  draftPicks: null, // null → fall back to the seeded board
  draftSeedVersion: null, // version of the seed the saved picks were tagged against
  currentUserId: null, // null → never chosen (show picker); "" → spectator; else a manager id. LOCAL-only.
  syncPool: null, // { poolId, passcode } when joined to a cloud pool. LOCAL-only (never shared).
  settings: { seed: null, runs: 10000, reducedMotion: "auto" },
  lastSimStamp: null,
});

const migrations = {
  // v1 → v2: introduce per-device identity. Existing installs start unset so the
  // "Who are you?" picker appears once; nothing else changes.
  1: (s) => ({ ...s, schemaVersion: 2, currentUserId: s.currentUserId ?? null }),
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    let s = JSON.parse(raw);
    while (s.schemaVersion < SCHEMA && migrations[s.schemaVersion]) s = migrations[s.schemaVersion](s);
    return { ...DEFAULTS(), ...s, settings: { ...DEFAULTS().settings, ...(s.settings || {}) } };
  } catch {
    return DEFAULTS();
  }
}

export function save(partial) {
  try {
    const cur = load();
    const next = { ...cur, ...partial, schemaVersion: SCHEMA };
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function exportJSON() {
  return JSON.stringify({ ...load(), exportedAt: new Date().toISOString() }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed == null) throw new Error("Not a valid backup file.");
  const merged = { ...DEFAULTS(), ...parsed, schemaVersion: SCHEMA };
  localStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export function resetLocal() {
  localStorage.removeItem(KEY);
  return DEFAULTS();
}
