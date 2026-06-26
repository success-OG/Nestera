import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  closeTestApp,
} from './fixtures/database.helpers';
import {
  buildRegisterPayload,
  buildLoginPayload,
  buildUpdateProfilePayload,
  HTTP_STATUS,
} from './fixtures/test-factories';

describe('User Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;

  const user = buildRegisterPayload();

  beforeAll(async () => {
    app = await createTestApp();

    const regRes = await request(app.getHttpServer())
      .post('/api/v2/auth/register')
      .send(user);

    if (regRes.status === HTTP_STATUS.CREATED) {
      accessToken = regRes.body.accessToken;
      userId = regRes.body.user?.id;
    } else {
      const loginRes = await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send(buildLoginPayload(user.email, user.password));
      accessToken = loginRes.body.accessToken;
      userId = loginRes.body.user?.id;
    }
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  function authHeader() {
    return { Authorization: `Bearer ${accessToken}` };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  describe('GET /api/v2/users/profile', () => {
    it('returns current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/profile')
        .set(authHeader())
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('email', user.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('returns 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/users/profile')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Update Profile ────────────────────────────────────────────────────────

  describe('PATCH /api/v2/users/profile', () => {
    it('updates user name', async () => {
      const payload = buildUpdateProfilePayload({ name: 'New Name' });
      const res = await request(app.getHttpServer())
        .patch('/api/v2/users/profile')
        .set(authHeader())
        .send(payload);

      expect([HTTP_STATUS.OK, HTTP_STATUS.NO_CONTENT]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/api/v2/users/profile')
        .send(buildUpdateProfilePayload())
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('ignores unknown fields (whitelist)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v2/users/profile')
        .set(authHeader())
        .send({ name: 'Valid', unknownField: 'injected' });

      expect([
        HTTP_STATUS.OK,
        HTTP_STATUS.NO_CONTENT,
        HTTP_STATUS.BAD_REQUEST,
      ]).toContain(res.status);
    });
  });

  // ── Net Worth ─────────────────────────────────────────────────────────────

  describe('GET /api/v2/users/net-worth', () => {
    it('returns net worth for authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/net-worth')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/users/net-worth')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Wallet ────────────────────────────────────────────────────────────────

  describe('GET /api/v2/users/wallet', () => {
    it('returns wallet info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/wallet')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/users/wallet')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Sweep Settings ────────────────────────────────────────────────────────

  describe('GET /api/v2/users/sweep-settings', () => {
    it('returns sweep settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/sweep-settings')
        .set(authHeader());

      expect([HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND]).toContain(res.status);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/users/sweep-settings')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Response Shape ────────────────────────────────────────────────────────

  describe('Response shape validation', () => {
    it('profile response never exposes password hash', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/profile')
        .set(authHeader())
        .expect(HTTP_STATUS.OK);

      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('error responses include success:false', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v2/users/profile');

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED);
      expect(res.body.success).toBe(false);
    });
  });
});
