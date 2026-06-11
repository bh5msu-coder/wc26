// Hash router: '#/table', '#/player/tom', '#/nation/ARG', '#/result/grp-A-1-1'.
// Hash fragments mean static hosting needs no rewrites and deep links just work.
export function createRouter(onChange) {
  function parse() {
    const raw = (location.hash || "#/table").replace(/^#\/?/, "");
    const [name = "table", ...rest] = raw.split("/");
    return { name, params: rest, raw };
  }
  function emit() { onChange(parse()); }
  function start() {
    window.addEventListener("hashchange", emit);
    if (!location.hash) location.replace("#/table");
    else emit();
  }
  function navigate(path) {
    const next = "#/" + String(path).replace(/^#?\/?/, "");
    if (location.hash === next) emit(); else location.hash = next;
  }
  return { start, navigate, current: parse };
}
