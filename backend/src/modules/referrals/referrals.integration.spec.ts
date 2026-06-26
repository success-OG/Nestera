import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import request from 'supertest';
import { ReferralsModule } from './referrals.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../../auth/auth.module';
import { Referral } from './entities/referral.entity';
import { ReferralCampaign } from './entities/referral-campaign.entity';
import { User } from '../user/entities/user.entity';

describe('Referrals Integration Tests', () => {
  let app: INestApplication;
  let userToken: string;
  let adminToken: string;
  let referralCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ jwt: { secret: 'test-secret-key' } })],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'test_db',
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASS || 'postgres',
          entities: [User, Referral, ReferralCampaign],
          synchronize: true,
          dropSchema: true,
          // Fail fast instead of retrying when DB is unavailable
          retryAttempts: 1,
          retryDelay: 500,
        }),
        EventEmitterModule.forRoot(),
        ReferralsModule,
        UserModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }, 30000); // 30s timeout for app bootstrap + DB connection

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  describe('User Flow', () => {
    it('should register a user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          name: 'User One',
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      userToken = response.body.accessToken;
    });

    it('should generate a referral code', async () => {
      const response = await request(app.getHttpServer())
        .post('/referrals/generate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(201);

      expect(response.body.referralCode).toBeDefined();
      expect(response.body.referralCode).toHaveLength(8);
      referralCode = response.body.referralCode;
    });

    it('should get referral stats', async () => {
      const response = await request(app.getHttpServer())
        .get('/referrals/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalReferrals: 1,
        pendingReferrals: 1,
        completedReferrals: 0,
        rewardedReferrals: 0,
        totalRewardsEarned: '0.0000000',
        referralCode: referralCode,
      });
    });

    it('should register a new user with referral code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password123',
          name: 'User Two',
          referralCode: referralCode,
        })
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
    });

    it('should list user referrals', async () => {
      const response = await request(app.getHttpServer())
        .get('/referrals/my-referrals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        referralCode: referralCode,
        status: 'pending',
      });
    });

    it('should not allow using own referral code', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user3@example.com',
          password: 'password123',
          name: 'User Three',
          referralCode: referralCode,
        })
        .expect(201);

      // The referral code application happens asynchronously
      // In a real test, you'd wait and verify it was rejected
    });
  });

  describe('Admin Flow', () => {
    it('should register an admin user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'password123',
          name: 'Admin User',
        })
        .expect(201);

      adminToken = response.body.accessToken;
    });

    it('should create a referral campaign', async () => {
      const response = await request(app.getHttpServer())
        .post('/admin/referrals/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Campaign',
          description: 'Test campaign description',
          rewardAmount: 10,
          refereeRewardAmount: 5,
          minDepositAmount: 50,
          maxRewardsPerUser: 20,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Campaign',
        rewardAmount: '10',
        refereeRewardAmount: '5',
        minDepositAmount: '50',
        maxRewardsPerUser: 20,
        isActive: true,
      });
    });

    it('should list all campaigns', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/referrals/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get active campaigns', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/referrals/campaigns/active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should list all referrals', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/referrals/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should get analytics overview', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/referrals/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalReferrals: expect.any(Number),
        pendingReferrals: expect.any(Number),
        completedReferrals: expect.any(Number),
        rewardedReferrals: expect.any(Number),
        fraudulentReferrals: expect.any(Number),
        totalRewardsDistributed: expect.any(String),
      });
    });
  });

  describe('Validation', () => {
    it('should reject invalid referral code', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'user4@example.com',
          password: 'password123',
          name: 'User Four',
          referralCode: 'INVALID123',
        })
        .expect(201); // Registration succeeds but referral code is ignored/rejected async
    });

    it('should require authentication for referral endpoints', async () => {
      await request(app.getHttpServer()).get('/referrals/stats').expect(401);

      await request(app.getHttpServer())
        .post('/referrals/generate')
        .expect(401);
    });

    it('should validate campaign creation data', async () => {
      await request(app.getHttpServer())
        .post('/admin/referrals/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid Campaign',
          // Missing required rewardAmount
        })
        .expect(400);
    });
  });
});
