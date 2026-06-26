import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { MedicalClaim } from '../../claims/entities/medical-claim.entity';

export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED',
}

export enum DisputePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  claimId: string;

  @ManyToOne(() => MedicalClaim)
  @JoinColumn({ name: 'claimId' })
  claim: MedicalClaim;

  @Column()
  disputedBy: string;

  @Column('text')
  reason: string;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({
    type: 'enum',
    enum: DisputePriority,
    default: DisputePriority.MEDIUM,
  })
  priority: DisputePriority;

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ nullable: true })
  assignedAt: Date;

  @Column({ nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true, type: 'text' })
  resolution: string;

  @Column({ nullable: true })
  escalatedTo: string;

  @Column({ nullable: true })
  escalatedAt: Date;

  @Column({ nullable: true, type: 'jsonb' })
  evidence: Record<string, any>[];

  @OneToMany(() => DisputeMessage, (message) => message.dispute, {
    cascade: true,
  })
  messages: DisputeMessage[];

  @OneToMany(() => DisputeTimeline, (timeline) => timeline.dispute, {
    cascade: true,
  })
  timeline: DisputeTimeline[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('dispute_timelines')
export class DisputeTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  disputeId: string;

  @ManyToOne(() => Dispute, (dispute) => dispute.timeline)
  @JoinColumn({ name: 'disputeId' })
  dispute: Dispute;

  @Column()
  action: string;

  @Column()
  performedBy: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, type: 'jsonb' })
  previousState: Record<string, any>;

  @Column({ nullable: true, type: 'jsonb' })
  newState: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('dispute_messages')
export class DisputeMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  disputeId: string;

  @ManyToOne(() => Dispute, (dispute) => dispute.messages)
  @JoinColumn({ name: 'disputeId' })
  dispute: Dispute;

  @Column()
  author: string;

  @Column('text')
  message: string;

  @Column({ nullable: true })
  evidenceUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
