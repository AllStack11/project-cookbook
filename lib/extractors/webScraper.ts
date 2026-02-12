import * as cheerio from "cheerio";
import { preprocessContent } from "./preprocessor";
import { scrapeInstagramContent } from "./instagramExtractor";
import { getRandomUserAgent } from "./userAgents";
import { validateUrlSafety } from "@/lib/utils/urlSanitizer";

import { Recipe } from "@/types/recipe";

export interface WebScraperResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    url: string;
    title?: string;
    hasRecipeSignals?: boolean;
  };
  recipe?: Recipe; // Optional pre-parsed recipe
}

export async function scrapeWebContent(url: string): Promise<WebScraperResult> {
  try {
    if (!url || url.trim().length === 0) {
      return {
        success: false,
        error: "URL is required",
      };
    }

    // Special handling for Instagram
    if (url.includes("instagram.com")) {
      return scrapeInstagramContent(url);
    }

    // SSRF protection: validate URL doesn't point to internal resources
    const safetyCheck = await validateUrlSafety(url);
    if (!safetyCheck.safe) {
      return {
        success: false,
        error: safetyCheck.error || "URL blocked for security reasons",
      };
    }

    // Fetch HTML with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Parse with Cheerio
    const $ = cheerio.load(html);

    // Check for recipe signals in metadata
    const hasRecipeSignals = checkForRecipeSignals($, html);

    // Remove unwanted elements
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("header").remove();
    $("footer").remove();
    $(".advertisement").remove();
    $(".ad").remove();
    $(".comments").remove();
    $(".sidebar").remove();

    // Try to extract main content
    let content = "";
    const title = $("title").text().trim();

    // Look for common content selectors
    const contentSelectors = [
      "article",
      "main",
      '[role="main"]',
      ".post-content",
      ".article-content",
      ".entry-content",
      ".recipe",
      ".content",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body if no specific content found
    if (!content || content.trim().length < 100) {
      content = $("body").text();
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: "No content found on page",
      };
    }

    // Preprocess to reduce token count
    const processed = preprocessContent(content);

    return {
      success: true,
      content: processed.text,
      metadata: {
        url,
        title,
        hasRecipeSignals,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timeout: Website took too long to respond",
      };
    }

    return {
      success: false,
      error: `Failed to scrape web content: ${errorMessage}`,
    };
  }
}

export async function extractStructuredRecipe(
  url: string
): Promise<WebScraperResult> {
  try {
    // Special handling for Instagram
    if (url.includes("instagram.com")) {
      return scrapeInstagramContent(url);
    }

    // SSRF protection: validate URL doesn't point to internal resources
    const safetyCheck = await validateUrlSafety(url);
    if (!safetyCheck.safe) {
      return {
        success: false,
        error: safetyCheck.error || "URL blocked for security reasons",
      };
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for JSON-LD structured data
    const scripts = $('script[type="application/ld+json"]');
    let recipeData: any = null;

    scripts.each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || "");
        if (
          json["@type"] === "Recipe" ||
          (Array.isArray(json["@graph"]) &&
            json["@graph"].some((item: any) => item["@type"] === "Recipe"))
        ) {
          recipeData = Array.isArray(json["@graph"])
            ? json["@graph"].find((item: any) => item["@type"] === "Recipe")
            : json;
        }
      } catch {
        // Ignore parsing errors
      }
    });

    if (recipeData) {
      // Create a pre-parsed recipe to potentially bypass LLM
      const recipe: Recipe = {
        title: recipeData.name || "",
        description: recipeData.description,
        servings: parseInt(recipeData.recipeYield) || undefined,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        totalTime: recipeData.totalTime,
        ingredients: (recipeData.recipeIngredient || []).map((ing: string) => ({
          item: ing,
        })),
        instructions: (Array.isArray(recipeData.recipeInstructions)
          ? recipeData.recipeInstructions
          : []
        ).map((inst: any, i: number) => ({
          step: i + 1,
          text: inst.text || inst,
        })),
        notes: [],
        sourceUrl: url,
      };

      // Extract image
      if (recipeData.image) {
        recipe.imageUrl = Array.isArray(recipeData.image)
          ? recipeData.image[0]
          : recipeData.image.url || recipeData.image;
      }

      // Extract nutrition
      if (recipeData.nutrition) {
        recipe.nutrition = {
          calories: parseInt(recipeData.nutrition.calories),
          protein: recipeData.nutrition.proteinContent,
          carbs: recipeData.nutrition.carbohydrateContent,
          fat: recipeData.nutrition.fatContent,
        };
      }

      // Convert structured data to concise text as fallback for LLM
      const parts = [];
      if (recipeData.name) parts.push(`${recipeData.name}`);
      if (recipeData.description) parts.push(recipeData.description);
      if (recipe.imageUrl) parts.push(`Image: ${recipe.imageUrl}`);
      if (recipeData.recipeYield)
        parts.push(`Servings: ${recipeData.recipeYield}`);
      if (recipeData.recipeIngredient) {
        parts.push(`Ingredients:\n${recipeData.recipeIngredient.join("\n")}`);
      }
      if (recipeData.recipeInstructions) {
        const instructionsText = recipe.instructions
          .map((inst) => `${inst.step}. ${inst.text}`)
          .join("\n");
        parts.push(`Instructions:\n${instructionsText}`);
      }

      const content = parts.join("\n\n");
      return {
        success: true,
        content,
        recipe,
        metadata: {
          url,
          title: recipeData.name,
          hasRecipeSignals: true, // JSON-LD recipe is a definitive signal
        },
      };
    }

    // Fallback to regular scraping
    return scrapeWebContent(url);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request timeout: Website took too long to respond",
      };
    }

    return {
      success: false,
      error: `Failed to extract structured recipe: ${errorMessage}`,
    };
  }
}

/**
 * Lightweight check for recipe-related signals in HTML
 */
function checkForRecipeSignals($: cheerio.CheerioAPI, html: string): boolean {
  // Check for JSON-LD Recipe (already done in extractStructuredRecipe, but for completeness)
  if (html.includes('"@type": "Recipe"') || html.includes('"@type":"Recipe"')) {
    return true;
  }

  // Check for Microdata
  if ($('[itemtype*="Recipe"]').length > 0) {
    return true;
  }

  // Check for common recipe keywords in title or meta tags
  const title = $("title").text().toLowerCase();
  const description =
    $('meta[name="description"]').attr("content")?.toLowerCase() || "";
  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.toLowerCase() || "";

  const recipeKeywords = [
    "recipe",
    "ingredients",
    "instructions",
    "cook",
    "bake",
    "servings",
  ];

  if (recipeKeywords.some((keyword) => title.includes(keyword))) return true;
  if (recipeKeywords.some((keyword) => description.includes(keyword)))
    return true;
  if (recipeKeywords.some((keyword) => ogTitle.includes(keyword))) return true;

  // Check for h-recipe microformats
  if (
    $(".h-recipe").length > 0 ||
    $(".p-ingredient").length > 0 ||
    $(".e-instructions").length > 0
  ) {
    return true;
  }

  return false;
}
