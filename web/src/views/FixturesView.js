import { el, clear } from "../core/dom.js";
import { pill, natColors, flagImg } from "../components/ui.js";
import { kickoffLabel, dayKey } from "../core/format.js";
import { ownerByCode, effectivePicks, fixtureStatus } from "../logic/selectors.js";
import { openResultEntry } from "./ResultEntryView.js";

const FILTERS = [["all", "All"], ["group", "Groups"], ["ko", "Knockout"], ["mine", "My stake"]];

export function renderFixtures(ctx) {
  const root = el("div", {});
  const list = el("div", {});
  // default to the current user's stake when they've picked an identity
  let filter = ctx.store.getState().currentUserId ? "mine" : "all";
  const seg = el("div", { class: "seg", attrs: { role: "tablist" } },
    ...FILTERS.map(([k, label]) => el("button", { attrs: { role: "tab", "aria-pressed": String(k === filter) }, on: { click: () => { filter = k; build(); } } }, label)),
  );
  root.append(
    el("div", { class: "viewhead" }, el("div", { class: "kicker" }, "Schedule"), el("h1", {}, "Fixtures")),
    seg,
    list,
  );

  function build() {
    const state = ctx.store.getState();
    const { schedule, nations, venues, players } = state.data;
    const byCode = new Map(nations.map((n) => [n.code, n]));
    const venueById = new Map(venues.map((v) => [v.id, v]));
    const owner = ownerByCode(effectivePicks(state));
    const colorOf = (mid) => players.find((p) => p.id === mid)?.color;
    const me = state.currentUserId;

    [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String(FILTERS[i][0] === filter)));

    let fixtures = schedule;
    if (filter === "group") fixtures = fixtures.filter((f) => f.stage === "Group");
    else if (filter === "ko") fixtures = fixtures.filter((f) => f.stage !== "Group");
    else if (filter === "mine") fixtures = fixtures.filter((f) => owner[f.home] === me || owner[f.away] === me);

    clear(list);
    let lastDay = null;
    const venueTz = (f) => venueById.get(f.venueId)?.tz;
    for (const f of fixtures) {
      const dk = dayKey(f.kickoff, venueTz(f));
      if (dk !== lastDay) { list.appendChild(el("div", { class: "daygroup" }, dk)); lastDay = dk; }
      const h = byCode.get(f.home), a = byCode.get(f.away);
      const res = state.results[f.id];
      const st = fixtureStatus(f, state.results);
      const stakeDots = [f.home, f.away].map((c) => owner[c] ? el("span", { class: "stakedot", style: { background: colorOf(owner[c]) }, attrs: { title: c + " is drafted" } }) : null).filter(Boolean);
      const clickable = h && a;
      const venue = venueById.get(f.venueId);
      const natdot = (n) => el("span", { class: "natdot", style: { background: natColors(n).a } });
      list.appendChild(el("div", { class: "fxrow", attrs: clickable ? { role: "button", tabindex: "0" } : {}, on: clickable ? { click: () => openResultEntry(ctx, f.id), keydown: (e) => e.key === "Enter" && openResultEntry(ctx, f.id) } : {} },
        el("div", { class: "team" }, natdot(h), flagImg(h, { size: 18 }), el("b", {}, f.home)),
        el("div", { class: "sc" }, res ? `${res.hs}–${res.as}` : (f.group ? "Grp " + f.group : f.stage)),
        el("div", { class: "team away" }, el("b", {}, f.away), flagImg(a, { size: 18 }), natdot(a)),
        el("div", { class: "stake" }, st === "final" ? pill("FT", "done") : st === "live" ? pill("LIVE", "live") : el("span", { class: "muted", style: { fontSize: "10px" } }, venue?.city?.split(" ")[0] || ""), ...stakeDots),
      ));
    }
    if (!fixtures.length) list.appendChild(el("div", { class: "muted center", style: { padding: "24px" } }, "No fixtures for this filter."));
  }
  build();
  ctx.subscribe(build);
  return root;
}
