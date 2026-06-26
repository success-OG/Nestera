import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SavingsGoalShareVisibility } from '../entities/savings-goal-share.entity';

export class UpdateGoalSharingDto {
  @ApiProperty({ enum: SavingsGoalShareVisibility })
  @IsEnum(SavingsGoalShareVisibility)
  visibility: SavingsGoalShareVisibility;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDirectoryListed?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showProgress?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  showTargetAmount?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showOwnerName?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowSocialSharing?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowProgressUpdates?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  allowedUserIds?: string[];
}

export class CreateShareLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class PublicGoalDirectoryQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}

export class SocialShareDto {
  @ApiProperty({ enum: ['x', 'facebook', 'linkedin', 'whatsapp', 'copy'] })
  @IsIn(['x', 'facebook', 'linkedin', 'whatsapp', 'copy'])
  platform: 'x' | 'facebook' | 'linkedin' | 'whatsapp' | 'copy';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}
