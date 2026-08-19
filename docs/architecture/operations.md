# Operations: Environments, Backup/Recovery, Observability

Three related "running the thing safely" concerns, covered together since
they compound: permanent data (`data-model.md`'s "recipes are never
deleted") raises the stakes on both accidentally corrupting it during
development (→ environments) and recovering if something still goes wrong
(→ backup) — and neither matters if you can't tell something broke in the
first place (→ observability).

## Environments: local dev, one lightweight staging, production

Three tiers, not more — this is a small app, and each additional
environment is upkeep for its own sake past a certain point:

1. **Local (`wrangler dev`)** — the default for almost all iteration. Runs
   against Miniflare-simulated D1/R2/KV/Queues locally, zero cloud
   footprint, free, and — critically — **cannot touch real data**, because
   it isn't talking to the real Cloudflare account resources at all. This
   is where the vast majority of feature work should happen.
2. **Staging** (`wrangler deploy --env staging`) — a real but separate
   Cloudflare deployment: its own small D1 database, R2 bucket, KV
   namespace, Queues. Exists specifically for the things local dev *can't*
   fully emulate — Browser Rendering (a real managed Chromium fleet, not
   something Miniflare simulates), the real Workers AI inference call, real
   Web Push delivery. Effectively free: a second D1/R2/KV/Queues instance
   costs nothing extra within the same account's free tiers, since those
   are usage-based, not per-database.
3. **Production** — the real deployment friends actually use.

`wrangler.toml` carries this via `[env.staging]` / `[env.production]`
blocks, each with its own resource IDs but the **same binding names**, so
application code never branches on environment — it just reads
`env.DB`/`env.UPLOADS`/etc. regardless of which one it's running against.
CI (`BUILD_GUIDE.md` Phase 0) deploys to `staging` on every merge to `main`
optionally, and to `production` on an explicit trigger (e.g. a tag, or a
manual workflow dispatch) — don't auto-deploy every merge straight to
production for an app whose data is meant to be permanent.

## Backup & recovery: D1 Time Travel, no custom system needed

**Decision: rely on D1's built-in Time Travel, don't build a custom backup
pipeline.** On the Workers Paid plan (already in use for Browser Rendering
headroom — `stack-decision.md`), Time Travel gives point-in-time restore to
**any minute within the last 30 days**, at no additional storage or restore
cost — it works by replaying D1's write-ahead log, not by taking discrete
snapshots you have to manage. For an app at this write volume, a 30-day
window to notice and fix a bad migration or a logic bug that corrupted data
is a comfortable safety margin.

**Optional, cheap belt-and-suspenders**: a scheduled Worker (Cron Trigger)
that runs `wrangler d1 export` periodically and writes the dump to R2. Given
R2 storage is fractions of a cent and this is a few lines of Workers code,
it's worth adding once the app exists — a second, independent copy outside
D1's own log-replay mechanism, for the paranoid case where Time Travel
itself is somehow unavailable. Not blocking for Phase 0; revisit once
there's real data worth protecting twice.

## Observability: Workers Logs, no third-party APM

**Decision: Cloudflare's built-in Workers Logs**, not Sentry/Datadog/etc.
Free tier is 200,000 log events/day with 3-day retention — for a
handful-of-friends app, that ceiling won't be approached. The existing
`lib/utils/logger.ts` pattern (structured JSON via `console.log`/`.error`,
already built for Vercel's log indexing) carries forward conceptually
unchanged — Workers Logs indexes structured JSON console output the same
way, just from the Cloudflare dashboard instead of Vercel's.

**What to actually watch**: extraction failures are the one class of error
worth being able to see without going hunting — the whole overhaul exists
to bring the failure rate down, so silently regressing it would defeat the
point. Keep `logger.error()` calls on every extraction failure path (kept
from v1's existing pattern), and periodically glance at Workers Logs rather
than building automated alerting — automated failure alerts (e.g. paging
yourself) are more infrastructure than a personal app needs. Revisit only
if silent extraction failures turn out to be a recurring real problem in
practice.

**Explicitly not doing**: Logpush (exporting logs to an external
long-term-storage/SIEM target) or a third-party error tracker. Both are
easy to add later — Sentry has a Workers-compatible SDK — if this ever
stops being "check the dashboard occasionally" territory, but neither
earns its complexity at this scale today.
