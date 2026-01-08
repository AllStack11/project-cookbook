import { extractYoutubeTranscript, extractYoutubeCookingPortion } from '@/lib/extractors/youtubeExtractor';

// Mock youtube-transcript
jest.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: jest.fn(),
  },
}));

import { YoutubeTranscript } from 'youtube-transcript';

const mockFetchTranscript = YoutubeTranscript.fetchTranscript as jest.MockedFunction<
  typeof YoutubeTranscript.fetchTranscript
>;

describe('youtubeExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractYoutubeTranscript', () => {
    it('should extract transcript successfully', async () => {
      const mockTranscript = [
        { text: 'Welcome to my recipe video', offset: 0, duration: 2 },
        { text: 'Today we make cookies', offset: 2, duration: 2 },
      ];

      mockFetchTranscript.mockResolvedValue(mockTranscript as any);

      const result = await extractYoutubeTranscript('test-video-id');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('recipe');
      expect(result.metadata?.videoId).toBe('test-video-id');
    });

    it('should handle empty video ID', async () => {
      const result = await extractYoutubeTranscript('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Video ID is required');
    });

    it('should handle no transcript available', async () => {
      mockFetchTranscript.mockResolvedValue([]);

      const result = await extractYoutubeTranscript('test-video-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No transcript available for this video');
    });

    it('should handle disabled transcript error', async () => {
      mockFetchTranscript.mockRejectedValue(new Error('Transcript is disabled on this video'));

      const result = await extractYoutubeTranscript('test-video-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transcript is disabled');
    });

    it('should handle unavailable video error', async () => {
      mockFetchTranscript.mockRejectedValue(new Error('Video unavailable'));

      const result = await extractYoutubeTranscript('test-video-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable or private');
    });

    it('should handle generic errors', async () => {
      mockFetchTranscript.mockRejectedValue(new Error('Network error'));

      const result = await extractYoutubeTranscript('test-video-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract transcript');
    });
  });

  describe('extractYoutubeCookingPortion', () => {
    it('should extract cooking-related portions', async () => {
      const mockTranscript = [
        { text: 'Welcome to my channel', offset: 0, duration: 2 },
        { text: 'Add flour and mix well', offset: 2, duration: 3 },
        { text: 'Bake at 350 degrees', offset: 5, duration: 2 },
        { text: 'Thanks for watching', offset: 7, duration: 2 },
      ];

      mockFetchTranscript.mockResolvedValue(mockTranscript as any);

      const result = await extractYoutubeCookingPortion('test-video-id');

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content).toContain('flour');
      expect(result.content).toContain('Bake');
    });

    it('should handle no cooking keywords found', async () => {
      const mockTranscript = [
        { text: 'Hello everyone', offset: 0, duration: 2 },
        { text: 'This is a test', offset: 2, duration: 2 },
      ];

      mockFetchTranscript.mockResolvedValue(mockTranscript as any);

      const result = await extractYoutubeCookingPortion('test-video-id');

      // Should still return content (fallback to full transcript)
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should handle errors', async () => {
      mockFetchTranscript.mockRejectedValue(new Error('API error'));

      const result = await extractYoutubeCookingPortion('test-video-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract cooking portion');
    });
  });
});
