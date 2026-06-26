import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Vote } from './vote.entity';

export enum ProposalStatus {
  PENDING = 'Pending',
  ACTIVE = 'Active',
  PASSED = 'Passed',
  FAILED = 'Failed',
  QUEUED = 'Queued',
  EXECUTED = 'Executed',
  CANCELLED = 'Cancelled',
}

export enum ProposalCategory {
  GOVERNANCE = 'Governance',
  TREASURY = 'Treasury',
  TECHNICAL = 'Technical',
  COMMUNITY = 'Community',
}

export enum ProposalType {
  RATE_CHANGE = 'RATE_CHANGE',
  PAUSE = 'PAUSE',
  UNPAUSE = 'UNPAUSE',
  TREASURY_ALLOCATION = 'TREASURY_ALLOCATION',
}

export enum ProposalAttachmentType {
  DOCUMENT = 'DOCUMENT',
  LINK = 'LINK',
}

export interface ProposalAttachment {
  name?: string;
  url: string;
  type: ProposalAttachmentType;
}

export interface ProposalActionPayload {
  target?: string;
  newValue?: number;
  duration?: number;
  recipient?: string;
  amount?: number;
  asset?: string;
  reason?: string;
}

@Entity('governance_proposals')
export class GovernanceProposal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** On-chain proposal ID from the DAO contract */
  @Column({ type: 'int', unique: true })
  onChainId: number;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ProposalCategory,
    default: ProposalCategory.GOVERNANCE,
  })
  category: ProposalCategory;

  @Column({
    type: 'enum',
    enum: ProposalStatus,
    default: ProposalStatus.ACTIVE,
  })
  status: ProposalStatus;

  @Column({ nullable: true })
  proposer: string;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  type: ProposalType | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  templateVersion: string | null;

  @Column({ type: 'jsonb', nullable: true })
  templateParameters: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  action: ProposalActionPayload | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  attachments: ProposalAttachment[];

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  requiredQuorum: string;

  @Column({ type: 'int', default: 5000 })
  quorumBps: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  proposalThreshold: string;

  @Column({ type: 'bigint', nullable: true })
  startBlock: number;

  @Column({ type: 'bigint', nullable: true })
  endBlock: number;

  @OneToMany(() => Vote, (vote) => vote.proposal)
  votes: Vote[];

  /** Set when proposal is queued; execution is blocked until this time */
  @Column({ type: 'timestamptz', nullable: true })
  timelockEndsAt: Date | null;

  /** Set when proposal is successfully executed */
  @Column({ type: 'timestamptz', nullable: true })
  executedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
