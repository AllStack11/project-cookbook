import { truncateToMaxTokens } from "@/lib/utils/tokenCounter";

export interface PreprocessedContent {
  text: string;
  originalLength: number;
  processedLength: number;
  reductionPercentage: number;
}

export function preprocessContent(text: string): PreprocessedContent {
  if (!text) {
    return {
      text: "",
      originalLength: 0,
      processedLength: 0,
      reductionPercentage: 0,
    };
  }

  const originalLength = text.length;
  let processed = text;

  // Remove excessive whitespace
  processed = processed.replace(/\s+/g, " ");

  // Remove common non-content patterns
  processed = removeAdvertisements(processed);
  processed = removeNavigationText(processed);
  processed = removeFooterText(processed);

  // Normalize newlines
  processed = processed.replace(/\n{3,}/g, "\n\n");

  // Trim
  processed = processed.trim();

  // Truncate to max tokens if needed
  processed = truncateToMaxTokens(processed);

  const processedLength = processed.length;
  const reductionPercentage =
    originalLength > 0
      ? Math.round(((originalLength - processedLength) / originalLength) * 100)
      : 0;

  return {
    text: processed,
    originalLength,
    processedLength,
    reductionPercentage,
  };
}

function removeAdvertisements(text: string): string {
  // Remove common ad phrases
  const adPatterns = [
    /advertisement/gi,
    /sponsored content/gi,
    /this post contains affiliate links/gi,
    /shop now/gi,
    /buy on amazon/gi,
    /click here to purchase/gi,
  ];

  let result = text;
  for (const pattern of adPatterns) {
    result = result.replace(pattern, "");
  }

  return result;
}

function removeNavigationText(text: string): string {
  // Remove common navigation elements
  const navPatterns = [
    /skip to (main )?content/gi,
    /search this website/gi,
    /subscribe to newsletter/gi,
    /share on (facebook|twitter|pinterest|instagram)/gi,
  ];

  let result = text;
  for (const pattern of navPatterns) {
    result = result.replace(pattern, "");
  }

  return result;
}

function removeFooterText(text: string): string {
  // Remove common footer elements
  const footerPatterns = [
    /copyright \d{4}/gi,
    /all rights reserved/gi,
    /privacy policy/gi,
    /terms of service/gi,
    /cookie policy/gi,
  ];

  let result = text;
  for (const pattern of footerPatterns) {
    result = result.replace(pattern, "");
  }

  return result;
}

export function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
