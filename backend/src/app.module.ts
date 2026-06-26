import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { GracefulShutdownInterceptor } from './common/interceptors/graceful-shutdown.interceptor';
import { TieredThrottlerGuard } from './common/guards/tiered-throttler.guard';
import { CommonModule } from './common/common.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmModuleOptions } from './common/database/typeorm-pool.config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { UserModule } from './modules/user/user.module';
import { KycModule } from './modules/kyc/kyc.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { CacheModule } from './modules/cache/cache.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AdminAnalyticsModule } from './modules/admin-analytics/admin-analytics.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SavingsModule } from './modules/savings/savings.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { TestRbacModule } from './test-rbac/test-rbac.module';
import { TestThrottlingModule } from './test-throttling/test-throttling.module';
import { ApiVersioningModule } from './common/versioning/api-versioning.module';
import { BackupModule } from './modules/backup/backup.module';
import { DataExportModule } from './modules/data-export/data-export.module';
import { ConnectionPoolModule } from './common/database/connection-pool.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { PostmanModule } from './common/postman/postman.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CompressionMetricsMiddleware } from './common/middleware/compression.middleware';
import { JobsModule } from './modules/jobs/jobs.module';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { ApmModule } from './modules/apm/apm.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';

const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').required(),
  PORT: Joi.number().port().default(3001).required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_NAME: Joi.string().optional(),
  DB_USER: Joi.string().optional(),
  DB_PASS: Joi.string().optional(),
  DATABASE_URL: Joi.string().uri().optional(),

  DATABASE_POOL_MAX: Joi.number().integer().min(1).default(10),
  DATABASE_POOL_MIN: Joi.number().integer().min(0).default(2),
  DATABASE_POOL_MAX_CEILING: Joi.number().integer().min(1).default(50),
  DATABASE_IDLE_TIMEOUT: Joi.number().integer().min(1000).default(30000),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().integer().min(100).default(2000),
  DATABASE_STATEMENT_TIMEOUT: Joi.number().integer().min(1000).default(30000),
  DATABASE_QUERY_TIMEOUT: Joi.number().integer().min(1000).default(30000),
  DATABASE_POOL_MONITOR_INTERVAL: Joi.number()
    .integer()
    .min(5000)
    .default(30000),
  DATABASE_POOL_SCALE_UP_THRESHOLD: Joi.number().min(1).max(100).default(80),
  DATABASE_POOL_SCALE_DOWN_THRESHOLD: Joi.number().min(1).max(100).default(30),
  DATABASE_POOL_EXHAUSTION_WAITING_THRESHOLD: Joi.number()
    .integer()
    .min(0)
    .default(1),
  DATABASE_POOL_LEAK_THRESHOLD: Joi.number().min(1).max(100).default(90),
  DATABASE_POOL_ALLOW_EXIT_ON_IDLE: Joi.boolean().default(false),
  DATABASE_POOL_AUTO_SCALE: Joi.boolean().default(true),

  DB_MAX_RETRIES: Joi.number().integer().min(0).default(5),
  DB_RETRY_INITIAL_DELAY: Joi.number().integer().min(0).default(500),
  DB_RETRY_MAX_DELAY: Joi.number().integer().min(0).default(30000),
  DB_RETRY_BACKOFF: Joi.number().min(1).default(2.0),
  DB_RETRY_JITTER: Joi.number().integer().min(0).default(100),

  JWT_SECRET: Joi.string().min(10).required(),
  JWT_EXPIRATION: Joi.string().required(),

  STELLAR_NETWORK: Joi.string().valid('testnet', 'mainnet').default('testnet'),
  SOROBAN_RPC_URL: Joi.string().uri().required(),
  HORIZON_URL: Joi.string().uri().required(),
  SOROBAN_RPC_FALLBACK_URLS: Joi.string().required(),
  HORIZON_FALLBACK_URLS: Joi.string().required(),

  CONTRACT_ID: Joi.string().required(),
  STELLAR_WEBHOOK_SECRET: Joi.string().min(16).required(),
  STELLAR_EVENT_POLL_INTERVAL: Joi.number().integer().min(1000).default(10000),

  RPC_MAX_RETRIES: Joi.number().integer().min(0).default(3),
  RPC_RETRY_DELAY: Joi.number().integer().min(0).default(1000),
  RPC_TIMEOUT: Joi.number().integer().min(0).default(10000),

  REDIS_URL: Joi.string().uri().optional(),
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().port().default(587),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  KYC_PROVIDER_BASE_URL: Joi.string().uri().optional(),
  KYC_PROVIDER_API_KEY: Joi.string().optional(),
  KYC_PII_ENCRYPTION_KEY: Joi.string().min(16).optional(),

  BACKUP_S3_BUCKET: Joi.string().optional(),
  BACKUP_S3_REGION: Joi.string().optional(),
  BACKUP_AWS_ACCESS_KEY_ID: Joi.string().optional(),
  BACKUP_AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  BACKUP_ENCRYPTION_KEY: Joi.string().length(64).optional(), // 32-byte key as hex
  BACKUP_RETENTION_DAYS: Joi.number().integer().min(1).default(30).optional(),
  BACKUP_TMP_DIR: Joi.string().optional(),

  LOG_DIR: Joi.string().optional(),
  LOG_RETENTION_DAYS: Joi.number().integer().min(1).default(30).optional(),
});

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        const logLevel = isProduction ? 'info' : 'debug';

        return {
          pinoHttp: {
            level: logLevel,
            // Attach correlationId from request to every log line
            customProps: (req: import('http').IncomingMessage) => ({
              correlationId:
                (
                  req as import('http').IncomingMessage & {
                    correlationId?: string;
                  }
                ).correlationId ||
                req.headers['x-correlation-id'] ||
                'unknown',
            }),
            // Redact sensitive fields from pino-http auto-logging
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["x-api-key"]',
                'req.body.password',
                'req.body.secret',
                'req.body.token',
                'req.body.privateKey',
                'req.body.secretKey',
                'req.body.mnemonic',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            // Serializers for structured output
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                remoteAddress: req.remoteAddress,
                userAgent: req.headers?.['user-agent'],
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
              err: (err) => ({
                type: err.type,
                message: err.message,
                stack: isProduction ? undefined : err.stack,
              }),
            },
            transport: isProduction
              ? (() => {
                  const logDir = configService.get<string>('LOG_DIR');
                  const retentionDays =
                    configService.get<number>('LOG_RETENTION_DAYS') ?? 30;
                  // File transport for log retention when LOG_DIR is set
                  if (logDir) {
                    return {
                      targets: [
                        {
                          target: 'pino/file',
                          options: {
                            destination: `${logDir}/app.log`,
                            mkdir: true,
                          },
                          level: logLevel,
                        },
                      ],
                    };
                  }
                  // No transport in production without LOG_DIR (stdout JSON)
                  void retentionDays;
                  return undefined;
                })()
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                    messageFormat: '[{correlationId}] {msg}',
                  },
                },
          },
        };
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      validate: (config) => {
        const { error, value } = envValidationSchema.validate(config, {
          allowUnknown: true,
          abortEarly: false,
        });

        if (error) {
          const issues = error.details
            .map((detail) => `- ${detail.message}`)
            .join('\n');
          console.error(
            `[Config] Environment validation failed. Application will exit.\n${issues}`,
          );
          process.exit(1);
        }

        return value;
      },
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            transport: isProduction
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            level: isProduction ? 'info' : 'debug',
          },
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildTypeOrmModuleOptions(configService),
    }),
    AuthModule,
    CacheModule,
    HealthModule,
    BlockchainModule,
    UserModule,
    KycModule,
    ChallengesModule,
    AlertsModule,
    AdminModule,
    MailModule,
    EmailTemplatesModule,
    WebhooksModule,
    ClaimsModule,
    DisputesModule,
    AdminAnalyticsModule,
    AnalyticsModule,
    StatisticsModule,
    SavingsModule,
    GovernanceModule,
    NotificationsModule,
    TransactionsModule,
    ReportsModule,
    ReferralsModule,
    TestRbacModule,
    TestThrottlingModule,
    ApiVersioningModule,
    BackupModule,
    DataExportModule,
    ConnectionPoolModule,
    CircuitBreakerModule,
    PostmanModule,
    PerformanceModule,
    ApmModule,
    FeatureFlagsModule,
    JobsModule,
    SandboxModule,
    FeedbackModule,
    CommonModule,
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'auth',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 5,
      },
      {
        name: 'rpc',
        ttl: 60000, // 1 minute
        limit: 10,
      },
      {
        name: 'export',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 6,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GracefulShutdownService,
    {
      provide: APP_GUARD,
      useClass: TieredThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: GracefulShutdownInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, CompressionMetricsMiddleware)
      .forRoutes('*');
  }
}
