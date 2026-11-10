# Parser fixtures

Each fixture is two files with the same name stem:

- `<name>.snapshot.json`: a Snapshot saved from a real article.
- `<name>.expected.json`: `{ "headline": "...", "outlet": "...", "date": "...", "link": "..." }`.

To add one:

1. Open the article, click the LinkCard bookmarklet (or use the extension). LinkCard opens with the Card.
2. Click **Save Snapshot**. Save the file here as `<name>.snapshot.json`, for example `ap-news.snapshot.json`.
3. Read the Card. Check that the headline, Outlet, and date are correct for the real article, fixing them by hand if needed.
4. Write `<name>.expected.json` with the correct values. `date` is the displayed form (for example `November 9, 2026`). `link` is the cleaned article link.
5. Run `node --test`.

Wanted: AP News, NYT, Bloomberg, Utah News Dispatch, plus one saved Snapshot per Snapshot version (name it `v1-...`). Never invent a fixture: capture it from a real page.
