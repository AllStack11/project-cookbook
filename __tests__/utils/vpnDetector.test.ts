import { isSuspiciousIP } from "@/lib/utils/vpnDetector";

jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
  })),
}));

describe("vpnDetector", () => {
  const baseHeaders = new Headers({
    "user-agent": "Mozilla/5.0",
    "x-vercel-ip-country": "US",
    "x-vercel-ip-timezone": "America/Los_Angeles",
  });

  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.AWS_EXECUTION_ENV;
  });

  it("flags unknown IP with missing user-agent as suspicious", async () => {
    const headers = new Headers();
    const result = await isSuspiciousIP("unknown", headers);

    expect(result.isSuspicious).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.reason).toContain("No IP address available");
  });

  it("flags automation user-agent and records reason", async () => {
    const headers = new Headers({ "user-agent": "python-requests/2.31" });

    const result = await isSuspiciousIP("1.2.3.4", headers);

    expect(result.isSuspicious).toBe(false);
    expect(result.confidence).toBe(0.4);
    expect(result.reason).toContain("Bot/automation user-agent detected");
  });

  it("adds Vercel geo-missing signal when running on Vercel", async () => {
    process.env.VERCEL = "1";
    const headers = new Headers({ "user-agent": "Mozilla/5.0" });

    const result = await isSuspiciousIP("1.2.3.4", headers);

    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain("Missing geo data on Vercel");
  });

  it("keeps normal browser request below suspicious threshold", async () => {
    const result = await isSuspiciousIP("1.2.3.4", baseHeaders);

    expect(result.isSuspicious).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("detects geo mismatch country/timezone signal", async () => {
    const headers = new Headers({
      "user-agent": "Mozilla/5.0",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-timezone": "Asia/Tokyo",
    });

    const result = await isSuspiciousIP("1.2.3.4", headers);

    expect(result.isSuspicious).toBe(false);
    expect(result.confidence).toBe(0.2);
    expect(result.reason).toContain("Geo mismatch");
  });
});
