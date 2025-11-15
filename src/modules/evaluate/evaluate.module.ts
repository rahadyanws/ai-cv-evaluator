/**
 * @file evaluate.module.ts
 * @description This module is responsible for the POST /api/evaluate endpoint.
 * It acts as the "Producer" for the BullMQ job queue, creating a new
 * job for the worker to process.
 */
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EvaluateController } from './evaluate.controller';
import { EvaluateService } from './evaluate.service';
import { EVALUATION_QUEUE } from '@/constants';
import { JobsModule } from '@/modules/jobs/jobs.module';

/**
 * Encapsulates the job creation (producer) logic.
 *
 * Imports:
 * - `JobsModule`: Required because `EvaluateService` injects `JobsService`
 * to create the initial job entry in the database.
 * - `BullModule.registerQueue`: Registers the `EVALUATION_QUEUE`
 * to allow `EvaluateService` to inject and add jobs to it.
 */
@Module({
  imports: [
    // Import JobsModule to make JobsService available
    // for injection into EvaluateService.
    JobsModule,

    // Register the 'evaluation' queue.
    // This allows us to @InjectQueue(EVALUATION_QUEUE)
    // in the EvaluateService.
    BullModule.registerQueue({
      name: EVALUATION_QUEUE,
    }),
  ],
  controllers: [EvaluateController],
  providers: [EvaluateService],
})
export class EvaluateModule {}
