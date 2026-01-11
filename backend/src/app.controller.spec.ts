import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getApiInfo', () => {
    it('should return API information', () => {
      const result = appController.getApiInfo();
      expect(result).toHaveProperty('name', 'Cost Tracker API');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('docs', '/api');
      expect(result.endpoints).toHaveProperty('expenses');
      expect(result.endpoints).toHaveProperty('health');
    });
  });
});
