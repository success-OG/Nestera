//! Storage and core logic for staking mechanism (#442).

use super::events::{emit_stake_created, emit_stake_withdrawn, emit_staking_rewards_claimed};
use super::storage_types::{Stake, StakingConfig, StakingDataKey};
use crate::errors::SavingsError;
use soroban_sdk::{Address, Env};

/// Default staking configuration
pub fn default_staking_config() -> StakingConfig {
    StakingConfig {
        min_stake_amount: 100,
        max_stake_amount: 1_000_000_000_000_000,
        reward_rate_bps: 500, // 5% APY
        enabled: true,
        lock_period_seconds: 0, // No lock by default
    }
}

/// Initializes staking configuration (admin only)
pub fn initialize_staking_config(env: &Env, config: StakingConfig) -> Result<(), SavingsError> {
    if env.storage().instance().has(&StakingDataKey::Config) {
        return Err(SavingsError::ConfigAlreadyInitialized);
    }

    env.storage()
        .instance()
        .set(&StakingDataKey::Config, &config);
    env.storage()
        .instance()
        .set(&StakingDataKey::TotalStaked, &0i128);
    env.storage()
        .instance()
        .set(&StakingDataKey::RewardPerToken, &0i128);
    env.storage()
        .instance()
        .set(&StakingDataKey::LastUpdateTime, &0u64);
    env.storage()
        .instance()
        .set(&StakingDataKey::TotalRewardsDistributed, &0i128);

    Ok(())
}

/// Gets the staking configuration
pub fn get_staking_config(env: &Env) -> Result<StakingConfig, SavingsError> {
    env.storage()
        .instance()
        .get(&StakingDataKey::Config)
        .ok_or(SavingsError::InternalError)
}

/// Updates staking configuration (admin only)
pub fn update_staking_config(env: &Env, config: StakingConfig) -> Result<(), SavingsError> {
    env.storage()
        .instance()
        .set(&StakingDataKey::Config, &config);
    Ok(())
}

/// Gets a user's stake
pub fn get_user_stake(env: &Env, user: &Address) -> Stake {
    let key = StakingDataKey::UserStake(user.clone());

    if let Some(stake) = env
        .storage()
        .persistent()
        .get::<StakingDataKey, Stake>(&key)
    {
        env.storage().persistent().extend_ttl(&key, 17280, 17280);
        stake
    } else {
        Stake {
            amount: 0,
            start_time: 0,
            last_update_time: 0,
            reward_per_share: 0,
        }
    }
}

/// Saves a user's stake
pub fn save_user_stake(env: &Env, user: &Address, stake: &Stake) {
    let key = StakingDataKey::UserStake(user.clone());
    env.storage().persistent().set(&key, stake);
    env.storage().persistent().extend_ttl(&key, 17280, 17280);
}

/// Gets total staked amount
pub fn get_total_staked(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&StakingDataKey::TotalStaked)
        .unwrap_or(0)
}

/// Updates total staked amount
pub fn set_total_staked(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StakingDataKey::TotalStaked, &amount);
}

/// Gets reward per token
pub fn get_reward_per_token(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&StakingDataKey::RewardPerToken)
        .unwrap_or(0)
}

/// Updates reward per token
pub fn set_reward_per_token(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StakingDataKey::RewardPerToken, &amount);
}

/// Gets last update time
pub fn get_last_update_time(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&StakingDataKey::LastUpdateTime)
        .unwrap_or(0)
}

/// Updates last update time
pub fn set_last_update_time(env: &Env, time: u64) {
    env.storage()
        .instance()
        .set(&StakingDataKey::LastUpdateTime, &time);
}

/// Gets total rewards distributed
pub fn get_total_rewards_distributed(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&StakingDataKey::TotalRewardsDistributed)
        .unwrap_or(0)
}

/// Updates total rewards distributed
pub fn set_total_rewards_distributed(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StakingDataKey::TotalRewardsDistributed, &amount);
}

/// Calculates pending rewards for a user
pub fn calculate_pending_rewards(env: &Env, user: &Address) -> Result<i128, SavingsError> {
    let stake = get_user_stake(env, user);

    if stake.amount == 0 {
        return Ok(0);
    }

    let reward_per_token = get_reward_per_token(env);
    let reward_delta = reward_per_token
        .checked_sub(stake.reward_per_share)
        .ok_or(SavingsError::Underflow)?;

    let pending_rewards = stake
        .amount
        .checked_mul(reward_delta)
        .ok_or(SavingsError::Overflow)?
        .checked_div(1_000_000_000)
        .ok_or(SavingsError::Overflow)?;

    Ok(pending_rewards)
}

/// Updates reward per token based on time elapsed
pub fn update_rewards(env: &Env) -> Result<(), SavingsError> {
    let config = get_staking_config(env)?;
    let total_staked = get_total_staked(env);
    let now = env.ledger().timestamp();
    let last_update = get_last_update_time(env);

    if total_staked > 0 {
        // For first stake (last_update == 0), use current time as reference

        let time_elapsed = now
            .checked_sub(last_update)
            .ok_or(SavingsError::Underflow)?;

        if time_elapsed > 0 {
            let reward_rate = config.reward_rate_bps as i128;
            let new_rewards = total_staked
                .checked_mul(reward_rate)
                .ok_or(SavingsError::Overflow)?
                .checked_mul(time_elapsed as i128)
                .ok_or(SavingsError::Overflow)?
                .checked_div(10_000 * 365 * 24 * 60 * 60)
                .ok_or(SavingsError::Overflow)?;

            let current_reward_per_token = get_reward_per_token(env);
            let updated_reward_per_token = current_reward_per_token
                .checked_add(new_rewards)
                .ok_or(SavingsError::Overflow)?;

            set_reward_per_token(env, updated_reward_per_token);
        }
    }

    set_last_update_time(env, now);
    Ok(())
}

/// Stakes tokens for a user
pub fn stake(env: &Env, user: Address, amount: i128) -> Result<i128, SavingsError> {
    let config = get_staking_config(env)?;

    if !config.enabled {
        return Err(SavingsError::ContractPaused);
    }

    if amount < config.min_stake_amount {
        return Err(SavingsError::AmountBelowMinimum);
    }

    // Update rewards before modifying stake
    update_rewards(env)?;

    let mut stake = get_user_stake(env, &user);
    let current_reward_per_token = get_reward_per_token(env);

    // Calculate pending rewards before updating stake
    let pending_rewards = if stake.amount > 0 {
        let reward_delta = current_reward_per_token
            .checked_sub(stake.reward_per_share)
            .ok_or(SavingsError::Underflow)?;

        stake
            .amount
            .checked_mul(reward_delta)
            .ok_or(SavingsError::Overflow)?
            .checked_div(1_000_000_000)
            .ok_or(SavingsError::Overflow)?
    } else {
        0
    };

    // Update stake
    stake.amount = stake
        .amount
        .checked_add(amount)
        .ok_or(SavingsError::Overflow)?;

    // Set start_time if this is the first stake
    if stake.start_time == 0 {
        stake.start_time = env.ledger().timestamp();
    }
    stake.last_update_time = env.ledger().timestamp();
    stake.reward_per_share = current_reward_per_token;

    save_user_stake(env, &user, &stake);

    // Update total staked
    let total_staked = get_total_staked(env);
    let new_total_staked = total_staked
        .checked_add(amount)
        .ok_or(SavingsError::Overflow)?;
    set_total_staked(env, new_total_staked);

    // Emit event
    emit_stake_created(env, user, amount, new_total_staked);

    Ok(pending_rewards)
}

/// Unstakes tokens for a user
pub fn unstake(env: &Env, user: Address, amount: i128) -> Result<(i128, i128), SavingsError> {
    let config = get_staking_config(env)?;

    if !config.enabled {
        return Err(SavingsError::ContractPaused);
    }

    // Update rewards before modifying stake
    update_rewards(env)?;

    let mut stake = get_user_stake(env, &user);

    if stake.amount < amount {
        return Err(SavingsError::InsufficientBalance);
    }

    // Check lock period if configured
    if config.lock_period_seconds > 0 {
        let lock_end = stake
            .start_time
            .checked_add(config.lock_period_seconds)
            .ok_or(SavingsError::Overflow)?;

        if env.ledger().timestamp() < lock_end {
            return Err(SavingsError::TooEarly);
        }
    }

    // Calculate pending rewards before updating stake
    let current_reward_per_token = get_reward_per_token(env);
    let reward_delta = current_reward_per_token
        .checked_sub(stake.reward_per_share)
        .ok_or(SavingsError::Underflow)?;

    let pending_rewards = stake
        .amount
        .checked_mul(reward_delta)
        .ok_or(SavingsError::Overflow)?
        .checked_div(1_000_000_000)
        .ok_or(SavingsError::Overflow)?;

    // Update stake
    stake.amount = stake
        .amount
        .checked_sub(amount)
        .ok_or(SavingsError::Underflow)?;

    stake.last_update_time = env.ledger().timestamp();
    stake.reward_per_share = current_reward_per_token;

    save_user_stake(env, &user, &stake);

    // Update total staked
    let total_staked = get_total_staked(env);
    let new_total_staked = total_staked
        .checked_sub(amount)
        .ok_or(SavingsError::Underflow)?;
    set_total_staked(env, new_total_staked);

    // Update total rewards distributed
    let total_rewards = get_total_rewards_distributed(env);
    let new_total_rewards = total_rewards
        .checked_add(pending_rewards)
        .ok_or(SavingsError::Overflow)?;
    set_total_rewards_distributed(env, new_total_rewards);

    // Emit event
    emit_stake_withdrawn(env, user, amount, new_total_staked);

    Ok((amount, pending_rewards))
}

/// Claims staking rewards for a user
pub fn claim_staking_rewards(env: &Env, user: Address) -> Result<i128, SavingsError> {
    // Update rewards before claiming
    update_rewards(env)?;

    let mut stake = get_user_stake(env, &user);

    if stake.amount == 0 {
        return Err(SavingsError::InsufficientBalance);
    }

    // Calculate pending rewards
    let current_reward_per_token = get_reward_per_token(env);
    let reward_delta = current_reward_per_token
        .checked_sub(stake.reward_per_share)
        .ok_or(SavingsError::Underflow)?;

    let pending_rewards = stake
        .amount
        .checked_mul(reward_delta)
        .ok_or(SavingsError::Overflow)?
        .checked_div(1_000_000_000)
        .ok_or(SavingsError::Overflow)?;

    if pending_rewards == 0 {
        return Err(SavingsError::InsufficientBalance);
    }

    // Update stake to reflect claimed rewards
    stake.reward_per_share = current_reward_per_token;
    stake.last_update_time = env.ledger().timestamp();

    save_user_stake(env, &user, &stake);

    // Update total rewards distributed
    let total_rewards = get_total_rewards_distributed(env);
    let new_total_rewards = total_rewards
        .checked_add(pending_rewards)
        .ok_or(SavingsError::Overflow)?;
    set_total_rewards_distributed(env, new_total_rewards);

    // Emit event
    emit_staking_rewards_claimed(env, user, pending_rewards);

    Ok(pending_rewards)
}

/// Gets staking statistics
pub fn get_staking_stats(env: &Env) -> Result<(i128, i128, i128), SavingsError> {
    let total_staked = get_total_staked(env);
    let total_rewards = get_total_rewards_distributed(env);
    let reward_per_token = get_reward_per_token(env);

    Ok((total_staked, total_rewards, reward_per_token))
}
