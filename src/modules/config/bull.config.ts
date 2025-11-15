/**
 * @file bull.config.ts
 * @description Provides the root configuration for BullMQ (Redis-based queue system).
 * This factory service reads Redis connection details from the ConfigService
 * and sets default job options for resilience (e.g., retries).
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  SharedBullConfigurationFactory,
  BullRootModuleOptions,
} from '@nestjs/bullmq';
import { ConfigType } from '@nestjs/config';

import { redisConfig } from './configuration';

/**
 * A factory class that dynamically provides BullMQ root configuration.
 * This is injected into the `BullModule.forRootAsync` in `app.module.ts`.
 */
@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
  /**
   * Injects the namespaced 'redis' configuration from ConfigService.
   * @param config The validated and namespaced Redis configuration object.
   */
  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {}

  /**
   * Creates the shared BullMQ configuration.
   * This method is called by NestJS when the BullModule is initialized.
   */
  createSharedConfiguration(): BullRootModuleOptions {
    return {
      // Default options for all jobs created in this application.
      // This is where we implement the "retries/back-off" requirement
      // from the case study [cite: "Implement retries/back-off"].
      defaultJobOptions: {
        attempts: 3, // Attempt a job 3 times before failing.
        backoff: {
          type: 'exponential',
          delay: 5000, // Wait 5s before the first retry (10s for 2nd, etc.)
        },
        removeOnComplete: true, // Clean up successful jobs from Redis.
        removeOnFail: false, // KEEP failed jobs in Redis for debugging.
      },

      // Connection details for the Redis server (read from .env).
      connection: {
        host: this.config.host,
        port: this.config.port,
      },
    };
  }
}
