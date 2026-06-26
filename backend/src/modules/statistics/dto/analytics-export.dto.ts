import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StatisticsQueryDto } from './statistics-query.dto';
import {
  AnalyticsExportDataType,
  AnalyticsExportFormat,
  AnalyticsExportStatus,
} from '../entities/analytics-export-job.entity';

export class AnalyticsExportQueryDto extends StatisticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsExportFormat,
    default: AnalyticsExportFormat.JSON,
    description: 'Export format',
  })
  @IsEnum(AnalyticsExportFormat)
  @IsOptional()
  format?: AnalyticsExportFormat = AnalyticsExportFormat.JSON;
}

export class AnalyticsExportJobRequestDto extends AnalyticsExportQueryDto {}

export class AnalyticsExportJobResponseDto {
  @ApiPropertyOptional({ enum: AnalyticsExportStatus })
  status!: AnalyticsExportStatus;

  @ApiPropertyOptional({ enum: AnalyticsExportDataType })
  dataType!: AnalyticsExportDataType;

  @ApiPropertyOptional({ enum: AnalyticsExportFormat })
  format!: AnalyticsExportFormat;

  @ApiPropertyOptional()
  requestId!: string;

  @ApiPropertyOptional()
  fileName?: string;

  @ApiPropertyOptional()
  filePath?: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional()
  expiresAt?: Date | null;
}

export class AnalyticsExportArtifactDto {
  @ApiPropertyOptional({ enum: AnalyticsExportFormat })
  format!: AnalyticsExportFormat;

  @ApiPropertyOptional()
  fileName!: string;

  @ApiPropertyOptional()
  contentType!: string;

  @ApiPropertyOptional()
  buffer!: Buffer;

  @ApiPropertyOptional({ type: Object })
  body?: unknown;
}
