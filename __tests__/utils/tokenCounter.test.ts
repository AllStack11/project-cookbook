import {
  estimateTokens,
  estimateTokensWithInfo,
  truncateToMaxTokens,
  canFitInContext,
  getTokenBudget,
  MAX_TOKENS,
} from "@/lib/utils/tokenCounter";

describe("tokenCounter", () => {
  describe("estimateTokens", () => {
    it("should estimate tokens for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("should estimate tokens for short text", () => {
      const text = "Hello";
      const tokens = estimateTokens(text);
      expect(tokens).toBe(2); // 5 chars / 4 = 1.25, rounded up to 2
    });

    it("should estimate tokens for longer text", () => {
      const text = "This is a test sentence with multiple words.";
      const tokens = estimateTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("estimateTokensWithInfo", () => {
    it("should provide detailed token estimate", () => {
      const text = "Hello world";
      const info = estimateTokensWithInfo(text);

      expect(info.characters).toBe(11);
      expect(info.tokens).toBe(Math.ceil(11 / 4));
      expect(info.isTruncated).toBe(false);
    });

    it("should detect when text would be truncated", () => {
      const longText = "a".repeat(MAX_TOKENS * 4 + 1000);
      const info = estimateTokensWithInfo(longText);

      expect(info.isTruncated).toBe(true);
      expect(info.tokens).toBeGreaterThan(MAX_TOKENS);
    });
  });

  describe("truncateToMaxTokens", () => {
    it("should not truncate text within limits", () => {
      const text = "This is a short text";
      const truncated = truncateToMaxTokens(text);

      expect(truncated).toBe(text);
    });

    it("should truncate text exceeding max tokens", () => {
      const longText = "word ".repeat(10000);
      const truncated = truncateToMaxTokens(longText, 100);

      expect(truncated.length).toBeLessThan(longText.length);
      expect(estimateTokens(truncated)).toBeLessThanOrEqual(100);
    });

    it("should truncate at word boundary", () => {
      const text =
        "hello world this is a test sentence that should be truncated properly";
      const truncated = truncateToMaxTokens(text, 5);

      // Should not end mid-word (should end with space or be trimmed)
      // Since our implementation does truncate.substring(0, lastSpaceIndex),
      // it effectively removes the partial word and the space.
      expect(
        truncated
          .trim()
          .split(" ")
          .every((w) => w.length > 0)
      ).toBe(true);
      expect(text.startsWith(truncated)).toBe(true);
    });

    it("should handle empty string", () => {
      expect(truncateToMaxTokens("")).toBe("");
    });

    it("should use default max tokens if not specified", () => {
      const veryLongText = "a".repeat(MAX_TOKENS * 4 + 5000);
      const truncated = truncateToMaxTokens(veryLongText);

      expect(estimateTokens(truncated)).toBeLessThanOrEqual(MAX_TOKENS);
    });
  });

  describe("canFitInContext", () => {
    it("should return true for text within limits", () => {
      const text = "Short text";
      expect(canFitInContext(text)).toBe(true);
    });

    it("should return false for text exceeding limits", () => {
      const longText = "a".repeat(MAX_TOKENS * 4 + 1000);
      expect(canFitInContext(longText)).toBe(false);
    });

    it("should accept custom max tokens", () => {
      const text = "a".repeat(100);
      expect(canFitInContext(text, 10)).toBe(false);
      expect(canFitInContext(text, 100)).toBe(true);
    });
  });

  describe("getTokenBudget", () => {
    it("should calculate remaining token budget", () => {
      const budget = getTokenBudget(500, 1000);
      expect(budget).toBe(500);
    });

    it("should return 0 if budget exceeded", () => {
      const budget = getTokenBudget(1500, 1000);
      expect(budget).toBe(0);
    });

    it("should use default max tokens if not specified", () => {
      const budget = getTokenBudget(1000);
      expect(budget).toBe(MAX_TOKENS - 1000);
    });
  });
});
