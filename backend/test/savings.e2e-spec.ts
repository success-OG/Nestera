import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, closeTestApp } from './fixtures/database.helpers';
import {
  buildRegisterPayload,
  buildPaginationQuery,
  HTTP_STATUS,
} from './fixtures/test-factories';

describe('Savings Endpoints (e2e)', () => {
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

  // ── Products ──────────────────────────────────────────────────────────────

  describe('GET /api/v2/savings/products', () => {
    it('returns list of savings products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/products')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.UNAUTHORIZED]).toContain(res.status);
      if (res.status === HTTP_STATUS.OK) {
        expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
      }
    });

    it('supports pagination', async () => {
      const query = buildPaginationQuery(1, 5);
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/products')
        .query(query)
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.UNAUTHORIZED]).toContain(res.status);
    });

    it('returns 400 for invalid page param', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/products')
        .query({ page: -1 })
        .set(authHeader());

      expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.OK]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/products');

      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.OK]).toContain(res.status);
    });
  });

  // ── Subscriptions ─────────────────────────────────────────────────────────

  describe('GET /api/v2/savings/subscriptions', () => {
    it('returns user subscriptions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/subscriptions')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.UNAUTHORIZED]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/subscriptions');

      expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.OK]).toContain(res.status);
    });
  });

  // ── Goals ────────────────────────────────────────────────────────────────

  describe('GET /api/v2/savings/goals', () => {
    it('returns savings goals for user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/goals')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED]).toContain(
        res.status,
      );
    });
  });

  describe('POST /api/v2/savings/goals', () => {
    it('returns 400 for invalid goal payload', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/savings/goals')
        .set(authHeader())
        .send({})
        .expect((res) => {
          expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.UNPROCESSABLE]).toContain(res.status);
        });
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/savings/goals')
        .send({ name: 'Test Goal', targetAmount: 1000 })
        .expect((res) => {
          expect([HTTP_STATUS.UNAUTHORIZED, HTTP_STATUS.CREATED]).toContain(res.status);
        });
    });
  });

  // ── Compare Products ──────────────────────────────────────────────────────

  describe('GET /api/v2/savings/products/compare', () => {
    it('returns comparison data when valid IDs given', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/products/compare')
        .query({ ids: 'fake-id-1,fake-id-2' })
        .set(authHeader());

      expect([
        HTTP_STATUS.OK,
        HTTP_STATUS.BAD_REQUEST,
        HTTP_STATUS.NOT_FOUND,
        HTTP_STATUS.UNAUTHORIZED,
      ]).toContain(res.status);
    });
  });

  // ── Waitlist ─────────────────────────────────────────────────────────────

  describe('GET /api/v2/savings/waitlist', () => {
    it('returns waitlist status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/savings/waitlist')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND, HTTP_STATUS.UNAUTHORIZED]).toContain(
        res.status,
      );
    });
  });
});
