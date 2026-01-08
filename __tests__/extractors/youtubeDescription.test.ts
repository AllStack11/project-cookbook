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
          <script>var ytInitialData = {"contents":{"twoColumnWatchNextResults":{"results":{"results":{"contents":[{"videoPrimaryInfoRenderer":{"description":{"runs":[{"text":"Ingredients: Flour, Water, Yeast"}]}}}]}}}}};</script>
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

  it("should extract description from structured description (engagementPanels)", async () => {
    const videoId = "test_video_456";
    const mockHtml = `
      <html>
        <body>
          <script>var ytInitialData = {"engagementPanels":[{"engagementPanelSectionListRenderer":{"targetId":"engagement-panel-structured-description","content":{"structuredDescriptionContentRenderer":{"items":[{"videoDescriptionHeaderRenderer":{"description":{"runs":[{"text":"Engaged Ingredients"}]}}}]}}}}]};</script>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractYoutubeDescription(videoId);

    expect(result.success).toBe(true);
    expect(result.content).toContain("Engaged Ingredients");
    expect(result.metadata?.source).toBe("description");
  });

  it("should fallback to shortDescription", async () => {
    const videoId = "test_video_789";
    const mockHtml = `
      <html>
        <body>
          <script>var someOtherVar = {};</script>
          <script>var config = {"shortDescription":"Short description text"};</script>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractYoutubeDescription(videoId);

    expect(result.success).toBe(true);
    expect(result.content).toBe("Short description text");
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
