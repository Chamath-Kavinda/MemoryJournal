# Release notes

## v0.2.3 (2026-11-17)

Version 0.2.3 adds Sri Lankan public holidays to the calendar, makes the calendar use the width of a wide window, styles the scrollbar to match the theme, and adds an End User License Agreement (section 17 of the build document). The journal rules are unchanged.

### What is new

- **Public holidays.** Sri Lanka public holidays show as a small yellow dot on the calendar, next to the written dot when both apply, and the holidays of the shown month are listed under the calendar legend. The calendar works with no network and shows no error when holidays cannot be loaded. Holidays are display only and never change the 21:00 lock, the streak or the score.
- **Wide calendar.** On windows 600 px wide and above the calendar fills the content width, with 72 px tall rounded date cells. Phones look as before.
- **Themed scrollbar.** On the web build and in the Windows app the scrollbar follows the theme, with a violet to blue thumb. Phones keep the system scrollbar.
- **Home greeting.** Home shows Good morning, Good afternoon, Good evening or Good night from the local clock, with your first name when you are signed in.
- **End User License Agreement.** `LICENSE.txt` is shown by the Windows installer and summarised in the README. `THIRD_PARTY_NOTICES.md` credits the holiday data project.

### Privacy

- The app downloads one public holiday file per year from GitHub and keeps it on the device for 7 days. The request carries only the year, never journal text or account details. Guest mode still makes no Firebase call.

### Known limits

- The holiday data covers Sri Lanka only, from 2021, and there is no country setting.
- The scrollbar and the wide calendar have been checked by tests, not yet by a person on a real Windows install.
- Detail, Coverage and Precision still read your first pass of a day, so they do not change when you edit that day later.

## v0.2.2 (2026-11-17)

Version 0.2.2 polishes the look and feel after v0.2.1 was used on a real Android phone (section 16 of the build document). The journal rules are unchanged.

### What is new

- **Navigation bar follows the theme (Android).** The system navigation bar now takes the app's background colour and uses light buttons on dark and dark buttons on light, and it updates as soon as the theme changes.
- **No empty strip above the bottom bar.** Content on the five tab screens now scrolls down to the bottom bar instead of stopping at a gap of the page colour.
- **Calmer theme change.** Changing the theme takes about 150 ms, and the theme control thumb moves without bouncing.
- **Date picker in the Library.** Add movie, Add book and the item edit form have a Calendar button on the date field. It opens a month picker, future dates cannot be picked, and typing a date still works.
- **Cleaner Day screen.** The open and locked banners are gone, because the lock chip with the countdown already shows the state. Future days, invalid days and a wrong device clock still show their banner.
- **Branded splash.** The default Android splash is replaced by a solid `#07070D` screen with no icon, followed by the app name with a loading bar, in both themes. It never waits for the network.

### Known limits

- The navigation bar colour and the new splash need the new native build. They do not reach an installed v0.2.1 build, and both still need checking on a real phone.
- Detail, Coverage and Precision still read your first pass of a day, so they do not change when you edit that day later.

## v0.2.1 (2026-11-17)

Version 0.2.1 fixes the recall score and simplifies how the Android app is published.

### What is new

- **Recall score fix.** The Later recall part of the score now counts the words your newest pass has that your first pass did not. Text you add to an older day and then delete again no longer keeps its points, and deleting only some of it takes away only those points.
- **One Android file.** Each release now has a single APK, `MemoryJournal-v0.2.1-android.apk`, which runs on 64-bit and 32-bit phones. The separate arm64-only file is no longer published.
- **Faster releases.** Building the release takes about half as long, because only one Android build is made.
- **Checks on tags only.** The automatic checks on GitHub run when a version tag is pushed or when started by hand, not on every commit.

### Known limits

- Detail, Coverage and Precision still read your first pass of a day, so they do not change when you edit that day later.

## v0.2.0 (2026-11-16)

Version 0.2.0 changes how the app opens, how it looks and how big it is. You can now use it without signing in, the default look is a dark neon-gradient theme, navigation is icon-only, every delete asks first, and the Android build is set up to be much smaller. The first phone test of v0.1.0 drove this version (section 15 of the build document).

### What is new

- **Guest mode:** a fresh install shows a brand splash (the app name and a loading bar) and then Home, with no sign-in screen and no network needed. A guest can write (after 21:00 on the device clock), use tags, the library, insights and learn. Everything is stored on the device only, and nothing of a guest journal is sent to the cloud.
- **Sign-in and sign-out with a guest journal:** signing in with Google shows a merge confirmation, then adds the guest journal to the account and clears the local copy. Signing out asks first, removes the journal data and cache from the device and returns to an empty guest mode. A different account sees only its own data. Signing out with unsynced changes shows a warning first.
- **New default look:** dark is the default theme with a neon gradient palette, bundled Plus Jakarta Sans, an icon set and shared gradient buttons, cards and chips. Light and System are still available in Settings. People who upgrade from v0.1.0 are switched to dark once; after that their own choice is never overridden.
- **Icon-only navigation:** an icon bottom bar on phones and an icon sidebar on wide windows, with Settings in the top bar and an icon Back button on every screen. Every icon has an accessibility label, and desktop adds tooltips.
- **Confirmation for every delete:** every delete, remove, discard, erase and sign-out action shows a confirmation dialog, and Cancel leaves the data unchanged.
- **Motion:** animated screens and components built on `react-native-reanimated`. The system reduce-motion setting removes looping and large motion.
- **Responsive layouts:** screens adapt across phone, tablet and desktop sizes.
- **Windows app:** the window background, sidebar and splash match the new theme.
- **Android:** auto-backup is turned off, so a reinstall starts clean and a guest journal is never restored from a backup.

### Builds and size

- The app config is now `apps/app/app.config.ts`. The `preview` APK builds for two CPU types (arm64-v8a and armeabi-v7a), a new `preview-arm64` profile builds arm64 only, `development` keeps all four for emulators, and `production` builds an App Bundle with all four.
- Code and resource shrinking are on for release builds, and unused dependencies and assets were removed.
- `pnpm release:android` builds through EAS, downloads the artifact and saves it as `MemoryJournal-v<version>-android.apk` (and `...-android-arm64.apk`), then prints the SHA-256 of each file. Publish both files on the GitHub Release page with the checksums in the release text.
- The `preview` profiles raise the Android version code automatically, so each APK installs over the previous one without uninstalling. The package name `com.memoryjournal.app` is unchanged.
- **APK size before and after: not measured yet.** v0.1.0 had a recorded size of about 94 MB (all four CPU types, no shrinking). The target for the `preview` APK is 50 MB or less. No v0.2.0 build has been made yet, so the real numbers will be added here and in `docs/decisions.md` after the first `pnpm release:android` run.

### Known limits that no longer apply

- The default splash icon: the splash now shows only the app name and a loading bar.
- The Android navigation bar follows the system theme rather than the saved choice: v0.2.0 sets the theme through `expo-system-ui`. This still needs checking on a real phone.

### Known limits that remain

- **Not tried on real devices yet.** The automated tests pass, but the checks in section 15 of `docs/qa.md` (the 480-wide window, resize and restore, the layout matrix, 130 and 200 percent font scale, animation smoothness on a low-end phone, reduce motion) have not been run by a person.
- **No build has been made.** No EAS build and no Windows installer exist yet for this version.
- **Play Protect** may show "App blocked" on an APK installed outside Google Play. See Installing on Android in the README. Google Play testing or Firebase App Distribution avoids it.
- **The Windows installer is not code signed**, so Windows SmartScreen will show a warning.
- **iOS** is configured but has not been built, and Sign in with Apple has not been added.
- **Accessibility** has not been checked with a screen reader (TalkBack, Narrator, NVDA).
- The guest 21:00 lock uses the device clock, with a guard against the clock being set backwards, so a guest can open today early by changing the clock. Signed-in users are still protected by the server rules.

The reasoning behind these choices is in `docs/decisions.md` (D-040 onwards).

## v0.1.0 (2026-11-15)

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
