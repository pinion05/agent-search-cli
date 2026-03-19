import { describe, expect, test } from "bun:test";

import { runBraiveCli } from "./braive-runner";

describe("runBraiveCli", () => {
  test("runs query mode end-to-end with injected search + processing deps", async () => {
    const result = await runBraiveCli(
      ["query", "example query", "--count", "2"],
      {
        now: () => new Date("2026-03-19T00:00:00Z"),
        search: async () => [
          {
            title: "Example Result",
            url: "https://example.com/post",
            description: "Snippet",
            extraSnippets: []
          }
        ],
        processUrl: async (url) => ({
          url,
          finalUrl: url,
          title: "Example Post",
          fetchedAt: "2026-03-19T00:00:00Z",
          mode: "generic",
          toon: "url: \"https://example.com/post\"\nfinal_url: \"https://example.com/post\""
        }),
        writeTextFile: async () => {}
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('"kind": "query"');
    expect(result.output).toContain('"query": "example query"');
    expect(result.output).toContain('"title": "Example Post"');
    expect(result.output).toContain('"mode": "generic"');
    expect(result.output).toContain('"search": {');
    expect(result.output).not.toContain('"toon":');
  });

  test("filters invalid Brave URLs and fails when no usable query results remain", async () => {
    await expect(
      runBraiveCli(
        ["query", "empty"],
        {
          now: () => new Date("2026-03-19T00:00:00Z"),
          search: async () => [
            { title: "Bad", url: "javascript:alert(1)", description: "", extraSnippets: [] }
          ],
          processUrl: async () => {
            throw new Error("should not run");
          },
          writeTextFile: async () => {}
        }
      )
    ).rejects.toThrow("Brave Search returned zero usable results");
  });

  test("supports url mode without Brave search", async () => {
    const result = await runBraiveCli(
      ["url", "https://example.com/docs"],
      {
        now: () => new Date("2026-03-19T00:00:00Z"),
        search: async () => {
          throw new Error("search should not run");
        },
        processUrl: async (url) => ({
          url,
          finalUrl: url,
          title: "Docs",
          fetchedAt: "2026-03-19T00:00:00Z",
          mode: "docs",
          toon: "docs toon"
        }),
        writeTextFile: async () => {}
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('"kind": "url"');
    expect(result.output).toContain('"mode": "docs"');
    expect(result.output).not.toContain('"toon":');
  });

  test("passes debugDir through to the processing dependency", async () => {
    let received: { url: string; debugDir?: string } | undefined;

    await runBraiveCli(
      ["url", "https://example.com/docs", "--debug-dir", ".tmp/braive-debug"],
      {
        now: () => new Date("2026-03-19T00:00:00Z"),
        search: async () => {
          throw new Error("search should not run");
        },
        processUrl: async (url, options) => {
          received = { url, debugDir: options.debugDir };
          return {
            url,
            finalUrl: url,
            title: "Docs",
            fetchedAt: "2026-03-19T00:00:00Z",
            mode: "docs",
            toon: "docs toon"
          };
        },
        writeTextFile: async () => {}
      }
    );

    expect(received).toEqual({
      url: "https://example.com/docs",
      debugDir: ".tmp/braive-debug"
    });
  });
});
