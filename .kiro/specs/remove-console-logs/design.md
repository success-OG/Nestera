# Design Document: Remove Console.log Statements (#796)

## Overview

Audit all `.ts`/`.tsx` files under `frontend/app/` for `console.log` calls, remove them, verify TODO handlers are clearly annotated, and add an ESLint `no-console` rule to prevent regressions.

---

## Audit Results

Based on the issue description and code review:

| File | Line(s) | Finding | Action |
|---|---|---|---|
| `frontend/app/components/Newsletter.tsx` | — | No `console.log` present; handleSubmit has a TODO comment | Verify; no change needed |
| `frontend/app/savings/page.tsx` | 209–211 | `onAddFunds` callback: `// TODO: Implement add funds functionality` | Already a TODO — leave as-is |
| `frontend/app/savings/page.tsx` | 299–301 | `onViewDetails` callback: `// TODO: Implement view details functionality` | Already a TODO — leave as-is |
| `frontend/app/dashboard/transactions/page.tsx` | 205 | `onClick` handler: `// TODO: Implement transaction details modal` | Already a TODO — leave as-is |
| `frontend/app/components/dashboard/SavingsPoolCard.example.tsx` | 77 | `handleDeposit`: `// TODO: Implement deposit logic` | Example file — add clarifying comment |
| `frontend/app/context/WalletContext.tsx` | multiple | `console.error(...)` in catch blocks | Legitimate — do NOT remove |

The primary action is the ESLint rule addition and a full grep audit to catch any `console.log` calls not listed in the issue.

---

## ESLint Configuration Change

The project uses `frontend/eslint.config.mjs`. Add the `no-console` rule:

```js
// eslint.config.mjs (relevant addition)
{
  rules: {
    "no-console": ["error", { allow: ["error", "warn"] }],
  }
}
```

This:
- Errors on `console.log`, `console.info`, `console.debug`, `console.table`, etc.
- Allows `console.error` and `console.warn` (used legitimately in catch blocks).
- Applies to all files matched by the existing config.

---

## SavingsPoolCard.example.tsx

This file is documentation/example code. If it contains a `console.log` inside `handleDeposit`, add a comment clarifying it is example-only:

```typescript
// NOTE: This is an example file for documentation purposes only.
// console.log calls here are intentional for demonstration.
const handleDeposit = (poolId: string) => {
  // TODO: Implement deposit logic
};
```

If no `console.log` is present (only a TODO comment), no change is needed beyond verifying.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/eslint.config.mjs` | Add `no-console` rule |
| `frontend/app/components/dashboard/SavingsPoolCard.example.tsx` | Add example-only clarification comment if needed |
| Any file with `console.log` found during audit | Remove the call |

---

## Correctness Properties

### Property 1: No console.log in production files after fix
`grep -r "console\.log" frontend/app/` returns no results outside `.example.tsx` files.

### Property 2: Lint passes after fix
`npm run lint` exits with code 0 after the ESLint rule is added and all `console.log` calls are removed.

### Property 3: console.error calls are preserved
All `console.error(...)` calls in `WalletContext.tsx` and other files remain untouched.

### Property 4: Runtime behaviour unchanged
Removing `console.log` calls has no effect on application logic.
