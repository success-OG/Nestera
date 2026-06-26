import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ReportType {
  DAILY_SUMMARY = 'DAILY_SUMMARY',
  WEEKLY_ANALYTICS = 'WEEKLY_ANALYTICS',
  MONTHLY_STATEMENT = 'MONTHLY_STATEMENT',
}

export enum ReportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  EXCEL = 'EXCEL',
}

export enum ReportScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum ReportScheduleStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

@Entity('report_schedules')
export class ReportSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @Column({ type: 'enum', enum: ReportScheduleFrequency })
  frequency: ReportScheduleFrequency;

  @Column({
    type: 'enum',
    enum: ReportScheduleStatus,
    default: ReportScheduleStatus.ACTIVE,
  })
  status: ReportScheduleStatus;

  @Column({ type: 'boolean', default: true })
  emailDelivery: boolean;

  @Column({ type: 'timestamptz' })
  nextRunAt: Date;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}

export enum ReportArchiveStatus {
  GENERATED = 'GENERATED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('report_archives')
export class ReportArchive {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid', { nullable: true })
  scheduleId: string | null;

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportFormat })
  format: ReportFormat;

  @Column({ type: 'varchar' })
  storagePath: string;

  @Column({ type: 'varchar' })
  filename: string;

  @Column({
    type: 'enum',
    enum: ReportArchiveStatus,
    default: ReportArchiveStatus.GENERATED,
  })
  status: ReportArchiveStatus;

  @Column({ type: 'varchar', nullable: true })
  periodLabel: string | null;

  @CreateDateColumn()
  generatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ReportSchedule, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'scheduleId' })
  schedule: ReportSchedule | null;
}
