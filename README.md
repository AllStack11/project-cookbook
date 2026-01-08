# Recipe Extractor

A Next.js web application that extracts clean, structured recipes from various sources (YouTube videos, blog posts, social media) using LLM-powered content parsing.

## Features

- **Multi-Source Support**: Extract recipes from YouTube, blogs, Instagram, TikTok, and more
- **AI-Powered Extraction**: Uses DeepSeek AI to intelligently parse recipe content
- **Clean Output**: Structured recipe format with ingredients, instructions, and metadata
- **Cost-Optimized**: Smart caching and token reduction strategies
- **Rate Limited**: Free tier with 10 extractions per day
- **Print & Copy**: Easy export options for extracted recipes

## Tech Stack

- **Framework**: Next.js 14 with App Router (TypeScript)
- **Styling**: Tailwind CSS
- **LLM Integration**: DeepSeek API (deepseek-chat for cost efficiency, deepseek-reasoner for complex extractions)
- **Content Extraction**: youtube-transcript, Cheerio
- **Testing**: Jest + React Testing Library
- **Hosting**: Vercel-ready (serverless functions + CDN)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- DeepSeek API key (sign up at https://platform.deepseek.com)

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
# LLM API - DeepSeek
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_BASE_URL=https://api.deepseek.com

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
  /llm               # LLM integration (DeepSeek client, prompts)
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
5. **LLM Processing**: Send to DeepSeek with structured prompt
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
3. **Model Selection**: Use deepseek-chat by default, upgrade to deepseek-reasoner only when needed
4. **Rate Limiting**: Prevent abuse with 10 requests/day free tier

## Environment Variables

See [.env.example](.env.example) for all available environment variables.

Required:
- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `DEEPSEEK_BASE_URL`: DeepSeek API base URL (default: https://api.deepseek.com)

Optional:
- `REDIS_URL`: Redis connection for production caching
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per day (default: 10)

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel settings
4. Deploy

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
