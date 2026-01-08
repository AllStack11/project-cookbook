import OpenAI from "openai";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export interface DeepSeekCallOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface DeepSeekResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

let client: OpenAI | null = null;

export function getDeepSeekClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY environment variable is not set");
    }

    client = new OpenAI({
      apiKey,
      baseURL,
      timeout: 60000, // 60 second timeout
    });
  }
  return client;
}

export async function callDeepSeekWithRetry(
  options: DeepSeekCallOptions,
  retryCount = 0
): Promise<DeepSeekResponse> {
  try {
    const client = getDeepSeekClient();

    const response = await client.chat.completions.create({
      model: options.model,
      messages: [
        {
          role: "user",
          content: options.prompt,
        },
      ],
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response from DeepSeek API");
    }

    const tokensUsed =
      (response.usage?.prompt_tokens || 0) +
      (response.usage?.completion_tokens || 0);

    return {
      content,
      tokensUsed,
      model: options.model,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Don't retry on authentication errors
    if (
      errorMessage.includes("invalid_api_key") ||
      errorMessage.includes("unauthorized")
    ) {
      throw error;
    }

    // Retry on rate limits and temporary errors
    if (retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return callDeepSeekWithRetry(options, retryCount + 1);
    }

    throw new Error(
      `Failed to call DeepSeek API after ${MAX_RETRIES} retries: ${errorMessage}`
    );
  }
}

export async function extractRecipeWithDeepSeek(
  content: string,
  model: string = "deepseek-chat",
  customPrompt?: string
): Promise<DeepSeekResponse> {
  const defaultPrompt = `Extract the recipe from the following content and return it as a structured JSON object.

The JSON should follow this exact format:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "servings": 4,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "totalTime": "45 minutes",
  "ingredients": [
    { "item": "flour", "amount": "2", "unit": "cups" },
    { "item": "sugar", "amount": "1", "unit": "cup" }
  ],
  "instructions": [
    { "step": 1, "text": "Preheat oven to 350°F" },
    { "step": 2, "text": "Mix dry ingredients" }
  ],
  "notes": ["Optional: Add chocolate chips for extra flavor"],
  "nutrition": {
    "calories": 250,
    "protein": "5g",
    "carbs": "45g",
    "fat": "8g"
  }
}

Content to extract from:
${content}

Return ONLY the JSON object, no additional text or explanation.`;

  const prompt = customPrompt || defaultPrompt;

  return callDeepSeekWithRetry({
    model,
    prompt,
    maxTokens: 2000, // Increased from 1500 to ensure nutrition info is included
    temperature: 0.3,
  });
}
