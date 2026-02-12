import { createLogger } from "@/lib/utils/logger";
import {
  extractRecipeWithOpenRouter,
  type OpenRouterCallOptions,
  type OpenRouterResponse,
  checkOpenRouterHealth,
} from "@/lib/llm/openrouterClient";
import { LLMProviderError } from "@/lib/llm/errors";

const logger = createLogger("LLM:Provider");

export type LLMProviderName = "openrouter";

export interface LLMExtractionResponse {
  content: string;
  tokensUsed: number;
  model: string;
  provider: LLMProviderName;
}

export function getConfiguredProvider(): LLMProviderName {
  const provider = (process.env.LLM_PROVIDER || "openrouter").toLowerCase();
  if (provider !== "openrouter") {
    logger.warn("Unsupported LLM_PROVIDER configured, falling back to openrouter", {
      provider,
    });
  }
  return "openrouter";
}

export async function extractRecipe(
  content: string,
  prompt: string,
  model: string,
  options?: OpenRouterCallOptions
): Promise<LLMExtractionResponse> {
  const provider = getConfiguredProvider();

  switch (provider) {
    case "openrouter": {
      const result: OpenRouterResponse = await extractRecipeWithOpenRouter(
        content,
        prompt,
        model,
        options
      );
      return {
        content: result.content,
        tokensUsed: result.tokensUsed,
        model: result.model,
        provider: "openrouter",
      };
    }
    default:
      throw new LLMProviderError("Unsupported LLM provider", {
        code: "config_error",
        retryable: false,
      });
  }
}

export async function checkLLMProviderHealth(model: string): Promise<boolean> {
  const provider = getConfiguredProvider();
  switch (provider) {
    case "openrouter":
      return checkOpenRouterHealth(model);
    default:
      return false;
  }
}
