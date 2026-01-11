import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    const transports: winston.transport[] = [];

    // In production (Cloud Run), use Google Cloud Logging
    if (process.env.NODE_ENV === 'production') {
      const loggingWinston = new LoggingWinston({
        projectId: process.env.FIREBASE_PROJECT_ID,
        keyFilename:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          '/secrets/serviceAccountKey.json',
      });
      transports.push(loggingWinston);
    } else {
      // In development, use console with colors
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            }),
          ),
        }),
      );
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
