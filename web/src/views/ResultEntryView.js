import { el } from "../core/dom.js";
import { openModal } from "../components/Modal.js";
import { flagChip, avatar, pill } from "../components/ui.js";
import { validateScore } from "../logic/derive.js";
import { computeDerived, ownerByCode } from "../logic/selectors.js";

/** Open the guided result-entry modal for a fixture. */
export function openResultEntry(ctx, fixtureId) {
  const state = ctx.store.getState();
  const fixture = state.data.schedule.find((f) => f.id === fixtureId);
  if (!fixture) return;
  const byCode = new Map(state.data.nations.map((n) => [n.code, n]));
  const home = byCode.get(fixture.home);
  const away = byCode.get(fixture.away);
  if (!home || !away) return; // TBD knockout slot
  const isKO = ["R32", "R16", "QF", "SF", "3rd", "Final"].includes(fixture.stage);
  const existing = state.results[fixtureId];

  let hs = existing ? existing.hs : 0;
  let as = existing ? existing.as : 0;
  let shootoutWinner = existing ? existing.shootoutWinner || null : null;

  const hsInput = numInput(hs, (v) => { hs = v; refresh(); });
  const asInput = numInput(as, (v) => { as = v; refresh(); });
  const shootRow = el("div", { class: "wrap", style: { marginTop: "6px", justifyContent: "center" } });
  const errBox = el("div", {});
  const preview = el("div", { class: "stack", style: { gap: "6px", marginTop: "8px" } });
  const saveBtn = el("button", { class: "btn primary block", on: { click: doSave } }, existing ? "Update result" : "Save result");
  const clearBtn = existing
    ? el("button", { class: "btn ghost block", on: { click: doClear } }, "Undo this result")
    : null;

  const content = el("div", {},
    el("div", { class: "muted center", style: { fontSize: "12px", fontWeight: "700", letterSpacing: ".06em", textTransform: "uppercase" } }, `${fixture.stage}${fixture.group ? " · Group " + fixture.group : ""}`),
    el("div", { class: "scoreinput" },
      el("div", { class: "stepper" }, el("span", { class: "flag" }, home.flag), el("span", { class: "code", style: { fontWeight: 800 } }, home.code), hsInput),
      el("div", { class: "center num", style: { color: "var(--faint)" } }, "–"),
      el("div", { class: "stepper" }, el("span", { class: "flag" }, away.flag), el("span", { class: "code", style: { fontWeight: 800 } }, away.code), asInput),
    ),
    shootRow,
    errBox,
    el("div", { class: "daygroup", style: { marginTop: "14px" } }, "Live preview · who this moves"),
    preview,
    el("div", { class: "stack", style: { marginTop: "14px" } }, saveBtn, clearBtn),
  );

  const handle = openModal(`${home.name} vs ${away.name}`, content);
  refresh();

  function refresh() {
    // shootout toggle (KO draw)
    shootRow.replaceChildren();
    if (isKO && hs === as) {
      shootRow.appendChild(el("span", { class: "muted", style: { fontSize: "12px", alignSelf: "center" } }, "Shootout winner:"));
      for (const [side, nat] of [["home", home], ["away", away]]) {
        shootRow.appendChild(el("button", {
          class: "pill " + (shootoutWinner === side ? "coral" : "muted"),
          on: { click: () => { shootoutWinner = side; refresh(); } },
        }, nat.code));
      }
    } else if (shootoutWinner) { shootoutWinner = null; }

    const score = { hs, as, shootoutWinner };
    const v = validateScore(fixture, score);
    errBox.replaceChildren(v.ok ? "" : el("div", { class: "errbox" }, v.error));
    saveBtn.disabled = !v.ok;
    saveBtn.style.opacity = v.ok ? "1" : ".5";

    // preview deltas for affected managers
    preview.replaceChildren();
    const owner = ownerByCode(state.draftPicks && state.draftPicks.length ? state.draftPicks : state.data.seedPicks);
    const affected = new Set([owner[home.code], owner[away.code]].filter(Boolean));
    const before = computeDerived(state);
    const afterState = { ...state, results: { ...state.results, [fixtureId]: score } };
    const after = v.ok ? computeDerived(afterState) : before;
    if (!affected.size) { preview.appendChild(el("div", { class: "muted", style: { fontSize: "13px" } }, "Neither team is drafted — no standings change.")); return; }
    for (const mid of affected) {
      const b = before.standings.find((r) => r.id === mid);
      const a = after.standings.find((r) => r.id === mid);
      const player = state.data.players.find((p) => p.id === mid);
      const dPts = a.total - b.total;
      const dRank = b.rank - a.rank; // positive = climbed
      preview.appendChild(el("div", { class: "preview spread" },
        el("div", { class: "row" }, avatar(player, 26), el("b", {}, player.name)),
        el("div", { class: "row", style: { gap: "8px" } },
          el("span", { class: "num", style: { fontSize: "16px" } }, `${b.total} → ${a.total}`),
          dPts ? pill(`+${dPts}`, "done") : pill("±0", "muted"),
          dRank ? pill((dRank > 0 ? "▲" : "▼") + Math.abs(dRank), dRank > 0 ? "done" : "soft") : "",
        ),
      ));
    }
  }

  function doSave() {
    const score = { hs, as, shootoutWinner };
    if (!validateScore(fixture, score).ok) return;
    const results = { ...ctx.store.getState().results, [fixtureId]: score };
    ctx.commitResults(results);
    handle.close();
  }
  function doClear() {
    const results = { ...ctx.store.getState().results };
    delete results[fixtureId];
    ctx.commitResults(results);
    handle.close();
  }
}

function numInput(value, onChange) {
  const input = el("input", { attrs: { type: "number", min: "0", inputmode: "numeric", "aria-label": "Goals" } });
  input.value = String(value);
  input.addEventListener("input", () => {
    const v = parseInt(input.value, 10);
    onChange(Number.isFinite(v) && v >= 0 ? v : 0);
  });
  return input;
}
