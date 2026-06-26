import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Badge, BadgeCategory, BadgeTier } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { User } from '../user/entities/user.entity';
import { BadgeDto, UserBadgeDto, BadgeStatsDto } from './dto/badge.dto';
import { randomBytes } from 'crypto';

export interface BadgeEarnedEvent {
  userId: string;
  badgeId: string;
  badgeCode: string;
  badgeName: string;
  points: number;
  earnedAt: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize default badges in the system
   */
  async initializeDefaultBadges(): Promise<void> {
    const existingBadges = await this.badgeRepository.find();
    if (existingBadges.length > 0) {
      this.logger.log('Badges already initialized');
      return;
    }

    const defaultBadges: Partial<Badge>[] = [
      {
        code: 'first_deposit',
        name: 'First Saver',
        description: 'Made your first deposit into a savings goal',
        category: BadgeCategory.SAVINGS,
        tier: BadgeTier.BRONZE,
        icon: 'first-deposit',
        color: '#CD7F32',
        points: 50,
        criteria: { type: 'first_deposit' },
      },
      {
        code: 'goal_25',
        name: 'Quarter Way',
        description: 'Reached 25% of your savings goal',
        category: BadgeCategory.GOAL,
        tier: BadgeTier.BRONZE,
        icon: 'goal-25',
        color: '#CD7F32',
        points: 25,
        criteria: { type: 'milestone', percentage: 25 },
      },
      {
        code: 'goal_50',
        name: 'Halfway There',
        description: 'Reached 50% of your savings goal',
        category: BadgeCategory.GOAL,
        tier: BadgeTier.SILVER,
        icon: 'goal-50',
        color: '#C0C0C0',
        points: 50,
        criteria: { type: 'milestone', percentage: 50 },
      },
      {
        code: 'goal_75',
        name: 'Almost There',
        description: 'Reached 75% of your savings goal',
        category: BadgeCategory.GOAL,
        tier: BadgeTier.SILVER,
        icon: 'goal-75',
        color: '#C0C0C0',
        points: 75,
        criteria: { type: 'milestone', percentage: 75 },
      },
      {
        code: 'goal_complete',
        name: 'Goal Achiever',
        description: 'Successfully completed a savings goal',
        category: BadgeCategory.GOAL,
        tier: BadgeTier.GOLD,
        icon: 'goal-complete',
        color: '#FFD700',
        points: 100,
        criteria: { type: 'milestone', percentage: 100 },
      },
      {
        code: 'streak_7',
        name: 'Week Warrior',
        description: 'Maintained a 7-day deposit streak',
        category: BadgeCategory.STREAK,
        tier: BadgeTier.BRONZE,
        icon: 'streak-7',
        color: '#CD7F32',
        points: 35,
        criteria: { type: 'streak', days: 7 },
      },
      {
        code: 'streak_30',
        name: 'Monthly Master',
        description: 'Maintained a 30-day deposit streak',
        category: BadgeCategory.STREAK,
        tier: BadgeTier.SILVER,
        icon: 'streak-30',
        color: '#C0C0C0',
        points: 75,
        criteria: { type: 'streak', days: 30 },
      },
      {
        code: 'streak_90',
        name: 'Quarter Champion',
        description: 'Maintained a 90-day deposit streak',
        category: BadgeCategory.STREAK,
        tier: BadgeTier.GOLD,
        icon: 'streak-90',
        color: '#FFD700',
        points: 150,
        criteria: { type: 'streak', days: 90 },
      },
      {
        code: 'multi_goal',
        name: 'Savings Champion',
        description: 'Completed 3 or more savings goals',
        category: BadgeCategory.SAVINGS,
        tier: BadgeTier.GOLD,
        icon: 'multi-goal',
        color: '#FFD700',
        points: 200,
        criteria: { type: 'multi_goal', count: 3 },
      },
      {
        code: 'early_bird',
        name: 'Early Bird',
        description: 'Completed a goal before the target date',
        category: BadgeCategory.GOAL,
        tier: BadgeTier.SILVER,
        icon: 'early-bird',
        color: '#C0C0C0',
        points: 60,
        criteria: { type: 'early_completion' },
      },
      {
        code: 'platinum_saver',
        name: 'Platinum Saver',
        description: 'Earned 10 or more badges',
        category: BadgeCategory.SAVINGS,
        tier: BadgeTier.PLATINUM,
        icon: 'platinum-saver',
        color: '#E5E4E2',
        points: 500,
        criteria: { type: 'badge_count', count: 10 },
      },
    ];

    await this.badgeRepository.save(defaultBadges);
    this.logger.log(`Initialized ${defaultBadges.length} default badges`);
  }

  /**
   * Check and award badges based on milestone achievement
   */
  async checkMilestoneBadge(
    userId: string,
    goalId: string,
    percentage: number,
    goalName: string,
  ): Promise<void> {
    try {
      const badgeCode = `goal_${percentage}`;
      const badge = await this.badgeRepository.findOne({
        where: { code: badgeCode, active: true },
      });

      if (!badge) {
        return;
      }

      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeId: badge.id },
      });

      if (existing) {
        return;
      }

      await this.awardBadge(userId, badge.id, {
        goalId,
        goalName,
        percentage,
      });
    } catch (error) {
      this.logger.error(
        `Error checking milestone badge for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Check and award first deposit badge
   */
  async checkFirstDepositBadge(userId: string): Promise<void> {
    try {
      const badge = await this.badgeRepository.findOne({
        where: { code: 'first_deposit', active: true },
      });

      if (!badge) {
        return;
      }

      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeId: badge.id },
      });

      if (existing) {
        return;
      }

      await this.awardBadge(userId, badge.id);
    } catch (error) {
      this.logger.error(
        `Error checking first deposit badge for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Check and award streak badges
   */
  async checkStreakBadge(userId: string, streakDays: number): Promise<void> {
    try {
      const streakBadges = [7, 30, 90];
      for (const days of streakBadges) {
        if (streakDays >= days) {
          const badgeCode = `streak_${days}`;
          const badge = await this.badgeRepository.findOne({
            where: { code: badgeCode, active: true },
          });

          if (!badge) continue;

          const existing = await this.userBadgeRepository.findOne({
            where: { userId, badgeId: badge.id },
          });

          if (!existing) {
            await this.awardBadge(userId, badge.id, { streakDays });
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking streak badge for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Check and award multi-goal badge
   */
  async checkMultiGoalBadge(userId: string): Promise<void> {
    try {
      const badge = await this.badgeRepository.findOne({
        where: { code: 'multi_goal', active: true },
      });

      if (!badge) return;

      const existing = await this.userBadgeRepository.findOne({
        where: { userId, badgeId: badge.id },
      });

      if (existing) return;

      const completedGoals = await this.userBadgeRepository
        .createQueryBuilder('ub')
        .innerJoin('ub.badge', 'b')
        .where('ub.userId = :userId', { userId })
        .andWhere('b.code = :code', { code: 'goal_complete' })
        .getCount();

      if (completedGoals >= 3) {
        await this.awardBadge(userId, badge.id, {
          completedGoals,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error checking multi-goal badge for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Award a badge to a user
   */
  async awardBadge(
    userId: string,
    badgeId: string,
    metadata?: Record<string, any>,
  ): Promise<UserBadge> {
    const badge = await this.badgeRepository.findOne({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException(`Badge ${badgeId} not found`);
    }

    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeId },
    });

    if (existing) {
      return existing;
    }

    const userBadge = this.userBadgeRepository.create({
      userId,
      badgeId,
      earnedAt: new Date(),
      progress: null,
      shared: false,
      metadata,
    });

    const saved = await this.userBadgeRepository.save(userBadge);

    // Emit badge earned event
    this.eventEmitter.emit('badge.earned', {
      userId,
      badgeId: badge.id,
      badgeCode: badge.code,
      badgeName: badge.name,
      points: badge.points,
      earnedAt: saved.earnedAt,
      metadata,
    });

    this.logger.log(
      `Awarded badge ${badge.code} to user ${userId} (${badge.points} points)`,
    );

    return saved;
  }

  /**
   * Get all badges
   */
  async getAllBadges(): Promise<Badge[]> {
    return this.badgeRepository.find({
      order: { tier: 'ASC', points: 'ASC' },
    });
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string): Promise<UserBadgeDto[]> {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });

    return userBadges.map((ub) => this.mapToUserBadgeDto(ub));
  }

  /**
   * Get available badges with earning status
   */
  async getAvailableBadges(userId: string): Promise<BadgeDto[]> {
    const allBadges = await this.badgeRepository.find({
      where: { active: true },
      order: { tier: 'ASC', points: 'ASC' },
    });

    const userBadgeIds = (
      await this.userBadgeRepository.find({
        where: { userId },
        select: ['badgeId'],
      })
    ).map((ub) => ub.badgeId);

    return allBadges.map((badge) => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      tier: badge.tier,
      icon: badge.icon,
      color: badge.color,
      points: badge.points,
      active: badge.active,
      criteria: badge.criteria ?? undefined,
      createdAt: badge.createdAt,
      updatedAt: badge.updatedAt,
      earned: userBadgeIds.includes(badge.id),
    }));
  }

  /**
   * Get badge statistics for a user
   */
  async getBadgeStats(userId: string): Promise<BadgeStatsDto> {
    const userBadges = await this.userBadgeRepository.find({
      where: { userId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });

    const totalBadges = await this.badgeRepository.count({
      where: { active: true },
    });

    const earnedBadges = userBadges.length;
    const totalPoints = userBadges.reduce(
      (sum, ub) => sum + ub.badge.points,
      0,
    );

    const recentBadges = userBadges
      .slice(0, 5)
      .map((ub) => this.mapToUserBadgeDto(ub));

    const categoryBreakdown: Record<BadgeCategory, number> = {
      [BadgeCategory.SAVINGS]: 0,
      [BadgeCategory.STREAK]: 0,
      [BadgeCategory.GOAL]: 0,
      [BadgeCategory.SOCIAL]: 0,
    };

    userBadges.forEach((ub) => {
      categoryBreakdown[ub.badge.category]++;
    });

    return {
      totalBadges,
      earnedBadges,
      totalPoints,
      recentBadges,
      categoryBreakdown,
    };
  }

  /**
   * Generate share token for a badge
   */
  async generateShareToken(
    userId: string,
    userBadgeId: string,
  ): Promise<string> {
    const userBadge = await this.userBadgeRepository.findOne({
      where: { id: userBadgeId, userId },
      relations: ['badge'],
    });

    if (!userBadge) {
      throw new NotFoundException('User badge not found');
    }

    if (userBadge.shareToken) {
      return userBadge.shareToken;
    }

    const shareToken = randomBytes(32).toString('hex');
    userBadge.shareToken = shareToken;
    userBadge.shared = true;
    userBadge.sharedAt = new Date();

    await this.userBadgeRepository.save(userBadge);

    return shareToken;
  }

  /**
   * Get shared badge by token
   */
  async getSharedBadge(shareToken: string): Promise<UserBadgeDto> {
    const userBadge = await this.userBadgeRepository.findOne({
      where: { shareToken },
      relations: ['badge', 'user'],
    });

    if (!userBadge) {
      throw new NotFoundException('Shared badge not found');
    }

    return this.mapToUserBadgeDto(userBadge);
  }

  /**
   * Map UserBadge entity to DTO
   */
  private mapToUserBadgeDto(userBadge: UserBadge): UserBadgeDto {
    return {
      id: userBadge.id,
      badge: {
        id: userBadge.badge.id,
        code: userBadge.badge.code,
        name: userBadge.badge.name,
        description: userBadge.badge.description,
        category: userBadge.badge.category,
        tier: userBadge.badge.tier,
        icon: userBadge.badge.icon,
        color: userBadge.badge.color,
        points: userBadge.badge.points,
        active: userBadge.badge.active,
        criteria: userBadge.badge.criteria ?? undefined,
      },
      earnedAt: userBadge.earnedAt,
      progress: userBadge.progress ?? undefined,
      shared: userBadge.shared,
      sharedAt: userBadge.sharedAt ?? undefined,
      shareToken: userBadge.shareToken ?? undefined,
      metadata: userBadge.metadata ?? undefined,
    };
  }

  /**
   * Listen to goal.milestone events and award badges
   */
  @OnEvent('goal.milestone')
  async handleGoalMilestone(event: {
    userId: string;
    goalId: string;
    percentage: number;
    goalName: string;
  }): Promise<void> {
    this.logger.log(
      `Processing goal.milestone event for user ${event.userId}, percentage ${event.percentage}`,
    );

    try {
      await this.checkMilestoneBadge(
        event.userId,
        event.goalId,
        event.percentage,
        event.goalName,
      );

      // Check for multi-goal badge when goal is completed
      if (event.percentage === 100) {
        await this.checkMultiGoalBadge(event.userId);
      }
    } catch (error) {
      this.logger.error(
        `Error processing goal.milestone event for user ${event.userId}`,
        error,
      );
    }
  }

  /**
   * Listen to deposit events and award first deposit badge
   */
  @OnEvent('deposit.completed')
  async handleDepositCompleted(event: {
    userId: string;
    amount: number;
  }): Promise<void> {
    this.logger.log(
      `Processing deposit.completed event for user ${event.userId}`,
    );

    try {
      await this.checkFirstDepositBadge(event.userId);
    } catch (error) {
      this.logger.error(
        `Error processing deposit.completed event for user ${event.userId}`,
        error,
      );
    }
  }
}
