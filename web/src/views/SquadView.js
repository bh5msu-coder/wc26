import { el, clear } from "../core/dom.js";
import { avatar, flagChip, pill } from "../components/ui.js";
import { computeDerived, ownerByCode } from "../logic/selectors.js";

export function renderSquad(ctx) {
  const root = el("div", {});
  const body = el("div", { class: "stack" });
  root.append(el("div", { class: "viewhead" }, el("div", { class: "kicker" }, "Rosters"), el("h1", {}, "Squads")), body);

  function build() {
    const state = ctx.store.getState();
    const d = computeDerived(state);
    const owner = ownerByCode(d.picks);
    const byMgr = {};
    for (const p of state.data.players) byMgr[p.id] = [];
    for (const pick of d.picks) (byMgr[pick.managerId] ||= []).push(d.byCode[pick.code]);
    clear(body);
    for (const row of d.standings) {
      const player = state.data.players.find((p) => p.id === row.id);
      const nations = (byMgr[row.id] || []).sort((a, b) => b.points - a.points);
      body.appendChild(el("div", { class: "card", attrs: { role: "button", tabindex: "0" }, on: { click: () => ctx.navigate("player/" + row.id), keydown: (e) => e.key === "Enter" && ctx.navigate("player/" + row.id) } },
        el("div", { class: "spread", style: { marginBottom: "10px" } },
          el("div", { class: "row" }, avatar(player, 32), el("div", {}, el("div", { style: { fontWeight: 800 } }, player.name + (player.isYou ? " · you" : "")), el("div", { class: "muted", style: { fontSize: "11px" } }, "rank #" + row.rank))),
          el("div", { class: "num numeral-lg" }, row.total),
        ),
        el("div", { class: "wrap" }, ...nations.map((n) => el("span", { class: "pill muted", style: { fontSize: "12px" } }, `${n.flag} ${n.code} · ${n.points}`))),
      ));
    }
  }
  build();
  ctx.subscribe(build);
  return root;
}
