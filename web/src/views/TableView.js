import { el, clear } from "../core/dom.js";
import { avatar, flagChip, pill, ICONS, flagImg } from "../components/ui.js";
import { confettiBurst } from "../components/charts.js";
import { capture, play } from "../core/flip.js";
import { countUp, kickoffLabel } from "../core/format.js";
import { computeDerived, fixtureStatus, todaysFixtures } from "../logic/selectors.js";
import { openResultEntry } from "./ResultEntryView.js";

export function renderTable(ctx) {
  const root = el("div", {});
  const heroSlot = el("div", {});
  const standWrap = el("div", { class: "stand", attrs: { role: "list", "aria-label": "Pool standings" } });
  root.append(
    el("div", { class: "viewhead" },
      el("div", { class: "kicker" }, "Live standings"),
      el("h1", {}, "The Table"),
    ),
    heroSlot,
    el("div", { class: "daygroup" }, "Standings · tap a stake to enter a result"),
    standWrap,
  );

  const rowByMgr = new Map();
  let prevRank = new Map();
  let sawChampion = false;

  function buildRow(player) {
    const row = el("div", { class: "standrow", attrs: { role: "listitem" }, dataset: { mgr: player.id }, style: { "--mgr": player.color } },
      el("div", { class: "rank num" }, "—"),
      avatar(player, 34),
      el("div", { class: "who" },
        el("div", { class: "name" }, player.name + (player.isYou ? " · you" : "")),
        el("div", { class: "meta" }, ""),
        el("div", { class: "natdots" }),
      ),
      el("div", { class: "pts" }, el("div", { class: "total num" }, "0"), el("div", { class: "added" }, "")),
    );
    return row;
  }

  function update() {
    const state = ctx.store.getState();
    const d = computeDerived(state);
    const colorsByCode = new Map(state.data.nations.map((n) => [n.code, (n.colors && n.colors[0]) || "var(--line-strong)"]));
    renderHero(state, d);

    // FLIP capture
    const firstTops = capture(rowByMgr);

    // ensure rows exist, set order
    d.standings.forEach((r) => { if (!rowByMgr.has(r.id)) rowByMgr.set(r.id, buildRow(state.data.players.find((p) => p.id === r.id))); });
    d.standings.forEach((r) => standWrap.appendChild(rowByMgr.get(r.id))); // reorder by appending in rank order

    // update content
    let championJustCrowned = false;
    d.standings.forEach((r) => {
      const row = rowByMgr.get(r.id);
      row.classList.toggle("you", r.isYou);
      row.classList.toggle("leader", r.rank === 1);
      row.querySelector(".rank").textContent = String(r.rank);
      const aliveTeams = r.nations.length;
      row.querySelector(".who .meta").textContent = `${aliveTeams} nations · ${r.alive} alive`;
      // country-colour dots (ordered by points, mirrors squad order)
      const dots = row.querySelector(".natdots");
      clear(dots);
      [...r.nations].sort((a, b) => b.points - a.points).forEach((n) =>
        dots.appendChild(el("i", { style: { background: colorsByCode.get(n.code) }, attrs: { title: n.code } })));
      const totalEl = row.querySelector(".total");
      countUp(totalEl, r.total);
      // rank arrow
      const old = prevRank.get(r.id);
      const arrowHost = row.querySelector(".rank");
      const existingArrow = arrowHost.querySelector(".rankarrow");
      if (existingArrow) existingArrow.remove();
      if (old != null && old !== r.rank) {
        const up = old > r.rank;
        arrowHost.appendChild(el("span", { class: "rankarrow " + (up ? "up" : "down") }, up ? "▲" : "▼"));
      }
    });
    // champion confetti
    const champ = Object.values(d.byCode).find((n) => n.champion);
    if (champ && !sawChampion) championJustCrowned = true;
    sawChampion = !!champ;

    play(rowByMgr, firstTops);
    prevRank = new Map(d.standings.map((r) => [r.id, r.rank]));
    if (championJustCrowned) confettiBurst();
  }

  function renderHero(state, d) {
    const fixtures = todaysFixtures(state);
    const byCode = new Map(state.data.nations.map((n) => [n.code, n]));
    clear(heroSlot);
    const hero = el("div", { class: "hero" });
    if (!fixtures.length) {
      hero.append(
        el("h2", {}, "Pot on the line"),
        el("div", { class: "spread", style: { marginTop: "8px" } },
          el("div", {}, el("div", { class: "num numeral-xl" }, "$" + (state.data.pool.economics.entryFee * state.data.pool.meta.managerCount)), el("div", { style: { opacity: .7, fontSize: "12px" } }, "total pot · 8 managers")),
          el("div", { class: "center" }, el("div", { class: "num numeral-lg" }, d.standings[0]?.name || "—"), el("div", { style: { opacity: .7, fontSize: "12px" } }, "current leader")),
        ),
      );
    } else {
      hero.append(el("h2", {}, "Today · " + fixtures.length + " match" + (fixtures.length > 1 ? "es" : "")));
      fixtures.slice(0, 4).forEach((f) => {
        const st = fixtureStatus(f, state.results);
        const res = state.results[f.id];
        const h = byCode.get(f.home), a = byCode.get(f.away);
        const barFor = (n) => el("div", { class: "bar", style: { background: (n?.colors && n.colors[0]) || "rgba(255,255,255,.4)" } });
        hero.appendChild(el("div", { class: "matchcard", attrs: { role: "button", tabindex: "0" }, on: { click: () => openResultEntry(ctx, f.id), keydown: (e) => { if (e.key === "Enter") openResultEntry(ctx, f.id); } } },
          el("div", { class: "side" }, flagImg(h, { size: 26 }), el("span", { class: "code" }, f.home), barFor(h)),
          el("div", { class: "vs" },
            el("div", { class: "score" }, res ? `${res.hs}–${res.as}` : "vs"),
            el("div", { class: "clock" }, st === "final" ? "Full time" : st === "live" ? "LIVE" : new Date(f.kickoff).toUTCString().slice(17, 22)),
          ),
          el("div", { class: "side" }, flagImg(a, { size: 26 }), el("span", { class: "code" }, f.away), barFor(a)),
        ));
      });
    }
    heroSlot.appendChild(hero);
  }

  update();
  ctx.subscribe(update);
  return root;
}
