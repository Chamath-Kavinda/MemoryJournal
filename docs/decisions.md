# Decisions

Choices the build documentation left open, recorded as the documentation requires.

## D-001: TypeScript is pinned to 6.0.x

The documentation asks for the latest stable versions. The latest TypeScript (7.0) is not yet supported by `typescript-eslint` (supported range is `>=4.8.4 <6.1.0`), which would leave ESLint running against an unsupported compiler. TypeScript is pinned to `~6.0.3`, the newest version in the supported range. Revisit when `typescript-eslint` adds TypeScript 7 support.

## D-002: Line endings are LF everywhere

Development happens on Windows, where Git defaults to CRLF. `.gitattributes` (`* text=auto eol=lf`), `.editorconfig` and Prettier (`endOfLine: lf`) all enforce LF so diffs and hooks behave the same on every machine.

## D-003: Core package is consumed as TypeScript source

`packages/core` exposes `src/index.ts` directly (no build step). Expo, Metro and Electron's bundler all compile workspace TypeScript, so this avoids maintaining a separate build output for the package.

## D-004: Timestamps in core are epoch milliseconds

Domain types in `packages/core` use epoch milliseconds (UTC) for every timestamp instead of Firestore `Timestamp` objects. This keeps core free of Firebase dependencies and trivially testable. Platform adapters convert at the Firestore boundary.

## D-005: Dependency build scripts are allow-listed

pnpm blocks dependency install scripts by default. Only `@swc/core` (used by the Jest transform) is allowed in `allowBuilds` in `pnpm-workspace.yaml`. New entries need a reason recorded here.

## D-006: Revision and sitting rules the documentation left open

- A new sitting always creates the next revision, even on the same calendar day. Revisions are immutable once a sitting ends, so the documentation's later save session on any later day is applied to every new sitting.
- The last activity of a sitting is the day document's `updatedAt`; if unknown, the open revision's `createdAt` is used.
- `addedWordCount` compares against the previous revision as a multiset of words, ignoring case and surrounding punctuation. Revision 1 has no previous pass, so all of its words count as added.
- Library item revisions (section 5.5) have no `closedAt` in the data model, so their helper is added together with the library feature.

## D-007: Firebase runs on a demo project until a real one exists

The emulators and the rules tests use the project ID `demo-memory-journal`. The `demo-` prefix tells the Firebase CLI to run fully offline, so no Firebase project, login or billing is needed to develop or test. A real project ID and its web config go into `apps/app/.env` (see `apps/app/.env.example`) before the first real sign-in.

`firebase-tools` is a pinned root dev dependency, set to `14.27.0` instead of the latest 15.x. Version 15 refuses to run the emulators on Java before 21, and the machine in use has Temurin 17. Move to 15.x after installing JDK 21 or newer.

## D-008: protobufjs install script stays blocked

`firebase-tools` pulls in `protobufjs`, whose install script only prepares its optional CLI. It is set to `false` in `allowBuilds` (see D-005).

## D-009: Closed revisions can only be deleted during account deletion

Section 7.1 makes closed revisions undeletable, but section 5.9 requires "delete account and all data", and v1 has no Cloud Functions to do that from a server. The account deletion flow first sets `deletionRequestedAt` on `users/{uid}`; while that field exists the owner may delete closed revisions. Everywhere else a closed revision is read-only. A user can only ever use this on their own data.

## D-010: Rules tests use the real clock and pinned test libraries

The Firestore emulator evaluates `request.time` with the real clock, which cannot be mocked. The rules tests therefore pick a stored `utcOffsetMinutes` that puts local time about 20:30 or 21:30 right now, never exactly at 21:00. The exact 20:59 and 21:00 boundary is covered by the unit tests in `packages/core`.

The tests use `@firebase/rules-unit-testing` 5.0.2 with `firebase` 12.19.0. Version 6 of the test library needs Node 24.12 or newer, while CI runs Node 22. The `@firebase/util` install script is blocked in `allowBuilds` (see D-005) because it is not needed. CI installs Temurin 17 for the emulator.

## D-011: The stored UTC offset is client-reported

The rules trust `utcOffsetMinutes` from the user document, because the server has no other way to know the user's zone. It is limited to real offsets (-12:00 to +14:00, steps of 15 minutes). A user could still set a false offset to unlock today early. That only affects their own private journal, so it is accepted for v1. Changing the device clock alone does not help, because the rules use server time.

## D-012: The app runs against emulators until a real Firebase project exists

The local .env (git-ignored) holds placeholder Firebase and Google values with EXPO_PUBLIC_USE_EMULATORS=true, so the app starts without a real project. Real sign-in needs a Firebase project and a Google OAuth web client ID. Replace the placeholders and set the flag to false. Android emulators reach the PC at 10.0.2.2, so set EXPO_PUBLIC_EMULATOR_HOST to that (or the PC's LAN IP for a real phone).

firebase/auth exports getReactNativePersistence only under the React Native bundle condition, so its types do not declare it. apps/app/src/types/firebase-auth-rn.d.ts declares it. The web build has a placeholder sign-in that is replaced by the browser-based flow in the Electron commit.

## D-013: Desktop Google sign-in uses PKCE in the system browser

The Electron main process starts a loopback server on 127.0.0.1 (random port), opens the system browser to Google, checks the state value, and exchanges the code for an ID token with a PKCE verifier. The ID token goes to the renderer through the preload bridge and is passed to Firebase with signInWithCredential. This needs a separate Google OAuth client of type Desktop app, read from MJ_GOOGLE_DESKTOP_CLIENT_ID and MJ_GOOGLE_DESKTOP_CLIENT_SECRET (Google does not treat a desktop client secret as confidential). The Expo web export is served through a custom app:// protocol because file:// breaks its absolute asset paths. The tray and 9 PM scheduler stay in commit 36.
