<img width="693" height="161" alt="image" src="https://github.com/user-attachments/assets/7c3d487a-0e79-45ce-ae95-f3c4ae84bec7" />

# brAIve

`brAIve` is an agent-focused retrieval CLI built on top of Brave Search.

The repository name is `agent-search-cli`, while the product name is `brAIve`.

## Goal

Turn noisy web search results into compact, source-linked research packs for agents.

## Planned Output

- compressed summary
- key facts
- source URLs
- follow-up links
- gap metadata

## Status

Active MVP implementation.

## Current MVP

The repository now includes an integrated, test-covered CLI path:

Current scope:

- `braive query <query>` using Brave Search
- `braive url <url>` / `braive urls <url...>`
- `url -> RenderedDocument` using `Crawlee + Playwright`
- `RenderedDocument -> agent-browser-like reduced document`
- reduced HTML rendering
- reduced HTML -> TOON serialization
- optional debug artifact output per processed URL

Not implemented yet:

- iframe traversal
- Brave result caching
- multi-page research-pack synthesis across URLs
- LLM compression / summary layer
- richer TOON packet contract beyond per-page semantic reduction

## CLI

### Commands

```bash
bun run braive -- query "openai codex pricing"
bun run braive -- url https://example.com
bun run braive -- urls https://example.com https://example.org
```

### Options

```bash
--count <n>      Brave query result count for query mode
--out <file>     write the final JSON packet to a file
--debug-dir <d>  write reduced HTML / TOON / reduced packet artifacts per URL
```

### Environment

`query` mode requires:

```bash
BRAVE_API_KEY=...
```

### Output

The CLI emits a compact JSON packet containing:

- input metadata
- normalized Brave search results for `query` mode
- processed documents with:
  - `url`
  - `finalUrl`
  - `title`
  - `fetchedAt`
  - `mode`
  - `toon`
  - `reducedHtml`
- per-URL failures
