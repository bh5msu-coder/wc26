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

/* ── Country colours ───────────────────────────────────────────────
   Each nation carries `colors: [primary, secondary]` (national-team
   colours). These helpers turn that into legible UI accents. */
const FALLBACK = ["#9A8C76", "#DcC7A8"];

export function natColors(nation) {
  const c = Array.isArray(nation?.colors) && nation.colors.length ? nation.colors : FALLBACK;
  return { a: c[0], b: c[1] || c[0] };
}

/** Relative luminance (0–1) of a #rrggbb colour. */
function luminance(hex) {
  const h = String(hex).replace("#", "");
  if (h.length < 6) return 0.5;
  const ch = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

/** Pick ink or white text for legibility on a solid colour. */
export function readableOn(hex) {
  return luminance(hex) > 0.5 ? "#1E160E" : "#FFFFFF";
}

/** A flag-led chip; pass `dot` for a country-colour cue, `color` to tint the code. */
export function flagChip(nation, { showName = false, size = 20, dot = false, color = false } = {}) {
  const { a } = natColors(nation);
  return el("span", { class: "flagchip" },
    dot ? el("span", { class: "natdot", style: { background: a } }) : "",
    el("span", { class: "flag", style: { fontSize: size + "px" } }, nation?.flag || "🏳️"),
    el("span", { class: "code", style: color ? { color: a } : {} }, showName ? (nation?.name || nation?.code) : (nation?.code || "—")),
  );
}

/** A fully country-coloured tag: flag + code (+ optional trailing note). */
export function natTag(nation, { note = "", strong = false } = {}) {
  const { a, b } = natColors(nation);
  return el("span", {
    class: "nattag" + (strong ? " strong" : ""),
    style: strong
      ? { background: `linear-gradient(135deg, ${a}, ${b})`, color: readableOn(a), borderColor: a }
      : { background: a + "14", borderColor: a + "59", "--nat": a },
  },
    el("span", { class: "flag", style: { fontSize: "15px" } }, nation?.flag || "🏳️"),
    el("span", { class: "ncode" }, nation?.code || "—"),
    note !== "" ? el("span", { class: "nnote" }, note) : "",
  );
}

export function pill(text, kind = "muted") {
  return el("span", { class: "pill " + kind }, text);
}

export function bar(p, color) {
  return el("div", { class: "bar" }, el("span", { style: { width: Math.max(0, Math.min(1, p)) * 100 + "%", background: color || "var(--coral)" } }));
}
