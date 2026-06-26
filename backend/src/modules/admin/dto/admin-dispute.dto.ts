import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DisputeStatus,
  DisputePriority,
} from '../../disputes/entities/dispute.entity';

export class DisputeFilterDto {
  @ApiPropertyOptional({ enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ enum: DisputePriority })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toDate?: string;
}

export class AssignDisputeDto {
  @ApiProperty({ description: 'Admin ID to assign the dispute to' })
  @IsString()
  @IsNotEmpty()
  assignedTo: string;
}

export class ResolveDisputeDto {
  @ApiProperty({ description: 'Resolution details' })
  @IsString()
  @IsNotEmpty()
  resolution: string;

  @ApiPropertyOptional({
    enum: DisputeStatus,
    description: 'Final status after resolution',
  })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}

export class EscalateDisputeDto {
  @ApiProperty({ description: 'Senior admin ID to escalate to' })
  @IsString()
  @IsNotEmpty()
  escalatedTo: string;

  @ApiPropertyOptional({ description: 'Reason for escalation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddEvidenceDto {
  @ApiProperty({ description: 'Evidence/document name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'URL to the evidence/document' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: 'Type of evidence (e.g., document, image, pdf)',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Description of the evidence' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDisputeDto {
  @ApiPropertyOptional({ enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @ApiPropertyOptional({ enum: DisputePriority })
  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class NotificationDto {
  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;
}
