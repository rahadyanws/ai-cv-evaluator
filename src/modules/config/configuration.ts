import { registerAs } from '@nestjs/config';

/**
 * Konfigurasi namespaced untuk App
 * Sesuai dengan rancangan Anda di /src/config/configuration.ts
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT!, 10),
  env: process.env.NODE_ENV!,
}));

/**
 * Konfigurasi namespaced untuk Redis
 */
export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT!, 10),
}));
