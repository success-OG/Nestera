import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReferralStatus } from '../entities/referral.entity';

export class CreateReferralDto {
  @ApiPropertyOptional({
    description: 'Campaign ID to associate with this referral',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class GenerateCustomCodeDto {
  @ApiPropertyOptional({
    description:
      'Custom referral code (alphanumeric, 4-12 chars). Auto-generated if omitted.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{4,12}$/, {
    message: 'Code must be 4-12 uppercase alphanumeric characters',
  })
  @MaxLength(12)
  code?: string;

  @ApiPropertyOptional({
    description: 'Campaign ID to associate with this referral',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;
}

export class ApplyReferralCodeDto {
  @ApiProperty({ description: 'Referral code to apply during signup' })
  @IsString()
  referralCode!: string;
}

export class ReferralStatsDto {
  @ApiProperty()
  referralCode!: string | null;

  @ApiProperty()
  totalReferrals!: number;

  @ApiProperty()
  successfulReferrals!: number;

  @ApiProperty()
  pendingRewards!: number;

  @ApiProperty()
  claimedRewards!: number;

  @ApiProperty()
  rank!: number | null;
}

export class ReferralResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  referralCode!: string;

  @ApiProperty({ enum: ReferralStatus })
  status!: ReferralStatus;

  @ApiProperty({ required: false })
  rewardAmount?: string;

  @ApiProperty({ required: false })
  refereeEmail?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false })
  completedAt?: Date;

  @ApiProperty({ required: false })
  rewardedAt?: Date;
}

export class UpdateReferralStatusDto {
  @ApiProperty({ enum: ReferralStatus })
  @IsEnum(ReferralStatus)
  status!: ReferralStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;
}
