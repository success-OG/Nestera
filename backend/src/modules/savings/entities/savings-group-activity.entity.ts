import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SavingsGroup } from './savings-group.entity';

export enum SavingsGroupActivityType {
  CREATED = 'CREATED',
  JOINED = 'JOINED',
  LEFT = 'LEFT',
  CONTRIBUTED = 'CONTRIBUTED',
  INVITED = 'INVITED',
  REFUNDED = 'REFUNDED',
}

@Entity('savings_group_activities')
export class SavingsGroupActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groupId: string;

  @Column('uuid', { nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: SavingsGroupActivityType,
  })
  type: SavingsGroupActivityType;

  @Column('decimal', { precision: 14, scale: 2, nullable: true })
  amount: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => SavingsGroup, (group) => group.activities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: SavingsGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
