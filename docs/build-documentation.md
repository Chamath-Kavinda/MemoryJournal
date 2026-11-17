# Memory Journal App: Build Documentation (index)

This file is the entry point to the build documentation. The plan used to be one file. It reached its size limit at v0.2.4, so it is now split into one file per version. The text of each part is unchanged and keeps its old section numbers, so references such as "section 6" or "section 15.16" in the code, the README and the release notes still resolve through the table below.

## Files

| Version | File                                                           | Holds                      | About                                                                                                                                                                                                                                                               |
| ------- | -------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.0   | [build-documentation-v0.1.0.md](build-documentation-v0.1.0.md) | sections 1 to 14           | Product summary, assumptions, tech stack, repository structure, features, data model, security, analyzer, screens, platform notes, testing, git workflow and commit plan (milestones 1 to 7, commits 1 to 42), acceptance criteria and building-agent instructions. |
| 0.2.0   | [build-documentation-v0.2.0.md](build-documentation-v0.2.0.md) | section 15 (15.1 to 15.16) | APK size reduction, release artifacts, splash screen, guest mode, neon gradient theme, navigation, responsive layout, delete confirmations, screen-by-screen UI, dependencies, milestone 8 commit sequence (commits 43 to 63), acceptance criteria and motion.      |
| 0.2.1   | [build-documentation-v0.2.1.md](build-documentation-v0.2.1.md) | no section of its own      | Small fix release. It has no plan section; see the note in its file.                                                                                                                                                                                                |
| 0.2.2   | [build-documentation-v0.2.2.md](build-documentation-v0.2.2.md) | section 16 (16.1 to 16.5)  | Navigation bar and bottom of the screen, theme animation, Library date field and Day screen banners.                                                                                                                                                                |
| 0.2.3   | [build-documentation-v0.2.3.md](build-documentation-v0.2.3.md) | section 17 (17.1 to 17.8)  | Sri Lankan public holidays, wide calendar, themed scrollbar, license and notices, and the Home greeting.                                                                                                                                                            |
| 0.2.4   | [build-documentation-v0.2.4.md](build-documentation-v0.2.4.md) | section 18 (18.1 to 18.10) | View and Edit modes on the Day screen, Add time, Add tag, storage and legacy days, score and streak, removed parts, commits and acceptance criteria.                                                                                                                |
| 0.2.5   | [build-documentation-v0.2.5.md](build-documentation-v0.2.5.md) | its own sections 1 to 9    | No animated movement, visible Android system buttons, greeting in the top bar, Day tools at the top, sheet and time-grid fixes. Plan only, not built yet.                                                                                                           |

## How to read it

1. Read the files from the oldest version to the newest: [v0.1.0](build-documentation-v0.1.0.md), [v0.2.0](build-documentation-v0.2.0.md), [v0.2.1](build-documentation-v0.2.1.md), [v0.2.2](build-documentation-v0.2.2.md), [v0.2.3](build-documentation-v0.2.3.md), [v0.2.4](build-documentation-v0.2.4.md), [v0.2.5](build-documentation-v0.2.5.md).
2. When two files disagree, the newer file wins. Each newer plan lists the older parts it replaces in a section called "What this file replaces" (or in its opening section).
3. Inline notes inside an older file such as "replaced by section 18" point to a section number. Use the table above to find the file for that number.

## Section number map

| Sections                                                                                                                                                     | File                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 1 to 14 (product, stack, features, data model at section 6, security, analyzer at section 8, screens, testing, git workflow, acceptance, agent instructions) | [v0.1.0](build-documentation-v0.1.0.md) |
| 15 (v0.2.0, with 15.16 Motion and animation)                                                                                                                 | [v0.2.0](build-documentation-v0.2.0.md) |
| 16 (v0.2.2)                                                                                                                                                  | [v0.2.2](build-documentation-v0.2.2.md) |
| 17 (v0.2.3, with 17.8 Home greeting)                                                                                                                         | [v0.2.3](build-documentation-v0.2.3.md) |
| 18 (v0.2.4)                                                                                                                                                  | [v0.2.4](build-documentation-v0.2.4.md) |
| v0.2.5 sections 1 to 9 (its own numbering)                                                                                                                   | [v0.2.5](build-documentation-v0.2.5.md) |

## Adding a new release

1. Create `docs/build-documentation-vX.Y.Z.md` for the new version. Start it with a "What this file replaces" table, as v0.2.5 does.
2. Add a row to the Files table and the section map above, and add Previous and Next links to the neighbouring files.
3. Do not edit the older version files except to fix a mistake. Changes go in the new file.

## Other documents

- [release-notes.md](release-notes.md): what shipped in each version.
- [decisions.md](decisions.md): choices the plan left open.
- [qa.md](qa.md): the manual test checklist.
