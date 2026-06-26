use soroban_sdk::{contracterror, contracttype, Address, BytesN, Env, Vec};

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MultiSigError {
    Unauthorized = 1,
    NotEnoughSignatures = 2,
    InvalidSigners = 3,
    ProposalNotFound = 4,
    AlreadyExecuted = 5,
    InvalidThreshold = 6,
    DuplicateSignature = 7,
    ProposalExpired = 8,
}

/// Represents a multi-sig configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultiSigConfig {
    pub signers: Vec<Address>,
    pub threshold: u32,
    pub expiration_period: u64,
}

/// Represents a multi-sig proposal
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultiSigProposal {
    pub id: u64,
    pub creator: Address,
    pub description: String,
    pub action: MultiSigAction,
    pub created_at: u64,
    pub executed: bool,
    pub signatures: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MultiSigAction {
    SetAdmin(Address),
    SetTreasury(Address),
    SetRewardToken(Address),
    Upgrade(BytesN<32>),
    PauseContract,
    UnpauseContract,
    SetFlexiRate(i128),
    SetGoalRate(i128),
    SetGroupRate(i128),
    Custom(Vec<u8>),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MultiSigKey {
    Config,
    NextProposalId,
    Proposal(u64),
    AllProposals,
    SignerApproved(u64, Address),
}

fn get_config(env: &Env) -> Option<MultiSigConfig> {
    env.storage().persistent().get(&MultiSigKey::Config)
}

fn require_config(env: &Env) -> Result<MultiSigConfig, MultiSigError> {
    get_config(env).ok_or(MultiSigError::NotEnoughSignatures)
}

pub fn is_signer(env: &Env, signer: &Address) -> bool {
    if let Some(config) = get_config(env) {
        for s in config.signers.iter() {
            if s == *signer {
                return true;
            }
        }
    }
    false
}

pub fn initialize_multisig(
    env: &Env,
    admin: Address,
    signers: Vec<Address>,
    threshold: u32,
    expiration_period: u64,
) -> Result<(), MultiSigError> {
    admin.require_auth();
    
    if signers.len() < 2 {
        return Err(MultiSigError::InvalidSigners);
    }
    if threshold as usize > signers.len() || threshold < 2 {
        return Err(MultiSigError::InvalidThreshold);
    }
    
    let config = MultiSigConfig {
        signers,
        threshold,
        expiration_period,
    };
    
    env.storage()
        .persistent()
        .set(&MultiSigKey::Config, &config);
    env.storage()
        .persistent()
        .set(&MultiSigKey::NextProposalId, &1u64);
    
    Ok(())
}

pub fn get_next_proposal_id(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get(&MultiSigKey::NextProposalId)
        .unwrap_or(1)
}

pub fn create_proposal(
    env: &Env,
    creator: Address,
    description: String,
    action: MultiSigAction,
) -> Result<u64, MultiSigError> {
    let config = require_config(env)?;
    
    if !is_signer(env, &creator) {
        return Err(MultiSigError::Unauthorized);
    }
    creator.require_auth();
    
    let proposal_id = get_next_proposal_id(env);
    let now = env.ledger().timestamp();
    
    let proposal = MultiSigProposal {
        id: proposal_id,
        creator: creator.clone(),
        description,
        action,
        created_at: now,
        executed: false,
        signatures: Vec::new(env),
    };
    
    let key = MultiSigKey::Proposal(proposal_id);
    env.storage().persistent().set(&key, &proposal);
    
    // Track all proposals
    let mut all_proposals: Vec<u64> = env
        .storage()
        .persistent()
        .get(&MultiSigKey::AllProposals)
        .unwrap_or(Vec::new(env));
    all_proposals.push_back(proposal_id);
    env.storage()
        .persistent()
        .set(&MultiSigKey::AllProposals, &all_proposals);
    
    // Update next proposal ID
    env.storage()
        .persistent()
        .set(&MultiSigKey::NextProposalId, &(proposal_id + 1));
    
    Ok(proposal_id)
}

pub fn get_proposal(env: &Env, proposal_id: u64) -> Option<MultiSigProposal> {
    env.storage()
        .persistent()
        .get(&MultiSigKey::Proposal(proposal_id))
}

pub fn sign_proposal(env: &Env, signer: Address, proposal_id: u64) -> Result<(), MultiSigError> {
    let config = require_config(env)?;
    
    if !is_signer(env, &signer) {
        return Err(MultiSigError::Unauthorized);
    }
    signer.require_auth();
    
    let key = MultiSigKey::Proposal(proposal_id);
    let mut proposal: MultiSigProposal = get_proposal(env, proposal_id)
        .ok_or(MultiSigError::ProposalNotFound)?;
    
    if proposal.executed {
        return Err(MultiSigError::AlreadyExecuted);
    }
    
    let now = env.ledger().timestamp();
    if now > proposal.created_at + config.expiration_period {
        return Err(MultiSigError::ProposalExpired);
    }
    
    // Check duplicate signature
    let signer_key = MultiSigKey::SignerApproved(proposal_id, signer.clone());
    if env.storage().persistent().has(&signer_key) {
        return Err(MultiSigError::DuplicateSignature);
    }
    
    // Add signature
    proposal.signatures.push_back(signer.clone());
    env.storage().persistent().set(&key, &proposal);
    env.storage().persistent().set(&signer_key, &true);
    
    Ok(())
}

pub fn execute_proposal(env: &Env, proposal_id: u64) -> Result<MultiSigAction, MultiSigError> {
    let config = require_config(env)?;
    
    let key = MultiSigKey::Proposal(proposal_id);
    let mut proposal: MultiSigProposal = get_proposal(env, proposal_id)
        .ok_or(MultiSigError::ProposalNotFound)?;
    
    if proposal.executed {
        return Err(MultiSigError::AlreadyExecuted);
    }
    
    if proposal.signatures.len() < config.threshold as usize {
        return Err(MultiSigError::NotEnoughSignatures);
    }
    
    proposal.executed = true;
    env.storage().persistent().set(&key, &proposal);
    
    Ok(proposal.action)
}

pub fn get_proposal_signatures(env: &Env, proposal_id: u64) -> Vec<Address> {
    get_proposal(env, proposal_id)
        .map(|p| p.signatures)
        .unwrap_or(Vec::new(env))
}

pub fn get_signers(env: &Env) -> Vec<Address> {
    get_config(env).map(|c| c.signers).unwrap_or(Vec::new(env))
}

pub fn get_threshold(env: &Env) -> u32 {
    get_config(env).map(|c| c.threshold).unwrap_or(0)
}

pub fn is_multisig_active(env: &Env) -> bool {
    get_config(env).is_some()
}