import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_reward_profiles')
@Index(['totalPoints'])
@Index(['longestStreak'])
@Index(['isLeaderboardVisible'])
export class UserRewardProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  userId: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalPoints: number;

  @Column({ type: 'int', default: 0 })
  currentStreak: number;

  @Column({ type: 'int', default: 0 })
  longestStreak: number;

  @Column({ type: 'timestamp', nullable: true })
  streakLastUpdatedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isLeaderboardVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
