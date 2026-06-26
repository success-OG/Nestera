import { applyDecorators } from '@nestjs/common';
import { ApiResponse, ApiExtraModels } from '@nestjs/swagger';

export interface ApiExampleOptions {
  statusCode: number;
  description: string;
  example: any;
  isArray?: boolean;
}

export function ApiExample(options: ApiExampleOptions) {
  return applyDecorators(
    ApiResponse({
      status: options.statusCode,
      description: options.description,
      schema: {
        example: options.isArray ? [options.example] : options.example,
      },
    }),
  );
}

export function ApiErrorResponse(
  statusCode: number,
  description: string,
  example?: any,
) {
  return ApiResponse({
    status: statusCode,
    description,
    schema: {
      example: example || {
        statusCode,
        message: description,
        error: 'Error',
        timestamp: new Date().toISOString(),
      },
    },
  });
}
