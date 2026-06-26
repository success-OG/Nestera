import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
}

export enum NotificationTarget {
  ALL = 'ALL',
  USERS = 'USERS',
  ADMINS = 'ADMINS',
}

export class NotificationFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class UserTargetDto {
  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: ['USER', 'ADMIN'],
  })
  @IsOptional()
  @IsArray()
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Filter by KYC status',
    enum: ['NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED'],
  })
  @IsOptional()
  @IsArray()
  kycStatus?: string[];

  @ApiPropertyOptional({
    description: 'Filter by user tier',
    enum: ['FREE', 'VERIFIED', 'PREMIUM', 'ENTERPRISE'],
  })
  @IsOptional()
  @IsArray()
  tiers?: string[];

  @ApiPropertyOptional({ description: 'Filter by minimum savings amount' })
  @IsOptional()
  @IsNumber()
  minSavings?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum savings amount' })
  @IsOptional()
  @IsNumber()
  maxSavings?: number;

  @ApiPropertyOptional({ description: 'Specific user IDs to target' })
  @IsOptional()
  @IsArray()
  userIds?: string[];
}

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Notification channels to use',
    enum: ['EMAIL', 'IN_APP', 'PUSH'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Target specific users or groups',
    type: UserTargetDto,
  })
  @IsOptional()
  target?: UserTargetDto;
}

export class ScheduleNotificationDto extends BroadcastNotificationDto {
  @ApiProperty({ description: 'ISO date string when to send the notification' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    description: 'Timezone for scheduling (defaults to UTC)',
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class PreviewNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Target users for preview',
    type: UserTargetDto,
  })
  @IsOptional()
  target?: UserTargetDto;

  @ApiPropertyOptional({
    description: 'Number of users to preview (default 5)',
  })
  @IsOptional()
  @IsNumber()
  previewCount?: number;
}

export class NotificationDeliveryDto {
  @ApiProperty({ description: 'Total notifications sent' })
  sent: number;

  @ApiProperty({ description: 'Notifications successfully delivered' })
  delivered: number;

  @ApiProperty({ description: 'Notifications read by users' })
  read: number;

  @ApiProperty({ description: 'Notifications that failed to deliver' })
  failed: number;
}

import { IsNotEmpty } from 'class-validator';
