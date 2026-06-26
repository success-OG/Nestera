use crate::errors::SavingsError;
use crate::storage_types::DataKey;
use soroban_sdk::{symbol_short, Address, Env, Symbol, Vec};

// ── Role constants ────────────────────────────────────────────────────────────
// Use symbol_short! (≤8 chars) so they fit a Soroban Symbol.

/// Can configure fees, rates, treasury, and grant/revoke roles.
pub fn role_admin() -> Symbol {
    symbol_short!("admin")
}

/// Can execute day-to-day protocol operations (autosave execution, etc.).
pub fn role_operator() -> Symbol {
    symbol_short!("operator")
}

/// Can pause and unpause the contract.
pub fn role_pauser() -> Symbol {
    symbol_short!("pauser")
}

/// Can manage treasury withdrawals and allocations.
pub fn role_treasury() -> Symbol {
    symbol_short!("treasury")
}

// ── Core checks ───────────────────────────────────────────────────────────────

/// Returns `true` if `account` holds `role`.
pub fn has_role(env: &Env, role: &Symbol, account: &Address) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::HasRole(role.clone(), account.clone()))
        .unwrap_or(false)
}

/// Returns `Ok(())` if `account` holds `role`, otherwise `Err(Unauthorized)`.
pub fn require_role(env: &Env, role: &Symbol, account: &Address) -> Result<(), SavingsError> {
    if has_role(env, role, account) {
        Ok(())
    } else {
        Err(SavingsError::Unauthorized)
    }
}

/// Returns `Ok(())` if `account` is the stored admin OR holds the admin role.
pub fn require_admin_or_role(
    env: &Env,
    role: &Symbol,
    account: &Address,
) -> Result<(), SavingsError> {
    let stored_admin: Option<Address> = env.storage().instance().get(&DataKey::Admin);
    let is_stored_admin = stored_admin.as_ref().map_or(false, |a| a == account);
    if is_stored_admin || has_role(env, role, account) {
        Ok(())
    } else {
        Err(SavingsError::Unauthorized)
    }
}

// ── Management functions ──────────────────────────────────────────────────────

/// Grants `role` to `account`. Only callable by the stored admin.
///
/// Emits a `role_grant` event on success.
pub fn grant_role(
    env: &Env,
    caller: &Address,
    role: &Symbol,
    account: &Address,
) -> Result<(), SavingsError> {
    caller.require_auth();
    require_stored_admin(env, caller)?;

    env.storage()
        .instance()
        .set(&DataKey::HasRole(role.clone(), account.clone()), &true);

    // Maintain member list
    let mut members = get_role_members(env, role);
    let already_listed = (0..members.len()).any(|i| members.get(i).as_ref() == Some(account));
    if !already_listed {
        members.push_back(account.clone());
        env.storage()
            .instance()
            .set(&DataKey::RoleMembers(role.clone()), &members);
    }

    env.events().publish(
        (symbol_short!("role_grnt"), caller.clone(), account.clone()),
        role.clone(),
    );
    Ok(())
}

/// Revokes `role` from `account`. Only callable by the stored admin.
///
/// Emits a `role_revk` event on success.
pub fn revoke_role(
    env: &Env,
    caller: &Address,
    role: &Symbol,
    account: &Address,
) -> Result<(), SavingsError> {
    caller.require_auth();
    require_stored_admin(env, caller)?;

    env.storage()
        .instance()
        .remove(&DataKey::HasRole(role.clone(), account.clone()));

    // Remove from member list
    let members = get_role_members(env, role);
    let mut new_members = Vec::new(env);
    for i in 0..members.len() {
        if let Some(m) = members.get(i) {
            if m != *account {
                new_members.push_back(m);
            }
        }
    }
    env.storage()
        .instance()
        .set(&DataKey::RoleMembers(role.clone()), &new_members);

    env.events().publish(
        (symbol_short!("role_revk"), caller.clone(), account.clone()),
        role.clone(),
    );
    Ok(())
}

/// Returns all addresses that currently hold `role`.
pub fn get_role_members(env: &Env, role: &Symbol) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::RoleMembers(role.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn require_stored_admin(env: &Env, caller: &Address) -> Result<(), SavingsError> {
    let stored: Address = env
        .storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(SavingsError::Unauthorized)?;
    if stored != *caller {
        return Err(SavingsError::Unauthorized);
    }
    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
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

    // ── Role grant / revoke ────────────────────────────────────────────────────

    #[test]
    fn test_grant_role_by_admin() {
        let (env, client, admin) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_operator(), &user);
        assert!(client.has_role(&role_operator(), &user));
    }

    #[test]
    fn test_revoke_role_by_admin() {
        let (env, client, admin) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_operator(), &user);
        assert!(client.has_role(&role_operator(), &user));

        client.revoke_role(&admin, &role_operator(), &user);
        assert!(!client.has_role(&role_operator(), &user));
    }

    #[test]
    fn test_grant_role_non_admin_fails() {
        let (env, client, _admin) = setup_env();
        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);
        env.mock_all_auths();

        // attacker (not stored admin) tries to grant roles – must fail
        let result = client.try_grant_role(&attacker, &role_operator(), &victim);
        assert!(result.is_err());
    }

    #[test]
    fn test_revoke_role_non_admin_fails() {
        let (env, client, admin) = setup_env();
        let user = Address::generate(&env);
        let attacker = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_operator(), &user);

        let result = client.try_revoke_role(&attacker, &role_operator(), &user);
        assert!(result.is_err());
    }

    // ── Role checks ───────────────────────────────────────────────────────────

    #[test]
    fn test_has_role_returns_false_for_ungranted() {
        let (env, client, _admin) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();

        assert!(!client.has_role(&role_operator(), &user));
    }

    #[test]
    fn test_get_role_members_empty_initially() {
        let (env, client, _admin) = setup_env();
        env.mock_all_auths();

        let members = client.get_role_members(&role_pauser());
        assert_eq!(members.len(), 0);
    }

    #[test]
    fn test_get_role_members_tracks_grants() {
        let (env, client, admin) = setup_env();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_pauser(), &user1);
        client.grant_role(&admin, &role_pauser(), &user2);

        let members = client.get_role_members(&role_pauser());
        assert_eq!(members.len(), 2);
    }

    #[test]
    fn test_get_role_members_excludes_revoked() {
        let (env, client, admin) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_treasury(), &user);
        client.revoke_role(&admin, &role_treasury(), &user);

        let members = client.get_role_members(&role_treasury());
        assert_eq!(members.len(), 0);
    }

    // ── Role-protected operations ─────────────────────────────────────────────

    #[test]
    fn test_pauser_role_can_pause_contract() {
        let (env, client, admin) = setup_env();
        let pauser = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_pauser(), &pauser);
        assert!(client.has_role(&role_pauser(), &pauser));

        // Pauser can pause via governance check (admin or governance accepted)
        client.pause(&pauser);
        assert!(client.is_paused());
    }

    #[test]
    fn test_multiple_roles_independent() {
        let (env, client, admin) = setup_env();
        let user = Address::generate(&env);
        env.mock_all_auths();

        client.grant_role(&admin, &role_operator(), &user);

        // User has operator but not pauser
        assert!(client.has_role(&role_operator(), &user));
        assert!(!client.has_role(&role_pauser(), &user));
        assert!(!client.has_role(&role_treasury(), &user));
    }
}
