export interface UrlExtractionCase {
  id: string;
  url: string;
  notes?: string;
  enabled?: boolean;
}

/**
 * Curated URL corpus for prompt-tuning runs.
 * Keep `id` stable to make run-to-run artifact comparison easy.
 */
export const urlExtractionCases: UrlExtractionCase[] = [
  {
    id: "blog-allrecipes-lasagna",
    url: "https://www.allrecipes.com/recipe/24074/alysias-basic-meat-lasagna/",
    notes: "Expected: successful blog extraction with recipe signals",
    enabled: true,
  },
  {
    id: "youtube-cooking-video",
    url: "https://www.youtube.com/watch?v=4aZr5hZXP_s",
    notes: "Expected: YouTube transcript/description extraction path",
    enabled: true,
  },
  {
    id: "google-wrapper-url",
    url: "https://www.google.com/url?url=https%3A%2F%2Fwww.bbcgoodfood.com%2Frecipes%2Feasy-pancakes",
    notes: "Expected: resolver unwraps to final recipe URL before extraction",
    enabled: true,
  },
  {
    id: "non-recipe-page",
    url: "https://example.com/",
    notes: "Expected: likely noRecipeFound parser outcome",
    enabled: true,
  },
  {
    id: "unreachable-domain",
    url: "https://example.invalid/recipe",
    notes: "Expected: extraction failure artifact for unreachable URL",
    enabled: true,
  },
];

