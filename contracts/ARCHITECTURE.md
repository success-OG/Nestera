# Nestera Smart Contract Architecture

Nestera is a single Soroban smart contract (`NesteraContract`) deployed on Stellar. Rather than a collection of separate deployed contracts, the system is organized as one contract binary composed of tightly coupled internal modules. The only external contract boundary is the **Yield Strategy interface** — pluggable third-party contracts that `NesteraContract` calls via cross-contract invocation.

---

## High-Level Architecture Diagram

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                        NesteraContract (lib.rs)                         │
  │                    Single deployed Soroban contract                     │
  │                                                                         │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
  │  │  Savings     │  │  Governance  │  │   Treasury   │  │  Staking   │ │
  │  │  Plans       │  │  (governance │  │  (treasury/  │  │ (staking/) │ │
  │  │              │  │   .rs)       │  │   mod.rs)    │  │            │ │
  │  │ • flexi.rs   │  │              │  │              │  │            │ │
  │  │ • lock.rs    │  │ • Proposals  │  │ • Fee pools  │  │ • Stake    │ │
  │  │ • goal.rs    │  │ • Voting     │  │ • Allocation │  │ • Unstake  │ │
  │  │ • group.rs   │  │ • Timelock   │  │ • Withdrawal │  │ • Rewards  │ │
  │  │ • autosave.rs│  │ • Actions    │  │   limits     │  │            │ │
  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
  │         │                 │                  │                │        │
  │  ┌──────▼─────────────────▼──────────────────▼────────────────▼──────┐ │
  │  │                    Shared Infrastructure                           │ │
  │  │                                                                    │ │
  │  │  users.rs    config.rs    rates.rs    token.rs    security.rs      │ │
  │  │  storage_    invariants   ttl.rs      upgrade.rs  views.rs         │ │
  │  │  types.rs    .rs          errors.rs                                │ │
  │  └──────────────────────────────┬─────────────────────────────────────┘ │
  │                                 │                                        │
  │  ┌──────────────────────────────▼─────────────────────────────────────┐ │
  │  │                       Rewards Module                               │ │
  │  │                                                                    │ │
  │  │  config.rs   storage.rs   ranking.rs   redemption.rs   events.rs  │ │
  │  └────────────────────────────────────────────────────────────────────┘ │
  │                                                                         │
  │  ┌──────────────────────────────────────────────────────────────────┐  │
  │  │                    Strategy Module                               │  │
  │  │                                                                  │  │
  │  │  registry.rs    routing.rs    interface.rs                       │  │
  │  └──────────────────────────────┬───────────────────────────────────┘  │
  └─────────────────────────────────┼───────────────────────────────────────┘
                                    │ cross-contract call (Soroban)
                    ┌───────────────▼───────────────┐
                    │   External Yield Strategy      │
                    │   (any registered contract     │
                    │    implementing YieldStrategy) │
                    │                                │
                    │  strategy_deposit()            │
                    │  strategy_withdraw()           │
                    │  strategy_harvest()            │
                    │  strategy_balance()            │
                    └────────────────────────────────┘
```

---

## Module Responsibilities

### `lib.rs` — Contract Entry Point

The top-level file that owns the `NesteraContract` struct and the `#[contractimpl]` block. Every public function callable from outside the contract lives here. It acts as a thin routing layer — it validates the pause state, acquires the reentrancy guard, delegates to the appropriate internal module, then releases the guard.

It also owns two small pieces of logic that are used everywhere:
- `ensure_not_paused()` — checks `DataKey::Paused` before any write
- `calculate_fee(amount, fee_bps)` — floor-division fee math used by all deposit/withdrawal paths

---

### Savings Plan Modules

These four modules implement the core savings products. They share the same storage schema (`storage_types.rs`) and all call into `rewards::storage` to award points on every deposit.

#### `flexi.rs` — Flexi Save
No lock, no target. Deposits and withdrawals are available at any time. Balances are stored per-user at `DataKey::FlexiBalance(user)`. Protocol fees are deducted on both deposit and withdrawal and routed to the fee recipient.

Calls into:
- `rewards::storage::award_deposit_points` on every deposit
- `treasury::record_fee` when a fee is collected
- `invariants::assert_sufficient_balance` before withdrawal
- `ttl::extend_user_ttl` on every read/write

#### `lock.rs` — Lock Save
Time-locked savings. Funds are locked until `maturity_time = start_time + duration`. Yield is calculated using simple interest at a fixed 5% APY rate set at creation. No early withdrawal — the contract enforces `ledger.timestamp() >= maturity_time`.

Calls into:
- `rewards::storage::award_deposit_points` and `award_long_lock_bonus` on creation
- `ttl::extend_lock_ttl` on every access

#### `goal.rs` — Goal Save
Target-based savings. The plan tracks `current_amount` vs `target_amount`. Deposits are accepted until the target is reached. Early exit via `break_goal_save` applies an admin-configurable penalty fee (`DataKey::EarlyBreakFeeBps`).

Calls into:
- `rewards::storage::award_deposit_points` on every deposit
- `rewards::storage::award_goal_completion_bonus` when target is reached
- `treasury::record_fee` on deposit, withdrawal, and early-break fees

#### `group.rs` — Group Save
Collaborative savings pool. Multiple users contribute toward a shared `target_amount`. Each member's contribution is tracked individually at `DataKey::GroupMemberContribution(group_id, user)`. Members can leave before completion via `break_group_save`, which refunds their full contribution with no penalty.

Calls into:
- `rewards::storage::award_deposit_points` on every contribution
- `ttl::extend_group_ttl` on every access

#### `autosave.rs` — AutoSave
Recurring deposit scheduler. Stores `AutoSave` structs with an `interval_seconds` and `next_execution_time`. Execution is triggered externally (by a relayer bot) via `execute_autosave` or `execute_due_autosaves`. Each execution calls `flexi::flexi_deposit` internally.

Calls into:
- `flexi::flexi_deposit` on every execution
- `users::user_exists` at creation time

---

### `governance.rs` — Governance

On-chain proposal and voting system. Manages two proposal types:
- `Proposal` — plain text, no on-chain action
- `ActionProposal` — carries a `ProposalAction` enum that executes a state change when the proposal passes

The lifecycle is: create → vote → queue (after voting period) → execute (after timelock). Voting power is derived from `UserRewards.lifetime_deposited`, making it proportional to historical savings activity.

`ProposalAction` variants that can be executed:
- `SetFlexiRate`, `SetGoalRate`, `SetGroupRate`, `SetLockRate` — write directly to `DataKey::*Rate` storage
- `PauseContract`, `UnpauseContract` — write to `DataKey::Paused`

Calls into:
- `rewards::storage::get_user_rewards` to calculate voting power
- `governance_events.rs` to emit `ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`, `ProposalCanceled`

Used by:
- `rates.rs` — `validate_admin_or_governance` guards all rate setters
- `strategy/registry.rs` — same guard on `register_strategy` and `disable_strategy`
- `lib.rs` — `pause` and `unpause` both call `validate_admin_or_governance`
- `lib.rs` — `mint_tokens` checks governance authorization

---

### `treasury/` — Treasury

Tracks all protocol fee income and yield. The `Treasury` struct holds six counters:

| Field | Meaning |
|---|---|
| `total_fees_collected` | Cumulative fees ever collected |
| `total_yield_earned` | Cumulative yield ever credited to users |
| `treasury_balance` | Unallocated fees awaiting allocation |
| `reserve_balance` | Allocated reserve sub-pool |
| `rewards_balance` | Allocated rewards sub-pool |
| `operations_balance` | Allocated operations sub-pool |

The admin calls `allocate_treasury(reserve_%, rewards_%, operations_%)` to split `treasury_balance` into the three pools. Withdrawals from any pool are subject to per-transaction and daily caps enforced by `TreasurySecurityConfig`.

Called by:
- `flexi.rs`, `goal.rs`, `lock.rs` — `record_fee` on every fee event
- `strategy/routing.rs` — `record_fee` for performance fees, `record_yield` for user yield after harvest

---

### `rewards/` — Rewards Module

Five-file module managing the points economy.

| File | Responsibility |
|---|---|
| `config.rs` | `RewardsConfig` storage — points rate, streak bonus, lock bonus, goal bonus, anti-farming limits |
| `storage.rs` | Per-user `UserRewards` ledger — points, streak, lifetime deposits, unclaimed tokens. Core logic for `award_deposit_points`, `award_long_lock_bonus`, `award_goal_completion_bonus`, `claim_rewards`, `convert_points_to_tokens` |
| `ranking.rs` | Leaderboard — tracks all users with points, sorts by `total_points`, exposes `get_top_users`, `get_user_rank`, `get_user_ranking_details` |
| `redemption.rs` | `redeem_points` — deducts points from user balance and emits `PointsRedeemed` |
| `events.rs` | Emits `PointsAwarded`, `BonusAwarded`, `StreakUpdated`, `PointsRedeemed`, `RewardsClaimed` |

`storage.rs` also calls `soroban_sdk::token::Client` directly when `claim_rewards` transfers the reward token to the user — this is the only place inside the rewards module that touches an external token contract.

Called by:
- `flexi.rs`, `lock.rs`, `goal.rs`, `group.rs` — `award_deposit_points` on every deposit
- `lock.rs` — `award_long_lock_bonus` on lock creation
- `goal.rs` — `award_goal_completion_bonus` on goal completion
- `users.rs` — `initialize_user_rewards` on user registration
- `governance.rs` — `get_user_rewards` to compute voting power

---

### `staking/` — Staking Module

Two-file module for NST token staking.

| File | Responsibility |
|---|---|
| `storage.rs` | Core staking logic — `stake`, `unstake`, `claim_staking_rewards`, `update_rewards` (global reward-per-token accumulator), `calculate_pending_rewards` |
| `storage_types.rs` | `Stake` struct, `StakingConfig`, `StakingDataKey` enum |
| `events.rs` | Emits `StakeCreated`, `StakeWithdrawn`, `StakingRewardsClaimed` |

Reward accrual uses a standard reward-per-token accumulator pattern:

```
new_rewards       = total_staked × reward_rate_bps × time_elapsed
                    ──────────────────────────────────────────────
                         10_000 × 365 × 24 × 60 × 60

reward_per_token += new_rewards

pending_rewards   = stake.amount × (reward_per_token - stake.reward_per_share)
                    ─────────────────────────────────────────────────────────
                                      1_000_000_000
```

This module is self-contained — it does not call into savings plan modules or rewards modules.

---

### `strategy/` — Yield Strategy Module

Three-file module managing external yield integrations.

#### `interface.rs` — YieldStrategy Trait
Defines the four functions any external strategy contract must implement:

```
strategy_deposit(from, amount)  → shares
strategy_withdraw(to, amount)   → returned_amount
strategy_harvest(to)            → yield_amount
strategy_balance(addr)          → total_balance
```

The `#[contractclient]` macro generates `YieldStrategyClient` used for cross-contract calls.

#### `registry.rs` — Strategy Registry
Stores `StrategyInfo { address, enabled, risk_level }` for each registered strategy. Registration and disabling require admin or active governance. Maintains a `StrategyKey::AllStrategies` list.

#### `routing.rs` — Deposit / Withdraw / Harvest Routing
Implements the Checks-Effects-Interactions (CEI) pattern for all external strategy calls:

1. Validate strategy is registered and enabled
2. Write `StrategyPosition` and update `StrategyTotalPrincipal` in storage (Effects)
3. Call the external strategy contract (Interaction)
4. Validate the response is positive

On `harvest_strategy`:
- Computes `profit = strategy_balance - recorded_principal`
- Calls `strategy_harvest`
- Splits yield: `treasury_fee` (performance fee bps) → `treasury::record_fee`, remainder → `treasury::record_yield` and `DataKey::StrategyYield`

---

### Shared Infrastructure

#### `users.rs`
Manages `User { total_balance, savings_count }` records. `initialize_user` creates the record and calls `rewards::storage::initialize_user_rewards`. All savings modules call `user_exists` as a precondition check.

#### `config.rs`
Stores and retrieves the global `Config` struct (admin, treasury address, fee rates, paused flag). `initialize_config` is a one-time setup that also calls `treasury::initialize_treasury`.

#### `rates.rs`
Stores per-plan-type interest rates in instance storage (`DataKey::FlexiRate`, `DataKey::GoalRate`, `DataKey::GroupRate`, `DataKey::LockRate(duration_days)`). All setters call `governance::validate_admin_or_governance`.

#### `token.rs`
Manages the native NST protocol token metadata (`TokenMetadata { name, symbol, decimals, total_supply, treasury }`). Provides `mint` and `burn` functions that update `total_supply` and emit events. Does not manage individual user balances — that is handled by the rewards module's `unclaimed_tokens` field.

#### `security.rs`
Implements the reentrancy guard using `DataKey::ReentrancyGuard` in instance storage. `acquire_reentrancy_guard` sets it to `true` and returns `ReentrancyDetected` if already locked. `release_reentrancy_guard` clears it. Called by `lib.rs` around every function that touches external strategy contracts.

#### `invariants.rs`
Three pure validation helpers called throughout the codebase:
- `assert_non_negative(amount)` — rejects zero/negative amounts
- `assert_valid_fee(fee_bps)` — rejects fees > 10,000 bps
- `assert_sufficient_balance(balance, amount)` — rejects withdrawals exceeding balance

#### `ttl.rs`
Centralizes all Soroban ledger TTL extension logic. Every module calls the appropriate helper (`extend_user_ttl`, `extend_lock_ttl`, `extend_goal_ttl`, etc.) on every read and write to prevent ledger entries from expiring. Active plans get a 180-day extension; completed/withdrawn plans get a shorter 30-day extension.

#### `storage_types.rs`
Single source of truth for all `#[contracttype]` structs and the `DataKey` enum. Every module imports from here. Key types: `User`, `SavingsPlan`, `LockSave`, `GoalSave`, `GroupSave`, `AutoSave`, `PlanType`, `DataKey`, `MintPayload`, `StrategyPerformance`.

#### `views.rs`
Read-only query helpers that iterate a user's `SavingsPlan` list and filter by plan type and status (ongoing, matured, completed). Used by frontends to fetch filtered plan lists without needing to know plan IDs upfront.

#### `upgrade.rs`
Handles WASM upgrades via `env.deployer().update_current_contract_wasm(new_wasm_hash)`. Enforces monotonically increasing version numbers and provides a `migrate` hook for future storage migrations.

#### `errors.rs`
Single `SavingsError` enum with 39 error codes covering authorization, user state, plan state, balance, timing, interest, group, and general contract errors. All modules import from here.

---

## Module Interaction Map

```
                         ┌─────────────────┐
                         │    lib.rs        │
                         │  (entry point)   │
                         └────────┬────────┘
                                  │ delegates to
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
   ┌──────▼──────┐        ┌───────▼──────┐       ┌───────▼──────┐
   │  flexi.rs   │        │  governance  │       │  treasury/   │
   │  lock.rs    │        │  .rs         │       │  mod.rs      │
   │  goal.rs    │        └───────┬──────┘       └───────┬──────┘
   │  group.rs   │                │                      │
   │  autosave.rs│        ┌───────▼──────┐               │
   └──────┬──────┘        │  rates.rs    │               │
          │               │  (guarded by │               │
          │               │  governance) │               │
          │               └──────────────┘               │
          │                                              │
          │  award_*_points                              │ record_fee
          ▼                                              │ record_yield
   ┌─────────────────────────────────────────────────────▼──────────────┐
   │                        rewards/                                     │
   │  config.rs  storage.rs  ranking.rs  redemption.rs  events.rs       │
   └─────────────────────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │                        strategy/                                 │
   │  registry.rs ──► routing.rs ──► interface.rs                    │
   │                      │                                          │
   │                       └──► treasury::record_fee / record_yield  │
   └──────────────────────────────────────────────────────────────────┘
                                  │
                    cross-contract call (Soroban)
                                  │
                    ┌─────────────▼──────────────┐
                    │  External Strategy Contract │
                    └─────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │                     Shared (used by all)                         │
   │  users.rs  config.rs  storage_types.rs  invariants.rs           │
   │  security.rs  ttl.rs  errors.rs  token.rs  views.rs             │
   └──────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Single contract, not a multi-contract system
All modules compile into one WASM binary. There are no internal cross-contract calls between savings plans, governance, treasury, or rewards. This eliminates inter-contract call overhead and simplifies authorization — there is one admin, one pause flag, one storage namespace.

### External boundary is the strategy interface only
The only cross-contract calls Nestera makes are to registered yield strategy contracts via `YieldStrategyClient`. This boundary is explicitly protected by the reentrancy guard and the CEI pattern in `routing.rs`.

### Governance gates admin actions
Rate changes, strategy registration, and pause/unpause all go through `governance::validate_admin_or_governance`. Before governance is activated, only the admin can call these. After `activate_governance`, governance proposals can execute them autonomously via `ProposalAction`.

### Rewards are passive
No user needs to call a separate "claim points" function. Points are awarded automatically inside every deposit and plan-creation call. The user only needs to act when converting points to tokens or claiming token rewards.

### TTL is managed proactively
Every read and write extends the relevant ledger entry's TTL. Active plans get 180 days; completed plans get 30 days. This prevents user data from silently expiring on a live network.
