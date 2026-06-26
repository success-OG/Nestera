import { Controller, Get, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import compression from 'compression';

@Controller()
class CompressionTestController {
  @Get('large-payload')
  getLargePayload() {
    return {
      items: Array.from({ length: 5000 }, (_, index) => ({
        id: index + 1,
        value: `Payload entry number ${index + 1}`,
      })),
    };
  }
}

@Module({
  controllers: [CompressionTestController],
})
class CompressionTestModule {}

describe('Compression middleware', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CompressionTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(
      compression({
        threshold: 100,
        brotli: { enabled: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('compresses large responses using gzip when requested', async () => {
    await request(app.getHttpServer())
      .get('/large-payload')
      .set('Accept-Encoding', 'gzip')
      .expect('Content-Encoding', /gzip/)
      .expect(200);
  });

  it('compresses large responses using brotli when requested', async () => {
    await request(app.getHttpServer())
      .get('/large-payload')
      .set('Accept-Encoding', 'br')
      .expect('Content-Encoding', /br/)
      .expect(200);
  });
});
