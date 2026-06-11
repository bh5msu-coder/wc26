import { el, clear } from "../core/dom.js";
import { avatar, flagChip, pill } from "../components/ui.js";
import { draftState, roundOfPick } from "../logic/draftgen.js";
import { effectivePicks } from "../logic/selectors.js";
import { priorStrength } from "../logic/strength.js";

export function renderDraft(ctx) {
  const root = el("div", {});
  const body = el("div", {});
  root.append(
    el("div", { class: "viewhead" }, el("div", { class: "kicker" }, "Snake draft · 6 rounds"), el("h1", {}, "The Draft")),
    body,
  );

  function build() {
    const state = ctx.store.getState();
    const { players, pool, nations } = state.data;
    const picks = effectivePicks(state);
    const order = pool.draftOrder;
    const st = draftState(order, picks);
    const byCode = new Map(nations.map((n) => [n.code, n]));
    const columns = [...players].sort((a, b) => order[a.id][0] - order[b.id][0]);
    const rounds = pool.meta.rounds;

    clear(body);

    // on the clock banner
    if (st.onClock) {
      const mgr = players.find((p) => p.id === st.onClockManager);
      body.appendChild(el("div", { class: "card", style: { marginBottom: "12px", display: "flex", alignItems: "center", gap: "11px" } },
        avatar(mgr, 34),
        el("div", { style: { flex: 1 } }, el("div", { style: { fontWeight: 800 } }, `${mgr.name} on the clock`), el("div", { class: "muted", style: { fontSize: "12px" } }, `Pick ${st.onClock} of ${st.total} · round ${roundOfPick(order, st.onClock)}`)),
        pill("LIVE", "coral"),
      ));
    } else {
      body.appendChild(el("div", { class: "card", style: { marginBottom: "12px", textAlign: "center", fontWeight: 700 } }, "Draft complete — all 48 picks in."));
    }

    // grid
    const grid = el("div", { class: "draftgrid", style: { gridTemplateColumns: `repeat(${columns.length}, 1fr)` } });
    columns.forEach((p) => grid.appendChild(el("div", { class: "colhead" }, avatar(p, 26), el("span", { class: "name", style: { color: p.isYou ? "var(--coral)" : "var(--faint)" } }, p.name))));
    for (let r = 0; r < rounds; r++) {
      columns.forEach((p) => {
        const pn = order[p.id][r];
        const made = st.made.get(pn);
        const nat = made ? byCode.get(made.code) : null;
        const onClock = pn === st.onClock;
        grid.appendChild(el("div", { class: "draftcell" + (p.isYou ? " you" : "") + (made ? "" : " empty") + (onClock ? " onclock" : "") },
          el("span", { class: "pn" }, pn),
          nat ? el("span", { class: "flag" }, nat.flag) : el("span", { class: "flag", style: { opacity: .4 } }, "·"),
          el("span", { class: "code" }, nat ? nat.code : "—"),
        ));
      });
    }
    body.appendChild(el("div", { class: "grid-scroll" }, grid));
    body.appendChild(el("div", { class: "center muted", style: { fontSize: "11px", marginTop: "10px" } }, `Custom order · ${rounds} rounds · ${st.total} picks`));

    // pick tool
    if (st.onClock) {
      const taken = new Set([...st.made.values()].map((m) => m.code));
      const avail = nations.filter((n) => !taken.has(n.code)).sort((a, b) => priorStrength(b) - priorStrength(a));
      const mgr = players.find((p) => p.id === st.onClockManager);
      const panel = el("div", { style: { marginTop: "16px" } },
        el("div", { class: "daygroup" }, `Make pick ${st.onClock} · ${mgr.name} · best available`),
        el("div", { class: "wrap" }, ...avail.slice(0, 24).map((n) => el("button", {
          class: "pill muted", style: { fontSize: "12px", padding: "7px 11px" },
          on: { click: () => makePick(st.onClock, st.onClockManager, n.code) },
        }, `${n.flag} ${n.code}`))),
      );
      body.appendChild(panel);
    }

    // value vs reach recap
    body.appendChild(recap(state, picks, byCode));
  }

  function makePick(pickNumber, managerId, code) {
    const state = ctx.store.getState();
    const picks = effectivePicks(state).filter((p) => p.pickNumber !== pickNumber);
    picks.push({ pickNumber, round: roundOfPick(state.data.pool.draftOrder, pickNumber), managerId, code });
    picks.sort((a, b) => a.pickNumber - b.pickNumber);
    ctx.commitDraft(picks);
  }

  function recap(state, picks, byCode) {
    // strength rank of each nation (1 = strongest)
    const ranked = [...state.data.nations].sort((a, b) => priorStrength(b) - priorStrength(a));
    const rankOf = new Map(ranked.map((n, i) => [n.code, i + 1]));
    const scored = picks.map((p) => ({ ...p, value: p.pickNumber - rankOf.get(p.code) })); // + = value (drafted later than strength)
    const best = [...scored].sort((a, b) => b.value - a.value).slice(0, 3);
    const reach = [...scored].sort((a, b) => a.value - b.value).slice(0, 3);
    const line = (p, tone) => el("div", { class: "spread", style: { padding: "7px 0" } },
      el("div", { class: "row" }, el("span", { class: "flag", style: { fontSize: "18px" } }, byCode.get(p.code)?.flag || ""), el("b", {}, p.code), el("span", { class: "muted", style: { fontSize: "11px" } }, "pick #" + p.pickNumber)),
      pill((p.value >= 0 ? "+" : "") + p.value, tone),
    );
    return el("div", { style: { marginTop: "16px" } },
      el("div", { class: "daygroup" }, "Draft recap · value vs reach"),
      el("div", { class: "card tight" }, ...best.map((p) => line(p, "done")), ...reach.map((p) => line(p, "soft"))),
    );
  }

  build();
  ctx.subscribe(build);
  return root;
}
