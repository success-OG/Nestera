import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SavingsGoalShare } from './savings-goal-share.entity';
import { SavingsGoal } from './savings-goal.entity';
import { User } from '../../user/entities/user.entity';

export enum SavingsGoalShareEventType {
  LINK_CREATED = 'LINK_CREATED',
  VIEW = 'VIEW',
  DIRECTORY_VIEW = 'DIRECTORY_VIEW',
  SOCIAL_SHARE = 'SOCIAL_SHARE',
  PROGRESS_UPDATE = 'PROGRESS_UPDATE',
  PERMISSION_UPDATED = 'PERMISSION_UPDATED',
  REVOKED = 'REVOKED',
}

@Entity('savings_goal_share_events')
@Index('IDX_SAVINGS_GOAL_SHARE_EVENTS_SHARE_ID', ['shareId'])
@Index('IDX_SAVINGS_GOAL_SHARE_EVENTS_GOAL_ID', ['goalId'])
@Index('IDX_SAVINGS_GOAL_SHARE_EVENTS_TYPE', ['eventType'])
export class SavingsGoalShareEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  shareId: string;

  @Column('uuid')
  goalId: string;

  @Column('uuid', { nullable: true })
  viewerId: string | null;

  @Column({
    type: 'enum',
    enum: SavingsGoalShareEventType,
  })
  eventType: SavingsGoalShareEventType;

  @Column({ type: 'varchar', length: 32, nullable: true })
  platform: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SavingsGoalShare, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shareId' })
  share: SavingsGoalShare;

  @ManyToOne(() => SavingsGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goalId' })
  goal: SavingsGoal;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'viewerId' })
  viewer: User | null;
}
