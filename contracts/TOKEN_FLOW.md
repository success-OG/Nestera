# Token Flow in Nestera

This document explains how tokens (USDC or any Stellar asset) move through the Nestera protocol — from a user's wallet into the contract, how funds are held, and how they flow back out.

---

## Stellar-Specific Concepts

Before diving into flows, a few Stellar fundamentals that affect how Nestera works.

### Trustlines

On Stellar, an account cannot hold a token it hasn't explicitly opted into. A **trustline** is that opt-in — it tells the network "this account is willing to hold this asset."

- Every user wallet must have a trustline to USDC (or whichever token they want to deposit) before interacting with Nestera.
- The Nestera contract account itself must also have a trustline to any token it holds on behalf of users.
- Without a trustline, any token transfer will fail at the network level, before the contract even executes.

To establish a trustline via Stellar CLI:
```bash
stellar contract invoke \
  --id <USDC_CONTRACT_ID> \
  --source <USER_ACCOUNT> \
  --network testnet \
  -- set_trustline \
  --account <USER_ADDRESS>
```

Or via the Stellar SDK (JavaScript):
```js
const trustlineOp = StellarSdk.Operation.changeTrust({
  asset: new StellarSdk.Asset('USDC', USDC_ISSUER),
  limit: '1000000',
});
```

### Soroban Token Interface

Nestera is built on Soroban (Stellar's smart contract platform). Token transfers on Soroban use the **SEP-41 token interface** — a standard interface that USDC and other Stellar tokens implement. The key calls are:

- `transfer(from, to, amount)` — moves tokens between addresses
- `balance(address)` — reads a token balance
- `approve(from, spender, amount, expiry)` — grants a contract permission to spend on behalf of a user

### Ledger Entries and TTL

Soroban stores data in **ledger entries** with a Time-To-Live (TTL). Nestera actively extends TTLs on every read/write to prevent user data from expiring. If a ledger entry expires, the data is gone — so TTL management is critical for fund safety.

### Authorization Model

Soroban uses `require_auth()` rather than `msg.sender`. Every state-changing function in Nestera calls `user.require_auth()`, which means the user's Stellar account must have signed the transaction. There is no way to move funds without the owner's explicit signature.

---

## How Nestera Holds Funds

Nestera does **not** use a separate vault contract or escrow. Instead:

- Token balances are tracked **internally in contract storage** as `i128` integers.
- The actual tokens are held by the **Nestera contract account** on the Stellar network.
- When a user deposits, they transfer tokens to the contract address. The contract records the credit in its persistent storage.
- When a user withdraws, the contract transfers tokens from its own account back to the user.

This means the contract address must hold a trustline for every supported token, and the contract's on-chain token balance must always be ≥ the sum of all user balances it tracks internally.

---

## Deposit Flow

### 1. User Registers

Before depositing, a user must be registered:

```
User calls: init_user(user: Address)
  → Contract creates User { total_balance: 0, savings_count: 0 }
  → Stored at DataKey::User(user_address)
```

### 2. Token Approval (off-chain, before deposit)

The user must approve the Nestera contract to spend their tokens. This is done via the token contract directly, not through Nestera:

```
User calls on USDC contract: approve(from: user, spender: nestera_contract, amount, expiry)
```

### 3. Deposit Call

The user calls a deposit function (e.g. `deposit_flexi`). The contract:

1. Calls `user.require_auth()` — verifies the user signed the transaction
2. Validates the amount is > 0
3. Calculates the protocol fee: `fee = floor(amount × fee_bps / 10_000)`
4. Computes the net amount: `net = amount - fee`
5. Calls the USDC token contract: `transfer(user, nestera_contract, amount)`
6. Updates internal storage:
   - `DataKey::FlexiBalance(user)` += net
   - `DataKey::User(user).total_balance` += net
7. If fee > 0, credits the fee recipient's internal balance and records it in the treasury struct
8. Awards reward points

```
User wallet ──[USDC transfer]──► Nestera contract account
                                        │
                              Internal storage update:
                              FlexiBalance(user) += net_amount
                              Treasury.total_fees += fee_amount
```

### Fee Calculation

Fees are in **basis points** (bps). 100 bps = 1%.

```
deposit_amount = 10,000 USDC
deposit_fee_bps = 50  (0.5%)
fee = floor(10,000 × 50 / 10,000) = 50 USDC
net_credited = 9,950 USDC
```

Fees always round **down** (floor division), protecting users from rounding up.

---

## How Funds Are Held Per Plan Type

### Flexi Save

Balances are stored directly in contract persistent storage:

```
DataKey::FlexiBalance(user_address) → i128
DataKey::User(user_address) → User { total_balance, savings_count }
```

No lock. The user can withdraw at any time.

### Lock Save

A `LockSave` struct is stored per plan:

```
DataKey::LockSave(lock_id) → LockSave {
    id, owner, amount, interest_rate,
    start_time, maturity_time, is_withdrawn
}
DataKey::UserLockSaves(user) → Vec<u64>  // list of lock IDs
```

The `amount` is also added to `User.total_balance`. Funds cannot be withdrawn until `ledger.timestamp() >= maturity_time`.

### Goal Save

```
DataKey::GoalSave(goal_id) → GoalSave {
    id, owner, goal_name, target_amount, current_amount,
    interest_rate, start_time, is_completed, is_withdrawn
}
DataKey::UserGoalSaves(user) → Vec<u64>
```

`current_amount` grows with each deposit (net of fees). The plan is marked `is_completed` when `current_amount >= target_amount`.

### Group Save

```
DataKey::GroupSave(group_id) → GroupSave {
    id, creator, title, target_amount, current_amount,
    member_count, is_completed, ...
}
DataKey::GroupMemberContribution(group_id, user) → i128
DataKey::GroupMembers(group_id) → Vec<Address>
```

Each member's contribution is tracked individually. The group's `current_amount` is the sum of all contributions.

---

## Withdrawal Flow

### Flexi Withdrawal

```
User calls: withdraw_flexi(user, amount)

1. require_auth(user)
2. Check FlexiBalance(user) >= amount
3. fee = floor(amount × withdrawal_fee_bps / 10_000)
4. net = amount - fee
5. FlexiBalance(user) -= amount
6. User.total_balance -= amount
7. Fee credited to fee recipient internal balance
8. Token transfer: nestera_contract ──[USDC]──► user wallet (net amount)
```

### Lock Save Withdrawal

```
User calls: withdraw_lock_save(user, lock_id)

1. require_auth(user)
2. Verify lock_save.owner == user
3. Verify is_withdrawn == false
4. Verify ledger.timestamp() >= maturity_time  (else: TooEarly error)
5. Calculate final_amount = principal + accrued_yield
   (simple interest: amount × (1 + rate × duration_years))
6. Mark lock_save.is_withdrawn = true
7. User.total_balance -= lock_save.amount
8. Token transfer: nestera_contract ──[USDC]──► user wallet (final_amount)
```

### Goal Save Withdrawal (completed)

```
User calls: withdraw_completed_goal_save(user, goal_id)

1. require_auth(user)
2. Verify goal_save.is_completed == true  (else: TooEarly)
3. Verify goal_save.is_withdrawn == false
4. fee = floor(current_amount × withdrawal_fee_bps / 10_000)
5. net = current_amount - fee
6. Mark goal_save.is_withdrawn = true
7. User.total_balance += net
8. Fee credited to fee recipient
9. Token transfer: nestera_contract ──[USDC]──► user wallet (net)
```

### Goal Save Early Break

```
User calls: break_goal_save(user, goal_id)

1. require_auth(user)
2. Verify goal is NOT completed
3. early_break_fee = floor(current_amount × early_break_fee_bps / 10_000)
4. net = current_amount - early_break_fee
5. Mark goal_save.is_withdrawn = true
6. Fee credited to fee recipient
7. Token transfer: nestera_contract ──[USDC]──► user wallet (net)
```

---

## Fee Flow

Every deposit and withdrawal generates a protocol fee. Here is where it goes:

```
User deposit (10,000 USDC, 0.5% fee)
  │
  ├── 9,950 USDC → credited to user's internal balance
  └── 50 USDC → DataKey::TotalBalance(fee_recipient) += 50
                 Treasury.total_fees_collected += 50
                 Treasury.treasury_balance += 50
```

The fee stays inside the contract as an internal accounting entry. The admin can later:

1. **Allocate** it into sub-pools via `allocate_treasury(reserve_%, rewards_%, operations_%)`
2. **Withdraw** from a pool via `withdraw_treasury(pool, amount)` — subject to per-tx and daily caps

```
Treasury.treasury_balance (unallocated)
    │
    ├── allocate_treasury(4000, 3000, 3000)
    │
    ├── Reserve pool  (40%)
    ├── Rewards pool  (30%)
    └── Operations pool (30%)
```

---

## Yield Strategy Flow

For Lock and Group Save plans, funds can optionally be routed to an external yield strategy contract.

```
Admin calls: route_lock_to_strategy(lock_id, strategy_address, amount)

1. Validate strategy is registered and enabled
2. Record StrategyPosition in storage (CEI pattern — state before external call)
3. Call strategy_contract.strategy_deposit(nestera_address, amount)
   → Tokens move: nestera_contract ──[USDC]──► strategy_contract
4. Strategy returns shares received
5. StrategyPosition.strategy_shares updated

Later: harvest_strategy(strategy_address)

1. Call strategy_contract.strategy_balance(nestera_address)
2. profit = strategy_balance - recorded_principal
3. Call strategy_contract.strategy_harvest(nestera_address)
   → Yield tokens move: strategy_contract ──[USDC]──► nestera_contract
4. treasury_fee = floor(profit × performance_fee_bps / 10_000)
5. user_yield = profit - treasury_fee
6. Treasury.total_fees += treasury_fee
7. Treasury.total_yield_earned += user_yield
8. StrategyYield(strategy_address) += user_yield
```

---

## Complete Token Flow Diagram

```
                        ┌─────────────────────────────────────────┐
                        │           Nestera Contract               │
                        │                                          │
User Wallet             │  Internal Storage                        │
    │                   │  ┌──────────────────────────────────┐   │
    │  USDC transfer ──►│  │ FlexiBalance(user)               │   │
    │  (deposit)        │  │ LockSave(id)                     │   │
    │                   │  │ GoalSave(id)                     │   │
    │                   │  │ GroupSave(id)                    │   │
    │                   │  │ Treasury { fees, yield, pools }  │   │
    │                   │  └──────────────────────────────────┘   │
    │                   │                   │                      │
    │                   │                   │ (optional)           │
    │                   │                   ▼                      │
    │                   │  ┌──────────────────────────────────┐   │
    │                   │  │     Yield Strategy Contract       │   │
    │                   │  │  strategy_deposit / harvest       │   │
    │                   │  └──────────────────────────────────┘   │
    │                   │                                          │
    │◄── USDC transfer ─│  (withdrawal: net amount after fees)    │
    │    (withdrawal)   │                                          │
    │                   └─────────────────────────────────────────┘
    │
    │  Fee portion ──────────────────────────────────────────────►
                                                    Treasury Address
                                                    (fee_recipient)
```

---

## Key Invariants

- `contract_token_balance >= sum(all user internal balances)` — the contract never owes more than it holds
- All arithmetic uses **checked math** (`checked_add`, `checked_sub`, `checked_mul`) — overflow/underflow panics rather than silently wrapping
- Fees always round **down** — users are never charged more than the stated rate
- A **reentrancy guard** (`DataKey::ReentrancyGuard`) prevents re-entrant calls during external strategy interactions
- The contract can be **paused** by admin or governance — all state-changing functions check `require_not_paused()` before executing
- **Emergency withdraw** allows admin to force-exit any plan and disable the associated strategy if a vulnerability is detected

---

## Trustline Checklist

Before a user can interact with Nestera:

- [ ] User wallet has a trustline to the deposit token (e.g. USDC)
- [ ] Nestera contract account has a trustline to the deposit token
- [ ] User has approved the Nestera contract to spend their tokens (via the token contract's `approve` function)
- [ ] User account is registered via `init_user` or `initialize_user`

If any of these are missing, the deposit transaction will fail — either at the Stellar network layer (missing trustline) or at the contract layer (user not found / insufficient allowance).
