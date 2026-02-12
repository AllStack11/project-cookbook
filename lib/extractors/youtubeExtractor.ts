import { YoutubeTranscript } from "youtube-transcript";
import { preprocessContent } from "./preprocessor";
import { getRandomUserAgent } from "./userAgents";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("Extractor:YouTube");

export interface YoutubeExtractResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    videoId: string;
    duration?: number;
    source: "transcript" | "description" | "youtube-api" | "captions";
  };
  externalRecipeUrl?: string; // Detected recipe link to follow
}

/**
 * Detect external recipe URLs in YouTube description
 * Common patterns: blog posts, recipe websites, etc.
 */
function detectRecipeUrl(description: string): string | null {
  if (!description || description.length === 0) return null;

  // Common recipe site domains
  const recipeHosts = [
    "allrecipes.com",
    "foodnetwork.com",
    "epicurious.com",
    "bonappetit.com",
    "seriouseats.com",
    "simplyrecipes.com",
    "tasty.co",
    "delish.com",
    "food.com",
    "yummly.com",
    "cookieandkate.com",
    "minimalistbaker.com",
    "budgetbytes.com",
    "recipetineats.com",
    "kingarthurbaking.com",
    "thekitchn.com",
    "saveur.com",
    "cooking.nytimes.com",
    "myrecipes.com",
    "bettycrocker.com",
    "pillsbury.com",
  ];

  // Extract all URLs from description
  const urlRegex = /https?:\/\/[^\s\)]+/gi;
  const urls = description.match(urlRegex) || [];

  for (const url of urls) {
    try {
      const urlObj = new URL(url.replace(/[.,;]$/, "")); // Remove trailing punctuation
      const hostname = urlObj.hostname.replace(/^www\./, "");

      // Check if it's a known recipe site
      if (recipeHosts.some((host) => hostname.includes(host))) {
        logger.info("Detected known recipe site URL in description", {
          url: urlObj.href,
          hostname,
        });
        return urlObj.href;
      }

      // Check for recipe-related paths
      const path = urlObj.pathname.toLowerCase();
      if (
        path.includes("/recipe") ||
        path.includes("/recipes") ||
        path.includes("/cooking")
      ) {
        logger.info("Detected recipe-related URL in description", {
          url: urlObj.href,
        });
        return urlObj.href;
      }
    } catch {
      // Invalid URL, continue
      continue;
    }
  }

  // Check for recipe-related text patterns near URLs
  for (const url of urls) {
    const urlIndex = description.indexOf(url);
    const contextBefore = description
      .substring(Math.max(0, urlIndex - 100), urlIndex)
      .toLowerCase();
    const contextAfter = description
      .substring(urlIndex, Math.min(description.length, urlIndex + 100))
      .toLowerCase();
    const context = contextBefore + contextAfter;

    if (
      context.includes("full recipe") ||
      context.includes("get the recipe") ||
      context.includes("recipe link") ||
      context.includes("written recipe") ||
      context.includes("recipe below") ||
      context.includes("blog post") ||
      context.includes("recipe here")
    ) {
      try {
        const cleanUrl = url.replace(/[.,;]$/, "");
        new URL(cleanUrl); // Validate
        logger.info("Detected recipe URL by context clues", { url: cleanUrl });
        return cleanUrl;
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Primary extraction method using youtube-transcript library
 * Target specialized transcript endpoints
 */
async function extractWithTranscriptLibrary(
  videoId: string
): Promise<YoutubeExtractResult> {
  try {
    logger.info("Attempting transcript extraction with youtube-transcript", {
      videoId,
    });

    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (transcript && transcript.length > 0) {
      const rawText = transcript
        .map((segment) => segment.text || "")
        .filter((text) => text.trim().length > 0)
        .join(" ");

      if (rawText && rawText.trim().length > 0) {
        const processed = preprocessContent(rawText);
        logger.info(
          "Successfully extracted transcript via youtube-transcript",
          {
            videoId,
            rawLength: rawText.length,
            processedLength: processed.text.length,
          }
        );

        return {
          success: true,
          content: processed.text,
          metadata: {
            videoId,
            source: "transcript",
          },
        };
      }
    }

    logger.warn("No transcript found via youtube-transcript", { videoId });
    return {
      success: false,
      error: "No transcript available via library",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.warn("youtube-transcript extraction failed", {
      videoId,
      error: errorMessage,
    });

    return {
      success: false,
      error: `Transcript library failed: ${errorMessage}`,
    };
  }
}

/**
 * Parse XML caption format from YouTube
 */
function parseXmlCaptions(xml: string): string {
  try {
    // Extract text from <text> tags
    const textMatches = xml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
    const texts = textMatches
      .map((match) => {
        const textContent = match.replace(/<[^>]*>/g, "");
        return decodeHTMLEntities(textContent);
      })
      .filter((text) => text.trim().length > 0);

    return texts.join(" ");
  } catch {
    return "";
  }
}

/**
 * Fallback extraction using direct timedtext endpoint
 * This doesn't require an API key and works for most videos with captions
 */
async function extractWithTimedText(
  videoId: string
): Promise<YoutubeExtractResult> {
  try {
    logger.info("Attempting transcript extraction with timedtext endpoint", {
      videoId,
    });

    // Try multiple timedtext URLs with different formats
    const formats = ["json3", "srv3", "srv1", "vtt"];
    const languages = ["en", "en-US", "en-GB", "a.en"]; // 'a.en' for auto-generated

    for (const lang of languages) {
      for (const fmt of formats) {
        const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=${fmt}`;

        try {
          const response = await fetch(timedTextUrl, {
            headers: {
              "User-Agent": getRandomUserAgent(),
              Accept: "*/*",
            },
          });

          if (!response.ok) continue;

          const content = await response.text();
          if (!content || content.trim().length < 50) continue;

          logger.debug("Got timedtext response", {
            videoId,
            lang,
            fmt,
            contentLength: content.length,
            preview: content.substring(0, 200),
          });

          const parsed = parseTimedTextResponse(content, fmt);
          if (parsed && parsed.length > 50) {
            const processed = preprocessContent(parsed);
            logger.info("Successfully extracted transcript via timedtext", {
              videoId,
              lang,
              fmt,
              rawLength: parsed.length,
              processedLength: processed.text.length,
            });

            return {
              success: true,
              content: processed.text,
              metadata: {
                videoId,
                source: "youtube-api",
              },
            };
          }
        } catch {
          // Continue to next format/language
        }
      }
    }

    // Try getting list of available tracks first
    const trackListUrl = `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`;
    try {
      const trackListResponse = await fetch(trackListUrl, {
        headers: {
          "User-Agent": getRandomUserAgent(),
        },
      });

      if (trackListResponse.ok) {
        const trackListXml = await trackListResponse.text();
        logger.debug("Track list response", {
          videoId,
          content: trackListXml.substring(0, 500),
        });

        // Parse available tracks from XML
        const trackMatches = trackListXml.match(/<track[^>]+>/g) || [];
        for (const trackTag of trackMatches) {
          const langMatch = trackTag.match(/lang_code="([^"]+)"/);
          const nameMatch = trackTag.match(/name="([^"]*)"/);

          if (langMatch) {
            const lang = langMatch[1];
            const name = nameMatch ? nameMatch[1] : "";

            for (const fmt of formats) {
              const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&name=${encodeURIComponent(name)}&fmt=${fmt}`;

              try {
                const resp = await fetch(url, {
                  headers: {
                    "User-Agent": getRandomUserAgent(),
                  },
                });

                if (!resp.ok) continue;

                const content = await resp.text();
                if (!content || content.trim().length < 50) continue;

                const parsed = parseTimedTextResponse(content, fmt);
                if (parsed && parsed.length > 50) {
                  const processed = preprocessContent(parsed);
                  logger.info(
                    "Successfully extracted transcript via track list",
                    {
                      videoId,
                      lang,
                      fmt,
                    }
                  );

                  return {
                    success: true,
                    content: processed.text,
                    metadata: {
                      videoId,
                      source: "youtube-api",
                    },
                  };
                }
              } catch {
                continue;
              }
            }
          }
        }
      }
    } catch {
      // Track list approach failed
    }

    return {
      success: false,
      error: "No captions found via timedtext endpoint",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.warn("Timedtext extraction failed", {
      videoId,
      error: errorMessage,
    });

    return {
      success: false,
      error: `Timedtext extraction failed: ${errorMessage}`,
    };
  }
}

/**
 * Parse timedtext response based on format
 */
function parseTimedTextResponse(content: string, format: string): string {
  try {
    if (format === "json3") {
      // JSON format
      const data = JSON.parse(content);
      if (data.events) {
        return data.events
          .filter((event: any) => event.segs)
          .map((event: any) =>
            event.segs.map((seg: any) => seg.utf8 || "").join("")
          )
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    if (format === "vtt") {
      // WebVTT format
      const lines = content.split("\n");
      const textLines = lines.filter(
        (line) =>
          line.trim() &&
          !line.startsWith("WEBVTT") &&
          !line.startsWith("Kind:") &&
          !line.startsWith("Language:") &&
          !line.includes("-->") &&
          !/^\d+$/.test(line.trim())
      );
      return textLines.join(" ").replace(/\s+/g, " ").trim();
    }

    // XML formats (srv1, srv3)
    if (content.includes("<text") || content.includes("<transcript")) {
      return parseXmlCaptions(content);
    }

    // Try as plain XML anyway
    const textMatches = content.match(/<text[^>]*>([^<]*)<\/text>/g);
    if (textMatches && textMatches.length > 0) {
      return textMatches
        .map((match) => decodeHTMLEntities(match.replace(/<[^>]*>/g, "")))
        .join(" ");
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Decode HTML entities in caption text
 */
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/\\n/g, " ")
    .replace(/\n/g, " ");
}

/**
 * Fallback: Extract video description from YouTube page
 */
export async function extractYoutubeDescription(
  videoId: string
): Promise<YoutubeExtractResult> {
  try {
    if (!videoId || videoId.trim().length === 0) {
      return {
        success: false,
        error: "Video ID is required",
      };
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;
    logger.info("Fetching YouTube page for description", { videoId });

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch YouTube page: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Strategy 1: Look for "shortDescription" in ytInitialPlayerResponse
    const shortDescMatch = html.match(/"shortDescription":"(.*?)(?<!\\)"/);
    if (shortDescMatch && shortDescMatch[1]) {
      const rawDescription = shortDescMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      if (rawDescription.trim().length > 50) {
        logger.info("Found description via shortDescription match", {
          videoId,
          length: rawDescription.length,
        });
        const processed = preprocessContent(rawDescription);
        return {
          success: true,
          content: processed.text,
          metadata: { videoId, source: "description" },
        };
      }
    }

    // Strategy 2: Look for description in ytInitialData
    const ytDataMatch = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (ytDataMatch && ytDataMatch[1]) {
      try {
        const ytData = JSON.parse(ytDataMatch[1]);
        const description =
          ytData.contents?.twoColumnWatchNextResults?.results?.results
            ?.contents?.[1]?.videoSecondaryInfoRenderer?.attributedDescription
            ?.content || "";

        if (description && description.trim().length > 50) {
          logger.info("Found description in ytInitialData", { videoId });
          const processed = preprocessContent(description);
          return {
            success: true,
            content: processed.text,
            metadata: { videoId, source: "description" },
          };
        }
      } catch (e) {
        logger.debug("Failed to parse ytInitialData", { error: e });
      }
    }

    // Strategy 3: Fallback to meta description (usually too short)
    const metaMatch = html.match(
      /<meta\s+name="description"\s+content="(.*?)"/i
    );
    if (metaMatch && metaMatch[1]) {
      const metaDescription = decodeHTMLEntities(metaMatch[1]);

      // Only use if it's substantial enough
      if (metaDescription.trim().length > 100) {
        logger.info("Found description in meta tag", { videoId });
        const processed = preprocessContent(metaDescription);
        return {
          success: true,
          content: processed.text,
          metadata: { videoId, source: "description" },
        };
      }
    }

    return {
      success: false,
      error: "Could not find substantial video description",
    };
  } catch (error) {
    logger.error("Error extracting YouTube description", { error });
    return {
      success: false,
      error: `Failed to extract YouTube description: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Fallback: Extract video metadata using official YouTube Data API v3
 * This is used as a reliable fallback when scraping methods fail.
 * Consumes 1 quota unit.
 */
async function extractWithYoutubeApi(
  videoId: string
): Promise<YoutubeExtractResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "YouTube API key not configured",
    };
  }

  try {
    logger.info("Attempting extraction with official YouTube Data API", {
      videoId,
    });

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `API returned status ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "Video not found via YouTube API",
      };
    }

    const videoSnippet = data.items[0].snippet;
    const title = videoSnippet.title || "";
    const description = videoSnippet.description || "";
    const tags = videoSnippet.tags ? videoSnippet.tags.join(", ") : "";

    // Combine metadata for LLM processing
    const combinedContent = `
Title: ${title}
Description:
${description}
${tags ? `\nTags: ${tags}` : ""}
    `.trim();

    if (description.length < 50) {
      logger.warn("YouTube API returned sparse description", {
        videoId,
        length: description.length,
      });
    }

    const processed = preprocessContent(combinedContent);
    logger.info("Successfully extracted content via YouTube Data API", {
      videoId,
      contentLength: processed.text.length,
    });

    // Log extracted content for debugging
    logger.debug("Extracted YouTube content preview", {
      videoId,
      title: title.substring(0, 100),
      descriptionLength: description.length,
      descriptionPreview: description.substring(0, 300),
      fullContent: processed.text.substring(0, 500),
    });

    // Check if description is too sparse and contains an external recipe link
    const externalRecipeUrl = detectRecipeUrl(description);
    if (externalRecipeUrl && description.length < 300) {
      logger.info("Description is sparse but contains external recipe URL", {
        videoId,
        descriptionLength: description.length,
        externalRecipeUrl,
      });

      return {
        success: true,
        content: processed.text,
        externalRecipeUrl,
        metadata: {
          videoId,
          source: "youtube-api",
        },
      };
    }

    return {
      success: true,
      content: processed.text,
      externalRecipeUrl: externalRecipeUrl || undefined,
      metadata: {
        videoId,
        source: "youtube-api",
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("YouTube Data API extraction failed", {
      videoId,
      error: errorMessage,
    });

    return {
      success: false,
      error: `YouTube Data API failed: ${errorMessage}`,
    };
  }
}

/**
 * Main YouTube transcript extraction function
 * Uses a hybrid approach with multiple fallbacks:
 * 1. youtube-transcript (Library) - Specialized transcript retrieval
 * 2. Direct timedtext endpoint - Multiple formats and languages
 * 3. Official YouTube Data API v3 - Reliable fallback for metadata/description
 * 4. Description extraction - Last resort (manual scraping)
 */
export async function extractYoutubeTranscript(
  videoId: string
): Promise<YoutubeExtractResult> {
  if (!videoId || videoId.trim().length === 0) {
    return {
      success: false,
      error: "Video ID is required",
    };
  }

  logger.info("Starting hybrid YouTube extraction", { videoId });

  // Method 1: Try specialized transcript library
  const libResult = await extractWithTranscriptLibrary(videoId);
  if (libResult.success) {
    logger.info("✓ Extraction succeeded via youtube-transcript", { videoId });
    return libResult;
  }

  // Method 2: Try direct timedtext endpoint
  const timedTextResult = await extractWithTimedText(videoId);
  if (timedTextResult.success) {
    logger.info("✓ Extraction succeeded via timedtext endpoint", { videoId });
    return timedTextResult;
  }

  // Method 3: Try official YouTube Data API (If transcript fails)
  // This is a reliable fallback for content when transcripts are unavailable
  if (process.env.YOUTUBE_API_KEY) {
    const apiResult = await extractWithYoutubeApi(videoId);
    if (apiResult.success) {
      logger.info("✓ Extraction succeeded via YouTube Data API", { videoId });
      return apiResult;
    }
  }

  // If transcript methods and API failed, return the error
  // The calling code will decide whether to fall back to manual description scraping
  logger.warn("All primary extraction methods failed", {
    videoId,
    libError: libResult.error,
    timedTextError: timedTextResult.error,
    apiError: !process.env.YOUTUBE_API_KEY
      ? "API Key missing"
      : "API call failed",
  });

  return {
    success: false,
    error: `Primary extraction failed. YouTube Data API or scraping required.`,
  };
}
