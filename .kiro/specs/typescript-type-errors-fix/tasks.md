# Implementation Plan: Fix TypeScript Type Errors (#797)

## Tasks

- [ ] 1. Inspect `@stellar/freighter-api` type declarations
  - Check `node_modules/@stellar/freighter-api/dist/index.d.ts` for an exported type describing the `WatchWalletChanges` callback parameter (e.g. `WalletChanges`, `NetworkChanges`)
  - _Requirements: 1.2_

- [ ] 2. Fix the implicit `any` on `changes` in `WalletContext.tsx`
  - If `@stellar/freighter-api` exports a suitable type, import it and annotate the parameter: `(changes: WalletChanges) =>`
  - If no exported type exists, declare a minimal local interface above the component: `interface FreighterWalletChanges { network?: string | null; }` and annotate: `(changes: FreighterWalletChanges) =>`
  - Do NOT use `any`, `@ts-ignore`, or `@ts-expect-error`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 3. Run `npx tsc --noEmit` and fix any remaining errors
  - Run `npx tsc --noEmit` from the `frontend/` directory
  - If additional errors appear, resolve them following the same no-suppression rule
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Verify lint still passes
  - Run `npm run lint` from `frontend/` and confirm no new errors
  - _Requirements: 2.1_
