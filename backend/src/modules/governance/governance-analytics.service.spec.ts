import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GovernanceAnalyticsService } from './governance-analytics.service';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote } from './entities/vote.entity';

describe('GovernanceAnalyticsService', () => {
  let service: GovernanceAnalyticsService;
  let proposalRepo: any;
  let voteRepo: any;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    proposalRepo = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    voteRepo = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceAnalyticsService,
        {
          provide: getRepositoryToken(GovernanceProposal),
          useValue: proposalRepo,
        },
        {
          provide: getRepositoryToken(Vote),
          useValue: voteRepo,
        },
      ],
    }).compile();

    service = module.get<GovernanceAnalyticsService>(
      GovernanceAnalyticsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getParticipationStats', () => {
    it('should return participation statistics', async () => {
      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '100' }) // totalUniqueVoters
        .mockResolvedValueOnce({ count: '50' }); // activeVoters (last 30 days)

      voteRepo.count.mockResolvedValue(500);
      proposalRepo.count.mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { proposalId: '1', totalWeight: '60000' },
      ]);

      const result = await service.getParticipationStats();

      expect(result.totalUniqueVoters).toBe(100);
      expect(result.totalVotesCast).toBe(500);
      expect(result.averageVotersPerProposal).toBe(50);
      expect(result.quorumAchievementRate).toBe(10); // 1 out of 10
      expect(result.activeVoters).toBe(50);
    });
  });

  describe('getProposalAnalytics', () => {
    it('should return proposal analytics', async () => {
      proposalRepo.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(15); // passed

      mockQueryBuilder.getRawOne.mockResolvedValue({ totalWeight: '1000000' });
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { category: 'Governance', total: '10', passed: '8', failed: '2' },
        { category: 'Treasury', total: '10', passed: '7', failed: '3' },
      ]);

      const result = await service.getProposalAnalytics();

      expect(result.totalProposals).toBe(20);
      expect(result.passedProposals).toBe(15);
      expect(result.overallSuccessRate).toBe(75);
      expect(result.averageVotingPower).toBe('50000.00');
      expect(result.categoryBreakdown).toHaveLength(2);
      expect(result.categoryBreakdown[0].successRate).toBe(80);
    });
  });

  describe('getTopVoters', () => {
    it('should return top 10 voters', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { walletAddress: 'addr1', voteCount: '5', totalWeight: '50000' },
        { walletAddress: 'addr2', voteCount: '4', totalWeight: '40000' },
      ]);

      const result = await service.getTopVoters();

      expect(result).toHaveLength(2);
      expect(result[0].walletAddress).toBe('addr1');
      expect(result[0].rank).toBe(1);
    });
  });
});
