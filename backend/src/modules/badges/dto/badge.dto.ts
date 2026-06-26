import { BadgeCategory, BadgeTier } from '../entities/badge.entity';

export class BadgeDto {
  id: string;
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  tier: BadgeTier;
  icon: string;
  color: string;
  points: number;
  active: boolean;
  criteria?: Record<string, any>;
  earned?: boolean;
  earnedAt?: Date;
  progress?: Record<string, any>;
}

export class UserBadgeDto {
  id: string;
  badge: BadgeDto;
  earnedAt: Date;
  progress?: Record<string, any>;
  shared: boolean;
  sharedAt?: Date;
  shareToken?: string;
  metadata?: Record<string, any>;
}

export class BadgeStatsDto {
  totalBadges: number;
  earnedBadges: number;
  totalPoints: number;
  recentBadges: UserBadgeDto[];
  categoryBreakdown: Record<BadgeCategory, number>;
}
