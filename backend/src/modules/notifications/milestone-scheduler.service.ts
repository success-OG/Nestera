import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../savings/entities/savings-goal.entity';
import { SavingsService } from '../savings/savings.service';
import { ShutdownTrackedTask } from '../../common/decorators/shutdown-task.decorator';

@Injectable()
export class MilestoneSchedulerService {
  private readonly logger = new Logger(MilestoneSchedulerService.name);

  // Milestones to track (percentages)
  private readonly MILESTONES = [25, 50, 75, 100];

  constructor(
    @InjectRepository(SavingsGoal)
    private readonly goalRepository: Repository<SavingsGoal>,
    private readonly savingsService: SavingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Run daily at midnight UTC
  @ShutdownTrackedTask()
  @Cron('0 0 0 * * *')
  async handleDailyMilestones() {
    this.logger.log('Running daily milestone scheduler');

    try {
      const goals = await this.goalRepository.find({
        where: { status: SavingsGoalStatus.IN_PROGRESS },
      });

      if (!goals.length) {
        this.logger.log('No active goals found');
        return;
      }

      // Group by userId to minimize repeated work
      const byUser = new Map<string, SavingsGoal[]>();
      for (const g of goals) {
        const arr = byUser.get(g.userId) || [];
        arr.push(g);
        byUser.set(g.userId, arr);
      }

      for (const [userId, userGoals] of byUser.entries()) {
        // Use existing savingsService to compute goal progress for this user
        const progresses = await this.savingsService.findMyGoals(userId);

        for (const progress of progresses) {
          const goalEntity = await this.goalRepository.findOne({
            where: { id: progress.id },
          });

          if (!goalEntity) continue;

          // Ensure milestonesSent is an object
          const sent = goalEntity.milestonesSent || {};

          for (const milestone of this.MILESTONES) {
            if (
              progress.percentageComplete >= milestone &&
              !sent[String(milestone)]
            ) {
              // Mark as sent
              sent[String(milestone)] = new Date().toISOString();
              goalEntity.milestonesSent = sent;
              await this.goalRepository.save(goalEntity);

              // Emit event for notifications and analytics
              this.eventEmitter.emit('goal.milestone', {
                userId,
                goalId: progress.id,
                percentage: milestone,
                goalName: progress.goalName,
                metadata: {
                  currentBalance: progress.currentBalance,
                  targetAmount: progress.targetAmount,
                },
              });

              // Also write a lightweight analytics row for tracking
              try {
                await this.goalRepository.manager.insert(
                  'goal_milestone_events',
                  {
                    userId,
                    goalId: progress.id,
                    percentage: milestone,
                    metadata: {
                      currentBalance: progress.currentBalance,
                      targetAmount: progress.targetAmount,
                    },
                  },
                );
              } catch (e) {
                this.logger.warn('Failed to insert milestone analytics row', e);
              }
            }
          }
        }
      }

      this.logger.log('Daily milestone scheduler completed');
    } catch (error) {
      this.logger.error('Error running milestone scheduler', error);
    }
  }
}
