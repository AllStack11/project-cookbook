import Anthropic from '@anthropic-ai/sdk';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export interface AnthropicCallOptions {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AnthropicResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function callAnthropicWithRetry(
  options: AnthropicCallOptions,
  retryCount = 0
): Promise<AnthropicResponse> {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    return {
      content: content.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      model: options.model,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Don't retry on certain errors
    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('permission_denied')) {
      throw error;
    }

    // Retry on rate limits and temporary errors
    if (retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return callAnthropicWithRetry(options, retryCount + 1);
    }

    throw new Error(`Failed to call Anthropic API after ${MAX_RETRIES} retries: ${errorMessage}`);
  }
}

export async function extractRecipeWithAnthropic(
  content: string,
  model: string = 'claude-haiku-20240307'
): Promise<AnthropicResponse> {
  const prompt = `Extract the recipe from the following content and return it as a structured JSON object.

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

  return callAnthropicWithRetry({
    model,
    prompt,
    maxTokens: 4096,
    temperature: 0.3,
  });
}
