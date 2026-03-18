# HTML To TOON MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and test the smallest pure HTML-to-TOON conversion slice from the issue design.

**Architecture:** Add a tiny Bun + TypeScript module centered on a pure `htmlToToon` function. Parse HTML into a DOM, walk it in preorder, emit reduced meaningful nodes, then serialize the flattened payload into TOON.

**Tech Stack:** Bun, TypeScript, `bun:test`, `linkedom`

---

### Task 1: Initialize the minimal TypeScript/Bun scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/html-to-toon.ts`
- Test: `src/html-to-toon.test.ts`

**Step 1: Write the failing test**

Create `src/html-to-toon.test.ts` with one minimal behavior-driven test for text/link extraction.

**Step 2: Run test to verify it fails**

Run: `bun test src/html-to-toon.test.ts`
Expected: FAIL because module/function does not exist yet.

**Step 3: Write minimal implementation**

Create the smallest `htmlToToon` export needed for the test.

**Step 4: Run test to verify it passes**

Run: `bun test src/html-to-toon.test.ts`
Expected: PASS

### Task 2: Add reduced-node behaviors incrementally

**Files:**
- Modify: `src/html-to-toon.ts`
- Modify: `src/html-to-toon.test.ts`

**Step 1: Write the failing tests**

Add separate tests for:

- empty wrapper removal
- image extraction
- whitespace-only node removal

**Step 2: Run tests to verify they fail**

Run: `bun test src/html-to-toon.test.ts`
Expected: FAIL with mismatched node output.

**Step 3: Write minimal implementation**

Extend traversal and serialization only enough to satisfy the new assertions.

**Step 4: Run tests to verify they pass**

Run: `bun test src/html-to-toon.test.ts`
Expected: PASS

### Task 3: Verify final behavior

**Files:**
- Modify: `README.md`

**Step 1: Run the focused test suite**

Run: `bun test`
Expected: PASS

**Step 2: Document the current implementation boundary**

Add a short README note that current code implements only the pure HTML-to-TOON layer.

**Step 3: Re-run tests**

Run: `bun test`
Expected: PASS
