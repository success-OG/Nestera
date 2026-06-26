import { IsOptional, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum DateRange {
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  LAST_365_DAYS = '365d',
  CUSTOM = 'custom',
}

export enum ComparisonPeriod {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
}

export class DateRangeFilterDto {
  @ApiPropertyOptional({ enum: DateRange })
  @IsOptional()
  @IsEnum(DateRange)
  range?: DateRange;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ enum: ComparisonPeriod })
  @IsOptional()
  @IsEnum(ComparisonPeriod)
  compareTo?: ComparisonPeriod;
}

export class UserAnalyticsFilterDto extends DateRangeFilterDto {
  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class TransactionAnalyticsFilterDto extends DateRangeFilterDto {
  @ApiPropertyOptional({ description: 'Minimum transaction amount' })
  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Transaction type filter' })
  @IsOptional()
  @IsString()
  transactionType?: string;
}

import { IsString } from 'class-validator';
