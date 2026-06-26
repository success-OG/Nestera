import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('sandbox_usage_analytics')
export class SandboxUsageAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  apiKeyId: string;

  @Index()
  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ type: 'integer', default: 200 })
  statusCode: number;

  @Column({ type: 'integer', default: 0 })
  responseTimeMs: number;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
