import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  GoalTransferExecution,
  GoalTransferExecutionStatus,
  GoalTransferSchedule,
  GoalTransferFrequency,
  GoalTransferStatus,
} from '../entities/goal-transfer-schedule.entity';
import { CreateGoalTransferScheduleDto } from '../dto/goal-transfer.dto';
import { SavingsService } from '../savings.service';
import {
  SavingsGoal,
  SavingsGoalStatus,
} from '../entities/savings-goal.entity';
import { User } from '../../user/entities/user.entity';
import { MailService } from '../../mail/mail.service';
import { ShutdownTrackedTask } from '../../../common/decorators/shutdown-task.decorator';

const MAX_RETRIES = 5;
const MIN_TRANSFER_AMOUNT = 0.01;

@Injectable()
export class GoalTransferService {
  private readonly logger = new Logger(GoalTransferService.name);

  constructor(
    @InjectRepository(GoalTransferSchedule)
    private readonly scheduleRepo: Repository<GoalTransferSchedule>,
    @InjectRepository(GoalTransferExecution)
    private readonly executionRepo: Repository<GoalTransferExecution>,
    @InjectRepository(SavingsGoal)
    private readonly goalRepo: Repository<SavingsGoal>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly savingsService: SavingsService,
    private readonly mailService: MailService,
  ) {}

  async create(
    userId: string,
    dto: CreateGoalTransferScheduleDto,
  ): Promise<GoalTransferSchedule> {
    await this.validateSchedule(userId, dto);

    const nextRunAt = this.computeNextRun(dto.frequency);
    const schedule = this.scheduleRepo.create({
      userId,
      goalId: dto.goalId,
      productId: dto.productId ?? null,
      amount: dto.amount,
      frequency: dto.frequency,
      status: GoalTransferStatus.ACTIVE,
      nextRunAt,
    });
    return this.scheduleRepo.save(schedule);
  }

  async findAllForUser(userId: string): Promise<GoalTransferSchedule[]> {
    return this.scheduleRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async pause(id: string, userId: string): Promise<GoalTransferSchedule> {
    const schedule = await this.findOwned(id, userId);
    if (schedule.status === GoalTransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot pause a cancelled schedule');
    }
    schedule.status = GoalTransferStatus.PAUSED;
    return this.scheduleRepo.save(schedule);
  }

  async resume(id: string, userId: string): Promise<GoalTransferSchedule> {
    const schedule = await this.findOwned(id, userId);
    if (schedule.status === GoalTransferStatus.CANCELLED) {
      throw new BadRequestException('Cannot resume a cancelled schedule');
    }
    schedule.status = GoalTransferStatus.ACTIVE;
    if (schedule.nextRunAt <= new Date()) {
      schedule.nextRunAt = this.computeNextRun(schedule.frequency);
    }
    return this.scheduleRepo.save(schedule);
  }

  async cancel(id: string, userId: string): Promise<void> {
    const schedule = await this.findOwned(id, userId);
    schedule.status = GoalTransferStatus.CANCELLED;
    await this.scheduleRepo.save(schedule);
  }

  async getExecutions(
    scheduleId: string,
    userId: string,
  ): Promise<GoalTransferExecution[]> {
    await this.findOwned(scheduleId, userId);
    return this.executionRepo.find({
      where: { scheduleId },
      order: { executedAt: 'DESC' },
    });
  }

  @ShutdownTrackedTask()
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules(): Promise<void> {
    const now = new Date();
    const due = await this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.status = :status', { status: GoalTransferStatus.ACTIVE })
      .andWhere('s.nextRunAt <= :now', { now })
      .getMany();

    for (const schedule of due) {
      await this.executeSchedule(schedule);
    }
  }

  private async executeSchedule(schedule: GoalTransferSchedule): Promise<void> {
    try {
      await this.savingsService.transferToGoal(
        schedule.userId,
        schedule.goalId,
        Number(schedule.amount),
        schedule.productId ?? undefined,
      );

      await this.recordExecution(schedule, GoalTransferExecutionStatus.SUCCESS);

      schedule.retryCount = 0;
      schedule.nextRunAt = this.computeNextRun(schedule.frequency);
      await this.scheduleRepo.save(schedule);

      const user = await this.userRepo.findOne({
        where: { id: schedule.userId },
      });
      const goal = await this.goalRepo.findOne({
        where: { id: schedule.goalId },
      });
      if (user?.email) {
        await this.mailService.sendSavingsAlertEmail(
          user.email,
          user.name ?? 'User',
          `Auto-transfer of ${schedule.amount} XLM to goal "${goal?.goalName ?? schedule.goalId}" completed successfully.`,
        );
      }

      this.logger.log(`Goal transfer executed for schedule ${schedule.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.recordExecution(
        schedule,
        GoalTransferExecutionStatus.FAILED,
        message,
      );

      schedule.retryCount += 1;
      if (schedule.retryCount >= MAX_RETRIES) {
        schedule.status = GoalTransferStatus.CANCELLED;
        this.logger.error(
          `Goal transfer schedule ${schedule.id} cancelled after ${MAX_RETRIES} failures`,
        );
      } else {
        const backoffMs = Math.pow(2, schedule.retryCount) * 60_000;
        schedule.nextRunAt = new Date(Date.now() + backoffMs);
        this.logger.warn(
          `Goal transfer schedule ${schedule.id} retry ${schedule.retryCount}`,
        );
      }
      await this.scheduleRepo.save(schedule);
    }
  }

  private async recordExecution(
    schedule: GoalTransferSchedule,
    status: GoalTransferExecutionStatus,
    errorMessage?: string,
  ): Promise<void> {
    const execution = this.executionRepo.create({
      scheduleId: schedule.id,
      userId: schedule.userId,
      goalId: schedule.goalId,
      amount: schedule.amount,
      status,
      errorMessage: errorMessage ?? null,
    });
    await this.executionRepo.save(execution);
  }

  private async validateSchedule(
    userId: string,
    dto: CreateGoalTransferScheduleDto,
  ): Promise<void> {
    if (dto.amount < MIN_TRANSFER_AMOUNT) {
      throw new BadRequestException(
        `Minimum transfer amount is ${MIN_TRANSFER_AMOUNT}`,
      );
    }

    const goal = await this.goalRepo.findOne({
      where: { id: dto.goalId, userId },
    });
    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }
    if (goal.status !== SavingsGoalStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Cannot schedule transfers to a completed goal',
      );
    }

    const existing = await this.scheduleRepo.findOne({
      where: {
        userId,
        goalId: dto.goalId,
        status: GoalTransferStatus.ACTIVE,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'An active transfer schedule already exists for this goal',
      );
    }

    if (dto.productId) {
      await this.savingsService.findOneProduct(dto.productId);
    } else {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user?.defaultSavingsProductId) {
        throw new BadRequestException(
          'productId is required when no default savings product is configured',
        );
      }
    }
  }

  private async findOwned(
    id: string,
    userId: string,
  ): Promise<GoalTransferSchedule> {
    const schedule = await this.scheduleRepo.findOne({ where: { id, userId } });
    if (!schedule) {
      throw new NotFoundException(`Goal transfer schedule ${id} not found`);
    }
    return schedule;
  }

  computeNextRun(frequency: GoalTransferFrequency, from = new Date()): Date {
    const next = new Date(from);
    switch (frequency) {
      case GoalTransferFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case GoalTransferFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case GoalTransferFrequency.BI_WEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case GoalTransferFrequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  }
}
