import { parseRecipeFromLLMResponse, extractJSONFromText } from '@/lib/llm/responseParser';

describe('responseParser', () => {
  describe('parseRecipeFromLLMResponse', () => {
    it('should parse valid JSON recipe', () => {
      const response = JSON.stringify({
        title: 'Cookies',
        ingredients: [{ item: 'flour', amount: '2', unit: 'cups' }],
        instructions: [{ step: 1, text: 'Mix ingredients' }],
      });

      const result = parseRecipeFromLLMResponse(response);
      expect(result.success).toBe(true);
      expect(result.recipe?.title).toBe('Cookies');
    });

    it('should handle markdown code blocks', () => {
      const response = '```json\n{"title":"Test","ingredients":[{"item":"flour"}],"instructions":[{"step":1,"text":"Mix"}]}\n```';
      const result = parseRecipeFromLLMResponse(response);
      expect(result.success).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const result = parseRecipeFromLLMResponse('{invalid json}');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });

    it('should reject response without required fields', () => {
      const response = JSON.stringify({ title: 'Test' });
      const result = parseRecipeFromLLMResponse(response);
      expect(result.success).toBe(false);
    });
  });

  describe('extractJSONFromText', () => {
    it('should extract JSON from text', () => {
      const text = 'Here is the recipe: {"title":"Test"}';
      const json = extractJSONFromText(text);
      expect(json).toBe('{"title":"Test"}');
    });
  });
});
