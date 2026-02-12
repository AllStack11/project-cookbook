/** @jest-environment node */
jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
  })),
}));

jest.mock("@/lib/llm/modelSelector", () => ({
  selectModelCandidates: jest.fn(() => [
    { attemptType: "free_primary", model: "google/gemma-3-27b-it:free" },
    { attemptType: "free_secondary", model: "openrouter/free" },
    { attemptType: "paid_fallback", model: "qwen/qwen-2.5-7b-instruct" },
  ]),
}));

const mockCheckHealth = jest.fn();
jest.mock("@/lib/llm/provider", () => ({
  checkLLMProviderHealth: (...args: any[]) => mockCheckHealth(...args),
}));

describe("health llm route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns online and sets cache header on successful check", async () => {
    mockCheckHealth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/health/llm/route");

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "online" });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=30"
    );
  });

  it("returns online when any fallback model is healthy", async () => {
    mockCheckHealth
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { GET } = await import("@/app/api/health/llm/route");

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "online" });
  });

  it("returns offline when health check is false", async () => {
    mockCheckHealth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/health/llm/route");

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "offline" });
  });

  it("gemini alias route proxies to llm health route", async () => {
    mockCheckHealth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/health/gemini/route");

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "online" });
  });
});
