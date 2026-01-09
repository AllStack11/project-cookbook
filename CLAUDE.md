# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Just The Recipe** is a Next.js web application that extracts clean, structured recipes from various sources (YouTube videos, blog posts, social media) using LLM-powered content parsing. The app follows a stateless, serverless architecture with a freemium business model (ad-supported free tier + premium subscription).

## Tech Stack

- **Framework**: Next.js 14 with App Router (TypeScript)
- **Styling**: Tailwind CSS
- **LLM Integration**: Google Gemini API (gemini-2.5-flash-lite for cost efficiency and speed)
- **Content Extraction**:
  - `youtube-transcript` for YouTube videos
  - Cheerio for web scraping
  - `puppeteer-core` + `@sparticuz/chromium` for Instagram (Vercel-compatible)
- **Payment**: Stripe for subscriptions
- **Ads**: Google AdSense
- **Hosting**: Vercel (serverless functions + CDN)
- **Caching**: Redis or Vercel KV (URL-based caching for cost optimization)
- **Analytics**: Plausible Analytics or Google Analytics

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run type checking
npm run type-check

# Deployment validation
npm run validate-deploy    # Full pre-deployment checks
npm run pre-deploy         # Type-check + lint + validate
```

## Architecture & Key Concepts

### Request Flow

1. User submits URL or pastes text content
2. Serverless function fetches content (YouTube transcript, webpage HTML, etc.)
3. Content is preprocessed to reduce token count (remove ads, navigation, comments)
4. Content sent to LLM API with structured prompt for recipe extraction
5. LLM response parsed into structured JSON format
6. Recipe card rendered with ingredients, instructions, metadata

### Critical Cost Optimization Strategies

**IMPORTANT**: Cost management is central to this project's sustainability. Always consider:

1. **Caching First**: Check cache before making LLM API calls
   - URL-based caching with Redis/Vercel KV
   - 30-day TTL for blog posts, 7-day for social media
   - Target: 40-60% cache hit rate

2. **Token Optimization**: Minimize input tokens before LLM calls
   - Strip ads, navigation, comments, footer content (50-70% reduction)
   - YouTube: Extract only cooking/recipe portions using timestamps
   - Maximum token limit: 3,000 tokens input

3. **Model Selection**:
   - Currently using gemini-2.5-flash-lite for all extractions
   - Gemini offers competitive pricing with structured output support
   - Future: Consider gemini-2.0-flash-thinking-exp for complex content requiring reasoning

4. **Rate Limiting**:
   - Free tier: 10 extractions/day per IP
   - CAPTCHA after 3 rapid extractions
   - Monitor for abuse patterns

### Structured Recipe Format

LLM responses should be parsed into this JSON structure:

```typescript
interface Recipe {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  ingredients: Array<{
    item: string;
    amount?: string;
    unit?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
  }>;
  notes?: string[];
  sourceUrl?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
}
```

### Validation & Quality Checks

Always validate LLM extraction responses for:

- Required fields present (ingredients, instructions)
- Ingredients list has at least 2 items
- Instructions list has at least 2 steps
- No obvious hallucinations or placeholder text
- Target accuracy: 95% successful extractions

### Error Handling

- Implement retry logic for LLM API failures (max 3 retries with exponential backoff)
- Provide user-friendly error messages for:
  - No recipe found in content
  - Rate limit exceeded
  - Invalid URL format
  - Content extraction failures
- Log errors for monitoring and prompt refinement

## Project Structure

```
/app                    # Next.js App Router pages
  /api                  # API routes (serverless functions)
    /extract            # Main extraction endpoint
  /components           # React components
    /RecipeCard         # Recipe display component
    /InputForm          # URL/text input component
  /lib                  # Utility functions
    /extractors         # Content fetchers (YouTube, web scraping)
    /llm                # LLM integration & prompt management
    /cache              # Caching layer
    /validators         # Recipe validation logic
/public                 # Static assets
/styles                 # Global styles (Tailwind config)
```

## Development Phases

### Phase 1: MVP (Weeks 1-3)

- Basic Next.js setup with TypeScript + Tailwind
- Input form with URL validation
- YouTube transcript & web scraping
- LLM integration with prompt engineering
- Recipe card display with print/copy functionality

### Phase 2: Monetization (Week 4)

- Google AdSense integration
- Stripe subscription setup
- Session-based ad-free mode

### Phase 3: Optimization (Weeks 5-6)

- Caching implementation
- Rate limiting
- Analytics integration
- Performance optimization

## Important Constraints & Guidelines

### Copyright & Compliance

- Focus on YouTube (public API) and public blog content
- Add attribution links to original sources
- Communicate that users should only extract recipes they have permission to use

### Cost Monitoring

- Set up budget alerts in Vercel, Stripe, and LLM provider dashboards
- Build internal dashboard tracking: API calls, cache hit rate, cost per extraction
- Implement emergency kill switch if costs spiral

### Success Metrics

- Extraction accuracy: 95%+
- Processing time: <5 seconds
- Cache hit rate: 40-60%
- Error rate: <5%
- Conversion rate: 2-5% (free to paid)

## Vercel Deployment

### Prerequisites

- Vercel account ([sign up](https://vercel.com))
- GitHub repository connected
- Google Gemini API key ([get here](https://aistudio.google.com/app/apikey))

### Deployment Status: ✅ READY

The project is **fully configured and tested** for Vercel deployment with:

- ✅ **Puppeteer/Instagram Support**: Using `@sparticuz/chromium` + `puppeteer-core` (serverless-compatible)
- ✅ **Pre-Deployment Validation**: Automated checks via `npm run validate-deploy`
- ✅ **Vercel Configuration**: Optimized `vercel.json` with function timeouts and CORS
- ✅ **Environment Variables**: Documented in `.env.example`
- ✅ **Build Verification**: TypeScript + lint + build all passing
- ✅ **Documentation**: Comprehensive guides in `DEPLOYMENT.md` and `DEPLOYMENT_CHECKLIST.md`

### Quick Deploy (3 Steps)

1. **Validate deployment readiness:**
   ```bash
   npm run validate-deploy
   ```
   Expected output: `✓ Project is ready for Vercel deployment!`

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "feat: Deploy to Vercel"
   git push origin main
   ```

3. **Deploy on Vercel:**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Add environment variables:
     - `GEMINI_API_KEY` (required)
     - `NEXT_PUBLIC_APP_URL` (your Vercel URL, e.g., `https://your-app.vercel.app`)
     - `ENABLE_DEBUG_LOGGING=false` (for production)
   - Click "Deploy"

### Post-Deployment Setup

**Highly Recommended:**

1. **Set up Vercel KV for caching:**
   - Go to Vercel dashboard → Storage → Create Database → KV
   - Environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) added automatically
   - Redeploy to activate caching
   - **Impact**: Reduces LLM API costs by 40-60%

2. **Set up budget alerts:**
   - Gemini: [Google AI Studio](https://aistudio.google.com) → Usage & Billing
   - Vercel: Dashboard → Usage & Billing → Notifications
   - Set alerts at comfortable thresholds

3. **Monitor first 24 hours:**
   - Check Vercel function logs for errors
   - Verify cache hit rate in logs
   - Monitor Gemini API usage
   - Test all extraction sources (YouTube, blogs, Instagram)

### Important Notes

**Instagram Extraction:**
- Now uses `@sparticuz/chromium` (Vercel-compatible)
- Works in serverless environment
- May have slightly longer cold starts on first request

**Cost Optimization:**
- Caching reduces API costs significantly
- Target cache hit rate: 40-60%
- Monitor token usage in first week
- Consider implementing Vercel KV for persistent caching

**Troubleshooting:**
- Build fails: Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
- Runtime errors: View Vercel function logs
- Instagram issues: Verify `@sparticuz/chromium` is installed
- High costs: Check cache hit rate and implement stricter rate limiting

### Validation Script Details

The pre-deployment validation script (`npm run validate-deploy`) checks:

- ✅ Environment variables documented
- ✅ Git configuration (no sensitive files tracked)
- ✅ Package.json requirements
- ✅ Next.js and Vercel configuration
- ✅ TypeScript compilation
- ✅ Build configuration validity
- ✅ Deployment readiness

**Exit codes:**
- `0`: Ready to deploy (all checks passed)
- `1`: Errors detected (fix before deploying)

### Documentation

For detailed instructions, see:

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Complete deployment guide (300+ lines)
  - Step-by-step Vercel setup
  - Environment variables reference
  - Vercel KV caching configuration
  - Puppeteer/Instagram setup
  - Cost monitoring and optimization
  - Troubleshooting guide

- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)**: Quick reference checklist
  - Pre-deployment checks
  - Post-deployment verification
  - Monitoring tasks
  - Emergency rollback

- **[VERCEL_READY.md](VERCEL_READY.md)**: Summary of deployment readiness changes

### Rollback

If deployment has issues:

```bash
# Via Vercel CLI
vercel rollback <previous-deployment-url>

# Or via Vercel dashboard
# Deployments → Previous deployment → "..." → Promote to Production
```

## Work Log

All project changes, decisions, and progress should be tracked in [WORK_LOG.md](WORK_LOG.md).

Update the work log when:

- Completing a development phase or major feature
- Making architectural decisions
- Encountering and solving significant bugs
- Implementing cost optimizations
- Changing LLM prompts or model selection
- Deploying to production
  -Remind User to update log or offer to do it at the end of a task
  Use the command `/log-update` to add entries to the work log, or manually edit WORK_LOG.md.

## Environment Variables

Required environment variables:

```bash
# LLM API - Google Gemini
GEMINI_API_KEY=              # Google Gemini API key

# Caching
REDIS_URL=                   # Redis connection string
# OR
KV_REST_API_URL=            # Vercel KV URL
KV_REST_API_TOKEN=          # Vercel KV token

# Payment
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Analytics
NEXT_PUBLIC_ANALYTICS_ID=

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=10   # Free tier daily limit
```

## Testing Strategy

- Test extraction accuracy with diverse recipe sources:
  - Long blog posts with ads
  - Short social media captions
  - YouTube video transcripts
  - Recipe websites with structured data
- Validate cost optimization (check cache hits, token counts)
- Test rate limiting and abuse prevention
- Verify responsive design across devices
- Test payment flow end-to-end

## Future Enhancements (Post-MVP)

- User accounts & recipe collections
- Mobile apps (iOS/Android)
- Browser extension
- Recipe editing capabilities
- Meal planning & shopping lists
- Nutritional analysis
- Multi-language support
- API access for developers
