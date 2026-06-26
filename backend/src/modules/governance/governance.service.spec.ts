import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceService } from './governance.service';
import { UserService } from '../user/user.service';
import { StellarService } from '../blockchain/stellar.service';
import { SavingsService } from '../blockchain/savings.service';
import {
  GovernanceProposal,
  ProposalAttachmentType,
  ProposalCategory,
  ProposalStatus,
  ProposalType,
} from './entities/governance-proposal.entity';
import { Vote, VoteDirection } from './entities/vote.entity';
import { Delegation } from './entities/delegation.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerTransaction } from '../blockchain/entities/transaction.entity';

describe('GovernanceService', () => {
  let service: GovernanceService;
  let userService: { findById: jest.Mock };
  let stellarService: {
    getDelegationForUser: jest.Mock;
    getRpcServer: jest.Mock;
  };
  let savingsService: { getUserVaultBalance: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let proposalRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let voteRepo: {
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let transactionsService: any;
  let transactionRepo: { createQueryBuilder: jest.Mock };
  let delegationRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    upsert: jest.Mock;
  };

  beforeEach(async () => {
    userService = { findById: jest.fn() };
    stellarService = {
      getDelegationForUser: jest.fn(),
      getRpcServer: jest.fn().mockReturnValue({
        getLatestLedger: jest.fn().mockResolvedValue({ sequence: 1000 }),
      }),
    };
    savingsService = { getUserVaultBalance: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    proposalRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    voteRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    transactionsService = {};
    transactionRepo = { createQueryBuilder: jest.fn() };
    delegationRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceService,
        { provide: UserService, useValue: userService },
        { provide: StellarService, useValue: stellarService },
        { provide: SavingsService, useValue: savingsService },
        { provide: TransactionsService, useValue: transactionsService },
        { provide: EventEmitter2, useValue: eventEmitter },
        {
          provide: getRepositoryToken(GovernanceProposal),
          useValue: proposalRepo,
        },
        { provide: getRepositoryToken(Vote), useValue: voteRepo },
        {
          provide: getRepositoryToken(LedgerTransaction),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(Delegation),
          useValue: delegationRepo,
        },
      ],
    }).compile();

    service = module.get<GovernanceService>(GovernanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user has no linked wallet', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', publicKey: null });

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: null,
    });
    expect(stellarService.getDelegationForUser).not.toHaveBeenCalled();
  });

  it('returns null when no delegation exists on-chain', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      publicKey: 'GUSERPUBLICKEY123',
    });
    stellarService.getDelegationForUser.mockResolvedValue(null);

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: null,
    });
  });

  it('returns the delegated wallet address when present', async () => {
    userService.findById.mockResolvedValue({
      id: 'user-1',
      publicKey: 'GUSERPUBLICKEY123',
    });
    stellarService.getDelegationForUser.mockResolvedValue('GDELEGATE123');

    await expect(service.getUserDelegation('user-1')).resolves.toEqual({
      delegate: 'GDELEGATE123',
    });
  });

  describe('createProposal', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = {
        ...OLD_ENV,
        NST_GOVERNANCE_CONTRACT_ID: 'CONTRACT123',
        GOVERNANCE_PROPOSAL_THRESHOLD: '100',
        GOVERNANCE_QUORUM_BPS: '5000',
        GOVERNANCE_MAX_VOTING_POWER: '10000',
        GOVERNANCE_START_DELAY_LEDGERS: '100',
        GOVERNANCE_VOTING_PERIOD_LEDGERS: '500',
      };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it('creates a structured governance proposal and emits an event', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'GUSERPUBLICKEY123',
      });
      savingsService.getUserVaultBalance.mockResolvedValue(2_000_000_000);
      proposalRepo.findOne.mockResolvedValue({ onChainId: 7 });
      proposalRepo.create.mockImplementation((input) => ({
        id: 'proposal-1',
        createdAt: new Date('2026-03-30T12:00:00.000Z'),
        updatedAt: new Date('2026-03-30T12:00:00.000Z'),
        ...input,
      }));
      proposalRepo.save.mockImplementation(async (proposal) => proposal);

      const result = await service.createProposal('user-1', {
        description: 'Increase flexi rate',
        type: ProposalType.RATE_CHANGE,
        action: {
          target: 'flexiRate',
          newValue: 12,
        },
        attachments: [
          {
            name: 'Model',
            url: 'https://example.com/model.pdf',
            type: ProposalAttachmentType.DOCUMENT,
          },
        ],
      });

      expect(proposalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          onChainId: 8,
          proposer: 'GUSERPUBLICKEY123',
          createdByUserId: 'user-1',
          category: ProposalCategory.TECHNICAL,
          type: ProposalType.RATE_CHANGE,
          action: {
            target: 'flexiRate',
            newValue: 12,
          },
          attachments: [
            {
              name: 'Model',
              url: 'https://example.com/model.pdf',
              type: ProposalAttachmentType.DOCUMENT,
            },
          ],
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.created',
        expect.objectContaining({
          proposalId: 'proposal-1',
          onChainId: 8,
          proposer: 'GUSERPUBLICKEY123',
          type: ProposalType.RATE_CHANGE,
        }),
      );
      expect(result.requiredQuorum).toBe('5000.00000000');
      expect(result.proposalThreshold).toBe('100.00000000');
      expect(result.canEdit).toBe(true);
    });

    it('creates a governance proposal from a template with generated action payload', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'GUSERPUBLICKEY123',
      });
      savingsService.getUserVaultBalance.mockResolvedValue(2_000_000_000);
      proposalRepo.findOne.mockResolvedValue({ onChainId: 7 });
      proposalRepo.create.mockImplementation((input) => ({
        id: 'proposal-2',
        createdAt: new Date('2026-03-30T12:00:00.000Z'),
        updatedAt: new Date('2026-03-30T12:00:00.000Z'),
        ...input,
      }));
      proposalRepo.save.mockImplementation(async (proposal) => proposal);

      const result = await service.createProposal('user-1', {
        description: 'Allocate treasury funds for community incentives',
        templateId: 'treasury-allocation',
        templateParameters: {
          recipient: 'GRECIPIENT789',
          amount: 1200,
          asset: 'NST',
          reason: 'Community incentive program',
        },
      });

      expect(proposalRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          onChainId: 8,
          proposer: 'GUSERPUBLICKEY123',
          createdByUserId: 'user-1',
          category: ProposalCategory.TREASURY,
          type: ProposalType.TREASURY_ALLOCATION,
          templateId: 'treasury-allocation',
          templateVersion: '1.0',
          templateParameters: {
            recipient: 'GRECIPIENT789',
            amount: 1200,
            asset: 'NST',
            reason: 'Community incentive program',
          },
          action: {
            recipient: 'GRECIPIENT789',
            amount: 1200,
            asset: 'NST',
            reason: 'Community incentive program',
          },
        }),
      );
      expect(result.templateId).toBe('treasury-allocation');
      expect(result.templateVersion).toBe('1.0');
      expect(result.action).toEqual({
        recipient: 'GRECIPIENT789',
        amount: 1200,
        asset: 'NST',
        reason: 'Community incentive program',
      });
    });

    it('rejects proposal creation when user is below the voting-power threshold', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'GUSERPUBLICKEY123',
      });
      savingsService.getUserVaultBalance.mockResolvedValue(500_000_000);

      await expect(
        service.createProposal('user-1', {
          description: 'Pause the contract',
          type: ProposalType.PAUSE,
          action: { reason: 'Emergency maintenance' },
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('editProposal', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = {
        ...OLD_ENV,
        NST_GOVERNANCE_CONTRACT_ID: 'CONTRACT123',
      };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it('allows the creator to edit a proposal before voting starts', async () => {
      proposalRepo.findOneBy.mockResolvedValue({
        id: 'proposal-1',
        onChainId: 5,
        title: 'Allocate treasury',
        description: 'Old description',
        category: ProposalCategory.TREASURY,
        type: ProposalType.TREASURY_ALLOCATION,
        action: {
          recipient: 'GOLDRECIPIENT',
          amount: 1000,
          asset: 'NST',
        },
        attachments: [],
        proposer: 'GUSERPUBLICKEY123',
        createdByUserId: 'user-1',
        startBlock: 1400,
        endBlock: 1900,
        status: ProposalStatus.ACTIVE,
        requiredQuorum: '5000.00000000',
        quorumBps: 5000,
        proposalThreshold: '100.00000000',
        createdAt: new Date('2026-03-29T12:00:00.000Z'),
        updatedAt: new Date('2026-03-29T12:00:00.000Z'),
      });
      voteRepo.count.mockResolvedValue(0);
      proposalRepo.save.mockImplementation(async (proposal) => ({
        ...proposal,
        updatedAt: new Date('2026-03-30T12:00:00.000Z'),
      }));

      const result = await service.editProposal('user-1', 'proposal-1', {
        description: 'Allocate additional funds',
        action: {
          recipient: 'GNEWRECIPIENT',
          amount: 2500,
          asset: 'USDC',
        },
        attachments: [
          {
            name: 'Budget',
            url: 'https://example.com/budget',
            type: ProposalAttachmentType.LINK,
          },
        ],
        startBlock: 1500,
        endBlock: 2100,
      });

      expect(proposalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Allocate additional funds',
          action: {
            recipient: 'GNEWRECIPIENT',
            amount: 2500,
            asset: 'USDC',
          },
          attachments: [
            {
              name: 'Budget',
              url: 'https://example.com/budget',
              type: ProposalAttachmentType.LINK,
            },
          ],
          startBlock: 1500,
          endBlock: 2100,
        }),
      );
      expect(result.canEdit).toBe(true);
    });

    it('rejects edits from non-creators', async () => {
      proposalRepo.findOneBy.mockResolvedValue({
        id: 'proposal-1',
        createdByUserId: 'someone-else',
      });

      await expect(
        service.editProposal('user-1', 'proposal-1', {
          description: 'New description',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getProposalVotesByOnChainId', () => {
    it('returns recent votes and tallies', async () => {
      proposalRepo.findOneBy.mockResolvedValue({
        id: 'proposal-1',
        onChainId: 3,
      });
      voteRepo.findAndCount.mockResolvedValue([
        [
          {
            walletAddress: 'GWALLET1',
            direction: VoteDirection.FOR,
            weight: 30,
            createdAt: new Date('2026-03-30T10:00:00.000Z'),
          },
          {
            walletAddress: 'GWALLET2',
            direction: VoteDirection.AGAINST,
            weight: 20,
            createdAt: new Date('2026-03-30T11:00:00.000Z'),
          },
        ],
        2,
      ]);

      const result = await service.getProposalVotesByOnChainId(3, 0);

      expect(result.tally.forVotes).toBe(1);
      expect(result.tally.againstVotes).toBe(1);
      expect(result.tally.totalWeight).toBe('50');
      expect(result.recentVoters).toHaveLength(2);
    });
  });

  describe('castVote', () => {
    it('throws BadRequestException if user has no publicKey', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', publicKey: null });

      await expect(service.castVote('user-1', 1, 'FOR' as any)).rejects.toThrow(
        'User must have a public key to vote',
      );
    });

    it('throws NotFoundException if proposal not found', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'PK1',
      });
      proposalRepo.findOneBy.mockResolvedValue(null);

      await expect(service.castVote('user-1', 1, 'FOR' as any)).rejects.toThrow(
        'Proposal 1 not found',
      );
    });

    it('throws BadRequestException if already voted', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'PK1',
      });
      proposalRepo.findOneBy.mockResolvedValue({
        id: 'p1',
        onChainId: 1,
        status: 'Active',
      });
      voteRepo.findOneBy.mockResolvedValue({ id: 'v1' });

      await expect(service.castVote('user-1', 1, 'FOR' as any)).rejects.toThrow(
        'User has already voted on this proposal',
      );
    });
  });

  describe('delegateVotingPower', () => {
    it('returns a mock transaction hash', async () => {
      userService.findById.mockResolvedValue({
        id: 'user-1',
        publicKey: 'PK1',
      });

      const result = await service.delegateVotingPower('user-1', 'DELEGATE_PK');
      expect(result.transactionHash).toBeDefined();
      expect(result.transactionHash).toMatch(/^0x/);
    });
  });
});
