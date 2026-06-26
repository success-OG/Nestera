import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApmService } from './apm.service';
import { DistributedTracingService } from './distributed-tracing.service';

@Injectable()
export class ApmInterceptor implements NestInterceptor {
  constructor(
    private readonly apmService: ApmService,
    private readonly tracingService: DistributedTracingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    const incomingContext = this.tracingService.parseTraceContext(
      request.headers as Record<string, string | string[] | undefined>,
    );
    const traceCtx = this.tracingService.createTraceContext(
      incomingContext || undefined,
    );

    const span = this.tracingService.startSpan(
      `HTTP ${request.method} ${request.path}`,
      traceCtx,
      {
        'http.method': request.method,
        'http.url': request.url,
        'http.route': request.path,
        'http.user_agent': (request.headers['user-agent'] as string) || '',
        'component': 'http',
      },
    );

    response.setHeader('traceparent', this.tracingService.buildTraceparentHeader(traceCtx));
    response.setHeader('X-Trace-Id', traceCtx.traceId);
    (request as any).traceContext = traceCtx;
    (request as any).apmSpan = span;

    const route = this.getRoutePattern(request);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        this.tracingService.addSpanTag(span, 'http.status_code', statusCode);
        this.tracingService.finishSpan(span);
        this.apmService.trackHttpRequest(request.method, route, statusCode, duration);
      }),
      catchError((error: Error) => {
        const duration = Date.now() - startTime;
        const statusCode = (error as any).status || 500;

        this.tracingService.finishSpan(span, error);
        this.apmService.trackHttpRequest(request.method, route, statusCode, duration);
        this.apmService.trackError(error, {
          route,
          method: request.method,
          statusCode,
          traceId: traceCtx.traceId,
        });

        throw error;
      }),
    );
  }

  private getRoutePattern(request: Request): string {
    const route = (request as any).route;
    if (route?.path) {
      return request.path.replace(/\/[0-9a-f-]{36}/gi, '/:id').replace(/\/\d+/g, '/:id');
    }
    return request.path;
  }
}
