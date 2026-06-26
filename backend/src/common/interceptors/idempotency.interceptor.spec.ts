import {
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../services/idempotency.service';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let idempotencyService: jest.Mocked<IdempotencyService>;

  beforeEach(() => {
    idempotencyService = {
      getResponse: jest.fn(),
      saveResponse: jest.fn(),
      isProcessing: jest.fn(),
      setProcessing: jest.fn(),
      removeProcessing: jest.fn(),
    } as any;

    interceptor = new IdempotencyInterceptor(idempotencyService);
  });

  const createMockContext = (
    method: string,
    headers: any,
    user: any = { id: 'user1' },
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          headers,
          user,
        }),
      }),
    }) as any;

  const mockCallHandler: CallHandler = {
    handle: () => of({ success: true }),
  };

  it('should skip if not a mutation method (GET)', async () => {
    const context = createMockContext('GET', { 'x-idempotency-key': 'key1' });
    const next = { handle: jest.fn().mockReturnValue(of({ data: 'ok' })) };

    await interceptor.intercept(context, next);

    expect(next.handle).toHaveBeenCalled();
    expect(idempotencyService.getResponse).not.toHaveBeenCalled();
  });

  it('should skip if no idempotency key is provided', async () => {
    const context = createMockContext('POST', {});
    const next = { handle: jest.fn().mockReturnValue(of({ data: 'ok' })) };

    await interceptor.intercept(context, next);

    expect(next.handle).toHaveBeenCalled();
    expect(idempotencyService.getResponse).not.toHaveBeenCalled();
  });

  it('should return cached response if key exists', (done) => {
    const context = createMockContext('POST', { 'x-idempotency-key': 'key1' });
    const cachedResponse = { success: true, fromCache: true };
    idempotencyService.getResponse.mockResolvedValue(cachedResponse);

    interceptor.intercept(context, mockCallHandler).then((result$) => {
      result$.subscribe((response) => {
        expect(response).toEqual(cachedResponse);
        expect(idempotencyService.getResponse).toHaveBeenCalledWith(
          'key1',
          'user1',
        );
        done();
      });
    });
  });

  it('should throw ConflictException if request is already being processed', async () => {
    const context = createMockContext('POST', { 'x-idempotency-key': 'key1' });
    idempotencyService.getResponse.mockResolvedValue(null);
    idempotencyService.isProcessing.mockResolvedValue(true);

    await expect(
      interceptor.intercept(context, mockCallHandler),
    ).rejects.toThrow(ConflictException);
  });

  it('should process request and cache response if key is new', async () => {
    const context = createMockContext('POST', { 'x-idempotency-key': 'key1' });
    idempotencyService.getResponse.mockResolvedValue(null);
    idempotencyService.isProcessing.mockResolvedValue(false);

    await firstValueFrom(await interceptor.intercept(context, mockCallHandler));
    await Promise.resolve();

    expect(idempotencyService.setProcessing).toHaveBeenCalledWith(
      'key1',
      'user1',
    );
    expect(idempotencyService.saveResponse).toHaveBeenCalledWith(
      'key1',
      'user1',
      { success: true },
    );
    expect(idempotencyService.removeProcessing).toHaveBeenCalledWith(
      'key1',
      'user1',
    );
  });

  it('should remove processing lock even if request fails', async () => {
    const context = createMockContext('POST', { 'x-idempotency-key': 'key1' });
    idempotencyService.getResponse.mockResolvedValue(null);
    idempotencyService.isProcessing.mockResolvedValue(false);

    const failingHandler: CallHandler = {
      handle: () => throwError(() => new Error('API Error')),
    };

    await expect(
      firstValueFrom(await interceptor.intercept(context, failingHandler)),
    ).rejects.toThrow('API Error');
    await Promise.resolve();

    expect(idempotencyService.removeProcessing).toHaveBeenCalledWith(
      'key1',
      'user1',
    );
    expect(idempotencyService.saveResponse).not.toHaveBeenCalled();
  });
});
