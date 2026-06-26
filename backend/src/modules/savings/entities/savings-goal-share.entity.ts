import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SavingsGoal } from './savings-goal.entity';
import { User } from '../../user/entities/user.entity';

export enum SavingsGoalShareVisibility {
  PRIVATE = 'PRIVATE',
  FRIENDS = 'FRIENDS',
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
}

@Entity('savings_goal_shares')
@Index('IDX_SAVINGS_GOAL_SHARES_GOAL_ID', ['goalId'], { unique: true })
@Index('IDX_SAVINGS_GOAL_SHARES_TOKEN', ['shareToken'], { unique: true })
@Index('IDX_SAVINGS_GOAL_SHARES_DIRECTORY', ['visibility', 'isDirectoryListed'])
export class SavingsGoalShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  goalId: string;

  @Column('uuid')
  ownerId: string;

  @Column({
    type: 'enum',
    enum: SavingsGoalShareVisibility,
    default: SavingsGoalShareVisibility.PRIVATE,
  })
  visibility: SavingsGoalShareVisibility;

  @Column({ type: 'varchar', length: 80, nullable: true })
  shareToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isDirectoryListed: boolean;

  @Column({ type: 'boolean', default: true })
  showProgress: boolean;

  @Column({ type: 'boolean', default: false })
  showTargetAmount: boolean;

  @Column({ type: 'boolean', default: true })
  showOwnerName: boolean;

  @Column({ type: 'boolean', default: true })
  allowSocialSharing: boolean;

  @Column({ type: 'boolean', default: true })
  allowProgressUpdates: boolean;

  @Column({ type: 'jsonb', nullable: true })
  allowedUserIds: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => SavingsGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: SavingsGoal;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;
}
