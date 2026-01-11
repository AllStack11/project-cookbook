/**
 * Logging Examples for Vercel Native Logs
 *
 * This file demonstrates how to use the structured logging utilities
 * optimized for Vercel's native log collection and search.
 *
 * Run in development to see formatted output.
 * In production (Vercel), logs appear as searchable JSON in the dashboard.
 */

import { createLogger, logOperation } from "@/lib/utils/logger";

// ============================================================
// EXAMPLE 1: Basic Logging with Context
// ============================================================

const logger = createLogger("Example:Basics");

export function basicLoggingExample() {
  logger.debug("This is a debug message", { detail: "verbose info" });
  logger.info("Normal operation", { status: "ok" });
  logger.warn("Warning condition", { threshold: 90 });
  logger.error("Error occurred", new Error("Something went wrong"));
}

// In Vercel logs, search: context:"Example:Basics"

// ============================================================
// EXAMPLE 2: Performance Tracking
// ============================================================

export async function performanceTrackingExample() {
  const perfLogger = createLogger("Example:Performance");

  // Option 1: Auto-timer
  const endTimer = perfLogger.startTimer("Database query");
  await simulateSlowOperation(500);
  endTimer(); // Logs: { level: "PERF", message: "Database query", data: { duration: 500 } }

  // Option 2: Manual timing
  const start = Date.now();
  await simulateSlowOperation(200);
  perfLogger.perf("API call", Date.now() - start);
}

// In Vercel logs, search: level:PERF data.duration > 1000

// ============================================================
// EXAMPLE 3: Cost Tracking (Critical for Recipe Extractor!)
// ============================================================

export async function costTrackingExample() {
  const costLogger = createLogger("Example:Cost");

  // Scenario 1: Cache HIT (zero cost!)
  costLogger.cost("Recipe served from cache", {
    cacheHit: true,
    tokensUsed: 0,
    modelUsed: "cached",
    estimatedCost: 0,
  });

  // Scenario 2: LLM API call (actual cost)
  costLogger.cost("LLM extraction completed", {
    cacheHit: false,
    tokensUsed: 1500,
    modelUsed: "gemini-2.5-flash-lite",
    estimatedCost: 0.0002, // Optional: calculate based on model pricing
  });
}

// In Vercel logs, calculate cache hit rate:
// Search: message:"[COST]" data.cacheHit:true → Count A
// Search: message:"[COST]" data.cacheHit:false → Count B
// Cache hit rate = A / (A + B) * 100%

// ============================================================
// EXAMPLE 4: Business Metrics
// ============================================================

export function businessMetricsExample() {
  const metricsLogger = createLogger("Example:Metrics");

  // Track successful extractions
  metricsLogger.metric("extraction_success", 1, {
    sourceType: "youtube",
    duration: 2300,
    model: "gemini-2.5-flash-lite",
  });

  // Track failures
  metricsLogger.metric("extraction_failure", 1, {
    errorCode: "NO_RECIPE_FOUND",
    sourceType: "blog",
    url: "https://example.com/not-a-recipe",
  });

  // Track custom events
  metricsLogger.metric("cache_hit", 1);
  metricsLogger.metric("rate_limit_exceeded", 1, { ip: "1.2.3.4" });
}

// In Vercel logs, aggregate metrics:
// Search: message:"[METRIC] extraction_success"
// Export to CSV and calculate daily totals

// ============================================================
// EXAMPLE 5: Structured Logging for Custom Search
// ============================================================

export function structuredLoggingExample() {
  const structLogger = createLogger("Example:Structured");

  // Add custom fields that Vercel will index
  structLogger.structured("User action", {
    userId: "user_123",
    action: "extract_recipe",
    sourceUrl: "https://youtube.com/watch?v=abc123",
    ipAddress: "203.0.113.42",
    country: "US",
    userAgent: "Mozilla/5.0...",
  });
}

// In Vercel logs, search by any field:
// data.userId:"user_123"
// data.action:"extract_recipe"
// data.country:"US"

// ============================================================
// EXAMPLE 6: Operation Wrapper (Auto-logging)
// ============================================================

export async function operationWrapperExample() {
  // Automatically logs: start, end, duration, and errors
  const result = await logOperation(
    "Extract YouTube transcript",
    async () => {
      // Your async operation here
      await simulateSlowOperation(1000);
      return { transcript: "Recipe content..." };
    },
    "Extractor:YouTube" // Context
  );

  return result;
}

// Produces these logs automatically:
// 1. { message: "Starting: Extract YouTube transcript" }
// 2. { level: "PERF", message: "Extract YouTube transcript", data: { duration: 1000 } }
// 3. { message: "Completed: Extract YouTube transcript" }
// Or on error:
// { level: "ERROR", message: "Failed: Extract YouTube transcript", data: {...} }

// ============================================================
// EXAMPLE 7: Real-World API Endpoint Pattern
// ============================================================

export async function apiEndpointExample(request: Request) {
  const logger = createLogger("API:Extract");
  const startTime = Date.now();

  try {
    logger.info("=== Starting recipe extraction ===", {
      url: request.url,
      method: request.method,
    });

    // 1. Check cache
    const cacheKey = getCacheKey(request.url);
    const cached = await checkCache(cacheKey);

    if (cached) {
      logger.cost("Recipe served from cache", {
        cacheHit: true,
        tokensUsed: 0,
      });
      logger.metric("cache_hit", 1);
      return { success: true, data: cached, fromCache: true };
    }

    // 2. Extract content
    const endContentTimer = logger.startTimer("Content extraction");
    const content = await extractContent(request.url);
    endContentTimer();

    // 3. Call LLM
    const endLLMTimer = logger.startTimer("LLM API call");
    const llmResponse = await callLLM(content);
    endLLMTimer();

    logger.cost("LLM extraction completed", {
      cacheHit: false,
      tokensUsed: llmResponse.tokensUsed,
      modelUsed: llmResponse.model,
    });

    // 4. Success
    logger.metric("extraction_success", 1, {
      sourceType: "youtube",
      duration: Date.now() - startTime,
    });

    logger.info("=== Extraction complete ===", {
      success: true,
      totalDuration: Date.now() - startTime,
    });

    return { success: true, data: llmResponse.data };
  } catch (error) {
    logger.error("❌ Extraction failed", {
      error,
      duration: Date.now() - startTime,
      url: request.url,
    });

    logger.metric("extraction_failure", 1, {
      errorType: (error as Error).name,
    });

    throw error;
  }
}

// This produces a complete audit trail in Vercel:
// 1. Info: Starting extraction
// 2. Perf: Content extraction timing
// 3. Perf: LLM API timing
// 4. Cost: Token usage and model
// 5. Metric: Success/failure
// 6. Info: Completion summary

// ============================================================
// EXAMPLE 8: Environment-Aware Logging
// ============================================================

export function environmentAwareExample() {
  const logger = createLogger("Example:Environment");

  // Default behavior (no LOG_LEVEL set):
  // - Development: All logs appear (DEBUG, INFO, WARN, ERROR, PERF)
  // - Production: INFO, WARN, ERROR, PERF (DEBUG suppressed)

  // With LOG_LEVEL=INFO:
  //   - Only INFO, WARN, ERROR, PERF appear
  //   - DEBUG logs are suppressed

  logger.debug("Verbose debugging info"); // Hidden when LOG_LEVEL=INFO
  logger.info("Important operational info"); // Always visible (unless LOG_LEVEL=WARN)
  logger.cost("Cost tracking", { tokensUsed: 100 }); // Always visible (INFO level)
  logger.metric("business_metric", 1); // Always visible (INFO level)
  logger.error("Critical error", new Error()); // Always visible
}

// Control via environment variable:
// LOG_LEVEL=DEBUG → All logs
// LOG_LEVEL=INFO → Info, warn, error, perf, cost, metrics
// LOG_LEVEL=WARN → Only WARN and ERROR
// LOG_LEVEL=ERROR → Only ERROR

// ============================================================
// Helper Functions (for examples)
// ============================================================

async function simulateSlowOperation(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCacheKey(url: string): string {
  return `recipe:${url}`;
}

async function checkCache(_key: string): Promise<any> {
  // Simulate cache check
  return null;
}

async function extractContent(_url: string): Promise<string> {
  await simulateSlowOperation(500);
  return "Recipe content...";
}

async function callLLM(_content: string): Promise<any> {
  await simulateSlowOperation(1500);
  return {
    data: { recipe: "Parsed recipe" },
    tokensUsed: 1200,
    model: "gemini-2.5-flash-lite",
  };
}

// ============================================================
// VERCEL DASHBOARD SEARCH CHEAT SHEET
// ============================================================

/*
Common searches in Vercel logs dashboard:

1. All errors:
   level:ERROR

2. Specific context:
   context:"API:Extract"

3. Cache hits only:
   message:"[COST]" data.cacheHit:true

4. High token usage:
   data.tokensUsed > 2000

5. Slow requests:
   data.duration > 5000

6. Specific model usage:
   data.modelUsed:"gemini-2.5-flash-lite"

7. Failed extractions:
   message:"[METRIC] extraction_failure"

8. Successful YouTube extractions:
   context:"Extractor:YouTube" level:INFO

9. Rate limit events:
   message:"Rate limit exceeded"

10. Performance timings:
    level:PERF

Export results to CSV for analysis in Excel/Google Sheets.
*/
