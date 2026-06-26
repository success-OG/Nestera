# Design Document: Add Unit Tests for Core Components (#795)

## Overview

Set up Jest + React Testing Library from scratch in the Next.js frontend, then write unit tests for `ThemeToggle`, `ToastContext`, and `WalletContext`. Target ≥70% coverage on each tested file.

---

## Test Infrastructure Setup

### Packages to install (devDependencies)

```bash
npm install --save-dev \
  jest \
  jest-environment-jsdom \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  ts-jest \
  @types/jest \
  identity-obj-proxy
```

`ts-jest` handles TypeScript compilation inside Jest without a separate Babel config. `identity-obj-proxy` mocks CSS modules.

### `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.ts',
  },
  collectCoverageFrom: [
    'app/components/ThemeToggle.tsx',
    'app/context/ToastContext.tsx',
    'app/context/WalletContext.tsx',
  ],
  coverageThreshold: {
    global: { lines: 70 },
  },
};

export default config;
```

### `jest.setup.ts`

```typescript
import '@testing-library/jest-dom';
```

### `__mocks__/fileMock.ts`

```typescript
export default 'test-file-stub';
```

### `package.json` scripts addition

```json
"test": "jest",
"test:coverage": "jest --coverage"
```

---

## ThemeToggle Tests

**File:** `frontend/app/components/__tests__/ThemeToggle.test.tsx`

Wrap with a `ThemeProvider` (real) or mock `ThemeContext`. Using the real `ThemeProvider` is simpler and more realistic.

Key mocks needed:
- `window.localStorage` — use `jest.spyOn` or `Object.defineProperty`
- `window.matchMedia` — must be mocked before `ThemeProvider` renders

```typescript
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});
```

Test cases:
1. Renders toggle button with aria-label containing current theme name
2. Click button → dropdown opens (role="menu" visible)
3. Click button again → dropdown closes
4. Escape key → dropdown closes
5. Click outside → dropdown closes
6. Click "Dark" option → `setTheme("dark")` called, dropdown closes
7. Active option shows `<Check>` icon (aria-checked="true")
8. `compact` prop → labels not rendered

---

## ToastContext Tests

**File:** `frontend/app/context/__tests__/ToastContext.test.tsx`

Use `jest.useFakeTimers()` to control auto-dismiss.

Helper: render a consumer component that calls toast methods via buttons.

```typescript
function ToastConsumer() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Done', 'It worked')}>success</button>
      <button onClick={() => toast.error('Oops', 'Something failed')}>error</button>
      <button onClick={() => toast.info('FYI')}>info</button>
      <button onClick={() => toast.warning('Watch out')}>warning</button>
    </>
  );
}
```

Test cases:
1. `success()` → toast with title "Done" appears, has success styling class
2. `error()` → toast with title "Oops" appears, has error styling class
3. `info()` → toast with title "FYI" appears
4. `warning()` → toast with title "Watch out" appears
5. Dismiss button click → toast removed from DOM
6. After `duration` ms (advance fake timers) → toast auto-removed

---

## WalletContext Tests

**File:** `frontend/app/context/__tests__/WalletContext.test.tsx`

Mock all external dependencies at the module level:

```typescript
jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn(),
  getAddress: jest.fn(),
  getNetwork: jest.fn(),
  requestAccess: jest.fn(),
  WatchWalletChanges: jest.fn().mockImplementation(() => ({
    watch: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
    })),
  },
}));
```

Also mock `fetch` for the CoinGecko price call:
```typescript
global.fetch = jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({}),
});
```

Helper: render a consumer that exposes wallet state and action buttons.

Test cases:
1. `connect()` → calls `requestAccess`, updates address in state
2. `connect()` with error result → sets `error` state, `isConnected` remains false
3. `disconnect()` → clears address, balances, resets to defaults
4. `fetchBalances()` → calls `loadAccount`, updates `balances` state
5. `fetchBalances()` when `loadAccount` throws → sets `balanceError`
6. On mount with existing connection → restores session from `isConnected`/`getAddress`

---

## Files Changed

| File | Change |
|---|---|
| `frontend/package.json` | Add test scripts and devDependencies |
| `frontend/jest.config.ts` | New |
| `frontend/jest.setup.ts` | New |
| `frontend/__mocks__/fileMock.ts` | New |
| `frontend/app/components/__tests__/ThemeToggle.test.tsx` | New |
| `frontend/app/context/__tests__/ToastContext.test.tsx` | New |
| `frontend/app/context/__tests__/WalletContext.test.tsx` | New |

---

## Correctness Properties

### Property 1: npm test passes
`npm test` exits with code 0 with all test suites passing.

### Property 2: Coverage ≥70% on all three files
`npm run test:coverage` shows ≥70% line coverage for `ThemeToggle.tsx`, `ToastContext.tsx`, and `WalletContext.tsx`.

### Property 3: No real network calls in tests
All `fetch`, `Horizon.Server`, and Freighter API calls are mocked — tests run offline.

### Property 4: Fake timers control auto-dismiss
Toast auto-dismiss tests use `jest.useFakeTimers()` and `jest.advanceTimersByTime()` — no real waiting.
