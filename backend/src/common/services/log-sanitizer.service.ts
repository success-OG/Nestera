import { Injectable } from '@nestjs/common';

/**
 * Sanitizes request/response data before logging.
 *
 * - Redacts sensitive header values (Authorization, Cookie, API keys)
 * - Redacts sensitive body fields (passwords, tokens, secrets, keys)
 * - Redacts Stellar private keys & seed phrases
 * - Truncates long values to avoid log flooding
 * - Preserves structure for debuggability
 */
@Injectable()
export class LogSanitizerService {
  private static readonly SENSITIVE_HEADERS = new Set([
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
  ]);

  private static readonly SENSITIVE_BODY_KEYS = new Set([
    'password',
    'password_confirmation',
    'currentPassword',
    'newPassword',
    'secret',
    'secretKey',
    'privateKey',
    'mnemonic',
    'seedPhrase',
    'token',
    'refreshToken',
    'accessToken',
    'apiKey',
    'api_key',
    'otp',
    'pin',
    'cvv',
    'cardNumber',
    'ssn',
    'encryptionKey',
    'twoFactorSecret',
  ]);

  /** Maximum length for logged string values */
  private static readonly MAX_VALUE_LENGTH = 500;

  sanitizeHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string | string[] | undefined> {
    const sanitized: Record<string, string | string[] | undefined> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (LogSanitizerService.SENSITIVE_HEADERS.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    if (Array.isArray(body)) return body.map((item) => this.sanitizeBody(item));

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = [...LogSanitizerService.SENSITIVE_BODY_KEYS].some(
        (k) => lowerKey.includes(k.toLowerCase()),
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        // Detect Stellar secret keys (S + 55 base32 chars)
        if (/^S[A-Z2-7]{55}$/.test(value.trim())) {
          sanitized[key] = '[STELLAR_SECRET_REDACTED]';
        } else {
          sanitized[key] =
            value.length > LogSanitizerService.MAX_VALUE_LENGTH
              ? `${value.slice(0, LogSanitizerService.MAX_VALUE_LENGTH)}...[truncated]`
              : value;
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeBody(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  sanitizeUrl(url: string): string {
    // Remove tokens from query strings
    return url.replace(
      /([?&](token|key|secret|apiKey|api_key)=)[^&]*/gi,
      '$1[REDACTED]',
    );
  }

  /** Mask wallet address to show only first 6 + last 4 chars */
  maskAddress(address: string | null | undefined): string {
    if (!address) return 'anonymous';
    if (address.length > 10) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  }
}
