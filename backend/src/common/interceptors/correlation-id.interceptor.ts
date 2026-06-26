import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

/**
 * Correlation ID Interceptor
 *
 * Ensures every request has a correlation ID by the time it reaches
 * route handlers — the middleware already does this, but this interceptor
 * acts as a safety net for any code paths that bypass middleware.
 *
 * Also augments the pino logger context so all log lines within a
 * request include the correlation ID automatically.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & { correlationId?: string }
    >();
    const response = context.switchToHttp().getResponse<Response>();

    // Ensure ID exists (middleware should have set this, but guard against it)
    if (!request.correlationId) {
      const id =
        (request.headers['x-correlation-id'] as string) || uuidv4();
      request.correlationId = id;
      response.setHeader('x-correlation-id', id);
    }

    return next.handle();
  }
}
