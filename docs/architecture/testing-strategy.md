# Testing Strategy

## Framework: Vitest, not Jest

v1 uses Jest. v2 moves to **Vitest**, for two convergent reasons rather than
just "it's newer":

1. Cloudflare's own tooling (the `vinext` Next.js-on-Workers project) is
   built on Vitest — it's the platform-native choice for this stack, not a
   trend call.
2. **`@cloudflare/vitest-pool-workers`** runs tests *inside the actual
   Workers runtime* (workerd) with real D1/R2/KV/Queues bindings — not
   mocks. Cloudflare's own guidance is explicit: don't mock bindings in
   tests, use the real thing via this pool. v1's Jest suite could only ever
   mock Vercel KV/Neon; this is a strictly better test.

Don't discard v1's existing test *cases* when migrating — the current Jest
suite (`__tests__/`, ~10+ files covering validators, extractors, LLM
parsing, utilities per `WORK_LOG.md`) already encodes real edge cases
someone found and fixed. Port the cases, re-author against Vitest.

## A known tooling gap: coverage is broken inside vitest-pool-workers

This is a real, current (2026), open Cloudflare issue, not a config
mistake to avoid: **V8 native coverage doesn't work in workerd at all**
(workerd doesn't expose the V8 profiler the way Node does), and **Istanbul's
instrumented coverage reports a flat 0%** for anything run through
`vitest-pool-workers`, because the coverage counters collected inside
workerd never bridge back to the Node process Vitest's reporter reads from.

This is why the suite is split in two (below) rather than one coverage
number for everything — one half of the split can honestly measure
coverage, the other currently can't, and pretending otherwise would just
produce a meaningless number.

## Test layers

### 1. Unit tests — plain Vitest (no pool-workers)

Pure-function logic with no Workers-runtime dependency: `recipeValidator`,
`contentValidator`, `urlValidator`, `nutritionValidator`, the LLM response
parser (JSON repair/recovery logic), `tokenCounter`, `urlSanitizer` (SSRF
checks), cache-key normalization/dedup logic, confidence scoring, invite
code validation logic. This is also where the highest-value code already
lives — security and correctness-critical, not UI.

**Coverage: 70% threshold, enforced, matching v1's existing bar.** This is
the layer where coverage numbers are real; gate on it via `vitest.config.ts`
thresholds, CI fails the job if unmet.

### 2. Worker-integration tests — `@cloudflare/vitest-pool-workers`

Anything touching a real binding: API route handlers against real D1 (with
migrations applied in test setup) — the ownership checks (adder-only edit,
note-author-only delete, cook-log edit window), the dedup-by-source-URL
flow end to end, `needs_review` → `published` transitions, the invite
redemption gate, the notification Queue consumer's fan-out logic.

**No coverage gate here** (see above — the tooling can't measure it
honestly right now). Tests still run and must pass; just not
coverage-blocked. Revisit if/when Cloudflare fixes the upstream issue.

### 3. Extraction pipeline tests — fixture-based, no live calls in CI

The extraction pipeline is the highest-risk, highest-value area, so it gets
its own discipline, not just "some unit tests":

- **PR-blocking suite**: fixture-based only. `__tests__/fixtures/` (v1
  already has `urlExtractionCases.ts` — expand this pattern) holds frozen
  real HTML/caption/JSON-LD samples per source type. Workers AI responses
  are mocked for the reasoning step. Fully deterministic, free, fast — this
  is what runs on every PR.
- **Never call a live external API (LLM, YouTube, social platforms, OCR) in
  the default/PR-blocking run.** No exceptions — flakiness and spend in the
  main gate defeats the point of CI.
- **Separate scheduled/manual suite** hits real sources and the real
  Workers AI extraction call — catches platform markup drift (a site
  changes its HTML) or model quality regression that fixtures can't. Runs
  on a schedule (weekly is a reasonable default given a small friend-group
  app doesn't need nightly spend/flakiness — tune later if it turns out to
  matter) via its own GitHub Actions workflow, **non-blocking** — it
  reports/fails loudly on its own schedule but never blocks a PR.

### 4. E2E — Playwright, broad flow coverage

This environment already has Playwright + Chromium pre-installed, and it's
the same tool Cloudflare uses for `vinext`'s E2E suite. Given the decision
to invest broadly (not just a smoke-test handful), cover most real flows
end to end: invite redemption → login, add a recipe from each source type
(URL, text, photo, PDF — using the fixture pipeline under the hood so these
stay deterministic), edit a recipe (and confirm a non-adder is blocked),
cook-log + rating + the edit window, notes (add + author-only delete), tag
autocomplete + the food picker, the `needs_review` review/publish flow,
in-app notifications, profile + invite generation.

Runs against a local `wrangler dev`/Miniflare-backed instance in CI, never
against production. Push-notification delivery itself is impractical to
fully automate end-to-end (it leaves the browser context) — cover the
subscribe/unsubscribe API flow and the in-app feed, not actual push
receipt.

## CI pipeline (GitHub Actions)

**On every PR** — all required status checks, per the branch-protection
decision in `CONTRIBUTING.md`. A PR cannot merge with any of these red:

```
lint → typecheck → unit tests (coverage-gated, 70%)
     → worker-integration tests (vitest-pool-workers)
     → extraction pipeline tests (fixture-based)
     → Playwright E2E (against local wrangler dev)
```

**On merge to `main`**: the same suite re-runs, and only on green does the
existing `wrangler deploy` step (`BUILD_GUIDE.md` Phase 0) proceed.

**Separate scheduled workflow**: the live extraction suite (weekly, or
manually dispatched), non-blocking, independent of the PR gate above.

## Conventions

- Co-locate tests under `__tests__/` mirroring `lib/`/`app/` structure —
  v1's existing convention, no reason to churn it for a new one.
- Every new function in `lib/validators`, `lib/llm`, `lib/utils`
  (security/correctness-critical by nature) needs a unit test **in the same
  PR**, not a follow-up.
- Every new API route needs at least one worker-integration test that
  exercises its permission/ownership check path — this is exactly the bug
  class (an auth/ownership bypass) that's cheap to test and expensive to
  ship broken.
- Extraction fixtures are real, frozen samples, not hand-written synthetic
  HTML — synthetic fixtures tend to be cleaner than reality and miss the
  messy cases that actually break extraction.
