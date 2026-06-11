// Central reactive store: one state object, shallow top-level merge, sync notify.
export function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  function getState() { return state; }

  function setState(patchOrFn) {
    const patch = typeof patchOrFn === "function" ? patchOrFn(state) : patchOrFn;
    state = { ...state, ...patch };
    for (const l of listeners) l(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /** Subscribe to a derived slice; callback fires only when it changes. */
  function select(selector, equal = Object.is) {
    let current = selector(state);
    return {
      get: () => current,
      subscribe(cb) {
        return subscribe((s) => {
          const next = selector(s);
          if (!equal(next, current)) { current = next; cb(next); }
        });
      },
    };
  }

  return { getState, setState, subscribe, select };
}
