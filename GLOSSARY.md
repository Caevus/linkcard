# LinkCard

Turns a news article into a shareable image and a ready-to-paste Discord message, for articles whose sites block Discord's own link previews.

## Output

**Card**:
The 1200x630 image representing one article, styled after its Outlet.
_Avoid_: Preview, link card, embed, thumbnail

**Message**:
The Discord-formatted text (headline, Outlet, date, link) posted alongside the Card.
_Avoid_: Markdown, post

**Embed**:
Discord's own automatic link preview. Only used when talking about suppressing it.
_Avoid_: Using it to mean the Card

## Outlets

**Outlet**:
The publication an article comes from, identified by its domains and shown by name on the Card.
_Avoid_: Source, site, publisher

**Theme**:
An Outlet's visual style on the Card: colors, typeface, header style, headline weight, and logo.
_Avoid_: Style, skin, template

**Band**:
A Theme header style: a solid accent-colored bar across the top of the Card.

**Stripe**:
A Theme header style: a thin accent-colored bar down the left edge of the Card.

## Capture

**Collector**:
The code that runs inside the user's own browser tab and reads the article page as already loaded.
_Avoid_: Scraper, crawler, fetcher

**Snapshot**:
The raw, uninterpreted data the Collector captures from one article page.
_Avoid_: Metadata, payload, scrape
