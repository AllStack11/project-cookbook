# Logging Configuration Simplified ✅

## What Changed

**Removed:** `ENABLE_DEBUG_LOGGING` (confusing boolean flag)
**Kept:** `LOG_LEVEL` (single, clear variable)

## New Configuration

### One Variable to Rule Them All

```bash
LOG_LEVEL=INFO  # DEBUG | INFO | WARN | ERROR
```

**That's it!** No more confusion about which variable takes precedence.

---

## How It Works Now

### Default Behavior (No Variable Set)

**Development:**
```bash
npm run dev
# Automatically uses LOG_LEVEL=DEBUG (all logs visible)
```

**Production (Vercel):**
```
# Automatically uses LOG_LEVEL=INFO
# Shows: info, warn, error, perf, cost, metrics
# Hides: debug (verbose logs)
```

### Explicit Control

Override the default by setting `LOG_LEVEL`:

```bash
# Local development - see everything
LOG_LEVEL=DEBUG npm run dev

# Production - recommended setting
LOG_LEVEL=INFO

# Very quiet production - only warnings and errors
LOG_LEVEL=WARN

# Troubleshooting - only errors
LOG_LEVEL=ERROR
```

---

## Log Levels Explained

| Level | What's Logged | When to Use |
|-------|---------------|-------------|
| **DEBUG** | Everything (verbose) | Local development, debugging |
| **INFO** | Info + warn + error + perf + cost + metrics | **Production (default)** ⭐ |
| **WARN** | Warnings and errors only | Very quiet production |
| **ERROR** | Errors only | Troubleshooting specific issues |

---

## Production Setup

### Recommended: Don't Set Anything

The defaults are perfect:
- ✅ Development: `DEBUG` (automatic)
- ✅ Production: `INFO` (automatic)

**No environment variable needed!**

### Advanced: Override in Vercel

If you need different settings:

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `LOG_LEVEL=INFO` (or your preference)
3. Choose environment: Production / Preview / Development
4. Save and redeploy

---

## What This Means for Cost Tracking

**Good news:** Cost tracking (`logger.cost()`) uses `INFO` level, so it's **always visible in production** with the default settings.

You'll see:
- ✅ Cache hit/miss logs
- ✅ Token usage per request
- ✅ Model used
- ✅ Performance timings

Even without setting any environment variables!

---

## Migration Guide

### If You Previously Set ENABLE_DEBUG_LOGGING

**Old way:**
```bash
# .env.local (development)
ENABLE_DEBUG_LOGGING=true

# Vercel (production)
ENABLE_DEBUG_LOGGING=false
```

**New way:**
```bash
# .env.local (development)
# Nothing needed - DEBUG is automatic!

# Vercel (production)
# Nothing needed - INFO is automatic!
```

**If you had custom overrides:**
```bash
# Old
ENABLE_DEBUG_LOGGING=false  # Quiet production

# New equivalent
LOG_LEVEL=WARN
```

### Cleanup Steps

1. **Remove from `.env.local`:**
   ```diff
   - ENABLE_DEBUG_LOGGING=true
   ```

2. **Remove from Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Delete `ENABLE_DEBUG_LOGGING` if present

3. **Add LOG_LEVEL only if you need non-default behavior**

---

## Quick Reference

### Common Scenarios

**"I want to see everything during development"**
```bash
# No action needed - DEBUG is default in dev
npm run dev
```

**"I want production logs with cost tracking"**
```bash
# No action needed - INFO is default in production
# Deploy to Vercel, logs appear automatically
```

**"I want very quiet production (warnings/errors only)"**
```bash
# In Vercel environment variables
LOG_LEVEL=WARN
```

**"I need to debug a production issue temporarily"**
```bash
# In Vercel environment variables
LOG_LEVEL=DEBUG

# After debugging, remove the variable to revert to INFO
```

---

## Vercel Search Queries (Unchanged)

All your favorite searches still work:

```
# All errors
level:ERROR

# Cache hits
message:"[COST]" data.cacheHit:true

# High token usage
data.tokensUsed > 2000

# Slow requests
data.duration > 5000
```

---

## Summary

✅ **Simpler:** One variable instead of two
✅ **Clearer:** No confusion about precedence
✅ **Smarter:** Sensible defaults (DEBUG in dev, INFO in prod)
✅ **Cost-aware:** INFO level includes all cost tracking
✅ **Flexible:** Override when needed with `LOG_LEVEL`

**Bottom line:** You probably don't need to set anything. The defaults are perfect for most use cases!
