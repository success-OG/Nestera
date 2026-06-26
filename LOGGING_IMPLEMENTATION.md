# Comprehensive Request/Response Logging Implementation

## Overview

Nest.js backend now has production-grade request/response logging with:
- **Correlation IDs** — unique ID per request for distributed tracing
- **Structured logging** — JSON logs via Pino for machine parsing
- **Sensitive data sanitization** — automatic redaction of secrets, passwords, tokens
- **Performance tracking** — request duration logged on every response
- **APM integration ready** — correlation IDs forwarded to Sentry/DataDog/etc.
- **Log retention** — configurable via pino transports (file, S3, CloudWatch, etc.)

## Components

### 1. Correlation ID Middleware
**File**: `src/common/middleware/correlation-id.middleware.ts`

- Runs first on every request
- Generates or accepts `X-Correlation-ID` from client headers
- Attaches to `req.correlationId` for downstream use
- Echoes back in response headers for client tracing
- Records request start time for duration calculation

**Client Usage**:
```bash
curl -H "X-Correlation-ID: abc123" http://localhost:3001/api/health
# Response includes: X-Correlation-ID: abc123
```

### 2. Correlation ID Interceptor
**File**: `src/common/interceptors/correlation-id.interceptor.ts`

- Safety net to ensure ID exists even if middleware is bypassed
- Augments pino logger context so correlation ID appears in all logs

### 3. Request Logging Interceptor
**File**: `src/common/interceptors/request-logging.interceptor.ts`

- Logs incoming request: method, URL, IP, user agent, user ID, wallet address (masked)
- Logs outgoing response: status code, duration, content length
- Logs errors: stack trace (server errors only), error name, message
- Skips noisy paths: `/api/health`, `/api/metrics`, `/favicon.ico`
- Uses pino for structured JSON logs

**Log Format**:
```json
{
  "msg": "→ POST /api/v2/auth/login",
  "type": "REQUEST",
  "correlationId": "a1b2c3d4-...",
  "method": "POST",
  "url": "/api/v2/auth/login",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-06-02T10:15:30.123Z"
}
```

```json
{
  "msg": "← POST /api/v2/auth/login 200 (145ms)",
  "type": "RESPONSE",
  "correlationId": "a1b2c3d4-...",
  "method": "POST",
  "url": "/api/v2/auth/login",
  "statusCode": 200,
  "duration": 145,
  "userId": "user_123",
  "timestamp": "2026-06-02T10:15:30.268Z"
}
```

### 4. Log Sanitizer Service
**File**: `src/common/services/log-sanitizer.service.ts`

**Automatically redacts**:
- Headers: `Authorization`, `Cookie`, `Set-Cookie`, `X-API-Key`, `Proxy-Authorization`
- Body fields: `password`, `secret`, `token`, `privateKey`, `mnemonic`, `seedPhrase`, `apiKey`, `otp`, `pin`, `cvv`, `ssn`
- Stellar secret keys: Detects `S[A-Z2-7]{55}` pattern → `[STELLAR_SECRET_REDACTED]`
- Long values: Truncates to 500 chars → `...[truncated]`
- Wallet addresses: Masks to `GABCDE...XY01` (first 6 + last 4)

**Methods**:
- `sanitizeHeaders(headers)` — redact sensitive headers
- `sanitizeBody(body)` — deep redact sensitive fields
- `sanitizeUrl(url)` — remove tokens from query strings
- `maskAddress(address)` — privacy-safe address logging

### 5. Pino Configuration
**File**: `src/app.module.ts` (`LoggerModule.forRootAsync`)

**Features**:
- **Correlation ID injection** — every log line includes `correlationId` via `customProps`
- **Redaction** — auto-redacts `req.headers.authorization`, `req.body.password`, etc.
- **Serializers** — structured req/res/err objects
- **Pretty printing in dev** — `pino-pretty` with custom format: `[{correlationId}] {msg}`
- **JSON logs in production** — machine-parsable for log aggregation

### 6. HTTP Exception Filter
**File**: `src/common/filters/http-exception.filter.ts`

Now includes `correlationId` in all error responses:

```json
{
  "success": false,
  "statusCode": 404,
  "correlationId": "a1b2c3d4-...",
  "timestamp": "2026-06-02T10:15:30.456Z",
  "path": "/api/v2/users/999",
  "message": "User not found"
}
```

## Distributed Tracing

**Propagating Correlation IDs Across Services**:

When making HTTP calls to other services (e.g., Horizon, Soroban RPC, internal microservices), forward the correlation ID:

```typescript
import { Request } from 'express';

@Injectable()
export class MyService {
  async callExternalApi(request: Request) {
    const correlationId = (request as any).correlationId;

    const response = await fetch('https://external-api.com/data', {
      headers: {
        'X-Correlation-ID': correlationId,
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}
```

**APM Integration** (Sentry, DataDog, New Relic):

Correlation IDs are automatically included in all pino logs. Configure your log shipper (Fluentd, Logstash, CloudWatch Logs, etc.) to parse `correlationId` and send to your APM:

```yaml
# Example: Fluentd config to forward logs to DataDog
<source>
  @type tail
  path /var/log/nestera-api.log
  format json
  tag nestera.api
</source>

<match nestera.api>
  @type datadog
  api_key YOUR_DATADOG_API_KEY
  service nestera-api
  dd_source nestjs
  dd_tags env:production,service:api
</match>
```

## Log Retention

Pino supports multiple transports for log shipping:

### Option 1: File Rotation (Local)
```bash
npm install pino-roll
```

Update `app.module.ts`:
```typescript
transport: {
  target: 'pino-roll',
  options: {
    file: '/var/log/nestera-api.log',
    frequency: 'daily',
    mkdir: true,
    size: '100m', // Rotate when file reaches 100MB
  },
},
```

### Option 2: AWS CloudWatch
```bash
npm install pino-cloudwatch
```

```typescript
transport: {
  target: 'pino-cloudwatch',
  options: {
    logGroupName: '/aws/lambda/nestera-api',
    logStreamName: 'production',
    awsRegion: 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
},
```

### Option 3: Fluentd/Logstash (Production Standard)

Configure pino to write JSON to stdout, then ship via Fluentd/Logstash to:
- **ElasticSearch** (ELK stack)
- **Splunk**
- **DataDog**
- **New Relic**
- **Sumo Logic**

No pino config change needed — just pipe stdout to your log shipper.

### Option 4: S3 Archival

Use `pino-s3` for long-term archival:
```bash
npm install pino-s3
```

```typescript
transport: {
  target: 'pino-s3',
  options: {
    bucket: 'nestera-logs',
    region: 'us-east-1',
    prefix: 'api-logs/',
  },
},
```

## Environment Variables

Add to `.env`:

```bash
# Logging Configuration
LOG_LEVEL=info                    # debug | info | warn | error
LOG_RETENTION_DAYS=30             # For file-based rotation
LOG_CLOUDWATCH_GROUP=/aws/nestera/api  # For CloudWatch
LOG_S3_BUCKET=nestera-logs        # For S3 archival

# APM Integration
SENTRY_DSN=https://...            # Error tracking
DATADOG_API_KEY=...               # APM/metrics
NEW_RELIC_LICENSE_KEY=...         # APM
```

## Usage in Code

### Access Correlation ID in Services

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class MyService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  async doSomething() {
    const correlationId = (this.request as any).correlationId;
    console.log(`[${correlationId}] Processing request...`);
  }
}
```

### Log with Pino

```typescript
import { Logger } from 'nestjs-pino';

@Injectable()
export class MyService {
  constructor(private readonly logger: Logger) {}

  async processPayment(amount: number) {
    this.logger.log({
      msg: 'Processing payment',
      amount,
      currency: 'USD',
    });

    // correlationId is automatically added by pino
  }
}
```

### Sanitize Before Logging

```typescript
import { LogSanitizerService } from './common/services/log-sanitizer.service';

@Injectable()
export class MyService {
  constructor(private readonly sanitizer: LogSanitizerService) {}

  logUserData(user: any) {
    const sanitized = this.sanitizer.sanitizeBody(user);
    console.log('User data:', sanitized);
    // password, secret, privateKey are [REDACTED]
  }
}
```

## Testing

**Check Correlation ID Propagation**:
```bash
curl -i -H "X-Correlation-ID: test123" http://localhost:3001/api/health
# Response should include: x-correlation-id: test123
```

**Check Logs**:
```bash
# Dev mode (pretty printed)
npm run start:dev

# Logs show:
# [test123] → GET /api/health
# [test123] ← GET /api/health 200 (5ms)
```

**Production Logs** (JSON):
```bash
NODE_ENV=production npm start
# {"level":30,"correlationId":"test123","msg":"→ GET /api/health",...}
```

## Migration Notes

**Existing interceptors updated:**
- `RequestLoggingInterceptor` — now uses pino + sanitizer
- `CorrelationIdInterceptor` — simplified (middleware does heavy lifting)

**New components:**
- `LogSanitizerService` — sensitive data redaction
- `CorrelationIdMiddleware` — upgraded to set start time

**Breaking changes**: None — all changes are additive or internal improvements.

## Performance Impact

- **Negligible** — correlation ID generation is ~1μs
- Log sanitization only runs if `LogSanitizerService` is injected
- Pino is one of the fastest Node.js loggers (benchmarked)
- Health check paths skipped from verbose logging

## Security

✅ **Passwords never logged** — redacted automatically  
✅ **Stellar secret keys never logged** — detected & redacted  
✅ **Authorization headers redacted** — JWT tokens not exposed  
✅ **Query string tokens redacted** — `?token=xyz` → `?token=[REDACTED]`  
✅ **Wallet addresses masked** — only first 6 + last 4 chars  
✅ **PII compliant** — no SSN, card numbers, or sensitive fields logged

## Troubleshooting

**Correlation ID missing in logs?**
- Check middleware is registered: `app.configure()` in `app.module.ts`
- Verify pino `customProps` config includes `correlationId`

**Sensitive data still appearing?**
- Check `LogSanitizerService` is registered in `CommonModule`
- Add new sensitive fields to `SENSITIVE_BODY_KEYS` set

**Logs not shipping to APM?**
- Verify pino transport config matches APM requirements
- Check environment variables (API keys, region, etc.)
- Test with `console.log` to ensure stdout is captured

## Future Enhancements

- Add request/response size tracking
- Implement log sampling for high-traffic endpoints
- Add trace ID for multi-hop distributed tracing (OpenTelemetry)
- Integrate with Jaeger/Zipkin for full trace visualization
- Add performance budgets (alert if p95 > threshold)
