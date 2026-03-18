# Crawlee RenderedDocument Design

## Goal

Add a robust `url -> rendered document` layer using `Crawlee + Playwright`, so the project can standardize on a crawler-produced intermediate contract before further TOON work.

## Chosen Approach

Use Crawlee's `launchPlaywright()` runtime wrapper as the browser entrypoint and wrap it with a single-purpose function:

- `crawlUrlToRenderedDocument(url, options?)`

The wrapper is responsible for returning exactly one `RenderedDocument` for one input URL.

## Why This Approach

- We want to focus on the TOON layer, not on building browser launch/runtime details from scratch.
- Crawlee gives us a stable Playwright launch wrapper without forcing us into a full crawler orchestration layer for the single-URL MVP.
- Playwright gives us stable access to rendered page state.

## Output Contract

```ts
type RenderedDocument = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  title: string;
  bodyHtml: string;
};
```

## Render Policy

MVP render policy:

1. launch browser with Crawlee `launchPlaywright()`
2. open a new page
3. navigate with `waitUntil: "domcontentloaded"`
4. wait a short stabilization interval
5. read `page.title()`
6. read `page.url()`
7. read `document.body?.innerHTML ?? ""`
8. stamp `fetchedAt` in UTC ISO 8601

## Scope

This phase includes:

- single URL input
- redirect handling
- rendered title extraction
- rendered body HTML extraction
- deterministic local HTTP test coverage

This phase does not include:

- multi-URL crawling API
- cache policy
- TOON conversion rewrite
- iframe recursion
- CLI command surface

## Testing Strategy

Write tests first for:

1. regular HTML page extraction
2. redirect to final URL
3. delayed client-side DOM update before extraction
4. empty body fallback to `""`

The tests should use a local temporary HTTP server so the suite is deterministic and independent of public websites.
