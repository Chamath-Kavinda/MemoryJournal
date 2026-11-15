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

- [ ] Before 21:00 local, today opens read-only with a countdown to 9:00 PM and nothing can be typed.
- [ ] At 21:00 today becomes writable without leaving the screen or restarting the app.
- [ ] Set the device clock forward past 21:00 while still before 21:00 real time: the screen may unlock, but saving is refused by Firestore (the rules use server time). Put the clock back afterwards.
- [ ] A past day is always editable.
- [ ] Change the device time zone and reopen the app: the lock follows the new local time and the stored offset is updated.

## 4. Writing (acceptance 3)

- [ ] Expand an hourly row, type, collapse it: the one-line preview shows.
- [ ] Add minute inserts a marker such as `:25` at the cursor, and text after it belongs to that minute.
- [ ] Free Notes accepts text with no time.
- [ ] Empty rows stay collapsed. You can save with most rows empty.
- [ ] Type, wait a few seconds, close the app without saving, reopen: the draft is back.
- [ ] Save shows "All changes saved".

## 5. Revisions (acceptance 4)

- [ ] The first save of a day is revision 1.
- [ ] Save twice in the same sitting: still one revision, updated.
- [ ] After 30 minutes of inactivity, or after closing the day, a later save creates revision 2.
- [ ] Reopen an older day, add text, save: a new revision appears, and the toggle shows Latest, 1st, 2nd and so on.
- [ ] Choosing an earlier pass shows the day as it was then.
- [ ] Highlight additions marks only the words that were not in the previous pass.

## 6. Tags (acceptance 5)

- [ ] People, Places and Numbers exist by default. Create, rename and delete a custom category.
- [ ] Create a tag with a note and an alias.
- [ ] Typing `@` in a row opens suggestions grouped by category; choosing one inserts a mention chip.
- [ ] The toolbar picker opens, and Create new tag works without leaving the Day screen.
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
- [ ] Windows: Alt+1 to Alt+6 open Home, Tags, Library, Insights, Learn and Settings. Escape closes the add-minute form and the tag search.
- [ ] Windows or web: tabbing through a screen shows a visible focus ring and the tab order makes sense. (Not reviewed so far.)
- [ ] Screen reader (TalkBack on Android, Narrator or NVDA on Windows): the navigation is announced as a navigation area, and "All changes saved" is announced after saving. (Not reviewed so far.)
- [ ] Small buttons are easy to hit on a phone.

## 13. Packaging

- [ ] `pnpm --filter app build:android:preview` produces an APK that installs and passes sections 1 to 11 on a real device.
- [ ] `pnpm --filter app build:android` produces an App Bundle.
- [ ] `pnpm --filter desktop dist` produces `release/Memory Journal-Setup-<version>.exe`.
- [ ] The installer installs per user, lets you choose the folder, creates a shortcut named Memory Journal, and the installed app loads the bundled web build with no network except Firebase and Google.
- [ ] Windows shows a SmartScreen warning because the installer is not code signed. This is expected for v0.1.0.

## Results

Write down every failed box with the steps, the device and the build, and fix it in a separate commit before releasing.
