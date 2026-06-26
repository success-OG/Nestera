use soroban_sdk::{contractevent, Address, BytesN, Symbol};

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProtocolEvent {
    // Core
    Init(BytesN<32>),
    CreatePlan(Address, u64, i128),
    SetAdmin(Address),
    SetEarlyBreakFee(u32),
    SetFeeRecipient(Address),
    Pause(Address),
    Unpause(Address),
    EmergencyWithdraw(Address, u64, i128),
    
    // Config
    CfgInit(u32),
    SetTreasury(Address),
    SetFees(u32),
    CfgPause(Address),
    CfgUnpause(Address),
    
    // Staking
    Stake(Address, i128, i128),
    Unstake(Address, i128, i128),
    StakeRewards(Address, i128),
    
    // Treasury
    FeeCollected(Symbol, i128),
    YieldDistributed(i128, i128),
    TreasuryWithdrawn(Address, Symbol, i128),
    ReserveUsed(Address, i128),
    TreasuryAllocated(Address, i128, i128, i128),
    LimitsUpdated(i128, i128),
    
    // Rewards
    PointsAwarded(Address, i128),
    BonusAwarded(Address, i128, Symbol),
    PointsRedeemed(Address, i128),
    RewardsClaimed(Address, i128),
    StreakUpdated(Address, u32),
    
    // Governance
    GovCreated(u64, Address),
    GovVoted(u64, Address, u32, i128),
    GovQueued(u64, u64),
    GovExecuted(u64, u64),
    GovCanceled(u64, u64),
    
    // Token
    Mint(Address, i128),
    Burn(Address, i128),
    
    // Goal
    GoalCreated(Address, Symbol, i128, u64),
    GoalDeposit(Address, u64, i128),
    GoalWithdraw(Address, u64, i128),
    GoalBreak(Address, u64, i128),
    GoalFee(Address, u64, i128, Symbol),
    
    // Flexi
    FlexiDeposit(Address, i128),
    FlexiWithdraw(Address, i128),
    FlexiFee(Address, i128, Symbol),
    
    // Group
    GroupCreated(Address, Symbol, i128, u64),
    GroupJoin(Address, u64),
    GroupContribute(Address, u64, i128),
    GroupBreak(Address, u64),
    GroupFee(Address, u64, i128),
    
    // Lock
    LockCreated(Address, i128, u64, u64),
    LockWithdraw(Address, u64, i128),
    
    // Strategy
    StratRegistered(Address),
    StratDisabled(Address),
    StratDeposit(Address, i128, i128),
    StratWithdraw(Address, i128, i128),
    StratHarvest(Address, i128, i128, i128),
    StratYieldDistributed(Address, i128, i128, i128),

    // Security
    UpgradeScheduled(Address, BytesN<32>),
    ContractUpgraded(BytesN<32>),
    TimelockQueued(u64, Address, Symbol),
    TimelockExecuted(u64, Address, Symbol),
}
