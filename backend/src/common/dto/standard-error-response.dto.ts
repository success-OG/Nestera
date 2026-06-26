import { ApiProperty } from '@nestjs/swagger';

export class ValidationError {
  @ApiProperty({
    example: 'goalName',
    description: 'Field name (dot notation for nested fields)',
  })
  field: string;

  @ApiProperty({
    example: '',
    description: 'Invalid value submitted',
    required: false,
  })
  value?: unknown;

  @ApiProperty({
    example: { isNotEmpty: 'goalName should not be empty' },
    description: 'Validation constraint violations',
  })
  constraints: Record<string, string>;
}

export class DebugContext {
  @ApiProperty({
    example: 'BadRequestException',
    description: 'Exception class name',
  })
  exception: string;

  @ApiProperty({
    example: 'Error: Validation failed\n    at ...',
    description: 'Full stack trace',
    required: false,
  })
  stackTrace?: string;

  @ApiProperty({
    example: 'Internal error message',
    description: 'Internal error message if different from user-facing message',
    required: false,
  })
  originalMessage?: string;

  @ApiProperty({
    description: 'Request details for debugging',
    required: false,
  })
  requestDetails?: {
    method: string;
    headers: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
  };
}

export class StandardErrorResponseDto {
  @ApiProperty({
    example: false,
    description: 'Always false for errors',
  })
  success: boolean;

  @ApiProperty({
    example: 400,
    description: 'HTTP status code',
  })
  statusCode: number;

  @ApiProperty({
    example: 'VAL_001',
    description: 'Machine-readable error code',
  })
  errorCode: string;

  @ApiProperty({
    example: 'Validation failed. Please check your input.',
    description: 'Human-readable error message',
  })
  message: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00.000Z',
    description: 'ISO 8601 timestamp',
  })
  timestamp: string;

  @ApiProperty({
    example: '/api/v2/goals',
    description: 'Request path',
  })
  path: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Request correlation ID (UUID)',
  })
  correlationId: string;

  @ApiProperty({
    type: [ValidationError],
    description: 'Validation errors array (present only for validation errors)',
    required: false,
  })
  errors?: ValidationError[];

  @ApiProperty({
    type: DebugContext,
    description: 'Debug information (present only in development/test environments)',
    required: false,
  })
  debugContext?: DebugContext;
}
