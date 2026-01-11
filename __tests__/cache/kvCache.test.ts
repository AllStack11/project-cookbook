import {
  getCachedRecipe,
  setCachedRecipe,
  invalidateCache,
} from "@/lib/cache/cacheClient";
import { kv } from "@vercel/kv";
import { Recipe, SourceType } from "@/types/recipe";

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
    dbsize: jest.fn(),
  },
}));

const mockRecipe: Recipe = {
  title: "Test Recipe",
  ingredients: [{ item: "Ingredient 1", amount: "1", unit: "cup" }],
  instructions: [{ step: 1, text: "Step 1" }],
  sourcePlatform: SourceType.BLOG,
  confidenceScore: 100,
};

describe("Vercel KV Caching", () => {
  const url = "https://example.com/recipe";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should get a cached recipe", async () => {
    (kv.get as jest.Mock).mockResolvedValue(mockRecipe);
    const result = await getCachedRecipe(url);
    expect(kv.get).toHaveBeenCalledWith(expect.stringContaining("recipe:"));
    expect(result).toEqual(mockRecipe);
  });

  it("should return null if recipe is not in cache", async () => {
    (kv.get as jest.Mock).mockResolvedValue(null);
    const result = await getCachedRecipe(url);
    expect(result).toBeNull();
  });

  it("should set a recipe in cache with TTL", async () => {
    await setCachedRecipe(url, mockRecipe, 3600);
    expect(kv.set).toHaveBeenCalledWith(
      expect.stringContaining("recipe:"),
      mockRecipe,
      { ex: 3600 }
    );
  });

  it("should invalidate cache", async () => {
    await invalidateCache(url);
    expect(kv.del).toHaveBeenCalledWith(expect.stringContaining("recipe:"));
  });
});
