import { WebScraperResult } from "./webScraper";
import { preprocessContent } from "./preprocessor";
import { createLogger } from "../utils/logger";

const logger = createLogger("Extractor:Instagram");

// Dynamic imports for Puppeteer to support both local dev and Vercel
async function getBrowser() {
  // Check if we're running on Vercel
  const isVercel = !!(process.env.VERCEL || process.env.AWS_EXECUTION_ENV);

  if (isVercel) {
    logger.info("Using Vercel-optimized Chromium configuration");
    const puppeteer = await import("puppeteer-core");
    const chromium = await import("@sparticuz/chromium");

    return await puppeteer.default.launch({
      args: [
        ...chromium.default.args,
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-software-rasterizer",
        "--single-process",
      ],
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    logger.info("Using local environment browser configuration");

    // Local development - use common macOS paths
    const macPaths = [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ];

    const fs = await import("fs");
    const puppeteer = await import("puppeteer-core");

    for (const path of macPaths) {
      if (fs.existsSync(path)) {
        logger.info(`Found browser at ${path}`);
        return await puppeteer.default.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: path,
          headless: true,
          userDataDir: `/tmp/puppeteer_local_profile_${Date.now()}`,
        });
      }
    }

    throw new Error(
      "No suitable browser found for Instagram extraction. Please install Microsoft Edge or Google Chrome."
    );
  }
}

export async function scrapeInstagramContent(
  url: string
): Promise<WebScraperResult> {
  let browser;
  try {
    logger.info("Launching Puppeteer for Instagram extraction", { url });

    browser = await getBrowser();

    const page = await browser.newPage();

    // Set viewport to desktop to ensure full content loads
    await page.setViewport({ width: 1280, height: 800 });

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    // Navigate to URL - use domcontentloaded for faster loading
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Wait for the main content or caption to appear
    // Instagram captions are often within article elements or specific classes
    try {
      await page.waitForSelector("article", { timeout: 5000 });
    } catch (e) {
      logger.warn("Timeout waiting for article selector, proceeding anyway");
    }

    // Small delay to allow dynamic content to render
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract content
    const data = await page.evaluate(() => {
      // Try to find the caption
      // Commonly in h1 or span within the first article
      const article = document.querySelector("article");
      if (!article)
        return { text: document.body.innerText, title: document.title };

      // In many IG layouts, the caption is in a span inside an h1 or just a span in the header area
      // We'll try a few common selectors
      const captionSelectors = [
        "h1", // Usually contains the main caption text
        "span._ap3a._aaco._aacu._aacx._aad7._aade", // Specific modern IG classes
        "div._a9zs", // Another common caption container
        'article [role="presentation"] span',
      ];

      let caption = "";
      for (const selector of captionSelectors) {
        const elements = article.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = el.textContent?.trim() || "";
          if (text.length > caption.length) {
            caption = text;
          }
        }
      }

      // If we couldn't find a clear caption, grab all text from the article
      if (!caption || caption.length < 50) {
        caption = article.innerText;
      }

      return {
        text: caption,
        title: document.title,
      };
    });

    await browser.close();
    browser = null;

    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: "Could not extract caption from Instagram page",
      };
    }

    logger.info("Instagram content extracted successfully", {
      contentLength: data.text.length,
      title: data.title,
    });

    const processed = preprocessContent(data.text);

    return {
      success: true,
      content: processed.text,
      metadata: {
        url,
        title: data.title,
      },
    };
  } catch (error) {
    if (browser) await browser.close();
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Instagram extraction failed", { error: errorMessage });
    return {
      success: false,
      error: `Failed to scrape Instagram: ${errorMessage}`,
    };
  }
}
