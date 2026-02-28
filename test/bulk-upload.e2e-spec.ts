import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('BulkUploadController (e2e)', () => {
  let app: INestApplication;
  const validApiKey = 'test-api-key';

  const mockConfig: Record<string, any> = {
    API_KEY: validApiKey,
    API_KEY_HEADER: 'x-api-key',
    MAX_FILE_SIZE_BYTES: 10485760,
    MAX_RECORDS_PER_UPLOAD: 10000,
    MAX_FILES_PER_REQUEST: 1,
    RATE_LIMIT_MAX: 100,
    RATE_LIMIT_WINDOW_MS: 60000,
    DEFAULT_BATCH_SIZE: 100,
    DEFAULT_RECORDS_LIMIT: 100,
    DEFAULT_RECORDS_OFFSET: 0,
    ALLOWED_MIME_TYPES: 'text/csv,application/vnd.ms-excel,text/plain',
    PORT: 3000,
    NODE_ENV: 'test',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useFactory({
        factory: () => ({
          get: (key: string, defaultValue?: any) => mockConfig[key] ?? defaultValue,
        }),
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
        .expect(200);
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
    it('should return records without auth (public endpoint)', () => {
      return request(app.getHttpServer())
        .get('/bulk-upload/records')
        .expect(200);
    });
  });

  describe('DELETE /bulk-upload/records', () => {
    it('should reject requests without API key', () => {
      return request(app.getHttpServer())
        .delete('/bulk-upload/records')
        .expect(401);
    });

    it('should clear all records with valid API key', () => {
      return request(app.getHttpServer())
        .delete('/bulk-upload/records')
        .set('x-api-key', validApiKey)
        .expect(200);
    });
  });
});
