import { SecretsConfigService } from './secrets-config.service';

describe('SecretsConfigService', () => {
  describe('redactValue', () => {
    it('should fully redact short values', () => {
      expect(SecretsConfigService.redactValue('abc')).toBe('****');
      expect(SecretsConfigService.redactValue('12345678')).toBe('****');
    });

    it('should partially redact longer values', () => {
      const result = SecretsConfigService.redactValue('my-super-secret-key');
      expect(result).toBe('my-s****-key');
      expect(result).not.toContain('super-secret');
    });
  });

  describe('isSensitiveKey', () => {
    it('should detect sensitive keys', () => {
      expect(SecretsConfigService.isSensitiveKey('password')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('JWT_SECRET')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('api_key')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('apiKey')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('Authorization')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('access_key')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('encryption_key')).toBe(true);
      expect(SecretsConfigService.isSensitiveKey('private_key')).toBe(true);
    });

    it('should not flag non-sensitive keys', () => {
      expect(SecretsConfigService.isSensitiveKey('username')).toBe(false);
      expect(SecretsConfigService.isSensitiveKey('email')).toBe(false);
      expect(SecretsConfigService.isSensitiveKey('port')).toBe(false);
      expect(SecretsConfigService.isSensitiveKey('host')).toBe(false);
    });
  });

  describe('redactObject', () => {
    it('should redact sensitive fields in an object', () => {
      const input = {
        host: 'localhost',
        port: 5432,
        password: 'supersecret',
        jwt_secret: 'mysecret123',
        nested: {
          api_key: 'key-value',
          name: 'test',
        },
      };

      const result = SecretsConfigService.redactObject(input);

      expect(result.host).toBe('localhost');
      expect(result.port).toBe(5432);
      expect(result.password).toBe('[REDACTED]');
      expect(result.jwt_secret).toBe('[REDACTED]');
      expect(result.nested.api_key).toBe('[REDACTED]');
      expect(result.nested.name).toBe('test');
    });

    it('should handle empty objects', () => {
      expect(SecretsConfigService.redactObject({})).toEqual({});
    });
  });
});
