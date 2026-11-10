// Popup shell: runs the Collector in the active tab and frames the hosted page with the Snapshot.
// No parsing, Theme, or rendering logic lives here (ADR 0001).
import { collectSnapshot } from "./lib/collector.js";
import { encodeSnapshot, FRAGMENT_KEY } from "./lib/fragment.js";
import { SITE_URL } from "./config.js";

const ICON_TIMEOUT_MS = 1500;
const api = globalThis.browser ?? globalThis.chrome;

function cantRead() {
  document.body.classList.add("msg");
  document.getElementById("status").textContent = "Linkcard can't read this page";
}

async function main() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const target = { tabId: tab.id };
  const [{ result: type }] = await api.scripting.executeScript({ target, func: () => document.contentType });
  if (type !== "text/html" && type !== "application/xhtml+xml") return cantRead();
  const slow = new Promise((r) => setTimeout(() => r(null), ICON_TIMEOUT_MS));
  let snap = (await Promise.race([api.scripting.executeScript({ target, func: collectSnapshot }), slow]))?.[0]?.result;
  if (!snap) {
    // Icon capture is slow: make the page's fetch fail at once (the Collector then omits the icon) and collect again.
    await api.scripting.executeScript({ target, func: () => { globalThis.fetch = () => Promise.reject(new Error("icon skipped")); } });
    [{ result: snap }] = await api.scripting.executeScript({ target, func: collectSnapshot });
  }
  if (!snap) return cantRead();
  const frame = document.createElement("iframe");
  frame.allow = "clipboard-write";
  frame.src = `${SITE_URL}#${FRAGMENT_KEY}${encodeSnapshot(snap)}`;
  document.getElementById("status").hidden = true;
  document.body.append(frame);
}

main().catch(cantRead);
