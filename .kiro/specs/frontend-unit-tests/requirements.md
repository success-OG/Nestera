# Requirements Document

## Introduction

The frontend has no test infrastructure or test files. This feature sets up Jest and React Testing Library, then adds unit tests for three core components: `ThemeToggle`, `WalletContext`, and `ToastContext`. The goal is ≥70% code coverage on the tested components and a passing `npm test` command.

## Glossary

- **Jest**: The JavaScript test runner used for unit and integration tests.
- **React Testing Library (RTL)**: A testing utility that renders React components and queries the DOM in a user-centric way.
- **jest-environment-jsdom**: A Jest environment that simulates a browser DOM for component tests.
- **@testing-library/user-event**: A companion library for RTL that simulates realistic user interactions (clicks, keyboard events).
- **ThemeToggle**: `frontend/app/components/ThemeToggle.tsx` — a dropdown component for selecting light/dark/system theme.
- **WalletContext**: `frontend/app/context/WalletContext.tsx` — manages Stellar wallet connection, balance fetching, and network watching.
- **ToastContext**: `frontend/app/context/ToastContext.tsx` — provides a toast notification system with auto-dismiss.
- **ThemeContext**: `frontend/app/context/ThemeContext.tsx` — provides theme state; used by ThemeToggle.

---

## Requirements

### Requirement 1: Configure Jest and React Testing Library

**User Story:** As a developer, I want a working test setup, so that I can run `npm test` and get results.

#### Acceptance Criteria

1. THE setup SHALL install the following packages as devDependencies: `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `babel-jest` (or `ts-jest`), and any required Babel/TypeScript presets.
2. A `jest.config.js` (or `jest.config.ts`) SHALL be created at `frontend/` with `testEnvironment: "jsdom"`, TypeScript support, and module name mapping for CSS/static assets.
3. A `jest.setup.ts` file SHALL be created that imports `@testing-library/jest-dom` to extend Jest matchers.
4. THE `package.json` `scripts` SHALL include a `"test"` script that runs `jest` and a `"test:coverage"` script that runs `jest --coverage`.
5. WHEN `npm test` is run with no test files present, Jest SHALL exit without error (zero test suites found is acceptable during setup).

---

### Requirement 2: Tests for `ThemeToggle` component

**User Story:** As a developer, I want tests for ThemeToggle, so that theme-switching regressions are caught automatically.

#### Acceptance Criteria

1. A test file `frontend/app/components/__tests__/ThemeToggle.test.tsx` SHALL be created.
2. THE test file SHALL include a test that verifies the toggle button renders with the correct aria-label for the current theme.
3. THE test file SHALL include a test that verifies clicking the toggle button opens the dropdown menu.
4. THE test file SHALL include a test that verifies pressing the Escape key closes an open dropdown.
5. THE test file SHALL include a test that verifies clicking outside the dropdown closes it.
6. THE test file SHALL include a test that verifies clicking a theme option calls `setTheme` with the correct value and closes the dropdown.
7. THE test file SHALL include a test that verifies the active theme option displays a checkmark.
8. THE test file SHALL mock `ThemeContext` (or wrap with `ThemeProvider`) to control the current theme state.
9. CODE coverage for `ThemeToggle.tsx` SHALL be ≥70% when running `npm run test:coverage`.

---

### Requirement 3: Tests for `ToastContext`

**User Story:** As a developer, I want tests for ToastContext, so that notification regressions are caught automatically.

#### Acceptance Criteria

1. A test file `frontend/app/context/__tests__/ToastContext.test.tsx` SHALL be created.
2. THE test file SHALL include a test that verifies `success()` renders a toast with the correct title and success styling.
3. THE test file SHALL include a test that verifies `error()` renders a toast with the correct title and error styling.
4. THE test file SHALL include a test that verifies `info()` renders a toast with the correct title and info styling.
5. THE test file SHALL include a test that verifies `warning()` renders a toast with the correct title and warning styling.
6. THE test file SHALL include a test that verifies the dismiss button removes the toast from the DOM.
7. THE test file SHALL include a test that verifies a toast is automatically removed after its duration using Jest fake timers.
8. THE test file SHALL use `jest.useFakeTimers()` to control `window.setTimeout` behaviour.
9. CODE coverage for `ToastContext.tsx` SHALL be ≥70% when running `npm run test:coverage`.

---

### Requirement 4: Tests for `WalletContext`

**User Story:** As a developer, I want tests for WalletContext, so that wallet connection regressions are caught automatically.

#### Acceptance Criteria

1. A test file `frontend/app/context/__tests__/WalletContext.test.tsx` SHALL be created.
2. THE test file SHALL mock `@stellar/freighter-api` (`isConnected`, `getAddress`, `getNetwork`, `requestAccess`, `WatchWalletChanges`) using `jest.mock`.
3. THE test file SHALL mock `@stellar/stellar-sdk` (`Horizon.Server`) to avoid real network calls.
4. THE test file SHALL include a test that verifies `connect()` calls `requestAccess` and updates the wallet address in state.
5. THE test file SHALL include a test that verifies `connect()` sets an error state when `requestAccess` returns an error.
6. THE test file SHALL include a test that verifies `disconnect()` clears the address, balances, and resets state to defaults.
7. THE test file SHALL include a test that verifies `fetchBalances()` calls `Horizon.Server.loadAccount` and updates the balances state.
8. THE test file SHALL include a test that verifies `fetchBalances()` sets `balanceError` when the Horizon call throws.
9. CODE coverage for `WalletContext.tsx` SHALL be ≥70% when running `npm run test:coverage`.
