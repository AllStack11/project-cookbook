import { scrapeInstagramContent } from "../../lib/extractors/instagramExtractor";

/**
 * @jest-environment node
 */
describe("Instagram Extractor", () => {
  it("should extract content from a public Instagram post", async () => {
    const url = "https://www.instagram.com/p/DTNqIVHEWvf/";
    const result = await scrapeInstagramContent(url);

    expect(result.success).toBe(true);
    expect(result.content).toContain("red lentils");
    expect(result.content).toContain("Ingredients");
  });
});
