# README Cleanup + Patch Republish Memo — 2026-03-19

## Goal

Make the public `README.md` act like a tight npm/GitHub quickstart for `brAIve`, not a planning document.

The rewritten README should answer only these questions:

1. What is `brAIve`?
2. How do I install it?
3. What env var do I need?
4. What commands can I run?
5. What output/debug artifacts do I get?
6. Why is this useful for agent workflows?

## Evidence Used

Confirmed from repo artifacts:

- `package.json`
  - package name: `@npmc_5/braive`
  - current version: `0.1.0`
  - published bin: `braive`
  - runtime: `node >= 20`
- `src/braive-runner.ts`
  - supported commands:
    - `braive query <search query> [--count N] [--out FILE] [--debug-dir DIR]`
    - `braive url <url> [--out FILE] [--debug-dir DIR]`
    - `braive urls <url...> [--out FILE] [--debug-dir DIR]`
  - `query` mode requires `BRAVE_API_KEY`
  - `--debug-dir` writes `reduced.html`, `toon.txt`, and `packet.json` per processed URL
  - stdout/default output is a JSON packet; `--out` writes that JSON packet to disk
- `docs/reports/2026-03-19-braive-live-query-report.md`
  - live query path already validated end-to-end
  - debug artifact layout was observed in practice
- `docs/release/production-readiness-checklist.md`
  - README/basic CLI usage already considered part of release readiness

## Decision

The README should be cut down to the following public-facing sections only:

1. **Title + one-sentence value proposition**
2. **Install**
3. **Environment**
4. **Commands**
5. **Output + debug artifacts**
6. **Why use brAIve**

Everything else should be removed from the README.

## Remove From README

Delete these current sections/content because they read like planning/status noise instead of user help:

- `Goal`
- `Planned Output`
- `Status`
- `Current MVP`
- `Not implemented yet`
- roadmap/follow-up language
- internal implementation detail lists unless they directly help a user run the CLI

## Recommended Final README Shape

### 1. Title + short intro

Keep:

- product name: `brAIve`
- quick clarification that repo name is `agent-search-cli`
- one concise value line, e.g.:
  - agent-focused retrieval CLI built on Brave Search
  - turns search results or URLs into compact, source-linked JSON/TOON artifacts

### 2. Install

Include both:

```bash
npm install -g @npmc_5/braive
```

and a local-dev invocation hint:

```bash
bun run braive -- query "openai codex pricing"
```

Do not add extra setup steps beyond what is actually required.

### 3. Environment

Be explicit:

- `BRAVE_API_KEY` is required for `query` mode
- `url` / `urls` do not require Brave search credentials

Suggested shape:

```bash
export BRAVE_API_KEY=...
```

### 4. Commands

Recommended command block:

```bash
braive query "openai codex pricing"
braive url https://example.com
braive urls https://example.com https://example.org
```

Recommended options block:

```bash
--count <n>      Brave query result count for query mode
--out <file>     write the final JSON packet to a file
--debug-dir <d>  write per-URL debug artifacts
```

Keep this section short. The exact help text already exists in code; README should be an example-first quickstart.

### 5. Output + debug artifacts

This section is important and should stay because it explains the practical value of the tool.

Document:

- default stdout output is a JSON packet
- `--out` writes the final packet to disk
- `query` mode packet includes normalized Brave results plus processed documents
- processed documents include fields such as:
  - `url`
  - `finalUrl`
  - `title`
  - `fetchedAt`
  - `mode`
  - `toon`
  - `reducedHtml`
- `--debug-dir` writes per-URL folders containing:
  - `packet.json`
  - `reduced.html`
  - `toon.txt`

### 6. Why use brAIve

Keep this benefits section short and outcome-oriented.

Recommended bullets:

- turns noisy search/browser output into agent-friendly structured packets
- preserves source URLs and page-level outputs for review
- emits both reduced HTML and TOON for downstream agent workflows
- can persist reproducible debug artifacts for inspection

## Writing Constraints For Worker-2

When rewriting `README.md`:

- optimize for first-run clarity, not completeness
- prefer examples over long explanation
- keep the file concise enough to skim in under 1 minute
- do not include roadmap/status/future-work sections
- do not promise features that are not implemented
- do not turn maintainer release steps into end-user docs

## Republish Workflow (Maintainer, not README copy)

The README rewrite should be followed by a patch republish workflow outside the README itself.

Suggested maintainer sequence after the README edit is merged:

1. verify build/tests still pass
2. bump patch version in `package.json`
3. run `npm pack --dry-run`
4. run `npm publish --dry-run --access public`
5. publish the patch release
6. confirm npm package page shows the updated README

## Handoff

### Worker-2

Own `README.md` rewrite using the section shape above.

### Worker-3

Cross-check that:

- rewritten README contains only the approved sections
- examples match actual CLI behavior
- republish steps are handled as maintainer follow-up, not mixed into end-user README copy

## Summary

Decision: the public README should become a minimal quickstart centered on install, env, commands, output/debug artifacts, and concrete benefits. Planning/status/roadmap material should be removed and any republish steps should stay in release workflow, not in the README body.
