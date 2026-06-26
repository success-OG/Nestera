import { ConfigService } from '@nestjs/config';
import {
  buildTypeOrmModuleOptions,
  getPoolExtraOptions,
} from './typeorm-pool.config';

function createConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      const value = values[key];
      return (value !== undefined ? value : defaultValue) as T;
    },
  } as ConfigService;
}

describe('typeorm-pool.config', () => {
  describe('getPoolExtraOptions', () => {
    it('uses production defaults when NODE_ENV is production', () => {
      const configService = createConfigService({
        NODE_ENV: 'production',
      });

      const options = getPoolExtraOptions(configService);

      expect(options.max).toBe(30);
      expect(options.min).toBe(5);
      expect(options.idleTimeoutMillis).toBe(30000);
      expect(options.connectionTimeoutMillis).toBe(2000);
    });

    it('respects explicit pool environment overrides', () => {
      const configService = createConfigService({
        NODE_ENV: 'development',
        'database.pool.max': 25,
        'database.pool.min': 4,
        'database.pool.idleTimeout': 15000,
      });

      const options = getPoolExtraOptions(configService);

      expect(options.max).toBe(25);
      expect(options.min).toBe(4);
      expect(options.idleTimeoutMillis).toBe(15000);
    });
  });

  describe('buildTypeOrmModuleOptions', () => {
    it('builds URL-based options with pool extra settings', () => {
      const configService = createConfigService({
        NODE_ENV: 'development',
        'database.url': 'postgresql://user:pass@localhost:5432/nestera',
      });

      const options = buildTypeOrmModuleOptions(configService);

      expect(options).toMatchObject({
        type: 'postgres',
        url: 'postgresql://user:pass@localhost:5432/nestera',
        autoLoadEntities: true,
        synchronize: true,
        extra: expect.objectContaining({
          max: 10,
          min: 2,
        }),
      });
    });

    it('builds host-based options when DATABASE_URL is absent', () => {
      const configService = createConfigService({
        NODE_ENV: 'production',
        'database.host': 'db.internal',
        'database.port': 5433,
        'database.name': 'nestera',
        'database.user': 'app',
        'database.pass': 'secret',
      });

      const options = buildTypeOrmModuleOptions(configService);

      expect(options).toMatchObject({
        type: 'postgres',
        host: 'db.internal',
        port: 5433,
        database: 'nestera',
        username: 'app',
        password: 'secret',
        synchronize: false,
        extra: expect.objectContaining({
          max: 30,
          min: 5,
        }),
      });
    });

    it('throws when neither URL nor host is configured', () => {
      const configService = createConfigService({
        NODE_ENV: 'development',
      });

      expect(() => buildTypeOrmModuleOptions(configService)).toThrow(
        'Database configuration error',
      );
    });
  });
});
