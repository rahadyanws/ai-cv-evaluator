/**
 * The main entry point for the NestJS application.
 * This file initializes the Nest application, sets up global configurations,
 * and starts the server.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Import the NestJS Logger
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Initializes and starts the NestJS application.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Create a logger instance with the 'Bootstrap' context
  const logger = new Logger('Bootstrap');

  // Set a global prefix for all routes (e.g., /api/upload)
  app.setGlobalPrefix('api');

  // Enable global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Error on unknown properties
      transform: true, // Auto-transform payloads to DTO class
    }),
  );

  // Get ConfigService to read validated .env variables
  const configService = app.get(ConfigService);

  // Get port from the 'app.port' namespace, with a fallback
  const port = configService.get<number>('app.port') || 3000;

  await app.listen(port);

  // Use the NestJS Logger instead of console.log
  logger.log(`🚀 Server is running on http://localhost:${port}/api`);
}

// Run the application
bootstrap();
