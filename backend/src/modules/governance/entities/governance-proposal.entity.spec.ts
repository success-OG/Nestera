import {
  GovernanceProposal,
  ProposalAttachmentType,
  ProposalStatus,
  ProposalCategory,
  ProposalType,
} from './governance-proposal.entity';
import { Vote, VoteDirection } from './vote.entity';

describe('GovernanceProposal Entity', () => {
  it('should create a governance proposal with required fields', () => {
    const proposal = new GovernanceProposal();
    proposal.onChainId = 1;
    proposal.title = 'Test Proposal';
    proposal.description = 'This is a test proposal description';
    proposal.category = ProposalCategory.GOVERNANCE;
    proposal.status = ProposalStatus.ACTIVE;

    expect(proposal.onChainId).toBe(1);
    expect(proposal.title).toBe('Test Proposal');
    expect(proposal.description).toBe('This is a test proposal description');
    expect(proposal.category).toBe(ProposalCategory.GOVERNANCE);
    expect(proposal.status).toBe(ProposalStatus.ACTIVE);
  });

  it('should support all proposal categories', () => {
    expect(ProposalCategory.GOVERNANCE).toBe('Governance');
    expect(ProposalCategory.TREASURY).toBe('Treasury');
    expect(ProposalCategory.TECHNICAL).toBe('Technical');
    expect(ProposalCategory.COMMUNITY).toBe('Community');
  });

  it('should support all proposal statuses', () => {
    expect(ProposalStatus.ACTIVE).toBe('Active');
    expect(ProposalStatus.PASSED).toBe('Passed');
    expect(ProposalStatus.FAILED).toBe('Failed');
    expect(ProposalStatus.CANCELLED).toBe('Cancelled');
  });

  it('should have bidirectional relationship with votes', () => {
    const proposal = new GovernanceProposal();
    proposal.votes = [];

    const vote1 = new Vote();
    vote1.walletAddress = '0x1234';
    vote1.direction = VoteDirection.FOR;
    vote1.weight = 100;
    vote1.proposal = proposal;

    const vote2 = new Vote();
    vote2.walletAddress = '0x5678';
    vote2.direction = VoteDirection.AGAINST;
    vote2.weight = 50;
    vote2.proposal = proposal;

    proposal.votes.push(vote1, vote2);

    expect(proposal.votes).toHaveLength(2);
    expect(proposal.votes[0].direction).toBe(VoteDirection.FOR);
    expect(proposal.votes[1].direction).toBe(VoteDirection.AGAINST);
    expect(vote1.proposal).toBe(proposal);
    expect(vote2.proposal).toBe(proposal);
  });

  it('should store optional fields', () => {
    const proposal = new GovernanceProposal();
    proposal.onChainId = 2;
    proposal.title = 'Treasury Proposal';
    proposal.description = 'Allocate funds';
    proposal.category = ProposalCategory.TREASURY;
    proposal.status = ProposalStatus.ACTIVE;
    proposal.proposer = '0xabcd';
    proposal.startBlock = 1000000;
    proposal.endBlock = 1100000;

    expect(proposal.proposer).toBe('0xabcd');
    expect(proposal.startBlock).toBe(1000000);
    expect(proposal.endBlock).toBe(1100000);
  });

  it('should support structured proposal metadata', () => {
    const proposal = new GovernanceProposal();
    proposal.type = ProposalType.TREASURY_ALLOCATION;
    proposal.action = {
      recipient: 'GRECIPIENT123',
      amount: 5000,
      asset: 'USDC',
    };
    proposal.attachments = [
      {
        name: 'Treasury memo',
        url: 'https://example.com/memo.pdf',
        type: ProposalAttachmentType.DOCUMENT,
      },
    ];
    proposal.requiredQuorum = '5000.00000000';
    proposal.quorumBps = 5000;
    proposal.proposalThreshold = '100.00000000';

    expect(proposal.type).toBe(ProposalType.TREASURY_ALLOCATION);
    expect(proposal.action?.recipient).toBe('GRECIPIENT123');
    expect(proposal.attachments[0].type).toBe(ProposalAttachmentType.DOCUMENT);
    expect(proposal.requiredQuorum).toBe('5000.00000000');
    expect(proposal.quorumBps).toBe(5000);
    expect(proposal.proposalThreshold).toBe('100.00000000');
  });
});
