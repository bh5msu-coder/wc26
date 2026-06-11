// ES-module Web Worker: runs the Monte-Carlo off the main thread.
// Imports the SAME pure module that Vitest tests — no duplicated logic.
import { simulate } from "../logic/simulate.js";

self.onmessage = (e) => {
  const msg = e.data;
  if (!msg || msg.type !== "run") return;
  try {
    const result = simulate(msg.input);
    self.postMessage({ type: "result", requestId: msg.requestId, result, stamp: new Date().toISOString() });
  } catch (err) {
    self.postMessage({ type: "error", requestId: msg.requestId, message: String(err && err.message || err) });
  }
};
