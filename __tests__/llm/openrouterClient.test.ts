import OpenAI from "openai";
import {
  __resetOpenRouterClientForTests,
  extractRecipeWithOpenRouter,
} from "@/lib/llm/openrouterClient";
import { LLMProviderError } from "@/lib/llm/errors";

const mockCreate = jest.fn();

jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
    cost: jest.fn(),
  })),
}));

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

describe("openrouterClient", () => {
  const envBackup = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    LLM_PROVIDER_MAX_RETRIES: process.env.LLM_PROVIDER_MAX_RETRIES,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetOpenRouterClientForTests();
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  });

  afterEach(() => {
    if (envBackup.OPENROUTER_API_KEY === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = envBackup.OPENROUTER_API_KEY;
    }
    if (envBackup.LLM_PROVIDER_MAX_RETRIES === undefined) {
      delete process.env.LLM_PROVIDER_MAX_RETRIES;
    } else {
      process.env.LLM_PROVIDER_MAX_RETRIES = envBackup.LLM_PROVIDER_MAX_RETRIES;
    }
  });

  it("should successfully call OpenRouter and parse usage", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "{\"title\":\"Recipe\"}" } }],
      usage: { total_tokens: 123 },
      model: "qwen/qwen-2.5-7b-instruct",
    });

    const result = await extractRecipeWithOpenRouter(
      "content",
      "prompt",
      "qwen/qwen-2.5-7b-instruct"
    );

    expect(result.content).toBe("{\"title\":\"Recipe\"}");
    expect(result.tokensUsed).toBe(123);
    expect(result.model).toBe("qwen/qwen-2.5-7b-instruct");
    expect(OpenAI).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "qwen/qwen-2.5-7b-instruct",
        response_format: expect.objectContaining({
          type: "json_schema",
        }),
      }),
      expect.objectContaining({
        timeout: expect.any(Number),
      })
    );
  });

  it("should include OpenRouter free-route controls for free primary attempts", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "{\"title\":\"Recipe\"}" } }],
      usage: { total_tokens: 99 },
      model: "openrouter/free",
    });

    await extractRecipeWithOpenRouter("content", "prompt", "openrouter/free", {
      attemptType: "free_primary",
      providerRouting: {
        sort: "throughput",
        require_parameters: true,
        allow_fallbacks: false,
      },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openrouter/free",
        extra_body: {
          models: ["openrouter/free"],
          route: "fallback",
          provider: {
            sort: "throughput",
            require_parameters: true,
            allow_fallbacks: false,
          },
        },
      }),
      expect.any(Object)
    );
  });

  it("should throw config_error when API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;

    await expect(
      extractRecipeWithOpenRouter("content", "prompt", "qwen/qwen-2.5-7b-instruct")
    ).rejects.toMatchObject<Partial<LLMProviderError>>({
      code: "config_error",
      retryable: false,
    });
  });

  it("should classify 400 as invalid_request", async () => {
    mockCreate.mockRejectedValue({
      status: 400,
      message: "bad request",
    });

    await expect(
      extractRecipeWithOpenRouter("content", "prompt", "qwen/qwen-2.5-7b-instruct")
    ).rejects.toMatchObject<Partial<LLMProviderError>>({
      code: "invalid_request",
      errorClass: "invalid_request",
      retryable: false,
      statusCode: 400,
    });
  });

  it("should classify 429 as provider_runtime", async () => {
    mockCreate.mockRejectedValue({
      status: 429,
      message: "rate limited",
    });

    await expect(
      extractRecipeWithOpenRouter("content", "prompt", "qwen/qwen-2.5-7b-instruct")
    ).rejects.toMatchObject<Partial<LLMProviderError>>({
      code: "rate_limited",
      errorClass: "provider_runtime",
      retryable: true,
      statusCode: 429,
    });
  });

  it("should classify empty body as provider_runtime", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "   " } }],
      usage: { total_tokens: 1 },
      model: "openrouter/free",
    });

    await expect(
      extractRecipeWithOpenRouter("content", "prompt", "openrouter/free")
    ).rejects.toMatchObject<Partial<LLMProviderError>>({
      code: "provider_unavailable",
      errorClass: "provider_runtime",
      retryable: true,
    });
  });
});
