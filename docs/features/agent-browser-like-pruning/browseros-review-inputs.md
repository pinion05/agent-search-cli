# BrowserOS Review Inputs

Run `bun scripts/write-agent-browser-like-pruning-review-samples.ts` to refresh the review fixtures.

Generated sample pairs live under `docs/features/agent-browser-like-pruning/samples/`:

- `docs-generic-raw.html` / `docs-generic-reduced.html`
- `package-generic-raw.html` / `package-generic-reduced.html`
- `map-generic-raw.html` / `map-generic-reduced.html`
- `place-detail-generic-raw.html` / `place-detail-generic-reduced.html`
- `forum-generic-raw.html` / `forum-generic-reduced.html`
- `marketing-generic-raw.html` / `marketing-generic-reduced.html`
- `generic-blog-raw.html` / `generic-blog-reduced.html`

The manifest at `docs/features/agent-browser-like-pruning/samples/manifest.json` lists the preserved signals the reviewer should verify in BrowserOS.

Reviewer goal:

- open each raw/reduced pair in BrowserOS
- confirm the reduced page preserves identity, major facts, structure, and actions that matter to an agent
- return `ACCEPT` only if the reduced views preserve the important signals without relying on the old fixture-specific brand names
