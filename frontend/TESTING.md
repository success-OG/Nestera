Frontend Testing Guide
======================

Overview
--------
This project uses Vitest + Testing Library for unit and integration tests in the `frontend` package.

Where tests live
- Unit tests: alongside implementation under `app/**` as `*.spec.ts` / `*.test.ts` (e.g. `app/lib/utils.spec.ts`).
- Integration tests: put under `app/**` or `test/**` and name with `.spec.ts`.

Running tests locally

Install deps (pnpm):

```powershell
cd frontend
pnpm install
```

Run tests:

```powershell
pnpm run test        # start Vitest in watch mode
pnpm run test:unit   # run unit tests
pnpm run test:coverage # run tests and generate coverage
```

CI

A GitHub Actions workflow `.github/workflows/frontend-ci.yml` runs the frontend tests and uploads coverage to Codecov.

Testing notes
- Use `msw` for HTTP mocking for integration tests that call the backend.
- Mock internal utilities (e.g. `useWebSocket`) using `vi.mock()` for focused unit tests.
- Keep tests deterministic: use `vi.useFakeTimers()` when testing timers and cleanup via `vi.useRealTimers()`.
 - For wallet-related tests, mock the browser wallet (Freighter) by setting `(window as any).freighter` with the minimal methods used by `WalletContext` (`isConnected`, `getAddress`, `getNetwork`, `requestAccess`).
