# Memory Journal

A private journaling app that trains memory. Writing about today unlocks at 9:00 PM local time; after that you write everything you remember about the day. Later you can come back, add details you remembered afterwards, and compare every writing pass.

Targets: Android, Windows (Electron) and optionally iOS, from one React Native (Expo) codebase.

The full specification is in [docs/build-documentation.md](docs/build-documentation.md). Implementation choices that the specification left open are recorded in [docs/decisions.md](docs/decisions.md).

## Repository layout

| Path            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `apps/app`      | Expo app (Android, iOS, web build)                            |
| `apps/desktop`  | Electron shell that wraps the web build                       |
| `packages/core` | Pure TypeScript business logic (time rules, score, streak...) |
| `firebase`      | Firestore security rules, indexes and rules tests             |
| `docs`          | Documentation                                                 |

All business logic lives in `packages/core` so mobile and desktop behave identically.

## Requirements

- Node.js 20 or newer
- pnpm (`npm install -g pnpm`)

## Getting started

```bash
pnpm install
pnpm typecheck
pnpm lint
```

## Scripts

| Command                | What it does                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`            | Run ESLint across the workspace                                                                              |
| `pnpm format`          | Format all files with Prettier                                                                               |
| `pnpm format:check`    | Check formatting without changing files                                                                      |
| `pnpm typecheck`       | Run the TypeScript compiler in every package                                                                 |
| `pnpm release:android` | Build the Android APKs on EAS and save them as `MemoryJournal-v<version>-android.apk` with SHA-256 checksums |

## Installing on Android

These steps are for people who got the APK directly from the developer. Only install an app from someone you trust.

1. Download `MemoryJournal-v0.2.2-android.apk` from the [GitHub Releases](../../releases) page. It works on 64-bit and 32-bit phones. You can compare the file with the SHA-256 checksum in the release text.
2. Open the file. If Android asks, allow your browser or file manager to install apps from this source.
3. If Google Play Protect shows **App blocked** or **Unknown developer**, this is not a virus finding. It means Google has not seen an app from this developer before, because the app is signed with a new key and installed from outside Google Play. Tap **Install anyway** (the small text link under the description), then continue.
4. A new version installs over the old one and keeps your data. You do not need to uninstall first.
5. You can use the app right away as a guest, with no sign-in. A guest journal stays on the phone only. Signing in with Google adds it to your account.

If you uninstall the app, the data on the phone is removed (a guest journal is not backed up).

## Contributing

- Branch from `main` using `feat/<name>`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint on every commit.
- Husky runs lint-staged before each commit, so staged files are linted and formatted automatically.
- Each commit must build and pass tests.

## Privacy

Journal text is never sent to any AI service or third party. The analyzer runs entirely on the device.
