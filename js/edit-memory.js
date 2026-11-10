// Edit memory: the headline, Outlet, and date typed for each article, keyed by article link.
// Keeps only the most recent articles. Browser storage may be unavailable (private mode, blocked site data);
// then nothing is remembered and nothing breaks.

const KEY = "linkcard.edits";
const LIMIT = 50;

function readAll() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Saved { headline, outlet, date } for an article link, or null. */
export function recallEdits(link) {
  const hit = readAll().find((e) => e && e.link === link);
  if (!hit) return null;
  return { headline: String(hit.headline ?? ""), outlet: String(hit.outlet ?? ""), date: String(hit.date ?? "") };
}

/** Remember edits for an article link, most recent first, trimmed to the limit. */
export function rememberEdits(link, { headline, outlet, date }) {
  try {
    const rest = readAll().filter((e) => e && e.link !== link);
    localStorage.setItem(KEY, JSON.stringify([{ link, headline, outlet, date }, ...rest].slice(0, LIMIT)));
  } catch {
    // Storage unavailable: the page simply doesn't remember.
  }
}
