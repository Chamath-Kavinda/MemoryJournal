# Memory Journal App: Build Documentation v0.2.5

> [Index](build-documentation.md) | Previous: [v0.2.4](build-documentation-v0.2.4.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

## 1. About this file

`docs/build-documentation.md` reached its size limit at v0.2.4, so it is now an index and the plan is split into one file per version, named `docs/build-documentation-vX.Y.Z.md` (v0.1.0 to v0.2.5). The index lists the files and the section numbers each one holds. The building agent reads the index first, then the version files from oldest to newest, and this file last. Where this file and an older version file disagree, this file wins. Section 2 lists exactly which old parts are replaced.

This is the plan for release v0.2.5. It was written after v0.2.4 was used on a real Android phone with three-button navigation. It changes how the app moves, how it sits next to the Android system buttons, what the top of Home says, and where the Day tools live. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak), the data shape or `firebase/firestore.rules`.

This change is documentation only. No code is written until the plan below is committed.

## 2. What this file replaces

| Old part (in the older version files, see the index) | What changes                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 15.16 Motion and animation                           | Replaced by section 4 below. No element jumps, bounces or slides any more.                                                   |
| 15.8 and 15.11 (Home top bar)                        | The app name is removed from the top bar. The greeting takes its place (section 6).                                          |
| 17.8 Home greeting                                   | The greeting moves from under the title into the top bar (section 6). The wording and time rules stay.                       |
| 18.2 (Edit mode toolbar) and 18.3, 18.4 (sheets)     | The Add time and Add tag buttons move to the top of the page, and both sheets follow the new sheet rules (sections 7 and 8). |
| 15.9 Responsive layout (safe areas)                  | Extended by sections 5 and 7.                                                                                                |

## 3. What was seen on the phone

- There is too much animation. Things jump, bounce and slide. The person wants those removed and the rest left alone.
- The Android system navigation buttons at the bottom of the screen are black on a near black background, so they cannot be seen.
- The home screen shows the app name Memory Journal at the top and the greeting under it. The person wants the greeting at the top and the app name gone.
- On the Day writing page, the Add time sheet and the Add tag sheet are cut off at the bottom by the system navigation. The Cancel and Insert buttons and the Create new tag button are partly hidden.
- The Add time hour grid has rows of different lengths (seven, eight, eight, eight, one) with cells of different widths.
- The Clock and Tag buttons sit at the bottom of the writing page, where the system navigation covers them. The person wants them at the top.

## 4. Motion: no jumping and no sliding

The rule is about what the eye sees move. From v0.2.5, **no element changes its position, its size or its angle as an animation**. Only changes of opacity, color, drawn strokes, filled bars and counting numbers stay.

### 4.1 Removed

- Every spring and bounce: the shared spring (damping 15, stiffness 180), pops (scale 1, 1.2, 1), overshoots, and scale-ups such as the dialog growing from 0.92.
- Every slide and rise: stack screens sliding in from the right, sheets and modals rising from the bottom, the calendar sliding left or right when the month changes, the tab indicator sliding to the selected tab, switch and segmented control thumbs sliding, the snackbar sliding in, fade-up and fade-down entrances.
- Press scaling (0.97) on buttons, tabs, chips, cards and icon buttons. A press still changes color.
- Shakes: the danger icon in the confirmation dialog, the error card, and the Lock to LockOpen shake on the Today card.
- Floating empty-state icons, the Flame flicker, the date ripple, the idle shine sweep on primary buttons, the milestone burst of dots, and the delete collapse of a card (a card now fades out and the list updates).
- Layout transitions that move items when a list changes.

### 4.2 Kept

- Fades and cross-fades: between tabs, between themes (250 ms), Home into account data after sign-in, signing out, and the splash fading into Home.
- Color and border changes on press, focus, selection and theme change, including the search field border turning to the neon gradient on focus.
- Drawn or filled shapes: the score ring drawing from 0, the trend line drawing left to right, progress bars filling, the Check icon drawing itself after saving and in the merge steps, and skeletons shimmering.
- Counting numbers: the streak and the recall score counting up.
- Opacity-only glows: the soft glow under the active tab icon, the glow flash when the Today card unlocks at 21:00, the today ring glow, and on Android the breathing gradient border of primary buttons. These must change opacity only, never size.
- List entrances may still stagger by 50 ms per item for at most 8 items, as a fade only.

### 4.3 What replaces the removed motion

| Was                                                     | Now                                                                                                                        |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Stack screen slides in from the right, Back reverses it | A 150 ms fade for both directions. Hardware Back, Esc and Alt+Left behave the same.                                        |
| Sheet or modal rises from the bottom                    | The sheet appears in place while the backdrop fades in over 150 ms, and leaves the same way.                               |
| Confirmation dialog scales up and the icon shakes       | The dialog fades in over 150 ms. No shake.                                                                                 |
| Tab indicator slides, icon pops                         | The indicator and icon change color at once, with a 150 ms color fade. The thicker stroke (2.5) for the active icon stays. |
| Switch and segmented thumb slides                       | The thumb is drawn in its new position at once, with a 150 ms color fade.                                                  |
| Calendar month change slides                            | A 150 ms cross-fade of the month grid.                                                                                     |
| Press scale                                             | A 150 ms color change only.                                                                                                |
| Snackbar slides in                                      | The snackbar fades in and out.                                                                                             |
| Lock to LockOpen with a shake                           | A 250 ms cross-fade of the two icons and the opacity glow flash.                                                           |
| Milestone burst of dots                                 | The milestone message card fades in. No dots.                                                                              |
| Date ripple                                             | The pressed date shows a color highlight.                                                                                  |

### 4.4 Tokens and rules

- `apps/app/src/theme/motion.ts` keeps `fast` 150 ms, `base` 250 ms, `slow` 400 ms and `hero` 900 ms (for the score ring and the trend line). The shared spring token and the stagger-by-translation helpers are deleted.
- Navigation: stack screens use the `fade` animation with a 150 ms duration on Android, iOS, web and the Windows app.
- Reduce motion keeps its rules from section 15.16: stop every loop, use 100 ms fades, show final values at once. Because slides and scales no longer exist, only the loops, the count-up and the drawing differ.
- At most two looping animations may be visible at once, and loops pause when the app is in the background or the screen is not focused. These rules stay.
- Animation never blocks input, and no animation delays opening a screen by more than 250 ms. These rules stay.
- Check by search: no file under `apps/app/src` uses `withSpring`, `translateX`, `translateY`, `scale`, `rotate`, `SlideIn*`, `SlideOut*`, `FadeInDown`, `FadeInUp`, `ZoomIn`, `BounceIn`, a layout transition that moves items, or a native stack animation of `slide_from_right` or `slide_from_bottom`. The QA checklist includes this search.
- Tests keep covering the end state of animated components and the reduced-motion path. The tests for removed motion (pop, shake, slide) are deleted with it.

## 5. System navigation buttons must be visible

### 5.1 Cause

The app draws its dark background under the Android navigation bar, but the system draws the buttons (Back, Home, Recent) in the dark style, so they are dark on dark. The same applies to the gesture pill on phones without buttons.

### 5.2 Rules

- The style of the system navigation buttons follows the active theme: light buttons in the dark theme, dark buttons in the light theme. It changes live when the person changes the theme, including when the theme is System and the phone switches between dark and light.
- The area behind the buttons uses the `surface` color, the same as the bottom tab bar, so the tab bar and the system bar read as one block. Screens without a tab bar use `background`.
- The bottom tab bar and every screen that reaches the bottom edge add the bottom safe area inset (`react-native-safe-area-context`), so nothing is drawn under the buttons. This holds with three-button navigation, two-button navigation and gesture navigation.
- The status bar icons also follow the theme (light on dark, dark on light).
- `expo-system-ui` keeps the native window background equal to the theme `background`, so there is no white flash on start or on rotation.
- How this is set depends on the Expo SDK version in the repository. From SDK 53 apps are edge to edge and the bar color itself cannot be set, so the app draws the color and sets only the button style. The building agent reads the documentation of the installed `expo-navigation-bar` version before choosing the call, and records the choice in `docs/decisions.md`.
- The splash screen uses the same dark color and light buttons.

## 6. Home: the greeting is the title

- The top bar of Home no longer shows the text Memory Journal. In its place, on the left, is the greeting line from section 17.8 of `build-documentation.md`: `Good morning`, `Good afternoon`, `Good evening` or `Good night`, with a comma and the first word of the display name when the person is signed in and has one (`Good morning, Sam`). It uses the same large title style the app name used.
- The separate greeting line under the old title is removed, so the greeting appears once.
- The time ranges, the one-minute refresh, and the guest rule (greeting alone, no name) do not change: morning 05:00 to 11:59, afternoon 12:00 to 16:59, evening 17:00 to 20:59, night 21:00 to 04:59.
- The Sign in pill (guests) and the Settings gear stay on the right. The greeting takes the remaining width and may wrap to a second line at large font sizes or narrow windows. It is never cut off with an ellipsis and never pushes the pill or the gear out of view.
- The greeting is the heading for screen readers on Home. The Windows window title and the browser tab title stay Memory Journal. Other tab screens (Tags, Library, Insights, Learn) keep their own titles.
- Display only: the greeting does not change the 21:00 lock, the streak or the score.

## 7. Sheets and popups stay inside the safe area

Applies to Add time, Add tag, the Create new tag form opened from the Day screen, the confirmation dialog, the sign-in modal and the merge dialog. They are built on one shared `AppSheet` component (a bottom sheet on compact widths, a centered dialog from 600 px up).

### 7.1 Layout

- Three parts: a fixed header (title and a close icon), a body that scrolls, and a fixed footer for the buttons (Cancel and Insert, or Create new tag). The footer never scrolls away and is never under a system button.
- The footer has bottom padding of the bottom safe area inset plus 16 dp.
- Maximum height of a bottom sheet: the window height minus the top inset minus 24 dp. If the content is taller, the body scrolls.
- Centered dialog (600 px and wider): maximum width 480 and maximum height 80 percent of the window.
- The body works at system font scale 130 and 200 percent: the text grows, the body scrolls, and the footer stays reachable.
- Landscape phones (height under 500) use the centered dialog layout.

### 7.2 Android specifics

- React Native `Modal` draws in its own window, so the insets of the screen behind it may not reach it. The sheet content is wrapped in its own `SafeAreaProvider` inside the `Modal`, and the `Modal` is made status bar and navigation bar translucent so it draws to the same edges as the app. The building agent confirms the fix on a phone with three-button navigation: the last row of the sheet and both footer buttons are fully visible above the buttons.
- Hardware Back and Esc close the sheet, as before.

### 7.3 Keyboard

- When the keyboard opens (the Add tag search field, the minute field), the sheet moves above it. The search field and at least three list rows stay visible, the footer stays visible, and the body scrolls for the rest.
- Closing a sheet returns focus to the writing field with the cursor where it was (section 8.3).

## 8. Day writing page: tools at the top

This replaces the bottom toolbar of sections 18.2 to 18.4 of `build-documentation.md`. Everything else in 18.2 (view mode, edit mode, Save, Cancel, drafts) stays.

### 8.1 Placement

- In edit mode, a toolbar row sits directly under the date, above the writing field. It holds two icon buttons: Clock (accessibility label Add time) and Tag (accessibility label Add tag), each with a 48 by 48 dp target, left aligned with an 8 dp gap, in the same violet icon style as now.
- The row is pinned. It does not scroll with the text. The writing field fills the rest of the screen, down to the bottom safe area, or down to the top of the keyboard when it is open.
- The old bottom toolbar and the toolbar attached to the keyboard are removed. View mode has no toolbar.
- The header (Close, lock chip, Save) is unchanged.

### 8.2 Add time sheet

- Same two choices as 18.3 (Hour only and Hour and minutes) as a segmented control, with the current hour (and minute) preselected, and the same `⏱ 21` and `⏱ 21:25` lines.
- The hour grid has equal cells: 6 columns below 600 px width (four rows) and 8 columns from 600 px up (three rows). Cells have the same width, a minimum height of 44 dp, an 8 dp gap, and are sized with flex or percentages, never by their text. The selected hour has the gradient border.
- In Hour and minutes the minute field takes digits 0 to 59 with a numeric keyboard, and the chips :00, :15, :30 and :45 share one row in equal widths.
- Cancel and Insert are in the fixed footer (section 7.1). Insert is disabled until the choice is complete.

### 8.3 Add tag sheet

- Same content as 18.4: category chips (All, People, Places, Numbers and every custom category), a search field, the tag list, and Create new tag. The chips wrap onto more lines when needed. The list is the scrolling body, and Create new tag is in the fixed footer.
- The cursor position is saved when a sheet opens, because tapping a toolbar button can take focus from the field. After Insert or Cancel the field gets focus back, the keyboard returns, and the insert (if any) goes at the saved cursor, with the spacing rules of 18.3 and D-023.

## 9. Version and commits

- The version goes from `0.2.4` to `0.2.5`, a patch bump, because the journal rules and the data shape are unchanged. It is set in the same five `package.json` files, the app config and `LICENSE.txt` as in v0.2.4. There is no version-only commit: the version fields change in the final commit together with the release notes, the QA checklist and the README.
- Commits on `main`, one logical change each, each passing lint, typecheck and tests:
  1. `docs: plan v0.2.5 calmer motion, visible system buttons and top day tools`
  2. `refactor(app): remove jumping and sliding animations and keep fades`
  3. `fix(app): show system navigation buttons in dark and light themes`
  4. `feat(app): put the greeting in the Home top bar in place of the app name`
  5. `fix(app): keep sheets and popups inside the safe area and scroll long content`
  6. `feat(app): move Add time and Add tag to the top of the writing page and even out the hour grid`
  7. `docs: update the QA checklist for v0.2.5`
  8. `chore: release v0.2.5 with notes`
- Record the decisions in `docs/decisions.md` with the next free numbers: the rule that nothing moves, scales or shakes as an animation; the system button style following the theme and the SDK call chosen; the greeting replacing the app name in the Home top bar; the shared `AppSheet` with a fixed header and footer; the Add time and Add tag buttons at the top of the page.
- `docs/release-notes.md` gets a v0.2.5 section above v0.2.4 with: calmer motion, visible system buttons, greeting at the top of Home, popups that fit above the system buttons, and the tools at the top of the writing page.
- `docs/qa.md` gets: the animation search of section 4.4; a three-button, two-button and gesture navigation check in both themes; each sheet checked on a 360 by 640 phone and a 412 by 915 phone, in portrait and landscape, at font scale 100 and 200 percent, with and without the keyboard.
- Tag the last commit `v0.2.5` and push, as in section 16.4 of `build-documentation.md`.

## 10. Acceptance criteria for v0.2.5

1. No screen change, sheet, dialog, button press, tab change, switch or list change slides, bounces, scales or shakes. Stack screens, sheets and dialogs fade. The search in section 4.4 finds nothing.
2. Fades, color changes, the score ring and trend line drawing, progress bars, the Check drawing, the count-up and skeleton shimmer still work.
3. With Reduce motion on, loops stop and every transition is a 100 ms fade or none.
4. On a phone with three-button navigation, the Back, Home and Recent buttons are clearly visible in the dark theme and in the light theme, and they change when the theme changes. The gesture pill is visible with gesture navigation. The status bar icons are visible in both themes.
5. The bottom tab bar and every screen that reaches the bottom edge sit fully above the system buttons.
6. The Home top bar shows the greeting where Memory Journal was, and the text Memory Journal is not on Home. The greeting is not repeated under the top bar. At 09:00 a guest sees `Good morning`, at 20:00 a signed-in person named Sam Perera sees `Good evening, Sam`, and at 23:00 `Good night`.
7. At a narrow width or large font size the greeting wraps and the Sign in pill and the gear stay visible.
8. In edit mode the Clock and Tag buttons are in a row under the date, above the writing field, and stay in place while the text scrolls. Nothing is at the bottom of the page except the writing field and, when open, the keyboard.
9. The Add time sheet shows all 24 hours in equal cells (6 columns on a phone), and Cancel and Insert are fully visible above the system buttons in both modes. Inserting still gives `⏱ 21` and `⏱ 21:25` at the cursor.
10. The Add tag sheet shows its category chips, search field and list, and Create new tag is fully visible above the system buttons. With the keyboard open the search field and at least three rows stay visible.
11. Every sheet and popup (Add time, Add tag, Create new tag, confirmation, sign-in, merge) is fully usable at 360 by 640, at 412 by 915, in landscape, and at font scale 200 percent: the body scrolls and the footer stays reachable.
12. After a sheet closes, the writing field has focus and the cursor is where it was.
13. The Settings footer shows v0.2.5 and the version is 0.2.5 in all five `package.json` files, the app config and `LICENSE.txt`. There is no version-only commit and the tag is on the final commit.
14. No change was needed in `firebase/firestore.rules`, and core tests, app tests, rules tests and CI pass.
