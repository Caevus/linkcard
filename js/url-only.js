// URL-only mode: article details guessed from the link alone (nothing is read from the article).
// Output shape is what the future Parser will also produce: { headline, outlet, date, link, domain }.
import { hostOf } from "./outlet-registry.js";

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|_ga$)/i;

function cleanLink(url) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return url;
  }
}

/** Rough headline from the URL slug; trailing hash-like segments are dropped. */
export function guessHeadline(url) {
  let segs;
  try {
    segs = new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return "";
  }
  if (!segs.length) return "";
  let last = segs[segs.length - 1];
  try { last = decodeURIComponent(last); } catch { /* keep raw */ }
  const words = last.replace(/\.\w+$/, "").split("-");
  while (words.length && /^(?=.*\d)[0-9a-f]{8,}$/.test(words[words.length - 1])) words.pop();
  const text = words.join(" ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Returns null when the text is not an http(s) link. */
export function articleFromUrl(url, registry) {
  url = (url || "").trim();
  let u;
  try { u = new URL(url); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const domain = hostOf(url);
  return {
    headline: guessHeadline(url),
    outlet: registry.resolveOutlet(domain),
    date: "",
    link: cleanLink(url),
    domain,
  };
}
