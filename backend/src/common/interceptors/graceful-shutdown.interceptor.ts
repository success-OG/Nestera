import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
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
    }

    this.gracefulShutdown.incrementActiveRequests();

    return next.handle().pipe(
      finalize(() => {
        this.gracefulShutdown.decrementActiveRequests();
      }),
    );
  }
}
