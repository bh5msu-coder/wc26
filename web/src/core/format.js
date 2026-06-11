// Formatting + small animation helpers.

export const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function money(n, currency = "USD") {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return "$" + Math.round(n); }
}

export function pct(p, digits = 0) {
  return (p * 100).toFixed(digits) + "%";
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Format a kickoff ISO string in a venue's timezone. */
export function kickoffLabel(iso, tz) {
  const d = new Date(iso);
  const opts = { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz };
  try { return new Intl.DateTimeFormat("en-US", opts).format(d); }
  catch { return d.toUTCString(); }
}

export function dayKey(iso, tz) {
  try { return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: tz }).format(new Date(iso)); }
  catch { return iso.slice(0, 10); }
}

export function stampLabel(iso) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
  catch { return iso; }
}

/** Animate a number element counting to `to`. Respects reduced-motion. */
export function countUp(node, to, { duration = 650, from } = {}) {
  const start = from != null ? from : Number(node.textContent.replace(/[^\d.-]/g, "")) || 0;
  if (start === to || prefersReducedMotion()) { node.textContent = String(Math.round(to)); return; }
  const t0 = performance.now();
  function tick(now) {
    const k = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - k, 3);
    node.textContent = String(Math.round(start + (to - start) * eased));
    if (k < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
