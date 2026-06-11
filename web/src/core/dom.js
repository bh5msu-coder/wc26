// Tiny DOM helpers — the whole "framework". No virtual DOM: components are
// functions that return real nodes; re-rendering means rebuild + mount.

/**
 * el('div', { class, id, on:{click}, attrs:{}, dataset:{}, style:{}, html, text }, ...children)
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "on") for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
    else if (k === "attrs") for (const [a, val] of Object.entries(v)) { if (val != null && val !== false) node.setAttribute(a, val === true ? "" : val); }
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "style") Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** Build a list of child nodes from a mapping (keeps call sites terse). */
export function frag(...children) {
  const f = document.createDocumentFragment();
  appendChildren(f, children);
  return f;
}

export function mount(node, target) {
  clear(target);
  target.appendChild(node);
}

export function clear(target) {
  while (target.firstChild) target.removeChild(target.firstChild);
}

/** Escape user text for safe innerHTML interpolation (rarely needed; prefer text). */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
