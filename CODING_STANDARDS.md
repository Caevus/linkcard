# Coding standards

Read during review. Each rule is a judgement call the automated checks can't make; flag any diff that breaks one.

- **Collector is frozen.** Any change to the Collector ships a new extension release and breaks every dragged bookmarklet. The diff must say why the Snapshot needs the new data. (Copy drift between the site and extension is caught by CI.)
- **Fragment and Snapshot formats only grow.** Every `#snapshot=` link and Snapshot version ever issued must still decode and render. New fields are optional; old Snapshots are upgraded, never rejected.
- **Rendering is last-call-wins.** An async render that finishes after a newer one must not draw. Copy image and Download export the current render.
- **Clipboard writes stay inside the click.** Call `navigator.clipboard.write` synchronously in the click handler (pass a Promise of the blob); never await work first.
- **The page never transmits article data.** No analytics, error reporting, or request may carry the Snapshot, edits, or anything derived from the article. The extension's AMO listing declares no data collection, and the framed page is part of that promise.
- **Parsing reports the source.** The parser returns what the page says, cleaned (suffixes, tracking parameters), never invented or reworded.
