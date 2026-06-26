# Nestera — Full Repository Overview

This document explains the structure of the **Nestera** monorepo and what each major directory/file contributes. It is intended to be a single “source of truth” README for new contributors.

---

## 1) High-level project summary

**Nestera** is a decentralized savings and investment protocol built on **Stellar using Soroban smart contracts**. It enables:

- Non-custodial savings enforced on-chain
- Flexible and locked savings with deterministic interest logic
- Goal-based and group savings mechanisms
- A web interface (frontend) and an API layer (backend) for off-chain services

Main components:

- **`contracts/`**: Soroban smart contracts (Rust)
- **`backend/`**: NestJS API for indexing, orchestration, metadata/analytics, and other off-chain responsibilities
- **`frontend/`**: Next.js web app for interacting with the protocol
- **`scripts/`**: automation helpers for cleanup/testing/rollbacks

---

## 2) Monorepo layout (top level)

```text
/
├── frontend/               # Next.js application
├── backend/                # NestJS backend API
├── contracts/              # Soroban smart contracts (Rust)
├── scripts/                # Automation scripts (deploy/test helpers)
├── src/                    # Repo-level TS modules (additional code, if used)
└── README.md               # Primary project README (short)
```

### Key top-level files

- **`package.json` / `pnpm-workspace.yaml` / `pnpm-lock.yaml`**
  - Defines a pnpm workspace so `frontend/`, `backend/`, and `contracts/` can be coordinated.
- **`Cargo.toml` / `Cargo.lock`**
  - Rust workspace metadata for `contracts/` (Soroban code compilation/test).
- **`eslint.config.js`**
  - Root lint configuration.
- **`CONTRIBUTING.md`**
  - Contribution process and code ownership expectations.
- **`OBSERVABILITY.md`**
  - Correlation ID / audit log runbook (end-to-end tracing patterns).

Project status/progress artifacts (examples):

- `DEVELOPMENT_PROGRESS.md`, `README_PROGRESS.md`, `REPO_STATUS.md`, `FINAL_STATUS.md`
- operational docs: `DISASTER_RECOVERY_RUNBOOK.md`, `REPO_FIX_PLAN.md`
- CI/performance docs: `CI_CD_TEST_REPORT.md`, `CLONE_SPEED_FIX.md`, `QUICK_FIX_CLONE_SPEED.md`

---

## 3) Workspace orchestration

### pnpm workspace

Root **`pnpm-workspace.yaml`** includes:

- `backend`
- `frontend`
- `contracts`

### Rust workspace

Root **`Cargo.toml`** and `contracts/` define compilation/testing for Soroban smart contracts.

---

## 4) `contracts/` — Soroban smart contracts (Rust)

### Purpose

Implements the protocol logic on-chain: savings behavior, constraints, custody rules, and withdrawal rules.

### Structure

```text
contracts/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── token.rs, treasury/*, staking/*, strategy/*, rewards/* (modules)
│   ├── governance.rs, group.rs, goal.rs, lock.rs (core domain)
│   ├── security.rs, errors.rs, invariants.rs, storage_types.rs
│   └── *_tests.rs (module-specific test code)
└── tests/
    ├── integration.rs
    ├── *_test.rs (multi-contract behavior tests)
    └── rewards/ strategy/ treasury integration tests
```

### Off-chain Oracle architecture

`contracts/README.md` describes an **Off-Chain Oracle** pattern:

- An **Admin** signs a payload off-chain (Ed25519).
- Users submit payload + signature to the contract.
- The contract verifies the signature and enforces timestamp/expiry.

---

## 5) `backend/` — NestJS API (TypeScript)

### Purpose

Provides the off-chain service layer. Responsibilities include:

- Indexing/monitoring contract events
- API endpoints for the frontend
- User metadata management and analytics aggregation
- Security hardening (Helmet/CORS, throttling, RBAC)

### Observed backend source structure

```text
backend/src/
├── app.controller.ts / app.module.ts / app.service.ts / main.ts
├── auth/                      # authentication, guards/RBAC-related code
├── common/                    # shared utilities and filters/interceptors
├── config/                    # configuration loading
├── migrations/               # database migrations
├── modules/                  # domain-specific feature modules
├── test-rbac/                # RBAC tests
└── test-throttling/         # throttling tests
```

### Security documentation

- `backend/src/Secure API Headers with Helmet & CORS/README.md`

### Tests

- `backend/test/*.e2e-spec.ts` contains E2E coverage (health, throttling, webhooks, disputes, etc.).

---

## 6) `frontend/` — Next.js application (TypeScript/React)

### Purpose

The UI used to interact with Nestera: create savings accounts, deposit funds, and track progress.

### Structure

```text
frontend/app/
├── layout.tsx, page.tsx, loading.tsx, globals.css
├── components/
├── context/
├── dashboard/
├── docs/
├── features/
├── goals/, savings/
├── proposals/, community/
├── privacy/, terms/, support/
```

---

## 7) `scripts/` — automation helpers

Contains repository automation utilities such as cleanup and test/rollback helpers.

Examples:

- `scripts/cleanup-repo.sh`
- `backend/scripts/check-migrations-down.js`
- `backend/scripts/test-rollback.sh`

---

## 8) Repo-level `src/` (additional TS modules)

At the root there is a `src/` directory. The listing shows `src/modules/`. This may contain additional modules used by tooling or shared logic.

---

## 9) Cross-cutting concerns

### Observability (correlation IDs)

`OBSERVABILITY.md` documents:

- `X-Correlation-ID` UUID per API request
- propagation through HTTP, DB audit logs, background jobs, and contract event metadata

It includes SQL patterns and debugging procedures.

---

## 10) Contribution model & governance

`CONTRIBUTING.md` specifies:

- workflow (branch naming, PR steps)
- testing expectations
- code ownership / required review paths for security/critical modules

---

## 11) What to read first (quick path)

1. `README.md` (product summary + architecture)
2. `contracts/README.md` (off-chain oracle / authorization)
3. `backend/src/Secure API Headers with Helmet & CORS/README.md`
4. `OBSERVABILITY.md` (incident tracing)
5. `CONTRIBUTING.md` (workflow + ownership)

---

## Appendix — Terminology

- **Off-Chain Oracle**: Off-chain admin signature authorizing on-chain actions.
- **Correlation ID**: Request-scoped UUID used for end-to-end tracing.

---

EOF

