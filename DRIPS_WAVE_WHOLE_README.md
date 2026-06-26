# Drips Wave: The Whole Journey (Nestera) — End-to-End Explanation

> This document intentionally blends two perspectives:
> 1) **“Drips Wave”** as an initiative that funded/encouraged this work, and
> 2) **the entire development wave/iteration** captured across the repository’s progress reports, fix plans, architecture docs, and final validation reports.
>
> The goal is to provide a single, coherent, “start-to-finish” narrative for anyone joining midstream: designers, engineers, auditors, contributors, and operators.

---

## 1. Why “Drips Wave” matters for Nestera

In open-source and decentralized finance projects, progress rarely happens as a single linear sequence. Instead, it comes in **waves**—bursts of engineering, review, testing, and documentation that move the project from “it compiles” to “it is safe, maintainable, and usable.” In acknowledgments across the repository, the work is associated with **Drips Wave**—a grants/support initiative that, in practice, represents the kind of structured encouragement needed to push through the unglamorous parts of a production build: security hardening, test stabilization, CI/CD checks, and documentation that matches reality.

For Nestera, “Drips Wave” is not just a credit line. It is effectively the **operational context** for what was delivered:

- The project matured from conceptual architecture into a system that has clear module boundaries.
- The backend gained defensive security controls (nonce-based replay prevention and rate limiting).
- The contracts established a unified on-chain savings mechanism (single Soroban contract architecture) with governance, rewards, staking, treasury, and an external yield strategy interface.
- The repository accumulated documentation artifacts that do not merely describe features, but explain the reasoning and “how it works” at multiple layers.
- A “final status” report asserted operational readiness based on automated test results.

This document explains the wave end-to-end: **what was built, how it fits together, why design decisions were made, what was fixed, what still needed migration, and what “done” means in this repository**.

---

## 2. What “the whole wave” includes in this repository

When the repository is described as “fully operational” and yet still lists pending technical migrations (for example, converting deprecated contract event publishing), it can feel contradictory to newcomers.

The wave captured by the repo’s documentation is best understood as three overlapping tracks:

### Track A — System design (architecture, module responsibilities, boundaries)
This is represented in:
- `contracts/ARCHITECTURE.md`
- root-level documentation (`README.md` and progress/final reports)
- smart-contract documentation (`contracts/*`)

### Track B — Security, correctness, and operational reliability
This is represented in:
- backend security documentation: `backend/AUTH_RATE_LIMITING_IMPLEMENTATION.md`, `backend/NONCE_SECURITY_IMPLEMENTATION.md`
- reliability progress summaries: `DEVELOPMENT_PROGRESS.md`
- end-to-end “it passes tests” claims: `FINAL_STATUS.md`

### Track C — Production hygiene and repository accuracy
This is represented in:
- `REPO_FIX_PLAN.md` (path corrections, removing deprecated dependencies)
- `TODO.md` and other TODO docs (what remains for migration and cleanup)
- `FIXES_COMPLETED.md` and CI/CD reports

The important point: “whole wave” does not mean “everything is perfect forever.” It means the wave reached a point where the system can be run confidently with clear next steps.

---

## 3. High-level architecture of Nestera (how the wave is organized)

Nestera is a full-stack project with three core components:

1. **Smart contracts** (Rust + Soroban) — custody and savings rules
2. **Backend** (NestJS) — indexing, security controls, user/admin services
3. **Frontend** (Next.js) — user interaction and dashboards

### 3.1 Smart contracts: one deployed contract with internal modules

A key architectural decision documented in `contracts/ARCHITECTURE.md` is that Nestera is deployed as **one Soroban smart contract binary** rather than many separately deployed contracts. Internally, the code is modularized by `*.rs` files, but externally it’s a single contract boundary.

This has concrete engineering effects:

- **Simplified authorization**: there is one admin authority and one pause flag.
- **Reduced cross-contract overhead**: internal logic does not require calls.
- **Clear separation of concerns inside the same contract**:
  - savings plan modules
  - governance
  - treasury
  - rewards
  - staking
  - strategy routing
  - shared storage and security helpers

From the wave perspective, this design choice makes it easier to validate correctness via tests and to migrate behavior consistently.

### 3.2 External boundary: Yield Strategy interface

Even though Nestera is a single contract, it still needs to integrate external yield opportunities. For that reason, the only explicit cross-contract boundary is the **Yield Strategy interface**, defined in `contracts/src/strategy/interface.rs`.

The contract performs cross-contract calls for:
- `strategy_deposit`
- `strategy_withdraw`
- `strategy_harvest`
- `strategy_balance`

This boundary is protected by:
- **reentrancy guard** (`security.rs`)
- **CEI pattern (Checks-Effects-Interactions)** in `strategy/routing.rs`

This is one of the “wave deliverables” that matters for security reviewers: it’s a deliberate boundary with explicit defensive programming.

---

## 4. Core savings products built in the wave

The repository documents four main savings plan types in the contract architecture: **Flexi**, **Lock**, **Goal**, and **Group**, plus **AutoSave**.

### 4.1 Flexi Save (flexi.rs)

Flexi Save is the simplest product:
- deposits and withdrawals are available at any time
- balances are stored per user
- protocol fees apply
- it awards rewards points on deposits

During the wave, Flexi represents “the baseline happy path.” Because it is not time-locked and not goal-bounded, it’s used as a reference for how the system records:
- balances
- fees
- TTL extensions
- rewards awards

### 4.2 Lock Save (lock.rs)

Lock Save introduces time constraints:
- funds are locked until maturity
- interest is deterministic via fixed APY (documented as 5% APY in the architecture overview)
- early withdrawal is not allowed in normal flows

This is crucial in a savings protocol wave: **time-based logic is one of the easiest places to introduce edge-case bugs**. The wave’s architecture emphasizes:

- ledger timestamp gating (`ledger.timestamp() >= maturity_time`)
- TTL extension logic delegated to `ttl.rs`
- rewards bonus logic (`award_long_lock_bonus`)

### 4.3 Goal Save (goal.rs)

Goal Save is a target-based plan:
- deposits accepted until reaching a target amount
- completion triggers bonuses
- early exit can trigger an admin-configurable penalty fee

This wave includes additional “business logic complexity.” The architecture describes calls such as:
- `award_goal_completion_bonus`
- `treasury::record_fee` for deposits, withdrawals, and early-break fees

From an operational perspective, the goal save feature adds a need for:
- consistent state transitions
- deterministic reward and fee handling
- correct TTL lifecycle management

### 4.4 Group Save (group.rs)

Group Save adds collaborative pooling:
- multiple users contribute toward a target
- each member contribution is tracked individually
- members can break and leave before completion (documented as full refund with no penalty)

In a wave, group logic often becomes the place where subtle accounting issues appear. Nestera’s architecture describes explicit data keys for member contributions and TTL extensions for group access.

### 4.5 AutoSave (autosave.rs)

AutoSave is a recurring deposit scheduler. The architecture states that execution is triggered externally (relayer bot) and the contract provides execution entry points.

In other words, AutoSave turns savings into a scheduled process rather than user-driven manual deposits.

---

## 5. Rewards, ranking, and redemption in the wave

The contract architecture dedicates an entire `rewards/` module with five parts:
- `config.rs` — points rate, streak/lock/goal bonuses, anti-farming limits
- `storage.rs` — user points ledger and conversion logic
- `ranking.rs` — leaderboard and ranking queries
- `redemption.rs` — deduct points on redemption
- `events.rs` — emits reward and redemption events

A key detail emphasized by the architecture overview:

- rewards points are awarded passively during deposits and plan creation flows
- token transfer is done in the rewards module’s `claim_rewards` logic

For the wave, this matters because it connects the on-chain accounting layer with user-facing outcomes.

### 5.1 Anti-farming and fairness

The presence of “anti-farming limits” in rewards configuration suggests the wave considered adversarial behavior. Although full details reside in the Rust code, the architecture doc implies:
- limits exist for repeated exploit patterns
- bonuses are constrained/weighted

This is a typical wave stage: after a feature is functional, security/fairness gets tightened.

### 5.2 Governance power derived from lifetime deposits

In the governance section of `contracts/ARCHITECTURE.md`, voting power is derived from historical savings activity: `UserRewards.lifetime_deposited`.

This creates a linkage:
- deposit behavior
- rewards ledger
- governance influence

The wave narrative here is: Nestera ties incentives to governance rather than allowing purely arbitrary voting power.

---

## 6. Governance, treasury, and staking

### 6.1 Governance

The governance module supports:
- proposals
- voting
- queueing
- timelock execution
- cancellation

It includes two proposal categories:
- a proposal with no direct action
- an action proposal that executes a `ProposalAction` enum

`ProposalAction` includes state changes such as:
- setting savings rates
- pausing/unpausing

A governance system is expensive to get wrong. The wave’s design emphasizes that admin actions are gated by a shared `validate_admin_or_governance` path. This ensures:
- before governance activation: admin can do required operational actions
- after activation: governance proposals drive changes

### 6.2 Treasury

Treasury manages fee income and yield allocation via sub-pools:
- reserve
- rewards
- operations

The architecture defines fields and the process:
- `allocate_treasury(reserve_%, rewards_%, operations_%)`
- fee events recorded from plan deposits/withdrawals and strategy harvest events

For the wave, treasury is where “economic flows” consolidate. It is also where operational controls (caps, security config) typically matter.

### 6.3 Staking

The staking module is described as a self-contained reward-per-token accumulator design.

From a wave perspective, staking is important because it introduces another incentive surface beyond savings rewards. The design described in architecture:
- uses reward-per-token accounting
- computes pending rewards using stake amount

---

## 7. Backend wave: security and operational readiness

While the contract layer enforces savings rules, the backend is where the product becomes usable for users: authentication, indexing, analytics, and operational monitoring.

`DEVELOPMENT_PROGRESS.md` documents three major backend security improvements in Phase 1:

### 7.1 Health checks for real readiness

The backend includes custom health endpoints:
- `GET /health` — full stack readiness
- `GET /health/live` — liveness probe
- `GET /health/ready` — readiness probe

It includes indicators for:
- TypeORM (database)
- Stellar RPC connectivity
- Indexer processing and ledger synchronization

This is an operational wave requirement: without these endpoints, deployments drift into “unknown unknowns.”

### 7.2 Nonce security against replay

Nonce security prevents replay attacks in authentication.

According to the development progress summary:
- nonce generation was added
- nonce validation prevents reuse
- redis-backed storage with TTL and consume semantics is implied by the backend documentation presence

This closes a classic security hole for signature-based authentication.

### 7.3 Rate limiting and progressive delay

The wave implements progressive rate limiting for authentication flows:
- IP-based and account-based tracking
- automatic temporary bans and account lockouts
- exponential delay escalation

This is a wave stage that many teams postpone—until they receive real attack traffic. Here, it is integrated.

---

## 8. Backend wave: referrals and challenges

The wave includes a completed referral system:

`DEVELOPMENT_PROGRESS.md` states:
- referral code generation
- signup tracking
- reward distribution system
- campaign management
- fraud detection support
- analytics and admin operations
- user notifications

It also notes:
- a database migration for the referral table
- extensive creation of files and end-to-end functionality

Separately, the progress doc indicates a challenges subsystem with multiple challenge types:
- deposit streak
- goal creation
- referral challenge
- savings target
- transaction count

And lifecycle flows:
- list active challenges
- join challenges
- track progress
- retrieve user challenge summaries

Again, wave interpretation: first get core platform working and secure; then add growth mechanics (referrals) and engagement mechanics (challenges).

---

## 9. The “fix wave”: repository hygiene and correctness

A wave is not only about adding features. It is also about making the repository accurate and contributor-friendly.

`REPO_FIX_PLAN.md` captures the most important cleanup items:

### 9.1 README structure mismatch

The plan notes that earlier README paths referenced `apps/web` and `apps/api`, while the actual structure is:
- `frontend/`
- `backend/`

Correct documentation is part of production readiness. Without this fix, contributors waste time.

### 9.2 Removing deprecated stellar-sdk usage

It notes the frontend had both:
- `stellar-sdk@13.3.0`
- `@stellar/stellar-sdk@15.1.0`

The plan included removing the deprecated package and ensuring imports use the supported SDK.

### 9.3 Contract event migration to #[contractevent]

A major wave note is the pending migration of deprecated `env.events().publish` calls to the newer `#[contractevent]` macro.

`TODO.md` and `REPO_FIX_PLAN.md` reference:
- 57 deprecated publish calls
- files across configuration, savings plans, governance events, treasury, strategy routing, token, etc.

The wave’s stance here is pragmatic:
- the contracts compile and tests pass
- but the code emits deprecation warnings
- migration is queued as a medium priority improvement

This is typical of production waves: prioritize correctness and security first, then update to modern patterns.

---

## 10. What “Final Status: Fully Operational” means in this wave

The repository includes `FINAL_STATUS.md`, which asserts operational readiness.

The key claim is not simply “we think it works,” but:
- backend tests: 436 passing tests
- contract tests: 294 passing tests
- builds: contract WASM build, backend dist build, frontend production build
- CI/CD pipelines: all passing

It also lists known issues as non-blocking:
- contract event deprecation warnings
- frontend tests not implemented (documented)
- worker cleanup warning (cosmetic)

This distinction is essential:
- the wave reached a state where the system is **verifiable** via automated checks
- improvements remain but do not undermine operational availability

---

## 11. Putting it all together: end-to-end user journey

To show the “whole wave” rather than listing modules, it helps to trace a typical user journey:

### Step 1: User interacts via Frontend

The Next.js app provides user flows to:
- create savings accounts
- create savings plans
- deposit funds
- track transactions and dashboard data

The frontend relies on:
- Stellar RPC configuration
- Horizon configuration
- contract id configuration
- backend API configuration

### Step 2: Backend secures and orchestrates off-chain services

The backend provides:
- authentication secured with nonces and rate limiting
- indexing and syncing event data
- analytics aggregation
- referral tracking and admin analytics
- health endpoints for deployment monitoring

### Step 3: Contract enforces savings rules and rewards

When a savings plan is created and funds are deposited:
- the contract enforces plan constraints (flexi/lock/goal/group)
- fees are recorded
- rewards points are awarded in the rewards module

### Step 4: External yield strategy integration (optional)

When yield strategy routing is used:
- the contract calls an external strategy contract via the interface
- CEI pattern and reentrancy guard apply
- harvest profits are split into treasury yield and fees

### Step 5: Governance influences rates and operational states

Governance proposals can change:
- rate parameters
- pause/unpause

Voting power ties to historical savings behavior through rewards ledger accounting.

This end-to-end chain is the “wave thesis”: the product is coherent because incentives and rules are consistently enforced at the right layer.

---

## 12. Wave deliverables checklist (what was achieved)

From the repository’s docs, the wave deliverables include:

### 12.1 Smart contracts
- Single Soroban contract architecture with internal modularization
- Four savings products plus scheduler-based autosave
- Rewards points ledger, ranking, redemption
- Governance with proposals, voting, timelock execution
- Treasury accounting and fee allocation
- Staking via accumulator-based reward model
- External yield strategy interface boundary
- Defensive programming: reentrancy guard and CEI pattern

### 12.2 Backend
- Health check endpoints (full stack + liveness/readiness)
- Database and RPC/indexer readiness indicators
- Nonce security against replay
- Progressive rate limiting and abuse controls
- Referral system end-to-end (including analytics/admin operations)
- Challenges system (multi-type engagement)

### 12.3 Frontend
- Next.js UI for interacting with the system
- Dashboards for savings/transactions
- Wallet integration
- Documentation updates for setup and environment variables

### 12.4 Repository/ops
- Fix plan implemented for README structure and dependencies
- Final validation reports with test and build stats
- CI/CD pipeline verification

---

## 13. What remains after the wave (next steps)

No wave ends with a perfect “no work left” condition. The repository’s TODO and fix plan provide the next steps.

The primary outstanding item called out in the wave documentation is:

### 13.1 Migrate deprecated contract events
- 57 `env.events().publish` calls to `#[contractevent]` macro
- across many contract modules (config, savings plans, governance events, treasury, strategy routing, token, etc.)

This is valuable because it improves maintainability and aligns with Soroban best practices.

### 13.2 Optional enhancements
Documentation also points to future improvements:
- implement frontend tests
- add error boundaries
- refine observability and performance

Because the system is already “fully operational,” these become incremental improvements rather than urgent risk reducers.

---

## 14. How to use this documentation (contributor guidance)

This document exists to help new contributors understand the wave quickly. For practical usage:

- If you need **contract behavior**: start with `contracts/ARCHITECTURE.md`.
- If you need **economic flows**: read treasury + rewards + strategy routing sections in architecture.
- If you need **security posture**: read `backend/*SECURITY*` docs and `DEVELOPMENT_PROGRESS.md`.
- If you need **what was done and what is left**: read `FINAL_STATUS.md`, `REPO_FIX_PLAN.md`, and `TODO.md`.

---

## 15. Summary: the “whole wave” in one paragraph

Drips Wave, as reflected in Nestera’s repository documentation, represents the combination of funded momentum and disciplined engineering that carried the project through a complete development wave: smart contract architecture with governance, treasury, rewards, staking, and a secure external yield strategy boundary; a backend focused on health readiness, nonce replay protection, and progressive rate limiting; growth features such as referrals and challenges; and production hygiene that aligns documentation and dependencies with the real project structure. The wave culminated in final status reporting backed by full test and build verification, while leaving clearly documented medium-priority improvements (such as contract event macro migration) for subsequent iterations.

