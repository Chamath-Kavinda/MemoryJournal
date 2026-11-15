# Release notes

## v0.1.0 (first release, not yet tagged)

Memory Journal is a private journal that trains memory: you write the day from memory each evening, from 21:00, and can come back later to add what you remember. It runs on Android and Windows from one codebase. This is the first version, so the notes describe what is in it and what has not been checked yet.

### What is in it

- **Sign-in:** Continue with Google, native on Android and through the system browser on Windows. You stay signed in until you sign out.
- **Home:** a month calendar showing written days, empty past days, today and disabled future days, with your streak and latest recall score on top.
- **The writer:** 24 hourly rows, exact minute markers, and a Free Notes block. Today unlocks at 21:00 local time, and the lock is enforced by the server rules, so changing the device clock does not open it early. Past days are always editable. Drafts are saved on the device every few seconds.
- **Revisions:** the first save of a day is revision 1, and later sittings add revisions 2, 3 and so on. A switch at the top shows the day as it was in each pass, and Highlight additions marks what you remembered later.
- **Tags:** People, Places and Numbers by default, plus your own categories. Insert a tag with `@`, from the picker, or from selected text. Each tag lists everything that mentions it. Deleting a tag keeps the text.
- **Library:** movies and books, each with one free page, revisions and tags, with no 9 PM lock.
- **Insights:** a recall score from 0 to 100 smoothed over 14 written days, a 30-day trend, your streak with freezes, and an encouraging message built from your own numbers. The score is a motivation tool, not a medical measure.
- **Learn:** seven bundled lessons that work offline, each with a Try it tonight exercise and a Mark as done toggle.
- **Reminder:** a daily notification at 21:00 local time. On Windows the app stays in the system tray after the window is closed so the reminder still fires. It can be turned off in Settings.
- **Settings:** read-only profile, reminder toggle, theme (system, light, dark), export of all your data as JSON, delete account and all data (asks twice), and sign out.
- **Layout and accessibility:** a side navigation at 900 points of width and above, a dark theme, text colours tested against WCAG AA, Alt+1 to Alt+6 shortcuts on the web build and in the Windows app, a visible focus ring, and 44-point touch targets.
- **Offline:** you can write without a connection, and it syncs when the connection returns.
- **Privacy:** journal text is stored only under your own user in Firebase and is never sent to any AI service. There is no analytics. Firestore rules stop one user from reading another's data.

### Builds

- Android: EAS profiles for a development client, an internal preview APK and a production App Bundle (`pnpm --filter app build:android:preview` and `build:android`).
- Windows: `pnpm --filter desktop dist` builds the web bundle, the Electron files and a per-user NSIS installer named `Memory Journal-Setup-<version>.exe` in `apps/desktop/release`.

### Known limits

- **Not tried on real devices yet.** The automated tests pass (core, app, desktop and the Firestore rules), but nobody has used the app on a phone or in the installed Windows app, and the checklist in `docs/qa.md` has not been run.
- **No build has been made.** No EAS build and no Windows installer have been produced yet. EAS needs an Expo account, `eas login`, `eas init` and the environment variables set on EAS. Android Google sign-in needs each build's SHA-1 added in the Firebase console.
- **The Windows installer is not code signed**, so Windows SmartScreen will show a warning.
- **No app icon or splash image** has been supplied, so default icons are used.
- **iOS** is configured but has not been built, and Sign in with Apple has not been added, which the App Store requires when Google sign-in is offered.
- **Accessibility** has been checked by tests, the type checker and lint, but not with a screen reader (TalkBack, Narrator, NVDA), and the tab order has not been reviewed. There is no skip-to-content link. Alt+number can be taken by a browser or the system on some platforms.
- The Android navigation bar follows the system theme, not the saved choice.
- Dates and times follow the device time zone, and the stored offset is updated when a change is detected.

The reasoning behind these choices is in `docs/decisions.md` (D-035 to D-037).
