# Formal Verification Report

This report captures the protocol invariants that are already enforced in code and the additional proof obligations that should be preserved during future changes.

## Verification Scope

Critical paths covered by the current contract implementation:

- user lifecycle and balances
- flexi, lock, goal, and group plan transitions
- staking and rewards accounting
- governance and timelock execution
- treasury allocation and withdrawals
- emergency pause and strategy disable flows

## Core Invariants

| Invariant | Intent | Enforced In |
|---|---|---|
| Non-negative amounts | No balance or fee operation should create a negative value | `src/invariants.rs`, `src/lib.rs` |
| Fee bounds | Basis points must remain within 0-10,000 | `src/invariants.rs::assert_valid_fee` |
| Pause safety | Mutable operations must stop when paused | `src/lib.rs`, `src/config.rs` |
| Reentrancy safety | External interactions must not re-enter active state transitions | `src/security.rs`, `src/lib.rs` |
| Authorized ownership | Only the owning user or admin may mutate a plan or config | `src/lib.rs`, module-specific guards |
| Lock maturity | Locked savings must not withdraw before maturity | `src/lock.rs` |
| Signature freshness | Off-chain authorizations must expire | `src/lib.rs::verify_signature` |
| Governance control | Admin/governance transitions must preserve voting and timelock rules | `src/governance.rs`, `src/timelock.rs` |

## Proof Obligations

The following properties should be kept stable and re-checked whenever money-moving logic changes:

1. Deposits and withdrawals preserve the total balance accounting for fees.
2. A plan marked withdrawn or completed cannot be withdrawn twice.
3. Emergency withdrawal disables a plan before any repeated drain can occur.
4. Treasury allocation percentages sum to 10,000 basis points.
5. Governance actions obey proposal thresholds, quorum, and timelock delays.

## Existing Evidence

The repository already contains direct runtime checks and targeted tests that support the invariants above:

- arithmetic guard tests in `src/lib.rs`
- invariant helpers in `src/invariants.rs`
- pause, auth, and admin-path checks in the contract modules
- strategy and governance test suites under `src/`

## Tooling Plan

Formal verification is modeled as a layered process rather than a single external tool:

1. Encode the invariant in a small helper or guard.
2. Add a targeted regression test for the invariant.
3. Record the proof obligation in this report.
4. Generate the docs bundle so the invariant remains visible to reviewers.

## Review Checklist

- Does the change preserve balance conservation?
- Does it introduce a new unguarded mutation path?
- Can a paused or disabled contract still mutate state?
- Can an authorization or expiry check be bypassed?
- Does the change require a new regression test or invariant helper?

## Status

The contract codebase now has a documented invariant set and a repeatable documentation/verification workflow. Future proof automation can be added without changing the published contract interface.