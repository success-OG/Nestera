import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  GovernanceProposal,
  ProposalStatus,
} from './entities/governance-proposal.entity';
import { Vote } from './entities/vote.entity';
import { ParticipationStatsDto } from './dto/participation-stats.dto';
import {
  ProposalAnalyticsDto,
  CategorySuccessRate,
} from './dto/proposal-analytics.dto';
import { TemplateUsageDto } from './dto/template-usage.dto';
import { TopVoterDto } from './dto/top-voter.dto';
import { GovernanceTrendDto, TrendDataPoint } from './dto/governance-trend.dto';
import { getProposalTemplate as getProposalTemplateDefinition } from './proposal-templates';

@Injectable()
export class GovernanceAnalyticsService {
  private readonly QUORUM_THRESHOLD = 50000; // Placeholder value (50,000 voting power)

  constructor(
    @InjectRepository(GovernanceProposal)
    private readonly proposalRepo: Repository<GovernanceProposal>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
  ) {}

  async getParticipationStats(): Promise<ParticipationStatsDto> {
    const totalUniqueVotersResult = await this.voteRepo
      .createQueryBuilder('vote')
      .select('COUNT(DISTINCT vote.walletAddress)', 'count')
      .getRawOne();

    const totalVotesResult = await this.voteRepo.count();

    const totalProposals = await this.proposalRepo.count();
    const averageVotersPerProposal =
      totalProposals > 0 ? totalVotesResult / totalProposals : 0;

    // Calculate quorum achievement rate
    const quorumReachedResult = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.proposalId', 'proposalId')
      .addSelect('SUM(vote.weight)', 'totalWeight')
      .groupBy('vote.proposalId')
      .having('SUM(vote.weight) >= :threshold', {
        threshold: this.QUORUM_THRESHOLD,
      })
      .getRawMany();

    const quorumAchievementRate =
      totalProposals > 0
        ? (quorumReachedResult.length / totalProposals) * 100
        : 0;

    // Active voters (voted in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeVotersResult = await this.voteRepo
      .createQueryBuilder('vote')
      .select('COUNT(DISTINCT vote.walletAddress)', 'count')
      .where('vote.createdAt >= :date', { date: thirtyDaysAgo })
      .getRawOne();

    return {
      totalUniqueVoters: parseInt(totalUniqueVotersResult.count || '0', 10),
      averageVotersPerProposal: Math.round(averageVotersPerProposal * 10) / 10,
      quorumAchievementRate: Math.round(quorumAchievementRate * 10) / 10,
      totalVotesCast: totalVotesResult,
      activeVoters: parseInt(activeVotersResult.count || '0', 10),
    };
  }

  async getProposalAnalytics(): Promise<ProposalAnalyticsDto> {
    const totalProposals = await this.proposalRepo.count();
    const passedProposals = await this.proposalRepo.count({
      where: { status: ProposalStatus.PASSED },
    });
    const overallSuccessRate =
      totalProposals > 0 ? (passedProposals / totalProposals) * 100 : 0;

    // Average voting power per proposal
    const totalWeightResult = await this.voteRepo
      .createQueryBuilder('vote')
      .select('SUM(vote.weight)', 'totalWeight')
      .getRawOne();

    const averageVotingPower =
      totalProposals > 0
        ? parseFloat(totalWeightResult.totalWeight || '0') / totalProposals
        : 0;

    // Break down by category
    const categoryStats = await this.proposalRepo
      .createQueryBuilder('proposal')
      .select('proposal.category', 'category')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        `SUM(CASE WHEN proposal.status = '${ProposalStatus.PASSED}' THEN 1 ELSE 0 END)`,
        'passed',
      )
      .addSelect(
        `SUM(CASE WHEN proposal.status = '${ProposalStatus.FAILED}' THEN 1 ELSE 0 END)`,
        'failed',
      )
      .groupBy('proposal.category')
      .getRawMany();

    const categoryBreakdown: CategorySuccessRate[] = categoryStats.map(
      (stat) => ({
        category: stat.category,
        passed: parseInt(stat.passed || '0', 10),
        failed: parseInt(stat.failed || '0', 10),
        successRate:
          parseInt(stat.total || '0', 10) > 0
            ? Math.round(
                (parseInt(stat.passed || '0', 10) /
                  parseInt(stat.total || '0', 10)) *
                  1000,
              ) / 10
            : 0,
      }),
    );

    return {
      totalProposals,
      passedProposals,
      overallSuccessRate: Math.round(overallSuccessRate * 10) / 10,
      averageVotingPower: averageVotingPower.toFixed(2),
      categoryBreakdown,
    };
  }

  async getTopVoters(): Promise<TopVoterDto[]> {
    const topVoters = await this.voteRepo
      .createQueryBuilder('vote')
      .select('vote.walletAddress', 'walletAddress')
      .addSelect('COUNT(DISTINCT vote.proposalId)', 'voteCount')
      .addSelect('SUM(vote.weight)', 'totalWeight')
      .groupBy('vote.walletAddress')
      .orderBy('voteCount', 'DESC')
      .addOrderBy('totalWeight', 'DESC')
      .limit(10)
      .getRawMany();

    return topVoters.map((voter, index) => ({
      walletAddress: voter.walletAddress,
      voteCount: parseInt(voter.voteCount || '0', 10),
      totalWeight: parseFloat(voter.totalWeight || '0').toFixed(2),
      rank: index + 1,
    }));
  }

  async getTrends(): Promise<GovernanceTrendDto> {
    // Grouping by Month (compatible with PostgreSQL/SQLite)
    // Note: strftime for SQLite, TO_CHAR for PostgreSQL
    // We'll use a generic approach with manual grouping for broad compatibility if needed,
    // but here we assume PostgreSQL based on provide prisma mcp server or standard TypeORM usage.

    const rawProposals = await this.proposalRepo
      .createQueryBuilder('proposal')
      .select("TO_CHAR(proposal.createdAt, 'YYYY-MM')", 'interval')
      .addSelect('COUNT(*)', 'count')
      .groupBy('interval')
      .orderBy('interval', 'ASC')
      .getRawMany();

    const rawVotes = await this.voteRepo
      .createQueryBuilder('vote')
      .select("TO_CHAR(vote.createdAt, 'YYYY-MM')", 'interval')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(vote.weight)', 'totalWeight')
      .groupBy('interval')
      .getRawMany();

    const voteMap = new Map(rawVotes.map((v) => [v.interval, v]));
    const intervals = Array.from(
      new Set([
        ...rawProposals.map((p) => p.interval),
        ...rawVotes.map((v) => v.interval),
      ]),
    );

    intervals.sort();

    const trends: TrendDataPoint[] = intervals.map((interval) => {
      const propStat = rawProposals.find((p) => p.interval === interval);
      const voteStat = voteMap.get(interval);

      return {
        interval,
        proposalsCount: parseInt(propStat?.count || '0', 10),
        votesCount: parseInt(voteStat?.count || '0', 10),
        totalWeight: parseFloat(voteStat?.totalWeight || '0').toFixed(2),
      };
    });

    return { trends };
  }

  async getTemplateUsage(): Promise<TemplateUsageDto[]> {
    const rawStats = await this.proposalRepo
      .createQueryBuilder('proposal')
      .select('proposal.templateId', 'templateId')
      .addSelect('proposal.templateVersion', 'templateVersion')
      .addSelect('COUNT(*)', 'proposalsCreated')
      .addSelect(
        `SUM(CASE WHEN proposal.status = '${ProposalStatus.PASSED}' THEN 1 ELSE 0 END)`,
        'passedProposals',
      )
      .addSelect(
        `SUM(CASE WHEN proposal.status = '${ProposalStatus.FAILED}' THEN 1 ELSE 0 END)`,
        'failedProposals',
      )
      .where('proposal.templateId IS NOT NULL')
      .groupBy('proposal.templateId')
      .addGroupBy('proposal.templateVersion')
      .getRawMany();

    return rawStats.map((stat) => {
      const template = getProposalTemplateDefinition(
        stat.templateId,
        stat.templateVersion,
      );
      const proposalsCreated = parseInt(stat.proposalsCreated || '0', 10);
      const passedProposals = parseInt(stat.passedProposals || '0', 10);
      const failedProposals = parseInt(stat.failedProposals || '0', 10);
      const successRate = proposalsCreated > 0
        ? Math.round((passedProposals / proposalsCreated) * 1000) / 10
        : 0;

      return {
        templateId: stat.templateId,
        templateVersion: stat.templateVersion,
        templateName: template?.name ?? stat.templateId,
        proposalsCreated,
        passedProposals,
        failedProposals,
        successRate,
      };
    });
  }

  async exportData(): Promise<any> {
    const proposals = await this.proposalRepo.find({
      relations: ['votes'],
      order: { createdAt: 'DESC' },
    });

    return proposals.map((p) => ({
      id: p.id,
      onChainId: p.onChainId,
      title: p.title,
      status: p.status,
      category: p.category,
      proposer: p.proposer,
      createdAt: p.createdAt.toISOString(),
      voteCount: p.votes.length,
      totalWeight: p.votes.reduce((sum, v) => sum + Number(v.weight), 0),
    }));
  }
}
