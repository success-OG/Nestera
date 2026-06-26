import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SecretMetadata {
  key: string;
  createdAt: number;
  expiresAt?: number;
  rotatedAt?: number;
}

@Injectable()
export class SecretsManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SecretsManagerService.name);
  private readonly secretsCache: Map<string, string> = new Map();
  private readonly secretsMetadata: Map<string, SecretMetadata> = new Map();
  private readonly SECRET_EXPIRY_DAYS = 90;
  private expirationMonitor: NodeJS.Timeout | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeSecrets();
    this.startExpirationMonitor();
  }

  onModuleDestroy() {
    if (this.expirationMonitor) {
      clearInterval(this.expirationMonitor);
      this.expirationMonitor = null;
    }
  }

  private initializeSecrets() {
    const sensitiveKeys = [
      'JWT_SECRET',
      'DATABASE_URL',
      'DB_PASS',
      'REDIS_URL',
      'MAIL_PASS',
      'KYC_PROVIDER_API_KEY',
      'KYC_PII_ENCRYPTION_KEY',
      'BACKUP_AWS_SECRET_ACCESS_KEY',
      'BACKUP_ENCRYPTION_KEY',
      'STELLAR_WEBHOOK_SECRET',
    ];

    for (const key of sensitiveKeys) {
      const value = this.configService.get<string>(key);
      if (value) {
        this.secretsCache.set(key, value);
        this.secretsMetadata.set(key, {
          key,
          createdAt: Date.now(),
          expiresAt: Date.now() + this.SECRET_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        });
      }
    }

    this.logger.log('Secrets initialized from environment');
  }

  getSecret(key: string): string | undefined {
    return this.secretsCache.get(key) || this.configService.get<string>(key);
  }

  setSecret(key: string, value: string, expiresAt?: number) {
    this.secretsCache.set(key, value);
    this.secretsMetadata.set(key, {
      key,
      createdAt: Date.now(),
      expiresAt: expiresAt || Date.now() + this.SECRET_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      rotatedAt: Date.now(),
    });
    this.logger.log(`Secret ${key} updated`);
  }

  rotateSecret(key: string, newValue: string) {
    this.setSecret(key, newValue);
    this.logger.log(`Secret ${key} rotated`);
  }

  getExpiringSecrets(daysUntilExpiry: number = 30): SecretMetadata[] {
    const now = Date.now();
    const threshold = now + daysUntilExpiry * 24 * 60 * 60 * 1000;
    const expiring: SecretMetadata[] = [];

    for (const metadata of this.secretsMetadata.values()) {
      if (metadata.expiresAt && metadata.expiresAt <= threshold) {
        expiring.push(metadata);
      }
    }

    return expiring;
  }

  private startExpirationMonitor() {
    this.expirationMonitor = setInterval(() => {
      const expiring = this.getExpiringSecrets(30);
      if (expiring.length > 0) {
        this.logger.warn(`Found ${expiring.length} expiring secrets: ${expiring.map(s => s.key).join(', ')}`);
      }
    }, 24 * 60 * 60 * 1000);
  }
}
