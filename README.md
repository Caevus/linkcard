# Linkcard

Linkcard turns a news article into a Card and a Message you can post to Discord. The Card is a 1200x630 image styled after the article's Outlet. The Message is the headline, Outlet, date, and link, formatted for Discord. It is for articles on sites that block Discord's own link previews (Embeds).

Linkcard runs entirely in your browser. There is no server to run.

## Using the page

Open https://caevus.github.io/linkcard/. Paste an article link, or use one of the capture methods below, then click **Copy image** (or **Download PNG**) and **Copy message**, and paste both into Discord.

Many sites block pages from fetching them, so reading the article from your own browser tab works best. These methods do that:

### Bookmarklet

Drag the **Linkcard** link on the page to your bookmarks bar. On an article, click the bookmark. Linkcard opens with the Card already made.

### Extension

- Firefox: install from (link to be added).
- Chrome: open `chrome://extensions`, turn on Developer mode, click Load unpacked, and choose the `extension/` folder of this repo.

Click the extension button on an article. The Collector reads the page and the Card appears in the popup. Use **Open in tab** to keep your edits.

### Pasted page source

On the article, open view-source, select all, and copy. On the Linkcard page, open "Or paste the article's page source", paste it, and make the Card.

### URL only

If you only paste a link, Linkcard builds what it can from the link alone, usually the Outlet and a headline guessed from the address. Check the Edit details fields and fix anything wrong.

## Editing the Message and Card

Under Edit details you can change the Headline, Outlet, and Date. The Card and Message update together. Dates can be typed in any form, such as "November 9, 2026". By default the Message wraps the link in `<>` so Discord does not add its own Embed. Untick that box to leave the link bare.

## Editing outlets.yaml

`outlets.yaml` holds each Outlet's Theme. The fields are documented in the header of the file. In short, each Outlet is keyed by the name shown on the Card and has:

- `domains`: sites that map to this Outlet (subdomains match).
- `background`, `text`, `accent`: colors, in quotes, such as `"#ffffff"`.
- `font`: `serif` or `sans`.
- `header`: `band` (solid bar across the top) or `stripe` (thin bar down the left edge).
- `weight`: `regular`, `bold`, or `black`.
- `name_color`: optional. Outlet name color on the stripe header.
- `logo`: optional. A file in `logos/` or a link to an image.

Outlets not listed use the `default` Theme.

### Logos

Put the image (PNG, JPG, or WebP) in `logos/` and name it in `outlets.yaml`, for example `logo: logos/nyt.png`. A logo is only shown if `logo:` names it. It is fitted into a 460x52 box with no white background, so pick one that suits the Theme. See `logos/README.md`.

## Local development

The site is static files. Serve the repo root with any static server:

```
python -m http.server 8000
```

Then open http://localhost:8000/.

To point the extension at your local server, set `SITE_URL` in `extension/config.js` (for example `http://localhost:8000/`) and reload the extension. Do not commit that change.

The extension keeps copies of `js/collector.js` and `js/fragment.js` in `extension/lib/`. After changing either, run:

```
node scripts/sync-extension.mjs
```

Add `--check` to compare without copying.

Run the tests with:

```
node --test
```

The tests check parsing of saved Snapshots against real articles. To add a fixture, see `test/fixtures/README.md`.

The last version of the old Python app is the `python-final` tag.
