Branch: feat/testing-frontend

Commit message (subject):
test(frontend): add Vitest + Playwright E2E, tests, CI, and docs

Commit message (body):
This PR adds frontend testing infrastructure and initial tests:

- Vitest configuration with V8 coverage and 80% thresholds
- Unit tests for utilities and custom hooks
- Component tests for key UI components
- Playwright E2E scaffold and a sample goal-creation flow
- GitHub Actions workflows for unit tests/coverage and E2E
- Testing documentation at frontend/TESTING.md and a summary

Notes:
- Coverage thresholds are enforced by Vitest; run `pnpm run test:coverage` to validate locally.
- CI will run tests on push and report/upload coverage.
