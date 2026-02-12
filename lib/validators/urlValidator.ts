import { SourceType } from "@/types/recipe";
import { matchesDomain } from "@/lib/utils/domainMatcher";

export interface UrlValidationResult {
  isValid: boolean;
  sourceType?: SourceType;
  videoId?: string;
  error?: string;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
const YOUTUBE_ID_REGEX =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

const SOCIAL_MEDIA_PLATFORMS = {
  INSTAGRAM: ["instagram.com"],
  TIKTOK: ["tiktok.com"],
  TWITTER: ["twitter.com", "x.com"],
  FACEBOOK: ["facebook.com", "fb.com", "fb.watch"],
  PINTEREST: ["pinterest.com", "pin.it"],
  REDDIT: ["reddit.com", "redd.it"],
};

const RECIPE_URL_KEYWORDS = [
  "recipe",
  "cook",
  "bake",
  "food",
  "dinner",
  "lunch",
  "breakfast",
  "dessert",
  "dish",
  "cuisine",
  "kitchen",
  "grill",
  "roast",
  "stew",
  "soup",
  "salad",
  "cake",
  "cookie",
  "bread",
  "pasta",
];

function matchesAnyDomain(hostname: string, domains: string[]): boolean {
  return domains.some((domain) => matchesDomain(hostname, domain));
}

export function validateUrl(url: string): UrlValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: "URL is required",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      isValid: false,
      error: "Invalid URL format",
    };
  }

  // Check protocol
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return {
      isValid: false,
      error: "URL must use HTTP or HTTPS protocol",
    };
  }

  // Detect YouTube
  if (YOUTUBE_REGEX.test(url)) {
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      return {
        isValid: false,
        error: "Could not extract YouTube video ID",
      };
    }
    return {
      isValid: true,
      sourceType: SourceType.YOUTUBE,
      videoId,
    };
  }

  // Detect specific social media platforms
  const hostname = parsedUrl.hostname.toLowerCase();

  // Check Instagram
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.INSTAGRAM)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.INSTAGRAM,
    };
  }

  // Check TikTok
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.TIKTOK)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.TIKTOK,
    };
  }

  // Check Twitter/X
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.TWITTER)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.TWITTER,
    };
  }

  // Check Facebook
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.FACEBOOK)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.FACEBOOK,
    };
  }

  // Check Pinterest
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.PINTEREST)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.PINTEREST,
    };
  }

  // Check Reddit
  if (
    matchesAnyDomain(hostname, SOCIAL_MEDIA_PLATFORMS.REDDIT)
  ) {
    return {
      isValid: true,
      sourceType: SourceType.REDDIT,
    };
  }

  // Default to blog
  return {
    isValid: true,
    sourceType: SourceType.BLOG,
  };
}

export function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

export function isSocialMediaUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if URL matches any social media platform
    return Object.values(SOCIAL_MEDIA_PLATFORMS).some((domains) =>
      matchesAnyDomain(hostname, domains)
    );
  } catch {
    return false;
  }
}

/**
 * Heuristic check to see if a URL is likely to be a recipe based on its path and hostname
 */
export function isLikelyRecipeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.toLowerCase();
    const hostname = parsedUrl.hostname.toLowerCase();

    // YouTube and Social Media are handled by their own extractors which are recipe-focused
    if (isYoutubeUrl(url) || isSocialMediaUrl(url)) {
      return true;
    }

    // Check path for recipe keywords
    if (RECIPE_URL_KEYWORDS.some((keyword) => path.includes(keyword))) {
      return true;
    }

    // Check hostname for recipe keywords (e.g., allrecipes.com, foodnetwork.com)
    if (RECIPE_URL_KEYWORDS.some((keyword) => hostname.includes(keyword))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
