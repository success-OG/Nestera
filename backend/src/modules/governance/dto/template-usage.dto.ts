import { ApiProperty } from '@nestjs/swagger';

export class TemplateUsageDto {
  @ApiProperty({ description: 'Template identifier' })
  templateId: string;

  @ApiProperty({ description: 'Template version' })
  templateVersion: string;

  @ApiProperty({ description: 'Template name' })
  templateName: string;

  @ApiProperty({ description: 'Number of proposals created using this template' })
  proposalsCreated: number;

  @ApiProperty({ description: 'Number of passed proposals' })
  passedProposals: number;

  @ApiProperty({ description: 'Number of failed proposals' })
  failedProposals: number;

  @ApiProperty({ description: 'Percentage of successful proposals' })
  successRate: number;
}
