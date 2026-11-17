# Memory Journal App: Build Documentation v0.2.2

> [Index](build-documentation.md) | Previous: [v0.2.1](build-documentation-v0.2.1.md) | Next: [v0.2.3](build-documentation-v0.2.3.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

> This file holds section 16 (16.1 to 16.5): polish from phone testing.

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
