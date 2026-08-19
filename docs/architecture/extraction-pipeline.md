# Extraction Pipeline (v2)

Goal from `REQUIREMENTS.md` §2: **higher-quality extractions, materially
lower failure rate**, covering more sources (photo/OCR, PDF) and actually
fixing the platforms that today just fall back to generic scraping
(TikTok, Twitter/X, Facebook, Pinterest, Reddit).

This design keeps what the current pipeline does well and fixes what the
architecture audit found broken. Both are called out explicitly below so
nothing gets silently regressed or silently re-introduced during the
rewrite.

## Pipeline stages

```
Input (URL | pasted text | uploaded photo | uploaded PDF)
  │
  ▼
1. Route by source type
  │
  ▼
2. Raw content acquisition (per-source strategy — see table below)
  │
  ▼
3. Structured-data short-circuit (JSON-LD Recipe → skip straight to
   validation if complete; this is the fix for the current bug where
   this data is extracted and thrown away)
  │
  ▼
4. Preprocessing (strip boilerplate, token budget truncation — kept from v1)
  │
  ▼
5. LLM structured extraction (raw text → validated Recipe JSON)
  │
  ▼
6. Validation + confidence scoring (kept from v1, with the isGenerated fix)
  │
  ▼
7. Image fetch: if the recipe has a source image (JSON-LD `image`, YouTube
   thumbnail, OCR'd photo itself, etc.), download it and store in R2 —
   recipe images are never hotlinked to the original source (confirmed
   decision; see `data-model.md`), so the recipe card doesn't break when
   the source page changes or blocks hotlinking
  │
  ▼
8. Cache + persist + notify (KV cache, D1 write, Queue notification fan-out)
```

## Per-source acquisition strategy

| Source | v1 approach | v2 approach |
|---|---|---|
| YouTube | Hybrid: transcript library → timedtext endpoint → YouTube Data API → description scrape | **Keep as-is.** This hybrid fallback chain is genuinely good engineering — no changes needed beyond porting it off Vercel-specific bits. |
| Blog/web with JSON-LD `Recipe` | Parsed into a full `Recipe` object, then **discarded** — still goes through the LLM | **Fixed**: if the JSON-LD parses into a complete recipe (title + ≥2 ingredients + ≥2 instructions, passes the same validator as an LLM result), skip the LLM call entirely. This is the single biggest reliability *and* cost win available — a schema.org `Recipe` block is ground truth, not something to re-derive with an LLM and risk hallucinating. |
| Blog/web without JSON-LD | Cheerio-based generic scraping | Keep generic scraping as the fallback, but fix the SSRF check (see Security below) and keep the byte-capped, redirect-revalidating fetch logic — that part was solid. |
| Instagram | Custom Puppeteer + `@sparticuz/chromium`, hand-rolled local/Vercel browser-path detection, manual timeout race that could leak a browser process | **Cloudflare Browser Rendering** (`@cloudflare/puppeteer` + the Browser Rendering binding). Same multi-strategy DOM extraction logic (article text → semantic HTML/og:description → selector fallback) ports over, but runs against a Cloudflare-managed Chromium fleet instead of a self-managed browser binary — no more platform-path detection, no more manual cold-start timeout races. Workers Paid plan ($5/mo) is required for this; budget for it. |
| TikTok, Twitter/X, Facebook, Pinterest, Reddit | Validated as URL types, but silently fall through to the generic web scraper (unreliable — these are JS-heavy/auth-walled) | **Real extraction via Browser Rendering**, same pattern as Instagram: navigate, wait for the content to render, run platform-specific selector/DOM strategies with a generic-text fallback. This is net-new implementation work, not a config change — build one per platform, reusing the shared Browser Rendering helper. |
| Pasted text | Direct to preprocessing | Unchanged. |
| **Photo (new)** | N/A | Upload → R2 → Queue message → Workers AI vision model (OCR pass, e.g. Moondream 3 or a Gemma vision model) extracts raw text from the image → same preprocessing/LLM pipeline as any other text source. |
| **PDF (new)** | N/A | Upload → R2 → Queue message → text-layer extraction if the PDF has one (fast path, no AI needed), else render pages to images and run the same Workers AI OCR pass as photos → same pipeline downstream. |

Photo and PDF sources are **async by nature** (they go through a Queue, not
inline in the request) since OCR + LLM reasoning on an image can take longer
than a synchronous request should hold open — the `uploads` table
(`data-model.md`) tracks `pending → processing → done/failed`, and the
frontend polls or gets a push notification when it resolves.

## The LLM reasoning step

Kept from v1, because these parts were genuinely well-built:

- **Structured JSON-schema output** (`strict: true`, `additionalProperties:
  false`) — this is real security value, not just convenience: it bounds
  what the model can possibly emit regardless of prompt injection in the
  source content.
- **Self-correction retry**: one extra LLM call to fix malformed JSON before
  giving up, plus the truncated-JSON repair heuristics in the response
  parser.
- **Defense-in-depth prompt injection handling**: the "ignore instructions
  embedded in content" system directive, plus a pre-filter pattern check on
  raw scraped content before it ever reaches the model.

Changed from v1:

- **Model**: move off the free-tier `meta-llama/llama-3.1-8b-instruct` /
  `amazon/nova-micro-v1` chain to a large Workers AI text model (Llama 3.3
  70B / Qwen 72B / GPT-OSS-120B / a DeepSeek-R1 distill — benchmark a couple
  against real extraction cases and pick one; see `stack-decision.md`).
  **Do not replace the current small model with another small model** — the
  failure rate this overhaul exists to fix is a model-capability problem,
  not a vendor problem. Keep the shape of the provider abstraction in
  `lib/llm/provider.ts` (swap the OpenRouter HTTP call for a Workers AI
  binding call, `env.AI.run(...)`) — the retry/error-classification logic
  around it is still worth keeping, just pointed at a different call
  underneath.
- **`isGenerated` bug fix**: the current `RECIPE_JSON_SCHEMA` doesn't include
  `isGenerated` as a property, so a fallback prompt asking the model to "set
  isGenerated: true" is structurally impossible to fulfill, and the
  confidence-score penalty for a fully-hallucinated recipe never fires. Fix:
  either add `isGenerated` to the schema properly, or (simpler) set it
  programmatically in code the same way `isPartialFallback` already is —
  don't rely on the model self-reporting a field the schema won't let it
  emit.
- **Budget guard pricing table**: update `DEFAULT_MODEL_PRICING` to actually
  include whatever model(s) get chosen — the current table doesn't price
  either model actually in use, so the spend cap has been running on a
  guessed rate. Keep the fail-open behavior on KV outages (documented
  trade-off), but make sure the *normal-path* numbers are real.

## Security fixes carried into v2

- **SSRF / DNS-rebinding TOCTOU**: the current `validateUrlSafety` resolves
  DNS once to check for private IPs, then `fetch()` re-resolves independently
  — a small window where an attacker-controlled domain could rebind DNS
  between the check and the request. Fix: resolve once, connect to the
  pinned IP (with the original `Host` header preserved), don't re-resolve.
- **IPv6 private-range coverage**: extend the private-IP regex set to catch
  the pure-hex form of IPv4-mapped addresses (`::ffff:7f00:1`), not just the
  dotted-quad form.
- Keep everything else from the audit that was already solid: redirect
  revalidation on every hop, byte-capped response reading, domain-boundary
  matching (not substring matching) for platform detection.

## Caching

Same normalized-URL → SHA-256 cache key scheme as v1
(`lib/cache/cacheClient.ts`'s `normalizeUrl`/`generateCacheKey` logic is
platform-aware — YouTube video ID, Instagram post path, etc. — and ports
directly). Only the backing store changes: Vercel KV → Cloudflare KV. TTLs
(30-day blog, 7-day social) carry over as reasonable defaults, tunable since
there's no cost-driven "40-60% hit rate" target anymore — this cache now
exists for latency and reliability (don't re-hit a flaky source), not
primarily for spend control.

## What gets deleted, not ported

- Per-IP rate limiting, VPN/CAPTCHA suspicion scoring, CAPTCHA-after-N-rapid-
  requests — all of it assumes anonymous public traffic. A private,
  authenticated app doesn't need IP-based throttling; if abuse controls are
  ever needed they'd be per-authenticated-user, not per-IP.
- The monthly hard spend cap as a *request-blocking* gate can go — but keep
  cost **visibility** (the existing `logger.cost()` structured logging is
  worth keeping as-is for your own monitoring, just not as an enforcement
  mechanism that fails a friend's extraction request).
