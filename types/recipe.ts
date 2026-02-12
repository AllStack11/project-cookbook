export interface Ingredient {
  item: string;
  amount?: string;
  unit?: string;
}

export interface Instruction {
  step: number;
  text: string;
}

export interface Nutrition {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface Recipe {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  notes?: string[];
  sourceUrl?: string; // Populated by code, not LLM extraction
  imageUrl?: string;
  nutrition?: Nutrition;
  // Quality & Source metadata
  confidenceScore?: number; // 0-100 score indicating extraction quality
  sourcePlatform?: SourceType; // Platform where recipe was extracted from
  // Fallback metadata
  isGenerated?: boolean;
  isPartialFallback?: boolean;
  fallbackFields?: string[];
}

export interface ExtractionResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  noRecipeFound?: boolean;
  noRecipeReason?: string;
  metadata?: {
    cacheHit: boolean;
    modelUsed: string;
    providerUsed?: string;
    tokensUsed?: number;
    processingTime: number;
    isFallback?: boolean;
  };
}

// LLM response can either indicate no recipe found or contain recipe data
export interface LLMExtractionResponse {
  noRecipeFound: boolean;
  noRecipeReason?: string;
  // Recipe fields (only present when noRecipeFound is false)
  title?: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  ingredients?: Ingredient[];
  instructions?: Instruction[];
  notes?: string[];
  imageUrl?: string;
  nutrition?: Nutrition;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface RecipeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  // Specific flags for fallback logic
  missingIngredients?: boolean;
  missingInstructions?: boolean;
  missingTitle?: boolean;
}

export enum SourceType {
  YOUTUBE = "youtube",
  BLOG = "blog",
  INSTAGRAM = "instagram",
  TIKTOK = "tiktok",
  TWITTER = "twitter",
  FACEBOOK = "facebook",
  PINTEREST = "pinterest",
  REDDIT = "reddit",
  SOCIAL_MEDIA = "social", // Generic fallback for other social platforms
  TEXT = "text",
}
