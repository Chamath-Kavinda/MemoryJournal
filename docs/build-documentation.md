# Memory Journal App: Build Documentation

This document is the single source of truth for building the app. Follow it in order. It contains no open questions; where the product idea was ambiguous, a decision is recorded under Assumptions.

## 1. Product Summary

A private journaling app for Windows, Android and (optionally) iOS that trains memory by making the user recall their day each night. Writing about _today_ is locked until 9:00 PM local time. After 9 PM the user writes everything they remember about the day. On later days they can come back and add details they remembered afterwards, and the app keeps every writing pass so they can compare what they recalled the first, second and third time.

Core pillars:

- **Locked day writer**: today is read-only until 21:00, then writable. Past days stay editable forever.
- **Hourly day view**: each day is split into 1-hour rows; inside a row the user can mark exact minutes.
- **Tags**: people, places, numbers and custom categories that can be reused while writing.
- **Movies and Books**: free-form pages with no time structure.
- **Analyzer**: recall score, streak and motivational messages, computed on the device.
- **Tutorials**: bundled lessons on memory techniques such as the memory palace.

## 2. Assumptions (decisions already made)

1. The day view is a list of 24 hourly rows plus one **Free Notes** block at the top for things the user remembers but cannot place in time. This covers both the blank-page idea and the hourly-row idea.
2. The unlock time is a fixed constant of 21:00 in the user's local time zone.
3. The analyzer is rule-based and runs fully on the device. No journal text is ever sent to any AI service or third party in v1.
4. There are no memory-jogging prompts or hints inside the writer. The point is unaided recall.
5. Sign-in is Google (Gmail) only, through Firebase Authentication, and it is optional: the app also works in guest mode, with the journal stored only on the device and merged into the account when the user signs in (section 15.6).
6. iOS is supported by the same code but is built last and is optional.
7. One shared codebase: React Native (Expo) for Android and iOS, and the same React Native code compiled for web (react-native-web) and wrapped by Electron for Windows.
8. From v0.2.0 the default theme is dark with a neon violet and blue gradient accent, and the app opens on a name-and-loading splash (sections 15.5 and 15.7).

## 3. Tech Stack

| Area          | Choice                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| Language      | TypeScript (strict mode) everywhere                                                     |
| UI            | React Native with Expo (managed workflow with development builds)                       |
| Desktop       | Electron wrapping the Expo web build (react-native-web)                                 |
| Navigation    | Expo Router (file-based, works on native and web)                                       |
| State         | Zustand for UI state, TanStack Query is not needed because Firestore listeners are used |
| Backend       | Firebase: Authentication, Cloud Firestore, Firestore Security Rules                     |
| Notifications | expo-notifications (local scheduled) on mobile; Electron Notification API on desktop    |
| Dates         | date-fns                                                                                |
| Validation    | zod                                                                                     |
| Tests         | Jest and React Native Testing Library; Firebase Emulator Suite for rules tests          |
| Packaging     | EAS Build (Android AAB/APK, iOS), electron-builder (Windows NSIS installer)             |
| Tooling       | pnpm workspaces, ESLint, Prettier, Husky, lint-staged, commitlint                       |

Use the latest stable versions available when scaffolding. Do not use Cloud Functions in v1, so the project can stay on the free Firebase plan. Libraries added for v0.2.0 (icons, gradients, fonts, build size) are listed in section 15.12.

## 4. Repository Structure

```
memory-journal/
  apps/
    app/                 Expo app (Android, iOS, web build)
      app/               Expo Router screens
      src/
        components/
        features/        day, tags, library, analyzer, tutorials, settings
        platform/        notifications, auth adapters per platform
    desktop/             Electron shell
      src/main.ts        window, tray, scheduler, deep links
      src/preload.ts     safe bridge to the renderer
      electron-builder.yml
  packages/
    core/                Pure TypeScript, no UI, fully unit tested
      src/types.ts
      src/time.ts        unlock rules, day ids
      src/revisions.ts   revision helpers
      src/score.ts       recall score
      src/streak.ts
      src/messages.ts    motivational message engine
      src/tutorials/     lesson content (markdown)
  firebase/
    firestore.rules
    firestore.indexes.json
    rules.test.ts
  docs/
  .github/workflows/
```

Rule: all business logic (time rules, scoring, streaks, messages) lives in `packages/core` so mobile and desktop behave identically and the logic is testable without a UI.

## 5. Features in Detail

### 5.1 Authentication

- Sign-in is optional. The app opens straight to Home in guest mode (section 15.6). Continue with Google is offered on a sign-in modal that opens from the Sign in button on Home, from Settings and from the guest banner.
- Android and iOS: use the native Google sign-in library and pass the ID token to Firebase with `signInWithCredential`. If the guest journal has entries, it is merged into the account as described in section 15.6.
- Desktop (Electron): open the system browser for the Google OAuth flow, receive the result through a loopback redirect on `127.0.0.1` or a custom deep link, then sign in with the credential in the same way. Do not use embedded popups for Google sign-in inside Electron.
- Keep the user signed in with persisted auth state. Provide a Sign out action in Settings for signed-in users. Signing out removes the journal from the device and returns to an empty guest mode (section 15.6).
- The first time a Google account signs in, create the `users/{uid}` document with the device time zone and UTC offset.
- If iOS is shipped, also add Sign in with Apple, because the App Store requires it when another third-party sign-in is offered.

### 5.2 Home Page

- A month calendar. Each date shows a small dot if it has any writing and a ring if it is today.
- Dates are colored by state: written, empty past day, today, future (disabled).
- Top bar shows the current streak and the latest recall score.
- Tapping a date opens the Day screen for that date.
- Navigation: a bottom tab bar with icons on phones and tablets (Home, Tags, Library for movies and books, Insights, Learn) and a left sidebar at desktop widths (the same items plus Settings). On phones, Settings opens from the gear icon in the top bar (section 15.8).

### 5.3 Day Screen (the writer)

From v0.2.4 the Day screen is a read-only page with a pencil that opens one free writing space, and the Free Notes block and the hourly rows described below are replaced (section 18). The lock, revision, tag and highlight rules below still apply.

Layout from top to bottom: date header, status banner, Free Notes block, then 24 hourly rows (00:00 to 23:00).

**Lock rules**

- Future date: not openable.
- Today before 21:00 local: the screen opens read-only with a banner showing a countdown to 9:00 PM. Nothing can be typed.
- Today at or after 21:00: editable.
- Any past date: always editable.
- The rules are computed from the server time offset and the stored UTC offset, never from a value the user can change by editing the device clock alone (see 7.3).

**Hourly rows**

- Each row shows the hour label and a one-line preview. Tap or click to expand into a text editor.
- Inside an expanded row the user can tap Add minute. This inserts a minute marker (for example `:25`) at the cursor, and the text after the marker belongs to that minute. Minute markers are stored as separate blocks so the day can later be displayed in exact time order.
- Empty rows stay collapsed and cost nothing.
- The user can type freely and does not have to fill every row.

**Free Notes**

- One block with no time, for anything the user remembers but cannot place.

**Tag use while writing**

- Typing `@` opens a suggestion list of saved tags, grouped by category. Choosing one inserts a mention chip.
- A toolbar button opens the tag picker. A Create new tag option lets the user add a tag without leaving the screen.
- Selecting text and choosing Save as tag turns it into a tag.

**Saving and revisions**

- Autosave drafts locally every few seconds while typing.
- Pressing Save (or closing the day) commits a **revision** if the content changed.
- Revision 1 is the first save of that day. Every later save session on any later day creates revision 2, 3 and so on. Several saves within the same sitting update the open revision instead of creating a new one (a sitting ends after 30 minutes of inactivity or when the screen is closed).
- Revisions are append-only and immutable once the sitting ends.

**Revision toggle**

- A segmented control at the top: Latest, 1st, 2nd, 3rd, and so on.
- Choosing a pass shows the day exactly as it was then.
- A Highlight additions switch marks text that was not present in the previous pass, so the user can see what they remembered later.

### 5.4 Tags

- Default categories: **People**, **Places**, **Numbers**. The user can create, rename and delete custom categories (for example Songs, Foods, Dreams).
- A tag has: name, category, optional note, optional aliases, creation date.
- Examples: a person with a note on where they met; a place; a number such as a phone number or a vehicle number.
- Tag detail screen lists every day, movie or book where the tag was mentioned, newest first.
- Search and filter by category.
- Deleting a tag keeps the mention text in old entries as plain text.

### 5.5 Library (Movies and Books)

- Two tabs: Movies and Books.
- Each item has a title, type, optional date watched or read, and one free page of text with no time sections.
- Tags work here as well.
- The page keeps revisions in the same way as days (always editable, no 9 PM lock).

### 5.6 Insights (the analyzer)

Shows the recall score, the streak, a 30-day trend, and one motivational message. Details are in section 8.

### 5.7 Learn (tutorials)

- Bundled lessons shipped inside the app as markdown, readable offline, with a Mark as done toggle stored per user.
- Required lessons: What memory actually is; The memory palace (using your own home as the place and walking through it in your mind); Linking and visual stories; Chunking numbers; Names and faces; Spaced recall (recall without looking, then check); Evening review habit.
- Each lesson ends with a short Try it tonight exercise that links to the Day screen.

### 5.8 Notifications

- A daily reminder at 21:00 local time with the text: Time to write your day. Tap to open.
- Mobile: a repeating local notification scheduled with expo-notifications; reschedule on app start and when the time zone changes. Request permission on first launch after sign-in.
- Desktop: the Electron main process runs a scheduler and keeps living in the system tray when the window is closed, firing a native notification at 21:00. Clicking it focuses the window on today.
- Settings has a toggle to turn the reminder off. The 21:00 unlock time itself is not configurable.

### 5.9 Settings

Profile (name and email, read-only; guests see the guest state and a Sign in with Google button), reminder toggle, theme (dark, light, system; dark is the default), export all data as JSON, delete account and all data (confirm twice; shown as Erase guest data for guests), sign out (signed-in users only). Every delete and remove action in the app asks for confirmation (section 15.10).

## 6. Data Model (Cloud Firestore)

Everything lives under the user so the security rules stay simple.

```
users/{uid}
  displayName, email, timeZone, utcOffsetMinutes, createdAt
  stats: { currentStreak, longestStreak, lastStreakDay, freezeCount, recallScore, scoreUpdatedAt }
  settings: { reminderEnabled, theme }

users/{uid}/days/{yyyy-MM-dd}
  date, latestRevision, wordCount, updatedAt, firstWrittenAt

users/{uid}/days/{dayId}/revisions/{n}
  n, createdAt, closedAt, kind: 'first' | 'later'
  freeNotes: string
  blocks: [ { hour: 0-23, minute: 0-59 | null, text: string } ]
  mentions: [ tagId ]
  wordCount, addedWordCount

users/{uid}/tagCategories/{categoryId}
  name, isDefault, order

users/{uid}/tags/{tagId}
  name, categoryId, note, aliases: [string], createdAt

users/{uid}/library/{itemId}
  type: 'movie' | 'book', title, date, text, latestRevision, updatedAt

users/{uid}/library/{itemId}/revisions/{n}
  n, createdAt, text, mentions

users/{uid}/progress/tutorials
  completed: [ lessonId ]
```

Notes:

- `dayId` is the local calendar date in `yyyy-MM-dd`.
- Only the revision documents hold journal text; the day document holds metadata for fast calendar rendering.
- Mentions inside text are stored as tokens like `{{tag:TAG_ID}}` and resolved at render time.
- Enable Firestore offline persistence so the app works without internet and syncs later.
- Guest mode (section 15.6) does not use Firestore. A guest's data stays on the device in a local store with the same shapes as the documents above, behind one `JournalRepository` interface, and is merged into the account on sign-in.

## 7. Security and Privacy

### 7.1 Rules

Write `firebase/firestore.rules` so that:

1. A user can read and write only documents under `users/{their uid}`.
2. Revision documents can be created but never updated or deleted after their sitting is closed (`closedAt` set).
3. A revision for a given `dayId` cannot be created if `dayId` is in the future.
4. A revision for today's `dayId` can be created only when the user's local time is 21:00 or later.

### 7.2 Computing local time inside rules

Store `utcOffsetMinutes` on the user document. In the rules, compute local time as `request.time + duration.value(offsetMinutes, 'm')` and read `.hours()`, `.year()`, `.month()` and `.day()` from it to compare with the `dayId`. Update the stored offset whenever the app detects a time zone change (including daylight saving changes).

### 7.3 Clock cheating

The client UI also enforces the lock, but the rules are the real guard because `request.time` is server time. Changing the phone clock therefore cannot unlock today for a signed-in user. A guest has no server, so the guest lock uses the device clock with the backwards-clock guard described in section 15.6.

### 7.4 Privacy

- No analytics SDK that reads journal content. Crash reporting, if added, must strip all text.
- Journal text is never sent to any AI service in v1.
- Export and delete-account features are mandatory.
- Rules tests (section 11) must prove one user can never read another user's data.

## 8. Analyzer Specification (Recall Score, Streak, Messages)

All logic is pure functions in `packages/core` and runs on the device.

### 8.1 Recall Score (0 to 100)

Calculated per written day, then smoothed over the last 14 written days as the displayed score.

| Component    | Weight | How it is measured                                                                                      |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------- |
| Detail       | 30     | Word count of revision 1, scaled against the user's own 30-day average, capped at 1.5 times the average |
| Coverage     | 20     | Number of distinct hours that contain text, out of 16 (waking hours)                                    |
| Precision    | 20     | Number of exact minute markers plus tag mentions, scaled up to 10                                       |
| Later recall | 15     | Words added in later revisions of days older than 1 day, scaled up to 30 words per day                  |
| Consistency  | 15     | Days written in the last 14 days out of 14                                                              |

The score is a motivation tool, not a medical measure. Show a short info sheet saying so. Show the score with a delta against the previous week.

### 8.2 Streak

- A day counts toward the streak when revision 1 is saved during the 9 PM unlock window of that same calendar day (21:00 to 23:59) with at least 20 words.
- Editing older days improves the score but does not extend the streak.
- Missing a day resets the streak to 0, unless a **freeze** is available. The user earns one freeze for every 7 consecutive days, up to a maximum of 2 banked. A freeze is spent automatically when a day is missed.
- Show current streak, longest streak and freezes banked. Celebrate milestones at 3, 7, 14, 30, 60, 100 and 365 days.

### 8.3 Motivational Messages

A deterministic rules engine with a library of at least 60 message templates in `messages.ts`, each with a trigger, a priority, and variants so the same sentence is not shown twice in a row. Examples of triggers:

- Streak milestone reached.
- Score rose by 5 or more compared with last week.
- A later revision added new detail to an old day (praise for remembering more after time passed).
- First time using tags, first minute marker, first movie or book entry.
- Wrote more than the user's 30-day average.
- Returning after a break (gentle, no guilt).
- Informative tips, such as: Details you remember later still count. Come back and add them.

Messages must always be encouraging and factual, never judgemental, and must use numbers from the user's real data (for example: You remembered 14 more details on Tuesday than the first time).

A future optional upgrade, outside v1, may use an AI model, only with explicit opt-in, a clear privacy screen and a no-store policy. Do not implement it now.

## 9. Screens and Navigation

```
/ (redirect to /home, never to /sign-in)
/sign-in                   optional modal, opened from Home, Settings or the guest banner
/(tabs)
  /home                    calendar
  /day/[dayId]             writer with revision toggle
  /tags                    list and categories
  /tags/[tagId]            tag detail
  /library                 movies and books tabs
  /library/[itemId]        free page
  /insights                score, streak, trend, message
  /learn                   lesson list
  /learn/[lessonId]        lesson
  /settings
```

Desktop uses the same routes with a left sidebar instead of bottom tabs (switch layout at widths above 900 px). On phones the bottom tabs are Home, Tags, Library, Insights and Learn, and Settings opens from the top bar (section 15.8).

## 10. Platform Notes

- **Android**: build with EAS. Use a development build, not Expo Go, because of native Google sign-in and notifications. Request the notification permission and exact-alarm behavior carefully; a repeating local notification is enough. APK size, file naming and the Play Protect warning are covered in sections 15.2 to 15.4.
- **iOS**: same code. Needs a Mac (or EAS cloud build) and an Apple developer account. Add Sign in with Apple.
- **Windows**: `pnpm --filter app export:web` creates the static bundle, Electron loads it from disk, and electron-builder produces an NSIS installer. Use `contextIsolation: true`, `nodeIntegration: false`, and expose only the notification and OAuth helpers through the preload script.
- **Responsive**: the same components adapt between phone, tablet and desktop widths. The size classes and the device matrix are in section 15.9.

## 11. Testing

- Unit tests in `packages/core` for time rules (including around 20:59, 21:00, midnight and daylight saving), revisions, score, streak (including freezes) and message selection. Target at least 90 percent coverage for this package.
- Firestore rules tests with the emulator for every rule in section 7.1, including the negative cases.
- Component tests for the Day screen: locked state, unlocked state, adding a minute marker, tag mention insert, revision toggle.
- A manual QA checklist in `docs/qa.md` covering sign-in, reminder firing, offline writing then sync, and export.
- Tests for guest mode (v0.2.0): the local repository stores and reads days, revisions, tags and library items; the backwards-clock guard keeps today locked; the merge combines tags, appends revisions to an existing day without touching the account's own revisions, rewrites tag mentions and can be run twice with the same result; a failed merge keeps the guest data; sign-out clears the device; and account A, a new account B and account A again each show only their own data.

## 12. Git Workflow and Commit Plan

- Branches: this is a solo project, so all work is committed directly on `main`, which must always build and pass tests. No feature branches are used.
- Commits follow Conventional Commits, enforced by commitlint: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `build:`, `ci:`. Each commit must build and pass tests. One logical change per commit. Imperative present tense, subject under 72 characters.
- Tag releases with `v0.1.0` and onwards. Never make a commit that only bumps the version: the version change always goes inside a commit that also changes other files (section 15.13).

Suggested commit sequence:

**Milestone 0: Foundation**

1. `chore: initialize pnpm monorepo with apps and packages`
2. `chore: add TypeScript strict config and shared tsconfig`
3. `chore: add eslint, prettier, husky, lint-staged and commitlint`
4. `docs: add README and copy build documentation into docs`
5. `ci: add workflow for lint, typecheck and tests`

**Milestone 1: Core logic**

6. `feat(core): add domain types for days, revisions, tags and library`
7. `feat(core): add unlock rules and day id helpers`
8. `test(core): cover unlock rules around 21:00, midnight and DST`
9. `feat(core): add revision and sitting helpers`

**Milestone 2: Firebase and auth**

10. `chore(firebase): add project config, emulator setup and env handling`
11. `feat(firebase): add firestore rules for owner-only access`
12. `feat(firebase): enforce future-day and 9 PM write rules`
13. `test(firebase): add rules tests with emulator`
14. `feat(app): add Google sign-in on mobile`
15. `feat(desktop): add Electron shell with browser-based Google sign-in`
16. `feat(app): create user profile with time zone on first sign-in`

**Milestone 3: Writer**

17. `feat(app): add home calendar with written-day indicators`
18. `feat(app): add day screen with locked and unlocked states`
19. `feat(app): add hourly rows and free notes block`
20. `feat(app): add minute markers inside hourly rows`
21. `feat(app): add draft autosave and offline persistence`
22. `feat(app): save revisions and add revision toggle`
23. `feat(app): add highlight additions between revisions`

**Milestone 4: Tags and library**

24. `feat(app): add tag categories and tag management`
25. `feat(app): add at-mention tag picker in the writer`
26. `feat(app): add tag detail with mention history`
27. `feat(app): add movies and books library with free pages`

**Milestone 5: Motivation**

28. `feat(core): add recall score calculation`
29. `feat(core): add streak and freeze logic`
30. `feat(core): add motivational message engine and templates`
31. `feat(app): add insights screen with score, streak and trend`
32. `feat(app): add streak and score to home header`

**Milestone 6: Learn, notifications, settings**

33. `feat(core): add tutorial lessons content`
34. `feat(app): add learn section with progress tracking`
35. `feat(app): schedule daily 9 PM reminder on mobile`
36. `feat(desktop): add tray and 9 PM reminder scheduler`
37. `feat(app): add settings, data export and account deletion`

**Milestone 7: Polish and release**

38. `feat(app): add dark theme and responsive desktop layout`
39. `fix(app): resolve accessibility and keyboard navigation issues`
40. `build: configure EAS and electron-builder`
41. `docs: add qa checklist and release notes`
42. `chore: release v0.1.0`

**Milestone 8: v0.2.0** is defined in section 15.14 (commits 43 to 63).

## 13. Acceptance Criteria

The app is complete for v1 when all of these are true:

1. A new user can open the app without signing in (guest mode), can sign in with Google on Android and Windows from Home, and sees an empty calendar.
2. At 20:59 today is read-only; at 21:00 it becomes writable; changing the device clock does not unlock it early (verified through the rules test and a manual test).
3. The user can write in hourly rows, add minute markers, and add Free Notes.
4. Reopening an older day and adding text creates a new revision, and the toggle shows each pass with additions highlighted.
5. Tags can be created in default and custom categories, inserted with `@`, and viewed with their mention history.
6. Movies and books each have a free page with no time sections.
7. The 9 PM reminder fires on both Android and Windows.
8. Insights shows a recall score, streak and a message that uses the user's real numbers.
9. All tutorial lessons are readable offline.
10. Data written offline syncs when the connection returns, and export and delete-account both work.
11. Core tests, rules tests and CI pass; the git history follows the plan in section 12. Version 0.2.0 has its own criteria in section 15.15.

## 14. Instructions for the Building Agent

- Work through the milestones in order and make the commits listed above. Do not combine milestones. For v0.2.0, continue with Milestone 8 in section 15.14 in the same way.
- Put all logic in `packages/core` first with tests, then build the UI on top of it.
- Do not add features that are not in this document. Do not add analytics, ads, AI calls or memory-jogging prompts.
- If a detail is missing, choose the simplest option that matches this document, record the decision in `docs/decisions.md`, and continue.

## 15. Version 0.2.0: Experience, Guest Mode and Size

This section is the plan for release v0.2.0. It was written after the first Android build was tried on real phones. It changes how the app looks, how it opens and how it ships. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak). Where this section and sections 1 to 14 disagree, this section wins, and sections 2, 5, 9, 10, 12, 13 and 14 have been updated to point here.

This change is documentation only. No code is written until the building agent starts Milestone 8 (section 15.14).

### 15.1 What the first phone test showed

- The downloaded file was named like `application-<long random id>.apk`. EAS gives every cloud download that default name. The app itself is named correctly: the display name is Memory Journal and the package name is `com.memoryjournal.app`.
- The APK is about 94 MB for a small app. The most likely cause is that one universal file carries the native libraries for four CPU types (section 15.2).
- Some phones show Google Play Protect with "App blocked to protect your device" and some do not (section 15.4).
- The app opens on a sign-in screen even though it should work without an account (section 15.6).
- The screens are plain: a white background, text links for Tags, Library and Insights, and a text Back button. There is no bottom navigation and no icons.

### 15.2 Reduce the APK size

Causes, from biggest to smallest:

1. One APK contains four CPU builds (arm64-v8a, armeabi-v7a, x86 and x86_64) and React Native plus Hermes are repeated in each. Real phones need arm64-v8a or armeabi-v7a only. The x86 builds exist for emulators.
2. Code shrinking and resource shrinking are off by default.
3. Assets and dependencies: the app icon is about 430 KB, and any unused image or package still ships.
4. The profile used: the `development` profile builds a development client, which is much larger than a release build. The file that is tested and shared must come from `preview` or `production`.

Plan:

- Measure first. Save the 94 MB file, rename a copy to `.zip`, and write down the size of the `lib/` folder per CPU type, the `classes*.dex` files, `res/` and `assets/`. Use Expo Atlas to see what is large inside the JavaScript bundle. Record the before and after numbers in `docs/decisions.md`.
- Rename `apps/app/app.json` to `apps/app/app.config.ts`, keeping every existing value, so that the Android CPU list can come from an environment variable set per EAS profile.
- Add the `expo-build-properties` plugin with `buildArchs` read from `ANDROID_ARCHS`, `enableProguardInReleaseBuilds` set to true and `enableShrinkResourcesInReleaseBuilds` set to true. Keep Hermes on.
- In `eas.json` set `ANDROID_ARCHS` to `arm64-v8a,armeabi-v7a` for the `preview` profile. Add a second profile `preview-arm64` with only `arm64-v8a` as an even smaller file for modern phones. The `development` profile keeps all four so the Windows Android emulator (x86_64) still works. The `production` profile builds an App Bundle with all types, because Google Play delivers only the matching CPU build to each phone, which is smaller than any APK.
- Re-export `icon.png` (1024 by 1024) as an optimized PNG under 150 KB, and remove images that are not used. The splash uses no image (section 15.5).
- Run a dependency check and remove every package that is not imported. Keep the package list small: no chart library (the trend chart is drawn with `react-native-svg`), one icon library, no UI kit, no extra animation library.
- Target: the `preview` APK is 50 MB or less, roughly half of today. This is an expectation to verify, not a promise. If the measured result misses it, record the measured breakdown and the reason in `docs/decisions.md` and continue.

### 15.3 APK file name and release artifacts

- EAS cloud builds always download as `application-<build id>.apk` and the name cannot be set in `eas.json`. So the release step renames the file.
- Add a Node script `scripts/release-android.mjs` (Node so it works on Windows) behind `pnpm release:android`. It starts the EAS build with `--json`, waits, downloads the artifact and saves it as `MemoryJournal-v<version>-android.apk` (and `MemoryJournal-v<version>-android-arm64.apk` for the arm64 profile), then prints the SHA-256 of each file.
- Publish both files on the GitHub Release page for the tag, with the checksums in the release text. People then download from that page and see the clean name.
- The Windows installer keeps its name `Memory Journal-Setup-<version>.exe`.
- The package name `com.memoryjournal.app` must never change. A different package name is a different app: installs do not update, user data is lost and Play Protect starts again from zero.

### 15.4 Play Protect "App blocked" message

What it means: this is not a virus finding. The message says Play Protect has not seen an app from this developer before. The app is signed with a new key and is installed from outside Google Play, so it is unknown to Google.

Why only some phones show it: it depends on each phone's Play Protect settings (Scan apps with Play Protect and Improve harmful app detection), the Google Play services version, whether the phone has Google services at all, and Google's gradual rollout of these checks. Google does not publish the exact rules, so the app cannot fix it in code. The steps below reduce it, best first:

1. Distribute through a Google Play testing track (internal or closed testing in Play Console). Apps installed from Play do not show this warning. It needs a Play developer account with a one-time fee. New personal accounts may have to run a closed test before production, so check the current Play Console rules.
2. Use Firebase App Distribution for testers. The project already uses Firebase, and testers get a proper install flow.
3. Keep the same signing key and package name for every build. Use the EAS managed credentials, never reset or regenerate them, and keep a backup made with `eas credentials`. A new key makes Play Protect treat the app as brand new again.
4. If the warning still appears after Play distribution, file a Play Protect appeal from Play Console.
5. For friends who get the APK directly: write the steps in the README under Installing on Android. On the warning tap Install anyway (the small text link under the description), then continue. Say clearly that this is only for people who trust the developer.
6. Google has announced developer verification for apps installed outside Play on certified Android phones, rolling out by region. Registering as a Play developer is expected to cover it. Check the current rules before each release.

### 15.5 Splash screen: name and loading only

- No icon and no logo image on the splash.
- Native splash (the first moments before JavaScript starts): a solid `#07070D` background with a fully transparent image, configured through the `expo-splash-screen` plugin. Android 12 and newer always reserve an icon area, so the transparent image is how the icon is hidden. This part lasts well under a second.
- In-app brand splash (the first React screen): the name Memory Journal in large bold `text` color with a soft violet glow, and under it a thin indeterminate loading bar with the violet to blue gradient. The background is the same `#07070D` so the hand-off is invisible. It fades out in 200 ms.
- It waits only for the bundled fonts and the saved theme, which are local. It never waits for the network or for Firebase. It shows for at least 500 ms to avoid a flash and for at most 3 seconds, then Home appears.
- The splash is always dark, whichever theme is saved, because it is a brand moment, and it fades into the saved theme.
- With reduced motion turned on, the loading bar is static and the text says Loading.
- Windows: the Electron window uses `backgroundColor` `#07070D`, stays hidden until `ready-to-show`, and shows the same brand splash, so there is no white flash.

### 15.6 Guest mode

Decisions:

1. The app opens straight to Home. The route `/` never redirects to sign-in.
2. A guest has no account and nothing in the cloud. The guest journal lives only on the device, in a local store that uses the same shapes as the Firestore documents in section 6 (days, revisions, tag categories, tags, library items, tutorial progress and settings). In guest mode the app does not call Firebase at all, so the very first launch works with no network. A guest can use everything: writer, tags, library, insights, learn, reminders and export.
3. Storage: define one `JournalRepository` interface in `packages/core` with two implementations, `LocalRepository` (guest) and `FirestoreRepository` (signed in). Screens talk only to the interface. `LocalRepository` uses `@react-native-async-storage/async-storage` (on web and in the Windows app this is the browser's localStorage underneath), with one key per day, revision, tag and library item so no single value gets large. If the default Android size limit (about 6 MB) becomes a problem, swap the adapter for `expo-sqlite` behind the same interface and record that in `docs/decisions.md`.
4. Guest lock: there is no server, so the 21:00 lock uses the device clock. Add a guard: store the latest time ever seen (`lastSeenAt`) on launch, on resume and on every save. If the device clock is more than 5 minutes behind it, keep today locked and show Your device clock looks wrong. Fix it to write today. This cannot stop every trick (clearing the app's data resets it) and that is accepted for guests. Signed-in users keep the server-enforced rule from section 7.
5. Turn off Android auto-backup (`android.allowBackup` set to `false` in the app config), so uninstalling and reinstalling starts clean. Uninstalling the app removes a guest journal completely.
6. Signing in is offered from a Sign in button in the top bar of Home, from a gentle banner on Home that can be dismissed for the session, and from Settings. It opens the sign-in modal at `/sign-in`. Signing in needs the network; offline shows an error card and the guest journal is untouched.
7. If the guest journal is empty, signing in is just `signInWithCredential`. Create `users/{uid}` with the time zone and offset if it is new, and the account's data appears.
8. If the guest journal has entries, show the merge dialog after the Google account is chosen and before anything changes: Add your guest journal to this account? 12 days, 5 tags and 2 library items will be added. Nothing already in the account is overwritten or deleted. Buttons: Cancel, Export guest data (JSON) and Merge and sign in. After the user confirms, sign in, run the merge below, verify the result, and only then delete the guest data from the device. A progress card shows the steps. If the merge fails or some entries are rejected, keep the guest data on the device, say which entries were not added, and offer Retry and Export. The merge is safe to run again because it uses fixed ids and merge writes.
9. Sign out (Settings, signed-in users only): the confirmation dialog from section 15.10 says: Sign out of name@example.com? This removes the journal from this device. It stays safe in your Google account, and signing in again brings it back. Before signing out, wait up to 5 seconds for pending writes to upload. If some cannot be uploaded (for example offline), the dialog adds: N changes are not uploaded yet and will be lost if you sign out, and the button reads Sign out anyway. On confirm: sign out, terminate Firestore and clear its offline cache, delete the local drafts, stats and settings of that account and every in-memory store, then return to an empty guest Home. Nothing of the account stays on the device.
10. Account switching: each sign-in shows only that account's cloud data. A new Google account starts empty. Signing out and signing in again with the first account brings its data back from the cloud. The only merge is guest to account; one account is never merged into another.
11. In Settings a guest sees Guest with a cloud-off icon, a Sign in with Google button and the note: Stored on this device only. Sign in to back it up. Uninstalling the app or clearing its data removes a guest journal. Sign out is hidden. Delete account and all data is shown as Erase guest data and keeps the double confirmation. Export works as before.
12. The first time a guest saves a revision, show a one-time dialog with the same warning and a single Got it button.
13. Streak, score and reminders behave exactly as for signed-in users, computed from whichever repository is active.
14. A guest is a session with no `auth.currentUser`. Do not store a guest flag in Firestore.
15. The Firestore rules keep the same logic. Add rules tests for cross-account isolation and for merge writes (section 15.14, commit 55).
16. Windows uses the same flow. Clearing the app's site data loses a guest journal there too, and the same notice applies.

Merge rules (guest to account):

- Write in batches of at most 400 operations, in this order: tag categories, tags, library, days with revisions, tutorial progress, settings, stats.
- Tag categories are matched by name, ignoring case. Missing ones are created.
- A guest tag with the same name (ignoring case) and category as an account tag is merged into it: aliases are combined and the account's note is kept (the guest note is used only if the account note is empty). Other guest tags are created with their own ids, or a new id if one collides. Every `{{tag:ID}}` mention in guest text is rewritten to the final tag id.
- A guest day that the account does not have is copied with its revisions unchanged. If the account already has that day, the guest revisions are appended after the account's last revision with the next numbers and `kind` set to `later`, keeping their original `createdAt`, and the day's `latestRevision`, `wordCount`, `addedWordCount` and `firstWrittenAt` (the earliest) are recomputed. The account's own revisions are never changed or deleted. Every merged revision gets `closedAt` set.
- Library items are copied (with a new id if one collides). There is no de-duplication.
- Completed tutorial lessons are combined.
- A brand-new account takes the guest settings. An existing account keeps its own settings.
- After the merge, recompute the streak, longest streak, freezes and score from the merged days on the device and write them to `users/{uid}`.
- The Firestore rules still apply to merge writes. A guest entry dated in the future, or for today before 21:00 in the account's local time, is rejected and reported. It stays in the export and is never forced through.

### 15.7 Design system: neon gradient theme

Principles: dark is the default; neon violet to blue gradients on near black; the light theme keeps the same brand gradient on a soft lavender white; the gradient is used for primary actions and a few highlights, never for body text. All colors come from tokens in `apps/app/src/theme/tokens.ts`. No hex colors in screens.

Dark tokens (default):

- `bg` `#07070D` screen background, near black with a blue tint
- `surface` `#0F0F1A` cards
- `surfaceRaised` `#171728` inputs, selected rows, dialogs
- `border` `#26264A`
- `text` `#F4F4FF`
- `textMuted` `#A3A3C7`
- `primaryStart` `#7C3AED` and `primaryEnd` `#2563EB` for button fills, with white text
- `neonViolet` `#A78BFA`, `neonBlue` `#60A5FA`, `neonCyan` `#22D3EE` for icons, active states, focus rings and gradient borders
- `neonPink` `#E879F9` for rare highlights such as milestones
- `success` `#34D399`, `warning` `#FBBF24`, `danger` `#FB7185`

Light tokens (a recommendation, since no light palette was chosen):

- `bg` `#F7F6FF` screen background, a very light lavender
- `surface` `#FFFFFF` cards
- `surfaceRaised` `#EFEDFF` inputs, selected rows
- `border` `#DDD8F5`
- `text` `#14122B` and `textMuted` `#5B5880`
- `primaryStart` `#7C3AED` and `primaryEnd` `#2563EB`, the same brand gradient with white text
- `accentViolet` `#6D28D9`, `accentBlue` `#1D4ED8`, `accentCyan` `#0E7490` for icons and active states, darker than the dark theme neons so they stay readable on white
- `accentPink` `#C026D3` for rare highlights
- `success` `#047857`, `warning` `#B45309`, `danger` `#BE123C`
- No glows. Use soft tinted shadows such as `rgba(124, 58, 237, 0.18)`.

Rules:

- Every text and background pair, and white text on the gradient, must pass WCAG AA in both themes. Extend the existing contrast test to cover the new tokens.
- Typography: Plus Jakarta Sans in weights 400, 600 and 700, bundled in the app (no network). Sizes: display 28/34 bold, title 22/28 bold, heading 18/24 semibold, body 16/24 regular, caption 13/18 regular. Layouts must survive the system font scale.
- Spacing on a 4-point grid (4, 8, 12, 16, 24, 32). Radius 12 for inputs and chips, 16 for cards, 24 for sheets and dialogs, fully round for pills. Borders are 1 px.
- Touch targets are at least 44 by 44 (48 on Android).
- Gradients (135 degrees, through `expo-linear-gradient`) appear only on: primary buttons, the active tab indicator, progress bars, the today ring, the score ring and the streak card border.
- Neon look: a 1 px gradient border on active and focused cards. Outer glow only where the platform renders it well (web, Windows and iOS). On Android use the gradient border and a tinted background instead of colored shadows.
- Motion: 150 to 250 ms ease-out, a press scale of 0.98, and respect the reduce motion setting.
- Theme setting: the default is Dark. The choices appear in the order Dark, Light, System with Moon, Sun and Smartphone icons. The choice is saved on the device (so the first frame is correct) and in `users/{uid}.settings.theme`.
- Upgrade rule: on the first launch of v0.2.0 set the theme to Dark once, using a local flag `themeDefaultV2`, because v0.1.0 defaulted to System. After that, respect the user's choice.
- Keep `userInterfaceStyle` as `automatic` in the app config and apply the choice at runtime with `Appearance.setColorScheme`. The status bar style, the system navigation bar button style and the root background follow the active theme. This also removes the v0.1.0 known limit that the Android navigation bar follows the system theme.

### 15.8 Navigation: bottom bar, top bar, icon back button

- Below 900 px: a bottom tab bar with five icon-only tabs: Home (House), Tags (Tag), Library (LibraryBig), Insights (TrendingUp) and Learn (GraduationCap). There are no text labels. The active tab uses the neon color for its icon with a gradient pill indicator and a soft glow, and its icon is drawn with a thicker stroke (2.5 instead of 2) so the state is clear without text. Inactive tabs use `textMuted`. Each tab target is at least 48 by 48 dp. The bar uses `surface` with a top `border`, is 56 dp tall plus the bottom safe area. Its motion is in section 15.16.
- Settings opens from a gear icon (Settings) at the top right of every tab screen. For guests, a Sign in pill (LogIn icon) sits next to it.
- At 900 px and wider: a slim left sidebar (72 px wide) with the same five icons and Settings at the bottom, icons only. Hovering or focusing an icon shows a tooltip with its name.
- The bottom bar is visible on the five tab screens only. Day, Tag detail, Library item, Lesson, Settings and the sign-in modal hide it.
- Every stack screen has an icon-only Back button (ChevronLeft) with a 44 by 44 target and the accessibility label Back. The word Back never appears as a text link. Hardware Back, Esc and Alt+Left do the same.
- Keep the shortcuts Alt+1 to Alt+6 (the sixth opens Settings).
- Because there are no text labels, screen readers read each accessibility label and announce the active tab as selected, a long press on Android shows a small tooltip with the name, and the tooltip on desktop also shows the shortcut (for example Tags, Alt+2).

### 15.9 Responsive layout

- Layouts react to window width, not device type: compact is below 600, medium is 600 to 899, expanded is 900 and above. One `useSizeClass()` hook provides it from `useWindowDimensions`, so rotation, split screen, foldables and Windows window resizing update live. Screens never read a device model.
- Compact: one column, bottom bar, 16 px side padding. Medium: bottom bar, content centered with a maximum width of 720, and lists as two columns (Tags, Library, Learn and the Insights cards). Expanded: sidebar, content up to 960 wide, two or three columns for grids. The Day writer stays at a maximum width of 720 for comfortable line length.
- Calendar cells are sized from the available width (minimum 40, maximum 56) and use flex or percentages, never fixed pixel widths.
- Use `react-native-safe-area-context` for notches, status bar and gesture bars. The writer keeps the active row visible above the keyboard.
- Orientation: change `orientation` in the app config from `portrait` to `default`. In compact landscape (height under 500) the bottom bar stays icons only but gets shorter, and headers shrink.
- Layouts must hold at system font scale 130 percent and 200 percent with no clipped or overlapping text: no fixed heights on text containers.
- Check on this matrix: a 360 by 640 phone, a 412 by 915 phone, a 600 by 960 small tablet, an 820 by 1180 tablet, a phone in landscape, an unfolded foldable, and a Windows window from 480 to 1920 wide.
- Windows: the window minimum size is 480 by 640 and the last size is remembered.

### 15.10 Confirmation popups for every delete and remove

- Build one `ConfirmDialog` component and a promise-style `useConfirm()` helper on React Native `Modal`. Do not use `Alert.alert`, because it does not work on web or in the Electron app.
- Content: an icon (Trash2 or TriangleAlert) in a circle tinted with `danger`; a title that names the action (Delete tag?); one sentence that names the exact item and what happens (Ana will be deleted. Mentions in your old entries stay as plain text.); two buttons: Cancel (secondary, focused by default) and a verb button (Delete tag) in the `danger` color. Never use OK or Yes.
- Tapping the backdrop, hardware Back and Esc all mean Cancel. Screen readers announce the title and message, and focus stays inside the dialog.
- Required for: delete tag; delete tag category (the message says how many tags go with it, and that mentions stay as plain text); remove a tag alias; delete a movie or book; discard unsaved changes when leaving the Day screen, a Library item or a tag form; sign out; delete account and all data (keeps the two steps, and each step uses the dialog); erase guest data (two steps); replace the guest journal when signing in (section 15.6).
- Revisions cannot be deleted, so they have no delete action.
- Rule for the code: every call to a delete, remove, clear, erase, discard or sign-out function goes through `useConfirm()`. Unit tests prove that Cancel leaves the data unchanged and that confirming performs the action. The QA checklist includes a search for these verbs with a check of each call site. An undo toast is never a replacement for the dialog.

### 15.11 Screen by screen UI, with icons

Icons come from `lucide-react-native`. The names below are Lucide names; use the equivalent name if the installed version differs. Sizes are 20 (inline), 24 (buttons and tabs) and 40 to 56 (empty states). Every icon button has an accessibility label. Every empty state has a large icon in a gradient tinted circle, one sentence and one primary action. Navigation (bottom bar, sidebar, Back) is icons only, with no text labels. Buttons that perform an action keep a text label next to their icon. Every screen below also follows the motion plan in section 15.16.

- Splash: section 15.5.
- Sign-in modal: close icon (X) at the top right, the app name, the line Back up your journal and use it on your other devices, a Continue with Google button with the Google G logo, and a Maybe later text button that closes the modal. If the guest journal has entries, the merge dialog from section 15.6 appears after the Google account is chosen. If the device is offline, an inline error card says Connect to the internet to sign in.
- Home: top bar with the app name on the left, then the Sign in pill for guests and the Settings gear. Under it, the guest banner when signed out. Two stat cards side by side with gradient borders: Streak (Flame, 0 days) and Recall score (Sparkles, shown as two dashes until there is a score). The calendar card has the month title and ChevronLeft and ChevronRight icon buttons. Today has a gradient ring with a soft glow, written days have a small gradient dot, empty past days are muted and future days are faded and disabled. A small legend sits below. A Today card follows: before 21:00 it shows Lock with Opens at 9:00 PM and a live countdown; at or after 21:00 it shows LockOpen and a gradient Write today button (PenLine). The old text links for Tags, Library and Insights are removed because they are tabs now.
- Day (replaced by section 18 from v0.2.4): header with Back icon, the date and a lock chip (Lock or LockOpen with the countdown). A revision control with the History icon (Latest, 1st, 2nd and so on) and a Highlight additions switch with the Highlighter icon. The Free Notes card uses NotebookPen. Each hourly row is a card with Clock, the hour, a one-line preview and ChevronDown. An expanded row has a toolbar of icon buttons: Timer (Add minute), AtSign (tag picker) and Tag (Save as tag). A sticky bottom bar with a gradient Save button (Save) appears when there are unsaved changes. Leaving with unsaved changes asks to discard (section 15.10). When locked, rows are dimmed with a Lock icon and a banner explains the countdown.
- Tags: a Tag icon in the title. A gradient New tag button (Plus) and a Manage categories button (Settings2). A search field with Search and a clear X. Category chips with icons: All (LayoutGrid), People (Users), Places (MapPin), Numbers (Hash), custom categories (Tag). Tag cards show the category icon in a tinted circle, the name, a note preview and a mention count, with a Trash2 icon button that asks for confirmation. The empty state keeps the existing sentence and adds a New tag button.
- Tag detail: Back icon; Pencil and Trash2 icon buttons in the header; a category chip; aliases as chips with an X to remove (with confirmation); the note; a mention history with Calendar, Film or BookOpen icons by source.
- Library: a Movies and Books switch with Film and BookOpen icons; a gradient Add movie or Add book button (Plus); item cards with icon, title, date (Calendar) and word count; an empty state that keeps the existing sentence.
- Library item: Back icon, title, a date field with Calendar, the free page editor, tag chips, the same revision control as Day, and a Trash2 header action with confirmation.
- Insights: a ShieldCheck privacy chip with the existing privacy sentence. A Recall score card with a circular gradient ring drawn with `react-native-svg`, the weekly change with TrendingUp or TrendingDown, and an Info icon button for About the score. A Streak card with current, longest and freezes banked (Snowflake) and a progress bar to the next milestone. A Last 30 days gradient trend line drawn with `react-native-svg`. A motivational message card with Sparkles.
- Learn: a progress bar with 0 of 7 lessons done and a gradient fill. Lesson cards have a numbered badge, a lesson icon (What memory actually is: Brain; The memory palace: House; Linking and visual stories: Link; Chunking numbers: Hash; Names and faces: ScanFace; Spaced recall: Repeat; Evening review habit: Moon), the title, the summary, Clock with the read time, and a CircleCheck when done. The lesson screen has a Back icon, comfortable reading width (680 maximum), a Try it tonight card with a gradient border and a PenLine button that opens the Day screen, and a Mark as done toggle with a Check icon.
- Settings: grouped cards with a leading icon each. Profile (User; guests see the guest state and the Sign in with Google button). Daily reminder (Bell, switch, with the existing sentence that 9:00 PM cannot be changed). Theme (Palette; Dark, Light and System with Moon, Sun and Smartphone; Dark is first and selected by default). Your data (Download, Export all data as JSON). A danger card with a `danger` border (Trash2: Delete account and all data, or Erase guest data). Sign out (LogOut, signed-in users only). A footer line Memory Journal v0.2.0 read from the app config at runtime.
- Feedback: loading skeletons with a shimmer (static with reduced motion), inline error cards with TriangleAlert and a Retry button, and a snackbar with Check after save and export.

### 15.12 Dependencies and data changes

- Add `lucide-react-native` and `react-native-svg` (icons, rings, trend chart), `expo-linear-gradient`, `@expo-google-fonts/plus-jakarta-sans` with `expo-font`, `expo-build-properties`, `expo-splash-screen` and `expo-system-ui`.
- Add `react-native-reanimated` for motion (section 15.16). It ships with Expo and needs its Babel plugin. Add `@react-native-async-storage/async-storage` for the guest journal on the device (section 15.6). No other animation library, chart library or UI kit.
- Remove every unused dependency (section 15.2).
- Firebase Anonymous Authentication is not used.
- No Firestore schema change. New users get `settings.theme` set to `dark`. The guest journal is stored on the device in the same shapes as the Firestore documents (section 15.6).

### 15.13 Version and release rules

- The version goes from `0.1.0` to `0.2.0`. It is a minor bump because users get new features and a new default look while the app is still below 1.0.0.
- The new version is set in: the root `package.json`, `apps/app/package.json`, `apps/desktop/package.json`, `packages/core/package.json` and the `version` field of the Expo app config. The Windows installer name takes the version from `apps/desktop/package.json`.
- The Android `versionCode` stays automatic through EAS (`appVersionSource` is `remote`). Add `autoIncrement` to the `preview` profiles too, so each APK has a higher code than the last and installs over the previous one without uninstalling.
- Do not create a commit that only changes version numbers, and do not run `npm version` or `pnpm version` with git commit or tag enabled, because they create their own commit. The version fields change inside the final commit of Milestone 8, together with the release notes, the QA checklist and the README changes (commit 63).
- After that commit passes all checks, tag it with `git tag -a v0.2.0 -m "v0.2.0"`, then build. The artifacts are named after the tag (section 15.3).
- `docs/release-notes.md` gets a new v0.2.0 section above v0.1.0 with: what is new, the APK size before and after, and the known limits that no longer apply (default splash icon, Android navigation bar theme).

### 15.14 Milestone 8: v0.2.0 commit sequence

Commit directly on `main`. Do not create feature branches. Use Conventional Commits. Each commit must build and pass lint, typecheck and tests. One logical change per commit. Before starting, the icon changes and the `docs/qa.md` changes are committed on their own, so they are not swept into the commits below.

Numbering continues from 42:

43. `docs: plan v0.2.0 guest mode, neon theme, navigation and size reduction`
44. `build(app): move config to app.config.ts with per-profile CPU types`
45. `build(app): enable shrinking and compress the app icon`
46. `build: add release script that names Android artifacts with the version`
47. `feat(app): add theme tokens, neon gradient palette and dark default`
48. `feat(app): add fonts, icons and shared button, card, chip components`
49. `feat(app): add motion tokens and shared animated components`
50. `feat(app): add confirm dialog and use it for every delete action`
51. `feat(app): add icon-only bottom tab bar, top bar and icon back button`
52. `feat(app): add branded splash with app name and loading bar`
53. `feat(app): open on home as guest and keep the journal on the device`
54. `feat(app): merge guest journal on sign-in and wipe it on sign-out`
55. `test: cover guest merge, sign-out wipe and account switching`
56. `feat(app): redesign home and calendar with animation`
57. `feat(app): redesign day writer with animation`
58. `feat(app): redesign tags and library with animation`
59. `feat(app): redesign insights, learn and settings with animation`
60. `feat(app): make layouts responsive across phone, tablet and desktop`
61. `feat(desktop): match window, sidebar and splash to the new theme`
62. `test(app): cover theme, guest flow, confirm dialog, motion and sizes`
63. `chore: release v0.2.0 with notes, qa checklist and install guide`

Commit 63 contains the version change in all package files and the app config, plus `docs/release-notes.md`, `docs/qa.md` and the README section Installing on Android. It is not a version-only commit. Tag `v0.2.0` goes on it.

Record these decisions in `docs/decisions.md` from D-040: a local-only guest journal on the device instead of anonymous authentication; guest data is merged into the account on sign-in and removed from the device on sign-out; the guest 21:00 lock uses the device clock with a backwards-clock guard; Android auto-backup is turned off so a reinstall starts clean; five bottom tabs with icons only and Settings in the top bar; `react-native-reanimated` for motion with the reduced-motion rules; an always dark splash; two Android CPU types in the preview APK and an extra arm64 profile; dark as the default theme with a one-time reset for upgraders; the light palette in section 15.7; the measured APK sizes before and after.

### 15.15 Acceptance criteria for v0.2.0

1. A fresh install shows the brand splash (name and loading bar, no icon) and then Home, with no sign-in screen and no network needed. A guest can use the writer (after 21:00 on the device clock), tags, library, insights and learn, and everything is stored on the device only.
2. Uninstalling the app as a guest leaves nothing behind, and nothing of a guest journal exists in the cloud.
3. Signing in with Google from guest mode shows the merge confirmation, then adds the guest journal to the account and clears the local guest copy. The merged journal is visible on another device signed in with the same account.
4. Signing out asks for confirmation, removes the journal data and cache from the device and returns to an empty guest mode. Signing in with a different Google account shows only that account's data (empty for a new account). Signing back in with the first account brings its data back. Signing out with unsynced changes shows a warning first.
5. Dark is the theme on a fresh install and after upgrading from v0.1.0. Light and System remain available. All text colors pass WCAG AA in both themes.
6. Navigation uses icons only: the bottom bar and the sidebar have no text labels, every icon has an accessibility label (and a tooltip on desktop), Back is an icon everywhere, and Settings opens from the top bar.
7. Every delete, remove, discard, erase and sign-out action shows the confirmation dialog. Cancel leaves the data unchanged. This is verified by tests and by the QA search described in section 15.10.
8. The animations in section 15.16 run smoothly on a low-end Android phone, and turning on the system reduce motion setting removes the looping and large motion.
9. The layouts work on the whole matrix in section 15.9, with no clipped text at 130 and 200 percent font scale and no sideways scrolling.
10. The preview APK is 50 MB or less (or the measured reason is recorded), is published as `MemoryJournal-v0.2.0-android.apk`, keeps the package name `com.memoryjournal.app`, installs over the previous build without uninstalling, and the production App Bundle also builds.
11. The Settings footer shows v0.2.0, and the version is 0.2.0 in all four `package.json` files, the app config and the Windows installer name. The git history has no version-only commit, and the `v0.2.0` tag is on the final commit.
12. Core tests, app tests, rules tests and CI pass.

### 15.16 Motion and animation

The app should feel alive but never slow. Animation uses `react-native-reanimated`, so it runs on the UI thread on Android, iOS and in the web and Windows build. All timings and springs live in `apps/app/src/theme/motion.ts`; screens never invent their own numbers.

Motion tokens:

- `fast` 150 ms for presses and toggles, `base` 250 ms for most transitions, `slow` 400 ms for screen entrances, `hero` 900 ms for the score ring and the trend line.
- Ease-out for things entering, ease-in for things leaving, and one shared spring (damping 15, stiffness 180) for pops and bounces.
- Lists stagger by 50 ms per item, for at most 8 items; the rest appear together.

Where animation is used:

- Every button, tab, chip, card and icon button scales to 0.97 on press with a color change, and springs back on release.
- Screen changes: stack screens slide in from the right with a fade, tabs cross-fade, modals and sheets rise from the bottom with a backdrop fade, and Back reverses the motion.
- Bottom bar and sidebar: a gradient indicator slides to the selected item with a spring, the icon pops (scale 1, 1.2, 1) and changes from `textMuted` to the neon color, and a soft glow breathes under the active icon.
- Splash: the name fades and scales in, the glow pulses, the loading bar glides, and the whole splash fades out into Home.
- Home: the stat cards fade up with a stagger, the streak number counts up, the Flame icon flickers softly when the streak is above 0, changing month slides the calendar left or right, the today ring breathes, a tapped date ripples before the Day screen opens, and at 21:00 the Today card morphs from Lock to LockOpen with a small shake and a glow flash.
- Day: hourly rows animate their height and rotate the chevron, a new minute marker pops in, the revision control thumb slides, the Highlight additions switch fades the highlights in, the Save bar slides up with the spring, and after saving the Check icon draws itself and the snackbar slides in.
- Tags and Library: list items enter with a stagger, changing a category chip animates items out and in, a confirmed delete collapses the card and fades it out, the search field border animates to a neon gradient on focus, and the Movies and Books switch thumb slides.
- Insights: the score ring draws from 0 to its value while the number counts up, the weekly change arrow slides in, the trend line draws from left to right, the streak progress bar fills, and reaching a milestone shows a short burst of about 24 neon dots for 1.2 seconds (no extra library).
- Learn: the progress bar fills, lesson cards enter with a stagger, and marking a lesson done pops the CircleCheck.
- Settings: the switch thumb and the theme control thumb slide, and changing the theme cross-fades the colors over 250 ms instead of flipping.
- Sign-in and merge: the sign-in modal rises with the spring and the Google button presses in. While a guest journal is added to the account, a progress card shows three steps (Signing in, Adding your journal, Cleaning up) with a bar that fills and a Check that draws itself on each step. When it finishes, Home cross-fades into the account's data. Signing out fades the screen out and returns to an empty guest Home with a short fade-in.
- Confirmation dialog: the backdrop fades, the dialog scales up from 0.92 with the spring, and the danger icon does one small shake.
- Loading, empty and error states: skeletons shimmer, empty-state icons float slowly up and down, and an error card shakes once.
- Primary gradient buttons: a soft shine sweeps across an idle button every 6 seconds on web, Windows and iOS. On Android the gradient border breathes instead.

Rules:

- Reduce motion: when the system setting is on (`useReducedMotion`), stop every loop (flicker, breathing, floating, shine, shimmer), replace slides and scales with 100 ms fades, and show final values at once with no count-up and no drawing.
- At most two looping animations are visible at the same time. Loops pause when the app is in the background or the screen is not focused.
- Animation never blocks input: every control stays tappable while animating, and no animation delays opening a screen by more than 250 ms.
- Run animations as worklets on the UI thread; never animate by calling `setState` in a loop.
- Check on a low-end Android phone and in a Windows window for 60 frames per second during tab changes and scrolling. If it falls short, remove effects in this order: shine, particles, stagger, breathing glow.
- Tests cover the end state of animated components and the reduced-motion path. Timing is judged by eye in the QA checklist.

## 16. Version 0.2.2: Polish from phone testing

This section is the plan for release v0.2.2. It was written after v0.2.1 was used on a real Android phone. It changes the look of the bottom of the screen, the theme animation, the Library date field and the Day screen banners. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak). Where this section and sections 1 to 15 disagree, this section wins.

This change is documentation only. No code is written until the plan below is committed.

### 16.1 What the phone test showed

- The Android system navigation bar below the app is light grey even though the app is dark. The status bar and the app follow the theme, the navigation bar does not.
- On every tab screen there is an empty strip of the page colour between the end of the scrolling content and the top of the bottom bar. Content is cut off at the strip instead of scrolling to the bar.
- Changing the theme in Settings feels too heavy: the whole screen cross-fades and the theme control thumb bounces.
- The Library date field takes a typed yyyy-mm-dd value only, which is slow on a phone.
- The Day screen shows a large banner for the open state ("This day is open for writing.") and the locked state ("Read-only until 9:00 PM" with a countdown). The lock chip already says the same, so the banner takes space and adds nothing.

### 16.2 Causes

- Navigation bar: `expo-system-ui` (listed in section 15.12) and `expo-navigation-bar` are not installed, so nothing sets the window background colour or the navigation bar button style from the active theme.
- Empty strip: the bottom bar adds the bottom safe area inset to its own height (section 15.8), and each tab screen's `SafeAreaView` adds the same inset again, so it is counted twice. The strip is as tall as the system navigation bar.
- Theme animation: the cross-fade lasts 250 ms (section 15.16) and the segmented control thumb uses the shared bouncy spring.

### 16.3 Changes

1. **Navigation bar follows the theme (Android).**
   - Add `expo-system-ui` and `expo-navigation-bar`.
   - A small hook used by the app shell sets the window background to the `bg` token and the navigation bar button style to light on dark and dark on light, whenever the active theme changes. It does nothing on iOS, web and Windows, and a failure is caught and ignored.
   - This needs a new native build. It does not reach an installed v0.2.1 build through a JavaScript update.
   - Section 15.7 already says the navigation bar follows the active theme; this makes it true. The known limit about the navigation bar in the release notes is removed once it is checked on a phone.
2. **No empty strip above the bottom bar.**
   - Screens that show the bottom bar do not add the bottom safe area inset. A hook `useTabScreenEdges` returns the edges for the five tab screens: top, left and right when the bottom bar is shown, and all four when the side navigation is shown (wide windows).
   - Screens without the bottom bar (Day, Tag detail, Library item, Lesson, Settings, Categories) keep all four edges.
3. **Calmer theme change.**
   - The theme cross-fade lasts 150 ms (the `fast` token) instead of 250 ms. With reduce motion it stays 100 ms.
   - The segmented control thumb uses a calmer spring with no visible bounce. A new token `SPRING_CALM` lives in `apps/app/src/theme/motion.ts`.
   - The sentence in section 15.16 about changing the theme over 250 ms now reads 150 ms.
4. **Date picker in Library.**
   - The date input of Add movie, Add book and the item edit form gets a Calendar icon button at the end of the input, inside its border, with the accessibility label "Pick date watched" or "Pick date read".
   - It opens a month picker in a modal built from the same month grid helper as the Home calendar: previous and next month buttons, a grid of dates, the selected date marked, future dates disabled. Tapping a date fills the input with `yyyy-mm-dd` and closes the picker. Cancel and Esc close it without a change.
   - Typing a date still works. There is no new native library, so the picker works on Android, iOS, web and Windows.
5. **Day screen banners.**
   - The open banner and the locked banner are removed. The lock chip with the countdown stays and is the only lock indicator.
   - The banners for a future day, a day that is not valid and a wrong device clock stay, because they explain why writing is not possible.
   - Sections 5.3 and 15.11 mention a banner for the locked state; this section replaces that.
6. **Branded splash instead of the default one.**
   - Native splash: add `expo-splash-screen` and its config plugin in `app.config.ts` with `backgroundColor` `#07070D` and a fully transparent image `assets/splash-transparent.png` (1024 by 1024, a few hundred bytes), for the light and the dark variant alike, so the splash is the same in both system themes. Android 12 and newer always draw an icon area, and the transparent image is how it stays empty. The Android window background is also `#07070D`, so there is no white or grey frame before or after the splash.
   - The app keeps the native splash visible with `SplashScreen.preventAutoHideAsync()` until the first React screen is on the screen, and then hides it, so the hand-off to the in-app splash has no flash.
   - In-app brand splash: a `BrandSplash` component in `apps/app/src/features/splash/` built exactly as section 15.5 says. The name Memory Journal in large bold text with a soft violet glow, a thin indeterminate loading bar with the violet to blue gradient, and the colours of the dark palette whatever theme is saved. Reduce motion makes the bar static and the text Loading.
   - `app/_layout.tsx` shows `BrandSplash` instead of the plain spinner. It waits only for the bundled fonts and the saved settings, shows for at least 500 ms and at most 3 seconds, and fades out over 200 ms (the `base` token is 250 ms, so use `DURATION.fast` plus the fade rules of section 15.16) into the saved theme. It never waits for the network or for Firebase.
   - The web build and the Windows app use the same `BrandSplash`. Check that the Electron window keeps `backgroundColor` `#07070D` and stays hidden until `ready-to-show` (section 15.5).
   - The native part needs a new native build. A JavaScript update changes only the in-app splash, so the default splash stays on an installed v0.2.1 build until the new APK is installed.
   - Section 15.5 stays the design of record; this item makes it true. The known limit about the default splash icon in the release notes is removed once it is checked on a phone.

### 16.4 Version and release rules

- The version goes from `0.2.1` to `0.2.2`, a patch bump, because nothing new is promised and only the look and feel changes.
- The version changes in the root `package.json`, `apps/app/package.json`, `apps/desktop/package.json`, `packages/core/package.json`, `firebase/package.json` and the Expo app config, together with `docs/release-notes.md` and the APK name in the README. As in section 15.13, no commit changes only version numbers.
- Commits on `main`, one logical change each, each passing lint, typecheck and tests:
  1. `docs: plan v0.2.2 navigation bar, theme animation, date picker and banners`
  2. `fix(app): follow the theme in the Android navigation bar`
  3. `fix(app): remove the empty strip above the bottom bar`
  4. `fix(app): shorten the theme change animation`
  5. `feat(app): add a calendar picker to the Library date field`
  6. `refactor(app): remove the open and locked banners from the Day screen`
  7. `feat(app): replace the default splash with the branded name and loading bar`
  8. `chore: release v0.2.2 with notes`
- Tag the last commit with `git tag -a v0.2.2 -m "v0.2.2"`, then push the commits and the tag. The tag starts the checks and the release build.

### 16.5 Acceptance criteria for v0.2.2

1. On a dark theme the Android navigation bar is dark with light buttons. On the light theme it is light with dark buttons. Changing the theme in Settings updates it at once.
2. On every tab screen the content scrolls down to the bottom bar with no empty strip between them, on a phone with a gesture bar and on a phone with three buttons.
3. Changing the theme takes about 150 ms and the control thumb moves without bouncing. With reduce motion on it is a 100 ms fade.
4. Add movie, Add book and the item edit form each show a Calendar icon at the end of the date input. Picking a date fills the input with `yyyy-mm-dd`, future dates cannot be picked, and a typed date still works.
5. The Day screen shows no banner for an open or a locked day. The lock chip still shows the state and the countdown. Future days, invalid days and a wrong device clock still show their banner.
6. The Settings footer shows v0.2.2 and the version is 0.2.2 in all five `package.json` files and the app config. The git history has no version-only commit and the `v0.2.2` tag is on the final commit.
7. On a fresh start the screen shows no default Android splash and no icon. The native splash is a solid `#07070D` screen with no image, and the first React screen shows the name Memory Journal with the loading bar on the same colour, in both the dark and the light theme, then fades into Home. It never waits for the network.
8. Core tests, app tests, rules tests and CI pass.

## 17. Version 0.2.3: Holidays, wide calendar, themed scrollbar and license

This section is the plan for release v0.2.3. It was written after the Windows app was used at a wide window. It adds Sri Lankan public holidays to the calendar, makes the calendar use the width of the window, styles the scrollbar to match the theme, and adds an End User License. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak). Where this section and sections 1 to 16 disagree, this section wins.

This change is documentation only. No code is written until the plan below is committed.

### 17.1 What was seen

- The scrollbar in the Windows app is the default light grey one, which clashes with the dark theme.
- On a wide window the stat cards use the full content width, but the calendar card stops at 424 px (seven cells of 56 plus padding, section 15.9) and sits in the middle with empty space on both sides.
- Holidays are not shown anywhere on the calendar.
- The app has no license, installer license page or credits for third-party data.

### 17.2 Sri Lanka public holidays

Source: the open data of `Dilshan-H/srilanka-holidays` (MIT license). The app downloads one static JSON file per year from `https://raw.githubusercontent.com/Dilshan-H/srilanka-holidays/main/json/<year>.json`.

Why not the live API at `srilanka-holidays.vercel.app`: since its v2.0.0 every request needs an `X-API-Key` header, and the key is issued to one developer on request. A key inside an app that is given to other people is not secret and could be revoked for everyone. The static data files need no key. If the maintainer later issues a key for this app, the source can be switched in one constant.

Rules:

1. Only Sri Lanka is supported, because the app has no country setting. The country code is a constant `LK`.
2. The data starts in 2021. A year before 2021, or more than one year after the current year, is not requested and has no holidays.
3. Only the date (`start`, the first 10 characters, `yyyy-MM-dd`) and the holiday name (`summary`) of each entry are used. Entries without a valid date or a name are skipped. Two entries on the same day are both kept and shown together.
4. One download per year. The result is kept on the device (`@react-native-async-storage/async-storage`, one key per year) and used for 7 days. After that the file is downloaded again. If the download fails and an older copy exists, the older copy is used.
5. Holidays never block anything. With no network and no saved copy the calendar looks as it does without holidays, with no error card and no delay. The first launch still needs no network (section 15.6).
6. Privacy (section 7.4): the request is a plain download of a public file with the year in the address. It carries no journal text, no account id and no tag. Guest mode still never calls Firebase.
7. Holidays are display only. They do not change the 21:00 lock, the streak, the score or the Day screen.
8. A holiday shows as a small `warning` colored dot on the date, next to the written dot when both apply. The accessibility label of the date adds `holiday: <name>`.
9. A list "Holidays" under the calendar legend shows the holidays of the shown month (weekday and day number, then the name) on every window size. A date cell never prints the holiday name, on any window size: it shows only the dot, so the names are read in this list.
10. The legend gets a Holiday item with the same dot.
11. The Windows app and the web build use the same code. The data files allow requests from any website, so no extra setup is needed.

### 17.3 Calendar width

- On medium and expanded windows (600 px and wider) the calendar card fills the content width (up to 960). The 56 px cell limit of section 15.9 now applies on compact windows only.
- On those windows a date cell is a rounded rectangle 72 px tall instead of a square, so six weeks do not become taller than the screen. The gradient ring on today and the written dot keep their look.
- Compact windows are unchanged.

### 17.4 Themed scrollbar (web build and Windows app)

- The scrollbar follows the active theme and changes with it. Track: `bg`. Thumb: a vertical `neonViolet` to `neonBlue` gradient, 12 px wide with a 3 px inset in the track color so it looks like a rounded pill. Hover: the thumb gets the brighter `neonCyan` end. The corner uses the track color. A horizontal scrollbar uses the same colors with the gradient turned to run left to right.
- It applies to every scrollable area, including the main page scroll and text fields.
- Browsers that do not support `::-webkit-scrollbar` get a thin scrollbar with `scrollbar-color` in the same colors. These rules sit inside `@supports not selector(::-webkit-scrollbar)`, because a browser that knows the standard `scrollbar-color` ignores `::-webkit-scrollbar` altogether, which would lose the gradient and the pill shape.
- It is added in the same way as the focus ring (`useFocusRing`): the hook `useScrollbarTheme` in `apps/app/src/theme/scrollbar.ts` injects one style element on the web build and removes it when the colors change. The rules come from the pure function `scrollbarCss`, which is unit tested in `scrollbar.test.ts`. `Shell` in `apps/app/app/_layout.tsx` calls the hook with `background`, `neonViolet`, `neonBlue` and `neonCyan` of the active palette. It does nothing on Android and iOS, where the system scrollbar is already a thin overlay.
- Not checked on a running app yet: the look in the Windows installer build and the web build is confirmed by hand (acceptance criterion 1).

### 17.5 License and notices

The license is an End User License Agreement in `LICENSE.txt`, with a short License section in the README, and the license is shown to the person who installs the Windows app.

- `LICENSE.txt` at the repository root: Memory Journal, End User License Agreement, version, copyright line `Copyright (c) 2026 Chama Bro. All rights reserved.`, and the clauses License grant, Restrictions, Data and privacy, Third-party software and data, Disclaimer of warranties, Limitation of liability. The grant covers Windows computers and Android devices the person owns or controls. The privacy clause matches sections 7.4 and 17.2 (the journal stays on the device or in the person's own Firebase account, journal text is never sent to an AI service, and the app downloads public holiday files from GitHub).
- The version line of `LICENSE.txt` is the app version. It changes in the release commit together with the other version fields (section 17.6).
- README: a Holiday Data section (source, no API key, cached once per year) and a License section with the agreement name, version, copyright line and "See `LICENSE.txt` for full terms."
- `THIRD_PARTY_NOTICES.md`: credits `Dilshan-H/srilanka-holidays` (MIT, attribution required: author name and license info stay intact) with the MIT permission text, and says that the app's npm packages keep their own licenses. The holiday files are downloaded, not copied into the app, and the notice is linked from the license and the README.
- `electron-builder.yml`: `copyright` becomes `Copyright (c) 2026 Chama Bro. All rights reserved.` and `nsis.license` points to `LICENSE.txt`, so the installer shows the agreement and the person must accept it.
- `package.json` (root and `apps/desktop`): `author` is `Chama Bro` and `license` is `SEE LICENSE IN LICENSE.txt`. The packages stay `private`.
- The exact copyright line of the holiday project's own LICENSE file must be checked before a release and copied into `THIRD_PARTY_NOTICES.md`. Until then the notice points to that file instead of quoting the line, so no copyright line is guessed.
- The README is laid out so the GitHub page reads as a full project page: Requirements, Build Steps (set up, the Windows installer and the Android APK on EAS), What you get, Features (grouped, each item marked with a check), Data Location, Repository layout, Scripts, Installing on Android, Google OAuth Setup (desktop, web and Android), Holiday Data, Dependencies, Contributing, Privacy and License. The Features list must be updated whenever a feature is added or removed, and the Android build steps must follow `scripts/release-android.mjs` and `apps/app/eas.json`.
- The README, `LICENSE.txt` and the Android install step carry the app version, so they change in the release commit.

### 17.6 Version and commits

- The version goes from `0.2.2` to `0.2.3`, a patch bump, because the changes are polish and one small display feature. Version rules are as in sections 15.13 and 16.4: no version-only commit, and the fields change together with the release notes. In the release commit the `Version` line of `LICENSE.txt` and the version in the README license section change too.
- Commits on `main`, one logical change each, each passing lint, typecheck and tests:
  1. `docs: plan v0.2.3 holidays, wide calendar, scrollbar and license`
  2. `feat(core): add holiday parsing and lookup helpers`
  3. `feat(app): download and cache public holidays from open data files`
  4. `feat(app): show holidays and fill the width with the calendar`
  5. `fix(app): match the scrollbar to the theme on web and desktop`
  6. `docs: add end user license, third-party notice and installer license`
  7. `chore: release v0.2.3 with notes`
- Three commits were added during the work, outside the numbered plan, and each passed lint, typecheck and tests: `fix(desktop): load the Google client from .env in installer builds` and `fix(app): keep the sign-in form in a narrow centered column` (both from testing the Windows installer), and `feat(app): greet the person on Home by time of day` (section 17.8, committed before the scrollbar commit).
- Commit 5 is `fix(app): match the scrollbar to the theme on web and desktop` and holds `theme/scrollbar.ts`, its test and the `useScrollbarTheme` call in `Shell`.
- Tag the last commit `v0.2.3` and push, as in section 16.4.

### 17.7 Acceptance criteria for v0.2.3

1. The scrollbar in the Windows app and the web build is dark with a violet to blue thumb in the dark theme, and light with the deeper accents in the light theme, and it changes when the theme changes.
2. On a window 900 px wide or more the calendar card has the same width as the stat cards above it. On a phone it looks as before.
3. A date with a public holiday shows a `warning` dot, its label says `holiday: <name>`, and the Holidays list under the calendar shows every holiday of the month. Labour Day (1 May) is shown in May 2026.
4. With the network off and no saved copy the calendar works and shows no holidays and no error. With a saved copy it shows the saved holidays.
5. Holidays do not change the lock, the streak, the score or the Day screen.
6. `LICENSE.txt` exists, the Windows installer shows it, the README has the Holiday Data and License sections, and `THIRD_PARTY_NOTICES.md` credits the holiday project.
7. The Settings footer shows v0.2.3 and the version is 0.2.3 in all five `package.json` files, the app config and `LICENSE.txt`. There is no version-only commit and the tag is on the final commit.
8. Core tests, app tests, rules tests and CI pass.

### 17.8 Home greeting (added during v0.2.3)

- The top of Home shows a line under the title: `Good morning`, `Good afternoon`, `Good evening` or `Good night`, from the local clock. Morning is 05:00 to 11:59, afternoon 12:00 to 16:59, evening 17:00 to 20:59, night 21:00 to 04:59.
- A signed-in person with a display name sees the first word of the name after a comma, for example `Good morning, Sam`. A guest, or an account with no display name, sees the greeting alone, with no name.
- The hour is read again every minute, so the line changes while the app stays open. The greeting is display only and does not change the 21:00 lock, the streak or the score.
- It is committed before the scrollbar commit as `feat(app): greet the person on Home by time of day`.
- Acceptance: at 09:00 a guest sees `Good morning`; at 20:00 a signed-in person named Sam Perera sees `Good evening, Sam`; at 23:00 `Good night`.

## 18. Version 0.2.4: Day page with one free writing space

This section is the plan for release v0.2.4. It was written after v0.2.3 was used on a real device. It replaces the way a day is shown and written: no more Free Notes block and 24 hourly rows. A day opens as a read-only page, and a pencil turns it into one free writing space. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak). Where this section and sections 1 to 17 disagree, this section wins. Sections 5.3 and 15.11 (Day) describe the old screen and are replaced by 18.2 to 18.6.

This change is documentation only. No code is written until the plan below is committed.

### 18.1 What was seen

- Tapping a date opens a writer straight away, with a Free Notes block and 24 hourly rows. The person only wants to read the day and does not want the rows.
- The person wants to write anything in one free space, mark a time (the hour only, or the hour with minutes) only where it is useful, and add tags from the same categories as the Tags screen.

### 18.2 The Day screen has two modes

The route stays `/day/[dayId]`. The mode is state of the screen, not part of the address.

**View mode (the default).** Tapping a date, or any link to a day, opens this.

- Header: Back icon, the date, the lock chip (section 15.11) and a Pencil icon button (accessibility label "Edit day"). Nothing in view mode can be typed into.
- Body: the saved page, in the order it was written. A time line shows as a small clock chip (`21:00` for an hour only, `21:25` for hour and minutes) with the text under it. A tag mention shows as a tag chip with the tag name, and pressing it opens the tag detail screen. Legacy days (18.7) show their Free Notes first, then their time rows in time order, in the same style.
- The revision toggle (Latest, 1st, 2nd and so on) and the Highlight additions switch stay here, exactly as in section 5.3 and D-021. Older passes are always read-only.
- An empty day shows a large icon, the sentence "Nothing written for this day yet." and a gradient Write button (PenLine) that does the same as the pencil. A future day is not openable (section 5.3). Today before 21:00 stays read-only: the Pencil is disabled, the lock chip shows the countdown, and a day that already has text can still be read.
- Home's Write today button opens today in edit mode when it is writable.

**Edit mode.** Pressing the Pencil (or Write) on the Latest pass switches the same screen to editing.

- Header: a Close icon (X, label "Cancel") and a gradient Save button. The Pencil is hidden.
- One large multiline text field fills the screen under the header, with no Free Notes block, no hourly rows and no required structure. The person can write anything, in any order, and the field grows with the text and scrolls with the page.
- A toolbar sits above the keyboard, or at the bottom of the window, with two icon buttons: Clock (label "Add time") and Tag (label "Add tag"). Both insert at the cursor. If the person selects text first, Save as tag (section 5.3) stays available from the Tag sheet.
- Typing `@` still opens the suggestion list of saved tags, grouped by category (D-023).
- Draft autosave stays as in D-019: the text is kept on the device every few seconds and offered again after the app closes.
- Save writes a new pass or updates the open one by the same sitting rules as D-020, shows "All changes saved", and returns to View mode on the Latest pass. If nothing changed, Save just returns to View mode.
- Cancel or Back with unsaved changes opens the confirmation dialog of section 15.10: title "Discard changes?", buttons Keep editing and Discard changes. Discarding removes the draft and returns to View mode. Without changes it returns at once. Esc means Cancel on the web build and in the Windows app.

### 18.3 Add time

The Clock button opens a sheet (a bottom sheet on phones, a centered dialog on wide windows) with two choices, shown as a segmented control:

- **Hour only:** a grid of the 24 hours (00 to 23). Choosing one inserts the line for that hour.
- **Hour and minutes:** the same hour grid, plus a minute field that takes 0 to 59 (typed, with quick chips :00, :15, :30 and :45). The Insert button is enabled when both are chosen.

Both start with the device's current hour (and minute) preselected. The time uses the same 24-hour clock as the rest of the app.

A time is stored in the text as its own line: `⏱ 21` for an hour only and `⏱ 21:25` for hour and minutes (two digits for the hour, two for the minutes). A line is a time only when the whole line is exactly that, so the symbol inside a sentence stays plain text. The insert puts the line on its own line at the cursor, with a line break before it when the cursor is in the middle of a line, and puts the cursor on the next line. If the same time line already exists in the page, Add time moves the cursor to it instead of adding a second one. Two identical lines typed by hand are both kept; they are just text.

### 18.4 Add tag

The Tag button opens the existing searchable tag picker (D-023) as a sheet:

- Chips for every category on the Tags screen: All, People, Places, Numbers and every custom category, with the same icons (section 15.11). Choosing a chip filters the list; the search field matches the name or an alias.
- Choosing a tag inserts its mention at the cursor as `@Name`, stored as `{{tag:ID|Name}}`, with the spacing rules of D-023.
- A Create new tag row opens the tag form without leaving the Day screen (as in D-023), and the new tag is inserted at once.

### 18.5 Storage: no change to the schema or the rules

The text field is one string, so the revision stores the page as it was typed. To avoid a schema change and a rules change, the existing revision fields are used:

- A pass saved by v0.2.4 puts the whole page in `freeNotes` and saves `blocks` as an empty list. `normalizeContent` sorts blocks into time order, which would reorder what the person wrote, so new passes do not use blocks. Older versions of the app that read such a pass show it as plain free text, with the time lines readable as they are.
- `packages/core` gets a new module `dayPage.ts`, with tests:
  - `pageOf(content)` returns the page text of any pass: for a legacy pass, the Free Notes, then each non-empty block in time order as a time line followed by its text; for a v0.2.4 pass, `freeNotes` itself.
  - `contentFromPage(text)` returns the content to store: `freeNotes` is the text with line endings normalised to `\n` and trailing spaces and blank lines at the end removed, and `blocks` is empty.
  - `timeBlocksOf(text)` splits a page at its time lines into blocks (hour, minute or null, text) in the order written, which the score uses (18.6). The text before the first time line is not a block.
  - `parseTimeLine(line)` and `formatTimeLine(hour, minute)` read and write the time line, and `insertTimeLine(text, cursor, hour, minute)` and `insertAtCursor(text, cursor, insert)` do the cursor edits of 18.3 and 18.4, returning the new text and the new cursor.
- `countContentWords` and the Highlight additions comparison work on `pageOf(content)` with time lines left out, so a pass written in the old shape and one in the new shape compare fairly, and a time line never counts as a word.
- The day document keeps writing `mentions` (D-024) from the page text, so the tag screen still lists the day.

### 18.6 Score and streak

The recall score and the streak keep their rules, but they now read a pass through the helpers above:

- Detail uses the word count of revision 1 (time lines not counted).
- Coverage counts the distinct hours that have a time line followed by non-blank text before the next time line, from `timeBlocksOf(pageOf(content))`, so legacy blocks and new time lines count the same way.
- Precision counts the time lines that have minutes plus the distinct tags mentioned, as before.
- Later recall, Consistency and the streak (20 words, saved in the 21:00 window) are unchanged.
- Writing with no time lines is fine: Coverage and the minute part of Precision are then 0 for that day, which is the cost of not marking times, and the Insights text does not mention it as a fault.

### 18.7 Days written before v0.2.4

- Existing days and their passes are never rewritten. View mode shows them through `pageOf`, so nothing is lost and the order of a legacy day is its Free Notes, then its rows in time order.
- Pressing the Pencil on a legacy Latest pass starts the editor with `pageOf(content)`. Saving creates the next pass (or updates the open one) in the new shape, so the older pass stays as it was and the revision toggle and Highlight additions compare them through `pageOf`.
- Library items are not changed. They already are one free page (section 5.5).

### 18.8 Removed

- The Free Notes card, the 24 hourly rows, the row preview and expand behaviour, the Add minute and Remove minute buttons (D-017, D-018) and the old toolbar. The code for them is removed with the new screen, including their tests, and `minuteMarkers.ts` in core is removed because nothing uses it any more.
- The lesson text that says "write the six items in the Free Notes" changes to "write the six items in today's page" (`packages/core/src/tutorials/lessons.ts`).
- Section 11's Day screen component tests are replaced by tests for view mode, edit mode, Add time, Add tag, Save and Cancel.

### 18.9 Version and commits

- The version goes from `0.2.3` to `0.2.4`, a patch bump, because the journal rules and the data shape are unchanged. Version rules are as in sections 15.13 and 16.4: no version-only commit, and the version fields change together with the release notes, the README and `LICENSE.txt`.
- Commits on `main`, one logical change each, each passing lint, typecheck and tests:
  1. `docs: plan v0.2.4 day page with one free writing space`
  2. `feat(core): add day page helpers for time lines, cursor inserts and legacy days`
  3. `refactor(core): read passes through the day page in score, words and highlights`
  4. `feat(app): show a day as a read-only page with an edit pencil`
  5. `feat(app): write a day in one free space with add time and add tag`
  6. `refactor(app): remove the hourly rows and Free Notes writer`
  7. `docs: update the lesson text and the QA checklist for the day page`
  8. `chore: release v0.2.4 with notes`
- Record the decisions in `docs/decisions.md` as D-043 onwards: the page stored in `freeNotes` with empty `blocks` instead of a schema change; the time line format; the score reading time lines; the legacy conversion on first edit.

### 18.10 Acceptance criteria for v0.2.4

1. Tapping a past date opens the Day screen in view mode: the saved text, with nothing that can be typed into, and a Pencil in the header. A future date does not open.
2. Today before 21:00 has a disabled Pencil and the countdown chip, and a day with text can still be read. At 21:00 the Pencil works without leaving the screen.
3. Pressing the Pencil shows one large writing field with no Free Notes block and no hourly rows, plus Add time and Add tag buttons. The person can type anything in any order.
4. Add time offers Hour only and Hour and minutes. Hour only inserts `⏱ 21`, hour and minutes inserts `⏱ 21:25`, each on its own line at the cursor, and in View mode they show as clock chips with the same times. Adding a time that is already in the page moves the cursor to it.
5. Add tag lists the categories of the Tags screen (People, Places, Numbers and every custom one), filters by category and search, inserts `@Name` at the cursor, and Create new tag works without leaving the screen. In View mode a mention shows as a tag chip that opens the tag.
6. Save writes the pass, shows "All changes saved" and returns to View mode on the Latest pass with the new text. The tag screen lists the day. Cancel or Back with changes asks "Discard changes?" and Keep editing leaves the text as it is.
7. The draft is restored after the app is closed without saving. Esc cancels on the web build and in the Windows app.
8. A day written before v0.2.4 shows its Free Notes and its rows in time order in View mode, and opening it with the Pencil gives one text with the rows as time lines. Saving makes a new pass, and the older pass is unchanged and still readable through the revision toggle.
9. Highlight additions marks only the new words between two passes, also when one pass is old and one is new, and time lines are never marked or counted as words.
10. The recall score and the streak still work: a pass with time lines raises Coverage and Precision, a pass with none still counts for Detail, the streak and Consistency, and the 20-word rule ignores time lines.
11. No change was needed in `firebase/firestore.rules`, and the rules tests pass unchanged.
12. The Settings footer shows v0.2.4 and the version is 0.2.4 in all five `package.json` files, the app config and `LICENSE.txt`. There is no version-only commit and the tag is on the final commit.
13. Core tests, app tests, rules tests and CI pass.
