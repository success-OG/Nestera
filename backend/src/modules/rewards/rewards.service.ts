import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRewardProfile } from './entities/user-reward-profile.entity';
import {
  UserSubscription,
  SubscriptionStatus,
} from '../savings/entities/user-subscription.entity';
import {
  LeaderboardQueryDto,
  LeaderboardPeriod,
} from './dto/leaderboard-query.dto';

export interface LeaderboardEntry {
  userId: string;
  rank: number;
  value: number;
}

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  currentUser?: { rank: number; value: number };
}

@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(UserRewardProfile)
    private readonly profileRepository: Repository<UserRewardProfile>,
    @InjectRepository(UserSubscription)
    private readonly subscriptionRepository: Repository<UserSubscription>,
  ) {}

  async getPointsLeaderboard(
    query: LeaderboardQueryDto,
    currentUserId?: string,
  ): Promise<LeaderboardResult> {
    const {
      page = 1,
      limit = 100,
      period = LeaderboardPeriod.ALL_TIME,
    } = query;
    const since = this.getPeriodStartDate(period);
    const offset = (page - 1) * limit;

    const qb = this.profileRepository
      .createQueryBuilder('p')
      .where('p.isLeaderboardVisible = :vis', { vis: true });

    if (since) {
      qb.andWhere('p.updatedAt >= :since', { since });
    }

    qb.orderBy('p.totalPoints', 'DESC').skip(offset).take(limit);

    const profiles = await qb.getMany();

    const leaderboard: LeaderboardEntry[] = profiles.map((p, idx) => ({
      userId: p.userId,
      rank: offset + idx + 1,
      value: Number(p.totalPoints),
    }));

    let currentUser: { rank: number; value: number } | undefined;
    if (currentUserId) {
      currentUser = await this.getUserPointsRank(currentUserId, since);
    }

    return {
      leaderboard,
      ...(currentUser !== undefined ? { currentUser } : {}),
    };
  }

  async getStreaksLeaderboard(
    query: LeaderboardQueryDto,
    currentUserId?: string,
  ): Promise<LeaderboardResult> {
    const {
      page = 1,
      limit = 100,
      period = LeaderboardPeriod.ALL_TIME,
    } = query;
    const since = this.getPeriodStartDate(period);
    const offset = (page - 1) * limit;

    const qb = this.profileRepository
      .createQueryBuilder('p')
      .where('p.isLeaderboardVisible = :vis', { vis: true });

    if (since) {
      qb.andWhere('p.updatedAt >= :since', { since });
    }

    qb.orderBy('p.longestStreak', 'DESC').skip(offset).take(limit);

    const profiles = await qb.getMany();

    const leaderboard: LeaderboardEntry[] = profiles.map((p, idx) => ({
      userId: p.userId,
      rank: offset + idx + 1,
      value: p.longestStreak,
    }));

    let currentUser: { rank: number; value: number } | undefined;
    if (currentUserId) {
      currentUser = await this.getUserStreakRank(currentUserId, since);
    }

    return {
      leaderboard,
      ...(currentUser !== undefined ? { currentUser } : {}),
    };
  }

  async getSavingsLeaderboard(
    query: LeaderboardQueryDto,
    currentUserId?: string,
  ): Promise<LeaderboardResult> {
    const {
      page = 1,
      limit = 100,
      period = LeaderboardPeriod.ALL_TIME,
    } = query;
    const since = this.getPeriodStartDate(period);
    const offset = (page - 1) * limit;

    const hiddenUserIds = await this.getHiddenUserIds();

    const qb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('sub.userId', 'userId')
      .addSelect('SUM(sub.amount)', 'totalSaved')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE });

    if (since) {
      qb.andWhere('sub.createdAt >= :since', { since });
    }

    if (hiddenUserIds.length > 0) {
      qb.andWhere('sub.userId NOT IN (:...hiddenUserIds)', { hiddenUserIds });
    }

    qb.groupBy('sub.userId')
      .orderBy('"totalSaved"', 'DESC')
      .offset(offset)
      .limit(limit);

    const rows: { userId: string; totalSaved: string }[] =
      await qb.getRawMany();

    const leaderboard: LeaderboardEntry[] = rows.map((row, idx) => ({
      userId: row.userId,
      rank: offset + idx + 1,
      value: Number(row.totalSaved),
    }));

    let currentUser: { rank: number; value: number } | undefined;
    if (currentUserId) {
      currentUser = await this.getUserSavingsRank(
        currentUserId,
        since,
        hiddenUserIds,
      );
    }

    return {
      leaderboard,
      ...(currentUser !== undefined ? { currentUser } : {}),
    };
  }

  async updateVisibility(
    userId: string,
    isVisible: boolean,
  ): Promise<{ isLeaderboardVisible: boolean }> {
    let profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profileRepository.create({
        userId,
        isLeaderboardVisible: isVisible,
      });
    } else {
      profile.isLeaderboardVisible = isVisible;
    }

    await this.profileRepository.save(profile);
    return { isLeaderboardVisible: isVisible };
  }

  private async getUserPointsRank(
    userId: string,
    since: Date | null,
  ): Promise<{ rank: number; value: number } | undefined> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) return undefined;

    const userPoints = Number(profile.totalPoints);

    const qb = this.profileRepository
      .createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .where('p.isLeaderboardVisible = :vis', { vis: true })
      .andWhere('p.totalPoints > :val', { val: userPoints });

    if (since) {
      qb.andWhere('p.updatedAt >= :since', { since });
    }

    const row = await qb.getRawOne<{ count: string }>();
    return { rank: Number(row?.count ?? 0) + 1, value: userPoints };
  }

  private async getUserStreakRank(
    userId: string,
    since: Date | null,
  ): Promise<{ rank: number; value: number } | undefined> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) return undefined;

    const userStreak = profile.longestStreak;

    const qb = this.profileRepository
      .createQueryBuilder('p')
      .select('COUNT(*)', 'count')
      .where('p.isLeaderboardVisible = :vis', { vis: true })
      .andWhere('p.longestStreak > :val', { val: userStreak });

    if (since) {
      qb.andWhere('p.updatedAt >= :since', { since });
    }

    const row = await qb.getRawOne<{ count: string }>();
    return { rank: Number(row?.count ?? 0) + 1, value: userStreak };
  }

  private async getUserSavingsRank(
    userId: string,
    since: Date | null,
    hiddenUserIds: string[],
  ): Promise<{ rank: number; value: number } | undefined> {
    const userQb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('SUM(sub.amount)', 'totalSaved')
      .where('sub.userId = :userId', { userId })
      .andWhere('sub.status = :status', { status: SubscriptionStatus.ACTIVE });

    if (since) {
      userQb.andWhere('sub.createdAt >= :since', { since });
    }

    const userRow = await userQb.getRawOne<{ totalSaved: string | null }>();
    const userTotal = Number(userRow?.totalSaved ?? 0);

    const countQb = this.subscriptionRepository
      .createQueryBuilder('sub')
      .select('sub.userId', 'userId')
      .where('sub.status = :status', { status: SubscriptionStatus.ACTIVE });

    if (since) {
      countQb.andWhere('sub.createdAt >= :since', { since });
    }

    if (hiddenUserIds.length > 0) {
      countQb.andWhere('sub.userId NOT IN (:...hiddenUserIds)', {
        hiddenUserIds,
      });
    }

    countQb
      .groupBy('sub.userId')
      .having('SUM(sub.amount) > :val', { val: userTotal });

    const usersAbove = await countQb.getCount();

    return { rank: usersAbove + 1, value: userTotal };
  }

  private async getHiddenUserIds(): Promise<string[]> {
    const hidden = await this.profileRepository.find({
      where: { isLeaderboardVisible: false },
      select: ['userId'],
    });
    return hidden.map((p) => p.userId);
  }

  private getPeriodStartDate(period: LeaderboardPeriod): Date | null {
    if (period === LeaderboardPeriod.WEEKLY) {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d;
    }
    if (period === LeaderboardPeriod.MONTHLY) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d;
    }
    return null;
  }
}
