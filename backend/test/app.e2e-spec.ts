import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same configuration as in main.ts
    app.setGlobalPrefix('api/v1', {
      exclude: ['/', 'health'],
    });
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root Endpoints', () => {
    it('/ (GET) should return API information', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('name', 'Cost Tracker API');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('endpoints');
        });
    });

    it('/health (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('dependencies');
          expect(res.body.dependencies).toHaveProperty('firebase');
        });
    });
  });

  describe('API Versioning', () => {
    it('/api/v1/expenses (GET) should be accessible', () => {
      return request(app.getHttpServer())
        .get('/api/v1/expenses')
        .expect(res => {
          // Should return 200 or may need auth - just verify endpoint exists
          expect([200, 401, 403]).toContain(res.status);
        });
    });
  });
});
