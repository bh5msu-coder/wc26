import { el, clear } from "../core/dom.js";
import { avatar, pill, bar } from "../components/ui.js";
import { histogram } from "../components/charts.js";
import { pct, stampLabel } from "../core/format.js";
import { computeDerived, buildSimInput } from "../logic/selectors.js";

export function renderProjections(ctx) {
  const root = el("div", {});
  const controls = el("div", { class: "card", style: { marginBottom: "12px" } });
  const stamp = el("div", { class: "muted center", style: { fontSize: "12px", margin: "4px 0 10px" } }, "Not simulated yet — run the model.");
  const results = el("div", { class: "stack" });
  root.append(
    el("div", { class: "viewhead" }, el("div", { class: "kicker" }, "Monte-Carlo"), el("h1", {}, "Projections")),
    controls, stamp, results,
  );

  let worker = null;
  let requestId = 0;
  let running = false;

  const runBtn = el("button", { class: "btn primary block", on: { click: run } }, "Run 10,000 simulations");
  controls.append(
    el("div", { class: "muted", style: { fontSize: "13px", marginBottom: "10px" } }, "Plays the rest of the tournament forward thousands of times from the live bracket, using each nation's current strength. Re-run after entering results to watch the odds tighten."),
    runBtn,
  );

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(new URL("../workers/sim.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.requestId !== requestId) return; // ignore stale
      running = false;
      runBtn.disabled = false;
      if (m.type === "error") { stamp.textContent = "Simulation error: " + m.message; return; }
      render(m.result, m.stamp);
    };
    return worker;
  }

  function run() {
    if (running) return;
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = "Simulating…";
    const state = ctx.store.getState();
    const d = computeDerived(state);
    const runs = state.settings.runs || state.data.pool.sim.defaultRuns;
    const seed = state.settings.seed;
    const input = buildSimInput(state, d, { runs, seed });
    requestId += 1;
    ensureWorker().postMessage({ type: "run", input, requestId });
    ctx.persistSettings({ ...state.settings, lastSimStamp: new Date().toISOString() });
  }

  function render(result, ts) {
    runBtn.textContent = "Re-run " + result.runs.toLocaleString() + " simulations";
    stamp.textContent = `Simulated ${result.runs.toLocaleString()} times · as of ${stampLabel(ts)}`;
    const state = ctx.store.getState();
    const players = state.data.players;
    const youId = state.currentUserId;
    const rows = result.managers.map((m) => ({ ...m, player: players.find((p) => p.id === m.membershipId) }))
      .sort((a, b) => b.winProb - a.winProb);
    clear(results);
    const card = el("div", { class: "card" });
    rows.forEach((m) => {
      card.appendChild(el("div", { class: "projrow" },
        el("div", { class: "spread", style: { marginBottom: "6px" } },
          el("div", { class: "row" }, avatar(m.player, 28), el("div", {}, el("div", { style: { fontWeight: 800 } }, m.player.name + (m.player.id === youId ? " · you" : "")), el("div", { class: "muted", style: { fontSize: "11px" } }, `exp ${Math.round(m.expectedPoints)} pts · range ${m.p10}–${m.p90}`))),
          el("div", { class: "center" }, el("div", { class: "num numeral-lg", style: { color: "var(--coral-deep)" } }, pct(m.winProb, 1)), el("div", { class: "muted", style: { fontSize: "10px" } }, "win pool")),
        ),
        el("div", { class: "spread", style: { gap: "10px", alignItems: "flex-end" } },
          el("div", { style: { flex: 1 } }, bar(m.winProb, m.player.color), el("div", { class: "muted", style: { fontSize: "10.5px", marginTop: "4px" } }, "top-3 " + pct(m.podiumProb))),
          histogram(m.distribution, { bins: 20 }),
        ),
      ));
    });
    results.appendChild(card);
  }

  // restore last stamp label
  const last = ctx.store.getState().settings.lastSimStamp;
  if (last) stamp.textContent = `Last run · ${stampLabel(last)} — re-run to refresh`;

  ctx.onCleanup(() => { if (worker) worker.terminate(); });
  return root;
}
