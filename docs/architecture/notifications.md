# Notifications

Per `REQUIREMENTS.md` §9: push + in-app feed, triggered by cook-log activity,
new pool additions, and ratings/notes on your recipes.

## Triggers → recipients

| Event | Recipient(s) | Notification `type` |
|---|---|---|
| Someone logs a cook (insert into `cook_logs`) on a recipe | The recipe's `addedByUserId` (if not the person who cooked it) | `cook_log` |
| A new recipe is added to the pool (insert into `recipes`) | Everyone *except* the adder | `new_recipe` |
| A rating is attached to a cook log on your recipe | The recipe's `addedByUserId` (if not the rater) | `cook_log` (rating is a field on the same event, not a separate notification type) |
| A note is added to your recipe | The recipe's `addedByUserId` (if not the note author) | `note` |

Never notify someone about their own action (e.g. you cooking your own
recipe doesn't notify you).

## Delivery: push (VAPID) + in-app feed, both

- **In-app feed**: a straightforward `notifications` table read
  (`data-model.md`), filtered by `userId`, ordered by `createdAt DESC`,
  `readAt IS NULL` for the unread badge count. No infrastructure beyond D1.
- **Push**: Web Push using VAPID, over the standard Web Crypto API — this
  runs natively on Cloudflare Workers (unlike the Node-only `web-push` npm
  package, which needs `crypto.createECDH` and doesn't work in the Workers
  runtime). Use an edge-compatible library built on Web Crypto (e.g.
  `pushforge` or an equivalent) rather than hand-rolling RFC 8291 payload
  encryption.
  - Frontend: on notification permission grant, subscribe via
    `PushManager.subscribe()`, POST the subscription (`endpoint`, `p256dh`,
    `auth`) to the API, store it in `push_subscriptions`.
  - A user can have multiple subscriptions (multiple devices) — send to all
    of them, and prune subscriptions that come back with a 404/410 from the
    push service (the standard signal that a subscription is dead).

## Why fan-out goes through a Queue, not inline

A single event can fan out to multiple recipients (all-but-one for
`new_recipe`), and each recipient may have multiple push subscriptions
(multiple devices). Doing that synchronously inside the request that
triggered it (the cook-log write, the recipe insert) means the user waits on
N push-service HTTP calls before their own request completes. Instead:

```
Write to D1 (cook_logs / recipes / recipe_notes insert)
  │
  ▼
Enqueue one Cloudflare Queue message: { type, recipeId, actorUserId, ... }
  │
  ▼
Queue consumer Worker:
  1. Resolve recipient user IDs for this event type
  2. Insert one `notifications` row per recipient (in-app feed)
  3. Look up each recipient's push_subscriptions, send Web Push to each
  4. On 404/410 from the push service, delete that subscription row
```

The triggering request returns as soon as the D1 write and the (cheap, single)
Queue enqueue succeed — notification delivery happens after, off the request
path.

## Open implementation details (decide during build, not blocking now)

- Notification grouping/digesting (e.g. collapse "3 people cooked your
  recipe today" into one push instead of three) — nice-to-have, skip for a
  first version at this scale; a handful of friends won't generate enough
  volume to need it.
- Per-user notification preferences (mute a recipe, mute a type) — not in
  the current requirements; add a `notification_preferences` table later if
  it turns out to matter in practice.
