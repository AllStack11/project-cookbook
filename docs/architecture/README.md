# Architecture Docs — v2 Overhaul

This directory is the technical design for the v2 rebuild described in
[`REQUIREMENTS.md`](../../REQUIREMENTS.md). Read that first — everything
here is derived from it, not the other way around.

Reading order:

1. [`stack-decision.md`](./stack-decision.md) — what we're building on and why
   (Cloudflare vs. alternatives, evaluated against the requirements).
2. [`data-model.md`](./data-model.md) — the D1 schema: users, recipes, tags,
   cook-log, ratings, notes, notifications, uploads.
3. [`extraction-pipeline.md`](./extraction-pipeline.md) — the redesigned
   extraction backend (sources, OCR/PDF, model choice, reliability).
4. [`notifications.md`](./notifications.md) — push + in-app notification
   design.
5. [`api-design.md`](./api-design.md) — the API surface the frontend calls.
6. [`testing-strategy.md`](./testing-strategy.md) — Vitest/vitest-pool-workers/
   Playwright, coverage policy, CI gating.
7. [`operations.md`](./operations.md) — staging vs. production
   environments, D1 backup/recovery, observability.
8. [`../design/ux-flows.md`](../design/ux-flows.md) — screens and user flows
   for the PWA.
9. [`../../BUILD_GUIDE.md`](../../BUILD_GUIDE.md) — phased build plan and
   environment setup, once you're ready to implement.

## One-paragraph summary of the decision

Keep Next.js (App Router) as the frontend, deployed to **Cloudflare Workers**
via the OpenNext Cloudflare adapter. Data lives in **D1** (via Drizzle, which
this repo already uses — just repointed from Neon/Postgres to D1/SQLite).
Uploads (recipe images, OCR photos, PDFs) go to **R2**. The extraction
pipeline cache moves from Vercel KV to **Cloudflare KV**. Background work
(OCR/PDF processing, notification fan-out) runs through **Cloudflare
Queues**. Auth is Google OAuth via **better-auth**. AI stays entirely inside
Cloudflare: **Workers AI** vision models do OCR pre-processing for
photo/PDF sources, and a **large (not 7B/8B-tier) Workers AI text model**
does the extraction reasoning step for every source — no external LLM
vendor. Push notifications use Web Push/VAPID, which runs natively on
Workers via the standard Web Crypto API (no Node-only `web-push` package,
no Firebase).

Realistic total infra + AI cost at friend-group scale: **$0–5/month** —
free tiers cover hosting/D1/R2/KV/Queues/Workers AI, with the $5 Workers
Paid plan the only likely line item (needed for Browser Rendering headroom).

Everything currently built around anonymous public traffic — per-IP rate
limiting, VPN/CAPTCHA detection, AdSense, Stripe, the freemium tier system —
is removed, not ported. This is a private app for a known set of accounts.
