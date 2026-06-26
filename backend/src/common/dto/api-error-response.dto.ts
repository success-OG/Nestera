import { ApiProperty } from '@nestjs/swagger';
import { StandardErrorResponseDto } from './standard-error-response.dto';

export class ApiErrorResponseDto extends StandardErrorResponseDto {
  @ApiProperty({
    example: 'Bad Request',
    description: 'Error type (deprecated, use errorCode instead)',
    required: false,
  })
  error?: string;
}

export class ValidationErrorDto extends ApiErrorResponseDto {
  @ApiProperty({
    example: [
      {
        field: 'goalName',
        value: '',
        constraints: {
          isNotEmpty: 'goalName should not be empty',
        },
      },
    ],
    description: 'Validation errors',
  })
  declare errors?: Array<{
    field: string;
    value?: unknown;
    constraints: Record<string, string>;
  }>;
}

export class UnauthorizedErrorDto extends ApiErrorResponseDto {
  @ApiProperty({
    example: 401,
    description: 'HTTP status code',
  })
  statusCode = 401;

  @ApiProperty({
    example: 'AUTH_001',
    description: 'Error code',
  })
  errorCode = 'AUTH_001';

  @ApiProperty({
    example: 'Authentication required. Please provide valid credentials.',
    description: 'Error message',
  })
  message = 'Authentication required. Please provide valid credentials.';
}

export class ForbiddenErrorDto extends ApiErrorResponseDto {
  @ApiProperty({
    example: 403,
    description: 'HTTP status code',
  })
  statusCode = 403;

  @ApiProperty({
    example: 'AUTHZ_001',
    description: 'Error code',
  })
  errorCode = 'AUTHZ_001';

  @ApiProperty({
    example: 'You do not have permission to access this resource.',
    description: 'Error message',
  })
  message = 'You do not have permission to access this resource.';
}

export class NotFoundErrorDto extends ApiErrorResponseDto {
  @ApiProperty({
    example: 404,
    description: 'HTTP status code',
  })
  statusCode = 404;

  @ApiProperty({
    example: 'SYS_404',
    description: 'Error code',
  })
  errorCode = 'SYS_404';

  @ApiProperty({
    example: 'The requested resource was not found.',
    description: 'Error message',
  })
  message = 'The requested resource was not found.';
}
