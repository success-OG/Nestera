import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { WebhookDelivery } from './webhook-delivery.entity';

export enum WebhookStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

@Entity('webhook_subscriptions')
@Index('idx_webhook_sub_user', ['userId'])
export class WebhookSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owner of this webhook registration */
  @Column({ type: 'uuid' })
  userId: string;

  /** Target URL to POST events to */
  @Column()
  url: string;

  /** HMAC-SHA256 secret for signing payloads */
  @Column()
  secret: string;

  /** Comma-separated list of event patterns to subscribe to, e.g. 'savings.*,user.*' */
  @Column({ type: 'simple-array' })
  events: string[];

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.ACTIVE })
  status: WebhookStatus;

  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @OneToMany(() => WebhookDelivery, (d) => d.subscription)
  deliveries: WebhookDelivery[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
