import "./styles/theme.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/animations.css";

import nations from "../data/nations.json";
import players from "../data/players.json";
import pool from "../data/pool.json";
import schedule from "../data/schedule.json";
import venues from "../data/venues.json";
import bracket from "../data/bracket.json";
import draftSeed from "../data/draft.seed.json";

import { createStore } from "./core/store.js";
import { createRouter } from "./core/router.js";
import { el, mount, clear } from "./core/dom.js";
import { load, save, exportJSON, importJSON, resetLocal } from "./core/persistence.js";
import { encodeSnapshot, decodeSnapshot, mergeShared, sharedSlice } from "./core/share.js";
import { ICONS, avatar } from "./components/ui.js";
import { openModal } from "./components/Modal.js";

import { renderTable } from "./views/TableView.js";
import { computeDerived } from "./logic/selectors.js";

// Only the landing view (Table) ships in the initial chunk. Every other route is
// a dynamic import() so its code (and deps like the charts/worker glue) loads on
// demand. Vite emits one chunk per route.
const LAZY = {
  draft: () => import("./views/DraftView.js").then((m) => m.renderDraft),
  squad: () => import("./views/SquadView.js").then((m) => m.renderSquad),
  fixtures: () => import("./views/FixturesView.js").then((m) => m.renderFixtures),
  proj: () => import("./views/ProjectionsView.js").then((m) => m.renderProjections),
  scoring: () => import("./views/ScoringView.js").then((m) => m.renderScoring),
  player: () => import("./views/PlayerDetailView.js").then((m) => m.renderPlayerDetail),
  nation: () => import("./views/NationDetailView.js").then((m) => m.renderNationDetail),
};
const EAGER = { table: renderTable };

const saved = load();

// Apply the in-app "reduce motion" preference before first paint (independent of the OS setting).
document.documentElement.dataset.motion = saved.settings?.reducedMotion === "reduced" ? "reduced" : "";

// The seeded board is authoritative. If a returning visitor has live draft picks
// saved from an older seed version, drop them so everyone converges on the current
// board. Bump `version` in data/draft.seed.json to force a one-time reset for all.
const SEED_VERSION = draftSeed.version ?? 0;
const draftPicks = saved.draftSeedVersion === SEED_VERSION ? (saved.draftPicks || null) : null;
if (saved.draftSeedVersion !== SEED_VERSION) save({ draftPicks, draftSeedVersion: SEED_VERSION });

const store = createStore({
  data: { nations, players, pool, schedule, venues, bracket, seedPicks: draftSeed.picks },
  results: saved.results || {},
  draftPicks,
  currentUserId: saved.currentUserId ?? null, // read before first paint → no wrong-user flash
  syncPool: saved.syncPool ?? null,
  settings: saved.settings,
  route: { name: "table", params: [] },
});

// Cloud sync (Tier B) is available only when the deployment provides Supabase env.
const SYNC_CONFIGURED = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
let sync = null;
let syncStatus = { state: SYNC_CONFIGURED ? "disconnected" : "unavailable" };
async function ensureSync() {
  if (sync) return sync;
  const mod = await import("./core/sync.js");
  sync = mod.createSync({
    getShared: () => sharedSlice(store.getState()),
    applyShared: (shared, mode) => {
      const merged = mergeShared(sharedSlice(store.getState()), shared, mode);
      store.setState(merged); save(merged); onRoute(router.current());
    },
    onStatus: (s) => { syncStatus = s; },
  });
  return sync;
}

const TABS = [
  ["table", "Table", ICONS.table],
  ["draft", "Draft", ICONS.draft],
  ["squad", "Squad", ICONS.squad],
  ["fixtures", "Fixtures", ICONS.fixtures],
  ["proj", "Odds", ICONS.proj],
  ["scoring", "Scoring", ICONS.scoring],
];
/** Warm a route's chunk ahead of navigation (hover/touch on its tab). */
function prefetchRoute(name) { if (LAZY[name]) LAZY[name]().catch(() => {}); }

// ── Identity ("who am I") — a LOCAL, per-device preference. Never synced; never
//    touches shared results. null = unchosen (show picker), "" = spectator, else id.
const identityChip = el("button", { class: "idchip", attrs: { "aria-haspopup": "dialog" }, on: { click: () => openIdentityPicker() } });

function renderIdentityChip() {
  const id = store.getState().currentUserId;
  const p = id ? players.find((m) => m.id === id) : null;
  clear(identityChip);
  if (p) {
    identityChip.append(avatar(p, 22), el("span", { class: "idname" }, p.name));
    identityChip.setAttribute("aria-label", `You are ${p.name}. Tap to change.`);
  } else if (id === "") {
    identityChip.append(el("span", { class: "iddot" }), el("span", { class: "idname" }, "Spectator"));
    identityChip.setAttribute("aria-label", "Spectator. Tap to pick who you are.");
  } else {
    identityChip.classList.add("unset");
    identityChip.append(el("span", { class: "iddot" }), el("span", { class: "idname" }, "Who are you?"));
    identityChip.setAttribute("aria-label", "Tap to pick who you are.");
  }
  identityChip.classList.toggle("unset", !p && id !== "");
}

function setIdentity(id) {
  store.setState({ currentUserId: id });
  save({ currentUserId: id });
  renderIdentityChip();
  onRoute(router.current()); // re-render so "· you", highlights, and the My-stake default update
}

function openIdentityPicker() {
  const cur = store.getState().currentUserId;
  const grid = el("div", { class: "idgrid" });
  players.forEach((p) => {
    grid.appendChild(el("button", {
      class: "idcard" + (p.id === cur ? " sel" : ""),
      on: { click: () => { setIdentity(p.id); h.close(); } },
    }, avatar(p, 42), el("span", { class: "idcard-name" }, p.name)));
  });
  const spectator = el("button", {
    class: "btn ghost block" + (cur === "" ? " sel" : ""),
    on: { click: () => { setIdentity(""); h.close(); } },
  }, "Spectator · just watching");
  const content = el("div", { class: "stack" },
    el("div", { class: "muted", style: { fontSize: "13px", lineHeight: 1.4 } },
      "Pick which manager you are. This stays on this device — it personalises the “· you” badge, the My-stake filter, and row highlights. It never changes shared results."),
    grid, spectator,
  );
  const h = openModal("Who are you?", content);
}

// ── App shell ──
const viewSlot = el("main", { id: "view", class: "shell" });
const tabbar = el("nav", { class: "tabbar", attrs: { "aria-label": "Sections" } });
const router = createRouter(onRoute);

const app = document.getElementById("app");
app.append(
  el("div", { class: "shell", style: { paddingBottom: 0 } },
    el("div", { class: "topbar" },
      el("div", { class: "brand" }, el("div", { class: "mark", html: 'WB<b>26</b>WC' }), el("div", { class: "sub" }, "World Cup 26")),
      el("div", { class: "row", style: { gap: "8px" } },
        identityChip,
        el("button", { class: "iconbtn", attrs: { "aria-label": "Share standings" }, on: { click: openShare } }, ICONS.share()),
        el("button", { class: "iconbtn", attrs: { "aria-label": "Settings" }, on: { click: openSettings } }, ICONS.gear()),
      ),
    ),
  ),
  viewSlot,
  tabbar,
);

TABS.forEach(([name, label, icon]) => {
  const warm = () => prefetchRoute(name);
  tabbar.appendChild(el("button", {
    class: "tab", dataset: { tab: name },
    on: { click: () => router.navigate(name), pointerenter: warm, touchstart: warm, focus: warm },
  }, icon(), el("span", {}, label), el("span", { class: "dot" })));
});

// ── View lifecycle ──
let cleanups = [];
function teardown() { cleanups.forEach((fn) => fn()); cleanups = []; }

function makeCtx(params) {
  return {
    store, params, navigate: (p) => router.navigate(p),
    onCleanup: (fn) => cleanups.push(fn),
    subscribe: (fn) => { const un = store.subscribe(() => fn()); cleanups.push(un); return un; },
    commitResults: (results) => { store.setState({ results }); save({ results }); sync?.push(); },
    commitDraft: (draftPicks) => { store.setState({ draftPicks }); save({ draftPicks, draftSeedVersion: SEED_VERSION }); sync?.push(); },
    persistSettings: (settings) => { store.setState({ settings }); save({ settings }); },
  };
}

let routeToken = 0;
async function onRoute(route) {
  let { name, params } = route;
  // Tier-A share import: opening #/join/<code> imports a shared snapshot, then
  // lands on the Table with a merge/replace confirm.
  if (name === "join") {
    const code = params[0] || "";
    history.replaceState(null, "", "#/table");
    name = "table"; params = [];
    queueMicrotask(() => handleJoin(code));
  }
  const token = ++routeToken;
  teardown();
  store.setState({ route: { name, params } });
  setActiveTab(name);

  let render = EAGER[name];
  if (!render && LAZY[name]) {
    mount(skeleton(name), viewSlot);
    try { render = await LAZY[name](); }
    catch { render = renderTable; }
    if (token !== routeToken) return; // user navigated again while the chunk loaded
  }
  if (!render) render = renderTable;

  const node = render(makeCtx(params));
  if (token !== routeToken) return;
  mount(node, viewSlot);
  window.scrollTo(0, 0);
}

function setActiveTab(name) {
  const activeTab = name === "player" ? "squad" : name === "nation" ? "fixtures" : name;
  [...tabbar.children].forEach((t) => t.setAttribute("aria-current", t.dataset.tab === activeTab ? "page" : "false"));
}

/** Lightweight shimmer placeholder shown while a route chunk loads. */
function skeleton(name) {
  const lines = name === "fixtures" ? 8 : name === "draft" ? 6 : 5;
  return el("div", { class: "view-skel", attrs: { role: "status", "aria-label": "Loading…", "aria-live": "polite" } },
    el("div", { class: "skel skel-head" }),
    ...Array.from({ length: lines }, () => el("div", { class: "skel skel-row" })),
  );
}

// ── Settings modal ──
function openSettings() {
  const s = store.getState().settings;
  const seed = el("input", { attrs: { type: "number", placeholder: "random" }, style: inputStyle() });
  seed.value = s.seed ?? "";
  const runs = el("input", { attrs: { type: "number", min: "1000", step: "1000" }, style: inputStyle() });
  runs.value = s.runs ?? 10000;
  const fileInput = el("input", { attrs: { type: "file", accept: "application/json" }, style: { display: "none" }, on: { change: doImport } });

  const youId = store.getState().currentUserId;
  const youP = youId ? players.find((p) => p.id === youId) : null;
  const switchUser = el("button", { class: "btn ghost block", style: { justifyContent: "space-between" }, on: { click: () => { h.close(); openIdentityPicker(); } } },
    el("span", { class: "row", style: { gap: "8px" } }, youP ? avatar(youP, 24) : el("span", { class: "iddot" }), el("span", {}, youP ? youP.name : youId === "" ? "Spectator" : "Not set")),
    el("span", { class: "muted", style: { fontSize: "12px" } }, "Change"));

  const motionOn = (s.reducedMotion === "reduced");
  const motionToggle = el("button", { class: "btn ghost block", attrs: { role: "switch", "aria-checked": String(motionOn) }, style: { justifyContent: "space-between" }, on: { click: toggleMotion } },
    el("span", {}, "Reduce motion"), el("span", { class: "muted", style: { fontSize: "12px" } }, motionOn ? "On" : "Off"));

  const content = el("div", { class: "stack" },
    el("div", { class: "daygroup", style: { marginTop: 0 } }, "You"),
    switchUser,
    el("div", { class: "daygroup" }, "Preferences"),
    motionToggle,
    field("Simulation seed (blank = random)", seed),
    field("Simulations per run", runs),
    el("button", { class: "btn primary block", on: { click: saveSettings } }, "Save settings"),
    el("div", { class: "daygroup" }, "Cloud sync"),
    syncSection(() => h.close()),
    el("div", { class: "daygroup" }, "Share (no account)"),
    el("button", { class: "btn ghost block", on: { click: () => { h.close(); openShareState(); } } }, "Share results (link & code)"),
    el("button", { class: "btn ghost block", on: { click: () => { h.close(); openImportCode(); } } }, "Import from code"),
    el("div", { class: "daygroup" }, "Backup (file)"),
    el("button", { class: "btn ghost block", on: { click: doExport } }, "Export results (JSON)"),
    el("button", { class: "btn ghost block", on: { click: () => fileInput.click() } }, "Import results (JSON)"),
    fileInput,
    el("button", { class: "btn ghost block", style: { color: "var(--coral-deep)" }, on: { click: doReset } }, "Reset local data"),
  );
  const h = openModal("Settings", content);

  function toggleMotion() {
    const on = store.getState().settings.reducedMotion !== "reduced";
    const next = { ...store.getState().settings, reducedMotion: on ? "reduced" : "auto" };
    store.setState({ settings: next }); save({ settings: next });
    document.documentElement.dataset.motion = on ? "reduced" : "";
    motionToggle.setAttribute("aria-checked", String(on));
    motionToggle.lastChild.textContent = on ? "On" : "Off";
  }
  function saveSettings() {
    const next = { ...store.getState().settings, seed: seed.value === "" ? null : Number(seed.value), runs: Number(runs.value) || 10000 };
    store.setState({ settings: next }); save({ settings: next }); h.close();
  }
  function doExport() {
    download("wb26wc-backup.json", exportJSON());
  }
  function doImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const next = importJSON(r.result); store.setState({ results: next.results, draftPicks: next.draftPicks, currentUserId: next.currentUserId ?? null, settings: next.settings }); document.documentElement.dataset.motion = next.settings?.reducedMotion === "reduced" ? "reduced" : ""; renderIdentityChip(); h.close(); onRoute(router.current()); } catch (err) { alert("Import failed: " + err.message); } };
    r.readAsText(file);
  }
  function doReset() {
    if (!confirm("Clear all entered results and draft edits on this device?")) return;
    const def = resetLocal();
    store.setState({ results: def.results, draftPicks: def.draftPicks, currentUserId: def.currentUserId, settings: def.settings });
    document.documentElement.dataset.motion = "";
    renderIdentityChip();
    h.close(); onRoute(router.current());
    openIdentityPicker(); // reset clears identity → back to the picker
  }
}

// ── Share standings to a canvas image ──
function openShare() {
  const state = store.getState();
  const d = computeDerived(state);
  const canvas = document.createElement("canvas");
  const W = 1080, H = 1350, dpr = 2;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const c = canvas.getContext("2d"); c.scale(dpr, dpr);
  c.fillStyle = "#FBF2E5"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#F0492E"; c.font = "800 64px Archivo, sans-serif"; c.fillText("WB26WC", 64, 110);
  c.fillStyle = "#1E160E"; c.font = "700 30px Inter, sans-serif"; c.fillText("World Cup 26 · The Table", 64, 156);
  let y = 250;
  d.standings.forEach((r) => {
    c.fillStyle = r.id === state.currentUserId ? "#FCE3DC" : "#FFFDF8"; roundRect(c, 64, y, W - 128, 116, 20); c.fill();
    c.fillStyle = "#9A8C76"; c.font = "800 40px Archivo"; c.fillText("#" + r.rank, 92, y + 72);
    c.fillStyle = r.color; c.beginPath(); c.arc(210, y + 58, 28, 0, 7); c.fill();
    c.fillStyle = "#1E160E"; c.font = "800 38px Inter"; c.fillText(r.name, 260, y + 56);
    c.fillStyle = "#9A8C76"; c.font = "600 24px Inter"; c.fillText(r.alive + " nations alive", 260, y + 90);
    c.fillStyle = "#1E160E"; c.font = "800 56px Archivo"; c.textAlign = "right"; c.fillText(String(r.total), W - 96, y + 78); c.textAlign = "left";
    y += 132;
  });
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const img = el("img", { attrs: { src: url, alt: "Standings", style: "width:100%;border-radius:16px;border:1px solid var(--line)" } });
    const dl = el("a", { class: "btn primary block", attrs: { href: url, download: "wb26wc-standings.png" }, style: { marginTop: "12px" } }, "Download image");
    openModal("Share standings", el("div", {}, img, dl));
  });
}

// ── Tier-B cloud sync UI (Supabase) ──
function statusLabel(s) {
  const at = s.at ? " · last synced " + new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return ({ synced: "Synced", syncing: "Syncing…", offline: "Offline — will retry", disconnected: "Not connected", unavailable: "Not configured" }[s.state] || s.state) + (s.state === "synced" ? at : "");
}
function copyText(text) { (navigator.clipboard?.writeText(text) || Promise.reject()).catch(() => {}); }

function syncSection(close) {
  const wrap = el("div", { class: "stack" });
  if (!SYNC_CONFIGURED) {
    wrap.append(el("div", { class: "muted", style: { fontSize: "13px", lineHeight: 1.4 } },
      "Cloud sync isn’t configured on this deployment. An admin can enable it by adding Supabase env vars (see SYNC.md). Until then, use “Share (no account)” below."));
    return wrap;
  }
  const pool = store.getState().syncPool;
  if (pool?.poolId) {
    wrap.append(
      el("div", { class: "spread" }, el("span", { class: "muted", style: { fontSize: "12px" } }, "Pool"), el("b", { style: { fontFamily: "monospace" } }, pool.poolId)),
      el("div", { class: "muted", style: { fontSize: "12px" } }, statusLabel(syncStatus)),
      el("button", { class: "btn ghost block", on: { click: () => copyText(pool.passcode ? `${pool.poolId} · ${pool.passcode}` : pool.poolId) } }, "Copy pool ID" + (pool.passcode ? " & passcode" : "")),
      el("button", { class: "btn ghost block", style: { color: "var(--coral-deep)" }, on: { click: async () => { try { const s = await ensureSync(); await s.leave(); } catch { /* ignore */ } store.setState({ syncPool: null }); save({ syncPool: null }); close(); } } }, "Leave pool"),
    );
    return wrap;
  }
  const newPass = el("input", { attrs: { placeholder: "optional passcode" }, style: inputStyle() });
  const joinId = el("input", { attrs: { placeholder: "pool ID", autocapitalize: "off", autocorrect: "off" }, style: inputStyle() });
  const joinPass = el("input", { attrs: { placeholder: "passcode (if any)" }, style: inputStyle() });
  const connect = (poolId, passcode) => { store.setState({ syncPool: { poolId, passcode: passcode || null } }); save({ syncPool: { poolId, passcode: passcode || null } }); };
  wrap.append(
    el("div", { class: "muted", style: { fontSize: "13px", lineHeight: 1.4 } }, "Create a shared pool so everyone’s results & draft stay in sync live. Your identity stays private to this device."),
    field("New-pool passcode (optional)", newPass),
    el("button", { class: "btn primary block", on: { click: async () => {
      try { const s = await ensureSync(); const p = newPass.value.trim() || null; const { poolId } = await s.create(p); connect(poolId, p); close(); alert("Pool created!\n\nID: " + poolId + (p ? "\nPasscode: " + p : "") + "\n\nShare this with your group to sync."); }
      catch (e) { alert("Couldn’t create pool: " + e.message); }
    } } }, "Create pool"),
    el("div", { class: "daygroup" }, "Join an existing pool"),
    field("Pool ID", joinId), field("Passcode", joinPass),
    el("button", { class: "btn ghost block", on: { click: async () => {
      const id = joinId.value.trim(); if (!id) return;
      try { const s = await ensureSync(); await s.join(id, joinPass.value.trim() || null); connect(id, joinPass.value.trim() || null); close(); onRoute(router.current()); }
      catch (e) { alert("Couldn’t join: " + e.message); }
    } } }, "Join pool"),
  );
  return wrap;
}

// ── Tier-A share: snapshot link/code (no backend) ──
async function openShareState() {
  let code;
  try { code = await encodeSnapshot(store.getState()); }
  catch (e) { alert("Couldn't build a share code: " + e.message); return; }
  const link = location.origin + location.pathname + "#/join/" + code;
  const linkInput = el("input", { attrs: { readonly: "", value: link, "aria-label": "Share link" }, style: inputStyle() });
  const codeBox = el("textarea", { attrs: { readonly: "", rows: "3", "aria-label": "Share code" }, style: { ...inputStyle(), resize: "none", fontFamily: "monospace", fontSize: "11px" } });
  codeBox.value = code;
  const copy = (text, btn, label) => {
    (navigator.clipboard?.writeText(text) || Promise.reject()).then(() => { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = label; }, 1200); }).catch(() => {});
  };
  const linkBtn = el("button", { class: "btn primary block", on: { click: () => copy(link, linkBtn, "Copy share link") } }, "Copy share link");
  const codeBtn = el("button", { class: "btn ghost block", on: { click: () => copy(code, codeBtn, "Copy code") } }, "Copy code");
  openModal("Share results", el("div", { class: "stack" },
    el("div", { class: "muted", style: { fontSize: "13px", lineHeight: 1.4 } }, "Send this link to the group — opening it imports the current results & draft (with a merge/replace choice). No account needed. The shared snapshot never includes who you are."),
    field("Share link", linkInput), linkBtn,
    field("Or short code", codeBox), codeBtn,
  ));
}

function openImportCode() {
  const ta = el("textarea", { attrs: { rows: "4", placeholder: "Paste a share code…", "aria-label": "Share code" }, style: { ...inputStyle(), resize: "none", fontFamily: "monospace", fontSize: "12px" } });
  const h = openModal("Import from code", el("div", { class: "stack" },
    field("Share code", ta),
    el("button", { class: "btn primary block", on: { click: () => { const c = ta.value.trim(); if (c) { h.close(); handleJoin(c); } } } }, "Import"),
  ));
}

async function handleJoin(code) {
  let incoming;
  try { incoming = await decodeSnapshot(code); }
  catch (e) { alert("That share link/code couldn't be read: " + e.message); return; }
  const local = sharedSlice(store.getState());
  const nIn = Object.keys(incoming.results || {}).length;
  const nLocal = Object.keys(local.results || {}).length;
  const apply = (mode) => {
    const merged = mergeShared(local, incoming, mode);
    store.setState(merged); save(merged);
    h.close(); onRoute(router.current());
  };
  const h = openModal("Import shared results", el("div", { class: "stack" },
    el("div", { class: "muted", style: { fontSize: "13px", lineHeight: 1.4 } },
      `This snapshot has ${nIn} entered result${nIn === 1 ? "" : "s"} and ${incoming.draftPicks ? "a custom draft" : "the seeded draft"}. You currently have ${nLocal}. How should it apply?`),
    el("button", { class: "btn primary block", on: { click: () => apply("merge") } }, "Merge — keep mine, add theirs"),
    el("button", { class: "btn ghost block", on: { click: () => apply("replace") } }, "Replace — use theirs"),
  ));
}

// ── helpers ──
function field(label, input) { return el("label", { class: "stack", style: { gap: "5px" } }, el("span", { class: "muted", style: { fontSize: "12px", fontWeight: 700 } }, label), input); }
function inputStyle() { return { padding: "11px", borderRadius: "12px", border: "1px solid var(--line-strong)", background: "var(--card)", fontWeight: 700, fontSize: "16px" }; }
function download(name, text) { const b = new Blob([text], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

renderIdentityChip();
router.start();

// First run on this device: prompt for identity once (skippable via Spectator).
if (store.getState().currentUserId === null) openIdentityPicker();

// Reconnect to a previously-joined cloud pool (if sync is configured).
if (SYNC_CONFIGURED && saved.syncPool?.poolId) {
  ensureSync().then((s) => s.join(saved.syncPool.poolId, saved.syncPool.passcode).catch(() => {})).catch(() => {});
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
