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
