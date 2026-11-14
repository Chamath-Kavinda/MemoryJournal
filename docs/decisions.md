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
