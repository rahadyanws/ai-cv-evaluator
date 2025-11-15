/**
 * @file jobs.module.ts
 * @description This module provides and exports the JobsService, which acts
 * as the central repository for all `Job` and `Result` database logic.
 */
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';

/**
 * Encapsulates the core database logic for jobs and results.
 * It is imported by EvaluateModule, WorkerModule, and ResultModule.
 */
@Module({
  providers: [JobsService],
  exports: [JobsService], // Exported for injection in other modules
})
export class JobsModule {}
