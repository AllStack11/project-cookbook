import { YoutubeTranscript } from 'youtube-transcript';
import { preprocessContent } from './preprocessor';

export interface YoutubeExtractResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    videoId: string;
    duration?: number;
  };
}

export async function extractYoutubeTranscript(videoId: string): Promise<YoutubeExtractResult> {
  try {
    if (!videoId || videoId.trim().length === 0) {
      return {
        success: false,
        error: 'Video ID is required',
      };
    }

    // Fetch transcript
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      return {
        success: false,
        error: 'No transcript available for this video',
      };
    }

    // Combine transcript text
    const rawText = transcriptItems
      .map(item => item.text)
      .join(' ');

    // Preprocess to reduce token count
    const processed = preprocessContent(rawText);

    return {
      success: true,
      content: processed.text,
      metadata: {
        videoId,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Handle specific error cases
    if (errorMessage.includes('Transcript is disabled')) {
      return {
        success: false,
        error: 'Transcript is disabled for this video',
      };
    }

    if (errorMessage.includes('Video unavailable')) {
      return {
        success: false,
        error: 'Video is unavailable or private',
      };
    }

    return {
      success: false,
      error: `Failed to extract transcript: ${errorMessage}`,
    };
  }
}

export async function extractYoutubeCookingPortion(videoId: string): Promise<YoutubeExtractResult> {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcriptItems || transcriptItems.length === 0) {
      return {
        success: false,
        error: 'No transcript available',
      };
    }

    // Filter for cooking/recipe-related portions
    // This is a simplified heuristic - in production, use ML or better heuristics
    const cookingKeywords = [
      'ingredient',
      'recipe',
      'cook',
      'bake',
      'mix',
      'add',
      'pour',
      'stir',
      'heat',
      'oven',
      'cup',
      'tablespoon',
      'teaspoon',
    ];

    const relevantItems = transcriptItems.filter(item => {
      const text = item.text.toLowerCase();
      return cookingKeywords.some(keyword => text.includes(keyword));
    });

    const rawText = (relevantItems.length > 0 ? relevantItems : transcriptItems)
      .map(item => item.text)
      .join(' ');

    const processed = preprocessContent(rawText);

    return {
      success: true,
      content: processed.text,
      metadata: {
        videoId,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to extract cooking portion: ${errorMessage}`,
    };
  }
}
