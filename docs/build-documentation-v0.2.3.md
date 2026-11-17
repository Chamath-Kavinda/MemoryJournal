# Memory Journal App: Build Documentation v0.2.3

> [Index](build-documentation.md) | Previous: [v0.2.2](build-documentation-v0.2.2.md) | Next: [v0.2.4](build-documentation-v0.2.4.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

> This file holds section 17 (17.1 to 17.8): holidays, wide calendar, themed scrollbar and license.

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
