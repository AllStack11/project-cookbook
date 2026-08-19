# UX Flows

Screens and flows for the PWA, derived from `REQUIREMENTS.md`. This is
functional scope, not visual design — layout/styling is a build-time detail,
not an architecture decision.

## Flow: joining (new friend onboarding)

1. An existing member generates an invite from their Profile screen (or a
   simple "invite a friend" action) and shares the resulting link.
2. The invite link opens a landing page with a single "Sign in with Google"
   action — no separate signup form, since the account *is* the Google
   account.
3. On successful Google auth, the invite code carried in the link gates
   account creation (see `docs/architecture/stack-decision.md`). If the code
   is invalid/already used/expired, show a clear "this invite isn't valid
   anymore, ask for a new one" message rather than a generic auth error.
4. On success, land directly in the app (Pool tab) — no separate onboarding
   wizard needed for a friend-group app this size.

## Navigation shell (installed PWA)

Bottom nav (mobile-first, since this is meant to be used standing in a
kitchen or deciding what to eat on a phone):

1. **Pool** — the shared recipe library (home)
2. **Picker** — the cuisine/food picker
3. **Add** — extract a new recipe (URL / paste text / photo / PDF)
4. **Activity** — notification feed
5. **Profile** — your own cook history + settings

## Flow: Add a recipe

1. Tap **Add**.
2. Choose input mode: paste URL, paste text, take/upload photo, upload PDF.
3. **URL/text**: submit → loading state → recipe detail screen (synchronous
   path, same as v1's flow).
4. **Photo/PDF**: submit → immediately shows an "extracting…" placeholder
   card in the pool (this is the async path — see `extraction-pipeline.md`)
   → replaced in place once the Queue-driven extraction resolves (via
   polling or the push notification landing you back on this card).
5. On any extraction failure, show the specific failure reason (not just a
   generic error — the current app's `ErrorCode` variants already
   distinguish "no recipe found" vs. "extraction failed" vs. "unsafe URL",
   keep surfacing that distinction to the user).
6. On success, the recipe is immediately in the shared pool — no separate
   "publish" step. Tags can be added at this point or later (don't block
   saving on tagging).

## Flow: Browse the pool

1. **Pool** tab: list/grid of all shared recipes, most-recently-added or
   most-recently-cooked first (pick one as default, offer the other as a
   sort option).
2. Filter by tag, search by title.
3. Each card shows: title, image, aggregate rating, added-by attribution,
   a small "cooked N times" indicator.
4. Tap into a recipe → detail view.

## Flow: Recipe detail

Sections, top to bottom:

1. Title, image, metadata (servings/times), ingredients, instructions —
   same core recipe display as v1.
2. **Attribution**: "added by {name}". Edit button visible only if
   `session.userId === recipe.addedByUserId`.
3. **Cook log**: aggregate rating + count, "Log a cook" button (opens a
   small form: date defaults to now, optional 1-5 rating), then a list of
   past cook events (who, when, rating) — this is the "who cooked it how
   many times" feature made visible.
4. **Notes**: a simple threaded list, any friend can add one.
5. Anyone can rate via logging a cook; only the adder can edit the recipe
   itself.

## Flow: Cuisine/food picker

1. **Picker** tab: tag chips (cuisine, meal type, etc. — pulled from
   `/api/tags`), multi-select.
2. "Surprise me" → one randomized suggestion from the pool matching the
   selected tags (falls back to the whole pool if no tags selected).
3. Suggestion card links straight into the recipe detail view.
4. Re-roll button for another suggestion without changing filters.

This is intentionally simple — a filtered-random query, not a
recommendation engine. Nothing in the requirements asked for personalization
or "hasn't been cooked recently" weighting; don't build that speculatively.
If it turns out the picker feels too repetitive in practice, that's a
one-query change later (e.g. weight by recency of last cook), not an
architecture decision now.

## Flow: Activity (notifications)

1. Reverse-chronological feed, unread visually distinct.
2. Tapping a notification navigates to the relevant recipe.
3. "Mark all read" action.
4. Permission prompt for push notifications shown contextually (e.g. after
   the user's first successful recipe add or cook log — not a cold
   on-launch prompt, which people reflexively deny).

## Flow: Profile

1. Own info (name, avatar from Google account, editable display name).
2. Own cook history (same shape as the recipe-detail cook log, filtered to
   you) — a simple personal "what have I cooked" record.
3. Recipes you've added.
4. Notification preferences (push on/off) — no per-type granularity needed
   yet per `notifications.md`.

## Explicitly out of scope for v2

- Any restaurant-related screens (cut per requirements).
- Public/unauthenticated views of any kind — every screen requires a
  session.
- Ads, subscription/paywall UI, rate-limit warnings — all removed along with
  the freemium model.
