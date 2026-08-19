# Just The Recipe — v2 Requirements (Private Overhaul)

**Status**: Draft — gathering requirements before architecture decisions.
**Context**: This app is pivoting from a public, ad-supported freemium product to a
private app for the owner and a small friend group. This document captures the
target feature set. Architecture (Cloudflare vs. alternatives, data storage, AI
provider) is deliberately deferred until this is locked down.

---

## 0. What's changing about the premise

The current app (see CLAUDE.md) is built for anonymous public traffic: per-IP rate
limiting, VPN/CAPTCHA abuse detection, monthly LLM spend caps, AdSense, Stripe
subscriptions, freemium tiers. None of that fits a private friend-group app and is
expected to be **removed**, not ported. Confirm before build: correct?

---

## 1. Users & Auth

- **Auth**: OAuth login (Google, etc.) — no password management.
- **Audience**: Private — owner + invited friends only. Not public-facing.
- **Profiles**: Each person has a profile (name, avatar). Scope of what's on a
  profile (bio? stats? both?) — TBD, low priority.

## 2. Extraction System (full backend overhaul)

- **Goal**: Higher-quality extractions, materially lower failure rate than
  current system.
- **Model priority**: Good quality, but still cost-aware — not "cheapest possible"
  (current: free-tier OpenRouter models), not "cost-no-object" either. A capable
  model with sane spend controls.
- **Sources**: Keep all current source types, and expand/add more.
  - Currently *validated* (URL routing recognizes them): YouTube, blog/web,
    Instagram, TikTok, Twitter/X, Facebook, Pinterest, Reddit, pasted text.
  - Currently *actually extracted well*: only YouTube (transcript/API),
    generic blog/web (incl. JSON-LD structured recipes), and Instagram
    (headless-browser scrape). TikTok/Twitter/Facebook/Pinterest/Reddit fall
    through to the generic web scraper today, which is unreliable on
    JS-heavy/auth-walled platforms (same class of problem Instagram needed
    Puppeteer to solve) — these need real platform-specific extraction as
    part of the overhaul, not just a "keep as-is."
  - New source types to add: **photo/OCR** of a physical recipe (cookbook
    page, handwritten card) and **PDF import** (printed recipe, emailed
    newsletter, etc.), in addition to fixing the platforms above.
- Open question for the architecture phase: which AI provider/models, given
  "good quality but cost-aware."

## 3. Recipe Library

- Save recipes (extracted or manually entered).
- **Data migration**: None — clean slate, no need to port existing cached
  recipes/DB rows from the current app.

## 4. Social Cook-Log (replaces "social recipe system")

- Per recipe, track **who cooked it and how many times** (cook-log, one entry
  per cook event, not just an aggregate counter).
- **Ratings**: 1–5 stars, at two levels:
  - Per-cook rating (this specific time I made it)
  - Aggregate rating (rolls up from cook history)
- **Notes**: live on the recipe itself (not per-cook-event). One note surface
  per recipe that friends contribute to.
- **Recipe pool**: single shared pool, accessible to everyone on the
  platform. Each recipe is individually labeled/attributed (i.e. tagged with
  who added/extracted it), but not siloed into private per-user libraries —
  anyone can see, cook-log, rate, and note any recipe in the pool.
  - **Edit rights**: only the original adder can edit a recipe's core
    content (title/ingredients/steps). Everyone else can rate, cook-log, and
    add notes, but can't modify the recipe itself.

## 5. Cuisine / Food Picker

- A decision-helper tool: "what should I eat/cook" when undecided.
- **Input signal: tags.** Recipes are tagged (cuisine, meal type, etc.) and
  the picker filters/suggests from the shared pool by tag.
- **Scope resolved**: standalone tool, not tied to a restaurant flow (restaurant
  features cut entirely — see below).

## 6. Restaurant Features — CUT

- No restaurant picker.
- No restaurant social tracking/rating system.
- No Google Places/Yelp integration.
- (Superseded earlier answer: Google Places API was scoped for this before the
  feature was cut — no longer needed.)

## 7. Food Tracking — scope resolved

- "Social food tracking" = **home-cooked meals only**, and it's the same
  system as the recipe cook-log in §4 (not a separate log). No restaurant-visit
  tracking.

## 8. Platform

- **Installable PWA** — add-to-homescreen, app-like feel on phones. Not a
  plain unstyled responsive site, not a native app (React Native/etc.) — a PWA
  built from the web codebase.

## 9. Notifications

- **Triggers**:
  - Cook-log activity on a recipe you added or saved
  - New recipe added to the shared pool
  - Rating or note left on a recipe you added
- **Channel**: both push notifications (via the installable PWA) and an
  in-app notification feed.

---

## Requirements gathering: complete

All open questions from the previous draft are now resolved. This document
reflects the full agreed feature scope for the overhaul.

## Next step

Move to the architecture discussion: Cloudflare (Workers, D1/KV/R2, Workers
AI, Queues for notification fan-out) vs. alternatives, evaluated against the
requirements above — in particular: relational data for the social
cook-log/ratings/notes (D1 vs. alternatives), object storage for
photos/PDFs (R2), push notification delivery, PWA hosting, and the AI
provider/model for a "good quality, cost-aware" extraction pipeline that also
needs to support photo/OCR and PDF inputs (multimodal, not just text).
