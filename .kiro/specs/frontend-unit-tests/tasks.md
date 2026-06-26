# Implementation Plan: Add Unit Tests for Core Components (#795)

## Tasks

- [ ] 1. Install test dependencies
  - Run from `frontend/`:
    ```
    npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom ts-jest @types/jest identity-obj-proxy
    ```
  - _Requirements: 1.1_

- [ ] 2. Create Jest configuration
  - Create `frontend/jest.config.ts` with `testEnvironment: "jsdom"`, `ts-jest` transform, `@/*` path alias mapping, CSS module proxy, and coverage collection for the three target files
  - Create `frontend/jest.setup.ts` importing `@testing-library/jest-dom`
  - Create `frontend/__mocks__/fileMock.ts` exporting `'test-file-stub'`
  - _Requirements: 1.2, 1.3_

- [ ] 3. Add test scripts to `package.json`
  - Add `"test": "jest"` and `"test:coverage": "jest --coverage"` to `frontend/package.json` scripts
  - _Requirements: 1.4_

- [ ] 4. Verify Jest setup with empty run
  - Run `npm test` — confirm Jest starts and exits cleanly (no test files yet is fine)
  - _Requirements: 1.5_

- [ ] 5. Write `ThemeToggle` tests
  - Create `frontend/app/components/__tests__/ThemeToggle.test.tsx`
  - Mock `window.matchMedia` in `beforeAll`
  - Wrap renders with `ThemeProvider`
  - Write tests: renders button, opens dropdown on click, closes on Escape, closes on outside click, calls setTheme on option click, shows checkmark on active option, compact prop hides labels
  - _Requirements: 2.1–2.9_

- [ ] 6. Write `ToastContext` tests
  - Create `frontend/app/context/__tests__/ToastContext.test.tsx`
  - Use `jest.useFakeTimers()` in `beforeEach`
  - Write a `ToastConsumer` helper component
  - Write tests: success/error/info/warning toasts render, dismiss button removes toast, auto-dismiss after duration
  - _Requirements: 3.1–3.9_

- [ ] 7. Write `WalletContext` tests
  - Create `frontend/app/context/__tests__/WalletContext.test.tsx`
  - Mock `@stellar/freighter-api` and `@stellar/stellar-sdk` at module level with `jest.mock`
  - Mock `global.fetch` for CoinGecko price calls
  - Write a `WalletConsumer` helper component exposing state and action buttons
  - Write tests: connect success, connect error, disconnect, fetchBalances success, fetchBalances error, session restore on mount
  - _Requirements: 4.1–4.9_

- [ ] 8. Run full test suite and coverage
  - Run `npm test` — confirm all tests pass
  - Run `npm run test:coverage` — confirm ≥70% line coverage on all three files
  - Fix any failing tests or coverage gaps
  - _Requirements: 1.4, 2.9, 3.9, 4.9_
