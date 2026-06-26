import configuration from '../configuration';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default CORS config when env vars are not set', () => {
    delete process.env.CORS_ENABLED;
    delete process.env.CORS_ORIGINS;
    delete process.env.CORS_METHODS;
    delete process.env.CORS_ALLOWED_HEADERS;
    delete process.env.CORS_CREDENTIALS;
    delete process.env.CORS_MAX_AGE;

    const config = configuration();
    expect(config.cors.enabled).toBe(true);
    expect(config.cors.origins).toEqual(['http://localhost:3000']);
    expect(config.cors.methods).toEqual([
      'GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS',
    ]);
    expect(config.cors.allowedHeaders).toEqual([
      'Content-Type', 'Authorization', 'Accept',
    ]);
    expect(config.cors.credentials).toBe(true);
    expect(config.cors.maxAge).toBe(86400);
  });

  it('should parse comma-separated CORS_ORIGINS', () => {
    process.env.CORS_ORIGINS = 'https://app.nestera.io,https://admin.nestera.io';

    const config = configuration();
    expect(config.cors.origins).toEqual([
      'https://app.nestera.io',
      'https://admin.nestera.io',
    ]);
  });

  it('should disable CORS when CORS_ENABLED is set to false string', () => {
    process.env.CORS_ENABLED = String(false);

    const config = configuration();
    expect(config.cors.enabled).toBe(false);
  });

  it('should parse custom CORS_METHODS', () => {
    process.env.CORS_METHODS = 'GET,POST,OPTIONS';

    const config = configuration();
    expect(config.cors.methods).toEqual(['GET', 'POST', 'OPTIONS']);
  });

  it('should parse custom CORS_ALLOWED_HEADERS', () => {
    process.env.CORS_ALLOWED_HEADERS = 'Content-Type,Authorization,X-Custom-Header';

    const config = configuration();
    expect(config.cors.allowedHeaders).toEqual([
      'Content-Type',
      'Authorization',
      'X-Custom-Header',
    ]);
  });

  it('should parse CORS_MAX_AGE as integer', () => {
    process.env.CORS_MAX_AGE = '3600';

    const config = configuration();
    expect(config.cors.maxAge).toBe(3600);
  });

  it('should trim whitespace from origins', () => {
    process.env.CORS_ORIGINS = ' https://app.nestera.io , https://admin.nestera.io ';

    const config = configuration();
    expect(config.cors.origins).toEqual([
      'https://app.nestera.io',
      'https://admin.nestera.io',
    ]);
  });

  it('should filter empty origins from comma-separated list', () => {
    process.env.CORS_ORIGINS = 'https://app.nestera.io,,,https://admin.nestera.io';

    const config = configuration();
    expect(config.cors.origins).toEqual([
      'https://app.nestera.io',
      'https://admin.nestera.io',
    ]);
  });
});
