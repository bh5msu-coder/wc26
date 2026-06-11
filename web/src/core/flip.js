// FLIP (First-Last-Invert-Play) for smooth list re-ordering. Records positions
// before a DOM reorder, then animates each node from its old spot to the new one.
import { prefersReducedMotion } from "./format.js";

/** Capture current top positions of keyed nodes. Returns a Map<key, top>. */
export function capture(nodesByKey) {
  const rects = new Map();
  for (const [key, node] of nodesByKey) rects.set(key, node.getBoundingClientRect().top);
  return rects;
}

/** After the DOM has been reordered, play the inverse-transform transition. */
export function play(nodesByKey, firstTops, { duration = 480 } = {}) {
  if (prefersReducedMotion()) return;
  for (const [key, node] of nodesByKey) {
    const first = firstTops.get(key);
    if (first == null) continue;
    const last = node.getBoundingClientRect().top;
    const dy = first - last;
    if (!dy) continue;
    node.style.transform = `translateY(${dy}px)`;
    node.style.transition = "transform 0s";
    requestAnimationFrame(() => {
      node.style.transition = `transform ${duration}ms cubic-bezier(.22,.61,.36,1)`;
      node.style.transform = "";
    });
  }
}
