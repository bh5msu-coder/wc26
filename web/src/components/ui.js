import { el } from "../core/dom.js";

const SVG = "http://www.w3.org/2000/svg";
function svgIcon(paths, { size = 22, fill = false } = {}) {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", size); s.setAttribute("height", size);
  s.setAttribute("fill", fill ? "currentColor" : "none");
  s.setAttribute("stroke", fill ? "none" : "currentColor");
  s.setAttribute("stroke-width", "1.9"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
  for (const d of [].concat(paths)) { const p = document.createElementNS(SVG, "path"); p.setAttribute("d", d); s.appendChild(p); }
  return s;
}

export const ICONS = {
  table: () => svgIcon(["M5 21V7l7-4 7 4v14", "M9 21v-6h6v6", "M3 21h18"]),
  draft: () => svgIcon(["M4 5h7v7H4z", "M13 5h7v4h-7z", "M13 11h7v8h-7z", "M4 14h7v5H4z"]),
  squad: () => svgIcon(["M9 8a3 3 0 100-6 3 3 0 000 6z", "M3 20a6 6 0 0112 0", "M16 4a3 3 0 010 6", "M21 20a5 5 0 00-4-4.9"]),
  fixtures: () => svgIcon(["M4 6h16v15H4z", "M4 10h16", "M8 3v4", "M16 3v4"]),
  scoring: () => svgIcon(["M7 4h10v4a5 5 0 01-10 0z", "M7 6H4.5A2.5 2.5 0 007 8.5", "M17 6h2.5A2.5 2.5 0 0117 8.5", "M12 13v3", "M9 20h6", "M10 20l.5-4h3l.5 4"]),
  proj: () => svgIcon(["M4 19V5", "M4 19h16", "M8 16v-5", "M12 16V8", "M16 16v-9"]),
  close: () => svgIcon(["M6 6l12 12M18 6L6 18"]),
  gear: () => svgIcon(["M12 15a3 3 0 100-6 3 3 0 000 6z", "M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 2h-5l-.3 2.9a7 7 0 00-1.7 1l-2.4-1-2 3.4L3 11a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.9h5l.3-2.9a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6c.07-.33.1-.66.1-1z"]),
  back: () => svgIcon(["M15 5l-7 7 7 7"]),
  share: () => svgIcon(["M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7", "M16 6l-4-4-4 4", "M12 2v13"]),
};

export function avatar(player, size = 30) {
  const initials = player.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return el("div", { class: "avatar", style: { background: player.color, width: size + "px", height: size + "px", fontSize: Math.round(size * 0.4) + "px" } }, initials);
}

export function flagChip(nation, { showName = false, size = 20 } = {}) {
  return el("span", { class: "flagchip" },
    el("span", { class: "flag", style: { fontSize: size + "px" } }, nation?.flag || "🏳️"),
    el("span", { class: "code" }, showName ? (nation?.name || nation?.code) : (nation?.code || "—")),
  );
}

export function pill(text, kind = "muted") {
  return el("span", { class: "pill " + kind }, text);
}

export function bar(p, color) {
  return el("div", { class: "bar" }, el("span", { style: { width: Math.max(0, Math.min(1, p)) * 100 + "%", background: color || "var(--coral)" } }));
}
