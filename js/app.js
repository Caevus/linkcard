// Page UI: wires the link input and edit fields to the Outlet registry, Theme, Card renderer, and Message builder.
import { loadRegistry } from "./outlet-registry.js";
import { resolveTheme } from "./theme.js";
import { renderCard } from "./card-renderer.js";
import { buildMessage } from "./message.js";
import { articleFromUrl } from "./url-only.js";

const $ = (id) => document.getElementById(id);
let registry = null;
let article = null; // { headline, outlet, date, link, domain }

function showError(text) {
  $("error").textContent = text || "";
  $("error").hidden = !text;
}

function update() {
  if (!article) return;
  article.headline = $("headline").value;
  article.outlet = $("outlet").value;
  article.date = $("date").value;
  const theme = resolveTheme(registry.specFor(article.outlet, article.domain));
  renderCard($("card"), article, theme);
  $("message").value = buildMessage(article, $("suppress").checked);
}

let timer;
const updateSoon = () => { clearTimeout(timer); timer = setTimeout(update, 150); };

function onLink() {
  const text = $("url").value.trim();
  if (!text) { article = null; $("result").hidden = true; showError(""); return; }
  const a = articleFromUrl(text, registry);
  if (!a) { showError("That doesn't look like an http(s) link."); return; }
  showError("");
  article = a;
  $("headline").value = a.headline;
  $("outlet").value = a.outlet;
  $("date").value = a.date;
  $("result").hidden = false;
  update();
}

function flash(btn, text) {
  const old = btn.textContent;
  btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1200);
}

const cardBlob = () => new Promise((res) => $("card").toBlob(res, "image/png"));

$("url").addEventListener("input", () => { clearTimeout(timer); onLink(); });
for (const id of ["headline", "outlet", "date"]) $(id).addEventListener("input", updateSoon);
$("suppress").addEventListener("change", update);

$("download").addEventListener("click", async () => {
  update();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await cardBlob());
  a.download = "linkcard.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("copyImage").addEventListener("click", async () => {
  try {
    update();
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
