import { mkdir, writeFile } from "node:fs/promises";
import fs from "node:fs";
import { join, resolve } from "node:path";

import { buildReducedDocumentFromOracle, collectAgentBrowserOracle, renderReducedDocumentHtml } from "../src/agent-browser-like-pruning";
import { crawlUrlToRenderedDocument } from "../src/crawl-url-to-rendered-document";
import type { AgentBrowserOracle, ReducedDocument, RenderedDocument } from "../src/types";

type LiveGolden = {
  slug: string;
  url: string;
  expectedMode: ReducedDocument["mode"];
  expectedSignals: string[];
};

type EntrySummary = {
  slug: string;
  url: string;
  expectedMode: ReducedDocument["mode"];
  actualMode: ReducedDocument["mode"];
  modePass: boolean;
  signalResults: Array<{ signal: string; passed: boolean }>;
  outputDir: string;
};

const datasetPath = resolve("docs/features/agent-browser-like-pruning/live-goldens.json");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as LiveGolden[];
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outputRoot = resolve(`.omx/artifacts/agent-browser-like-pruning/live-goldens/${runId}`);

await mkdir(outputRoot, { recursive: true });

const summaries: EntrySummary[] = [];
for (const entry of dataset) {
  const outputDir = join(outputRoot, entry.slug);
  await mkdir(outputDir, { recursive: true });

  const rendered = await crawlUrlToRenderedDocument(entry.url, {
    navigationTimeoutMs: 25_000,
    stabilizationTimeMs: 1_500
  });
  const oracle = await collectAgentBrowserOracle(rendered);
  const reduced = buildReducedDocumentFromOracle(rendered, oracle);
  const reducedHtml = renderReducedDocumentHtml(reduced);
  const reducedText = flattenReducedDocument(reduced);

  await writeJson(join(outputDir, "rendered-document.json"), rendered);
  await writeJson(join(outputDir, "oracle.json"), oracle);
  await writeJson(join(outputDir, "reduced-document.json"), reduced);
  await writeFile(join(outputDir, "reduced-document.html"), reducedHtml);

  summaries.push({
    slug: entry.slug,
    url: entry.url,
    expectedMode: entry.expectedMode,
    actualMode: reduced.mode,
    modePass: reduced.mode === entry.expectedMode,
    signalResults: entry.expectedSignals.map((signal) => ({
      signal,
      passed: reducedText.includes(signal)
    })),
    outputDir
  });
}

await writeJson(join(outputRoot, "summary.json"), summaries);

for (const summary of summaries) {
  console.log(`\n### ${summary.slug}`);
  console.log(`mode: ${summary.actualMode} (${summary.modePass ? "PASS" : `FAIL expected ${summary.expectedMode}`})`);
  for (const result of summary.signalResults) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.signal}`);
  }
}

const failed = summaries.some(
  (summary) => !summary.modePass || summary.signalResults.some((result) => !result.passed)
);

if (failed) {
  console.error(`\nlive golden drift detected; see ${join(outputRoot, "summary.json")}`);
  process.exit(1);
}

console.log(`\nlive golden capture passed; artifacts written to ${outputRoot}`);

function flattenReducedDocument(reduced: ReducedDocument) {
  return [
    reduced.title,
    ...reduced.identity,
    ...reduced.facts,
    ...reduced.structure.flatMap((section) => [section.heading, ...section.items]),
    ...reduced.content,
    ...reduced.interactions
  ].join("\n");
}

async function writeJson(path: string, value: RenderedDocument | AgentBrowserOracle | ReducedDocument | EntrySummary[]) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
