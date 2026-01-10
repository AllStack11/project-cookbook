import {
  extractYoutubeTranscript,
  extractYoutubeDescription,
} from "@/lib/extractors/youtubeExtractor";

// Mock youtubei.js
jest.mock("youtubei.js", () => ({
  Innertube: {
    create: jest.fn(),
  },
}));

// Mock the logger
jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
  })),
}));

import { Innertube } from "youtubei.js";

const mockCreate = Innertube.create as jest.MockedFunction<
  typeof Innertube.create
>;

describe("youtubeExtractor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any module state
    jest.resetModules();
  });

  describe("extractYoutubeTranscript", () => {
    it("should extract transcript successfully via youtubei.js", async () => {
      const mockTranscript = {
        transcript: {
          content: {
            body: {
              initial_segments: [
                { snippet: { text: "Welcome to my recipe video" } },
                { snippet: { text: "Today we make delicious cookies" } },
                { snippet: { text: "You will need flour, sugar, and butter" } },
              ],
            },
          },
        },
      };

      const mockGetInfo = jest.fn().mockResolvedValue({
        getTranscript: jest.fn().mockResolvedValue(mockTranscript),
      });

      mockCreate.mockResolvedValue({
        getInfo: mockGetInfo,
      } as any);

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain("recipe");
      expect(result.metadata?.videoId).toBe("test-video-id");
      expect(result.metadata?.source).toBe("transcript");
    });

    it("should handle empty video ID", async () => {
      const result = await extractYoutubeTranscript("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Video ID is required");
    });

    it("should handle whitespace-only video ID", async () => {
      const result = await extractYoutubeTranscript("   ");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Video ID is required");
    });

    it("should handle no transcript segments available", async () => {
      const mockTranscript = {
        transcript: {
          content: {
            body: {
              initial_segments: null,
            },
          },
        },
      };

      const mockGetInfo = jest.fn().mockResolvedValue({
        getTranscript: jest.fn().mockResolvedValue(mockTranscript),
      });

      mockCreate.mockResolvedValue({
        getInfo: mockGetInfo,
      } as any);

      const result = await extractYoutubeTranscript("test-video-id");

      // Should fail at youtubei.js and potentially fall back to API
      // But without YOUTUBE_API_KEY, should ultimately fail
      expect(result.success).toBe(false);
    });

    it("should handle empty transcript segments", async () => {
      const mockTranscript = {
        transcript: {
          content: {
            body: {
              initial_segments: [],
            },
          },
        },
      };

      const mockGetInfo = jest.fn().mockResolvedValue({
        getTranscript: jest.fn().mockResolvedValue(mockTranscript),
      });

      mockCreate.mockResolvedValue({
        getInfo: mockGetInfo,
      } as any);

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
    });

    it("should handle youtubei.js errors gracefully", async () => {
      mockCreate.mockRejectedValue(new Error("Network error"));

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle getInfo errors", async () => {
      const mockGetInfo = jest.fn().mockRejectedValue(new Error("Video not found"));

      mockCreate.mockResolvedValue({
        getInfo: mockGetInfo,
      } as any);

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("InnerTube");
    });

    it("should handle getTranscript errors", async () => {
      const mockGetInfo = jest.fn().mockResolvedValue({
        getTranscript: jest.fn().mockRejectedValue(new Error("Transcript unavailable")),
      });

      mockCreate.mockResolvedValue({
        getInfo: mockGetInfo,
      } as any);

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
    });
  });

  describe("extractYoutubeDescription", () => {
    // Mock global fetch for description extraction tests
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should handle empty video ID", async () => {
      const result = await extractYoutubeDescription("");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Video ID is required");
    });

    it("should extract description from shortDescription", async () => {
      const mockHtml = `
        <html>
          <script>var ytInitialPlayerResponse = {"shortDescription":"This is a detailed recipe for making chocolate cake. Ingredients: flour, sugar, cocoa, eggs. First, preheat oven to 350F."}</script>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockHtml),
      });

      const result = await extractYoutubeDescription("test-video-id");

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.metadata?.source).toBe("description");
    });

    it("should handle fetch errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const result = await extractYoutubeDescription("test-video-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("404");
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await extractYoutubeDescription("test-video-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle missing description in page", async () => {
      const mockHtml = `
        <html>
          <head><title>YouTube Video</title></head>
          <body>No description data</body>
        </html>
      `;

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockHtml),
      });

      const result = await extractYoutubeDescription("test-video-id");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Could not find");
    });
  });
});
