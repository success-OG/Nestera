import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { MultiSigWithdrawalRequest } from './multi-sig-withdrawal-request.entity';
import { GroupPoolMember } from './group-pool-member.entity';
import { User } from '../../user/entities/user.entity';

export enum SignatureType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

@Entity('withdrawal_signatures')
@Unique(['withdrawalRequestId', 'signerId'])
@Index(['withdrawalRequestId'])
@Index(['signerId'])
export class WithdrawalSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  withdrawalRequestId: string;

  @ManyToOne(() => MultiSigWithdrawalRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'withdrawalRequestId' })
  withdrawalRequest: MultiSigWithdrawalRequest;

  @Column('uuid')
  signerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signerId' })
  signer: User;

  @Column('uuid')
  memberId: string;

  @ManyToOne(() => GroupPoolMember, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: GroupPoolMember;

  @Column('varchar', { length: 60 })
  signerAddress: string;

  @Column({
    type: 'enum',
    enum: SignatureType,
  })
  signatureType: SignatureType;

  @Column('varchar', { length: 128 })
  signature: string;

  @Column('text', { nullable: true })
  comment: string | null;

  @Column('varchar', { length: 64, nullable: true })
  transactionHash: string | null;

  @Column('json', { nullable: true })
  stellarSignatureXdr: string | null;

  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;
}
