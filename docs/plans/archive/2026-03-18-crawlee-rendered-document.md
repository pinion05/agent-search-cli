# Crawlee RenderedDocument Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a tested `crawlUrlToRenderedDocument` function on top of `Crawlee + Playwright` that returns a single `RenderedDocument`.

**Architecture:** Add a small crawler wrapper module that uses Crawlee's `launchPlaywright()` internally and returns one normalized object. Test it against a deterministic local HTTP server with regular, redirect, delayed-render, and empty-body cases.

**Tech Stack:** Bun, TypeScript, bun:test, Crawlee, Playwright

---

### Task 1: Add the RenderedDocument contract and failing crawler tests

**Files:**
- Create: `src/types.ts`
- Create: `src/crawl-url-to-rendered-document.test.ts`
- Modify: `package.json`

**Step 1: Write the failing tests**

Create tests that define the expected `RenderedDocument` behavior for:

- basic page extraction
- redirect resolution
- delayed client-side render
- empty body handling

**Step 2: Run test to verify it fails**

Run: `bun test src/crawl-url-to-rendered-document.test.ts`
Expected: FAIL because the crawler module does not exist yet.

**Step 3: Write minimal implementation**

Create the `RenderedDocument` type and the smallest exported crawler function signature needed by the tests.

**Step 4: Run test to verify current failure is implementation-related**

Run: `bun test src/crawl-url-to-rendered-document.test.ts`
Expected: FAIL on missing runtime behavior, not missing module.

### Task 2: Implement the Crawlee + Playwright crawler wrapper

**Files:**
- Create: `src/crawl-url-to-rendered-document.ts`
- Modify: `package.json`

**Step 1: Install dependencies**

Run: `bun add crawlee playwright`

**Step 2: Implement minimal crawler wrapper**

Use Crawlee + Playwright to:

- process exactly one URL
- wait for rendered DOM
- read title
- read final URL
- read body HTML
- return `RenderedDocument`

**Step 3: Run focused tests**

Run: `bun test src/crawl-url-to-rendered-document.test.ts`
Expected: PASS

### Task 3: Document and verify the current milestone

**Files:**
- Modify: `README.md`

**Step 1: Update README**

Add a short note that the repo now includes a tested Crawlee-based URL-to-rendered-document layer.

**Step 2: Run the full test suite**

Run: `bun test`
Expected: PASS

**Step 3: Write the HTML report**

Create an HTML report under `~/report` summarizing:

- design choice
- implementation summary
- tests added
- verification commands and results
