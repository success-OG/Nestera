# Design Document: Fix TypeScript Type Errors (#797)

## Overview

A single implicit `any` error in `WalletContext.tsx` prevents `npx tsc --noEmit` from passing. The fix is minimal: add an explicit type annotation to the `changes` parameter in the `WatchWalletChanges` callback. No runtime behaviour changes.

---

## Root Cause

`WatchWalletChanges` from `@stellar/freighter-api` v3 exposes a `.watch(callback)` method. TypeScript cannot infer the callback parameter type because the package's type declarations either don't ship a named export for the callback shape or the inference path is broken under `strict: true`. The result is:

```
WalletContext.tsx:205 - error TS7006: Parameter 'changes' implicitly has an 'any' type.
```

---

## Fix Strategy

### Step 1 — Check `@stellar/freighter-api` exported types

Inspect `node_modules/@stellar/freighter-api/dist/index.d.ts` (or equivalent) for an exported type describing the callback argument. Common candidates: `WalletChanges`, `NetworkChanges`, `FreighterChanges`.

**If an exported type exists**, use it directly:

```typescript
import {
  WatchWalletChanges,
  type WalletChanges,   // ← import the type
} from "@stellar/freighter-api";

// ...
networkWatcher.current.watch((changes: WalletChanges) => {
  if (changes.network && changes.network !== state.network) {
    setState((prevState) => ({ ...prevState, network: changes.network }));
  }
});
```

**If no suitable exported type exists**, declare a minimal local interface in `WalletContext.tsx`:

```typescript
interface FreighterWalletChanges {
  address?: string | null;
  network?: string | null;
}

// ...
networkWatcher.current.watch((changes: FreighterWalletChanges) => {
  if (changes.network && changes.network !== state.network) {
    setState((prevState) => ({ ...prevState, network: changes.network }));
  }
});
```

The interface only needs to cover the fields actually accessed in the callback body (`network`). Additional fields can be added as `[key: string]: unknown` if needed.

### Step 2 — Verify no other errors

Run `npx tsc --noEmit` after the fix and resolve any remaining errors found. Common candidates:
- `@stellar/stellar-sdk` v15 ships its own `.d.ts` files — no `@types/stellar-sdk` needed.
- `@stellar/freighter-api` v3 ships its own `.d.ts` files — no separate `@types` package needed.
- If `skipLibCheck: true` is set (it is), errors inside `node_modules` are suppressed.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/app/context/WalletContext.tsx` | Add type annotation to `changes` parameter (line ~205) |
| `frontend/app/context/WalletContext.tsx` | Optionally add local `FreighterWalletChanges` interface if no exported type exists |

No other files need to change for this fix.

---

## Correctness Properties

### Property 1: Type-check passes after fix
After applying the fix, `npx tsc --noEmit` exits with code 0 and produces no errors.

### Property 2: Runtime behaviour is unchanged
The callback body is identical before and after the fix — only the parameter annotation changes. The `changes.network` access and `setState` call are unmodified.

### Property 3: No suppressions introduced
The fix uses no `@ts-ignore`, `@ts-expect-error`, or `any` casts.
