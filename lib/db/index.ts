import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  // We don't throw error here to allow the app to boot in dev without DB,
  // but we should log it or handle it in the saving function
  console.warn("DATABASE_URL is not set. Long-term storage will be disabled.");
}

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Helper to save a recipe
import { Recipe } from "@/types/recipe";
import { recipes } from "./schema";
import { normalizeUrl } from "@/lib/cache/cacheClient";
import { createLogger } from "@/lib/utils/logger";

export interface UserMetadata {
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  isSuspicious?: boolean;
}

/**
 * Basic string sanitation: trim, normalize whitespace, strip HTML tags
 */
function sanitizeString(str: string): string {
  return str
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Deeply sanitize all strings in a recipe object
 */
function sanitizeRecipe(recipe: Recipe): Recipe {
  const sanitized = JSON.parse(JSON.stringify(recipe));

  const walk = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        walk(obj[key]);
      }
    }
  };

  walk(sanitized);
  return sanitized;
}

export async function saveRecipeToLongTermStorage(
  recipe: Recipe,
  userMetadata?: UserMetadata,
  explicitSourceUrl?: string
) {
  const logger = createLogger("DB:SaveRecipe");

  if (!process.env.DATABASE_URL) {
    logger.warn("DATABASE_URL not set, skipping recipe save");
    return;
  }

  const startTime = Date.now();

  try {
    const sanitizedRecipe = sanitizeRecipe(recipe);
    const rawUrl = explicitSourceUrl || recipe.sourceUrl;
    const normalizedUrl = rawUrl ? normalizeUrl(rawUrl) : null;

    logger.info("Saving recipe to database", {
      recipeTitle: sanitizedRecipe.title,
      sourceUrl: normalizedUrl,
      sourcePlatform: recipe.sourcePlatform || "unknown",
      confidenceScore: recipe.confidenceScore,
      hasUserMetadata: !!userMetadata,
      userCountry: userMetadata?.country,
      isSuspicious: userMetadata?.isSuspicious,
    });

    await db.insert(recipes).values({
      title: sanitizedRecipe.title,
      sourceUrl: normalizedUrl,
      sourcePlatform: recipe.sourcePlatform || "unknown",
      confidenceScore: recipe.confidenceScore || null,
      data: sanitizedRecipe,
      // User Metadata
      ipAddress: userMetadata?.ipAddress || null,
      userAgent: userMetadata?.userAgent || null,
      country: userMetadata?.country || null,
      region: userMetadata?.region || null,
      isSuspicious: userMetadata?.isSuspicious || false,
    });

    const duration = Date.now() - startTime;

    logger.info("Recipe saved successfully", {
      recipeTitle: sanitizedRecipe.title,
      duration,
      sourceUrl: normalizedUrl,
    });

    // Log as a metric for monitoring
    logger.metric("recipe_saved", 1, {
      sourcePlatform: recipe.sourcePlatform || "unknown",
      duration,
      country: userMetadata?.country,
      isSuspicious: userMetadata?.isSuspicious,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("Failed to save recipe to long-term storage", {
      error: error instanceof Error ? error.message : String(error),
      recipeTitle: recipe.title,
      sourceUrl: explicitSourceUrl || recipe.sourceUrl,
      duration,
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
