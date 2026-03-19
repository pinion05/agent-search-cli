# Agent-Browser-Like Pruning Href Preservation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve real anchor destinations in reduced HTML structure sections without changing accepted pruning signals.

**Architecture:** Add structure item objects that carry `text` plus optional `href`, derive those hrefs from the original rendered HTML with `linkedom`, resolve relative URLs against `finalUrl`, and render plain text instead of fake `#` links when no real destination exists.

**Tech Stack:** TypeScript, Bun, linkedom, existing pruning tests/sample generator.

---

### Task 1: Update the reduced structure schema

**Files:**
- Modify: `src/types.ts`
- Test: `src/agent-browser-like-pruning.test.ts`

**Step 1: Write the failing test**

Add or update a render/reducer test so `structure` uses objects rather than raw strings:

```ts
structure: [{ heading: "content-nav", items: [{ text: "API Reference", href: "https://docs.python.org/3/library/json.html#api-reference" }] }]
```

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: type/test failures because `items` still expects `string[]`.

**Step 3: Write minimal implementation**

In `src/types.ts`, introduce:

```ts
export type ReducedDocumentStructureItem = {
  text: string;
  href?: string;
};
```

Then update:

```ts
export type ReducedDocumentSection = {
  heading: string;
  items: ReducedDocumentStructureItem[];
};
```

**Step 4: Run test to verify the new shape compiles**

Run:

```bash
bunx tsc --noEmit
```

Expected: type errors move from schema mismatch to reducer/renderer call sites.

**Step 5: Commit**

```bash
git add src/types.ts src/agent-browser-like-pruning.test.ts
git commit -m "refactor: model reduced structure items with hrefs"
```

### Task 2: Extract anchor candidates from rendered HTML

**Files:**
- Modify: `src/agent-browser-like-pruning.ts`
- Reference: `src/html-to-toon.ts`

**Step 1: Write the failing test**

Add a reducer test whose `bodyHtml` contains:

```html
<nav>
  <a href="/overview">Overview</a>
  <a href="/api">API Reference</a>
</nav>
```

and expect the reduced structure item for `API Reference` to keep an absolute href based on `finalUrl`.

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: reducer returns text only or placeholder `#`, so href assertion fails.

**Step 3: Write minimal implementation**

In `src/agent-browser-like-pruning.ts`:

- import `parseHTML` from `linkedom`
- add a helper that parses `document.bodyHtml`
- collect DOM-order anchor candidates with normalized `text` and resolved absolute `href`
- reuse exact/case-insensitive text matching only

**Step 4: Run focused tests**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: href-preservation tests now pass.

**Step 5: Commit**

```bash
git add src/agent-browser-like-pruning.ts src/agent-browser-like-pruning.test.ts
git commit -m "feat: preserve structure hrefs in reduced documents"
```

### Task 3: Keep non-link structure items as plain text

**Files:**
- Modify: `src/agent-browser-like-pruning.ts`
- Test: `src/agent-browser-like-pruning.test.ts`

**Step 1: Write the failing test**

Add a render test with:

```ts
structure: [{ heading: "selected-panel", items: [{ text: "Quiet late-night cafe" }] }]
```

Expect rendered HTML to contain the text but **not** `href="#"`.

**Step 2: Run test to verify it fails**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: renderer still emits `href="#"`.

**Step 3: Write minimal implementation**

Update `renderReducedDocumentHtml()` so:

- `item.href` => `<a href="...">`
- no `item.href` => plain text element inside `<li>`

**Step 4: Run focused tests**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: render tests pass without placeholder links.

**Step 5: Commit**

```bash
git add src/agent-browser-like-pruning.ts src/agent-browser-like-pruning.test.ts
git commit -m "fix: stop rendering fake reduced structure links"
```

### Task 4: Cover duplicate labels and regression boundaries

**Files:**
- Modify: `src/agent-browser-like-pruning.test.ts`

**Step 1: Write the failing tests**

Add:

1. duplicate-label DOM-order test
2. non-link map-view structure test
3. regression test proving interactions still remain plain text/button-driven

**Step 2: Run tests to verify failures**

Run:

```bash
bun test src/agent-browser-like-pruning.test.ts
```

Expected: one or more new assertions fail before the reducer is complete.

**Step 3: Write minimal implementation**

Only adjust matching logic if the new tests require it. Do not broaden scope into interaction href preservation.

**Step 4: Run full relevant verification**

Run:

```bash
bunx tsc --noEmit
bun test
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/agent-browser-like-pruning.test.ts src/agent-browser-like-pruning.ts
git commit -m "test: cover href preservation regressions"
```

### Task 5: Refresh review samples after code lands

**Files:**
- Modify if needed: `scripts/write-agent-browser-like-pruning-review-samples.ts`
- Refresh outputs: `docs/features/agent-browser-like-pruning/samples/*`

**Step 1: Check fixture readiness**

Confirm the sample generator uses href-bearing anchors in `bodyHtml` for the modes where preserved links matter.

**Step 2: If fixtures are missing hrefs, add the smallest real href values**

Examples:

```html
<a href="https://docs.python.org/3/library/json.html#api-reference">API Reference</a>
<a href="https://pypi.org/project/httpx/">Readme</a>
<a href="https://place.map.kakao.com/42#menu">메뉴</a>
```

**Step 3: Regenerate samples**

Run:

```bash
bun scripts/write-agent-browser-like-pruning-review-samples.ts
```

Expected: regenerated reduced HTML contains real hrefs where appropriate.

**Step 4: Verify**

Run:

```bash
bunx tsc --noEmit
bun test
bun scripts/write-agent-browser-like-pruning-review-samples.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/write-agent-browser-like-pruning-review-samples.ts docs/features/agent-browser-like-pruning/samples
git commit -m "docs: refresh href-preserving pruning samples"
```
