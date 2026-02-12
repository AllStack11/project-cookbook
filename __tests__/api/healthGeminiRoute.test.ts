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

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe("health gemini route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it("returns offline when GEMINI_API_KEY is missing", async () => {
    const { GET } = await import("@/app/api/health/gemini/route");

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "offline" });
  });

  it("returns online and sets cache header on successful check", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      response: Promise.resolve({}),
    });

    const { GET } = await import("@/app/api/health/gemini/route");

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "online" });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=30"
    );
  });

  it("returns offline when Gemini throws", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockRejectedValue(new Error("Gemini down"));

    const { GET } = await import("@/app/api/health/gemini/route");

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "offline" });
  });
});

