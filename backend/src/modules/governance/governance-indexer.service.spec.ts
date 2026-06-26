import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GovernanceIndexerService } from './governance-indexer.service';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote, VoteDirection } from './entities/vote.entity';
import { Delegation } from './entities/delegation.entity';

describe('GovernanceIndexerService', () => {
  let service: GovernanceIndexerService;
  let proposalRepo: Repository<GovernanceProposal>;
  let voteRepo: Repository<Vote>;

  const mockProposalRepo = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockVoteRepo = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDelegationRepo = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceIndexerService,
        {
          provide: getRepositoryToken(GovernanceProposal),
          useValue: mockProposalRepo,
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: mockVoteRepo,
        },
        {
          provide: getRepositoryToken(Delegation),
          useValue: mockDelegationRepo,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<GovernanceIndexerService>(GovernanceIndexerService);
    proposalRepo = module.get<Repository<GovernanceProposal>>(
      getRepositoryToken(GovernanceProposal),
    );
    voteRepo = module.get<Repository<Vote>>(getRepositoryToken(Vote));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleProposalCreated', () => {
    it('should create a new proposal when ProposalCreated event is received', async () => {
      const proposalId = BigInt(1);
      const proposer = '0x1234567890abcdef';
      const description = 'Test Proposal\nThis is a detailed description';
      const startBlock = BigInt(1000000);
      const endBlock = BigInt(1100000);

      mockProposalRepo.findOneBy.mockResolvedValue(null);
      mockProposalRepo.create.mockReturnValue({
        onChainId: 1,
        proposer,
        title: 'Test Proposal',
        description,
        status: ProposalStatus.ACTIVE,
        startBlock: 1000000,
        endBlock: 1100000,
      });
      mockProposalRepo.save.mockResolvedValue({});

      await service['handleProposalCreated'](
        proposalId,
        proposer,
        description,
        startBlock,
        endBlock,
      );

      expect(mockProposalRepo.findOneBy).toHaveBeenCalledWith({ onChainId: 1 });
      expect(mockProposalRepo.create).toHaveBeenCalled();
      expect(mockProposalRepo.save).toHaveBeenCalled();
    });

    it('should skip if proposal already exists', async () => {
      const proposalId = BigInt(1);
      mockProposalRepo.findOneBy.mockResolvedValue({ id: 'existing-id' });

      await service['handleProposalCreated'](
        proposalId,
        '0xabc',
        'desc',
        BigInt(1000),
        BigInt(2000),
      );

      expect(mockProposalRepo.create).not.toHaveBeenCalled();
      expect(mockProposalRepo.save).not.toHaveBeenCalled();
    });

    it('should extract title from description', async () => {
      const description = 'Short Title\nLong description follows here...';
      mockProposalRepo.findOneBy.mockResolvedValue(null);

      const createdProposal = {
        title: 'Short Title',
        description,
      };
      mockProposalRepo.create.mockReturnValue(createdProposal);
      mockProposalRepo.save.mockResolvedValue(createdProposal);

      await service['handleProposalCreated'](
        BigInt(1),
        '0xabc',
        description,
        BigInt(1000),
        BigInt(2000),
      );

      const createCall = mockProposalRepo.create.mock.calls[0][0];
      expect(createCall.title).toBe('Short Title');
    });
  });

  describe('handleVoteCast', () => {
    it('should create a new vote when VoteCast event is received', async () => {
      const voter = '0xvoter123';
      const proposalId = BigInt(1);
      const support = 1; // FOR
      const weight = BigInt(150);

      const mockProposal = {
        id: 'proposal-uuid',
        onChainId: 1,
      };

      mockProposalRepo.findOneBy.mockResolvedValue(mockProposal);
      mockVoteRepo.findOneBy.mockResolvedValue(null);
      mockVoteRepo.create.mockReturnValue({
        walletAddress: voter,
        direction: VoteDirection.FOR,
        weight: 150,
        proposal: mockProposal,
        proposalId: mockProposal.id,
      });
      mockVoteRepo.save.mockResolvedValue({});

      await service['handleVoteCast'](voter, proposalId, support, weight);

      expect(mockProposalRepo.findOneBy).toHaveBeenCalledWith({ onChainId: 1 });
      expect(mockVoteRepo.create).toHaveBeenCalled();
      expect(mockVoteRepo.save).toHaveBeenCalled();
    });

    it('should map support=1 to FOR direction', async () => {
      const mockProposal = { id: 'prop-id', onChainId: 1 };
      mockProposalRepo.findOneBy.mockResolvedValue(mockProposal);
      mockVoteRepo.findOneBy.mockResolvedValue(null);

      const createdVote = {
        direction: VoteDirection.FOR,
      };
      mockVoteRepo.create.mockReturnValue(createdVote);
      mockVoteRepo.save.mockResolvedValue(createdVote);

      await service['handleVoteCast'](
        '0xvoter',
        BigInt(1),
        1, // support=1
        BigInt(100),
      );

      const createCall = mockVoteRepo.create.mock.calls[0][0];
      expect(createCall.direction).toBe(VoteDirection.FOR);
    });

    it('should map support=0 to AGAINST direction', async () => {
      const mockProposal = { id: 'prop-id', onChainId: 1 };
      mockProposalRepo.findOneBy.mockResolvedValue(mockProposal);
      mockVoteRepo.findOneBy.mockResolvedValue(null);

      const createdVote = {
        direction: VoteDirection.AGAINST,
      };
      mockVoteRepo.create.mockReturnValue(createdVote);
      mockVoteRepo.save.mockResolvedValue(createdVote);

      await service['handleVoteCast'](
        '0xvoter',
        BigInt(1),
        0, // support=0
        BigInt(100),
      );

      const createCall = mockVoteRepo.create.mock.calls[0][0];
      expect(createCall.direction).toBe(VoteDirection.AGAINST);
    });

    it('should update existing vote if wallet already voted', async () => {
      const mockProposal = { id: 'prop-id', onChainId: 1 };
      const existingVote = {
        id: 'vote-id',
        walletAddress: '0xvoter',
        direction: VoteDirection.FOR,
        weight: 100,
        proposalId: 'prop-id',
      };

      mockProposalRepo.findOneBy.mockResolvedValue(mockProposal);
      mockVoteRepo.findOneBy.mockResolvedValue(existingVote);
      mockVoteRepo.save.mockResolvedValue(existingVote);

      await service['handleVoteCast'](
        '0xvoter',
        BigInt(1),
        0, // Changed to AGAINST
        BigInt(200), // Changed weight
      );

      expect(mockVoteRepo.create).not.toHaveBeenCalled();
      expect(mockVoteRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: VoteDirection.AGAINST,
          weight: 200,
        }),
      );
    });

    it('should skip if proposal not found', async () => {
      mockProposalRepo.findOneBy.mockResolvedValue(null);

      await service['handleVoteCast']('0xvoter', BigInt(999), 1, BigInt(100));

      expect(mockVoteRepo.create).not.toHaveBeenCalled();
      expect(mockVoteRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateProposalStatus', () => {
    it('should mark proposal as PASSED when FOR votes exceed 50%', async () => {
      const proposal = {
        id: 'prop-id',
        onChainId: 1,
        status: ProposalStatus.ACTIVE,
        votes: [
          { direction: VoteDirection.FOR, weight: 60 },
          { direction: VoteDirection.AGAINST, weight: 40 },
        ],
      };

      mockProposalRepo.findOne.mockResolvedValue(proposal);
      mockProposalRepo.save.mockResolvedValue({
        ...proposal,
        status: ProposalStatus.PASSED,
      });

      await service.updateProposalStatus('prop-id');

      expect(mockProposalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProposalStatus.PASSED,
        }),
      );
    });

    it('should mark proposal as FAILED when FOR votes are below 50%', async () => {
      const proposal = {
        id: 'prop-id',
        onChainId: 1,
        status: ProposalStatus.ACTIVE,
        votes: [
          { direction: VoteDirection.FOR, weight: 40 },
          { direction: VoteDirection.AGAINST, weight: 60 },
        ],
      };

      mockProposalRepo.findOne.mockResolvedValue(proposal);
      mockProposalRepo.save.mockResolvedValue({
        ...proposal,
        status: ProposalStatus.FAILED,
      });

      await service.updateProposalStatus('prop-id');

      expect(mockProposalRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProposalStatus.FAILED,
        }),
      );
    });

    it('should not update if proposal is not ACTIVE', async () => {
      const proposal = {
        id: 'prop-id',
        status: ProposalStatus.PASSED,
        votes: [],
      };

      mockProposalRepo.findOne.mockResolvedValue(proposal);

      await service.updateProposalStatus('prop-id');

      expect(mockProposalRepo.save).not.toHaveBeenCalled();
    });

    it('should handle proposal with no votes', async () => {
      const proposal = {
        id: 'prop-id',
        status: ProposalStatus.ACTIVE,
        votes: [],
      };

      mockProposalRepo.findOne.mockResolvedValue(proposal);

      await service.updateProposalStatus('prop-id');

      expect(mockProposalRepo.save).not.toHaveBeenCalled();
    });
  });
});
