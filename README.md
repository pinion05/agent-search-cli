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

Planning and issue-driven implementation.

## Current MVP

The repository now includes two small, test-covered layers:

Current scope:

- `url -> RenderedDocument` using `Crawlee + Playwright`
- legacy `HTML string -> TOON` conversion path
- extract text, links, images
- drop empty wrappers and whitespace-only content
- serialize flattened TOON output

Not implemented yet:

- iframe traversal
- cache and CLI flows
- `RenderedDocument -> TOON` contract rewrite
- large rendered HTML pruning before TOON conversion
