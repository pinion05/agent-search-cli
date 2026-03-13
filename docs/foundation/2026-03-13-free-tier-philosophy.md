# brAIve Free-Tier Philosophy

**Date:** 2026-03-13

## Core Principle

`brAIve` is built for the free Brave Search API tier first.

The project should remain useful to any developer who has:

- a free Brave Search API key
- a local Codex-authenticated CLI environment

The default experience must not depend on paid Brave AI endpoints.

## Product Position

`brAIve` is not trying to compete with Brave's AI products.

Instead, it acts as an agent-focused retrieval and packing layer that:

- runs inexpensive web retrieval through Brave Web Search
- reduces noisy results into compact evidence
- produces source-linked TOON research packs for downstream agents

## API Direction

### In Scope for v1

- `Brave Web Search`

### Out of Scope for v1

- `Brave LLM Context`
- `Brave Answers`
- `Brave Summarizer`
- any Brave endpoint that requires a paid plan for the default path

### Optional Future Work

Paid Brave endpoints may be supported later as optional add-ons, but:

- they must never be required for the default CLI flow
- the free-tier path must remain first-class

## Why This Matters

This philosophy keeps the project aligned with:

- low-cost usage
- broad accessibility
- predictable setup
- independent agent-side compression logic

It also preserves the main reason the project exists:

Brave gives us retrieval, while `brAIve` gives agents a compact, structured research pack.

## Practical Consequences

### Retrieval

The default retrieval stack is:

1. `Brave Web Search`
2. candidate filtering
3. page fetch and extraction
4. evidence reduction
5. Codex-side compression
6. TOON serialization

### Compression

Agent-side compression must happen outside Brave.

That means summary generation, fact packing, and TOON output stay in our own pipeline.

### Evaluation

All v1 evaluation and QA should assume only the free Brave Search API tier is available.

If a feature only works with a paid Brave endpoint, it is not a v1 default feature.
