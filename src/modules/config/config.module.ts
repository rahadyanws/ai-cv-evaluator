/**
 * @file config.module.ts
 * @description Central module for application configuration.
 * This module uses NestJS's ConfigModule to:
 * 1. Load and validate environment variables (.env) using Joi.
 * 2. Load namespaced configuration objects (e.g., app, redis).
 * 3. Provide the BullConfigService for global queue configuration.
 */
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation';
import { appConfig, redisConfig } from './configuration';
import { BullConfigService } from './bull.config';

/**
 * The main configuration module.
 * It encapsulates all .env loading, validation, and namespacing logic.
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available app-wide
      cache: true, // Caches the loaded environment variables
      load: [appConfig, redisConfig], // Loads namespaced configurations (e..g, 'app.port')
      validationSchema: validationSchema, // Applies Joi validation to .env variables on startup
    }),
  ],
  providers: [BullConfigService],
  exports: [BullConfigService], // Exported for AppModule to use in BullModule.forRootAsync
})
export class ConfigModule {}
