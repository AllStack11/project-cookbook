# Just The Recipe

> **This project is mid-overhaul.** It's pivoting from the public app
> described below to a private app for a small friend group, rebuilt on
> Cloudflare with a redesigned extraction backend and new social features
> (shared recipe pool, cook-log/ratings/notes, a cuisine picker,
> notifications). The code in this repo today is still the v1 app described
> below and continues to work as documented. For where this is headed, see
> [`REQUIREMENTS.md`](./REQUIREMENTS.md), [`docs/architecture/`](./docs/architecture/README.md),
> and [`BUILD_GUIDE.md`](./BUILD_GUIDE.md).

A Next.js web application that extracts clean, structured recipes from various sources (YouTube videos, blog posts, social media) using LLM-powered content parsing.

## Features

- **Multi-Source Support**: Extract recipes from YouTube, blogs, Instagram, TikTok, and more
- **AI-Powered Extraction**: Uses a provider-agnostic LLM gateway (OpenRouter by default) to parse recipe content
- **Clean Output**: Structured recipe format with ingredients, instructions, and metadata
- **Cost-Optimized**: Smart caching and token reduction strategies
- **Rate Limited**: Free tier with 10 extractions per day
- **Print & Copy**: Easy export options for extracted recipes

## Tech Stack

- **Framework**: Next.js 14 with App Router (TypeScript)
- **Styling**: Tailwind CSS
- **LLM Integration**: OpenRouter gateway (OpenAI-compatible API)
- **Content Extraction**: youtube-transcript, Cheerio
- **Testing**: Jest + React Testing Library
- **Hosting**: Vercel-ready (serverless functions + CDN)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenRouter API key (get from https://openrouter.ai/keys)

### Installation

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd project-cookbook
```

2. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Verify installation: `node --version`

3. **Install dependencies**

```bash
npm install
```

4. **Set up environment variables**

Create a `.env.local` file in the root directory:

```bash
# LLM Gateway (OpenRouter)
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_FREE_PRIMARY_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
LLM_FREE_SECONDARY_MODEL=openrouter/free
LLM_PAID_FALLBACK_MODEL=qwen/qwen-2.5-7b-instruct
# Optional compatibility override:
# LLM_ALLOWED_MODELS=nvidia/nemotron-3-nano-30b-a3b:free,openrouter/free,qwen/qwen-2.5-7b-instruct
LLM_MAX_MONTHLY_SPEND_USD=10
LLM_REQUEST_TIMEOUT_MS=25000

# Caching (optional - in-memory by default)
# REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=10

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Project Structure

```
/app
  /api
    /extract         # Main extraction API endpoint
  /components        # React components
    /InputForm
    /RecipeCard
    /LoadingState
    /ErrorDisplay
  layout.tsx         # Root layout
  page.tsx           # Home page
  globals.css        # Global styles

/lib
  /extractors        # Content extraction (YouTube, web scraping)
  /llm               # LLM integration (provider adapter, prompts, budget guard)
  /cache             # Caching layer
  /validators        # Input and recipe validation
  /utils             # Utility functions

/types               # TypeScript type definitions
/__tests__           # Unit and integration tests
/public              # Static assets
```

## How It Works

1. **User Input**: User submits a URL or pastes recipe text
2. **Content Extraction**:
   - YouTube: Fetch transcript using youtube-transcript
   - Blogs: Scrape content using Cheerio (with ad/navigation removal)
   - Text: Direct input
3. **Preprocessing**: Reduce token count by 50-70% (remove ads, navigation, etc.)
4. **Cache Check**: Look for cached recipe by URL
5. **LLM Processing**: Send to configured LLM gateway with structured prompt and JSON output constraints
6. **Validation**: Verify recipe has required fields (2+ ingredients, 2+ steps)
7. **Display**: Show formatted recipe with print/copy options

## Testing

The application includes comprehensive unit tests for:

- Validators (recipe, URL)
- Extractors (YouTube, web scraper, preprocessor)
- LLM components (client, prompt builder, response parser)
- Utilities (token counter, rate limiter)

Run tests:

```bash
npm test
```

Coverage report:

```bash
npm run test:coverage
```

## Cost Optimization

The app implements several cost-saving strategies:

1. **Caching**: URL-based caching with 30-day TTL (blogs) / 7-day TTL (social media)
2. **Token Reduction**: Strip ads, navigation, comments (50-70% reduction)
3. **Model Policy**: Try `nvidia/nemotron-3-nano-30b-a3b:free`, then `openrouter/free`, and only then a cheap paid fallback on provider/runtime failures (timeouts, 429/5xx, transport issues)
4. **Rate Limiting**: Prevent abuse with 10 requests/day free tier

## Logging & Monitoring

**Vercel Native Logs** - No external service required for basic logging:

- All logs automatically captured by Vercel and available in your dashboard
- Structured JSON format for easy searching and filtering
- Search by context, level, custom fields (cache hits, token usage, etc.)
- Track cost metrics: LLM usage, cache hit rate, processing times
- **Free** on Vercel (1-hour retention) or add Log Drains for long-term storage

**Quick Setup:**
1. Deploy to Vercel (logs automatically captured - **no configuration needed!**)
2. View at: `Vercel Dashboard → Your Project → Logs`
3. Search for cost metrics: `message:"[COST]"`
4. Monitor cache hits: `data.cacheHit:true`
5. (Optional) Set `LOG_LEVEL=INFO` in Vercel for custom control

**📖 For detailed logging guide, see [LOGGING.md](LOGGING.md) or [simplified guide](docs/LOGGING_SIMPLIFIED.md)**

This includes:
- Logger API reference and examples
- Cost tracking patterns for LLM optimization
- Vercel log search queries
- Optional Log Drains setup (Better Stack, Datadog, etc.)
- Best practices for structured logging

## Environment Variables

See [.env.example](.env.example) for all available environment variables.

Required:

- `OPENROUTER_API_KEY`: Your OpenRouter API key

Optional:

- `REDIS_URL`: Redis connection for production caching
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per day (default: 10)

## Deployment

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

**Simple steps:**

1. Push your code to GitHub
2. Connect to Vercel (visit [vercel.com/new](https://vercel.com/new))
3. Add these environment variables in Vercel dashboard:
   - `OPENROUTER_API_KEY` (required)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
   - `ENABLE_DEBUG_LOGGING=false` (for production)
4. Click "Deploy"

**📖 For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

This includes:
- Step-by-step Vercel setup
- Environment variables reference
- Vercel KV caching setup (recommended)
- Puppeteer/Instagram extraction configuration
- Cost monitoring and optimization tips
- Troubleshooting guide

### Manual Deployment

```bash
npm run build
npm start
```

## Known Limitations

- YouTube videos must have transcripts enabled
- Some websites may block scraping
- Free tier limited to 10 extractions per day
- Accuracy depends on content quality and structure

## Future Enhancements

- User accounts & saved recipes
- Browser extension
- Mobile apps
- Recipe editing capabilities
- Meal planning features
- Multi-language support

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.
