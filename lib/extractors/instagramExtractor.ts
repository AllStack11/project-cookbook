import { WebScraperResult } from "./webScraper";
import { preprocessContent } from "./preprocessor";
import { createLogger } from "../utils/logger";
import { retryWithBackoff } from "../utils/retry";

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
        // Performance optimizations - block unnecessary resources
        "--disable-images",
        "--no-first-run",
        "--disable-background-networking",
        "--disable-hang-monitor",
      ],
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    logger.info("Using local environment browser configuration");

    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const puppeteer = await import("puppeteer-core");

    // Determine platform-specific browser paths
    const platform = os.platform();
    let browserPaths: string[] = [];

    if (platform === "win32") {
      // Windows paths
      const programFiles = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
      const programFiles64 = process.env["ProgramFiles"] || "C:\\Program Files";
      const localAppData = process.env["LOCALAPPDATA"] || path.join(os.homedir(), "AppData", "Local");

      browserPaths = [
        // Edge (most common on Windows)
        path.join(programFiles64, "Microsoft\\Edge\\Application\\msedge.exe"),
        path.join(programFiles, "Microsoft\\Edge\\Application\\msedge.exe"),
        // Chrome
        path.join(programFiles64, "Google\\Chrome\\Application\\chrome.exe"),
        path.join(programFiles, "Google\\Chrome\\Application\\chrome.exe"),
        path.join(localAppData, "Google\\Chrome\\Application\\chrome.exe"),
        // Brave
        path.join(programFiles64, "BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
        path.join(programFiles, "BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
        path.join(localAppData, "BraveSoftware\\Brave-Browser\\Application\\brave.exe"),
      ];
    } else if (platform === "darwin") {
      // macOS paths
      browserPaths = [
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      ];
    } else {
      // Linux paths
      browserPaths = [
        "/usr/bin/microsoft-edge",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium-browser",
        "/usr/bin/brave-browser",
      ];
    }

    for (const browserPath of browserPaths) {
      if (fs.existsSync(browserPath)) {
        logger.info(`Found browser at ${browserPath}`);
        return await puppeteer.default.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
          executablePath: browserPath,
          headless: true,
          userDataDir: platform === "win32"
            ? path.join(os.tmpdir(), `puppeteer_local_profile_${Date.now()}`)
            : `/tmp/puppeteer_local_profile_${Date.now()}`,
        });
      }
    }

    throw new Error(
      "No suitable browser found for Instagram extraction. Please install Microsoft Edge or Google Chrome."
    );
  }
}

/**
 * Internal extraction function (without retry logic)
 */
async function performInstagramExtraction(url: string): Promise<WebScraperResult> {
  let browser;
  const startTime = Date.now();
  let browserLaunchTime = 0;
  let pageLoadTime = 0;

  try {
    logger.info("Launching Puppeteer for Instagram extraction", { url });

    const browserStart = Date.now();
    browser = await getBrowser();
    browserLaunchTime = Date.now() - browserStart;
    logger.debug("Browser launched", { durationMs: browserLaunchTime });

    const page = await browser.newPage();

    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images, CSS, and fonts - captions are text only
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Set viewport to desktop to ensure full content loads
    await page.setViewport({ width: 1280, height: 800 });

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    // Navigate to URL - use networkidle2 to ensure JS has finished rendering
    const pageLoadStart = Date.now();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 25000 });
    pageLoadTime = Date.now() - pageLoadStart;
    logger.debug("Page loaded", { durationMs: pageLoadTime });

    // Smart wait for caption content to appear (max 3s, returns early when ready)
    await page.waitForFunction(
      () => {
        const article = document.querySelector('article');
        if (!article) return false;
        // Check if article has substantial text content
        return article.innerText.length > 100;
      },
      { timeout: 3000 }
    ).catch(() => {
      // Content not detected yet, proceed anyway with extraction strategies
      logger.debug("Smart wait timed out, proceeding with extraction strategies");
    });

    // Multi-strategy extraction with fallbacks
    let extractedContent: { text: string; title: string; strategy?: string } | null = null;

    // Strategy 1: Article text extraction (PRIORITIZED - contains full Instagram caption)
    // Instagram's og:description meta tag truncates long captions at ~500 chars,
    // but the full caption is available in the article HTML
    logger.debug("Trying extraction strategy: article text");
    try {
      await page.waitForSelector("article", { timeout: 8000 });
      const articleData = await page.evaluate(() => {
        const article = document.querySelector("article");
        if (!article) return null;

        // Extract all text content from the article
        const textNodes = Array.from(article.querySelectorAll('span, div, p, h1, h2'));
        const texts = textNodes
          .map(el => el.textContent?.trim() || '')
          .filter(text => text.length > 50 && !text.startsWith('http')); // Filter out URLs

        // Return the longest text found (likely the caption)
        if (texts.length > 0) {
          const longestText = texts.sort((a, b) => b.length - a.length)[0];
          return { text: longestText, title: document.title, strategy: 'article-text' };
        }

        return null;
      });

      // Prefer article text if it's substantially long (likely complete caption)
      if (articleData && articleData.text.length >= 200) {
        extractedContent = articleData;
        logger.info("Extraction succeeded with strategy: article text", {
          contentLength: articleData.text.length
        });
      }
    } catch (error) {
      logger.debug("Article text strategy failed - article element not found", {
        error,
        hint: "Instagram may have changed their DOM structure or the post requires login"
      });
    }

    // Strategy 2: Semantic HTML (fallback - og:description may be truncated for long captions)
    if (!extractedContent) {
      logger.debug("Trying extraction strategy: semantic HTML");
      try {
        const semanticData = await page.evaluate(() => {
          // Try og:description meta tag
          const ogDescription = document.querySelector('meta[property="og:description"]');
          if (ogDescription) {
            const content = ogDescription.getAttribute('content');
            if (content && content.length > 100) {
              return { text: content, title: document.title, strategy: 'og:description' };
            }
          }

          // Try JSON-LD structured data
          const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
          for (const script of scripts) {
            try {
              const data = JSON.parse(script.textContent || '');
              if (data.caption && data.caption.length > 50) {
                return { text: data.caption, title: document.title, strategy: 'json-ld' };
              }
              if (data.description && data.description.length > 50) {
                return { text: data.description, title: document.title, strategy: 'json-ld' };
              }
            } catch (e) {
              // Invalid JSON, continue
            }
          }

          return null;
        });

        if (semanticData) {
          extractedContent = semanticData;
          logger.info("Extraction succeeded with strategy: semantic HTML", {
            strategy: semanticData.strategy,
            contentLength: semanticData.text.length
          });
        }
      } catch (error) {
        logger.debug("Semantic HTML strategy failed", { error });
      }
    }

    // Strategy 3: Specific selectors (legacy fallback)
    if (!extractedContent) {
      logger.debug("Trying extraction strategy: specific selectors");
      try {
        const selectorData = await page.evaluate(() => {
          const article = document.querySelector("article");
          if (!article) return null;

          // Try common selectors for Instagram captions
          const captionSelectors = [
            "h1", // Usually contains the main caption text
            'article [role="presentation"] span',
            "span._ap3a._aaco._aacu._aacx._aad7._aade", // Specific modern IG classes (fragile)
            "div._a9zs", // Another common caption container (fragile)
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

          // Fallback: grab all text from the article
          if (!caption || caption.length < 50) {
            caption = article.innerText;
          }

          return caption ? { text: caption, title: document.title, strategy: 'selectors' } : null;
        });

        if (selectorData) {
          extractedContent = selectorData;
          logger.info("Extraction succeeded with strategy: specific selectors", {
            contentLength: selectorData.text.length
          });
        }
      } catch (error) {
        logger.debug("Specific selectors strategy failed", { error });
      }
    }

    // If all strategies failed, return error
    if (!extractedContent) {
      await browser.close();
      browser = null;
      return {
        success: false,
        error: "Could not find recipe content in this Instagram post. Try pasting the caption directly.",
      };
    }

    const data = extractedContent;

    await browser.close();
    browser = null;

    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: "Could not find recipe content in this Instagram post. Try pasting the caption directly.",
      };
    }

    const totalDuration = Date.now() - startTime;
    logger.info("Instagram content extracted successfully", {
      contentLength: data.text.length,
      title: data.title,
      strategy: data.strategy,
      browserLaunchMs: browserLaunchTime,
      pageLoadMs: pageLoadTime,
      totalDurationMs: totalDuration,
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

    const totalDuration = Date.now() - startTime;
    logger.error("Instagram extraction failed", {
      error: errorMessage,
      browserLaunchMs: browserLaunchTime,
      pageLoadMs: pageLoadTime,
      totalDurationMs: totalDuration,
    });

    // Provide helpful error messages based on error type
    let userFriendlyError = `Failed to scrape Instagram: ${errorMessage}`;

    if (errorMessage.toLowerCase().includes('timeout')) {
      userFriendlyError = "Instagram is taking too long to respond. This often happens on first request - try again in a few seconds.";
    } else if (errorMessage.toLowerCase().includes('captcha') ||
               errorMessage.toLowerCase().includes('login') ||
               errorMessage.toLowerCase().includes('authentication')) {
      userFriendlyError = "Instagram requires authentication for this post. Please paste the recipe text directly instead.";
    } else if (errorMessage.toLowerCase().includes('navigation') ||
               errorMessage.toLowerCase().includes('net::')) {
      userFriendlyError = "Unable to connect to Instagram. Please check the URL and try again.";
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

/**
 * Public API: Scrape Instagram content with retry logic
 */
export async function scrapeInstagramContent(
  url: string
): Promise<WebScraperResult> {
  return retryWithBackoff(
    () => performInstagramExtraction(url),
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 8000,
    },
    'Instagram extraction'
  );
}
