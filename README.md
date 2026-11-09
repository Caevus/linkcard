# Link Card

Turns a news article link into two things you can post to Discord:

1. A 1200x630 preview image styled to look like the outlet's own site (colors, serif or sans headline, header band or stripe, logo).
2. A ready-to-paste Discord message: bold headline, a small outlet and date line, and the link.

It exists because some sites (AP, NYT, and others) block Discord's link-preview crawler, so a pasted link shows nothing. The card stands in for the preview.

## Setup

You need Python 3.9 or newer.

```
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5055. To use a different port, set the `PORT` environment variable before starting.

The app only listens on your own computer. It also refuses to fetch anything that isn't a public http(s) address, so it can't be pointed at your home network.

## Using the web page

1. Paste an article link and click **Make card**.
2. The app fetches the page, reads the headline, outlet and publish date, and draws the card.
3. Click **Copy image** (or **Download PNG**), then **Copy message**, and paste both into Discord.

The **Edit details** section lets you fix the headline, outlet name or date. Change a field and click **Make card** again to redraw. The date can be typed in any form, such as "November 9, 2026".

The checkbox under the message wraps the link in `<>`. Discord skips its own preview for a wrapped link, so only your card shows. Untick it if you want Discord to try its own preview too.

## When a site blocks the fetch

Some sites return an error to scripts. When that happens the app fills in a guessed headline and outlet and opens Edit details so you can correct them. A better fix is the bookmarklet:

1. Open **Bookmarklet** at the bottom of the page and drag the "Make link card" button to your bookmarks bar.
2. On any article page, click the bookmark. It reads the headline, outlet and date from the page your browser already loaded and opens the app with the card made.

The bookmarklet needs the app running. If you change the port or move the app to another address, delete the old bookmark and drag a fresh one.

## Command line

The same card maker works without the web page:

```
python linkcard.py https://example.com/story
python linkcard.py URL --title "Headline" --source "AP News" --date "November 9, 2026" -o card.png
```

The title, source and date options override whatever the page says. If the fetch fails and you give a title, it still makes the card.

## Customizing outlets (outlets.yaml)

Everything about individual outlets lives in `outlets.yaml`, next to `linkcard.py`. Edit it in any text editor and restart the app. Each outlet is one block, keyed by the name shown on the card:

```yaml
  Utah News Dispatch:
    domains: [utahnewsdispatch.com]
    background: "#ffffff"
    text: "#111111"
    accent: "#efa704"
    font: sans
    header: stripe
    weight: black
    name_color: "#872828"
    logo: https://utahnewsdispatch.com/wp-content/uploads/2023/12/UT-News-Dispatch-logo.png
```

| Field | What it does |
| --- | --- |
| `domains` | Sites that map to this name. Subdomains match automatically, so `nytimes.com` also covers `www.nytimes.com`. |
| `background`, `text`, `accent` | Card background, headline color, and the color of the header band or stripe. |
| `font` | `serif` or `sans` for the headline. |
| `header` | `band` is a full-width colored bar across the top. `stripe` is a thin stripe down the left edge. |
| `weight` | `regular`, `bold`, or `black`. The bundled fonts have no true Black, so `black` thickens bold slightly. |
| `name_color` | Optional. Color of the outlet name at the top. Defaults to the accent color. Only used with `stripe`, since a band always shows the name in white or black, whichever reads better. |
| `logo` | Optional. A link to a PNG, JPG or WebP logo. It is downloaded once and cached. |

Colors must be in quotes, because `#` starts a comment in YAML. If the file has a typo, the app stops at startup and says what is wrong.

**Adding an outlet:** copy any block, change the name, domains and colors. Outlets that aren't listed still work, using the `default:` look at the top of the file and the site's domain as the name.

**Outlet names:** the card shows the name the page itself gives (its `og:site_name`). If the page gives nothing, or just a bare domain like "nytimes.com", the app swaps in the name from this file. A name you type by hand in Edit details is never overwritten.

## Logos

Each card header can show the outlet's logo instead of the plain name. The app looks in this order:

1. A file in the `logos` folder, named after the domain (`nytimes.com.png`) or the outlet name in lowercase with dashes (`the-new-york-times.png`). PNG, JPG and WebP work. SVG does not.
2. The `logo:` link in `outlets.yaml`.
3. The site's favicon, fetched from Google's favicon service, shown next to the outlet name.
4. The plain outlet name.

Wide wordmarks on a transparent background work best, scaled to about 52 px tall. On a colored band or a dark card, the logo sits on a small white chip, so one file works everywhere. To turn off the favicon fallback, set `USE_FAVICONS = False` near the top of the logo section in `linkcard.py`.

Downloaded logos and favicons are cached in `.logo_cache`. Delete that folder to force fresh downloads.

## What's in the folder

| File | Purpose |
| --- | --- |
| `app.py` | The web app (page and `/api/card` endpoint). |
| `linkcard.py` | Fetching, date and outlet detection, and card drawing. Also the command-line tool. |
| `outlets.yaml` | Outlet names, card looks, and logo links. |
| `logos/` | Your own logo files. |
| `requirements.txt` | Python packages to install. |
| `.logo_cache/` | Created automatically for downloaded logos. Safe to delete. |

## Troubleshooting

- **"Couldn't read that page":** the site blocked the fetch. Use the bookmarklet, or fix the details by hand and click Make card.
- **No date on the card:** the page doesn't publish one in a form the app recognizes. Type it into the Date field. The bookmarklet usually finds it when the server fetch can't.
- **Wrong or older headline:** sites sometimes change headlines after publishing, while social tags keep the old one. The bookmarklet uses the headline visible on the page. You can also edit it by hand.
- **Date is a day off:** dates come from UTC timestamps, so a late-evening story can land on the next calendar day. Edit the date if it matters.
- **Logo not showing:** check the file name, make sure it isn't an SVG, and restart the app. For a `logo:` link, open it in a browser to confirm it loads as an image.
- **Changes to `outlets.yaml` not showing:** restart the app. The file is read once at startup.
