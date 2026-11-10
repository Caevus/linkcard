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

/** Snapshot from a location hash ("#snapshot=..."), or null when absent or unreadable. */
export function snapshotFromHash(hash) {
  const h = (hash || "").replace(/^#/, "");
  if (!h.startsWith(FRAGMENT_KEY)) return null;
  try {
    const b64 = h.slice(FRAGMENT_KEY.length).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const snap = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
    return snap && typeof snap === "object" ? snap : null;
  } catch {
    return null;
  }
}
