import { launchPlaywright } from "crawlee";

import type { RenderedDocument } from "./types";

type CrawlUrlToRenderedDocumentOptions = {
  headless?: boolean;
  navigationTimeoutMs?: number;
  stabilizationTimeMs?: number;
};

export async function crawlUrlToRenderedDocument(
  url: string,
  options: CrawlUrlToRenderedDocumentOptions = {}
): Promise<RenderedDocument> {
  validateUrl(url);

  const navigationTimeoutMs = options.navigationTimeoutMs ?? 15_000;
  const stabilizationTimeMs = options.stabilizationTimeMs ?? 1_200;
  let browser;

  try {
    browser = await launchPlaywright({
      launchOptions: {
        headless: options.headless ?? true
      }
    });

    const page = await browser.newPage();

    await page.goto(url, {
      timeout: navigationTimeoutMs,
      waitUntil: "domcontentloaded"
    });

    if (stabilizationTimeMs > 0) {
      await page.waitForTimeout(stabilizationTimeMs);
    }

    const [title, bodyHtml] = await Promise.all([
      page.title(),
      page.evaluate(() => document.body?.innerHTML ?? "")
    ]);

    return {
      url,
      finalUrl: page.url(),
      fetchedAt: new Date().toISOString(),
      title,
      bodyHtml
    };
  } catch (error) {
    throw new Error(
      `Failed to render document for ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    await browser?.close();
  }
}

function validateUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}
