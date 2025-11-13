import * as Joi from 'joi';

/**
 * Skema validasi untuk variabel .env
 * Sesuai dengan rancangan Anda di /src/config/validation.ts
 */
export const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3002),

  // Database (PostgreSQL)
  DATABASE_URL: Joi.string().required(),

  // Queue (Redis)
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  // AI (Gemini)
  GEMINI_API_KEY: Joi.string().required(),
});
