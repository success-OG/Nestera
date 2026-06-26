import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { GroupSavingsPool } from './group-savings-pool.entity';
import { User } from '../../user/entities/user.entity';
import { WithdrawalSignature } from './withdrawal-signature.entity';

export enum MultiSigWithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

@Entity('multi_sig_withdrawal_requests')
@Index(['poolId'])
@Index(['requesterId'])
@Index(['status'])
export class MultiSigWithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  poolId: string;

  @ManyToOne(() => GroupSavingsPool, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poolId' })
  pool: GroupSavingsPool;

  @Column('uuid')
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column('varchar', { length: 60 })
  recipientAddress: string;

  @Column('decimal', { precision: 18, scale: 7 })
  amount: number;

  @Column('text', { nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: MultiSigWithdrawalStatus,
    default: MultiSigWithdrawalStatus.PENDING,
  })
  status: MultiSigWithdrawalStatus;

  @Column('int')
  requiredSignatures: number;

  @Column('int', { default: 0 })
  currentSignatures: number;

  @Column('timestamp', { nullable: true })
  expiresAt: Date | null;

  @Column('timestamp', { nullable: true })
  approvedAt: Date | null;

  @Column('timestamp', { nullable: true })
  executedAt: Date | null;

  @Column('timestamp', { nullable: true })
  failedAt: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  failureReason: string | null;

  @Column('varchar', { length: 64, nullable: true })
  transactionHash: string | null;

  @Column('decimal', { precision: 18, scale: 7, nullable: true })
  transactionFee: number | null;

  @Column('json', { nullable: true })
  stellarTransactionXdr: string | null;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(
    () => WithdrawalSignature,
    (signature) => signature.withdrawalRequest,
    { cascade: true },
  )
  signatures: WithdrawalSignature[];
}
