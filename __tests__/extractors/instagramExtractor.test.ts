import { scrapeInstagramContent } from "../../lib/extractors/instagramExtractor";

// Mock the dependencies of instagramExtractor
jest.mock("puppeteer-core", () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setViewport: jest.fn(),
      setUserAgent: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      evaluate: jest.fn().mockResolvedValue({
        text: "Red lentils and Ingredients for a great recipe",
        title: "Instagram Post",
      }),
    }),
    close: jest.fn(),
  }),
}));

jest.mock("@sparticuz/chromium", () => ({
  default: {
    args: [],
    executablePath: jest.fn().mockResolvedValue("/usr/bin/google-chrome"),
  },
  args: [],
  executablePath: jest.fn().mockResolvedValue("/usr/bin/google-chrome"),
}));

/**
 * @jest-environment node
 */
describe("Instagram Extractor", () => {
  it("should extract content from a public Instagram post", async () => {
    const url = "https://www.instagram.com/p/DTNqIVHEWvf/";
    const result = await scrapeInstagramContent(url);

    expect(result.success).toBe(true);
    expect(result.content?.toLowerCase()).toContain("red lentils");
    expect(result.content).toContain("Ingredients");
  });
});
