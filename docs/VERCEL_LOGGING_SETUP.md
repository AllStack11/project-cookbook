# Vercel Native Logging - Setup Complete ✅

## What Was Implemented

Your app now has **production-ready structured logging** optimized for Vercel's native log collection system. No external service required!

## Changes Made

### 1. Enhanced Logger ([lib/utils/logger.ts](../lib/utils/logger.ts))

**Before:** Basic console wrapper with emoji formatting
**After:** Structured JSON logging with advanced features

**New Features:**
- ✅ JSON-structured output (Vercel auto-indexes all fields)
- ✅ Log level filtering (`LOG_LEVEL` environment variable)
- ✅ Cost tracking helpers (`logger.cost()`)
- ✅ Business metrics tracking (`logger.metric()`)
- ✅ Structured field logging (`logger.structured()`)
- ✅ Operation wrapper (`logOperation()`)
- ✅ Performance timing preserved

**Example Output:**
```json
{
  "timestamp": "2024-01-11T10:30:00Z",
  "level": "INFO",
  "context": "API:Extract",
  "message": "[COST] LLM extraction completed",
  "data": {
    "tokensUsed": 1500,
    "modelUsed": "gemini-2.5-flash-lite",
    "cacheHit": false
  }
}
```

### 2. Cost Tracking Added ([app/api/extract/route.ts](../app/api/extract/route.ts))

Added automatic cost logging for:
- Cache hits (zero cost): `logger.cost('Recipe served from cache', { cacheHit: true, tokensUsed: 0 })`
- LLM API calls: `logger.cost('LLM extraction completed', { tokensUsed, modelUsed, cacheHit: false })`

**Why This Matters:**
Your app is cost-conscious. Now you can monitor cache hit rates and token usage directly in Vercel logs to track if you're meeting your 40-60% cache hit target.

### 3. Environment Variables ([.env.example](../.env.example))

Added documentation for:
```bash
# Log level control
LOG_LEVEL=INFO  # DEBUG | INFO | WARN | ERROR

# Defaults if not set:
# - Development: DEBUG (all logs)
# - Production: INFO (important logs + cost tracking)
```

### 4. Documentation

Created comprehensive guides:
- **[LOGGING.md](../LOGGING.md)** - Complete logging guide
  - Logger API reference
  - Cost tracking examples
  - Vercel search queries
  - Log Drains setup (optional)
  - Best practices

- **[examples/logging-examples.ts](../examples/logging-examples.ts)** - Code examples
  - 8 real-world examples
  - Vercel search cheat sheet
  - Copy-paste ready patterns

- **[README.md](../README.md)** - Updated with logging section

## How to Use (Quick Start)

### 1. Local Development

```bash
# See all logs (default in dev)
npm run dev

# Reduce log verbosity
LOG_LEVEL=INFO npm run dev
```

### 2. Production (Vercel)

**View Logs:**
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click "Logs" sidebar
4. See real-time streaming logs

**Search Examples:**

| What to Find | Search Query |
|--------------|--------------|
| All errors | `level:ERROR` |
| Cache hits | `message:"[COST]" data.cacheHit:true` |
| LLM API calls | `message:"LLM extraction completed"` |
| High token usage | `data.tokensUsed > 2000` |
| Slow requests | `data.duration > 5000` |
| Specific context | `context:"API:Extract"` |

### 3. Monitor Your Cost Goals

**Cache Hit Rate (Target: 40-60%):**

1. Search for cache hits:
   ```
   message:"[COST]" data.cacheHit:true
   ```
   Count: **A**

2. Search for cache misses:
   ```
   message:"[COST]" data.cacheHit:false
   ```
   Count: **B**

3. Calculate:
   ```
   Cache Hit Rate = A / (A + B) × 100%
   ```

**Token Usage Trends:**

Search:
```
message:"LLM extraction completed" data.tokensUsed > 0
```

Export to CSV (Vercel logs export feature) and analyze daily averages.

## No Configuration Needed

**Zero setup required!** Logs are automatically:
- Captured by Vercel when you deploy
- Indexed in JSON format
- Searchable in real-time
- Retained for 1 hour (Hobby) or 7 days (Pro)

## Optional: Log Drains (Long-Term Storage)

Want to keep logs longer than 7 days? Add a Log Drain:

### Recommended: Better Stack (Free Tier Available)

**Cost:** Free for 1GB/month (~5,000 extractions/day = 300MB/month)

**Setup (5 minutes):**

1. Sign up: https://betterstack.com/logs
2. Create a source → Get token
3. Vercel Dashboard → Settings → Log Drains:
   - Type: Better Stack
   - Token: `<your-token>`
   - Save
4. Done! Logs now stream to Better Stack automatically

**What You Get:**
- 30-day retention (vs. 7 days on Vercel Pro)
- SQL query interface
- Alerting on patterns
- Beautiful dashboards
- No code changes

### Alternative: Datadog, Splunk, Custom Webhook

See [LOGGING.md](../LOGGING.md) for other options.

## API Reference

### Basic Logging

```typescript
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MyContext');

logger.debug('Verbose info', { detail: '...' });
logger.info('Normal operation', { status: 'ok' });
logger.warn('Warning', { threshold: 90 });
logger.error('Error', error);
```

### Cost Tracking

```typescript
// Cache hit (zero cost)
logger.cost('Recipe served from cache', {
  cacheHit: true,
  tokensUsed: 0,
});

// LLM API call
logger.cost('LLM extraction', {
  cacheHit: false,
  tokensUsed: 1500,
  modelUsed: 'gemini-2.5-flash-lite',
});
```

### Performance Timing

```typescript
// Auto-timer
const endTimer = logger.startTimer('Database query');
await db.query();
endTimer(); // Logs duration automatically
```

### Business Metrics

```typescript
logger.metric('extraction_success', 1, {
  sourceType: 'youtube',
  duration: 2300,
});
```

### Structured Logging

```typescript
logger.structured('User action', {
  userId: '123',
  action: 'extract_recipe',
  sourceUrl: 'https://...',
});
```

## Production Recommendations

### Log Level Configuration

**Recommended for Production:**
```bash
LOG_LEVEL=false
# OR
LOG_LEVEL=INFO
```

This logs:
- ✅ INFO: Normal operations, metrics
- ✅ WARN: Warnings
- ✅ ERROR: Errors (always logged)
- ✅ PERF: Performance timings
- ✅ Cost tracking (`logger.cost()`)
- ✅ Business metrics (`logger.metric()`)
- ❌ DEBUG: Verbose debugging (excluded)

**When to Use DEBUG in Production:**

Temporarily enable for troubleshooting:
```bash
LOG_LEVEL=DEBUG  # Re-deploy
```

Then revert to `INFO` after debugging.

### Cost Monitoring Setup (Recommended)

Set up weekly alerts:

1. **Cache Hit Rate Alert** (if < 40%):
   - Use Better Stack or Datadog alerting
   - Query: Count cache hits vs misses
   - Alert if ratio < 40%

2. **High Token Usage Alert** (if avg > 2000/request):
   - Query: Average `data.tokensUsed`
   - Alert if 7-day avg > 2000

3. **Error Rate Alert** (if > 5%):
   - Query: Count `level:ERROR`
   - Alert if errors / total requests > 5%

## Vercel Log Retention

| Plan | Retention | Search | Export |
|------|-----------|--------|--------|
| Hobby | 1 hour realtime | ✅ | ✅ |
| Pro | 7 days | ✅ | ✅ |
| Enterprise | Custom | ✅ | ✅ |

**Need longer retention?** Use Log Drains (Better Stack free tier = 30 days).

## Cost Breakdown

### Vercel Native Logs
- **Hobby Plan:** Free (1 hour retention)
- **Pro Plan:** $20/month (7 days retention)
- **No per-log costs**

### With Log Drain (Optional)
- **Better Stack:** Free tier (1GB/month, 30 days retention)
  - Your usage (~5,000 extractions/day): ~300MB/month
  - **Cost: $0/month** (within free tier)

- **At scale (50,000 extractions/day):**
  - ~3GB/month
  - Better Stack: $10/month for 5GB
  - **Total: $10/month**

**Compare to Axiom:** $25-50/month for same volume.

## Next Steps

1. ✅ **Deploy to Vercel** (logs start automatically)
2. ✅ **View logs in dashboard** (Vercel → Logs)
3. ✅ **Try search queries** (see examples above)
4. 🔧 **(Optional) Set up Log Drain** (Better Stack for long-term storage)
5. 📊 **(Optional) Create cost dashboard** (track cache hits, token usage)

## Files Modified

- ✅ [lib/utils/logger.ts](../lib/utils/logger.ts) - Enhanced logger with JSON output
- ✅ [app/api/extract/route.ts](../app/api/extract/route.ts) - Added cost tracking
- ✅ [.env.example](../.env.example) - Added logging config docs
- ✅ [README.md](../README.md) - Added logging section
- ✅ [LOGGING.md](../LOGGING.md) - Complete logging guide
- ✅ [examples/logging-examples.ts](../examples/logging-examples.ts) - Code examples

## Resources

- [Vercel Logs Docs](https://vercel.com/docs/observability/logs)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
- [Better Stack + Vercel](https://betterstack.com/docs/logs/vercel/)
- [Project Logging Guide](../LOGGING.md)

---

**Ready to deploy!** 🚀

Your logging setup is production-ready. Deploy to Vercel and logs will start appearing automatically in your dashboard.
