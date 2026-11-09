#!/usr/bin/env python3
"""Make a Discord-friendly link card (1200x630 PNG) from an article URL.

Usage:
    python linkcard.py https://apnews.com/article/...            # auto-pull metadata
    python linkcard.py URL --title "Headline" --source "AP News"  # override / fallback

Needs: pip install requests beautifulsoup4 pillow
"""
import argparse
import hashlib
import io
import re
import sys
import json
from datetime import datetime
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAD = 72

FONT_DIRS = [
    "/usr/share/fonts/truetype/dejavu/",
    "/Library/Fonts/",
    "/System/Library/Fonts/Supplemental/",
    "C:/Windows/Fonts/",
]
SERIF_BOLD = ["DejaVuSerif-Bold.ttf", "Georgia Bold.ttf", "georgiab.ttf"]
SERIF = ["DejaVuSerif.ttf", "Georgia.ttf", "georgia.ttf"]
SANS = ["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"]
SANS_BOLD = ["DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"]


HERE = Path(__file__).resolve().parent


def _load_outlets():
    """Read outlets.yaml (next to this file) and build the lookup tables the rest of the code uses."""
    try:
        import yaml
    except ImportError:
        sys.exit("Missing PyYAML. Run: pip install -r requirements.txt")
    path = HERE / "outlets.yaml"
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except FileNotFoundError:
        sys.exit(f"Can't find {path}. It should sit next to linkcard.py.")
    except yaml.YAMLError as e:
        sys.exit(f"outlets.yaml has a formatting problem:\n{e}")

    def look(o):
        font, header = str(o.get("font", "serif")).lower(), str(o.get("header", "stripe")).lower()
        return (str(o["background"]), str(o["text"]), str(o["accent"]), font != "sans", header == "band",
                str(o.get("weight", "bold")).lower(), o.get("name_color"))

    sources, themes, logos = {}, {}, {}
    for name, o in (data.get("outlets") or {}).items():
        name = str(name)
        themes[name] = look(o)
        for dom in o.get("domains") or []:
            sources[str(dom).lower()] = name
            if o.get("logo"):
                logos[str(dom).lower()] = o["logo"]
        if o.get("logo"):
            logos[re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")] = o["logo"]
    return sources, themes, logos, look(data["default"])


KNOWN_SOURCES, THEMES, LOGO_URLS, DEFAULT_THEME = _load_outlets()


def known_source(url):
    """Curated outlet name for the URL's domain, or None."""
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    parts = host.split(".")
    for i in range(len(parts) - 1):
        hit = KNOWN_SOURCES.get(".".join(parts[i:]))
        if hit:
            return hit
    return None


def source_name(url):
    """Known outlet name for the URL's domain, else the bare domain."""
    return known_source(url) or (urlparse(url).hostname or "").lower().removeprefix("www.")


def resolve_source(url, given=""):
    """Pick the outlet label. A real name from the page wins, but an empty one or
    one that is just a domain ("nytimes.com", "NYTimes.com") is swapped for the
    curated name when we have one. Manual edits like "NYT" are left alone."""
    given = (given or "").strip()
    if given and not re.fullmatch(r"\S+\.\S+", given):
        return given
    return known_source(url) or given or source_name(url)


# Card looks (THEMES) and DEFAULT_THEME come from outlets.yaml; see the notes at the top of that file.


def _rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _mix(a, b, t):
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def _lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = map(f, c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _contrast(a, b):
    hi, lo = sorted((_lum(a), _lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def theme_for(source):
    spec = THEMES.get(source, DEFAULT_THEME)
    bg, fg, accent, serif, band = spec[:5]
    weight = spec[5] if len(spec) > 5 else "bold"
    weight = {True: "bold", False: "regular"}.get(weight, str(weight).lower())   # old True/False still work
    if weight not in ("regular", "bold", "black"):
        weight = "bold"
    name_color = spec[6] if len(spec) > 6 else None
    bg, fg, accent = _rgb(bg), _rgb(fg), _rgb(accent)
    # Outlet label color: the accent, darkened until it reads against the background.
    if name_color:
        label = _rgb(name_color)          # explicit choice: used exactly as given
    else:
        label = accent
        for _ in range(10):
            if _contrast(label, bg) >= 3:
                break
            label = _mix(label, (0, 0, 0), 0.15)
    white, black = (255, 255, 255), (0, 0, 0)
    return dict(
        bg=bg, fg=fg, accent=accent, label=label, serif=serif, band=band, weight=weight,
        on_band=white if _contrast(white, accent) >= _contrast(black, accent) else black,
        muted=_mix(fg, bg, 0.4),
        rule=_mix(bg, fg, 0.15),
    )


LOGO_DIR = HERE / "logos"          # drop your own logos here (see logos/README.txt)
CACHE_DIR = HERE / ".logo_cache"   # downloaded favicons
USE_FAVICONS = True                # fall back to the site's favicon when no local logo exists


def _slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _favicon(domain):
    """Site icon via Google's favicon service, cached on disk. None on any failure."""
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / f"{domain}.png"
    try:
        if not path.exists():
            r = requests.get("https://www.google.com/s2/favicons",
                             params={"domain": domain, "sz": 128}, timeout=6)
            r.raise_for_status()
            if not r.headers.get("content-type", "").startswith("image"):
                return None
            path.write_bytes(r.content)
        return Image.open(path).convert("RGBA")
    except Exception:
        return None


# LOGO_URLS (outlet or domain -> image link) also comes from outlets.yaml.


def _url_logo(source, domain):
    """Logo from LOGO_URLS (matched by outlet name, domain, or a parent domain), cached on disk."""
    keys = [_slug(source)]
    parts = domain.split(".")
    keys += [".".join(parts[i:]) for i in range(len(parts) - 1)]
    url = next((LOGO_URLS[k] for k in keys if k in LOGO_URLS), None)
    if not url:
        return None
    CACHE_DIR.mkdir(exist_ok=True)
    path = CACHE_DIR / ("logo-" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".img")
    try:
        if not path.exists():
            r = requests.get(url, headers=BROWSER_HEADERS, timeout=10)
            r.raise_for_status()
            Image.open(io.BytesIO(r.content)).verify()      # reject HTML error pages, SVGs, etc.
            path.write_bytes(r.content)
        return Image.open(path).convert("RGBA")
    except Exception:
        return None


def load_logo(source, domain):
    """(image, kind): a local logo, else a LOGO_URLS logo, else the site favicon, else (None, None)."""
    for key in (_slug(source), domain):
        for ext in ("png", "jpg", "jpeg", "webp"):
            f = LOGO_DIR / f"{key}.{ext}"
            if f.exists():
                try:
                    return Image.open(f).convert("RGBA"), "logo"
                except Exception:
                    pass
    img = _url_logo(source, domain)
    if img:
        return img, "logo"
    if USE_FAVICONS:
        icon = _favicon(domain)
        if icon:
            return icon, "icon"
    return None, None


def _fit(img, max_w, max_h):
    scale = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


def font(names, size):
    for d in FONT_DIRS:
        for n in names:
            p = Path(d) / n
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default(size)


def meta(soup, *keys):
    for k in keys:
        tag = soup.find("meta", attrs={"property": k}) or soup.find("meta", attrs={"name": k})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return None


BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


DATE_META = ("article:published_time", "og:article:published_time", "og:published_time", "datePublished",
             "parsely-pub-date", "pubdate", "publishdate", "date", "sailthru.date", "DC.date.issued")


def _ld_date(node):
    if isinstance(node, list):
        return next((d for d in map(_ld_date, node) if d), None)
    if isinstance(node, dict):
        return node.get("datePublished") or _ld_date(node.get("@graph")) or _ld_date(node.get("mainEntity"))
    return None


def find_date(soup):
    """Publish date from meta tags, then JSON-LD, then the first <time datetime>."""
    for k in DATE_META:
        tag = soup.find("meta", attrs={"property": k}) or soup.find("meta", attrs={"name": k}) \
              or soup.find("meta", attrs={"itemprop": k})
        if tag and tag.get("content"):
            return tag["content"].strip()
    for sc in soup.find_all("script", type="application/ld+json"):
        try:
            d = _ld_date(json.loads(sc.string or ""))
        except (ValueError, TypeError):
            continue
        if d:
            return str(d)
    t = soup.find("time", attrs={"datetime": True})
    return t["datetime"].strip() if t else None


def fetch(url):
    """Fetch the page with browser-like headers. Raises on any HTTP error."""
    r = requests.get(url, headers=BROWSER_HEADERS, timeout=15)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    title = meta(soup, "og:title", "twitter:title") or (soup.title.string.strip() if soup.title else None)
    source = resolve_source(url, meta(soup, "og:site_name"))
    date = find_date(soup)
    return title, source, date


def guess_title(url):
    """Rough headline from the URL slug, e.g. senate-passes-bill-0a1b2c... -> 'Senate passes bill'."""
    import re
    seg = [p for p in requests.utils.urlparse(url).path.split("/") if p]
    if not seg:
        return ""
    words = re.sub(r"\.\w+$", "", seg[-1]).split("-")
    while words and re.fullmatch(r"(?=.*\d)[0-9a-f]{8,}", words[-1]):
        words.pop()
    text = " ".join(words).strip()
    return text[:1].upper() + text[1:]


def pretty_date(raw):
    """'2026-11-09T14:00:00Z' or 'Mon, 09 Nov 2026 14:00:00 GMT' -> 'November 9, 2026'."""
    if not raw:
        return ""
    raw = raw.strip()
    dt = None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            dt = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            pass
    if dt:
        return f"{dt:%B} {dt.day}, {dt.year}"
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if m:
        return f"{datetime(int(m[1]), int(m[2]), int(m[3])):%B} {int(m[3])}, {m[1]}"
    return ""


def wrap(draw, text, fnt, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=fnt) <= max_w:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def render(title, source, date, domain, out):
    t = theme_for(source)
    img = Image.new("RGB", (W, H), t["bg"])
    d = ImageDraw.Draw(img)

    # header: colored band or left accent bar, then logo / icon + outlet name
    label_font = font(SANS_BOLD, 30)
    band = t["band"]
    if band:
        d.rectangle([0, 0, W, 104], fill=t["accent"])
        cy = 52
    else:
        d.rectangle([0, 0, 18, H], fill=t["accent"])
        cy = 90
    text_fill = t["on_band"] if band else t["label"]
    chip = band or _lum(t["bg"]) < 0.2   # logos sit on a white chip over colored or dark areas
    pad, inner = 10, 52

    def place(im, x):
        """Paste im vertically centered at cy (on a white chip if needed); return x after it."""
        w, h = im.size
        if chip:
            d.rounded_rectangle([x, cy - h // 2 - pad, x + w + 2 * pad, cy + (h + 1) // 2 + pad],
                                radius=12, fill=(255, 255, 255))
            img.paste(im, (x + pad, cy - h // 2), im)
            return x + w + 2 * pad
        img.paste(im, (x, cy - h // 2), im)
        return x + w

    logo, kind = load_logo(source, domain)
    if kind == "logo":
        place(_fit(logo, 460, inner), PAD)
    elif kind == "icon":
        x = place(_fit(logo, inner, inner), PAD) + 18
        d.text((x, cy), source.upper(), font=label_font, fill=text_fill, anchor="lm")
    else:
        d.text((PAD, cy), source.upper(), font=label_font, fill=text_fill, anchor="lm")

    # headline: shrink until it fits in 5 lines
    heavy = t["weight"] != "regular"
    if t["serif"]:
        names = SERIF_BOLD if heavy else SERIF
    else:
        names = SANS_BOLD if heavy else SANS
    max_w, max_h = W - PAD * 2 - 6, 340
    for size in range(68, 30, -2):
        f = font(names, size)
        lines = wrap(d, title, f, max_w)
        line_h = int(size * 1.25)
        if len(lines) <= 5 and len(lines) * line_h <= max_h:
            break
    y = 150
    sw = 1 if t["weight"] == "black" else 0   # faux-black: thicken strokes by 1px; more clogs letters like i and e
    for ln in lines:
        d.text((PAD, y), ln, font=f, fill=t["fg"], stroke_width=sw, stroke_fill=t["fg"])
        y += line_h

    # footer: date left, domain right
    foot = font(SANS, 26)
    d.line([PAD, H - 100, W - PAD, H - 100], fill=t["rule"], width=2)
    d.text((PAD, H - 72), date, font=foot, fill=t["muted"])
    dw = d.textlength(domain, font=foot)
    d.text((W - PAD - dw, H - 72), domain, font=foot, fill=t["muted"])

    img.save(out, format="PNG")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--title")
    ap.add_argument("--source")
    ap.add_argument("--date", help="free text, e.g. 'November 9, 2026'")
    ap.add_argument("-o", "--out", default="linkcard.png")
    a = ap.parse_args()

    title, source, date = a.title, a.source, a.date
    if not (title and source):
        try:
            t, s, dt = fetch(a.url)
            title, source, date = title or t, source or s, date or pretty_date(dt)
        except Exception as e:
            print(f"Fetch failed ({e}). Pass --title and --source manually.", file=sys.stderr)
            if not title:
                sys.exit(1)
            source = source or source_name(a.url)

    domain = requests.utils.urlparse(a.url).netloc.removeprefix("www.")
    print(render(title, source, date or "", domain, a.out))


if __name__ == "__main__":
    main()
