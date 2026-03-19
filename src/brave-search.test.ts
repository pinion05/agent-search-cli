import { describe, expect, test } from "bun:test";

import { createBraveClient } from "./brave-search";

describe("createBraveClient", () => {
  test("normalizes Brave web search results", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Example Result",
                url: "https://example.com/post",
                description: "Main snippet",
                extra_snippets: ["Extra one", "Extra two"]
              }
            ]
          }
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const client = createBraveClient({ apiKey: "test-key", fetchImpl });
    const results = await client.search("example query", { count: 5 });

    expect(results).toEqual([
      {
        title: "Example Result",
        url: "https://example.com/post",
        description: "Main snippet",
        extraSnippets: ["Extra one", "Extra two"]
      }
    ]);
  });

  test("sends expected query params and auth header", async () => {
    const requests: Array<{ url: string; token: string | null }> = [];
    const fetchImpl = async (input: string, init?: RequestInit) => {
      requests.push({
        url: String(input),
        token: new Headers(init?.headers).get("X-Subscription-Token")
      });

      return new Response(JSON.stringify({ web: { results: [] } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    };

    const client = createBraveClient({ apiKey: "secret", fetchImpl });
    await client.search("hello world", {
      count: 7,
      country: "KR",
      searchLang: "ko",
      uiLang: "ko-KR",
      extraSnippets: true
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.token).toBe("secret");
    expect(requests[0]?.url).toContain("q=hello+world");
    expect(requests[0]?.url).toContain("count=7");
    expect(requests[0]?.url).toContain("country=KR");
    expect(requests[0]?.url).toContain("search_lang=ko");
    expect(requests[0]?.url).toContain("ui_lang=ko-KR");
    expect(requests[0]?.url).toContain("extra_snippets=true");
  });

  test("throws a clear error when Brave returns a non-ok response", async () => {
    const fetchImpl = async () =>
      new Response("forbidden", { status: 403, statusText: "Forbidden" });

    const client = createBraveClient({ apiKey: "test-key", fetchImpl });

    await expect(client.search("blocked", { count: 3 })).rejects.toThrow(
      "Brave Search API request failed: 403 Forbidden"
    );
  });
});
