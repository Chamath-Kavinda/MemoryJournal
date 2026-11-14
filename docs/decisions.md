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
