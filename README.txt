Put outlet logos here. A logo found here replaces the plain-text outlet name in the card header.

File name: the outlet's domain or its card name, lowercased with dashes. Either works:
    nytimes.com.png
    the-new-york-times.png
    apnews.com.png
    deseret-news.png

Formats: PNG (best, transparent background), JPG, or WebP. SVG is not supported.

Tips:
- Wide wordmark logos work best. They are scaled to about 52 px tall and 460 px wide at most.
- Use a dark or colored logo on a transparent background. Outlets with a colored header band
  (BBC, CNN, KSL, and others) and dark cards (The Verge) show the logo on a small white chip,
  so the same file works everywhere.
- Prefer a link over a file? Add a "logo:" line to the outlet in outlets.yaml. A file in this folder wins over a link.
- No logo at all? The card falls back to the site's favicon next to the outlet name.
  To turn that off, set USE_FAVICONS = False near the top of linkcard.py.
