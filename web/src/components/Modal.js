import { el } from "../core/dom.js";
import { ICONS } from "./ui.js";

/** Accessible bottom-sheet modal with focus trap, ESC + backdrop close. */
export function openModal(title, contentNode, { onClose } = {}) {
  const prevFocus = document.activeElement;
  const closeBtn = el("button", { class: "iconbtn", attrs: { "aria-label": "Close" }, on: { click: close } }, ICONS.close());
  const modal = el("div", { class: "modal pop", attrs: { role: "dialog", "aria-modal": "true", "aria-label": title } },
    el("div", { class: "spread", style: { marginBottom: "8px" } }, el("h3", {}, title), closeBtn),
    contentNode,
  );
  const backdrop = el("div", { class: "backdrop", on: { click: (e) => { if (e.target === backdrop) close(); } } }, modal);

  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const f = modal.querySelectorAll('button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function close() {
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
    if (prevFocus && prevFocus.focus) prevFocus.focus();
    onClose && onClose();
  }
  document.addEventListener("keydown", onKey);
  document.body.appendChild(backdrop);
  setTimeout(() => { const t = modal.querySelector("input, button:not(.iconbtn)"); (t || closeBtn).focus(); }, 30);
  return { close, modal };
}
