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
5. Sign-in is Google (Gmail) only, through Firebase Authentication.
6. iOS is supported by the same code but is built last and is optional.
7. One shared codebase: React Native (Expo) for Android and iOS, and the same React Native code compiled for web (react-native-web) and wrapped by Electron for Windows.

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

Use the latest stable versions available when scaffolding. Do not use Cloud Functions in v1, so the project can stay on the free Firebase plan.

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

- Single screen with a Continue with Google button.
- Android and iOS: use the native Google sign-in library and pass the ID token to Firebase with `signInWithCredential`.
- Desktop (Electron): open the system browser for the Google OAuth flow, receive the result through a loopback redirect on `127.0.0.1` or a custom deep link, then call `signInWithCredential`. Do not use embedded popups for Google sign-in inside Electron.
- Keep the user signed in with persisted auth state. Provide a Sign out action in Settings.
- On first sign-in create the `users/{uid}` document with the device time zone and UTC offset.
- If iOS is shipped, also add Sign in with Apple, because the App Store requires it when another third-party sign-in is offered.

### 5.2 Home Page

- A month calendar. Each date shows a small dot if it has any writing and a ring if it is today.
- Dates are colored by state: written, empty past day, today, future (disabled).
- Top bar shows the current streak and the latest recall score.
- Tapping a date opens the Day screen for that date.
- A bottom (mobile) or side (desktop) navigation with: Home, Tags, Library (movies and books), Insights, Learn, Settings.

### 5.3 Day Screen (the writer)

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

Profile (name and email, read-only), reminder toggle, theme (system, light, dark), export all data as JSON, delete account and all data (confirm twice), sign out.

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

The client UI also enforces the lock, but the rules are the real guard because `request.time` is server time. Changing the phone clock therefore cannot unlock today.

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
/ (redirect)
/sign-in
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

Desktop uses the same routes with a left sidebar instead of bottom tabs (switch layout at widths above 900 px).

## 10. Platform Notes

- **Android**: build with EAS. Use a development build, not Expo Go, because of native Google sign-in and notifications. Request the notification permission and exact-alarm behavior carefully; a repeating local notification is enough.
- **iOS**: same code. Needs a Mac (or EAS cloud build) and an Apple developer account. Add Sign in with Apple.
- **Windows**: `pnpm --filter app export:web` creates the static bundle, Electron loads it from disk, and electron-builder produces an NSIS installer. Use `contextIsolation: true`, `nodeIntegration: false`, and expose only the notification and OAuth helpers through the preload script.
- **Responsive**: the same components adapt between phone, tablet and desktop widths.

## 11. Testing

- Unit tests in `packages/core` for time rules (including around 20:59, 21:00, midnight and daylight saving), revisions, score, streak (including freezes) and message selection. Target at least 90 percent coverage for this package.
- Firestore rules tests with the emulator for every rule in section 7.1, including the negative cases.
- Component tests for the Day screen: locked state, unlocked state, adding a minute marker, tag mention insert, revision toggle.
- A manual QA checklist in `docs/qa.md` covering sign-in, reminder firing, offline writing then sync, and export.

## 12. Git Workflow and Commit Plan

- Branches: `main` is always releasable. Work on `feat/<name>` branches and merge with squash or fast-forward after review.
- Commits follow Conventional Commits, enforced by commitlint: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `build:`, `ci:`. Each commit must build and pass tests. One logical change per commit. Imperative present tense, subject under 72 characters.
- Tag releases with `v0.1.0` and onwards.

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

## 13. Acceptance Criteria

The app is complete for v1 when all of these are true:

1. A new user can sign in with Google on Android and Windows and sees an empty calendar.
2. At 20:59 today is read-only; at 21:00 it becomes writable; changing the device clock does not unlock it early (verified through the rules test and a manual test).
3. The user can write in hourly rows, add minute markers, and add Free Notes.
4. Reopening an older day and adding text creates a new revision, and the toggle shows each pass with additions highlighted.
5. Tags can be created in default and custom categories, inserted with `@`, and viewed with their mention history.
6. Movies and books each have a free page with no time sections.
7. The 9 PM reminder fires on both Android and Windows.
8. Insights shows a recall score, streak and a message that uses the user's real numbers.
9. All tutorial lessons are readable offline.
10. Data written offline syncs when the connection returns, and export and delete-account both work.
11. Core tests, rules tests and CI pass; the git history follows the plan in section 12.

## 14. Instructions for the Building Agent

- Work through the milestones in order and make the commits listed above. Do not combine milestones.
- Put all logic in `packages/core` first with tests, then build the UI on top of it.
- Do not add features that are not in this document. Do not add analytics, ads, AI calls or memory-jogging prompts.
- If a detail is missing, choose the simplest option that matches this document, record the decision in `docs/decisions.md`, and continue.
