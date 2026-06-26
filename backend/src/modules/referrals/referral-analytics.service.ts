import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import {
  Transaction,
  TxStatus,
  TxType,
} from '../transactions/entities/transaction.entity';
import {
  CampaignPerformanceDto,
  ConversionFunnelDto,
  LeaderboardEntryDto,
  ReferralAnalyticsDashboardDto,
  RevenueAttributionDto,
} from './dto/referral-analytics.dto';

/**
 * Comprehensive analytics for referral campaigns: conversion funnel metrics,
 * revenue attribution, ROI, per-campaign performance, leaderboards and report
 * exports.
 */
@Injectable()
export class ReferralAnalyticsService {
  constructor(
    @InjectRepository(Referral)
    private readonly referralRepository: Repository<Referral>,
    @InjectRepository(ReferralCampaign)
    private readonly campaignRepository: Repository<ReferralCampaign>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Conversion funnel: codes generated -> signups -> completed -> rewarded.
   */
  async getConversionFunnel(campaignId?: string): Promise<ConversionFunnelDto> {
    const referrals = await this.loadReferrals(campaignId);
    return this.buildFunnel(referrals);
  }

  /**
   * Revenue attributed to referred users and the resulting ROI.
   */
  async getRevenueAttribution(
    campaignId?: string,
  ): Promise<RevenueAttributionDto> {
    const referrals = await this.loadReferrals(campaignId);
    const deposits = await this.loadRefereeDeposits(referrals);
    return this.buildRevenue(referrals, deposits);
  }

  /**
   * Per-campaign performance dashboard. Includes an "Unattributed" bucket for
   * referrals not tied to any campaign.
   */
  async getCampaignPerformance(): Promise<CampaignPerformanceDto[]> {
    const [campaigns, referrals] = await Promise.all([
      this.campaignRepository.find({ order: { createdAt: 'DESC' } }),
      this.referralRepository.find(),
    ]);
    const deposits = await this.loadRefereeDeposits(referrals);

    const performance: CampaignPerformanceDto[] = campaigns.map((campaign) =>
      this.buildCampaignPerformance(
        campaign.id,
        campaign.name,
        referrals.filter((r) => r.campaignId === campaign.id),
        deposits,
      ),
    );

    const orphans = referrals.filter((r) => !r.campaignId);
    if (orphans.length > 0) {
      performance.push(
        this.buildCampaignPerformance(null, 'Unattributed', orphans, deposits),
      );
    }

    return performance;
  }

  /**
   * Leaderboard of top referrers ranked by successful referrals, enriched with
   * the revenue their referees generated.
   */
  async getLeaderboard(
    limit = 10,
    campaignId?: string,
  ): Promise<LeaderboardEntryDto[]> {
    const referrals = await this.loadReferrals(campaignId);
    const deposits = await this.loadRefereeDeposits(referrals);
    const revenueByReferee = this.sumDepositsByUser(deposits);

    const byReferrer = new Map<
      string,
      { successfulReferrals: number; totalRewards: number; revenue: number }
    >();

    for (const referral of referrals) {
      const entry = byReferrer.get(referral.referrerId) ?? {
        successfulReferrals: 0,
        totalRewards: 0,
        revenue: 0,
      };

      if (this.isSuccessful(referral)) {
        entry.successfulReferrals += 1;
      }
      if (
        referral.status === ReferralStatus.REWARDED &&
        referral.rewardAmount
      ) {
        entry.totalRewards += parseFloat(referral.rewardAmount);
      }
      if (referral.refereeId) {
        entry.revenue += revenueByReferee.get(referral.refereeId) ?? 0;
      }

      byReferrer.set(referral.referrerId, entry);
    }

    return Array.from(byReferrer.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort(
        (a, b) =>
          b.successfulReferrals - a.successfulReferrals ||
          b.revenue - a.revenue,
      )
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        successfulReferrals: entry.successfulReferrals,
        attributedRevenue: this.format(entry.revenue),
        totalRewards: this.format(entry.totalRewards),
      }));
  }

  /**
   * Aggregated dashboard combining funnel, revenue, per-campaign performance
   * and the top referrers.
   */
  async getDashboard(): Promise<ReferralAnalyticsDashboardDto> {
    const referrals = await this.referralRepository.find();
    const deposits = await this.loadRefereeDeposits(referrals);

    const [campaigns, topReferrers] = await Promise.all([
      this.getCampaignPerformance(),
      this.getLeaderboard(10),
    ]);

    return {
      funnel: this.buildFunnel(referrals),
      revenue: this.buildRevenue(referrals, deposits),
      campaigns,
      topReferrers,
      generatedAt: new Date(),
    };
  }

  /**
   * Export per-campaign performance as a CSV report.
   */
  async exportReferralReportCsv(): Promise<string> {
    const performance = await this.getCampaignPerformance();

    const headers = [
      'campaignId',
      'campaignName',
      'codesGenerated',
      'signups',
      'completed',
      'rewarded',
      'fraudulent',
      'signupRate',
      'activationRate',
      'overallConversionRate',
      'attributedRevenue',
      'rewardsPaid',
      'netRevenue',
      'roiPercentage',
    ];

    const rows = performance.map((p) =>
      [
        p.campaignId ?? '',
        p.campaignName,
        p.funnel.codesGenerated,
        p.funnel.signups,
        p.funnel.completed,
        p.funnel.rewarded,
        p.funnel.fraudulent,
        p.funnel.signupRate,
        p.funnel.activationRate,
        p.funnel.overallConversionRate,
        p.revenue.attributedRevenue,
        p.revenue.rewardsPaid,
        p.revenue.netRevenue,
        p.revenue.roiPercentage ?? '',
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async loadReferrals(campaignId?: string): Promise<Referral[]> {
    return this.referralRepository.find({
      where: campaignId ? { campaignId } : {},
    });
  }

  private async loadRefereeDeposits(
    referrals: Referral[],
  ): Promise<Transaction[]> {
    const refereeIds = Array.from(
      new Set(
        referrals.map((r) => r.refereeId).filter((id): id is string => !!id),
      ),
    );

    if (refereeIds.length === 0) {
      return [];
    }

    return this.transactionRepository.find({
      where: {
        userId: In(refereeIds),
        type: TxType.DEPOSIT,
        status: TxStatus.COMPLETED,
      },
    });
  }

  private buildCampaignPerformance(
    campaignId: string | null,
    campaignName: string,
    referrals: Referral[],
    allDeposits: Transaction[],
  ): CampaignPerformanceDto {
    const refereeIds = new Set(
      referrals.map((r) => r.refereeId).filter((id): id is string => !!id),
    );
    const deposits = allDeposits.filter((d) => refereeIds.has(d.userId));

    return {
      campaignId,
      campaignName,
      funnel: this.buildFunnel(referrals),
      revenue: this.buildRevenue(referrals, deposits),
    };
  }

  private buildFunnel(referrals: Referral[]): ConversionFunnelDto {
    const codesGenerated = referrals.length;
    const signups = referrals.filter((r) => !!r.refereeId).length;
    const completed = referrals.filter((r) => this.isSuccessful(r)).length;
    const rewarded = referrals.filter(
      (r) => r.status === ReferralStatus.REWARDED,
    ).length;
    const fraudulent = referrals.filter(
      (r) => r.status === ReferralStatus.FRAUDULENT,
    ).length;

    return {
      codesGenerated,
      signups,
      completed,
      rewarded,
      fraudulent,
      signupRate: this.rate(signups, codesGenerated),
      activationRate: this.rate(completed, signups),
      rewardRate: this.rate(rewarded, completed),
      overallConversionRate: this.rate(rewarded, codesGenerated),
    };
  }

  private buildRevenue(
    referrals: Referral[],
    deposits: Transaction[],
  ): RevenueAttributionDto {
    const referredUsers = new Set(
      referrals.map((r) => r.refereeId).filter((id): id is string => !!id),
    ).size;

    const revenueByReferee = this.sumDepositsByUser(deposits);
    const payingReferredUsers = revenueByReferee.size;
    const attributedRevenue = Array.from(revenueByReferee.values()).reduce(
      (sum, value) => sum + value,
      0,
    );

    const rewardsPaid = referrals
      .filter((r) => r.status === ReferralStatus.REWARDED && r.rewardAmount)
      .reduce((sum, r) => sum + parseFloat(r.rewardAmount!), 0);

    const netRevenue = attributedRevenue - rewardsPaid;
    const roiPercentage =
      rewardsPaid > 0
        ? parseFloat(((netRevenue / rewardsPaid) * 100).toFixed(2))
        : null;

    const averageRevenuePerReferral =
      referredUsers > 0 ? attributedRevenue / referredUsers : 0;

    return {
      referredUsers,
      payingReferredUsers,
      attributedRevenue: this.format(attributedRevenue),
      rewardsPaid: this.format(rewardsPaid),
      netRevenue: this.format(netRevenue),
      roiPercentage,
      averageRevenuePerReferral: this.format(averageRevenuePerReferral),
    };
  }

  private sumDepositsByUser(deposits: Transaction[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const deposit of deposits) {
      totals.set(
        deposit.userId,
        (totals.get(deposit.userId) ?? 0) + parseFloat(deposit.amount),
      );
    }
    return totals;
  }

  private isSuccessful(referral: Referral): boolean {
    return (
      referral.status === ReferralStatus.COMPLETED ||
      referral.status === ReferralStatus.REWARDED
    );
  }

  /** Percentage rounded to two decimals; 0 when the denominator is 0. */
  private rate(numerator: number, denominator: number): number {
    if (denominator <= 0) {
      return 0;
    }
    return parseFloat(((numerator / denominator) * 100).toFixed(2));
  }

  /** Format an amount to the 7-decimal precision used across the platform. */
  private format(value: number): string {
    return value.toFixed(7);
  }
}
