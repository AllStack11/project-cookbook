import {
  checkRateLimit,
  incrementRateLimit,
  resetRateLimit,
  shouldShowCaptcha,
} from "@/lib/utils/rateLimiter";
import { kv } from "@vercel/kv";

// Mock @vercel/kv
jest.mock("@vercel/kv", () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    multi: jest.fn(() => ({
      incr: jest.fn(),
      exec: jest.fn().mockResolvedValue([1]),
    })),
    expire: jest.fn(),
    ttl: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    lrange: jest.fn(),
  },
}));

describe("Vercel KV Rate Limiting", () => {
  const ip = "127.0.0.1";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow request if under limit", async () => {
    (kv.get as jest.Mock).mockResolvedValue(5);
    const result = await checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // 10 - 5 - 1
  });

  it("should block request if over limit", async () => {
    (kv.get as jest.Mock).mockResolvedValue(10);
    (kv.ttl as jest.Mock).mockResolvedValue(3600);
    const result = await checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("should increment rate limit and set expiry on first request", async () => {
    const multiExec = jest.fn().mockResolvedValue([1]);
    (kv.multi as jest.Mock).mockReturnValue({
      incr: jest.fn(),
      exec: multiExec,
    });

    await incrementRateLimit(ip);
    expect(kv.multi).toHaveBeenCalled();
    expect(kv.expire).toHaveBeenCalledWith(`rate_limit:${ip}`, 86400);
  });

  it("should trigger captcha if rapid requests detected", async () => {
    const now = Date.now();
    (kv.lrange as jest.Mock).mockResolvedValue([now, now - 1000, now - 2000]);
    const result = await shouldShowCaptcha(ip);
    expect(result).toBe(true);
  });

  it("should reset rate limit", async () => {
    await resetRateLimit(ip);
    expect(kv.del).toHaveBeenCalledWith(
      `rate_limit:${ip}`,
      `recent_requests:${ip}`
    );
  });
});
