import { preprocessContent, cleanWhitespace } from '@/lib/extractors/preprocessor';

describe('preprocessor', () => {
  describe('preprocessContent', () => {
    it('should handle empty string', () => {
      const result = preprocessContent('');
      expect(result.text).toBe('');
      expect(result.originalLength).toBe(0);
      expect(result.processedLength).toBe(0);
      expect(result.reductionPercentage).toBe(0);
    });

    it('should remove excessive whitespace', () => {
      const text = 'Hello    world  \n\n\n  test';
      const result = preprocessContent(text);
      expect(result.text).toContain('Hello world');
      expect(result.text).not.toMatch(/\s{2,}/);
    });

    it('should remove advertisement text', () => {
      const text = 'Recipe here Advertisement Sponsored content More recipe';
      const result = preprocessContent(text);
      expect(result.text.toLowerCase()).not.toContain('advertisement');
      expect(result.text.toLowerCase()).not.toContain('sponsored');
    });

    it('should remove navigation text', () => {
      const text = 'Skip to content Recipe Menu Search this website';
      const result = preprocessContent(text);
      expect(result.text.toLowerCase()).not.toContain('skip to content');
      expect(result.text.toLowerCase()).not.toContain('menu');
    });

    it('should remove footer text', () => {
      const text = 'Recipe content Copyright 2024 All rights reserved Privacy policy';
      const result = preprocessContent(text);
      expect(result.text.toLowerCase()).not.toContain('copyright');
      expect(result.text.toLowerCase()).not.toContain('all rights reserved');
    });

    it('should calculate reduction percentage', () => {
      const text = 'Recipe   Advertisement   More text   Copyright 2024';
      const result = preprocessContent(text);
      expect(result.reductionPercentage).toBeGreaterThan(0);
      expect(result.originalLength).toBeGreaterThan(result.processedLength);
    });

    it('should normalize multiple newlines', () => {
      const text = 'Line 1\n\n\n\n\nLine 2';
      const result = preprocessContent(text);
      expect(result.text).not.toMatch(/\n{3,}/);
    });

    it('should trim whitespace', () => {
      const text = '   Recipe content   ';
      const result = preprocessContent(text);
      expect(result.text).toBe('Recipe content');
    });
  });

  describe('cleanWhitespace', () => {
    it('should remove excessive whitespace', () => {
      const text = 'Hello    world  test';
      const result = cleanWhitespace(text);
      expect(result).toBe('Hello world test');
    });

    it('should trim edges', () => {
      const text = '   Hello   ';
      const result = cleanWhitespace(text);
      expect(result).toBe('Hello');
    });
  });
});
