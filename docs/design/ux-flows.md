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
3. **URL/text**: submit → loading state → one of three outcomes
   (`api-design.md`):
   - **Already in the pool** (dedup hit on source URL) → skip straight to
     the existing recipe's detail screen with a "this is already in the
     pool" note, no new extraction run.
   - **Published** → recipe detail screen, same as v1's flow.
   - **Needs review** (confidence below threshold) → a review/edit screen
     showing exactly what was extracted, editable inline, with a "Publish
     to pool" action. Nothing is visible to other friends until this step
     is completed — see "Needs-review" below.
4. **Photo/PDF**: submit → immediately shows an "extracting…" placeholder
   card (this is the async path — see `extraction-pipeline.md`) → resolves
   in place once the Queue-driven extraction finishes, landing on whichever
   of the three outcomes above applies (dedup isn't checked for these since
   they have no source URL to key on).
5. On any extraction failure, show the specific failure reason (not just a
   generic error — the current app's `ErrorCode` variants already
   distinguish "no recipe found" vs. "extraction failed" vs. "unsafe URL",
   keep surfacing that distinction to the user).
6. On a normal **published** outcome, the recipe is immediately in the
   shared pool — no separate publish step. Tags can be added at this point
   or later (don't block saving on tagging). Tag input is autocomplete-first:
   typing suggests existing matching tags before offering "create new tag" —
   freeform creation is allowed, but reusing an existing tag is always
   presented first to keep the food picker's filters from fragmenting
   (`data-model.md`).

### Needs-review sub-flow

1. Landing screen shows the extracted title/ingredients/instructions/etc.
   pre-filled and editable, with a visible "this hasn't been checked yet —
   review before it goes live" framing (not styled as an error; a
   needs-review result is expected behavior on a weak source, not a bug).
2. The adder edits whatever's wrong (or leaves it if it's actually fine —
   the threshold is a heuristic, not always right) and taps "Publish to
   pool."
3. Only on publish does the recipe become visible in `/api/recipes`
   listings and the picker, and only then does the `new_recipe`
   notification fire to other friends (`notifications.md`) — a
   still-under-review recipe doesn't spam the group.
4. If the adder abandons this screen without publishing, the recipe simply
   sits in `needs_review` state indefinitely — reachable again from their
   own profile ("recipes you've added") rather than lost, since recipes are
   never deleted.

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
   same core recipe display as v1, **carrying forward v1's serving-size
   scaling and print/copy export** as baseline functionality, not new work.
2. **Attribution**: "added by {name}". Edit button visible only if
   `session.userId === recipe.addedByUserId`.
3. **Cook log**: aggregate rating + count, "Log a cook" button (opens a
   small form: date defaults to now, optional 1-5 rating), then a list of
   past cook events (who, when, rating) — this is the "who cooked it how
   many times" feature made visible. Your own recent entries show an
   edit/delete affordance for a short window after logging (default 24h —
   `data-model.md`), then it locks; older entries in the list are read-only
   even to the person who logged them.
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
3. Recipes you've added — including any still sitting in `needs_review`
   (visibly flagged as such here, since this is the only place they're
   reachable until published).
4. Notification preferences (push on/off) — no per-type granularity needed
   yet per `notifications.md`.

## Explicitly out of scope for v2

- Any restaurant-related screens (cut per requirements).
- Public/unauthenticated views of any kind — every screen requires a
  session.
- Ads, subscription/paywall UI, rate-limit warnings — all removed along with
  the freemium model.
