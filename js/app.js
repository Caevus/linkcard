// Page UI: wires the link input and edit fields to the Outlet registry, Theme, Card renderer, and Message builder.
import { loadRegistry } from "./outlet-registry.js";
import { resolveTheme } from "./theme.js";
import { renderCard } from "./card-renderer.js";
import { buildMessage } from "./message.js";
import { parseArticle } from "./parser.js";
import { collectSnapshot } from "./collector.js";
import { recallEdits, rememberEdits } from "./edit-memory.js";

const $ = (id) => document.getElementById(id);
let registry = null;
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
  updateSoon();
}

let renderId = 0;
async function update() {
  if (!article) return;
  article.headline = $("headline").value;
  article.outlet = $("outlet").value;
  article.date = $("date").value;
  $("message").value = buildMessage(article, $("suppress").checked);
  const spec = registry.specFor(article.outlet, article.domain);
  const id = ++renderId;
  await renderCard($("card"), article, resolveTheme(spec), spec.logo);
  return id === renderId;
}

let timer;
const updateSoon = () => { clearTimeout(timer); timer = setTimeout(update, 250); };

function onLink() {
  const text = $("url").value.trim();
  if (!text) { article = null; $("result").hidden = true; showError(""); return; }
  const a = parseArticle(text, registry);
  if (!a) { showError("That doesn't look like an http(s) link."); return; }
  showError("");
  show(a, false);
}

function show(a, fromSource) {
  article = a;
  fillFields(recallEdits(a.link) || a);
  $("notice").hidden = fromSource;
  $("result").hidden = false;
  update();
}

async function onSource() {
  const html = $("source").value.trim();
  if (!html) return;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const snap = await collectSnapshot(doc, $("url").value.trim(), { icon: false });
  const a = parseArticle(snap, registry);
  if (!a || !a.link) { showError("Could not find the article's address in that source. Paste the link above too."); return; }
  showError("");
  show(a, true);
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

const cardBlob = () => new Promise((res) => $("card").toBlob(res, "image/png"));

$("url").addEventListener("input", () => { clearTimeout(timer); onLink(); });
$("source").addEventListener("input", onSource);
for (const id of ["headline", "outlet", "date"]) $(id).addEventListener("input", onField);
$("suppress").addEventListener("change", update);

$("download").addEventListener("click", async () => {
  await update();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await cardBlob());
  a.download = "linkcard.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("copyImage").addEventListener("click", async () => {
  try {
    await update();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": cardBlob() })]);
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

try {
  registry = await loadRegistry();
  if ($("url").value) onLink();
} catch (e) {
  showError(`Could not load outlets.yaml: ${e.message}`);
}
