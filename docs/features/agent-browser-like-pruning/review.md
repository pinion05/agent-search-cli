# Agent-Browser-Like Pruning Review — 2026-03-19

## Verdict

**REQUEST CHANGES / do not mark ACCEPT yet.**

The current branch has a useful baseline, but it is not approval-ready.

## Evidence

### 1. Tests currently pass, but they only prove fixture-specific behavior

Command:

```bash
bun test
```

Result on March 19, 2026:

- `19 pass`
- `0 fail`

Why this is still insufficient:

- `src/agent-browser-like-pruning.test.ts` only covers handcrafted oracle strings.
- The tests mirror the current hard-coded fixture vocabulary, so they do not prove the heuristics generalize.
- There is no test for `collectAgentBrowserOracle()` and no end-to-end proof that `agent-browser` integration works in a clean repo install.

### 2. Type-check is failing

Command:

```bash
bunx tsc --noEmit
```

Result on March 19, 2026:

- **FAIL**
- first blocking errors at `src/agent-browser-like-pruning.ts:40-41`
- total reported errors in this workspace run: `133`

Blocking examples:

- `src/agent-browser-like-pruning.ts:40`
- `src/agent-browser-like-pruning.ts:41`

Those errors show that the `Page` type expected by `agent-browser` is coming from a different Playwright install than the `Page` type used by this repo.

### 3. `agent-browser` is not resolved from this repo

Command:

```bash
node -p "require.resolve('agent-browser/dist/snapshot.js')"
```

Result on March 19, 2026:

```text
/Users/pinion/node_modules/agent-browser/dist/snapshot.js
```

That means this feature currently depends on an ambient machine-level install instead of a repo-declared dependency path.
A clean checkout is unlikely to reproduce the same behavior.

## Heuristic Review

The current reconstruction logic is still strongly sample-shaped rather than mode-shaped.

### Sample-specific patterns that block acceptance

In `src/agent-browser-like-pruning.ts`, the feature logic is anchored to specific fixture content instead of broader semantic rules:

- docs mode expects values such as `Next.js Docs`, `What is Next.js?`, and `Version 16`
- package mode expects `react`, `React is a JavaScript library`, and `react.dev`
- place/map modes expect specific venue names such as `판교옥`, `이스트만`, `소울굴`, and `미채`
- marketing mode expects site/content names such as `OpenAI`, `GPT-5.4`, `iPhone 17 Pro`, and `Rick Astley`

Relevant sections:

- `src/agent-browser-like-pruning.ts:145-233`
- `src/agent-browser-like-pruning.ts:236-415`

These patterns are useful as fixtures, but they are too narrow for an approval-ready pruning layer.

## Test Review

`src/agent-browser-like-pruning.test.ts` verifies only the same narrow fixtures that the implementation already hard-codes.

Current gaps:

- no generic docs/package/forum/marketing fixtures that avoid the current brand names
- no adversarial test showing the reducer prefers semantic structure over noisy chrome on unseen pages
- no integration test for `collectAgentBrowserOracle()`
- no acceptance artifact comparing raw vs reduced samples in BrowserOS, even though `implementation.md` says that review is required before `ACCEPT`

## Documentation Review

`docs/features/agent-browser-like-pruning/implementation.md` correctly describes the target architecture, but the current code does not yet satisfy the acceptance bar described there.

Most important mismatch:

- the doc says acceptance requires a real review worker to open raw/pruned samples and return `ACCEPT`
- that review evidence is not present in this branch

## What Blocks ACCEPT Right Now

1. failing type-check
2. undeclared / ambient `agent-browser` resolution
3. fixture-specific heuristics instead of general semantic heuristics
4. tests that validate the same fixture-specific assumptions instead of generalization
5. missing BrowserOS raw-vs-reduced acceptance evidence

## Recommended Next Steps

1. make dependency and Playwright resolution repo-local and reproducible
2. get `bunx tsc --noEmit` clean enough to remove the current blocking errors
3. replace brand-specific heuristic matching with mode-level semantic extraction rules
4. add unseen-fixture tests plus at least one integration test for oracle collection
5. capture real raw/pruned samples and complete the BrowserOS acceptance review described in `implementation.md`
