import { Test, TestingModule } from '@nestjs/testing';
import { GovernanceProposalsController } from './governance-proposals.controller';
import { GovernanceService } from './governance.service';
import {
  ProposalAttachmentType,
  ProposalType,
} from './entities/governance-proposal.entity';

describe('GovernanceProposalsController', () => {
  let controller: GovernanceProposalsController;
  let service: {
    createProposal: jest.Mock;
    editProposal: jest.Mock;
    getProposals: jest.Mock;
    getProposalVotesByOnChainId: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createProposal: jest.fn(),
      editProposal: jest.fn(),
      getProposals: jest.fn(),
      getProposalVotesByOnChainId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GovernanceProposalsController],
      providers: [
        {
          provide: GovernanceService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<GovernanceProposalsController>(
      GovernanceProposalsController,
    );
  });

  it('should create a proposal for the authenticated user', async () => {
    const user = { id: 'user-1' };
    const dto = {
      description: 'Allocate treasury funds',
      type: ProposalType.TREASURY_ALLOCATION,
      action: {
        recipient: 'GRECIPIENT',
        amount: 2500,
        asset: 'USDC',
      },
      attachments: [
        {
          name: 'Budget note',
          url: 'https://example.com/budget',
          type: ProposalAttachmentType.LINK,
        },
      ],
    };
    service.createProposal.mockResolvedValue({ id: 'proposal-1' });

    const result = await controller.createProposal(user, dto);

    expect(service.createProposal).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ id: 'proposal-1' });
  });

  it('should edit a proposal for the authenticated user', async () => {
    const user = { id: 'user-1' };
    const dto = {
      description: 'Updated description',
      action: { reason: 'Expanded rationale' },
    };
    service.editProposal.mockResolvedValue({ id: 'proposal-1', canEdit: true });

    const result = await controller.editProposal(user, 'proposal-1', dto);

    expect(service.editProposal).toHaveBeenCalledWith(
      'user-1',
      'proposal-1',
      dto,
    );
    expect(result).toEqual({ id: 'proposal-1', canEdit: true });
  });
});
