# LinkCard extension

Thin shell (ADR 0001): runs the Collector in the active tab and frames the hosted page.

- `lib/collector.js` and `lib/fragment.js` are copies of `js/collector.js` and `js/fragment.js`.
  After changing either, run `node scripts/sync-extension.mjs` (or `--check` to compare).
- `config.js` holds `SITE_URL` (dev-only override; default is the production site).

Load: Firefox `about:debugging` > This Firefox > Load Temporary Add-on > `extension/manifest.json`.
Chrome `chrome://extensions` > Developer mode > Load unpacked > `extension/`.
