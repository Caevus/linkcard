# LinkCard

LinkCard makes a Card and a Message from a news article. The Card is a 1200x630 image that uses the Theme of the article's Outlet. The Message gives the headline, Outlet, date, and link in a format for Discord. You can send both to Discord. LinkCard is for articles on websites that block Discord's own link previews (Embeds).

LinkCard runs entirely in your browser. There is no server to run.

## Use the page

1. Open https://caevus.github.io/linkcard/.
2. Paste an article link, or use one of the capture methods below.
3. Click **Copy image** or **Download PNG**.
4. Click **Copy message**.
5. Paste both into Discord.

Many websites block LinkCard from fetching their pages. LinkCard works best when it reads the article from your own browser tab. These methods do that:

### Bookmarklet

1. Drag the **LinkCard** link on the page to your bookmarks bar.
2. Open an article.
3. Click the bookmark.

LinkCard opens with the Card already made.

### Extension

- Firefox: Install from (link to be added).
- Chrome:
  1. Open `chrome://extensions`.
  2. Enable Developer mode.
  3. Click Load unpacked.
  4. Choose the `extension/` folder of this repo.

On an article, click the extension button. The Collector reads the page, and the Card appears in the popup. To keep your edits, use **Open in tab**.

### Pasted page source

1. On the article, open view-source.
2. Select all.
3. Copy the page source.
4. On the LinkCard page, open "Or paste the article's page source".
5. Paste the page source.
6. Make the Card.

### URL only

If you paste only a link, LinkCard builds what it can from the link alone. Usually, it builds the Outlet and a headline that it guesses from the address. Check the fields under Edit details. Fix any field that is wrong.

## Edit the Message and the Card

Under Edit details, you can change the Headline, Outlet, and Date. The Card and the Message update together. You can type dates in any form, such as "November 9, 2026". By default, the Message wraps the link in `<>`, so Discord does not add its own Embed. To leave the link bare, clear that box.

## Edit outlets.yaml

`outlets.yaml` holds the Theme of each Outlet. The header of the file documents the fields. In short, each Outlet entry uses the name shown on the Card as its key, and it has these fields:

- `domains`: The domains that map to this Outlet. Subdomains match.
- `background`, `text`, `accent`: The colors. Write each color in quotes, such as `"#ffffff"`.
- `font`: `serif` or `sans`.
- `header`: `band` (a solid bar across the top) or `stripe` (a thin bar down the left edge).
- `weight`: `regular`, `bold`, or `black`.
- `name_color`: optional. The color of the Outlet name on the stripe header.
- `logo`: optional. Use a file in `logos/` or a link to an image.

Any Outlet that is not listed uses the `default` Theme.

### Logos

1. Put the image (PNG, JPG, or WebP) in `logos/`.
2. Name the image in `outlets.yaml`, for example `logo: logos/nyt.png`.

LinkCard shows a logo only when `logo:` names it. LinkCard fits the logo into a 460x52 box with no white background. Because the box has no white background, choose a logo that suits the Theme. See `logos/README.md`.

## Local development

LinkCard is a set of static files.

1. Serve the repo root with any static server, for example:

   ```
   python -m http.server 8000
   ```

2. Open http://localhost:8000/.

To use your local server with the extension, follow these steps:

1. Set `SITE_URL` in `extension/config.js` to your local server, for example `http://localhost:8000/`.
2. Reload the extension.

Do not commit that change.

The extension keeps copies of `js/collector.js` and `js/fragment.js` in `extension/lib/`. After you change either file, run this command:

```
node scripts/sync-extension.mjs
```

To compare without copying, add `--check`.

Run the tests with this command:

```
node --test
```

The tests check that LinkCard parses saved Snapshots of real articles correctly. To add a fixture, see `test/fixtures/README.md`.

CI runs the syntax, sync, and test checks on every push.

Run `git config core.hooksPath .githooks` once after cloning to enable the pre-commit sync check.

The `python-final` tag holds the last version of the old Python app.
