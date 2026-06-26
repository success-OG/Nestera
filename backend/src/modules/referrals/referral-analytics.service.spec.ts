import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReferralAnalyticsService } from './referral-analytics.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

describe('ReferralAnalyticsService', () => {
  let service: ReferralAnalyticsService;
  let referralRepository: { find: jest.Mock };
  let campaignRepository: { find: jest.Mock };
  let transactionRepository: { find: jest.Mock };

  const referral = (overrides: Partial<Referral>): Referral =>
    ({
      id: 'r',
      referrerId: 'referrer-1',
      refereeId: null,
      referralCode: 'CODE',
      status: ReferralStatus.PENDING,
      rewardAmount: null,
      campaignId: null,
      ...overrides,
    }) as Referral;

  const deposit = (userId: string, amount: string): Transaction =>
    ({ userId, amount }) as Transaction;

  beforeEach(async () => {
    referralRepository = { find: jest.fn() };
    campaignRepository = { find: jest.fn() };
    transactionRepository = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralAnalyticsService,
        {
          provide: getRepositoryToken(Referral),
          useValue: referralRepository,
        },
        {
          provide: getRepositoryToken(ReferralCampaign),
          useValue: campaignRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
      ],
    }).compile();

    service = module.get<ReferralAnalyticsService>(ReferralAnalyticsService);
  });

  it('computes conversion funnel metrics and rates', async () => {
    referralRepository.find.mockResolvedValue([
      referral({ id: '1', refereeId: null, status: ReferralStatus.PENDING }),
      referral({
        id: '2',
        refereeId: 'u2',
        status: ReferralStatus.COMPLETED,
      }),
      referral({
        id: '3',
        refereeId: 'u3',
        status: ReferralStatus.REWARDED,
        rewardAmount: '10',
      }),
      referral({
        id: '4',
        refereeId: 'u4',
        status: ReferralStatus.FRAUDULENT,
      }),
    ]);

    const funnel = await service.getConversionFunnel();

    expect(funnel.codesGenerated).toBe(4);
    expect(funnel.signups).toBe(3);
    expect(funnel.completed).toBe(2); // completed + rewarded
    expect(funnel.rewarded).toBe(1);
    expect(funnel.fraudulent).toBe(1);
    expect(funnel.signupRate).toBe(75); // 3/4
    expect(funnel.overallConversionRate).toBe(25); // 1/4
  });

  it('attributes referee deposit revenue and computes ROI', async () => {
    referralRepository.find.mockResolvedValue([
      referral({
        id: '1',
        refereeId: 'u1',
        status: ReferralStatus.REWARDED,
        rewardAmount: '10',
      }),
      referral({
        id: '2',
        refereeId: 'u2',
        status: ReferralStatus.COMPLETED,
      }),
    ]);
    transactionRepository.find.mockResolvedValue([
      deposit('u1', '100'),
      deposit('u1', '50'),
      deposit('u2', '40'),
    ]);

    const revenue = await service.getRevenueAttribution();

    expect(revenue.referredUsers).toBe(2);
    expect(revenue.payingReferredUsers).toBe(2);
    expect(revenue.attributedRevenue).toBe('190.0000000');
    expect(revenue.rewardsPaid).toBe('10.0000000');
    expect(revenue.netRevenue).toBe('180.0000000');
    expect(revenue.roiPercentage).toBe(1800); // (180 / 10) * 100
  });

  it('returns null ROI when no rewards have been paid', async () => {
    referralRepository.find.mockResolvedValue([
      referral({ id: '1', refereeId: 'u1', status: ReferralStatus.COMPLETED }),
    ]);
    transactionRepository.find.mockResolvedValue([deposit('u1', '20')]);

    const revenue = await service.getRevenueAttribution();

    expect(revenue.roiPercentage).toBeNull();
    expect(revenue.attributedRevenue).toBe('20.0000000');
  });

  it('ranks referrers in the leaderboard by successful referrals', async () => {
    referralRepository.find.mockResolvedValue([
      referral({
        id: '1',
        referrerId: 'a',
        refereeId: 'u1',
        status: ReferralStatus.REWARDED,
        rewardAmount: '5',
      }),
      referral({
        id: '2',
        referrerId: 'a',
        refereeId: 'u2',
        status: ReferralStatus.COMPLETED,
      }),
      referral({
        id: '3',
        referrerId: 'b',
        refereeId: 'u3',
        status: ReferralStatus.COMPLETED,
      }),
    ]);
    transactionRepository.find.mockResolvedValue([deposit('u1', '100')]);

    const leaderboard = await service.getLeaderboard(10);

    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0]).toMatchObject({
      rank: 1,
      userId: 'a',
      successfulReferrals: 2,
      totalRewards: '5.0000000',
      attributedRevenue: '100.0000000',
    });
    expect(leaderboard[1]).toMatchObject({ rank: 2, userId: 'b' });
  });

  it('builds per-campaign performance with an unattributed bucket', async () => {
    campaignRepository.find.mockResolvedValue([{ id: 'c1', name: 'Launch' }]);
    referralRepository.find.mockResolvedValue([
      referral({
        id: '1',
        campaignId: 'c1',
        refereeId: 'u1',
        status: ReferralStatus.REWARDED,
        rewardAmount: '10',
      }),
      referral({ id: '2', campaignId: null, refereeId: 'u2' }),
    ]);
    transactionRepository.find.mockResolvedValue([deposit('u1', '200')]);

    const performance = await service.getCampaignPerformance();

    expect(performance).toHaveLength(2);
    const launch = performance.find((p) => p.campaignId === 'c1');
    expect(launch?.revenue.attributedRevenue).toBe('200.0000000');
    expect(performance.find((p) => p.campaignId === null)?.campaignName).toBe(
      'Unattributed',
    );
  });

  it('exports a CSV report with a header row per campaign', async () => {
    campaignRepository.find.mockResolvedValue([{ id: 'c1', name: 'Launch' }]);
    referralRepository.find.mockResolvedValue([
      referral({ id: '1', campaignId: 'c1', refereeId: 'u1' }),
    ]);
    transactionRepository.find.mockResolvedValue([]);

    const csv = await service.exportReferralReportCsv();
    const lines = csv.split('\n');

    expect(lines[0]).toContain('campaignId');
    expect(lines[0]).toContain('roiPercentage');
    expect(lines[1]).toContain('Launch');
  });
});
