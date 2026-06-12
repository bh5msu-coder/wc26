// Tier-B cloud sync over Supabase (realtime). Lazy-loaded: this module is only
// imported when the user enables sync, and the Supabase client itself is
// dynamically imported inside getClient(), so neither touches the initial bundle.
//
// SHARED data only (results, draftPicks, draftSeedVersion) lives in the pool row.
// The local identity (currentUserId) and preferences are NEVER sent. Conflict
// policy: per-match last-write-wins via a deterministic merge (incoming wins per
// result), with the row's updated_at as the version. Offline-first: pushes queue
// and flush on reconnect/focus; the app works fully if sync is unavailable.

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = "pools";

let client = null;
async function getClient() {
  if (client) return client;
  const { createClient } = await import("@supabase/supabase-js");
  client = createClient(URL, KEY, { realtime: { params: { eventsPerSecond: 2 } } });
  return client;
}

/** Hard-to-guess pool id (lowercase, unambiguous alphabet). */
function randId(n = 14) {
  const a = "23456789abcdefghijkmnpqrstuvwxyz";
  const r = crypto.getRandomValues(new Uint8Array(n));
  let s = "";
  for (const x of r) s += a[x % a.length];
  return s;
}

/**
 * Create a sync controller.
 * @param getShared  () => shared slice to publish
 * @param applyShared (shared, mode) => merge incoming shared into local state
 * @param onStatus   (status) => report {state, poolId?, at?} for the UI
 */
export function createSync({ getShared, applyShared, onStatus }) {
  let poolId = null, channel = null, lastUpdatedAt = null, pushTimer = null, queued = false, wired = false;
  const set = (s) => onStatus && onStatus(s);

  async function create(passcode) {
    const c = await getClient();
    const id = randId();
    const updated_at = new Date().toISOString();
    const { error } = await c.from(TABLE).insert({ id, passcode: passcode || null, shared: getShared(), updated_at });
    if (error) throw new Error(error.message);
    poolId = id; lastUpdatedAt = updated_at;
    await subscribe();
    set({ state: "synced", poolId, at: Date.now() });
    return { poolId };
  }

  async function join(id, passcode) {
    const c = await getClient();
    const { data, error } = await c.from(TABLE).select("shared, passcode, updated_at").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Pool not found — check the ID.");
    if (data.passcode && data.passcode !== (passcode || null)) throw new Error("Wrong passcode.");
    poolId = id;
    if (data.shared) { applyShared(data.shared, "merge"); }
    lastUpdatedAt = data.updated_at;
    await subscribe();
    set({ state: "synced", poolId, at: Date.now() });
    return { poolId };
  }

  async function subscribe() {
    const c = await getClient();
    if (channel) { await c.removeChannel(channel); channel = null; }
    channel = c
      .channel("pool:" + poolId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: TABLE, filter: "id=eq." + poolId }, (payload) => {
        const row = payload.new;
        if (row && row.updated_at && row.updated_at !== lastUpdatedAt) {
          lastUpdatedAt = row.updated_at;
          applyShared(row.shared, "merge");
          set({ state: "synced", poolId, at: Date.now() });
        }
      })
      .subscribe();
    if (!wired) {
      wired = true;
      window.addEventListener("focus", pull);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
      window.addEventListener("online", flush);
    }
  }

  async function pull() {
    if (!poolId) return;
    try {
      const c = await getClient();
      const { data } = await c.from(TABLE).select("shared, updated_at").eq("id", poolId).maybeSingle();
      if (data && data.updated_at !== lastUpdatedAt) {
        lastUpdatedAt = data.updated_at;
        applyShared(data.shared, "merge");
      }
      set({ state: "synced", poolId, at: Date.now() });
    } catch { set({ state: "offline", poolId }); }
  }

  /** Debounced publish of local shared state. */
  function push() {
    if (!poolId) return;
    queued = true;
    set({ state: "syncing", poolId });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, 800);
  }

  async function flush() {
    if (!poolId || !queued) return;
    queued = false;
    try {
      const c = await getClient();
      const updated_at = new Date().toISOString();
      const { error } = await c.from(TABLE).update({ shared: getShared(), updated_at }).eq("id", poolId);
      if (error) throw new Error(error.message);
      lastUpdatedAt = updated_at;
      set({ state: "synced", poolId, at: Date.now() });
    } catch {
      queued = true; // keep it queued; retry on next focus/online
      set({ state: "offline", poolId });
    }
  }

  async function leave() {
    try { const c = await getClient(); if (channel) await c.removeChannel(channel); } catch { /* ignore */ }
    channel = null; poolId = null; lastUpdatedAt = null; queued = false;
    set({ state: "disconnected" });
  }

  return { create, join, leave, push, pull, get poolId() { return poolId; } };
}
