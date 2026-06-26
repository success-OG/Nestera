# Requirements Document

## Introduction

Several production source files contain `console.log` statements or empty event handlers that were left as placeholders during development. This fix audits and cleans up all such occurrences, and optionally adds an ESLint rule to prevent future regressions.

## Glossary

- **console.log**: JavaScript's built-in logging function. Calls to it in production code expose internal state to end-users via browser DevTools and can leak sensitive data.
- **console.error / console.warn**: Legitimate error-reporting calls used in catch blocks — these are NOT in scope for removal.
- **TODO handler**: An event handler whose body contains only a comment (e.g. `// TODO: Implement ...`) with no functional code.
- **ESLint no-console rule**: An ESLint rule that flags or errors on `console.*` calls, configurable to allow `console.error` and `console.warn`.

---

## Requirements

### Requirement 1: Remove all `console.log` calls from production source files

**User Story:** As a developer, I want no `console.log` calls in production code, so that internal state is not exposed to end-users in the browser console.

#### Acceptance Criteria

1. THE fix SHALL audit all `.ts` and `.tsx` files under `frontend/app/` for `console.log` calls.
2. FOR EACH `console.log` found in a non-example production file, THE fix SHALL remove the call entirely.
3. THE fix SHALL NOT remove `console.error` or `console.warn` calls, as these serve legitimate error-reporting purposes.
4. THE fix SHALL NOT modify `frontend/app/components/dashboard/SavingsPoolCard.example.tsx` if its only `console.*` usage is inside a clearly-marked example/documentation context — a comment clarifying its example-only nature SHALL be added if not already present.
5. AFTER the fix, running `grep -r "console\.log" frontend/app/` SHALL return no results outside of `.example.tsx` files.

---

### Requirement 2: Ensure TODO event handlers are clearly marked

**User Story:** As a developer, I want placeholder event handlers to be clearly marked as unimplemented, so that reviewers and future contributors know what work remains.

#### Acceptance Criteria

1. THE fix SHALL verify that each empty event handler in the following files contains a `// TODO:` comment describing the intended functionality:
   - `frontend/app/savings/page.tsx` — `onAddFunds` and `onViewDetails` callbacks
   - `frontend/app/dashboard/transactions/page.tsx` — `onClick` handler on transaction rows
2. IF a TODO comment is already present and descriptive, THE fix SHALL leave it unchanged.
3. IF a handler is completely empty (no comment), THE fix SHALL add a `// TODO:` comment.
4. THE fix SHALL NOT implement the actual functionality of these handlers — that is tracked in separate issues.

---

### Requirement 3: Add ESLint rule to prevent future `console.log` additions

**User Story:** As a developer, I want the linter to catch `console.log` calls automatically, so that they cannot be accidentally committed in future PRs.

#### Acceptance Criteria

1. THE fix SHALL add a `no-console` ESLint rule to `frontend/eslint.config.mjs` (or equivalent config file) configured to `"error"` for `console.log` and `"off"` for `console.error` and `console.warn`.
2. AFTER adding the rule, running `npm run lint` SHALL pass without errors on the cleaned codebase.
3. THE rule SHALL apply to all `.ts` and `.tsx` files under `frontend/`.
