import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProposalCategory,
  ProposalStatus,
} from '../entities/governance-proposal.entity';

export class ProposalTimelineDto {
  @ApiProperty({
    description: 'Proposal start boundary as UNIX block number',
    nullable: true,
  })
  startTime: number | null;

  @ApiProperty({
    description: 'Proposal end boundary as UNIX block number',
    nullable: true,
  })
  endTime: number | null;
}

export class ProposalListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  onChainId: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: ProposalCategory })
  category: ProposalCategory;

  @ApiProperty({ enum: ProposalStatus })
  status: ProposalStatus;

  @ApiPropertyOptional()
  proposer: string | null;

  @ApiProperty({
    description: 'Percentage of votes cast FOR (0–100)',
    example: 62.5,
  })
  forPercent: number;

  @ApiProperty({
    description: 'Percentage of votes cast AGAINST (0–100)',
    example: 37.5,
  })
  againstPercent: number;

  @ApiProperty({
    description: 'Percentage of votes cast ABSTAIN (0–100)',
    example: 10.0,
  })
  abstainPercent: number;

  @ApiProperty({ type: () => ProposalTimelineDto })
  timeline: ProposalTimelineDto;
}
