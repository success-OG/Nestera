# Nestera Savings Lifecycle

This document walks through the complete lifecycle of a user's savings on Nestera — from account creation through every plan type, covering normal flows, edge cases, and early exit conditions.

---

## Table of Contents

1. [Account Setup](#1-account-setup)
2. [Flexi Save Lifecycle](#2-flexi-save-lifecycle)
3. [Lock Save Lifecycle](#3-lock-save-lifecycle)
4. [Goal Save Lifecycle](#4-goal-save-lifecycle)
5. [Group Save Lifecycle](#5-group-save-lifecycle)
6. [AutoSave Lifecycle](#6-autosave-lifecycle)
7. [Staking Lifecycle](#7-staking-lifecycle)
8. [Rewards Lifecycle](#8-rewards-lifecycle)
9. [Emergency & Edge Cases](#9-emergency--edge-cases)
10. [State Transition Summary](#10-state-transition-summary)

---

## 1. Account Setup

Every user must register before they can interact with any savings plan. This is a one-time operation.

### Normal Flow

```
1. User calls: initialize_user(user)
   - user.require_auth() — wallet signature required
   - Checks: user must NOT already exist (UserAlreadyExists if they do)
   - Creates: User { total_balance: 0, savings_count: 0 }
   - Creates: UserRewards record (zero points, zero streak)
   - Stored at: DataKey::User(user_address)

2. User is now active in the system.
```

### Edge Cases

| Situation | Result |
|---|---|
| Call `initialize_user` twice | `UserAlreadyExists` error (code 11) |
| Call any deposit before registering | `UserNotFound` error (code 10) |
| Contract is paused | `ContractPaused` error (code 84) |
| Missing wallet signature | Transaction rejected at network level |

---

## 2. Flexi Save Lifecycle

Flexi Save is the simplest plan — no lock, no target, deposit and withdraw freely at any time.

### Deposit

```
User calls: deposit_flexi(user, amount)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ amount > 0
  ✓ User exists (UserNotFound if not)

Effects:
  fee        = floor(amount × deposit_fee_bps / 10_000)
  net_amount = amount - fee

  FlexiBalance(user)       += net_amount
  User.total_balance       += net_amount
  TotalBalance(fee_recip)  += fee          (if fee > 0)
  Treasury.total_fees      += fee          (if fee > 0)

  Reward points awarded based on deposit amount.
  TTL extended on user storage.
```

### Withdrawal

```
User calls: withdraw_flexi(user, amount)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ amount > 0
  ✓ FlexiBalance(user) >= amount  (InsufficientBalance if not)

Effects:
  fee        = floor(amount × withdrawal_fee_bps / 10_000)
  net_amount = amount - fee

  FlexiBalance(user)       -= amount
  User.total_balance       -= amount
  TotalBalance(fee_recip)  += fee          (if fee > 0)
  Treasury.total_fees      += fee          (if fee > 0)

  Tokens transferred: contract → user wallet (net_amount)
```

### Flexi Save Edge Cases

| Situation | Result |
|---|---|
| Withdraw more than balance | `InsufficientBalance` (code 40) |
| Deposit amount = 0 | `InvalidAmount` (code 41) |
| Fee rounds to 0 on tiny amounts | No fee charged (floor division) |
| Multiple deposits, partial withdrawal | Each deposit/withdrawal is independent |
| No fee configured | Full amount credited / returned |

### Flexi Save State Diagram

```
[Registered] ──deposit──► [Has Balance] ──withdraw──► [Zero Balance]
                 ▲                │
                 └────deposit─────┘
                    (repeatable)
```

---

## 3. Lock Save Lifecycle

Lock Save locks funds for a fixed duration. Funds earn yield and cannot be withdrawn until the maturity time is reached.

### Creating a Lock

```
User calls: create_lock_save(user, amount, duration)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ amount > 0          (InvalidAmount if not)
  ✓ duration > 0        (InvalidTimestamp if not)
  ✓ User exists         (UserNotFound if not)

Effects:
  lock_id       = next auto-incrementing ID
  start_time    = ledger.timestamp()
  maturity_time = start_time + duration  (checked_add, Overflow if wraps)

  Stores: LockSave {
    id, owner, amount,
    interest_rate: 500,   ← 5% APY (fixed at creation)
    start_time,
    maturity_time,
    is_withdrawn: false
  }

  User.total_balance  += amount
  User.savings_count  += 1
  UserLockSaves(user) appended with lock_id

  Reward points awarded.
  Long-lock bonus awarded if duration > threshold.
  TTL extended.
```

### The Lock Period

While locked, the funds are held by the contract. No withdrawal is possible.

```
check_matured_lock(lock_id) → bool
  Returns: ledger.timestamp() >= lock_save.maturity_time
```

Calling `withdraw_lock_save` before maturity returns `TooEarly` (code 51).

### Yield Calculation

Interest accrues using simple interest from `start_time` to the moment of withdrawal:

```
duration_years = (current_time - start_time) / (365.25 × 24 × 3600)
rate_decimal   = interest_rate / 10_000        ← e.g. 500 / 10000 = 0.05
multiplier     = 1.0 + (rate_decimal × duration_years)
final_amount   = floor(amount × multiplier)
```

Example: 1,000 USDC locked for 1 year at 5% APY → final_amount = 1,050 USDC.

### Withdrawal (Matured)

```
User calls: withdraw_lock_save(user, lock_id)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ lock_save.owner == user       (Unauthorized if not)
  ✓ lock_save.is_withdrawn == false  (PlanCompleted if already done)
  ✓ ledger.timestamp() >= maturity_time  (TooEarly if not)

Effects:
  final_amount = principal + accrued_yield (simple interest)

  lock_save.is_withdrawn = true
  User.total_balance    -= lock_save.amount  (principal removed)

  Tokens transferred: contract → user wallet (final_amount)
  Event emitted: ("withdraw", user, lock_id) → final_amount
```

### Lock Save Edge Cases

| Situation | Result |
|---|---|
| Withdraw before maturity | `TooEarly` (code 51) |
| Withdraw twice | `PlanCompleted` (code 23) |
| Another user tries to withdraw | `Unauthorized` (code 1) |
| Lock ID does not exist | `PlanNotFound` (code 20) |
| Duration causes timestamp overflow | `Overflow` (code 82) |
| Lock routed to yield strategy | Yield harvested separately via `harvest_strategy` |

### Lock Save State Diagram

```
[Created] ──time passes──► [Matured] ──withdraw──► [Withdrawn / Closed]
              │
              └── withdraw_lock_save before maturity → TooEarly ✗
```

---

## 4. Goal Save Lifecycle

Goal Save is a target-based plan. The user sets a savings target and deposits toward it over time. The plan completes when `current_amount >= target_amount`. Early exit is supported with a configurable penalty fee.

### Creating a Goal

```
User calls: create_goal_save(user, goal_name, target_amount, initial_deposit)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ target_amount > 0    (InvalidAmount if not)
  ✓ initial_deposit >= 0 (InvalidAmount if negative)
  ✓ User exists          (UserNotFound if not)

Effects:
  fee             = floor(initial_deposit × deposit_fee_bps / 10_000)
  net_deposit     = initial_deposit - fee

  Stores: GoalSave {
    id, owner, goal_name,
    target_amount,
    current_amount: net_deposit,
    interest_rate: 500,
    start_time: ledger.timestamp(),
    is_completed: net_deposit >= target_amount,
    is_withdrawn: false
  }

  Fee credited to fee_recipient and treasury.
  Goal completion bonus awarded immediately if target met on creation.
  Reward points awarded.
  TTL extended.
```

### Depositing Toward a Goal

```
User calls: deposit_to_goal_save(user, goal_id, amount)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ amount > 0
  ✓ goal_save.owner == user    (Unauthorized if not)
  ✓ goal_save.is_completed == false  (PlanCompleted if already done)

Effects:
  fee        = floor(amount × deposit_fee_bps / 10_000)
  net_amount = amount - fee

  goal_save.current_amount += net_amount

  If current_amount >= target_amount:
    goal_save.is_completed = true
    Goal completion bonus awarded (if not already completed)

  Fee credited to fee_recipient and treasury.
  Reward points awarded.
  TTL extended.
```

### Withdrawing a Completed Goal

```
User calls: withdraw_completed_goal_save(user, goal_id)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ User exists
  ✓ goal_save.owner == user       (Unauthorized if not)
  ✓ goal_save.is_completed == true  (TooEarly if not)
  ✓ goal_save.is_withdrawn == false (PlanCompleted if already done)

Effects:
  fee        = floor(current_amount × withdrawal_fee_bps / 10_000)
  net_amount = current_amount - fee

  goal_save.is_withdrawn = true
  User.total_balance    += net_amount

  Fee credited to fee_recipient and treasury.
  Tokens transferred: contract → user wallet (net_amount)
```

### Early Break (Before Goal is Reached)

This is the early withdrawal path. The user exits before hitting the target and pays an early-break penalty.

```
User calls: break_goal_save(user, goal_id)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ User exists
  ✓ goal_save.owner == user
  ✓ goal_save.is_completed == false  (PlanCompleted if already done — cannot break a completed goal)
  ✓ goal_save.is_withdrawn == false  (PlanCompleted if already withdrawn)

Effects:
  early_break_fee_bps set by admin (default 0)
  fee        = floor(current_amount × early_break_fee_bps / 10_000)
  net_amount = current_amount - fee

  goal_save.is_withdrawn = true
  User.total_balance    += net_amount

  Fee credited to fee_recipient.
  Goal removed from UserGoalSaves list.
  Tokens transferred: contract → user wallet (net_amount)
  Event: ("goal_brk", user, goal_id) → net_amount
```

### Goal Save Edge Cases

| Situation | Result |
|---|---|
| Deposit to already-completed goal | `PlanCompleted` (code 23) |
| Withdraw incomplete goal | `TooEarly` (code 51) |
| Break a completed goal | `PlanCompleted` (code 23) |
| Withdraw twice | `PlanCompleted` (code 23) |
| Another user tries to withdraw | `Unauthorized` (code 1) |
| `early_break_fee_bps` = 0 | Full refund, no penalty |
| `early_break_fee_bps` > 10,000 | `InvalidAmount` (code 41) |
| Initial deposit meets target immediately | Goal marked complete at creation |

### Goal Save State Diagram

```
[Created / In Progress]
        │
        ├── deposit_to_goal_save (repeatable)
        │         │
        │         ▼
        │   current_amount >= target_amount?
        │         │ yes
        │         ▼
        │   [Completed] ──withdraw_completed_goal_save──► [Withdrawn / Closed]
        │
        └── break_goal_save (early exit, penalty applies)
                  │
                  ▼
            [Withdrawn / Closed]
```

---

## 5. Group Save Lifecycle

Group Save is a collaborative savings plan. Multiple users pool contributions toward a shared target. The group has a defined start and end time.

### Creating a Group

```
User calls: create_group_save(creator, title, description, category,
                               target_amount, contribution_type,
                               contribution_amount, is_public,
                               start_time, end_time)

Checks:
  ✓ Contract not paused
  ✓ target_amount > 0
  ✓ contribution_amount > 0
  ✓ start_time < end_time        (InvalidTimestamp if not)
  ✓ contribution_type in [0,1,2] (InvalidGroupConfig if not)
  ✓ title, description, category not empty

contribution_type values:
  0 = fixed amount per member
  1 = flexible (any amount)
  2 = percentage-based

Effects:
  group_id = next auto-incrementing ID
  Stores: GroupSave { id, creator, title, ..., member_count: 1, current_amount: 0, is_completed: false }
  Creator added to GroupMembers list
  Creator's contribution initialized to 0
  SavingsPlan created for creator (balance: 0, interest_rate: 500)
  TTL extended.
  Event: ("grp_new", creator) → group_id
```

### Joining a Group

Only public groups can be joined freely. Private groups require the creator to manage membership off-chain.

```
User calls: join_group_save(user, group_id)

Checks:
  ✓ Contract not paused
  ✓ User exists
  ✓ Group exists
  ✓ group.is_public == true      (InvalidGroupConfig if private)
  ✓ User not already a member    (InvalidGroupConfig if duplicate)

Effects:
  User added to GroupMembers list
  group.member_count += 1
  User's contribution initialized to 0
  SavingsPlan created for user
  TTL extended.
  Event: ("grp_join", user) → group_id
```

### Contributing to a Group

```
User calls: contribute_to_group_save(user, group_id, amount)

Checks:
  ✓ Contract not paused
  ✓ amount > 0
  ✓ Group exists
  ✓ User is a member of the group  (NotGroupMember if not)

Effects:
  GroupMemberContribution(group_id, user) += amount
  group.current_amount                   += amount

  If current_amount >= target_amount:
    group.is_completed = true

  SavingsPlan(user, group_id).balance    += amount
  SavingsPlan.last_deposit               = ledger.timestamp()

  Reward points awarded.
  TTL extended.
  Event: ("grp_cont", user, group_id) → amount
```

### Leaving a Group (Early Break)

A member can leave before the group completes. Their contributions are refunded in full — there is no early-break fee for group saves.

```
User calls: break_group_save(user, group_id)

Checks:
  ✓ Contract not paused
  ✓ User exists
  ✓ Group exists
  ✓ group.is_completed == false  (PlanCompleted if already done)
  ✓ User is a member             (NotGroupMember if not)

Effects:
  User removed from GroupMembers list
  group.member_count -= 1
  group.current_amount -= user_contribution  (saturating_sub)

  GroupMemberContribution(group_id, user) removed
  UserGroupSaves(user) updated (group_id removed)
  SavingsPlan(user, group_id) deleted

  Tokens refunded: contract → user wallet (user_contribution, full amount)
  TTL extended for remaining group.
  Event: ("grp_leave", user, group_id) → user_contribution
```

### Group Save Edge Cases

| Situation | Result |
|---|---|
| Join a private group | `InvalidGroupConfig` (code 73) |
| Join a group twice | `InvalidGroupConfig` (code 73) |
| Contribute without being a member | `NotGroupMember` (code 71) |
| Leave a completed group | `PlanCompleted` (code 23) |
| Creator leaves | Creator is treated as any other member — no special restriction |
| Group reaches target mid-contribution | `is_completed` set to true, further contributions blocked |
| Group end_time passes | No automatic action — group stays open until manually resolved |

### Group Save State Diagram

```
[Created] ──join_group_save──► [Member Joined]
                                      │
                              contribute_to_group_save
                                      │
                              current_amount >= target?
                                      │ yes
                                      ▼
                                [Completed]
                                      │
                              (no withdrawal function
                               currently — funds remain
                               until admin or governance
                               action)

At any point before completion:
  break_group_save → [Member Exits, contribution refunded]
```

---

## 6. AutoSave Lifecycle

AutoSave automates recurring Flexi deposits on a time interval. An external relayer or bot calls `execute_autosave` when the schedule is due.

### Creating a Schedule

```
User calls: create_autosave(user, amount, interval_seconds, start_time)

Checks:
  ✓ user.require_auth()
  ✓ amount > 0
  ✓ interval_seconds > 0  (InvalidTimestamp if not)
  ✓ User exists

Effects:
  schedule_id = next auto-incrementing ID
  Stores: AutoSave {
    id, user, amount, interval_seconds,
    next_execution_time: start_time,
    is_active: true
  }
  UserAutoSaves(user) appended with schedule_id
  TTL extended.
```

### Execution

Anyone can trigger execution — typically a relayer bot. The contract checks whether the schedule is due.

```
Relayer calls: execute_autosave(schedule_id)
  OR
Relayer calls: execute_due_autosaves([id1, id2, ...])

Checks (per schedule):
  ✓ Schedule exists and is_active == true
  ✓ ledger.timestamp() >= next_execution_time  (InvalidTimestamp if not)

Effects:
  flexi_deposit(schedule.user, schedule.amount) executed
    → deposit fee applied, net credited to FlexiBalance
  schedule.next_execution_time += interval_seconds

Batch behavior (execute_due_autosaves):
  - Each schedule is attempted independently
  - A failed or skipped schedule does NOT revert the batch
  - Returns Vec<bool>: true = executed, false = skipped
```

### Cancellation

```
User calls: cancel_autosave(user, schedule_id)

Checks:
  ✓ user.require_auth()
  ✓ Schedule exists
  ✓ schedule.user == user  (Unauthorized if not)

Effects:
  schedule.is_active = false
  (Schedule record remains in storage but will be skipped on future execution attempts)
```

### AutoSave Edge Cases

| Situation | Result |
|---|---|
| Execute before `next_execution_time` | `InvalidTimestamp` (code 50) |
| Execute a cancelled schedule | `InvalidPlanConfig` (code 25) |
| Execute a non-existent schedule | `PlanNotFound` (code 20) |
| User has insufficient token balance | Flexi deposit fails, batch marks as `false` |
| Relayer skips an execution window | Next execution still uses `next_execution_time += interval` — missed windows are not back-filled |
| Cancel then re-create | Must create a new schedule (cancelled ones cannot be reactivated) |

---
## 7. Staking Lifecycle

Staking lets users lock NST (the native protocol token) to earn continuous yield. Unlike savings plans, staking rewards accrue per-second based on a global reward rate and the user's share of the total staked pool.

### Initializing Staking (Admin)

Before any user can stake, an admin must configure the staking module:

```
Admin calls: init_staking_config(admin, StakingConfig {
  min_stake_amount,       ← minimum tokens to stake
  max_stake_amount,       ← upper cap per user
  reward_rate_bps,        ← annual reward rate (e.g. 500 = 5% APY)
  enabled,                ← true/false kill switch
  lock_period_seconds,    ← 0 = no lock, >0 = lock before unstake
})
```

### Staking

```
User calls: stake(user, amount)

Checks:
  ✓ Contract not paused
  ✓ user.require_auth()
  ✓ staking config enabled
  ✓ amount >= min_stake_amount  (AmountBelowMinimum if not)

Effects:
  update_rewards() called first — accrues global reward_per_token
  based on time elapsed since last update:

    new_rewards        = total_staked × reward_rate_bps × time_elapsed
                         ─────────────────────────────────────────────
                              10_000 × 365 × 24 × 60 × 60

    reward_per_token  += new_rewards

  Pending rewards calculated for existing stake (if any).

  Stake.amount          += amount
  Stake.start_time       = ledger.timestamp()  (first stake only)
  Stake.reward_per_share = current reward_per_token  (checkpoint)

  total_staked          += amount
  Event: StakeCreated(user, amount, new_total_staked)
```

### Claiming Rewards

Rewards can be claimed at any time without unstaking.

```
User calls: claim_staking_rewards(user)

Checks:
  ✓ user.require_auth()
  ✓ Contract not paused
  ✓ Stake.amount > 0  (InsufficientBalance if not)

Effects:
  update_rewards() called — accrues up to current timestamp

  pending_rewards = Stake.amount × (reward_per_token - Stake.reward_per_share)
                    ────────────────────────────────────────────────────────────
                                      1_000_000_000

  Stake.reward_per_share = current reward_per_token  (checkpoint reset)
  total_rewards_distributed += pending_rewards

  Tokens transferred: contract → user wallet (pending_rewards)
  Event: StakingRewardsClaimed(user, pending_rewards)
```

### Unstaking

```
User calls: unstake(user, amount)

Checks:
  ✓ user.require_auth()
  ✓ Contract not paused
  ✓ staking config enabled
  ✓ Stake.amount >= amount  (InsufficientBalance if not)
  ✓ If lock_period_seconds > 0:
      ledger.timestamp() >= Stake.start_time + lock_period_seconds
      (TooEarly if not)

Effects:
  update_rewards() called
  pending_rewards calculated (same formula as claim)

  Stake.amount          -= amount
  Stake.reward_per_share = current reward_per_token
  total_staked          -= amount
  total_rewards_distributed += pending_rewards

  Returns: (amount_unstaked, pending_rewards)
  Event: StakeWithdrawn(user, amount, new_total_staked)
```

### Staking Edge Cases

| Situation | Result |
|---|---|
| Stake below `min_stake_amount` | `AmountBelowMinimum` (code 43) |
| Unstake before lock period ends | `TooEarly` (code 51) |
| Unstake more than staked | `InsufficientBalance` (code 40) |
| Claim with zero stake | `InsufficientBalance` (code 40) |
| Claim when pending rewards = 0 | `InsufficientBalance` (code 40) |
| Staking disabled via config | `ContractPaused` (code 84) |
| `lock_period_seconds` = 0 | Unstake allowed immediately at any time |

### Staking State Diagram

```
[No Stake] ──stake()──► [Staking / Accruing]
                               │
                    ┌──────────┴──────────┐
                    │                     │
             claim_staking_rewards    unstake()
                    │                     │
                    ▼                     ▼
           [Still Staking]        [Partially/Fully Unstaked]
           (rewards reset)
```

---

## 8. Rewards Lifecycle

The rewards system tracks user activity across all plan types and awards points for deposits, streaks, long locks, and goal completions. Points can be redeemed or converted to claimable NST tokens.

### How Points Are Earned

Points are awarded automatically inside deposit and plan-creation functions — no separate call needed.

| Action | Points Awarded |
|---|---|
| Any deposit | `floor(amount × points_per_token)` |
| Deposit streak maintained | Streak bonus applied as `streak_bonus_bps` multiplier |
| Lock duration > threshold | Long-lock bonus: `floor(base_points × long_lock_bonus_bps / 10_000)` |
| Goal completed | Flat `goal_completion_bonus` points |

Points are only awarded when:
- `rewards_config.enabled == true`
- `amount >= min_deposit_for_rewards`
- Cooldown period has elapsed since last action (`action_cooldown_seconds`)
- Daily cap not exceeded (`max_daily_points`)

### Streak Mechanics

```
User calls: update_streak(user)
  ✓ user.require_auth()

A streak increments when the user deposits within the expected window.
Streak multiplier is capped at max_streak_multiplier.
Streak resets to 0 if the window is missed.
```

### Redeeming Points

```
User calls: redeem_points(user, amount)
  ✓ user.require_auth()
  ✓ UserRewards.total_points >= amount  (InsufficientBalance if not)

Effects:
  UserRewards.total_points -= amount
  Event: PointsRedeemed(user, amount)
```

### Converting Points to Tokens

```
User calls: convert_points_to_tokens(user, points_to_convert, tokens_per_point)
  ✓ user.require_auth()
  ✓ Sufficient points balance

Effects:
  tokens_queued = points_to_convert × tokens_per_point
  UserRewards.unclaimed_tokens += tokens_queued
  UserRewards.total_points     -= points_to_convert
```

### Claiming Token Rewards

```
User calls: claim_rewards(user)
  ✓ user.require_auth()
  ✓ Contract not paused
  ✓ UserRewards.unclaimed_tokens > 0

Effects:
  Tokens transferred from contract to user wallet
  UserRewards.unclaimed_tokens = 0
  Event: RewardsClaimed(user, amount)
```

### Rewards Edge Cases

| Situation | Result |
|---|---|
| Rewards module not initialized | Points silently not awarded (no error) |
| Rewards disabled in config | No points awarded for any action |
| Deposit below `min_deposit_for_rewards` | No points awarded |
| Action within cooldown window | No points awarded for that action |
| Daily cap reached | No further points until next day |
| Redeem more points than balance | `InsufficientBalance` (code 40) |
| Claim with zero unclaimed tokens | Fails (InsufficientBalance) |

---

## 9. Emergency & Edge Cases

### Contract Pause

The admin or governance can pause the contract at any time. When paused, all state-changing functions (`deposit_flexi`, `withdraw_flexi`, `create_lock_save`, etc.) return `ContractPaused` (code 84). Read-only functions (`get_user`, `get_flexi_balance`, etc.) continue to work.

```
Admin calls: pause(caller)   → all writes blocked
Admin calls: unpause(caller) → normal operation resumes
```

### Emergency Withdraw

If a vulnerability is detected in a specific plan, the admin can force-exit any user's position and permanently disable that strategy.

```
Admin calls: emergency_withdraw(admin, user, plan_type, plan_id)

  ✓ admin.require_auth()
  ✓ Caller must be the stored admin
  ✓ Strategy must not already be disabled

Effects (by plan type):
  Flexi  → FlexiBalance(user) zeroed, User.total_balance reduced
  Lock   → LockSave.is_withdrawn = true, User.total_balance reduced
  Goal   → GoalSave.is_withdrawn = true, User.total_balance reduced
  Group  → User's contribution zeroed, group.current_amount reduced

  DataKey::DisabledStrategy(plan_type, plan_id) = true
  Event: ("emergency_withdraw", user, plan_id) → withdrawn_amount
```

After an emergency withdraw, `is_strategy_disabled(plan_type, plan_id)` returns `true` and the strategy cannot be used again.

### Ledger TTL Expiry

Soroban ledger entries have a Time-To-Live. If a user goes inactive for a very long time and TTL is not extended, their data could expire. Nestera mitigates this by extending TTL on every read and write. However:

- If a user's data expires, it is treated as if the user does not exist (`UserNotFound`)
- Funds held by the contract account are not affected by TTL — only the accounting records are at risk
- Admins should monitor and extend TTLs for inactive accounts if needed

### Reentrancy Protection

All functions that interact with external yield strategy contracts are protected by a reentrancy guard:

```
DataKey::ReentrancyGuard = true   (set before external call)
DataKey::ReentrancyGuard = false  (cleared after)

If a reentrant call is detected: ReentrancyDetected (code 97)
```

### Arithmetic Safety

All balance math uses checked operations. Any overflow or underflow panics the transaction atomically — no partial state is written.

| Operation | Protection |
|---|---|
| Balance addition | `checked_add` → `Overflow` (code 82) |
| Balance subtraction | `checked_sub` → `Underflow` (code 83) |
| Fee calculation | `checked_mul` → `Overflow` (code 82) |
| Timestamp addition | `checked_add` → `Overflow` (code 82) |

---

## 10. State Transition Summary

### Per-Plan Terminal States

Every plan type has a terminal state after which no further operations are possible.

| Plan | Terminal State | How Reached |
|---|---|---|
| Flexi Save | Balance = 0 | Full withdrawal |
| Lock Save | `is_withdrawn = true` | `withdraw_lock_save` after maturity |
| Goal Save | `is_withdrawn = true` | `withdraw_completed_goal_save` or `break_goal_save` |
| Group Save (member) | Removed from group | `break_group_save` |
| AutoSave | `is_active = false` | `cancel_autosave` |
| Staking | `Stake.amount = 0` | Full `unstake` |

### Full User Journey (Happy Path)

```
Register
  │
  ├──► Flexi Save
  │      deposit_flexi → [balance grows] → withdraw_flexi
  │
  ├──► Lock Save
  │      create_lock_save → [locked, accruing yield] → withdraw_lock_save (after maturity)
  │
  ├──► Goal Save
  │      create_goal_save → deposit_to_goal_save (×N) → [completed] → withdraw_completed_goal_save
  │
  ├──► Group Save
  │      create_group_save / join_group_save → contribute_to_group_save (×N) → [completed]
  │
  ├──► AutoSave
  │      create_autosave → [relayer executes periodically] → cancel_autosave
  │
  ├──► Staking
  │      stake → [rewards accrue] → claim_staking_rewards → unstake
  │
  └──► Rewards
         [points earned automatically] → convert_points_to_tokens → claim_rewards
```

### Error Code Quick Reference

| Code | Name | Common Trigger |
|---|---|---|
| 1 | `Unauthorized` | Wrong user calling another's plan |
| 10 | `UserNotFound` | Deposit before `initialize_user` |
| 11 | `UserAlreadyExists` | Calling `initialize_user` twice |
| 20 | `PlanNotFound` | Invalid plan/lock/goal/group ID |
| 23 | `PlanCompleted` | Double-withdraw or operating on closed plan |
| 40 | `InsufficientBalance` | Withdraw more than available |
| 41 | `InvalidAmount` | Zero or negative amount |
| 43 | `AmountBelowMinimum` | Stake below configured minimum |
| 50 | `InvalidTimestamp` | AutoSave not yet due; zero duration |
| 51 | `TooEarly` | Lock not matured; goal not completed; staking lock active |
| 71 | `NotGroupMember` | Contribute/leave without membership |
| 73 | `InvalidGroupConfig` | Join private group; duplicate join |
| 82 | `Overflow` | Arithmetic overflow in balance math |
| 83 | `Underflow` | Arithmetic underflow in balance math |
| 84 | `ContractPaused` | Any write while paused |
| 90 | `InvalidFeeBps` | Fee > 10,000 bps |
| 92 | `StrategyDisabled` | Emergency withdraw already executed |
| 97 | `ReentrancyDetected` | Reentrant call into strategy function |
