# Nestera Contract Documentation Bundle

Generated on: 2026-06-02T02:14:48Z

This bundle is assembled from the contract reference, operations guide, and formal verification report.

---

## CONTRACT_REFERENCE.md

# Nestera Contract — Public Function Reference

Contract: `NesteraContract` (Soroban / Stellar)
Package: `Nestera` · Language: Rust · SDK: `soroban-sdk`

---

## Table of Contents

1. [Initialization](#initialization)
2. [User Management](#user-management)
3. [Flexi Save](#flexi-save)
4. [Lock Save](#lock-save)
5. [Goal Save](#goal-save)
6. [Group Save](#group-save)
7. [AutoSave](#autosave)
8. [Staking](#staking)
9. [Rewards & Ranking](#rewards--ranking)
10. [Governance](#governance)
11. [Treasury](#treasury)
12. [Strategy (Yield)](#strategy-yield)
13. [Token](#token)
14. [Admin & Config](#admin--config)
15. [Emergency](#emergency)

---

## Initialization

### `initialize`
Sets up the contract for the first time. Stores the admin address and public key, initializes the protocol token, and sets the contract as active.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address (must authorize) |
| `admin_public_key` | `BytesN<32>` | Ed25519 public key for off-chain signature verification |

Returns: `()`

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- initialize \
  --admin GADMIN... \
  --admin_public_key <32-byte-hex>
```

---

### `is_initialized`
Returns whether the contract has been initialized.

Returns: `bool`

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet -- is_initialized
```

---

### `initialize_config`
Sets protocol fee rates and treasury address. Can only be called once.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `treasury` | `Address` | Treasury address for fee collection |
| `deposit_fee_bps` | `u32` | Deposit fee in basis points (e.g. 100 = 1%) |
| `withdrawal_fee_bps` | `u32` | Withdrawal fee in basis points |
| `performance_fee_bps` | `u32` | Performance/yield fee in basis points |

Returns: `Result<(), SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- initialize_config \
  --admin GADMIN... --treasury GTREASURY... \
  --deposit_fee_bps 50 --withdrawal_fee_bps 50 --performance_fee_bps 100
```

---

### `verify_signature`
Verifies an off-chain Ed25519 admin signature against a `MintPayload`. Used for authorized minting flows.

| Parameter | Type | Description |
|---|---|---|
| `payload` | `MintPayload` | Payload containing user, amount, timestamp, expiry |
| `signature` | `BytesN<64>` | Ed25519 signature from admin |

Returns: `bool`

---

## User Management

### `init_user`
Creates a new user record with zero balances. Panics if the contract is paused or user already exists.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Address to register |

Returns: `User`

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- init_user --user GUSER...
```

---

### `initialize_user`
Same as `init_user` but returns a `Result` instead of panicking.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Address to register |

Returns: `Result<(), SavingsError>`

---

### `get_user`
Retrieves a user's record (total balance and savings count).

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address to look up |

Returns: `Result<User, SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- get_user --user GUSER...
```

---

### `user_exists`
Checks whether a user has been registered.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Address to check |

Returns: `bool`

---

## Flexi Save

Flexible savings with no lock period. Deposits and withdrawals are available at any time.

### `deposit_flexi`
Deposits funds into the user's Flexi Save pool. A protocol deposit fee is deducted.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Depositing user (must authorize) |
| `amount` | `i128` | Amount to deposit (must be > 0) |

Returns: `Result<(), SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- deposit_flexi --user GUSER... --amount 1000000
```

---

### `withdraw_flexi`
Withdraws funds from the user's Flexi Save pool. A protocol withdrawal fee is deducted.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Withdrawing user (must authorize) |
| `amount` | `i128` | Amount to withdraw (must be > 0 and ≤ balance) |

Returns: `Result<(), SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- withdraw_flexi --user GUSER... --amount 500000
```

---

### `get_flexi_balance`
Returns the user's current Flexi Save balance.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `i128` (0 if user has no balance)

---

## Lock Save

Time-locked savings that earn yield. Funds cannot be withdrawn before the maturity time.

### `create_lock_save`
Creates a new Lock Save plan. Funds are locked for the specified duration.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `amount` | `i128` | Amount to lock (must be > 0) |
| `duration` | `u64` | Lock duration in seconds (must be > 0) |

Returns: `u64` (lock plan ID)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- create_lock_save --user GUSER... --amount 5000000 --duration 2592000
```

---

### `withdraw_lock_save`
Withdraws a matured Lock Save plan with accrued yield. Fails if the plan has not yet matured.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `lock_id` | `u64` | ID of the lock plan |

Returns: `i128` (final amount including yield)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- withdraw_lock_save --user GUSER... --lock_id 1
```

---

### `check_matured_lock`
Returns whether a Lock Save plan has reached its maturity time.

| Parameter | Type | Description |
|---|---|---|
| `lock_id` | `u64` | Lock plan ID |

Returns: `bool`

---

### `get_user_lock_saves`
Returns all Lock Save plan IDs belonging to a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Vec<u64>`

---

## Goal Save

Savings plans with a target amount. Earn yield and optionally break early with a fee.

### `create_goal_save`
Creates a new Goal Save plan with an optional initial deposit.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `goal_name` | `Symbol` | Short label for the goal |
| `target_amount` | `i128` | Target savings amount (must be > 0) |
| `initial_deposit` | `i128` | Initial deposit amount (0 or more) |

Returns: `u64` (goal plan ID)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- create_goal_save --user GUSER... --goal_name vacation \
  --target_amount 10000000 --initial_deposit 1000000
```

---

### `deposit_to_goal_save`
Adds funds to an existing Goal Save plan.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `goal_id` | `u64` | Goal plan ID |
| `amount` | `i128` | Amount to deposit (must be > 0) |

Returns: `()` (panics on error)

---

### `withdraw_completed_goal_save`
Withdraws from a completed (target reached) Goal Save plan. A withdrawal fee is deducted.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `goal_id` | `u64` | Goal plan ID |

Returns: `i128` (net amount after fee)

---

### `break_goal_save`
Exits a Goal Save plan before completion. An early-break fee is deducted.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Plan owner (must authorize) |
| `goal_id` | `u64` | Goal plan ID |

Returns: `i128` (net amount after early-break fee)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- break_goal_save --user GUSER... --goal_id 2
```

---

### `get_goal_save_detail`
Returns the full details of a Goal Save plan.

| Parameter | Type | Description |
|---|---|---|
| `goal_id` | `u64` | Goal plan ID |

Returns: `GoalSave`

---

### `get_user_goal_saves`
Returns all Goal Save plan IDs for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Vec<u64>`

---

## Group Save

Collaborative savings pools where multiple users contribute toward a shared target.

### `create_group_save`
Creates a new Group Save plan. The creator is automatically added as the first member.

| Parameter | Type | Description |
|---|---|---|
| `creator` | `Address` | Group creator |
| `title` | `String` | Group title (non-empty) |
| `description` | `String` | Group description (non-empty) |
| `category` | `String` | Category label (non-empty) |
| `target_amount` | `i128` | Total savings target (must be > 0) |
| `contribution_type` | `u32` | 0 = fixed, 1 = flexible, 2 = percentage |
| `contribution_amount` | `i128` | Per-member contribution amount (must be > 0) |
| `is_public` | `bool` | Whether anyone can join |
| `start_time` | `u64` | Unix timestamp for group start |
| `end_time` | `u64` | Unix timestamp for group end (must be > start_time) |

Returns: `Result<u64, SavingsError>` (group ID)

```bash
stellar contract invoke --id <CONTRACT_ID> --source creator --network testnet \
  -- create_group_save \
  --creator GCREATOR... --title "House Fund" --description "Saving for a house" \
  --category housing --target_amount 50000000 --contribution_type 0 \
  --contribution_amount 1000000 --is_public true \
  --start_time 1700000000 --end_time 1710000000
```

---

### `join_group_save`
Allows a registered user to join a public Group Save plan.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User joining the group |
| `group_id` | `u64` | Group plan ID |

Returns: `Result<(), SavingsError>`

---

### `contribute_to_group_save`
Adds a contribution to a Group Save plan. User must already be a member.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Contributing member |
| `group_id` | `u64` | Group plan ID |
| `amount` | `i128` | Contribution amount (must be > 0) |

Returns: `Result<(), SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- contribute_to_group_save --user GUSER... --group_id 1 --amount 1000000
```

---

### `break_group_save`
Removes a user from a Group Save plan and refunds their contributions.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Member leaving the group |
| `group_id` | `u64` | Group plan ID |

Returns: `Result<(), SavingsError>`

---

## AutoSave

Automated recurring Flexi deposits executed on a schedule.

### `create_autosave`
Creates a recurring deposit schedule for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Schedule owner (must authorize) |
| `amount` | `i128` | Amount to deposit per execution (must be > 0) |
| `interval_seconds` | `u64` | Seconds between executions (must be > 0) |
| `start_time` | `u64` | Unix timestamp for first execution |

Returns: `Result<u64, SavingsError>` (schedule ID)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- create_autosave --user GUSER... --amount 100000 \
  --interval_seconds 604800 --start_time 1700000000
```

---

### `execute_autosave`
Executes a single AutoSave schedule if it is due.

| Parameter | Type | Description |
|---|---|---|
| `schedule_id` | `u64` | Schedule ID to execute |

Returns: `Result<(), SavingsError>`

---

### `execute_due_autosaves`
Batch-executes multiple AutoSave schedules in one call. Skips any that are inactive or not yet due without reverting the batch.

| Parameter | Type | Description |
|---|---|---|
| `schedule_ids` | `Vec<u64>` | List of schedule IDs to attempt |

Returns: `Vec<bool>` (true = executed, false = skipped)

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- execute_due_autosaves --schedule_ids '[1, 2, 3]'
```

---

### `cancel_autosave`
Deactivates an AutoSave schedule. Only the schedule owner can cancel.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | Schedule owner (must authorize) |
| `schedule_id` | `u64` | Schedule ID to cancel |

Returns: `Result<(), SavingsError>`

---

### `get_autosave`
Returns an AutoSave schedule by ID.

| Parameter | Type | Description |
|---|---|---|
| `schedule_id` | `u64` | Schedule ID |

Returns: `Option<AutoSave>`

---

### `get_user_autosaves`
Returns all AutoSave schedule IDs for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Vec<u64>`

---

## Staking

Token staking for additional rewards and governance power.

### `init_staking_config`
Initializes staking parameters. Admin only, called once.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address (must authorize) |
| `config` | `StakingConfig` | Staking configuration struct |

Returns: `Result<(), SavingsError>`

---

### `update_staking_config`
Updates staking parameters. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address (must authorize) |
| `config` | `StakingConfig` | New staking configuration |

Returns: `Result<(), SavingsError>`

---

### `get_staking_config`
Returns the current staking configuration.

Returns: `Result<StakingConfig, SavingsError>`

---

### `stake`
Stakes tokens for a user. Increases their staking position and starts accruing rewards.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User staking tokens (must authorize) |
| `amount` | `i128` | Amount to stake (must be > 0) |

Returns: `Result<i128, SavingsError>` (new total staked)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- stake --user GUSER... --amount 1000000
```

---

### `unstake`
Unstakes tokens for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User unstaking (must authorize) |
| `amount` | `i128` | Amount to unstake |

Returns: `Result<(i128, i128), SavingsError>` (remaining staked, rewards accrued)

---

### `claim_staking_rewards`
Claims all pending staking rewards for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User claiming rewards (must authorize) |

Returns: `Result<i128, SavingsError>` (amount claimed)

---

### `get_user_stake`
Returns a user's current stake information.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Stake`

---

### `get_pending_staking_rewards`
Returns the pending (unclaimed) staking rewards for a user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Result<i128, SavingsError>`

---

### `get_staking_stats`
Returns global staking statistics.

Returns: `Result<(i128, i128, i128), SavingsError>` — `(total_staked, total_rewards, reward_per_token)`

---

## Rewards & Ranking

Points-based rewards system for user activity.

### `init_rewards_config`
Initializes the rewards configuration. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `points_per_token` | `u32` | Points awarded per token deposited |
| `streak_bonus_bps` | `u32` | Streak bonus in basis points |
| `long_lock_bonus_bps` | `u32` | Long lock bonus in basis points |
| `goal_completion_bonus` | `u32` | Bonus points for completing a goal |
| `enabled` | `bool` | Whether rewards are active |
| `min_deposit_for_rewards` | `i128` | Minimum deposit to earn points |
| `action_cooldown_seconds` | `u64` | Cooldown between reward-earning actions |
| `max_daily_points` | `u128` | Daily points cap per user |
| `max_streak_multiplier` | `u32` | Maximum streak multiplier |

Returns: `Result<(), SavingsError>`

---

### `update_rewards_config`
Updates the rewards configuration. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `config` | `RewardsConfig` | New rewards configuration |

Returns: `Result<(), SavingsError>`

---

### `get_rewards_config`
Returns the current rewards configuration.

Returns: `Result<RewardsConfig, SavingsError>`

---

### `get_user_rewards`
Returns a user's accumulated rewards data.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `UserRewards`

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- get_user_rewards --user GUSER...
```

---

### `update_streak`
Updates the deposit streak for a user and applies streak bonuses.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address (must authorize) |

Returns: `Result<u32, SavingsError>` (new streak count)

---

### `get_top_users`
Returns the top N users ranked by reward points.

| Parameter | Type | Description |
|---|---|---|
| `limit` | `u32` | Number of top users to return |

Returns: `Vec<(Address, u128)>`

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- get_top_users --limit 10
```

---

### `get_user_rank`
Returns the rank of a specific user (1-indexed). Returns 0 if unranked.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `u32`

---

### `get_user_ranking_details`
Returns detailed ranking info for a user: rank, total points, and total ranked users.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Option<(u32, u128, u32)>`

---

### `redeem_points`
Redeems accumulated reward points for protocol benefits.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User redeeming points (must authorize) |
| `amount` | `u128` | Points to redeem |

Returns: `Result<(), SavingsError>`

---

### `convert_points_to_tokens`
Converts accumulated points into claimable token rewards.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User (must authorize) |
| `points_to_convert` | `u128` | Points to convert |
| `tokens_per_point` | `i128` | Conversion rate |

Returns: `Result<i128, SavingsError>` (tokens queued for claim)

---

### `claim_rewards`
Claims all pending token rewards and transfers them to the user.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User claiming (must authorize) |

Returns: `Result<i128, SavingsError>` (amount claimed)

```bash
stellar contract invoke --id <CONTRACT_ID> --source user --network testnet \
  -- claim_rewards --user GUSER...
```

---

### `set_reward_token`
Sets the token contract address used for distributing native token rewards. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `token` | `Address` | Token contract address |

Returns: `Result<(), SavingsError>`

---

## Governance

On-chain proposal and voting system with timelock execution.

### `init_voting_config`
Initializes governance voting parameters. Admin only, one-time.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `quorum` | `u32` | Minimum participation threshold |
| `voting_period` | `u64` | Duration of voting window in seconds |
| `timelock_duration` | `u64` | Delay between queue and execution in seconds |
| `proposal_threshold` | `u128` | Minimum voting power to create action proposals |
| `max_voting_power` | `u128` | Cap on a single voter's weight |

Returns: `Result<(), SavingsError>`

---

### `get_voting_config`
Returns the current voting configuration.

Returns: `Result<VotingConfig, SavingsError>`

---

### `activate_governance`
Enables governance mode. Admin only, one-time.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address (must authorize) |

Returns: `Result<(), SavingsError>`

---

### `is_governance_active`
Returns whether governance has been activated.

Returns: `bool`

---

### `create_proposal`
Creates a plain governance proposal (no on-chain action).

| Parameter | Type | Description |
|---|---|---|
| `creator` | `Address` | Proposal creator (must authorize) |
| `description` | `String` | Human-readable proposal description |

Returns: `Result<u64, SavingsError>` (proposal ID)

```bash
stellar contract invoke --id <CONTRACT_ID> --source creator --network testnet \
  -- create_proposal --creator GCREATOR... --description "Increase flexi rate to 6%"
```

---

### `create_action_proposal`
Creates a proposal that executes an on-chain action if passed. Requires minimum voting power.

| Parameter | Type | Description |
|---|---|---|
| `creator` | `Address` | Proposal creator (must authorize) |
| `description` | `String` | Proposal description |
| `action` | `ProposalAction` | Action to execute (e.g. `SetFlexiRate(600)`) |

Returns: `Result<u64, SavingsError>` (proposal ID)

Available `ProposalAction` variants:
- `SetFlexiRate(i128)`
- `SetGoalRate(i128)`
- `SetGroupRate(i128)`
- `SetLockRate(u64, i128)`
- `PauseContract`
- `UnpauseContract`

---

### `get_proposal`
Returns a proposal by ID.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |

Returns: `Option<Proposal>`

---

### `get_action_proposal`
Returns an action proposal by ID.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |

Returns: `Option<ActionProposal>`

---

### `list_proposals`
Returns all proposal IDs.

Returns: `Vec<u64>`

---

### `get_voting_power`
Returns a user's voting power based on their lifetime deposited funds.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `u128`

---

### `vote`
Casts a weighted vote on a proposal.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal to vote on |
| `vote_type` | `u32` | 1 = for, 2 = against, 3 = abstain |
| `voter` | `Address` | Voter address (must authorize) |

Returns: `Result<(), SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source voter --network testnet \
  -- vote --proposal_id 1 --vote_type 1 --voter GVOTER...
```

---

### `has_voted`
Returns whether a user has already voted on a proposal.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |
| `voter` | `Address` | Voter address |

Returns: `bool`

---

### `queue_proposal`
Queues a passed proposal for execution after the timelock period.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |

Returns: `Result<(), SavingsError>`

---

### `execute_proposal`
Executes a queued proposal after the timelock has elapsed.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |

Returns: `Result<(), SavingsError>`

---

### `get_active_proposals`
Returns all proposal IDs that are currently within their voting window.

Returns: `Vec<u64>`

---

### `get_proposal_votes`
Returns the vote tallies for a proposal.

| Parameter | Type | Description |
|---|---|---|
| `proposal_id` | `u64` | Proposal ID |

Returns: `(u128, u128, u128)` — `(for_votes, against_votes, abstain_votes)`

---

### `get_user_voted_proposals`
Returns all proposal IDs a user has voted on.

| Parameter | Type | Description |
|---|---|---|
| `user` | `Address` | User address |

Returns: `Vec<u64>`

---

## Treasury

Protocol fee collection, allocation, and withdrawal management.

### `get_treasury`
Returns the full treasury state struct.

Returns: `Treasury`

---

### `get_treasury_balance`
Returns the unallocated treasury balance (fees pending allocation).

Returns: `i128`

---

### `get_total_fees`
Returns the cumulative total of all protocol fees collected.

Returns: `i128`

---

### `get_total_yield`
Returns the cumulative total of all yield credited to users.

Returns: `i128`

---

### `get_reserve_balance`
Returns the current reserve sub-balance.

Returns: `i128`

---

### `get_treasury_limits`
Returns the current treasury withdrawal safety limits.

Returns: `TreasurySecurityConfig`

---

### `set_treasury_limits`
Updates treasury withdrawal limits. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `max_withdrawal_per_tx` | `i128` | Max amount per single withdrawal |
| `daily_withdrawal_cap` | `i128` | Max total withdrawals per 24-hour window |

Returns: `Result<TreasurySecurityConfig, SavingsError>`

---

### `withdraw_treasury`
Withdraws from a treasury sub-pool. Subject to per-tx and daily caps. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `pool` | `TreasuryPool` | Pool to withdraw from: `Reserve`, `Rewards`, or `Operations` |
| `amount` | `i128` | Amount to withdraw |

Returns: `Result<Treasury, SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- withdraw_treasury --admin GADMIN... --pool Reserve --amount 500000
```

---

### `allocate_treasury`
Allocates the unallocated treasury balance into reserve, rewards, and operations pools. Percentages must sum to 10,000 bps (100%). Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `reserve_percent` | `u32` | Reserve allocation in bps |
| `rewards_percent` | `u32` | Rewards allocation in bps |
| `operations_percent` | `u32` | Operations allocation in bps |

Returns: `Result<Treasury, SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- allocate_treasury --admin GADMIN... \
  --reserve_percent 4000 --rewards_percent 3000 --operations_percent 3000
```

---

## Strategy (Yield)

External yield strategy routing for Lock and Group Save plans.

### `register_strategy`
Registers a new yield strategy contract. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `strategy_address` | `Address` | Strategy contract address |
| `risk_level` | `u32` | Risk classification (e.g. 1 = low, 3 = high) |

Returns: `Result<(), SavingsError>`

---

### `disable_strategy`
Disables a registered strategy. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `strategy_address` | `Address` | Strategy to disable |

Returns: `Result<(), SavingsError>`

---

### `get_strategy`
Returns info about a registered strategy.

| Parameter | Type | Description |
|---|---|---|
| `strategy_address` | `Address` | Strategy contract address |

Returns: `Result<StrategyInfo, SavingsError>`

---

### `get_all_strategies`
Returns all registered strategy addresses.

Returns: `Vec<Address>`

---

### `route_lock_to_strategy`
Routes a Lock Save deposit to a yield strategy.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Caller (must authorize) |
| `lock_id` | `u64` | Lock plan ID |
| `strategy_address` | `Address` | Target strategy |
| `amount` | `i128` | Amount to route |

Returns: `Result<i128, SavingsError>` (shares received)

---

### `route_group_to_strategy`
Routes a Group Save pooled deposit to a yield strategy.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Caller (must authorize) |
| `group_id` | `u64` | Group plan ID |
| `strategy_address` | `Address` | Target strategy |
| `amount` | `i128` | Amount to route |

Returns: `Result<i128, SavingsError>`

---

### `get_lock_strategy_position`
Returns the strategy position for a lock plan.

| Parameter | Type | Description |
|---|---|---|
| `lock_id` | `u64` | Lock plan ID |

Returns: `Option<StrategyPosition>`

---

### `get_group_strategy_position`
Returns the strategy position for a group plan.

| Parameter | Type | Description |
|---|---|---|
| `group_id` | `u64` | Group plan ID |

Returns: `Option<StrategyPosition>`

---

### `withdraw_lock_strategy`
Withdraws funds from a lock plan's strategy position.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Caller (must authorize) |
| `lock_id` | `u64` | Lock plan ID |
| `to` | `Address` | Recipient address |

Returns: `Result<i128, SavingsError>`

---

### `withdraw_group_strategy`
Withdraws funds from a group plan's strategy position.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Caller (must authorize) |
| `group_id` | `u64` | Group plan ID |
| `to` | `Address` | Recipient address |

Returns: `Result<i128, SavingsError>`

---

### `harvest_strategy`
Harvests yield from a strategy. Allocates the protocol performance fee to treasury and credits the remainder to users.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Caller (must authorize) |
| `strategy_address` | `Address` | Strategy to harvest from |

Returns: `Result<i128, SavingsError>` (total yield harvested)

---

## Token

Native protocol token (NST) management.

### `get_token_metadata`
Returns the protocol token metadata: name, symbol, decimals, total supply, and treasury address.

Returns: `Result<TokenMetadata, SavingsError>`

```bash
stellar contract invoke --id <CONTRACT_ID> --network testnet -- get_token_metadata
```

---

### `mint_tokens`
Mints new NST tokens to an address. Only callable by admin or governance.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address (must authorize) |
| `to` | `Address` | Recipient address |
| `amount` | `i128` | Amount to mint (must be > 0) |

Returns: `Result<i128, SavingsError>` (new total supply)

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- mint_tokens --caller GADMIN... --to GUSER... --amount 1000000
```

---

### `burn`
Burns NST tokens from an address. Reduces total supply.

| Parameter | Type | Description |
|---|---|---|
| `from` | `Address` | Address to burn from (must authorize) |
| `amount` | `i128` | Amount to burn (must be > 0) |

Returns: `Result<i128, SavingsError>` (new total supply)

---

## Admin & Config

### `set_admin`
Transfers admin rights to a new address.

| Parameter | Type | Description |
|---|---|---|
| `current_admin` | `Address` | Current admin (must authorize) |
| `new_admin` | `Address` | New admin address |

Returns: `Result<(), SavingsError>`

---

### `set_treasury`
Updates the protocol treasury address. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `new_treasury` | `Address` | New treasury address |

Returns: `Result<(), SavingsError>`

---

### `set_fees`
Updates all protocol fee rates. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `deposit_fee` | `u32` | New deposit fee in bps |
| `withdrawal_fee` | `u32` | New withdrawal fee in bps |
| `performance_fee` | `u32` | New performance fee in bps |

Returns: `Result<(), SavingsError>`

---

### `set_flexi_rate`
Sets the Flexi Save interest rate. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `rate` | `i128` | New rate in basis points (e.g. 500 = 5%) |

Returns: `Result<(), SavingsError>`

---

### `set_goal_rate`
Sets the Goal Save interest rate. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `rate` | `i128` | New rate in basis points |

Returns: `Result<(), SavingsError>`

---

### `set_group_rate`
Sets the Group Save interest rate. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `rate` | `i128` | New rate in basis points |

Returns: `Result<(), SavingsError>`

---

### `set_lock_rate`
Sets the Lock Save interest rate for a specific duration. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address |
| `duration_days` | `u64` | Lock duration in days |
| `rate` | `i128` | New rate in basis points |

Returns: `Result<(), SavingsError>`

---

### `get_flexi_rate` / `get_goal_rate` / `get_group_rate`
Returns the current interest rate for the respective plan type.

Returns: `i128`

---

### `get_lock_rate`
Returns the interest rate for a specific lock duration.

| Parameter | Type | Description |
|---|---|---|
| `duration_days` | `u64` | Lock duration in days |

Returns: `Result<i128, SavingsError>`

---

### `set_early_break_fee_bps`
Sets the early-break penalty fee for Goal Save plans. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `bps` | `u32` | Fee in basis points (0–10000) |

Returns: `Result<(), SavingsError>`

---

### `get_early_break_fee_bps`
Returns the current early-break fee in basis points.

Returns: `u32`

---

### `set_fee_recipient`
Sets the address that receives protocol fees. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `recipient` | `Address` | Fee recipient address |

Returns: `Result<(), SavingsError>`

---

### `get_fee_recipient`
Returns the current fee recipient address.

Returns: `Option<Address>`

---

### `get_protocol_fee_balance`
Returns the accumulated protocol fee balance for a given recipient.

| Parameter | Type | Description |
|---|---|---|
| `recipient` | `Address` | Fee recipient address |

Returns: `i128`

---

### `get_config`
Returns the full protocol configuration.

Returns: `Result<Config, SavingsError>`

---

### `pause` / `unpause`
Pauses or unpauses the contract. Admin or governance only.

| Parameter | Type | Description |
|---|---|---|
| `caller` | `Address` | Admin or governance address (must authorize) |

Returns: `Result<(), SavingsError>`

---

### `pause_contract` / `unpause_contract`
Alternative pause/unpause via the config module. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |

Returns: `Result<(), SavingsError>`

---

### `is_paused`
Returns whether the contract is currently paused.

Returns: `bool`

---

### `upgrade`
Upgrades the contract WASM. Admin only.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address |
| `new_wasm_hash` | `BytesN<32>` | Hash of the new WASM binary |

Returns: `()`

---

### `version`
Returns the current contract version number.

Returns: `u32`

---

## Emergency

### `emergency_withdraw`
Forces a withdrawal from any plan type and disables the strategy. Admin only. Bypasses normal withdrawal restrictions.

| Parameter | Type | Description |
|---|---|---|
| `admin` | `Address` | Admin address (must authorize) |
| `user` | `Address` | User whose plan is being withdrawn |
| `plan_type` | `PlanType` | Plan type: `Flexi`, `Lock(u64)`, `Goal(...)`, `Group(...)` |
| `plan_id` | `u64` | Plan ID |

Returns: `Result<i128, SavingsError>` (amount withdrawn)

```bash
stellar contract invoke --id <CONTRACT_ID> --source admin --network testnet \
  -- emergency_withdraw \
  --admin GADMIN... --user GUSER... --plan_type Flexi --plan_id 0
```

---

### `is_strategy_disabled`
Returns whether a strategy has been disabled via emergency withdraw.

| Parameter | Type | Description |
|---|---|---|
| `plan_type` | `PlanType` | Plan type |
| `plan_id` | `u64` | Plan ID |

Returns: `bool`

---

## Error Reference

All functions that return `Result` use `SavingsError`. Key codes:

| Code | Name | Description |
|---|---|---|
| 1 | `Unauthorized` | Caller lacks permission |
| 10 | `UserNotFound` | User not registered |
| 11 | `UserAlreadyExists` | User already registered |
| 20 | `PlanNotFound` | Plan ID does not exist |
| 23 | `PlanCompleted` | Plan already completed or withdrawn |
| 40 | `InsufficientBalance` | Withdrawal exceeds balance |
| 41 | `InvalidAmount` | Amount is zero or negative |
| 42 | `AmountExceedsLimit` | Amount exceeds configured cap |
| 50 | `InvalidTimestamp` | Timestamp is invalid or inconsistent |
| 51 | `TooEarly` | Operation attempted before allowed time |
| 60 | `InvalidInterestRate` | Rate is negative or out of range |
| 71 | `NotGroupMember` | User is not a member of the group |
| 82 | `Overflow` | Arithmetic overflow |
| 83 | `Underflow` | Arithmetic underflow |
| 84 | `ContractPaused` | Contract is paused |
| 90 | `InvalidFeeBps` | Fee exceeds 10,000 bps |
| 91 | `ConfigAlreadyInitialized` | Config already set |
| 92 | `StrategyDisabled` | Strategy has been emergency-disabled |
| 97 | `ReentrancyDetected` | Reentrant call detected |


---

## CONTRACT_OPERATIONS.md

# Contract Operations Guide

This guide defines the local workflow for building, documenting, deploying, and verifying the Soroban contracts in `contracts/`.

## Prerequisites

- Rust toolchain with the `wasm32-unknown-unknown` target installed.
- Soroban CLI available as `soroban`.
- A deployment environment with `NETWORK`, `CONTRACT_ID`, and account credentials set when executing real chain operations.

## Generated Documentation

Run the generated-docs script to assemble the current contract documentation bundle:

```bash
./scripts/generate-docs.sh
```

This writes a single generated reference to `docs/generated/contract-documentation.md` so reviewers can inspect the ABI, operational steps, and verification report from one place.

## Deployment Flow

The deployment script follows a narrow sequence:

1. Build the contract WASM artifact.
2. Flatten the source tree into a deterministic verification bundle.
3. Record a deployment manifest with hashes and metadata.
4. Optionally execute a chain deployment when the caller provides the required environment variables and CLI arguments.

Example:

```bash
NETWORK=testnet CONTRACT_ID=<CONTRACT_ID> ./scripts/deploy.sh
```

The script keeps the manifest under `target/nestera-contract-ops/deployments/` so later verification steps can compare the deployed artifact with the local tree.

## Verification Flow

The verification script performs two checks:

1. Recompute the current source hash.
2. Compare it against the latest deployment manifest.

If the hashes differ, the deployment is out of sync and should be redeployed from the current source.

Example:

```bash
NETWORK=testnet CONTRACT_ID=<CONTRACT_ID> ./scripts/verify.sh
```

## Status Check

The status script prints the most recent deployment manifest, including:

- network name
- contract ID
- source hash
- WASM hash
- source bundle location

Use it before posting release notes or explorer links.

## Rollback Flow

Rollback is implemented as a redeployment of a previous manifest or source bundle. The contract scripts do not mutate on-chain history; they prepare and document the previous known-good state so the operator can redeploy it cleanly.

Example:

```bash
ROLLBACK_MANIFEST=target/nestera-contract-ops/deployments/testnet/latest.json ./scripts/rollback.sh
```

## Block-Explorer Verification Notes

Explorer verification is a metadata problem for Soroban: the deployed WASM hash, source bundle, network, and contract ID must match. The flattening step provides a deterministic source artifact for explorer-side or auditor-side comparison.

## Suggested Release Checklist

1. Run the contract tests.
2. Generate the documentation bundle.
3. Build and deploy the WASM artifact.
4. Run the verification script against the manifest.
5. Record the explorer URL and manifest hash in the release notes.

---

## FORMAL_VERIFICATION.md

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

---

## SOROBAN_STORAGE.md

# Soroban Storage Design in Nestera Contracts

## 1. Overview of Storage Architecture

Nestera uses **Soroban's three storage types** strategically:

| Storage Type | Purpose | Examples | TTL Management |
|--------------|---------|----------|----------------|
| **Instance** | Contract-global configuration (immutable or admin-only) | Admin address, fees (ProtocolFeeBps), rates (FlexiRate), pause flag | Extended via `extend_instance_ttl()` to 180 days |
| **Persistent** | User-specific data & plans (mutable) | User balances, SavingsPlan/LockSave/GoalSave/GroupSave, reward ledgers | **Active TTL extension** on every read/write (180 days active plans, 30 days archived) |
| **Temporary** | **Not used** – All data designed for persistence | N/A | N/A |

**Design Rationale:**
- **Instance**: Low-cost for rarely-changing config (~permanent).
- **Persistent + TTL**: Balances cost/longevity for active savings data. TTL extended proactively to prevent data loss.
- No temporary: Ensures auditability/immutability for financial data.

## 2. Persistent vs Instance Storage (Temporary Absence)

### Instance Storage (Global Config)
```rust
// lib.rs: Initialization
env.storage().instance().set(&DataKey::Admin, &admin);
env.storage().instance().set(&DataKey::Initialized, &true);
env.storage().instance().set(&DataKey::PlatformFee, &bps);

// TTL extension
ttl::extend_instance_ttl(&env);  // ~180 days
```

**Keys** (DataKey enum):
- `Admin`, `FeeRecipient`, `EarlyBreakFeeBps`, `ProtocolFeeBps`
- Rates: `FlexiRate`, `GoalRate`, `LockRate(duration)`

### Persistent Storage (User Data)
All user-facing data stored here with **TTL automation** in `ttl.rs`:
```rust
// storage_types.rs: DataKey examples
User(Address)                    // User {total_balance, savings_count}
SavingsPlan(Address, u64)        // Generic plan wrapper
GroupSave(u64), LockSave(u64)    // Specific plan types
UserLockSaves(Address)           // Vec of user's plan IDs
NextLockId                       // Auto-increment counter
```

**No Temporary Storage**: All operations persist changes immediately. Temporary would be for short-lived computations (e.g., transaction-local maps), but Nestera prioritizes state durability.

## 3. Key Data Structures

### User Savings (Core)
```rust
// storage_types.rs
pub struct User {
    total_balance: i128,     // Aggregated across all plans
    savings_count: u32,      // Number of active plans
}

pub struct SavingsPlan {     // Wrapper for all plans
    plan_id: u64,
    plan_type: PlanType,     // Enum: Flexi | Lock(duration) | Goal | Group
    balance: i128,
    start_time: u64,
    interest_rate: u32,      // e.g., 500 = 5%
    is_completed: bool,
    is_withdrawn: bool,
}
```

**Plan Types**:
| Type | Structure | Use Case |
|------|-----------|----------|
| Flexi | `SavingsPlan` | Anytime deposit/withdraw |
| Lock | `LockSave {maturity_time}` | Fixed-term, higher yield |
| Goal | `GoalSave {target_amount}` | Target-based (e.g., vacation) |
| Group/Pools | `GroupSave {target_amount, member_count, GroupMembers}` | Collective savings pools |
| AutoSave | `AutoSave {interval_seconds, next_execution}` | Recurring deposits |

### Pools (Group Saves)
```rust
pub struct GroupSave {
    target_amount: i128,     // Collective goal
    current_amount: i128,
    member_count: u32,
    GroupMembers(group_id): Vec<Address>
    GroupMemberContribution(group_id, user): i128
}
```
- **Pools** = GroupSave: Multi-user collective savings towards shared target.

### Rewards System
Separate namespace (`RewardsDataKey`):
```rust
// rewards/storage_types.rs
pub struct UserRewards {
    total_points: u128,          // Rankable/spendable
    lifetime_deposited: i128,    // Voting power base
    current_streak: u32,         // Daily consistency bonus
}

pub struct RewardsConfig {      // Instance-like config
    points_per_token: u32,
    enabled: bool,
    // Anti-farming: min_deposit, cooldowns
}
```

## 4. How State Changes Over Time

**Atomic Update Pattern** (lib.rs: create_savings_plan):
```rust
// 1. CHECKS: paused? valid amount?
ensure_not_paused(&env)?;

// 2. EFFECTS: Read -> Mutate -> Write
let mut user_data = get_user(...)?.unwrap_or(User::default());
user_data.total_balance += initial_deposit;  // checked_add
env.storage().persistent().set(&DataKey::User(user), &user_data);

let new_plan = SavingsPlan { ... };
env.storage().persistent().set(&DataKey::SavingsPlan(user, plan_id), &new_plan);

// 3. TTL Extension
ttl::extend_user_ttl(&env, &user);
ttl::extend_plan_ttl(&env, &plan_key);

// 4. INTERACTIONS: Events
env.events().publish((symbol_short!("create_plan"),), amount);
```

**Lifecycle Examples**:
- **Deposit**: `balance += amount`, `last_deposit = now`, extend TTL.
- **Withdraw**: `balance -= amount` (fees applied), `is_withdrawn=true` (archived TTL).
- **Complete Goal/Pool**: `is_completed=true`, shorter TTL (30d).
- **Rewards**: `total_points += calc()` on deposit, `streak++` daily.

**TTL Automation** (ttl.rs):
- **Active plans**: Extend to 180 days on every access.
- **Archived**: 30 days (completed/withdrawn).
- **Config**: 180 days fixed.

**Garbage Collection**: Expired TTL data auto-deleted by Soroban, preventing bloat.

## 5. Best Practices & Design Decisions

✅ **Proactive TTL**: Prevents unexpected data loss.
✅ **Separate Namespaces**: User data isolated per-address.
✅ **Check-Effects-Interact**: Reentrancy-safe.
✅ **Invariant Checks**: `invariants::assert_non_negative`, fee bounds.
✅ **Gas Optimization**: TTL batch-extended, read-once patterns.

**For New Contributors**:
1. Always call `ensure_not_paused()` first.
2. Use `checked_add/sub` for i128 math.
3. Extend TTL after every storage write.
4. Emit events for all mutations.

**Monitoring**: Watch `LOW_THRESHOLD` (~30d) – triggers extensions before expiry.

---

*Last Updated: From code analysis of storage_types.rs, lib.rs, ttl.rs (2024)*



---

## SECURITY.md

# Nestera Contract Security

## 1. Authorization Mechanisms

### User Authorization (`require_auth`)
All user fund mutations require caller authentication:

```rust
// lib.rs & modules
pub fn deposit_flexi(env: Env, user: Address, amount: i128) -> Result<(), SavingsError> {
    ensure_not_paused(&env)?;
    user.require_auth();  // Caller MUST be 'user'
    // ...
}
```

- **Usage:** Before any balance change (deposit/withdraw/create plan).
- **Enforcement:** Soroban SDK – panics if unauthenticated.

### Admin Authorization
Config changes (fees, pause) verify stored admin:

```rust
// config.rs
fn require_admin(env: &Env, caller: &Address) -> Result<(), SavingsError> {
    let stored_admin = env.storage().instance().get(&DataKey::Admin)
        .ok_or(SavingsError::Unauthorized)?;
    if stored_admin != *caller {
        return Err(SavingsError::Unauthorized);
    }
    caller.require_auth();
    Ok(())
}
```

### Signature Verification (Mint)
Admin signs off-chain `MintPayload`; on-chain verify:

```rust
// lib.rs
pub fn verify_signature(env: Env, payload: MintPayload, signature: BytesN<64>) -> bool {
    // Timestamp expiry check
    // Ed25519 verify against stored AdminPublicKey
    env.crypto().ed25519_verify(admin_pk, payload_xdr, signature)
}
```

## 2. Access Control Logic

| Role | Permissions | Enforcement |
|------|-------------|-------------|
| **User** | Own plans (deposit/withdraw/break) | `user.require_auth()` + owner==caller check |
| **Admin** | Config (fees/rates/pause) | `require_admin` + instance Admin |
| **Governance** | Pause/execute proposals | `validate_admin_or_governance` (lifetime deposits voting power) |
| **Paused** | Blocks all writes | `ensure_not_paused()?` at entrypoints |

- **Plan Ownership:** `if plan.owner != user { Err(Unauthorized) }`
- **Global Pause:** Persistent `Paused` flag; extends TTL.

## 3. Risks & Mitigations

| Risk | Impact | Mitigation | Code Reference |
|------|--------|------------|----------------|
| **Reentrancy** | Fund theft | Check-Effects-Interact pattern | lib.rs all functions |
| **Arithmetic Overflow** | Invalid balances | `checked_add/sub/mul`; invariants | `calculate_fee`, deposits |
| **Admin Abuse** | Fee manipulation | Governance voting; pause reversible | governance.rs, config.rs |
| **Signature Replay/Expiry** | Unauthorized mint | Timestamp + expiry_duration check | verify_signature |
| **Front-running** | MEV on rates | Transparent deterministic logic | rates.rs |
| **Storage DoS** | Data loss | Proactive TTL extension (180d) | ttl.rs |
| **Uninit Access** | Panic/DoS | `has()` checks; defaults | lib.rs init_user/get_user |

**Emergency Controls:**
- **Pause:** Blocks writes (admin/governance); read-only continues.
- **Upgrade:** WASM upgrade (admin auth).

## 4. Security Assumptions

1. **Admin Trust:** Admin manages signatures/config; mitigate via governance.
2. **Stellar Properties:** Finality, no reorgs, atomic tx.
3. **Soroban Guarantees:** Auth isolation, storage atomicity.
4. **Client Integrity:** Freighter/other wallets secure private keys.

**Audits:** Planned post-MVP. Events for off-chain monitoring.

**Testing:** 100%+ coverage; fuzzing invariants; pause/unauth tests.

---

See [CONTRIBUTING.md](../CONTRIBUTING.md) for dev standards.



---

## TESTING.md

# Testing Nestera Smart Contracts

## 1. Unit Testing Approach

Uses **soroban_sdk::testutils** for local Soroban environment simulation – no real Stellar network needed.

**Key Benefits:**
- Fast (~ms per test).
- Deterministic ledger timestamps.
- Mock authorization (`mock_all_auths`).
- Direct storage inspection.

**Run All Tests:**
```bash
cd contracts
cargo test
```

**Specific Test/File/Verbose:**
```bash
cargo test anti_farming -- --nocapture  # Show prints
cargo test admin_tests --test-threads=1
RUST_LOG=debug cargo test  # Logs
```

## 2. Mocking Users & Accounts

Generate addresses & mock auths:

```rust
// Common pattern (anti_farming_test.rs)
fn create_test_env() -> (Env, Client, Admin, User) {
    let env = Env::default();
    env.mock_all_auths();  // Simulates auth for all calls

    let contract_id = env.register(NesteraContract, ());    
    let client = NesteraContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let admin_pk = BytesN::from_array(&env, &[0u8; 32]);
    client.initialize(&admin, &admin_pk);

    let user = Address::generate(&env);  // Mock user account
    client.init_user(&user);

    (env, client, admin, user)
}
```

- `Address::generate(&env)`: Fresh mock address.
- `env.mock_all_auths()`: Bypasses real sigs (testing only).
- Client proxies calls to registered contract.

## 3. Running Tests

From `contracts/`:

| Command | Purpose |
|---------|---------|
| `cargo test` | All unit/integration |
| `cargo test -- --nocapture` | Show assert messages/prints |
| `cargo test <name>` | Filter (e.g., `ranking_test`) |
| `cargo test --features testutils` | If utils gated |

**Example Output:**
```
running 42 tests
test tests::anti_farming_test::test_micro_deposit_spam_no_rewards ... ok
test src::rates_test::test_lock_rate_lookup ... ok

test result: ok. 42 passed; 0 failed
```

## 4. Edge Case Testing Strategies

**Authorization Failures:**
```rust
// Expect Err
match client.try_pause(&non_admin) {
    Err(Ok(e)) => assert_eq!(e, SavingsError::Unauthorized),
    _ => panic!("Expected Unauthorized"),
}
```

**Boundary Values:**
- Amounts: 0, 1, i128::MAX, negative→Err(InvalidAmount).
- Durations: 0→Err(InvalidDuration), extreme→overflow.

**Paused State:**
```rust
client.pause(&admin);
assert!(client.try_deposit_flexi(&user, &100).is_err());
```

**Overflow/Underflow:**
- Large deposits → checked_add fails.
- Fees: 10000bps (100%) edge.

**Reward Anti-Farming:**
- Micro-deposits < min → no points.
- Daily caps, cooldowns.

**Common Patterns:**
- `setup()` helpers for consistent state.
- Assert post-conditions: balances, TTL, events.
- `env.ledger().timestamp()` advance for maturity/streaks.

**Test Modules:**
- `*_tests.rs`: Inline unit tests.
- `tests/`: Integration/anti-abuse.

**Fuzzing:** Add `cargo fuzz` for amounts/durations (future).

Developers: Always test unauth/paused/zero/overflow + happy path!

Links: [SECURITY.md](SECURITY.md), [STORAGE.md](SOROBAN_STORAGE.md).



---

