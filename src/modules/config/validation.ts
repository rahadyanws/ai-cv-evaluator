/**
 * @file validation.ts
 * @description Defines the Joi schema for validating environment variables.
 * This schema is used by the ConfigModule to ensure all required
 * environment variables are present and valid on application startup.
 */
import * as Joi from 'joi';

/**
 * Joi validation schema for environment variables.
 * It defines required variables, valid values, and default values.
 * This ensures the application fails fast if critical configuration is missing.
 */
export const validationSchema = Joi.object({
  // --- Application ---
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  // --- Database (PostgreSQL) ---
  DATABASE_URL: Joi.string().required(),

  // --- Queue (Redis) ---
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),

  // --- AI (Gemini) ---
  // This key is required for the LlmService to connect to Google AI Studio.
  GEMINI_API_KEY: Joi.string().required(),
});
