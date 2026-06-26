import { ApiProperty } from '@nestjs/swagger';
import { ProposalCategory, ProposalType } from '../entities/governance-proposal.entity';

export class ProposalTemplateParameterDto {
  @ApiProperty({ description: 'Parameter name' })
  name: string;

  @ApiProperty({ description: 'User-friendly label' })
  label: string;

  @ApiProperty({ description: 'Parameter description' })
  description: string;

  @ApiProperty({ description: 'Value type', example: 'string' })
  type: string;

  @ApiProperty({ description: 'Whether the field is required' })
  required: boolean;

  @ApiProperty({ description: 'Allowed values when using an enum', required: false, example: ['flexiRate', 'fixedRate'] })
  allowedValues?: string[];

  @ApiProperty({ description: 'Minimum numeric value when applicable', required: false })
  min?: number;

  @ApiProperty({ description: 'Maximum numeric value when applicable', required: false })
  max?: number;

  @ApiProperty({ description: 'Default value when omitted', required: false })
  default?: unknown;

  @ApiProperty({ description: 'Example value', required: false })
  example?: unknown;
}

export class ProposalTemplateDetailDto {
  @ApiProperty({ description: 'Template identifier' })
  id: string;

  @ApiProperty({ description: 'Template version' })
  version: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template description' })
  description: string;

  @ApiProperty({ enum: ProposalType })
  type: ProposalType;

  @ApiProperty({ enum: ProposalCategory })
  category: ProposalCategory;

  @ApiProperty({ type: [ProposalTemplateParameterDto] })
  parameterSchema: ProposalTemplateParameterDto[];
}
