import {
  validateUrl,
  extractYoutubeVideoId,
  isYoutubeUrl,
  isSocialMediaUrl,
} from '@/lib/validators/urlValidator';
import { SourceType } from '@/types/recipe';

describe('urlValidator', () => {
  describe('validateUrl', () => {
    it('should validate YouTube URL with video ID', () => {
      const result = validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate short YouTube URL', () => {
      const result = validateUrl('https://youtu.be/dQw4w9WgXcQ');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate YouTube embed URL', () => {
      const result = validateUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.YOUTUBE);
      expect(result.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should validate Instagram URL as social media', () => {
      const result = validateUrl('https://www.instagram.com/p/ABC123/');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.SOCIAL_MEDIA);
    });

    it('should validate TikTok URL as social media', () => {
      const result = validateUrl('https://www.tiktok.com/@user/video/123456');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.SOCIAL_MEDIA);
    });

    it('should validate Twitter/X URL as social media', () => {
      const result1 = validateUrl('https://twitter.com/user/status/123456');
      expect(result1.isValid).toBe(true);
      expect(result1.sourceType).toBe(SourceType.SOCIAL_MEDIA);

      const result2 = validateUrl('https://x.com/user/status/123456');
      expect(result2.isValid).toBe(true);
      expect(result2.sourceType).toBe(SourceType.SOCIAL_MEDIA);
    });

    it('should validate blog URL', () => {
      const result = validateUrl('https://www.example.com/recipe/chocolate-cake');
      expect(result.isValid).toBe(true);
      expect(result.sourceType).toBe(SourceType.BLOG);
    });

    it('should reject empty URL', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL is required');
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });

    it('should reject URL with invalid protocol', () => {
      const result = validateUrl('ftp://example.com/recipe');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('URL must use HTTP or HTTPS protocol');
    });

    it('should reject YouTube URL without video ID', () => {
      const result = validateUrl('https://www.youtube.com/');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Could not extract YouTube video ID');
    });
  });

  describe('extractYoutubeVideoId', () => {
    it('should extract video ID from watch URL', () => {
      const id = extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short URL', () => {
      const id = extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from embed URL', () => {
      const id = extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should return null for non-YouTube URL', () => {
      const id = extractYoutubeVideoId('https://example.com/video');
      expect(id).toBeNull();
    });
  });

  describe('isYoutubeUrl', () => {
    it('should return true for YouTube URLs', () => {
      expect(isYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
      expect(isYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should return false for non-YouTube URLs', () => {
      expect(isYoutubeUrl('https://example.com')).toBe(false);
    });
  });

  describe('isSocialMediaUrl', () => {
    it('should return true for social media URLs', () => {
      expect(isSocialMediaUrl('https://www.instagram.com/p/ABC123/')).toBe(true);
      expect(isSocialMediaUrl('https://www.tiktok.com/@user/video/123')).toBe(true);
      expect(isSocialMediaUrl('https://twitter.com/user/status/123')).toBe(true);
      expect(isSocialMediaUrl('https://www.facebook.com/post/123')).toBe(true);
      expect(isSocialMediaUrl('https://www.pinterest.com/pin/123')).toBe(true);
    });

    it('should return false for non-social media URLs', () => {
      expect(isSocialMediaUrl('https://example.com')).toBe(false);
      expect(isSocialMediaUrl('https://www.youtube.com/watch?v=123')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isSocialMediaUrl('not-a-url')).toBe(false);
    });
  });
});
