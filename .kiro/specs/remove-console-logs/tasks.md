# Implementation Plan: Remove Console.log Statements (#796)

## Tasks

- [ ] 1. Audit all production files for `console.log`
  - Run `grep -rn "console\.log" frontend/app/` and record every match
  - Exclude `.example.tsx` files from the removal list
  - _Requirements: 1.1_

- [ ] 2. Remove all `console.log` calls found in production files
  - For each match outside `.example.tsx`, delete the `console.log(...)` line
  - Do NOT remove `console.error` or `console.warn` calls
  - _Requirements: 1.2, 1.3_

- [ ] 3. Handle `SavingsPoolCard.example.tsx`
  - Open `frontend/app/components/dashboard/SavingsPoolCard.example.tsx`
  - If a `console.log` is present inside `handleDeposit`, add a comment: `// NOTE: This is an example file — console calls are intentional for demonstration`
  - If only a TODO comment is present, leave it unchanged
  - _Requirements: 1.4_

- [ ] 4. Verify TODO handlers in savings and transactions pages
  - Confirm `onAddFunds`, `onViewDetails` in `frontend/app/savings/page.tsx` have descriptive `// TODO:` comments
  - Confirm `onClick` in `frontend/app/dashboard/transactions/page.tsx` has a descriptive `// TODO:` comment
  - Add or improve comments where missing
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 5. Add `no-console` ESLint rule
  - Open `frontend/eslint.config.mjs`
  - Add `"no-console": ["error", { allow: ["error", "warn"] }]` to the rules object
  - _Requirements: 3.1_

- [ ] 6. Verify lint passes
  - Run `npm run lint` from `frontend/` and confirm it exits with code 0
  - _Requirements: 3.2, 3.3_

- [ ] 7. Final audit
  - Re-run `grep -rn "console\.log" frontend/app/` and confirm zero results outside `.example.tsx`
  - _Requirements: 1.5_
