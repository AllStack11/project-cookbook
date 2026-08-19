# Data Model

D1 (SQLite) via Drizzle. This is the schema for the requirements in
`REQUIREMENTS.md` §1–5, §9. Auth tables (`user`/`session`/`account`/
`verification`) are owned by better-auth's own schema generator — don't
hand-roll those, they're listed below only so the relationships are clear.

## Design choices worth flagging

- **Ingredients/instructions stay as JSON columns**, not normalized tables.
  The current app already treats a recipe's ingredient/instruction list as
  an opaque structured blob (see `types/recipe.ts`) and nothing in the
  requirements needs to *query into* individual ingredients (e.g. "find all
  recipes with chicken" is a `LIKE` on the JSON text if it's ever needed, not
  a join). Drizzle's `sqlite-core` supports `text(..., { mode: "json" })`
  which handles the (de)serialization — this is the direct equivalent of the
  `jsonb` column the current Postgres schema already uses for the same
  purpose.
- **Tags are normalized** (`tags` + `recipe_tags` join table), unlike
  ingredients, because the cuisine/food picker needs to filter/query by tag
  efficiently — that's a real relational access pattern, not just storage.
  **Tag creation is freeform but reuse-first**: anyone can create a new tag,
  but the tagging UI queries existing tags (simple `LIKE`/prefix match
  against `tags.name` — no need for real fuzzy matching at this table size)
  and surfaces close matches before allowing a brand-new one, to keep the
  picker's filters from fragmenting into near-duplicates ("italian" vs.
  "Italian food"). This is a UI-layer behavior, not a schema constraint —
  the `tags` table itself doesn't enforce uniqueness beyond the exact-name
  `unique()` already on it.
- **No separate ratings table.** Per the requirements, the aggregate rating
  is a rollup of `cook_logs.rating`, not an independent thing someone sets.
  Computing `AVG(rating)` per recipe is a cheap query at this data volume;
  don't add a materialized/cached column unless it's ever actually slow.
- **Notes are recipe-level, not per-cook-event** (confirmed in
  `REQUIREMENTS.md` §4) — one `recipe_notes` table, multiple friends can each
  contribute a note to a recipe.
- **Edit rights are enforced at the application layer**, not by the
  database. D1/SQLite has no row-level security — the API layer must check
  `recipe.addedByUserId === session.userId` before allowing a PATCH to a
  recipe's core fields (title/ingredients/instructions/etc.); everyone else
  is limited to cook-log/rating/notes writes, which the schema itself makes
  structurally impossible to confuse with editing the recipe (they're
  different tables).
- **Recipes are never deleted.** Confirmed: once added, a recipe stays in
  the database permanently — no delete endpoint, no soft-delete flag. This
  sidesteps the whole "what happens to cook-log history when a recipe is
  removed" question by construction: there's no removal to design around.
  If a bad/garbage extraction needs to stop showing up, that's an edit
  (fix it, since only the adder can edit) or, at most, a future "hide from
  pool" flag — not deletion. Don't build a delete endpoint speculatively.
- **Recipe images are downloaded into R2**, not hotlinked to the source.
  The extraction pipeline fetches the source image and stores a copy
  (`recipes.imageR2Key`) so the recipe card doesn't break if the source
  page later changes, deletes the image, or blocks hotlinking — see
  `extraction-pipeline.md`.
- **Notes can only be deleted by their own author** — no moderation
  capability for the recipe owner over other people's notes. Simple,
  matches the attribution model.

## Schema

```ts
// lib/db/schema.ts (v2)
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Auth (owned by better-auth's generator; shown for reference only) ---
// user, session, account, verification — see better-auth-cloudflare docs.
// `user.id` is what every table below calls `userId`.

// --- Invites (the access-control gate on top of Google OAuth) ---

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(), // random token, embedded in the invite URL
  createdByUserId: text("created_by_user_id").notNull(), // FK -> user.id
  usedByUserId: text("used_by_user_id"), // FK -> user.id, set once redeemed
  usedAt: integer("used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }), // null = no expiry
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
// Single-use per row: `usedByUserId IS NULL` = still redeemable. Any
// existing member can create one (no admin role in this app) — see
// api-design.md and stack-decision.md's auth section for the redemption flow.

// --- Recipes ---

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  addedByUserId: text("added_by_user_id").notNull(), // FK -> user.id; only this user can edit core fields

  title: text("title").notNull(),
  description: text("description"),
  servings: integer("servings"),
  prepTime: integer("prep_time"),   // minutes
  cookTime: integer("cook_time"),   // minutes
  totalTime: integer("total_time"), // minutes

  ingredients: text("ingredients", { mode: "json" }).notNull(), // Ingredient[]
  instructions: text("instructions", { mode: "json" }).notNull(), // Instruction[]
  nutrition: text("nutrition", { mode: "json" }), // Nutrition | null

  imageR2Key: text("image_r2_key"), // R2 object key, not a full URL
  sourceUrl: text("source_url"),
  sourcePlatform: text("source_platform"), // youtube | blog | instagram | tiktok | ... | photo | pdf
  confidenceScore: integer("confidence_score"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Tags (normalized: the food picker filters by these) ---

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(), // e.g. "italian", "weeknight", "vegetarian"
  category: text("category"), // cuisine | meal_type | diet | occasion | freeform
});

export const recipeTags = sqliteTable("recipe_tags", {
  recipeId: text("recipe_id").notNull(), // FK -> recipes.id
  tagId: text("tag_id").notNull(),       // FK -> tags.id
}); // composite PK (recipeId, tagId) — add via migration

// --- Cook log (the core social feature) ---

export const cookLogs = sqliteTable("cook_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text("recipe_id").notNull(), // FK -> recipes.id
  userId: text("user_id").notNull(),     // FK -> user.id — who cooked it
  cookedAt: integer("cooked_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  rating: integer("rating"), // 1-5, nullable (you can log a cook without rating it)
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }), // set on edit; null until first edit
});
// "who cooked it how many times" = COUNT(*) GROUP BY recipeId, userId
// "aggregate rating" = AVG(rating) WHERE rating IS NOT NULL GROUP BY recipeId
//
// Edit/delete window: a cook log can be edited or deleted by its own
// logger only within a short window after creation (default 24h — a
// plain constant check against `createdAt`, no schema support needed
// beyond `updatedAt`). After the window, it's permanent, same as recipes.
// This is an app-layer check (`now - cookLogs.createdAt < EDIT_WINDOW_MS`),
// not enforced by the database.

// --- Notes (recipe-level, multi-author) ---

export const recipeNotes = sqliteTable("recipe_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipeId: text("recipe_id").notNull(), // FK -> recipes.id
  userId: text("user_id").notNull(),     // FK -> user.id — note author
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Uploads (photo/PDF extraction pipeline; see extraction-pipeline.md) ---

export const uploads = sqliteTable("uploads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),     // FK -> user.id — who uploaded it
  recipeId: text("recipe_id"),           // FK -> recipes.id, set once extraction succeeds
  kind: text("kind").notNull(),          // "photo" | "pdf"
  r2Key: text("r2_key").notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | done | failed
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Notifications ---

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK -> user.id — recipient
  type: text("type").notNull(),      // cook_log | new_recipe | rating | note
  payload: text("payload", { mode: "json" }).notNull(), // { recipeId, actorUserId, ... }
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // FK -> user.id
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
```

## Indexes to add in the migration (not shown inline above)

- `recipes(added_by_user_id)`
- `recipe_tags(recipe_id)`, `recipe_tags(tag_id)`, composite PK on both
- `cook_logs(recipe_id)`, `cook_logs(user_id)`
- `recipe_notes(recipe_id)`
- `notifications(user_id, read_at)` — the in-app feed's main query is "unread
  notifications for this user"
- `uploads(user_id, status)`
- `invites(code)` (already unique, but this is the hot lookup during
  redemption), `invites(created_by_user_id)`

## Notification fan-out relationship

A `cook_logs` insert, a `recipe_notes` insert, or a `recipes` insert can each
produce **one `notifications` row per affected recipient** (e.g. the
recipe's `addedByUserId`, or everyone, depending on type — see
`notifications.md`). This fan-out happens in a Queue consumer, not inline in
the write request — see `extraction-pipeline.md` and `notifications.md` for
why.
