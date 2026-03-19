import { describe, expect, test } from "bun:test";

import { pruneRenderedDocument } from "./pre-toon-pruning";

describe("pruneRenderedDocument", () => {
  test("keeps docs body and compressed content navigation while dropping global chrome", () => {
    const result = pruneRenderedDocument({
      url: "https://nextjs.org/docs",
      finalUrl: "https://nextjs.org/docs",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "Next.js Docs",
      bodyHtml: [
        "<header><nav><a>Search</a><a>Sign in</a></nav></header>",
        "<aside class='sidebar'><a>Getting Started</a><a>Guides</a><a>API Reference</a><a>On this page</a><a>App Router</a><a>Version 16</a></aside>",
        "<main><article><h1>Next.js Docs</h1><p>Build production-ready React apps.</p><h2>What is Next.js?</h2><p>Framework guide.</p></article></main>",
        "<script>window.__next_f.push('huge payload')</script>"
      ].join("")
    });

    expect(result.mode).toBe("docs");
    expect(result.prunedHtml).toContain("Next.js Docs");
    expect(result.prunedHtml).toContain("Getting Started");
    expect(result.prunedHtml).toContain("API Reference");
    expect(result.prunedHtml).toContain("On this page");
    expect(result.prunedHtml).toContain("App Router");
    expect(result.prunedHtml).toContain("Version 16");
    expect(result.prunedHtml).not.toContain("Sign in");
    expect(result.prunedHtml).not.toContain("__next_f");
  });

  test("keeps package meta and README while dropping product chrome", () => {
    const result = pruneRenderedDocument({
      url: "https://www.npmjs.com/package/react",
      finalUrl: "https://www.npmjs.com/package/react",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "react - npm",
      bodyHtml: [
        "<header><nav><a>Products</a><a>Sign Up</a></nav></header>",
        "<aside class='package-meta'><p>Install</p><pre>npm i react</pre><a>Homepage</a><a>Documentation</a><a>Releases</a><p>License MIT</p><p>Version 19.0.0</p><p>About React</p></aside>",
        "<main><article><h1>react</h1><p>React is a JavaScript library for user interfaces.</p><h2>Usage</h2><pre>import React from \"react\"</pre></article></main>",
        "<script>window.__manifest='huge'</script>"
      ].join("")
    });

    expect(result.mode).toBe("package-page");
    expect(result.prunedHtml).toContain("npm i react");
    expect(result.prunedHtml).toContain("Homepage");
    expect(result.prunedHtml).toContain("Documentation");
    expect(result.prunedHtml).toContain("Releases");
    expect(result.prunedHtml).toContain("Version 19.0.0");
    expect(result.prunedHtml).toContain("About React");
    expect(result.prunedHtml).toContain("React is a JavaScript library");
    expect(result.prunedHtml).not.toContain("Sign Up");
    expect(result.prunedHtml).not.toContain("__manifest");
  });

  test("keeps place-detail facts and tabs while dropping map shell", () => {
    const result = pruneRenderedDocument({
      url: "https://place.map.kakao.com/1598283658",
      finalUrl: "https://place.map.kakao.com/1598283658",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "판교옥 | 카카오맵",
      bodyHtml: [
        "<header><h1>판교옥</h1><nav><a>지도</a><a>로드뷰</a><a>공유</a></nav></header>",
        "<section class='place-detail'><p>한식</p><p>평점 4.5</p><p>영업시간 11:00-22:00</p><p>주소 판교역로 1</p><ul class='tabs'><li>홈</li><li>메뉴</li><li>후기</li></ul></section>",
        "<section class='reviews'><article>국물이 좋다</article></section>",
        "<footer><a>고객센터</a></footer>"
      ].join("")
    });

    expect(result.mode).toBe("place-detail");
    expect(result.prunedHtml).toContain("판교옥");
    expect(result.prunedHtml).toContain("영업시간 11:00-22:00");
    expect(result.prunedHtml).toContain("메뉴");
    expect(result.prunedHtml).toContain("후기");
    expect(result.prunedHtml).not.toContain("고객센터");
  });

  test("keeps qna flow and sort signals while dropping policy chrome", () => {
    const result = pruneRenderedDocument({
      url: "https://kin.naver.com/qna/detail.naver?docId=1",
      finalUrl: "https://kin.naver.com/qna/detail.naver?docId=1",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "질문 제목 : 지식iN",
      bodyHtml: [
        "<header><nav><a>검색</a><a>고객센터</a></nav></header>",
        "<main><article><h1>질문 제목</h1><p>질문 본문</p><div class='sorts'><button>최적</button><button>추천순</button></div><section class='answers'><article><p>첫 답변</p></article><article><p>둘째 답변</p></article></section></article></main>",
        "<footer><a>개인정보처리방침</a></footer>",
        "<script>template blob</script>"
      ].join("")
    });

    expect(result.mode).toBe("forum-qna");
    expect(result.prunedHtml).toContain("질문 제목");
    expect(result.prunedHtml).toContain("질문 본문");
    expect(result.prunedHtml).toContain("최적");
    expect(result.prunedHtml).toContain("추천순");
    expect(result.prunedHtml).toContain("첫 답변");
    expect(result.prunedHtml).not.toContain("개인정보처리방침");
    expect(result.prunedHtml).not.toContain("template blob");
  });

  test("keeps marketing IA and CTA instead of dropping all navigation-like structure", () => {
    const result = pruneRenderedDocument({
      url: "https://openai.com/",
      finalUrl: "https://openai.com/",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "OpenAI",
      bodyHtml: [
        "<header><nav><a>Search</a><a>Research</a><a>For Business</a><a>Company</a><a>Sign in</a></nav></header>",
        "<main><section class='hero'><h1>OpenAI</h1><p>Build useful AI systems.</p><a>Get started</a></section><section><h2>Products</h2><a>ChatGPT</a><a>API</a><a>Sora</a></section></main>",
        "<footer><a>Safety</a><a>News</a><a>Privacy</a><a>Research</a></footer>",
        "<script>hydration blob</script>"
      ].join("")
    });

    expect(result.mode).toBe("marketing-media");
    expect(result.prunedHtml).toContain("Build useful AI systems.");
    expect(result.prunedHtml).toContain("Get started");
    expect(result.prunedHtml).toContain("Research");
    expect(result.prunedHtml).toContain("For Business");
    expect(result.prunedHtml).toContain("Company");
    expect(result.prunedHtml).toContain("ChatGPT");
    expect(result.prunedHtml).toContain("Safety");
    expect(result.prunedHtml).toContain("News");
    expect(result.prunedHtml).not.toContain("Sign in");
    expect(result.prunedHtml).not.toContain("hydration blob");
  });

  test("keeps selected map panel facts while avoiding generic map shell actions", () => {
    const result = pruneRenderedDocument({
      url: "https://map.naver.com/p/smart-around/place/1",
      finalUrl: "https://map.naver.com/p/smart-around/place/1",
      fetchedAt: "2026-03-19T00:00:00Z",
      title: "장소 - 네이버지도",
      bodyHtml: [
        "<header><nav><a>지도 홈</a><a>길찾기</a><a>버스</a><a>지하철</a></nav></header>",
        "<main><section class='selected-place'><h1>이스트만</h1><p>양식</p><p>리뷰 120</p><p>평균 가격 15000원</p><button>저장</button><button>더보기</button></section><section class='carousel'><a>소울굴</a><a>미채</a></section></main>",
        "<footer><a>고객센터</a></footer>"
      ].join("")
    });

    expect(result.mode).toBe("map-view");
    expect(result.prunedHtml).toContain("이스트만");
    expect(result.prunedHtml).toContain("리뷰 120");
    expect(result.prunedHtml).toContain("평균 가격 15000원");
    expect(result.prunedHtml).toContain("저장");
    expect(result.prunedHtml).toContain("소울굴");
    expect(result.prunedHtml).not.toContain("길찾기");
    expect(result.prunedHtml).not.toContain("지하철");
  });
});
