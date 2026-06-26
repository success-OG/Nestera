# Nestera – Contract Security Threat Model

> **Issue #885** – Security Audit Preparation  
> Version 1.0 | June 2026

---

## 1. Scope

| Component | In Scope |
|-----------|----------|
| `contracts/src/lib.rs` – entry points | ✅ |
| `contracts/src/flexi.rs` – flexi savings | ✅ |
| `contracts/src/goal.rs` – goal savings | ✅ |
| `contracts/src/lock.rs` – time-lock savings | ✅ |
| `contracts/src/group.rs` – group pools | ✅ |
| `contracts/src/governance.rs` | ✅ |
| `contracts/src/treasury/` | ✅ |
| `contracts/src/security.rs` – reentrancy guard | ✅ |
| Backend indexer / API | Out of scope |
| Frontend | Out of scope |

---

## 2. Assets & Trust Levels

| Asset | Value | Custodian |
|-------|-------|-----------|
| User USDC deposits | High | Contract storage |
| Admin signing key | Critical | Off-chain (admin EOA) |
| Contract WASM bytecode | Critical | Admin |
| Governance votes / proposals | High | Contract storage |
| Fee recipient address | Medium | Admin config |

**Trust hierarchy:**

```
Admin (highest) → Governance → Authenticated User → Unauthenticated Caller (lowest)
```

---

## 3. Threat Table (STRIDE)

### 3.1 Spoofing

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| S-1 | Caller forges `user` Address in deposit/withdraw | Fund theft | Low | `user.require_auth()` enforced at every entrypoint | ✅ Mitigated |
| S-2 | Attacker submits expired/replayed mint signature | Unauthorized minting | Low | Timestamp check + expiry window in `verify_signature` | ✅ Mitigated |
| S-3 | Non-admin impersonates admin for config changes | Fee manipulation | Low | `require_admin` compares stored admin vs caller | ✅ Mitigated |

### 3.2 Tampering

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| T-1 | Direct storage mutation bypassing contract logic | Balance corruption | Very Low | Soroban storage is contract-private | ✅ Mitigated |
| T-2 | Governance proposal tampered after creation | Unauthorized config | Low | Proposals stored by ID; mutations require re-vote | ✅ Mitigated |
| T-3 | Arithmetic overflow inflates balances | Fund inflation | Low | `checked_add/sub/mul` + `overflow-checks = true` in release profile | ✅ Mitigated |

### 3.3 Repudiation

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| R-1 | Admin denies fee change | Audit gap | Medium | All config changes emit on-chain events | ✅ Mitigated |
| R-2 | User disputes balance | Legal risk | Low | Every deposit/withdraw emits event with amount + user | ✅ Mitigated |

### 3.4 Information Disclosure

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| I-1 | User savings data exposed to third parties | Privacy | Low | Storage keyed by user Address; Soroban does not expose arbitrary storage reads | ✅ Mitigated |
| I-2 | Admin private key leak via backend logs | Critical | Medium | Key managed off-chain; backend must not log signing key | ⚠️ Review |

### 3.5 Denial of Service

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| D-1 | Storage TTL expiry silently deletes user data | Fund inaccessibility | Medium | Proactive TTL extension (180-day window) in `ttl.rs` | ✅ Mitigated |
| D-2 | Governance spam proposals block execution | Protocol freeze | Low | Quorum + voting power threshold required | ✅ Mitigated |
| D-3 | Indexer DLQ overflow | Backend blind spot | Medium | DLQ persisted to DB; alerting on `totalEventsFailed > 0` | ✅ Mitigated |

### 3.6 Elevation of Privilege

| ID | Threat | Impact | Likelihood | Mitigation | Status |
|----|--------|--------|------------|------------|--------|
| E-1 | User calls admin-only `pause` | Protocol freeze | Low | `require_admin` guard; should panic for non-admin | ✅ Mitigated |
| E-2 | Reentrancy via token callback | Fund double-spend | Low | Reentrancy guard (`security.rs`) wraps all fund flows | ✅ Mitigated |
| E-3 | Unauthorized WASM upgrade | Full takeover | Low | Upgrade requires admin auth + timelock scheduling | ✅ Mitigated |
| E-4 | Governance takes over admin role prematurely | Protocol misconfiguration | Low | `validate_admin_or_governance` requires sufficient voting power | ✅ Mitigated |

---

## 4. Attack Scenarios

### Scenario A – Reentrancy via malicious token callback
**Attack:** Attacker deploys a token that calls back into `withdraw_flexi` inside `transfer`.  
**Defence:** `acquire_reentrancy_guard` in `security.rs` returns `ReentrancyDetected` on second entry.  
**Test:** `security_tests.rs` – verify guard fires (manual test required with mock token).

### Scenario B – Fee drain via admin key compromise
**Attack:** Compromised admin sets `DepositFeeBps = 9_999` (99.99%), draining all new deposits.  
**Defence:** Fee is capped at 10,000 bps (100%); governance can replace admin.  
**Residual risk:** Admin can set fee to 100% before governance reacts.  
**Recommendation:** Add time-lock on fee changes (currently no delay).

### Scenario C – Storage expiry
**Attack:** User is inactive > 180 days; TTL lapses; entry deleted; user loses access.  
**Defence:** `ttl.rs` extends on every interaction; 180-day window is generous.  
**Recommendation:** Emit an `StorageExpiringSoon` event 30 days before TTL lapses.

### Scenario D – Signature replay
**Attack:** Intercepted `MintPayload` resubmitted after expiry.  
**Defence:** `verify_signature` checks `env.ledger().timestamp() <= expiry_timestamp`.  
**Residual risk:** Clock manipulation not possible on Stellar (BFT consensus).

---

## 5. Known Issues & Accepted Risks

| ID | Description | Severity | Resolution |
|----|-------------|----------|------------|
| K-1 | No time-lock on fee changes | Medium | Governance-delayed fee changes planned Q2 2026 |
| K-2 | Admin key off-chain; single point of failure | High | Multi-sig admin planned post-MVP |
| K-3 | Emergency withdraw callable without lock period | Medium | Will add 24h cool-down in next version |
| K-4 | Indexer events not cryptographically verified | Low | Soroban event API provides finality guarantees |

---

## 6. Security Assumptions

1. Stellar BFT consensus provides finality – no reorg risk.
2. Soroban isolates contract storage – other contracts cannot read it.
3. `require_auth()` panics on invalid auth – SDK guarantee.
4. `overflow-checks = true` in release profile catches all overflow at runtime.
5. Admin private key is managed via hardware wallet (assumed, to be verified in audit).

---

## 7. Test Coverage Summary

| Category | File | Count |
|----------|------|-------|
| Invariant tests | `contracts/tests/invariant_tests.rs` | 13 |
| Security tests | `contracts/tests/security_tests.rs` | 11 |
| Integration tests | `contracts/tests/integration.rs` | 30+ |
| Fuzz tests | `contracts/src/fuzz_tests.rs` | 10+ |
| Treasury security | `contracts/src/treasury/security_tests.rs` | 10+ |
| Backend integration | `backend/test/contract-backend-integration.e2e-spec.ts` | 15 |

**Run all contract tests:**
```bash
cd contracts && cargo test
```

**Run backend integration tests:**
```bash
cd backend && npx jest contract-backend-integration
```

---

## 8. Pre-Audit Checklist

- [x] All public entrypoints have `require_auth` or admin guard
- [x] Arithmetic uses `checked_*` operations
- [x] Reentrancy guard on all fund-mutating paths
- [x] Contract pause mechanism tested
- [x] Fee invariant enforced (0–10,000 bps)
- [x] Storage TTL management in place
- [x] Events emitted for all state changes
- [x] Invariant tests passing
- [x] Security tests passing
- [x] Threat model documented
- [ ] Time-lock on fee changes (planned K-1)
- [ ] Multi-sig admin (planned K-2)
- [ ] Third-party audit engagement (pending)

---

*Generated by the Nestera engineering team for the security audit engagement.*
