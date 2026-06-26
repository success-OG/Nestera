import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export interface PoolExtraOptions {
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  statement_timeout: number;
  query_timeout: number;
  allowExitOnIdle: boolean;
}

export function getPoolExtraOptions(
  configService: ConfigService,
): PoolExtraOptions {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  return {
    max: configService.get<number>(
      'database.pool.max',
      configService.get<number>('DATABASE_POOL_MAX', isProduction ? 30 : 10),
    ),
    min: configService.get<number>(
      'database.pool.min',
      configService.get<number>('DATABASE_POOL_MIN', isProduction ? 5 : 2),
    ),
    idleTimeoutMillis: configService.get<number>(
      'database.pool.idleTimeout',
      configService.get<number>('DATABASE_IDLE_TIMEOUT', 30000),
    ),
    connectionTimeoutMillis: configService.get<number>(
      'database.pool.connectionTimeout',
      configService.get<number>('DATABASE_CONNECTION_TIMEOUT', 2000),
    ),
    statement_timeout: configService.get<number>(
      'database.pool.statementTimeout',
      configService.get<number>('DATABASE_STATEMENT_TIMEOUT', 30000),
    ),
    query_timeout: configService.get<number>(
      'database.pool.queryTimeout',
      configService.get<number>('DATABASE_QUERY_TIMEOUT', 30000),
    ),
    allowExitOnIdle: configService.get<boolean>(
      'database.pool.allowExitOnIdle',
      configService.get<string>('DATABASE_POOL_ALLOW_EXIT_ON_IDLE') === 'true',
    ),
  };
}

export function buildTypeOrmModuleOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';
  const extra = getPoolExtraOptions(configService);

  const baseOptions: TypeOrmModuleOptions = {
    type: 'postgres',
    autoLoadEntities: true,
    synchronize: !isProduction,
    extra,
  };

  const dbUrl = configService.get<string>('database.url');
  const dbHost = configService.get<string>('database.host');

  if (dbUrl) {
    return {
      ...baseOptions,
      url: dbUrl,
    };
  }

  if (!dbHost) {
    throw new Error(
      'Database configuration error: set either DATABASE_URL or DB_HOST in your environment.',
    );
  }

  return {
    ...baseOptions,
    host: dbHost,
    port: configService.get<number>('database.port') ?? 5432,
    database: configService.get<string>('database.name'),
    username: configService.get<string>('database.user'),
    password: configService.get<string>('database.pass'),
  };
}

/** @deprecated Use buildTypeOrmModuleOptions instead */
export function getTypeOrmConfig(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return buildTypeOrmModuleOptions(configService);
}
