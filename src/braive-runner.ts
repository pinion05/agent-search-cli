import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

import { buildReducedDocumentFromOracle, collectAgentBrowserOracle, renderReducedDocumentHtml } from "./agent-browser-like-pruning";
import { createBraveClient, type BraveSearchResult } from "./brave-search";
import { crawlUrlToRenderedDocument } from "./crawl-url-to-rendered-document";
import { htmlToToon } from "./html-to-toon";
import type { PruningMode } from "./types";

export type ProcessedDocument = {
  url: string;
  finalUrl: string;
  title: string;
  fetchedAt: string;
  mode: PruningMode;
  toon: string;
  reducedHtml?: string;
};

type BraiveDependencies = {
  now?: () => Date;
  search: (query: string, options: { count: number }) => Promise<BraveSearchResult[]>;
  processUrl: (url: string, options: { debugDir?: string }) => Promise<ProcessedDocument>;
  writeTextFile: (path: string, content: string) => Promise<void>;
};

type CliOptions = {
  count: number;
  out?: string;
  debugDir?: string;
};

type CliInput =
  | { kind: "query"; query: string; options: CliOptions }
  | { kind: "url"; urls: string[]; options: CliOptions }
  | { kind: "urls"; urls: string[]; options: CliOptions };

type BraivePacket = {
  generated_at: string;
  input:
    | { kind: "query"; query: string; count: number }
    | { kind: "url"; urls: string[] }
    | { kind: "urls"; urls: string[] };
  search?: {
    results: Array<BraveSearchResult & { rank: number }>;
  };
  documents: Array<ProcessedDocument & { rank: number }>;
  failures: Array<{ url: string; reason: string }>;
};

export async function runBraiveCli(argv: string[], dependencies: BraiveDependencies) {
  const input = parseCliArgs(argv);
  const generatedAt = (dependencies.now ?? (() => new Date()))().toISOString();
  const failures: Array<{ url: string; reason: string }> = [];

  let searchResults: BraveSearchResult[] | undefined;
  let urls: string[] = [];

  if (input.kind === "query") {
    searchResults = await dependencies.search(input.query, { count: input.options.count });
    urls = selectUsableUrls(searchResults);

    if (urls.length === 0) {
      throw new Error("Brave Search returned zero usable results");
    }
  } else {
    urls = dedupeUrls(input.urls);
  }

  const documents: Array<ProcessedDocument & { rank: number }> = [];
  let rank = 0;
  for (const url of urls) {
    rank += 1;
    try {
      const processed = await dependencies.processUrl(url, { debugDir: input.options.debugDir });
      documents.push({ ...processed, rank });
    } catch (error) {
      failures.push({
        url,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (documents.length === 0) {
    throw new Error(`All document processing failed (${failures.length} failures)`);
  }

  const packet: BraivePacket = {
    generated_at: generatedAt,
    input:
      input.kind === "query"
        ? { kind: "query", query: input.query, count: input.options.count }
        : { kind: input.kind, urls },
    ...(searchResults
      ? { search: { results: searchResults.map((result, index) => ({ ...result, rank: index + 1 })) } }
      : {}),
    documents,
    failures
  };

  const output = `${JSON.stringify(packet, null, 2)}\n`;

  if (input.options.out) {
    await dependencies.writeTextFile(resolve(input.options.out), output);
  }

  return { exitCode: 0, output, packet };
}

export async function processUrlToSemanticDocument(
  url: string,
  options: { debugDir?: string } = {}
): Promise<ProcessedDocument> {
  const rendered = await crawlUrlToRenderedDocument(url);
  const oracle = await collectAgentBrowserOracle(rendered);
  const reduced = buildReducedDocumentFromOracle(rendered, oracle);
  const reducedHtml = renderReducedDocumentHtml(reduced);
  const toon = htmlToToon(reducedHtml, {
    fetchedAt: reduced.fetchedAt,
    finalUrl: reduced.finalUrl,
    url: reduced.url
  });

  if (options.debugDir) {
    const targetDir = join(resolve(options.debugDir), slugifyPath(url));
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, "reduced.html"), reducedHtml);
    await writeFile(join(targetDir, "toon.txt"), toon);
    await writeFile(join(targetDir, "packet.json"), `${JSON.stringify(reduced, null, 2)}\n`);
  }

  return {
    url: reduced.url,
    finalUrl: reduced.finalUrl,
    title: reduced.title,
    fetchedAt: reduced.fetchedAt,
    mode: reduced.mode,
    toon,
    reducedHtml
  };
}

export function createDefaultBraiveDependencies(): BraiveDependencies {
  return {
    now: () => new Date(),
    search: async (query, options) => {
      const apiKey = process.env.BRAVE_API_KEY;
      if (!apiKey) {
        throw new Error("BRAVE_API_KEY is required for query mode");
      }

      const client = createBraveClient({ apiKey });
      return client.search(query, { count: options.count, extraSnippets: true });
    },
    processUrl: (url, options) => processUrlToSemanticDocument(url, options),
    writeTextFile: (path, content) => writeFile(path, content)
  };
}

function parseCliArgs(argv: string[]): CliInput {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    throw new Error(helpText());
  }

  const [kind, ...rest] = argv;
  const { options, positionals } = parseOptions(rest);

  if (kind === "query") {
    const query = positionals.join(" ").trim();
    if (!query) {
      throw new Error("query mode requires a search query");
    }

    return { kind, query, options };
  }

  if (kind === "url") {
    if (positionals.length !== 1) {
      throw new Error("url mode requires exactly one URL");
    }

    return { kind, urls: positionals, options };
  }

  if (kind === "urls") {
    if (positionals.length === 0) {
      throw new Error("urls mode requires at least one URL");
    }

    return { kind, urls: positionals, options };
  }

  throw new Error(helpText());
}

function parseOptions(argv: string[]) {
  const options: CliOptions = { count: 5 };
  const positionals: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--count") {
      const value = argv[index + 1];
      if (!value || Number.isNaN(Number(value))) {
        throw new Error("--count requires a numeric value");
      }
      options.count = Number(value);
      index += 1;
      continue;
    }

    if (token === "--out") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--out requires a file path");
      }
      options.out = value;
      index += 1;
      continue;
    }

    if (token === "--debug-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--debug-dir requires a directory path");
      }
      options.debugDir = value;
      index += 1;
      continue;
    }

    positionals.push(token);
  }

  return { options, positionals };
}

function selectUsableUrls(results: BraveSearchResult[]) {
  return dedupeUrls(
    results
      .map((result) => result.url)
      .filter((url) => isUsableUrl(url))
  );
}

function dedupeUrls(urls: string[]) {
  return [...new Set(urls.map((url) => normalizeUrl(url)).filter(Boolean))];
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function isUsableUrl(url: string) {
  const normalized = normalizeUrl(url);
  return normalized !== "" && !normalized.startsWith("javascript:");
}

function slugifyPath(value: string) {
  return basename(value)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";
}

function helpText() {
  return [
    "Usage:",
    "  braive query <search query> [--count N] [--out FILE] [--debug-dir DIR]",
    "  braive url <url> [--out FILE] [--debug-dir DIR]",
    "  braive urls <url...> [--out FILE] [--debug-dir DIR]"
  ].join("\n");
}
