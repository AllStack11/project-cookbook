# API Design

Next.js Route Handlers under `app/api/*` (unchanged convention from v1),
running on Workers via the OpenNext adapter. All routes except auth callbacks
require a valid better-auth session — this is a private app, there is no
anonymous access path in v2.

This is the surface, not full request/response schemas — pin those down
during implementation against the `data-model.md` shapes.

## Auth

Handled by better-auth's own route handler mount (`app/api/auth/[...all]`) —
Google OAuth flow, session cookie management. Nothing custom to build here
beyond configuration.

## Recipes

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/recipes` | List the shared pool. Supports `?tag=`, `?q=` (search title), pagination. |
| `GET` | `/api/recipes/:id` | Full recipe detail, including cook-log summary, rating rollup, notes. |
| `POST` | `/api/recipes` | Create from a URL/text/upload — kicks off the extraction pipeline (`extraction-pipeline.md`). For photo/PDF, this returns immediately with an `uploads` row in `pending` state, not a finished recipe. |
| `PATCH` | `/api/recipes/:id` | Edit core fields. **403 unless `session.userId === recipe.addedByUserId`** — this check is the entire enforcement of the "only the adder can edit" rule from the requirements; get it right. |
| `DELETE` | `/api/recipes/:id` | Same ownership check as PATCH. Consider soft-delete if cook-logs/notes reference it — decide during build whether orphaned cook-log history should survive a recipe deletion. |

## Cook log

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/recipes/:id/cook-logs` | Log a cook. `{ cookedAt?, rating? }` — both optional per the schema (you can log without rating). Triggers the notification fan-out (`notifications.md`). |
| `GET` | `/api/recipes/:id/cook-logs` | Full cook history for a recipe (who, when, rating) — this is the "who cooked it how many times" view. |
| `GET` | `/api/users/:id/cook-logs` | A user's own cook history, for a profile view. |

## Notes

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/recipes/:id/notes` | Add a note. Any authenticated user, not just the adder. |
| `GET` | `/api/recipes/:id/notes` | List notes on a recipe. |
| `DELETE` | `/api/notes/:id` | Only the note's own author (or the recipe owner?) can delete — decide during build; not specified in requirements. |

## Tags / food picker

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/tags` | All available tags, for filter UI and the picker. |
| `GET` | `/api/picker` | `?tags=italian,weeknight` → returns a filtered/randomized suggestion from the pool. This is the whole "food picker" feature — it's a query against `recipes` joined through `recipe_tags`, not a separate subsystem. |

## Uploads (photo/PDF)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/uploads` | Multipart upload → writes to R2, creates a `pending` `uploads` row, enqueues the OCR/extraction Queue message. Returns the `uploads.id` for polling. |
| `GET` | `/api/uploads/:id` | Poll status (`pending/processing/done/failed`); `done` includes the resulting `recipeId`. Superseded by push notification in practice, but needed for the upload-in-progress UI state regardless. |

## Notifications

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notifications` | In-app feed, paginated, most recent first. |
| `POST` | `/api/notifications/:id/read` | Mark one read. |
| `POST` | `/api/notifications/read-all` | Mark all read (standard "clear badge" action). |
| `POST` | `/api/push-subscriptions` | Register a `PushManager` subscription for the current user/device. |
| `DELETE` | `/api/push-subscriptions/:id` | Unregister (e.g. on logout or explicit opt-out). |

## Users

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/users/:id` | Public-within-the-group profile: name, avatar, maybe basic stats (recipes added, cooks logged). |
| `PATCH` | `/api/users/me` | Edit own profile (name/avatar). |

## Conventions

- All list endpoints paginate (`?cursor=`/`?limit=`) — even at friend-group
  scale, don't build an endpoint that returns an unbounded array.
- Errors follow the existing `{ success: false, error, errorCode }` shape
  from v1 (`types/api.ts`'s `ErrorCode`/`StatusCode` pattern) — no reason to
  change a convention that already works.
- Every mutating endpoint runs the recipe/cook-log/note ownership check
  server-side, never trusts a client-supplied `userId` — always derive the
  actor from the session.
