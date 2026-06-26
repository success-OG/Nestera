# Error Handling System

## Overview

The Nestera API implements a standardized error response format across all endpoints, providing:

- **Consistent error structure** with machine-readable error codes
- **Request correlation IDs** for distributed tracing
- **Detailed validation errors** with field-level information
- **Environment-aware debugging** (stack traces in development only)
- **Backward compatibility** with existing error responses

## Error Response Format

All errors return a JSON response with the following structure:

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VAL_001",
  "message": "Validation failed. Please check your input.",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v2/goals",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "errors": [
    {
      "field": "goalName",
      "value": "",
      "constraints": {
        "isNotEmpty": "goalName should not be empty"
      }
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for errors |
| `statusCode` | number | HTTP status code (400, 401, 500, etc.) |
| `errorCode` | string | Machine-readable error code (e.g., `AUTH_001`, `VAL_001`) |
| `message` | string | Human-readable error message |
| `timestamp` | string | ISO 8601 timestamp of when the error occurred |
| `path` | string | Request path that caused the error |
| `correlationId` | string | UUID for tracing requests across services |
| `errors` | array | **Optional** - Validation errors with field details |
| `debugContext` | object | **Optional** - Debug info (development/test only) |

## Error Codes

Error codes follow the pattern `CATEGORY_NNN` where:
- **CATEGORY**: 2-6 uppercase letters indicating error type
- **NNN**: Zero-padded 3-digit number

### Error Categories

| Category | Description | HTTP Status Range |
|----------|-------------|-------------------|
| **AUTH** | Authentication errors | 401 |
| **AUTHZ** | Authorization errors | 403 |
| **VAL** | Validation errors | 400 |
| **DB** | Database errors | 409, 503 |
| **RPC** | Blockchain RPC errors | 503, 504 |
| **RATE** | Rate limiting errors | 429 |
| **SYS** | System/HTTP errors | 400-599 |

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_001` | 401 | Authentication required |
| `AUTH_002` | 401 | Invalid or expired token |
| `AUTHZ_001` | 403 | Insufficient permissions |
| `VAL_001` | 400 | Validation failed |
| `DB_001` | 503 | Database connection unavailable |
| `DB_002` | 503 | Database query timed out |
| `DB_003` | 409 | Resource already exists (unique constraint) |
| `DB_004` | 409 | Related resource not found (foreign key) |
| `RPC_001` | 504 | Soroban RPC timeout |
| `RPC_002` | 503 | All RPC endpoints unavailable |
| `RPC_003` | 400 | Contract execution failed |
| `RPC_004` | 400 | Transaction submission failed |
| `RATE_001` | 429 | Rate limit exceeded |
| `SYS_400` | 400 | Bad request |
| `SYS_404` | 404 | Resource not found |
| `SYS_409` | 409 | Resource conflict |
| `SYS_500` | 500 | Internal server error |

For a complete list of error codes, run:
```bash
npm run generate:error-docs
```

## Using Custom Application Errors

To throw custom errors with specific error codes in your application:

```typescript
import { ApplicationException } from '../common/exceptions/application.exception';

// Throw with registered error code
throw new ApplicationException('AUTH_001');

// Throw with custom message
throw new ApplicationException('VAL_001', 'Custom validation message');

// Throw with HTTP status override
throw new ApplicationException('CUSTOM_001', 500);

// Add context for debugging (appears in debugContext)
throw new ApplicationException('DB_003', 'User already exists')
  .withContext('email', user.email)
  .withContext('attemptedAt', new Date());
```

## Request Correlation

Every error response includes a `correlationId` (UUID v4) that can be used to:

1. **Trace requests** across microservices
2. **Search logs** for related entries
3. **Debug issues** by providing the correlation ID to support

### Using Correlation IDs

**Client-side**: Include correlation ID in error reports
```javascript
try {
  await api.createGoal(goalData);
} catch (error) {
  console.error(`Error (ID: ${error.correlationId}):`, error.message);
  // Send correlation ID to support/error tracking
}
```

**Server-side logs**: Search for correlation ID
```bash
grep "550e8400-e29b-41d4-a716-446655440000" application.log
```

## Validation Errors

Validation errors include detailed field-level information:

```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VAL_001",
  "message": "Validation failed. Please check your input.",
  "errors": [
    {
      "field": "email",
      "value": "invalid-email",
      "constraints": {
        "isEmail": "email must be a valid email address"
      }
    },
    {
      "field": "address.city",
      "value": "",
      "constraints": {
        "isNotEmpty": "city should not be empty"
      }
    }
  ]
}
```

### Field Naming

- **Top-level fields**: `"field": "email"`
- **Nested fields**: `"field": "address.city"` (dot notation)

## Debug Context (Development Only)

In development and test environments, errors include additional debugging information:

```json
{
  "debugContext": {
    "exception": "BadRequestException",
    "stackTrace": "Error: Validation failed\n    at ...",
    "originalMessage": "Internal error message",
    "requestDetails": {
      "method": "POST",
      "headers": { ... },
      "body": { ... },
      "query": { ... }
    }
  }
}
```

**Security Note**: `debugContext` is **never included in production** to prevent information disclosure.

## Error Code Registry

Error codes are defined in `src/common/config/error-codes.json`:

```json
{
  "errorCodes": [
    {
      "code": "AUTH_001",
      "httpStatus": 401,
      "defaultMessage": "Authentication required. Please provide valid credentials.",
      "localizationKey": "AUTH_001",
      "category": "AUTH",
      "description": "User must authenticate before accessing resource"
    }
  ]
}
```

### Adding New Error Codes

1. Edit `src/common/config/error-codes.json`
2. Add your error code following the pattern
3. Regenerate documentation: `npm run generate:error-docs`
4. Restart the application to load new codes

### Registering Error Codes Programmatically

```typescript
import { ErrorCodeRegistry } from '../common/services/error-code-registry.service';

const registry = new ErrorCodeRegistry();

registry.register({
  code: 'CUSTOM_001',
  httpStatus: 400,
  defaultMessage: 'Custom error message',
  localizationKey: 'CUSTOM_001',
  category: ErrorCategory.SYS,
  description: 'Description for documentation',
});
```

## Generating Documentation

Generate error code documentation in Markdown and JSON formats:

```bash
npm run generate:error-docs
```

Output files:
- `docs/ERROR_CODES.md` - Human-readable documentation
- `docs/error-codes.json` - Machine-readable catalog

## Migration from Old Error Format

The new error format is **backward compatible** with existing error responses:

### Old Format (Still Supported)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v2/goals"
}
```

### New Format (Enhanced)
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VAL_001",  // NEW
  "message": "Validation failed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v2/goals",
  "correlationId": "uuid"  // NEW
}
```

**Migration Path**: Clients can safely ignore new fields and continue using existing fields.

## Testing Error Handling

Example test for error responses:

```typescript
describe('Error Handling', () => {
  it('should return standardized validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v2/goals')
      .send({ goalName: '' })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      statusCode: 400,
      errorCode: 'VAL_001',
      message: expect.any(String),
      timestamp: expect.any(String),
      path: '/api/v2/goals',
      correlationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: 'goalName',
          constraints: expect.any(Object),
        }),
      ]),
    });
  });
});
```

## Best Practices

1. **Use correlation IDs**: Always log correlation IDs for easier debugging
2. **Handle specific error codes**: Check `errorCode` instead of parsing `message`
3. **Display field-level errors**: Use `errors` array for form validation feedback
4. **Don't expose internal details**: Sensitive information is automatically sanitized
5. **Test error scenarios**: Write tests for both success and error cases

## FAQs

**Q: Can I use custom error messages?**  
A: Yes, throw `ApplicationException` with a custom message or override the message in the registry.

**Q: How do I add localization?**  
A: Currently, error messages are in English. Localization support can be added by integrating nestjs-i18n.

**Q: Are stack traces exposed in production?**  
A: No, stack traces and debug context are automatically excluded in production environments.

**Q: Can I change error codes without breaking clients?**  
A: Error codes should be stable. Add new codes instead of changing existing ones. Use semver for breaking changes.

**Q: How do I test the error filter?**  
A: See the testing section above for example tests. Use property-based testing for comprehensive coverage.

## Related Documentation

- [API Reference](./API.md)
- [Correlation ID System](./CORRELATION_IDS.md)
- [Rate Limiting](../README.md#rate-limits)
- [Error Codes Reference](./ERROR_CODES.md) (generated)
