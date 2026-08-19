# Stack Decision

This evaluates Cloudflare against the requirements in `REQUIREMENTS.md` and
records what we're actually building on. Facts below (pricing, model
availability, adapter maturity) were checked in August 2026 — re-verify
anything cost-critical before writing a check, this platform moves fast.

## Why Cloudflare fits

The requirements are: private, small (single-digit-to-dozens of users), needs
relational data with social features (cook-log, ratings, notes), needs object
storage (photos, PDFs), needs a multimodal extraction pipeline, needs push
notifications, needs to be an installable PWA. Cloudflare's free/cheap tiers
line up well with "small friend group," and one vendor covers compute,
database, object storage, cache, queues, and (optionally) AI inference —
fewer moving parts than stitching together Vercel + Neon + Upstash + S3 +
something for queues, which is closer to what the current app does.

Concretely, at this scale, the whole stack should run **inside Cloudflare's
free tier or close to it**:

| Service | Free tier | Relevant limit |
|---|---|---|
| Workers | 100k requests/day | Plenty for a friend group |
| D1 | 5M rows read/day, 100K rows written/day, 5GB storage | Plenty; paid is $0.001/M read, $1/M written, $0.75/GB-mo beyond that |
| R2 | 10GB storage, 1M Class A ops, 10M Class B ops/mo, **no egress fee** | Photos/PDFs won't come close for a friend group |
| KV | Included in Workers plans | Extraction cache |
| Queues | 10k ops/day free; 1M ops/mo on the $5 Workers Paid plan | OCR jobs + notification fan-out |
| Workers AI | 10,000 Neurons/day free, cheap usage-based beyond that | OCR pre-processing *and* the extraction reasoning step (see below) |

The one paid line item worth planning for is Workers Paid ($5/mo) once
Queues volume or Workers AI usage exceeds free-tier — trivial for this use
case, and still an order of magnitude cheaper than the infra sprawl the
current app was designed against public traffic for.

## Component-by-component decisions

### Compute + frontend: Next.js on Workers via OpenNext, not a rewrite

**Decision**: Keep Next.js (App Router), deploy via `@opennextjs/cloudflare`
onto Cloudflare Workers.

**Why not rewrite the frontend**: The codebase, patterns, and your own
familiarity with Next.js are a real asset. A full rewrite to a
Workers-native framework (Hono + a SPA, SvelteKit, Remix) buys marginal
runtime benefit for a private app at this scale and costs weeks of redoing
UI that already works.

**Risk to watch**: the OpenNext Cloudflare adapter hit a 1.0-beta in 2025 and
is actively maturing, but Cloudflare's own docs are still cautious about
"mission-critical production" use as of this writing. For a private app used
by friends, that risk profile is acceptable — worst case is a rough edge in
an edge-case API route, not an outage that costs you customers. **Plan B if
the adapter causes real friction during the build**: fall back to a
Workers-native stack (Hono for API routes + Vite/React for the frontend,
still deployed as a Worker with static assets). Don't decide this
speculatively — try the OpenNext path first since it's the lower-cost option
if it works, and only fall back if it visibly doesn't.

### Database: D1 (SQLite) via Drizzle

**Decision**: Cloudflare D1, accessed through Drizzle ORM.

**Why**: The repo already uses Drizzle (`lib/db/schema.ts`,
`drizzle.config.ts`) against Neon Postgres — Drizzle has first-class D1
support, so this is a dialect swap (`pg-core` → `sqlite-core`,
`drizzle-orm/neon-http` → `drizzle-orm/d1`), not a new tool to learn. D1 is
SQLite, which is a real constraint (no native arrays/jsonb the way Postgres
has them — see `data-model.md` for how that's handled), but for this data
shape (users, recipes, tags, cook-log rows, ratings, notes, notifications) a
relational SQLite schema is a completely natural fit, not a compromise.

**Rejected alternative**: staying on Neon Postgres. Works fine technically,
but re-introduces an external vendor for zero benefit once compute has
already moved to Workers — D1 is billed per-query with no idle cost, is
already inside the account, and this app's data model doesn't need anything
Postgres-only (no complex joins-at-scale, no need for `jsonb` querying —
the current schema literally stores the whole recipe as an opaque JSON blob
and never queries into it).

### Object storage: R2

**Decision**: Cloudflare R2 for recipe images and OCR/PDF uploads.

**Why**: Zero egress fees matter here specifically because recipe images and
photos get *read* a lot (every time a recipe card renders) relative to how
often they're written. S3-compatible API, so if you ever do want to migrate
off, the exit cost is low.

### Cache: KV

**Decision**: Cloudflare KV replaces Vercel KV for the URL-based extraction
cache (see `extraction-pipeline.md`). Direct swap — the current
`lib/cache/cacheClient.ts` cache-key logic (SHA-256 of normalized URL) ports
as-is, only the KV client changes.

### Background jobs: Queues

**Decision**: Cloudflare Queues for anything that shouldn't block a request:

- OCR/PDF processing (upload → queue message → Worker consumer runs
  Workers AI vision + the extraction LLM → writes result → triggers a
  notification)
- Notification fan-out (one cook-log event can need to notify several
  friends — don't do that synchronously in the request that logged the cook)

### Auth: better-auth + Google OAuth

**Decision**: [better-auth](https://www.better-auth.com/) with the
[`better-auth-cloudflare`](https://github.com/zpg6/better-auth-cloudflare)
integration (D1 session/account storage), Google as the OAuth provider.

**Known issue to test for early**: there's an open better-auth bug (#4203,
reopened Jan 2026) where sessions can get force-expired after 5 minutes
regardless of configured session lifetime, in some D1/KV configurations.
Verify this is fixed or work around it (e.g. session stored purely in D1,
not split across KV) before relying on long-lived sessions — don't discover
this after friends are getting logged out constantly.

**Fallback**: Auth.js (NextAuth) core also runs on edge runtimes and has
community D1 adapters, if better-auth proves unstable in practice.

**Access control on top of OAuth**: Google OAuth alone authenticates *a*
Google account, not *the right* Google accounts — this app needs to reject
sign-in from anyone outside the friend group. Decision: **invite
link/code**, not a static email allowlist. Mechanism: an `invites` row
(`data-model.md`) holds a single-use code; any existing member can generate
one and send the link to a friend. The invite code is captured before the
Google OAuth redirect (e.g. as a query param on the sign-in page, carried
through in a short-lived signed cookie/state param) and validated in a
better-auth `user.create` hook — on redemption, mark the invite row used and
link it to the new user; if no valid, unused, unexpired invite is present at
account-creation time, the hook rejects the sign-up. Existing members simply
log in via Google as normal — the gate only applies to *account creation*,
not every sign-in.

### AI / extraction model: Workers AI end-to-end, on a large-enough model

**Decision**: keep AI usage entirely inside Cloudflare — no external LLM
vendor (no OpenRouter, no direct Anthropic/OpenAI). Workers AI does both
jobs in the pipeline:

1. **Vision models** (e.g. Moondream 3 or the Gemma vision line, both of
   which explicitly support OCR/document parsing as of 2026) do the *first
   pass* on photo and PDF sources — pull raw text out of an image of a
   cookbook page, handwritten card, or PDF page.
2. **A large text model** does the actual structured extraction reasoning
   (raw text → validated `Recipe` JSON) for every source type, photo/PDF
   included after OCR. Workers AI's catalog includes real quality options
   beyond the 7B/8B tier — Llama 3.3 70B, Qwen 72B, GPT-OSS-120B, DeepSeek-R1
   distills — pick one of those as the default, benchmark a couple against
   real extraction cases during Phase 2 of `BUILD_GUIDE.md`, and **do not
   default to a 7B/8B-class model** (Llama 3.1 8B, Mistral 7B, etc.) for the
   reasoning step — that's the same size class as the
   `meta-llama/llama-3.1-8b-instruct` model already in place today, which is
   what's producing the failure rate this overhaul exists to fix. Using a
   small model on a different vendor doesn't fix that; it just moves it.
3. **Structured output is preserved.** Workers AI supports OpenAI-compatible
   JSON mode with a schema declaration, so the existing strict
   `RECIPE_JSON_SCHEMA` approach (`additionalProperties: false`, etc. — see
   `extraction-pipeline.md`) ports over as-is; the security value of
   bounding what the model can emit doesn't depend on which vendor is behind
   it.

**Cost**: Workers AI includes a free daily allowance (10,000 Neurons/day,
Cloudflare's unified inference-cost unit across model types) — at
friend-group extraction volume this should realistically land at **$0/month**
for the reasoning step, same conclusion as the rest of the stack. Even
sustained paid usage bills in fractions of a cent per unit beyond the free
pool, and it's happening inside the Workers Paid subscription already
budgeted for Browser Rendering, not a new line item.

**Rejected**: an external frontier-tier LLM (Claude/GPT-4-class via
OpenRouter or direct) was considered — cost analysis showed it would also
land under $5/month at this volume, so cost wasn't the deciding factor
either way. Staying entirely on Workers AI wins on simplicity (one fewer
vendor, no API key to manage, no egress to an external API) as long as the
model-size discipline above is followed. If a large Workers AI model turns
out not to hit the target failure rate in practice during Phase 2, revisit
this — the `lib/llm/provider.ts`-style abstraction should stay
provider-agnostic enough that swapping the reasoning step back to an
external model later is a config change, not a rewrite.

### Push notifications: Web Push (VAPID), no Firebase

**Decision**: Standard Web Push API with VAPID keys, using an edge-compatible
library built on Web Crypto (not the Node-only `web-push` npm package, which
doesn't run on Workers). This needs no third-party push service — it's a
web standard, works with the installable PWA plan directly, and avoids
adding Firebase as another vendor for a private app.

### PWA shell

**Decision**: Standard `manifest.json` + service worker for
installability/offline shell, served as static assets from the Worker.
Nothing exotic needed here — this is well-trodden ground for Next.js PWAs.

---

## What this replaces from the current app

| Current (v1) | v2 |
|---|---|
| Vercel serverless functions | Cloudflare Workers (via OpenNext) |
| Vercel KV | Cloudflare KV |
| Neon Postgres (anonymous analytics only) | D1 (real user-owned relational data) |
| No object storage | R2 |
| No auth (anonymous by IP) | better-auth + Google OAuth |
| Per-IP rate limiting, VPN/CAPTCHA detection | removed — private, invite-only |
| AdSense, Stripe, freemium tiers | removed |
| OpenRouter free-tier model chain | OpenRouter (or direct) with a real-quality model |
| No push notifications | Web Push (VAPID) + in-app feed |
| No background jobs | Cloudflare Queues |
