import OpenAI from "openai";
import { createLogger } from "@/lib/utils/logger";
import { LLMProviderError } from "@/lib/llm/errors";
import type {
  ModelAttemptType,
  ProviderRoutingPolicy,
} from "@/lib/llm/modelSelector";

const logger = createLogger("LLM:OpenRouter");

const MAX_RETRIES = Number(process.env.LLM_PROVIDER_MAX_RETRIES || 1);
const INITIAL_BACKOFF_MS = 750;
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_MAX_OUTPUT_TOKENS = Number(
  process.env.LLM_MAX_OUTPUT_TOKENS || 3000
);
const OPENROUTER_TIMEOUT_MS = Number(process.env.LLM_REQUEST_TIMEOUT_MS || 25000);

const RECIPE_JSON_SCHEMA = {
  name: "recipe_extraction",
  strict: true,
  schema: {
    type: "object",
    properties: {
      noRecipeFound: { type: "boolean" },
      noRecipeReason: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      servings: { type: "number" },
      prepTime: { type: "number" },
      cookTime: { type: "number" },
      totalTime: { type: "number" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string" },
            amount: { type: "string" },
            unit: { type: "string" },
          },
          required: ["item"],
          additionalProperties: false,
        },
      },
      instructions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            step: { type: "number" },
            text: { type: "string" },
          },
          required: ["step", "text"],
          additionalProperties: false,
        },
      },
      notes: {
        type: "array",
        items: { type: "string" },
      },
      nutrition: {
        type: "object",
        properties: {
          calories: { type: "number" },
          protein: { type: "string" },
          carbs: { type: "string" },
          fat: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    required: ["noRecipeFound"],
    additionalProperties: false,
  },
} as const;

export interface OpenRouterResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface OpenRouterCallOptions {
  attemptType?: ModelAttemptType;
  providerRouting?: ProviderRoutingPolicy;
}

let client: OpenAI | null = null;

export function __resetOpenRouterClientForTests(): void {
  client = null;
}

function getOpenRouterClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new LLMProviderError("OPENROUTER_API_KEY environment variable is not set", {
        code: "config_error",
        retryable: false,
      });
    }
    client = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://localhost",
        "X-Title": "Project Cookbook",
      },
    });
  }
  return client;
}

function normalizeError(error: unknown): LLMProviderError {
  if (error instanceof LLMProviderError) {
    return error;
  }

  const statusCode =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? ((error as { status: number }).status as number)
      : undefined;

  const message = error instanceof Error ? error.message : String(error);

  if (statusCode === 400 || statusCode === 404) {
    return new LLMProviderError(message, {
      code: "invalid_request",
      errorClass: "invalid_request",
      retryable: false,
      statusCode,
      cause: error,
    });
  }

  if (statusCode === 402) {
    return new LLMProviderError(message, {
      code: "invalid_request",
      errorClass: "invalid_request",
      retryable: false,
      statusCode,
      cause: error,
    });
  }

  if (statusCode === 429) {
    return new LLMProviderError(message, {
      code: "rate_limited",
      errorClass: "provider_runtime",
      retryable: true,
      statusCode,
      cause: error,
    });
  }

  if (statusCode && statusCode >= 500) {
    return new LLMProviderError(message, {
      code: "provider_unavailable",
      errorClass: "provider_runtime",
      retryable: true,
      statusCode,
      cause: error,
    });
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("timeout")) {
    return new LLMProviderError(message, {
      code: "timeout",
      errorClass: "provider_runtime",
      retryable: true,
      statusCode,
      cause: error,
    });
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("socket") ||
    normalizedMessage.includes("econnreset") ||
    normalizedMessage.includes("etimedout") ||
    normalizedMessage.includes("fetch failed")
  ) {
    return new LLMProviderError(message, {
      code: "provider_unavailable",
      errorClass: "provider_runtime",
      retryable: true,
      statusCode,
      cause: error,
    });
  }

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("unsupported parameter") ||
    normalizedMessage.includes("response_format") ||
    normalizedMessage.includes("schema")
  ) {
    return new LLMProviderError(message, {
      code: "invalid_request",
      errorClass: "invalid_request",
      retryable: false,
      statusCode,
      cause: error,
    });
  }

  return new LLMProviderError(message, {
    code: "unknown",
    errorClass: "unknown",
    retryable: true,
    statusCode,
    cause: error,
  });
}

export async function extractRecipeWithOpenRouter(
  _content: string,
  prompt: string,
  modelName: string,
  options: OpenRouterCallOptions = {},
  retryCount = 0
): Promise<OpenRouterResponse> {
  try {
    const client = getOpenRouterClient();

    const requestPayload: Record<string, unknown> = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: OPENROUTER_MAX_OUTPUT_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: RECIPE_JSON_SCHEMA,
      },
    };

    // OpenRouter-specific routing for free-tier traffic.
    if (modelName === "openrouter/free" && options.attemptType === "free_primary") {
      requestPayload.extra_body = {
        models: ["openrouter/free"],
        route: "fallback",
        provider: options.providerRouting || {
          sort: "throughput",
          require_parameters: true,
          allow_fallbacks: false,
        },
      };
    }

    const completion = await client.chat.completions.create(
      requestPayload as any,
      {
        timeout: OPENROUTER_TIMEOUT_MS,
      }
    );

    const content = completion.choices?.[0]?.message?.content || "";
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!content.trim()) {
      throw new LLMProviderError("OpenRouter returned an empty response body", {
        code: "provider_unavailable",
        errorClass: "provider_runtime",
        retryable: true,
      });
    }

    return {
      content,
      tokensUsed,
      model: completion.model || modelName,
    };
  } catch (error) {
    const normalized = normalizeError(error);

    if (normalized.retryable && retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      logger.warn(`OpenRouter call failed, retrying in ${backoffMs}ms...`, {
        code: normalized.code,
        statusCode: normalized.statusCode,
        retryCount,
      });
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return extractRecipeWithOpenRouter(
        _content,
        prompt,
        modelName,
        options,
        retryCount + 1
      );
    }

    logger.error("OpenRouter call failed after retries", {
      code: normalized.code,
      statusCode: normalized.statusCode,
      message: normalized.message,
    });
    throw normalized;
  }
}

export async function checkOpenRouterHealth(model: string): Promise<boolean> {
  try {
    const client = getOpenRouterClient();
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "health check" }],
      max_tokens: 1,
    });
    return Boolean(completion?.choices?.length);
  } catch {
    return false;
  }
}
