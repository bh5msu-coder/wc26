import { el, clear } from "../core/dom.js";
import { avatar, pill, ICONS, natColors, readableOn } from "../components/ui.js";
import { computeDerived, ownerByCode } from "../logic/selectors.js";

export function renderNationDetail(ctx) {
  const code = (ctx.params[0] || "").toUpperCase();
  const root = el("div", {});
  const body = el("div", {});
  root.append(el("button", { class: "btn ghost", style: { marginBottom: "12px" }, on: { click: () => history.back() } }, ICONS.back(), "Back"), body);

  function build() {
    const state = ctx.store.getState();
    const d = computeDerived(state);
    const n = d.byCode[code];
    if (!n) { clear(body); body.append(el("div", { class: "muted" }, "Unknown nation.")); return; }
    const owner = ownerByCode(d.picks)[code];
    const player = state.data.players.find((p) => p.id === owner);
    clear(body);
    const stat = (label, val) => el("div", { class: "center", style: { flex: 1 } }, el("div", { class: "num numeral-lg" }, val), el("div", { class: "muted", style: { fontSize: "10px" } }, label));
    const { a, b } = natColors(n);
    body.append(
      el("div", { class: "natbanner", style: { background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`, color: readableOn(a) } },
        el("div", { class: "flag" }, n.flag),
        el("div", { class: "nname" }, n.name),
        el("div", { class: "nmeta" },
          pill("Group " + n.group, "muted"), pill("FIFA #" + (n.fifaRank ?? "—"), "muted"), n.titles ? pill("★".repeat(n.titles), "soft") : "", n.champion ? pill("🏆 Champion", "coral") : (n.alive ? pill("Still alive", "done") : pill("Eliminated", "muted")),
        ),
      ),
      el("div", { class: "card spread", style: { marginBottom: "12px" } },
        stat("Points", n.points), stat("Strength", Math.round(n.strength)), stat("KO wins", n.KOW || 0),
      ),
      el("div", { class: "card spread", style: { marginBottom: "12px" } },
        stat("W", n.W || 0), stat("D", n.D || 0), stat("L", n.L || 0), stat("GF", n.GF || 0), stat("CS", n.CS || 0),
      ),
      el("div", { class: "card spread" },
        el("div", { class: "muted" }, "Drafted by"),
        player ? el("button", { class: "row", on: { click: () => ctx.navigate("player/" + player.id) } }, avatar(player, 28), el("b", {}, player.name)) : el("span", { class: "muted" }, "Free agent"),
      ),
    );
  }
  build();
  ctx.subscribe(build);
  return root;
}
