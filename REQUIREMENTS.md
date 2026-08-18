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
- **Sources**: Same source types as today at minimum — YouTube, blog/web,
  Instagram, pasted text. (Confirm: any sources to add/drop?)
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
- **Friend notes**: attached to cook events (e.g. "made it with less salt,
  still too spicy") — TBD whether a general note can also live on the recipe
  itself independent of a cook event. Assume yes unless corrected.
- Feed/visibility: friends can see each other's cook history, ratings, and
  notes on shared recipes. (Assume a shared pool of recipes visible to the
  whole friend group, not per-user-private libraries — confirm.)

## 5. Cuisine / Food Picker

- A decision-helper tool: "what should I eat/cook" when undecided.
- Draws from the saved recipe library (and/or cuisine/mood filters).
- **Scope resolved**: standalone tool, not tied to a restaurant flow (restaurant
  features cut entirely — see below).
- Open question: what inputs drive a suggestion — cuisine tag, mood, time
  available, ingredients on hand, what hasn't been cooked recently? TBD.

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

---

## Open questions still worth answering before/while doing architecture

1. Shared recipe pool vs. per-person private libraries with sharing?
2. What signals drive the cuisine/food picker's suggestions?
3. Do notes live only on cook events, or also as a standalone note on the
   recipe itself?
4. Any sources to add/drop from extraction (e.g. TikTok, Pinterest, generic
   text paste — current app already handles several social platforms)?
5. Any notifications wanted (e.g. "Alex just cooked something you saved")?

---

## Next step

Once this is confirmed/amended, move to the architecture discussion:
Cloudflare (Workers, D1/KV/R2, Workers AI) vs. alternatives, evaluated against
the requirements above.
