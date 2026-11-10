# Contributing to LinkCard

The glossary of project terms is in [docs/GLOSSARY.md](docs/GLOSSARY.md), and architecture decisions are in [docs/adr/](docs/adr/).

## Development

LinkCard is a set of static files.

### Run locally

1. Serve the repo root with any static server, for example:

   ```sh
   python -m http.server 8000
   ```

2. Open http://localhost:8000/.

### Point the extension at your local server

1. Set `SITE_URL` in `extension/config.js` to your local server, for example `http://localhost:8000/`.
2. Reload the extension.

Do not commit that change.

### Keep extension copies in sync

`extension/lib/` holds copies of `js/collector.js` and `js/fragment.js`. After you change either file, run:

```sh
node scripts/sync-extension.mjs
```

To compare without copying, add `--check`.

Run `git config core.hooksPath .githooks` once after cloning to enable the pre-commit sync check.

### Tests

Run the tests with:

```sh
node --test
```

The tests check that LinkCard parses saved snapshots of real articles correctly. To add a fixture, see `test/fixtures/README.md`.

CI runs the syntax, sync, and test checks on every push.

## Customizing outlets

`outlets.yaml` holds the theme of each outlet. The header of the file documents the fields. Each entry is keyed by the name shown on the card, and entries sit under `outlets:`. Here is an example for a made-up outlet:

```yaml
outlets:
  Example News:
    domains: [example.com, news.example.com]
    background: "#ffffff"
    text: "#111111"
    accent: "#c8102e"
    font: serif
    header: band
    weight: bold
    logo: logos/example.png
```

| Field | Values | Notes |
| --- | --- | --- |
| `domains` | Site domains, such as `example.com` | Sites that map to this outlet. Subdomains match automatically. |
| `background`, `text`, `accent` | Colors in quotes, such as `"#ffffff"` | Card background, headline color, and header bar or stripe color. |
| `font` | `serif` or `sans` | Headline typeface. |
| `header` | `band` or `stripe` | `band` is a solid bar across the top. `stripe` is a thin bar down the left edge. |
| `weight` | `regular`, `bold`, or `black` | Headline weight. `black` thickens the bold font slightly, since there is no true Black. |
| `name_color` | Color in quotes (optional) | Outlet name color on the stripe header. Defaults to `accent`. Has no effect on a band. |
| `logo` | File in `logos/`, or an image URL (optional) | See Logos below. |

Any outlet that is not listed uses the `default` theme.

### Logos

1. Put the image (PNG, JPG, or WebP) in `logos/`.
2. Name it in `outlets.yaml`, for example `logo: logos/nyt.png`.

LinkCard shows a logo only when `logo:` names it. LinkCard fits the logo into a 460x52 box with no white background. Because of that, choose a logo that suits the theme. See `logos/README.md`.

## Releasing the extension

The Firefox extension is a listed add-on on addons.mozilla.org (AMO). To release a new version:

1. Bump `version` in `extension/manifest.json`.
2. Run `npx web-ext lint --source-dir extension` and fix any errors or warnings.
3. Run `node scripts/sign-firefox.mjs`. This signs the extension on the listed channel.

AMO reviews the new version and publishes it. Firefox users then receive the update automatically.

## Python app

The `python-final` tag holds the last version of the old Python app.
