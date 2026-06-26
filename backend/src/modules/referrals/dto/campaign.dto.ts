import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Campaign description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Reward amount for referrer' })
  @IsNumber()
  @Min(0)
  rewardAmount: number;

  @ApiPropertyOptional({ description: 'Reward amount for referee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  refereeRewardAmount?: number;

  @ApiPropertyOptional({
    description: 'Minimum deposit amount to qualify',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDepositAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum rewards per user' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRewardsPerUser?: number;

  @ApiPropertyOptional({ description: 'Campaign start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Campaign end date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  refereeRewardAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minDepositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRewardsPerUser?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
