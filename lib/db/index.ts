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
  if (!process.env.DATABASE_URL) return;

  try {
    const sanitizedRecipe = sanitizeRecipe(recipe);
    const rawUrl = explicitSourceUrl || recipe.sourceUrl;
    const normalizedUrl = rawUrl ? normalizeUrl(rawUrl) : null;

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
  } catch (error) {
    console.error("Failed to save recipe to long-term storage:", error);
  }
}
