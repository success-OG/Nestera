import { SetMetadata } from '@nestjs/common';

export const AUTH_RATE_LIMIT_KEY = 'auth_rate_limit';

export interface AuthRateLimitConfig {
  limit: number; // Max requests
  ttl: number; // Time window in milliseconds
  blockDuration?: number; // How long to block after limit exceeded
}

/**
 * Decorator to apply strict rate limiting to authentication endpoints
 *
 * @param config Rate limit configuration
 *
 * @example
 * @AuthRateLimit({ limit: 3, ttl: 3600000 }) // 3 per hour
 * async register() { ... }
 */
export const AuthRateLimit = (config: AuthRateLimitConfig) =>
  SetMetadata(AUTH_RATE_LIMIT_KEY, config);
