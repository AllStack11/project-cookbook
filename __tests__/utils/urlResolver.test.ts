import { resolveSearchEngineUrl, isSearchEngineUrl } from "@/lib/utils/urlResolver";

describe("urlResolver", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("detects search engine URLs", () => {
    expect(isSearchEngineUrl("https://www.bing.com/search?q=recipes")).toBe(true);
    expect(isSearchEngineUrl("https://www.google.com/url?url=https://example.com")).toBe(true);
    expect(isSearchEngineUrl("https://example.com/recipe")).toBe(false);
  });

  it("resolves wrapped URL from query param", async () => {
    const wrapped =
      "https://www.google.com/url?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ";

    const result = await resolveSearchEngineUrl(wrapped);

    expect(result.wasSearchEngine).toBe(true);
    expect(result.wasResolved).toBe(true);
    expect(result.resolutionMethod).toBe("query-param");
    expect(result.resolvedUrl).toContain("youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("resolves URL from response redirect destination", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "",
    } as Response);

    const result = await resolveSearchEngineUrl(
      "https://www.bing.com/videos/some-wrapper"
    );

    expect(fetchMock).toHaveBeenCalled();
    expect(result.wasResolved).toBe(true);
    expect(result.resolutionMethod).toBe("response-url");
    expect(result.resolvedUrl).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("resolves URL from search page HTML content when final URL is still search engine", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      url: "https://www.bing.com/videos/some-wrapper",
      headers: new Headers({ "content-type": "text/html" }),
      text: async () =>
        `<html><body><script>var x="https:\\/\\/www.youtube.com\\/watch?v=dQw4w9WgXcQ";</script></body></html>`,
    } as Response);

    const result = await resolveSearchEngineUrl(
      "https://www.bing.com/videos/some-wrapper"
    );

    expect(result.wasResolved).toBe(true);
    expect(result.resolutionMethod).toBe("page-content");
    expect(result.resolvedUrl).toContain("youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("returns unresolved for search URL when no target is discoverable", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      url: "https://www.bing.com/videos/some-wrapper",
      headers: new Headers({ "content-type": "text/html" }),
      text: async () => "<html><body>No outgoing links</body></html>",
    } as Response);

    const inputUrl = "https://www.bing.com/videos/some-wrapper";
    const result = await resolveSearchEngineUrl(inputUrl);

    expect(result.wasSearchEngine).toBe(true);
    expect(result.wasResolved).toBe(false);
    expect(result.resolvedUrl).toBe(inputUrl);
  });
});
