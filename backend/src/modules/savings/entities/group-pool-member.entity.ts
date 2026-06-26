import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { GroupSavingsPool } from './group-savings-pool.entity';
import { User } from '../../user/entities/user.entity';

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  REMOVED = 'REMOVED',
}

@Entity('group_pool_members')
@Unique(['poolId', 'userId'])
@Index(['poolId'])
@Index(['userId'])
export class GroupPoolMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  poolId: string;

  @ManyToOne(() => GroupSavingsPool, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poolId' })
  pool: GroupSavingsPool;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('varchar', { length: 60 })
  walletAddress: string;

  @Column({
    type: 'enum',
    enum: MemberRole,
    default: MemberRole.MEMBER,
  })
  role: MemberRole;

  @Column({
    type: 'enum',
    enum: MemberStatus,
    default: MemberStatus.ACTIVE,
  })
  status: MemberStatus;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  totalContributed: number;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  sharePercentage: number;

  @Column('timestamp', { nullable: true })
  joinedAt: Date | null;

  @Column('timestamp', { nullable: true })
  leftAt: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  leaveReason: string | null;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
