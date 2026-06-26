import {
  IsString,
  IsEnum,
  IsDateString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsUUID,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChallengeType,
  ChallengeStatus,
  RewardConfiguration,
  ChallengeRules,
} from '../entities/challenge.entity';

export class CreateChallengeDto {
  @ApiProperty({ example: '7-Day Savings Streak' })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'Make a deposit every day for 7 consecutive days',
  })
  @IsString()
  description!: string;

  @ApiProperty({ enum: ChallengeType, example: ChallengeType.DEPOSIT_STREAK })
  @IsEnum(ChallengeType)
  type!: ChallengeType;

  @ApiProperty({ example: '2026-04-25T00:00:00Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-05-01T00:00:00Z' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    example: {
      type: 'badge',
      value: 'Streak Master',
      metadata: { points: 100 },
    },
  })
  @IsObject()
  rewardConfiguration!: RewardConfiguration;

  @ApiProperty({
    example: {
      requiredStreakDays: 7,
      minimumDepositAmount: 10,
    },
  })
  @IsObject()
  rules!: ChallengeRules;

  @ApiPropertyOptional({ example: 'https://example.com/badge.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: 'Streak Master' })
  @IsOptional()
  @IsString()
  badgeName?: string;

  @ApiPropertyOptional({ example: 'savings' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['streak', 'deposit', 'beginner'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateChallengeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ChallengeStatus })
  @IsOptional()
  @IsEnum(ChallengeStatus)
  status?: ChallengeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rewardConfiguration?: RewardConfiguration;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rules?: ChallengeRules;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class JoinChallengeDto {
  @ApiPropertyOptional({
    description: 'Optional metadata for joining the challenge',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetActiveChallengesQueryDto {
  @ApiPropertyOptional({ enum: ChallengeType })
  @IsOptional()
  @IsEnum(ChallengeType)
  type?: ChallengeType;

  @ApiPropertyOptional({ example: 'savings' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  featured?: boolean;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}

export class ChallengeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ enum: ChallengeType })
  type!: ChallengeType;

  @ApiProperty({ enum: ChallengeStatus })
  status!: ChallengeStatus;

  @ApiProperty()
  startDate!: Date;

  @ApiProperty()
  endDate!: Date;

  @ApiProperty()
  rewardConfiguration!: RewardConfiguration;

  @ApiProperty()
  rules!: ChallengeRules;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  badgeName?: string;

  @ApiProperty()
  participantCount!: number;

  @ApiProperty()
  completionCount!: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  tags!: string[];

  @ApiProperty()
  isFeatured!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'User participation status (only if authenticated)',
  })
  userParticipation?: {
    joined: boolean;
    status?: string;
    progressPercentage?: number;
    joinedAt?: Date;
  };
}

export class UserChallengeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  challengeId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  progressPercentage!: number;

  @ApiProperty()
  progressMetadata!: Record<string, any>;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  joinedAt!: Date;

  @ApiProperty()
  challenge!: ChallengeResponseDto;
}
