# Build Guide — v2 Overhaul

This is the implementation plan for the architecture in `docs/architecture/`
and `docs/design/`. Read `REQUIREMENTS.md` and `docs/architecture/README.md`
first if you haven't — this document assumes those decisions are settled and
focuses on order-of-operations and environment setup.

## Guiding principle: land it in phases, keep it deployable

Each phase should end with something running on Cloudflare, even if
incomplete — don't build the whole thing locally and do a big-bang cutover.
The current app stays live on Vercel until v2 has full parity; there's no
requirement to migrate data (confirmed clean-slate), so there's no cutover
migration step to design either.

## Phase 0 — Cloudflare environment setup

1. Create/confirm the Cloudflare account and a Workers Paid subscription
   ($5/mo — needed for Browser Rendering and comfortable Queues headroom;
   see `docs/architecture/stack-decision.md` for why).
2. `npm install -D wrangler` and `wrangler login`.
3. Create resources:
   ```bash
   wrangler d1 create just-the-recipe-db
   wrangler kv namespace create EXTRACTION_CACHE
   wrangler r2 bucket create just-the-recipe-uploads
   wrangler queues create extraction-jobs
   wrangler queues create notification-fanout
   ```
4. Add the resulting IDs to `wrangler.toml` under both `[env.staging]` and
   `[env.production]` blocks (`docs/architecture/operations.md`) — same
   binding names, separate resource IDs per environment. Repeat resource
   creation once per environment (a second D1/R2/KV/Queues instance costs
   nothing extra on the free tier).
5. Set secrets (`wrangler secret put ... --env staging` /
   `--env production`, each set independently) and repo secrets (GitHub
   Actions). Full checklist:

   | Secret | Where | Used for |
   |---|---|---|
   | `CLOUDFLARE_API_TOKEN` | GitHub repo secret | CI deploy (`wrangler deploy`) |
   | `CLOUDFLARE_ACCOUNT_ID` | GitHub repo secret | CI deploy |
   | `GOOGLE_CLIENT_ID` | Wrangler secret (per env) | better-auth Google OAuth provider |
   | `GOOGLE_CLIENT_SECRET` | Wrangler secret (per env) | better-auth Google OAuth provider |
   | `BETTER_AUTH_SECRET` | Wrangler secret (per env) | Session/cookie signing — generate a fresh random value **per environment**, never share staging/production |
   | `VAPID_PUBLIC_KEY` | Wrangler var (per env, not secret — shipped to the client) | Web Push subscription |
   | `VAPID_PRIVATE_KEY` | Wrangler secret (per env) | Web Push send-signing |
   | `NEXT_PUBLIC_APP_URL` | Wrangler var (per env) | OAuth redirect URI, invite link generation, VAPID subject |

   No LLM provider API key needed — Workers AI is a binding
   (`env.AI.run(...)`), not a secret-authenticated HTTP client
   (`stack-decision.md`).
6. Confirm `npx @opennextjs/cloudflare build` produces a deployable Worker
   from the existing Next.js app *before* changing anything else — this
   validates the adapter path early, per the risk noted in
   `stack-decision.md`. If it doesn't work cleanly on the current codebase,
   that's the moment to decide on the Hono/Vite fallback, before more work
   is built on top of the assumption.
7. Set up deploys via **GitHub Actions running `wrangler deploy`** (not
   Cloudflare's native Git integration, and not manual deploys) — a
   workflow that runs `@opennextjs/cloudflare build` then `wrangler
   deploy`, gated on the CI checks below passing. This gives explicit
   control over the OpenNext build step rather than trusting Cloudflare's
   dashboard build to handle it, and keeps deploys consistent with how this
   repo already uses GitHub (PRs, CI). Needs `CLOUDFLARE_API_TOKEN` (scoped
   to Workers deploy) and `CLOUDFLARE_ACCOUNT_ID` as repo secrets (table
   above). **Two deploy targets, not one** (`docs/architecture/operations.md`):
   `wrangler deploy --env staging` on every merge to `main`;
   `wrangler deploy --env production` only on an explicit trigger (a git
   tag, or manual `workflow_dispatch`) — don't auto-deploy every merge
   straight to the environment holding real, permanent friend data.
8. Set up the PR-blocking CI workflow per `docs/architecture/testing-strategy.md`:
   lint → typecheck → unit tests (coverage-gated) → worker-integration
   tests → extraction-pipeline (fixture) tests → Playwright E2E. Mark each
   as a required status check once branch protection is enabled
   (`CONTRIBUTING.md`). Also set up the separate scheduled workflow for the
   live-extraction suite (non-blocking).

**Testing note that applies to every phase below, not just Phase 0**: write
tests alongside each phase's code, in the same PR, per
`docs/architecture/testing-strategy.md` — not as a follow-up pass. Each
phase's "exit criteria" implicitly includes "and it's covered by the
appropriate test layer."

## Phase 1 — Auth + data foundation

1. Swap `drizzle.config.ts` dialect from `postgresql` to `sqlite`
   (`d1-http` driver), point at the new D1 database.
2. Write the schema from `docs/architecture/data-model.md`, generate and
   run the first migration (`wrangler d1 migrations apply`).
3. Install and configure better-auth + `better-auth-cloudflare` with the
   Google provider. **Test session persistence explicitly** against the
   known #4203 bug noted in `stack-decision.md` before building anything on
   top of auth — a flaky session layer will look like bugs everywhere else
   if it's not verified first.
4. Build the `invites` table + the `user.create` hook that gates account
   creation on a valid, unused, unexpired invite code (`stack-decision.md`,
   `data-model.md`). Test the rejection path explicitly (invalid/used/
   expired code) — this is the entire access-control boundary for the app,
   worth being sure it actually blocks before moving on.
5. Basic profile screen (view/edit own name+avatar, generate an invite
   link) — the smallest possible thing that proves auth + D1 + a write path
   all work end to end.

**Exit criteria**: you can log in with Google via a valid invite, see your
profile, generate an invite for a second test account, confirm an
*invalid* invite code is rejected, and confirm your session persists across
a page reload without getting logged out.

## Phase 2 — Extraction pipeline rewrite

This is the largest phase — build it in the sub-order below, each step
independently testable:

1. Port the YouTube extractor as-is (it's already good — see
   `docs/architecture/extraction-pipeline.md`).
2. Port the generic web scraper, **fixing the SSRF DNS-rebinding TOCTOU**
   and the IPv6 range gap while you're touching this code anyway (see the
   Security section of `extraction-pipeline.md`).
3. Fix the JSON-LD short-circuit bug — this alone should visibly cut
   failure/hallucination rate on any site with schema.org `Recipe` markup,
   before touching anything else.
4. Move the LLM call off free-tier models; fix the `isGenerated` schema gap;
   fix the budget-guard pricing table for whatever model you land on.
5. Build the Browser Rendering-based social extractor (Instagram first,
   since it's a port of working logic; then TikTok/Twitter/Facebook/
   Pinterest/Reddit as net-new, one at a time, each tested against a few
   real URLs before moving to the next).
6. Build the photo upload → R2 → Queue → Workers AI OCR → LLM pipeline.
7. Build the PDF path (text-layer fast path + OCR fallback for scanned
   PDFs).

**Exit criteria**: every source type in the requirements produces a correct
recipe from a handful of real test URLs/files, including the previously-weak
platforms.

## Phase 3 — Social features

1. Recipe pool CRUD (`/api/recipes`) with the ownership check on edit/delete.
2. Cook log (`/api/recipes/:id/cook-logs`) — this is the core social loop,
   get it right before layering notifications on top of it.
3. Notes (`/api/recipes/:id/notes`).
4. Tags + the food picker endpoint (`/api/picker`).
5. Corresponding UI per `docs/design/ux-flows.md`.

**Exit criteria**: you and one other account can add recipes, log cooks,
rate, note, and use the picker — the full core loop, no notifications yet.

## Phase 4 — Notifications

1. Queue consumer for fan-out (`docs/architecture/notifications.md`).
2. In-app feed UI first (simpler, no browser permission dance) — validates
   the fan-out logic before adding push on top.
3. Web Push: VAPID key generation, subscription flow, the edge-compatible
   send library, the 404/410 subscription-pruning logic.

**Exit criteria**: logging a cook on a friend's recipe produces both an
in-app notification and a push notification on their device.

## Phase 5 — PWA polish

1. `manifest.json`, icons, service worker for installability.
2. Test "add to home screen" on an actual phone, not just desktop dev tools.
3. Basic offline shell (don't over-invest here — this app is fundamentally
   network-dependent for shared data; offline is about not showing a blank
   white screen, not full offline functionality).

## Phase 6 — Cutover

1. Point the real domain at the Cloudflare deployment.
2. Decommission the Vercel deployment and its associated services (Vercel
   KV, Neon) once the Cloudflare version has been the daily driver for a
   while and you're confident in it.
3. Update `CLAUDE.md`/`.clinerules` (already done as part of this doc set —
   verify they still match reality once implementation details settle) and
   archive/retire docs that only described the v1 public-app design
   (`DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, `VERCEL_READY.md`,
   `LOGGING.md`'s Vercel-specific sections) rather than leaving them to
   silently rot.

---

## Sequencing rationale

Extraction (Phase 2) comes before social features (Phase 3) even though the
requirements were gathered social-features-first, because nothing in Phase 3
is useful without recipes to attach cook-logs/notes/ratings to, and
extraction quality was the explicit headline ask ("higher quality
extractions, smaller failure rate"). Auth (Phase 1) comes first because
every later phase's data model assumes a real `userId`, not the anonymous-IP
model v1 used.
