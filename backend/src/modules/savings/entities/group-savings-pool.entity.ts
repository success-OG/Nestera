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
import { User } from '../../user/entities/user.entity';
import { SavingsProduct } from './savings-product.entity';
import { GroupPoolMember } from './group-pool-member.entity';
import { MultiSigWithdrawalRequest } from './multi-sig-withdrawal-request.entity';
import { SignatureEvent } from './signature-event.entity';

export enum PoolStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum PoolType {
  SAVINGS = 'SAVINGS',
  INVESTMENT = 'INVESTMENT',
  EMERGENCY_FUND = 'EMERGENCY_FUND',
}

@Entity('group_savings_pools')
@Index(['creatorId'])
@Index(['productId'])
@Index(['multisigAddress'])
export class GroupSavingsPool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  creatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('varchar', { length: 60 })
  multisigAddress: string;

  @Column({
    type: 'enum',
    enum: PoolType,
    default: PoolType.SAVINGS,
  })
  poolType: PoolType;

  @Column({
    type: 'enum',
    enum: PoolStatus,
    default: PoolStatus.ACTIVE,
  })
  status: PoolStatus;

  @Column('int')
  requiredSignatures: number;

  @Column('int')
  totalSigners: number;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  totalDeposits: number;

  @Column('decimal', { precision: 18, scale: 7, default: 0 })
  currentBalance: number;

  @Column('uuid')
  productId: string;

  @ManyToOne(() => SavingsProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: SavingsProduct;

  @Column('decimal', { precision: 18, scale: 7, nullable: true })
  targetAmount: number | null;

  @Column('timestamp', { nullable: true })
  targetDate: Date | null;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @Column('timestamp', { nullable: true })
  frozenAt: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  freezeReason: string | null;

  @Column('timestamp', { nullable: true })
  closedAt: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  closeReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => GroupPoolMember, (member) => member.pool, { cascade: true })
  members: GroupPoolMember[];

  @OneToMany(() => MultiSigWithdrawalRequest, (request) => request.pool, {
    cascade: true,
  })
  withdrawalRequests: MultiSigWithdrawalRequest[];

  @OneToMany(() => SignatureEvent, (event) => event.pool, { cascade: true })
  signatureEvents: SignatureEvent[];
}
