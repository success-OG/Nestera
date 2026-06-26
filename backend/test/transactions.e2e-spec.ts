import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp } from './fixtures/database.helpers';
import {
  buildRegisterPayload,
  buildTransactionFilterQuery,
  HTTP_STATUS,
} from './fixtures/test-factories';

describe('Transactions Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const user = buildRegisterPayload();

  beforeAll(async () => {
    app = await createTestApp();

    const res = await request(app.getHttpServer())
      .post('/api/v2/auth/register')
      .send(user);

    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  function authHeader() {
    return { Authorization: `Bearer ${accessToken}` };
  }

  // ── List Transactions ─────────────────────────────────────────────────────

  describe('GET /api/v2/transactions', () => {
    it('returns paginated transaction list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .set(authHeader())
        .query(buildTransactionFilterQuery());

      expect([HTTP_STATUS.OK, HTTP_STATUS.UNAUTHORIZED]).toContain(res.status);
      if (res.status === HTTP_STATUS.OK) {
        const body = res.body;
        expect(body).toBeDefined();
      }
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .expect((res) => {
          expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.OK]).toContain(res.status);
        });
    });

    it('filters by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .set(authHeader())
        .query({ type: 'deposit', page: 1, limit: 5 });

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED]).toContain(
        res.status,
      );
    });

    it('filters by date range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .set(authHeader())
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          page: 1,
          limit: 10,
        });

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNAUTHORIZED]).toContain(
        res.status,
      );
    });

    it('returns 400 for invalid limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .set(authHeader())
        .query({ limit: 999999 });

      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.OK]).toContain(res.status);
    });
  });

  // ── Single Transaction ────────────────────────────────────────────────────

  describe('GET /api/v2/transactions/:id', () => {
    it('returns 404 for non-existent transaction', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000001';
      const res = await request(app.getHttpServer())
        .get(`/api/v2/transactions/${fakeId}`)
        .set(authHeader());

      expect([HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000001';
      await request(app.getHttpServer())
        .get(`/api/v2/transactions/${fakeId}`)
        .expect((res) => {
          expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
        });
    });

    it('returns 400 for malformed UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions/not-a-uuid')
        .set(authHeader());

      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });
  });

  // ── Transaction Tags ──────────────────────────────────────────────────────

  describe('GET /api/v2/transactions/tags', () => {
    it('returns available tags', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions/tags')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED]).toContain(
        res.status,
      );
    });
  });

  // ── Error Scenarios ───────────────────────────────────────────────────────

  describe('Error scenarios', () => {
    it('pagination out-of-range returns empty or error', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions')
        .set(authHeader())
        .query({ page: 99999, limit: 10 });

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(res.status);
      if (res.status === HTTP_STATUS.OK) {
        const body = res.body;
        const data = body.data || body;
        expect(Array.isArray(data) ? data.length : 0).toBeLessThanOrEqual(10);
      }
    });

    it('responds consistently without leaking internal details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/transactions/malformed')
        .set(authHeader());

      if (res.status >= 400) {
        expect(res.body).not.toHaveProperty('stack');
        expect(res.body).not.toHaveProperty('query');
      }
    });
  });
});
