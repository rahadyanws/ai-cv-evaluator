/**
 * @file result.module.ts
 * @description This module is responsible for the GET /api/result/:id endpoint.
 * It bundles the controller and service for retrieving evaluation results.
 */
import { Module } from '@nestjs/common';
// Import local files
import { ResultService } from './result.service';
import { ResultController } from './result.controller';
// Import external modules
import { JobsModule } from '@/modules/jobs/jobs.module';

/**
 * Encapsulates the job result retrieval logic.
 *
 * Imports:
 * - `JobsModule`: This is required because `ResultService` has a
 * dependency on `JobsService` to fetch job data from the database.
 */
@Module({
  imports: [JobsModule], // Provides JobsService for injection
  controllers: [ResultController],
  providers: [ResultService],
})
export class ResultModule {}
