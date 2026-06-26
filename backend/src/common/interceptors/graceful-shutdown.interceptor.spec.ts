import { EMPTY, of, firstValueFrom } from 'rxjs';
import { GracefulShutdownInterceptor } from './graceful-shutdown.interceptor';
import { GracefulShutdownService } from '../services/graceful-shutdown.service';

describe('GracefulShutdownInterceptor', () => {
  const createContext = () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    return {
      response,
      context: {
        switchToHttp: () => ({
          getResponse: () => response,
        }),
      },
    };
  };

  it('rejects new requests while shutdown is in progress', () => {
    const gracefulShutdown = {
      isShutdown: jest.fn().mockReturnValue(true),
      incrementActiveRequests: jest.fn(),
      decrementActiveRequests: jest.fn(),
    } as unknown as GracefulShutdownService;
    const interceptor = new GracefulShutdownInterceptor(gracefulShutdown);
    const { context, response } = createContext();

    const result = interceptor.intercept(
      context as never,
      {
        handle: () => of('ok'),
      } as never,
    );

    expect(result).toBe(EMPTY);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(gracefulShutdown.incrementActiveRequests).not.toHaveBeenCalled();
  });

  it('tracks accepted requests until completion', async () => {
    const gracefulShutdown = {
      isShutdown: jest.fn().mockReturnValue(false),
      incrementActiveRequests: jest.fn(),
      decrementActiveRequests: jest.fn(),
    } as unknown as GracefulShutdownService;
    const interceptor = new GracefulShutdownInterceptor(gracefulShutdown);
    const { context } = createContext();

    await firstValueFrom(
      interceptor.intercept(
        context as never,
        {
          handle: () => of('ok'),
        } as never,
      ),
    );

    expect(gracefulShutdown.incrementActiveRequests).toHaveBeenCalled();
    expect(gracefulShutdown.decrementActiveRequests).toHaveBeenCalled();
  });
});
