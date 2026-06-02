import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
  BadRequestException,
} from '@nestjs/common';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { EnhancedExceptionFilter } from './common/filters/enhanced-exception.filter';
import { ErrorCodeRegistry } from './common/services/error-code-registry.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  VersioningMiddleware,
  CURRENT_VERSION,
} from './common/versioning/versioning.middleware';
import { VersionAnalyticsInterceptor } from './common/versioning/version-analytics.interceptor';
import { VersionAnalyticsService } from './common/versioning/version-analytics.service';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';

async function flushApplicationLogs(
  app: INestApplication,
  logger: Logger,
): Promise<void> {
  const nestApp = app as INestApplication & {
    flushLogs?: () => Promise<void> | void;
  };

  if (typeof nestApp.flushLogs === 'function') {
    await nestApp.flushLogs();
    return;
  }

  const pinoLogger = logger as Logger & {
    flush?: () => void;
    logger?: { flush?: () => void };
  };

  pinoLogger.flush?.();
  pinoLogger.logger?.flush?.();
  await new Promise((resolve) => setTimeout(resolve, 50));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');

  app.use(
    compression({
      threshold: 1024,
      brotli: { enabled: true },
    }),
  );

   app.setGlobalPrefix('api');
   app.enableVersioning({
     type: VersioningType.URI,
     defaultVersion: '1',
   });
   app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: CURRENT_VERSION,
  });

  // Register header-based version negotiation + deprecation warnings
  const versioningMiddleware = new VersioningMiddleware();
  app.use(versioningMiddleware.use.bind(versioningMiddleware));

  // Register version analytics interceptor globally
  const versionAnalytics = app.get(VersionAnalyticsService);
  app.useGlobalInterceptors(new VersionAnalyticsInterceptor(versionAnalytics));

  // Register enhanced exception filter with error code registry
  const errorRegistry = new ErrorCodeRegistry();
  app.useGlobalFilters(new EnhancedExceptionFilter(errorRegistry));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: result,
        });
      },
    }),
  );

   // Swagger setup
   const swaggerConfig = new DocumentBuilder()
     .setTitle('Nestera API')
     .setDescription('API documentation for the Nestera platform (URI versioned, e.g., /v1/)')
     .setVersion('1.0')
     .addBearerAuth()
     .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port || 3001);
   console.log(`Application is running on: http://localhost:${port}/api (with URI versioning, e.g., /v1/)`);
   console.log(`Swagger docs available at: http://localhost:${port}/api/docs (shows versioned endpoints)`);
  // ── Swagger / OpenAPI setup ───────────────────────────────────────────────
  const rateLimitDescription = `
## Authentication

All protected endpoints require a **Bearer JWT** in the \`Authorization\` header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

Obtain a token via:
- \`POST /api/v2/auth/register\` — email/password registration
- \`POST /api/v2/auth/login\` — email/password login
- \`POST /api/v2/auth/verify-signature\` — Stellar wallet login (Web3)

If 2FA is enabled, complete login via \`POST /api/v2/auth/2fa/validate\`.

---

## Rate Limits

Rate limits are enforced per **user tier** and returned in response headers:

| Tier       | Default (req/min) | Auth (req/15 min) | RPC (req/min) |
|------------|:-----------------:|:-----------------:|:-------------:|
| Free       | 60                | 5                 | 5             |
| Verified   | 150               | 10                | 15            |
| Premium    | 300               | 15                | 30            |
| Enterprise | 1000              | 30                | 100           |
| Admin      | 1000              | 50                | 100           |

**Headers returned on every response:**
- \`X-RateLimit-Limit\` — current limit for the active throttler
- \`X-RateLimit-Tier\` — resolved tier for the request
- \`X-RateLimit-Remaining\` — requests remaining (set on 429)
- \`X-RateLimit-Reset\` — ISO timestamp when the window resets (set on 429)
- \`Retry-After\` — seconds to wait before retrying (set on 429)

---

## Versioning

The API supports URI-based versioning (\`/api/v1/...\` and \`/api/v2/...\`).

> ⚠️ **v1 is deprecated** and will be sunset on **2026-09-01**. Migrate to v2.

---

## Common Error Codes

| HTTP Status | Meaning                          |
|-------------|----------------------------------|
| 400         | Bad request / validation failure |
| 401         | Missing or invalid JWT           |
| 403         | Insufficient permissions (RBAC)  |
| 404         | Resource not found               |
| 409         | Conflict (e.g. duplicate wallet) |
| 429         | Rate limit exceeded              |
| 503         | Service temporarily unavailable  |
`;

  for (const version of ['1', '2']) {
    const isDeprecated = version === '1';
    const swaggerConfig = new DocumentBuilder()
      .setTitle(`Nestera API v${version}`)
      .setDescription(
        isDeprecated
          ? `> ⚠️ **DEPRECATED** — Sunset: 2026-09-01. Migrate to v2.\n\n${rateLimitDescription}`
          : `Nestera decentralized savings & investment platform API.\n\n${rateLimitDescription}`,
      )
      .setVersion(version)
      .setContact('Nestera', 'https://nestera.io', 'support@nestera.io')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (without the "Bearer " prefix)',
        },
        'JWT',
      )
      .addServer(`http://localhost:${port || 3001}`, 'Local development')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`api/v${version}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
      customSiteTitle: `Nestera API v${version} Docs`,
    });
  }

  // Redirect /api/docs → /api/v2/docs for convenience
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/api/docs', (_req: unknown, res: { redirect: (url: string) => void }) => {
    res.redirect('/api/v2/docs');
  });

  await app.listen(port || 3001);
  const logger = app.get(Logger);
  const gracefulShutdown = app.get(GracefulShutdownService);
  gracefulShutdown.registerHttpServer(app.getHttpServer());
  logger.log(`Application is running on: http://localhost:${port}/api`);
  logger.log(`Swagger docs (current):    http://localhost:${port}/api/docs`);
  logger.log(`Swagger v2 docs:           http://localhost:${port}/api/v2/docs`);
  logger.log(
    `Swagger v1 docs (deprecated): http://localhost:${port}/api/v1/docs`,
  );

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.once(signal, () => {
      void gracefulShutdown
        .shutdownApplication(
          signal,
          () => app.close(),
          () => flushApplicationLogs(app, logger),
        )
        .then((exitCode) => {
          process.exit(exitCode);
        });
    });
  }

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Bootstrap] Application startup failed: ${message}`);
  process.exit(1);
});
