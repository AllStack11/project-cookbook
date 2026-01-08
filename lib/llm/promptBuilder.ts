import { SourceType } from '@/types/recipe';

export function buildRecipeExtractionPrompt(content: string, sourceType: SourceType): string {
  const basePrompt = getBasePrompt();
  const sourceSpecificGuidance = getSourceSpecificGuidance(sourceType);

  return `${basePrompt}

${sourceSpecificGuidance}

Content to extract from:
${content}

Return ONLY the JSON object, no additional text or explanation.`;
}

function getBasePrompt(): string {
  return `Extract the recipe from the following content and return it as a structured JSON object.

The JSON should follow this exact format:
{
  "title": "Recipe Name",
  "description": "Brief description (optional)",
  "servings": 4,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "totalTime": "45 minutes",
  "ingredients": [
    { "item": "all-purpose flour", "amount": "2", "unit": "cups" },
    { "item": "granulated sugar", "amount": "1", "unit": "cup" }
  ],
  "instructions": [
    { "step": 1, "text": "Preheat oven to 350°F (175°C)" },
    { "step": 2, "text": "Mix dry ingredients in a large bowl" }
  ],
  "notes": ["Optional: Add chocolate chips for extra flavor"],
  "nutrition": {
    "calories": 250,
    "protein": "5g",
    "carbs": "45g",
    "fat": "8g"
  }
}

Important guidelines:
- Extract exact ingredient names, amounts, and units
- Number instruction steps sequentially
- Include all relevant details from the source
- If nutrition information is not available, omit the nutrition field
- If optional fields are not available, omit them`;
}

function getSourceSpecificGuidance(sourceType: SourceType): string {
  switch (sourceType) {
    case SourceType.YOUTUBE:
      return `This content is from a YouTube video transcript. Look for:
- Ingredients mentioned with amounts
- Step-by-step cooking instructions
- Temperature and timing details mentioned verbally
- Filter out non-recipe content like channel promotions`;

    case SourceType.BLOG:
      return `This content is from a blog post. Look for:
- Structured ingredient lists (often in a recipe card)
- Numbered or bulleted instructions
- Cooking times and temperatures
- Ignore introductory stories and focus on the actual recipe`;

    case SourceType.SOCIAL_MEDIA:
      return `This content is from social media. Look for:
- Concise ingredient lists (may use abbreviations like "tbsp", "oz")
- Short, informal instructions
- May be less structured than traditional recipes
- Extract whatever recipe information is available`;

    default:
      return '';
  }
}
