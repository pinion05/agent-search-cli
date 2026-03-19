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
