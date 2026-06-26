import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WebhookSubscription } from './webhook-subscription.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('webhook_deliveries')
@Index('idx_webhook_del_sub', ['subscriptionId'])
@Index('idx_webhook_del_status', ['status'])
@Index('idx_webhook_del_next_retry', ['nextRetryAt'])
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  subscriptionId: string;

  @ManyToOne(() => WebhookSubscription, (s) => s.deliveries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscriptionId' })
  subscription: WebhookSubscription;

  /** The event name that triggered this delivery */
  @Column()
  eventName: string;

  /** The payload sent to the subscriber */
  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  /** HTTP status code returned by the subscriber */
  @Column({ nullable: true, type: 'int' })
  responseStatus: number | null;

  /** Truncated response body for debugging */
  @Column({ nullable: true, type: 'text' })
  responseBody: string | null;

  /** Error message if delivery failed */
  @Column({ nullable: true, type: 'text' })
  errorMessage: string | null;

  /** Number of delivery attempts made */
  @Column({ default: 0 })
  attempts: number;

  /** When to attempt the next retry (null = no retry scheduled) */
  @Column({ nullable: true, type: 'timestamp' })
  nextRetryAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
