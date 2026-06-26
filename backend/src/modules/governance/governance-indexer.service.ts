import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote, VoteDirection } from './entities/vote.entity';
import { Delegation } from './entities/delegation.entity';

/**
 * Minimal ABI fragments for the DAO contract events we care about.
 */
const DAO_ABI_FRAGMENTS = [
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startBlock, uint256 endBlock)',
  'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)',
  'event DelegationUpdated(address indexed delegator, address indexed delegate)',
  'event ProposalStatusChanged(uint256 indexed proposalId, uint8 status)',
];

@Injectable()
export class GovernanceIndexerService implements OnModuleInit {
  private readonly logger = new Logger(GovernanceIndexerService.name);
  private contract: any; // ethers.Contract
  private provider: any; // ethers.JsonRpcProvider

  constructor(
    @InjectRepository(GovernanceProposal)
    private readonly proposalRepo: Repository<GovernanceProposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    @InjectRepository(Delegation)
    private readonly delegationRepo: Repository<Delegation>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.initIndexer();
  }

  private initIndexer(): void {
    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.DAO_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      this.logger.warn(
        'RPC_URL or DAO_CONTRACT_ADDRESS not set — governance indexer will not start.',
      );
      return;
    }

    // TODO: Implement ethers integration when ethers package is added
    this.logger.log(
      `Governance indexer listening on contract ${contractAddress}`,
    );
  }

  /**
   * Handles the ProposalCreated event.
   */
  async handleProposalCreated(
    proposalId: bigint,
    proposer: string,
    description: string,
    startBlock: bigint,
    endBlock: bigint,
  ): Promise<void> {
    const onChainId = Number(proposalId);

    const existing = await this.proposalRepo.findOneBy({ onChainId });
    if (existing) {
      this.logger.debug(`Proposal ${onChainId} already indexed — skipping.`);
      return;
    }

    // Extract title from description (first line or first 100 chars)
    const title =
      description.split('\n')[0].substring(0, 100) || `Proposal #${onChainId}`;

    const proposal = this.proposalRepo.create({
      onChainId,
      proposer,
      title,
      description,
      status: ProposalStatus.ACTIVE,
      startBlock: Number(startBlock),
      endBlock: Number(endBlock),
    });

    await this.proposalRepo.save(proposal);
    this.logger.log(`Indexed new proposal onChainId=${onChainId}`);

    // Emit event for notifications
    this.eventEmitter.emit('governance.proposal.created', {
      proposalId: proposal.id,
      onChainId,
      proposer,
      title: description.slice(0, 50), // Fallback title
    });
  }

  /**
   * Handles the VoteCast event.
   */
  async handleVoteCast(
    voter: string,
    proposalId: bigint,
    support: number,
    weight: bigint,
  ): Promise<void> {
    const onChainId = Number(proposalId);

    const proposal = await this.proposalRepo.findOneBy({ onChainId });
    if (!proposal) {
      this.logger.warn(`VoteCast received for unknown proposal ${onChainId}`);
      return;
    }

    // Map on-chain support value: 1 = FOR, 0 = AGAINST
    const direction: VoteDirection =
      support === 1 ? VoteDirection.FOR : VoteDirection.AGAINST;

    const existing = await this.voteRepo.findOneBy({
      walletAddress: voter,
      proposalId: proposal.id,
    });

    if (existing) {
      existing.direction = direction;
      existing.weight = Number(weight);
      await this.voteRepo.save(existing);
    } else {
      const vote = this.voteRepo.create({
        walletAddress: voter,
        direction,
        weight: Number(weight),
        proposal,
        proposalId: proposal.id,
      });
      await this.voteRepo.save(vote);
    }

    // Emit event for notifications (to notify delegators)
    this.eventEmitter.emit('governance.vote.cast', {
      voter,
      onChainId,
      direction,
      weight: weight.toString(),
    });
  }

  /**
   * Handles the DelegationUpdated event.
   */
  async handleDelegationUpdated(
    delegator: string,
    delegate: string,
  ): Promise<void> {
    const existing = await this.delegationRepo.findOneBy({
      delegatorAddress: delegator,
    });

    if (existing) {
      existing.delegateAddress = delegate;
      await this.delegationRepo.save(existing);
    } else {
      const newDelegation = this.delegationRepo.create({
        delegatorAddress: delegator,
        delegateAddress: delegate,
      });
      await this.delegationRepo.save(newDelegation);
    }

    this.logger.log(`Updated delegation: ${delegator} -> ${delegate}`);
  }

  /**
   * Handles the ProposalStatusChanged event.
   */
  async handleProposalStatusChanged(
    proposalId: bigint,
    status: number,
  ): Promise<void> {
    const onChainId = Number(proposalId);
    const proposal = await this.proposalRepo.findOneBy({ onChainId });
    if (!proposal) return;

    // Map on-chain status to enum
    let newStatus: ProposalStatus;
    switch (status) {
      case 1:
        newStatus = ProposalStatus.PASSED;
        break;
      case 2:
        newStatus = ProposalStatus.FAILED;
        break;
      case 3:
        newStatus = ProposalStatus.CANCELLED;
        break;
      default:
        newStatus = ProposalStatus.ACTIVE;
    }

    if (proposal.status !== newStatus) {
      proposal.status = newStatus;
      await this.proposalRepo.save(proposal);

      this.eventEmitter.emit('governance.proposal.status_updated', {
        proposalId: proposal.id,
        onChainId,
        status: newStatus,
      });
    }
  }

  /** Gracefully remove all contract listeners on shutdown. */
  async onModuleDestroy(): Promise<void> {
    if (this.contract) {
      await this.contract.removeAllListeners();
    }
  }

  /**
   * Helper method to update proposal status based on voting outcomes.
   * Can be called periodically or after significant vote events.
   * Updates status from Active -> Passed/Failed based on vote tallies.
   */
  async updateProposalStatus(proposalId: string): Promise<void> {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
      relations: ['votes'],
    });

    if (!proposal || proposal.status !== ProposalStatus.ACTIVE) {
      return;
    }

    // Calculate vote tallies
    let forVotes = 0;
    let againstVotes = 0;

    for (const vote of proposal.votes) {
      const weight = Number(vote.weight);
      if (vote.direction === VoteDirection.FOR) {
        forVotes += weight;
      } else {
        againstVotes += weight;
      }
    }

    // Simple majority logic - can be customized based on DAO rules
    const totalVotes = forVotes + againstVotes;
    if (totalVotes > 0) {
      const forPercentage = (forVotes / totalVotes) * 100;

      // Update status if voting has concluded (can add block height check)
      if (forPercentage > 50) {
        proposal.status = ProposalStatus.PASSED;
        await this.proposalRepo.save(proposal);
        this.logger.log(
          `Proposal ${proposal.onChainId} marked as PASSED (${forPercentage.toFixed(2)}% FOR)`,
        );
      } else if (forPercentage < 50) {
        proposal.status = ProposalStatus.FAILED;
        await this.proposalRepo.save(proposal);
        this.logger.log(
          `Proposal ${proposal.onChainId} marked as FAILED (${forPercentage.toFixed(2)}% FOR)`,
        );
      }
    }
  }
}
