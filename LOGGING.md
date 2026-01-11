# Logging Guide - Vercel Native Logs

This project uses **Vercel's native logging system** for all application logs. No external service required for basic logging - everything is built-in.

## Overview

All `console.*` output is automatically:
- Captured by Vercel
- Indexed in structured JSON format
- Searchable in real-time via Vercel Dashboard
- Retained for 7 days (free tier) or longer (paid plans)

## Quick Start

### 1. Local Development

```bash
# All logs enabled by default in development
npm run dev

# Or explicitly set log level
LOG_LEVEL=DEBUG npm run dev
```

Logs appear in your terminal with structured JSON format.

### 2. Production (Vercel)

Logs are automatically available at:
```
https://vercel.com/<your-team>/<project>/logs
```

**Search Examples:**
- All errors: Filter by "ERROR" level
- Cache hits: Search for `"cacheHit":true`
- Slow requests: Search for `"duration" > 3000`
- LLM costs: Search for `"[COST]"`

## Logger API

### Basic Usage

```typescript
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MyContext');

// Log levels
logger.debug('Debugging info', { userId: '123' });
logger.info('Normal operation', { action: 'signup' });
logger.warn('Warning condition', { reason: 'high-load' });
logger.error('Error occurred', error);
```

### Performance Tracking

```typescript
// Option 1: Manual timing
logger.perf('Operation name', 1234); // duration in ms

// Option 2: Auto-timer
const endTimer = logger.startTimer('Database query');
const result = await db.query();
endTimer(); // Automatically logs duration
```

### Cost Tracking (Critical for This Project!)

```typescript
// Track LLM API costs
logger.cost('Recipe extraction', {
  tokensUsed: 1500,
  modelUsed: 'gemini-2.5-flash-lite',
  cacheHit: false,
  estimatedCost: 0.0002, // Optional
});

// Track cache hits (zero cost!)
logger.cost('Recipe served from cache', {
  cacheHit: true,
  tokensUsed: 0,
  estimatedCost: 0,
});
```

### Business Metrics

```typescript
// Track key business metrics
logger.metric('extraction_success', 1, {
  sourceType: 'youtube',
  duration: 2300,
});

logger.metric('extraction_failure', 1, {
  errorCode: 'NO_RECIPE_FOUND',
});
```

### Structured Logging

```typescript
// Add custom fields for better Vercel searchability
logger.structured('User action', {
  userId: '123',
  action: 'extract_recipe',
  sourceUrl: 'https://youtube.com/...',
  ipAddress: request.ip,
}, LogLevel.INFO);
```

### Operation Wrapper

```typescript
import { logOperation } from '@/lib/utils/logger';

// Automatically logs start, end, duration, and errors
const recipe = await logOperation(
  'Extract YouTube transcript',
  async () => {
    return await extractYoutubeTranscript(videoId);
  },
  'Extractor:YouTube' // context
);
```

## Log Levels

| Level | Purpose | Production |
|-------|---------|------------|
| **DEBUG** | Detailed debugging info | Disabled |
| **INFO** | Normal operations, metrics | Enabled |
| **WARN** | Warning conditions | Enabled |
| **ERROR** | Error conditions | Always enabled |
| **PERF** | Performance timing | Enabled with INFO |

## Configuration

### Environment Variable

```bash
# LOG_LEVEL: Controls which logs are shown
# Options: DEBUG | INFO | WARN | ERROR
LOG_LEVEL=INFO
```

**Default Behavior (if not set):**
- Development (`NODE_ENV=development`): `DEBUG` (all logs)
- Production (`NODE_ENV=production`): `INFO` (important logs + cost tracking)

**Log Levels Explained:**

| Level | What's Logged | Use Case |
|-------|---------------|----------|
| **DEBUG** | Everything (verbose) | Local development, debugging |
| **INFO** | Info, warn, error, perf, cost, metrics | **Production (recommended)** |
| **WARN** | Only warnings and errors | Very quiet production |
| **ERROR** | Only errors | Troubleshooting specific issues |

**Production Recommendation:** `LOG_LEVEL=INFO` (or leave unset for automatic INFO in production)

This logs:
- ✅ All INFO, WARN, ERROR messages
- ✅ All cost metrics (`logger.cost()`)
- ✅ All business metrics (`logger.metric()`)
- ✅ All performance timings (`logger.perf()`)
- ❌ Skips DEBUG messages (verbose internals)

## Viewing Logs in Vercel

### Real-Time Logs

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click "Logs" in the sidebar
4. See live streaming logs with automatic refresh

### Searching Logs

Vercel parses JSON logs and makes all fields searchable:

**Search by level:**
```
level:ERROR
```

**Search by context:**
```
context:"API:Extract"
```

**Search by custom fields:**
```
data.cacheHit:true
data.tokensUsed > 1000
data.modelUsed:"gemini-2.5-flash-lite"
```

**Search by message:**
```
message:"LLM extraction completed"
```

**Time range filters:**
- Last 1 hour
- Last 24 hours
- Last 7 days
- Custom range

### Filtering by Function

Each serverless function's logs can be filtered separately:
- `/api/extract` - Main extraction endpoint
- `/api/health` - Health checks

## Log Retention

| Vercel Plan | Retention | Search |
|-------------|-----------|--------|
| **Hobby** | 1 hour realtime | Yes |
| **Pro** | 7 days | Yes |
| **Enterprise** | Custom | Yes |

**Want longer retention?** Use Log Drains (see below).

## Advanced: Log Drains

For long-term storage, advanced search, or alerting, configure Log Drains:

### Option 1: Better Stack (LogTail) - Recommended

**Cost:** Free for 1GB/month, $10 for 5GB
**Setup:** 5 minutes

1. Sign up at [betterstack.com/logs](https://betterstack.com/logs)
2. Create a source, get your source token
3. In Vercel Dashboard → Settings → Log Drains:
   - Drain Type: Better Stack
   - Source Token: `<your-token>`
   - Save

**What you get:**
- 30-day log retention
- SQL query interface
- Beautiful UI
- Alerting on patterns
- No code changes needed

### Option 2: Datadog

**Cost:** Starts at $15/month
**Setup:** Via Vercel integration

Provides full observability platform (logs + metrics + APM).

### Option 3: Custom HTTP Endpoint

**Cost:** DIY (S3 storage costs ~$0.50/GB)
**Setup:** 30 minutes

Create a simple webhook receiver:

```typescript
// pages/api/log-drain.ts
export default function handler(req, res) {
  const logs = req.body;

  // Store in S3, CloudWatch, or your database
  await storeLogs(logs);

  res.status(200).json({ ok: true });
}
```

Then configure in Vercel → Log Drains → Custom → Your webhook URL.

## Cost Monitoring Strategy

Use these log queries to monitor your cost optimization goals:

### 1. Cache Hit Rate (Target: 40-60%)

Search Vercel logs:
```
message:"[COST]" data.cacheHit:true
message:"[COST]" data.cacheHit:false
```

Calculate: `cache_hits / (cache_hits + cache_misses) * 100`

### 2. Token Usage Trends

Search:
```
message:"LLM extraction completed" data.tokensUsed > 0
```

Export to CSV, calculate daily averages.

### 3. Error Rate (Target: <5%)

Search:
```
level:ERROR context:"API:Extract"
```

Count errors vs. total extractions.

### 4. Processing Time (Target: <5s)

Search:
```
message:"TOTAL extraction time" data.duration > 5000
```

Identify slow requests for optimization.

## Best Practices

### ✅ DO:

1. **Use structured data:**
   ```typescript
   logger.info('User signup', { userId, email, plan });
   ```
   Not: `logger.info(\`User \${userId} signed up\`)`

2. **Track costs explicitly:**
   ```typescript
   logger.cost('LLM call', { tokensUsed, modelUsed, cacheHit });
   ```

3. **Use context-based loggers:**
   ```typescript
   const logger = createLogger('Extractor:YouTube');
   ```

4. **Log performance:**
   ```typescript
   const endTimer = logger.startTimer('Expensive operation');
   // ... work ...
   endTimer();
   ```

5. **Include error context:**
   ```typescript
   logger.error('Extraction failed', {
     error,
     url,
     sourceType,
     userId,
   });
   ```

### ❌ DON'T:

1. **Log sensitive data:**
   ```typescript
   // BAD
   logger.info('API call', { apiKey: process.env.GEMINI_API_KEY });

   // GOOD
   logger.info('API call', { model: 'gemini-2.5-flash-lite' });
   ```

2. **Log in tight loops:**
   ```typescript
   // BAD
   ingredients.forEach(i => logger.debug('Ingredient', i));

   // GOOD
   logger.debug('Ingredients parsed', { count: ingredients.length });
   ```

3. **Rely only on DEBUG logs for important metrics:**
   ```typescript
   // BAD - won't appear in production
   logger.debug('Recipe extracted', { tokensUsed });

   // GOOD
   logger.cost('Recipe extracted', { tokensUsed });
   ```

## Example: Full Request Log Flow

```typescript
// app/api/extract/route.ts
const logger = createLogger('API:Extract');

export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info('=== Starting recipe extraction ===');

  try {
    // Check cache
    const cachedRecipe = await getCachedRecipe(url);
    if (cachedRecipe) {
      logger.cost('Recipe served from cache', {
        cacheHit: true,
        tokensUsed: 0,
      });
      return success(cachedRecipe);
    }

    // Call LLM
    const endTimer = logger.startTimer('Gemini API call');
    const llmResponse = await extractRecipeWithGemini(content, prompt);
    endTimer();

    logger.cost('LLM extraction completed', {
      tokensUsed: llmResponse.tokensUsed,
      modelUsed: model,
      cacheHit: false,
    });

    // Success
    logger.info('=== Extraction complete ===', {
      success: true,
      totalDuration: Date.now() - start,
    });

    return success(recipe);

  } catch (error) {
    logger.error('❌ Extraction failed', {
      error,
      duration: Date.now() - start,
      url,
    });
    return error(500);
  }
}
```

This produces searchable logs in Vercel:

```json
{"timestamp":"2024-01-11T10:30:00Z","level":"INFO","context":"API:Extract","message":"=== Starting recipe extraction ==="}
{"timestamp":"2024-01-11T10:30:01Z","level":"INFO","context":"API:Extract","message":"[COST] Recipe served from cache","data":{"cacheHit":true,"tokensUsed":0}}
```

## Troubleshooting

### Logs not appearing in Vercel?

1. Check you're using `console.log/error/warn` (not a custom logger that doesn't call console)
2. Verify you're looking at the correct deployment (Production vs Preview)
3. Check time range filter (default is last 1 hour)

### Too many logs?

Increase `LOG_LEVEL`:
```bash
LOG_LEVEL=WARN  # Only warnings and errors
```

### Logs missing fields?

Ensure you're passing objects, not strings:
```typescript
// BAD
logger.info(\`User \${userId} did \${action}\`);

// GOOD
logger.info('User action', { userId, action });
```

## Cost Estimate

**Vercel Logging (Native):**
- Free tier: Included, 1 hour retention
- Pro: $20/month, 7-day retention
- No per-log costs

**With Log Drain (Better Stack):**
- ~5,000 extractions/day = ~10MB logs/day = ~300MB/month
- Better Stack free tier: 1GB/month (sufficient)
- Cost: **$0/month**

**At Scale (50,000 extractions/day):**
- ~3GB logs/month
- Better Stack: $10/month for 5GB
- Total logging cost: **$10/month**

Compare to Axiom or other paid services: $25-50/month for same volume.

## Resources

- [Vercel Logs Documentation](https://vercel.com/docs/observability/logs)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
- [Better Stack Integration](https://betterstack.com/docs/logs/vercel/)

---

**Questions?** Check [CLAUDE.md](CLAUDE.md) for project context or ask in the codebase.
