// Bookmarklet builder: assembles the bookmarklet from the Collector's and encoder's source text.
// The bookmarklet holds no parsing, Theme, or Outlet logic; it only captures and hands off.
import { collectSnapshot } from "./collector.js";
import { encodeSnapshot, FRAGMENT_KEY } from "./fragment.js";

const ICON_TIMEOUT_MS = 1500;

/** pageUrl: the address of this page (origin + path). Returns a "javascript:" URL. */
export function buildBookmarklet(pageUrl) {
  const code = `(async () => {
const collect = ${collectSnapshot.toString()};
const encode = ${encodeSnapshot.toString()};
const slow = new Promise((r) => setTimeout(() => r(null), ${ICON_TIMEOUT_MS}));
const snap = (await Promise.race([collect(), slow])) || (await collect(document, location.href, { icon: false }));
window.open(${JSON.stringify(pageUrl)} + "#" + ${JSON.stringify(FRAGMENT_KEY)} + encode(snap), "_blank");
})();`;
  return "javascript:" + encodeURIComponent(code);
}
