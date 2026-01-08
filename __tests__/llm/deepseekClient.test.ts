import { callDeepSeekWithRetry, extractRecipeWithDeepSeek } from '@/lib/llm/deepseekClient';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

import OpenAI from 'openai';

describe('deepseekClient', () => {
  let mockCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPSEEK_API_KEY = 'test-api-key';
    process.env.DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

    // Get mock instance
    const mockInstance = new OpenAI({ apiKey: 'test' });
    mockCreate = mockInstance.chat.completions.create as jest.Mock;
  });

  afterEach(() => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_BASE_URL;
  });

  describe('callDeepSeekWithRetry', () => {
    it('should successfully call DeepSeek API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response content',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await callDeepSeekWithRetry({
        model: 'deepseek-chat',
        prompt: 'Test prompt',
      });

      expect(result.content).toBe('Test response content');
      expect(result.tokensUsed).toBe(150);
      expect(result.model).toBe('deepseek-chat');
    });

    it('should throw error if API key is missing', async () => {
      delete process.env.DEEPSEEK_API_KEY;

      await expect(
        callDeepSeekWithRetry({
          model: 'deepseek-chat',
          prompt: 'Test prompt',
        })
      ).rejects.toThrow('DEEPSEEK_API_KEY environment variable is not set');
    });

    it('should handle empty response content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      await expect(
        callDeepSeekWithRetry({
          model: 'deepseek-chat',
          prompt: 'Test prompt',
        })
      ).rejects.toThrow('No content in response');
    });
  });

  describe('extractRecipeWithDeepSeek', () => {
    it('should extract recipe with default model', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"title":"Test Recipe"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractRecipeWithDeepSeek('Recipe content here');

      expect(result.content).toBe('{"title":"Test Recipe"}');
      expect(result.model).toBe('deepseek-chat');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-chat',
          max_tokens: 4096,
          temperature: 0.3,
        })
      );
    });

    it('should use custom model if provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{"title":"Test"}',
            },
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await extractRecipeWithDeepSeek('Content', 'deepseek-reasoner');

      expect(result.model).toBe('deepseek-reasoner');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'deepseek-reasoner',
        })
      );
    });
  });
});
