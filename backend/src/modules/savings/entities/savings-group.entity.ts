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
import { User } from '../../user/entities/user.entity';
import { SavingsGroupMember } from './savings-group-member.entity';
import { SavingsGroupActivity } from './savings-group-activity.entity';

export enum SavingsGroupStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('savings_groups')
export class SavingsGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column('decimal', { precision: 14, scale: 2 })
  targetAmount: number;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  currentAmount: number;

  @Column('uuid')
  creatorId: string;

  @Column({
    type: 'enum',
    enum: SavingsGroupStatus,
    default: SavingsGroupStatus.OPEN,
  })
  status: SavingsGroupStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @OneToMany(() => SavingsGroupMember, (member) => member.group)
  members: SavingsGroupMember[];

  @OneToMany(() => SavingsGroupActivity, (activity) => activity.group)
  activities: SavingsGroupActivity[];
}
