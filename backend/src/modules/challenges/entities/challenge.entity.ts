import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChallengeType {
  DEPOSIT_STREAK = 'deposit_streak',
  GOAL_CREATION = 'goal_creation',
  REFERRAL = 'referral',
  SAVINGS_TARGET = 'savings_target',
  TRANSACTION_COUNT = 'transaction_count',
}

export enum ChallengeStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface RewardConfiguration {
  type: 'badge' | 'points' | 'token' | 'nft' | 'multiplier';
  value: number | string;
  metadata?: Record<string, any>;
}

export interface ChallengeRules {
  // For deposit_streak
  requiredStreakDays?: number;
  minimumDepositAmount?: number;

  // For goal_creation
  requiredGoalsCount?: number;
  minimumGoalAmount?: number;

  // For referral
  requiredReferralsCount?: number;
  referralMustComplete?: boolean;

  // For savings_target
  targetAmount?: number;
  allowPartialCredit?: boolean;

  // For transaction_count
  requiredTransactionCount?: number;
  transactionType?: 'deposit' | 'withdrawal' | 'any';

  // General
  maxParticipants?: number;
  requiresKYC?: boolean;
  minimumAccountAge?: number; // in days
  excludedUserIds?: string[];
}

@Entity('challenges')
@Index(['type', 'status'])
@Index(['startDate', 'endDate'])
@Index(['status'])
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: ChallengeType,
  })
  type!: ChallengeType;

  @Column({
    type: 'enum',
    enum: ChallengeStatus,
    default: ChallengeStatus.DRAFT,
  })
  status!: ChallengeStatus;

  @Column({ type: 'timestamp' })
  startDate!: Date;

  @Column({ type: 'timestamp' })
  endDate!: Date;

  @Column({ type: 'jsonb' })
  rewardConfiguration!: RewardConfiguration;

  @Column({ type: 'jsonb' })
  rules!: ChallengeRules;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  badgeName?: string;

  @Column({ type: 'int', default: 0 })
  participantCount!: number;

  @Column({ type: 'int', default: 0 })
  completionCount!: number;

  @Column({ type: 'boolean', default: true })
  isVisible!: boolean;

  @Column({ type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;
}
