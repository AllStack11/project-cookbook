import {
  getHealthcheckModel,
  selectModelCandidates,
} from "@/lib/llm/modelSelector";

describe("modelSelector", () => {
  const envBackup = {
    LLM_ALLOWED_MODELS: process.env.LLM_ALLOWED_MODELS,
    LLM_FREE_PRIMARY_MODEL: process.env.LLM_FREE_PRIMARY_MODEL,
    LLM_FREE_SECONDARY_MODEL: process.env.LLM_FREE_SECONDARY_MODEL,
    LLM_PAID_FALLBACK_MODEL: process.env.LLM_PAID_FALLBACK_MODEL,
  };

  afterEach(() => {
    if (envBackup.LLM_ALLOWED_MODELS === undefined) {
      delete process.env.LLM_ALLOWED_MODELS;
    } else {
      process.env.LLM_ALLOWED_MODELS = envBackup.LLM_ALLOWED_MODELS;
    }

    if (envBackup.LLM_FREE_PRIMARY_MODEL === undefined) {
      delete process.env.LLM_FREE_PRIMARY_MODEL;
    } else {
      process.env.LLM_FREE_PRIMARY_MODEL = envBackup.LLM_FREE_PRIMARY_MODEL;
    }

    if (envBackup.LLM_FREE_SECONDARY_MODEL === undefined) {
      delete process.env.LLM_FREE_SECONDARY_MODEL;
    } else {
      process.env.LLM_FREE_SECONDARY_MODEL = envBackup.LLM_FREE_SECONDARY_MODEL;
    }

    if (envBackup.LLM_PAID_FALLBACK_MODEL === undefined) {
      delete process.env.LLM_PAID_FALLBACK_MODEL;
    } else {
      process.env.LLM_PAID_FALLBACK_MODEL = envBackup.LLM_PAID_FALLBACK_MODEL;
    }
  });

  it("returns free-first defaults when env is not set", () => {
    delete process.env.LLM_ALLOWED_MODELS;
    delete process.env.LLM_FREE_PRIMARY_MODEL;
    delete process.env.LLM_FREE_SECONDARY_MODEL;
    delete process.env.LLM_PAID_FALLBACK_MODEL;

    const attempts = selectModelCandidates({
      contentLength: 1000,
      sourceType: "blog",
      requestCount: 1,
    });

    expect(attempts).toEqual([
      {
        attemptType: "free_primary",
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
      },
      {
        attemptType: "free_secondary",
        model: "openrouter/free",
        providerRouting: {
          sort: "throughput",
          require_parameters: true,
          allow_fallbacks: false,
        },
      },
      {
        attemptType: "paid_fallback",
        model: "qwen/qwen-2.5-7b-instruct",
      },
    ]);
  });

  it("uses compatibility mapping when allowed models env is provided", () => {
    process.env.LLM_ALLOWED_MODELS = "a/free,b/cheap,c/strong";

    const attempts = selectModelCandidates({
      contentLength: 3000,
      sourceType: "blog",
      requestCount: 5,
    });

    expect(attempts).toEqual([
      { attemptType: "free_primary", model: "a/free", providerRouting: undefined },
      { attemptType: "free_secondary", model: "b/cheap", providerRouting: undefined },
      { attemptType: "paid_fallback", model: "c/strong" },
    ]);
  });

  it("ignores 2-entry allowed models override and uses free-first defaults", () => {
    process.env.LLM_ALLOWED_MODELS = "qwen/qwen-2.5-7b-instruct,openai/gpt-4.1-mini";
    delete process.env.LLM_FREE_PRIMARY_MODEL;
    delete process.env.LLM_FREE_SECONDARY_MODEL;
    delete process.env.LLM_PAID_FALLBACK_MODEL;

    const attempts = selectModelCandidates({
      contentLength: 2000,
      sourceType: "blog",
      requestCount: 2,
    });

    expect(attempts).toEqual([
      {
        attemptType: "free_primary",
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        providerRouting: undefined,
      },
      {
        attemptType: "free_secondary",
        model: "openrouter/free",
        providerRouting: {
          sort: "throughput",
          require_parameters: true,
          allow_fallbacks: false,
        },
      },
      {
        attemptType: "paid_fallback",
        model: "qwen/qwen-2.5-7b-instruct",
      },
    ]);
  });

  it("returns first candidate as healthcheck model", () => {
    process.env.LLM_ALLOWED_MODELS = "x/free,y/free,z/paid";
    expect(getHealthcheckModel()).toBe("x/free");
  });
});
