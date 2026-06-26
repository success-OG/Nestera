import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { GroupSavingsPool } from './group-savings-pool.entity';
import { User } from '../../user/entities/user.entity';
import { MultiSigWithdrawalRequest } from './multi-sig-withdrawal-request.entity';

export enum EventType {
  SIGNATURE_REQUESTED = 'SIGNATURE_REQUESTED',
  SIGNATURE_PROVIDED = 'SIGNATURE_PROVIDED',
  SIGNATURE_WITHDRAWN = 'SIGNATURE_WITHDRAWN',
  WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
  WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
  WITHDRAWAL_EXECUTED = 'WITHDRAWAL_EXECUTED',
  WITHDRAWAL_FAILED = 'WITHDRAWAL_FAILED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  POOL_CREATED = 'POOL_CREATED',
  POOL_FROZEN = 'POOL_FROZEN',
  POOL_UNFROZEN = 'POOL_UNFROZEN',
  POOL_CLOSED = 'POOL_CLOSED',
}

@Entity('signature_events')
@Index(['poolId'])
@Index(['userId'])
@Index(['eventType'])
export class SignatureEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  poolId: string;

  @ManyToOne(() => GroupSavingsPool, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poolId' })
  pool: GroupSavingsPool;

  @Column('uuid', { nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column('uuid', { nullable: true })
  withdrawalRequestId: string | null;

  @ManyToOne(() => MultiSigWithdrawalRequest, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'withdrawalRequestId' })
  withdrawalRequest: MultiSigWithdrawalRequest | null;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  eventType: EventType;

  @Column('varchar', { length: 60, nullable: true })
  actorAddress: string | null;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('json', { nullable: true })
  eventData: Record<string, any> | null;

  @Column('varchar', { length: 64, nullable: true })
  transactionHash: string | null;

  @Column('varchar', { length: 128, nullable: true })
  ipAddress: string | null;

  @Column('varchar', { length: 255, nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
