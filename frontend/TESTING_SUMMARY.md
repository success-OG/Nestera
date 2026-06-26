Testing Summary — Frontend
==========================

Status (snapshot):

- **Unit tests for utility functions:** Done — [frontend/app/lib/utils.spec.ts](frontend/app/lib/utils.spec.ts#L1)
- **Tests for custom hooks:** Done — [frontend/app/hooks/useWebSocket.spec.ts](frontend/app/hooks/useWebSocket.spec.ts#L1), [frontend/app/hooks/useWalletWebSocket.spec.ts](frontend/app/hooks/useWalletWebSocket.spec.ts#L1), [frontend/app/hooks/useWalletCache.spec.ts](frontend/app/hooks/useWalletCache.spec.ts#L1)
- **Component tests for UI components:** Done — [frontend/app/savings/components/GoalCard.spec.tsx](frontend/app/savings/components/GoalCard.spec.tsx#L1), [frontend/app/savings/create-goal/components/CreateGoalForm.spec.tsx](frontend/app/savings/create-goal/components/CreateGoalForm.spec.tsx#L1)
- **Integration tests for user flows (E2E):** Partially — Playwright E2E scaffold and sample `goal-creation.spec.ts` at [frontend/test/e2e/goal-creation.spec.ts](frontend/test/e2e/goal-creation.spec.ts#L1)
- **Test coverage reporting configured:** Done — `vitest` config at [frontend/vitest.config.ts](frontend/vitest.config.ts#L1) (V8 provider, `lcov` + `text`, thresholds set to 80%)
- **Tests in CI/CD:** Done — workflows at [.github/workflows/frontend-ci.yml](.github/workflows/frontend-ci.yml#L1) and [.github/workflows/frontend-e2e.yml](.github/workflows/frontend-e2e.yml#L1)
- **Coverage >= 80%:** Pending verification — thresholds enforce 80% but coverage has not been executed locally; CI will validate on push.
- **Documentation:** Done — [frontend/TESTING.md](frontend/TESTING.md#L1)

Notes / Next actions before committing
- Run tests and coverage locally or rely on CI to validate coverage thresholds.
- Optionally add MSW handlers for broader integration tests (recommended) before enforcing coverage.

Commands to run locally (copy into a PowerShell terminal):

```powershell
cd frontend
pnpm install
pnpm run test:coverage
# Install Playwright browsers (for E2E)
npx playwright install --with-deps
pnpm run test:e2e
```

Suggested git flow to commit and open a PR:

```powershell
git checkout -b feat/testing-frontend
git add frontend/vitest.config.ts frontend/package.json frontend/test frontend/playwright.config.ts frontend/TESTING.md .github/workflows/frontend-ci.yml .github/workflows/frontend-e2e.yml
git commit -m "test(frontend): add Vitest + Playwright E2E, tests, CI, and docs"
git push -u origin feat/testing-frontend
# (optional) Create PR with GitHub CLI:
# gh pr create --title "test(frontend): add test infra + tests" --body "Adds Vitest, Playwright E2E tests, CI workflows, and testing docs."
```

If you'd like, I can also:
- add MSW handler scaffolding and Vitest-based integration tests;
- run a local test pass here (requires permission to install dependencies);
- open the PR using `gh` if you grant token/CLI access.
