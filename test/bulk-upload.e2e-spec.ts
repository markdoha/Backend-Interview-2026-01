import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BulkUploadController (e2e)', () => {
  let app: INestApplication;
  const validApiKey = 'test-api-key';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          const config: Record<string, any> = {
            API_KEY: validApiKey,
            API_KEY_HEADER: 'x-api-key',
            MAX_FILE_SIZE_BYTES: 10485760,
            MAX_RECORDS_PER_UPLOAD: 10000,
            RATE_LIMIT_MAX: 100,
            RATE_LIMIT_WINDOW_MS: 60000,
          };
          return config[key];
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /bulk-upload/upload', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer())
        .post('/bulk-upload/upload')
        .expect(401);
    });

    it('should reject requests with invalid API key', () => {
      return request(app.getHttpServer())
        .post('/bulk-upload/upload')
        .set('x-api-key', 'invalid-key')
        .expect(401);
    });

    it('should reject requests without file', () => {
      return request(app.getHttpServer())
        .post('/bulk-upload/upload')
        .set('x-api-key', validApiKey)
        .expect(400);
    });

    it('should accept valid CSV file with valid API key', () => {
      const csvContent = 'name,age\nTest,25';
      return request(app.getHttpServer())
        .post('/bulk-upload/upload')
        .set('x-api-key', validApiKey)
        .attach('file', Buffer.from(csvContent), 'test.csv')
        .expect(201);
    });
  });

  describe('GET /bulk-upload/stats', () => {
    it('should return stats without authentication (public endpoint)', () => {
      return request(app.getHttpServer())
        .get('/bulk-upload/stats')
        .expect(200);
    });
  });

  describe('GET /bulk-upload/records', () => {
    it('should require API key', () => {
      return request(app.getHttpServer())
        .get('/bulk-upload/records')
        .expect(401);
    });

    it('should return records with valid API key', () => {
      return request(app.getHttpServer())
        .get('/bulk-upload/records')
        .set('x-api-key', validApiKey)
        .expect(200);
    });
  });
});
