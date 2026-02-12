/** @jest-environment node */
import { scrapeWebContent, extractStructuredRecipe } from '@/lib/extractors/webScraper';

// Mock fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('webScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scrapeWebContent', () => {
    it('should scrape content successfully', async () => {
      const mockHtml = `
        <html>
          <head><title>Test Recipe</title></head>
          <body>
            <article>
              <h1>Chocolate Cake Recipe</h1>
              <p>This is a delicious chocolate cake recipe.</p>
            </article>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => mockHtml,
      } as Response);

      const result = await scrapeWebContent('https://example.com/recipe');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('Chocolate Cake');
      expect(result.metadata?.url).toBe('https://example.com/recipe');
      expect(result.metadata?.title).toBe('Test Recipe');
    });

    it('should handle empty URL', async () => {
      const result = await scrapeWebContent('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('URL is required');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      const result = await scrapeWebContent('https://example.com/notfound');

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should remove unwanted elements', async () => {
      const mockHtml = `
        <html>
          <body>
            <nav>Navigation</nav>
            <article>Main Content</article>
            <footer>Footer</footer>
            <script>alert('test');</script>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const result = await scrapeWebContent('https://example.com');

      expect(result.success).toBe(true);
      expect(result.content).not.toContain('Navigation');
      expect(result.content).not.toContain('Footer');
      expect(result.content).not.toContain('alert');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await scrapeWebContent('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to scrape');
    });
  });

  describe('extractStructuredRecipe', () => {
    it('should extract JSON-LD recipe data', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
            {
              "@type": "Recipe",
              "name": "Chocolate Cake",
              "description": "Delicious cake",
              "recipeIngredient": ["flour", "sugar", "cocoa"],
              "recipeInstructions": "Mix and bake"
            }
            </script>
          </head>
          <body></body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const result = await extractStructuredRecipe('https://example.com/recipe');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Chocolate Cake');
      expect(result.content).toContain('flour');
      expect(result.metadata?.title).toBe('Chocolate Cake');
    });

    it('should fallback to regular scraping if no structured data', async () => {
      const mockHtml = `
        <html>
          <body>
            <article>Regular Recipe Content</article>
          </body>
        </html>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      const result = await extractStructuredRecipe('https://example.com/recipe');

      expect(result.success).toBe(true);
      expect(result.content).toContain('Regular Recipe');
    });

    it('should handle errors', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch failed'));

      const result = await extractStructuredRecipe('https://example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract');
    });
  });
});
