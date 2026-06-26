import { PartialType } from '@nestjs/swagger';
import { CreateProposalDto } from './create-proposal.dto';

export class EditProposalDto extends PartialType(CreateProposalDto) {}
