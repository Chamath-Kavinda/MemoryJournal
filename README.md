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

| Command             | What it does                                 |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | Run ESLint across the workspace              |
| `pnpm format`       | Format all files with Prettier               |
| `pnpm format:check` | Check formatting without changing files      |
| `pnpm typecheck`    | Run the TypeScript compiler in every package |

## Contributing

- Branch from `main` using `feat/<name>`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are checked by commitlint on every commit.
- Husky runs lint-staged before each commit, so staged files are linted and formatted automatically.
- Each commit must build and pass tests.

## Privacy

Journal text is never sent to any AI service or third party. The analyzer runs entirely on the device.
