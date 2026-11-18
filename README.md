# Memory Journal — Build Instructions

A private journaling app that trains memory. Writing about today unlocks at 9:00 PM local time; after that you write everything you remember about the day. Later you can come back, add details you remembered afterwards, and compare every writing pass.

Targets: Android and Windows (Electron), and optionally iOS, from one React Native (Expo) codebase.

The full specification is in [docs/build-documentation.md](docs/build-documentation.md). Implementation choices that the specification left open are recorded in [docs/decisions.md](docs/decisions.md).

## Requirements

- Node.js v20+ ([https://nodejs.org](https://nodejs.org))
- pnpm (`npm install -g pnpm`)
- Windows 10/11 (for building the .exe)
- A free [Expo](https://expo.dev) account (for building the Android APK on EAS; no Android Studio needed)
- A Firebase project and a Google OAuth client (only to sign in; guest mode needs neither)
- JDK 21 or newer (only to run the Firestore rules tests with the emulator)

## Build Steps

### 1. Set up (both platforms)

1. Open this folder in PowerShell
2. Install the packages:

   ```powershell
   pnpm install
   ```

3. Copy `apps/app/.env.example` to `apps/app/.env` and `apps/desktop/.env.example` to `apps/desktop/.env`, then fill in the Firebase and Google values

To try the app without building anything, run `pnpm --filter app web` for the web build or `pnpm --filter desktop start` for the Windows app.

### 2. Build the Windows installer

1. Run:

   ```powershell
   pnpm --filter desktop dist
   ```

2. Find your installer at: `apps/desktop/release/Memory Journal-Setup-<version>.exe`

### 3. Build the Android APK

The APK is built in the cloud by [EAS Build](https://docs.expo.dev/build/introduction/), so the phone toolchain (Android Studio, the Android SDK) is not needed on your computer.

1. Sign in to Expo once. The first command asks for your Expo username and password:

   ```powershell
   cd apps/app
   npx eas-cli login
   ```

2. The `.env` file is not uploaded to EAS, so the `EXPO_PUBLIC_*` values from `apps/app/.env.example` must exist as EAS environment variables for the build. Create each one once (use the same values as your `.env`, and visibility `plaintext` or `sensitive`):

   ```powershell
   npx eas-cli env:create --environment preview
   ```

3. Go back to the repository root and tag the commit you are releasing, so the file name and the version match:

   ```powershell
   cd ../..
   git tag v<version>
   ```

4. Build, download and name the APK in one step:

   ```powershell
   pnpm release:android
   ```

   Use `pnpm release:android --dry-run` first to see the file name without building. The build takes a few minutes on the free EAS queue.

5. Find the files in `release/android/`:
   - `MemoryJournal-v<version>-android.apk` works on 64-bit and 32-bit phones
   - `SHA256SUMS.txt` has the SHA-256 checksum to paste into the release text

6. Upload the APK to [GitHub Releases](../../releases). The app version is read from `apps/app/package.json`, and EAS raises the Android version code on every build by itself.

Other Android commands, run from `apps/app` (or with `pnpm --filter app <script>`):

| Command                      | What it does                                                          |
| ---------------------------- | --------------------------------------------------------------------- |
| `pnpm build:android:preview` | The same EAS build as the release, without the renaming and checksum  |
| `pnpm build:android:dev`     | A development build with the Expo dev client, for all four CPU types  |
| `pnpm build:android`         | A production Android App Bundle (AAB), for Google Play                |
| `pnpm android`               | Build and run on a connected phone or emulator (needs Android Studio) |

## What you get

- `.exe` NSIS installer for Windows 10/11 that shows the license and asks you to accept it
- Installs to a folder you choose, with a Start Menu shortcut
- A signed Android APK (`MemoryJournal-v<version>-android.apk`) built with EAS, published on [GitHub Releases](../../releases)
- A web build that runs in any modern browser

## Features

### Day Writer

- ✅ Today is read-only until 9:00 PM local time, with a countdown
- ✅ After 9:00 PM you write everything you remember about the day
- ✅ Past days stay editable forever; future days cannot be opened
- ✅ A day opens as a read-only page; the pencil turns it into one free writing space
- ✅ Add time (hour only, or hour and minutes) puts a clock line such as `⏱ 21:25` wherever you are typing
- ✅ Write in any order, with no required rows or sections

- ✅ Autosaved drafts while you type
- ✅ Every writing pass is kept as a revision (1st, 2nd, 3rd...)
- ✅ Revision toggle shows the day exactly as it was in each pass
- ✅ Highlight additions marks what you remembered later
- ✅ The 9:00 PM lock cannot be bypassed by changing the device clock

### Tags

- ✅ Default categories: People, Places, Numbers
- ✅ Create, rename and delete your own categories
- ✅ Type `@` while writing to insert a tag as a mention
- ✅ Create a tag without leaving the Day screen
- ✅ Tag page lists every day, movie or book where the tag was mentioned
- ✅ Search and filter by category
- ✅ Deleting a tag keeps its text in old entries

### Library (Movies and Books)

- ✅ Movies and Books tabs with a free page for each item
- ✅ Optional date watched or read, picked in a custom themed calendar
- ✅ Tags and revisions work here too, with no 9:00 PM lock

### Insights

- ✅ Recall score from 0 to 100
- ✅ Streak of consecutive written days
- ✅ 30-day trend
- ✅ Motivational message that follows your progress
- ✅ Everything is calculated on the device; nothing is sent to an AI service

### Learn

- ✅ Bundled lessons on memory techniques, readable offline
- ✅ The memory palace, linking and visual stories, chunking numbers, names and faces, spaced recall, evening review habit
- ✅ Mark lessons as done
- ✅ Each lesson ends with a Try it tonight exercise

### Home and Calendar

- ✅ Greeting by time of day: Good morning, afternoon, evening or night
- ✅ Signed-in people are greeted by first name; guests see the greeting alone
- ✅ Month calendar with a dot on every written day and a gradient ring on today
- ✅ Sri Lanka public holidays shown as a small yellow dot, with the names listed under the calendar
- ✅ The calendar fills the width of the window on desktop
- ✅ Tap any past date to open that day

### Guest Mode and Accounts

- ✅ The app opens straight to Home with no sign-in
- ✅ A guest journal stays on the device only
- ✅ Continue with Google through a sign-in modal on Home, in Settings or from the guest banner
- ✅ On sign-in the guest journal is merged into the account, nothing is lost
- ✅ Windows sign-in uses the system browser, not an embedded window
- ✅ Signing out removes the journal from the device and returns to an empty guest mode
- ✅ Real-time sync across devices through Firestore

### Notifications

- ✅ Daily reminder at 9:00 PM: Time to write your day
- ✅ Android uses a scheduled local notification
- ✅ Windows keeps running in the system tray and shows a native notification
- ✅ Reminder can be turned off in Settings

### Design

- ✅ Dark neon violet-to-blue theme by default, with light and system themes
- ✅ Scrollbar follows the theme on the web build and in the Windows app
- ✅ Bottom bar on phones, side navigation on wide windows
- ✅ Alt+1 to Alt+6 shortcuts jump between sections on desktop
- ✅ Every delete, remove and sign-out asks for confirmation
- ✅ Motion and animation that respect the reduce-motion setting

### Settings

- ✅ Profile, reminder toggle and theme
- ✅ Export all data as JSON
- ✅ Delete account and all data, or erase guest data
- ✅ App version shown in the footer

## Data Location

- A guest journal is stored on the device only (the app's own storage).
- When signed in with a Google account, the journal is stored in your own Firebase Cloud Firestore account and shown on every device you sign in on.
- Security rules allow each person to read and write only their own data.
- Journal text is never sent to an AI service or any other third party.

## Repository layout

| Path            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `apps/app`      | Expo app (Android, iOS, web build)                            |
| `apps/desktop`  | Electron shell that wraps the web build                       |
| `packages/core` | Pure TypeScript business logic (time rules, score, streak...) |
| `firebase`      | Firestore security rules, indexes and rules tests             |
| `docs`          | Documentation                                                 |
| `LICENSE.txt`   | End User License Agreement                                    |

All business logic lives in `packages/core` so mobile and desktop behave identically.

## Scripts

| Command                | What it does                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`            | Run ESLint across the workspace                                                                              |
| `pnpm format`          | Format all files with Prettier                                                                               |
| `pnpm format:check`    | Check formatting without changing files                                                                      |
| `pnpm typecheck`       | Run the TypeScript compiler in every package                                                                 |
| `pnpm test`            | Run all tests, including the Firestore rules tests in the emulator                                           |
| `pnpm emulators`       | Start the local Firebase emulators                                                                           |
| `pnpm release:android` | Build the Android APKs on EAS and save them as `MemoryJournal-v<version>-android.apk` with SHA-256 checksums |

## Installing on Android

These steps are for people who got the APK directly from the developer. Only install an app from someone you trust.

1. Download `MemoryJournal-v0.2.5-android.apk` from the [GitHub Releases](../../releases) page. It works on 64-bit and 32-bit phones. You can compare the file with the SHA-256 checksum in the release text.
2. Open the file. If Android asks, allow your browser or file manager to install apps from this source.
3. If Google Play Protect shows **App blocked** or **Unknown developer**, this is not a virus finding. It means Google has not seen an app from this developer before, because the app is signed with a new key and installed from outside Google Play. Tap **Install anyway** (the small text link under the description), then continue.
4. A new version installs over the old one and keeps your data. You do not need to uninstall first.
5. You can use the app right away as a guest, with no sign-in. A guest journal stays on the phone only. Signing in with Google adds it to your account.

If you uninstall the app, the data on the phone is removed (a guest journal is not backed up).

## Google OAuth Setup (for developers)

The Windows app signs in with Google through the system browser and a loopback redirect on `127.0.0.1`. To use your own Google Cloud project:

1. Go to **Google Cloud Console → APIs & Services → Credentials**
2. Create an **OAuth client ID** of type **Desktop app**
3. Put its values in `apps/desktop/.env`:

   ```
   MJ_GOOGLE_DESKTOP_CLIENT_ID=
   MJ_GOOGLE_DESKTOP_CLIENT_SECRET=
   ```

4. For the web build, put the Web client ID in `apps/app/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
5. For Android, the same Web client ID is used for the sign-in token. Google also needs to know which app is asking, so create an **OAuth client ID** of type **Android** with the package name `com.memoryjournal.app` and the SHA-1 fingerprint of the key that signs your APK (run `npx eas-cli credentials` in `apps/app` to see it). Add the same SHA-1 to the Android app in your Firebase project settings. Without it, Google sign-in fails on the phone, while guest mode keeps working.

For a desktop client Google does not treat the secret as confidential, but keep both files out of git. They are already ignored.

## Holiday Data

Public holidays are shown on the calendar. Sri Lanka holidays are downloaded from:
[https://github.com/Dilshan-H/srilanka-holidays](https://github.com/Dilshan-H/srilanka-holidays)

- No API key required
- Data sourced from official Sri Lankan government gazettes
- Updated every year by the open-source maintainer
- Cached on the device after the first load (one download per year, refreshed after 7 days)
- The calendar works with no network and shows no error without holidays
- The request carries only the year, never journal text or account details

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the credit and license.

## Dependencies

| Package                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `expo` and `expo-router`  | App framework and file-based navigation |
| `react-native-web`        | Compiles the app for the web build      |
| `electron`                | Windows desktop shell                   |
| `electron-builder`        | Packaging and NSIS installer            |
| `firebase`                | Authentication and Cloud Firestore      |
| `zustand`                 | UI state                                |
| `date-fns`                | Date handling                           |
| `zod`                     | Data validation                         |
| `lucide-react-native`     | Icons                                   |
| `react-native-reanimated` | Motion and animation                    |
| `expo-linear-gradient`    | The neon gradient theme                 |

The app's other npm packages keep their own licenses (see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).

## Contributing

- Branch from `main` using `feat/<name>`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint on every commit.
- Husky runs lint-staged before each commit, so staged files are linted and formatted automatically.
- Each commit must build and pass tests.

## Privacy

Journal text is never sent to any AI service or third party. The analyzer runs entirely on the device.

## License

Memory Journal — End User License Agreement  
Version 0.2.5  
Copyright © 2026 Chama Bro. All rights reserved.  
See `LICENSE.txt` for full terms.
