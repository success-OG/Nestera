use soroban_sdk::{contracttype, Address, Env, Symbol};
use crate::storage_types::DataKey;
use crate::errors::SavingsError;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TimelockProposal {
    pub action: Symbol,
    pub payload: soroban_sdk::Bytes,
    pub eta: u64,
    pub executed: bool,
    pub canceled: bool,
}

pub fn queue_action(env: &Env, admin: Address, action: Symbol, payload: soroban_sdk::Bytes, delay: u64) -> Result<u64, SavingsError> {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(SavingsError::Unauthorized)?;
    if admin != stored_admin {
        return Err(SavingsError::Unauthorized);
    }

    let proposal_id: u64 = env.storage().instance().get(&DataKey::NextTimelockId).unwrap_or(1);
    let eta = env.ledger().timestamp() + delay;

    let proposal = TimelockProposal {
        action,
        payload,
        eta,
        executed: false,
        canceled: false,
    };

    env.storage().persistent().set(&DataKey::TimelockProposal(proposal_id), &proposal);
    env.storage().instance().set(&DataKey::NextTimelockId, &(proposal_id + 1));

    Ok(proposal_id)
}

pub fn execute_action(env: &Env, admin: Address, proposal_id: u64) -> Result<TimelockProposal, SavingsError> {
    admin.require_auth();
    let stored_admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(SavingsError::Unauthorized)?;
    if admin != stored_admin {
        return Err(SavingsError::Unauthorized);
    }

    let mut proposal: TimelockProposal = env.storage().persistent().get(&DataKey::TimelockProposal(proposal_id)).ok_or(SavingsError::InternalError)?;
    
    if proposal.executed || proposal.canceled {
        return Err(SavingsError::InternalError);
    }

    if env.ledger().timestamp() < proposal.eta {
        return Err(SavingsError::TooEarly);
    }

    proposal.executed = true;
    env.storage().persistent().set(&DataKey::TimelockProposal(proposal_id), &proposal);

    Ok(proposal)
}
