# Memory Journal App: Build Documentation v0.2.1

> [Index](build-documentation.md) | Previous: [v0.2.0](build-documentation-v0.2.0.md) | Next: [v0.2.2](build-documentation-v0.2.2.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

> This file holds no section of its own: recall score fix and single Android file.

## About this version

Version 0.2.1 was a small fix release. The old single build document has no section for it: its changes were made inside the existing plan and the release setup, not as a plan section of their own. This file exists so the version list has no gap and so every version has a pointer.

## What changed (from `docs/release-notes.md`, section v0.2.1)

- **Recall score fix.** The Later recall part of the score counts the words the newest pass has that the first pass did not, so text added to an older day and then deleted no longer keeps its points.
- **One Android file.** Each release has a single APK, `MemoryJournal-v0.2.1-android.apk`, that runs on 64-bit and 32-bit phones. The separate arm64-only file is no longer published.
- **Faster releases.** Only one Android build is made, so the release build takes about half as long.
- **Checks on tags only.** The GitHub checks run when a version tag is pushed or when started by hand, not on every commit.

## Where to read more

- Full wording and the known limits: `docs/release-notes.md`, section v0.2.1.
- The score rules as they stand today: [v0.1.0](build-documentation-v0.1.0.md), section 8.1, with later changes in the files that follow.
- The exact edits: the git history around the `v0.2.1` tag.
