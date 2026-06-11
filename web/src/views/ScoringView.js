import { el, clear } from "../core/dom.js";
import { money, pct } from "../core/format.js";
import { pot } from "../logic/payouts.js";
import { computeDerived } from "../logic/selectors.js";
import { avatar } from "../components/ui.js";

const RULES = [
  ["W", "Win", "win"], ["D", "Draw", "draw"], ["⚽", "Goal scored", "goal"],
  ["🛡", "Clean sheet", "cs"], ["KO", "Knockout-round win", "ko"], ["🏆", "Champion", "champ"],
];

export function renderScoring(ctx) {
  const root = el("div", {});
  const body = el("div", { class: "stack" });
  root.append(el("div", { class: "viewhead" }, el("div", { class: "kicker" }, "Rules & money"), el("h1", {}, "Scoring")), body);

  function build() {
    const state = ctx.store.getState();
    const { pool, players } = state.data;
    const w = pool.weights;
    const d = computeDerived(state);
    clear(body);

    const rules = el("div", { class: "card" }, el("div", { class: "daygroup", style: { marginTop: 0 } }, "Points per match · all stages"));
    RULES.forEach(([ic, label, key]) => rules.appendChild(el("div", { class: "rule" },
      el("div", { class: "ic" }, ic), el("div", {}, el("b", {}, label)), el("div", { class: "val" }, "+" + w[key]),
    )));
    rules.appendChild(el("div", { class: "muted", style: { fontSize: "12px", paddingTop: "10px" } }, "Side pot: the group-stage points leader. Knockout wins and the champion bonus stack on top of the standard win + goals + clean-sheet points."));
    body.appendChild(rules);

    const total = pot(pool);
    const pay = el("div", { class: "card" }, el("div", { class: "spread", style: { marginBottom: "6px" } }, el("div", { class: "daygroup", style: { marginTop: 0 } }, "The pot"), el("div", { class: "num numeral-lg", style: { color: "var(--coral-deep)" } }, money(total, pool.economics.currency))));
    pay.appendChild(el("div", { class: "muted", style: { fontSize: "12px", marginBottom: "6px" } }, `${money(pool.economics.entryFee, pool.economics.currency)} entry × ${pool.meta.managerCount} managers`));
    d.payouts.forEach((p) => {
      const player = players.find((pp) => pp.id === p.managerId);
      pay.appendChild(el("div", { class: "payrow" },
        el("div", {}, el("b", {}, p.label), el("div", { class: "muted", style: { fontSize: "11px" } }, pct(p.pct) + " of pot")),
        player ? el("div", { class: "row", style: { gap: "7px" } }, avatar(player, 24), el("span", { style: { fontWeight: 700 } }, player.name)) : el("span", { class: "muted" }, "—"),
        el("div", { class: "amt" }, money(p.amount, pool.economics.currency)),
      ));
    });
    body.appendChild(pay);
  }
  build();
  ctx.subscribe(build);
  return root;
}
