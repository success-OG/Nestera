import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProposalAttachmentType,
  ProposalType,
} from '../entities/governance-proposal.entity';

export class ProposalAttachmentDto {
  @ApiPropertyOptional({
    description: 'Display name for the supporting document or link',
    example: 'Treasury model spreadsheet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({
    description: 'Public URL for the supporting document or external reference',
    example: 'https://example.com/governance/treasury-model.pdf',
  })
  @IsUrl({
    require_protocol: true,
  })
  url: string;

  @ApiProperty({
    enum: ProposalAttachmentType,
    example: ProposalAttachmentType.DOCUMENT,
  })
  @IsEnum(ProposalAttachmentType)
  type: ProposalAttachmentType;
}

export class CreateProposalDto {
  @ApiPropertyOptional({
    description:
      'Optional human-readable title. Derived from description if omitted.',
    example: 'Increase Flexi Savings Rate',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiProperty({
    description: 'Detailed proposal description',
    example:
      'Increase the flexi savings rate from 8% to 10% to improve user retention.',
  })
  @IsString()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({
    description:
      'Structured proposal type used for validation and categorization. Omit when using a template.',
    enum: ProposalType,
    example: ProposalType.RATE_CHANGE,
  })
  @IsOptional()
  @IsEnum(ProposalType)
  type?: ProposalType;

  @ApiPropertyOptional({
    description:
      'Governance proposal template identifier to use for default action generation and validation.',
    example: 'rate-change-standard',
  })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({
    description:
      'Optional template version. Defaults to the latest available version.',
    example: '1.0',
  })
  @IsOptional()
  @IsString()
  templateVersion?: string;

  @ApiPropertyOptional({
    description:
      'Template parameter overrides used to build the action payload. Required when using a template.',
    example: { recipient: 'GRECIPIENT123', amount: 5000 },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  templateParameters?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Structured action payload for the proposal',
    example: { target: 'flexiRate', newValue: 10 },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  action?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Optional voting start ledger. Defaults to the current ledger plus a short review window.',
    example: 123456,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startBlock?: number;

  @ApiPropertyOptional({
    description:
      'Optional voting end ledger. Defaults to startBlock plus the configured voting period.',
    example: 140736,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endBlock?: number;

  @ApiPropertyOptional({
    type: [ProposalAttachmentDto],
    description: 'Supporting documents or reference links',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ProposalAttachmentDto)
  attachments?: ProposalAttachmentDto[];
}
