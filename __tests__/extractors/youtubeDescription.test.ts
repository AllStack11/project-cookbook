import { extractYoutubeDescription } from "@/lib/extractors/youtubeExtractor";

describe("youtubeExtractor Description Fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should extract description from ytInitialData", async () => {
    const videoId = "test_video_123";
    const mockHtml = `
      <html>
        <body>
          <script>var ytInitialData = {"contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[{},{"videoSecondaryInfoRenderer":{"attributedDescription":{"content":"Ingredients: Flour, Water, Yeast. Mix everything and bake until golden brown for a complete recipe demo."}}}]}}}}};</script>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractYoutubeDescription(videoId);

    expect(result.success).toBe(true);
    expect(result.content).toContain("Ingredients: Flour, Water, Yeast");
    expect(result.metadata?.source).toBe("description");
  });

  it("should extract description from shortDescription", async () => {
    const videoId = "test_video_456";
    const mockHtml = `
      <html>
        <body>
          <script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Short description text with enough detail to pass threshold. Includes ingredients and steps for soup."}};</script>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractYoutubeDescription(videoId);

    expect(result.success).toBe(true);
    expect(result.content).toContain("Short description text");
    expect(result.metadata?.source).toBe("description");
  });

  it("should fail when no substantial description is present", async () => {
    const videoId = "test_video_789";
    const mockHtml = `
      <html>
        <body>
          <script>var someOtherVar = {};</script>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractYoutubeDescription(videoId);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Could not find substantial");
  });

  it("should handle invalid fetch response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await extractYoutubeDescription("invalid_id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("404");
  });
});
