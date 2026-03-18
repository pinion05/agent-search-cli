import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { crawlUrlToRenderedDocument } from "./crawl-url-to-rendered-document";

let server: ReturnType<typeof createServer>;
let baseUrl = "";

beforeAll(async () => {
  server = createServer(routeRequest);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (address && typeof address !== "string") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }

      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

describe("crawlUrlToRenderedDocument", () => {
  test(
    "extracts title, finalUrl, and bodyHtml from a regular page",
    async () => {
      const result = await crawlUrlToRenderedDocument(`${baseUrl}/basic`);

      expect(result.url).toBe(`${baseUrl}/basic`);
      expect(result.finalUrl).toBe(`${baseUrl}/basic`);
      expect(result.title).toBe("Basic Page");
      expect(result.bodyHtml).toContain("<main>");
      expect(result.bodyHtml).toContain("Hello rendered world");
      expect(result.fetchedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    },
    20_000
  );

  test(
    "uses the redirected destination as finalUrl",
    async () => {
      const result = await crawlUrlToRenderedDocument(`${baseUrl}/redirect`);

      expect(result.url).toBe(`${baseUrl}/redirect`);
      expect(result.finalUrl).toBe(`${baseUrl}/redirect-target`);
      expect(result.title).toBe("Redirect Target");
      expect(result.bodyHtml).toContain("redirect landing");
    },
    20_000
  );

  test(
    "waits for a short client-side render before capturing bodyHtml",
    async () => {
      const result = await crawlUrlToRenderedDocument(`${baseUrl}/delayed-script`);

      expect(result.title).toBe("Delayed Render");
      expect(result.bodyHtml).toContain("Loaded late content");
    },
    20_000
  );

  test(
    "returns an empty string when the document body is empty",
    async () => {
      const result = await crawlUrlToRenderedDocument(`${baseUrl}/empty-body`);

      expect(result.title).toBe("Empty Body");
      expect(result.bodyHtml).toBe("");
    },
    20_000
  );
});

function routeRequest(request: IncomingMessage, response: ServerResponse): void {
  switch (request.url) {
    case "/basic":
      respondHtml(
        response,
        "<!doctype html><html><head><title>Basic Page</title></head><body><main>Hello rendered world</main></body></html>"
      );
      return;
    case "/redirect":
      response.statusCode = 302;
      response.setHeader("Location", "/redirect-target");
      response.end();
      return;
    case "/redirect-target":
      respondHtml(
        response,
        "<!doctype html><html><head><title>Redirect Target</title></head><body><section>redirect landing</section></body></html>"
      );
      return;
    case "/delayed-script":
      respondHtml(
        response,
        [
          "<!doctype html>",
          "<html>",
          "<head><title>Delayed Render</title></head>",
          "<body>",
          '<div id="app">Waiting...</div>',
          "<script>",
          "setTimeout(() => {",
          '  document.body.innerHTML = \'<article>Loaded late content</article>\';',
          "}, 150);",
          "</script>",
          "</body>",
          "</html>"
        ].join("")
      );
      return;
    case "/empty-body":
      respondHtml(
        response,
        "<!doctype html><html><head><title>Empty Body</title></head><body></body></html>"
      );
      return;
    default:
      response.statusCode = 404;
      response.end("not found");
  }
}

function respondHtml(response: ServerResponse, html: string): void {
  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
}
