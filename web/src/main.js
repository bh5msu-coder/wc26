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
import { ICONS, avatar } from "./components/ui.js";
import { openModal } from "./components/Modal.js";

import { renderTable } from "./views/TableView.js";
import { renderDraft } from "./views/DraftView.js";
import { renderSquad } from "./views/SquadView.js";
import { renderFixtures } from "./views/FixturesView.js";
import { renderScoring } from "./views/ScoringView.js";
import { renderProjections } from "./views/ProjectionsView.js";
import { renderPlayerDetail } from "./views/PlayerDetailView.js";
import { renderNationDetail } from "./views/NationDetailView.js";
import { computeDerived } from "./logic/selectors.js";

const saved = load();

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
  settings: saved.settings,
  route: { name: "table", params: [] },
});

const TABS = [
  ["table", "Table", ICONS.table],
  ["draft", "Draft", ICONS.draft],
  ["squad", "Squad", ICONS.squad],
  ["fixtures", "Fixtures", ICONS.fixtures],
  ["proj", "Odds", ICONS.proj],
  ["scoring", "Scoring", ICONS.scoring],
];
const VIEWS = {
  table: renderTable, draft: renderDraft, squad: renderSquad, fixtures: renderFixtures,
  proj: renderProjections, scoring: renderScoring, player: renderPlayerDetail, nation: renderNationDetail,
};

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
        el("button", { class: "iconbtn", attrs: { "aria-label": "Share standings" }, on: { click: openShare } }, ICONS.share()),
        el("button", { class: "iconbtn", attrs: { "aria-label": "Settings" }, on: { click: openSettings } }, ICONS.gear()),
      ),
    ),
  ),
  viewSlot,
  tabbar,
);

TABS.forEach(([name, label, icon]) => {
  tabbar.appendChild(el("button", { class: "tab", dataset: { tab: name }, on: { click: () => router.navigate(name) } },
    icon(), el("span", {}, label), el("span", { class: "dot" })));
});

// ── View lifecycle ──
let cleanups = [];
function teardown() { cleanups.forEach((fn) => fn()); cleanups = []; }

function makeCtx(params) {
  return {
    store, params, navigate: (p) => router.navigate(p),
    onCleanup: (fn) => cleanups.push(fn),
    subscribe: (fn) => { const un = store.subscribe(() => fn()); cleanups.push(un); return un; },
    commitResults: (results) => { store.setState({ results }); save({ results }); },
    commitDraft: (draftPicks) => { store.setState({ draftPicks }); save({ draftPicks, draftSeedVersion: SEED_VERSION }); },
    persistSettings: (settings) => { store.setState({ settings }); save({ settings }); },
  };
}

function onRoute({ name, params }) {
  teardown();
  store.setState({ route: { name, params } });
  const render = VIEWS[name] || VIEWS.table;
  const node = render(makeCtx(params));
  mount(node, viewSlot);
  window.scrollTo(0, 0);
  const activeTab = name === "player" ? "squad" : name === "nation" ? "fixtures" : name;
  [...tabbar.children].forEach((t) => t.setAttribute("aria-current", t.dataset.tab === activeTab ? "page" : "false"));
}

// ── Settings modal ──
function openSettings() {
  const s = store.getState().settings;
  const seed = el("input", { attrs: { type: "number", placeholder: "random" }, style: inputStyle() });
  seed.value = s.seed ?? "";
  const runs = el("input", { attrs: { type: "number", min: "1000", step: "1000" }, style: inputStyle() });
  runs.value = s.runs ?? 10000;
  const fileInput = el("input", { attrs: { type: "file", accept: "application/json" }, style: { display: "none" }, on: { change: doImport } });

  const content = el("div", { class: "stack" },
    field("Simulation seed (blank = random)", seed),
    field("Simulations per run", runs),
    el("button", { class: "btn primary block", on: { click: saveSettings } }, "Save settings"),
    el("div", { class: "daygroup" }, "Backup & share state"),
    el("button", { class: "btn ghost block", on: { click: doExport } }, "Export results (JSON)"),
    el("button", { class: "btn ghost block", on: { click: () => fileInput.click() } }, "Import results (JSON)"),
    fileInput,
    el("button", { class: "btn ghost block", style: { color: "var(--coral-deep)" }, on: { click: doReset } }, "Reset local data"),
  );
  const h = openModal("Settings", content);

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
    r.onload = () => { try { const next = importJSON(r.result); store.setState({ results: next.results, draftPicks: next.draftPicks, settings: next.settings }); h.close(); onRoute(router.current()); } catch (err) { alert("Import failed: " + err.message); } };
    r.readAsText(file);
  }
  function doReset() {
    if (!confirm("Clear all entered results and draft edits on this device?")) return;
    const def = resetLocal();
    store.setState({ results: def.results, draftPicks: def.draftPicks, settings: def.settings });
    h.close(); onRoute(router.current());
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
    c.fillStyle = r.isYou ? "#FCE3DC" : "#FFFDF8"; roundRect(c, 64, y, W - 128, 116, 20); c.fill();
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

// ── helpers ──
function field(label, input) { return el("label", { class: "stack", style: { gap: "5px" } }, el("span", { class: "muted", style: { fontSize: "12px", fontWeight: 700 } }, label), input); }
function inputStyle() { return { padding: "11px", borderRadius: "12px", border: "1px solid var(--line-strong)", background: "var(--card)", fontWeight: 700, fontSize: "16px" }; }
function download(name, text) { const b = new Blob([text], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); }
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

router.start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
