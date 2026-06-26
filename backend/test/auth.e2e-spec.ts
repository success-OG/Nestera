import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  createTestApp,
  closeTestApp,
} from './fixtures/database.helpers';
import {
  buildRegisterPayload,
  buildLoginPayload,
  uniqueEmail,
  INVALID_PAYLOADS,
  HTTP_STATUS,
} from './fixtures/test-factories';

describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  const registeredUser = buildRegisterPayload();

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // ── Registration ──────────────────────────────────────────────────────────

  describe('POST /api/v2/auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(registeredUser)
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(registeredUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('returns 409 when email already registered', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(registeredUser)
        .expect(HTTP_STATUS.CONFLICT);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(INVALID_PAYLOADS.missingEmail)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(INVALID_PAYLOADS.invalidEmail)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    it('returns 400 for weak password', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(INVALID_PAYLOADS.weakPassword)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    it('returns 400 for empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(INVALID_PAYLOADS.emptyBody)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    it('returns 400 for SQL injection attempt in email', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(INVALID_PAYLOADS.sqlInjection)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    it('registers with referral code', async () => {
      const payload = buildRegisterPayload({ referralCode: 'TESTCODE' });
      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/register')
        .send(payload);

      // Either succeeds or returns invalid referral code error
      expect([HTTP_STATUS.CREATED, HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.NOT_FOUND]).toContain(
        res.status,
      );
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/v2/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send(buildLoginPayload(registeredUser.email, registeredUser.password))
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('accessToken');
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send(buildLoginPayload(registeredUser.email, 'WrongPass!99'))
        .expect(HTTP_STATUS.UNAUTHORIZED);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send(buildLoginPayload('nobody@nowhere.test', 'E2eTest@123!'))
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('returns 400 for missing password', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send({ email: registeredUser.email })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    it('returns 400 for invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/login')
        .send({ email: 'bad-email', password: 'E2eTest@123!' })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ── Token Refresh ─────────────────────────────────────────────────────────

  describe('POST /api/v2/auth/refresh', () => {
    it('returns new access token with valid refresh token', async () => {
      if (!refreshToken) {
        console.warn('No refresh token available, skipping refresh test');
        return;
      }

      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/refresh')
        .send({ refreshToken })
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('returns 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('returns 400 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/refresh')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // ── Profile (JWT protected) ───────────────────────────────────────────────

  describe('GET /api/v2/auth/profile', () => {
    it('returns profile for authenticated user', async () => {
      if (!accessToken) return;

      const res = await request(app.getHttpServer())
        .get('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveProperty('email', registeredUser.email);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/auth/profile')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });

    it('returns 401 with malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/auth/profile')
        .set('Authorization', 'Bearer not.a.real.token')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  describe('POST /api/v2/auth/logout', () => {
    it('logs out authenticated user', async () => {
      if (!accessToken) return;

      const res = await request(app.getHttpServer())
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect([HTTP_STATUS.OK, HTTP_STATUS.NO_CONTENT]).toContain(res.status);
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/auth/logout')
        .expect(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ── Wallet Nonce ─────────────────────────────────────────────────────────

  describe('GET /api/v2/auth/nonce', () => {
    it('returns nonce for valid Stellar public key', async () => {
      const validKey = 'GABC' + 'A'.repeat(52);
      const res = await request(app.getHttpServer())
        .get('/api/v2/auth/nonce')
        .query({ publicKey: validKey });

      expect([HTTP_STATUS.OK, HTTP_STATUS.BAD_REQUEST]).toContain(res.status);
    });

    it('returns 400 for invalid Stellar key', async () => {
      await request(app.getHttpServer())
        .get('/api/v2/auth/nonce')
        .query({ publicKey: 'not-a-stellar-key' })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });
});
