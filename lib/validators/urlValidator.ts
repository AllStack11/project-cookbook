import { SourceType } from '@/types/recipe';

export interface UrlValidationResult {
  isValid: boolean;
  sourceType?: SourceType;
  videoId?: string;
  error?: string;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

const SOCIAL_MEDIA_DOMAINS = [
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'pinterest.com',
];

export function validateUrl(url: string): UrlValidationResult {
  if (!url || url.trim().length === 0) {
    return {
      isValid: false,
      error: 'URL is required',
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Check protocol
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'URL must use HTTP or HTTPS protocol',
    };
  }

  // Detect YouTube
  if (YOUTUBE_REGEX.test(url)) {
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) {
      return {
        isValid: false,
        error: 'Could not extract YouTube video ID',
      };
    }
    return {
      isValid: true,
      sourceType: SourceType.YOUTUBE,
      videoId,
    };
  }

  // Detect social media
  const hostname = parsedUrl.hostname.toLowerCase();
  for (const domain of SOCIAL_MEDIA_DOMAINS) {
    if (hostname.includes(domain)) {
      return {
        isValid: true,
        sourceType: SourceType.SOCIAL_MEDIA,
      };
    }
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
    return SOCIAL_MEDIA_DOMAINS.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}
