// Page UI: wires the link input and edit fields to the Outlet registry, Theme, Card renderer, and Message builder.
import { loadRegistry } from "./outlet-registry.js";
import { resolveTheme } from "./theme.js";
import { renderCard } from "./card-renderer.js";
import { buildMessage } from "./message.js";
import { parseArticle, upgradeSnapshot, prettyDate } from "./parser.js";
import { snapshotFromHash, editsFromHash, encodeSnapshot, encodeEdits, FRAGMENT_KEY, EDITS_KEY } from "./fragment.js";
import { buildBookmarklet } from "./bookmarklet.js";
import { collectSnapshot } from "./collector.js";
import { recallEdits, rememberEdits } from "./edit-memory.js";

const $ = (id) => document.getElementById(id);
let registry = null;
let snapshot = null; // the Snapshot behind the current Card, if any
let article = null; // { headline, outlet, date, link, domain }

function showError(text) {
  $("error").textContent = text || "";
  $("error").hidden = !text;
}

function fillFields({ headline, outlet, date }) {
  $("headline").value = headline;
  $("outlet").value = outlet;
  $("date").value = date;
}

/** Called on typing in an edit field: remember right away, then re-render after a pause. */
function onField() {
  if (article) rememberEdits(article.link, { headline: $("headline").value, outlet: $("outlet").value, date: $("date").value });
  refreshOpenInTab();
  updateSoon();
}

const framed = window.top !== window;
if (framed) document.body.classList.add("framed");

/** When framed (extension popup), "Open in tab" carries the Snapshot and current edits: the popup and a tab keep separate storage. */
function refreshOpenInTab() {
  if (!framed || !snapshot) return;
  const own = location.href.split(/[?#]/)[0];
  const edits = { headline: $("headline").value, outlet: $("outlet").value, date: $("date").value };
  $("openInTab").href = `${own}#${FRAGMENT_KEY}${encodeSnapshot(snapshot)}&${EDITS_KEY}${encodeEdits(edits)}`;
  $("openInTab").hidden = false;
}

/** A typed date that starts with a digit (machine form) is shown via prettyDate when it parses; letter-leading dates stay as typed. */
function shownDate(typed) {
  return /^\d/.test(typed.trim()) ? prettyDate(typed) || typed : typed;
}

let renderId = 0;
/** Renders offscreen and blits only if still the latest call (last call wins). Resolves to the canvas it drew, or null with no article. */
async function update() {
  clearTimeout(timer);
  if (!article) return null;
  article.headline = $("headline").value;
  article.outlet = $("outlet").value;
  article.date = $("date").value;
  refreshOpenInTab();
  const shown = { ...article, date: shownDate(article.date) };
  $("message").value = buildMessage(shown, $("suppress").checked);
  const spec = registry.specFor(article.outlet, article.domain);
  const id = ++renderId;
  const off = document.createElement("canvas");
  await renderCard(off, shown, resolveTheme(spec), spec.logo);
  if (id === renderId) {
    const card = $("card");
    card.width = off.width;
    card.height = off.height;
    card.getContext("2d").drawImage(off, 0, 0);
  }
  return off;
}

/** Hide the result so an old Card and Message can't be copied after an error. */
function clearResult() {
  article = null;
  snapshot = null;
  renderId++;
  clearTimeout(timer);
  $("result").hidden = true;
}

let timer;
const updateSoon = () => { clearTimeout(timer); timer = setTimeout(update, 250); };

function onLink() {
  const text = $("url").value.trim();
  if (text && $("source").value.trim()) { onSource(); return; } // pasted source present: re-run it with this address
  if (!text) { clearResult(); showError(""); return; }
  const a = parseArticle(text, registry);
  if (!a) { clearResult(); showError("That doesn't look like an http(s) link."); return; }
  showError("");
  show(a, false);
}

function show(a, fromSource, snap = null) {
  article = a;
  snapshot = snap;
  $("saveSnapshot").hidden = !snap;
  fillFields(recallEdits(a.link) || a);
  $("notice").hidden = fromSource;
  $("result").hidden = false;
  update();
}

let sourceId = 0;
async function onSource() {
  const html = $("source").value.trim();
  if (!html) return;
  const id = ++sourceId;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const snap = await collectSnapshot(doc, $("url").value.trim(), { icon: false });
  if (id !== sourceId) return;
  const a = parseArticle(snap, registry);
  if (!a || !a.link) { clearResult(); showError("Could not find the article's address in that source. Paste the link above too."); return; }
  showError("");
  show(a, true, snap);
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

const blobOf = (canvas) => new Promise((res, rej) => canvas ? canvas.toBlob((b) => (b ? res(b) : rej(new Error("no image"))), "image/png") : rej(new Error("no card")));

$("url").addEventListener("input", () => { clearTimeout(timer); onLink(); });
$("source").addEventListener("input", onSource);
for (const id of ["headline", "outlet", "date"]) $(id).addEventListener("input", onField);
$("suppress").addEventListener("change", update);

$("download").addEventListener("click", async () => {
  if (!article) return;
  const blob = await blobOf(await update());
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "linkcard.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("copyImage").addEventListener("click", async () => {
  if (!article) return;
  try {
    // write() must start inside the click (user activation), so hand it a Promise<Blob>
    await navigator.clipboard.write([new ClipboardItem({ "image/png": update().then(blobOf) })]);
    flash($("copyImage"), "Copied");
  } catch {
    flash($("copyImage"), "Use Download instead");
  }
});

$("copyMessage").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("message").value);
    flash($("copyMessage"), "Copied");
  } catch {
    $("message").select();
    flash($("copyMessage"), "Select and copy");
  }
});

$("saveSnapshot").addEventListener("click", () => {
  if (!snapshot) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
  a.download = "snapshot.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

{
  const own = location.origin === "null" ? location.href.split(/[?#]/)[0] : location.origin + location.pathname;
  $("bookmarklet").href = buildBookmarklet(own);
}

/** Card from a Snapshot in the fragment; the fragment stays so a refresh rebuilds it. */
function onFragment() {
  const raw = snapshotFromHash(location.hash);
  if (!raw) return;
  const snap = upgradeSnapshot(raw);
  const a = parseArticle(snap, registry);
  if (!a || !a.link) return;
  $("url").value = a.link;
  const edits = editsFromHash(location.hash);
  if (edits) rememberEdits(a.link, edits);
  show(a, true, snap);
}

try {
  registry = await loadRegistry();
  if (location.hash.startsWith("#snapshot=")) onFragment();
  else if ($("url").value) onLink();
} catch (e) {
  showError(`Could not load outlets.yaml: ${e.message}`);
}
