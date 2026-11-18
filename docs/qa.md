# Manual QA checklist

Run this before tagging a release. It covers what the automated tests cannot: real devices, the real Firebase project, the system clock and the installers. Tick a box only after you have seen the result yourself, and write the build, device and date at the top of each run.

```
Run: v____   Date: ________   Tester: ________
Android device / version: ________   Windows version: ________
```

## 0. Before you start

- [x] `pnpm typecheck`, `pnpm exec eslint .`, `pnpm format:check` and `pnpm test` all exit 0 on the commit you are testing (the tests include the Firestore rules tests, which need the emulator and a JDK).
- [x] The Firebase project has the current `firebase/firestore.rules` and `firebase/firestore.indexes.json` deployed.
- [ ] You have a test Google account that has never signed in, and a second test account for the privacy checks.
- [x] The Firebase and Google values from the `.env` files are set (locally for Windows, as EAS environment variables for Android).

## 1. Sign-in (acceptance 1)

- [x] Android: Continue with Google opens the native account picker and lands on an empty calendar.
- [ ] Windows: Continue with Google opens the system browser (not an embedded window), and after approving, the app shows an empty calendar.
- [x] A new `users/{uid}` document exists in Firestore with the device time zone and UTC offset.
- [x] Close and reopen the app: you are still signed in.
- [x] Settings shows your name and email, read-only. Sign out returns to the sign-in screen.
- [x] Android: a build signed by EAS can sign in. If it fails with a developer error, the SHA-1 of the build's signing key is missing in the Firebase console.

## 2. Home and calendar

- [ ] Today has a ring, future dates are disabled, written days have a dot, empty past days look different from written days.
- [ ] The top bar shows the current streak and the latest recall score.
- [ ] Tapping a past date opens its Day screen; a future date does not open.
- [ ] Phone width shows a bottom navigation or the link list on Home; a window wider than 900 points shows the side navigation (Home, Tags, Library, Insights, Learn, Settings).

## 3. The 9 PM lock (acceptance 2)

- [ ] Before 21:00 local, today opens in View mode with the countdown chip and a disabled Pencil. A day that already has text can still be read, and nothing can be typed.
- [ ] At 21:00 the Pencil works without leaving the screen or restarting the app.
- [ ] Set the device clock forward past 21:00 while still before 21:00 real time: the screen may unlock, but saving is refused by Firestore (the rules use server time). Put the clock back afterwards.
- [ ] A past day is always editable with the Pencil.

- [ ] Change the device time zone and reopen the app: the lock follows the new local time and the stored offset is updated.

## 4. Writing (acceptance 3)

- [ ] Tapping a day opens it in View mode: the saved text with nothing to type into, a Pencil in the header, and a "Nothing written for this day yet." card with a Write button when the day is empty.
- [ ] Press the Pencil: one large writing field replaces the page, with no Free Notes block and no hourly rows. The header shows X (Cancel) and Save, and a row under the date, above the field, has Add time and Add tag (section 15 checks where it sits).
- [ ] Add time, Hour only: inserts a line such as `⏱ 21` on its own line at the cursor. Hour and minutes inserts `⏱ 21:25`, with the :00, :15, :30 and :45 chips and a minute field that takes 0 to 59.
- [ ] Add a time that is already in the page: the cursor moves to the existing line instead of adding a second one.
- [ ] Save, then look at View mode: time lines show as clock chips (`21:00`, `21:25`) with the text under them.
- [ ] You can write anything in any order, with no time at all, and save.
- [ ] Type, wait a few seconds, close the app without saving, reopen: the draft is back and opens straight in edit mode.
- [ ] Save shows "All changes saved" and returns to View mode on the Latest pass. With nothing changed, Save just returns to View mode.
- [ ] Cancel or Back with unsaved changes asks "Discard changes?" with a Keep editing button; discarding removes the draft. Without changes it leaves at once.
- [ ] A day written before v0.2.4 shows its Free Notes first, then its rows in time order. The Pencil opens it as one text with the rows as time lines, and saving creates a new pass while the older pass stays unchanged.

## 5. Revisions (acceptance 4)

- [ ] The first save of a day is revision 1.
- [ ] Save twice in the same sitting: still one revision, updated.
- [ ] After 30 minutes of inactivity, or after closing the day, a later save creates revision 2.
- [ ] Reopen an older day with the Pencil, add text, save: a new revision appears, and the toggle shows Latest, 1st, 2nd and so on. Older passes are read-only.

- [ ] Choosing an earlier pass shows the day as it was then.
- [ ] Highlight additions marks only the words that were not in the previous pass.

## 6. Tags (acceptance 5)

- [ ] People, Places and Numbers exist by default. Create, rename and delete a custom category.
- [ ] Create a tag with a note and an alias.
- [ ] Typing `@` in the writing field opens suggestions grouped by category; choosing one inserts `@Name`, and in View mode it shows as a tag chip that opens the tag.
- [ ] Add tag opens the picker with a chip for every category (All, People, Places, Numbers and each custom one); the chips and the search (name or alias) narrow the list; Create new tag works without leaving the Day screen and inserts the new tag at once.
- [ ] Select text, Save as tag: the tag exists and the text becomes a mention.

- [ ] The tag detail screen lists every day, movie and book that mentions it, newest first.
- [ ] Search and the category filter narrow the list.
- [ ] Delete a tag: the old entries keep the mention as plain text.

## 7. Library (acceptance 6)

- [ ] Movies and Books tabs each add an item with a title and an optional date.
- [ ] The item page is one free page with no time sections, always editable, with revisions.
- [ ] Tags work in an item and the item appears in the tag's mention list.

## 8. Insights (acceptance 8)

- [ ] After writing at least one 21:00 day with 20 or more words, the streak shows 1.
- [ ] The recall score, the 30-day trend and one message appear, and the message uses your real numbers.
- [ ] The info sheet says the score is a motivation tool, not a medical measure.
- [ ] Editing an older day changes the score but does not extend the streak.
- [ ] Missing a day with no freeze resets the streak to 0 (check with a test account whose days you set up, not by waiting).

## 9. Learn (acceptance 9)

- [ ] All seven lessons open and read correctly.
- [ ] With the network off (airplane mode, or Wi-Fi unplugged on Windows), all lessons still open.
- [ ] Mark as done persists after restart. Each lesson's Try it tonight link opens the Day screen.

## 10. Reminder (acceptance 7)

- [ ] Android: the notification permission is requested on the first launch after sign-in.
- [ ] Android: at 21:00 a notification reads "Time to write your day. Tap to open." and tapping it opens the app.
- [ ] Windows: closing the window leaves the app in the system tray.
- [ ] Windows: at 21:00 a native notification appears; clicking it focuses the window on today.
- [ ] Settings reminder toggle off: no notification the next evening on either platform. Toggle on again: it returns.
- [ ] Change the time zone: the reminder moves to 21:00 local.

## 11. Offline, export and delete (acceptance 10)

- [ ] Go offline, write and save a day, go back online: the revision appears in Firestore.
- [ ] Export all data produces a JSON file with days, revisions, tags, categories, library items and progress.
- [ ] Delete account asks twice, then removes the Firestore data and the sign-in, and returns to the sign-in screen.
- [ ] Sign in with the second test account: none of the first account's data is visible.

## 12. Look and accessibility

- [ ] Theme: System, Light and Dark each apply on every screen, including the sign-in button border in dark.
- [ ] Windows: Alt+1 to Alt+6 open Home, Tags, Library, Insights, Learn and Settings. Escape cancels editing a day (asking to discard if there are changes), closes the Add time and Add tag sheets and closes the tag search.

- [ ] Windows or web: tabbing through a screen shows a visible focus ring and the tab order makes sense. (Not reviewed so far.)
- [ ] Screen reader (TalkBack on Android, Narrator or NVDA on Windows): the navigation is announced as a navigation area, and "All changes saved" is announced after saving. (Not reviewed so far.)
- [ ] Small buttons are easy to hit on a phone.

## 13. Packaging

- [ ] `pnpm --filter app build:android:preview` produces an APK that installs and passes sections 1 to 11 on a real device.
- [ ] `pnpm --filter app build:android` produces an App Bundle.
- [ ] `pnpm --filter desktop dist` produces `release/Memory Journal-Setup-<version>.exe`.
- [ ] The installer installs per user, lets you choose the folder, creates a shortcut named Memory Journal, and the installed app loads the bundled web build with no network except Firebase and Google.
- [ ] Windows shows a SmartScreen warning because the installer is not code signed. This is expected for v0.1.0.

## 14. v0.2.0: guest mode, theme, navigation and size

Run sections 1 to 13 first. Where a v0.1.0 line says "returns to the sign-in screen" or "an empty calendar", v0.2.0 returns to an empty guest Home instead.

### Guest mode (acceptance 1 to 4)

- [ ] Fresh install, airplane mode on: the splash shows the app name and a loading bar (no icon), then Home. There is no sign-in screen.
- [ ] As a guest, after 21:00 on the device clock, the writer opens and saves. Tags, library, insights and learn work.
- [ ] Set the device clock backwards: the guest lock does not open early (backwards-clock guard).
- [ ] Uninstall as a guest and reinstall: the journal is gone (auto-backup is off). Firestore holds nothing of the guest journal.
- [ ] Guest with some days: Continue with Google shows the merge confirmation, then the days appear in the account and the local guest copy is cleared.
- [ ] The merged journal is visible on a second device signed in with the same account.
- [ ] Sign out asks for confirmation, then shows an empty guest mode with no data and no cache left on the device.
- [ ] Sign in with a second Google account: only its data shows (empty if new). Sign back in with the first: its data returns.
- [ ] Sign out with unsynced changes (airplane mode, then a save) shows a warning first.

### Theme and navigation (acceptance 5, 6)

- [ ] Fresh install is dark. Light and System still apply on every screen.
- [ ] Upgrade a v0.1.0 install that had Light selected: it switches to dark once. Choose Light again, close and reopen: it stays Light.
- [ ] The bottom bar and the sidebar show icons only. Each icon has an accessibility label, and desktop shows a tooltip.
- [ ] Back is an icon on every screen. Settings opens from the top bar.
- [ ] Text contrast looks right in both themes.

### Confirmations (acceptance 7)

- [ ] Delete a library item, delete a tag, delete a category, discard a draft, erase guest data, delete account and sign out: each shows the confirmation dialog, and Cancel leaves the data unchanged.
- [ ] Search the code for `delete`, `remove`, `discard`, `erase` and `signOut` call sites and confirm each goes through `useConfirm()` (section 15.10).

### Motion and layout (acceptance 8, 9)

- [ ] Animations run smoothly on a low-end Android phone.
- [ ] Turn on the system reduce motion setting: looping and large motion stop.
- [ ] Phone portrait and landscape, tablet and a desktop window show the right layout with no sideways scrolling.
- [ ] Font scale 130 and 200 percent: no clipped text on any screen.
- [ ] Windows: the window at 480 wide, resize and restore behave. The window background, sidebar and splash match the theme.

### Size and release (acceptance 10, 11)

- [ ] `pnpm release:android` produces `MemoryJournal-v0.2.0-android.apk` and `MemoryJournal-v0.2.0-android-arm64.apk` and prints their SHA-256. Record both sizes in `docs/decisions.md` and `docs/release-notes.md`. The `preview` APK should be 50 MB or less; if not, record the measured breakdown and the reason.
- [ ] The APK installs over a v0.1.0 build without uninstalling, and the package name is `com.memoryjournal.app`.
- [ ] The production App Bundle builds.
- [ ] Settings footer shows v0.2.0. The Windows installer is named `Memory Journal-Setup-0.2.0.exe`.
- [ ] `git log` has no version-only commit, and the `v0.2.0` tag is on the final commit.

## 15. v0.2.5: calmer motion, visible system buttons, top day tools

Run sections 1 to 14 first. Where a v0.2.0 line in "Motion and layout" mentions animation, the rules below replace it. The plan is `docs/build-documentation-v0.2.5.md`; the numbers in brackets are its acceptance criteria.

### Motion: nothing moves (acceptance 1 to 3)

- [ ] Run this search from the repository root. It must find no animation code. The only hits allowed are comments, the `PressableScale` name, the `-scale` test ID and tests that assert nothing moves:
      `Get-ChildItem -Recurse apps/app/src,apps/app/app -Include *.ts,*.tsx | Select-String -Pattern 'withSpring|translateX|translateY|\bscale\b|rotate|SlideIn|SlideOut|FadeInDown|FadeInUp|ZoomIn|BounceIn|LinearTransition|slide_from_right|slide_from_bottom|LayoutAnimation'`
- [ ] Open and leave a stack screen (Day, Tag detail, Settings), including with hardware Back: the screen fades in 150 ms and nothing slides.
- [ ] Open and close every sheet and dialog (Add time, Add tag, Create new tag, confirmation, sign-in, merge): it appears in place while the backdrop fades. It does not rise, scale or shake.
- [ ] Switch tabs, switch a Settings toggle, change a segmented control, change the calendar month, press a button, a chip, a card and an icon button: only colors and opacity change. Nothing moves, grows or shrinks.
- [ ] Still working: the score ring and trend line draw, progress bars fill, the Check icon draws after saving, the streak and score count up, skeletons shimmer, the theme cross-fades, the splash fades into Home.
- [ ] At 21:00 the Today card cross-fades Lock to LockOpen with an opacity glow and no shake.
- [ ] Turn on the system reduce motion setting: loops stop, every transition is a 100 ms fade or none, and final values show at once.

### System navigation buttons (acceptance 4, 5)

Repeat each check in the dark theme, the light theme, and System with the phone switching between dark and light.

- [ ] Three-button navigation: Back, Home and Recent are clearly visible, and they change when the theme changes without restarting the app.
- [ ] Two-button navigation: the buttons are visible and nothing of the app is drawn under them.
- [ ] Gesture navigation: the gesture pill is visible.
- [ ] The status bar icons are visible in both themes.
- [ ] The area behind the system buttons has the same color as the bottom tab bar, so they read as one block. A screen with no tab bar uses the page background.
- [ ] The bottom tab bar and every screen that reaches the bottom edge sit fully above the system buttons.
- [ ] Cold start and rotation show no white flash, and the splash uses the dark color with light buttons.

### Home greeting (acceptance 6, 7)

- [ ] The Home top bar shows the greeting where Memory Journal was, and the text Memory Journal is not on Home. The greeting is not repeated under the top bar.
- [ ] As a guest at 09:00 it reads `Good morning`. Signed in as Sam Perera at 20:00 it reads `Good evening, Sam`. At 23:00 it reads `Good night`. Check the edges: 04:59, 05:00, 11:59, 12:00, 16:59, 17:00, 20:59 and 21:00.
- [ ] At font scale 200 percent and at a 360 wide window the greeting wraps onto a second line, and the Sign in pill and the Settings gear stay visible. It is never cut off with an ellipsis.
- [ ] The Windows window title and the browser tab title stay Memory Journal. The Tags, Library, Insights and Learn screens keep their own titles.

### Day writing page tools (acceptance 8, 12)

- [ ] In edit mode the Clock and Tag buttons are in a row under the date, above the writing field, left aligned. Nothing is at the bottom of the page except the writing field and, when open, the keyboard.
- [ ] Write a long text and scroll: the Clock and Tag row stays at the top of the window while the text moves.
- [ ] The writing field fills the screen down to the system buttons, or down to the top of the keyboard when it is open.
- [ ] View mode has no Clock or Tag row.
- [ ] Place the cursor in the middle of a line, open Add time or Add tag and press Cancel, the close icon or hardware Back: the writing field has focus, the keyboard returns and the cursor is where it was.
- [ ] Insert a time or a tag from the top buttons: it goes in at the saved cursor with the usual spacing rules.

### Add time sheet (acceptance 9)

- [ ] All 24 hours show in equal cells: 6 columns and four rows on a phone, 8 columns and three rows from 600 px up. The selected hour has the gradient border.
- [ ] Hour and minutes: the minute field takes only digits 0 to 59 with a numeric keyboard, and the `:00`, `:15`, `:30` and `:45` chips share one row in equal widths.
- [ ] Insert gives `⏱ 21` for Hour only and `⏱ 21:25` for Hour and minutes, at the cursor. Insert is disabled until the choice is complete.

### Add tag sheet and the other popups (acceptance 10, 11)

- [ ] Add tag shows the category chips, the search field and the list, and Create new tag is fully visible above the system buttons. With the keyboard open the search field and at least three rows stay visible (on a 360 by 640 phone this is expected to fall short of three rows; record what you see).
- [ ] Check each of Add time, Add tag, Create new tag, the confirmation dialog, the sign-in modal and the merge dialog in every row of this matrix. In each one the header and the footer buttons stay fully visible, the body scrolls when it is long, and nothing is under a system button.

| Window                      | Orientation | Font scale 100 | Font scale 200 | Keyboard open (where a field exists) |
| --------------------------- | ----------- | -------------- | -------------- | ------------------------------------ |
| 360 by 640 phone            | Portrait    | [ ]            | [ ]            | [ ]                                  |
| 360 by 640 phone            | Landscape   | [ ]            | [ ]            | [ ]                                  |
| 412 by 915 phone            | Portrait    | [ ]            | [ ]            | [ ]                                  |
| 412 by 915 phone            | Landscape   | [ ]            | [ ]            | [ ]                                  |
| Window 600 px wide or wider | Dialog      | [ ]            | [ ]            | [ ]                                  |

- [ ] A window 600 px wide or wider shows the sheets as a centered dialog, at most 480 wide.
- [ ] Hardware Back and Esc close each sheet.

### Version and release (acceptance 13, 14)

- [ ] Settings footer shows v0.2.5, and the version is 0.2.5 in all five `package.json` files, the app config and `LICENSE.txt`.
- [ ] `git log` has no version-only commit and the `v0.2.5` tag is on the final commit.
- [ ] `git diff v0.2.4 -- firebase/firestore.rules` is empty, and core tests, app tests, rules tests and CI pass.

## Results

Write down every failed box with the steps, the device and the build, and fix it in a separate commit before releasing.
