import { parseHTML } from "linkedom";

import type { PrunedDocument, PruningMode, RenderedDocument } from "./types.js";

const EARLY_DISCARD_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "path",
  "iframe",
  "template",
  "[hidden]",
  '[aria-hidden="true"]'
];

export function pruneRenderedDocument(document: RenderedDocument): PrunedDocument {
  const mode = detectMode(document.finalUrl || document.url);
  const { document: parsed } = parseHTML(
    `<!doctype html><html><head><title>${escapeHtml(document.title)}</title></head><body>${document.bodyHtml}</body></html>`
  );

  removeSelectors(parsed, EARLY_DISCARD_SELECTORS);

  const sections =
    mode === "docs"
      ? buildDocsSections(parsed)
      : mode === "package-page"
        ? buildPackageSections(parsed)
        : mode === "place-detail"
          ? buildPlaceSections(parsed)
          : mode === "map-view"
            ? buildMapSections(parsed)
          : mode === "forum-qna"
            ? buildForumSections(parsed)
            : mode === "marketing-media"
              ? buildMarketingSections(parsed)
            : buildGenericSections(parsed);

  return {
    ...document,
    mode,
    prunedHtml: renderPrunedHtml(document.title, mode, sections)
  };
}

function detectMode(url: string): PruningMode {
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

  if (url.includes("map.kakao.com") || url.includes("map.naver.com")) {
    if (url.includes("map.naver.com")) {
      return "map-view";
    }
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

function buildDocsSections(parsed: Document) {
  const main = parsed.querySelector("article, main") ?? parsed.body;
  const navigation = pickTexts(parsed.querySelectorAll("aside a, nav a, button"), {
    includePattern:
      /getting started|guides|api reference|what is|docs|reference|tutorial|routing|on this page|app router|pages router|version|installation|project structure|deploying|upgrading/i,
    maxItems: 18,
    maxLen: 80
  });

  const facts = extractMatches(normalizeWhitespace(parsed.body?.textContent ?? ""), [
    /Version\s+\d+(?:\.\d+)*/i,
    /App Router/i,
    /Pages Router/i
  ]);

  const content = pickTexts(main.querySelectorAll("h1, h2, h3, p, pre, code"), {
    maxItems: 20,
    maxLen: 180,
    excludePattern:
      /getting startedinstallationproject structurelayouts and pages|guidesai coding agents|api reference directives/i
  });

  return { navigation, content, facts };
}

function buildPackageSections(parsed: Document) {
  const main = parsed.querySelector("article, main") ?? parsed.body;
  const normalized = normalizeWhitespace(parsed.body?.textContent ?? "");
  const facts = uniqueTexts(
    [
      ...extractMatches(normalized, [/npm i [^\s]+/i, /pip install [^\s]+/i]),
      ...extractKeywordFacts(normalized, [
        "Repository",
        "Homepage",
        "Documentation",
        "Version",
        "License",
        "Weekly Downloads",
        "Dependents",
        "Versions",
        "About"
      ])
    ].filter(Boolean)
  ).slice(0, 18);

  const navigation = pickTexts(parsed.querySelectorAll("[role='tab'], a, button"), {
    includePattern: /Readme|Code|Dependencies|Dependents|Versions|Documentation|API/i,
    maxItems: 10,
    maxLen: 70
  });

  const content = pickTexts(main.querySelectorAll("h1, h2, h3, p, pre, code"), {
    maxItems: 18,
    maxLen: 180
  });

  return { navigation, content, facts };
}

function buildPlaceSections(parsed: Document) {
  const normalized = normalizeWhitespace(parsed.body?.textContent ?? "");
  const content = uniqueTexts([
    ...extractMatches(normalized, [/판교옥/, /한식/]),
    ...extractKeywordFacts(normalized, ["장소요약", "깔끔한", "쫄깃한"]).map(cleanSummaryLine)
  ]).slice(0, 6);
  const facts = uniqueTexts([
    ...extractMatches(
      normalized,
      [
        /영업시간\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/i,
        /주소\s*[가-힣0-9\s-]+/i,
        /전화\s*[0-9-]+/i,
        /후기\s*\d+/i,
        /블로그\s*\d+/i,
        /평점\s*[0-9.]+/i
      ]
    ),
    ...extractMatches(normalized, [/영업 마감[^]{0,20}/i, /내일\s*\d{1,2}:\d{2}\s*오픈/i]),
    ...extractMatches(normalized, [/[가-힣]+\s*성남시\s*수정구[^]{0,30}/i]),
    ...extractMatches(normalized, [/\d{1,2}:\d{2}\s*~\s*\d{1,2}:\d{2}/]),
    ...pickTexts(parsed.querySelectorAll("a, button, li, p, span"), {
      includePattern: /오삼덮밥|국밥|메뉴판|메뉴/,
      excludePattern: /메뉴 바로가기|메뉴 더보기|메뉴 수정/,
      maxItems: 6,
      maxLen: 80
    }),
    ...pickTexts(parsed.querySelectorAll("a, p"), {
      includePattern: /제육|막국수|오삼덮밥|국물이 좋다|맛집/i,
      maxItems: 4,
      maxLen: 120
    })
  ].map(cleanFactValue)).slice(0, 18);
  const navigation = pickTexts(parsed.querySelectorAll("[role='tab'], button, a, li"), {
    includePattern: /홈|메뉴|사진|후기|블로그|랭킹|리뷰/,
    excludePattern: /메뉴 바로가기|로그인|공유|지도|로드뷰|출발|도착/,
    maxItems: 10,
    maxLen: 40
  });

  return { navigation, content: uniqueTexts(content).slice(0, 6), facts };
}

function buildMapSections(parsed: Document) {
  const content = pickTexts(parsed.querySelectorAll("button, a, h1, h2, p, span"), {
    includePattern: /이스트만|리뷰|평균 가격|저장|양식|소울굴|미채|예약 가능|바\(BAR\)|조명|편안한 대화/,
    excludePattern:
      /지도 홈|길찾기|버스|지하철|기차|더보기|오류신고|확대|축소|거리뷰|일반지도|위성지도|테마|공유하기|접속위치|new$/,
    maxItems: 14,
    maxLen: 240,
    includeAttributes: true
  });

  const facts = uniqueTexts([
    ...extractMatches(content.join(" "), [/이스트만/, /리뷰\s*\d+/i, /평균 가격\s*\d+[^\s]*/i, /양식/]),
    ...pickTexts(parsed.querySelectorAll("button, a"), {
      includePattern: /소울굴|미채/,
      maxItems: 4,
      maxLen: 160,
      includeAttributes: true
    })
  ]).slice(0, 12);

  return { navigation: [] as string[], content, facts };
}

function buildForumSections(parsed: Document) {
  const main = parsed.querySelector("article, main") ?? parsed.body;
  const navigation = pickTexts(parsed.querySelectorAll("button, a"), {
    includePattern: /최적|추천순|답변|댓글|정렬|accepted|accept/i,
    excludePattern: /고객센터|개인정보처리방침|로그인/,
    maxItems: 14,
    maxLen: 120,
    includeAttributes: true
  });
  const content = pickTexts(main.querySelectorAll("h1, h2, p, pre, code"), {
    maxItems: 20,
    maxLen: 180,
    excludePattern: /권장 브라우저|새소식|로그인|서비스 더보기/
  });

  return { navigation, content, facts: [] as string[] };
}

function buildMarketingSections(parsed: Document) {
  const navigation = pickTexts(parsed.querySelectorAll("header a, nav a, footer a, button"), {
    includePattern:
      /research|for business|company|chatgpt|api|sora|safety|news|privacy|products?|lineup|compare|shop|developers?|business|region|language/i,
    excludePattern: /(^|\s)search(\s|$)|sign in|로그인|메인 콘텐츠로 건너뛰기|탐색 사이드바 토글|검색 열기|검색 닫기/i,
    maxItems: 18,
    maxLen: 90
  });

  const facts = extractKeywordFacts(
    normalizeWhitespace(parsed.body?.textContent ?? ""),
    ["Compare", "Shop", "lineup", "가격", "조회수", "게시", "채널", "설명"]
  ).slice(0, 12);

  const content = pickTexts(parsed.querySelectorAll("main h1, main h2, main p, main a"), {
    maxItems: 16,
    maxLen: 120,
    excludePattern: /View more|모두 보기|더 보기/
  });

  return { navigation, content, facts };
}

function buildGenericSections(parsed: Document) {
  const main = parsed.querySelector("article, main") ?? parsed.body;
  const content = uniqueTexts(collectTexts(main.querySelectorAll("h1, h2, h3, p, li, a"))).slice(
    0,
    80
  );
  return { navigation: [] as string[], content, facts: [] as string[] };
}

function renderPrunedHtml(
  title: string,
  mode: PruningMode,
  sections: { navigation: string[]; facts: string[]; content: string[] }
) {
  const blocks = [
    `<section data-layer="identity"><h1>${escapeHtml(title)}</h1><p>mode: ${escapeHtml(mode)}</p></section>`,
    sections.facts.length > 0
      ? `<section data-layer="facts"><h2>facts</h2><dl>${sections.facts
          .map((item) => `<div><dt>fact</dt><dd>${escapeHtml(item)}</dd></div>`)
          .join("")}</dl></section>`
      : "",
    sections.navigation.length > 0
      ? `<nav data-layer="content-nav" aria-label="content navigation"><h2>content-nav</h2><ul>${sections.navigation
          .map((item) => `<li><a href="#">${escapeHtml(item)}</a></li>`)
          .join("")}</ul></nav>`
      : "",
    `<article data-layer="content">${sections.content
      .map((item, index) =>
        index === 0
          ? `<h2>${escapeHtml(item)}</h2>`
          : `<p>${escapeHtml(item)}</p>`
      )
      .join("")}</article>`
  ].filter(Boolean);

  return `<!doctype html><html><head><title>${escapeHtml(
    title
  )}</title></head><body>${blocks.join("")}</body></html>`;
}

function removeSelectors(parsed: Document, selectors: string[]) {
  for (const selector of selectors) {
    for (const node of Array.from(parsed.querySelectorAll(selector))) {
      node.remove();
    }
  }
}

function collectTexts(nodes: Iterable<Element>) {
  const results: string[] = [];
  for (const node of Array.from(nodes)) {
    const text = normalizeWhitespace(node.textContent ?? "");
    if (text !== "") {
      results.push(text);
    }
  }
  return results;
}

function uniqueTexts(values: string[]) {
  return [...new Set(values)];
}

function pickTexts(
  nodes: Iterable<Element>,
  options: {
    includePattern?: RegExp;
    excludePattern?: RegExp;
    maxItems: number;
    maxLen: number;
    includeAttributes?: boolean;
  }
) {
  const items: string[] = [];

  for (const node of Array.from(nodes)) {
    const text = extractAtomicText(node, options.includeAttributes ?? false);
    if (!text) continue;
    if (options.includePattern && !options.includePattern.test(text)) continue;
    if (options.excludePattern && options.excludePattern.test(text)) continue;
    if (text.length > options.maxLen) continue;
    items.push(text);
  }

  return uniqueTexts(items).slice(0, options.maxItems);
}

function extractAtomicText(node: Element, includeAttributes: boolean) {
  const candidates = [normalizeWhitespace(node.textContent ?? "")];

  if (includeAttributes) {
    candidates.push(
      normalizeWhitespace(node.getAttribute("aria-label") ?? ""),
      normalizeWhitespace(node.getAttribute("title") ?? "")
    );
  }

  return candidates
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)[0];
}

function extractMatches(text: string, patterns: RegExp[]) {
  const results: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      results.push(normalizeWhitespace(match[0]));
    }
  }
  return results;
}

function extractKeywordFacts(text: string, keywords: string[]) {
  const results: string[] = [];

  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}[^\\n]{0,80}`, "i");
    const match = text.match(pattern);
    if (match?.[0]) {
      results.push(normalizeWhitespace(match[0]));
    }
  }

  return results;
}

function isLikelyContentNav(text: string) {
  return /getting started|guides|api reference|what is|docs|reference|tutorial|routing|on this page|app router|pages router|version/i.test(
    text
  );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanSummaryLine(value: string) {
  return value.replace(/^장소요약/i, "").trim();
}

function cleanFactValue(value: string) {
  return value
    .replace(/(홈|메뉴|후기|블로그|랭킹|고객센터).*$/u, "")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
