/**
 * @file configuration.ts
 * @description Registers namespaced configurations for the application.
 * This allows for type-safe access to environment variables
 * via the ConfigService (e.g., configService.get('app.port')).
 */
import { registerAs } from '@nestjs/config';

/**
 * Registers application-specific configuration under the 'app' namespace.
 * Provides fallbacks to prevent NaN errors or undefined values.
 */
export const appConfig = registerAs('app', () => ({
  // Use the default port from the Joi validation schema for consistency
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
}));

/**
 * Registers Redis-specific configuration under the 'redis' namespace.
 */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}));
