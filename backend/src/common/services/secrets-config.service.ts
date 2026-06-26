import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SecretDefinition {
  key: string;
  envVar: string;
  required: boolean;
  description: string;
}

const SECRET_DEFINITIONS: SecretDefinition[] = [
  {
    key: 'jwt.secret',
    envVar: 'JWT_SECRET',
    required: true,
    description: 'JWT signing secret (min 10 chars)',
  },
  {
    key: 'jwt.expiration',
    envVar: 'JWT_EXPIRATION',
    required: true,
    description: 'JWT token expiration (e.g. 1h, 7d)',
  },
  {
    key: 'stellar.webhookSecret',
    envVar: 'STELLAR_WEBHOOK_SECRET',
    required: true,
    description: 'Stellar webhook HMAC secret (min 16 chars)',
  },
  {
    key: 'database.pass',
    envVar: 'DB_PASS',
    required: false,
    description: 'Database password',
  },
  {
    key: 'database.url',
    envVar: 'DATABASE_URL',
    required: false,
    description: 'Full database connection URL',
  },
  {
    key: 'redis.url',
    envVar: 'REDIS_URL',
    required: false,
    description: 'Redis connection URL',
  },
  {
    key: 'mail.pass',
    envVar: 'MAIL_PASS',
    required: false,
    description: 'SMTP password',
  },
  {
    key: 'kyc.providerApiKey',
    envVar: 'KYC_PROVIDER_API_KEY',
    required: false,
    description: 'KYC provider API key',
  },
  {
    key: 'kyc.piiEncryptionKey',
    envVar: 'KYC_PII_ENCRYPTION_KEY',
    required: false,
    description: 'AES key for PII encryption (min 16 chars)',
  },
  {
    key: 'backup.awsAccessKeyId',
    envVar: 'BACKUP_AWS_ACCESS_KEY_ID',
    required: false,
    description: 'AWS access key for S3 backups',
  },
  {
    key: 'backup.awsSecretAccessKey',
    envVar: 'BACKUP_AWS_SECRET_ACCESS_KEY',
    required: false,
    description: 'AWS secret key for S3 backups',
  },
  {
    key: 'backup.encryptionKey',
    envVar: 'BACKUP_ENCRYPTION_KEY',
    required: false,
    description: 'Backup encryption key (64 hex chars)',
  },
];

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /encryption[_-]?key/i,
  /access[_-]?key/i,
];

@Injectable()
export class SecretsConfigService implements OnModuleInit {
  private readonly logger = new Logger(SecretsConfigService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.validateRequiredSecrets();
  }

  get(key: string): string | undefined {
    return this.configService.get<string>(key);
  }

  getOrThrow(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Required secret "${key}" is not configured`);
    }
    return value;
  }

  private validateRequiredSecrets(): void {
    const missing: string[] = [];

    for (const def of SECRET_DEFINITIONS) {
      if (def.required) {
        const value = this.configService.get<string>(def.key);
        if (!value) {
          missing.push(`${def.envVar} — ${def.description}`);
        }
      }
    }

    if (missing.length > 0) {
      this.logger.error(
        `Missing required secrets:\n${missing.map((m) => `  - ${m}`).join('\n')}`,
      );
      throw new Error(
        `Application cannot start: ${missing.length} required secret(s) missing`,
      );
    }

    this.logger.log('All required secrets validated');
  }

  static redactValue(value: string): string {
    if (value.length <= 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }

  static isSensitiveKey(key: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  }

  static redactObject(obj: Record<string, any>): Record<string, any> {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        redacted[key] = SecretsConfigService.redactObject(value);
      } else if (
        typeof value === 'string' &&
        SecretsConfigService.isSensitiveKey(key)
      ) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  getSecretDefinitions(): Array<{
    envVar: string;
    required: boolean;
    description: string;
  }> {
    return SECRET_DEFINITIONS.map(({ envVar, required, description }) => ({
      envVar,
      required,
      description,
    }));
  }
}
