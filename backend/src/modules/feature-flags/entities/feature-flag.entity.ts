import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  defaultValue: boolean | string | number;

  @Column({ type: 'varchar', length: 20 })
  type: 'boolean' | 'string' | 'number' | 'rollout';

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  value?: boolean | string | number;

  @Column({ type: 'int', nullable: true })
  rolloutPercentage?: number;

  @Column({ type: 'jsonb', nullable: true })
  targetUsers?: string[];

  @Column({ type: 'jsonb', nullable: true })
  targetNetworks?: string[];

  @Column({ type: 'jsonb', nullable: true })
  targetSegments?: string[];

  @Column({ type: 'boolean', default: false })
  forceDisabled: boolean;

  @Column({ type: 'jsonb', nullable: true })
  tags?: Record<string, string>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
