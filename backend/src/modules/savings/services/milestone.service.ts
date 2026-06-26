import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SavingsGoalMilestone,
  MilestoneType,
} from '../entities/savings-goal-milestone.entity';
import { SavingsGoal } from '../entities/savings-goal.entity';

/** Bonus points awarded per automatic milestone tier */
const MILESTONE_BONUS_POINTS: Record<number, number> = {
  25: 50,
  50: 100,
  75: 150,
  100: 250,
};

const AUTOMATIC_MILESTONES = [25, 50, 75, 100];

@Injectable()
export class MilestoneService {
  private readonly logger = new Logger(MilestoneService.name);

  constructor(
    @InjectRepository(SavingsGoalMilestone)
    private readonly milestoneRepository: Repository<SavingsGoalMilestone>,
    @InjectRepository(SavingsGoal)
    private readonly goalRepository: Repository<SavingsGoal>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Ensure the four automatic milestones (25/50/75/100%) exist for a goal.
   * Called when a goal is created.
   */
  async initializeAutomaticMilestones(
    goalId: string,
    userId: string,
  ): Promise<void> {
    const existing = await this.milestoneRepository.find({
      where: { goalId, type: MilestoneType.AUTOMATIC },
    });

    const existingPercentages = new Set(existing.map((m) => m.percentage));

    const toCreate = AUTOMATIC_MILESTONES.filter(
      (p) => !existingPercentages.has(p),
    ).map((percentage) =>
      this.milestoneRepository.create({
        goalId,
        userId,
        percentage,
        label: `${percentage}% of goal reached`,
        type: MilestoneType.AUTOMATIC,
        achieved: false,
        achievedAt: null,
        bonusPoints: MILESTONE_BONUS_POINTS[percentage] ?? 0,
      }),
    );

    if (toCreate.length) {
      await this.milestoneRepository.save(toCreate);
    }
  }

  /**
   * Check current progress and mark any newly-crossed milestones as achieved.
   * Emits `milestone.achieved` events for each newly achieved milestone.
   *
   * @param goalId Goal UUID
   * @param userId Owner user UUID
   * @param percentageComplete Current completion percentage (0–100)
   */
  async detectAndAchieveMilestones(
    goalId: string,
    userId: string,
    percentageComplete: number,
  ): Promise<SavingsGoalMilestone[]> {
    const milestones = await this.milestoneRepository.find({
      where: { goalId, achieved: false },
    });

    const nowAchieved = milestones.filter(
      (m) => percentageComplete >= m.percentage,
    );

    if (!nowAchieved.length) {
      return [];
    }

    const achievedAt = new Date();
    for (const milestone of nowAchieved) {
      milestone.achieved = true;
      milestone.achievedAt = achievedAt;
    }

    const saved = await this.milestoneRepository.save(nowAchieved);

    for (const milestone of saved) {
      this.eventEmitter.emit('milestone.achieved', {
        userId,
        goalId,
        milestoneId: milestone.id,
        percentage: milestone.percentage,
        label: milestone.label,
        bonusPoints: milestone.bonusPoints,
        achievedAt: milestone.achievedAt,
      });

      // Also emit goal-specific event for badge system
      this.eventEmitter.emit('goal.milestone', {
        userId,
        goalId,
        percentage: milestone.percentage,
        goalName: '', // Will be filled by caller
      });
    }

    return saved;
  }

  /**
   * GET /savings/goals/:id/milestones
   */
  async getMilestones(
    goalId: string,
    userId: string,
  ): Promise<SavingsGoalMilestone[]> {
    await this.assertGoalOwnership(goalId, userId);

    return this.milestoneRepository.find({
      where: { goalId },
      order: { percentage: 'ASC' },
    });
  }

  /**
   * POST /savings/goals/:id/milestones/custom
   */
  async addCustomMilestone(
    goalId: string,
    userId: string,
    percentage: number,
    label: string,
  ): Promise<SavingsGoalMilestone> {
    await this.assertGoalOwnership(goalId, userId);

    const conflict = await this.milestoneRepository.findOne({
      where: { goalId, percentage },
    });

    if (conflict) {
      throw new BadRequestException(
        `A milestone at ${percentage}% already exists for this goal`,
      );
    }

    const milestone = this.milestoneRepository.create({
      goalId,
      userId,
      percentage,
      label,
      type: MilestoneType.CUSTOM,
      achieved: false,
      achievedAt: null,
      bonusPoints: 0,
    });

    return this.milestoneRepository.save(milestone);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async assertGoalOwnership(
    goalId: string,
    userId: string,
  ): Promise<SavingsGoal> {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new NotFoundException(
        `Savings goal ${goalId} not found or does not belong to user`,
      );
    }

    return goal;
  }
}
