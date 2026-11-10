# The extension is a thin Collector; the hosted page owns all logic

The browser extension only captures a Snapshot from the open article and hands it to the hosted page. Parsing, Outlet resolution, Themes, and Card rendering all live on the page. This keeps extension releases (and Firefox add-on submissions) rare: theme edits, date-detection fixes, and new Outlets ship by updating the page. The cost is that the extension does nothing without the hosted page, which is acceptable since offline use isn't a goal.

## Consequences

- The Collector captures broadly (all meta tags, JSON-LD, time elements, headings, canonical link, site icon) so future parsing changes rarely need new data.
- Every Snapshot carries a version number, and the page must accept every Snapshot version ever issued, because old extension installs keep sending them.
