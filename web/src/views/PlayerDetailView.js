import { el, clear } from "../core/dom.js";
import { avatar, pill, bar, ICONS, flagImg } from "../components/ui.js";
import { computeDerived } from "../logic/selectors.js";

export function renderPlayerDetail(ctx) {
  const id = ctx.params[0];
  const root = el("div", {});
  const body = el("div", {});
  root.append(
    el("button", { class: "btn ghost", style: { marginBottom: "12px" }, on: { click: () => ctx.navigate("squad") } }, ICONS.back(), "Squads"),
    body,
  );

  function build() {
    const state = ctx.store.getState();
    const player = state.data.players.find((p) => p.id === id);
    if (!player) { clear(body); body.append(el("div", { class: "muted" }, "Unknown player.")); return; }
    const d = computeDerived(state);
    const row = d.standings.find((r) => r.id === id);
    const nations = d.picks.filter((p) => p.managerId === id).map((p) => d.byCode[p.code]).sort((a, b) => b.points - a.points);
    const maxPts = Math.max(1, ...nations.map((n) => n.points));

    clear(body);
    body.append(
      el("div", { class: "card", style: { marginBottom: "12px" } },
        el("div", { class: "spread" },
          el("div", { class: "row" }, avatar(player, 44), el("div", {}, el("div", { style: { fontWeight: 800, fontSize: "18px" } }, player.name + (player.id === state.currentUserId ? " · you" : "")), el("div", { class: "muted", style: { fontSize: "12px" } }, "rank #" + row.rank + " · " + row.alive + " alive"))),
          el("div", { class: "center" }, el("div", { class: "num numeral-xl" }, row.total), el("div", { class: "muted", style: { fontSize: "11px" } }, "points")),
        ),
      ),
      el("div", { class: "daygroup" }, "Points by nation"),
      el("div", { class: "card tight" }, ...nations.map((n) => el("div", { style: { padding: "9px 0", borderBottom: "1px solid var(--line)" } },
        el("div", { class: "spread", style: { marginBottom: "5px" } },
          el("div", { class: "row" }, flagImg(n, { size: 18 }), el("b", {}, n.name), n.champion ? pill("🏆", "soft") : (n.alive ? pill("alive", "done") : pill("out", "muted"))),
          el("div", { class: "num", style: { fontSize: "16px" } }, n.points),
        ),
        bar(n.points / maxPts, player.color),
        el("div", { class: "muted", style: { fontSize: "10.5px", marginTop: "4px" } }, `${n.W}W ${n.D}D ${n.L}L · ${n.GF} GF · ${n.CS} CS · ${n.KOW} KO`),
      ))),
      headToHead(state, d, player),
    );
  }

  function headToHead(state, d, player) {
    const others = state.data.players.filter((p) => p.id !== player.id);
    const sel = el("select", { style: { padding: "8px", borderRadius: "10px", border: "1px solid var(--line-strong)", background: "var(--card)", fontWeight: 700 } },
      ...others.map((p) => el("option", { attrs: { value: p.id } }, p.name)));
    const out = el("div", { style: { marginTop: "10px" } });
    function draw() {
      const opp = d.standings.find((r) => r.id === sel.value);
      const me = d.standings.find((r) => r.id === player.id);
      const diff = me.total - opp.total;
      clear(out);
      out.append(el("div", { class: "card spread" },
        el("div", { class: "center" }, el("div", { class: "num numeral-lg" }, me.total), el("div", { class: "muted", style: { fontSize: "11px" } }, player.name)),
        el("div", { class: "center" }, pill((diff >= 0 ? "+" : "") + diff, diff >= 0 ? "done" : "soft"), el("div", { class: "muted", style: { fontSize: "10px", marginTop: "4px" } }, "lead")),
        el("div", { class: "center" }, el("div", { class: "num numeral-lg" }, opp.total), el("div", { class: "muted", style: { fontSize: "11px" } }, opp.name)),
      ));
    }
    sel.addEventListener("change", draw);
    draw();
    return el("div", { style: { marginTop: "16px" } }, el("div", { class: "daygroup" }, "Head-to-head"), sel, out);
  }

  build();
  ctx.subscribe(build);
  return root;
}
