import { describe, expect, test } from "bun:test";

import { htmlToToon } from "./html-to-toon";

describe("htmlToToon", () => {
  test("converts plain text and links into TOON nodes", () => {
    const toon = htmlToToon(
      `<main><p>Hello <a href="/docs">docs</a></p></main>`,
      {
        fetchedAt: "2026-03-18T00:00:00Z",
        url: "https://example.com"
      }
    );

    expect(toon).toContain('url: "https://example.com"');
    expect(toon).toContain('title: ""');
    expect(toon).toContain("nodes[2]{idx,deps,text,href,src,alt,status}:");
    expect(toon).toContain('0,0,Hello,"","","",""');
    expect(toon).toContain('1,1,docs,"/docs","","",""');
  });

  test("drops empty wrappers and keeps reduced depth for meaningful descendants", () => {
    const toon = htmlToToon(
      `<div><section><span>   </span><p>Alpha</p></section></div>`,
      {
        fetchedAt: "2026-03-18T00:00:00Z",
        url: "https://example.com/wrappers"
      }
    );

    expect(toon).toContain("nodes[1]{idx,deps,text,href,src,alt,status}:");
    expect(toon).toContain('0,0,Alpha,"","","",""');
  });

  test("extracts image nodes with raw src and alt", () => {
    const toon = htmlToToon(`<div><img src="/hero.png" alt="Hero image"></div>`, {
      fetchedAt: "2026-03-18T00:00:00Z",
      url: "https://example.com/image"
    });

    expect(toon).toContain("nodes[1]{idx,deps,text,href,src,alt,status}:");
    expect(toon).toContain('0,0,"","","/hero.png",Hero image,""');
  });

  test("reads document title from full html input and removes whitespace-only text", () => {
    const toon = htmlToToon(
      "<!doctype html><html><head><title>Example Title</title></head><body><div>   </div><p>Beta</p></body></html>",
      {
        fetchedAt: "2026-03-18T00:00:00Z",
        url: "https://example.com/full"
      }
    );

    expect(toon).toContain("title: Example Title");
    expect(toon).toContain("nodes[1]{idx,deps,text,href,src,alt,status}:");
    expect(toon).toContain('0,0,Beta,"","","",""');
  });
});
