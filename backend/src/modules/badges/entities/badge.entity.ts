import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BadgeCategory {
  SAVINGS = 'SAVINGS',
  STREAK = 'STREAK',
  GOAL = 'GOAL',
  SOCIAL = 'SOCIAL',
}

export enum BadgeTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

@Entity('badges')
@Index(['category', 'tier'])
@Index(['code'])
export class Badge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique code identifier for the badge (e.g., 'first_deposit', 'goal_complete') */
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  /** Human-readable badge name */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /** Detailed description of what the badge represents */
  @Column('text')
  description: string;

  /** Category of the badge */
  @Column({ type: 'enum', enum: BadgeCategory })
  category: BadgeCategory;

  /** Tier/rarity of the badge */
  @Column({ type: 'enum', enum: BadgeTier })
  tier: BadgeTier;

  /** Icon identifier (maps to frontend icon library) */
  @Column({ type: 'varchar', length: 100 })
  icon: string;

  /** Color code for badge display */
  @Column({ type: 'varchar', length: 20 })
  color: string;

  /** Points awarded for earning this badge */
  @Column({ type: 'int', default: 0 })
  points: number;

  /** Whether this badge is currently active and earnable */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /** Criteria metadata (JSON) for badge earning logic */
  @Column({ type: 'jsonb', nullable: true })
  criteria: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
