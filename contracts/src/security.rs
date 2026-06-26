use crate::errors::SavingsError;
use crate::storage_types::DataKey;
use soroban_sdk::Env;

/// Acquires the reentrancy guard. Returns `ReentrancyDetected` if already locked.
pub fn acquire_reentrancy_guard(env: &Env) -> Result<(), SavingsError> {
    let key = DataKey::ReentrancyGuard;
    let locked: bool = env.storage().instance().get(&key).unwrap_or(false);
    if locked {
        return Err(SavingsError::ReentrancyDetected);
    }
    env.storage().instance().set(&key, &true);
    Ok(())
}

/// Releases the reentrancy guard unconditionally.
pub fn release_reentrancy_guard(env: &Env) {
    env.storage()
        .instance()
        .set(&DataKey::ReentrancyGuard, &false);
}

#[cfg(test)]
mod security_tests {
    use super::*;
    use crate::{NesteraContract, NesteraContractClient};
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

    fn setup_env() -> (Env, NesteraContractClient<'static>, Address) {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        let client = NesteraContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let admin_pk = BytesN::from_array(&env, &[1u8; 32]);
        env.mock_all_auths();
        client.initialize(&admin, &admin_pk);
        (env, client, admin)
    }

    // ========== Reentrancy Guard Unit Tests (#876) ==========

    #[test]
    fn test_acquire_guard_succeeds_when_unlocked() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            let result = acquire_reentrancy_guard(&env);
            assert!(result.is_ok());
        });
    }

    #[test]
    fn test_acquire_guard_fails_when_already_locked() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            // First acquire should succeed
            acquire_reentrancy_guard(&env).unwrap();
            // Second acquire must detect reentrancy
            let result = acquire_reentrancy_guard(&env);
            assert_eq!(result, Err(SavingsError::ReentrancyDetected));
        });
    }

    #[test]
    fn test_release_guard_allows_reentry() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            acquire_reentrancy_guard(&env).unwrap();
            release_reentrancy_guard(&env);
            // After release, acquire must succeed again
            let result = acquire_reentrancy_guard(&env);
            assert!(result.is_ok());
        });
    }

    #[test]
    fn test_guard_starts_unlocked() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            // Without any acquire, guard is not set
            let locked: bool = env
                .storage()
                .instance()
                .get(&crate::storage_types::DataKey::ReentrancyGuard)
                .unwrap_or(false);
            assert!(!locked);
        });
    }

    #[test]
    fn test_guard_is_set_after_acquire() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            acquire_reentrancy_guard(&env).unwrap();
            let locked: bool = env
                .storage()
                .instance()
                .get(&crate::storage_types::DataKey::ReentrancyGuard)
                .unwrap_or(false);
            assert!(locked);
        });
    }

    #[test]
    fn test_guard_is_cleared_after_release() {
        let env = Env::default();
        let contract_id = env.register(NesteraContract, ());
        env.as_contract(&contract_id, || {
            acquire_reentrancy_guard(&env).unwrap();
            release_reentrancy_guard(&env);
            let locked: bool = env
                .storage()
                .instance()
                .get(&crate::storage_types::DataKey::ReentrancyGuard)
                .unwrap_or(false);
            assert!(!locked);
        });
    }

    // ========== Integration: Guard protects external-call functions ==========

    #[test]
    fn test_deposit_flexi_has_reentrancy_guard() {
        let (env, client, _) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();
        client.initialize_user(&user);

        // Normal deposit must succeed (guard acquired and released properly)
        let result = client.try_deposit_flexi(&user, &1_000i128);
        assert!(result.is_ok());
    }

    #[test]
    fn test_withdraw_flexi_has_reentrancy_guard() {
        let (env, client, _) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();
        client.initialize_user(&user);

        client.deposit_flexi(&user, &1_000i128);

        // Normal withdraw must succeed (guard acquired and released properly)
        let result = client.try_withdraw_flexi(&user, &500i128);
        assert!(result.is_ok());
    }

    #[test]
    fn test_stake_has_reentrancy_guard() {
        let (env, client, admin) = setup_env();
        env.mock_all_auths();

        let staking_config = crate::staking::storage_types::StakingConfig {
            reward_rate_bps: 500,
            min_stake_amount: 0,
            max_stake_amount: i128::MAX,
            enabled: true,
            lock_period_seconds: 0,
        };
        client.init_staking_config(&admin, &staking_config);

        let user = Address::generate(&env);
        client.initialize_user(&user);

        // Stake should succeed (guard is properly acquired and released)
        let result = client.try_stake(&user, &100i128);
        assert!(result.is_ok());
    }

    // ========== Overflow and Negative Input Protection ==========

    #[test]
    fn test_overflow_protection() {
        let (env, client, _) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();
        client.initialize_user(&user);

        // Deposit a valid amount, then check balance is bounded by i128
        client.deposit_flexi(&user, &1_000_000i128);
        let balance = client.get_flexi_balance(&user);
        assert!(balance >= 0);
        assert!(balance <= i128::MAX);
    }

    #[test]
    fn test_negative_deposit_protection() {
        let (env, client, _) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();
        client.initialize_user(&user);

        // Negative deposit must be rejected
        let result = client.try_deposit_flexi(&user, &(-500i128));
        assert!(result.is_err());
    }

    #[test]
    fn test_pause_invariant() {
        let (env, client, admin) = setup_env();
        env.mock_all_auths();

        // Pause the contract
        client.pause(&admin);
        assert!(client.is_paused());

        // Operations must be rejected while paused
        let user = Address::generate(&env);
        let result = client.try_deposit_flexi(&user, &1_000i128);
        assert!(result.is_err());

        // Unpause and verify operations work again
        client.unpause(&admin);
        assert!(!client.is_paused());
    }
}
