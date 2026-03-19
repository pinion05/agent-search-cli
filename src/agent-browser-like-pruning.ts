import { chromium } from "playwright";
import { getEnhancedSnapshot } from "agent-browser/dist/snapshot.js";

import type {
  AgentBrowserOracle,
  ReducedDocument,
  ReducedDocumentSection,
  RenderedDocument
} from "./types";

const DOCS_FACT_PATTERNS = [/Version\s*\d+(?:\.\d+)*/i, /\bApp Router\b/i, /\bPages Router\b/i];
const DOCS_NAV_PATTERNS = [
  /getting started|guides?|tutorials?|reference|api reference|overview|introduction|quick start|installation|project structure|routing|router|configuration|deployment|deploying|migration|upgrade|on this page/i
];
const DOCS_INTERACTION_PATTERNS = [/search/i, /feedback/i, /copy/i, /open in/i];

const PACKAGE_FACT_PATTERNS = [
  /npm i [^\s]+/i,
  /pnpm add [^\s]+/i,
  /yarn add [^\s]+/i,
  /bun add [^\s]+/i,
  /pip install [^\s]+/i,
  /Version\s*[0-9][\w.-]*/i,
  /License\s*[A-Z0-9.-]+/i,
  /^Homepage.*$/i,
  /^Documentation.*$/i,
  /^Repository.*$/i,
  /^Releases?.*$/i,
  /^Weekly Downloads.*$/i,
  /^Dependents.*$/i
];
const PACKAGE_TAB_PATTERNS = [
  /^Readme$/i,
  /^Code$/i,
  /Dependencies/i,
  /Dependents/i,
  /Versions?/i,
  /^Documentation$/i,
  /^API$/i
];
const PACKAGE_INTERACTION_PATTERNS = [/search/i, /copy install/i, /^install$/i, /^open$/i];

const PLACE_FACT_PATTERNS = [
  /평점\s*[0-9.]+/i,
  /후기\s*\d+개?/i,
  /블로그\s*\d+개?/i,
  /영업\s*(?:전|마감)[^\n]{0,30}/i,
  /영업시간\s*[:0-9][^\n]{0,20}/i,
  /^주소.*$/i,
  /^전화.*$/i,
  /\d{1,2}:\d{2}\s*[-~]\s*\d{1,2}:\d{2}/,
  /[0-9,]+원/i
];
const PLACE_TAB_PATTERNS = [/^홈$/i, /^메뉴$/i, /^사진$/i, /^후기$/i, /^블로그$/i, /^랭킹$/i];
const PLACE_INTERACTION_PATTERNS = [/로드뷰/i, /공유/i, /즐겨찾기/i, /출발/i, /도착/i, /수정제안/i];

const MAP_FACT_PATTERNS = [
  /리뷰\s*\d+/i,
  /평균(?:\s*가격)?\s*[0-9,]+원/i,
  /별점\s*[0-9.]+/i,
  /예약 가능/i,
  /영업시간\s*[:0-9][^\n]{0,20}/i,
  /주차/i
];
const MAP_PANEL_EXCLUDE_PATTERNS = [
  /지도 홈|길찾기|버스|지하철|기차|더보기|오류신고|확대|축소|거리뷰|일반지도|위성지도|테마|공유하기|패널 접기|저장|접속위치|new$/i
];
const MAP_INTERACTION_PATTERNS = [/저장/i, /패널 접기/i, /공유하기/i, /길찾기/i];

const FORUM_FLOW_PATTERNS = [
  /^답변하기$/i,
  /^답변$/i,
  /^최적$/i,
  /^추천순$/i,
  /^댓글/i,
  /^Accepted$/i,
  /^Answers?$/i,
  /^Comments?$/i,
  /^Votes?$/i,
  /^Newest$/i
];
const FORUM_FACT_PATTERNS = [/답변\s*\d+/i, /댓글\s*\d+/i, /조회\s*\d+/i, /views?\s*\d+/i];

const MARKETING_IA_PATTERNS = [
  /^Research$/i,
  /^Products?$/i,
  /^Solutions?$/i,
  /^For Business$/i,
  /^For Developers$/i,
  /^Developers?$/i,
  /^Company$/i,
  /^News$/i,
  /^Pricing$/i,
  /^Compare/i,
  /^Shop/i,
  /^API$/i,
  /^ChatGPT$/i,
  /^Sora$/i
];
const MARKETING_CTA_PATTERNS = [
  /Get started/i,
  /Learn more/i,
  /Try/i,
  /Compare/i,
  /Shop/i,
  /Buy/i,
  /Subscribe/i,
  /Contact sales/i,
  /Watch now/i,
  /Read more/i
];
const MARKETING_FACT_PATTERNS = [
  /조회수[^.!?]{0,30}/i,
  /views?[^.!?]{0,30}/i,
  /pricing/i,
  /lineup/i,
  /posted/i,
  /channels?/i
];

const GENERIC_SHELL_PATTERNS = [
  /^search$/i,
  /^sign in$/i,
  /^log in$/i,
  /^skip to content$/i,
  /^menu$/i,
  /^open menu$/i,
  /^close$/i,
  /^home$/i
];

export function buildReducedDocumentFromOracle(
  document: RenderedDocument,
  oracle: AgentBrowserOracle
): ReducedDocument {
  const mode = detectMode(document.finalUrl || document.url);
  const snapshotLines = splitLines(oracle.snapshotTree);
  const interactiveLines = splitLines(oracle.interactiveTree);
  const snapshotLabels = extractQuotedLabels(snapshotLines);
  const interactiveLabels = extractQuotedLabels(interactiveLines);
  const textChunks = splitTextChunks(oracle.innerText);

  return {
    ...document,
    mode,
    identity: buildIdentity(document.title, mode, textChunks, snapshotLabels, interactiveLabels),
    facts: buildFacts(mode, textChunks, snapshotLabels),
    structure: buildStructure(mode, textChunks, snapshotLabels, interactiveLabels),
    content: buildContent(mode, textChunks, snapshotLabels, interactiveLabels),
    interactions: buildInteractions(mode, interactiveLabels, snapshotLabels)
  };
}

export async function collectAgentBrowserOracle(
  document: RenderedDocument
): Promise<AgentBrowserOracle> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html><html><head><title>${escapeHtml(document.title)}</title></head><body>${document.bodyHtml}</body></html>`,
      { waitUntil: "domcontentloaded" }
    );

    const snapshot = await getEnhancedSnapshot(page, { compact: true, maxDepth: 8 });
    const interactive = await getEnhancedSnapshot(page, {
      interactive: true,
      cursor: true,
      maxDepth: 8
    });
    const innerText = await page.locator("body").innerText();

    return {
      snapshotTree: snapshot.tree,
      interactiveTree: interactive.tree,
      innerText
    };
  } finally {
    await browser.close();
  }
}

export function renderReducedDocumentHtml(document: ReducedDocument): string {
  const structureBlocks = document.structure
    .map(
      (section) =>
        `<nav data-layer="structure" aria-label="${escapeHtml(section.heading)}"><h2>${escapeHtml(
          section.heading
        )}</h2><ul>${section.items
          .map((item) => `<li><a href="#">${escapeHtml(item)}</a></li>`)
          .join("")}</ul></nav>`
    )
    .join("");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    `<title>${escapeHtml(document.title)}</title>`,
    "</head>",
    "<body>",
    `<section data-layer="identity"><h1>${escapeHtml(document.title)}</h1>${document.identity
      .map((item) => `<p>${escapeHtml(item)}</p>`)
      .join("")}</section>`,
    document.facts.length > 0
      ? `<section data-layer="facts"><h2>facts</h2><dl>${document.facts
          .map((item) => `<div><dt>fact</dt><dd>${escapeHtml(item)}</dd></div>`)
          .join("")}</dl></section>`
      : "",
    structureBlocks,
    `<article data-layer="content">${document.content
      .map((item, index) =>
        index === 0 ? `<h2>${escapeHtml(item)}</h2>` : `<p>${escapeHtml(item)}</p>`
      )
      .join("")}</article>`,
    document.interactions.length > 0
      ? `<section data-layer="interactions"><h2>interactions</h2><ul>${document.interactions
          .map((item) => `<li><button type="button">${escapeHtml(item)}</button></li>`)
          .join("")}</ul></section>`
      : "",
    "</body>",
    "</html>"
  ]
    .filter(Boolean)
    .join("");
}

function detectMode(url: string): ReducedDocument["mode"] {
  if (
    url.includes("developer.mozilla.org") ||
    url.includes("docs.python.org") ||
    url.includes("rust-lang.org") ||
    url.includes("nextjs.org/docs") ||
    url.includes("docs.railway.com")
  ) {
    return "docs";
  }

  if (url.includes("npmjs.com") || url.includes("pypi.org") || url.includes("github.com")) {
    return "package-page";
  }

  if (url.includes("map.naver.com")) {
    return "map-view";
  }

  if (url.includes("map.kakao.com")) {
    return "place-detail";
  }

  if (url.includes("kin.naver.com") || url.includes("stackoverflow.com")) {
    return "forum-qna";
  }

  if (url.includes("openai.com") || url.includes("apple.com") || url.includes("youtube.com")) {
    return "marketing-media";
  }

  return "generic";
}

function buildIdentity(
  title: string,
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[],
  interactiveLabels: string[]
) {
  const values = [...extractIdentityFromTitle(title, mode)];
  const candidates =
    mode === "place-detail" || mode === "map-view"
      ? [...textChunks, ...snapshotLabels]
      : textChunks;

  values.push(
    ...pickIdentityCandidates(candidates, {
      maxItems: mode === "place-detail" || mode === "map-view" ? 3 : 2,
      maxLen: 80,
      excludePatterns: [
        ...getFactPatterns(mode),
        ...getStructurePatterns(mode),
        ...getInteractionPatterns(mode, interactiveLabels),
        ...GENERIC_SHELL_PATTERNS
      ]
    })
  );

  return unique(values).slice(0, 5);
}

function buildFacts(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[]
) {
  if (mode === "map-view") {
    const primaryFacts = pickFactMatches(textChunks, MAP_FACT_PATTERNS, 6, 100);
    return primaryFacts.length > 0
      ? primaryFacts
      : pickFactMatches(snapshotLabels, MAP_FACT_PATTERNS, 6, 100);
  }

  const combined = [...textChunks, ...snapshotLabels];
  return pickFactMatches(combined, getFactPatterns(mode), 10, 100);
}

function buildStructure(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[],
  interactiveLabels: string[]
): ReducedDocumentSection[] {
  if (mode === "docs") {
    return compactSections([
      {
        heading: "content-nav",
        items: pickMatched(snapshotLabels, DOCS_NAV_PATTERNS, 8, 60)
      },
      {
        heading: "tools",
        items: pickMatched(interactiveLabels, DOCS_INTERACTION_PATTERNS, 4, 40)
      }
    ]);
  }

  if (mode === "package-page") {
    return compactSections([
      {
        heading: "tabs",
        items: pickMatched(snapshotLabels, PACKAGE_TAB_PATTERNS, 6, 40)
      },
      {
        heading: "meta-links",
        items: pickMatched(snapshotLabels, PACKAGE_FACT_PATTERNS, 6, 80)
      }
    ]);
  }

  if (mode === "place-detail") {
    return compactSections([
      {
        heading: "tabs",
        items: pickMatched(snapshotLabels, PLACE_TAB_PATTERNS, 8, 20)
      }
    ]);
  }

  if (mode === "map-view") {
    return compactSections([
      {
        heading: "selected-panel",
        items: pickMeaningfulText([...snapshotLabels, ...textChunks], {
          maxItems: 4,
          maxLen: 120,
          excludePatterns: [
            ...MAP_PANEL_EXCLUDE_PATTERNS,
            ...MAP_INTERACTION_PATTERNS,
            ...MAP_FACT_PATTERNS
          ]
        })
      }
    ]);
  }

  if (mode === "forum-qna") {
    return compactSections([
      {
        heading: "sort-and-flow",
        items: pickMatched(snapshotLabels, FORUM_FLOW_PATTERNS, 8, 80)
      }
    ]);
  }

  if (mode === "marketing-media") {
    return compactSections([
      {
        heading: "site-ia",
        items: pickMatched(snapshotLabels, MARKETING_IA_PATTERNS, 10, 60)
      },
      {
        heading: "calls-to-action",
        items: pickMatched(
          [...interactiveLabels, ...textChunks],
          MARKETING_CTA_PATTERNS,
          6,
          60
        )
      }
    ]);
  }

  return compactSections([
    {
      heading: "structure",
      items: pickMeaningfulText(snapshotLabels, {
        maxItems: 6,
        maxLen: 60,
        excludePatterns: [...GENERIC_SHELL_PATTERNS]
      })
    }
  ]);
}

function buildContent(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[],
  interactiveLabels: string[]
) {
  const values = mode === "place-detail" || mode === "map-view" ? [...textChunks, ...snapshotLabels] : textChunks;

  return pickMeaningfulText(values, {
    maxItems: 6,
    maxLen: 160,
    excludePatterns: [
      ...getFactPatterns(mode),
      ...getStructurePatterns(mode),
      ...getInteractionPatterns(mode, interactiveLabels),
      ...GENERIC_SHELL_PATTERNS,
      ...(mode === "map-view" ? MAP_PANEL_EXCLUDE_PATTERNS : [])
    ]
  });
}

function buildInteractions(
  mode: ReducedDocument["mode"],
  interactiveLabels: string[],
  snapshotLabels: string[]
) {
  if (mode === "generic") {
    return unique(interactiveLabels).slice(0, 8);
  }

  const combined = [...interactiveLabels, ...snapshotLabels];
  return pickMatched(combined, getInteractionPatterns(mode, interactiveLabels), 8, 60);
}

function getFactPatterns(mode: ReducedDocument["mode"]) {
  if (mode === "docs") return DOCS_FACT_PATTERNS;
  if (mode === "package-page") return PACKAGE_FACT_PATTERNS;
  if (mode === "place-detail") return PLACE_FACT_PATTERNS;
  if (mode === "map-view") return MAP_FACT_PATTERNS;
  if (mode === "forum-qna") return FORUM_FACT_PATTERNS;
  if (mode === "marketing-media") return MARKETING_FACT_PATTERNS;
  return [] as RegExp[];
}

function getStructurePatterns(mode: ReducedDocument["mode"]) {
  if (mode === "docs") return DOCS_NAV_PATTERNS;
  if (mode === "package-page") return PACKAGE_TAB_PATTERNS;
  if (mode === "place-detail") return PLACE_TAB_PATTERNS;
  if (mode === "forum-qna") return FORUM_FLOW_PATTERNS;
  if (mode === "marketing-media") return [...MARKETING_IA_PATTERNS, ...MARKETING_CTA_PATTERNS];
  return [] as RegExp[];
}

function getInteractionPatterns(
  mode: ReducedDocument["mode"],
  interactiveLabels: string[]
) {
  if (mode === "docs") return DOCS_INTERACTION_PATTERNS;
  if (mode === "package-page") return PACKAGE_INTERACTION_PATTERNS;
  if (mode === "place-detail") return PLACE_INTERACTION_PATTERNS;
  if (mode === "map-view") return MAP_INTERACTION_PATTERNS;
  if (mode === "forum-qna") return FORUM_FLOW_PATTERNS;
  if (mode === "marketing-media") return MARKETING_CTA_PATTERNS;
  if (mode === "generic") return buildExactPatterns(interactiveLabels);
  return [] as RegExp[];
}

function extractIdentityFromTitle(title: string, mode: ReducedDocument["mode"]) {
  const normalized = normalizeWhitespace(title);
  const parts = normalized
    .split(/\s+(?:\||-|:)\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const nonShellParts = parts.filter((part) => part !== "" && !isGenericShellTitle(part, mode));
  const values =
    nonShellParts.length > 0
      ? nonShellParts
      : normalized !== "" && !isGenericShellTitle(normalized, mode)
        ? [normalized]
        : [];

  return unique(values).slice(0, 2);
}

function isGenericShellTitle(value: string, mode: ReducedDocument["mode"]) {
  if (mode === "map-view" || mode === "place-detail") {
    return /^(장소|지도|네이버지도|카카오맵)$/i.test(value);
  }

  if (mode === "package-page") {
    return /^(npm|pypi|github)$/i.test(value);
  }

  if (mode === "forum-qna") {
    return /^(지식iN|stack ?overflow)$/i.test(value);
  }

  return false;
}

function pickIdentityCandidates(
  values: string[],
  options: { maxItems: number; maxLen: number; excludePatterns: RegExp[] }
) {
  const items: string[] = [];

  for (const value of values) {
    const line = normalizeWhitespace(value);
    if (!line || line.length > options.maxLen) continue;
    if (matchesAny(line, options.excludePatterns)) continue;
    if (GENERIC_SHELL_PATTERNS.some((pattern) => pattern.test(line))) continue;
    if (isUrlLike(line) || isMostlyNumeric(line)) continue;
    if (line.length < 2) continue;
    items.push(line);
  }

  return unique(items).slice(0, options.maxItems);
}

function pickMeaningfulText(
  values: string[],
  options: { maxItems: number; maxLen: number; excludePatterns: RegExp[] }
) {
  const items: string[] = [];

  for (const value of values) {
    const line = normalizeWhitespace(value);
    if (!line || line.length > options.maxLen) continue;
    if (matchesAny(line, options.excludePatterns)) continue;
    if (GENERIC_SHELL_PATTERNS.some((pattern) => pattern.test(line))) continue;
    if (isUrlLike(line) || isMostlyNumeric(line)) continue;
    if (!isMeaningfulContentLine(line)) continue;
    items.push(line);
  }

  return unique(items).slice(0, options.maxItems);
}

function compactSections(sections: ReducedDocumentSection[]) {
  return sections.filter((section) => section.items.length > 0);
}

function splitLines(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitTextChunks(text: string) {
  return text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line && line.length <= 160);
}

function matchText(values: string[], patterns: RegExp[]) {
  const results: string[] = [];
  for (const value of values) {
    for (const pattern of patterns) {
      if (pattern.test(value)) {
        results.push(value);
        break;
      }
    }
  }
  return results;
}

function pickMatched(values: string[], patterns: RegExp[], maxItems: number, maxLen: number) {
  return unique(matchText(values, patterns).filter((value) => value.length <= maxLen)).slice(
    0,
    maxItems
  );
}

function pickFactMatches(values: string[], patterns: RegExp[], maxItems: number, maxLen: number) {
  const items: string[] = [];

  for (const value of values) {
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (!match?.[0]) continue;
      const fact = normalizeWhitespace(match[0]);
      if (fact !== "" && fact.length <= maxLen) {
        items.push(fact);
      }
    }
  }

  return unique(items).slice(0, maxItems);
}

function extractQuotedLabels(lines: string[]) {
  const labels: string[] = [];
  for (const line of lines) {
    const match = line.match(/"([^"]+)"/);
    if (match?.[1]) labels.push(match[1]);
  }
  return labels;
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function buildExactPatterns(values: string[]) {
  return unique(values).map((value) => new RegExp(`^${escapeRegExp(value)}$`, "i"));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUrlLike(value: string) {
  return /^https?:\/\//i.test(value) || /^[\w.+-]+:\/\//i.test(value);
}

function isMostlyNumeric(value: string) {
  return /^[\d\s,./:+-]+$/.test(value);
}

function isMeaningfulContentLine(value: string) {
  const wordCount = value.split(/\s+/).length;
  const symbolCount = (value.match(/[\p{L}\p{N}]/gu) ?? []).length;

  if (symbolCount < 2) return false;
  if (/[.!?]$/.test(value)) return true;
  if (wordCount >= 3) return true;
  if (value.length >= 18) return true;
  if (/[가-힣]{4,}/.test(value)) return true;
  return false;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
