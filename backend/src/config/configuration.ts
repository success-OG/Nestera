export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    // URL-based connection (takes precedence when provided)
    url: process.env.DATABASE_URL,
    // Host-based connection (used when DATABASE_URL is absent)
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    pool: {
      max: parseInt(
        process.env.DATABASE_POOL_MAX ||
          (process.env.NODE_ENV === 'production' ? '30' : '10'),
        10,
      ),
      min: parseInt(
        process.env.DATABASE_POOL_MIN ||
          (process.env.NODE_ENV === 'production' ? '5' : '2'),
        10,
      ),
      maxCeiling: parseInt(process.env.DATABASE_POOL_MAX_CEILING || '50', 10),
      idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
      connectionTimeout: parseInt(
        process.env.DATABASE_CONNECTION_TIMEOUT || '2000',
        10,
      ),
      statementTimeout: parseInt(
        process.env.DATABASE_STATEMENT_TIMEOUT || '30000',
        10,
      ),
      queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10),
      monitorIntervalMs: parseInt(
        process.env.DATABASE_POOL_MONITOR_INTERVAL || '30000',
        10,
      ),
      scaleUpThreshold: parseInt(
        process.env.DATABASE_POOL_SCALE_UP_THRESHOLD || '80',
        10,
      ),
      scaleDownThreshold: parseInt(
        process.env.DATABASE_POOL_SCALE_DOWN_THRESHOLD || '30',
        10,
      ),
      exhaustionWaitingThreshold: parseInt(
        process.env.DATABASE_POOL_EXHAUSTION_WAITING_THRESHOLD || '1',
        10,
      ),
      leakDetectionThreshold: parseInt(
        process.env.DATABASE_POOL_LEAK_THRESHOLD || '90',
        10,
      ),
      allowExitOnIdle: process.env.DATABASE_POOL_ALLOW_EXIT_ON_IDLE === 'true',
      autoScale: process.env.DATABASE_POOL_AUTO_SCALE !== 'false',
    },
    retry: {
      maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5', 10),
      initialDelayMs: parseInt(process.env.DB_RETRY_INITIAL_DELAY || '500', 10),
      maxDelayMs: parseInt(process.env.DB_RETRY_MAX_DELAY || '30000', 10),
      backoffMultiplier: parseFloat(process.env.DB_RETRY_BACKOFF || '2.0'),
      jitterMs: parseInt(process.env.DB_RETRY_JITTER || '100', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION,
  },
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    rpcUrl: process.env.SOROBAN_RPC_URL,
    horizonUrl: process.env.HORIZON_URL,
    // Fallback RPC URLs (comma-separated, in priority order)
    rpcFallbackUrls: (process.env.SOROBAN_RPC_FALLBACK_URLS || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
    // Fallback Horizon URLs (comma-separated, in priority order)
    horizonFallbackUrls: (process.env.HORIZON_FALLBACK_URLS || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
    contractId: process.env.CONTRACT_ID,
    webhookSecret: process.env.STELLAR_WEBHOOK_SECRET,
    eventPollInterval: parseInt(
      process.env.STELLAR_EVENT_POLL_INTERVAL || '10000',
      10,
    ),
    // Retry configuration
    rpcMaxRetries: parseInt(process.env.RPC_MAX_RETRIES || '3', 10),
    rpcRetryDelay: parseInt(process.env.RPC_RETRY_DELAY || '1000', 10),
    rpcTimeout: parseInt(process.env.RPC_TIMEOUT || '10000', 10),
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || '"Nestera" <noreply@nestera.io>',
  },
  kyc: {
    providerBaseUrl: process.env.KYC_PROVIDER_BASE_URL,
    providerApiKey: process.env.KYC_PROVIDER_API_KEY,
    piiEncryptionKey: process.env.KYC_PII_ENCRYPTION_KEY,
  },
  backup: {
    s3Bucket: process.env.BACKUP_S3_BUCKET,
    s3Region: process.env.BACKUP_S3_REGION ?? 'us-east-1',
    awsAccessKeyId: process.env.BACKUP_AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.BACKUP_AWS_SECRET_ACCESS_KEY,
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY, // 64 hex chars = 32 bytes
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS ?? '30', 10),
    tmpDir: process.env.BACKUP_TMP_DIR ?? '/tmp',
  },
  hospital: {
    endpoints: {
      // Hospital endpoints from environment variables
      // Format: HOSPITAL_<ID>_ENDPOINT
      ...(process.env.HOSPITAL_1_ENDPOINT && {
        'hospital-1': process.env.HOSPITAL_1_ENDPOINT,
      }),
      ...(process.env.HOSPITAL_2_ENDPOINT && {
        'hospital-2': process.env.HOSPITAL_2_ENDPOINT,
      }),
      ...(process.env.HOSPITAL_3_ENDPOINT && {
        'hospital-3': process.env.HOSPITAL_3_ENDPOINT,
      }),
    },
    maxRetries: parseInt(process.env.HOSPITAL_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.HOSPITAL_RETRY_DELAY || '1000', 10),
    requestTimeout: parseInt(
      process.env.HOSPITAL_REQUEST_TIMEOUT || '10000',
      10,
    ),
    circuitBreakerThreshold: parseInt(
      process.env.HOSPITAL_CIRCUIT_BREAKER_THRESHOLD || '5',
      10,
    ),
    circuitBreakerTimeout: parseInt(
      process.env.HOSPITAL_CIRCUIT_BREAKER_TIMEOUT || '60000',
      10,
    ),
  },
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    methods: (
      process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
    )
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean),
    allowedHeaders: (
      process.env.CORS_ALLOWED_HEADERS || 'Content-Type,Authorization,Accept'
    )
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean),
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10),
  },
  balanceSync: {
    cacheTtlSeconds: parseInt(
      process.env.BALANCE_CACHE_TTL_SECONDS || '300',
      10,
    ),
    pollIntervalMs: parseInt(
      process.env.BALANCE_POLL_INTERVAL_MS || '5000',
      10,
    ),
    reconnectInitialDelayMs: parseInt(
      process.env.BALANCE_RECONNECT_INIT_MS || '1000',
      10,
    ),
    reconnectMaxDelayMs: parseInt(
      process.env.BALANCE_RECONNECT_MAX_MS || '60000',
      10,
    ),
    metricsPersistIntervalMs: parseInt(
      process.env.BALANCE_METRICS_PERSIST_MS || '60000',
      10,
    ),
  },
});
