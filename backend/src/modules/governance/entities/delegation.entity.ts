import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('delegations')
@Unique(['delegatorAddress'])
@Index(['delegateAddress'])
export class Delegation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  delegatorAddress: string;

  @Column()
  delegateAddress: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
