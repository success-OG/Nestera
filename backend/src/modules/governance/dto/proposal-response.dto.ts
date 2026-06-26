import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProposalAttachment,
  ProposalStatus,
  ProposalCategory,
  ProposalType,
  ProposalActionPayload,
} from '../entities/governance-proposal.entity';
import { VoteResponseDto } from './vote-response.dto';

export class ProposalResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'On-chain proposal ID' })
  onChainId: number;

  @ApiProperty({ description: 'Proposal title' })
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  description: string;

  @ApiProperty({ enum: ProposalCategory })
  category: ProposalCategory;

  @ApiProperty({
    enum: ProposalType,
    nullable: true,
    description: 'Structured proposal type when available',
  })
  type: ProposalType | null;

  @ApiPropertyOptional({
    description: 'Template identifier used to create this proposal, if any',
    example: 'rate-change-standard',
  })
  templateId?: string | null;

  @ApiPropertyOptional({
    description: 'Template version used to create this proposal, if any',
    example: '1.0',
  })
  templateVersion?: string | null;

  @ApiPropertyOptional({
    description: 'Template parameters used to generate the action payload',
    type: 'object',
    additionalProperties: true,
  })
  templateParameters?: Record<string, unknown> | null;

  @ApiProperty({
    nullable: true,
    description: 'Structured action payload for the proposal',
    example: { target: 'flexiRate', newValue: 10 },
  })
  action: ProposalActionPayload | null;

  @ApiProperty({ enum: ProposalStatus })
  status: ProposalStatus;

  @ApiProperty({ description: 'Proposer wallet address', nullable: true })
  proposer: string | null;

  @ApiProperty({ description: 'Start block number', nullable: true })
  startBlock: number | null;

  @ApiProperty({ description: 'End block number', nullable: true })
  endBlock: number | null;

  @ApiProperty({
    type: 'array',
    description: 'Supporting documents and links',
    example: [
      {
        name: 'Economic analysis',
        url: 'https://example.com/analysis.pdf',
        type: 'DOCUMENT',
      },
    ],
  })
  attachments: ProposalAttachment[];

  @ApiProperty({
    description: 'Required voting quorum for this proposal in NST units',
    example: '5000.00000000',
  })
  requiredQuorum: string;

  @ApiProperty({
    description: 'Quorum percentage in basis points',
    example: 5000,
  })
  quorumBps: number;

  @ApiProperty({
    description: 'Minimum voting power required to submit a proposal',
    example: '100.00000000',
  })
  proposalThreshold: string;

  @ApiProperty({
    description: 'Whether the proposal can still be edited by its creator',
    example: true,
  })
  canEdit: boolean;

  @ApiProperty({
    type: [VoteResponseDto],
    description: 'All votes on this proposal',
  })
  votes: VoteResponseDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
