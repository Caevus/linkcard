// Collector: captures a Snapshot (v1) from an article document. No interpretation.
// SELF-CONTAINED: no imports, no references to module state. It is meant to be stringified
// (Function.prototype.toString) into the bookmarklet and the extension, so keep it that way.
// Usage: await collectSnapshot() in an article tab, or collectSnapshot(parsedDoc, address, { icon: false })
// for pasted page source (icon false: the page never requests an article site).
export async function collectSnapshot(doc = document, pageUrl = (typeof location !== "undefined" ? location.href : ""), opts = {}) {
  const strip = (n) => {
    if (Array.isArray(n)) return n.map(strip);
    if (n && typeof n === "object") {
      const o = {};
      for (const k of Object.keys(n)) if (k !== "articleBody") o[k] = strip(n[k]);
      return o;
    }
    return n;
  };
  const meta = [];
  for (const m of doc.querySelectorAll("meta[content]")) {
    for (const attr of ["property", "name", "itemprop"]) {
      const key = m.getAttribute(attr);
      if (key) meta.push({ key, content: m.getAttribute("content") });
    }
  }
  const jsonld = [];
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { jsonld.push(strip(JSON.parse(s.textContent))); } catch (e) { /* skip bad block */ }
  }
  const canon = doc.querySelector('link[rel~="canonical"]');
  const time = doc.querySelector("time[datetime]");
  const h1 = doc.querySelector("h1");
  const snap = {
    version: 1,
    url: pageUrl || "",
    canonical: canon ? canon.getAttribute("href") || null : null,
    meta,
    jsonld,
    time: time ? time.getAttribute("datetime") : null,
    h1: h1 ? (h1.innerText || h1.textContent || "").trim() : null,
    title: (doc.title || "").trim(),
    icon: null,
  };
  if (opts.icon !== false) {
    try {
      const link = doc.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
      const href = new URL(link ? link.getAttribute("href") : "/favicon.ico", pageUrl).href;
      const res = await fetch(href);
      const blob = res.ok ? await res.blob() : null;
      if (blob && blob.size <= 100000) {
        snap.icon = await new Promise((ok, no) => {
          const r = new FileReader();
          r.onload = () => ok(r.result);
          r.onerror = no;
          r.readAsDataURL(blob);
        });
      }
    } catch (e) { /* icon omitted on failure */ }
  }
  return snap;
}
