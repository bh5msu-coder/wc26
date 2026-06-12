// Tier-A sharing: a compact, URL-safe snapshot of the SHARED pool state
// (results + draft) — no backend. Compressed with the browser-native
// CompressionStream (gzip) when available, base64url-encoded. The chosen
// identity (currentUserId) and local preferences are never included.

export const SHARED_FIELDS = ["results", "draftPicks", "draftSeedVersion"];

/** Pull only the shared slice of state. */
export function sharedSlice(state) {
  return {
    results: state.results || {},
    draftPicks: state.draftPicks || null,
    draftSeedVersion: state.draftSeedVersion ?? null,
  };
}

function bytesToB64url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function gzip(str) {
  const cs = new CompressionStream("gzip");
  const stream = new Blob([str]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function gunzip(bytes) {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Response(stream).text();
}

/** Encode the shared slice into a URL-safe token. First char flags the codec. */
export async function encodeSnapshot(state) {
  const json = JSON.stringify({ v: 1, ...sharedSlice(state) });
  if (typeof CompressionStream === "function") {
    return "g" + bytesToB64url(await gzip(json));
  }
  return "r" + bytesToB64url(new TextEncoder().encode(json));
}

/** Decode a token back into a shared-slice object. Throws on malformed input. */
export async function decodeSnapshot(token) {
  if (!token || token.length < 2) throw new Error("Empty share code.");
  const flag = token[0];
  const bytes = b64urlToBytes(token.slice(1));
  const json = flag === "g" ? await gunzip(bytes) : new TextDecoder().decode(bytes);
  const obj = JSON.parse(json);
  if (typeof obj !== "object" || obj == null) throw new Error("Not a valid share code.");
  return { results: obj.results || {}, draftPicks: obj.draftPicks || null, draftSeedVersion: obj.draftSeedVersion ?? null };
}

/** Deterministic merge of an incoming shared slice over the local one. */
export function mergeShared(local, incoming, mode) {
  if (mode === "replace") return { ...incoming };
  return {
    results: { ...(local.results || {}), ...(incoming.results || {}) }, // incoming wins per match
    draftPicks: incoming.draftPicks || local.draftPicks || null,
    draftSeedVersion: incoming.draftSeedVersion ?? local.draftSeedVersion ?? null,
  };
}
