//! #885 – Security Audit Preparation: Security Tests
//!
//! Exercises every access-control boundary and adversarial input path:
//!   • Unauthorized callers are rejected
//!   • Paused state blocks all writes
//!   • Arithmetic overflow is caught
//!   • Admin-only operations reject non-admins
//!   • Fee manipulation is bounded

#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};
use Nestera::{NesteraContract, NesteraContractClient};

// ── helpers ──────────────────────────────────────────────────────────────────

fn setup() -> (Env, NesteraContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(NesteraContract, ());
    let client = NesteraContractClient::new(&env, &id);
    let admin = Address::generate(&env);
    let pk = BytesN::from_array(&env, &[2u8; 32]);
    client.initialize(&admin, &pk);
    let user = Address::generate(&env);
    client.initialize_user(&user);
    (env, client, admin, user)
}

// ── 1. Admin-only: pause / unpause require admin auth ────────────────────────

#[test]
#[should_panic]
fn security_non_admin_cannot_pause() {
    let (_env, client, _admin, user) = setup();
    // user is not admin – must panic
    client.pause(&user);
}

#[test]
fn security_admin_can_pause_and_unpause() {
    let (_env, client, admin, user) = setup();
    client.pause(&admin);
    // Deposits must fail while paused
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        client.deposit_flexi(&user, &100_000);
    }));
    assert!(result.is_err(), "deposit must panic while paused");

    client.unpause(&admin);
    // Deposits must succeed after unpausing
    client.deposit_flexi(&user, &100_000);
    assert!(client.get_user(&user).total_balance > 0);
}

// ── 2. Admin-only: fee change rejects non-admin ───────────────────────────────

#[test]
#[should_panic]
fn security_non_admin_cannot_set_fee() {
    let (_env, client, _admin, user) = setup();
    // deposit_fee > 10_000 bps to trigger validation error,
    // but more importantly user is not admin
    client.set_fees(&user, &500, &0, &0);
}

// ── 3. Fee > 100% is rejected ─────────────────────────────────────────────────

#[test]
#[should_panic]
fn security_fee_above_10000_bps_rejected() {
    let (_env, client, admin, _user) = setup();
    // 10_001 bps = 100.01% – must be rejected
    client.set_fees(&admin, &10_001, &0, &0);
}

// ── 4. Admin-only: double initialization is rejected ─────────────────────────

#[test]
#[should_panic]
fn security_double_initialize_rejected() {
    let (env, client, admin, _user) = setup();
    let pk2 = BytesN::from_array(&env, &[3u8; 32]);
    client.initialize(&admin, &pk2); // already initialized – must panic
}

// ── 5. Unauthorized user cannot withdraw another user's funds ─────────────────

#[test]
#[should_panic]
fn security_cannot_withdraw_other_users_funds() {
    let (env, client, _admin, user) = setup();
    let attacker = Address::generate(&env);
    client.initialize_user(&attacker);
    client.deposit_flexi(&user, &1_000_000);
    // attacker has 0 flexi balance – overdraft must panic
    client.withdraw_flexi(&attacker, &1_000_000);
}

// ── 6. Overflow: sequential deposits approaching i128::MAX are caught ─────────

#[test]
#[should_panic]
fn security_overflow_on_large_deposits_handled() {
    let (_env, client, _admin, user) = setup();
    // First deposit pushes balance to a large value
    client.deposit_flexi(&user, &i128::MAX);
    // Second deposit must overflow – contract must panic (not silently wrap)
    client.deposit_flexi(&user, &1);
}

// ── 7. Uninitialized user cannot deposit ─────────────────────────────────────

#[test]
#[should_panic]
fn security_uninitialized_user_cannot_deposit() {
    let (env, client, _admin, _user) = setup();
    let ghost = Address::generate(&env);
    // ghost was never initialized with initialize_user
    client.deposit_flexi(&ghost, &100_000);
}

// ── 8. Zero-amount deposit is rejected ───────────────────────────────────────

#[test]
#[should_panic]
fn security_zero_deposit_rejected() {
    let (_env, client, _admin, user) = setup();
    client.deposit_flexi(&user, &0);
}

// ── 9. Negative deposit is rejected ──────────────────────────────────────────

#[test]
#[should_panic]
fn security_negative_deposit_rejected() {
    let (_env, client, _admin, user) = setup();
    client.deposit_flexi(&user, &-1_000_000);
}

// ── 10. Withdraw-more-than-balance rejected ───────────────────────────────────

#[test]
#[should_panic]
fn security_overdraft_rejected() {
    let (_env, client, _admin, user) = setup();
    client.deposit_flexi(&user, &100_000);
    client.withdraw_flexi(&user, &100_001); // 1 stroops more than balance
}

// ── 11. Withdraw zero is rejected ─────────────────────────────────────────────

#[test]
#[should_panic]
fn security_zero_withdraw_rejected() {
    let (_env, client, _admin, user) = setup();
    client.deposit_flexi(&user, &100_000);
    client.withdraw_flexi(&user, &0);
}
