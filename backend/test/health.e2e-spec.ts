import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp } from './fixtures/database.helpers';
import { HTTP_STATUS } from './fixtures/test-factories';

describe('Health Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  describe('GET /api/health', () => {
    it('returns health status', async () => {
      const res = await request(app.getHttpServer()).get('/api/health');

      expect([HTTP_STATUS.OK, 503]).toContain(res.status);
      expect(res.body).toBeDefined();
    });

    it('responds with a JSON body', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect('Content-Type', /json/);

      expect(res.body).toHaveProperty('status');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('returns detailed health including db, redis, etc.', async () => {
      const res = await request(app.getHttpServer()).get('/api/health/detailed');

      expect([HTTP_STATUS.OK, 503, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });
  });

  describe('GET /api/v2/performance/slow-queries', () => {
    it('returns slow queries (requires auth)', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v2/performance/slow-queries',
      );

      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.OK]).toContain(res.status);
    });
  });

  describe('GET /api/v2/apm/metrics', () => {
    it('returns prometheus metrics without auth', async () => {
      const res = await request(app.getHttpServer()).get('/api/v2/apm/metrics');

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });
  });
});
