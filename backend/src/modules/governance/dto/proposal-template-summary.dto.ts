import { ApiProperty } from '@nestjs/swagger';
import { ProposalCategory, ProposalType } from '../entities/governance-proposal.entity';

export class ProposalTemplateSummaryDto {
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
}
