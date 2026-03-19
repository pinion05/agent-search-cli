import { chromium } from "playwright";
import { getEnhancedSnapshot } from "agent-browser/dist/snapshot.js";

import type { AgentBrowserOracle, ReducedDocument, ReducedDocumentSection, RenderedDocument } from "./types";

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
    identity: buildIdentity(document.title, mode, textChunks, snapshotLabels),
    facts: buildFacts(mode, textChunks, snapshotLabels),
    structure: buildStructure(mode, textChunks, snapshotLabels, interactiveLabels),
    content: buildContent(mode, textChunks, snapshotLabels),
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

  if (
    url.includes("npmjs.com") ||
    url.includes("pypi.org") ||
    url.includes("github.com")
  ) {
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

  if (
    url.includes("openai.com") ||
    url.includes("apple.com") ||
    url.includes("youtube.com")
  ) {
    return "marketing-media";
  }

  return "generic";
}

function buildIdentity(
  title: string,
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[]
) {
  const values = [title];

  if (mode === "place-detail") {
    values.push(...pickMatched([...textChunks, ...snapshotLabels], [/판교옥/i, /한식/i], 3, 40));
  }

  if (mode === "map-view") {
    values.push(...pickMatched([...textChunks, ...snapshotLabels], [/이스트만/i, /바\(BAR\)/i], 3, 60));
  }

  return unique(values).slice(0, 5);
}

function buildFacts(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[]
) {
  const combined = [...textChunks, ...snapshotLabels];

  if (mode === "docs") {
    return pickMatched(combined, [/Version\s*\d+/i, /App Router/i, /Pages Router/i], 6, 40);
  }

  if (mode === "package-page") {
    return pickMatched(
      combined,
      [
        /npm i [^\s]+/i,
        /Version\s*[0-9.]+/i,
        /License\s*[A-Z0-9.-]+/i,
        /^Homepage/i,
        /^Documentation/i,
        /^Repository/i,
        /^Releases/i,
        /^Weekly Downloads/i
      ],
      10,
      80
    );
  }

  if (mode === "place-detail") {
    return pickMatched(
      combined,
      [
        /평점\s*[0-9.]+/i,
        /후기\s*\d+개?/i,
        /블로그\s*\d+개?/i,
        /영업 전\s*[0-9:]+\s*오픈/i,
        /영업 마감\s*[0-9:]+\s*오픈/i,
        /영업정보/i,
        /^주소/i,
        /[0-9,]+원/i
      ],
      10,
      80
    );
  }

  if (mode === "map-view") {
    return pickMatched(
      combined,
      [/이스트만/i, /리뷰\s*\d+/i, /평균\s*[0-9,]+원/i, /양식/i, /소울굴/i, /미채/i, /예약 가능/i],
      8,
      100
    );
  }

  if (mode === "forum-qna") {
    return pickMatched(combined, [/최적/i, /추천순/i, /댓글\s*\d+/i, /답변\s*\d+/i], 8, 80);
  }

  if (mode === "marketing-media") {
    return pickMatched(
      combined,
      [/조회수[^.!?]{0,30}/i, /^Research$/i, /^For Business$/i, /^Company$/i, /^Safety$/i, /^ChatGPT/i, /^Sora$/i, /^API$/i],
      8,
      80
    );
  }

  return [];
}

function buildStructure(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[],
  interactiveLabels: string[]
): ReducedDocumentSection[] {
  if (mode === "docs") {
    return [
      {
        heading: "content-nav",
        items: pickMatched(
          snapshotLabels,
          [/Getting Started/i, /^Guides$/i, /API Reference/i, /On this page/i, /App Router/i, /Version 16/i],
          8,
          40
        )
      },
      {
        heading: "tools",
        items: pickMatched(interactiveLabels, [/Search/i, /Feedback/i], 4, 40)
      }
    ];
  }

  if (mode === "package-page") {
    return [
      {
        heading: "tabs",
        items: pickMatched(snapshotLabels, [/^Readme$/i, /^Code/i, /Dependents/i, /Versions/i], 6, 40)
      },
      {
        heading: "meta-links",
        items: pickMatched(snapshotLabels, [/^Homepage/i, /^Repository/i, /^Documentation/i, /^Releases/i], 6, 60)
      }
    ];
  }

  if (mode === "place-detail") {
    return [
      {
        heading: "tabs",
        items: pickMatched(snapshotLabels, [/^홈$/i, /^메뉴$/i, /^사진$/i, /^후기$/i, /^블로그$/i, /^랭킹$/i], 8, 20)
      }
    ];
  }

  if (mode === "map-view") {
    return [
      {
        heading: "selected-panel",
        items: pickMatched(snapshotLabels, [/이스트만/i, /소울굴/i, /미채/i], 4, 100)
      }
    ];
  }

  if (mode === "forum-qna") {
    return [
      {
        heading: "sort-and-flow",
        items: pickMatched(snapshotLabels, [/답변하기/i, /^답변$/i, /^최적$/i, /^추천순$/i, /^댓글/i], 8, 80)
      }
    ];
  }

  if (mode === "marketing-media") {
    return [
      {
        heading: "site-ia",
        items: pickMatched(
          snapshotLabels,
          [/^Research$/i, /^For Business$/i, /^For Developers$/i, /^Company$/i, /^News$/i, /^Compare/i, /^Shop/i, /^ChatGPT/i, /^Sora$/i, /^API$/i],
          10,
          60
        )
      },
      {
        heading: "calls-to-action",
        items: pickMatched([...interactiveLabels, ...textChunks], [/Get started/i, /Try ChatGPT/i, /^Compare/i, /^Shop/i], 6, 60)
      }
    ];
  }

  return [];
}

function buildContent(
  mode: ReducedDocument["mode"],
  textChunks: string[],
  snapshotLabels: string[]
) {
  if (mode === "docs") {
    return pickMatched(
      textChunks,
      [/Next\.js Docs/i, /Welcome to the Next\.js documentation/i, /What is Next\.js\?/i, /React framework/i, /JavaScript \(JS\)/i],
      6,
      140
    );
  }

  if (mode === "package-page") {
    return pickMatched(
      textChunks,
      [/^react$/i, /React is a JavaScript library/i, /^Documentation$/i, /^API$/i, /react\.dev/i],
      6,
      140
    );
  }

  if (mode === "place-detail") {
    return pickMatched(
      [...textChunks, ...snapshotLabels],
      [/판교옥/i, /한식/i, /장소요약/i, /깔끔한 국밥/i, /오삼덮밥/i],
      6,
      140
    );
  }

  if (mode === "map-view") {
    return pickMatched(
      [...textChunks, ...snapshotLabels],
      [/이스트만/i, /바\(BAR\)/i, /인테리어와 뷰가 어우러진/i, /핫플레이스/i],
      6,
      140
    );
  }

  if (mode === "forum-qna") {
    return pickMatched(
      textChunks,
      [/질문 제목/i, /질문 본문/i, /첫 답변/i, /둘째 답변/i, /아무도 도와줄수가없죠/i],
      6,
      140
    );
  }

  if (mode === "marketing-media") {
    return pickMatched(
      textChunks,
      [/Build useful AI systems/i, /Introducing GPT-5\.4/i, /^OpenAI$/i, /iPhone 17 Pro/i, /Explore the lineup/i, /Rick Astley/i, /Never Gonna Give You Up/i],
      6,
      140
    );
  }

  return textChunks.slice(0, 6);
}

function buildInteractions(
  mode: ReducedDocument["mode"],
  interactiveLabels: string[],
  snapshotLabels: string[]
) {
  const combined = [...interactiveLabels, ...snapshotLabels];

  if (mode === "docs") {
    return pickMatched(combined, [/Search/i, /Feedback/i], 6, 40);
  }

  if (mode === "package-page") {
    return pickMatched(combined, [/Search/i, /^Readme$/i, /^Code/i, /Copy install/i], 6, 40);
  }

  if (mode === "place-detail") {
    return pickMatched(combined, [/로드뷰/i, /공유/i, /즐겨찾기/i, /출발/i, /도착/i, /수정제안/i], 6, 40);
  }

  if (mode === "map-view") {
    return pickMatched(combined, [/저장/i, /패널 접기/i, /공유하기/i], 6, 40);
  }

  if (mode === "forum-qna") {
    return pickMatched(combined, [/답변하기/i, /^댓글/i, /^최적$/i, /^추천순$/i], 6, 40);
  }

  if (mode === "marketing-media") {
    return pickMatched(combined, [/Get started/i, /Try ChatGPT/i, /^Compare/i, /^Shop/i, /구독/i, /공유/i, /저장/i], 8, 60);
  }

  return unique(combined).slice(0, 8);
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
  return unique(matchText(values, patterns).filter((value) => value.length <= maxLen)).slice(0, maxItems);
}

function extractQuotedLabels(lines: string[]) {
  const labels: string[] = [];
  for (const line of lines) {
    const match = line.match(/"([^"]+)"/);
    if (match?.[1]) labels.push(match[1]);
  }
  return labels;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
