# Requirements Document

## Introduction

This fix resolves TypeScript compilation errors in the frontend codebase. Running `npx tsc --noEmit` currently fails due to an implicit `any` type on the `changes` parameter in `WalletContext.tsx`. The fix must make the TypeScript compiler pass cleanly with `strict: true` without altering runtime behaviour.

## Glossary

- **WalletContext**: `frontend/app/context/WalletContext.tsx` — manages Stellar wallet connection state.
- **WatchWalletChanges**: Class imported from `@stellar/freighter-api` that polls for wallet/network changes and calls a callback with a `changes` object.
- **noImplicitAny**: TypeScript compiler flag (enabled by `strict: true`) that rejects parameters without an explicit type when the type cannot be inferred.
- **type-check script**: `tsc --noEmit` defined in `frontend/package.json` under `scripts.type-check`.

---

## Requirements

### Requirement 1: Eliminate implicit `any` on `changes` parameter

**User Story:** As a developer, I want `npx tsc --noEmit` to pass without errors, so that the CI pipeline and local type-checking are reliable.

#### Acceptance Criteria

1. THE fix SHALL add an explicit type annotation to the `changes` parameter in the `WatchWalletChanges` callback in `WalletContext.tsx` so that TypeScript no longer infers it as `any`.
2. IF `@stellar/freighter-api` v3 exports a type for the callback parameter (e.g. `WalletChanges` or similar), THEN THE fix SHALL use that exported type.
3. IF no suitable exported type exists in `@stellar/freighter-api`, THEN THE fix SHALL declare a minimal local interface covering the fields accessed (`network: string | null | undefined`) and annotate `changes` with that interface.
4. THE fix SHALL NOT change the runtime behaviour of the network watcher callback.
5. WHEN `npx tsc --noEmit` is run after the fix, THE compiler SHALL exit with code 0 and produce no errors or warnings related to implicit `any`.

---

### Requirement 2: Verify no other implicit `any` errors exist

**User Story:** As a developer, I want a clean type-check run across the entire frontend, so that I can trust the TypeScript output.

#### Acceptance Criteria

1. AFTER applying the fix, running `npx tsc --noEmit` SHALL produce zero errors across all files in the `frontend/` directory.
2. IF additional implicit `any` errors are discovered during the fix, THEN THE fix SHALL resolve them in the same PR.
3. THE fix SHALL NOT introduce `@ts-ignore` or `@ts-expect-error` suppressions as a workaround.
4. THE fix SHALL NOT downgrade `strict` mode or add `noImplicitAny: false` to `tsconfig.json`.
