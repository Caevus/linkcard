# LinkCard

Some news sites stop Discord from showing a link preview when you share their articles. LinkCard turns an article into a preview image styled to match the publication, plus a ready-to-paste message with the headline, publication, date, and link. Post both, and your link looks the way it should.

## Quick start

1. Open https://caevus.github.io/linkcard/.
2. Paste an article link, or use one of the methods below.
3. Click **Copy image** or **Download PNG**.
4. Click **Copy message**.
5. Paste both into Discord.

## Getting the article

Many news sites block outside tools from loading their pages, so you get the best results when the article is read straight from your open tab. In order of preference:

- **Extension** or **bookmarklet**: reads the article from your tab. Best results.
- **Pasted page source**: a good fallback if you can't use either.
- **Link only**: the last resort. The headline is guessed from the address.

### Extension

**Firefox**

1. Download the `.xpi` file from the [latest release](https://github.com/Caevus/linkcard/releases).
2. Drag the file into a Firefox window. Or open `about:addons`, click the gear icon, and choose **Install Add-on From File**.

**Chrome**

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and choose the `extension/` folder.

To use it, click the extension's button while viewing an article. The preview appears in the popup. To keep editing in a full window, click **Open in tab**.

### Bookmarklet

1. On the [LinkCard page](https://caevus.github.io/linkcard/), drag the **LinkCard** link to your bookmarks bar.
2. Open an article and click the bookmark.

The page opens with the preview already made.

### Pasted page source

1. On the article, open view-source and copy everything.
2. On the LinkCard page, open **Or paste the article's page source** and paste it in.

The preview appears as soon as you paste.

### Link only

If you paste only a link, the page fills in what it can from the address: usually the publication name and a guessed headline. Check them under **Edit details** and fix anything that's wrong.

## Editing the image and message

Under **Edit details**, you can change the **Headline**, **Outlet** (the publication name), and **Date**. The image and message update together. Dates can be typed in any form, such as "November 9, 2026".

By default, the message wraps the link in `<>` so Discord doesn't add its own preview underneath. To post the bare link instead, clear the **Wrap link in <> so Discord doesn't add its own preview** checkbox.

## Contributing

To customize how publications look, run the project locally, or release a new version, see [CONTRIBUTING.md](CONTRIBUTING.md).
