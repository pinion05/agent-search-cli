# Agent Search CLI Design

**Date:** 2026-03-13

**Problem**

Agents frequently consume raw search results, noisy article bodies, and duplicated snippets. That wastes context window, increases token spend, and makes downstream reasoning less reliable. We need a single-run CLI that turns a natural-language query into a compact research packet optimized for agent ingestion.

**Goal**

Build an independent CLI that:

- uses `Brave Search API` as the retrieval source
- uses `CLIProxyAPI` with a Codex-compatible model as the compression layer
- outputs a compact `TOON` research packet instead of raw text
- includes summary, key facts, source URLs, and follow-up links
- minimizes cost through caching and aggressive pre-LLM reduction

**Non-Goals**

- interactive chat or long-running daemon mode
- browser automation as the default fetch path
- full answer-generation product for human users
- multi-engine search on v1
- deep ranking or learning-to-rank infrastructure

## Product Shape

The CLI is a one-shot command. A user runs a command such as:

```bash
agent-search "What changed in OpenAI Codex pricing in 2026?"
```

The command returns a serialized TOON research packet to stdout or a file. The packet is designed for another agent to ingest directly, rather than for a human to read first.

## High-Level Architecture

The system is a linear pipeline with explicit compression stages:

1. `Query Intake`
2. `Brave Search`
3. `Candidate Filtering`
4. `Fetch + Extract`
5. `Evidence Distillation`
6. `LLM Compression via CLIProxyAPI`
7. `TOON Serialization`

This two-step reduction is the core design choice:

- first compress raw web pages into evidence units
- then compress evidence units into the final TOON pack

That avoids both extremes:

- sending too much raw text to the LLM
- over-summarizing too early and losing traceability

## Core Modules

### 1. CLI Layer

Responsibilities:

- parse arguments
- validate environment variables
- orchestrate the pipeline
- choose stdout or file output
- emit stable exit codes

Expected initial flags:

- `--max-results`
- `--out`
- `--timeout`
- `--no-cache`
- `--no-llm`
- `--debug`

### 2. Brave Client

Responsibilities:

- call the Brave Search API
- normalize search results into internal `SearchResult` objects
- collect metadata such as title, URL, snippet, age if available
- respect rate limits and surface provider errors clearly

Initial usage pattern:

- query once per CLI invocation
- retrieve top `5-10` results by default
- deduplicate by canonical URL and domain

### 3. Candidate Filter

Responsibilities:

- remove obvious junk or duplicate results
- reduce over-representation from the same domain
- discard unsupported URLs such as binary downloads
- select the final fetch set

The candidate filter should be deterministic where possible so repeated runs are stable.

### 4. Fetch + Extract Layer

Responsibilities:

- fetch HTML content
- extract the main readable article or document body
- preserve title, canonical URL, and minimal metadata
- classify extraction failures

Default path:

- HTTP fetch
- readability-style extraction

Fallback path:

- limited browser-rendered extraction only for a small number of failed pages

The fallback path is intentionally constrained to keep cost and runtime low.

### 5. Evidence Distillation Layer

Responsibilities:

- transform extracted documents into compact evidence items
- retain traceability from each claim to one or more sources
- capture structured elements such as dates, numbers, named entities, and event descriptions

Evidence items should be short and source-linked. The objective is not polished prose. The objective is compact, source-grounded units that another LLM can merge safely.

### 6. LLM Compression Layer

Responsibilities:

- call CLIProxyAPI using a Codex-compatible model
- merge evidence across sources
- remove duplicates
- surface conflicts or uncertainty
- generate a compact summary and follow-up leads

Prompting constraints:

- no speculative completion when evidence is weak
- keep claims source-linked
- prefer short declarative statements
- emit an intermediate structured payload that can be serialized into TOON

### 7. TOON Serializer

Responsibilities:

- convert the final structured packet into the target compact serialization format
- preserve enough structure for downstream agents
- avoid verbose field naming when unnecessary

The serializer should also support a debug mode that writes the pre-TOON structured object for inspection.

## Output Contract

The final TOON packet should encode the following logical sections:

- `query`
- `summary`
- `facts`
- `sources`
- `followups`
- `gaps`
- `meta`

### Logical Schema

`query`
- original query
- run timestamp

`summary`
- compact multi-sentence synthesis

`facts`
- list of fact items
- each fact includes:
  - claim
  - source references
  - confidence
  - kind

`sources`
- source id
- title
- url
- domain
- optional published-at estimate
- why selected

`followups`
- URLs or topics worth a second pass

`gaps`
- unresolved questions
- extraction failures
- conflicting claims

`meta`
- counts for search results, extracted pages, failed pages
- cache hit statistics
- timing information
- optional token/cost accounting

## Error Handling

The CLI should prefer partial success over hard failure.

Examples:

- if Brave returns results but some pages fail extraction, still emit a packet
- if LLM compression fails, optionally emit evidence-only output in debug mode
- if no fetchable pages remain, return a clear non-zero exit with a concise diagnostic

Failure categories should be normalized:

- `network`
- `timeout`
- `403`
- `404`
- `paywall`
- `javascript_only`
- `parser_empty`
- `llm_error`

## Caching Strategy

Cost control is essential, so caching is part of v1.

Two layers:

- `query cache`
  - stores Brave results for a query
- `url cache`
  - stores extraction output for a URL

Suggested TTL defaults:

- search results: `12h`
- news pages: `6h`
- evergreen documents: `72h`

Cache goals:

- avoid duplicate Brave calls
- avoid repeated extraction work
- reduce LLM input churn by keeping source text stable across runs

## Cost Strategy

The system is designed for free to ultra-low-cost operation.

Cost controls:

- Brave monthly free credits first
- low default search result count
- deterministic filtering before fetch
- limited fallback rendering
- extraction before LLM
- cache-first reuse
- compact TOON output rather than raw JSON

## Security and Secrets

Required environment variables on v1:

- `BRAVE_API_KEY`
- `CLIPROXYAPI_BASE_URL`
- `CLIPROXYAPI_API_KEY`
- `CLIPROXYAPI_MODEL`

The CLI must never print secret values in logs or debug output.

## Observability

Debug mode should expose enough structure to diagnose pipeline issues:

- raw normalized Brave results
- extraction outcomes per URL
- evidence payload before LLM compression
- final pre-TOON structured packet

Normal mode should remain terse.

## Tech Stack

Recommended v1 stack:

- `bun`
- `TypeScript`
- `zod` for validation
- `commander` or a similarly small CLI parser
- `undici` or built-in fetch
- `jsdom` + `@mozilla/readability` for extraction
- `bun:test` for tests
- filesystem JSON cache for v1

## v1 Success Criteria

The first usable version succeeds if it can:

- accept a query and return a TOON packet
- use Brave search successfully
- extract usable text from at least a subset of pages
- produce summary + facts + sources + follow-ups
- preserve source traceability
- run cheaply enough for repeated agent use

## Open Questions

- whether TOON will be a native serializer in this project or an adapter over an internal compact object model
- whether browser-rendered fallback is needed in v1 or can wait for v1.1
- whether follow-up link generation should be heuristic-only before involving the LLM
