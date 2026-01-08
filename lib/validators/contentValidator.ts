import { createLogger } from "../utils/logger";

const logger = createLogger("Validators:Content");

const FORBIDDEN_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /system prompt/i,
  /dan mode/i,
  /jailbreak/i,
  /you are now a/i,
  /new rule: /i,
  /output the above/i,
];

const ABUSIVE_PATTERNS = [/exploit/i, /inject/i, /sql injection/i, /<script/i];

/**
 * Validates input content for potential abuse or prompt injection.
 */
export function validateInputContent(content: string): {
  isSafe: boolean;
  reason?: string;
} {
  if (!content) return { isSafe: true };

  // Check for prompt injection patterns
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      logger.warn("Potential prompt injection detected", {
        pattern: pattern.source,
      });
      return {
        isSafe: false,
        reason: "Suspicious instruction patterns detected.",
      };
    }
  }

  // Check for common abusive terms
  for (const pattern of ABUSIVE_PATTERNS) {
    if (pattern.test(content)) {
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
