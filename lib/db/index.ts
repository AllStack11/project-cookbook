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

export interface UserMetadata {
  ipAddress?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  isSuspicious?: boolean;
}

export async function saveRecipeToLongTermStorage(
  recipe: Recipe,
  userMetadata?: UserMetadata,
  explicitSourceUrl?: string
) {
  if (!process.env.DATABASE_URL) return;

  try {
    await db.insert(recipes).values({
      title: recipe.title,
      sourceUrl: explicitSourceUrl || recipe.sourceUrl || null,
      sourcePlatform: recipe.sourcePlatform || "unknown",
      confidenceScore: recipe.confidenceScore || null,
      data: recipe,
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
