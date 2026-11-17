# Memory Journal App: Build Documentation v0.2.0

> [Index](build-documentation.md) | Previous: [v0.1.0](build-documentation-v0.1.0.md) | Next: [v0.2.1](build-documentation-v0.2.1.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

> This file holds section 15 (15.1 to 15.16): experience, guest mode and size.

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
