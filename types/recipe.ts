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
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  notes?: string[];
  sourceUrl?: string;
  nutrition?: Nutrition;
}

export interface ExtractionResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  metadata?: {
    cacheHit: boolean;
    modelUsed: string;
    tokensUsed?: number;
    processingTime: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface RecipeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export enum SourceType {
  YOUTUBE = 'youtube',
  BLOG = 'blog',
  SOCIAL_MEDIA = 'social',
  TEXT = 'text',
}
