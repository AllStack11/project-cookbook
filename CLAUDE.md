# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## ⚠️ Project status: mid-overhaul

This repo is in the middle of a **complete architecture overhaul and pivot**:
from a public, ad-supported freemium product to a **private app for the
owner and a small friend group**, hosted on Cloudflare instead of Vercel,
with a rebuilt extraction backend and new social features (user profiles,
shared recipe pool, cook-log/ratings/notes, a cuisine/food picker,
notifications).

- **The code in this repo right now is still v1** — Next.js on Vercel,
  OpenRouter for extraction, no auth, anonymous-IP rate limiting. Everything
  below the overhaul notice describes *that* current code accurately (it was
  audited and corrected as of this overhaul — see git history around
  "extraction system audit" for the full findings).
- **The target architecture is documented, not yet built.** Before making
  any change related to the overhaul, read these in order:
  1. [`REQUIREMENTS.md`](./REQUIREMENTS.md) — the full feature scope, and why
     each decision was made.
  2. [`docs/architecture/README.md`](./docs/architecture/README.md) — the
     technical design (stack, data model, extraction pipeline redesign,
     notifications, API surface).
  3. [`docs/design/ux-flows.md`](./docs/design/ux-flows.md) — screens/flows.
  4. [`BUILD_GUIDE.md`](./BUILD_GUIDE.md) — the phased implementation plan.
- If you're asked to work on something covered by the overhaul, follow those
  docs, not the v1 description below. If you're asked to fix a bug in the
  still-live v1 app before the cutover, the sections below are accurate for
  that.
- **Do not silently mix v1 and v2 assumptions** — e.g. don't add anonymous-IP
  rate limiting to new v2 code, and don't assume Cloudflare bindings exist in
  code that's still running on Vercel. If it's unclear which world a task
  belongs to, ask.

---

## Project Overview (v1 — current live code)

**Just The Recipe** is a Next.js web application that extracts clean,
structured recipes from various sources (YouTube videos, blog posts, social
media) using LLM-powered content parsing. The current live version is a
public, stateless, serverless app on Vercel with a freemium model (free tier
+ ad-supported). **This model is being retired** — see the overhaul notice
above.

## Tech Stack (v1 — current live code)

- **Framework**: Next.js 14 with App Router (TypeScript)
- **Styling**: Tailwind CSS
- **LLM Integration**: OpenRouter gateway (OpenAI-compatible API), currently
  configured with free-tier models (`meta-llama/llama-3.1-8b-instruct`
  primary, `amazon/nova-micro-v1` fallback) — see `.env.example` for the
  actual configured chain. *(Note: earlier versions of this doc described
  Google Gemini directly; the app migrated to OpenRouter — see commit
  `9eaf1d2`. If you find another doc or comment still referencing Gemini,
  it's stale — fix it, don't trust it.)*
- **Content Extraction**:
  - `youtube-transcript` + direct timedtext endpoint + YouTube Data API v3
    fallback, for YouTube
  - Cheerio for generic web scraping, with JSON-LD `Recipe` structured-data
    detection (currently extracted but not actually used to skip the LLM
    call — a known gap, see the extraction pipeline audit)
  - `puppeteer-core` + `@sparticuz/chromium` for Instagram
  - TikTok/Twitter/Facebook/Pinterest/Reddit are URL-validated but fall
    through to the generic scraper — not reliably extracted today
- **Database**: Drizzle ORM against Neon Postgres, used only for anonymous
  extraction analytics (no user accounts exist in v1)
- **Caching**: Vercel KV, URL-based
- **Hosting**: Vercel (serverless functions + CDN)
- **Payment/Ads**: Stripe + Google AdSense (planned/partial, tied to the
  freemium model being retired)

## Development Commands

```bash
npm install
npm run dev
npm run build
npm start
npm run lint
npm run type-check
npm run validate-deploy    # Vercel-specific pre-deploy checks
npm run pre-deploy
```

## Architecture & Key Concepts (v1)

### Request Flow

1. User submits URL or pastes text content.
2. Serverless function fetches content (YouTube transcript, webpage HTML,
   etc.) — see `lib/extractors/`.
3. Content is preprocessed to reduce token count — `lib/extractors/preprocessor.ts`.
4. Content sent to the LLM via `lib/llm/provider.ts` with a structured-output
   JSON schema.
5. Response is parsed/validated — `lib/llm/responseParser.ts`,
   `lib/validators/recipeValidator.ts`.
6. Recipe card rendered.

### Cost Optimization (v1 — was central to a public freemium product; not the
   organizing constraint for v2, see `docs/architecture/stack-decision.md`)

- URL-based caching (Vercel KV), 30-day blog / 7-day social TTLs.
- Token budget truncation (`lib/utils/tokenCounter.ts`), max ~3,000 input
  tokens.
- Free-tier model selection, monthly spend cap (`lib/llm/budgetGuard.ts`) —
  **note**: the pricing table in that file doesn't actually price either
  model currently configured; the cap has been enforcing against a guessed
  rate. Fix this if you touch budget logic before the v2 cutover.
- Per-IP rate limiting (10/day free tier), VPN/CAPTCHA suspicion scoring.
  **This entire category goes away in v2** — it exists only because v1 has
  no authentication.

### Structured Recipe Format

See `types/recipe.ts` for the canonical `Recipe` interface — ingredients,
instructions, timing, nutrition, source metadata, confidence score. The v2
data model (`docs/architecture/data-model.md`) extends this shape into a
relational schema (recipes table + tags + cook-log + notes) rather than
changing the core recipe fields.

### Validation & Quality Checks

`lib/validators/recipeValidator.ts` checks: required fields present, ≥2
ingredients, ≥2 instructions, no hallucination/placeholder keywords, no
ingredients that look like instructions. `calculateConfidenceScore()` scores
0-100. Known gap: the `isGenerated` penalty never fires because the LLM
output schema doesn't include that field — see
`docs/architecture/extraction-pipeline.md` for the fix, worth applying to
v1 too if it's not been retired yet by the time you read this.

### Error Handling

Retry with exponential backoff on LLM/network failures
(`lib/utils/retry.ts`), user-facing `ErrorCode`/`StatusCode` distinctions
(`types/api.ts`) rather than one generic error message. Keep this pattern —
it carries forward into v2's API design (`docs/architecture/api-design.md`).

## Project Structure

```
/app                    # Next.js App Router pages + API routes
  /api/extract           # Main v1 extraction endpoint
/lib
  /extractors            # Content fetchers (YouTube, web, Instagram)
  /llm                    # LLM provider abstraction, prompts, parsing, budget
  /cache                  # KV-based URL cache
  /validators             # Recipe + content + URL validation
  /db                      # Drizzle/Neon — v1 anonymous analytics only
  /utils                   # Logging, rate limiting, SSRF checks, etc.
/docs/architecture       # v2 technical design — READ BEFORE BUILDING v2
/docs/design              # v2 UX flows
/REQUIREMENTS.md          # v2 feature scope and rationale
/BUILD_GUIDE.md           # v2 phased implementation plan
```

## Important Constraints & Guidelines

### Security

Known, documented issues as of the last audit (fix opportunistically, or as
part of the v2 extraction pipeline rewrite per `docs/architecture/extraction-pipeline.md`):

- SSRF: `lib/utils/urlSanitizer.ts`'s DNS-based private-IP check has a
  TOCTOU gap — it resolves DNS once to check, then `fetch()` re-resolves
  independently, leaving a DNS-rebinding window.
- IPv6 private-range coverage is incomplete (misses the pure-hex form of
  IPv4-mapped addresses).
- `extractClientIp()` trusts `x-forwarded-for` without validating it came
  through a trusted proxy — fine behind Vercel/Cloudflare's edge, not safe
  to assume elsewhere.

### Copyright & Compliance

Attribution links to original sources; users should only extract recipes
they have permission to use. This guidance still applies in v2 even though
the audience is now private, not public.

## Branching & Merging

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) — one branch per unit of work,
cut from current `main`, squash-merged, deleted after merge. **A merged
branch is finished — never push follow-up commits to it.** Follow-up work
always gets a new branch from the then-current `main`.

## Work Log

All project changes, decisions, and progress should be tracked in
[WORK_LOG.md](WORK_LOG.md). Update it when completing a development phase,
making an architectural decision, fixing a significant bug, or deploying.
Use `/log-update` or edit the file directly. **Remind the user to update the
log, or offer to do it, at the end of a task** if it hasn't been done.

## Environment Variables (v1 — current)

See `.env.example` for the full current list (`OPENROUTER_API_KEY`,
`LLM_PRIMARY_MODEL`/`LLM_FALLBACK_MODEL`, `YOUTUBE_API_KEY`,
`KV_REST_API_URL`/`TOKEN`, `DATABASE_URL`, rate-limit/AdSense/Stripe vars).
v2's environment variables (Cloudflare bindings, better-auth/Google OAuth
secrets, VAPID keys) are covered in `BUILD_GUIDE.md` Phase 0 — don't conflate
the two lists.
