# Changelog Design

## Summary

Add a `CHANGELOG.md` to the project following Keep a Changelog conventions, enforced by a pre-commit hook that ensures every commit includes a changelog update (with an opt-out escape hatch).

## Audience

Both end users (gitzen.dev) and self-hosters. Entries should call out user-facing changes and self-hosting impacts (new secrets, config changes, migration steps).

## CHANGELOG.md format

Follows [Keep a Changelog](https://keepachangelog.com/):

- `## Unreleased` section at the top for in-progress changes
- When cutting a release, rename `Unreleased` to a date heading (`## YYYY-MM-DD`)
- Categories: **Added**, **Changed**, **Fixed**, **Removed**, **Security** — only include categories that have entries
- Each entry is a single bullet point, written for humans (not commit messages)

## Pre-commit hook

Shell script at `.githooks/pre-commit`:

1. Checks if `CHANGELOG.md` is in the staged files (`git diff --cached --name-only`)
2. If staged, commit proceeds
3. If not staged, checks for `SKIP_CHANGELOG=1` environment variable
4. If neither, rejects the commit with a message explaining how to update the changelog or skip

Setup:
- Hook committed to repo at `.githooks/pre-commit`
- `package.json` `prepare` script runs `git config core.hooksPath .githooks` — auto-configures on `npm install`
- Opt-out: `SKIP_CHANGELOG=1 git commit -m "..."`

## Backfill

Initial `CHANGELOG.md` summarizes all existing features under a single `## 2026-02-26` date heading rather than mapping individual commits.

## Implementation

1. Create `.githooks/pre-commit` script
2. Add `prepare` script to `package.json`
3. Create `CHANGELOG.md` with backfilled history and an `## Unreleased` section
4. Commit everything (the hook itself won't block since CHANGELOG.md will be staged)
