#!/usr/bin/env python3
"""Link card web app. Paste an article URL, get a card image + Discord markdown.

    pip install -r requirements.txt
    python app.py            # then open http://127.0.0.1:5055
"""
import base64
import io
import ipaddress
import os
import socket
from urllib.parse import urlparse

from flask import Flask, jsonify, request

import linkcard

app = Flask(__name__)


def url_is_safe(url):
    """Only public http(s) hosts, so the fetcher can't be pointed at your LAN."""
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.hostname:
        return False
    if os.environ.get("ALLOW_PRIVATE") == "1":
        return True
    try:
        for info in socket.getaddrinfo(u.hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                return False
    except socket.gaierror:
        return False
    return True


@app.post("/api/card")
def make_card():
    data = request.get_json(force=True)
    url = (data.get("url") or "").strip()
    title = (data.get("title") or "").strip()
    source = (data.get("source") or "").strip()
    date = (data.get("date") or "").strip()

    if not url_is_safe(url):
        return jsonify(error="That doesn't look like a public http(s) link."), 400

    fetched = False
    if not title:
        try:
            t, s, dt = linkcard.fetch(url)
            title, source = title or t or "", source or s or ""
            date = date or linkcard.pretty_date(dt)
            fetched = True
        except Exception as e:
            resp = getattr(e, "response", None)
            why = f"the site returned {resp.status_code}" if resp is not None else type(e).__name__
            domain = urlparse(url).netloc.removeprefix("www.")
            return jsonify(
                error=f"Couldn't read that page ({why}). Sites often block scripts. "
                      "Check the guessed details below, fix them, and hit Make card again, "
                      "or use the bookmarklet at the bottom.",
                manual=True,
                guess=dict(title=title or linkcard.guess_title(url), source=source or linkcard.source_name(url)),
            ), 422
    if date and not date[:1].isalpha():       # raw machine date; "November 9, 2026" typed by hand is left alone
        date = linkcard.pretty_date(date) or date
    if not title:
        return jsonify(error="No headline found. Type one in.", manual=True), 422

    domain = urlparse(url).netloc.removeprefix("www.")
    source = linkcard.resolve_source(url, source)
    buf = io.BytesIO()
    linkcard.render(title, source, date, domain, buf)
    png = base64.b64encode(buf.getvalue()).decode()
    return jsonify(
        image=f"data:image/png;base64,{png}",
        title=title,
        source=source,
        date=date,
        fetched=fetched,
    )


@app.get("/")
def index():
    return PAGE


PAGE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link Card</title>
<style>
  :root { --bg:#f6f6f4; --panel:#fff; --fg:#1a1d23; --muted:#667085; --line:#d9dce1; --accent:#d62828; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#12151c; --panel:#1a1f29; --fg:#eceef2; --muted:#98a2b3; --line:#2c3340; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.5 system-ui,sans-serif; }
  main { max-width:760px; margin:0 auto; padding:40px 16px 80px; }
  h1 { font-size:1.4rem; margin:0 0 4px; }
  p.sub { color:var(--muted); margin:0 0 24px; }
  form { display:flex; gap:8px; }
  input, textarea { width:100%; padding:10px 12px; font:inherit; color:var(--fg); background:var(--panel);
    border:1px solid var(--line); border-radius:8px; }
  input:focus, textarea:focus { outline:2px solid var(--accent); outline-offset:-1px; }
  button { padding:10px 16px; font:inherit; font-weight:600; border:0; border-radius:8px; cursor:pointer;
    background:var(--accent); color:#fff; white-space:nowrap; }
  button.ghost { background:transparent; color:var(--fg); border:1px solid var(--line); font-weight:500; }
  button:disabled { opacity:.5; cursor:wait; }
  #err { color:var(--accent); margin:12px 0 0; min-height:1.5em; }
  details { margin-top:12px; }
  summary { cursor:pointer; color:var(--muted); }
  .fields { display:grid; gap:8px; margin-top:10px; grid-template-columns:1fr 1fr; }
  .fields .wide { grid-column:1 / -1; }
  label { font-size:.85rem; color:var(--muted); display:block; margin-bottom:2px; }
  #out { display:none; margin-top:28px; }
  #out img { width:100%; border-radius:10px; border:1px solid var(--line); display:block; }
  .row { display:flex; gap:8px; margin:10px 0 24px; flex-wrap:wrap; }
  textarea { min-height:96px; resize:vertical; font-family:ui-monospace,monospace; font-size:.9rem; }
  .check { display:flex; gap:8px; align-items:center; margin:8px 0; color:var(--muted); font-size:.9rem; }
  .check input { width:auto; }
  @media (max-width:520px) { form { flex-direction:column; } .fields { grid-template-columns:1fr; } }
</style>
</head>
<body>
<main>
  <h1>Link Card</h1>
  <p class="sub">Paste an article link. Get a preview image and a Discord message to go with it.</p>

  <form id="f">
    <input id="url" type="url" placeholder="https://apnews.com/article/..." required autofocus>
    <button id="go">Make card</button>
  </form>
  <div id="err" role="alert"></div>

  <details id="manual">
    <summary>Edit details</summary>
    <div class="fields">
      <div class="wide"><label for="title">Headline</label><input id="title"></div>
      <div><label for="source">Outlet</label><input id="source"></div>
      <div><label for="date">Date</label><input id="date" placeholder="November 9, 2026"></div>
    </div>
  </details>

  <section id="out">
    <img id="img" alt="Generated link card">
    <div class="row">
      <button id="copyImg" class="ghost" type="button">Copy image</button>
      <a id="dl" download="linkcard.png"><button class="ghost" type="button">Download PNG</button></a>
    </div>

    <label for="md">Discord message</label>
    <textarea id="md" readonly></textarea>
    <div class="check"><input type="checkbox" id="noembed" checked><label for="noembed" style="margin:0">Wrap link in &lt;&gt; so Discord doesn't add its own preview</label></div>
    <div class="row"><button id="copyMd" type="button">Copy message</button></div>
  </section>

  <details style="margin-top:40px">
    <summary>Bookmarklet (works when a site blocks the fetch)</summary>
    <p class="sub" style="margin-top:10px">Drag this to your bookmarks bar. On any article page, click it and the headline, outlet, and date come straight from the page your browser already loaded.</p>
    <a id="bm" href="#" style="display:inline-block;padding:8px 14px;border:1px solid var(--line);border-radius:8px;color:var(--fg);text-decoration:none">Make link card</a>
  </details>
</main>

<script>
const $ = id => document.getElementById(id);
let current = null;

function buildMd() {
  if (!current) return;
  const url = $('url').value.trim();
  const link = $('noembed').checked ? `<${url}>` : url;
  const meta = [current.source, current.date].filter(Boolean).join(' · ');
  $('md').value = `**${current.title}**\n-# ${meta}\n${link}`;
}

async function flash(btn, text) {
  const old = btn.textContent; btn.textContent = text;
  setTimeout(() => btn.textContent = old, 1200);
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  $('err').textContent = '';
  $('go').disabled = true;
  try {
    const r = await fetch('/api/card', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        url: $('url').value, title: $('title').value,
        source: $('source').value, date: $('date').value,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      $('err').textContent = d.error || 'Something went wrong.';
      if (d.manual) {
        $('manual').open = true;
        if (d.guess) {
          if (!$('title').value) $('title').value = d.guess.title;
          if (!$('source').value) $('source').value = d.guess.source;
        }
      }
      return;
    }
    current = d;
    $('title').value = d.title; $('source').value = d.source; $('date').value = d.date;
    $('img').src = d.image; $('dl').href = d.image;
    $('out').style.display = 'block';
    buildMd();
  } catch (err) {
    $('err').textContent = 'Network error: ' + err.message;
  } finally {
    $('go').disabled = false;
  }
});

$('noembed').addEventListener('change', buildMd);

// Bookmarklet: opens this page with the article's own metadata prefilled.
const bmCode =
  `(()=>{const m=(...a)=>{for(const n of a){const e=document.querySelector('meta[property="'+n+'"],meta[name="'+n+'"],meta[itemprop="'+n+'"]');if(e&&e.content)return e.content}return ''};` +
  `const jd=()=>{for(const s of document.querySelectorAll('script[type="application/ld+json"]')){try{const f=j=>Array.isArray(j)?j.map(f).find(Boolean):(j&&typeof j=='object'?(j.datePublished||f(j['@graph'])||f(j.mainEntity)):'');const r=f(JSON.parse(s.textContent));if(r)return r}catch(e){}}return ''};` +
  `const t=document.querySelector('time[datetime]');` +
  `const date=m('article:published_time','og:article:published_time','og:published_time','datePublished','parsely-pub-date','pubdate','publishdate','date','sailthru.date','DC.date.issued')||jd()||(t?t.getAttribute('datetime'):'');` +
  `open('${location.origin}/?'+new URLSearchParams({url:location.href,title:(document.querySelector('h1')?.innerText||m('og:title')||document.title).trim(),source:m('og:site_name'),date}))})()`;
$('bm').href = 'javascript:' + encodeURIComponent(bmCode);

// Prefill from query string (used by the bookmarklet) and auto-run.
const q = new URLSearchParams(location.search);
if (q.get('url')) {
  $('url').value = q.get('url');
  $('title').value = q.get('title') || '';
  $('source').value = q.get('source') || '';
  $('date').value = q.get('date') || '';
  $('f').requestSubmit();
}

$('copyMd').addEventListener('click', async () => {
  await navigator.clipboard.writeText($('md').value);
  flash($('copyMd'), 'Copied');
});

$('copyImg').addEventListener('click', async () => {
  try {
    const blob = await (await fetch($('img').src)).blob();
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
    flash($('copyImg'), 'Copied');
  } catch {
    flash($('copyImg'), 'Use Download instead');
  }
});
</script>
</body>
</html>
"""

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5055)))
