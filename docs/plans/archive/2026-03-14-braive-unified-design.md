# brAIve Unified Design

**Date:** 2026-03-14

> This document is the current source of truth for the `brAIve` v1 design.
>
> It supersedes earlier draft directions in:
> - `docs/plans/2026-03-13-agent-search-cli-design.md`
> - `docs/plans/2026-03-13-agent-search-cli-implementation.md`
> - older comments in GitHub issue `#7`

## 1. Product Definition

`brAIve` is a local CLI that turns public web pages into compact `.toon` artifacts.

The product is **not** primarily a search summarizer in v1. Search is only one input path. The core value is:

- render pages the way a human sees them
- reduce noisy DOM into a compact, readable intermediate structure
- serialize that structure to TOON
- cache the result locally for reuse

In v1, the main artifact is **page-level `.toon` files**.

## 2. Core Principle

`brAIve` is built for the **free Brave Search API tier first**.

The default path must remain useful with:

- a free Brave Search API key
- local machine execution

Paid Brave AI endpoints are out of scope for the default flow.

## 3. Non-Goals

V1 does **not** aim to provide:

- Brave AI endpoint integration as a default path
- final multi-page synthesis
- final LLM summary generation as the primary product output
- login-protected site crawling
- anti-bot bypass systems
- infinite-scroll-heavy app support
- PDF/OCR ingestion

## 4. Supported Inputs

The CLI supports three input modes from day one:

- `braive url <URL>`
- `braive urls <URL...>`
- `braive query "<search query>"`

### Options

`url` and `urls`:
- `--refresh`

`query`:
- `--count`
- `--refresh`

### Query defaults

- default search result count: `5`
- no hard upper bound on `--count`
- no hard upper bound on `urls` input length

## 5. Query Behavior

`query` mode uses Brave Web Search only.

Rules:

- Brave search results are used in returned order
- no domain deduplication
- only minimal filtering is applied:
  - empty URL removal
  - clearly invalid URL removal
  - `javascript:`-style unusable links
  - clear redirect-only intermediates
- Brave search results are **not cached**
- if Brave search fails, the whole run fails
- if Brave search returns zero usable results, the whole run fails

## 6. Execution Model

### Ordering

- `query` mode preserves Brave result order
- `url` and `urls` preserve input order
- duplicate canonical URLs are processed once
- final output is rendered in original input order

### Concurrency

- top-level page processing runs in parallel
- default concurrency: `3`

### Browser reuse

- one browser instance is reused during a single run
- each top-level URL gets its own page/tab

### Frame handling

- same-origin iframes are traversed from the parent frame context
- cross-origin iframes are revisited through their `src`
- recursive iframe revisit depth defaults to `2`
- iframe content is merged into the parent document position, not emitted as a separate output document

## 7. Rendering Policy

Base rendering sequence per page:

1. wait for `domcontentloaded`
2. wait `1000ms`
3. perform one automatic scroll
4. wait `500ms`
5. capture DOM

### Timeout

- per-page timeout: `15s`

### Timeout behavior

- timeout does not automatically discard the page
- if a usable DOM exists, `brAIve` still produces output
- incomplete areas are represented as failed nodes

### HTTP error behavior

- non-2xx responses do not automatically discard the page
- if the response body contains readable content, it may still be reduced into output

### robots

- v1 does not implement explicit `robots.txt` interpretation

## 8. Security Boundaries

These boundaries are required before implementation is considered complete.

### URL schemes

Accepted input schemes:

- `http://`
- `https://`
- `file://`

Unknown or unusable schemes fail through normal failure handling.

### Explicit risk area

Because `file://` is allowed and cross-origin iframe `src` may be revisited automatically, the crawler can otherwise drift into unsafe trust zones unless bounded.

Implementation must therefore define and enforce:

- allowed scheme whitelist
- loopback and metadata-address restrictions for network revisits
- internal-network blocking policy
- whether `file://` may recursively reference network content

### Browser isolation

Implementation must define a per-run isolation boundary:

- fresh isolated browser context per run, or
- a stricter equivalent

Cookie/localStorage/service-worker leakage across unrelated targets must not be left unspecified.

### Local storage protection

The TOON cache directory must be created with restrictive permissions.

Minimum expectation:

- `~/.brAIve/toon-cache/` should be user-private

## 9. DOM Reduction Philosophy

The goal is **not DOM fidelity**. The goal is **human information fidelity**.

That means:

- preserve what a person can read and use
- discard implementation-only structure
- keep ordering and nesting only insofar as they help meaning

### Remove

- `id`
- `class`
- inline style
- framework/internal attributes
- layout-only wrappers
- empty wrappers
- whitespace-only nodes

### Preserve

- readable text
- `href`
- `src`
- `alt`
- structural depth that reflects reduced semantic nesting

## 10. Reduction Pipeline

The pipeline from rendered DOM to final cache artifact is:

1. rendered DOM
2. remove meaningless wrappers
3. build reduced tree
4. preorder traversal over reduced tree
5. emit uniform generalized node array
6. encode to TOON

The generalized layer is intentionally fine-grained.

Rules:

- do not aggressively merge neighboring content
- if a sentence contains a link, split it into `text / link / text`
- tables and code blocks are represented as text, not special node kinds

## 11. Generalized JSON Schema

The canonical JSON shape before TOON translation is:

```json
{
  "url": "https://example.com",
  "final_url": "https://example.com/docs",
  "title": "Example Docs",
  "fetched_at": "2026-03-14T10:00:00Z",
  "nodes": [
    {
      "idx": 0,
      "deps": 0,
      "text": "Example Docs",
      "href": "",
      "src": "",
      "alt": "",
      "status": ""
    }
  ]
}
```

### Top-level field order

- `url`
- `final_url`
- `title`
- `fetched_at`
- `nodes`

### Node field order

- `idx`
- `deps`
- `text`
- `href`
- `src`
- `alt`
- `status`

### Node semantics

`idx`
- preorder traversal order

`deps`
- reduced-tree depth
- not raw DOM depth

`text`
- derived from `innerText`
- HTML entities decoded
- leading/trailing whitespace removed
- internal text flow preserved as much as practical

`href`
- original source value
- not absolutized

`src`
- original source value
- not absolutized

`alt`
- original alt text if present, else `""`

`status`
- `""` for normal nodes
- `"fail"` for failed nodes

### Node creation rule

Create a node if either:

- `trim(text) != ""`
- or any of `href`, `src`, `alt` is non-empty

Single-character text nodes are allowed if they survive trimming.

## 12. Page Metadata Rules

`url`
- original input or resolved source URL identifier

`final_url`
- final navigated URL
- empty string if not available

`title`
- `<title>` tag only
- no fallback heuristics
- empty string if absent

`fetched_at`
- always present
- ISO 8601 UTC

## 13. Failure Representation

Failure still produces a `.toon` file.

Minimum failure shape:

```json
{
  "url": "bad-url",
  "final_url": "",
  "title": "",
  "fetched_at": "2026-03-14T10:00:00Z",
  "nodes": [
    {
      "idx": 0,
      "deps": 0,
      "text": "invalid url",
      "href": "",
      "src": "",
      "alt": "",
      "status": "fail"
    }
  ]
}
```

Rules:

- a failed result still writes a real `.toon` file
- output paths printed to stdout must always exist
- failure reason goes into the first node’s `text`

## 14. TOON Translation

TOON is treated as the final transmission/storage format, not as the conceptual source model.

Its role is:

- compact the flat generalized JSON
- exploit uniform object-array compression
- reduce token usage for downstream consumers

The current generalized format is intentionally built to fit TOON well:

- flat top level
- one uniform `nodes` array
- same field set for every node

## 15. Cache Policy

Single storage root:

- `~/.brAIve/toon-cache/`

Rules:

- TOON files are the only persisted cache artifacts
- no separate query cache
- no separate output directory
- TTL: `1 day`
- key basis: canonical URL
- filename format: URL-based file-safe slug + short hash suffix + `.toon`

Example:

- `https___example.com_docs__a1b2c3.toon`

### Refresh

- default behavior: reuse valid TOON cache
- `--refresh`: force rewrite of the corresponding file

### Write safety

Before implementation starts, the design must be treated as requiring:

- temporary file write then atomic rename
- invalid/corrupt TOON detection on read
- cache invalidation on parse failure

## 16. CLI Output Contract

All non-fatal run results are emitted to `stdout`, not streamed progressively.

Rules:

- collect all result lines in memory
- sort by input order
- print once at the end
- `stderr` reserved for true process-level fatal errors

### Query mode header

Only `query` mode prints a header:

```text
query: OpenAI Codex
```

### Result line formats

- `saved: URL -> PATH`
- `cached: URL -> PATH`
- `refreshed: URL -> PATH`
- `failed: URL -> PATH (reason)`

Rules:

- use `~`-shortened paths
- one line per input item
- failed items still include their `.toon` path

## 17. Success and Failure Semantics

### `query` mode fails when

- Brave search fails
- Brave search returns zero usable results
- all downstream page results fail

### Mixed results

- if at least one page succeeds, the whole command is considered successful

### Invalid URLs

- `url` mode: invalid input fails the whole run
- `urls` mode: invalid entries fail individually, remaining entries continue

## 18. Testing Requirements Before Implementation

Implementation should not begin until tests are re-planned against this unified design.

The future test strategy must cover at least:

- CLI contract by mode (`url`, `urls`, `query`)
- final stdout rendering contract
- cache hit / refresh / failure file writing
- crash-safe write behavior
- Playwright rendering flow
- same-origin iframe embedding
- cross-origin iframe revisit behavior
- `file://` handling behavior
- reduced-tree generation
- generalized schema validation
- TOON output generation

## 19. Open Issues To Resolve Before Coding

These are the last major blockers before implementation:

1. update older local design docs to align with this document
2. update README to match actual v1 artifact and scope
3. define concrete security boundary for `file://` and internal network access
4. define browser context isolation policy
5. define crash-safe TOON write behavior

## 20. Implementation Readiness

This design is close, but not yet implementation-ready until the repo documentation is aligned and the security/write-safety boundaries above are explicitly resolved.
