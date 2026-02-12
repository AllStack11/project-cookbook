import { createLogger } from "../utils/logger";

const logger = createLogger("Validators:Content");

/**
 * Normalizes text for more robust pattern detection.
 * Strips zero-width characters, normalizes unicode/whitespace, and lowercases.
 */
function normalizeForDetection(text: string): string {
  return (
    text
      // Remove zero-width characters (common bypass technique)
      .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF\u00AD]/g, "")
      // Normalize unicode whitespace to regular spaces
      .replace(/\s+/g, " ")
      // Remove homoglyph-style character substitutions (basic)
      .replace(/[\u0430-\u044F]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x0350)
      )
      .toLowerCase()
      .trim()
  );
}

const FORBIDDEN_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /ignore (the )?above/i,
  /disregard (all )?(previous |prior )?instructions/i,
  /system prompt/i,
  /dan mode/i,
  /jailbreak/i,
  /you are now a/i,
  /new rule:/i,
  /output the above/i,
  /pretend (to be|you are)/i,
  /act as (a |an )?/i,
  /forget (all |your )?(previous |prior )?instructions/i,
  /override (your |the )?(system|instructions|rules)/i,
  /reveal (your |the )?(system|instructions|prompt)/i,
  /what (are|is) your (system |initial )?prompt/i,
  /do not follow/i,
  /bypass (the |your )?(rules|filters|safety)/i,
  /rolep?lay as/i,
];

const ABUSIVE_PATTERNS = [/<script[\s>]/i, /javascript:/i, /on(error|load)\s*=/i];

/**
 * Validates input content for potential abuse or prompt injection.
 */
export function validateInputContent(content: string): {
  isSafe: boolean;
  reason?: string;
} {
  if (!content) return { isSafe: true };

  const normalized = normalizeForDetection(content);

  // Check for prompt injection patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(normalized)) {
      logger.warn("Potential prompt injection detected", {
        pattern: pattern.source,
      });
      return {
        isSafe: false,
        reason: "Suspicious instruction patterns detected.",
      };
    }
  }

  // Check for XSS/injection patterns
  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      logger.warn("Suspicious keywords detected", { pattern: pattern.source });
      return { isSafe: false, reason: "Content contains restricted keywords." };
    }
  }

  // Length check (already handled in some extractors but good for safety)
  if (content.length > 50000) {
    return { isSafe: false, reason: "Content too long." };
  }

  return { isSafe: true };
}
