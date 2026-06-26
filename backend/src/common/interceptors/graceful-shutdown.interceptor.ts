import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { Observable, EMPTY } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GracefulShutdownService } from '../services/graceful-shutdown.service';

@Injectable()
export class GracefulShutdownInterceptor implements NestInterceptor {
  constructor(private gracefulShutdown: GracefulShutdownService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (this.gracefulShutdown.isShutdown()) {
      return throwError(
        () =>
          new HttpException(
            {
              statusCode: HttpStatus.SERVICE_UNAVAILABLE,
              message: 'Service is shutting down',
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          ),
      );
      const response = context.switchToHttp().getResponse();
      response.setHeader?.('Connection', 'close');
      response.status(503).json({
        statusCode: 503,
        message: 'Service is shutting down',
      });
      return EMPTY;
    }

    this.gracefulShutdown.incrementActiveRequests();

    return next.handle().pipe(
      finalize(() => {
        this.gracefulShutdown.decrementActiveRequests();
      }),
    );
  }
}
