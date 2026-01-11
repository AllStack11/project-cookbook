import {
  extractYoutubeTranscript,
  extractYoutubeDescription,
} from "@/lib/extractors/youtubeExtractor";
import { YoutubeTranscript } from "youtube-transcript";

// Mock youtube-transcript
jest.mock("youtube-transcript", () => ({
  YoutubeTranscript: {
    fetchTranscript: jest.fn(),
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

const mockFetchTranscript =
  YoutubeTranscript.fetchTranscript as jest.MockedFunction<
    typeof YoutubeTranscript.fetchTranscript
  >;

describe("youtubeExtractor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extractYoutubeTranscript", () => {
    it("should extract transcript successfully via youtube-transcript", async () => {
      const mockTranscript = [
        { text: "Welcome to my recipe video", duration: 1, offset: 0 },
        { text: "Today we make delicious cookies", duration: 1, offset: 1 },
        {
          text: "You will need flour, sugar, and butter",
          duration: 1,
          offset: 2,
        },
      ];

      mockFetchTranscript.mockResolvedValue(mockTranscript);

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

    it("should handle no transcript found via library", async () => {
      mockFetchTranscript.mockResolvedValue([]);

      // Also need to mock fetch for timedtext fallback to avoid real network calls
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      });

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
    });

    it("should handle youtube-transcript errors gracefully", async () => {
      mockFetchTranscript.mockRejectedValue(new Error("Network error"));

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
      });

      const result = await extractYoutubeTranscript("test-video-id");

      expect(result.success).toBe(false);
    });
  });

  describe("extractYoutubeDescription", () => {
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
