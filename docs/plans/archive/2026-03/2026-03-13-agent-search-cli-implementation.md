# Agent Search CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a one-shot Bun CLI that uses Brave Search plus CLIProxyAPI to emit a TOON research packet containing summary, facts, sources, follow-up links, and gap metadata for downstream agents.

**Architecture:** The CLI runs a linear pipeline: argument parsing, Brave retrieval, deterministic filtering, HTML extraction, evidence reduction, LLM compression, and TOON serialization. Cost stays low through small default result sets, cache-first behavior, and pre-LLM evidence compaction.

**Tech Stack:** Bun, TypeScript, bun:test, zod, commander, fetch/undici, jsdom, @mozilla/readability

---

### Task 1: Initialize project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `src/cli.ts`
- Create: `src/types.ts`
- Create: `tests/cli/smoke.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";

describe("cli smoke", () => {
  test("builds a help-ready CLI module", async () => {
    const mod = await import("../../src/cli");
    expect(typeof mod.buildCli).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/cli/smoke.test.ts`
Expected: FAIL because `src/cli.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create the CLI entrypoint and export `buildCli()` with a minimal parser and placeholder command action.

**Step 4: Run test to verify it passes**

Run: `bun test tests/cli/smoke.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json tsconfig.json src/index.ts src/cli.ts src/types.ts tests/cli/smoke.test.ts
git commit -m "chore: scaffold agent search cli"
```

### Task 2: Add configuration loading and validation

**Files:**
- Create: `src/config.ts`
- Create: `tests/config/config.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { loadConfig } from "../../src/config";

describe("loadConfig", () => {
  test("reads required env vars", () => {
    const config = loadConfig({
      BRAVE_API_KEY: "brave",
      CLIPROXYAPI_BASE_URL: "https://proxy.example.com",
      CLIPROXYAPI_API_KEY: "token",
      CLIPROXYAPI_MODEL: "codex-mini",
    });

    expect(config.braveApiKey).toBe("brave");
    expect(config.cliproxy.baseUrl).toBe("https://proxy.example.com");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/config/config.test.ts`
Expected: FAIL because `loadConfig` does not exist.

**Step 3: Write minimal implementation**

Use `zod` to validate environment variables and return a typed config object. Wire CLI startup to fail fast with a concise message when required values are missing.

**Step 4: Run test to verify it passes**

Run: `bun test tests/config/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/config.ts src/cli.ts src/types.ts tests/config/config.test.ts
git commit -m "feat: add config validation"
```

### Task 3: Implement Brave search client

**Files:**
- Create: `src/brave/client.ts`
- Create: `src/brave/normalize.ts`
- Create: `tests/brave/client.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { createBraveClient } from "../../src/brave/client";

describe("Brave client", () => {
  test("normalizes web results", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({
        web: {
          results: [
            { title: "Example", url: "https://example.com/a", description: "desc" }
          ]
        }
      }));

    const client = createBraveClient({ apiKey: "x", fetchImpl });
    const results = await client.search("example", { count: 5 });
    expect(results[0]?.url).toBe("https://example.com/a");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/brave/client.test.ts`
Expected: FAIL because Brave client files do not exist.

**Step 3: Write minimal implementation**

Add a thin Brave HTTP client, normalize API responses into stable internal search result types, and capture response metadata needed for debugging.

**Step 4: Run test to verify it passes**

Run: `bun test tests/brave/client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/brave/client.ts src/brave/normalize.ts src/types.ts tests/brave/client.test.ts
git commit -m "feat: add brave search client"
```

### Task 4: Add candidate filtering

**Files:**
- Create: `src/filter/selectCandidates.ts`
- Create: `tests/filter/selectCandidates.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { selectCandidates } from "../../src/filter/selectCandidates";

describe("selectCandidates", () => {
  test("deduplicates duplicate domains and urls", () => {
    const selected = selectCandidates([
      { url: "https://a.com/1", domain: "a.com", title: "1", snippet: "" },
      { url: "https://a.com/1", domain: "a.com", title: "1b", snippet: "" },
      { url: "https://a.com/2", domain: "a.com", title: "2", snippet: "" },
      { url: "https://b.com/1", domain: "b.com", title: "3", snippet: "" },
    ], { maxResults: 2, maxPerDomain: 1 });

    expect(selected).toHaveLength(2);
    expect(selected.map((item) => item.domain)).toEqual(["a.com", "b.com"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/filter/selectCandidates.test.ts`
Expected: FAIL because `selectCandidates` does not exist.

**Step 3: Write minimal implementation**

Implement deterministic URL and domain deduplication with configurable caps and stable ordering.

**Step 4: Run test to verify it passes**

Run: `bun test tests/filter/selectCandidates.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/filter/selectCandidates.ts src/types.ts tests/filter/selectCandidates.test.ts
git commit -m "feat: add candidate filtering"
```

### Task 5: Implement page extraction

**Files:**
- Create: `src/extract/fetchPage.ts`
- Create: `src/extract/extractReadableContent.ts`
- Create: `src/extract/index.ts`
- Create: `tests/extract/extractReadableContent.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { extractReadableContent } from "../../src/extract/extractReadableContent";

describe("extractReadableContent", () => {
  test("returns main content text from simple article html", async () => {
    const result = await extractReadableContent({
      url: "https://example.com/post",
      html: "<html><body><article><h1>Hello</h1><p>World body</p></article></body></html>",
    });

    expect(result.title).toBe("Hello");
    expect(result.text).toContain("World body");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/extract/extractReadableContent.test.ts`
Expected: FAIL because extraction files do not exist.

**Step 3: Write minimal implementation**

Use `jsdom` and `@mozilla/readability` to parse HTML into a normalized extracted document object. Include failure classification when parsing yields no usable content.

**Step 4: Run test to verify it passes**

Run: `bun test tests/extract/extractReadableContent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/extract/fetchPage.ts src/extract/extractReadableContent.ts src/extract/index.ts src/types.ts tests/extract/extractReadableContent.test.ts
git commit -m "feat: add readable content extraction"
```

### Task 6: Build evidence reduction

**Files:**
- Create: `src/evidence/buildEvidence.ts`
- Create: `tests/evidence/buildEvidence.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { buildEvidence } from "../../src/evidence/buildEvidence";

describe("buildEvidence", () => {
  test("creates compact source-linked evidence items", () => {
    const result = buildEvidence([
      {
        sourceId: "s1",
        title: "Example",
        text: "On March 1, 2026, Example Corp raised price to $20 for Pro plan.",
        url: "https://example.com",
      },
    ]);

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]?.sourceRefs).toEqual(["s1"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/evidence/buildEvidence.test.ts`
Expected: FAIL because `buildEvidence` does not exist.

**Step 3: Write minimal implementation**

Add deterministic evidence extraction heuristics that emit short claims with source references and light categorization. Avoid LLM usage in this stage.

**Step 4: Run test to verify it passes**

Run: `bun test tests/evidence/buildEvidence.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/evidence/buildEvidence.ts src/types.ts tests/evidence/buildEvidence.test.ts
git commit -m "feat: add evidence reduction"
```

### Task 7: Implement CLIProxyAPI client

**Files:**
- Create: `src/llm/cliproxyClient.ts`
- Create: `src/llm/prompts.ts`
- Create: `tests/llm/cliproxyClient.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { createCliProxyClient } from "../../src/llm/cliproxyClient";

describe("CLIProxy client", () => {
  test("sends OpenAI-compatible request payloads", async () => {
    let requestBody = "";
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({
        choices: [{ message: { content: "{\"summary\":\"ok\",\"facts\":[],\"followups\":[],\"gaps\":[]}" } }]
      }));
    };

    const client = createCliProxyClient({
      baseUrl: "https://proxy.example.com",
      apiKey: "secret",
      model: "codex-mini",
      fetchImpl,
    });

    await client.compressEvidence({ query: "test", evidence: [] });
    expect(requestBody).toContain("\"model\":\"codex-mini\"");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/llm/cliproxyClient.test.ts`
Expected: FAIL because LLM client files do not exist.

**Step 3: Write minimal implementation**

Implement an OpenAI-compatible chat/completions client targeting CLIProxyAPI, plus a compact structured prompt for summary, facts, follow-ups, and gaps.

**Step 4: Run test to verify it passes**

Run: `bun test tests/llm/cliproxyClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/llm/cliproxyClient.ts src/llm/prompts.ts src/types.ts tests/llm/cliproxyClient.test.ts
git commit -m "feat: add cliproxy compression client"
```

### Task 8: Add TOON serialization

**Files:**
- Create: `src/toon/serializeToon.ts`
- Create: `tests/toon/serializeToon.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { serializeToon } from "../../src/toon/serializeToon";

describe("serializeToon", () => {
  test("serializes structured packet into compact string output", () => {
    const output = serializeToon({
      query: { text: "test", ranAt: "2026-03-13T00:00:00.000Z" },
      summary: "short summary",
      facts: [],
      sources: [],
      followups: [],
      gaps: [],
      meta: { resultCount: 1, extractedCount: 1, failedCount: 0 },
    });

    expect(typeof output).toBe("string");
    expect(output.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/toon/serializeToon.test.ts`
Expected: FAIL because serializer files do not exist.

**Step 3: Write minimal implementation**

Create a compact serializer over the internal packet structure. Keep the implementation replaceable so a more exact TOON encoding can be swapped in later.

**Step 4: Run test to verify it passes**

Run: `bun test tests/toon/serializeToon.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/toon/serializeToon.ts src/types.ts tests/toon/serializeToon.test.ts
git commit -m "feat: add toon serialization"
```

### Task 9: Add filesystem cache

**Files:**
- Create: `src/cache/fileCache.ts`
- Create: `tests/cache/fileCache.test.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { FileCache } from "../../src/cache/fileCache";

describe("FileCache", () => {
  test("stores and retrieves values before ttl expiry", async () => {
    const cache = new FileCache({ rootDir: ".tmp-cache-tests" });
    await cache.set("k", { ok: true }, 1000);
    const value = await cache.get("k");
    expect(value).toEqual({ ok: true });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/cache/fileCache.test.ts`
Expected: FAIL because cache files do not exist.

**Step 3: Write minimal implementation**

Implement a small filesystem-backed JSON cache with TTL support and namespaced keys for query and URL caching.

**Step 4: Run test to verify it passes**

Run: `bun test tests/cache/fileCache.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cache/fileCache.ts src/types.ts tests/cache/fileCache.test.ts
git commit -m "feat: add filesystem cache"
```

### Task 10: Compose the end-to-end pipeline

**Files:**
- Create: `src/pipeline/runQuery.ts`
- Create: `tests/pipeline/runQuery.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `src/types.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { runQuery } from "../../src/pipeline/runQuery";

describe("runQuery", () => {
  test("returns a final structured packet from mocked dependencies", async () => {
    const result = await runQuery("test", {
      brave: { search: async () => [{ url: "https://example.com", domain: "example.com", title: "Example", snippet: "" }] },
      extractor: { extract: async () => ({ sourceId: "s1", title: "Example", text: "Fact text", url: "https://example.com" }) },
      llm: { compressEvidence: async () => ({ summary: "ok", facts: [], followups: [], gaps: [] }) },
      cache: { get: async () => null, set: async () => {} },
    });

    expect(result.summary).toBe("ok");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/pipeline/runQuery.test.ts`
Expected: FAIL because pipeline files do not exist.

**Step 3: Write minimal implementation**

Compose the modules into a single query pipeline, add debug metadata, and return the structured packet ready for TOON serialization.

**Step 4: Run test to verify it passes**

Run: `bun test tests/pipeline/runQuery.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pipeline/runQuery.ts src/cli.ts src/index.ts src/types.ts tests/pipeline/runQuery.test.ts
git commit -m "feat: compose agent search pipeline"
```

### Task 11: Add CLI output modes and debug artifacts

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/pipeline/runQuery.ts`
- Create: `tests/cli/output.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import { buildCli } from "../../src/cli";

describe("CLI output", () => {
  test("supports output file mode", () => {
    const cli = buildCli();
    expect(cli.options.map((option) => option.long).includes("--out")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/cli/output.test.ts`
Expected: FAIL because output option is missing.

**Step 3: Write minimal implementation**

Implement stdout default output, file output mode, and optional debug artifact emission for normalized search results, extraction results, and pre-TOON packet inspection.

**Step 4: Run test to verify it passes**

Run: `bun test tests/cli/output.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/cli.ts src/pipeline/runQuery.ts tests/cli/output.test.ts
git commit -m "feat: add output modes and debug artifacts"
```

### Task 12: Add end-to-end documentation and verification

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Create: `tests/e2e/manual-checklist.md`
- Modify: `package.json`

**Step 1: Write the failing test**

```ts
import { describe, expect, test } from "bun:test";
import pkg from "../../package.json";

describe("package scripts", () => {
  test("exposes a test script", () => {
    expect(pkg.scripts.test).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/cli/smoke.test.ts tests/config/config.test.ts tests/brave/client.test.ts tests/filter/selectCandidates.test.ts tests/extract/extractReadableContent.test.ts tests/evidence/buildEvidence.test.ts tests/llm/cliproxyClient.test.ts tests/toon/serializeToon.test.ts tests/cache/fileCache.test.ts tests/pipeline/runQuery.test.ts tests/cli/output.test.ts`
Expected: PASS on previous tests, then FAIL for the new package metadata expectation.

**Step 3: Write minimal implementation**

Document setup, environment variables, usage examples, expected output shape, and a short manual verification checklist. Add package scripts for `test`, `dev`, and `start`.

**Step 4: Run test to verify it passes**

Run: `bun test`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md .env.example tests/e2e/manual-checklist.md package.json
git commit -m "docs: add setup and verification docs"
```
