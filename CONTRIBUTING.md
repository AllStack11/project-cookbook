# Branching & Merge Strategy

This applies to all work on this repo, human or agent-driven.

## One branch per unit of work

A "unit of work" is one feature, one bug fix, one BUILD_GUIDE.md phase step —
not an open-ended "ongoing work" branch. Concretely:

- Every new piece of work branches from the current tip of `main`, never
  from another unmerged feature branch (no stacking) unless there's an
  explicit, acknowledged dependency between two in-flight branches.
- **A merged branch is finished.** Don't push new commits to it, don't
  rebase new unrelated work onto it, don't reopen it. If follow-up work
  relates to something already merged, that follow-up gets a **new** branch
  cut from the current `main` (which now includes the merged work).
- Branches get deleted after merge. GitHub's "Automatically delete head
  branches" setting handles this automatically — see Setup below.

## Naming

- Claude Code sessions auto-generate `claude/<slug>-<id>` branch names —
  use these as-is, no need to override. Each session is naturally scoped to
  one task, which already satisfies "one branch per unit of work" as long
  as a session's branch isn't reused across unrelated follow-up asks after
  its PR merges (see above).
- Manually created branches: `feat/<short-name>`, `fix/<short-name>`,
  `docs/<short-name>`, `chore/<short-name>`.

## Merging

- **Squash merge only.** Every PR collapses to one commit on `main`,
  regardless of how many intermediate commits it had. Keeps `main`'s
  history as one entry per feature/fix instead of accumulating every
  iterative "docs: fix X" commit from the branch.
- `main` is protected: no direct pushes, changes land only via a merged PR.

## One-time repo setup (GitHub Settings — not enforceable via API from here)

These need to be set once, by whoever has admin access to the repo:

1. **Settings → General → Pull Requests**: uncheck "Allow merge commits" and
   "Allow rebase merging," leave only "Allow squash merging" checked. Also
   check **"Automatically delete head branches."**
2. **Settings → Branches → Add branch protection rule** for `main`: enable
   "Require a pull request before merging." (Optionally also "Require
   status checks to pass" once CI exists — see `BUILD_GUIDE.md` Phase 0's
   GitHub Actions deploy workflow.)

Until these are set, the convention above is enforced by discipline
(including by any Claude Code session working in this repo), not by
GitHub — treat a stray direct push to `main` or a non-squash merge as a
mistake to flag, not a new precedent.
