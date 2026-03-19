import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  buildReducedDocumentFromOracle,
  renderReducedDocumentHtml
} from "../src/agent-browser-like-pruning";
import type { AgentBrowserOracle, RenderedDocument } from "../src/types";

type Sample = {
  slug: string;
  rawHtml: string;
  document: RenderedDocument;
  oracle: AgentBrowserOracle;
  preservedSignals: string[];
};

const samples: Sample[] = [
  {
    slug: "docs-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>JSON Module Docs</title></head><body>",
      "<header><nav><a href=\"/overview\">Overview</a><a href=\"/how-to\">How to Use</a><a href=\"/api-reference\">API Reference</a><button>Search docs</button></nav></header>",
      "<main><article><h1>JSON Module Docs</h1><p>Parse and emit structured documents.</p><h2>How to encode custom objects</h2><p>The module always produces string output.</p></article></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://docs.python.org/3/library/json.html",
      finalUrl: "https://docs.python.org/3/library/json.html",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "JSON Module Docs",
      bodyHtml: [
        "<header><nav><a href=\"/overview\">Overview</a><a href=\"/how-to\">How to Use</a><a href=\"/api-reference\">API Reference</a><button>Search docs</button></nav></header>",
        "<main><article><h1>JSON Module Docs</h1><p>Parse and emit structured documents.</p><h2>How to encode custom objects</h2><p>The module always produces string output.</p></article></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- link "Overview" [ref=e1]',
        '- link "How to Use" [ref=e2]',
        '- link "API Reference" [ref=e3]',
        '- link "Version 3.14" [ref=e4]'
      ].join("\n"),
      interactiveTree: [
        '- button "Search docs" [ref=e5]',
        '- button "Send feedback" [ref=e6]'
      ].join("\n"),
      innerText: [
        "JSON Module Docs",
        "Parse and emit structured documents.",
        "How to encode custom objects",
        "The module always produces string output.",
        "Version 3.14"
      ].join("\n")
    },
    preservedSignals: ["Version 3.14", "API Reference", "Parse and emit structured documents."]
  },
  {
    slug: "package-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>httpx · PyPI</title></head><body>",
      "<aside><a href=\"/project/httpx/#readme\">Readme</a><a href=\"/project/httpx/#history\">Versions</a><a href=\"https://www.python-httpx.org/\">Homepage</a><a href=\"https://github.com/encode/httpx\">Repository</a><button>Copy install command</button></aside>",
      "<main><article><h1>httpx</h1><p>A next-generation HTTP client.</p><pre>pip install httpx</pre><p>License BSD-3-Clause</p></article></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://pypi.org/project/httpx/",
      finalUrl: "https://pypi.org/project/httpx/",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "httpx · PyPI",
      bodyHtml: [
        "<aside><a href=\"/project/httpx/#readme\">Readme</a><a href=\"/project/httpx/#history\">Versions</a><a href=\"https://www.python-httpx.org/\">Homepage</a><a href=\"https://github.com/encode/httpx\">Repository</a><button>Copy install command</button></aside>",
        "<main><article><h1>httpx</h1><p>A next-generation HTTP client.</p><pre>pip install httpx</pre><p>License BSD-3-Clause</p></article></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- tab "Readme" [ref=e1]',
        '- tab "Versions" [ref=e2]',
        '- link "Homepage https://www.python-httpx.org/" [ref=e3]',
        '- link "Repository github.com/encode/httpx" [ref=e4]'
      ].join("\n"),
      interactiveTree: [
        '- button "Copy install command" [ref=e5]',
        '- combobox "Search packages" [ref=e6]'
      ].join("\n"),
      innerText: [
        "httpx",
        "Version 1.4.0",
        "License BSD-3-Clause",
        "pip install httpx",
        "A next-generation HTTP client."
      ].join("\n")
    },
    preservedSignals: ["pip install httpx", "License BSD-3-Clause", "A next-generation HTTP client."]
  },
  {
    slug: "map-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>장소 - 네이버지도</title></head><body>",
      "<header><nav><a>지도 홈</a><a>길찾기</a><button>저장</button></nav></header>",
      "<main><section><h1>Moonlight Cafe</h1><p>카페</p><p>조용한 분위기와 늦은 영업시간</p><p>리뷰 42</p><p>평균 18,000원</p></section></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://map.naver.com/p/smart-around/place/2",
      finalUrl: "https://map.naver.com/p/smart-around/place/2",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "장소 - 네이버지도",
      bodyHtml: [
        "<header><nav><a>지도 홈</a><a>길찾기</a><button>저장</button></nav></header>",
        "<main><section><h1>Moonlight Cafe</h1><p>카페</p><p>조용한 분위기와 늦은 영업시간</p><p>리뷰 42</p><p>평균 18,000원</p></section></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- button "Moonlight Cafe 카페 조용한 분위기 리뷰 42 평균 18,000원" [ref=e1]',
        '- button "저장" [ref=e2]',
        '- button "Starlight Bar 재즈와 칵테일 리뷰 15 평균 25,000원" [ref=e3]'
      ].join("\n"),
      interactiveTree: ['- button "저장" [ref=e4]', '- button "공유하기" [ref=e5]'].join("\n"),
      innerText: [
        "Moonlight Cafe",
        "카페",
        "조용한 분위기와 늦은 영업시간",
        "리뷰 42",
        "평균 18,000원",
        "저장"
      ].join("\n")
    },
    preservedSignals: ["Moonlight Cafe", "리뷰 42", "평균 18,000원"]
  },
  {
    slug: "place-detail-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>Seaside Kitchen | 카카오맵</title></head><body>",
      "<header><nav><a href=\"/42/home\">홈</a><a href=\"/42/menu\">메뉴</a><a href=\"/42/reviews\">후기</a><button>공유</button></nav></header>",
      "<main><section><h1>Seaside Kitchen</h1><p>한식</p><p>국물이 진한 점심 식당</p><p>평점 4.6</p><p>영업시간 11:00-22:00</p><p>주소 바다로 42</p></section></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://place.map.kakao.com/42",
      finalUrl: "https://place.map.kakao.com/42",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Seaside Kitchen | 카카오맵",
      bodyHtml: [
        "<header><nav><a href=\"/42/home\">홈</a><a href=\"/42/menu\">메뉴</a><a href=\"/42/reviews\">후기</a><button>공유</button></nav></header>",
        "<main><section><h1>Seaside Kitchen</h1><p>한식</p><p>국물이 진한 점심 식당</p><p>평점 4.6</p><p>영업시간 11:00-22:00</p><p>주소 바다로 42</p></section></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- link "홈" [ref=e1]',
        '- link "메뉴" [ref=e2]',
        '- link "후기" [ref=e3]',
        '- button "공유" [ref=e4]'
      ].join("\n"),
      interactiveTree: ['- button "공유" [ref=e5]', '- button "출발" [ref=e6]'].join("\n"),
      innerText: [
        "Seaside Kitchen",
        "한식",
        "국물이 진한 점심 식당",
        "평점 4.6",
        "영업시간 11:00-22:00",
        "주소 바다로 42"
      ].join("\n")
    },
    preservedSignals: ["Seaside Kitchen", "평점 4.6", "메뉴", "국물이 진한 점심 식당"]
  },
  {
    slug: "forum-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>How do I parse CSV safely? - Stack Overflow</title></head><body>",
      "<header><nav><a href=\"#accepted-answer\">Accepted</a><a href=\"#answers\">Answers</a><a href=\"#comments\">Comments</a></nav></header>",
      "<main><article><h1>How do I parse CSV safely?</h1><p>I need to parse a quoted CSV file.</p><p>Use a real CSV parser instead of split.</p><button>Answer</button></article></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://stackoverflow.com/questions/1/example",
      finalUrl: "https://stackoverflow.com/questions/1/example",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "How do I parse CSV safely? - Stack Overflow",
      bodyHtml: [
        "<header><nav><a href=\"#accepted-answer\">Accepted</a><a href=\"#answers\">Answers</a><a href=\"#comments\">Comments</a></nav></header>",
        "<main><article><h1>How do I parse CSV safely?</h1><p>I need to parse a quoted CSV file.</p><p>Use a real CSV parser instead of split.</p><button>Answer</button></article></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- link "Accepted" [ref=e1]',
        '- link "Answers" [ref=e2]',
        '- link "Comments" [ref=e3]'
      ].join("\n"),
      interactiveTree: ['- button "Answer" [ref=e4]', '- button "Comments" [ref=e5]'].join("\n"),
      innerText: [
        "How do I parse CSV safely?",
        "I need to parse a quoted CSV file.",
        "Use a real CSV parser instead of split.",
        "This avoids common edge cases."
      ].join("\n")
    },
    preservedSignals: ["How do I parse CSV safely?", "I need to parse a quoted CSV file.", "Answer"]
  },
  {
    slug: "marketing-generic",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>Acme Cloud</title></head><body>",
      "<header><nav><a href=\"/products\">Products</a><a href=\"/pricing\">Pricing</a><a href=\"/developers\">Developers</a></nav></header>",
      "<main><section><h1>Acme Cloud</h1><p>Build faster internal tools.</p><p>Deploy automation across your team.</p><a href=\"/signup\">Get started</a></section></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://apple.com/acme-cloud",
      finalUrl: "https://apple.com/acme-cloud",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Acme Cloud",
      bodyHtml: [
        "<header><nav><a href=\"/products\">Products</a><a href=\"/pricing\">Pricing</a><a href=\"/developers\">Developers</a></nav></header>",
        "<main><section><h1>Acme Cloud</h1><p>Build faster internal tools.</p><p>Deploy automation across your team.</p><a href=\"/signup\">Get started</a></section></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- link "Products" [ref=e1]',
        '- link "Pricing" [ref=e2]',
        '- link "Developers" [ref=e3]',
        '- link "Compare plans" [ref=e4]'
      ].join("\n"),
      interactiveTree: ['- button "Get started" [ref=e5]', '- button "Learn more" [ref=e6]'].join("\n"),
      innerText: [
        "Acme Cloud",
        "Build faster internal tools.",
        "Deploy automation across your team.",
        "Compare plans",
        "Get started"
      ].join("\n")
    },
    preservedSignals: ["Pricing", "Build faster internal tools.", "Get started"]
  },
  {
    slug: "generic-blog",
    rawHtml: [
      "<!doctype html>",
      "<html><head><title>Example Blog</title></head><body>",
      "<header><nav><a>Home</a><a>Stories</a><a>Docs</a><button>Subscribe</button></nav></header>",
      "<main><article><h1>Example Blog</h1><p>Shipping dependable web apps.</p><p>We share build notes every week.</p><button>Read more</button></article></main>",
      "</body></html>"
    ].join(""),
    document: {
      url: "https://example.com/blog/post",
      finalUrl: "https://example.com/blog/post",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Example Blog",
      bodyHtml: [
        "<header><nav><a>Home</a><a>Stories</a><a>Docs</a><button>Subscribe</button></nav></header>",
        "<main><article><h1>Example Blog</h1><p>Shipping dependable web apps.</p><p>We share build notes every week.</p><button>Read more</button></article></main>"
      ].join("")
    },
    oracle: {
      snapshotTree: [
        '- link "Home" [ref=e1]',
        '- link "Stories" [ref=e2]',
        '- link "Docs" [ref=e3]',
        '- button "Read more" [ref=e4]'
      ].join("\n"),
      interactiveTree: ['- button "Subscribe" [ref=e5]', '- button "Read more" [ref=e6]'].join("\n"),
      innerText: [
        "Example Blog",
        "Shipping dependable web apps.",
        "We share build notes every week."
      ].join("\n")
    },
    preservedSignals: ["Shipping dependable web apps.", "We share build notes every week.", "Subscribe"]
  }
];

const samplesDir = resolve("docs/features/agent-browser-like-pruning/samples");

await mkdir(samplesDir, { recursive: true });

const manifest = [];
for (const sample of samples) {
  const reduced = buildReducedDocumentFromOracle(sample.document, sample.oracle);
  const rawPath = join(samplesDir, `${sample.slug}-raw.html`);
  const reducedPath = join(samplesDir, `${sample.slug}-reduced.html`);

  await writeFile(rawPath, sample.rawHtml);
  await writeFile(reducedPath, renderReducedDocumentHtml(reduced));

  manifest.push({
    slug: sample.slug,
    rawPath,
    reducedPath,
    preservedSignals: sample.preservedSignals,
    reduced
  });
}

await writeFile(join(samplesDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${samples.length} review sample pairs to ${samplesDir}`);
