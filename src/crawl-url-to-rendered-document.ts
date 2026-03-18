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
  const navigationTimeoutMs = options.navigationTimeoutMs ?? 15_000;
  const stabilizationTimeMs = options.stabilizationTimeMs ?? 250;
  const browser = await launchPlaywright({
    launchOptions: {
      headless: options.headless ?? true
    }
  });

  try {
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
  } finally {
    await browser.close();
  }
}
