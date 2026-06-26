import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { tap, mergeMap, finalize } from 'rxjs/operators';
import { IdempotencyService } from '../services/idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Only apply to POST, PATCH, PUT, DELETE
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return next.handle();
    }

    if (typeof idempotencyKey !== 'string') {
      throw new BadRequestException('Invalid X-Idempotency-Key header');
    }

    const userId = request.user?.id || 'anonymous';
    
    // Check if we have a cached response
    const cachedResponse = await this.idempotencyService.getResponse(
      idempotencyKey,
      userId,
    );
    if (cachedResponse) {
      return of(cachedResponse);
    }

    // Check if it's already being processed to prevent race conditions
    const isProcessing = await this.idempotencyService.isProcessing(
      idempotencyKey,
      userId,
    );
    if (isProcessing) {
      throw new ConflictException(
        'A request with this idempotency key is already being processed',
      );
    }

    // Mark as processing
    await this.idempotencyService.setProcessing(idempotencyKey, userId);

    return next.handle().pipe(
      tap(async (response) => {
        // Cache the successful response
        await this.idempotencyService.saveResponse(
          idempotencyKey,
          userId,
          response,
        );
      }),
      finalize(async () => {
        // Remove processing lock
        await this.idempotencyService.removeProcessing(idempotencyKey, userId);
      }),
    );
  }
}
