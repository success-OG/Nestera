import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { SecretsConfigService } from '../services/secrets-config.service';

const REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-auth-token',
]);

function sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (REDACTED_HEADERS.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else if (
      typeof value === 'string' &&
      SecretsConfigService.isSensitiveKey(key)
    ) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = String(value);
    }
  }
  return safe;
}
import { Logger } from 'nestjs-pino';
import { LogSanitizerService } from '../services/log-sanitizer.service';
import { ApmService } from '../../modules/apm/apm.service';

/** Paths skipped from verbose request logging (health checks, metrics) */
const SKIP_LOG_PATHS = new Set([
  '/api/health',
  '/api/metrics',
  '/api/v1/health',
  '/api/v2/health',
  '/favicon.ico',
]);

/** Status codes considered errors */
const isErrorStatus = (status: number) => status >= 400;

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly pinoLogger: Logger,
    @Optional()
    @Inject(LogSanitizerService)
    private readonly sanitizer: LogSanitizerService | null,
    @Optional()
    @Inject(ApmService)
    private readonly apmService: ApmService | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) || uuidv4();
      (request as Request & { correlationId?: string }).correlationId ||
      (request.headers['x-correlation-id'] as string) ||
      'unknown';

    const startTime = Date.now();
    const { method, ip } = request;
    const url = this.sanitizer?.sanitizeUrl(request.url) ?? request.url;

    (request as any).correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'];

    this.logger.log(
      JSON.stringify({
        type: 'REQUEST',
        correlationId,
        method,
        url,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      }),
    // Skip noisy paths
    const rawPath = request.path ?? request.url;
    if (SKIP_LOG_PATHS.has(rawPath)) {
      return next.handle();
    }

    // Extract user info if JWT is already parsed
    const reqWithUser = request as Request & {
      user?: { id?: string; address?: string; email?: string };
    };
    const userId = reqWithUser.user?.id;
    const address = reqWithUser.user?.address;

    // Log incoming request (headers sanitized but not logged to avoid noise)
    void this.sanitizer?.sanitizeHeaders(
      request.headers as Record<string, string | string[] | undefined>,
    );

    // Log incoming request
    this.pinoLogger.log({
      msg: `→ ${method} ${url}`,
      type: 'REQUEST',
      correlationId,
      method,
      url,
      ip,
      userId,
      address: address ? this.sanitizer?.maskAddress(address) : undefined,
      userAgent: request.headers['user-agent'],
      contentLength: request.headers['content-length'],
      referer: request.headers['referer'],
      // Include sanitized body for non-GET requests in dev/debug
      body:
        method !== 'GET' && this.sanitizer
          ? this.sanitizer.sanitizeBody(request.body)
          : undefined,
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // APM: track request metrics
        this.apmService?.trackHttpRequest(method, rawPath, statusCode, duration);

        const logPayload = {
          msg: `← ${method} ${url} ${statusCode} (${duration}ms)`,
          type: 'RESPONSE',
          correlationId,
          method,
          url,
          statusCode,
          duration,
          userId,
          contentLength: response.getHeader('content-length'),
        };

        if (isErrorStatus(statusCode)) {
          this.pinoLogger.warn(logPayload);
        } else {
          this.pinoLogger.log(logPayload);
        }
      }),
      catchError((error: Error & { status?: number; response?: unknown }) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status ?? 500;
        const isClientError = statusCode < 500;

        // APM: track errors
        this.apmService?.trackHttpRequest(method, rawPath, statusCode, duration);
        if (!isClientError) {
          this.apmService?.trackError(error, {
            route: rawPath,
            method,
            statusCode,
            userId,
          });
        }

        const logPayload = {
          msg: `✗ ${method} ${url} ${statusCode} (${duration}ms) — ${error.message}`,
          type: 'ERROR',
          correlationId,
          method,
          url,
          statusCode,
          duration,
          userId,
          errorMessage: error.message,
          errorName: error.constructor?.name,
          // Stack trace only for server errors
          stack: !isClientError ? error.stack : undefined,
        };

        if (isClientError) {
          this.pinoLogger.warn(logPayload);
        } else {
          this.pinoLogger.error(logPayload);
        }

        return throwError(() => error);
      }),
    );
  }
}
