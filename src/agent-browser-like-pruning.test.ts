import { describe, expect, test } from "bun:test";

import {
  buildReducedDocumentFromOracle,
  collectAgentBrowserOracle,
  renderReducedDocumentHtml
} from "./agent-browser-like-pruning";

describe("buildReducedDocumentFromOracle", () => {
  test("keeps docs structure and version context from oracle signals", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://nextjs.org/docs",
        finalUrl: "https://nextjs.org/docs",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "Next.js Docs",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- link "Getting Started" [ref=e1]',
          '- link "Guides" [ref=e2]',
          '- link "API Reference" [ref=e3]',
          '- link "On this page" [ref=e4]',
          '- link "App Router" [ref=e5]',
          '- link "Version 16" [ref=e6]'
        ].join("\n"),
        interactiveTree: [
          '- button "Search documentation... ⌘K" [ref=e7]',
          '- combobox "Open version select" [ref=e8]'
        ].join("\n"),
        innerText: [
          "Next.js Docs",
          "Welcome to the Next.js documentation!",
          "What is Next.js?",
          "Next.js is a React framework for building full-stack web applications."
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("docs");
    expect(reduced.identity).toContain("Next.js Docs");
    expect(reduced.facts).toContain("Version 16");
    expect(reduced.structure.some((section) => section.heading === "content-nav")).toBe(true);
    expect(reduced.content.some((line) => line.includes("What is Next.js?"))).toBe(true);
    expect(reduced.interactions).toContain("Search documentation... ⌘K");
  });

  test("generalizes docs extraction beyond the original Next.js fixture", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://docs.python.org/3/library/json.html",
        finalUrl: "https://docs.python.org/3/library/json.html",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "JSON Module Docs",
        bodyHtml: "<main>raw</main>"
      },
      {
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
          "The module always produces string output."
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("docs");
    expect(reduced.facts).toContain("Version 3.14");
    expect(reduced.structure.some((section) => section.items.includes("API Reference"))).toBe(
      true
    );
    expect(reduced.content).toContain("Parse and emit structured documents.");
    expect(reduced.interactions).toContain("Search docs");
  });

  test("keeps package meta and install command as facts", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://www.npmjs.com/package/react",
        finalUrl: "https://www.npmjs.com/package/react",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "react - npm",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- tab "Readme" [ref=e1]',
          '- tab "207726 Dependents" [ref=e2]',
          '- link "Homepage react.dev/" [ref=e3]',
          '- link "Repository github.com/facebook/react" [ref=e4]'
        ].join("\n"),
        interactiveTree: [
          '- button "Copy install command line" [ref=e5]',
          '- combobox "Search packages" [ref=e6]'
        ].join("\n"),
        innerText: [
          "react",
          "Version 19.2.4",
          "License MIT",
          "npm i react",
          "React is a JavaScript library for creating user interfaces.",
          "Documentation",
          "https://react.dev/"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("package-page");
    expect(reduced.facts).toContain("Version 19.2.4");
    expect(reduced.facts).toContain("License MIT");
    expect(reduced.facts).toContain("npm i react");
    expect(reduced.content.some((line) => line.includes("React is a JavaScript library"))).toBe(
      true
    );
    expect(reduced.interactions).toContain("Copy install command line");
  });

  test("generalizes package extraction beyond the react fixture", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://pypi.org/project/httpx/",
        finalUrl: "https://pypi.org/project/httpx/",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "httpx · PyPI",
        bodyHtml: "<main>raw</main>"
      },
      {
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
          "A next-generation HTTP client.",
          "Documentation",
          "https://www.python-httpx.org/"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("package-page");
    expect(reduced.facts).toContain("Version 1.4.0");
    expect(reduced.facts).toContain("License BSD-3-Clause");
    expect(reduced.facts).toContain("pip install httpx");
    expect(reduced.content).toContain("A next-generation HTTP client.");
    expect(reduced.interactions).toContain("Copy install command");
  });

  test("keeps selected place panel facts instead of generic map shell", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://map.naver.com/p/smart-around/place/1",
        finalUrl: "https://map.naver.com/p/smart-around/place/1",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "장소 - 네이버지도",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- button "이스트만 바(BAR) 인테리어와 뷰가 어우러진 핫플레이스 리뷰 89 평균 30,000원" [ref=e1]',
          '- button "저장" [ref=e2]',
          '- button "소울굴 바(BAR) 낙산공원 산책 후 들리기 좋은 바 리뷰 379 평균 10,000원" [ref=e3]'
        ].join("\n"),
        interactiveTree: [
          '- button "저장" [ref=e4]',
          '- button "패널 접기" [ref=e5]',
          '- button "공유하기" [ref=e6]'
        ].join("\n"),
        innerText: [
          "이스트만",
          "바(BAR)",
          "인테리어와 뷰가 어우러진 핫플레이스",
          "리뷰 89",
          "평균 30,000원",
          "저장"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("map-view");
    expect(reduced.identity).toContain("이스트만");
    expect(reduced.facts).toContain("리뷰 89");
    expect(reduced.facts).toContain("평균 30,000원");
    expect(reduced.content.some((line) => line.includes("인테리어와 뷰가 어우러진"))).toBe(
      true
    );
    expect(reduced.interactions).toContain("저장");
  });

  test("generalizes map view extraction to unseen venue names", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://map.naver.com/p/smart-around/place/2",
        finalUrl: "https://map.naver.com/p/smart-around/place/2",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "장소 - 네이버지도",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- button "Moonlight Cafe 카페 조용한 분위기 리뷰 42 평균 18,000원" [ref=e1]',
          '- button "저장" [ref=e2]',
          '- button "Starlight Bar 재즈와 칵테일 리뷰 15 평균 25,000원" [ref=e3]'
        ].join("\n"),
        interactiveTree: [
          '- button "저장" [ref=e4]',
          '- button "공유하기" [ref=e5]'
        ].join("\n"),
        innerText: [
          "Moonlight Cafe",
          "카페",
          "조용한 분위기와 늦은 영업시간",
          "리뷰 42",
          "평균 18,000원",
          "저장"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("map-view");
    expect(reduced.identity).toContain("Moonlight Cafe");
    expect(reduced.facts).toContain("리뷰 42");
    expect(reduced.facts).toContain("평균 18,000원");
    expect(reduced.content).toContain("조용한 분위기와 늦은 영업시간");
    expect(reduced.interactions).toContain("저장");
  });

  test("generalizes place-detail extraction to unseen place names", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://place.map.kakao.com/42",
        finalUrl: "https://place.map.kakao.com/42",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "Seaside Kitchen | 카카오맵",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- link "홈" [ref=e1]',
          '- link "메뉴" [ref=e2]',
          '- link "후기" [ref=e3]',
          '- button "공유" [ref=e4]'
        ].join("\n"),
        interactiveTree: [
          '- button "공유" [ref=e5]',
          '- button "출발" [ref=e6]'
        ].join("\n"),
        innerText: [
          "Seaside Kitchen",
          "한식",
          "국물이 진한 점심 식당",
          "평점 4.6",
          "영업시간 11:00-22:00",
          "주소 바다로 42"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("place-detail");
    expect(reduced.identity).toContain("Seaside Kitchen");
    expect(reduced.facts).toContain("평점 4.6");
    expect(reduced.facts).toContain("영업시간 11:00-22:00");
    expect(reduced.structure.some((section) => section.items.includes("메뉴"))).toBe(true);
    expect(reduced.content).toContain("국물이 진한 점심 식당");
    expect(reduced.interactions).toContain("공유");
  });

  test("generalizes forum extraction to english qna fixtures", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://stackoverflow.com/questions/1/example",
        finalUrl: "https://stackoverflow.com/questions/1/example",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "How do I parse CSV safely? - Stack Overflow",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- link "Accepted" [ref=e1]',
          '- link "Answers" [ref=e2]',
          '- link "Comments" [ref=e3]'
        ].join("\n"),
        interactiveTree: [
          '- button "Answer" [ref=e4]',
          '- button "Comments" [ref=e5]'
        ].join("\n"),
        innerText: [
          "How do I parse CSV safely?",
          "I need to parse a quoted CSV file.",
          "Use a real CSV parser instead of split.",
          "This avoids common edge cases."
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("forum-qna");
    expect(reduced.structure.some((section) => section.items.includes("Accepted"))).toBe(true);
    expect(reduced.content).toContain("I need to parse a quoted CSV file.");
    expect(reduced.interactions).toContain("Answer");
  });

  test("generalizes marketing extraction beyond the original site names", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://apple.com/acme-cloud",
        finalUrl: "https://apple.com/acme-cloud",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "Acme Cloud",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- link "Products" [ref=e1]',
          '- link "Pricing" [ref=e2]',
          '- link "Developers" [ref=e3]',
          '- link "Compare plans" [ref=e4]'
        ].join("\n"),
        interactiveTree: [
          '- button "Get started" [ref=e5]',
          '- button "Learn more" [ref=e6]'
        ].join("\n"),
        innerText: [
          "Acme Cloud",
          "Build faster internal tools.",
          "Deploy automation across your team.",
          "Compare plans",
          "Get started"
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("marketing-media");
    expect(reduced.structure.some((section) => section.items.includes("Pricing"))).toBe(true);
    expect(reduced.content).toContain("Build faster internal tools.");
    expect(reduced.interactions).toContain("Get started");
  });

  test("keeps narrative content in generic fallback mode", () => {
    const reduced = buildReducedDocumentFromOracle(
      {
        url: "https://example.com/blog/post",
        finalUrl: "https://example.com/blog/post",
        fetchedAt: "2026-03-19T00:00:00Z",
        title: "Example Blog",
        bodyHtml: "<main>raw</main>"
      },
      {
        snapshotTree: [
          '- link "Home" [ref=e1]',
          '- link "Stories" [ref=e2]',
          '- link "Docs" [ref=e3]',
          '- button "Read more" [ref=e4]'
        ].join("\n"),
        interactiveTree: [
          '- button "Subscribe" [ref=e5]',
          '- button "Read more" [ref=e6]'
        ].join("\n"),
        innerText: [
          "Example Blog",
          "Shipping dependable web apps.",
          "We share build notes every week."
        ].join("\n")
      }
    );

    expect(reduced.mode).toBe("generic");
    expect(reduced.content).toContain("Shipping dependable web apps.");
    expect(reduced.content).toContain("We share build notes every week.");
    expect(reduced.interactions).toContain("Subscribe");
    expect(reduced.interactions).not.toContain("Home");
    expect(reduced.interactions).not.toContain("Stories");
  });

  test("collects agent-browser oracle output from a rendered page", async () => {
    const oracle = await collectAgentBrowserOracle({
      url: "https://example.com",
      finalUrl: "https://example.com",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Example",
      bodyHtml: [
        "<main>",
        "<h1>Example heading</h1>",
        '<a href="/docs">Docs</a>',
        "<button>Click me</button>",
        "<p>Hello world.</p>",
        "</main>"
      ].join("")
    });

    expect(oracle.snapshotTree).toContain('heading "Example heading"');
    expect(oracle.snapshotTree).toContain('link "Docs"');
    expect(oracle.interactiveTree).toContain('button "Click me"');
    expect(oracle.innerText).toContain("Hello world.");
  });

  test("renders reduced document as structured semantic html", () => {
    const html = renderReducedDocumentHtml({
      url: "https://example.com",
      finalUrl: "https://example.com",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Example",
      bodyHtml: "",
      mode: "docs",
      identity: ["Example"],
      facts: ["Version 1"],
      structure: [{ heading: "content-nav", items: ["Getting Started", "API Reference"] }],
      content: ["Example body"],
      interactions: ["Search"]
    });

    expect(html).toContain('<section data-layer="identity">');
    expect(html).toContain('<section data-layer="facts">');
    expect(html).toContain('<nav data-layer="structure"');
    expect(html).toContain('<article data-layer="content">');
    expect(html).toContain('<section data-layer="interactions">');
    expect(html).toContain("Getting Started");
    expect(html).toContain("Search");
  });
});
