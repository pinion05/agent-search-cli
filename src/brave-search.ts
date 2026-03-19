export type BraveSearchResult = {
  title: string;
  url: string;
  description: string;
  extraSnippets: string[];
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type BraveClientOptions = {
  apiKey: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
};

type BraveSearchOptions = {
  count?: number;
  country?: string;
  searchLang?: string;
  uiLang?: string;
  extraSnippets?: boolean;
};

type BraveWebSearchResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      extra_snippets?: string[];
    }>;
  };
};

export function createBraveClient(options: BraveClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? "https://api.search.brave.com/res/v1/web/search";

  return {
    async search(query: string, searchOptions: BraveSearchOptions = {}): Promise<BraveSearchResult[]> {
      const url = new URL(baseUrl);
      url.searchParams.set("q", query);
      url.searchParams.set("count", String(searchOptions.count ?? 5));

      if (searchOptions.country) {
        url.searchParams.set("country", searchOptions.country);
      }

      if (searchOptions.searchLang) {
        url.searchParams.set("search_lang", searchOptions.searchLang);
      }

      if (searchOptions.uiLang) {
        url.searchParams.set("ui_lang", searchOptions.uiLang);
      }

      if (searchOptions.extraSnippets) {
        url.searchParams.set("extra_snippets", "true");
      }

      const response = await fetchImpl(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": options.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(
          `Brave Search API request failed: ${response.status} ${response.statusText}`.trim()
        );
      }

      const body = (await response.json()) as BraveWebSearchResponse;
      return (body.web?.results ?? [])
        .filter((result) => typeof result.url === "string" && result.url.trim() !== "")
        .map((result) => ({
          title: result.title?.trim() ?? "",
          url: result.url?.trim() ?? "",
          description: result.description?.trim() ?? "",
          extraSnippets: (result.extra_snippets ?? []).map((value) => value.trim()).filter(Boolean)
        }));
    }
  };
}
