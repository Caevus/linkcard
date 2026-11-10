# Article pages are never fetched by a server

Article data is captured only inside the user's own browser tab, from the page they already loaded. No server, proxy, or serverless function ever requests an article, and no request impersonates a crawler such as Discordbot. Server-side fetches are what sites like AP News and NYT block in the first place, and impersonating crawlers was rejected on principle. The app is a static page with no backend.

## Considered Options

- **CORS proxy or serverless fetch**: rejected; it is still a server request and gets the same bot blocking.
- **Crawler user agents**: rejected on principle.
- **Local Python server** (the original design): retired; it required running a server and still got blocked, falling back to a bookmarklet anyway.
