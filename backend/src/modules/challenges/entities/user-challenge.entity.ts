import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

export interface ProgressMetadata {
  // For deposit_streak
  currentStreak?: number;
  lastDepositDate?: string;
  streakHistory?: string[]; // Array of dates

  // For goal_creation
  goalsCreated?: number;
  goalIds?: string[];

  // For referral
  referralsCount?: number;
  referralIds?: string[];
  completedReferrals?: number;

  // For savings_target
  currentAmount?: number;
  deposits?: Array<{
    amount: number;
    date: string;
  }>;

  // For transaction_count
  transactionCount?: number;
  transactionIds?: string[];

  // General
  milestones?: Array<{
    name: string;
    achieved: boolean;
    achievedAt?: string;
  }>;
  lastUpdated?: string;
}

@Entity('user_challenges')
@Index(['userId', 'challengeId'], { unique: true })
@Index(['userId', 'status'])
@Index(['challengeId', 'status'])
@Index(['status', 'joinedAt'])
export class UserChallenge {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  challengeId!: string;

  @Column({
    type: 'enum',
    enum: UserChallengeStatus,
    default: UserChallengeStatus.ACTIVE,
  })
  status!: UserChallengeStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  progressPercentage!: number;

  @Column({ type: 'jsonb', default: '{}' })
  progressMetadata!: ProgressMetadata;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiredAt?: Date;

  @Column({ type: 'boolean', default: false })
  rewardClaimed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  rewardClaimedAt?: Date;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  @CreateDateColumn()
  joinedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
