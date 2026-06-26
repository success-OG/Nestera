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
import { Badge } from './badge.entity';
import { User } from '../../user/entities/user.entity';

@Entity('user_badges')
@Index(['userId', 'badgeId'])
@Index(['userId', 'earnedAt'])
export class UserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  badgeId: string;

  /** When the badge was earned */
  @Column({ type: 'timestamp' })
  earnedAt: Date;

  /** Progress towards earning the badge (for multi-step badges) */
  @Column({ type: 'jsonb', nullable: true })
  progress: Record<string, any> | null;

  /** Whether the badge has been shared */
  @Column({ type: 'boolean', default: false })
  shared: boolean;

  /** When the badge was last shared */
  @Column({ type: 'timestamp', nullable: true })
  sharedAt: Date | null;

  /** Share token for public sharing */
  @Column({ type: 'varchar', length: 100, nullable: true })
  shareToken: string | null;

  /** Additional metadata about the badge earning */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Badge, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badgeId' })
  badge: Badge;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
