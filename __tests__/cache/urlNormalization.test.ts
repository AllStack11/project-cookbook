import { normalizeUrl } from "@/lib/cache/cacheClient";

// Mock @vercel/kv because it triggers ESM issues in Jest through its dependencies
jest.mock("@vercel/kv", () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    dbsize: jest.fn(),
  },
}));

describe("URL Normalization Logic", () => {
  it("should normalize basic URLs correctly", () => {
    expect(normalizeUrl("HTTPS://Example.com/Recipe/")).toBe(
      "https://example.com/recipe"
    );
  });

  it("should remove common tracking parameters", () => {
    const url =
      "https://example.com/recipe?utm_source=twitter&utm_medium=social&fbclid=123";
    expect(normalizeUrl(url)).toBe("https://example.com/recipe");
  });

  it("should sort query parameters for consistency", () => {
    const url1 = "https://example.com/recipe?b=2&a=1";
    const url2 = "https://example.com/recipe?a=1&b=2";
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  it("should handle YouTube URLs correctly (long format)", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=shared";
    expect(normalizeUrl(url)).toBe(
      "https://www.youtube.com/watch?v=dqw4w9wgxcq"
    );
  });

  it("should handle YouTube URLs correctly (short format)", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ?si=tracking_id";
    // Our updated implementation normalizes everything to youtube.com/watch?v=
    expect(normalizeUrl(url)).toBe(
      "https://www.youtube.com/watch?v=dqw4w9wgxcq"
    );
  });

  it("should handle Instagram URLs with lots of query params", () => {
    const url =
      "https://www.instagram.com/p/C1234567890/?igsh=MzRlODBiNWFlZA==&img_index=1";
    // We want this to be normalized to just the post URL
    const normalized = normalizeUrl(url);
    expect(normalized).not.toContain("igsh");
    expect(normalized).toBe("https://www.instagram.com/p/c1234567890");
  });

  it("should normalize different YouTube formats to the same key", () => {
    const longUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const shortUrl = "https://youtu.be/dQw4w9WgXcQ";
    expect(normalizeUrl(longUrl)).toBe(normalizeUrl(shortUrl));
  });

  it("should preserve essential blog parameters", () => {
    const url = "https://some-blog.com/index.php?p=123&utm_source=news";
    expect(normalizeUrl(url)).toBe("https://some-blog.com/index.php?p=123");
  });
});
