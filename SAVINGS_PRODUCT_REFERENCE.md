# Nestera Savings Product Reference

This document explains Nestera savings product types, how yield and rewards are generated, how early withdrawal works, and how user savings data is stored in contracts.

## 1. Savings Product Types

### 1.1 Flexi Save
- **Type:** `PlanType::Flexi`
- **Access:** deposit and withdraw anytime
- **Interest:** active savings can earn a base interest rate stored in `SavingsPlan.interest_rate`
- **Penalty:** none for normal withdrawals
- **Storage:** one `SavingsPlan` per user plan, keyed by `DataKey::SavingsPlan(user, plan_id)`
- **Use case:** emergency buffer, short-term savings, flexible liquidity

### 1.2 Lock Save
- **Type:** `PlanType::Lock(duration)`
- **Access:** funds are locked until maturity
- **Duration:** `u64` seconds encoded in the plan type
- **Interest:** fixed APY stored in `SavingsPlan.interest_rate`; lock plans also use `LockSave` records for maturity tracking
- **Penalty:** early withdrawals are disallowed on-chain for `LockSave`; backend subscriptions may apply a 5% early withdrawal penalty if product is not flexible and not matured
- **Storage:** `LockSave` entries keyed by `DataKey::LockSave(lock_id)` plus `DataKey::UserLockSaves(user)` lists
- **Use case:** disciplined saving for medium-term goals when users can commit funds until maturity

### 1.3 Group Save
- **Type:** `PlanType::Group(group_id, is_public, contribution_type, target_amount)`
- **Access:** members contribute until the group target is met or campaign ends
- **Interest:** group plans are tracked like savings plans and can route funds to yield strategies via strategy routing
- **Penalty / exit:** group contribution/exit rules are enforced by group logic in contract and backend; contributions are refundable by group rules, not by instant withdrawal semantics
- **Storage:** `GroupSave` keyed by `DataKey::GroupSave(group_id)` and user membership via `DataKey::GroupMembers(group_id)` and `DataKey::UserGroupSaves(user)` lists
- **Use case:** collaborative saving for shared goals such as community purchases, events, or pooled target savings

### 1.4 Goal Save
- **Type:** `PlanType::Goal(goal_name, target_amount, goal_id)`
- **Access:** users make deposits toward a named savings goal; withdrawal is intended after goal completion or via explicit break action
- **Interest:** stored in the goal record and plan record; reward points may also be awarded on goal completion
- **Storage:** `GoalSave` keyed by `DataKey::GoalSave(goal_id)` and `DataKey::UserGoalSaves(user)` lists
- **Use case:** personal target saving for a purchase, milestone, or event

> Note: the contract supports flexible, lock, goal, and group savings as distinct plan types. The backend also models fixed and flexible product types for product catalog and subscriptions.

## 2. Savings Product Comparison

| Feature | Flexi Save | Lock Save | Goal Save | Group Save |
|---|---|---|---|---|
| Deposit anytime | Yes | No (until lock created) | Yes | Yes (according to group rules) |
| Withdraw anytime | Yes | No (until maturity) | Not until completion/break | Controlled by group rules |
| Interest rate | Base rate | Fixed higher APY | Fixed or goal-specific | Pool-dependent / strategy-backed |
| Early withdrawal penalty | None | 5% if backend-managed early break; on-chain lock withdraw blocked before maturity | Depends on break rules | Depends on group rules |
| Best for | liquidity cushion | disciplined savings | personal target | shared community saving |
| User state index | `SavingsPlan` list | `LockSave` list + `SavingsPlan` | `GoalSave` list + `SavingsPlan` | `GroupSave` list + membership records |

### 2.1 Tradeoffs

- **Flexi Save** is best for users who need instant access. It trades a lower or variable yield for full liquidity.
- **Lock Save** gives a stronger commitment signal and a higher fixed yield, but users must wait until maturity or pay a penalty in backend flows.
- **Goal Save** is useful when a named target matters more than immediate access; it encourages discipline and can unlock goal completion bonuses.
- **Group Save** is for social saving; it adds coordination and governance complexity but enables larger shared goals.

## 3. Interest / Yield Mechanism

### 3.1 Rate Representation

- `SavingsPlan.interest_rate` is stored in basis points.
- Example: `500` means **5.00% APY**.
- This pattern is defined in `contracts/src/storage_types.rs` and used across plan creation.

### 3.2 Lock Save Yield Calculation

Lock saves use simple yearly interest based on elapsed time.

Pseudo-formula from `contracts/src/lock.rs`:
```rust
let duration_seconds = current_time - lock_save.start_time;
let duration_years = duration_seconds as f64 / (365.25 * 24.0 * 3600.0);
let rate_decimal = lock_save.interest_rate as f64 / 10000.0;
let multiplier = 1.0 + (rate_decimal * duration_years);
let final_amount = (lock_save.amount as f64 * multiplier) as i128;
```

- `final_amount` includes principal + earned yield.
- This is simple interest, not compounded.

### 3.3 Strategy Yield Routing

Lock and group plans can deposit into yield strategies maintained by the contract.

Core flow in `contracts/src/strategy/routing.rs`:
- `route_to_strategy(strategy_address, position_key, amount)` routes eligible deposits into the external strategy.
- On harvest, the contract calls `strategy_harvest` and computes profit:
  - `profit = strategy_balance - principal`
  - `actual_yield = min(profit, harvested)`
- Strategy performance is stored in `DataKey::StrategyPerformance(strategy_address)`.
- APY is estimated as:
  - `apy_bps = (total_harvested * 10_000) / total_deposited`

### 3.4 Rewards Points & Token Rewards

Nestera also has a reward points layer for deposit activity.

From `contracts/src/rewards/storage.rs`:
- `award_deposit_points(env, user, amount)` calculates points when the user deposits.
- Base points are:
  - `base_points = amount * points_per_token`
- If the user has a streak and streak bonuses are enabled:
  - `bonus = base_points * streak_bonus_bps / 10_000`
- Points are capped by daily limits and cooldowns.

Example pseudocode:
```ts
points = amount * points_per_token
if (streak >= 3) {
  bonus = points * streak_bonus_bps / 10000
  points += bonus
}
points = min(points, remaining_daily_cap)
```

Users can later convert points to token rewards with `convert_points_to_tokens` and claim them via `claim_rewards`.

## 4. Early Withdrawal Penalties

### 4.1 Backend withdrawal penalty rule

In the backend `SavingsService`, early withdrawal penalty applies only to non-flexible products that are still before maturity:
- `EARLY_WITHDRAWAL_PENALTY_BPS = 500` → **5%**
- `penalty = amount * 500 / 10000`
- `netAmount = amount - penalty`

This is implemented in `backend/src/modules/savings/savings.service.ts`.

### 4.2 On-chain Lock Save early withdrawal behavior

On-chain lock saves do not allow withdrawal before maturity.
- `withdraw_lock_save(...)` returns `SavingsError::TooEarly` if the lock is still active.
- Therefore, no on-chain early-withdraw penalty is charged; the contract enforces maturity.

### 4.3 Penalty destination

Penalty amounts are recorded in the withdrawal request and deducted from the user payout.
The retained penalty is kept by the protocol/withdrawal processing system rather than returned to the withdrawing user.

### 4.4 Examples

1. **Flexible product withdrawal**:
   - Withdraw 100 USDC → penalty = 0 → user receives 100 USDC.
2. **Locked product early break**:
   - Attempt to withdraw 100 USDC before maturity in backend flow → penalty = 5 USDC → user receives 95 USDC.
3. **Matured lock withdrawal**:
   - No penalty if the lock has reached maturity.

## 5. User State & Contract Data Model

### 5.1 Primary user state

The contract tracks user metadata using `storage_types::User`:
- `total_balance: i128`
- `savings_count: u32`

Stored at: `DataKey::User(user_address)`

### 5.2 Individual savings plans

Each savings plan is stored as `storage_types::SavingsPlan`:
- `plan_id`
- `plan_type` (`Flexi`, `Lock`, `Goal`, `Group`)
- `balance`
- `start_time`
- `last_deposit`
- `last_withdraw`
- `interest_rate`
- `is_completed`
- `is_withdrawn`

This is keyed by: `DataKey::SavingsPlan(user_address, plan_id)`.

### 5.3 Plan indexing per user

The contract maintains per-user lists for plan lookup:
- `DataKey::UserLockSaves(user)` → list of lock save IDs
- `DataKey::UserGoalSaves(user)` → list of goal save IDs
- `DataKey::UserGroupSaves(user)` → list of group save IDs
- `DataKey::UserAutoSaves(user)` → list of autosave schedule IDs

These lists let clients fetch all of a user’s plans for each savings type.

### 5.4 Group and strategy storage

- `DataKey::GroupSave(group_id)` stores `GroupSave` metadata.
- `DataKey::GroupMembers(group_id)` stores the list of participant addresses.
- `DataKey::GroupMemberContribution(group_id, user)` stores each member’s contributed amount.
- Yield strategy positions are stored using `StrategyPositionKey::Lock(lock_id)` and `StrategyPositionKey::Group(group_id)`.

### 5.5 Backend product model

On the backend, `SavingsProduct` is an entity with:
- `type` = `FIXED` or `FLEXIBLE`
- `interestRate`
- `minAmount` / `maxAmount`
- optional `tenureMonths`
- optional `contractId`
- `riskLevel`

This backend model maps product catalog data to on-chain contract plans.

### 5.6 Developer extension guidance

To extend Nestera savings:
- Add new `PlanType` variants in `contracts/src/storage_types.rs`
- Add on-chain storage / retrieval helpers in `contracts/src/*` modules
- Keep `DataKey::SavingsPlan(user, plan_id)` as the canonical plan lookup
- Use per-user list keys for fast iteration and client-visible plan indexing
- Preserve the `interest_rate` basis-point pattern for all new plan kinds

---

## 6. Real User Scenarios

### Scenario A: Sasha needs a buffer
- Sasha opens a **Flexi Save** plan.
- She deposits 50 USDC, leaves it available for withdrawals, and still earns base interest.
- If she needs cash tomorrow, she can withdraw without penalty.

### Scenario B: Miriam commits to a lock
- Miriam deposits 200 USDC into a **Lock Save** for 90 days.
- She earns a predictable 5% APY while her funds are locked.
- If she tries to withdraw before maturity on-chain, the contract rejects with `TooEarly`.

### Scenario C: Group emergency fund
- Four friends create a **Group Save** with a 1000 USDC target.
- Each member contributes according to the group’s `contribution_type` rules.
- When the group reaches the target, the plan becomes `is_completed = true`.
- Members can review the same group state and contribution history because `GroupSave` and member lists are stored on-chain.
