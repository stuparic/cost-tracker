import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { WinstonLogger } from './config/logger.config';

async function bootstrap() {
  // Create custom logger
  const logger = new WinstonLogger();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Enable API versioning
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health'], // Keep root and health at base level
  });

  // Enable global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cost Tracker API')
    .setDescription(
      'API for tracking home expenses with dual currency support (EUR/RSD). Automatically calculates amounts in both currencies.',
    )
    .setVersion('1.0')
    .addServer('/api/v1', 'Version 1 API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on port ${port}`, 'Bootstrap');
}
bootstrap();
