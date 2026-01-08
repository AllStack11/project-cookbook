import * as cheerio from 'cheerio';
import { preprocessContent } from './preprocessor';

export interface WebScraperResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    url: string;
    title?: string;
  };
}

export async function scrapeWebContent(url: string): Promise<WebScraperResult> {
  try {
    if (!url || url.trim().length === 0) {
      return {
        success: false,
        error: 'URL is required',
      };
    }

    // Fetch HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const html = await response.text();

    // Parse with Cheerio
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script').remove();
    $('style').remove();
    $('nav').remove();
    $('header').remove();
    $('footer').remove();
    $('.advertisement').remove();
    $('.ad').remove();
    $('.comments').remove();
    $('.sidebar').remove();

    // Try to extract main content
    let content = '';
    const title = $('title').text().trim();

    // Look for common content selectors
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.recipe',
      '.content',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body if no specific content found
    if (!content || content.trim().length < 100) {
      content = $('body').text();
    }

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: 'No content found on page',
      };
    }

    // Preprocess to reduce token count
    const processed = preprocessContent(content);

    return {
      success: true,
      content: processed.text,
      metadata: {
        url,
        title,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to scrape web content: ${errorMessage}`,
    };
  }
}

export async function extractStructuredRecipe(url: string): Promise<WebScraperResult> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Look for JSON-LD structured data
    const scripts = $('script[type="application/ld+json"]');
    let recipeData: any = null;

    scripts.each((_, element) => {
      try {
        const json = JSON.parse($(element).html() || '');
        if (json['@type'] === 'Recipe' || (Array.isArray(json['@graph']) && json['@graph'].some((item: any) => item['@type'] === 'Recipe'))) {
          recipeData = Array.isArray(json['@graph'])
            ? json['@graph'].find((item: any) => item['@type'] === 'Recipe')
            : json;
        }
      } catch {
        // Ignore parsing errors
      }
    });

    if (recipeData) {
      // Convert structured data to text
      const parts = [];
      if (recipeData.name) parts.push(`Recipe: ${recipeData.name}`);
      if (recipeData.description) parts.push(recipeData.description);
      if (recipeData.recipeIngredient) parts.push(`Ingredients: ${recipeData.recipeIngredient.join(', ')}`);
      if (recipeData.recipeInstructions) {
        const instructions = Array.isArray(recipeData.recipeInstructions)
          ? recipeData.recipeInstructions.map((inst: any) => inst.text || inst).join(' ')
          : recipeData.recipeInstructions;
        parts.push(`Instructions: ${instructions}`);
      }

      const content = parts.join('\n\n');
      return {
        success: true,
        content,
        metadata: {
          url,
          title: recipeData.name,
        },
      };
    }

    // Fallback to regular scraping
    return scrapeWebContent(url);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to extract structured recipe: ${errorMessage}`,
    };
  }
}
