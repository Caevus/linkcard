// Snapshot transport: Snapshot <-> page-address fragment ("#snapshot=<base64url of UTF-8 JSON>").
// The fragment is never sent to a server. encodeSnapshot is SELF-CONTAINED (no imports or outside
// references) because the bookmarklet embeds its source text.
export function encodeSnapshot(snap) {
  const bytes = new TextEncoder().encode(JSON.stringify(snap));
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const FRAGMENT_KEY = "snapshot=";
export const EDITS_KEY = "edits=";

const fromB64Url = (text) => {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
};

// Fragment parts are separated by "&"; base64url never contains one. Links with only "snapshot=" stay valid.
function part(hash, key) {
  for (const p of (hash || "").replace(/^#/, "").split("&")) if (p.startsWith(key)) return p.slice(key.length);
  return null;
}

/** Snapshot from a location hash ("#snapshot=..."), or null when absent or unreadable. */
export function snapshotFromHash(hash) {
  const text = part(hash, FRAGMENT_KEY);
  if (text === null) return null;
  try {
    const snap = fromB64Url(text);
    return snap && typeof snap === "object" ? snap : null;
  } catch {
    return null;
  }
}

/** Fragment text for edits ({ headline, outlet, date }), appended after the Snapshot part with "&". */
export function encodeEdits(edits) {
  const bytes = new TextEncoder().encode(JSON.stringify(edits));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Edits ({ headline, outlet, date }) from a location hash ("...&edits=..."), or null when absent or unreadable. */
export function editsFromHash(hash) {
  const text = part(hash, EDITS_KEY);
  if (text === null) return null;
  try {
    const e = fromB64Url(text);
    if (!e || typeof e !== "object") return null;
    return { headline: String(e.headline ?? ""), outlet: String(e.outlet ?? ""), date: String(e.date ?? "") };
  } catch {
    return null;
  }
}
