import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  ReportType,
  ReportFormat,
  ReportScheduleFrequency,
} from '../entities/report-schedule.entity';

export class CreateReportScheduleDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  reportType: ReportType;

  @ApiProperty({ enum: ReportFormat, default: ReportFormat.PDF })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({ enum: ReportScheduleFrequency })
  @IsEnum(ReportScheduleFrequency)
  frequency: ReportScheduleFrequency;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  emailDelivery?: boolean;
}
