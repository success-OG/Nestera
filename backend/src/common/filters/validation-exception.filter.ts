import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationError {
  field: string;
  value?: unknown;
  constraints: Record<string, string>;
  children?: ValidationError[];
}

interface ClassValidatorError {
  property: string;
  value?: unknown;
  constraints?: Record<string, string>;
  children?: ClassValidatorError[];
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const exceptionResponse = exception.getResponse() as
      | string
      | { message: string | string[] | ClassValidatorError[]; error?: string };

    const statusCode = exception.getStatus();
    const correlationId = (request as any).correlationId;

    let formattedErrors: ValidationError[] | string[];
    let message: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      formattedErrors = [exceptionResponse];
    } else if (Array.isArray(exceptionResponse.message)) {
      const msgArray = exceptionResponse.message;

      if (msgArray.length > 0 && typeof msgArray[0] === 'object') {
        const classValidatorErrors = msgArray as ClassValidatorError[];
        formattedErrors = this.formatClassValidatorErrors(classValidatorErrors);
        message = 'Validation failed';
      } else {
        formattedErrors = msgArray as string[];
        message = 'Validation failed';
      }
    } else {
      message =
        typeof exceptionResponse.message === 'string'
          ? exceptionResponse.message
          : 'Bad Request';
      formattedErrors = [message];
    }

    const body = {
      success: false,
      statusCode,
      error: 'Validation Error',
      message,
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    this.logger.debug(
      `Validation error on ${request.method} ${request.url}: ${JSON.stringify(formattedErrors)}`,
    );

    response.status(statusCode).json(body);
  }

  private formatClassValidatorErrors(
    errors: ClassValidatorError[],
    parentField = '',
  ): ValidationError[] {
    const result: ValidationError[] = [];

    for (const error of errors) {
      const field = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      if (error.constraints && Object.keys(error.constraints).length > 0) {
        result.push({
          field,
          value: error.value,
          constraints: error.constraints,
        });
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatClassValidatorErrors(error.children, field);
        result.push(...childErrors);
      }
    }

    return result;
  }
}
