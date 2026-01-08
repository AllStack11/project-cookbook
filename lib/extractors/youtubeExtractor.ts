import { YoutubeTranscript } from "youtube-transcript";
import { preprocessContent } from "./preprocessor";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("Extractor:YouTube");

export interface YoutubeExtractResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    videoId: string;
    duration?: number;
    source: "transcript" | "description";
  };
}

export async function extractYoutubeTranscript(
  videoId: string
): Promise<YoutubeExtractResult> {
  try {
    if (!videoId || videoId.trim().length === 0) {
      return {
        success: false,
        error: "Video ID is required",
      };
    }

    // Fetch transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      return {
        success: false,
        error: "No transcript available for this video",
      };
    }

    // Combine transcript text
    const rawText = transcriptItems.map((item) => item.text).join(" ");

    // Preprocess to reduce token count
    const processed = preprocessContent(rawText);

    return {
      success: true,
      content: processed.text,
      metadata: {
        videoId,
        source: "transcript",
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle specific error cases
    if (
      errorMessage.includes("Transcript is disabled") ||
      errorMessage.includes("No transcript available")
    ) {
      return {
        success: false,
        error: "No transcript available for this video",
      };
    }

    if (errorMessage.includes("Video unavailable")) {
      return {
        success: false,
        error: "Video is unavailable or private",
      };
    }

    return {
      success: false,
      error: `Failed to extract transcript: ${errorMessage}`,
    };
  }
}

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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

    // Strategy 1: Look for the description in the ytInitialData JSON object
    // This is more robust than shortDescription
    const ytDataMatch = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (ytDataMatch && ytDataMatch[1]) {
      try {
        const ytData = JSON.parse(ytDataMatch[1]);
        const description =
          ytData.contents?.twoColumnWatchNextResults?.results?.results
            ?.contents?.[0]?.videoPrimaryInfoRenderer?.description?.runs?.[0]
            ?.text ||
          ytData.engagementPanels
            ?.find(
              (p: any) =>
                p.engagementPanelSectionListRenderer?.targetId ===
                "engagement-panel-structured-description"
            )
            ?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items?.find(
              (i: any) => i.videoDescriptionHeaderRenderer
            )
            ?.videoDescriptionHeaderRenderer?.description?.runs?.map(
              (r: any) => r.text
            )
            .join("") ||
          "";

        if (description && description.trim().length > 0) {
          logger.info("Found description in ytInitialData", { videoId });
          const processed = preprocessContent(description);
          return {
            success: true,
            content: processed.text,
            metadata: { videoId, source: "description" },
          };
        }
      } catch (e) {
        logger.warn("Failed to parse ytInitialData", { error: e });
      }
    }

    // Strategy 2: Look for "shortDescription" (older but simpler)
    const shortDescMatch = html.match(/"shortDescription":"(.*?)"/);
    if (shortDescMatch && shortDescMatch[1]) {
      const rawDescription = shortDescMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");

      if (rawDescription.trim().length > 0) {
        logger.info("Found description via shortDescription match", {
          videoId,
        });
        const processed = preprocessContent(rawDescription);
        return {
          success: true,
          content: processed.text,
          metadata: { videoId, source: "description" },
        };
      }
    }

    // Strategy 3: Fallback to meta description
    const metaMatch = html.match(
      /<meta\s+name="description"\s+content="(.*?)"/i
    );
    if (metaMatch && metaMatch[1]) {
      const metaDescription = metaMatch[1]
        .replace(/"/g, '"')
        .replace(/&/g, "&")
        .replace(/&#39;/g, "'");

      if (metaDescription.trim().length > 0) {
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
      error: "Could not find video description",
    };
  } catch (error) {
    logger.error("Error extracting YouTube description", { error });
    return {
      success: false,
      error: `Failed to extract YouTube description: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
