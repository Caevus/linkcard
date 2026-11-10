// Parser: Snapshot (any version) or a URL string -> interpreted article.
// Output shape (same for both modes): { headline, outlet, date, link, domain, icon }
import { hostOf } from "./outlet-registry.js";
import { articleFromUrl, cleanLink } from "./url-only.js";

export const CURRENT_SNAPSHOT_VERSION = 1;

/** Upgrade any Snapshot version to the current shape. Never rejects an older version. */
export function upgradeSnapshot(s) {
  const v = Number(s && s.version) || 1;
  // v1 is current. Future versions: add `if (v < 2) s = {...}` steps here, in order.
  return { ...s, version: Math.max(v, CURRENT_SNAPSHOT_VERSION) };
}

const DATE_META = ["article:published_time", "og:article:published_time", "og:published_time", "datePublished",
  "parsely-pub-date", "pubdate", "publishdate", "date", "sailthru.date", "DC.date.issued"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];

const metaVal = (snap, ...keys) => {
  for (const k of keys) {
    const hit = (snap.meta || []).find((m) => m.key === k && m.content && m.content.trim());
    if (hit) return hit.content.trim();
  }
  return "";
};

function ldDate(node) {
  if (Array.isArray(node)) {
    for (const n of node) { const d = ldDate(n); if (d) return d; }
    return null;
  }
  if (node && typeof node === "object") {
    return node.datePublished || ldDate(node["@graph"]) || ldDate(node.mainEntity) || null;
  }
  return null;
}

export function findDate(snap) {
  const ld = ldDate(snap.jsonld || []);
  return metaVal(snap, ...DATE_META) || (ld ? String(ld) : "") || (snap.time || "").trim();
}

// ISO 8601 with a time: "2026-11-10T02:37:18Z", "2026-11-09 18:37", "2026-11-09T23:30:00-08:00".
const ISO_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;
// RFC 2822 with a time: "Mon, 09 Nov 2026 18:37:00 GMT", "09 Nov 2026 18:37 -0500".
const RFC_TIME = /^(?:[A-Za-z]{3},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([A-Za-z]{1,5}|[+-]\d{4})?/;
const ZONE_HOURS = { UT: 0, UTC: 0, GMT: 0, Z: 0, EST: -5, EDT: -4, CST: -6, CDT: -5, MST: -7, MDT: -6, PST: -8, PDT: -7 };

/** Minutes east of UTC for a zone token. No zone means UTC. Null when the token is not recognized. */
function zoneOffset(z) {
  if (!z) return 0;
  const up = z.toUpperCase();
  if (Object.hasOwn(ZONE_HOURS, up)) return ZONE_HOURS[up] * 60;
  const m = z.match(/^([+-])(\d{2}):?(\d{2})?$/);
  if (m) return (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + +(m[3] || 0));
  return null;
}

/** Calendar date, in the viewer's local zone, of a UTC wall-clock time shifted by the zone offset. */
function localPretty(y, mo, d, h, mi, s, offsetMin) {
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s) - offsetMin * 60000);
  return `${MONTHS[t.getMonth()]} ${t.getDate()}, ${t.getFullYear()}`;
}

/**
 * Display form "November 9, 2026".
 * A timestamp with a time is converted to the viewer's local date; with no zone it is UTC.
 * A date-only value is shown as written, with no conversion.
 */
export function prettyDate(raw) {
  raw = (raw || "").trim();
  let m = raw.match(ISO_TIME);
  if (m && +m[2] >= 1 && +m[2] <= 12) {
    const off = zoneOffset(m[7]);
    if (off !== null) return localPretty(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0), off);
  }
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}`;
  m = raw.match(RFC_TIME);
  if (m) {
    const i = MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === m[2].toLowerCase());
    const off = zoneOffset(m[7]);
    if (i >= 0 && off !== null) return localPretty(+m[3], i + 1, +m[1], +m[4], +m[5], +(m[6] || 0), off);
  }
  m = raw.match(/^(?:[A-Za-z]{3},?\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (m) {
    const i = MONTHS.findIndex((x) => x.slice(0, 3).toLowerCase() === m[2].toLowerCase());
    if (i >= 0) return `${MONTHS[i]} ${+m[1]}, ${m[3]}`;
  }
  return "";
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** True when `tail` equals `name` ignoring punctuation, or starts with `name` as a whole word (case-insensitive). */
function namesSuffix(tail, name) {
  if (norm(tail) && norm(name) === norm(tail)) return true;
  const t = tail.toLowerCase();
  const n = name.trim().toLowerCase();
  return t.startsWith(n) && (t.length === n.length || !/[\p{L}\p{N}]/u.test(t[n.length]));
}

/** Strip a trailing " | Outlet" or " - Outlet" when that suffix names the Outlet (or starts with its name, e.g. "CNN Politics"). */
function stripSuffix(headline, names) {
  const m = headline.match(/^(.*\S)\s+[|\-–—•·]\s+(.+)$/);
  if (!m) return headline;
  const tail = m[2].trim();
  return tail && names.some((n) => n && namesSuffix(tail, n)) ? m[1].trim() : headline;
}

/** input: a Snapshot object (any version) or an http(s) URL string. Returns null for an unusable URL string. */
export function parseArticle(input, registry) {
  if (typeof input === "string") {
    const a = articleFromUrl(input, registry);
    return a && { ...a, icon: null };
  }
  const snap = upgradeSnapshot(input);
  let link = "";
  const base = snap.url || "";
  for (const href of [snap.canonical, base]) {
    if (!href) continue;
    try { link = cleanLink(new URL(href, base || undefined).toString()); break; } catch { /* try next */ }
  }
  const domain = hostOf(link);
  const siteName = metaVal(snap, "og:site_name");
  const outlet = registry.resolveOutlet(domain, siteName);
  const raw = metaVal(snap, "og:title", "twitter:title") || (snap.h1 || "").trim() || (snap.title || "").trim();
  const headline = stripSuffix(raw.replace(/\s+/g, " "), [siteName, outlet, domain, domain.split(".").slice(-2, -1)[0]]);
  return { headline, outlet, date: prettyDate(findDate(snap)), link, domain, icon: snap.icon || null };
}
