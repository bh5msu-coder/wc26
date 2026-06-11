import { el } from "../core/dom.js";
import { prefersReducedMotion } from "../core/format.js";

/** Histogram of a numeric distribution into `bins` bars. */
export function histogram(values, { bins = 22 } = {}) {
  const wrap = el("div", { class: "hist" });
  if (!values || !values.length) return wrap;
  const lo = values[0], hi = values[values.length - 1];
  const span = hi - lo || 1;
  const counts = new Array(bins).fill(0);
  for (const v of values) counts[Math.min(bins - 1, Math.floor(((v - lo) / span) * bins))]++;
  const max = Math.max(...counts) || 1;
  for (const c of counts) wrap.appendChild(el("span", { style: { height: (c / max) * 100 + "%" }, attrs: { "aria-hidden": "true" } }));
  return wrap;
}

/** SVG sparkline from a series of numbers. */
export function sparkline(series, { w = 240, h = 40, color = "var(--coral)" } = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "spark"); svg.setAttribute("preserveAspectRatio", "none");
  if (!series || series.length < 2) return svg;
  const lo = Math.min(...series), hi = Math.max(...series), span = hi - lo || 1;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * w, h - ((v - lo) / span) * (h - 6) - 3]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d); path.setAttribute("fill", "none"); path.setAttribute("stroke", color); path.setAttribute("stroke-width", "2.4"); path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

/** Champion confetti burst on a canvas; no-op under reduced motion. */
export function confettiBurst(durationMs = 2200) {
  if (prefersReducedMotion()) return;
  const canvas = el("canvas", { class: "confetti" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  function size() { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; }
  size();
  const colors = ["#F0492E", "#E0A23B", "#2EA56B", "#2E7CF6", "#C6FF3A", "#FFC83D"];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width, y: -20, vx: (Math.random() - 0.5) * 6 * dpr, vy: (2 + Math.random() * 4) * dpr,
    s: (4 + Math.random() * 6) * dpr, c: colors[(Math.random() * colors.length) | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
  }));
  const t0 = performance.now();
  function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05 * dpr; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
    }
    if (now - t0 < durationMs) requestAnimationFrame(frame); else canvas.remove();
  }
  requestAnimationFrame(frame);
}
