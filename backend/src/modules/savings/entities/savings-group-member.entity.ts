import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { SavingsGroup } from './savings-group.entity';

export enum SavingsGroupRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Entity('savings_group_members')
@Unique(['groupId', 'userId'])
export class SavingsGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groupId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: SavingsGroupRole,
    default: SavingsGroupRole.MEMBER,
  })
  role: SavingsGroupRole;

  @Column('decimal', { precision: 14, scale: 2, default: 0 })
  contributionAmount: number;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => SavingsGroup, (group) => group.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'groupId' })
  group: SavingsGroup;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
