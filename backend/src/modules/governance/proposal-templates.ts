import {
  ProposalActionPayload,
  ProposalCategory,
  ProposalType,
} from './entities/governance-proposal.entity';

export type ProposalTemplateParamType = 'string' | 'number' | 'enum';

export interface ProposalTemplateParameterDefinition {
  name: string;
  label: string;
  description: string;
  type: ProposalTemplateParamType;
  required: boolean;
  example?: unknown;
  allowedValues?: string[];
  min?: number;
  max?: number;
  default?: unknown;
}

export interface ProposalTemplateDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  type: ProposalType;
  category: ProposalCategory;
  parameterSchema: ProposalTemplateParameterDefinition[];
  actionFactory: (params: Record<string, unknown>) => ProposalActionPayload;
}

function assertStringField(
  params: Record<string, unknown>,
  field: string,
  templateId: string,
  required = true,
): string | undefined {
  const value = params[field];
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`Template ${templateId}: missing required parameter '${field}'`);
    }
    return undefined;
  }

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Template ${templateId}: parameter '${field}' must be a non-empty string`);
  }
  return value.trim();
}

function assertNumberField(
  params: Record<string, unknown>,
  field: string,
  templateId: string,
  required = true,
  min?: number,
  max?: number,
): number | undefined {
  const value = params[field];
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`Template ${templateId}: missing required parameter '${field}'`);
    }
    return undefined;
  }

  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Template ${templateId}: parameter '${field}' must be a number`);
  }

  if (min !== undefined && value < min) {
    throw new Error(`Template ${templateId}: parameter '${field}' must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`Template ${templateId}: parameter '${field}' must be at most ${max}`);
  }

  return value;
}

function assertEnumField(
  params: Record<string, unknown>,
  field: string,
  allowedValues: string[],
  templateId: string,
  required = true,
): string | undefined {
  const value = assertStringField(params, field, templateId, required);
  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Template ${templateId}: parameter '${field}' must be one of ${allowedValues.join(', ')}`,
    );
  }

  return value;
}

const PROPOSAL_TEMPLATES: ProposalTemplateDefinition[] = [
  {
    id: 'rate-change-standard',
    version: '1.0',
    name: 'Standard Rate Change',
    description:
      'Create a structured rate-change proposal with a validated target and new rate value.',
    type: ProposalType.RATE_CHANGE,
    category: ProposalCategory.TECHNICAL,
    parameterSchema: [
      {
        name: 'target',
        label: 'Rate target',
        description: 'The rate field to change, for example flexiRate or fixedRate.',
        type: 'enum',
        required: true,
        allowedValues: ['flexiRate', 'fixedRate'],
        example: 'flexiRate',
      },
      {
        name: 'newValue',
        label: 'New rate value',
        description: 'The new rate percentage to apply for the selected target.',
        type: 'number',
        required: true,
        min: 0,
        max: 100,
        example: 10,
      },
      {
        name: 'reason',
        label: 'Reason',
        description: 'Optional rationale for the rate change.',
        type: 'string',
        required: false,
        example: 'Improve yield for savers',
      },
    ],
    actionFactory: (params) => {
      const target = assertEnumField(
        params,
        'target',
        ['flexiRate', 'fixedRate'],
        'rate-change-standard',
      );
      const newValue = assertNumberField(
        params,
        'newValue',
        'rate-change-standard',
        true,
        0,
        100,
      );
      const reason = assertStringField(params, 'reason', 'rate-change-standard', false);

      return {
        target,
        newValue,
        ...(reason ? { reason } : {}),
      };
    },
  },
  {
    id: 'pause-protocol',
    version: '1.0',
    name: 'Pause Protocol',
    description: 'Create a maintenance or emergency pause proposal.',
    type: ProposalType.PAUSE,
    category: ProposalCategory.GOVERNANCE,
    parameterSchema: [
      {
        name: 'reason',
        label: 'Reason',
        description: 'Reason for pausing protocol operations.',
        type: 'string',
        required: false,
        example: 'Emergency security patch',
      },
    ],
    actionFactory: (params) => {
      const reason = assertStringField(params, 'reason', 'pause-protocol', false);
      return {
        ...(reason ? { reason } : {}),
      };
    },
  },
  {
    id: 'unpause-protocol',
    version: '1.0',
    name: 'Resume Protocol',
    description: 'Create a proposal to unpause the protocol after a maintenance pause.',
    type: ProposalType.UNPAUSE,
    category: ProposalCategory.GOVERNANCE,
    parameterSchema: [
      {
        name: 'reason',
        label: 'Reason',
        description: 'Reason for resuming protocol operations.',
        type: 'string',
        required: false,
        example: 'Maintenance complete',
      },
    ],
    actionFactory: (params) => {
      const reason = assertStringField(params, 'reason', 'unpause-protocol', false);
      return {
        ...(reason ? { reason } : {}),
      };
    },
  },
  {
    id: 'treasury-allocation',
    version: '1.0',
    name: 'Treasury Allocation',
    description:
      'Allocate treasury assets to a recipient with a validated amount and asset type.',
    type: ProposalType.TREASURY_ALLOCATION,
    category: ProposalCategory.TREASURY,
    parameterSchema: [
      {
        name: 'recipient',
        label: 'Recipient',
        description: 'Recipient wallet address for treasury funds.',
        type: 'string',
        required: true,
        example: 'GRECIPIENT123',
      },
      {
        name: 'amount',
        label: 'Amount',
        description: 'Amount of treasury asset to allocate.',
        type: 'number',
        required: true,
        min: 0.00000001,
        example: 5000,
      },
      {
        name: 'asset',
        label: 'Asset',
        description: 'Treasury asset symbol to allocate.',
        type: 'string',
        required: false,
        default: 'NST',
        example: 'NST',
      },
      {
        name: 'reason',
        label: 'Reason',
        description: 'Optional justification for the allocation.',
        type: 'string',
        required: false,
        example: 'Community grant',
      },
    ],
    actionFactory: (params) => {
      const recipient = assertStringField(
        params,
        'recipient',
        'treasury-allocation',
      );
      const amount = assertNumberField(
        params,
        'amount',
        'treasury-allocation',
        true,
        0.00000001,
      );
      const asset = assertStringField(params, 'asset', 'treasury-allocation', false) ?? 'NST';
      const reason = assertStringField(params, 'reason', 'treasury-allocation', false);
      return {
        recipient,
        amount,
        asset,
        ...(reason ? { reason } : {}),
      };
    },
  },
];

export interface ProposalTemplateSummary {
  id: string;
  version: string;
  name: string;
  description: string;
  type: ProposalType;
  category: ProposalCategory;
}

export function listProposalTemplates(): ProposalTemplateSummary[] {
  return PROPOSAL_TEMPLATES.map((template) => ({
    id: template.id,
    version: template.version,
    name: template.name,
    description: template.description,
    type: template.type,
    category: template.category,
  }));
}

export function getProposalTemplate(
  templateId: string,
  version?: string,
): ProposalTemplateDefinition | undefined {
  const normalizedId = templateId.trim();
  if (version) {
    return PROPOSAL_TEMPLATES.find(
      (template) =>
        template.id === normalizedId && template.version === version.trim(),
    );
  }

  const candidates = PROPOSAL_TEMPLATES.filter(
    (template) => template.id === normalizedId,
  );
  return candidates.sort((a, b) => b.version.localeCompare(a.version))[0];
}
